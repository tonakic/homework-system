const { getDatabase } = require('../config/database');
const { success, error, paginated, ErrorCodes } = require('../utils/response');
const { parseChinaTimeToUTC, formatToISO, getNowUTC } = require('../utils/timezone');

/**
 * 获取考试任务列表
 */
function getExamTasks(req, res) {
  const { page = 1, pageSize = 20, subject, grade, status, keyword } = req.query;
  const { userType, id, manage_classes } = req.user;

  const db = getDatabase();
  let whereClauses = [];
  let params = [];

  // 教师只能看到自己创建的任务
  if (userType === 'teacher') {
    whereClauses.push('creator_id = ? AND creator_type = ?');
    params.push(id, 'teacher');
  }

  // 筛选条件
  if (subject) {
    whereClauses.push('subject = ?');
    params.push(subject);
  }

  if (grade) {
    whereClauses.push('grade = ?');
    params.push(grade);
  }

  if (status && status !== 'all') {
    whereClauses.push('status = ?');
    params.push(status);
  }

  if (keyword) {
    whereClauses.push('title LIKE ?');
    params.push(`%${keyword}%`);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 获取总数
  const countResult = db.prepare(`SELECT COUNT(*) as total FROM exam_tasks ${whereSQL}`).get(...params);
  const total = countResult.total;

  // 获取列表
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const tasks = db.prepare(`
    SELECT * FROM exam_tasks
    ${whereSQL}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  // 解析JSON字段
  tasks.forEach(task => {
    if (task.target_classes) {
      task.target_classes = JSON.parse(task.target_classes);
    }
    if (task.questions) {
      task.questions = JSON.parse(task.questions);
    }
  });

  return paginated(res, tasks, total, page, pageSize);
}

/**
 * 获取考试任务详情
 */
function getExamTaskById(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const task = db.prepare(`SELECT * FROM exam_tasks WHERE id = ?`).get(id);

  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  // 检查权限
  if (req.user.userType === 'teacher' && (task.creator_id !== req.user.id || task.creator_type !== 'teacher')) {
    return error(res, ErrorCodes.PERMISSION_DENIED, '无权限查看该任务');
  }

  // 解析JSON字段
  if (task.target_classes) {
    task.target_classes = JSON.parse(task.target_classes);
  }
  if (task.questions) {
    task.questions = JSON.parse(task.questions);
  }

  // 获取题目详情
  if (task.questions && task.questions.length > 0) {
    const questionIds = task.questions.map(q => q.questionId);
    const placeholders = questionIds.map(() => '?').join(',');
    const questions = db.prepare(`
      SELECT id, question_type, subject, content, options, answer, score
      FROM questions WHERE id IN (${placeholders})
    `).all(...questionIds);

    // 合并题目和分值信息
    const questionMap = new Map(questions.map(q => [q.id, q]));
    task.questionDetails = task.questions.map(q => {
      const questionData = questionMap.get(q.questionId);
      let answerDisplay = questionData?.answer;

      // 格式化填空题答案：将数组转换为顿号连接的字符串
      if (questionData?.question_type === 'fill' && answerDisplay) {
        try {
          const answerParsed = JSON.parse(answerDisplay);
          if (Array.isArray(answerParsed)) {
            answerDisplay = answerParsed.filter(a => a && a.trim()).join('、');
          }
        } catch (e) {
          // 保持原样
        }
      }

      return {
        ...questionData,
        score: q.score,
        options: questionData?.options ? JSON.parse(questionData.options) : null,
        answer: answerDisplay
      };
    });
  }

  return success(res, task);
}

/**
 * 创建考试任务
 */
function createExamTask(req, res) {
  const {
    title, subject, grade, target_classes, start_time, end_time,
    duration, questions, total_score, grading_mode, grading_config_id
  } = req.body;

  // 验证必填字段
  if (!title || !subject || !questions || questions.length === 0) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请填写必填信息');
  }

  // 验证时间逻辑（使用 Date 对象比较）
  if (start_time && end_time) {
    const start = parseChinaTimeToUTC(start_time);
    const end = parseChinaTimeToUTC(end_time);
    if (end <= start) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '结束时间不能早于开始时间');
    }
  }

  const db = getDatabase();

  // 计算总分（如果未提供）
  let calculatedTotalScore = total_score;
  if (!calculatedTotalScore) {
    calculatedTotalScore = questions.reduce((sum, q) => sum + (q.score || 2), 0);
  }

  // 如果未指定批改配置，自动使用默认配置
  let finalGradingConfigId = grading_config_id;
  if (!finalGradingConfigId) {
    const defaultConfig = db.prepare('SELECT id FROM grading_config WHERE is_default = 1 AND status != ? LIMIT 1').get('deleted');
    if (defaultConfig) {
      finalGradingConfigId = defaultConfig.id;
    }
  }

  const result = db.prepare(`
    INSERT INTO exam_tasks
    (title, subject, grade, target_classes, creator_id, creator_type, creator_name, start_time, end_time,
     duration, questions, total_score, grading_mode, grading_config_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
  `).run(
    title,
    subject,
    grade,
    target_classes ? JSON.stringify(target_classes) : null,
    req.user.id,
    req.user.userType,
    req.user.name,
    start_time,
    end_time,
    duration || 0,
    JSON.stringify(questions),
    calculatedTotalScore,
    grading_mode || 'ai',
    finalGradingConfigId || null
  );

  logOperation(req.user, 'create', 'exam_task', result.lastInsertRowid, `创建考试任务: ${title}`, req.ip);

  return success(res, { id: result.lastInsertRowid }, '考试任务创建成功');
}

/**
 * 更新考试任务
 */
function updateExamTask(req, res) {
  const { id } = req.params;
  const {
    title, subject, grade, target_classes, start_time, end_time,
    duration, questions, total_score, grading_mode, grading_config_id, status
  } = req.body;

  const db = getDatabase();

  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ?').get(id);
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  // 检查权限
  if (req.user.userType === 'teacher' && (task.creator_id !== req.user.id || task.creator_type !== 'teacher')) {
    return error(res, ErrorCodes.PERMISSION_DENIED, '无权限修改该任务');
  }

  // 只有草稿状态可以修改
  if (task.status !== 'draft') {
    return error(res, ErrorCodes.VALIDATION_ERROR, '只能修改草稿状态的任务');
  }

  // 验证时间逻辑（使用更新后的值或原值，使用 Date 对象比较）
  const finalStartTime = start_time || task.start_time;
  const finalEndTime = end_time || task.end_time;
  if (finalStartTime && finalEndTime) {
    const start = parseChinaTimeToUTC(finalStartTime);
    const end = parseChinaTimeToUTC(finalEndTime);
    if (end <= start) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '结束时间不能早于开始时间');
    }
  }

  // 计算总分
  let calculatedTotalScore = total_score;
  if (!calculatedTotalScore && questions) {
    calculatedTotalScore = questions.reduce((sum, q) => sum + (q.score || 2), 0);
  }

  db.prepare(`
    UPDATE exam_tasks
    SET title = ?, subject = ?, grade = ?, target_classes = ?, start_time = ?, end_time = ?,
        duration = ?, questions = ?, total_score = ?, grading_mode = ?, grading_config_id = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title || task.title,
    subject || task.subject,
    grade || task.grade,
    target_classes ? JSON.stringify(target_classes) : task.target_classes,
    start_time || task.start_time,
    end_time || task.end_time,
    duration !== undefined ? duration : task.duration,
    questions ? JSON.stringify(questions) : task.questions,
    calculatedTotalScore || task.total_score,
    grading_mode || task.grading_mode,
    grading_config_id !== undefined ? grading_config_id : task.grading_config_id,
    id
  );

  logOperation(req.user, 'update', 'exam_task', id, `修改考试任务: ${title || task.title}`, req.ip);

  return success(res, null, '考试任务更新成功');
}

/**
 * 发布考试任务
 */
function publishExamTask(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ?').get(id);
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  // 检查权限
  if (req.user.userType === 'teacher' && (task.creator_id !== req.user.id || task.creator_type !== 'teacher')) {
    return error(res, ErrorCodes.PERMISSION_DENIED, '无权限发布该任务');
  }

  // 只有草稿状态可以发布
  if (task.status !== 'draft') {
    return error(res, ErrorCodes.VALIDATION_ERROR, '只能发布草稿状态的任务');
  }

  // 更新状态为已发布
  db.prepare('UPDATE exam_tasks SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('published', id);

  // 更新题目使用次数
  const questions = JSON.parse(task.questions || '[]');
  questions.forEach(q => {
    db.prepare('UPDATE questions SET use_count = use_count + 1 WHERE id = ?').run(q.questionId);
  });

  logOperation(req.user, 'publish', 'exam_task', id, `发布考试任务: ${task.title}`, req.ip);

  return success(res, null, '考试任务已发布');
}

/**
 * 删除考试任务
 */
function deleteExamTask(req, res) {
  const { id } = req.params;
  const { force } = req.query; // 强制删除参数
  const db = getDatabase();

  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ?').get(id);
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  // 检查权限
  if (req.user.userType === 'teacher' && (task.creator_id !== req.user.id || task.creator_type !== 'teacher')) {
    return error(res, ErrorCodes.PERMISSION_DENIED, '无权限删除该任务');
  }

  // 只有草稿和已结束状态可以删除，除非强制删除
  if (!force && task.status !== 'draft' && task.status !== 'ended') {
    return error(res, ErrorCodes.VALIDATION_ERROR, '只能删除草稿或已结束状态的任务');
  }

  // 使用事务删除相关数据
  const deleteTransaction = db.transaction(() => {
    // 先删除题目答题详情
    const answerIds = db.prepare('SELECT id FROM exam_answers WHERE task_id = ?').all(id).map(a => a.id);
    if (answerIds.length > 0) {
      const placeholders = answerIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM question_answers WHERE exam_answer_id IN (${placeholders})`).run(...answerIds);
    }

    // 删除答题记录
    db.prepare('DELETE FROM exam_answers WHERE task_id = ?').run(id);

    // 删除考试任务
    db.prepare('DELETE FROM exam_tasks WHERE id = ?').run(id);
  });

  deleteTransaction();

  logOperation(req.user, 'delete', 'exam_task', id, `删除考试任务: ${task.title}${force ? ' (强制)' : ''}`, req.ip);

  return success(res, null, '考试任务已删除');
}

/**
 * 撤回考试任务到草稿状态
 */
function withdrawExamTask(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ?').get(id);
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  // 检查权限
  if (req.user.userType === 'teacher' && (task.creator_id !== req.user.id || task.creator_type !== 'teacher')) {
    return error(res, ErrorCodes.PERMISSION_DENIED, '无权限撤回该任务');
  }

  // 只有已发布状态可以撤回
  if (task.status !== 'published') {
    return error(res, ErrorCodes.VALIDATION_ERROR, '只能撤回已发布状态的任务');
  }

  // 检查是否有学生已经开始考试
  try {
    const submissions = db.prepare('SELECT COUNT(*) as count FROM exam_submissions WHERE exam_id = ?').get(id);
    if (submissions && submissions.count > 0) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '已有学生参加考试，无法撤回');
    }
  } catch (e) {
    // 表不存在，跳过检查
  }

  // 更新状态为草稿
  db.prepare('UPDATE exam_tasks SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('draft', id);

  logOperation(req.user, 'withdraw', 'exam_task', id, `撤回考试任务: ${task.title}`, req.ip);

  return success(res, null, '考试任务已撤回');
}

/**
 * 自动出题
 */
function autoGenerateQuestions(req, res) {
  const { subject, grade, chapters, question_config, difficulty_ratio } = req.body;

  if (!subject || !question_config || question_config.length === 0) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请填写必填信息');
  }

  // 验证每个题型的数量范围 (1-100)
  for (const config of question_config) {
    const { type, count, score } = config;
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      const typeName = { choice: '单选题', multiple: '多选题', fill: '填空题', judgment: '判断题', subjective: '主观题' }[type] || type;
      return error(res, ErrorCodes.VALIDATION_ERROR, `${typeName}数量必须在1-100之间`);
    }
  }

  const db = getDatabase();

  const selectedQuestions = [];
  const difficultyOrder = ['easy', 'medium', 'hard'];

  // 按题型抽题
  for (const config of question_config) {
    const { type, count, score } = config;

    // 构建查询条件
    let whereClauses = ['subject = ?', 'question_type = ?', 'status = ?'];
    let params = [subject, type, 'active'];

    if (grade) {
      whereClauses.push('grade = ?');
      params.push(grade);
    }

    if (chapters && chapters.length > 0) {
      whereClauses.push(`chapter IN (${chapters.map(() => '?').join(',')})`);
      params.push(...chapters);
    }

    const whereSQL = whereClauses.join(' AND ');

    // 获取可用题目
    const availableQuestions = db.prepare(`
      SELECT id, question_type, content, options, answer, difficulty, score
      FROM questions
      WHERE ${whereSQL}
      ORDER BY use_count ASC, RANDOM()
    `).all(...params);

    if (availableQuestions.length < count) {
      const typeName = { choice: '单选题', multiple: '多选题', fill: '填空题', judgment: '判断题', subjective: '主观题' }[type] || type;
      return error(res, ErrorCodes.QUESTION_BANK_EMPTY, `${typeName}数量不足，需要${count}题，仅有${availableQuestions.length}题`);
    }

    // 按难度分配
    const questionsByDifficulty = {
      easy: availableQuestions.filter(q => q.difficulty === 'easy'),
      medium: availableQuestions.filter(q => q.difficulty === 'medium'),
      hard: availableQuestions.filter(q => q.difficulty === 'hard')
    };

    // 计算各难度需要的题目数量
    const ratio = difficulty_ratio || { easy: 0.3, medium: 0.5, hard: 0.2 };
    const easyCount = Math.round(count * (ratio.easy || 0.3));
    const mediumCount = Math.round(count * (ratio.medium || 0.5));
    const hardCount = count - easyCount - mediumCount;

    // 选择题目
    const selected = [
      ...questionsByDifficulty.easy.slice(0, easyCount),
      ...questionsByDifficulty.medium.slice(0, mediumCount),
      ...questionsByDifficulty.hard.slice(0, hardCount)
    ];

    // 如果数量不够，从其他难度补充
    if (selected.length < count) {
      const remaining = count - selected.length;
      const remainingQuestions = availableQuestions.filter(q => !selected.includes(q));
      selected.push(...remainingQuestions.slice(0, remaining));
    }

    selectedQuestions.push(...selected.map(q => ({
      questionId: q.id,
      questionType: q.question_type,
      content: q.content,
      options: q.options ? JSON.parse(q.options) : null,
      difficulty: q.difficulty,
      score: score || q.score || 2
    })));
  }

  // 计算总分
  const totalScore = selectedQuestions.reduce((sum, q) => sum + q.score, 0);

  return success(res, {
    questions: selectedQuestions,
    totalScore
  });
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
 * 获取教师可选择的班级列表
 */
function getAvailableClasses(req, res) {
  const { grade } = req.query;
  const { userType, id } = req.user;

  const db = getDatabase();

  // 获取教师管理的班级
  let managedClasses = [];
  if (userType === 'teacher') {
    // 从数据库查询教师的管理班级
    const teacher = db.prepare('SELECT manage_classes FROM teachers WHERE id = ?').get(id);
    if (teacher && teacher.manage_classes) {
      managedClasses = JSON.parse(teacher.manage_classes);
    }
  } else if (userType === 'admin') {
    // 管理员可以选择所有班级
    const classSet = new Set();

    // 优先从 classes 表获取
    try {
      const classes = db.prepare('SELECT grade, class_name FROM classes WHERE status = ?').all('active');
      classes.forEach(c => {
        if (c.grade && c.class_name) {
          const fullClassName = c.class_name.includes('年级') ? c.class_name : `${c.grade}${c.class_name}`;
          classSet.add(fullClassName);
        }
      });
    } catch (e) {
      console.error('从 classes 表获取班级失败:', e);
    }

    // 从学生表中补充
    const students = db.prepare('SELECT DISTINCT grade, class_name FROM students WHERE status = ?').all('active');
    students.forEach(s => {
      if (s.class_name && s.class_name.includes('年级')) {
        classSet.add(s.class_name);
      } else if (s.grade && s.class_name) {
        classSet.add(`${s.grade}${s.class_name}`);
      }
    });

    managedClasses = Array.from(classSet);
  }

  // 如果指定了年级，过滤出该年级的班级
  if (grade) {
    managedClasses = managedClasses.filter(c => c.startsWith(grade));
  }

  // 按班级名排序
  managedClasses.sort((a, b) => a.localeCompare(b, 'zh-CN'));

  return success(res, managedClasses);
}

/**
 * 获取所有班级列表（供管理员使用）
 */
function getAllClasses(req, res) {
  const db = getDatabase();

  const classSet = new Set();

  // 优先从 classes 表获取班级数据
  try {
    const classes = db.prepare('SELECT grade, class_name FROM classes WHERE status = ?').all('active');
    classes.forEach(c => {
      if (c.grade && c.class_name) {
        // 拼接完整班级名称
        const fullClassName = c.class_name.includes('年级') ? c.class_name : `${c.grade}${c.class_name}`;
        classSet.add(fullClassName);
      }
    });
  } catch (e) {
    console.error('从 classes 表获取班级失败:', e);
  }

  // 从学生表中获取班级作为补充
  const students = db.prepare('SELECT DISTINCT grade, class_name FROM students WHERE status = ?').all('active');
  students.forEach(s => {
    if (s.class_name && s.class_name.includes('年级')) {
      classSet.add(s.class_name);
    } else if (s.grade && s.class_name) {
      classSet.add(`${s.grade}${s.class_name}`);
    }
  });

  // 从教师管理班级中提取作为补充
  const teachers = db.prepare('SELECT manage_classes FROM teachers WHERE status = ? AND manage_classes IS NOT NULL').all('active');
  teachers.forEach(t => {
    if (t.manage_classes) {
      try {
        const classes = JSON.parse(t.manage_classes);
        classes.forEach(c => classSet.add(c));
      } catch (e) {}
    }
  });

  // 按年级分组
  const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
  const result = {};

  grades.forEach(g => {
    const classesInGrade = Array.from(classSet).filter(c => c.startsWith(g)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    if (classesInGrade.length > 0) {
      result[g] = classesInGrade;
    }
  });

  // 其他班级
  const otherClasses = Array.from(classSet).filter(c => !grades.some(g => c.startsWith(g))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  if (otherClasses.length > 0) {
    result['其他'] = otherClasses;
  }

  return success(res, result);
}


/**
 * 获取排行榜考试列表
 */
function getRankingExams(req, res) {
  const { userType, id } = req.user;
  const db = getDatabase();

  // 获取教师管理的班级
  let managedClasses = [];
  if (userType === 'teacher') {
    const teacher = db.prepare('SELECT manage_classes FROM teachers WHERE id = ?').get(id);
    if (teacher && teacher.manage_classes) {
      managedClasses = JSON.parse(teacher.manage_classes);
    }
  }

  // 获取已发布的考试任务
  let tasks;
  if (userType === 'teacher') {
    // 教师可以看到自己创建的考试 + 包含自己管理班级的考试
    tasks = db.prepare(`
      SELECT DISTINCT et.id, et.title, et.subject, et.grade, et.target_classes, et.total_score, et.end_time, et.status
      FROM exam_tasks et
      WHERE et.status = 'published' AND (
        et.creator_id = ?
        OR et.target_classes IS NOT NULL
      )
      ORDER BY et.end_time DESC
    `).all(id);

    // 过滤：只保留教师创建的或目标班级包含教师管理班级的考试
    tasks = tasks.filter(task => {
      if (task.creator_id === id) return true;
      if (!task.target_classes) return false;
      const targetClasses = JSON.parse(task.target_classes);
      return targetClasses.some(tc => managedClasses.includes(tc));
    });
  } else {
    tasks = db.prepare(`
      SELECT id, title, subject, grade, target_classes, total_score, end_time, status
      FROM exam_tasks
      WHERE status = 'published'
      ORDER BY end_time DESC
    `).all();
  }

  // 统计每个考试的参与情况
  const result = tasks.map(task => {
    const targetClasses = task.target_classes ? JSON.parse(task.target_classes) : null;

    // 计算该考试覆盖的学生总数
    let totalStudents = 0;
    if (targetClasses && targetClasses.length > 0) {
      // 根据目标班级统计学生数 - 使用参数化查询防止SQL注入
      const classConditions = [];
      const params = [];
      targetClasses.forEach(c => {
        classConditions.push('(class_name = ? OR grade || class_name = ?)');
        params.push(c, c);
      });
      totalStudents = db.prepare(`
        SELECT COUNT(*) as count FROM students WHERE status = 'active' AND (${classConditions.join(' OR ')})
      `).get(...params).count;
    } else if (task.grade) {
      totalStudents = db.prepare(`
        SELECT COUNT(*) as count FROM students WHERE status = 'active' AND grade = ?
      `).get(task.grade).count;
    } else {
      totalStudents = db.prepare(`SELECT COUNT(*) as count FROM students WHERE status = 'active'`).get().count;
    }

    // 统计已提交人数
    const submittedCount = db.prepare(`
      SELECT COUNT(*) as count FROM exam_answers WHERE task_id = ? AND status IN ('submitted', 'graded')
    `).get(task.id).count;

    // 统计已批改人数
    const gradedCount = db.prepare(`
      SELECT COUNT(*) as count FROM exam_answers WHERE task_id = ? AND status = 'graded'
    `).get(task.id).count;

    return {
      id: task.id,
      title: task.title,
      subject: task.subject,
      grade: task.grade,
      targetClasses: targetClasses,
      totalScore: task.total_score,
      endTime: task.end_time,
      totalStudents,
      submittedCount,
      gradedCount
    };
  });

  return success(res, result);
}

/**
 * 获取班级排名（学生分数排名）
 */
function getClassRanking(req, res) {
  const { taskId } = req.params;
  const { className } = req.query;
  const { userType, id } = req.user;
  const db = getDatabase();

  // 获取考试任务
  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ?').get(taskId);
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  // 获取教师管理的班级
  let managedClasses = [];
  if (userType === 'teacher') {
    const teacher = db.prepare('SELECT manage_classes FROM teachers WHERE id = ?').get(id);
    if (teacher && teacher.manage_classes) {
      managedClasses = JSON.parse(teacher.manage_classes);
    }
  }

  // 确定要查询的班级
  let targetClass = className;

  if (userType === 'teacher') {
    if (!targetClass) {
      targetClass = managedClasses[0];
    }
    if (!managedClasses.includes(targetClass)) {
      return error(res, ErrorCodes.PERMISSION_DENIED, '无权限查看该班级');
    }
  }

  // 获取该班级已批改的学生答题记录
  let students;
  if (targetClass) {
    students = db.prepare(`
      SELECT s.id, s.name, s.class_name, s.grade, ea.total_score, ea.time_used
      FROM exam_answers ea
      JOIN students s ON ea.student_id = s.id
      WHERE ea.task_id = ? AND ea.status = 'graded'
        AND (s.class_name = ? OR s.grade || s.class_name = ?)
      ORDER BY ea.total_score DESC, ea.time_used ASC
    `).all(taskId, targetClass, targetClass);
  } else {
    students = db.prepare(`
      SELECT s.id, s.name, s.class_name, s.grade, ea.total_score, ea.time_used
      FROM exam_answers ea
      JOIN students s ON ea.student_id = s.id
      WHERE ea.task_id = ? AND ea.status = 'graded'
      ORDER BY ea.total_score DESC, ea.time_used ASC
    `).all(taskId);
  }

  // 计算排名
  const ranking = [];
  let currentRank = 0;
  let prevScore = null;
  let prevTimeUsed = null;

  students.forEach((student, index) => {
    if (prevScore !== null && student.total_score === prevScore && student.time_used === prevTimeUsed) {
      // 相同分数和用时，排名相同
    } else {
      currentRank = index + 1;
    }

    ranking.push({
      rank: currentRank,
      studentId: student.id,
      studentName: student.name,
      className: student.class_name,
      grade: student.grade,
      score: student.total_score,
      timeUsed: student.time_used
    });

    prevScore = student.total_score;
    prevTimeUsed = student.time_used;
  });

  // 获取教师可切换的班级列表
  let availableClasses = [];
  if (userType === 'teacher' && managedClasses.length > 0) {
    const targetClasses = task.target_classes ? JSON.parse(task.target_classes) : null;
    if (targetClasses) {
      availableClasses = managedClasses.filter(c => targetClasses.includes(c));
    } else {
      availableClasses = managedClasses;
    }
  }

  return success(res, {
    task: {
      id: task.id,
      title: task.title,
      subject: task.subject,
      totalScore: task.total_score
    },
    currentClass: targetClass,
    availableClasses,
    ranking
  });
}

/**
 * 获取年级排名（班级平均分排名）
 */
function getGradeRanking(req, res) {
  const { taskId } = req.params;
  const { userType, id } = req.user;
  const db = getDatabase();

  // 获取考试任务
  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ?').get(taskId);
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  // 获取教师管理的班级
  let managedClasses = [];
  if (userType === 'teacher') {
    const teacher = db.prepare('SELECT manage_classes FROM teachers WHERE id = ?').get(id);
    if (teacher && teacher.manage_classes) {
      managedClasses = JSON.parse(teacher.manage_classes);
    }
  }

  // 获取所有已批改的答题记录
  const answers = db.prepare(`
    SELECT s.id, s.name, s.class_name, s.grade, ea.total_score, ea.time_used
    FROM exam_answers ea
    JOIN students s ON ea.student_id = s.id
    WHERE ea.task_id = ? AND ea.status = 'graded'
  `).all(taskId);

  // 按班级分组计算平均分
  const classStats = {};
  answers.forEach(answer => {
    const fullClassName = `${answer.grade}${answer.class_name}`;
    if (!classStats[fullClassName]) {
      classStats[fullClassName] = {
        className: fullClassName,
        grade: answer.grade,
        totalScore: 0,
        count: 0
      };
    }
    classStats[fullClassName].totalScore += answer.total_score || 0;
    classStats[fullClassName].count++;
  });

  // 计算平均分并排序
  let classRanking = Object.values(classStats).map(stat => ({
    className: stat.className,
    grade: stat.grade,
    avgScore: stat.count > 0 ? Math.round(stat.totalScore / stat.count * 100) / 100 : 0,
    studentCount: stat.count
  })).sort((a, b) => b.avgScore - a.avgScore);

  // 教师只能看到管理班级的排名
  if (userType === 'teacher' && managedClasses.length > 0) {
    classRanking = classRanking.filter(c => managedClasses.includes(c.className));
  }

  // 添加排名
  let currentRank = 0;
  let prevAvgScore = null;

  classRanking.forEach((item, index) => {
    if (prevAvgScore !== null && item.avgScore === prevAvgScore) {
      // 相同分数相同排名
    } else {
      currentRank = index + 1;
    }
    item.rank = currentRank;
    prevAvgScore = item.avgScore;
  });

  return success(res, {
    task: {
      id: task.id,
      title: task.title,
      subject: task.subject,
      totalScore: task.total_score
    },
    ranking: classRanking
  });
}

module.exports = {
  getExamTasks,
  getExamTaskById,
  createExamTask,
  updateExamTask,
  publishExamTask,
  deleteExamTask,
  withdrawExamTask,
  autoGenerateQuestions,
  getAvailableClasses,
  getAllClasses,
  getRankingExams,
  getClassRanking,
  getGradeRanking
};
