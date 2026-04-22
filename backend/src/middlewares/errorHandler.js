const { error, ErrorCodes } = require('../utils/response');

/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // 验证错误
  if (err.name === 'ValidationError') {
    return error(res, ErrorCodes.VALIDATION_ERROR, err.message);
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return error(res, ErrorCodes.AUTH_TOKEN_INVALID, '无效的Token');
  }

  if (err.name === 'TokenExpiredError') {
    return error(res, ErrorCodes.AUTH_TOKEN_EXPIRED, 'Token已过期');
  }

  // 数据库错误
  if (err.code === 'SQLITE_CONSTRAINT') {
    return error(res, ErrorCodes.VALIDATION_ERROR, '数据约束错误：可能存在重复数据');
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return error(res, ErrorCodes.VALIDATION_ERROR, '文件大小超过限制');
  }

  if (err.message === '只支持Excel文件') {
    return error(res, ErrorCodes.VALIDATION_ERROR, err.message);
  }

  // 默认服务器错误
  // 开发环境返回简要错误信息，避免泄露敏感信息
  if (process.env.NODE_ENV === 'development') {
    // 开发环境下返回错误信息，但过滤掉可能包含敏感路径的内容
    const safeMessage = err.message
      ? err.message.replace(/\/[\w\-./]+/g, '[PATH]')
      : '服务器内部错误';
    return error(res, ErrorCodes.INTERNAL_ERROR, safeMessage);
  }

  return error(res, ErrorCodes.INTERNAL_ERROR, '服务器内部错误');
}

/**
 * 404处理中间件
 */
function notFoundHandler(req, res) {
  return error(res, ErrorCodes.RESOURCE_NOT_FOUND, '请求的资源不存在');
}

module.exports = {
  errorHandler,
  notFoundHandler
};
