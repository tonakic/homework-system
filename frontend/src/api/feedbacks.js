import api from './index';

// 提交反馈
export function submitFeedback(title, content) {
  return api.post('/feedbacks', { title, content });
}

// 获取我的反馈列表
export function getMyFeedbacks() {
  return api.get('/feedbacks/my');
}

// 获取所有反馈列表（管理员）
export function getAllFeedbacks(params) {
  return api.get('/feedbacks', { params });
}

// 更新反馈状态（管理员）
export function updateFeedback(id, data) {
  return api.put(`/feedbacks/${id}`, data);
}

// 删除反馈（管理员）
export function deleteFeedback(id) {
  return api.delete(`/feedbacks/${id}`);
}
