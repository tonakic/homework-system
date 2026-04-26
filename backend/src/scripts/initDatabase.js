const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { hashPassword } = require('../utils/password');
const { getDefaultPassword } = require('../constants');
const config = require('../config');

const dbDir = path.join(__dirname, '../../database');
const dbPath = path.join(dbDir, 'homework.db');

// 确保数据库目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

/**
 * 初始化数据库表
 */
function initTables() {
  // 管理员表
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(20) NOT NULL,
      password VARCHAR(64) NOT NULL,
      status VARCHAR(10) DEFAULT 'active',
      first_login INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 学生表
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_no VARCHAR(12) UNIQUE NOT NULL,
      name VARCHAR(20) NOT NULL,
      gender VARCHAR(2),
      grade VARCHAR(10),
      class_name VARCHAR(10),
      parent_name VARCHAR(20),
      phone VARCHAR(15),
      remark TEXT,
      password VARCHAR(64) NOT NULL,
      status VARCHAR(10) DEFAULT 'active',
      first_login INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 教师表
  db.exec(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_no VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(20) NOT NULL,
      gender VARCHAR(2),
      subjects TEXT,
      phone VARCHAR(15),
      manage_classes TEXT,
      remark TEXT,
      password VARCHAR(64) NOT NULL,
      status VARCHAR(10) DEFAULT 'active',
      first_login INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 题目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_type VARCHAR(20) NOT NULL,
      subject VARCHAR(10) NOT NULL,
      grade VARCHAR(10),
      chapter VARCHAR(50),
      content TEXT NOT NULL,
      options TEXT,
      answer TEXT NOT NULL,
      analysis TEXT,
      difficulty VARCHAR(10) DEFAULT 'medium',
      score DECIMAL(5,2) DEFAULT 2,
      use_count INTEGER DEFAULT 0,
      correct_rate DECIMAL(5,2),
      is_special INTEGER DEFAULT 0,
      status VARCHAR(10) DEFAULT 'active',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 考试任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS exam_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(100) NOT NULL,
      subject VARCHAR(10) NOT NULL,
      grade VARCHAR(10),
      target_classes TEXT,
      creator_id INTEGER NOT NULL,
      creator_type VARCHAR(10) NOT NULL,
      creator_name VARCHAR(20),
      start_time DATETIME,
      end_time DATETIME,
      duration INTEGER DEFAULT 0,
      questions TEXT,
      total_score DECIMAL(5,2),
      grading_mode VARCHAR(20),
      status VARCHAR(20) DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 答题记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS exam_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      answers TEXT,
      start_time DATETIME,
      submit_time DATETIME,
      time_used INTEGER,
      total_score DECIMAL(5,2),
      status VARCHAR(20),
      graded_at DATETIME,
      graded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, student_id)
    )
  `);

  // 题目作答详情表
  db.exec(`
    CREATE TABLE IF NOT EXISTS question_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_answer_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      student_answer TEXT,
      score DECIMAL(5,2),
      is_correct INTEGER,
      ai_score DECIMAL(5,2),
      ai_comment TEXT,
      teacher_score DECIMAL(5,2),
      teacher_comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 系统配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key VARCHAR(50) UNIQUE NOT NULL,
      config_value TEXT,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 操作日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_type VARCHAR(10),
      user_id INTEGER,
      user_name VARCHAR(20),
      action VARCHAR(50),
      target_type VARCHAR(20),
      target_id INTEGER,
      detail TEXT,
      ip_address VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 登录失败记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_type VARCHAR(10) NOT NULL,
      account VARCHAR(50) NOT NULL,
      attempt_count INTEGER DEFAULT 0,
      lock_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_type, account)
    )
  `);

  // 批改配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS grading_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_name VARCHAR(50) UNIQUE NOT NULL,
      grading_mode VARCHAR(20) NOT NULL,
      ai_provider VARCHAR(20),
      ai_model VARCHAR(50),
      ai_endpoint VARCHAR(200),
      ai_api_key TEXT,
      ai_temperature DECIMAL(3,2) DEFAULT 0.3,
      ai_timeout INTEGER DEFAULT 30000,
      prompt_strictness VARCHAR(10) DEFAULT 'medium',
      prompt_style VARCHAR(20) DEFAULT 'encouraging',
      prompt_comment_length VARCHAR(10) DEFAULT 'medium',
      prompt_subject_focus TEXT,
      prompt_encourage_ratio INTEGER DEFAULT 30,
      prompt_analysis_detail VARCHAR(10) DEFAULT 'medium',
      mixed_config TEXT,
      is_default INTEGER DEFAULT 0,
      status VARCHAR(10) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 班级配置表
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

  // 批改队列表
  db.exec(`
    CREATE TABLE IF NOT EXISTS grading_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_answer_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      priority INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      error_message TEXT,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_answer_id) REFERENCES exam_answers(id),
      FOREIGN KEY (task_id) REFERENCES exam_tasks(id),
      FOREIGN KEY (student_id) REFERENCES students(id)
    )
  `);

  // 批改队列配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS grading_queue_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key VARCHAR(50) UNIQUE NOT NULL,
      config_value TEXT,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 反馈表
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_type VARCHAR(10) NOT NULL,
      user_id INTEGER NOT NULL,
      user_name VARCHAR(20),
      title VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      admin_reply TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_grading_queue_status ON grading_queue(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_grading_queue_priority ON grading_queue(priority DESC, created_at ASC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_grading_queue_answer ON grading_queue(exam_answer_id)`);

  console.log('数据库表创建完成');
}

/**
 * 初始化默认数据
 */
async function initDefaultData() {
  // 检查是否已有管理员
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();

  if (adminCount.count === 0) {
    // 创建默认管理员
    const hashedPassword = await hashPassword('Admin@123456');
    db.prepare(`
      INSERT INTO admins (username, name, password, status)
      VALUES (?, ?, ?, ?)
    `).run('admin', '系统管理员', hashedPassword, 'active');

    console.log('默认管理员账户已创建: admin / Admin@123456');
  }

  // 初始化系统配置
  const defaultConfigs = [
    ['login_max_attempts', '5', '登录失败锁定次数'],
    ['login_lock_time', '15', '锁定时长（分钟）'],
    ['default_password', '123456', '新用户默认密码'],
    ['max_exam_duration', '120', '单次答题最大时长（分钟）'],
    ['upload_max_size', '10485760', '文件上传大小限制（字节）'],
    ['page_size', '20', '分页每页数量']
  ];

  const insertConfig = db.prepare('INSERT OR IGNORE INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)');

  for (const config of defaultConfigs) {
    insertConfig.run(...config);
  }

  // 初始化批改配置
  const gradingConfigs = [
    ['默认手动批改', 'manual', 1],
    ['默认AI批改', 'ai', 0]
  ];

  const insertGradingConfig = db.prepare(`
    INSERT OR IGNORE INTO grading_config (config_name, grading_mode, is_default)
    VALUES (?, ?, ?)
  `);

  for (const config of gradingConfigs) {
    insertGradingConfig.run(...config);
  }

  // 初始化批改队列配置
  const queueConfigs = [
    ['max_concurrent', '3', '最大并发AI批改任务数'],
    ['default_max_retries', '3', '默认最大重试次数'],
    ['retry_delay_ms', '5000', '重试间隔（毫秒）'],
    ['task_timeout_ms', '60000', '单个任务超时时间（毫秒）']
  ];

  const insertQueueConfig = db.prepare('INSERT OR IGNORE INTO grading_queue_config (config_key, config_value, description) VALUES (?, ?, ?)');

  for (const config of queueConfigs) {
    insertQueueConfig.run(...config);
  }

  // 检查并添加 exam_tasks 表的 grading_config_id 字段
  try {
    const tableInfo = db.prepare('PRAGMA table_info(exam_tasks)').all();
    const hasGradingConfigId = tableInfo.some(col => col.name === 'grading_config_id');
    if (!hasGradingConfigId) {
      db.exec('ALTER TABLE exam_tasks ADD COLUMN grading_config_id INTEGER REFERENCES grading_config(id)');
      console.log('exam_tasks 表添加 grading_config_id 字段');
    }
    const hasCreatorType = tableInfo.some(col => col.name === 'creator_type');
    if (!hasCreatorType) {
      db.exec("ALTER TABLE exam_tasks ADD COLUMN creator_type VARCHAR(10) NOT NULL DEFAULT 'teacher'");
      console.log('exam_tasks 表添加 creator_type 字段');
    }
  } catch (err) {
    console.log('检查 exam_tasks 字段:', err.message);
  }

  console.log('系统配置初始化完成');
}

/**
 * 创建示例数据
 */
async function createSampleData() {
  // 创建示例教师
  const teacherCount = db.prepare('SELECT COUNT(*) as count FROM teachers').get();

  if (teacherCount.count === 0) {
    const hashedPassword = await hashPassword(getDefaultPassword('teacher'));

    const teachers = [
      ['T2026001', '王老师', '女', '["语文"]', '["一年级1班", "一年级2班"]'],
      ['T2026002', '李老师', '男', '["数学"]', '["一年级1班"]'],
      ['T2026003', '张老师', '女', '["英语"]', '["三年级1班", "三年级2班"]']
    ];

    const insertTeacher = db.prepare(`
      INSERT INTO teachers (teacher_no, name, gender, subjects, manage_classes, password, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);

    for (const teacher of teachers) {
      insertTeacher.run(...teacher, hashedPassword);
    }

    console.log('示例教师数据已创建');
  }

  // 创建示例班级配置
  const classCount = db.prepare('SELECT COUNT(*) as count FROM classes').get();

  if (classCount.count === 0) {
    const classes = [
      ['一年级', '1班'],
      ['一年级', '2班'],
      ['三年级', '1班'],
      ['三年级', '2班']
    ];

    const insertClass = db.prepare(`
      INSERT INTO classes (grade, class_name, status)
      VALUES (?, ?, 'active')
    `);

    for (const cls of classes) {
      insertClass.run(...cls);
    }

    console.log('示例班级配置已创建');
  }

  // 创建示例学生
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get();

  if (studentCount.count === 0) {
    const hashedPassword = await hashPassword(getDefaultPassword('student'));

    const students = [
      ['202601001', '张三', '男', '一年级', '1班'],
      ['202601002', '李四', '女', '一年级', '1班'],
      ['202601003', '王五', '男', '一年级', '1班'],
      ['202601004', '赵六', '女', '一年级', '2班'],
      ['202601005', '钱七', '男', '一年级', '2班'],
      ['202603001', '孙八', '男', '三年级', '1班'],
      ['202603002', '周九', '女', '三年级', '1班']
    ];

    const insertStudent = db.prepare(`
      INSERT INTO students (student_no, name, gender, grade, class_name, password, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);

    for (const student of students) {
      insertStudent.run(...student, hashedPassword);
    }

    console.log('示例学生数据已创建');
  }

  // 创建示例题目
  const questionCount = db.prepare('SELECT COUNT(*) as count FROM questions').get();

  if (questionCount.count === 0) {
    const questions = [
      // 选择题
      ['choice', '语文', '一年级', '第一章 拼音', '下列哪个是韵母？', '["a", "o", "e", "b"]', 'D', 'b是声母，其他都是韵母', 'easy', 2],
      ['choice', '语文', '一年级', '第一章 拼音', '"天"的正确拼音是？', '["tiān", "tian", "tiàn", "tiǎn"]', 'A', '天的拼音是tiān，第一声', 'easy', 2],
      ['choice', '数学', '一年级', '认识数字', '1+1等于多少？', '["1", "2", "3", "4"]', 'B', '这是最基本的加法', 'easy', 2],
      ['choice', '数学', '一年级', '加减法', '5-2等于多少？', '["1", "2", "3", "4"]', 'C', '5减2等于3', 'easy', 2],

      // 填空题
      ['fill', '语文', '一年级', '第二章 汉字', '中国的首都是____。', null, '["北京"]', '北京是中华人民共和国首都', 'easy', 2],
      ['fill', '数学', '一年级', '加减法', '10-3=____', null, '["7"]', '10减3等于7', 'easy', 2],

      // 主观题
      ['subjective', '语文', '一年级', '看图写话', '请看图写一句话描述春天。', null, '春天来了，花儿开了，小鸟在树上唱歌。', '答案要提到春天的特点，如花、树、鸟等', 'medium', 5]
    ];

    const insertQuestion = db.prepare(`
      INSERT INTO questions (question_type, subject, grade, chapter, content, options, answer, analysis, difficulty, score, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    for (const question of questions) {
      insertQuestion.run(...question);
    }

    console.log('示例题目数据已创建');
  }
}

// 执行初始化
async function main() {
  console.log('开始初始化数据库...');

  initTables();
  await initDefaultData();
  await createSampleData();

  console.log('数据库初始化完成！');
  db.close();
}

main().catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
