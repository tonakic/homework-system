<template>
  <!-- PC端：左右分栏布局 -->
  <div v-if="isPC" class="login-pc">
    <!-- 左侧品牌区域 -->
    <div class="login-brand" :style="brandStyle">
      <div class="brand-content">
        <div class="brand-logo">
          <slot name="logo">
            <el-icon><School /></el-icon>
          </slot>
        </div>
        <h1 class="brand-title">创新小学作业系统</h1>
        <p class="brand-subtitle">让学习更高效，让教学更轻松</p>
        
        <!-- 功能特性展示 -->
        <div class="brand-features">
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon><Document /></el-icon>
            </div>
            <span>智能题库管理</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon><EditPen /></el-icon>
            </div>
            <span>AI辅助批改</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon><DataAnalysis /></el-icon>
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
          <h2 class="login-title">{{ title }}</h2>
          <p class="login-desc">{{ subtitle }}</p>
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
              :placeholder="accountPlaceholder"
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
          <span class="links-label">其他登录：</span>
          <a v-for="link in otherLinks" :key="link.path" @click="goTo(link.path)">
            {{ link.label }}
          </a>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 移动端：全屏卡片布局 -->
  <div v-else class="login-mobile" :style="mobileBgStyle">
    <div class="mobile-header">
      <div class="mobile-logo">
        <slot name="logo">
          <el-icon><School /></el-icon>
        </slot>
      </div>
      <h1 class="mobile-title">创新小学作业系统</h1>
      <p class="mobile-subtitle">{{ title }}</p>
    </div>
    
    <van-form @submit="handleLoginMobile" class="mobile-form">
      <van-cell-group inset>
        <van-field
          v-model="account"
          :name="accountField"
          :label="accountLabel"
          :placeholder="accountPlaceholder"
          :rules="[{ required: true, message: `请输入${accountLabel}` }]"
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
      <a v-for="(link, index) in otherLinks" :key="link.path">
        <span v-if="index > 0" class="link-divider">|</span>
        <span @click="goTo(link.path)">{{ link.label }}</span>
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast, showFailToast } from 'vant';
import { ElMessage } from 'element-plus';
import { login } from '@/api/auth';
import { useUserStore } from '@/store/user';
import { useDevice } from '@/composables/useDevice';

const props = defineProps({
  // 用户类型：student, teacher, admin
  userType: {
    type: String,
    required: true
  },
  // 页面标题
  title: {
    type: String,
    default: '用户登录'
  },
  // 副标题
  subtitle: {
    type: String,
    default: ''
  },
  // 账号字段名
  accountField: {
    type: String,
    default: 'account'
  },
  // 账号标签
  accountLabel: {
    type: String,
    default: '账号'
  },
  // 账号占位符
  accountPlaceholder: {
    type: String,
    default: '请输入账号'
  },
  // 品牌区域颜色
  brandColor: {
    type: String,
    default: '#409eff'
  },
  // 其他登录链接
  otherLinks: {
    type: Array,
    default: () => []
  },
  // 登录成功后的跳转路径
  successRoute: {
    type: String,
    default: '/home'
  },
  // 首次登录跳转路径
  firstLoginRoute: {
    type: String,
    default: '/profile?action=changePassword'
  }
});

const router = useRouter();
const userStore = useUserStore();
const { isPC } = useDevice();

// 表单数据
const formRef = ref(null);
const loginForm = reactive({
  account: '',
  password: ''
});
const account = ref('');
const password = ref('');
const remember = ref(false);
const loading = ref(false);

// 表单验证规则
const formRules = {
  account: [{ required: true, message: `请输入${props.accountLabel}`, trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

// 品牌区域样式
const brandStyle = computed(() => ({
  background: `linear-gradient(135deg, ${props.brandColor}, ${adjustColor(props.brandColor, 30)})`
}));

// 移动端背景样式
const mobileBgStyle = computed(() => ({
  background: `linear-gradient(135deg, ${props.brandColor}, ${adjustColor(props.brandColor, 30)})`
}));

// 颜色调整函数
function adjustColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 +
    (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)
  ).toString(16).slice(1);
}

// 登录逻辑
async function performLogin(accountValue, passwordValue, rememberValue, showMessage) {
  if (!accountValue || !passwordValue) {
    showMessage('请填写完整信息', 'error');
    return false;
  }

  loading.value = true;

  try {
    const res = await login(props.userType, accountValue, passwordValue, rememberValue);

    if (res.code === 0) {
      userStore.setUserData(res.data);
      showMessage('登录成功', 'success');

      // 检查是否首次登录
      if (res.data.userInfo.firstLogin) {
        router.push(props.firstLoginRoute);
      } else {
        router.push(props.successRoute);
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

// PC端登录
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
      if (type === 'success') {
        ElMessage.success(msg);
      } else {
        ElMessage.error(msg);
      }
    }
  );
}

// 移动端登录
async function handleLoginMobile() {
  await performLogin(
    account.value,
    password.value,
    remember.value,
    (msg, type) => {
      if (type === 'success') {
        showSuccessToast(msg);
      } else {
        showFailToast(msg);
      }
    }
  );
}

// 跳转
function goTo(path) {
  router.push(path);
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
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.login-brand::before {
  content: '';
  position: absolute;
  top: -100px;
  right: -100px;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
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
  border-radius: 16px;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  margin: 0 auto 24px;
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

.login-form {
  :deep(.el-input__wrapper) {
    border-radius: 8px;
  }
  
  :deep(.el-form-item) {
    margin-bottom: 20px;
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.login-btn {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  font-size: 16px;
}

.login-links {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color-lighter);
  
  .links-label {
    font-size: 14px;
    color: var(--text-color-secondary);
    margin-right: 8px;
  }
  
  a {
    color: var(--color-primary);
    cursor: pointer;
    margin: 0 8px;
    font-size: 14px;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

/* ===================== 移动端样式 ===================== */
.login-mobile {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 60px 20px 20px;
  padding-top: max(60px, env(safe-area-inset-top, 60px));
  padding-bottom: max(20px, env(safe-area-inset-bottom, 20px));
  box-sizing: border-box;
}

.mobile-header {
  text-align: center;
  color: white;
  margin-bottom: 32px;
  flex-shrink: 0;
}

.mobile-logo {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin: 0 auto 16px;
}

.mobile-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.mobile-subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.mobile-form {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  
  :deep(.van-cell-group) {
    margin: 0;
  }
  
  :deep(.van-cell) {
    padding: 12px 16px;
  }
  
  :deep(.van-field__label) {
    width: 70px;
  }
}

.mobile-actions {
  margin-top: 20px;
  padding: 0 4px;
}

.mobile-links {
  margin-top: auto;
  padding-top: 24px;
  text-align: center;
  color: white;
  flex-shrink: 0;
  
  a {
    color: white;
    cursor: pointer;
    font-size: 14px;
  }
  
  .link-divider {
    margin: 0 12px;
    opacity: 0.6;
  }
}

/* ===================== 响应式适配 ===================== */
@media (max-width: 991px) {
  .login-pc {
    .login-brand {
      width: 40%;
    }
    
    .login-form-wrapper {
      width: 60%;
    }
  }
}

@media (max-width: 767px) {
  .login-pc {
    flex-direction: column;
    
    .login-brand {
      width: 100%;
      height: 200px;
      padding: 24px;
      
      .brand-subtitle {
        display: none;
      }
      
      .brand-features {
        display: none;
      }
    }
    
    .login-form-wrapper {
      width: 100%;
      flex: 1;
      padding: 20px;
    }
  }
}

@media (max-width: 375px) {
  .login-mobile {
    padding: 40px 16px 16px;
  }
  
  .mobile-logo {
    width: 60px;
    height: 60px;
    font-size: 32px;
  }
  
  .mobile-title {
    font-size: 20px;
  }
  
  .mobile-form {
    padding: 16px;
    border-radius: 12px;
  }
}
</style>