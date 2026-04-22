const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth');

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post('/login', [
  body('userType').isIn(['student', 'teacher', 'admin']).withMessage('无效的用户类型'),
  body('account').notEmpty().withMessage('账号不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
], authController.login);

/**
 * @route POST /api/auth/change-password
 * @desc 修改密码
 * @access Private
 */
router.post('/change-password', [
  body('oldPassword').notEmpty().withMessage('原密码不能为空'),
  body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6位')
], authMiddleware, authController.changePassword);

/**
 * @route GET /api/auth/profile
 * @desc 获取当前用户信息
 * @access Private
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * @route POST /api/auth/logout
 * @desc 用户登出
 * @access Private
 */
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
