<template>
  <!-- PC端：左右分栏布局 -->
  <div v-if="isPC" class="login-pc">
    <!-- 左侧品牌区域 -->
    <div class="login-brand admin">
      <div class="brand-content">
        <div class="brand-logo">
          <!-- 管理员：人物半身加齿轮侧写 -->
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" fill="currentColor" opacity="0.2"/>
            <ellipse cx="32" cy="30" rx="8" ry="9" fill="white"/>
            <path d="M20 55 Q20 42 32 42 Q44 42 44 55 L44 68 L20 68 Z" fill="white"/>
            <g transform="translate(48, 32)">
              <circle cx="12" cy="12" r="10" fill="white" opacity="0.95"/>
              <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3"/>
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
        <h1 class="brand-title">创新小学作业系统</h1>
        <p class="brand-subtitle">系统管理后台</p>
        
        <!-- 功能特性展示 -->
        <div class="brand-features">
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon><Avatar /></el-icon>
            </div>
            <span>用户权限管理</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon><Setting /></el-icon>
            </div>
            <span>系统配置维护</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon><List /></el-icon>
            </div>
            <span>数据统计分析</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右侧登录区域 -->
    <div class="login-form-wrapper">
      <div class="login-form-container">
        <div class="login-header">
          <h2 class="login-title">管理员登录</h2>
          <p class="login-desc">请输入用户名和密码登录系统</p>
        </div>
        
        <el-form
          ref="formRef"
          :model="loginForm"
          :rules="formRules"
          class="login-form"
          @submit.prevent="handleLoginPC"
        >
          <el-form-item prop="account">
            <el-input
              v-model="loginForm.account"
              placeholder="请输入用户名"
              size="large"
              prefix-icon="User"
            />
          </el-form-item>
          
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          
          <div class="form-options">
            <el-checkbox v-model="remember">记住登录</el-checkbox>
          </div>
          
          <el-form-item>
            <el-button
              type="primary"
              native-type="submit"
              :loading="loading"
              size="large"
              class="login-btn"
            >
              {{ loading ? '登录中...' : '登录' }}
            </el-button>
          </el-form-item>
        </el-form>
        
        <!-- 其他登录入口 -->
        <div class="login-links">
          <span class="links-label">其他身份：</span>
          <a @click="goToStudent">学生登录</a>
          <a @click="goToTeacher">教师登录</a>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 移动端 -->
  <div v-else class="login-mobile admin">
    <div class="mobile-header">
      <div class="mobile-logo">
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="38" fill="currentColor" opacity="0.2"/>
          <ellipse cx="32" cy="30" rx="8" ry="9" fill="white"/>
          <path d="M20 55 Q20 42 32 42 Q44 42 44 55 L44 68 L20 68 Z" fill="white"/>
          <g transform="translate(48, 32)">
            <circle cx="12" cy="12" r="10" fill="white" opacity="0.95"/>
            <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3"/>
            <rect x="10" y="-2" width="4" height="6" fill="white"/>
            <rect x="10" y="20" width="4" height="6" fill="white"/>
            <rect x="-2" y="10" width="6" height="4" fill="white"/>
            <rect x="20" y="10" width="6" height="4" fill="white"/>
          </g>
        </svg>
      </div>
      <h1 class="mobile-title">创新小学作业系统</h1>
      <p class="mobile-subtitle">管理员登录</p>
    </div>
    
    <van-form @submit="handleLogin" class="mobile-form">
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
        <van-field name="remember" label="记住登录">
          <template #input>
            <van-switch v-model="remember" size="20" />
          </template>
        </van-field>
      </van-cell-group>
      
      <div class="mobile-actions">
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
    
    <div class="mobile-links">
      <a @click="goToStudent">学生登录</a>
      <span class="link-divider">|</span>
      <a @click="goToTeacher">教师登录</a>
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

const router = useRouter();
const userStore = useUserStore();
const { isPC } = useDevice();

// 移动端表单
const account = ref('');
const password = ref('');
const remember = ref(false);
const loading = ref(false);

// PC端表单
const formRef = ref(null);
const loginForm = reactive({
  account: '',
  password: ''
});

// 表单验证规则
const formRules = {
  account: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

// 通用登录逻辑
async function performLogin(accountValue, passwordValue, rememberValue, showMessage) {
  if (!accountValue || !passwordValue) {
    showMessage('请填写完整信息', 'error');
    return false;
  }

  loading.value = true;

  try {
    const res = await login('admin', accountValue, passwordValue, rememberValue);

    if (res.code === 0) {
      userStore.setUserData(res.data);
      showMessage('登录成功', 'success');

      if (res.data.userInfo.firstLogin) {
        router.push('/admin/settings?action=changePassword');
      } else {
        router.push('/admin/home');
      }
      return true;
    } else {
      showMessage(res.message || '登录失败', 'error');
      return false;
    }
  } catch (err) {
    showMessage(err.message || '登录失败', 'error');
    return false;
  } finally {
    loading.value = false;
  }
}

async function handleLogin() {
  await performLogin(
    account.value,
    password.value,
    remember.value,
    (msg, type) => {
      if (type === 'success') showSuccessToast(msg);
      else showFailToast(msg);
    }
  );
}

async function handleLoginPC() {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  await performLogin(
    loginForm.account,
    loginForm.password,
    remember.value,
    (msg, type) => {
      if (type === 'success') ElMessage.success(msg);
      else ElMessage.error(msg);
    }
  );
}

function goToStudent() {
  router.push('/student/login');
}

function goToTeacher() {
  router.push('/teacher/login');
}
</script>

<style scoped>
/* ===================== PC端样式 ===================== */
.login-pc {
  height: 100vh;
  display: flex;
  background-color: var(--bg-color);
}

.login-brand {
  width: 50%;
  background: linear-gradient(135deg, #4caf50, #81c784);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.login-brand.admin {
  background: linear-gradient(135deg, #388e3c, #66bb6a);
}

.login-brand::before {
  content: '';
  position: absolute;
  top: -100px;
  right: -100px;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
}

.login-brand::after {
  content: '';
  position: absolute;
  bottom: -150px;
  left: -150px;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
}

.brand-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 40px;
}

.brand-logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
}

.brand-logo svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}

.brand-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.brand-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 48px;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.feature-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.login-form-wrapper {
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.login-form-container {
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: 8px;
}

.login-desc {
  font-size: 14px;
  color: var(--text-color-secondary);
}

.login-form :deep(.el-input__wrapper) { border-radius: 8px; }
.login-form :deep(.el-form-item) { margin-bottom: 20px; }
.form-options { margin-bottom: 20px; }
.login-btn { width: 100%; height: 44px; border-radius: 8px; font-size: 16px; }

.login-links {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color-lighter);
}
.login-links .links-label { font-size: 14px; color: var(--text-color-secondary); margin-right: 8px; }
.login-links a { color: var(--color-primary); cursor: pointer; margin: 0 8px; font-size: 14px; }
.login-links a:hover { text-decoration: underline; }

/* ===================== 移动端样式 ===================== */
.login-mobile {
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(135deg, #4caf50, #81c784);
  display: flex;
  flex-direction: column;
  padding: 60px 20px 20px;
  padding-top: max(60px, env(safe-area-inset-top, 60px));
  padding-bottom: max(20px, env(safe-area-inset-bottom, 20px));
  box-sizing: border-box;
}

.login-mobile.admin {
  background: linear-gradient(135deg, #388e3c, #66bb6a);
}

.mobile-header {
  text-align: center;
  color: white;
  margin-bottom: 32px;
  flex-shrink: 0;
}

.mobile-logo { width: 72px; height: 72px; margin: 0 auto 16px; }
.mobile-logo svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)); }
.mobile-title { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
.mobile-subtitle { font-size: 14px; opacity: 0.9; }

.mobile-form {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}
.mobile-form :deep(.van-cell-group) { margin: 0; }
.mobile-form :deep(.van-cell) { padding: 12px 16px; }
.mobile-form :deep(.van-field__label) { width: 70px; }

.mobile-actions { margin-top: 20px; padding: 0 4px; }

.mobile-links {
  margin-top: auto;
  padding-top: 24px;
  text-align: center;
  color: white;
  flex-shrink: 0;
}
.mobile-links a { color: white; cursor: pointer; font-size: 14px; }
.mobile-links .link-divider { margin: 0 12px; opacity: 0.6; }

/* ===================== 响应式适配 ===================== */
@media (max-width: 991px) {
  .login-pc .login-brand { width: 40%; }
  .login-pc .login-form-wrapper { width: 60%; }
}

@media (max-width: 767px) {
  .login-pc { flex-direction: column; }
  .login-pc .login-brand {
    width: 100%;
    height: 200px;
    padding: 24px;
  }
  .login-pc .login-brand .brand-subtitle,
  .login-pc .login-brand .brand-features { display: none; }
  .login-pc .login-form-wrapper {
    width: 100%;
    flex: 1;
    padding: 20px;
  }
}

@media (max-width: 375px) {
  .login-mobile { padding: 40px 16px 16px; }
  .mobile-logo { width: 60px; height: 60px; }
  .mobile-title { font-size: 20px; }
  .mobile-form { padding: 16px; border-radius: 12px; }
}
</style>