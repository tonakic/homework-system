const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');
const questionController = require('../controllers/questionController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// 内存存储用于导入
const uploadMemory = multer({ storage: multer.memoryStorage() });

// 所有题库管理路由需要认证
router.use(authMiddleware);

// 只有教师和管理员可以访问
router.use(roleMiddleware(['teacher', 'admin']));

/**
 * @route GET /api/questions/tree
 * @desc 获取题库目录树
 * @access Teacher, Admin
 */
router.get('/tree', questionController.getQuestionTree);

/**
 * @route GET /api/questions/template
 * @desc 下载导入模板
 * @access Teacher, Admin
 */
router.get('/template', questionController.downloadTemplate);

/**
 * @route POST /api/questions/import
 * @desc 批量导入题目
 * @access Teacher, Admin
 */
router.post('/import', uploadMemory.single('file'), questionController.importQuestions);

/**
 * @route GET /api/questions
 * @desc 获取题目列表
 * @access Teacher, Admin
 */
router.get('/', questionController.getQuestions);

/**
 * @route GET /api/questions/:id
 * @desc 获取题目详情
 * @access Teacher, Admin
 */
router.get('/:id', questionController.getQuestionById);

/**
 * @route POST /api/questions
 * @desc 新增题目
 * @access Teacher, Admin
 */
router.post('/', [
  body('question_type').isIn(['choice', 'multiple', 'fill', 'judgment', 'subjective']).withMessage('无效的题目类型'),
  body('subject').notEmpty().withMessage('科目不能为空'),
  body('content').notEmpty().withMessage('题目内容不能为空'),
  body('answer').notEmpty().withMessage('答案不能为空')
], questionController.addQuestion);

/**
 * @route PUT /api/questions/:id
 * @desc 编辑题目
 * @access Teacher, Admin
 */
router.put('/:id', questionController.updateQuestion);

/**
 * @route DELETE /api/questions/:id
 * @desc 删除题目
 * @access Teacher, Admin
 */
router.delete('/:id', questionController.deleteQuestion);

/**
 * @route POST /api/questions/batch
 * @desc 批量获取题目
 * @access Teacher, Admin
 */
router.post('/batch', questionController.getQuestionsByIds);

module.exports = router;