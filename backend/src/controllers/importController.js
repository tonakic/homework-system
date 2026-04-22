const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../config/database');
const { success, error, ErrorCodes } = require('../utils/response');
const { hashPassword } = require('../utils/password');
const { getDefaultPassword } = require('../constants');

/**
 * 从完整班级名称中提取简短班级名称
 * 例如: "一年级1班" -> "1班", "二年级2班" -> "2班"
 * 如果已经是简短格式，则原样返回
 */
function extractShortClassName(className) {
  if (!className) return className;
  // 匹配 "X年级Y班" 格式，提取 "Y班" 部分
  const match = String(className).match(/^[一二三四五六年级]+(\d+班)$/);
  if (match) {
    return match[1]; // 返回 "Y班" 部分
  }
  // 如果不匹配完整格式，可能是已经简短格式，原样返回
  return String(className);
}

/**
 * 下载学生导入模板
 */
function downloadStudentTemplate(req, res) {
  const templatePath = path.join(__dirname, '../templates/student_template.xlsx');

  // 确保模板目录存在
  const templateDir = path.dirname(templatePath);
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  // 如果模板不存在，创建模板
  if (!fs.existsSync(templatePath)) {
    const workbook = xlsx.utils.book_new();
    const data = [
      ['学号*', '学生姓名*', '性别', '年级*', '班级*', '家长姓名', '联系方式', '备注'],
      ['202601001', '张三', '男', '一年级', '1班', '张父', '13800138000', ''],
      ['202601002', '李四', '女', '一年级', '1班', '李母', '13900139000', '过敏史']
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(data);

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 20 }
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, '学生信息');
    xlsx.writeFile(workbook, templatePath);
  }

  res.download(templatePath, '学生导入模板.xlsx');
}

/**
 * 批量导入学生
 */
async function importStudents(req, res) {
  if (!req.file) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请上传Excel文件');
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return error(res, ErrorCodes.VALIDATION_ERROR, 'Excel文件中没有数据');
    }

    const db = getDatabase();
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // 获取教师可管理的班级
    let allowedClasses = null;
    if (req.user.userType === 'teacher') {
      allowedClasses = Array.isArray(req.user.manage_classes) ? req.user.manage_classes : JSON.parse(req.user.manage_classes || '[]');
    }

    // 加密默认密码
    const hashedPassword = await hashPassword(getDefaultPassword('student'));

    // 使用事务
    const insertStmt = db.prepare(`
      INSERT INTO students (student_no, name, gender, grade, class_name, parent_name, phone, remark, password, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const insertMany = db.transaction((students) => {
      for (let i = 0; i < students.length; i++) {
        const row = students[i];
        const rowNum = i + 2; // Excel行号（从第2行开始）

        // 验证必填字段
        const studentNo = row['学号*'] || row['学号'];
        const name = row['学生姓名*'] || row['学生姓名'] || row['姓名'];
        const grade = row['年级*'] || row['年级'];
        const className = row['班级*'] || row['班级'];

        if (!studentNo) {
          results.failed++;
          results.errors.push({ row: rowNum, reason: '学号不能为空' });
          continue;
        }

        if (!name) {
          results.failed++;
          results.errors.push({ row: rowNum, reason: '姓名不能为空' });
          continue;
        }

        if (!grade) {
          results.failed++;
          results.errors.push({ row: rowNum, reason: '年级不能为空' });
          continue;
        }

        if (!className) {
          results.failed++;
          results.errors.push({ row: rowNum, reason: '班级不能为空' });
          continue;
        }

        // 检查教师权限（需要组合年级+班级进行匹配）
        // 将班级名称转换为简短格式
        const shortClassName = extractShortClassName(className);
        if (allowedClasses) {
          const fullClassName = `${grade}${shortClassName}`;
          if (!allowedClasses.includes(fullClassName) && !allowedClasses.includes(shortClassName)) {
            results.failed++;
            results.errors.push({ row: rowNum, reason: `无权限管理班级: ${className}` });
            continue;
          }
        }

        // 检查学号是否已存在
        const existing = db.prepare('SELECT id FROM students WHERE student_no = ?').get(studentNo);
        if (existing) {
          results.failed++;
          results.errors.push({ row: rowNum, reason: `学号已存在: ${studentNo}` });
          continue;
        }

        try {
          insertStmt.run(
            String(studentNo),
            String(name),
            row['性别'] || null,
            String(grade),
            shortClassName, // 存储简短格式
            row['家长姓名'] || null,
            row['联系方式'] ? String(row['联系方式']) : null,
            row['备注'] || null,
            hashedPassword
          );
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({ row: rowNum, reason: err.message });
        }
      }
    });

    insertMany(data);

    // 删除上传的文件
    fs.unlinkSync(req.file.path);

    // 记录操作日志
    logOperation(req.user, 'import', 'student', null, `批量导入学生: 成功${results.success}条，失败${results.failed}条`, req.ip);

    return success(res, results, '导入完成');
  } catch (err) {
    // 删除上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('导入学生失败:', err);
    return error(res, ErrorCodes.INTERNAL_ERROR, '导入失败: ' + err.message);
  }
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

/**
 * 下载教师导入模板
 */
function downloadTeacherTemplate(req, res) {
  const templatePath = path.join(__dirname, '../templates/teacher_template.xlsx');

  // 确保模板目录存在
  const templateDir = path.dirname(templatePath);
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  // 如果模板不存在，创建模板
  if (!fs.existsSync(templatePath)) {
    const workbook = xlsx.utils.book_new();
    const data = [
      ['工号*', '教师姓名*', '性别', '教授科目*', '联系电话', '管理班级', '备注'],
      ['T001', '王老师', '男', '语文,数学', '13800138000', '一年级1班,一年级2班', ''],
      ['T002', '李老师', '女', '英语', '13900139000', '二年级1班', '班主任']
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(data);

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 10 }, { wch: 10 }, { wch: 6 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 20 }
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, '教师信息');
    xlsx.writeFile(workbook, templatePath);
  }

  res.download(templatePath, '教师导入模板.xlsx');
}

/**
 * 批量导入教师
 */
async function importTeachers(req, res) {
  if (!req.file) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请上传Excel文件');
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return error(res, ErrorCodes.VALIDATION_ERROR, 'Excel文件中没有数据');
    }

    const db = getDatabase();
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // 加密默认密码
    const hashedPassword = await hashPassword(getDefaultPassword('teacher'));

    // 使用事务
    const insertStmt = db.prepare(`
      INSERT INTO teachers (teacher_no, name, gender, subjects, phone, manage_classes, remark, password, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const insertMany = db.transaction((teachers) => {
      for (let i = 0; i < teachers.length; i++) {
        const row = teachers[i];
        const rowNum = i + 2; // Excel行号（从第2行开始）

        // 验证必填字段
        const teacherNo = row['工号*'] || row['工号'];
        const name = row['教师姓名*'] || row['教师姓名'] || row['姓名'];
        const subjectsStr = row['教授科目*'] || row['教授科目'] || row['科目'];

        if (!teacherNo) {
          results.failed++;
          results.errors.push({ row: rowNum, reason: '工号不能为空' });
          continue;
        }

        if (!name) {
          results.failed++;
          results.errors.push({ row: rowNum, reason: '姓名不能为空' });
          continue;
        }

        if (!subjectsStr) {
          results.failed++;
          results.errors.push({ row: rowNum, reason: '教授科目不能为空' });
          continue;
        }

        // 检查工号是否已存在
        const existing = db.prepare('SELECT id FROM teachers WHERE teacher_no = ?').get(String(teacherNo));
        if (existing) {
          results.failed++;
          results.errors.push({ row: rowNum, reason: `工号已存在: ${teacherNo}` });
          continue;
        }

        try {
          // 解析科目和管理班级
          const subjects = subjectsStr.toString().split(/[,，]/).map(s => s.trim()).filter(s => s);
          const manageClassesStr = row['管理班级'] || '';
          const manageClasses = manageClassesStr ? manageClassesStr.toString().split(/[,，]/).map(s => s.trim()).filter(s => s) : [];

          insertStmt.run(
            String(teacherNo),
            String(name),
            row['性别'] || null,
            JSON.stringify(subjects),
            row['联系电话'] ? String(row['联系电话']) : null,
            manageClasses.length > 0 ? JSON.stringify(manageClasses) : null,
            row['备注'] || null,
            hashedPassword
          );
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({ row: rowNum, reason: err.message });
        }
      }
    });

    insertMany(data);

    // 删除上传的文件
    fs.unlinkSync(req.file.path);

    // 记录操作日志
    logOperation(req.user, 'import', 'teacher', null, `批量导入教师: 成功${results.success}条，失败${results.failed}条`, req.ip);

    return success(res, results, '导入完成');
  } catch (err) {
    // 删除上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('导入教师失败:', err);
    return error(res, ErrorCodes.INTERNAL_ERROR, '导入失败: ' + err.message);
  }
}

module.exports = {
  downloadStudentTemplate,
  importStudents,
  downloadTeacherTemplate,
  importTeachers
};