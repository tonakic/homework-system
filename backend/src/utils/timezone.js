/**
 * 时区处理工具模块
 *
 * 设计原则：
 * - 教师输入的时间是中国本地时间，需要转换为 UTC 进行比较
 * - 系统生成的时间（datetime('now')）是 UTC 时间
 * - API 返回 ISO 格式带 Z 标记
 * - 前端负责显示转换
 */

/**
 * 获取当前 UTC 时间
 * @returns {Date} UTC 时间对象
 */
function getNowUTC() {
  return new Date();
}

/**
 * 将中国本地时间字符串转换为 UTC Date 对象
 * @param {string} timeStr - 中国时间字符串 "2026-04-18 23:45" 或 "2026-04-18 23:45:00"
 * @returns {Date|null} UTC Date 对象
 */
function parseChinaTimeToUTC(timeStr) {
  if (!timeStr) return null;

  // ISO 格式（带 T 和 Z）- 已经是 UTC
  if (timeStr.includes('T') && timeStr.includes('Z')) {
    return new Date(timeStr);
  }

  // 解析日期时间部分
  let dateStr = timeStr;
  let hour = 0, minute = 0, second = 0;

  if (timeStr.includes(':')) {
    // 带时间：分离日期和时间部分
    const parts = timeStr.split(' ');
    if (parts.length === 2) {
      dateStr = parts[0];
      const timeParts = parts[1].split(':');
      hour = parseInt(timeParts[0]) || 0;
      minute = parseInt(timeParts[1]) || 0;
      second = parseInt(timeParts[2]) || 0;
    } else if (timeStr.includes('T')) {
      // ISO 格式无 Z：2026-04-18T23:45
      const tParts = timeStr.split('T');
      dateStr = tParts[0];
      const timeParts = tParts[1].split(':');
      hour = parseInt(timeParts[0]) || 0;
      minute = parseInt(timeParts[1]) || 0;
      second = parseInt(timeParts[2]) || 0;
    }
  }

  // 解析日期部分
  const dateParts = dateStr.split('-');
  if (dateParts.length !== 3) {
    return new Date(timeStr);
  }

  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1;
  const day = parseInt(dateParts[2]);

  // 中国时间 UTC+8，减去 8 小时得到 UTC
  // 例如：中国 23:45 = UTC 15:45
  const utcHour = hour - 8;

  return new Date(Date.UTC(year, month, day, utcHour, minute, second));
}

/**
 * 解析时间字符串为 UTC Date 对象
 * 用于解析系统生成的时间（如 datetime('now')）
 * @param {string} timeStr - UTC 时间字符串
 * @returns {Date|null} UTC Date 对象
 */
function parseToUTC(timeStr) {
  if (!timeStr) return null;

  // ISO 格式（带 T）
  if (timeStr.includes('T')) {
    return new Date(timeStr);
  }

  // 数据库格式 "2026-04-18 14:03:06" - 这是 UTC 时间
  return new Date(timeStr.replace(' ', 'T') + 'Z');
}

/**
 * 解析考试开始时间（教师输入的中国时间）
 * @param {string} timeStr - 时间字符串 "2026-04-18" 或 "2026-04-18 23:45"
 * @returns {Date|null} UTC Date 对象
 */
function parseExamStartTime(timeStr) {
  if (!timeStr) return null;

  // 如果带时间，解析为中国时间并转换为 UTC
  if (timeStr.includes(':')) {
    return parseChinaTimeToUTC(timeStr);
  }

  // 只有日期，解释为中国时区午夜 00:00
  const parts = timeStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    // 中国午夜 00:00 = UTC 前一天 16:00
    return new Date(Date.UTC(year, month, day, -8, 0, 0));
  }

  return new Date(timeStr);
}

/**
 * 解析考试结束时间（教师输入的中国时间）
 * @param {string} timeStr - 时间字符串 "2026-04-18" 或 "2026-04-18 18:00"
 * @returns {Date|null} UTC Date 对象
 */
function parseExamEndTime(timeStr) {
  if (!timeStr) return null;

  // 如果带时间，解析为中国时间并转换为 UTC
  if (timeStr.includes(':')) {
    return parseChinaTimeToUTC(timeStr);
  }

  // 只有日期，解释为中国时区 23:59:59
  const parts = timeStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    // 中国 23:59:59 = UTC 15:59:59
    return new Date(Date.UTC(year, month, day, 15, 59, 59));
  }

  return new Date(timeStr);
}

/**
 * 兼容旧接口
 */
function parseDateToUTC(dateStr) {
  return parseExamStartTime(dateStr);
}

function parseDateToEndUTC(dateStr) {
  return parseExamEndTime(dateStr);
}

/**
 * 将时间转换为 ISO 字符串（带 Z 标记）
 * @param {string|Date} time - 时间
 * @returns {string|null} ISO 格式字符串
 */
function formatToISO(time) {
  if (!time) return null;

  if (time instanceof Date) {
    return time.toISOString();
  }

  if (typeof time === 'string') {
    if (time.includes('T')) {
      return time.endsWith('Z') ? time : time + 'Z';
    }
    return time.replace(' ', 'T') + 'Z';
  }

  return null;
}

/**
 * 判断考试是否在有效期内
 * @param {string} startTime - 考试开始时间
 * @param {string} endTime - 考试结束时间
 * @returns {object} { isStarted, isEnded, isValid }
 */
function checkExamTimeWindow(startTime, endTime) {
  const now = getNowUTC();

  const start = startTime ? parseExamStartTime(startTime) : null;
  const end = endTime ? parseExamEndTime(endTime) : null;

  return {
    isStarted: !start || start <= now,
    isEnded: end && end < now,
    isValid: (!start || start <= now) && (!end || end >= now)
  };
}

/**
 * 获取当前中国时间的时间戳字符串（用于文件名等）
 * @returns {string} 格式：YYYYMMDD_HHmmss
 */
function getChinaTimestamp() {
  const now = getNowUTC();
  const chinaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = chinaTime.getUTCFullYear();
  const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(chinaTime.getUTCDate()).padStart(2, '0');
  const hour = String(chinaTime.getUTCHours()).padStart(2, '0');
  const min = String(chinaTime.getUTCMinutes()).padStart(2, '0');
  const sec = String(chinaTime.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hour}${min}${sec}`;
}

/**
 * 将 UTC 时间字符串转换为中国时间字符串
 * @param {string} utcTimeStr - UTC 时间字符串，如 "2026-04-21 06:00:00"
 * @returns {string} 中国时间字符串，如 "2026-04-21 14:00:00"
 */
function utcToChinaTime(utcTimeStr) {
  if (!utcTimeStr) return utcTimeStr;

  // 解析 UTC 时间字符串
  const date = parseToUTC(utcTimeStr);
  if (!date || isNaN(date.getTime())) return utcTimeStr;

  // 转换为中国时间 (UTC+8)
  const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = chinaTime.getUTCFullYear();
  const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(chinaTime.getUTCDate()).padStart(2, '0');
  const hour = String(chinaTime.getUTCHours()).padStart(2, '0');
  const min = String(chinaTime.getUTCMinutes()).padStart(2, '0');
  const sec = String(chinaTime.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
}

module.exports = {
  getNowUTC,
  formatToISO,
  parseToUTC,
  parseChinaTimeToUTC,
  parseDateToUTC,
  parseDateToEndUTC,
  parseExamStartTime,
  parseExamEndTime,
  checkExamTimeWindow,
  getChinaTimestamp,
  utcToChinaTime
};
