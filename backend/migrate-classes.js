const path = require('path');
const Database = require('better-sqlite3');

const dbDir = path.join(__dirname, 'database');
const dbPath = path.join(dbDir, 'homework.db');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('开始迁移...');

// 检查 classes 表是否存在
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='classes'").get();

if (!tables) {
  console.log('创建 classes 表...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade VARCHAR(10) NOT NULL,
      class_name VARCHAR(20) NOT NULL,
      status VARCHAR(10) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(grade, class_name)
    )
  `);
  console.log('classes 表创建成功');
}

// 检查是否已有班级数据
const existingClasses = db.prepare("SELECT COUNT(*) as count FROM classes").get();
if (existingClasses.count === 0) {
  console.log('从现有学生数据迁移班级配置...');

  // 从学生表获取所有班级
  const classes = db.prepare(`
    SELECT DISTINCT grade, class_name
    FROM students
    WHERE grade IS NOT NULL AND class_name IS NOT NULL AND class_name != ? AND status IN (?, ?)
    ORDER BY grade, class_name
  `).all('', 'active', 'inactive');

  const insertClass = db.prepare('INSERT OR IGNORE INTO classes (grade, class_name, status) VALUES (?, ?, ?)');

  for (const cls of classes) {
    // 提取简短班级名（去掉年级前缀）
    let shortClassName = cls.class_name;
    if (cls.class_name.includes('年级')) {
      shortClassName = cls.class_name.replace(/^[一二三四五六年级]+/, '');
    }
    insertClass.run(cls.grade, shortClassName, 'active');
    console.log(`  添加班级: ${cls.grade}${shortClassName}`);
  }

  console.log(`成功迁移 ${classes.length} 个班级配置`);
} else {
  console.log(`classes 表已有 ${existingClasses.count} 条数据，跳过迁移`);
}

// 验证迁移结果
const finalCount = db.prepare("SELECT COUNT(*) as count FROM classes").get();
console.log(`迁移完成，classes 表现有 ${finalCount.count} 条记录`);

db.close();
