const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const studentExamController = require('../controllers/studentExamController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// 所有学生考试路由需要认证
router.use(authMiddleware);

// 只有学生可以访问
router.use(roleMiddleware(['student']));

/**
 * @route GET /api/student/exams/home
 * @desc 获取学生首页统计数据
 * @access Student
 */
router.get('/home', studentExamController.getHomeStats);

/**
 * @route GET /api/student/exams/mistakes
 * @desc 获取学生错题列表
 * @access Student
 */
router.get('/mistakes', studentExamController.getMistakes);

/**
 * @route GET /api/student/exams/mistakes/:id
 * @desc 获取单个错题详情（用于重新练习）
 * @access Student
 */
router.get('/mistakes/:id', studentExamController.getMistakeDetail);

/**
 * @route GET /api/student/exams
 * @desc 获取待答题列表
 * @access Student
 */
router.get('/', studentExamController.getStudentExams);

/**
 * @route GET /api/student/exams/records
 * @desc 获取答题记录列表
 * @access Student
 */
router.get('/records', studentExamController.getStudentRecords);

/**
 * @route GET /api/student/exams/records/:id
 * @desc 获取答题记录详情
 * @access Student
 */
router.get('/records/:id', studentExamController.getStudentRecordDetail);

/**
 * @route GET /api/student/exams/ranking/list
 * @desc 获取学生参与过的考试列表（排行榜）
 * @access Student
 */
router.get('/ranking/list', studentExamController.getRankingExams);

/**
 * @route GET /api/student/exams/ranking/class/:taskId
 * @desc 获取班级排名（学生视角）
 * @access Student
 */
router.get('/ranking/class/:taskId', studentExamController.getStudentClassRanking);

/**
 * @route GET /api/student/exams/ranking/grade/:taskId
 * @desc 获取年级排名（学生视角）
 * @access Student
 */
router.get('/ranking/grade/:taskId', studentExamController.getStudentGradeRanking);

/**
 * @route GET /api/student/exams/:id
 * @desc 获取考试任务详情
 * @access Student
 */
router.get('/:id', studentExamController.getStudentExamDetail);

/**
 * @route POST /api/student/exams/:id/start
 * @desc 开始答题
 * @access Student
 */
router.post('/:id/start', studentExamController.startExam);

/**
 * @route PUT /api/student/exams/:id/save
 * @desc 保存答案
 * @access Student
 */
router.put('/:id/save', studentExamController.saveAnswer);

/**
 * @route POST /api/student/exams/:id/submit
 * @desc 提交试卷
 * @access Student
 */
router.post('/:id/submit', [
  body('answers').isArray().withMessage('答案格式错误'),
  body('time_used').isInt({ min: 0 }).withMessage('答题时间格式错误')
], studentExamController.submitExam);

module.exports = router;