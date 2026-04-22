const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// 所有统计路由需要认证
router.use(authMiddleware);

// 只有教师和管理员可以访问统计接口
router.use(roleMiddleware(['teacher', 'admin']));

/**
 * @route GET /api/teacher/classes
 * @desc 获取教师管理的班级列表（按年级筛选）
 * @access Teacher, Admin
 */
router.get('/classes', statisticsController.getTeacherClasses);

/**
 * @route GET /api/statistics/class
 * @desc 获取班级统计数据
 * @access Teacher, Admin
 */
router.get('/class', statisticsController.getClassStatistics);

/**
 * @route GET /api/statistics/exam/:id/students
 * @desc 获取考试学生成绩排名
 * @access Teacher, Admin
 */
router.get('/exam/:id/students', statisticsController.getExamStudentRanking);

module.exports = router;
