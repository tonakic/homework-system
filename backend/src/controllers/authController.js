const { getDatabase } = require('../config/database');
const { success, error, ErrorCodes } = require('../utils/response');
const { generateToken } = require('../utils/jwt');
const { verifyPassword, hashPassword } = require('../utils/password');
const { recordLoginFailure, clearLoginFailure, checkAccountLocked } = require('../services/loginService');
const config = require('../config');

// 表名映射，防止SQL注入
const TABLE_MAP = {
  student: 'students',
  teacher: 'teachers',
  admin: 'admins'
};

// 获取安全表名
function getTableName(userType) {
  const tableName = TABLE_MAP[userType];
  if (!tableName) {
    throw new Error('Invalid user type');
  }
  return tableName;
}

/**
 * 用户登录
 */
async function login(req, res) {
  const { userType, account, password, remember } = req.body;

  if (!userType || !account || !password) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请填写完整的登录信息');
  }

  // 检查账户锁定状态
  const lockStatus = checkAccountLocked(userType, account);
  if (lockStatus.locked) {
    return error(res, ErrorCodes.AUTH_ACCOUNT_LOCKED, lockStatus.message);
  }

  const db = getDatabase();
  let user = null;

  // 根据用户类型查询用户
  switch (userType) {
    case 'student':
      user = db.prepare('SELECT * FROM students WHERE student_no = ? AND status = ?').get(account, 'active');
      break;
    case 'teacher':
      user = db.prepare('SELECT * FROM teachers WHERE teacher_no = ? AND status = ?').get(account, 'active');
      break;
    case 'admin':
      user = db.prepare('SELECT * FROM admins WHERE username = ? AND status = ?').get(account, 'active');
      break;
    default:
      return error(res, ErrorCodes.VALIDATION_ERROR, '无效的用户类型');
  }

  if (!user) {
    const failureInfo = recordLoginFailure(userType, account);
    return error(res, ErrorCodes.AUTH_INVALID_CREDENTIALS, '用户不存在或已停用');
  }

  // 验证密码
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    const failureInfo = recordLoginFailure(userType, account);
    const remaining = config.loginSecurity.maxAttempts - failureInfo.attempt_count;
    if (remaining <= 0) {
      return error(res, ErrorCodes.AUTH_ACCOUNT_LOCKED, '密码错误次数过多，账户已被锁定15分钟');
    }
    return error(res, ErrorCodes.AUTH_INVALID_CREDENTIALS, `密码错误，还剩${remaining}次机会`);
  }

  // 登录成功，清除失败记录
  clearLoginFailure(userType, account);

  // 生成Token
  let manageClasses = [];
  if (userType === 'teacher' && user.manage_classes) {
    try {
      // 处理可能已经是数组或JSON字符串的情况
      manageClasses = typeof user.manage_classes === 'string'
        ? JSON.parse(user.manage_classes)
        : user.manage_classes;
      // 确保结果是数组
      if (!Array.isArray(manageClasses)) {
        manageClasses = [];
      }
    } catch (e) {
      console.error('解析manage_classes失败:', e);
      manageClasses = [];
    }
  }

  const payload = {
    id: user.id,
    userType,
    account: userType === 'admin' ? user.username : (user.student_no || user.teacher_no),
    name: user.name,
    manage_classes: userType === 'teacher' ? manageClasses : undefined
  };

  const token = generateToken(payload, remember);

  // 记录登录日志
  logOperation(userType, user.id, user.name, 'login', 'user', user.id, '用户登录', req.ip);

  return success(res, {
    token,
    userInfo: {
      id: user.id,
      userType,
      account: payload.account,
      name: user.name,
      firstLogin: user.first_login === 1
    }
  }, '登录成功');
}

/**
 * 用户登出
 */
function logout(req, res) {
  const { id, userType, name } = req.user;

  // 记录登出日志
  logOperation(userType, id, name, 'logout', 'user', id, '用户登出', req.ip);

  return success(res, null, '登出成功');
}

/**
 * 修改密码
 */
async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body;
  const { id, userType } = req.user;

  if (!oldPassword || !newPassword) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请填写完整信息');
  }

  if (newPassword.length < 6) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '新密码长度至少6位');
  }

  const db = getDatabase();
  const tableName = getTableName(userType);

  const user = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(id);
  if (!user) {
    return error(res, ErrorCodes.AUTH_INVALID_CREDENTIALS, '用户不存在');
  }

  // 验证旧密码
  const isValid = await verifyPassword(oldPassword, user.password);
  if (!isValid) {
    return error(res, ErrorCodes.AUTH_PASSWORD_WRONG, '原密码错误');
  }

  // 加密新密码
  const hashedPassword = await hashPassword(newPassword);

  // 更新密码
  db.prepare(`UPDATE ${tableName} SET password = ?, first_login = 0, updated_at = datetime('now') WHERE id = ?`).run(hashedPassword, id);

  logOperation(userType, id, user.name, 'change_password', 'user', id, '修改密码', req.ip);

  return success(res, null, '密码修改成功');
}

/**
 * 获取当前用户信息
 */
function getProfile(req, res) {
  const { id, userType } = req.user;
  const db = getDatabase();

  let user = null;

  switch (userType) {
    case 'student':
      user = db.prepare(`SELECT id, student_no, name, gender, grade, class_name, parent_name, phone, remark, status, created_at FROM students WHERE id = ?`).get(id);
      break;
    case 'teacher':
      user = db.prepare(`SELECT id, teacher_no, name, gender, subjects, phone, manage_classes, remark, status, created_at FROM teachers WHERE id = ?`).get(id);
      if (user) {
        user.subjects = user.subjects ? JSON.parse(user.subjects) : [];
        user.manage_classes = user.manage_classes ? JSON.parse(user.manage_classes) : [];
      }
      break;
    case 'admin':
      user = db.prepare(`SELECT id, username, name, status, created_at FROM admins WHERE id = ?`).get(id);
      break;
  }

  if (!user) {
    return error(res, ErrorCodes.AUTH_INVALID_CREDENTIALS, '用户不存在');
  }

  return success(res, { ...user, userType });
}

/**
 * 记录操作日志
 */
function logOperation(userType, userId, userName, action, targetType, targetId, detail, ip) {
  try {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO operation_logs (user_type, user_id, user_name, action, target_type, target_id, detail, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userType, userId, userName, action, targetType, targetId, detail, ip);
  } catch (err) {
    console.error('记录操作日志失败:', err);
  }
}

module.exports = {
  login,
  logout,
  changePassword,
  getProfile
};
