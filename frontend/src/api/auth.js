import api from './index';

/**
 * 用户登录
 * @param {string} userType - 用户类型: student/teacher/admin
 * @param {string} account - 账号
 * @param {string} password - 密码
 * @param {boolean} remember - 是否记住登录
 */
export function login(userType, account, password, remember = false) {
  return api.post('/auth/login', {
    userType,
    account,
    password,
    remember
  });
}

/**
 * 修改密码
 * @param {string} oldPassword - 原密码
 * @param {string} newPassword - 新密码
 */
export function changePassword(oldPassword, newPassword) {
  return api.post('/auth/change-password', {
    oldPassword,
    newPassword
  });
}

/**
 * 获取当前用户信息
 */
export function getProfile() {
  return api.get('/auth/profile');
}

/**
 * 登出
 */
export function logout() {
  return api.post('/auth/logout');
}

// ==================== 学生考试相关 ====================

/**
 * 获取学生首页统计数据
 */
export function getHomeStats() {
  return api.get('/student/exams/home');
}

/**
 * 获取学生错题列表
 */
export function getMistakes() {
  return api.get('/student/exams/mistakes');
}

/**
 * 获取单个错题详情（用于重新练习）
 * @param {number} id - 题目ID
 */
export function getMistakeDetail(id) {
  return api.get(`/student/exams/mistakes/${id}`);
}

/**
 * 获取学生待答题列表
 */
export function getStudentExams() {
  return api.get('/student/exams');
}

/**
 * 获取学生答题记录列表
 */
export function getStudentRecords() {
  return api.get('/student/exams/records');
}

/**
 * 获取答题记录详情
 * @param {number} id - 答题记录ID
 */
export function getRecordDetail(id) {
  return api.get(`/student/exams/records/${id}`);
}

/**
 * 获取考试任务详情
 * @param {number} id - 考试任务ID
 */
export function getExamDetail(id) {
  return api.get(`/student/exams/${id}`);
}

/**
 * 开始答题
 * @param {number} id - 考试任务ID
 */
export function startExam(id) {
  return api.post(`/student/exams/${id}/start`);
}

/**
 * 保存答案
 * @param {number} id - 考试任务ID
 * @param {object} answers - 答案对象
 */
export function saveAnswer(id, answers) {
  return api.put(`/student/exams/${id}/save`, { answers });
}

/**
 * 提交试卷
 * @param {number} id - 考试任务ID
 * @param {object} answers - 答案对象
 * @param {number} timeUsed - 答题用时（秒）
 */
export function submitExam(id, answers, timeUsed) {
  return api.post(`/student/exams/${id}/submit`, {
    answers,
    time_used: timeUsed
  });
}
