/**
 * 数据库迁移脚本：统一班级名称格式
 *
 * 问题：学生表 class_name 字段可能存储了完整格式（如"一年级1班"）
 * 目标：统一为简短格式（如"1班"）
 *
 * 运行方式：node migrate-class-format.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'database/homework.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('开始迁移班级格式...');

/**
 * 从完整班级名称中提取简短班级名称
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

try {
  // 开始事务
  const migrate = db.transaction(() => {
    // 1. 检查并更新 students 表
    console.log('\n=== 检查 students 表 ===');
    const students = db.prepare('SELECT id, grade, class_name FROM students WHERE class_name IS NOT NULL').all();

    let studentsUpdated = 0;
    for (const student of students) {
      const shortName = extractShortClassName(student.class_name);
      if (shortName !== student.class_name) {
        console.log(`  学生 ID=${student.id}: "${student.class_name}" -> "${shortName}"`);
        db.prepare('UPDATE students SET class_name = ? WHERE id = ?').run(shortName, student.id);
        studentsUpdated++;
      }
    }
    console.log(`students 表更新了 ${studentsUpdated} 条记录`);

    // 2. 检查并更新 classes 表
    console.log('\n=== 检查 classes 表 ===');
    const classes = db.prepare('SELECT id, grade, class_name FROM classes WHERE class_name IS NOT NULL').all();

    let classesUpdated = 0;
    for (const cls of classes) {
      const shortName = extractShortClassName(cls.class_name);
      if (shortName !== cls.class_name) {
        console.log(`  班级 ID=${cls.id}: "${cls.class_name}" -> "${shortName}"`);
        db.prepare('UPDATE classes SET class_name = ? WHERE id = ?').run(shortName, cls.id);
        classesUpdated++;
      }
    }
    console.log(`classes 表更新了 ${classesUpdated} 条记录`);

    // 3. 验证迁移结果
    console.log('\n=== 验证迁移结果 ===');

    // 检查 students 表中是否还有完整格式的班级名
    const invalidStudents = db.prepare(`
      SELECT id, grade, class_name FROM students
      WHERE class_name LIKE '%一年级%'
         OR class_name LIKE '%二年级%'
         OR class_name LIKE '%三年级%'
         OR class_name LIKE '%四年级%'
         OR class_name LIKE '%五年级%'
         OR class_name LIKE '%六年级%'
    `).all();

    if (invalidStudents.length > 0) {
      console.log('警告: students 表中仍有完整格式的班级名:');
      invalidStudents.forEach(s => console.log(`  ID=${s.id}: ${s.class_name}`));
    } else {
      console.log('students 表验证通过，所有班级名均为简短格式');
    }

    // 检查 classes 表中是否还有完整格式的班级名
    const invalidClasses = db.prepare(`
      SELECT id, grade, class_name FROM classes
      WHERE class_name LIKE '%一年级%'
         OR class_name LIKE '%二年级%'
         OR class_name LIKE '%三年级%'
         OR class_name LIKE '%四年级%'
         OR class_name LIKE '%五年级%'
         OR class_name LIKE '%六年级%'
    `).all();

    if (invalidClasses.length > 0) {
      console.log('警告: classes 表中仍有完整格式的班级名:');
      invalidClasses.forEach(c => console.log(`  ID=${c.id}: ${c.class_name}`));
    } else {
      console.log('classes 表验证通过，所有班级名均为简短格式');
    }

    // 4. 显示最终统计
    console.log('\n=== 最终统计 ===');
    const studentStats = db.prepare(`
      SELECT grade, class_name, COUNT(*) as count
      FROM students
      WHERE status != 'deleted'
      GROUP BY grade, class_name
      ORDER BY grade, class_name
    `).all();

    console.log('学生班级分布:');
    studentStats.forEach(s => console.log(`  ${s.grade} ${s.class_name}: ${s.count}人`));

    const classStats = db.prepare(`
      SELECT grade, class_name
      FROM classes
      WHERE status = 'active'
      ORDER BY grade, class_name
    `).all();

    console.log('\n班级配置:');
    classStats.forEach(c => console.log(`  ${c.grade} ${c.class_name}`));
  });

  // 执行迁移
  migrate();

  console.log('\n迁移完成！');
} catch (err) {
  console.error('迁移失败:', err);
  process.exit(1);
} finally {
  db.close();
}
