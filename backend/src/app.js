const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const config = require('./config');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { cleanExpiredLoginAttempts } = require('./services/loginService');
const { getGradingQueueService } = require('./services/gradingQueueService');

// 导入路由
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const questionRoutes = require('./routes/questions');
const examTaskRoutes = require('./routes/examTasks');
const studentExamRoutes = require('./routes/studentExams');
const gradingRoutes = require('./routes/grading');
const importRoutes = require('./routes/import');
const adminRoutes = require('./routes/admin');
const gradingConfigRoutes = require('./routes/gradingConfig');
const gradingQueueRoutes = require('./routes/gradingQueue');
const statisticsRoutes = require('./routes/statistics');
const feedbackRoutes = require('./routes/feedbacks');

// 初始化数据库
require('./scripts/initDatabase');

// 启动时清理过期的登录失败记录
cleanExpiredLoginAttempts();
// 每小时清理一次
setInterval(cleanExpiredLoginAttempts, 60 * 60 * 1000);

const app = express();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel文件'));
    }
  }
});

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(uploadDir));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exam-tasks', examTaskRoutes);
app.use('/api/student/exams', studentExamRoutes);
app.use('/api/grading', gradingRoutes);
app.use('/api/import', importRoutes(upload));
app.use('/api/admin', adminRoutes);
app.use('/api/grading-config', gradingConfigRoutes);
app.use('/api/grading-queue', gradingQueueRoutes);
app.use('/api/teacher', statisticsRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/feedbacks', feedbackRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
const server = app.listen(config.port, async () => {
  console.log(`服务器已启动: http://localhost:${config.port}`);
  console.log(`环境: ${config.env}`);

  // 启动批改队列服务
  const queueService = getGradingQueueService();
  await queueService.start();
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');

  // 停止批改队列服务
  const queueService = getGradingQueueService();
  await queueService.stop();

  server.close(() => {
    const { closeDatabase } = require('./config/database');
    closeDatabase();
    console.log('服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;