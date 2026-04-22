<template>
  <div class="not-found page">
    <div class="content">
      <h1>404</h1>
      <p>页面不存在</p>
      <van-button type="primary" @click="goHome">返回首页</van-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';

const router = useRouter();
const userStore = useUserStore();

function goHome() {
  // 根据用户登录状态和角色返回对应首页
  const validTypes = ['student', 'teacher', 'admin'];
  const userType = validTypes.includes(userStore.userType) ? userStore.userType : null;

  if (userStore.isLoggedIn && userType) {
    router.push(`/${userType}/home`);
  } else {
    router.push('/student/login');
  }
}
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.content {
  text-align: center;
}

h1 {
  font-size: 72px;
  color: #ff9800;
  margin-bottom: 16px;
}

p {
  font-size: 18px;
  color: #666;
  margin-bottom: 24px;
}
</style>
