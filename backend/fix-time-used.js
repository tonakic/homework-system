/**
 * 修复数据库中错误的 time_used 数据
 * 根据 start_time 和 submit_time 重新计算
 */

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database/homework.db'));

console.log('开始修复 time_used 数据...\n');

// 获取所有答题记录
const answers = db.prepare(`
  SELECT id, start_time, submit_time, time_used
  FROM exam_answers
  WHERE start_time IS NOT NULL AND submit_time IS NOT NULL
`).all();

let fixedCount = 0;

for (const answer of answers) {
  // 解析时间（SQLite存储的是中国时间，无时区信息）
  const startTime = parseChinaTime(answer.start_time);
  const submitTime = parseChinaTime(answer.submit_time);

  if (startTime && submitTime) {
    const correctTimeUsed = Math.floor((submitTime - startTime) / 1000);

    if (answer.time_used !== correctTimeUsed) {
      console.log(`答卷 ${answer.id}:`);
      console.log(`  开始时间: ${answer.start_time}`);
      console.log(`  提交时间: ${answer.submit_time}`);
      console.log(`  旧 time_used: ${answer.time_used} 秒`);
      console.log(`  新 time_used: ${correctTimeUsed} 秒 (${Math.floor(correctTimeUsed/60)}分${correctTimeUsed%60}秒)\n`);

      db.prepare('UPDATE exam_answers SET time_used = ? WHERE id = ?').run(correctTimeUsed, answer.id);
      fixedCount++;
    }
  }
}

console.log(`修复完成！共更新 ${fixedCount} 条记录。`);

/**
 * 解析中国时间字符串
 * SQLite存储的格式: "2026-04-18 14:03:06"
 */
function parseChinaTime(timeStr) {
  if (!timeStr) return null;

  // 解析时间组件
  const match = timeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match.map(Number);

  // 创建中国时间，然后转换为UTC时间戳
  // 中国时间是 UTC+8
  const utcTime = Date.UTC(year, month - 1, day, hour, minute, second) - 8 * 60 * 60 * 1000;

  return new Date(utcTime);
}
