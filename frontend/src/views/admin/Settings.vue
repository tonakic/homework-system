<template>
  <!-- PC 版本 -->
  <div v-if="isPC" class="settings-pc">
    <div class="pc-header">
      <h2 class="page-title">系统设置</h2>
    </div>

    <div class="pc-content">
      <!-- 用户信息卡片 -->
      <el-card shadow="hover" class="pc-user-card">
        <div class="pc-user-info">
          <div class="pc-avatar">
            {{ userStore.userName ? userStore.userName.charAt(0) : '管' }}
          </div>
          <div class="pc-user-detail">
            <h3>{{ userStore.userName || '未知用户' }}</h3>
            <p>账号：{{ userStore.userInfo?.account || '未设置' }}</p>
          </div>
        </div>
      </el-card>

      <!-- 账户设置 -->
      <el-card shadow="hover" class="pc-section-card">
        <template #header>
          <div class="pc-section-header">
            <el-icon :size="20"><User /></el-icon>
            <span>账户设置</span>
          </div>
        </template>
        <div class="pc-section-content">
          <el-button type="primary" @click="showChangePassword = true">
            <el-icon><Edit /></el-icon>
            修改密码
          </el-button>
        </div>
      </el-card>

      <!-- 系统配置 -->
      <el-card shadow="hover" class="pc-section-card">
        <template #header>
          <div class="pc-section-header">
            <el-icon :size="20"><Setting /></el-icon>
            <span>系统配置</span>
          </div>
        </template>
        <el-form :model="configs" label-width="160px" class="pc-config-form">
          <el-form-item label="登录失败锁定次数">
            <el-input-number v-model.number="configs.login_max_attempts" :min="1" :max="10" />
          </el-form-item>
          <el-form-item label="锁定时长(分钟)">
            <el-input-number v-model.number="configs.login_lock_time" :min="1" :max="60" />
          </el-form-item>
          <el-form-item label="默认密码">
            <el-input v-model="configs.default_password" placeholder="请输入默认密码" class="config-input" />
          </el-form-item>
          <el-form-item label="答题最大时长(分钟)">
            <el-input-number v-model.number="configs.max_exam_duration" :min="1" :max="300" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveConfig">
              <el-icon><Check /></el-icon>
              保存配置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 退出登录 -->
      <el-card shadow="hover" class="pc-section-card pc-logout-card">
        <div class="pc-logout-section">
          <el-button type="danger" size="large" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 修改密码弹窗 -->
    <el-dialog
      v-model="showChangePassword"
      :title="isFirstLogin ? '首次登录请修改密码' : '修改密码'"
      width="450px"
      :close-on-click-modal="!isFirstLogin"
      :close-on-press-escape="!isFirstLogin"
      :show-close="!isFirstLogin"
      destroy-on-close
      class="password-dialog"
    >
      <el-form :model="passwordForm" label-width="80px" @submit.prevent="handleChangePassword" class="password-form">
        <el-form-item label="原密码" required>
          <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入原密码" show-password />
        </el-form-item>
        <el-form-item label="新密码" required>
          <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码(至少6位)" show-password />
        </el-form-item>
        <el-form-item label="确认密码" required>
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请确认新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button v-if="!isFirstLogin" @click="showChangePassword = false">取消</el-button>
          <el-button type="primary" :loading="loading" @click="handleChangePassword">确认修改</el-button>
        </div>
      </template>
    </el-dialog>
  </div>

  <!-- 移动端版本 -->
  <div v-else class="settings-mobile page">
    <van-nav-bar title="系统设置" left-arrow @click-left="$router.back()" />

    <div class="page-content">
      <!-- 用户信息卡片 -->
      <div class="user-card card">
        <div class="avatar">
          {{ userStore.userName ? userStore.userName.charAt(0) : '管' }}
        </div>
        <div class="user-info">
          <h2>{{ userStore.userName || '未知用户' }}</h2>
          <p>账号：{{ userStore.userInfo?.account || '未设置' }}</p>
        </div>
      </div>

      <!-- 账户设置 -->
      <van-cell-group inset title="账户设置" class="settings-group">
        <van-cell title="修改密码" is-link @click="showChangePassword = true">
          <template #icon>
            <van-icon name="lock" class="cell-icon" />
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 系统配置 -->
      <van-cell-group inset title="系统配置" class="settings-group">
        <van-field
          v-model="configs.login_max_attempts"
          type="number"
          label="登录失败锁定次数"
          placeholder="请输入次数"
          :rules="[{ required: true, message: '请输入锁定次数' }, { pattern: /^[1-9]\d*$/, message: '请输入正整数' }]"
        />
        <van-field
          v-model="configs.login_lock_time"
          type="number"
          label="锁定时长(分钟)"
          placeholder="请输入时长"
          :rules="[{ required: true, message: '请输入锁定时长' }, { pattern: /^[1-9]\d*$/, message: '请输入正整数' }]"
        />
        <van-field
          v-model="configs.default_password"
          label="默认密码"
          placeholder="请输入默认密码"
          :rules="[{ required: true, message: '请输入默认密码' }]"
        />
        <van-field
          v-model="configs.max_exam_duration"
          type="number"
          label="答题最大时长(分钟)"
          placeholder="请输入时长"
          :rules="[{ required: true, message: '请输入答题时长' }, { pattern: /^[1-9]\d*$/, message: '请输入正整数' }]"
        />
        <div class="config-actions">
          <van-button type="primary" block :loading="saving" @click="saveConfig">
            保存配置
          </van-button>
        </div>
      </van-cell-group>

      <!-- 退出登录 -->
      <div class="logout-section">
        <van-button type="danger" block round @click="handleLogout">
          <van-icon name="logout" />
          退出登录
        </van-button>
      </div>
    </div>

    <!-- 修改密码弹窗 -->
    <van-popup v-model:show="showChangePassword" round position="bottom" :close-on-click-overlay="!isFirstLogin" class="password-popup">
      <div class="popup-content">
        <h3 class="popup-title">{{ isFirstLogin ? '首次登录请修改密码' : '修改密码' }}</h3>
        <van-form @submit="handleChangePassword" class="password-form-mobile">
          <van-field
            v-model="passwordForm.oldPassword"
            type="password"
            label="原密码"
            placeholder="请输入原密码"
            :rules="[{ required: true, message: '请输入原密码' }]"
          />
          <van-field
            v-model="passwordForm.newPassword"
            type="password"
            label="新密码"
            placeholder="请输入新密码"
            :rules="[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]"
          />
          <van-field
            v-model="passwordForm.confirmPassword"
            type="password"
            label="确认密码"
            placeholder="请确认新密码"
            :rules="[{ required: true, message: '请确认新密码' }]"
          />
          <div class="form-actions">
            <van-button block type="primary" native-type="submit" :loading="loading">
              确认修改
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showSuccessToast, showFailToast, showDialog } from 'vant';
import { ElMessage, ElMessageBox } from 'element-plus';
import { User, Setting, Edit, Check, SwitchButton } from '@element-plus/icons-vue';
import { useUserStore } from '@/store/user';
import { changePassword } from '@/api/auth';
import api from '@/api/index';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const showChangePassword = ref(false);
const loading = ref(false);
const saving = ref(false);

const isFirstLogin = computed(() => userStore.isFirstLogin());

const configs = reactive({
  login_max_attempts: '5',
  login_lock_time: '15',
  default_password: '123456',
  max_exam_duration: '120'
});

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// 检查是否首次登录需要强制修改密码
onMounted(async () => {
  if (userStore.isFirstLogin()) {
    showChangePassword.value = true;
    if (isPC.value) {
      ElMessage.warning('检测到您是首次登录，请先修改密码后再继续使用。');
    } else {
      showDialog({
        title: '首次登录',
        message: '检测到您是首次登录，请先修改密码后再继续使用。',
        confirmButtonText: '去修改密码'
      });
    }
  }

  // 获取系统配置
  try {
    const res = await api.get('/admin/config');
    if (res.code === 0 && res.data) {
      Object.assign(configs, res.data);
    }
  } catch (err) {
    console.error('获取系统配置失败:', err);
  }
});

// 保存系统配置
async function saveConfig() {
  saving.value = true;
  try {
    const res = await api.put('/admin/config', configs);
    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success('配置保存成功');
      } else {
        showSuccessToast('配置保存成功');
      }
    } else {
      if (isPC.value) {
        ElMessage.error(res.message || '保存失败');
      } else {
        showFailToast(res.message || '保存失败');
      }
    }
  } catch (err) {
    if (isPC.value) {
      ElMessage.error(err.message || '保存失败');
    } else {
      showFailToast(err.message || '保存失败');
    }
  } finally {
    saving.value = false;
  }
}

async function handleChangePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    if (isPC.value) {
      ElMessage.error('两次输入的密码不一致');
    } else {
      showFailToast('两次输入的密码不一致');
    }
    return;
  }

  loading.value = true;

  try {
    const res = await changePassword(passwordForm.oldPassword, passwordForm.newPassword);

    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success('密码修改成功');
      } else {
        showSuccessToast('密码修改成功');
      }
      showChangePassword.value = false;
      passwordForm.oldPassword = '';
      passwordForm.newPassword = '';
      passwordForm.confirmPassword = '';

      // 如果是首次登录修改密码，更新用户信息并跳转
      if (isFirstLogin.value) {
        userStore.updateFirstLogin(false);
        router.push('/admin/home');
      }
    } else {
      if (isPC.value) {
        ElMessage.error(res.message || '修改失败');
      } else {
        showFailToast(res.message || '修改失败');
      }
    }
  } catch (err) {
    if (isPC.value) {
      ElMessage.error(err.message || '修改失败');
    } else {
      showFailToast(err.message || '修改失败');
    }
  } finally {
    loading.value = false;
  }
}

async function handleLogout() {
  try {
    if (isPC.value) {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      });
    } else {
      await showDialog({
        title: '提示',
        message: '确定要退出登录吗？',
        showCancelButton: true
      });
    }
    await userStore.clearUserData();
    router.push('/admin/login');
  } catch (e) {
    // 取消退出
  }
}
</script>

<style scoped>
/* ==================== PC端样式 ==================== */
.settings-pc {
  min-height: 100%;
  background: var(--bg-color);
  padding: var(--spacing-lg, 24px);
}

.pc-header {
  margin-bottom: var(--spacing-lg, 24px);
}

.page-title {
  font-size: var(--font-size-extra-large, 24px);
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.pc-content {
  max-width: 800px;
  margin: 0 auto;
}

/* 用户信息卡片 */
.pc-user-card {
  margin-bottom: var(--spacing-md, 20px);
  border-radius: var(--border-radius-large, 12px);
  border: none;
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
  transition: transform var(--transition-duration, 0.3s), box-shadow var(--transition-duration, 0.3s);
}

.pc-user-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--box-shadow, 0 2px 12px 0 rgba(0, 0, 0, 0.1));
}

.pc-user-card :deep(.el-card__body) {
  padding: var(--spacing-lg, 24px);
}

.pc-user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg, 20px);
}

.pc-avatar {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--color-success) 0%, var(--color-success-light) 100%);
  border-radius: var(--border-radius-circle, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fill-color-blank);
  font-size: 28px;
  font-weight: bold;
  flex-shrink: 0;
}

.pc-user-detail h3 {
  font-size: var(--font-size-large, 20px);
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 var(--spacing-xs, 8px) 0;
}

.pc-user-detail p {
  font-size: var(--font-size-base, 14px);
  color: var(--text-color-secondary);
  margin: 0;
}

/* 配置卡片 */
.pc-section-card {
  margin-bottom: var(--spacing-md, 20px);
  border-radius: var(--border-radius-large, 12px);
  border: none;
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
  transition: transform var(--transition-duration, 0.3s), box-shadow var(--transition-duration, 0.3s);
}

.pc-section-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--box-shadow, 0 2px 12px 0 rgba(0, 0, 0, 0.1));
}

.pc-section-card :deep(.el-card__header) {
  padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
  border-bottom: 1px solid var(--border-color-lighter);
}

.pc-section-card :deep(.el-card__body) {
  padding: var(--spacing-lg, 24px);
}

.pc-section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 8px);
  font-size: var(--font-size-medium, 16px);
  font-weight: 500;
  color: var(--text-color-primary);
}

.pc-section-content {
  padding: var(--spacing-xs, 10px) 0;
}

.pc-config-form {
  padding: var(--spacing-xs, 10px) 0;
}

.config-input {
  width: 200px;
}

/* 退出登录卡片 */
.pc-logout-card :deep(.el-card__body) {
  padding: var(--spacing-lg, 24px);
}

.pc-logout-section {
  text-align: center;
}

/* 弹窗样式 */
.password-dialog :deep(.el-dialog__header) {
  padding: var(--spacing-lg, 24px);
  border-bottom: 1px solid var(--border-color-lighter);
}

.password-dialog :deep(.el-dialog__body) {
  padding: var(--spacing-lg, 24px);
}

.password-dialog :deep(.el-dialog__footer) {
  padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
  border-top: 1px solid var(--border-color-lighter);
}

.password-form :deep(.el-form-item) {
  margin-bottom: var(--spacing-lg, 24px);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md, 16px);
}

/* ==================== 移动端样式 ==================== */
.settings-mobile {
  min-height: 100%;
  background: var(--bg-color-page);
}

.page-content {
  padding: var(--spacing-md, 16px);
}

/* 用户卡片 */
.user-card {
  display: flex;
  align-items: center;
  padding: var(--spacing-lg, 20px);
  margin-bottom: var(--spacing-md, 16px);
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 12px);
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
}

.avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--color-success) 0%, var(--color-success-light) 100%);
  border-radius: var(--border-radius-circle, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fill-color-blank);
  font-size: 28px;
  font-weight: bold;
  margin-right: var(--spacing-md, 16px);
  flex-shrink: 0;
}

.user-info h2 {
  font-size: var(--font-size-large, 18px);
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-xs, 4px);
}

.user-info p {
  font-size: var(--font-size-base, 14px);
  color: var(--text-color-secondary);
}

/* 设置分组 */
.settings-group {
  margin-bottom: var(--spacing-md, 16px);
}

.settings-group :deep(.van-cell-group__title) {
  padding: var(--spacing-md, 16px);
  font-size: var(--font-size-base, 14px);
  font-weight: 500;
  color: var(--text-color-secondary);
}

.settings-group :deep(.van-cell) {
  padding: var(--spacing-lg, 24px) var(--spacing-md, 16px);
}

.settings-group :deep(.van-field__label) {
  width: 140px;
  font-size: var(--font-size-base, 14px);
  color: var(--text-color-regular);
}

.cell-icon {
  font-size: 20px;
  margin-right: var(--spacing-sm, 8px);
  color: var(--color-primary);
}

/* 配置操作按钮 */
.config-actions {
  padding: var(--spacing-md, 16px);
  background: var(--fill-color-blank);
}

/* 退出登录 */
.logout-section {
  margin-top: var(--spacing-xl, 32px);
  padding: 0 var(--spacing-md, 16px);
}

.logout-section :deep(.van-button) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm, 8px);
}

/* 弹窗样式 */
.password-popup {
  border-radius: var(--border-radius-large, 16px) var(--border-radius-large, 16px) 0 0;
}

.popup-content {
  padding: var(--spacing-lg, 20px);
}

.popup-title {
  text-align: center;
  font-size: var(--font-size-large, 18px);
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-lg, 20px);
}

.password-form-mobile :deep(.van-field) {
  padding: var(--spacing-md, 16px);
}

.form-actions {
  margin-top: var(--spacing-lg, 20px);
  padding: 0 var(--spacing-md, 16px);
}
</style>