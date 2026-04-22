const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const gradingController = require('../controllers/gradingController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// 所有批改路由需要认证
router.use(authMiddleware);

// 只有教师和管理员可以访问
router.use(roleMiddleware(['teacher', 'admin']));

/**
 * @route POST /api/grading/ai-fill
 * @desc AI批改填空题
 * @access Teacher, Admin
 */
router.post('/ai-fill', [
  body('questionId').isInt().withMessage('题目ID格式错误'),
  body('studentAnswer').notEmpty().withMessage('学生答案不能为空')
], gradingController.aiGradeFill);

/**
 * @route POST /api/grading/ai-subjective
 * @desc AI批改主观题
 * @access Teacher, Admin
 */
router.post('/ai-subjective', [
  body('questionId').isInt().withMessage('题目ID格式错误'),
  body('studentAnswer').notEmpty().withMessage('学生答案不能为空')
], gradingController.aiGradeSubjective);

/**
 * @route POST /api/grading/batch
 * @desc 批量批改考试答卷
 * @access Teacher, Admin
 */
router.post('/batch', [
  body('examAnswerId').isInt().withMessage('答题记录ID格式错误')
], gradingController.batchGrade);

/**
 * @route GET /api/grading/pending
 * @desc 获取待批改列表（按考试任务分组）
 * @access Teacher, Admin
 */
router.get('/pending', gradingController.getPendingGradingList);

/**
 * @route GET /api/grading/task/:taskId/students
 * @desc 获取某考试的学生答卷列表
 * @access Teacher, Admin
 */
router.get('/task/:taskId/students', gradingController.getTaskStudents);

/**
 * @route GET /api/grading/task/:taskId/config
 * @desc 获取某考试的批改配置
 * @access Teacher, Admin
 */
router.get('/task/:taskId/config', gradingController.getTaskGradingConfig);

/**
 * @route GET /api/grading/answer/:answerId
 * @desc 获取学生答卷详情
 * @access Teacher, Admin
 */
router.get('/answer/:answerId', gradingController.getAnswerDetail);

/**
 * @route POST /api/grading/adjust
 * @desc 教师调整分数（单题）
 * @access Teacher, Admin
 */
router.post('/adjust', [
  body('answerDetailId').isInt().withMessage('答题详情ID格式错误'),
  body('score').isFloat({ min: 0 }).withMessage('分数必须大于等于0')
], gradingController.adjustScore);

/**
 * @route POST /api/grading/save
 * @desc 保存批改结果（批量）
 * @access Teacher, Admin
 */
router.post('/save', [
  body('examAnswerId').isInt().withMessage('答题记录ID格式错误'),
  body('gradings').isArray().withMessage('批改数据格式错误')
], gradingController.saveGrading);

module.exports = router;
