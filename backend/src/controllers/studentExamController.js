const { getDatabase } = require('../config/database');
const { success, error, ErrorCodes } = require('../utils/response');
const { gradeQuestion, gradeQuestionWithConfig } = require('../services/aiService');
const { getGradingQueueService } = require('../services/gradingQueueService');
const {
  getNowUTC,
  formatToISO,
  parseToUTC,
  parseDateToUTC,
  parseDateToEndUTC,
  checkExamTimeWindow
} = require('../utils/timezone');

/**
 * 获取学生待答题列表
 */
function getStudentExams(req, res) {
  const { id: studentId } = req.user;
  const db = getDatabase();

  const student = db.prepare('SELECT grade, class_name FROM students WHERE id = ?').get(studentId);
  if (!student) {
    return error(res, ErrorCodes.AUTH_INVALID_CREDENTIALS, '学生信息不存在');
  }

  const studentFullClass = `${student.grade}${student.class_name}`;

  const tasks = db.prepare(`
    SELECT et.id, et.title, et.subject, et.creator_name, et.start_time, et.end_time,
           et.duration, et.total_score, et.questions, et.grading_mode,
           ea.id as answer_id, ea.status as answer_status, ea.submit_time
    FROM exam_tasks et
    LEFT JOIN exam_answers ea ON et.id = ea.task_id AND ea.student_id = ?
    WHERE et.status = 'published'
      AND (et.target_classes IS NULL OR et.target_classes LIKE ? OR et.target_classes LIKE ?)
      AND (ea.id IS NULL OR ea.status NOT IN ('submitted', 'graded'))
    ORDER BY et.end_time ASC
  `).all(studentId, `%"${studentFullClass}"%`, `%"${student.class_name}"%`);

  const now = getNowUTC();
  const result = tasks.map(task => {
    const questions = JSON.parse(task.questions || '[]');
    let status = 'ongoing';
    const startTime = parseDateToUTC(task.start_time);
    const endTime = parseDateToEndUTC(task.end_time);
    if (startTime && startTime > now) {
      status = 'pending';
    }
    if (task.answer_status === 'ongoing') {
      status = 'ongoing';
    }
    // 过滤已结束的考试（未开始答题的）
    // 只有在考试已经开始或无开始时间限制，且已结束的情况下才过滤
    const isStarted = !startTime || startTime <= now;
    const isEnded = endTime && endTime < now;
    if (isStarted && isEnded && !task.answer_status) {
      return null;
    }

    return {
      id: task.id,
      title: task.title,
      subject: task.subject,
      creatorName: task.creator_name,
      startTime: formatToISO(task.start_time),
      endTime: formatToISO(task.end_time),
      duration: task.duration,
      questionCount: questions.length,
      totalScore: task.total_score,
      status: status,
      submitted: !!task.answer_id && task.answer_status === 'submitted'
    };
  }).filter(task => task !== null);

  return success(res, result);
}

/**
 * 获取考试任务详情（学生端）
 */
function getStudentExamDetail(req, res) {
  const { id } = req.params;
  const { id: studentId } = req.user;
  const db = getDatabase();

  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ? AND status = ?').get(id, 'published');
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  const student = db.prepare('SELECT grade, class_name FROM students WHERE id = ?').get(studentId);
  const targetClasses = task.target_classes ? JSON.parse(task.target_classes) : null;
  const studentFullClass = `${student.grade}${student.class_name}`;
  if (targetClasses && !targetClasses.includes(studentFullClass) && !targetClasses.includes(student.class_name)) {
    return error(res, ErrorCodes.PERMISSION_DENIED, '无权限参加该考试');
  }

  const now = getNowUTC();
  const startTime = parseDateToUTC(task.start_time);
  const endTime = parseDateToEndUTC(task.end_time);

  if (startTime && startTime > now) {
    return error(res, ErrorCodes.EXAM_NOT_STARTED, '考试尚未开始');
  }
  if (endTime && endTime < now) {
    return error(res, ErrorCodes.EXAM_ENDED, '考试已结束');
  }

  const existingAnswer = db.prepare('SELECT * FROM exam_answers WHERE task_id = ? AND student_id = ?').get(id, studentId);
  if (existingAnswer && existingAnswer.status === 'submitted') {
    return error(res, ErrorCodes.EXAM_ALREADY_SUBMITTED, '已提交过答卷');
  }

  const questions = JSON.parse(task.questions || '[]');
  const questionIds = questions.map(q => typeof q === 'object' ? q.questionId : q).filter(id => id);

  if (questionIds.length === 0) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试题目为空');
  }

  const placeholders = questionIds.map(() => '?').join(',');

  const questionDetails = db.prepare(`
    SELECT id, question_type, content, options, answer, analysis, score
    FROM questions WHERE id IN (${placeholders})
  `).all(...questionIds);

  const questionMap = new Map(questionDetails.map(q => [q.id, q]));
  const formattedQuestions = questions.map((q, index) => {
    const qId = typeof q === 'object' ? q.questionId : q;
    const detail = questionMap.get(qId);
    if (!detail) {
      console.error(`Question not found: ${qId}`);
      return null;
    }
    return {
      index: index + 1,
      id: detail.id,
      questionType: detail.question_type,
      content: detail.content,
      options: detail.options ? JSON.parse(detail.options) : null,
      score: typeof q === 'object' ? (q.score || detail.score) : detail.score,
      answer: undefined,
      analysis: undefined
    };
  }).filter(q => q !== null);

  return success(res, {
    id: task.id,
    title: task.title,
    subject: task.subject,
    creatorName: task.creator_name,
    startTime: formatToISO(task.start_time),
    endTime: formatToISO(task.end_time),
    duration: task.duration,
    questionCount: questions.length,
    totalScore: task.total_score,
    questions: formattedQuestions,
    gradingMode: task.grading_mode || 'manual',
    existingAnswer: existingAnswer ? {
      id: existingAnswer.id,
      answers: JSON.parse(existingAnswer.answers || '[]'),
      startTime: formatToISO(existingAnswer.start_time)
    } : null
  });
}

/**
 * 开始答题
 */
function startExam(req, res) {
  const { id } = req.params;
  const { id: studentId } = req.user;
  const db = getDatabase();

  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ? AND status = ?').get(id, 'published');
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  const existingAnswer = db.prepare('SELECT * FROM exam_answers WHERE task_id = ? AND student_id = ?').get(id, studentId);
  if (existingAnswer && existingAnswer.status === 'submitted') {
    return error(res, ErrorCodes.EXAM_ALREADY_SUBMITTED, '已提交过答卷');
  }

  if (!existingAnswer) {
    db.prepare(`
      INSERT INTO exam_answers (task_id, student_id, answers, start_time, status)
      VALUES (?, ?, '[]', datetime('now'), 'ongoing')
    `).run(id, studentId);
  }

  return getStudentExamDetail(req, res);
}

/**
 * 保存答案
 */
function saveAnswer(req, res) {
  const { id } = req.params;
  const { answers } = req.body;
  const { id: studentId } = req.user;
  const db = getDatabase();

  const answerRecord = db.prepare(`
    SELECT * FROM exam_answers WHERE task_id = ? AND student_id = ? AND status = ?
  `).get(id, studentId, 'ongoing');

  if (!answerRecord) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '答题记录不存在');
  }

  db.prepare(`
    UPDATE exam_answers SET answers = ? WHERE id = ?
  `).run(JSON.stringify(answers), answerRecord.id);

  return success(res, null, '答案已保存');
}

/**
 * 获取批改配置
 * 注意：任务的 grading_mode 优先于配置的 grading_mode
 */
function getGradingConfig(db, task) {
  let configData = null;

  if (task.grading_config_id) {
    const config = db.prepare('SELECT * FROM grading_config WHERE id = ?').get(task.grading_config_id);
    if (config) {
      configData = {
        grading_mode: config.grading_mode,
        ai_provider: config.ai_provider,
        ai_model: config.ai_model,
        ai_endpoint: config.ai_endpoint,
        ai_api_key: config.ai_api_key,
        ai_temperature: config.ai_temperature,
        ai_timeout: config.ai_timeout,
        mixed_config: config.mixed_config ? JSON.parse(config.mixed_config) : null
      };
    }
  }

  if (!configData) {
    // 使用默认配置
    const defaultConfig = db.prepare(`
      SELECT * FROM grading_config WHERE is_default = 1 AND status != 'deleted' LIMIT 1
    `).get();

    if (defaultConfig) {
      configData = {
        grading_mode: defaultConfig.grading_mode,
        ai_provider: defaultConfig.ai_provider,
        ai_model: defaultConfig.ai_model,
        ai_endpoint: defaultConfig.ai_endpoint,
        ai_api_key: defaultConfig.ai_api_key,
        ai_temperature: defaultConfig.ai_temperature,
        ai_timeout: defaultConfig.ai_timeout,
        mixed_config: defaultConfig.mixed_config ? JSON.parse(defaultConfig.mixed_config) : null
      };
    }
  }

  // 任务的 grading_mode 优先于配置的 grading_mode
  if (configData) {
    if (task.grading_mode) {
      configData.grading_mode = task.grading_mode;
    }
    return configData;
  }

  // 没有配置，使用考试任务的批改模式
  return {
    grading_mode: task.grading_mode || 'manual'
  };
}

/**
 * 后台AI批改任务
 */
async function runBackgroundGrading(answerRecordId, taskId, studentId, questions, answers, gradingConfig) {
  const db = getDatabase();

  try {
    console.log(`[后台批改] 开始批改: answerId=${answerRecordId}`);

    // 获取题目详情
    const questionIds = questions.map(q => typeof q === 'object' ? q.questionId : q).filter(id => id);
    const placeholders = questionIds.map(() => '?').join(',');
    const questionDetails = db.prepare(`
      SELECT id, question_type, answer, score, content, analysis FROM questions WHERE id IN (${placeholders})
    `).all(...questionIds);
    const questionMap = new Map(questionDetails.map(q => [q.id, q]));

    let totalScore = 0;
    let hasPendingGrading = false;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = typeof q === 'object' ? q.questionId : q;
      const qScore = typeof q === 'object' ? (q.score || 2) : 2;
      const detail = questionMap.get(qId);
      if (!detail) continue;

      const studentAnswer = answers[i];

      // 客观题已经批改过，跳过
      if (detail.question_type === 'choice' || detail.question_type === 'multiple' || detail.question_type === 'judgment') {
        // 从已有记录获取分数
        const existingDetail = db.prepare(`
          SELECT score FROM question_answers WHERE exam_answer_id = ? AND question_id = ?
        `).get(answerRecordId, qId);
        if (existingDetail && existingDetail.score !== null) {
          totalScore += existingDetail.score;
        }
        continue;
      }

      // 主观题AI批改
      if (detail.question_type === 'fill' || detail.question_type === 'subjective') {
        const questionData = {
          question_type: detail.question_type,
          content: detail.content,
          answer: detail.answer,
          studentAnswer: studentAnswer,
          score: qScore,
          analysis: detail.analysis
        };

        // 判断是否需要AI批改
        const needAI = gradingConfig.grading_mode === 'ai' ||
          (gradingConfig.grading_mode === 'mixed' && gradingConfig.mixed_config && gradingConfig.mixed_config[detail.question_type] === 'ai');

        if (needAI) {
          try {
            const result = await gradeQuestion(questionData, gradingConfig);
            totalScore += result.score || 0;

            db.prepare(`
              UPDATE question_answers
              SET score = ?, is_correct = ?, ai_score = ?, ai_comment = ?
              WHERE exam_answer_id = ? AND question_id = ?
            `).run(result.score, result.isCorrect ? 1 : 0, result.score, result.comment, answerRecordId, qId);
          } catch (err) {
            console.error(`[后台批改] AI批改失败: questionId=${qId}`, err);
            hasPendingGrading = true;
            db.prepare(`
              UPDATE question_answers SET ai_comment = ? WHERE exam_answer_id = ? AND question_id = ?
            `).run('AI批改失败，需人工批改', answerRecordId, qId);
          }
        } else {
          hasPendingGrading = true;
        }
      }
    }

    // 更新总分和状态
    const newStatus = hasPendingGrading ? 'submitted' : 'graded';
    db.prepare(`
      UPDATE exam_answers SET total_score = ?, status = ? WHERE id = ?
    `).run(totalScore, newStatus, answerRecordId);

    console.log(`[后台批改] 完成: answerId=${answerRecordId}, score=${totalScore}, status=${newStatus}`);
  } catch (err) {
    console.error(`[后台批改] 批改失败: answerId=${answerRecordId}`, err);
  }
}

/**
 * 提交试卷
 */
async function submitExam(req, res) {
  const { id } = req.params;
  const { answers, time_used } = req.body;
  const { id: studentId } = req.user;
  const db = getDatabase();

  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ?').get(id);
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  const answerRecord = db.prepare(`
    SELECT * FROM exam_answers WHERE task_id = ? AND student_id = ?
  `).get(id, studentId);

  if (!answerRecord) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '答题记录不存在');
  }

  if (answerRecord.status === 'submitted') {
    return error(res, ErrorCodes.EXAM_ALREADY_SUBMITTED, '已提交过答卷');
  }

  // 获取题目信息
  const questions = JSON.parse(task.questions || '[]');
  const questionIds = questions.map(q => typeof q === 'object' ? q.questionId : q).filter(id => id);
  const placeholders = questionIds.map(() => '?').join(',');

  const questionDetails = db.prepare(`
    SELECT id, question_type, answer, score, content, analysis FROM questions WHERE id IN (${placeholders})
  `).all(...questionIds);

  const questionMap = new Map(questionDetails.map(q => [q.id, q]));

  // 获取批改配置
  const gradingConfig = getGradingConfig(db, task);

  // 判断是否需要AI批改
  const needAIGrading = gradingConfig.grading_mode === 'ai' ||
    (gradingConfig.grading_mode === 'mixed' &&
     questions.some(q => {
       const qId = typeof q === 'object' ? q.questionId : q;
       const detail = questionMap.get(qId);
       return detail && (detail.question_type === 'fill' || detail.question_type === 'subjective') &&
         gradingConfig.mixed_config && gradingConfig.mixed_config[detail.question_type] === 'ai';
     }));

  // 批改并记录
  let totalScore = 0;
  let hasPendingGrading = false;
  const answerDetails = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qId = typeof q === 'object' ? q.questionId : q;
    const qScore = typeof q === 'object' ? (q.score || 2) : 2;
    const detail = questionMap.get(qId);
    if (!detail) continue;

    const studentAnswer = answers[i];

    // 客观题处理（单选题、多选题、判断题）
    if (detail.question_type === 'choice' || detail.question_type === 'multiple' || detail.question_type === 'judgment') {
      // 检查是否配置为手动批改
      const typeConfig = gradingConfig.mixed_config?.[detail.question_type];
      if (typeConfig === 'manual') {
        // 手动批改模式：记录答案但等待教师批改
        answerDetails.push({
          exam_answer_id: answerRecord.id,
          question_id: qId,
          student_answer: JSON.stringify(studentAnswer),
          score: null,
          is_correct: null
        });
        hasPendingGrading = true;
        continue;
      }

      // 自动判定
      let isCorrect = false;
      let score = 0;

      if (detail.question_type === 'choice') {
        let studentAns = studentAnswer;
        if (typeof studentAnswer === 'number') {
          studentAns = String.fromCharCode(65 + studentAnswer);
        } else if (typeof studentAnswer === 'string' && /^[0-3]$/.test(studentAnswer)) {
          studentAns = String.fromCharCode(65 + parseInt(studentAnswer));
        }
        isCorrect = studentAns === detail.answer;
      } else if (detail.question_type === 'judgment') {
        // 判断题自动判定
        let studentAns = studentAnswer;
        if (typeof studentAnswer === 'number') {
          // 0 表示正确(A), 1 表示错误(B)
          studentAns = studentAnswer === 0 ? 'A' : 'B';
        } else if (typeof studentAnswer === 'boolean') {
          studentAns = studentAnswer ? 'A' : 'B';
        } else if (typeof studentAnswer === 'string') {
          if (studentAnswer === 'true' || studentAnswer === '正确' || studentAnswer === '√') {
            studentAns = 'A';
          } else if (studentAnswer === 'false' || studentAnswer === '错误' || studentAnswer === '×') {
            studentAns = 'B';
          } else if (/^[01]$/.test(studentAnswer)) {
            studentAns = studentAnswer === '0' ? 'A' : 'B';
          }
        }
        isCorrect = studentAns === detail.answer;
      } else {
        // 多选题
        let studentAnsArr = [];
        if (Array.isArray(studentAnswer)) {
          studentAnsArr = studentAnswer.map(i => String.fromCharCode(65 + i)).sort();
        } else if (typeof studentAnswer === 'string') {
          studentAnsArr = studentAnswer.split('').sort();
        }
        const correctAnswer = detail.answer.split('').sort().join('');
        const studentAns = studentAnsArr.join('');
        isCorrect = studentAns === correctAnswer;
      }

      if (isCorrect) {
        score = qScore;
      }
      totalScore += score;

      answerDetails.push({
        exam_answer_id: answerRecord.id,
        question_id: qId,
        student_answer: JSON.stringify(studentAnswer),
        score: score,
        is_correct: isCorrect ? 1 : 0
      });
      continue;
    }

    // 主观题处理
    if (detail.question_type === 'fill' || detail.question_type === 'subjective') {
      // AI批改模式下，先插入待批改记录，后续后台批改
      if (needAIGrading) {
        answerDetails.push({
          exam_answer_id: answerRecord.id,
          question_id: qId,
          student_answer: JSON.stringify(studentAnswer),
          score: null,
          is_correct: null,
          ai_score: null,
          ai_comment: null
        });
        hasPendingGrading = true;
        continue;
      }

      // 手动批改模式
      if (gradingConfig.grading_mode === 'manual') {
        answerDetails.push({
          exam_answer_id: answerRecord.id,
          question_id: qId,
          student_answer: JSON.stringify(studentAnswer),
          score: null,
          is_correct: null
        });
        hasPendingGrading = true;
        continue;
      }

      // 混合模式
      if (gradingConfig.grading_mode === 'mixed' && gradingConfig.mixed_config) {
        const typeConfig = gradingConfig.mixed_config[detail.question_type];

        if (typeConfig === 'ai') {
          // AI批改，待后台处理
          answerDetails.push({
            exam_answer_id: answerRecord.id,
            question_id: qId,
            student_answer: JSON.stringify(studentAnswer),
            score: null,
            is_correct: null,
            ai_score: null,
            ai_comment: null
          });
          hasPendingGrading = true;
        } else if (typeConfig === 'manual') {
          answerDetails.push({
            exam_answer_id: answerRecord.id,
            question_id: qId,
            student_answer: JSON.stringify(studentAnswer),
            score: null,
            is_correct: null
          });
          hasPendingGrading = true;
        } else {
          answerDetails.push({
            exam_answer_id: answerRecord.id,
            question_id: qId,
            student_answer: JSON.stringify(studentAnswer),
            score: null,
            is_correct: null
          });
          hasPendingGrading = true;
        }
        continue;
      }

      // 默认：需要教师批改
      answerDetails.push({
        exam_answer_id: answerRecord.id,
        question_id: qId,
        student_answer: JSON.stringify(studentAnswer),
        score: null,
        is_correct: null
      });
      hasPendingGrading = true;
    }
  }

  // 确定答卷状态（AI批改模式时先标记为submitted，后台批改完成后再更新）
  const answerStatus = hasPendingGrading ? 'submitted' : 'graded';

  // 更新答题记录
  db.prepare(`
    UPDATE exam_answers
    SET answers = ?, submit_time = datetime('now'), time_used = ?,
        total_score = ?, status = ?
    WHERE id = ?
  `).run(JSON.stringify(answers), time_used, totalScore, answerStatus, answerRecord.id);

  // 插入题目作答详情
  const insertAnswerDetail = db.prepare(`
    INSERT INTO question_answers (exam_answer_id, question_id, student_answer, score, is_correct, ai_score, ai_comment)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const detail of answerDetails) {
    insertAnswerDetail.run(
      detail.exam_answer_id,
      detail.question_id,
      detail.student_answer,
      detail.score,
      detail.is_correct,
      detail.ai_score || null,
      detail.ai_comment || null
    );
  }

  // 如果需要AI批改，加入批改队列
  if (needAIGrading) {
    const queueService = getGradingQueueService();
    await queueService.addTask({
      examAnswerId: answerRecord.id,
      taskId: id,
      studentId: studentId
    });
  }

  return success(res, {
    totalScore,
    submitted: true,
    status: answerStatus,
    hasPendingGrading,
    needAIGrading
  }, '提交成功');
}

/**
 * 获取答题记录列表
 */
function getStudentRecords(req, res) {
  const { id: studentId } = req.user;
  const db = getDatabase();

  const records = db.prepare(`
    SELECT ea.id, ea.task_id, ea.total_score, ea.submit_time, ea.status, ea.time_used,
           et.title, et.subject, et.total_score as exam_total_score
    FROM exam_answers ea
    JOIN exam_tasks et ON ea.task_id = et.id
    WHERE ea.student_id = ? AND ea.status IN ('submitted', 'graded')
    ORDER BY ea.submit_time DESC
  `).all(studentId);

  // 格式化时间
  const formattedRecords = records.map(r => ({
    ...r,
    submitTime: formatToISO(r.submit_time)
  }));

  return success(res, formattedRecords);
}

/**
 * 获取答题记录详情
 */
function getStudentRecordDetail(req, res) {
  const { id } = req.params;
  const { id: studentId } = req.user;
  const db = getDatabase();

  const record = db.prepare(`
    SELECT ea.*, et.title, et.subject, et.questions as task_questions, et.total_score as exam_total_score
    FROM exam_answers ea
    JOIN exam_tasks et ON ea.task_id = et.id
    WHERE ea.id = ? AND ea.student_id = ?
  `).get(id, studentId);

  if (!record) {
    return error(res, ErrorCodes.RESOURCE_NOT_FOUND, '记录不存在');
  }

  // 解析考试题目配置，获取各题分值
  const taskQuestions = JSON.parse(record.task_questions || '[]');
  const scoreMap = new Map(taskQuestions.map(q => [q.questionId, q.score]));

  const answerDetails = db.prepare(`
    SELECT qa.*, q.content, q.question_type, q.options, q.answer, q.analysis, q.score as default_score
    FROM question_answers qa
    JOIN questions q ON qa.question_id = q.id
    WHERE qa.exam_answer_id = ?
    ORDER BY qa.id
  `).all(id);

  const questions = answerDetails.map((detail, index) => ({
    index: index + 1,
    id: detail.question_id,
    questionType: detail.question_type,
    content: detail.content,
    options: detail.options ? JSON.parse(detail.options) : null,
    studentAnswer: JSON.parse(detail.student_answer),
    correctAnswer: detail.answer,
    score: detail.score,
    maxScore: scoreMap.get(detail.question_id) || detail.default_score || 2,
    isCorrect: detail.is_correct === 1,
    analysis: detail.analysis,
    aiComment: detail.ai_comment
  }));

  return success(res, {
    id: record.id,
    title: record.title,
    subject: record.subject,
    totalScore: record.total_score,
    examTotalScore: record.exam_total_score,
    submitTime: formatToISO(record.submit_time),
    timeUsed: record.time_used,
    questions
  });
}

/**
 * 获取学生首页统计数据
 */
function getHomeStats(req, res) {
  const { id: studentId } = req.user;
  const db = getDatabase();

  const student = db.prepare('SELECT grade, class_name FROM students WHERE id = ?').get(studentId);
  if (!student) {
    return error(res, ErrorCodes.AUTH_INVALID_CREDENTIALS, '学生信息不存在');
  }

  const studentFullClass = `${student.grade}${student.class_name}`;

  // 查询所有待完成的考试任务
  const pendingTasks = db.prepare(`
    SELECT et.id, et.start_time, et.end_time, ea.id as answer_id, ea.status as answer_status
    FROM exam_tasks et
    LEFT JOIN exam_answers ea ON et.id = ea.task_id AND ea.student_id = ?
    WHERE et.status = 'published'
      AND (et.target_classes IS NULL OR et.target_classes LIKE ? OR et.target_classes LIKE ?)
      AND (ea.id IS NULL OR ea.status NOT IN ('submitted', 'graded'))
  `).all(studentId, `%"${studentFullClass}"%`, `%"${student.class_name}"%`);

  // 在 JS 层过滤已结束的考试
  const now = getNowUTC();
  const pendingCount = pendingTasks.filter(task => {
    if (task.answer_status === 'ongoing') return true; // 正在答题的不算过期
    const startTime = parseDateToUTC(task.start_time);
    const endTime = parseDateToEndUTC(task.end_time);
    // 如果考试还没开始，也算作待完成
    if (startTime && startTime > now) return true;
    // 如果考试已结束，不算待完成
    return !endTime || endTime >= now;
  }).length;

  const completedCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM exam_answers
    WHERE student_id = ? AND status IN ('submitted', 'graded')
  `).get(studentId).count;

  const stats = db.prepare(`
    SELECT
      AVG(total_score) as avg_score,
      SUM(
        (SELECT SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END)
         FROM question_answers qa
         WHERE qa.exam_answer_id = ea.id)
      ) as total_correct,
      SUM(
        (SELECT COUNT(*) FROM question_answers qa WHERE qa.exam_answer_id = ea.id)
      ) as total_questions
    FROM exam_answers ea
    WHERE ea.student_id = ? AND ea.status = 'graded'
  `).get(studentId);

  const avgScore = stats.avg_score ? Math.round(stats.avg_score) : 0;
  const correctRate = stats.total_questions > 0
    ? Math.round((stats.total_correct || 0) / stats.total_questions * 100)
    : 0;

  const recentExams = db.prepare(`
    SELECT ea.id, ea.task_id, ea.total_score, ea.submit_time, ea.status,
           et.title, et.subject, et.total_score as exam_total_score
    FROM exam_answers ea
    JOIN exam_tasks et ON ea.task_id = et.id
    WHERE ea.student_id = ? AND ea.status IN ('submitted', 'graded')
    ORDER BY ea.submit_time DESC
    LIMIT 5
  `).all(studentId);

  return success(res, {
    pendingCount,
    stats: {
      completed: completedCount,
      avgScore,
      correctRate
    },
    recentExams: recentExams.map(r => ({
      id: r.id,
      title: r.title,
      subject: r.subject,
      submitTime: formatToISO(r.submit_time),
      score: r.total_score,
      totalScore: r.exam_total_score,
      status: r.status
    }))
  });
}

/**
 * 获取学生错题列表
 */
function getMistakes(req, res) {
  const { id: studentId } = req.user;
  const db = getDatabase();

  const mistakes = db.prepare(`
    SELECT DISTINCT
      q.id,
      q.subject,
      q.chapter,
      q.content,
      q.question_type,
      COUNT(qa.id) as wrong_count
    FROM question_answers qa
    JOIN questions q ON qa.question_id = q.id
    JOIN exam_answers ea ON qa.exam_answer_id = ea.id
    WHERE ea.student_id = ? AND qa.is_correct = 0
    GROUP BY q.id
    ORDER BY wrong_count DESC, q.id DESC
  `).all(studentId);

  // 转换为驼峰命名
  const formattedMistakes = mistakes.map(m => ({
    id: m.id,
    subject: m.subject,
    chapter: m.chapter,
    content: m.content,
    questionType: m.question_type,
    wrongCount: m.wrong_count
  }));

  return success(res, formattedMistakes);
}

/**
 * 获取单个错题详情（用于重新练习）
 */
function getMistakeDetail(req, res) {
  const { id } = req.params;
  const { id: studentId } = req.user;
  const db = getDatabase();

  const question = db.prepare(`
    SELECT q.id, q.subject, q.chapter, q.content, q.question_type, q.options, q.answer, q.analysis, q.score
    FROM questions q
    WHERE q.id = ?
  `).get(id);

  if (!question) {
    return error(res, ErrorCodes.RESOURCE_NOT_FOUND, '题目不存在');
  }

  // 验证这是学生的错题
  const isMistake = db.prepare(`
    SELECT COUNT(*) as count
    FROM question_answers qa
    JOIN exam_answers ea ON qa.exam_answer_id = ea.id
    WHERE qa.question_id = ? AND ea.student_id = ? AND qa.is_correct = 0
  `).get(id, studentId);

  if (!isMistake || isMistake.count === 0) {
    return error(res, ErrorCodes.PERMISSION_DENIED, '该题目不是您的错题');
  }

  return success(res, {
    id: question.id,
    subject: question.subject,
    chapter: question.chapter,
    content: question.content,
    questionType: question.question_type,
    options: question.options ? JSON.parse(question.options) : null,
    answer: question.answer,
    analysis: question.analysis,
    score: question.score
  });
}

/**
 * 获取学生参与过的考试列表（用于排行榜）
 */
function getRankingExams(req, res) {
  const { id: studentId } = req.user;
  const db = getDatabase();

  // 获取学生参与过的所有考试（已提交或已批改）
  const exams = db.prepare(`
    SELECT DISTINCT
      et.id,
      et.title,
      et.subject,
      et.grade,
      et.total_score,
      et.end_time,
      ea.status as answer_status,
      ea.total_score as my_score
    FROM exam_tasks et
    JOIN exam_answers ea ON et.id = ea.task_id
    WHERE ea.student_id = ? AND ea.status IN ('submitted', 'graded')
    ORDER BY et.end_time DESC
  `).all(studentId);

  // 统计每个考试的批改进度
  const result = exams.map(exam => {
    const gradedCount = db.prepare(`
      SELECT COUNT(*) as count FROM exam_answers
      WHERE task_id = ? AND status = 'graded'
    `).get(exam.id).count;

    const submittedCount = db.prepare(`
      SELECT COUNT(*) as count FROM exam_answers
      WHERE task_id = ? AND status IN ('submitted', 'graded')
    `).get(exam.id).count;

    return {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      grade: exam.grade,
      totalScore: exam.total_score,
      endTime: exam.end_time,
      myScore: exam.my_score,
      isGraded: exam.answer_status === 'graded',
      gradedCount,
      submittedCount
    };
  });

  return success(res, result);
}

/**
 * 获取班级排名（学生视角）
 */
function getStudentClassRanking(req, res) {
  const { taskId } = req.params;
  const { id: studentId } = req.user;
  const db = getDatabase();

  // 获取学生信息
  const student = db.prepare('SELECT grade, class_name FROM students WHERE id = ?').get(studentId);
  if (!student) {
    return error(res, ErrorCodes.AUTH_INVALID_CREDENTIALS, '学生信息不存在');
  }

  // 检查学生是否参与了该考试
  const myAnswer = db.prepare(`
    SELECT * FROM exam_answers
    WHERE task_id = ? AND student_id = ? AND status IN ('submitted', 'graded')
  `).get(taskId, studentId);

  if (!myAnswer) {
    return error(res, ErrorCodes.PERMISSION_DENIED, '您未参与该考试');
  }

  // 获取考试任务
  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ?').get(taskId);
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  // 获取同班已批改的学生答题记录
  const students = db.prepare(`
    SELECT s.id, s.name, s.class_name, ea.total_score, ea.time_used
    FROM exam_answers ea
    JOIN students s ON ea.student_id = s.id
    WHERE ea.task_id = ? AND ea.status = 'graded'
      AND s.grade = ? AND s.class_name = ?
    ORDER BY ea.total_score DESC, ea.time_used ASC
  `).all(taskId, student.grade, student.class_name);

  // 计算排名
  const ranking = [];
  let currentRank = 0;
  let prevScore = null;
  let prevTimeUsed = null;

  students.forEach((stu, index) => {
    if (prevScore !== null && stu.total_score === prevScore && stu.time_used === prevTimeUsed) {
      // 相同分数和用时，排名相同
    } else {
      currentRank = index + 1;
    }

    ranking.push({
      rank: currentRank,
      studentId: stu.id,
      studentName: stu.name,
      className: stu.class_name,
      score: stu.total_score,
      timeUsed: stu.time_used,
      isMe: stu.id === studentId
    });

    prevScore = stu.total_score;
    prevTimeUsed = stu.time_used;
  });

  return success(res, {
    ranking,
    myRank: ranking.find(r => r.isMe)?.rank || null,
    myScore: myAnswer.total_score,
    totalScore: task.total_score,
    className: student.class_name
  });
}

/**
 * 获取年级排名（学生视角）
 */
function getStudentGradeRanking(req, res) {
  const { taskId } = req.params;
  const { id: studentId } = req.user;
  const db = getDatabase();

  // 获取学生信息
  const student = db.prepare('SELECT grade, class_name FROM students WHERE id = ?').get(studentId);
  if (!student) {
    return error(res, ErrorCodes.AUTH_INVALID_CREDENTIALS, '学生信息不存在');
  }

  // 检查学生是否参与了该考试
  const myAnswer = db.prepare(`
    SELECT * FROM exam_answers
    WHERE task_id = ? AND student_id = ? AND status IN ('submitted', 'graded')
  `).get(taskId, studentId);

  if (!myAnswer) {
    return error(res, ErrorCodes.PERMISSION_DENIED, '您未参与该考试');
  }

  // 获取考试任务
  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ?').get(taskId);
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  // 获取各班级的平均分排名
  const classStats = db.prepare(`
    SELECT
      s.class_name,
      COUNT(*) as student_count,
      AVG(ea.total_score) as avg_score
    FROM exam_answers ea
    JOIN students s ON ea.student_id = s.id
    WHERE ea.task_id = ? AND ea.status = 'graded' AND s.grade = ?
    GROUP BY s.class_name
    ORDER BY avg_score DESC
  `).all(taskId, student.grade);

  // 计算排名
  const ranking = [];
  let currentRank = 0;
  let prevAvgScore = null;

  classStats.forEach((cls, index) => {
    if (prevAvgScore !== null && cls.avg_score === prevAvgScore) {
      // 相同平均分，排名相同
    } else {
      currentRank = index + 1;
    }

    ranking.push({
      rank: currentRank,
      className: cls.class_name,
      studentCount: cls.student_count,
      avgScore: Math.round(cls.avg_score * 100) / 100,
      isMyClass: cls.class_name === student.class_name
    });

    prevAvgScore = cls.avg_score;
  });

  return success(res, {
    ranking,
    myClassRank: ranking.find(r => r.isMyClass)?.rank || null,
    grade: student.grade
  });
}

module.exports = {
  getStudentExams,
  getStudentExamDetail,
  startExam,
  saveAnswer,
  submitExam,
  getStudentRecords,
  getStudentRecordDetail,
  getHomeStats,
  getMistakes,
  getMistakeDetail,
  getRankingExams,
  getStudentClassRanking,
  getStudentGradeRanking
};
