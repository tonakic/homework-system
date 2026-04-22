const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const teacherController = require('../controllers/teacherController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// 所有教师管理路由需要认证
router.use(authMiddleware);

// 只有管理员可以访问教师管理
router.use(roleMiddleware(['admin']));

/**
 * @route GET /api/teachers
 * @desc 获取教师列表
 * @access Admin
 */
router.get('/', teacherController.getTeachers);

/**
 * @route GET /api/teachers/:id
 * @desc 获取教师详情
 * @access Admin
 */
router.get('/:id', teacherController.getTeacherById);

/**
 * @route POST /api/teachers
 * @desc 新增教师
 * @access Admin
 */
router.post('/', [
  body('teacher_no').notEmpty().withMessage('工号不能为空'),
  body('name').notEmpty().withMessage('姓名不能为空'),
  body('subjects').isArray({ min: 1 }).withMessage('请选择至少一个教授科目')
], teacherController.addTeacher);

/**
 * @route PUT /api/teachers/:id
 * @desc 编辑教师
 * @access Admin
 */
router.put('/:id', teacherController.updateTeacher);

/**
 * @route DELETE /api/teachers/:id
 * @desc 删除教师
 * @access Admin
 */
router.delete('/:id', teacherController.deleteTeacher);

/**
 * @route POST /api/teachers/:id/reset-password
 * @desc 重置教师密码
 * @access Admin
 */
router.post('/:id/reset-password', teacherController.resetTeacherPassword);

module.exports = router;