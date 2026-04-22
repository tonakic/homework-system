const Database = require("better-sqlite3");
const db = new Database("./database/homework.db");

console.log("=== 答题记录详情 ===");
const answer = db.prepare(`
  SELECT ea.*, et.title, et.start_time as task_start, et.end_time as task_end, et.duration
  FROM exam_answers ea
  JOIN exam_tasks et ON ea.task_id = et.id
  WHERE et.title LIKE '%周天测试8%'
`).get();

console.log(JSON.stringify(answer, null, 2));

console.log("\n=== 当前服务器时间 ===");
console.log("服务器本地时间: " + new Date().toString());
console.log("UTC时间: " + new Date().toISOString());
console.log("中国时区时间: " + new Date(Date.now() + 8*3600*1000).toISOString());
