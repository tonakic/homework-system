<template>
  <!-- PC Version -->
  <div v-if="isPC" class="login-pc">
    <div class="login-card">
      <div class="login-title">
        <div class="logo">
          <!-- 管理员：人物半身加齿轮侧写 -->
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 背景圆 -->
            <circle cx="40" cy="40" r="38" fill="#4caf50"/>
            <!-- 人物头部侧写 -->
            <ellipse cx="32" cy="30" rx="8" ry="9" fill="white"/>
            <!-- 人物身体半身 -->
            <path d="M20 55 Q20 42 32 42 Q44 42 44 55 L44 68 L20 68 Z" fill="white"/>
            <!-- 齿轮 -->
            <g transform="translate(48, 32)">
              <circle cx="12" cy="12" r="10" fill="white" opacity="0.95"/>
              <circle cx="12" cy="12" r="4" fill="#4caf50"/>
              <!-- 齿轮齿 -->
              <rect x="10" y="-2" width="4" height="6" fill="white"/>
              <rect x="10" y="20" width="4" height="6" fill="white"/>
              <rect x="-2" y="10" width="6" height="4" fill="white"/>
              <rect x="20" y="10" width="6" height="4" fill="white"/>
              <rect x="2" y="2" width="4" height="4" fill="white" transform="rotate(45 4 4)"/>
              <rect x="18" y="18" width="4" height="4" fill="white" transform="rotate(45 20 20)"/>
              <rect x="18" y="2" width="4" height="4" fill="white" transform="rotate(-45 20 4)"/>
              <rect x="2" y="18" width="4" height="4" fill="white" transform="rotate(-45 4 20)"/>
            </g>
          </svg>
        </div>
        <h1>创新小学作业系统</h1>
        <p class="login-subtitle">管理员登录</p>
      </div>

      <el-form
        ref="formRef"
        :model="loginForm"
        :rules="rules"
        label-position="top"
        class="login-form-pc"
        @submit.prevent="handleLoginPC"
      >
        <el-form-item label="用户名" prop="account">
          <el-input
            v-model="loginForm.account"
            placeholder="请输入用户名"
            prefix-icon="User"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="loginForm.rememberMe">记住登录</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            :loading="loading"
            loading-text="登录中..."
            style="width: 100%"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <a @click="goToStudent">学生登录</a>
        <span>|</span>
        <a @click="goToTeacher">教师登录</a>
      </div>
    </div>
  </div>

  <!-- Mobile Version -->
  <div v-else class="login-page">
    <div class="login-header">
        <div class="logo">
          <!-- 管理员：人物半身加齿轮侧写 -->
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 背景圆 -->
            <circle cx="40" cy="40" r="38" fill="#4caf50"/>
            <!-- 人物头部侧写 -->
            <ellipse cx="32" cy="30" rx="8" ry="9" fill="white"/>
            <!-- 人物身体半身 -->
            <path d="M20 55 Q20 42 32 42 Q44 42 44 55 L44 68 L20 68 Z" fill="white"/>
            <!-- 齿轮 -->
            <g transform="translate(48, 32)">
              <circle cx="12" cy="12" r="10" fill="white" opacity="0.95"/>
              <circle cx="12" cy="12" r="4" fill="#4caf50"/>
              <!-- 齿轮齿 -->
              <rect x="10" y="-2" width="4" height="6" fill="white"/>
              <rect x="10" y="20" width="4" height="6" fill="white"/>
              <rect x="-2" y="10" width="6" height="4" fill="white"/>
              <rect x="20" y="10" width="6" height="4" fill="white"/>
              <rect x="2" y="2" width="4" height="4" fill="white" transform="rotate(45 4 4)"/>
              <rect x="18" y="18" width="4" height="4" fill="white" transform="rotate(45 20 20)"/>
              <rect x="18" y="2" width="4" height="4" fill="white" transform="rotate(-45 20 4)"/>
              <rect x="2" y="18" width="4" height="4" fill="white" transform="rotate(-45 4 20)"/>
            </g>
          </svg>
        </div>
        <h1>创新小学作业系统</h1>
        <p>管理员登录</p>
      </div>

      <van-form @submit="handleLogin" class="login-form">
        <van-cell-group inset>
          <van-field
            v-model="account"
            name="account"
            label="用户名"
            placeholder="请输入用户名"
            :rules="[{ required: true, message: '请输入用户名' }]"
          />
          <van-field
            v-model="password"
            type="password"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请输入密码' }]"
          />
        </van-cell-group>

        <div class="remember-me">
          <van-checkbox v-model="rememberMe">记住登录</van-checkbox>
        </div>

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
        <a @click="goToStudent">学生登录</a>
        <span>|</span>
        <a @click="goToTeacher">教师登录</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast, showFailToast } from 'vant';
import { ElMessage } from 'element-plus';
import { login } from '@/api/auth';
import { useUserStore } from '@/store/user';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();
const router = useRouter();
const userStore = useUserStore();

const account = ref('');
const password = ref('');
const loading = ref(false);
const rememberMe = ref(false);

// PC端表单
const formRef = ref(null);
const loginForm = reactive({
  account: '',
  password: '',
  rememberMe: false
});

const rules = {
  account: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

// 移动端登录
async function handleLogin() {
  if (!account.value || !password.value) {
    showFailToast('请填写完整信息');
    return;
  }

  loading.value = true;

  try {
    const res = await login('admin', account.value, password.value, rememberMe.value);

    if (res.code === 0) {
      userStore.setUserData(res.data);
      showSuccessToast('登录成功');

      // 检查是否首次登录
      if (res.data.userInfo.firstLogin) {
        router.push('/admin/settings?action=changePassword');
      } else {
        router.push('/admin/home');
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

// PC端登录
async function handleLoginPC() {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    loading.value = true;

    try {
      const res = await login('admin', loginForm.account, loginForm.password, loginForm.rememberMe);

      if (res.code === 0) {
        userStore.setUserData(res.data);
        ElMessage.success('登录成功');

        // 检查是否首次登录
        if (res.data.userInfo.firstLogin) {
          router.push('/admin/settings?action=changePassword');
        } else {
          router.push('/admin/home');
        }
      } else {
        ElMessage.error(res.message || '登录失败');
      }
    } catch (err) {
      ElMessage.error(err.message || '登录失败');
    } finally {
      loading.value = false;
    }
  });
}

function goToStudent() {
  router.push('/student/login');
}

function goToTeacher() {
  router.push('/teacher/login');
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh; /* 动态视口高度，适配移动端地址栏 */
  display: flex;
  flex-direction: column;
  padding: 60px 20px 20px;
  padding-top: max(60px, env(safe-area-inset-top, 60px));
  padding-bottom: max(20px, env(safe-area-inset-bottom, 20px));
  box-sizing: border-box;
  background: linear-gradient(135deg, #4caf50 0%, #81c784 100%);
}

/* PC端样式 */
.login-pc {
  min-height: 100vh;
  background: linear-gradient(135deg, #4caf50 0%, #81c784 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}

.login-card {
  width: 400px;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.login-title {
  text-align: center;
  margin-bottom: 32px;
}

.login-title .logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
}

.login-title .logo svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.login-title h1 {
  font-size: 24px;
  color: #333;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.login-subtitle {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.login-form-pc {
  margin-bottom: 24px;
}

.login-form-pc :deep(.el-form-item__label) {
  font-weight: 500;
  color: #333;
}

.login-form-pc :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.login-form-pc :deep(.el-button) {
  border-radius: 8px;
  height: 44px;
  font-size: 16px;
}

.login-pc .login-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.login-pc .login-footer a {
  color: #4caf50;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s;
}

.login-pc .login-footer a:hover {
  color: #388e3c;
}

/* 移动端样式 */
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

.remember-me {
  margin-top: 12px;
  padding: 0 8px;
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
