const { getDatabase } = require('../config/database');
const { success, error, paginated, ErrorCodes } = require('../utils/response');
const { getChinaTimestamp, utcToChinaTime } = require('../utils/timezone');
const xlsx = require('xlsx');

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
 * 获取统计数据
 */
function getStats(req, res) {
  const db = getDatabase();

  const studentCount = db.prepare("SELECT COUNT(*) as count FROM students WHERE status IN ('active', 'inactive')").get().count;
  const teacherCount = db.prepare("SELECT COUNT(*) as count FROM teachers WHERE status != 'deleted'").get().count;
  const questionCount = db.prepare("SELECT COUNT(*) as count FROM questions").get().count;
  const examCount = db.prepare("SELECT COUNT(*) as count FROM exam_tasks").get().count;

  return success(res, {
    students: studentCount,
    teachers: teacherCount,
    questions: questionCount,
    exams: examCount
  });
}

/**
 * 获取系统配置
 */
function getConfig(req, res) {
  const db = getDatabase();
  const configs = db.prepare('SELECT config_key, config_value, description FROM system_config').all();

  const configObj = {};
  configs.forEach(config => {
    configObj[config.config_key] = config.config_value;
  });

  return success(res, configObj);
}

/**
 * 更新系统配置
 */
function updateConfig(req, res) {
  const { login_max_attempts, login_lock_time, default_password, max_exam_duration } = req.body;
  const db = getDatabase();

  const updateStmt = db.prepare(`
    UPDATE system_config
    SET config_value = ?, updated_at = datetime('now')
    WHERE config_key = ?
  `);

  const updates = [];
  if (login_max_attempts !== undefined) updates.push(['login_max_attempts', String(login_max_attempts)]);
  if (login_lock_time !== undefined) updates.push(['login_lock_time', String(login_lock_time)]);
  if (default_password !== undefined) updates.push(['default_password', String(default_password)]);
  if (max_exam_duration !== undefined) updates.push(['max_exam_duration', String(max_exam_duration)]);

  for (const [key, value] of updates) {
    updateStmt.run(value, key);
  }

  logOperation(req.user, 'update', 'config', null, '更新系统配置', req.ip);
  return success(res, null, '配置更新成功');
}

/**
 * 获取班级统计（从 classes 表读取）
 */
function getClassStats(req, res) {
  const { grade } = req.query;
  const db = getDatabase();

  // 从 classes 表获取班级配置
  let classWhere = "WHERE status = 'active'";
  const params = [];
  if (grade) {
    classWhere += " AND grade = ?";
    params.push(grade);
  }

  const classes = db.prepare(`
    SELECT id, grade, class_name
    FROM classes ${classWhere}
    ORDER BY grade, class_name
  `).all(...params);

  // 获取每个班级的学生数量
  const result = classes.map(cls => {
    const studentCount = db.prepare(`
      SELECT COUNT(*) as count FROM students
      WHERE grade = ? AND (class_name = ? OR class_name = ?)
      AND status IN ('active', 'inactive')
    `).get(cls.grade, cls.class_name, cls.class_name.replace(cls.grade, ''));

    return {
      id: cls.id,
      grade: cls.grade,
      class_name: `${cls.grade}${cls.class_name}`,
      student_count: studentCount.count
    };
  });

  return success(res, result);
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
 * 添加/更新班级（操作 classes 表）
 */
function saveClass(req, res) {
  const { grade, class_name, old_class_name } = req.body;

  if (!grade || !class_name) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请填写完整信息');
  }

  const db = getDatabase();
  // 对班级名称进行转义
  const shortClassName = escapeHtml(class_name.replace(grade, '') || class_name);

  if (old_class_name) {
    // 修改班级名称 - 先查找旧班级
    const oldShortClassName = old_class_name.replace(/^[一二三四五六年级]+/, '') || old_class_name;
    const oldClass = db.prepare('SELECT id FROM classes WHERE grade = ? AND class_name = ?').get(grade, oldShortClassName);

    if (!oldClass) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '原班级不存在');
    }

    // 检查新班级名是否已存在
    const existingNew = db.prepare('SELECT id FROM classes WHERE grade = ? AND class_name = ? AND id != ?').get(grade, shortClassName, oldClass.id);
    if (existingNew) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '该班级名称已存在');
    }

    // 更新 classes 表
    db.prepare('UPDATE classes SET class_name = ?, updated_at = datetime("now") WHERE id = ?').run(shortClassName, oldClass.id);

    // 更新该班级所有学生的班级信息
    db.prepare(`
      UPDATE students SET class_name = ?, grade = ?, updated_at = datetime('now')
      WHERE grade = ? AND (class_name = ? OR class_name = ?)
    `).run(shortClassName, grade, grade, old_class_name, oldShortClassName);

    // 更新教师管理的班级
    const teachers = db.prepare('SELECT id, manage_classes FROM teachers WHERE manage_classes IS NOT NULL').all();
    teachers.forEach(t => {
      try {
        let classes = JSON.parse(t.manage_classes);
        const idx = classes.indexOf(old_class_name);
        if (idx >= 0) {
          classes[idx] = `${grade}${shortClassName}`;
          db.prepare('UPDATE teachers SET manage_classes = ? WHERE id = ?').run(JSON.stringify(classes), t.id);
        }
      } catch (e) {}
    });

    logOperation(req.user, 'update', 'class', null, `修改班级: ${old_class_name} -> ${grade}${shortClassName}`, req.ip);
    return success(res, null, '班级修改成功');
  } else {
    // 新增班级 - 检查是否已存在
    const existing = db.prepare('SELECT id FROM classes WHERE grade = ? AND class_name = ?').get(grade, shortClassName);
    if (existing) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '该班级已存在');
    }

    db.prepare("INSERT INTO classes (grade, class_name, status) VALUES (?, ?, 'active')").run(grade, shortClassName);

    logOperation(req.user, 'add', 'class', null, `新增班级: ${grade}${shortClassName}`, req.ip);
    return success(res, null, '班级添加成功');
  }
}

/**
 * 删除班级（从 classes 表删除）
 */
function deleteClass(req, res) {
  const { class_name } = req.body;

  if (!class_name) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '班级名称不能为空');
  }

  const db = getDatabase();
  const shortClassName = class_name.replace(/^[一二三四五六年级]+/, '') || class_name;
  const grade = class_name.match(/^[一二三四五六年级]+/)?.[0] || '';

  // 从 classes 表删除
  const result = db.prepare('DELETE FROM classes WHERE grade = ? AND class_name = ?').run(grade, shortClassName);
  if (result.changes === 0) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '班级不存在');
  }

  // 将该班级的学生班级信息清空
  db.prepare(`UPDATE students SET class_name = '', updated_at = datetime('now') WHERE grade = ? AND (class_name = ? OR class_name = ?)`).run(grade, class_name, shortClassName);

  // 更新教师管理的班级
  const teachers = db.prepare('SELECT id, manage_classes FROM teachers WHERE manage_classes IS NOT NULL').all();
  teachers.forEach(t => {
    try {
      let classes = JSON.parse(t.manage_classes);
      const idx = classes.indexOf(class_name);
      if (idx >= 0) {
        classes.splice(idx, 1);
        db.prepare('UPDATE teachers SET manage_classes = ? WHERE id = ?').run(JSON.stringify(classes), t.id);
      }
    } catch (e) {}
  });

  logOperation(req.user, 'delete', 'class', null, `删除班级: ${class_name}`, req.ip);
  return success(res, null, '班级删除成功');
}

/**
 * 获取操作日志
 */
function getOperationLogs(req, res) {
  const { page = 1, pageSize = 20, user_type, action, keyword, start_date, end_date } = req.query;
  const db = getDatabase();

  let whereClauses = ['1=1'];
  let params = [];

  if (user_type) { whereClauses.push('user_type = ?'); params.push(user_type); }
  if (action) { whereClauses.push('action = ?'); params.push(action); }
  if (keyword) { whereClauses.push('(user_name LIKE ? OR detail LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`); }
  if (start_date) { whereClauses.push('DATE(created_at) >= DATE(?)'); params.push(start_date); }
  if (end_date) { whereClauses.push('DATE(created_at) <= DATE(?)'); params.push(end_date); }

  const whereSQL = whereClauses.join(' AND ');
  const countResult = db.prepare(`SELECT COUNT(*) as total FROM operation_logs WHERE ${whereSQL}`).get(...params);
  const total = countResult.total;

  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const logs = db.prepare(`
    SELECT id, user_type, user_id, user_name, action, target_type, target_id, detail, ip_address, created_at
    FROM operation_logs WHERE ${whereSQL}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  // 将 UTC 时间转换为中国时间
  const logsWithChinaTime = logs.map(log => ({
    ...log,
    created_at: utcToChinaTime(log.created_at)
  }));

  return paginated(res, logsWithChinaTime, total, page, pageSize);
}

/**
 * 导出操作日志为Excel
 */
function exportOperationLogs(req, res) {
  const { user_type, action, keyword, start_date, end_date } = req.query;
  const db = getDatabase();

  let whereClauses = ['1=1'];
  let params = [];

  if (user_type) { whereClauses.push('user_type = ?'); params.push(user_type); }
  if (action) { whereClauses.push('action = ?'); params.push(action); }
  if (keyword) { whereClauses.push('(user_name LIKE ? OR detail LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`); }
  if (start_date) { whereClauses.push('DATE(created_at) >= DATE(?)'); params.push(start_date); }
  if (end_date) { whereClauses.push('DATE(created_at) <= DATE(?)'); params.push(end_date); }

  const whereSQL = whereClauses.join(' AND ');

  const logs = db.prepare(`
    SELECT id, user_type, user_id, user_name, action, target_type, target_id, detail, ip_address, created_at
    FROM operation_logs WHERE ${whereSQL} ORDER BY created_at DESC
  `).all(...params);

  const userTypeMap = { admin: '管理员', teacher: '教师', student: '学生' };
  const actionMap = {
    login: '登录', logout: '登出', add: '新增', update: '修改',
    delete: '删除', reset_password: '重置密码', change_password: '修改密码', import: '导入'
  };

  const excelData = [['序号', '用户类型', '用户名', '操作类型', '操作对象', '操作详情', 'IP地址', '操作时间']];

  logs.forEach((log, index) => {
    excelData.push([
      index + 1,
      userTypeMap[log.user_type] || log.user_type,
      log.user_name,
      actionMap[log.action] || log.action,
      log.target_type || '',
      log.detail || '',
      log.ip_address || '',
      utcToChinaTime(log.created_at)
    ]);
  });

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.aoa_to_sheet(excelData);
  worksheet['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 20 }];
  xlsx.utils.book_append_sheet(workbook, worksheet, '操作日志');

  const filename = `操作日志_${getChinaTimestamp()}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml-sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.send(buffer);
}

/**
 * 获取日志日期范围
 */
function getLogDateRange(req, res) {
  const db = getDatabase();

  const result = db.prepare(`
    SELECT MIN(DATE(created_at)) as min_date, MAX(DATE(created_at)) as max_date
    FROM operation_logs
  `).get();

  return success(res, {
    minDate: result.min_date,
    maxDate: result.max_date
  });
}

/**
 * 删除操作日志
 */
function deleteOperationLogs(req, res) {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请选择要删除的日志');
  }

  const db = getDatabase();
  const sqlPlaceholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM operation_logs WHERE id IN (${sqlPlaceholders})`).run(...ids);

  return success(res, { deleted: result.changes }, `成功删除 ${result.changes} 条日志`);
}

/**
 * 检查班级是否有进行中的考试
 */
function getClassExams(req, res) {
  const { class_name, classId, grade } = req.query;

  if (!class_name && !classId && !grade) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请提供班级信息');
  }

  const db = getDatabase();

  // 获取班级信息
  let targetGrade = grade;
  let targetClassName = class_name;

  if (classId) {
    const classInfo = db.prepare('SELECT grade, class_name FROM classes WHERE id = ?').get(classId);
    if (!classInfo) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '班级不存在');
    }
    targetGrade = classInfo.grade;
    targetClassName = `${classInfo.grade}${classInfo.class_name}`;
  } else if (class_name) {
    // 从 class_name 中提取年级
    const gradeMatch = class_name.match(/^[一二三四五六年级]+/);
    if (gradeMatch) {
      targetGrade = gradeMatch[0];
    }
    targetClassName = class_name;
  }

  // 查询进行中的考试（status = 'published'）
  const activeExams = db.prepare(`
    SELECT id, title, status, start_time, end_time, target_classes, grade
    FROM exam_tasks
    WHERE status = 'published'
  `).all();

  // 筛选包含该班级的考试
  const matchedExams = activeExams.filter(exam => {
    // 如果指定了年级，且考试有年级限制
    if (exam.grade && targetGrade && exam.grade !== targetGrade) {
      return false;
    }

    // 检查目标班级
    if (exam.target_classes) {
      try {
        const targetClasses = JSON.parse(exam.target_classes);
        if (targetClasses && targetClasses.length > 0) {
          // 匹配班级名称
          return targetClasses.some(c => {
            // 支持多种格式的班级名称匹配
            return c === targetClassName ||
              c === targetClassName.replace(/^[一二三四五六年级]+/, '') ||
              targetClassName.includes(c) ||
              c.includes(targetClassName);
          });
        }
      } catch (e) {
        return false;
      }
    }

    // 如果没有指定目标班级，但有年级匹配，也算匹配
    if (exam.grade && targetGrade && exam.grade === targetGrade) {
      return true;
    }

    return false;
  });

  const result = matchedExams.map(exam => ({
    id: exam.id,
    name: exam.title,
    status: '进行中'
  }));

  return success(res, {
    hasActiveExams: result.length > 0,
    active_exams: result
  });
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
  getStats,
  getConfig,
  updateConfig,
  getClassStats,
  getGradeList,
  getClassesByGrade,
  saveClass,
  deleteClass,
  getClassExams,
  getOperationLogs,
  exportOperationLogs,
  getLogDateRange,
  deleteOperationLogs
};
