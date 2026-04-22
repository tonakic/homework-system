const { getDatabase } = require('../config/database');
const { success, error, ErrorCodes } = require('../utils/response');
const { gradeQuestion, gradeQuestionWithConfig } = require('../services/aiService');

/**
 * 获取批改配置
 */
function getGradingConfig(db, configId) {
  if (!configId) return null;
  const config = db.prepare('SELECT * FROM grading_config WHERE id = ? AND status != ?').get(configId, 'deleted');
  if (!config) return null;
  return {
    grading_mode: config.grading_mode,
    ai_provider: config.ai_provider,
    ai_api_key: config.ai_api_key,
    ai_model: config.ai_model,
    ai_endpoint: config.ai_endpoint,
    ai_temperature: config.ai_temperature,
    ai_timeout: config.ai_timeout,
    prompt_strictness: config.prompt_strictness,
    prompt_style: config.prompt_style,
    prompt_comment_length: config.prompt_comment_length,
    prompt_encourage_ratio: config.prompt_encourage_ratio,
    prompt_analysis_detail: config.prompt_analysis_detail,
    mixed_config: config.mixed_config ? JSON.parse(config.mixed_config) : null
  };
}

/**
 * 获取默认批改配置
 */
function getDefaultGradingConfig(db) {
  const config = db.prepare(`
    SELECT * FROM grading_config WHERE is_default = 1 AND status != 'deleted' LIMIT 1
  `).get();
  if (!config) {
    return { grading_mode: 'manual' };
  }
  return {
    grading_mode: config.grading_mode,
    ai_provider: config.ai_provider,
    ai_api_key: config.ai_api_key,
    ai_model: config.ai_model,
    ai_endpoint: config.ai_endpoint,
    ai_temperature: config.ai_temperature,
    ai_timeout: config.ai_timeout,
    prompt_strictness: config.prompt_strictness,
    prompt_style: config.prompt_style,
    prompt_comment_length: config.prompt_comment_length,
    prompt_encourage_ratio: config.prompt_encourage_ratio,
    prompt_analysis_detail: config.prompt_analysis_detail,
    mixed_config: config.mixed_config ? JSON.parse(config.mixed_config) : null
  };
}

/**
 * AI批改填空题
 */
async function aiGradeFill(req, res) {
  const { questionId, question, referenceAnswer, studentAnswer } = req.body;

  if (!questionId || !question || !referenceAnswer || studentAnswer === undefined) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请填写完整信息');
  }

  const db = getDatabase();

  const questionData = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!questionData) {
    return error(res, ErrorCodes.QUESTION_NOT_FOUND, '题目不存在');
  }

  try {
    const result = await gradeQuestion({
      question_type: 'fill',
      content: question,
      answer: referenceAnswer,
      studentAnswer,
      score: questionData.score,
      analysis: questionData.analysis
    });

    return success(res, result);
  } catch (err) {
    console.error('AI批改失败:', err);
    return error(res, ErrorCodes.AI_GRADING_FAILED, 'AI批改失败: ' + err.message);
  }
}

/**
 * AI批改主观题
 */
async function aiGradeSubjective(req, res) {
  const { questionId, question, referenceAnswer, scoringStandard, studentAnswer, totalScore } = req.body;

  if (!questionId || !question || !studentAnswer) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请填写完整信息');
  }

  const db = getDatabase();

  const questionData = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!questionData) {
    return error(res, ErrorCodes.QUESTION_NOT_FOUND, '题目不存在');
  }

  try {
    const result = await gradeQuestion({
      question_type: 'subjective',
      content: question,
      answer: referenceAnswer || questionData.answer,
      studentAnswer,
      score: totalScore || questionData.score,
      analysis: scoringStandard || questionData.analysis
    });

    return success(res, result);
  } catch (err) {
    console.error('AI批改失败:', err);
    return error(res, ErrorCodes.AI_GRADING_FAILED, 'AI批改失败: ' + err.message);
  }
}

/**
 * 批量批改考试答卷
 */
async function batchGrade(req, res) {
  const { examAnswerId, updateDatabase = true } = req.body;

  if (!examAnswerId) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请提供答题记录ID');
  }

  const db = getDatabase();

  const answerRecord = db.prepare(`
    SELECT ea.*, et.questions as task_questions, et.grading_mode, et.grading_config_id
    FROM exam_answers ea
    JOIN exam_tasks et ON ea.task_id = et.id
    WHERE ea.id = ?
  `).get(examAnswerId);

  if (!answerRecord) {
    return error(res, ErrorCodes.RESOURCE_NOT_FOUND, '答题记录不存在');
  }

  // 获取批改配置 - 优先使用任务关联的配置，否则使用默认配置
  let gradingConfig = getGradingConfig(db, answerRecord.grading_config_id);
  if (!gradingConfig) {
    gradingConfig = getDefaultGradingConfig(db);
  }

  // 如果考试任务有明确的 grading_mode，优先使用任务的设置
  if (answerRecord.grading_mode) {
    gradingConfig.grading_mode = answerRecord.grading_mode;
  }

  const answerDetails = db.prepare(`
    SELECT qa.*, q.content, q.question_type, q.answer, q.options, q.analysis, q.score as question_score
    FROM question_answers qa
    JOIN questions q ON qa.question_id = q.id
    WHERE qa.exam_answer_id = ?
  `).all(examAnswerId);

  // 解析考试任务的题目配置，获取各题目的分值
  const taskQuestions = JSON.parse(answerRecord.task_questions || '[]');
  const questionScoreMap = new Map();
  taskQuestions.forEach(q => {
    if (typeof q === 'object' && q.questionId) {
      questionScoreMap.set(q.questionId, q.score);
    }
  });

  let totalScore = 0;
  let hasPendingGrading = false;
  const results = [];

  for (const detail of answerDetails) {
    // 选择题、多选题、判断题已经自动判定，跳过
    if (detail.question_type === 'choice' || detail.question_type === 'multiple' || detail.question_type === 'judgment') {
      totalScore += detail.score || 0;
      results.push({
        questionId: detail.question_id,
        score: detail.score,
        isCorrect: detail.is_correct
      });
      continue;
    }

    try {
      const studentAnswer = JSON.parse(detail.student_answer);
      // 获取题目的满分（优先从考试任务配置获取，其次从题库获取）
      const maxScore = questionScoreMap.get(detail.question_id) || detail.question_score || 2;

      const questionData = {
        question_type: detail.question_type,
        content: detail.content,
        answer: detail.answer,
        studentAnswer,
        score: maxScore,
        analysis: detail.analysis
      };

      // 使用配置进行批改 - 使用 gradeQuestionWithConfig 以正确处理 grading_mode
      const result = await gradeQuestionWithConfig(questionData, gradingConfig);

      // 如果是待批改状态（手动模式），标记为待批改
      if (result.pending) {
        hasPendingGrading = true;
        results.push({
          questionId: detail.question_id,
          pending: true,
          comment: result.comment
        });
        continue;
      }

      if (updateDatabase) {
        db.prepare(`
          UPDATE question_answers
          SET ai_score = ?, score = ?, is_correct = ?, ai_comment = ?
          WHERE id = ?
        `).run(result.score, result.score, result.isCorrect ? 1 : 0, result.comment, detail.id);
      }

      totalScore += result.score || 0;
      results.push({
        questionId: detail.question_id,
        score: result.score,
        isCorrect: result.isCorrect,
        comment: result.comment,
        details: result.details
      });
    } catch (err) {
      console.error(`批改题目 ${detail.question_id} 失败:`, err);
      results.push({
        questionId: detail.question_id,
        error: err.message
      });
    }
  }

  // 如果有待批改的题目，状态保持为 submitted
  const finalStatus = hasPendingGrading ? 'submitted' : 'graded';

  if (updateDatabase) {
    db.prepare(`
      UPDATE exam_answers
      SET total_score = ?, status = ?, graded_at = datetime('now'), graded_by = 0
      WHERE id = ?
    `).run(totalScore, finalStatus, examAnswerId);
  }

  return success(res, {
    examAnswerId,
    totalScore,
    results
  });
}

/**
 * 获取待批改列表（教师端）- 按考试任务分组
 */
function getPendingGradingList(req, res) {
  const { userType, id: teacherId } = req.user;
  const db = getDatabase();

  let whereClause = 'WHERE et.status = ?';
  let params = ['published'];

  // 教师只能看自己创建的考试
  if (userType === 'teacher') {
    whereClause += ' AND et.creator_id = ?';
    params.push(teacherId);
  }

  // 获取所有已发布的考试任务，统计待批改和已批改数量
  const taskList = db.prepare(`
    SELECT
      et.id as task_id,
      et.title,
      et.subject,
      et.grading_mode,
      et.total_score as exam_total_score,
      COUNT(ea.id) as total_submissions,
      SUM(CASE WHEN ea.status = 'submitted' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN ea.status = 'graded' THEN 1 ELSE 0 END) as graded_count
    FROM exam_tasks et
    LEFT JOIN exam_answers ea ON et.id = ea.task_id
    ${whereClause}
    GROUP BY et.id
    HAVING total_submissions > 0
    ORDER BY pending_count DESC, et.created_at DESC
  `).all(...params);

  return success(res, taskList);
}

/**
 * 获取某个考试任务的学生答卷列表
 */
function getTaskStudents(req, res) {
  const { taskId } = req.params;
  const { userType, id: teacherId } = req.user;
  const db = getDatabase();

  // 检查权限
  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ?').get(taskId);
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  if (userType === 'teacher' && task.creator_id !== teacherId) {
    return error(res, ErrorCodes.PERMISSION_DENIED, '无权限查看该任务');
  }

  const answers = db.prepare(`
    SELECT ea.id as answer_id, ea.student_id, ea.total_score, ea.submit_time, ea.status, ea.graded_at,
           s.name as student_name, s.student_no, s.grade, s.class_name
    FROM exam_answers ea
    JOIN students s ON ea.student_id = s.id
    WHERE ea.task_id = ?
    ORDER BY
      CASE WHEN ea.status = 'submitted' THEN 0 ELSE 1 END,
      ea.submit_time DESC
  `).all(taskId);

  return success(res, answers);
}

/**
 * 获取学生答卷详情（用于批改）
 */
function getAnswerDetail(req, res) {
  const { answerId } = req.params;
  const { userType, id: teacherId } = req.user;
  const db = getDatabase();

  // 获取答卷信息
  const answer = db.prepare(`
    SELECT ea.*, s.name as student_name, s.student_no, s.grade, s.class_name,
           et.title, et.subject, et.questions as task_questions, et.grading_mode,
           et.total_score as exam_total_score, et.creator_id, et.grading_config_id
    FROM exam_answers ea
    JOIN students s ON ea.student_id = s.id
    JOIN exam_tasks et ON ea.task_id = et.id
    WHERE ea.id = ?
  `).get(answerId);

  if (!answer) {
    return error(res, ErrorCodes.RESOURCE_NOT_FOUND, '答卷不存在');
  }

  // 检查权限
  if (userType === 'teacher' && answer.creator_id !== teacherId) {
    return error(res, ErrorCodes.PERMISSION_DENIED, '无权限查看该答卷');
  }

  // 获取批改配置（混合模式需要）
  let mixedConfig = null;
  if (answer.grading_mode === 'mixed' && answer.grading_config_id) {
    const config = db.prepare('SELECT mixed_config FROM grading_config WHERE id = ?').get(answer.grading_config_id);
    if (config && config.mixed_config) {
      try {
        mixedConfig = JSON.parse(config.mixed_config);
      } catch (e) {}
    }
  }

  // 获取题目作答详情
  const answerDetails = db.prepare(`
    SELECT qa.id, qa.question_id, qa.student_answer, qa.score, qa.is_correct,
           qa.ai_score, qa.ai_comment, qa.teacher_score, qa.teacher_comment,
           q.content, q.question_type, q.options, q.answer, q.analysis, q.score as max_score
    FROM question_answers qa
    JOIN questions q ON qa.question_id = q.id
    WHERE qa.exam_answer_id = ?
    ORDER BY qa.id
  `).all(answerId);

  // 获取考试任务的题目配置（包含分值）
  const taskQuestions = JSON.parse(answer.task_questions || '[]');
  const questionScoreMap = new Map();
  taskQuestions.forEach(q => {
    if (typeof q === 'object' && q.questionId) {
      questionScoreMap.set(q.questionId, q.score);
    }
  });

  // 格式化题目详情
  const questions = answerDetails.map((detail, index) => {
    const maxScore = questionScoreMap.get(detail.question_id) || detail.max_score || 2;
    let studentAnswerText = detail.student_answer;
    let studentAnswerDisplay = detail.student_answer;

    // 解析学生答案
    try {
      const parsed = JSON.parse(detail.student_answer);

      // 选择题：将索引转换为字母
      if (detail.question_type === 'choice') {
        if (typeof parsed === 'number') {
          // 数字索引转换为字母
          studentAnswerDisplay = String.fromCharCode(65 + parsed);
        } else if (typeof parsed === 'string') {
          if (/^[0-3]$/.test(parsed)) {
            // 字符串形式的数字索引转换为字母
            studentAnswerDisplay = String.fromCharCode(65 + parseInt(parsed));
          } else {
            studentAnswerDisplay = parsed;
          }
        }
        studentAnswerText = studentAnswerDisplay;
      }
      // 多选题：将索引数组转换为字母
      else if (detail.question_type === 'multiple') {
        if (Array.isArray(parsed)) {
          // 检查是否是数字索引
          if (parsed.length > 0 && typeof parsed[0] === 'number') {
            studentAnswerDisplay = parsed.map(i => String.fromCharCode(65 + i)).sort().join('');
          } else {
            studentAnswerDisplay = parsed.sort().join('');
          }
        } else if (typeof parsed === 'string') {
          studentAnswerDisplay = parsed;
        }
        studentAnswerText = studentAnswerDisplay;
      }
      // 判断题：将索引转换为文字
      else if (detail.question_type === 'judgment') {
        if (typeof parsed === 'number') {
          studentAnswerDisplay = parsed === 0 ? 'A' : 'B';
          studentAnswerText = parsed === 0 ? '正确' : '错误';
        } else if (typeof parsed === 'string') {
          if (parsed === '0') {
            studentAnswerDisplay = 'A';
            studentAnswerText = '正确';
          } else if (parsed === '1') {
            studentAnswerDisplay = 'B';
            studentAnswerText = '错误';
          } else {
            studentAnswerDisplay = parsed;
            studentAnswerText = parsed === 'A' ? '正确' : '错误';
          }
        }
      }
      // 其他题型
      else if (Array.isArray(parsed)) {
        studentAnswerText = parsed.join('、');
      } else if (typeof parsed === 'string') {
        studentAnswerText = parsed;
      }
    } catch (e) {
      // 保持原样
    }

    // 格式化参考答案
    let answerDisplay = detail.answer;
    try {
      const answerParsed = JSON.parse(detail.answer);
      if (Array.isArray(answerParsed)) {
        // 填空题：过滤空字符串，用顿号连接
        answerDisplay = answerParsed.filter(a => a && a.trim()).join('、') || detail.answer;
      }
    } catch (e) {
      // 保持原样
    }

    return {
      id: detail.id,
      question_id: detail.question_id,
      question_type: detail.question_type,
      content: detail.content,
      options: detail.options ? JSON.parse(detail.options) : null,
      answer: answerDisplay,
      analysis: detail.analysis,
      max_score: maxScore,
      student_answer: studentAnswerDisplay,
      student_answer_text: studentAnswerText,
      score: detail.score,
      is_correct: detail.is_correct,
      ai_score: detail.ai_score,
      ai_comment: detail.ai_comment,
      teacher_score: detail.teacher_score,
      teacher_comment: detail.teacher_comment
    };
  });

  return success(res, {
    student: {
      answer_id: answer.id,
      student_id: answer.student_id,
      student_name: answer.student_name,
      student_no: answer.student_no,
      grade: answer.grade,
      class_name: answer.class_name,
      submit_time: answer.submit_time,
      status: answer.status,
      total_score: answer.total_score,
      title: answer.title,
      subject: answer.subject,
      exam_total_score: answer.exam_total_score,
      grading_mode: answer.grading_mode,
      mixed_config: mixedConfig
    },
    questions
  });
}

/**
 * 教师调整分数
 */
function adjustScore(req, res) {
  const { answerDetailId, score, comment } = req.body;
  const db = getDatabase();

  const detail = db.prepare('SELECT * FROM question_answers WHERE id = ?').get(answerDetailId);
  if (!detail) {
    return error(res, ErrorCodes.RESOURCE_NOT_FOUND, '答题详情不存在');
  }

  db.prepare(`
    UPDATE question_answers
    SET teacher_score = ?, score = ?, teacher_comment = ?
    WHERE id = ?
  `).run(score, score, comment, answerDetailId);

  // 重新计算总分
  const totalResult = db.prepare(`
    SELECT SUM(score) as total FROM question_answers WHERE exam_answer_id = ?
  `).get(detail.exam_answer_id);

  db.prepare('UPDATE exam_answers SET total_score = ? WHERE id = ?').run(totalResult.total, detail.exam_answer_id);

  return success(res, { score, comment, totalScore: totalResult.total });
}

/**
 * 保存批改结果（批量）
 */
function saveGrading(req, res) {
  const { examAnswerId, gradings } = req.body;
  const db = getDatabase();

  if (!examAnswerId || !gradings || gradings.length === 0) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '参数错误');
  }

  // 开启事务
  const updateGrading = db.prepare(`
    UPDATE question_answers
    SET teacher_score = ?, score = ?, teacher_comment = ?
    WHERE id = ?
  `);

  for (const g of gradings) {
    updateGrading.run(g.score, g.score, g.comment || null, g.answerDetailId);
  }

  // 重新计算总分
  const totalResult = db.prepare(`
    SELECT SUM(score) as total FROM question_answers WHERE exam_answer_id = ?
  `).get(examAnswerId);

  // 更新答卷状态为已批改
  db.prepare(`
    UPDATE exam_answers
    SET total_score = ?, status = 'graded', graded_at = datetime('now')
    WHERE id = ?
  `).run(totalResult.total, examAnswerId);

  return success(res, { totalScore: totalResult.total }, '批改完成');
}

/**
 * 获取考试任务的混合批改配置
 */
function getTaskGradingConfig(req, res) {
  const { taskId } = req.params;
  const db = getDatabase();

  const task = db.prepare(`
    SELECT et.grading_mode, gc.mixed_config
    FROM exam_tasks et
    LEFT JOIN grading_config gc ON et.grading_config_id = gc.id
    WHERE et.id = ?
  `).get(taskId);

  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  let mixedConfig = null;
  if (task.mixed_config) {
    try {
      mixedConfig = JSON.parse(task.mixed_config);
    } catch (e) {}
  }

  return success(res, {
    grading_mode: task.grading_mode,
    mixed_config: mixedConfig
  });
}

module.exports = {
  aiGradeFill,
  aiGradeSubjective,
  batchGrade,
  getPendingGradingList,
  getTaskStudents,
  getAnswerDetail,
  adjustScore,
  saveGrading,
  getTaskGradingConfig
};
