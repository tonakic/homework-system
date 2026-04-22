const Database = require("better-sqlite3");
const db = new Database("./database/homework.db");

console.log("=== 时间修复验证 ===\n");

const answer = db.prepare(`
  SELECT ea.id, ea.start_time, ea.submit_time, ea.time_used, et.title
  FROM exam_answers ea
  JOIN exam_tasks et ON ea.task_id = et.id
  WHERE et.title LIKE '%周天测试8%'
`).get();

if (answer) {
  console.log("考试: " + answer.title);
  console.log("开始时间: " + answer.start_time);
  console.log("提交时间: " + answer.submit_time);
  console.log("用时: " + answer.time_used + " 秒 (" + Math.floor(answer.time_used/60) + "分" + answer.time_used%60 + "秒)");
}
