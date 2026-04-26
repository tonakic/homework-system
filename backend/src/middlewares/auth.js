const { verifyToken, extractToken } = require('../utils/jwt');
const { error, ErrorCodes } = require('../utils/response');

/**
 * 认证中间件
 */
function authMiddleware(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return error(res, ErrorCodes.AUTH_TOKEN_INVALID, '未登录或登录已过期');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return error(res, ErrorCodes.AUTH_TOKEN_EXPIRED, '登录已过期，请重新登录');
  }

  // 将用户信息附加到请求对象
  req.user = decoded;
  next();
}

/**
 * 角色检查中间件
 * @param {string[]} roles - 允许的角色列表
 */
function roleMiddleware(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.userType)) {
      return error(res, ErrorCodes.PERMISSION_DENIED, '无权限访问');
    }
    next();
  };
}

/**
 * 可选认证中间件（不强制要求登录）
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

/**
 * 管理员权限中间件
 */
function adminMiddleware(req, res, next) {
  // 先执行认证
  const token = extractToken(req);
  if (!token) {
    return error(res, ErrorCodes.AUTH_TOKEN_INVALID, '未登录或登录已过期');
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return error(res, ErrorCodes.AUTH_TOKEN_EXPIRED, '登录已过期，请重新登录');
  }
  req.user = decoded;
  
  // 检查管理员权限
  if (req.user.userType !== 'admin') {
    return error(res, ErrorCodes.PERMISSION_DENIED, '需要管理员权限');
  }
  next();
}

module.exports = {
  authMiddleware,
  roleMiddleware,
  optionalAuth,
  adminMiddleware
};
