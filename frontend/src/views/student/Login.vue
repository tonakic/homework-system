<template>
  <div class="login-page">
    <div class="login-header">
      <div class="logo">
        <!-- 学生：戴着学士帽的人物侧写 -->
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- 背景圆 -->
          <circle cx="40" cy="40" r="38" fill="#ff9800"/>
          <!-- 学士帽 -->
          <path d="M20 32 L40 24 L60 32 L40 40 Z" fill="white"/>
          <rect x="38" y="24" width="4" height="12" fill="white"/>
          <path d="M40 36 L54 32 L54 34 L40 38 L26 34 L26 32 Z" fill="#fff3e0"/>
          <!-- 人物头部侧写 -->
          <ellipse cx="38" cy="48" rx="8" ry="9" fill="white"/>
          <!-- 人物身体侧写 -->
          <path d="M26 58 Q26 52 38 52 Q50 52 50 58 L50 68 L26 68 Z" fill="white"/>
          <!-- 流苏 -->
          <path d="M54 32 L56 40 L54 42" stroke="#ffcc00" stroke-width="2" fill="none"/>
          <circle cx="56" cy="43" r="2" fill="#ffcc00"/>
        </svg>
      </div>
      <h1>创新小学作业系统</h1>
      <p>学生登录</p>
    </div>

    <van-form @submit="handleLogin" class="login-form">
      <van-cell-group inset>
        <van-field
          v-model="account"
          name="account"
          label="学号"
          placeholder="请输入学号"
          :rules="[{ required: true, message: '请输入学号' }]"
        />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请输入密码' }]"
        />
        <van-field name="remember" label="记住登录">
          <template #input>
            <van-switch v-model="remember" size="20" />
          </template>
        </van-field>
      </van-cell-group>

      <div class="login-actions">
        <van-button
          round
          block
          type="primary"
          native-type="submit"
          :loading="loading"
          loading-text="登录中..."
        >
          登录
        </van-button>
      </div>
    </van-form>

    <div class="login-footer">
      <a @click="goToTeacher">教师登录</a>
      <span>|</span>
      <a @click="goToAdmin">管理员登录</a>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast, showFailToast } from 'vant';
import { login } from '@/api/auth';
import { useUserStore } from '@/store/user';

const router = useRouter();
const userStore = useUserStore();

const account = ref('');
const password = ref('');
const remember = ref(false);
const loading = ref(false);

async function handleLogin() {
  if (!account.value || !password.value) {
    showFailToast('请填写完整信息');
    return;
  }

  loading.value = true;

  try {
    const res = await login('student', account.value, password.value, remember.value);

    if (res.code === 0) {
      userStore.setUserData(res.data);
      showSuccessToast('登录成功');

      // 检查是否首次登录
      if (res.data.userInfo.firstLogin) {
        router.push('/student/profile?action=changePassword');
      } else {
        router.push('/student/home');
      }
    } else {
      showFailToast(res.message || '登录失败');
    }
  } catch (err) {
    showFailToast(err.message || '登录失败');
  } finally {
    loading.value = false;
  }
}

function goToTeacher() {
  router.push('/teacher/login');
}

function goToAdmin() {
  router.push('/admin/login');
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh; /* 动态视口高度，适配移动端地址栏 */
  background: linear-gradient(135deg, #ff9800 0%, #ffb74d 100%);
  display: flex;
  flex-direction: column;
  padding: 60px 20px 20px;
  padding-top: max(60px, env(safe-area-inset-top, 60px));
  padding-bottom: max(20px, env(safe-area-inset-bottom, 20px));
  box-sizing: border-box;
}

.login-header {
  text-align: center;
  color: white;
  margin-bottom: 40px;
  flex-shrink: 0;
}

.logo {
  width: 100px;
  height: 100px;
  margin: 0 auto 20px;
}

.logo svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}

.login-header h1 {
  font-size: 26px;
  margin-bottom: 8px;
  font-weight: 600;
}

.login-header p {
  font-size: 16px;
  opacity: 0.9;
}

.login-form {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.login-actions {
  margin-top: 24px;
  padding: 0 8px;
}

.login-footer {
  margin-top: auto;
  padding-top: 40px;
  text-align: center;
  color: white;
  flex-shrink: 0;
}

.login-footer a {
  color: white;
  cursor: pointer;
  text-decoration: underline;
}

.login-footer span {
  margin: 0 16px;
}

.login-page :deep(.van-cell-group) {
  margin: 0;
}

.login-page :deep(.van-cell) {
  padding: 12px 16px;
}

.login-page :deep(.van-field__label) {
  width: 60px;
}

/* 平板响应式 */
@media (min-width: 768px) {
  .login-page {
    justify-content: center;
    align-items: center;
    padding: 40px;
  }

  .login-header {
    margin-bottom: 30px;
  }

  .login-form {
    padding: 32px;
  }

  .login-footer {
    padding-top: 24px;
  }
}

/* 小屏手机响应式 */
@media (max-width: 375px) {
  .login-page {
    padding: 40px 16px 16px;
  }

  .logo {
    width: 70px;
    height: 70px;
    margin-bottom: 16px;
  }

  .login-header h1 {
    font-size: 20px;
  }

  .login-header p {
    font-size: 14px;
  }

  .login-form {
    padding: 16px;
    border-radius: 16px;
  }

  .login-actions {
    margin-top: 16px;
    padding: 0 4px;
  }

  .login-footer {
    padding-top: 24px;
    font-size: 14px;
  }

  .login-footer span {
    margin: 0 10px;
  }
}

/* 超小屏手机 */
@media (max-width: 320px) {
  .login-page {
    padding: 30px 12px 12px;
  }

  .logo {
    width: 60px;
    height: 60px;
  }

  .login-header h1 {
    font-size: 18px;
  }

  .login-form {
    padding: 12px;
  }

  .login-page :deep(.van-cell) {
    padding: 10px 12px;
  }
}

/* 横屏手机 */
@media (max-height: 500px) and (orientation: landscape) {
  .login-page {
    padding: 20px;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 20px;
  }

  .login-header {
    margin-bottom: 0;
    flex: 0 0 200px;
  }

  .logo {
    width: 60px;
    height: 60px;
    margin-bottom: 10px;
  }

  .login-form {
    flex: 1 1 300px;
    max-width: 350px;
    padding: 16px;
  }

  .login-footer {
    flex: 0 0 100%;
    padding-top: 10px;
  }
}
</style>
