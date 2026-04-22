const Database = require("better-sqlite3");
const db = new Database("./database/homework.db");

console.log("=== 最终数据验证 ===\n");

const record = db.prepare(`
  SELECT ea.id, ea.total_score, ea.time_used,
         et.total_score as exam_total_score, et.title
  FROM exam_answers ea
  JOIN exam_tasks et ON ea.task_id = et.id
  WHERE et.title LIKE '%周天测试8%'
`).get();

console.log("考试: " + record.title);
console.log("学生得分 (totalScore): " + record.total_score);
console.log("考试总分 (examTotalScore): " + record.exam_total_score);
console.log("显示应为: " + record.total_score + " / " + record.exam_total_score);
console.log("用时: " + Math.floor(record.time_used/60) + "分" + record.time_used%60 + "秒");
