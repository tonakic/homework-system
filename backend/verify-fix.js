const Database = require("better-sqlite3");
const db = new Database("./database/homework.db");

console.log("=== 修复后验证 ===");
console.log("");

// 查询周天测试8的学生答题记录
const task8 = db.prepare("SELECT id, title FROM exam_tasks WHERE title LIKE '%周天测试8%'").get();
if (task8) {
  console.log("考试任务: " + task8.title);

  const student = db.prepare("SELECT id, name, student_no FROM students WHERE student_no = '202603001'").get();
  if (student) {
    console.log("学生: " + student.name + " (" + student.student_no + ")");

    const answer = db.prepare(`
      SELECT id, status, total_score, submit_time
      FROM exam_answers WHERE task_id = ? AND student_id = ?
    `).get(task8.id, student.id);

    if (answer) {
      console.log("答卷状态: " + answer.status);
      console.log("总分: " + answer.total_score);
      console.log("提交时间: " + answer.submit_time);
      console.log("");

      // 详细题目
      const details = db.prepare(`
        SELECT qa.question_id, q.question_type, qa.student_answer, qa.score, qa.is_correct, q.answer
        FROM question_answers qa
        JOIN questions q ON qa.question_id = q.id
        WHERE qa.exam_answer_id = ?
      `).all(answer.id);

      console.log("=== 题目详情 ===");
      for (const d of details) {
        const typeMap = {choice: '单选', multiple: '多选', fill: '填空', subjective: '主观'};
        const status = d.is_correct === 1 ? '✓' : (d.is_correct === 0 ? '✗' : '待批');
        console.log(`题目${d.question_id} [${typeMap[d.question_type]}]: 答案=${d.student_answer}, 正确=${d.answer}, 得分=${d.score}, ${status}`);
      }
    }
  }
}
