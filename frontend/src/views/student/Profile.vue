<template>
  <div class="profile-page page">
    <!-- PC 端布局 -->
    <div v-if="isPC" class="profile-pc">
      <div class="profile-pc-container">
        <div class="profile-pc-header">
          <h1>个人中心</h1>
          <el-button text @click="$router.push('/student/home')">
            <el-icon><ArrowLeft /></el-icon>
            返回首页
          </el-button>
        </div>

        <div class="profile-pc-body">
          <!-- 左侧：用户信息卡片 -->
          <div class="profile-pc-left">
            <el-card shadow="hover" class="user-info-card">
              <div class="pc-avatar">
                {{ userStore.userName.charAt(0) }}
              </div>
              <h2 class="pc-username">{{ userStore.userName }}</h2>
              <p class="pc-account">学号：{{ userStore.userInfo?.account }}</p>

              <el-divider />

              <div class="pc-info-list">
                <div class="pc-info-item">
                  <span class="pc-info-label">姓名</span>
                  <span class="pc-info-value">{{ profile.name || userStore.userName }}</span>
                </div>
                <div class="pc-info-item">
                  <span class="pc-info-label">学号</span>
                  <span class="pc-info-value">{{ profile.student_no || userStore.userInfo?.account }}</span>
                </div>
                <div class="pc-info-item">
                  <span class="pc-info-label">性别</span>
                  <span class="pc-info-value">{{ profile.gender || '未设置' }}</span>
                </div>
                <div class="pc-info-item">
                  <span class="pc-info-label">年级</span>
                  <span class="pc-info-value">{{ profile.grade || '未设置' }}</span>
                </div>
                <div class="pc-info-item">
                  <span class="pc-info-label">班级</span>
                  <span class="pc-info-value">{{ fullClassName }}</span>
                </div>
                <div class="pc-info-item">
                  <span class="pc-info-label">家长姓名</span>
                  <span class="pc-info-value">{{ profile.parent_name || '未设置' }}</span>
                </div>
                <div class="pc-info-item">
                  <span class="pc-info-label">联系电话</span>
                  <span class="pc-info-value">{{ profile.phone || '未设置' }}</span>
                </div>
                <div class="pc-info-item">
                  <span class="pc-info-label">备注</span>
                  <span class="pc-info-value">{{ profile.remark || '无' }}</span>
                </div>
              </div>
            </el-card>
          </div>

          <!-- 右侧：操作区域 -->
          <div class="profile-pc-right">
            <el-card shadow="hover" class="edit-card">
              <template #header>
                <div class="card-header">
                  <span>修改密码</span>
                </div>
              </template>
              <el-form
                :model="passwordForm"
                label-width="100px"
                label-position="right"
                @submit.prevent="handleChangePassword"
              >
                <el-form-item label="原密码">
                  <el-input
                    v-model="passwordForm.oldPassword"
                    type="password"
                    placeholder="请输入原密码"
                    show-password
                  />
                </el-form-item>
                <el-form-item label="新密码">
                  <el-input
                    v-model="passwordForm.newPassword"
                    type="password"
                    placeholder="请输入新密码（至少6位）"
                    show-password
                  />
                </el-form-item>
                <el-form-item label="确认密码">
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

            <el-card shadow="hover" class="actions-card">
              <template #header>
                <div class="card-header">
                  <span>快捷操作</span>
                </div>
              </template>
              <div class="pc-actions">
                <el-button @click="$router.push('/about')">
                  <el-icon><InfoFilled /></el-icon>
                  关于系统
                </el-button>
                <el-button @click="openHelpCenter">
                  <el-icon><QuestionFilled /></el-icon>
                  帮助中心
                </el-button>
                <el-button type="danger" @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-button>
              </div>
            </el-card>
          </div>
        </div>
      </div>

      <!-- PC端帮助中心弹窗 -->
      <el-dialog
        v-model="showHelpDialog"
        title="帮助中心"
        width="600px"
        :close-on-click-modal="false"
      >
        <el-tabs v-model="activeTab">
          <el-tab-pane label="提交反馈" name="submit">
            <el-form label-width="80px">
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
                  :rows="5"
                  placeholder="请详细描述您遇到的问题或建议"
                  maxlength="1000"
                  show-word-limit
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="feedbackLoading" @click="handleSubmitFeedback">
                  提交反馈
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="我的反馈" name="my">
            <div v-loading="feedbackLoading" class="feedback-list">
              <div v-if="myFeedbacks.length === 0" class="empty-feedback">
                暂无反馈记录
              </div>
              <div v-else class="feedback-item" v-for="item in myFeedbacks" :key="item.id">
                <div class="feedback-header">
                  <span class="feedback-title">{{ item.title }}</span>
                  <el-tag :type="getStatusType(item.status)" size="small">
                    {{ getStatusText(item.status) }}
                  </el-tag>
                </div>
                <div class="feedback-content">{{ item.content }}</div>
                <div v-if="item.reply" class="feedback-reply">
                  <div class="reply-label">管理员回复：</div>
                  <div class="reply-content">{{ item.reply }}</div>
                </div>
                <div class="feedback-time">{{ item.created_at }}</div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-dialog>
    </div>

    <!-- 移动端布局 -->
    <div v-else>
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
      <van-popup v-model:show="showHelpDialog" round position="bottom" style="height: 80%;">
        <div class="help-popup">
          <van-tabs v-model:active="activeTab">
            <van-tab title="提交反馈" name="submit">
              <van-form @submit="handleSubmitFeedback">
                <van-field
                  v-model="feedbackForm.title"
                  label="标题"
                  placeholder="请输入反馈标题"
                  :rules="[{ required: true, message: '请输入标题' }]"
                  maxlength="100"
                  show-word-limit
                />
                <van-field
                  v-model="feedbackForm.content"
                  type="textarea"
                  label="内容"
                  placeholder="请详细描述您遇到的问题或建议"
                  :rows="5"
                  :rules="[{ required: true, message: '请输入内容' }]"
                  maxlength="1000"
                  show-word-limit
                />
                <div class="form-actions">
                  <van-button block type="primary" native-type="submit" :loading="feedbackLoading">
                    提交反馈
                  </van-button>
                </div>
              </van-form>
            </van-tab>
            <van-tab title="我的反馈" name="my">
              <div class="feedback-list-mobile">
                <van-loading v-if="feedbackLoading" class="loading-center" />
                <div v-else-if="myFeedbacks.length === 0" class="empty-feedback">
                  暂无反馈记录
                </div>
                <div v-else class="feedback-item-mobile" v-for="item in myFeedbacks" :key="item.id">
                  <div class="feedback-header-mobile">
                    <span class="feedback-title-mobile">{{ item.title }}</span>
                    <van-tag :type="getStatusType(item.status)" size="medium">
                      {{ getStatusText(item.status) }}
                    </van-tag>
                  </div>
                  <div class="feedback-content-mobile">{{ item.content }}</div>
                  <div v-if="item.reply" class="feedback-reply-mobile">
                    <div class="reply-label-mobile">管理员回复：</div>
                    <div class="reply-content-mobile">{{ item.reply }}</div>
                  </div>
                  <div class="feedback-time-mobile">{{ item.created_at }}</div>
                </div>
              </div>
            </van-tab>
          </van-tabs>
        </div>
      </van-popup>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showSuccessToast, showFailToast, showDialog } from 'vant';
import { useUserStore } from '@/store/user';
import { changePassword, getProfile } from '@/api/auth';
import { submitFeedback, getMyFeedbacks } from '@/api/feedbacks';
import { useDevice } from '@/composables/useDevice';
import { ArrowLeft, InfoFilled, QuestionFilled, SwitchButton } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { isPC } = useDevice();

const showChangePassword = ref(false);
const loading = ref(false);
const profile = ref({});

// 帮助中心相关状态
const showHelpDialog = ref(false);
const activeTab = ref('submit');
const feedbackForm = reactive({ title: '', content: '' });
const myFeedbacks = ref([]);
const feedbackLoading = ref(false);

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
        router.push('/student/home');
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
  router.push('/student/login');
}

// 帮助中心相关方法
function openHelpCenter() {
  showHelpDialog.value = true;
  activeTab.value = 'submit';
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
      ElMessage.warning('标题和内容不能为空');
    } else {
      showFailToast('标题和内容不能为空');
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
      ElMessage.error('提交失败');
    } else {
      showFailToast('提交失败');
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
/* ==================== 移动端样式 ==================== */
.profile-page {
  min-height: 100%;
  background-color: var(--bg-color);
}

.page-content {
  padding: var(--spacing-md, 16px);
}

.user-card {
  display: flex;
  align-items: center;
  padding: 20px;
  margin-bottom: 16px;
  background-color: var(--fill-color-blank);
  border-radius: 12px;
  box-shadow: var(--box-shadow-light);
}

.avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light-3));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  font-weight: bold;
  margin-right: 16px;
  flex-shrink: 0;
}

.user-info h2 {
  font-size: 18px;
  margin-bottom: 4px;
  color: var(--text-color-primary);
}

.user-info p {
  font-size: 14px;
  color: var(--text-color-secondary);
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
  color: var(--text-color-primary);
  font-size: 18px;
}

.form-actions {
  margin-top: 20px;
}

/* 移动端响应式优化 */
@media (max-width: 375px) {
  .page-content {
    padding: 12px;
  }

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

/* ==================== PC 端样式 ==================== */
.profile-pc {
  min-height: 100%;
  background-color: var(--bg-color);
  padding: 24px 32px;
}

.profile-pc-container {
  max-width: 1100px;
  margin: 0 auto;
}

.profile-pc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.profile-pc-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.profile-pc-body {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

/* 左侧用户信息 */
.profile-pc-left {
  flex: 0 0 360px;
}

.user-info-card {
  text-align: center;
  border-radius: 12px;
}

.user-info-card :deep(.el-card__body) {
  padding: 24px;
}

.pc-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light-3));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 36px;
  font-weight: bold;
  margin: 0 auto 12px;
}

.pc-username {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 4px;
}

.pc-account {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin: 0;
}

.pc-info-list {
  text-align: left;
}

.pc-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color-lighter);
}

.pc-info-item:last-child {
  border-bottom: none;
}

.pc-info-label {
  font-size: 14px;
  color: var(--text-color-secondary);
  flex-shrink: 0;
  width: 80px;
}

.pc-info-value {
  font-size: 14px;
  color: var(--text-color-primary);
  text-align: right;
  word-break: break-all;
}

/* 右侧操作区域 */
.profile-pc-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header span {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color-primary);
}

.edit-card {
  border-radius: 12px;
}

.edit-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.edit-card :deep(.el-form-item) {
  margin-bottom: 18px;
}

.actions-card {
  border-radius: 12px;
}

.actions-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.pc-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.pc-actions .el-button {
  flex: 1;
  min-width: 120px;
}

/* ==================== 帮助中心弹窗样式 ==================== */
/* PC端反馈列表 */
.feedback-list {
  max-height: 400px;
  overflow-y: auto;
}

.empty-feedback {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 40px 0;
}

.feedback-item {
  padding: 16px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.feedback-item:last-child {
  border-bottom: none;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.feedback-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.feedback-content {
  font-size: 14px;
  color: var(--text-color-regular);
  line-height: 1.6;
  margin-bottom: 8px;
}

.feedback-reply {
  background-color: var(--fill-color);
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.reply-label {
  font-size: 13px;
  color: var(--color-primary);
  font-weight: 500;
  margin-bottom: 4px;
}

.reply-content {
  font-size: 13px;
  color: var(--text-color-regular);
  line-height: 1.5;
}

.feedback-time {
  font-size: 12px;
  color: var(--text-color-secondary);
}

/* 移动端帮助中心弹窗 */
.help-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.help-popup :deep(.van-tabs) {
  height: 100%;
}

.help-popup :deep(.van-tabs__content) {
  flex: 1;
  overflow-y: auto;
}

.feedback-list-mobile {
  padding: 12px;
  min-height: 200px;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.feedback-item-mobile {
  background-color: var(--fill-color-blank);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: var(--box-shadow-lighter);
}

.feedback-header-mobile {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.feedback-title-mobile {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.feedback-content-mobile {
  font-size: 14px;
  color: var(--text-color-regular);
  line-height: 1.6;
  margin-bottom: 8px;
}

.feedback-reply-mobile {
  background-color: var(--fill-color);
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.reply-label-mobile {
  font-size: 13px;
  color: var(--color-primary);
  font-weight: 500;
  margin-bottom: 4px;
}

.reply-content-mobile {
  font-size: 13px;
  color: var(--text-color-regular);
  line-height: 1.5;
}

.feedback-time-mobile {
  font-size: 12px;
  color: var(--text-color-secondary);
}
</style>
