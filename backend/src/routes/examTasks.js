const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const examController = require('../controllers/examController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// 所有考试任务路由需要认证
router.use(authMiddleware);

// 只有教师和管理员可以访问
router.use(roleMiddleware(['teacher', 'admin']));

/**
 * @route GET /api/exam-tasks/classes
 * @desc 获取教师可选择的班级列表
 * @access Teacher, Admin
 */
router.get('/classes', examController.getAvailableClasses);

/**
 * @route GET /api/exam-tasks/all-classes
 * @desc 获取所有班级列表（供管理员使用）
 * @access Admin
 */
router.get('/all-classes', examController.getAllClasses);

/**
 * @route POST /api/exam-tasks/auto-generate
 * @desc 自动出题
 * @access Teacher, Admin
 */
router.post('/auto-generate', [
  body('subject').notEmpty().withMessage('科目不能为空'),
  body('question_config').isArray({ min: 1 }).withMessage('请配置题目')
], examController.autoGenerateQuestions);

/**
 * @route GET /api/exam-tasks
 * @desc 获取考试任务列表
 * @access Teacher, Admin
 */
router.get('/', examController.getExamTasks);

/**
 * @route GET /api/exam-tasks/ranking/list
 * @desc 获取排行榜考试列表
 * @access Teacher, Admin
 */
router.get('/ranking/list', examController.getRankingExams);

/**
 * @route GET /api/exam-tasks/ranking/class/:taskId
 * @desc 获取班级排名
 * @access Teacher, Admin
 */
router.get('/ranking/class/:taskId', examController.getClassRanking);

/**
 * @route GET /api/exam-tasks/ranking/grade/:taskId
 * @desc 获取年级排名
 * @access Teacher, Admin
 */
router.get('/ranking/grade/:taskId', examController.getGradeRanking);

/**
 * @route GET /api/exam-tasks/:id
 * @desc 获取考试任务详情
 * @access Teacher, Admin
 */
router.get('/:id', examController.getExamTaskById);

/**
 * @route POST /api/exam-tasks
 * @desc 创建考试任务
 * @access Teacher, Admin
 */
router.post('/', [
  body('title').notEmpty().withMessage('标题不能为空'),
  body('subject').notEmpty().withMessage('科目不能为空'),
  body('questions').isArray({ min: 1 }).withMessage('请添加至少一道题目')
], examController.createExamTask);

/**
 * @route PUT /api/exam-tasks/:id/publish
 * @desc 发布考试任务
 * @access Teacher, Admin
 */
router.put('/:id/publish', examController.publishExamTask);

/**
 * @route PUT /api/exam-tasks/:id/withdraw
 * @desc 撤回考试任务到草稿状态
 * @access Teacher, Admin
 */
router.put('/:id/withdraw', examController.withdrawExamTask);

/**
 * @route PUT /api/exam-tasks/:id
 * @desc 更新考试任务
 * @access Teacher, Admin
 */
router.put('/:id', examController.updateExamTask);

/**
 * @route DELETE /api/exam-tasks/:id
 * @desc 删除考试任务
 * @access Teacher, Admin
 */
router.delete('/:id', examController.deleteExamTask);

module.exports = router;
