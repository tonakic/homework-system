const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 生成JWT Token
 * @param {Object} payload - 载荷数据
 * @param {boolean} remember - 是否记住登录
 * @returns {string} Token
 */
function generateToken(payload, remember = false) {
  const expiresIn = remember ? config.jwt.rememberExpiresIn : config.jwt.expiresIn;
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

/**
 * 验证JWT Token
 * @param {string} token - JWT Token
 * @returns {Object|null} 解码后的载荷或null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    return null;
  }
}

/**
 * 从请求头提取Token
 * @param {Object} req - Express请求对象
 * @returns {string|null} Token或null
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

module.exports = {
  generateToken,
  verifyToken,
  extractToken
};
