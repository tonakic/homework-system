<template>
  <div class="profile-page page">
    <van-nav-bar title="个人中心" left-arrow @click-left="$router.push('/student/home')" />

    <div class="page-content">
      <div class="user-card card">
        <div class="avatar">
          {{ userStore.userName.charAt(0) }}
        </div>
        <div class="user-info">
          <h2>{{ userStore.userName }}</h2>
          <p>学号：{{ userStore.userInfo?.account }}</p>
        </div>
      </div>

      <!-- 个人信息卡片 -->
      <van-cell-group inset title="个人信息">
        <van-cell title="姓名" :value="profile.name || userStore.userName" />
        <van-cell title="学号" :value="profile.student_no || userStore.userInfo?.account" />
        <van-cell title="性别" :value="profile.gender || '未设置'" />
        <van-cell title="年级" :value="profile.grade || '未设置'" />
        <van-cell title="班级" :value="fullClassName" />
        <van-cell title="家长姓名" :value="profile.parent_name || '未设置'" />
        <van-cell title="联系电话" :value="profile.phone || '未设置'" />
        <van-cell title="备注" :value="profile.remark || '无'" />
      </van-cell-group>

      <van-cell-group inset>
        <van-cell title="修改密码" is-link @click="showChangePassword = true" />
        <van-cell title="关于系统" is-link to="/about" />
        <van-cell title="帮助中心" is-link />
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
import { changePassword, getProfile } from '@/api/auth';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const showChangePassword = ref(false);
const loading = ref(false);
const profile = ref({});

const isFirstLogin = computed(() => userStore.isFirstLogin());

// 班级名称（年级已单独显示，此处只需显示班级）
const fullClassName = computed(() => {
  return profile.value.class_name || '未设置';
});

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// 加载用户详细信息
async function loadProfile() {
  try {
    const res = await getProfile();
    if (res.code === 0) {
      profile.value = res.data || {};
    }
  } catch (err) {
    console.error('获取用户信息失败:', err);
  }
}

// 检查是否首次登录需要强制修改密码
onMounted(() => {
  loadProfile();
  if (userStore.isFirstLogin()) {
    showChangePassword.value = true;
    showDialog({
      title: '首次登录',
      message: '检测到您是首次登录，请先修改密码后再继续使用。',
      confirmButtonText: '去修改密码'
    });
  }
});

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
        router.push('/student/home');
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
  router.push('/student/login');
}
</script>

<style scoped>
.profile-page {
  min-height: 100%;
  background: #f5f5f5;
}

.page-content {
  padding: 12px;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 20px;
  margin-bottom: 16px;
}

.avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #ff9800, #ffb74d);
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

/* 移动端响应式优化 */
@media (max-width: 375px) {
  .user-card {
    padding: 16px;
  }

  .avatar {
    width: 50px;
    height: 50px;
    font-size: 24px;
    margin-right: 12px;
  }

  .user-info h2 {
    font-size: 16px;
  }

  .user-info p {
    font-size: 12px;
  }

  .logout {
    margin-top: 24px;
    padding: 0 12px;
  }

  .password-popup {
    padding: 16px;
  }

  .password-popup h3 {
    font-size: 16px;
    margin-bottom: 16px;
  }
}
</style>
