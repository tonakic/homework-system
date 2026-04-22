/**
 * 批改队列控制器
 */

const { getGradingQueueService } = require('../services/gradingQueueService');
const { success, error, ErrorCodes, paginated } = require('../utils/response');

/**
 * 获取队列状态统计
 */
function getQueueStats(req, res) {
  const queueService = getGradingQueueService();
  const stats = queueService.getQueueStats();
  return success(res, stats);
}

/**
 * 获取任务列表
 */
function getTaskList(req, res) {
  const { status, page = 1, pageSize = 20 } = req.query;
  const queueService = getGradingQueueService();
  const result = queueService.getTaskList({
    status,
    page: parseInt(page, 10),
    pageSize: parseInt(pageSize, 10)
  });

  return paginated(res, result.list, result.total, result.page, result.pageSize);
}

/**
 * 获取任务详情
 */
function getTaskDetail(req, res) {
  const { taskId } = req.params;
  const queueService = getGradingQueueService();
  const task = queueService.getTask(parseInt(taskId, 10));

  if (!task) {
    return error(res, ErrorCodes.RESOURCE_NOT_FOUND, '任务不存在');
  }

  return success(res, task);
}

/**
 * 手动重试失败任务
 */
function retryTask(req, res) {
  const { taskId } = req.params;
  const queueService = getGradingQueueService();

  try {
    queueService.retryTask(parseInt(taskId, 10));
    return success(res, null, '任务已重新加入队列');
  } catch (err) {
    return error(res, ErrorCodes.VALIDATION_ERROR, err.message);
  }
}

/**
 * 取消任务
 */
function cancelTask(req, res) {
  const { taskId } = req.params;
  const queueService = getGradingQueueService();

  try {
    queueService.cancelTask(parseInt(taskId, 10));
    return success(res, null, '任务已取消');
  } catch (err) {
    return error(res, ErrorCodes.VALIDATION_ERROR, err.message);
  }
}

/**
 * 重试所有失败任务
 */
function retryAllFailed(req, res) {
  const queueService = getGradingQueueService();
  const count = queueService.retryAllFailed();
  return success(res, { count }, `已重试 ${count} 个失败任务`);
}

/**
 * 获取队列配置
 */
async function getQueueConfig(req, res) {
  const queueService = getGradingQueueService();
  const config = await queueService.getConfig();
  return success(res, config);
}

/**
 * 更新队列配置
 */
async function updateQueueConfig(req, res) {
  const { maxConcurrent, defaultMaxRetries, retryDelayMs, taskTimeoutMs } = req.body;
  const queueService = getGradingQueueService();

  if (maxConcurrent !== undefined) {
    if (maxConcurrent < 1 || maxConcurrent > 10) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '最大并发数必须在1-10之间');
    }
    await queueService.updateConfig('max_concurrent', maxConcurrent);
  }

  if (defaultMaxRetries !== undefined) {
    if (defaultMaxRetries < 0 || defaultMaxRetries > 10) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '最大重试次数必须在0-10之间');
    }
    await queueService.updateConfig('default_max_retries', defaultMaxRetries);
  }

  if (retryDelayMs !== undefined) {
    if (retryDelayMs < 1000 || retryDelayMs > 60000) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '重试间隔必须在1000-60000毫秒之间');
    }
    await queueService.updateConfig('retry_delay_ms', retryDelayMs);
  }

  if (taskTimeoutMs !== undefined) {
    if (taskTimeoutMs < 10000 || taskTimeoutMs > 300000) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '任务超时必须在10000-300000毫秒之间');
    }
    await queueService.updateConfig('task_timeout_ms', taskTimeoutMs);
  }

  const config = await queueService.getConfig();
  return success(res, config, '配置已更新');
}

module.exports = {
  getQueueStats,
  getTaskList,
  getTaskDetail,
  retryTask,
  cancelTask,
  retryAllFailed,
  getQueueConfig,
  updateQueueConfig
};
