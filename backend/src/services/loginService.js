const { getDatabase } = require('../config/database');
const { getNowUTC, parseToUTC } = require('../utils/timezone');

/**
 * 记录登录失败到数据库
 */
function recordLoginFailure(userType, account) {
  const db = getDatabase();

  // 尝试更新现有记录
  const existing = db.prepare(`
    SELECT * FROM login_attempts WHERE user_type = ? AND account = ?
  `).get(userType, account);

  if (existing) {
    // 如果已锁定，不更新
    if (existing.lock_until && parseToUTC(existing.lock_until) > getNowUTC()) {
      return existing;
    }

    // 更新失败次数
    db.prepare(`
      UPDATE login_attempts
      SET attempt_count = attempt_count + 1,
          lock_until = CASE WHEN attempt_count + 1 >= 5 THEN datetime('now', '+15 minutes') ELSE NULL END
      WHERE user_type = ? AND account = ?
    `).run(userType, account);

    return db.prepare(`SELECT * FROM login_attempts WHERE user_type = ? AND account = ?`).get(userType, account);
  } else {
    // 创建新记录
    db.prepare(`
      INSERT INTO login_attempts (user_type, account, attempt_count, lock_until)
      VALUES (?, ?, 1, NULL)
    `).run(userType, account);

    return { attempt_count: 1, lock_until: null };
  }
}

/**
 * 清除登录失败记录
 */
function clearLoginFailure(userType, account) {
  const db = getDatabase();
  db.prepare(`DELETE FROM login_attempts WHERE user_type = ? AND account = ?`).run(userType, account);
}

/**
 * 检查账户是否锁定
 */
function checkAccountLocked(userType, account) {
  const db = getDatabase();
  const record = db.prepare(`
    SELECT * FROM login_attempts WHERE user_type = ? AND account = ?
  `).get(userType, account);

  if (!record) {
    return { locked: false };
  }

  if (record.lock_until && parseToUTC(record.lock_until) > getNowUTC()) {
    const remainingMinutes = Math.ceil((parseToUTC(record.lock_until) - getNowUTC()) / 60000);
    return {
      locked: true,
      remainingMinutes,
      message: `账户已锁定，请${remainingMinutes}分钟后再试`
    };
  }

  return {
    locked: false,
    attemptCount: record.attempt_count,
    remainingAttempts: 5 - record.attempt_count
  };
}

/**
 * 清理过期的登录失败记录
 */
function cleanExpiredLoginAttempts() {
  const db = getDatabase();
  db.prepare(`
    DELETE FROM login_attempts
    WHERE lock_until IS NOT NULL AND lock_until < datetime('now')
  `).run();
}

module.exports = {
  recordLoginFailure,
  clearLoginFailure,
  checkAccountLocked,
  cleanExpiredLoginAttempts
};
