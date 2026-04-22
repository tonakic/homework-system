<template>
  <div class="profile-page page">
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
import { useUserStore } from '@/store/user';
import { changePassword } from '@/api/auth';
import api from '@/api/index';

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
    showDialog({
      title: '首次登录',
      message: '检测到您是首次登录，请先修改密码后再继续使用。',
      confirmButtonText: '去修改密码'
    });
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
      showSuccessToast('配置保存成功');
    } else {
      showFailToast(res.message || '保存失败');
    }
  } catch (err) {
    showFailToast(err.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleChangePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    showFailToast('两次输入的密码不一致');
    return;
  }

  loading.value = true;

  try {
    const res = await changePassword(passwordForm.oldPassword, passwordForm.newPassword);

    if (res.code === 0) {
      showSuccessToast('密码修改成功');
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
      showFailToast(res.message || '修改失败');
    }
  } catch (err) {
    showFailToast(err.message || '修改失败');
  } finally {
    loading.value = false;
  }
}

async function handleLogout() {
  await userStore.clearUserData();
  router.push('/admin/login');
}
</script>

<style scoped>
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
