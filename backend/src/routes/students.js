const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const studentController = require('../controllers/studentController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// 所有学生管理路由需要认证
router.use(authMiddleware);

// 只有教师和管理员可以访问学生管理
router.use(roleMiddleware(['teacher', 'admin']));

/**
 * @route GET /api/students/grades
 * @desc 获取年级列表（从班级配置读取）
 * @access Teacher, Admin
 */
router.get('/grades', studentController.getGradeList);

/**
 * @route GET /api/students/classes
 * @desc 获取指定年级的班级列表
 * @access Teacher, Admin
 */
router.get('/classes', studentController.getClassesByGrade);

/**
 * @route GET /api/students
 * @desc 获取学生列表
 * @access Teacher, Admin
 */
router.get('/', studentController.getStudents);

/**
 * @route GET /api/students/:id
 * @desc 获取学生详情
 * @access Teacher, Admin
 */
router.get('/:id', studentController.getStudentById);

/**
 * @route POST /api/students
 * @desc 新增学生
 * @access Teacher, Admin
 */
router.post('/', [
  body('student_no').notEmpty().withMessage('学号不能为空'),
  body('name').notEmpty().withMessage('姓名不能为空'),
  body('grade').notEmpty().withMessage('年级不能为空'),
  body('class_name').notEmpty().withMessage('班级不能为空')
], studentController.addStudent);

/**
 * @route PUT /api/students/:id
 * @desc 编辑学生
 * @access Teacher, Admin
 */
router.put('/:id', studentController.updateStudent);

/**
 * @route DELETE /api/students/:id
 * @desc 删除学生
 * @access Teacher, Admin
 */
router.delete('/:id', studentController.deleteStudent);

/**
 * @route POST /api/students/:id/reset-password
 * @desc 重置学生密码
 * @access Teacher, Admin
 */
router.post('/:id/reset-password', studentController.resetPassword);

module.exports = router;