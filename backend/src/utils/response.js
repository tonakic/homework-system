/**
 * 统一API响应格式
 */

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 返回的数据
 * @param {string} message - 成功消息
 */
function success(res, data = null, message = '操作成功') {
  return res.json({
    code: 0,
    message,
    data
  });
}

/**
 * 失败响应
 * @param {Object} res - Express响应对象
 * @param {number} code - 错误码
 * @param {string} message - 错误消息
 */
function error(res, code = 500, message = '服务器错误') {
  // 根据错误码确定HTTP状态码
  let httpStatus = 500;
  if (code >= 1000 && code < 1100) {
    // 认证相关错误返回401
    httpStatus = 401;
  } else if (code === 9002) {
    // 权限不足返回403
    httpStatus = 403;
  } else if (code === 9003) {
    // 资源不存在返回404
    httpStatus = 404;
  } else if (code === 9001) {
    // 验证错误返回400
    httpStatus = 400;
  }

  return res.status(httpStatus).json({
    code,
    message,
    data: null
  });
}

/**
 * 分页数据响应
 * @param {Object} res - Express响应对象
 * @param {Array} list - 数据列表
 * @param {number} total - 总数
 * @param {number} page - 当前页
 * @param {number} pageSize - 每页数量
 */
function paginated(res, list, total, page = 1, pageSize = 20) {
  return res.json({
    code: 0,
    message: '操作成功',
    data: {
      list,
      total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      totalPages: Math.ceil(total / pageSize)
    }
  });
}

/**
 * 错误码定义
 */
const ErrorCodes = {
  SUCCESS: 0,

  // 认证相关 (1xxx)
  AUTH_INVALID_CREDENTIALS: 1001,
  AUTH_ACCOUNT_LOCKED: 1002,
  AUTH_TOKEN_EXPIRED: 1003,
  AUTH_TOKEN_INVALID: 1004,
  AUTH_PASSWORD_WRONG: 1005,

  // 学生相关 (2xxx)
  STUDENT_EXISTS: 2001,
  STUDENT_NOT_FOUND: 2002,

  // 教师相关 (2xxx)
  TEACHER_EXISTS: 2101,
  TEACHER_NOT_FOUND: 2102,

  // 题目相关 (3xxx)
  QUESTION_NOT_FOUND: 3001,
  QUESTION_BANK_EMPTY: 3002,

  // 考试任务相关 (4xxx)
  EXAM_NOT_FOUND: 4001,
  EXAM_NOT_STARTED: 4002,
  EXAM_ENDED: 4003,
  EXAM_ALREADY_SUBMITTED: 4004,

  // AI相关 (5xxx)
  AI_GRADING_FAILED: 5001,
  AI_CONFIG_ERROR: 5002,

  // 通用错误 (9xxx)
  VALIDATION_ERROR: 9001,
  PERMISSION_DENIED: 9002,
  RESOURCE_NOT_FOUND: 9003,
  DATABASE_ERROR: 9004,
  SERVER_ERROR: 9005,
  INTERNAL_ERROR: 9999
};

module.exports = {
  success,
  error,
  paginated,
  ErrorCodes
};
