<template>
  <!-- PC版本 -->
  <div v-if="isPC" class="profile-page-pc">
    <div class="pc-header">
      <h2>个人设置</h2>
    </div>

    <div class="profile-content-pc">
      <el-row :gutter="20">
        <!-- 左侧个人信息卡片 -->
        <el-col :span="8">
          <el-card class="user-card-pc">
            <template #header>
              <div class="card-header">
                <span>个人信息</span>
              </div>
            </template>
            <div class="user-avatar">
              {{ profile.name ? profile.name.charAt(0) : '教' }}
            </div>
            <div class="user-detail">
              <h3>{{ profile.name || '未知用户' }}</h3>
              <p>工号：{{ profile.teacher_no || '未设置' }}</p>
            </div>
            <el-descriptions :column="1" border size="small" class="user-desc">
              <el-descriptions-item label="性别">{{ profile.gender || '-' }}</el-descriptions-item>
              <el-descriptions-item label="任教科目">
                <span v-if="profile.subjects && profile.subjects.length > 0">{{ profile.subjects.join('、') }}</span>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="管理班级">
                <span v-if="profile.manage_classes && profile.manage_classes.length > 0">{{ profile.manage_classes.join('、') }}</span>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ profile.phone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="备注">{{ profile.remark || '-' }}</el-descriptions-item>
              <el-descriptions-item label="账户状态">
                <el-tag :type="profile.status === 'active' ? 'success' : 'danger'" size="small">
                  {{ profile.status === 'active' ? '正常' : '已停用' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="注册时间">{{ profile.created_at || '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <!-- 右侧编辑和修改密码 -->
        <el-col :span="16">
          <!-- 修改密码卡片 -->
          <el-card class="password-card-pc">
            <template #header>
              <div class="card-header">
                <span>修改密码</span>
              </div>
            </template>
            <el-form
              ref="passwordFormRef"
              :model="passwordForm"
              :rules="passwordRules"
              label-width="100px"
              style="max-width: 400px"
            >
              <el-form-item label="原密码" prop="oldPassword">
                <el-input
                  v-model="passwordForm.oldPassword"
                  type="password"
                  placeholder="请输入原密码"
                  show-password
                />
              </el-form-item>
              <el-form-item label="新密码" prop="newPassword">
                <el-input
                  v-model="passwordForm.newPassword"
                  type="password"
                  placeholder="请输入新密码"
                  show-password
                />
              </el-form-item>
              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  placeholder="请确认新密码"
                  show-password
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="loading" @click="handleChangePassword">
                  确认修改
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 退出登录 -->
          <el-card class="logout-card-pc">
            <el-button type="danger" @click="handleLogout">
              退出登录
            </el-button>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 首次登录提示弹窗 -->
    <el-dialog
      v-model="showFirstLoginDialog"
      title="首次登录"
      width="400px"
      :close-on-click-modal="false"
      :show-close="false"
    >
      <p>检测到您是首次登录，请先修改密码后再继续使用。</p>
      <template #footer>
        <el-button type="primary" @click="showFirstLoginDialog = false">去修改密码</el-button>
      </template>
    </el-dialog>
  </div>

  <!-- 移动端版本 -->
  <div v-else class="profile-page page">
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
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/store/user';
import { changePassword, getProfile } from '@/api/auth';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const showChangePassword = ref(false);
const showFirstLoginDialog = ref(false);
const loading = ref(false);
const profile = ref({});

const passwordFormRef = ref(null);

const isFirstLogin = computed(() => userStore.isFirstLogin());

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入原密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' }
  ]
};

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
    if (isPC.value) {
      showFirstLoginDialog.value = true;
    } else {
      showChangePassword.value = true;
      showDialog({
        title: '首次登录',
        message: '检测到您是首次登录，请先修改密码后再继续使用。',
        confirmButtonText: '去修改密码'
      });
    }
  }
});

async function handleChangePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    if (isPC.value) {
      ElMessage.error('两次输入的密码不一致');
    } else {
      showFailToast('两次输入的密码不一致');
    }
    return;
  }

  // PC端表单验证
  if (isPC.value && passwordFormRef.value) {
    try {
      await passwordFormRef.value.validate();
    } catch {
      return;
    }
  }

  loading.value = true;

  try {
    const res = await changePassword(passwordForm.oldPassword, passwordForm.newPassword);

    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success('密码修改成功');
      } else {
        showSuccessToast('密码修改成功');
        showChangePassword.value = false;
      }
      passwordForm.oldPassword = '';
      passwordForm.newPassword = '';
      passwordForm.confirmPassword = '';

      // 如果是首次登录修改密码，更新用户信息并跳转
      if (isFirstLogin.value) {
        userStore.updateFirstLogin(false);
        router.push('/teacher/home');
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
  await userStore.clearUserData();
  router.push('/teacher/login');
}
</script>

<style scoped>
/* PC端样式 */
.profile-page-pc {
  padding: 20px;
}

.pc-header {
  margin-bottom: 20px;
}

.pc-header h2 {
  margin: 0;
  font-size: 20px;
}

.profile-content-pc {
  padding: 0;
}

.user-card-pc {
  text-align: center;
}

.card-header {
  font-weight: 500;
}

.user-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #2196f3, #64b5f6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 36px;
  font-weight: bold;
  margin: 0 auto 16px;
}

.user-detail h3 {
  margin: 0 0 8px;
  font-size: 18px;
}

.user-detail p {
  margin: 0 0 16px;
  color: #666;
}

.user-desc {
  margin-top: 16px;
  text-align: left;
}

.password-card-pc {
  margin-bottom: 20px;
}

.logout-card-pc {
  text-align: center;
}

/* 移动端样式 */
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
