/**
 * 修复得分数据 - 使用考试任务配置的分值
 */

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database/homework.db'));

console.log('开始修复得分数据...\n');

// 获取所有答题记录
const answers = db.prepare(`
  SELECT ea.id as answer_id, ea.task_id, et.questions as task_questions
  FROM exam_answers ea
  JOIN exam_tasks et ON ea.task_id = et.id
`).all();

let fixedCount = 0;

for (const answer of answers) {
  // 解析考试任务中的题目配置
  const taskQuestions = JSON.parse(answer.task_questions || '[]');
  const scoreMap = new Map(taskQuestions.map(q => [q.questionId, q.score]));

  // 获取该答卷的所有题目答案
  const details = db.prepare(`
    SELECT qa.id, qa.question_id, qa.is_correct
    FROM question_answers qa
    WHERE qa.exam_answer_id = ?
  `).all(answer.answer_id);

  let totalScore = 0;

  for (const detail of details) {
    const correctScore = scoreMap.get(detail.question_id) || 2;
    const shouldScore = detail.is_correct === 1 ? correctScore : 0;

    // 获取当前分数
    const current = db.prepare('SELECT score FROM question_answers WHERE id = ?').get(detail.id);

    if (current.score !== shouldScore) {
      console.log(`答卷 ${answer.answer_id}, 题目 ${detail.question_id}:`);
      console.log(`  正确: ${detail.is_correct}, 应得: ${shouldScore}, 当前: ${current.score}`);
      db.prepare('UPDATE question_answers SET score = ? WHERE id = ?').run(shouldScore, detail.id);
      fixedCount++;
    }

    totalScore += shouldScore;
  }

  // 更新答卷总分
  db.prepare('UPDATE exam_answers SET total_score = ? WHERE id = ?').run(totalScore, answer.answer_id);
  console.log(`答卷 ${answer.answer_id} 总分更新为: ${totalScore}\n`);
}

console.log(`修复完成！共更新 ${fixedCount} 条题目得分记录。`);
