<template>
  <div class="teacher-home page">
    <van-nav-bar title="教师端首页" />

    <div class="page-content">
      <div class="welcome-card card">
        <h2>欢迎，{{ userStore.userName }}</h2>
        <p>今天也要加油工作哦！</p>
      </div>

      <div class="menu-grid">
        <div class="menu-item" @click="$router.push('/teacher/students')">
          <van-icon name="user-o" size="24" />
          <span>学生管理</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/questions')">
          <van-icon name="orders-o" size="24" />
          <span>题库管理</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/exams')">
          <van-icon name="edit" size="24" />
          <span>考试管理</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/grading')">
          <van-icon name="checked" size="24" />
          <span>批改任务</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/ranking/detail')">
          <van-icon name="medal-o" size="24" />
          <span>排行榜</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/statistics')">
          <van-icon name="chart-trending-o" size="24" />
          <span>数据统计</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/profile')">
          <van-icon name="setting-o" size="24" />
          <span>个人设置</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
</script>

<style scoped>
.welcome-card {
  background: linear-gradient(135deg, #2196f3, #64b5f6);
  color: white;
  margin-bottom: 16px;
}

.welcome-card h2 {
  font-size: 20px;
  margin-bottom: 8px;
}

.welcome-card p {
  font-size: 14px;
  opacity: 0.9;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.menu-item {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.menu-item:active {
  transform: scale(0.95);
}

.menu-item span {
  font-size: 14px;
  color: #333;
}

.menu-item .van-icon {
  color: #2196f3;
}
</style>