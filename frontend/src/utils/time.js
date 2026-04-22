/**
 * 格式化时间为显示格式 (MM-DD HH:mm)
 * @param {string} time - 时间字符串
 * @returns {string}
 */
export function formatTime(time) {
  if (!time) return '';
  const date = new Date(time);
  if (isNaN(date.getTime())) return time;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

/**
 * 格式化完整日期时间 (YYYY-MM-DD HH:mm:ss)
 * @param {string} time - 时间字符串
 * @returns {string}
 */
export function formatDateTime(time) {
  if (!time) return '';
  const date = new Date(time);
  if (isNaN(date.getTime())) return time;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化日期 (YYYY-MM-DD)
 * @param {string} time - 时间字符串
 * @returns {string}
 */
export function formatDate(time) {
  if (!time) return '';
  const date = new Date(time);
  if (isNaN(date.getTime())) return time;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
