const Database = require("better-sqlite3");
const db = new Database("./database/homework.db");

console.log("=== 答题记录得分 ===");
const answer = db.prepare(`
  SELECT ea.id, ea.total_score, et.total_score as exam_total_score, et.title, et.questions as task_questions
  FROM exam_answers ea
  JOIN exam_tasks et ON ea.task_id = et.id
  WHERE et.title LIKE '%周天测试8%'
`).get();
console.log("答卷ID: " + answer.id);
console.log("考试总分: " + answer.exam_total_score);
console.log("学生得分: " + answer.total_score);

// 解析考试任务中的题目配置
const taskQuestions = JSON.parse(answer.task_questions || '[]');
console.log("\n=== 考试题目配置 ===");
taskQuestions.forEach((q, i) => {
  console.log(`第${i+1}题: questionId=${q.questionId}, 分值=${q.score}`);
});

console.log("\n=== 各题得分明细 ===");
const details = db.prepare(`
  SELECT qa.question_id, qa.score, qa.is_correct, q.score as question_default_score, q.question_type
  FROM question_answers qa
  JOIN questions q ON qa.question_id = q.id
  WHERE qa.exam_answer_id = ?
  ORDER BY qa.id
`).all(answer.id);

let totalFromDetails = 0;
const scoreMap = new Map(taskQuestions.map(q => [q.questionId, q.score]));

for (const d of details) {
  const expectedScore = scoreMap.get(d.question_id) || d.question_default_score;
  const status = d.is_correct === 1 ? '✓' : '✗';
  console.log(`题目${d.question_id} [${d.question_type}]: 得分=${d.score}/${expectedScore} ${status}`);
  totalFromDetails += (d.score || 0);
}
console.log(`\n各题得分合计: ${totalFromDetails}`);
console.log(`答卷记录总分: ${answer.total_score}`);
