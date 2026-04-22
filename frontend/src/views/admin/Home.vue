<template>
  <div class="admin-home page">
    <van-nav-bar title="管理员控制台" />

    <div class="page-content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.students }}</div>
          <div class="stat-label">学生总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.teachers }}</div>
          <div class="stat-label">教师总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.questions }}</div>
          <div class="stat-label">题目总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.exams }}</div>
          <div class="stat-label">考试任务</div>
        </div>
      </div>

      <div class="menu-list">
        <van-cell-group inset>
          <van-cell title="教师管理" is-link to="/admin/teachers" icon="user-o" />
          <van-cell title="学生管理" is-link to="/admin/students" icon="friends-o" />
          <van-cell title="班级管理" is-link to="/admin/classes" icon="cluster-o" />
          <van-cell title="题库管理" is-link to="/admin/questions" icon="orders-o" />
          <van-cell title="考试管理" is-link to="/admin/exams" icon="notes-o" />
          <van-cell title="批改管理" is-link to="/admin/grading-config" icon="edit" />
          <van-cell title="系统设置" is-link to="/admin/settings" icon="setting-o" />
          <van-cell title="操作日志" is-link to="/admin/logs" icon="description" />
        </van-cell-group>
      </div>

      <div class="logout">
        <van-button type="danger" block round @click="handleLogout">
          退出登录
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import api from '@/api/index';

const router = useRouter();
const userStore = useUserStore();

const stats = ref({
  students: 0,
  teachers: 0,
  questions: 0,
  exams: 0
});

onMounted(async () => {
  try {
    const res = await api.get('/admin/stats');
    if (res.code === 0) {
      stats.value = res.data;
    }
  } catch (err) {
    console.error('获取统计数据失败:', err);
  }
});

async function handleLogout() {
  await userStore.clearUserData();
  router.push('/admin/login');
}
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #4caf50;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.menu-list {
  margin-bottom: 16px;
}

.menu-list :deep(.van-cell) {
  padding: 24px 16px;
  font-size: 16px;
}

.menu-list :deep(.van-cell__left-icon) {
  font-size: 22px;
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.menu-list :deep(.van-cell__title) {
  display: flex;
  align-items: center;
}

.logout {
  margin-top: 32px;
}
</style>