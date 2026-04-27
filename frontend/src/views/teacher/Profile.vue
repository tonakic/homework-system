<template>
  <!-- PC版本 -->
  <div v-if="isPC" class="profile-page-pc">
    <div class="pc-header">
      <h2>个人设置</h2>
    </div>

    <div class="profile-content-pc">
      <!-- 个人信息卡片 -->
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

      <!-- 帮助中心 -->
      <el-card class="help-card-pc">
        <template #header>
          <div class="card-header">
            <span>帮助中心</span>
          </div>
        </template>
        <p class="help-desc">遇到问题或有建议？欢迎提交反馈，我们会尽快处理。</p>
        <el-button type="primary" @click="openHelpCenter">
          提交反馈
        </el-button>
      </el-card>

      <!-- 退出登录 -->
      <el-card class="logout-card-pc">
        <el-button type="danger" @click="handleLogout">
          退出登录
        </el-button>
      </el-card>
    </div>

    <!-- PC帮助中心弹窗 -->
    <el-dialog
      v-model="showHelpDialog"
      title="帮助中心"
      width="500px"
      destroy-on-close
    >
      <el-tabs v-model="activeTab">
        <el-tab-pane label="提交反馈" name="submit">
          <el-form :model="feedbackForm" label-width="80px">
            <el-form-item label="标题" required>
              <el-input
                v-model="feedbackForm.title"
                placeholder="请输入反馈标题"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>
            <el-form-item label="内容" required>
              <el-input
                v-model="feedbackForm.content"
                type="textarea"
                placeholder="请详细描述您遇到的问题或建议"
                :rows="5"
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="feedbackLoading"
                :disabled="!feedbackForm.title || !feedbackForm.content"
                @click="handleSubmitFeedback"
              >
                提交
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="我的反馈" name="my">
          <div v-loading="feedbackLoading" class="feedback-list">
            <div v-if="myFeedbacks.length === 0" class="empty-feedback">
              暂无反馈记录
            </div>
            <div
              v-for="item in myFeedbacks"
              :key="item.id"
              class="feedback-item"
            >
              <div class="feedback-header">
                <span class="feedback-title">{{ item.title }}</span>
                <el-tag :type="getStatusType(item.status)" size="small">
                  {{ getStatusText(item.status) }}
                </el-tag>
              </div>
              <div class="feedback-content">{{ item.content }}</div>
              <div v-if="item.reply" class="feedback-reply">
                <span class="reply-label">管理员回复：</span>
                {{ item.reply }}
              </div>
              <div class="feedback-time">{{ item.created_at }}</div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

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
        <van-cell title="帮助中心" is-link @click="openHelpCenter" />
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

    <!-- 移动端帮助中心弹窗 -->
    <van-popup v-model:show="showHelpDialog" round position="bottom" style="height: 80%">
      <div class="help-popup">
        <van-tabs v-model:active="activeTab">
          <van-tab title="提交反馈" name="submit">
            <van-form @submit="handleSubmitFeedback">
              <van-field
                v-model="feedbackForm.title"
                label="标题"
                placeholder="请输入反馈标题"
                maxlength="100"
                show-word-limit
                :rules="[{ required: true, message: '请输入标题' }]"
              />
              <van-field
                v-model="feedbackForm.content"
                type="textarea"
                label="内容"
                placeholder="请详细描述您遇到的问题或建议"
                rows="5"
                autosize
                maxlength="1000"
                show-word-limit
                :rules="[{ required: true, message: '请输入内容' }]"
              />
              <div class="form-actions">
                <van-button
                  block
                  type="primary"
                  native-type="submit"
                  :loading="feedbackLoading"
                >
                  提交
                </van-button>
              </div>
            </van-form>
          </van-tab>
          <van-tab title="我的反馈" name="my">
            <div v-if="feedbackLoading" class="loading-container">
              <van-loading size="24px">加载中...</van-loading>
            </div>
            <div v-else-if="myFeedbacks.length === 0" class="empty-feedback">
              暂无反馈记录
            </div>
            <div v-else class="feedback-list-mobile">
              <div
                v-for="item in myFeedbacks"
                :key="item.id"
                class="feedback-item-mobile"
              >
                <div class="feedback-header-mobile">
                  <span class="feedback-title-mobile">{{ item.title }}</span>
                  <van-tag :type="getStatusType(item.status)" size="medium">
                    {{ getStatusText(item.status) }}
                  </van-tag>
                </div>
                <div class="feedback-content-mobile">{{ item.content }}</div>
                <div v-if="item.reply" class="feedback-reply-mobile">
                  <span class="reply-label-mobile">管理员回复：</span>
                  {{ item.reply }}
                </div>
                <div class="feedback-time-mobile">{{ item.created_at }}</div>
              </div>
            </div>
          </van-tab>
        </van-tabs>
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
import { submitFeedback, getMyFeedbacks } from '@/api/feedbacks';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const showChangePassword = ref(false);
const showFirstLoginDialog = ref(false);
const loading = ref(false);
const profile = ref({});

// 帮助中心相关状态
const showHelpDialog = ref(false);
const activeTab = ref('submit');
const feedbackForm = reactive({ title: '', content: '' });
const myFeedbacks = ref([]);
const feedbackLoading = ref(false);

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

// 帮助中心相关方法
function openHelpCenter() {
  showHelpDialog.value = true;
  activeTab.value = 'submit';
  feedbackForm.title = '';
  feedbackForm.content = '';
  loadMyFeedbacks();
}

async function loadMyFeedbacks() {
  feedbackLoading.value = true;
  try {
    const res = await getMyFeedbacks();
    if (res.code === 0) {
      myFeedbacks.value = res.data || [];
    }
  } catch (e) {
    console.error('获取反馈列表失败:', e);
  } finally {
    feedbackLoading.value = false;
  }
}

async function handleSubmitFeedback() {
  if (!feedbackForm.title || !feedbackForm.content) {
    if (isPC.value) {
      ElMessage.warning('请填写标题和内容');
    } else {
      showFailToast('请填写标题和内容');
    }
    return;
  }

  feedbackLoading.value = true;
  try {
    const res = await submitFeedback(feedbackForm.title, feedbackForm.content);
    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success('提交成功');
      } else {
        showSuccessToast('提交成功');
      }
      feedbackForm.title = '';
      feedbackForm.content = '';
      activeTab.value = 'my';
      loadMyFeedbacks();
    } else {
      if (isPC.value) {
        ElMessage.error(res.message || '提交失败');
      } else {
        showFailToast(res.message || '提交失败');
      }
    }
  } catch (e) {
    if (isPC.value) {
      ElMessage.error(e.message || '提交失败');
    } else {
      showFailToast(e.message || '提交失败');
    }
  } finally {
    feedbackLoading.value = false;
  }
}

function getStatusType(status) {
  switch (status) {
    case 'pending': return 'warning';
    case 'in_progress': return 'info';
    case 'resolved': return 'success';
    default: return 'default';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'pending': return '待处理';
    case 'in_progress': return '处理中';
    case 'resolved': return '已处理';
    default: return status;
  }
}
</script>

<style scoped>
/* ==================== CSS变量定义 ==================== */
.profile-page-pc {
  --teacher-primary: #2196f3;
  --teacher-primary-light: #64b5f6;
  --teacher-primary-dark: #1976d2;
  --card-radius: 12px;
  --avatar-size-pc: 80px;
  --avatar-size-mobile: 60px;
}

/* ==================== PC端样式 ==================== */
.profile-page-pc {
  padding: var(--spacing-lg, 20px);
  min-height: 100%;
  background-color: var(--bg-color);
}

.pc-header {
  margin-bottom: var(--spacing-lg, 20px);
}

.pc-header h2 {
  margin: 0;
  font-size: var(--font-size-xl, 20px);
  color: var(--text-color-primary);
}

.profile-content-pc {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 20px);
  max-width: 800px;
}

/* PC卡片通用样式 */
.profile-page-pc :deep(.el-card) {
  border-radius: var(--card-radius);
  border: none;
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
}

.profile-page-pc :deep(.el-card__header) {
  padding: var(--spacing-md, 16px) var(--spacing-lg, 20px);
  border-bottom: 1px solid var(--border-color);
}

.profile-page-pc :deep(.el-card__body) {
  padding: var(--spacing-lg, 20px);
}

.card-header {
  font-weight: 600;
  font-size: var(--font-size-md, 16px);
  color: var(--text-color-primary);
}

/* 用户卡片 */
.user-card-pc {
  text-align: center;
}

.user-avatar {
  width: var(--avatar-size-pc);
  height: var(--avatar-size-pc);
  background: linear-gradient(135deg, var(--teacher-primary), var(--teacher-primary-light));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fill-color-blank);
  font-size: calc(var(--avatar-size-pc) * 0.45);
  font-weight: bold;
  margin: 0 auto var(--spacing-md, 16px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.user-detail h3 {
  margin: 0 0 var(--spacing-xs, 8px);
  font-size: var(--font-size-lg, 18px);
  color: var(--text-color-primary);
}

.user-detail p {
  margin: 0 0 var(--spacing-md, 16px);
  color: var(--text-color-regular);
  font-size: var(--font-size-sm, 14px);
}

.user-desc {
  margin-top: var(--spacing-md, 16px);
  text-align: left;
}

/* 密码卡片 */
.password-card-pc :deep(.el-form-item) {
  margin-bottom: var(--spacing-md, 16px);
}

.password-card-pc :deep(.el-button--primary) {
  background: linear-gradient(135deg, var(--teacher-primary), var(--teacher-primary-light));
  border: none;
}

/* 帮助卡片 */
.help-card-pc {
  text-align: center;
}

.help-desc {
  color: var(--text-color-regular);
  font-size: var(--font-size-sm, 14px);
  margin-bottom: var(--spacing-md, 16px);
}

.help-card-pc :deep(.el-button--primary) {
  background: linear-gradient(135deg, var(--teacher-primary), var(--teacher-primary-light));
  border: none;
}

/* 退出登录卡片 */
.logout-card-pc {
  text-align: center;
}

.logout-card-pc :deep(.el-card__body) {
  padding: var(--spacing-lg, 20px);
}

/* ==================== PC端反馈列表样式 ==================== */
.feedback-list {
  max-height: 400px;
  overflow-y: auto;
}

.empty-feedback {
  text-align: center;
  color: var(--text-color-secondary);
  padding: var(--spacing-xxl, 40px) 0;
  font-size: var(--font-size-sm, 14px);
}

.feedback-item {
  padding: var(--spacing-md, 16px);
  border-bottom: 1px solid var(--border-color);
}

.feedback-item:last-child {
  border-bottom: none;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs, 8px);
}

.feedback-title {
  font-weight: 500;
  font-size: var(--font-size-md, 15px);
  color: var(--text-color-primary);
}

.feedback-content {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-regular);
  line-height: 1.6;
  margin-bottom: var(--spacing-xs, 8px);
}

.feedback-reply {
  background-color: var(--bg-color);
  padding: var(--spacing-sm, 10px) var(--spacing-md, 12px);
  border-radius: var(--radius-sm, 6px);
  font-size: var(--font-size-xs, 13px);
  color: var(--info-color, #2196f3);
  margin-bottom: var(--spacing-xs, 8px);
}

.reply-label {
  color: var(--text-color-secondary);
}

.feedback-time {
  font-size: var(--font-size-xs, 12px);
  color: var(--text-color-secondary);
}

/* ==================== 移动端样式 ==================== */
.user-card {
  display: flex;
  align-items: center;
  padding: var(--spacing-lg, 20px);
  margin-bottom: var(--spacing-md, 16px);
}

.avatar {
  width: var(--avatar-size-mobile);
  height: var(--avatar-size-mobile);
  background: linear-gradient(135deg, var(--teacher-primary, #2196f3), var(--teacher-primary-light, #64b5f6));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fill-color-blank);
  font-size: calc(var(--avatar-size-mobile) * 0.47);
  font-weight: bold;
  margin-right: var(--spacing-md, 16px);
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.user-info h2 {
  font-size: var(--font-size-lg, 18px);
  margin-bottom: var(--spacing-xs, 4px);
  color: var(--text-color-primary);
}

.user-info p {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-regular);
}

.logout {
  margin-top: var(--spacing-xl, 32px);
  padding: 0 var(--spacing-md, 16px);
}

/* 密码弹窗 */
.password-popup {
  padding: var(--spacing-lg, 20px);
}

.password-popup h3 {
  text-align: center;
  margin-bottom: var(--spacing-lg, 20px);
  font-size: var(--font-size-lg, 18px);
  color: var(--text-color-primary);
}

.form-actions {
  margin-top: var(--spacing-lg, 20px);
}

/* 帮助中心弹窗 */
.help-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: var(--spacing-xxl, 40px) 0;
}

/* 移动端反馈列表 */
.feedback-list-mobile {
  padding: 0 var(--spacing-md, 16px);
}

.feedback-item-mobile {
  padding: var(--spacing-md, 16px) 0;
  border-bottom: 1px solid var(--border-color);
}

.feedback-item-mobile:last-child {
  border-bottom: none;
}

.feedback-header-mobile {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs, 8px);
}

.feedback-title-mobile {
  font-weight: 500;
  font-size: var(--font-size-md, 15px);
  color: var(--text-color-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: var(--spacing-xs, 8px);
}

.feedback-content-mobile {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-regular);
  line-height: 1.6;
  margin-bottom: var(--spacing-xs, 8px);
}

.feedback-reply-mobile {
  background-color: var(--bg-color);
  padding: var(--spacing-sm, 10px) var(--spacing-md, 12px);
  border-radius: var(--radius-md, 8px);
  font-size: var(--font-size-xs, 13px);
  color: var(--info-color, #2196f3);
  margin-bottom: var(--spacing-xs, 8px);
}

.reply-label-mobile {
  color: var(--text-color-secondary);
}

.feedback-time-mobile {
  font-size: var(--font-size-xs, 12px);
  color: var(--text-color-secondary);
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 767px) {
  .profile-page-pc {
    padding: var(--spacing-md, 16px);
  }

  .profile-content-pc {
    gap: var(--spacing-md, 16px);
  }
}
</style>
