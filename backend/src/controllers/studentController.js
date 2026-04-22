const { getDatabase } = require('../config/database');
const { success, error, paginated, ErrorCodes } = require('../utils/response');
const { hashPassword } = require('../utils/password');
const { getDefaultPassword } = require('../constants');

/**
 * HTML转义函数，防止XSS攻击
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return text;
  const str = String(text);
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 从完整班级名称中提取简短班级名称
 * 例如: "一年级1班" -> "1班", "二年级2班" -> "2班"
 * 如果已经是简短格式，则原样返回
 */
function extractShortClassName(className) {
  if (!className) return className;
  // 匹配 "X年级Y班" 格式，提取 "Y班" 部分
  const match = className.match(/^[一二三四五六年级]+(\d+班)$/);
  if (match) {
    return match[1]; // 返回 "Y班" 部分
  }
  // 如果不匹配完整格式，可能是已经简短格式，原样返回
  return className;
}

/**
 * 获取年级列表（从 classes 表读取）
 */
function getGradeList(req, res) {
  const db = getDatabase();

  const grades = db.prepare(`
    SELECT DISTINCT grade FROM classes
    WHERE status = 'active'
    ORDER BY
      CASE grade
        WHEN '一年级' THEN 1
        WHEN '二年级' THEN 2
        WHEN '三年级' THEN 3
        WHEN '四年级' THEN 4
        WHEN '五年级' THEN 5
        WHEN '六年级' THEN 6
        ELSE 99
      END
  `).all();

  return success(res, grades.map(g => g.grade));
}

/**
 * 获取指定年级的班级列表（从 classes 表读取）
 * 返回完整班级名称格式（如 "一年级1班"）
 */
function getClassesByGrade(req, res) {
  const { grade } = req.query;

  if (!grade) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请指定年级');
  }

  const db = getDatabase();

  const classes = db.prepare(`
    SELECT class_name FROM classes
    WHERE grade = ? AND status = 'active'
    ORDER BY class_name
  `).all(grade);

  // 返回完整班级名称格式
  return success(res, classes.map(c => {
    // 如果 class_name 已经包含年级，直接返回；否则拼接年级
    if (c.class_name && c.class_name.includes('年级')) {
      return c.class_name;
    }
    return `${grade}${c.class_name}`;
  }));
}

/**
 * 获取学生列表
 */
function getStudents(req, res) {
  const { userType, manage_classes } = req.user;
  const { page = 1, pageSize = 20, grade, class_name, keyword, status } = req.query;

  const db = getDatabase();
  let whereClauses = ['status != ?'];
  let params = ['deleted'];

  // 教师只能查看所管班级的学生
  if (userType === 'teacher' && manage_classes) {
    const classes = Array.isArray(manage_classes) ? manage_classes : JSON.parse(manage_classes);
    if (classes.length > 0) {
      // manage_classes 存储完整班级名称（如 "一年级1班"），需要匹配 grade + class_name
      // 使用 OR 条件匹配完整名称或简短名称
      const classConditions = classes.map(cls => {
        // 尝试从完整班级名称中提取年级和班级
        // 假设格式为 "一年级1班"、"二年级2班" 等
        const match = cls.match(/^(.+?)(\d+班)$/);
        if (match) {
          const [, gradePart, classPart] = match;
          return `(grade = ? AND class_name = ?)`;
        }
        // 如果格式不匹配，尝试直接匹配
        return `class_name = ?`;
      });

      if (classConditions.length > 0) {
        whereClauses.push(`(${classConditions.join(' OR ')})`);
        // 添加对应的参数
        classes.forEach(cls => {
          const match = cls.match(/^(.+?)(\d+班)$/);
          if (match) {
            const [, gradePart, classPart] = match;
            params.push(gradePart, classPart);
          } else {
            params.push(cls);
          }
        });
      }
    }
  }

  // 筛选条件
  if (grade) {
    whereClauses.push('grade = ?');
    params.push(grade);
  }

  if (class_name) {
    // 支持完整班级名称（如 "一年级1班"）和简短班级名称（如 "1班"）的双向匹配
    // 如果传入的是完整班级名称，提取年级和简短班级名称进行匹配
    const fullMatch = class_name.match(/^(.+年级)(\d+班)$/);
    if (fullMatch) {
      const [, gradePart, classPart] = fullMatch;
      whereClauses.push('(class_name = ? OR (grade = ? AND class_name = ?))');
      params.push(class_name, gradePart, classPart);
    } else {
      // 简短格式，支持匹配 class_name 字段
      whereClauses.push('class_name = ?');
      params.push(class_name);
    }
  }

  if (status && status !== 'all') {
    whereClauses[0] = 'status = ?';
    params[0] = status;
  }

  if (keyword) {
    whereClauses.push('(student_no LIKE ? OR name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const whereSQL = whereClauses.join(' AND ');

  // 获取总数
  const countResult = db.prepare(`SELECT COUNT(*) as total FROM students WHERE ${whereSQL}`).get(...params);
  const total = countResult.total;

  // 获取列表
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const students = db.prepare(`
    SELECT id, student_no, name, gender, grade, class_name, parent_name, phone, remark, status, created_at
    FROM students
    WHERE ${whereSQL}
    ORDER BY grade, class_name, student_no
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return paginated(res, students, total, page, pageSize);
}

/**
 * 获取学生详情
 */
function getStudentById(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const student = db.prepare(`
    SELECT id, student_no, name, gender, grade, class_name, parent_name, phone, remark, status, created_at
    FROM students WHERE id = ?
  `).get(id);

  if (!student) {
    return error(res, ErrorCodes.STUDENT_NOT_FOUND, '学生不存在');
  }

  // 检查权限（教师只能查看所管班级学生）
  if (req.user.userType === 'teacher') {
    const classes = Array.isArray(req.user.manage_classes) ? req.user.manage_classes : JSON.parse(req.user.manage_classes || '[]');
    // 组合完整班级名称进行比较（如 "一年级1班"）
    const studentFullClass = `${student.grade}${student.class_name}`;
    if (!classes.includes(studentFullClass) && !classes.includes(student.class_name)) {
      return error(res, ErrorCodes.PERMISSION_DENIED, '无权限查看该学生');
    }
  }

  return success(res, student);
}

/**
 * 新增学生
 */
async function addStudent(req, res) {
  const { student_no, name, gender, grade, class_name, parent_name, phone, remark } = req.body;

  if (!student_no || !name || !grade || !class_name) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请填写必填信息');
  }

  const db = getDatabase();

  // 检查学号是否已存在
  const existing = db.prepare('SELECT id FROM students WHERE student_no = ?').get(student_no);
  if (existing) {
    return error(res, ErrorCodes.STUDENT_EXISTS, '学号已存在');
  }

  // 将班级名称转换为简短格式存储
  const shortClassName = extractShortClassName(class_name);

  // 检查权限（教师只能添加所管班级学生）
  if (req.user.userType === 'teacher') {
    const classes = Array.isArray(req.user.manage_classes) ? req.user.manage_classes : JSON.parse(req.user.manage_classes || '[]');
    // 组合完整班级名称进行比较
    const fullClass = `${grade}${shortClassName}`;
    if (!classes.includes(fullClass) && !classes.includes(shortClassName)) {
      return error(res, ErrorCodes.PERMISSION_DENIED, '无权限管理该班级');
    }
  }

  // 加密默认密码
  const hashedPassword = await hashPassword(getDefaultPassword('student'));

  // 插入学生（对用户输入进行HTML转义）
  const result = db.prepare(`
    INSERT INTO students (student_no, name, gender, grade, class_name, parent_name, phone, remark, password, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    student_no,
    escapeHtml(name),
    gender,
    grade,
    shortClassName,
    parent_name ? escapeHtml(parent_name) : null,
    phone,
    remark ? escapeHtml(remark) : null,
    hashedPassword
  );

  logOperation(req.user, 'add', 'student', result.lastInsertRowid, `新增学生: ${name}`, req.ip);

  return success(res, { id: result.lastInsertRowid, student_no, name }, '学生添加成功');
}

/**
 * 编辑学生
 */
function updateStudent(req, res) {
  const { id } = req.params;
  const { name, gender, grade, class_name, parent_name, phone, remark, status } = req.body;

  const db = getDatabase();

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!student) {
    return error(res, ErrorCodes.STUDENT_NOT_FOUND, '学生不存在');
  }

  // 将班级名称转换为简短格式
  const shortClassName = class_name ? extractShortClassName(class_name) : null;

  // 检查权限
  if (req.user.userType === 'teacher') {
    const classes = Array.isArray(req.user.manage_classes) ? req.user.manage_classes : JSON.parse(req.user.manage_classes || '[]');
    // 组合完整班级名称进行比较
    const studentFullClass = `${student.grade}${student.class_name}`;
    const newFullClass = shortClassName ? `${grade || student.grade}${shortClassName}` : null;

    // 检查原班级权限
    if (!classes.includes(studentFullClass) && !classes.includes(student.class_name)) {
      return error(res, ErrorCodes.PERMISSION_DENIED, '无权限管理该班级');
    }
    // 检查新班级权限（如果要更改班级）
    if (newFullClass && !classes.includes(newFullClass) && !classes.includes(shortClassName)) {
      return error(res, ErrorCodes.PERMISSION_DENIED, '无权限管理目标班级');
    }
  }

  // 更新学生信息（对用户输入进行HTML转义）
  db.prepare(`
    UPDATE students
    SET name = ?, gender = ?, grade = ?, class_name = ?, parent_name = ?, phone = ?, remark = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ? escapeHtml(name) : student.name,
    gender || student.gender,
    grade || student.grade,
    shortClassName || student.class_name,
    parent_name ? escapeHtml(parent_name) : student.parent_name,
    phone || student.phone,
    remark ? escapeHtml(remark) : student.remark,
    status || student.status,
    id
  );

  logOperation(req.user, 'update', 'student', id, `修改学生: ${name || student.name}`, req.ip);

  return success(res, null, '学生信息更新成功');
}

/**
 * 删除学生（软删除）
 */
function deleteStudent(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!student) {
    return error(res, ErrorCodes.STUDENT_NOT_FOUND, '学生不存在');
  }

  // 检查权限
  if (req.user.userType === 'teacher') {
    const classes = Array.isArray(req.user.manage_classes) ? req.user.manage_classes : JSON.parse(req.user.manage_classes || '[]');
    // 组合完整班级名称进行比较
    const studentFullClass = `${student.grade}${student.class_name}`;
    if (!classes.includes(studentFullClass) && !classes.includes(student.class_name)) {
      return error(res, ErrorCodes.PERMISSION_DENIED, '无权限管理该班级');
    }
  }

  // 软删除
  db.prepare('UPDATE students SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('deleted', id);

  logOperation(req.user, 'delete', 'student', id, `删除学生: ${student.name}`, req.ip);

  return success(res, null, '学生已删除');
}

/**
 * 重置学生密码
 */
async function resetPassword(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!student) {
    return error(res, ErrorCodes.STUDENT_NOT_FOUND, '学生不存在');
  }

  // 检查权限
  if (req.user.userType === 'teacher') {
    const classes = Array.isArray(req.user.manage_classes) ? req.user.manage_classes : JSON.parse(req.user.manage_classes || '[]');
    // 组合完整班级名称进行比较
    const studentFullClass = `${student.grade}${student.class_name}`;
    if (!classes.includes(studentFullClass) && !classes.includes(student.class_name)) {
      return error(res, ErrorCodes.PERMISSION_DENIED, '无权限管理该班级');
    }
  }

  // 重置密码为123456
  const hashedPassword = await hashPassword(getDefaultPassword('student'));
  db.prepare('UPDATE students SET password = ?, first_login = 1, updated_at = datetime(\'now\') WHERE id = ?').run(hashedPassword, id);

  logOperation(req.user, 'reset_password', 'student', id, `重置学生密码: ${student.name}`, req.ip);

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
  getGradeList,
  getClassesByGrade,
  getStudents,
  getStudentById,
  addStudent,
  updateStudent,
  deleteStudent,
  resetPassword
};