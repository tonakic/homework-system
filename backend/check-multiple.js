const Database = require("better-sqlite3");
const db = new Database("./database/homework.db");

console.log("=== 多选题作答详情 ===");
const multipleAnswers = db.prepare(`
  SELECT qa.id, qa.question_id, qa.student_answer, qa.score, qa.is_correct,
         q.question_type, q.answer, q.score as max_score
  FROM question_answers qa
  JOIN questions q ON qa.question_id = q.id
  WHERE q.question_type = 'multiple'
`).all();

for (const m of multipleAnswers) {
  console.log(`题目 ${m.question_id}:`);
  console.log(`  学生答案原始: ${JSON.stringify(m.student_answer)}`);
  console.log(`  正确答案: ${m.answer}`);
  console.log(`  当前得分: ${m.score}, 正确: ${m.is_correct}`);

  // 解析学生答案
  let studentAns;
  try {
    studentAns = JSON.parse(m.student_answer);
    console.log(`  解析后: ${JSON.stringify(studentAns)} (类型: ${typeof studentAns})`);
  } catch (e) {
    studentAns = m.student_answer;
    console.log(`  解析失败，使用原值: ${studentAns}`);
  }

  // 判断
  let studentAnsArr = [];
  if (Array.isArray(studentAns)) {
    studentAnsArr = studentAns.sort();
  } else if (typeof studentAns === 'string') {
    studentAnsArr = studentAns.split('').sort();
  }
  const correctAnswerArr = m.answer.split('').sort();
  const isCorrect = JSON.stringify(correctAnswerArr) === JSON.stringify(studentAnsArr);
  console.log(`  学生答案数组: ${JSON.stringify(studentAnsArr)}`);
  console.log(`  正确答案数组: ${JSON.stringify(correctAnswerArr)}`);
  console.log(`  应该判定: ${isCorrect ? '正确' : '错误'}`);
  console.log();
}
