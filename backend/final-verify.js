const Database = require("better-sqlite3");
const db = new Database("./database/homework.db");

console.log("=== 最终验证 ===\n");

const answer = db.prepare(`
  SELECT ea.id, ea.total_score, ea.time_used, ea.submit_time,
         et.total_score as exam_total_score, et.title
  FROM exam_answers ea
  JOIN exam_tasks et ON ea.task_id = et.id
  WHERE et.title LIKE '%周天测试8%'
`).get();

console.log("考试: " + answer.title);
console.log("学生得分: " + answer.total_score + " / " + answer.exam_total_score);
console.log("用时: " + Math.floor(answer.time_used/60) + "分" + answer.time_used%60 + "秒");
console.log("提交时间: " + answer.submit_time);

console.log("\n=== 各题得分 ===");
const details = db.prepare(`
  SELECT qa.question_id, qa.score, qa.is_correct, q.question_type
  FROM question_answers qa
  JOIN questions q ON qa.question_id = q.id
  WHERE qa.exam_answer_id = ?
  ORDER BY qa.id
`).all(answer.id);

let correct = 0, wrong = 0;
for (const d of details) {
  if (d.is_correct === 1) correct++;
  else wrong++;
  const status = d.is_correct === 1 ? '✓' : '✗';
  console.log(`题目${d.question_id} [${d.question_type}]: ${d.score}分 ${status}`);
}

console.log(`\n答对: ${correct}题, 答错: ${wrong}题`);
