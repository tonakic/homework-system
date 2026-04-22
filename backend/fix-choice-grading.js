/**
 * 修复选择题和多选题的批改结果
 * 用于修复之前因索引/字母格式不匹配导致的批改错误
 */

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database/homework.db'));

console.log('开始修复选择题批改结果...\n');

// 获取所有选择题和多选题的作答记录
const choiceAnswers = db.prepare(`
  SELECT qa.id, qa.question_id, qa.student_answer, qa.score, qa.is_correct,
         q.question_type, q.answer, q.score as max_score
  FROM question_answers qa
  JOIN questions q ON qa.question_id = q.id
  WHERE q.question_type IN ('choice', 'multiple')
`).all();

console.log(`找到 ${choiceAnswers.length} 条选择题作答记录\n`);

let fixedCount = 0;

for (const detail of choiceAnswers) {
  let studentAnswer;
  try {
    studentAnswer = JSON.parse(detail.student_answer);
  } catch (e) {
    studentAnswer = detail.student_answer;
  }

  let isCorrect = false;
  let newScore = 0;

  if (detail.question_type === 'choice') {
    // 单选题：学生答案可能是索引数字(0,1,2,3)或字母(A,B,C,D)
    let studentAns = studentAnswer;
    if (typeof studentAnswer === 'number') {
      studentAns = String.fromCharCode(65 + studentAnswer);
    } else if (typeof studentAnswer === 'string' && /^[0-3]$/.test(studentAnswer)) {
      studentAns = String.fromCharCode(65 + parseInt(studentAnswer));
    }
    isCorrect = studentAns === detail.answer;
    newScore = isCorrect ? detail.max_score : 0;
  } else if (detail.question_type === 'multiple') {
    // 多选题：学生答案可能是索引数组或字母字符串
    let studentAnsArr = [];
    if (Array.isArray(studentAnswer)) {
      if (studentAnswer.length > 0 && typeof studentAnswer[0] === 'number') {
        studentAnsArr = studentAnswer.map(i => String.fromCharCode(65 + i)).sort();
      } else {
        studentAnsArr = studentAnswer.sort();
      }
    } else if (typeof studentAnswer === 'string') {
      studentAnsArr = studentAnswer.split('').sort();
    }
    const correctAnswerArr = detail.answer.split('').sort();
    isCorrect = JSON.stringify(correctAnswerArr) === JSON.stringify(studentAnsArr);
    newScore = isCorrect ? detail.max_score : 0;
  }

  // 检查是否需要更新
  if (detail.is_correct !== (isCorrect ? 1 : 0) || detail.score !== newScore) {
    db.prepare(`
      UPDATE question_answers
      SET score = ?, is_correct = ?
      WHERE id = ?
    `).run(newScore, isCorrect ? 1 : 0, detail.id);

    console.log(`更新题目 ${detail.question_id} (${detail.question_type}):`);
    console.log(`  学生答案: ${detail.student_answer}`);
    console.log(`  正确答案: ${detail.answer}`);
    console.log(`  旧结果: score=${detail.score}, is_correct=${detail.is_correct}`);
    console.log(`  新结果: score=${newScore}, is_correct=${isCorrect ? 1 : 0}\n`);
    fixedCount++;
  }
}

// 重新计算所有答卷的总分
console.log('\n重新计算答卷总分...');
const examAnswers = db.prepare('SELECT DISTINCT exam_answer_id FROM question_answers').all();

for (const ea of examAnswers) {
  const total = db.prepare(`
    SELECT SUM(score) as total FROM question_answers WHERE exam_answer_id = ?
  `).get(ea.exam_answer_id);

  if (total.total !== null) {
    db.prepare('UPDATE exam_answers SET total_score = ? WHERE id = ?').run(total.total, ea.exam_answer_id);
    console.log(`答卷 ${ea.exam_answer_id} 总分更新为: ${total.total}`);
  }
}

console.log(`\n修复完成！共更新 ${fixedCount} 条记录。`);
