const { getDatabase } = require('../config/database');
const { success, error, paginated, ErrorCodes } = require('../utils/response');
const XLSX = require('xlsx');

/**
 * 获取题库目录树
 */
function getQuestionTree(req, res) {
  const db = getDatabase();

  // 获取所有科目
  const subjects = db.prepare(`
    SELECT DISTINCT subject FROM questions WHERE status = 'active' ORDER BY subject
  `).all();

  const tree = [];

  for (const { subject } of subjects) {
    const subjectNode = {
      subject,
      grades: []
    };

    // 获取该科目下的年级
    const grades = db.prepare(`
      SELECT DISTINCT grade FROM questions WHERE subject = ? AND status = 'active' ORDER BY grade
    `).all(subject);

    for (const { grade } of grades) {
      const gradeNode = {
        grade,
        chapters: []
      };

      // 获取该年级下的章节
      const chapters = db.prepare(`
        SELECT chapter, COUNT(*) as count
        FROM questions
        WHERE subject = ? AND grade = ? AND status = 'active'
        GROUP BY chapter
        ORDER BY chapter
      `).all(subject, grade);

      gradeNode.chapters = chapters.map(c => ({
        chapter: c.chapter,
        count: c.count
      }));

      subjectNode.grades.push(gradeNode);
    }

    tree.push(subjectNode);
  }

  return success(res, tree);
}

/**
 * 获取题目列表
 */
function getQuestions(req, res) {
  const { page = 1, pageSize = 20, subject, grade, chapter, type, difficulty, keyword } = req.query;

  const db = getDatabase();
  let whereClauses = ['status = ?'];
  let params = ['active'];

  // 筛选条件
  if (subject) {
    whereClauses.push('subject = ?');
    params.push(subject);
  }

  if (grade) {
    whereClauses.push('grade = ?');
    params.push(grade);
  }

  if (chapter) {
    whereClauses.push('chapter = ?');
    params.push(chapter);
  }

  if (type) {
    whereClauses.push('question_type = ?');
    params.push(type);
  }

  if (difficulty) {
    whereClauses.push('difficulty = ?');
    params.push(difficulty);
  }

  if (keyword) {
    whereClauses.push('content LIKE ?');
    params.push(`%${keyword}%`);
  }

  const whereSQL = whereClauses.join(' AND ');

  // 获取总数
  const countResult = db.prepare(`SELECT COUNT(*) as total FROM questions WHERE ${whereSQL}`).get(...params);
  const total = countResult.total;

  // 获取列表
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const questions = db.prepare(`
    SELECT id, question_type, subject, grade, chapter, content,
           CASE WHEN question_type IN ('choice', 'multiple') THEN options ELSE NULL END as options,
           answer, analysis, difficulty, score, use_count, correct_rate, is_special
    FROM questions
    WHERE ${whereSQL}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  // 解析选择题选项
  questions.forEach(q => {
    if (q.options) {
      q.options = JSON.parse(q.options);
    }
  });

  return paginated(res, questions, total, page, pageSize);
}

/**
 * 获取题目详情
 */
function getQuestionById(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const question = db.prepare(`
    SELECT * FROM questions WHERE id = ?
  `).get(id);

  if (!question) {
    return error(res, ErrorCodes.QUESTION_NOT_FOUND, '题目不存在');
  }

  // 解析JSON字段
  if (question.options) {
    question.options = JSON.parse(question.options);
  }
  if (question.question_type === 'fill' && question.answer) {
    question.answer = JSON.parse(question.answer);
  }

  return success(res, question);
}

// 有效的题目类型
const VALID_QUESTION_TYPES = ['choice', 'multiple', 'fill', 'judgment', 'subjective'];

/**
 * 新增题目
 */
function addQuestion(req, res) {
  const {
    question_type, subject, grade, chapter, content,
    options, answer, analysis, difficulty, score, is_special
  } = req.body;

  // 验证必填字段
  if (!question_type || !subject || !content || !answer) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请填写必填信息');
  }

  // 验证题目类型
  if (!VALID_QUESTION_TYPES.includes(question_type)) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '无效的题目类型');
  }

  // 验证分数范围 (1-100)
  const finalScore = score || 2;
  if (!Number.isInteger(finalScore) || finalScore < 1 || finalScore > 100) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '分数必须在1-100之间');
  }

  const db = getDatabase();

  // 处理选项和答案
  let optionsJson = null;
  let answerText = answer;

  if (question_type === 'choice' || question_type === 'multiple') {
    if (!options || options.length < 2) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '选择题至少需要2个选项');
    }
    optionsJson = JSON.stringify(options);
    answerText = typeof answer === 'string' ? answer : JSON.stringify(answer);
  } else if (question_type === 'judgment') {
    // 判断题答案验证：只能是 A(正确) 或 B(错误)
    const ans = String(answer).toUpperCase();
    if (ans !== 'A' && ans !== 'B') {
      return error(res, ErrorCodes.VALIDATION_ERROR, '判断题答案只能是 A(正确) 或 B(错误)');
    }
    answerText = ans;
  } else if (question_type === 'fill') {
    answerText = typeof answer === 'string' ? answer : JSON.stringify(answer);
  }

  const result = db.prepare(`
    INSERT INTO questions
    (question_type, subject, grade, chapter, content, options, answer, analysis, difficulty, score, is_special, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(
    question_type,
    subject,
    grade,
    chapter,
    content,
    optionsJson,
    answerText,
    analysis,
    difficulty || 'medium',
    score || 2,
    is_special ? 1 : 0,
    req.user.id
  );

  logOperation(req.user, 'add', 'question', result.lastInsertRowid, `新增题目: ${subject} - ${content.substring(0, 20)}...`, req.ip);

  return success(res, { id: result.lastInsertRowid }, '题目添加成功');
}

/**
 * 编辑题目
 */
function updateQuestion(req, res) {
  const { id } = req.params;
  const {
    question_type, subject, grade, chapter, content, options, answer,
    analysis, difficulty, score, status
  } = req.body;

  // 验证题目类型（如果提供了的话）
  if (question_type && !VALID_QUESTION_TYPES.includes(question_type)) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '无效的题目类型');
  }

  // 验证分数范围（如果提供了的话）
  if (score !== undefined && (!Number.isInteger(score) || score < 1 || score > 100)) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '分数必须在1-100之间');
  }

  const db = getDatabase();

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!question) {
    return error(res, ErrorCodes.QUESTION_NOT_FOUND, '题目不存在');
  }

  // 确定最终的题目类型
  const finalType = question_type || question.question_type;

  // 处理选项和答案
  let optionsJson = null;
  let answerText = answer !== undefined ? answer : question.answer;

  // 根据题目类型处理选项
  if (finalType === 'choice' || finalType === 'multiple') {
    if (options && Array.isArray(options)) {
      optionsJson = JSON.stringify(options);
    } else if (question.options) {
      optionsJson = question.options;
    }
    if (typeof answerText !== 'string') {
      answerText = JSON.stringify(answerText);
    }
  } else {
    // 填空题或主观题，选项为 null
    optionsJson = null;
    if (typeof answerText !== 'string') {
      answerText = JSON.stringify(answerText);
    }
  }

  db.prepare(`
    UPDATE questions
    SET question_type = ?, subject = ?, grade = ?, chapter = ?, content = ?, options = ?, answer = ?,
        analysis = ?, difficulty = ?, score = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    finalType,
    subject !== undefined ? subject : question.subject,
    grade !== undefined ? grade : question.grade,
    chapter !== undefined ? chapter : question.chapter,
    content !== undefined ? content : question.content,
    optionsJson,
    answerText,
    analysis !== undefined ? analysis : question.analysis,
    difficulty !== undefined ? difficulty : question.difficulty,
    score !== undefined ? score : question.score,
    status !== undefined ? status : question.status,
    id
  );

  logOperation(req.user, 'update', 'question', id, `修改题目: ${subject || question.subject}`, req.ip);

  return success(res, null, '题目更新成功');
}

/**
 * 删除题目
 */
function deleteQuestion(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!question) {
    return error(res, ErrorCodes.QUESTION_NOT_FOUND, '题目不存在');
  }

  // 软删除
  db.prepare('UPDATE questions SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('deleted', id);

  logOperation(req.user, 'delete', 'question', id, `删除题目: ${question.content.substring(0, 20)}...`, req.ip);

  return success(res, null, '题目已删除');
}

/**
 * 批量获取题目
 */
function getQuestionsByIds(req, res) {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请提供题目ID列表');
  }

  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  const questions = db.prepare(`
    SELECT * FROM questions WHERE id IN (${placeholders}) AND status = 'active'
  `).all(...ids);

  // 解析JSON字段
  questions.forEach(q => {
    if (q.options) {
      q.options = JSON.parse(q.options);
    }
  });

  return success(res, questions);
}

/**
 * 记录操作日志
 */
function logOperation(user, action, targetType, targetId, detail, ip) {
  try {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO operation_logs (user_type, user_id, user_name, action, target_type, target_id, detail, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user.userType, user.id, user.name, action, targetType, targetId, detail, ip);
  } catch (err) {
    console.error('记录操作日志失败:', err);
  }
}

/**
 * 下载导入模板
 */
function downloadTemplate(req, res) {
  try {
    const path = require('path');
    const fs = require('fs');
    const templatePath = path.join(__dirname, '../templates/题库导入模板.xlsx');

    if (!fs.existsSync(templatePath)) {
      return error(res, ErrorCodes.SERVER_ERROR, '模板文件不存在');
    }

    const buffer = fs.readFileSync(templatePath);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''%E9%A2%98%E5%BA%93%E5%AF%BC%E5%85%A5%E6%A8%A1%E6%9D%BF.xlsx");
    res.send(buffer);
  } catch (err) {
    console.error('下载模板失败:', err);
    return error(res, ErrorCodes.SERVER_ERROR, '下载模板失败: ' + err.message);
  }
}

/**
 * 批量导入题目
 */
function importQuestions(req, res) {
  if (!req.file) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请上传文件');
  }

  const db = getDatabase();
  const results = { total: 0, details: [], errors: [] };

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    const typeMap = {
      '单选题': 'choice',
      '多选题': 'multiple',
      '填空题': 'fill',
      '判断题': 'judgment',
      '主观题': 'subjective'
    };

    const difficultyMap = { '简单': 'easy', '中等': 'medium', '困难': 'hard' };

    for (const sheetName of workbook.SheetNames) {
      const questionType = typeMap[sheetName];
      if (!questionType) continue;

      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // 跳过前5行（标题行 + 示例行 + 说明行）
      for (let i = 5; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        try {
          // 解析行数据
          const subject = String(row[0] || '').trim();
          const grade = String(row[1] || '').trim();
          const chapter = String(row[2] || '').trim();
          const score = parseInt(row[3]) || 2;
          const difficultyText = String(row[4] || '中等').trim();
          const content = String(row[5] || '').trim();
          const difficulty = difficultyMap[difficultyText] || 'medium';

          if (!subject || !content) {
            results.errors.push(`第${i + 1}行: 缺少必填字段`);
            continue;
          }

          let options = null;
          let answer = '';

          if (questionType === 'choice' || questionType === 'multiple') {
            // 选择题选项
            options = [];
            for (let j = 6; j <= 11; j++) {
              const opt = String(row[j] || '').trim();
              if (opt) options.push(opt);
            }
            if (options.length < 2) {
              results.errors.push(`第${i + 1}行: 至少需要2个选项`);
              continue;
            }
            answer = String(row[12] || '').trim().toUpperCase();
            if (!answer) {
              results.errors.push(`第${i + 1}行: 缺少答案`);
              continue;
            }
            // 多选题验证
            if (questionType === 'multiple' && answer.length < 2) {
              results.errors.push(`第${i + 1}行: 多选题答案至少2个选项`);
              continue;
            }
          } else if (questionType === 'judgment') {
            // 判断题：答案为 A（正确）或 B（错误）
            answer = String(row[6] || '').trim().toUpperCase();
            if (!answer) {
              results.errors.push(`第${i + 1}行: 缺少答案`);
              continue;
            }
            // 规范化答案格式
            if (answer === '正确' || answer === '对' || answer === '√' || answer === 'TRUE' || answer === 'T' || answer === '是') {
              answer = 'A';
            } else if (answer === '错误' || answer === '错' || answer === '×' || answer === 'FALSE' || answer === 'F' || answer === '否') {
              answer = 'B';
            }
            if (answer !== 'A' && answer !== 'B') {
              results.errors.push(`第${i + 1}行: 判断题答案只能是 A(正确) 或 B(错误)`);
              continue;
            }
          } else {
            // 填空题和主观题
            answer = String(row[6] || '').trim();
            if (!answer) {
              results.errors.push(`第${i + 1}行: 缺少答案`);
              continue;
            }
          }

          const analysis = questionType === 'choice' || questionType === 'multiple' ? String(row[13] || '').trim() : String(row[7] || '').trim();

          // 插入数据库
          const result = db.prepare(`
            INSERT INTO questions
            (question_type, subject, grade, chapter, content, options, answer, analysis, difficulty, score, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
          `).run(
            questionType,
            subject,
            grade,
            chapter,
            content,
            options ? JSON.stringify(options) : null,
            answer,
            analysis,
            difficulty,
            score,
            req.user.id
          );

          results.total++;
        } catch (err) {
          results.errors.push(`第${i + 1}行: ${err.message}`);
        }
      }
    }

    logOperation(req.user, 'import', 'questions', 0, `批量导入题目 ${results.total} 道`, req.ip);

    return success(res, {
      total: results.total,
      details: results.details.length > 0 ? results.details : undefined,
      errors: results.errors.length > 0 ? results.errors.slice(0, 10) : undefined
    }, `成功导入 ${results.total} 道题目`);

  } catch (err) {
    console.error('导入失败:', err);
    return error(res, ErrorCodes.SERVER_ERROR, '文件解析失败: ' + err.message);
  }
}

module.exports = {
  getQuestionTree,
  getQuestions,
  getQuestionById,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionsByIds,
  downloadTemplate,
  importQuestions
};