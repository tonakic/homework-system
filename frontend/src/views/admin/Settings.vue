<template>
  <!-- PC 版本 -->
  <div v-if="isPC" class="settings-pc">
    <div class="pc-header">
      <h2>系统设置</h2>
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
            <el-input v-model="configs.default_password" placeholder="请输入默认密码" style="width: 200px" />
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
      <el-card shadow="hover" class="pc-section-card">
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
    >
      <el-form :model="passwordForm" label-width="80px" @submit.prevent="handleChangePassword">
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
        <el-button v-if="!isFirstLogin" @click="showChangePassword = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleChangePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>

  <!-- 移动端版本 -->
  <div v-else class="profile-page page">
    <van-nav-bar title="系统设置" left-arrow @click-left="$router.back()" />

    <div class="page-content">
      <div class="user-card card">
        <div class="avatar">
          {{ userStore.userName ? userStore.userName.charAt(0) : '管' }}
        </div>
        <div class="user-info">
          <h2>{{ userStore.userName || '未知用户' }}</h2>
          <p>账号：{{ userStore.userInfo?.account || '未设置' }}</p>
        </div>
      </div>

      <van-cell-group inset title="账户设置">
        <van-cell title="修改密码" is-link @click="showChangePassword = true" />
      </van-cell-group>

      <van-cell-group inset title="系统配置">
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

      <div class="logout">
        <van-button type="danger" block round @click="handleLogout">
          退出登录
        </van-button>
      </div>
    </div>

    <!-- 修改密码弹窗 -->
    <van-popup v-model:show="showChangePassword" round position="bottom" :close-on-click-overlay="!isFirstLogin">
      <div class="password-popup">
        <h3>{{ isFirstLogin ? '首次登录请修改密码' : '修改密码' }}</h3>
        <van-form @submit="handleChangePassword">
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
/* ========== PC 样式 ========== */
.settings-pc {
  padding: 24px;
  min-height: 100vh;
  background: #f5f7fa;
}

.pc-header {
  margin-bottom: 24px;
}

.pc-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.pc-content {
  max-width: 800px;
  margin: 0 auto;
}

.pc-user-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.pc-user-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.pc-avatar {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #4caf50, #81c784);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  font-weight: bold;
}

.pc-user-detail h3 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.pc-user-detail p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.pc-section-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.pc-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.pc-section-content {
  padding: 10px 0;
}

.pc-config-form {
  padding: 10px 0;
}

.pc-logout-section {
  padding: 20px 0;
  text-align: center;
}

/* ========== 移动端样式 ========== */
.user-card {
  display: flex;
  align-items: center;
  padding: 20px;
  margin-bottom: 16px;
}

.avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #4caf50, #81c784);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  font-weight: bold;
  margin-right: 16px;
}

.user-info h2 {
  font-size: 18px;
  margin-bottom: 4px;
}

.user-info p {
  font-size: 14px;
  color: #666;
}

.config-actions {
  padding: 16px;
}

.logout {
  margin-top: 32px;
  padding: 0 16px;
}

.password-popup {
  padding: 20px;
}

.password-popup h3 {
  text-align: center;
  margin-bottom: 20px;
}

.form-actions {
  margin-top: 20px;
}
</style>
