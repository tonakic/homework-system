const { getDatabase } = require('../config/database');
const { success, error, paginated, ErrorCodes } = require('../utils/response');
const { hashPassword } = require('../utils/password');
const { getDefaultPassword } = require('../constants');

/**
 * 获取教师列表
 */
function getTeachers(req, res) {
  const { page = 1, pageSize = 20, subject, keyword, status } = req.query;

  const db = getDatabase();
  let whereClauses = ['status != ?'];
  let params = ['deleted'];

  // 筛选条件
  if (subject) {
    whereClauses.push('subjects LIKE ?');
    params.push(`%"${subject}"%`);
  }

  if (status && status !== 'all') {
    whereClauses[0] = 'status = ?';
    params[0] = status;
  }
  // 如果 status 为空或 'all'，显示所有非删除的教师

  if (keyword) {
    whereClauses.push('(teacher_no LIKE ? OR name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const whereSQL = whereClauses.join(' AND ');

  // 获取总数
  const countResult = db.prepare(`SELECT COUNT(*) as total FROM teachers WHERE ${whereSQL}`).get(...params);
  const total = countResult.total;

  // 获取列表
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const teachers = db.prepare(`
    SELECT id, teacher_no, name, gender, subjects, phone, manage_classes, remark, status, created_at
    FROM teachers
    WHERE ${whereSQL}
    ORDER BY teacher_no
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  // 解析JSON字段
  teachers.forEach(teacher => {
    teacher.subjects = teacher.subjects ? JSON.parse(teacher.subjects) : [];
    teacher.manage_classes = teacher.manage_classes ? JSON.parse(teacher.manage_classes) : [];
  });

  return paginated(res, teachers, total, page, pageSize);
}

/**
 * 获取教师详情
 */
function getTeacherById(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const teacher = db.prepare(`
    SELECT id, teacher_no, name, gender, subjects, phone, manage_classes, remark, status, created_at
    FROM teachers WHERE id = ?
  `).get(id);

  if (!teacher) {
    return error(res, ErrorCodes.TEACHER_NOT_FOUND, '教师不存在');
  }

  // 解析JSON字段
  teacher.subjects = teacher.subjects ? JSON.parse(teacher.subjects) : [];
  teacher.manage_classes = teacher.manage_classes ? JSON.parse(teacher.manage_classes) : [];

  return success(res, teacher);
}

/**
 * 新增教师
 */
async function addTeacher(req, res) {
  const { teacher_no, name, gender, subjects, phone, manage_classes, remark } = req.body;

  if (!teacher_no || !name || !subjects || subjects.length === 0) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请填写必填信息');
  }

  // 验证subjects必须是数组
  if (!Array.isArray(subjects)) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '教授科目必须是数组格式');
  }

  // 验证manage_classes必须是数组（如果提供了的话）
  if (manage_classes !== undefined && manage_classes !== null && !Array.isArray(manage_classes)) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '管理班级必须是数组格式');
  }

  const db = getDatabase();

  // 检查工号是否已存在
  const existing = db.prepare('SELECT id FROM teachers WHERE teacher_no = ?').get(teacher_no);
  if (existing) {
    return error(res, ErrorCodes.TEACHER_EXISTS, '工号已存在');
  }

  // 加密默认密码
  const hashedPassword = await hashPassword(getDefaultPassword('teacher'));

  // 插入教师
  const result = db.prepare(`
    INSERT INTO teachers (teacher_no, name, gender, subjects, phone, manage_classes, remark, password, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    teacher_no,
    name,
    gender,
    JSON.stringify(subjects),
    phone,
    manage_classes ? JSON.stringify(manage_classes) : null,
    remark,
    hashedPassword
  );

  logOperation(req.user, 'add', 'teacher', result.lastInsertRowid, `新增教师: ${name}`, req.ip);

  return success(res, { id: result.lastInsertRowid, teacher_no, name }, '教师添加成功');
}

/**
 * 编辑教师
 */
function updateTeacher(req, res) {
  const { id } = req.params;
  const { name, gender, subjects, phone, manage_classes, remark, status } = req.body;

  // 验证subjects必须是数组（如果提供了的话）
  if (subjects !== undefined && !Array.isArray(subjects)) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '教授科目必须是数组格式');
  }

  // 验证manage_classes必须是数组（如果提供了的话）
  if (manage_classes !== undefined && manage_classes !== null && !Array.isArray(manage_classes)) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '管理班级必须是数组格式');
  }

  const db = getDatabase();

  const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
  if (!teacher) {
    return error(res, ErrorCodes.TEACHER_NOT_FOUND, '教师不存在');
  }

  // 更新教师信息
  db.prepare(`
    UPDATE teachers
    SET name = ?, gender = ?, subjects = ?, phone = ?, manage_classes = ?, remark = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || teacher.name,
    gender || teacher.gender,
    subjects ? JSON.stringify(subjects) : teacher.subjects,
    phone || teacher.phone,
    manage_classes ? JSON.stringify(manage_classes) : teacher.manage_classes,
    remark || teacher.remark,
    status || teacher.status,
    id
  );

  logOperation(req.user, 'update', 'teacher', id, `修改教师: ${name || teacher.name}`, req.ip);

  return success(res, null, '教师信息更新成功');
}

/**
 * 删除教师（软删除）
 */
function deleteTeacher(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
  if (!teacher) {
    return error(res, ErrorCodes.TEACHER_NOT_FOUND, '教师不存在');
  }

  // 软删除
  db.prepare('UPDATE teachers SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('deleted', id);

  logOperation(req.user, 'delete', 'teacher', id, `删除教师: ${teacher.name}`, req.ip);

  return success(res, null, '教师已删除');
}

/**
 * 重置教师密码
 */
async function resetTeacherPassword(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
  if (!teacher) {
    return error(res, ErrorCodes.TEACHER_NOT_FOUND, '教师不存在');
  }

  // 重置密码为123456
  const hashedPassword = await hashPassword(getDefaultPassword('teacher'));
  db.prepare('UPDATE teachers SET password = ?, first_login = 1, updated_at = datetime(\'now\') WHERE id = ?').run(hashedPassword, id);

  logOperation(req.user, 'reset_password', 'teacher', id, `重置教师密码: ${teacher.name}`, req.ip);

  return success(res, null, '密码已重置为123456');
}

/**
 * 记录操作日志
 */
function logOperation(user, action, targetType, targetId, detail, ip) {
  try {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO operation_logs (user_type, user_id, user_name, action, target_type, target_id, detail, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user.userType, user.id, user.name, action, targetType, targetId, detail, ip);
  } catch (err) {
    console.error('记录操作日志失败:', err);
  }
}

module.exports = {
  getTeachers,
  getTeacherById,
  addTeacher,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword
};