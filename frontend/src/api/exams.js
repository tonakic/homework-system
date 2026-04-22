import api from './index';

// 获取教师可选择的班级列表
export function getAvailableClasses(grade) {
  return api.get('/exam-tasks/classes', { params: { grade } });
}

// 获取考试任务列表
export function getExamTasks(params) {
  return api.get('/exam-tasks', { params });
}

// 创建考试任务
export function createExamTask(data) {
  return api.post('/exam-tasks', data);
}

// 发布考试任务
export function publishExamTask(id) {
  return api.put(`/exam-tasks/${id}/publish`);
}

// 获取考试任务详情
export function getExamTaskById(id) {
  return api.get(`/exam-tasks/${id}`);
}

// 更新考试任务
export function updateExamTask(id, data) {
  return api.put(`/exam-tasks/${id}`, data);
}

// 删除考试任务
export function deleteExamTask(id, force = false) {
  return api.delete(`/exam-tasks/${id}`, { params: { force: force ? 1 : 0 } });
}

// 撤回考试任务到草稿状态
export function withdrawExamTask(id) {
  return api.put(`/exam-tasks/${id}/withdraw`);
}

// 自动生成题目
export function autoGenerateQuestions(data) {
  return api.post('/exam-tasks/auto-generate', data);
}

// 批量获取题目详情
export function getQuestionsByIds(ids) {
  return api.post('/questions/batch', { ids });
}

// 获取排行榜考试列表（教师端）
export function getRankingExams() {
  return api.get('/exam-tasks/ranking/list');
}

// 获取班级排名（教师端）
export function getClassRanking(taskId, className) {
  return api.get(`/exam-tasks/ranking/class/${taskId}`, { params: { className } });
}

// 获取年级排名（教师端）
export function getGradeRanking(taskId) {
  return api.get(`/exam-tasks/ranking/grade/${taskId}`);
}

// ========== 学生端排行榜 API ==========

// 获取学生参与过的考试列表（排行榜）
export function getStudentRankingExams() {
  return api.get('/student/exams/ranking/list');
}

// 获取班级排名（学生视角）
export function getStudentClassRanking(taskId) {
  return api.get(`/student/exams/ranking/class/${taskId}`);
}

// 获取年级排名（学生视角）
export function getStudentGradeRanking(taskId) {
  return api.get(`/student/exams/ranking/grade/${taskId}`);
}
