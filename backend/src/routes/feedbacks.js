const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const feedbackController = require('../controllers/feedbackController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

// 提交反馈（学生/教师）
router.post('/', [
  body('title').notEmpty().withMessage('标题不能为空'),
  body('content').notEmpty().withMessage('内容不能为空')
], authMiddleware, feedbackController.submitFeedback);

// 获取我的反馈（学生/教师）
router.get('/my', authMiddleware, feedbackController.getMyFeedbacks);

// 获取所有反馈（管理员）
router.get('/', adminMiddleware, feedbackController.getAllFeedbacks);

// 更新反馈（管理员）
router.put('/:id', [
  body('status').optional().isIn(['pending', 'in_progress', 'resolved']),
  body('admin_reply').optional().isString()
], adminMiddleware, feedbackController.updateFeedback);

// 删除反馈（管理员）
router.delete('/:id', adminMiddleware, feedbackController.deleteFeedback);

module.exports = router;