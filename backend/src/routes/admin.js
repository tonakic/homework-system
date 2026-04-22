const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// 所有管理员路由需要认证
router.use(authMiddleware);

// 只有管理员可以访问
router.use(roleMiddleware(['admin']));

/**
 * @route GET /api/admin/stats
 * @desc 获取统计数据
 * @access Admin
 */
router.get('/stats', adminController.getStats);

/**
 * @route GET /api/admin/config
 * @desc 获取系统配置
 * @access Admin
 */
router.get('/config', adminController.getConfig);

/**
 * @route PUT /api/admin/config
 * @desc 更新系统配置
 * @access Admin
 */
router.put('/config', adminController.updateConfig);

/**
 * @route GET /api/admin/class-stats
 * @desc 获取班级统计
 * @access Admin
 */
router.get('/class-stats', adminController.getClassStats);

/**
 * @route GET /api/admin/grades
 * @desc 获取年级列表（从班级配置读取）
 * @access Admin
 */
router.get('/grades', adminController.getGradeList);

/**
 * @route GET /api/admin/classes
 * @desc 获取指定年级的班级列表
 * @access Admin
 */
router.get('/classes', adminController.getClassesByGrade);

/**
 * @route POST /api/admin/class
 * @desc 添加/更新班级
 * @access Admin
 */
router.post('/class', adminController.saveClass);

/**
 * @route DELETE /api/admin/class
 * @desc 删除班级
 * @access Admin
 */
router.delete('/class', adminController.deleteClass);

/**
 * @route GET /api/admin/class-exams
 * @desc 检查班级是否有进行中的考试
 * @access Admin
 */
router.get('/class-exams', adminController.getClassExams);

/**
 * @route GET /api/admin/logs/date-range
 * @desc 获取日志日期范围
 * @access Admin
 */
router.get('/logs/date-range', adminController.getLogDateRange);

/**
 * @route GET /api/admin/logs/export
 * @desc 导出操作日志为Excel
 * @access Admin
 */
router.get('/logs/export', adminController.exportOperationLogs);

/**
 * @route DELETE /api/admin/logs
 * @desc 删除操作日志
 * @access Admin
 */
router.delete('/logs', adminController.deleteOperationLogs);

/**
 * @route GET /api/admin/logs
 * @desc 获取操作日志
 * @access Admin
 */
router.get('/logs', adminController.getOperationLogs);

module.exports = router;
