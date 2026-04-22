const { getDatabase } = require('../config/database');
const { success, error, ErrorCodes } = require('../utils/response');

/**
 * 获取教师管理的班级列表（按年级筛选）
 * 参数: grade (年级)
 */
function getTeacherClasses(req, res) {
  const { grade } = req.query;
  const { userType, id } = req.user;

  const db = getDatabase();

  let managedClasses = [];

  if (userType === 'teacher') {
    // 从数据库查询教师的管理班级
    const teacher = db.prepare('SELECT manage_classes FROM teachers WHERE id = ?').get(id);
    if (teacher && teacher.manage_classes) {
      managedClasses = JSON.parse(teacher.manage_classes);
    }
  } else if (userType === 'admin') {
    // 管理员可以看到所有班级
    const classSet = new Set();

    // 从 classes 表获取
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
 * 获取班级统计数据
 * 参数: grade, className
 */
function getClassStatistics(req, res) {
  const { grade, className } = req.query;
  const { userType, id } = req.user;

  if (!grade || !className) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请指定年级和班级');
  }

  const db = getDatabase();

  // 权限检查：教师只能查看所管班级的统计
  if (userType === 'teacher') {
    const teacher = db.prepare('SELECT manage_classes FROM teachers WHERE id = ?').get(id);
    if (teacher && teacher.manage_classes) {
      const managedClasses = JSON.parse(teacher.manage_classes);
      const fullClassName = className.includes('年级') ? className : `${grade}${className}`;
      // 支持完整班级名称和简短班级名称的匹配
      if (!managedClasses.includes(fullClassName) && !managedClasses.includes(className)) {
        return error(res, ErrorCodes.PERMISSION_DENIED, '无权限查看该班级统计');
      }
    }
  }

  // 构建班级匹配条件
  const fullClassName = className.includes('年级') ? className : `${grade}${className}`;

  // 获取该班级的学生列表
  const students = db.prepare(`
    SELECT id, name FROM students
    WHERE status = 'active'
    AND (grade = ? AND (class_name = ? OR class_name = ? OR grade || class_name = ?))
  `).all(grade, className, fullClassName, fullClassName);

  const studentIds = students.map(s => s.id);
  const studentCount = students.length;

  // 如果班级没有学生，返回空统计
  if (studentCount === 0) {
    return success(res, {
      summary: {
        examCount: 0,
        submitCount: 0,
        studentCount: 0,
        avgScore: 0,
        maxScore: 0,
        minScore: 0,
        excellentCount: 0,
        goodCount: 0,
        mediumCount: 0,
        passCount: 0,
        failCount: 0,
        totalScores: 0
      },
      exams: []
    });
  }

  // 获取该班级参与的考试任务（通过学生的答题记录）
  const studentIdPlaceholders = studentIds.map(() => '?').join(',');

  // 获取班级参与的考试ID列表
  const examAnswers = db.prepare(`
    SELECT DISTINCT task_id FROM exam_answers
    WHERE student_id IN (${studentIdPlaceholders})
    AND status IN ('submitted', 'graded')
  `).all(...studentIds);

  const examTaskIds = examAnswers.map(e => e.task_id);

  // 获取考试任务详情
  let exams = [];
  if (examTaskIds.length > 0) {
    const taskPlaceholders = examTaskIds.map(() => '?').join(',');
    exams = db.prepare(`
      SELECT id, title, subject, total_score FROM exam_tasks
      WHERE id IN (${taskPlaceholders}) AND status = 'published'
    `).all(...examTaskIds);
  }

  // 计算每个考试的统计数据
  const examStats = exams.map(exam => {
    // 获取该考试该班级的答题记录
    const answers = db.prepare(`
      SELECT ea.total_score, ea.status
      FROM exam_answers ea
      WHERE ea.task_id = ?
      AND ea.student_id IN (${studentIdPlaceholders})
      AND ea.status IN ('submitted', 'graded')
    `).all(exam.id, ...studentIds);

    const scores = answers
      .filter(a => a.total_score !== null && a.total_score !== undefined)
      .map(a => a.total_score);

    const submitCount = answers.length;

    let avgScore = 0;
    let maxScore = 0;
    let minScore = 0;

    if (scores.length > 0) {
      avgScore = Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100;
      maxScore = Math.max(...scores);
      minScore = Math.min(...scores);
    }

    return {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      avgScore,
      submitCount,
      totalScore: exam.total_score,
      maxScore,
      minScore
    };
  });

  // 计算汇总统计
  // 获取该班级所有答题记录
  const allAnswers = db.prepare(`
    SELECT ea.total_score, ea.task_id
    FROM exam_answers ea
    WHERE ea.student_id IN (${studentIdPlaceholders})
    AND ea.status = 'graded'
  `).all(...studentIds);

  const allScores = allAnswers
    .filter(a => a.total_score !== null && a.total_score !== undefined)
    .map(a => a.total_score);

  // 计算总分（需要获取每个考试的总分来计算百分比）
  let totalPossibleScore = 0;
  const examTotalScores = {};
  exams.forEach(e => {
    examTotalScores[e.id] = e.total_score || 100;
  });

  // 统计成绩等级
  let excellentCount = 0; // 90-100%
  let goodCount = 0;      // 80-89%
  let mediumCount = 0;    // 70-79%
  let passCount = 0;      // 60-69%
  let failCount = 0;      // <60%

  // 计算每个学生的平均成绩百分比
  const studentAvgScores = {};
  const studentExamCounts = {};

  allAnswers.forEach(a => {
    if (a.total_score !== null && a.total_score !== undefined) {
      const taskId = a.task_id;
      const maxPossible = examTotalScores[taskId] || 100;
      const percentage = (a.total_score / maxPossible) * 100;

      // 统计每次考试的成绩等级
      if (percentage >= 90) {
        excellentCount++;
      } else if (percentage >= 80) {
        goodCount++;
      } else if (percentage >= 70) {
        mediumCount++;
      } else if (percentage >= 60) {
        passCount++;
      } else {
        failCount++;
      }
    }
  });

  // 计算总体平均分、最高分、最低分
  let overallAvgScore = 0;
  let overallMaxScore = 0;
  let overallMinScore = 0;

  if (allScores.length > 0) {
    overallAvgScore = Math.round((allScores.reduce((sum, s) => sum + s, 0) / allScores.length) * 100) / 100;
    overallMaxScore = Math.max(...allScores);
    overallMinScore = Math.min(...allScores);
  }

  const summary = {
    examCount: exams.length,
    submitCount: allAnswers.length,
    studentCount,
    avgScore: overallAvgScore,
    maxScore: overallMaxScore,
    minScore: overallMinScore,
    excellentCount,
    goodCount,
    mediumCount,
    passCount,
    failCount,
    totalScores: allScores.length
  };

  return success(res, {
    summary,
    exams: examStats
  });
}

/**
 * 获取考试学生成绩排名
 * 参数: id (考试任务ID), grade, className
 */
function getExamStudentRanking(req, res) {
  const { id } = req.params;
  const { grade, className } = req.query;
  const { userType, id: userId } = req.user;

  if (!grade || !className) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请指定年级和班级');
  }

  const db = getDatabase();

  // 获取考试任务
  const task = db.prepare('SELECT * FROM exam_tasks WHERE id = ?').get(id);
  if (!task) {
    return error(res, ErrorCodes.EXAM_NOT_FOUND, '考试任务不存在');
  }

  // 权限检查：教师只能查看所管班级的排名
  if (userType === 'teacher') {
    const teacher = db.prepare('SELECT manage_classes FROM teachers WHERE id = ?').get(userId);
    if (teacher && teacher.manage_classes) {
      const managedClasses = JSON.parse(teacher.manage_classes);
      const fullClassName = className.includes('年级') ? className : `${grade}${className}`;
      if (!managedClasses.includes(fullClassName) && !managedClasses.includes(className)) {
        return error(res, ErrorCodes.PERMISSION_DENIED, '无权限查看该班级');
      }
    }
  }

  // 构建班级匹配条件
  const fullClassName = className.includes('年级') ? className : `${grade}${className}`;

  // 获取该班级该考试的学生成绩排名
  const students = db.prepare(`
    SELECT s.id, s.name, ea.total_score as score, ea.time_used
    FROM exam_answers ea
    JOIN students s ON ea.student_id = s.id
    WHERE ea.task_id = ?
    AND ea.status = 'graded'
    AND s.status = 'active'
    AND (s.grade = ? AND (s.class_name = ? OR s.class_name = ? OR s.grade || s.class_name = ?))
    ORDER BY ea.total_score DESC, ea.time_used ASC
  `).all(id, grade, className, fullClassName, fullClassName);

  // 格式化返回结果
  const result = students.map((student, index) => ({
    id: student.id,
    name: student.name,
    score: student.score
  }));

  return success(res, result);
}

module.exports = {
  getTeacherClasses,
  getClassStatistics,
  getExamStudentRanking
};
