/**
 * 批改队列路由
 */

const express = require('express');
const router = express.Router();
const gradingQueueController = require('../controllers/gradingQueueController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// 所有路由需要认证
router.use(authMiddleware);

// 只有教师和管理员可以访问
router.use(roleMiddleware(['teacher', 'admin']));

/**
 * @route GET /api/grading-queue/stats
 * @desc 获取队列状态统计
 * @access Teacher, Admin
 */
router.get('/stats', gradingQueueController.getQueueStats);

/**
 * @route GET /api/grading-queue/tasks
 * @desc 获取任务列表（支持筛选）
 * @query status - 任务状态 (pending/processing/completed/failed/cancelled)
 * @query page - 页码
 * @query pageSize - 每页数量
 * @access Teacher, Admin
 */
router.get('/tasks', gradingQueueController.getTaskList);

/**
 * @route GET /api/grading-queue/tasks/:taskId
 * @desc 获取任务详情
 * @access Teacher, Admin
 */
router.get('/tasks/:taskId', gradingQueueController.getTaskDetail);

/**
 * @route POST /api/grading-queue/tasks/:taskId/retry
 * @desc 手动重试失败任务
 * @access Teacher, Admin
 */
router.post('/tasks/:taskId/retry', gradingQueueController.retryTask);

/**
 * @route POST /api/grading-queue/tasks/:taskId/cancel
 * @desc 取消任务
 * @access Teacher, Admin
 */
router.post('/tasks/:taskId/cancel', gradingQueueController.cancelTask);

/**
 * @route POST /api/grading-queue/retry-all-failed
 * @desc 重试所有失败任务
 * @access Admin
 */
router.post('/retry-all-failed', roleMiddleware(['admin']), gradingQueueController.retryAllFailed);

/**
 * @route GET /api/grading-queue/config
 * @desc 获取队列配置
 * @access Admin
 */
router.get('/config', roleMiddleware(['admin']), gradingQueueController.getQueueConfig);

/**
 * @route PUT /api/grading-queue/config
 * @desc 更新队列配置
 * @body maxConcurrent - 最大并发数 (1-10)
 * @body defaultMaxRetries - 最大重试次数 (0-10)
 * @body retryDelayMs - 重试间隔 (1000-60000)
 * @body taskTimeoutMs - 任务超时 (10000-300000)
 * @access Admin
 */
router.put('/config', roleMiddleware(['admin']), gradingQueueController.updateQueueConfig);

module.exports = router;
