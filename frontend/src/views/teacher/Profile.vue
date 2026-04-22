<template>
  <div class="profile-page page">
    <van-nav-bar title="个人设置" left-arrow @click-left="$router.back()" />

    <div class="page-content">
      <div class="user-card card">
        <div class="avatar">
          {{ profile.name ? profile.name.charAt(0) : '教' }}
        </div>
        <div class="user-info">
          <h2>{{ profile.name || '未知用户' }}</h2>
          <p>工号：{{ profile.teacher_no || '未设置' }}</p>
        </div>
      </div>

      <van-cell-group inset title="个人信息">
        <van-cell title="工号" :value="profile.teacher_no || '-'" />
        <van-cell title="姓名" :value="profile.name || '-'" />
        <van-cell title="性别" :value="profile.gender || '-'" />
        <van-cell title="任教科目">
          <template #value>
            <span v-if="profile.subjects && profile.subjects.length > 0">{{ profile.subjects.join('、') }}</span>
            <span v-else>-</span>
          </template>
        </van-cell>
        <van-cell title="管理班级">
          <template #value>
            <span v-if="profile.manage_classes && profile.manage_classes.length > 0">{{ profile.manage_classes.join('、') }}</span>
            <span v-else>-</span>
          </template>
        </van-cell>
        <van-cell title="联系电话" :value="profile.phone || '-'" />
        <van-cell title="备注" :value="profile.remark || '-'" />
        <van-cell title="账户状态">
          <template #value>
            <van-tag :type="profile.status === 'active' ? 'success' : 'danger'">
              {{ profile.status === 'active' ? '正常' : '已停用' }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell title="注册时间" :value="profile.created_at || '-'" />
      </van-cell-group>

      <van-cell-group inset>
        <van-cell title="修改密码" is-link @click="showChangePassword = true" />
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

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// 加载个人资料
async function loadProfile() {
  try {
    const res = await getProfile();
    if (res.code === 0) {
      profile.value = res.data;
    }
  } catch (e) {
    console.error('获取个人信息失败:', e);
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
        router.push('/teacher/home');
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
  router.push('/teacher/login');
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
  background: linear-gradient(135deg, #2196f3, #64b5f6);
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
</style>
