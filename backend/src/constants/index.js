/**
 * 系统常量配置
 */

// 默认密码配置
// 注意：生产环境建议通过环境变量配置，并要求用户首次登录修改密码
const DEFAULT_PASSWORDS = {
  student: process.env.DEFAULT_STUDENT_PASSWORD || '123456',
  teacher: process.env.DEFAULT_TEACHER_PASSWORD || '123456',
  admin: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456'
};

/**
 * 获取默认密码
 * @param {string} userType - 用户类型: student, teacher, admin
 * @returns {string} 默认密码
 */
function getDefaultPassword(userType) {
  return DEFAULT_PASSWORDS[userType] || '123456';
}

module.exports = {
  DEFAULT_PASSWORDS,
  getDefaultPassword
};
