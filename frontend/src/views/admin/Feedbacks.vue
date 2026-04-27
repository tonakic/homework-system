<template>
  <div class="page">
    <!-- PC版本 -->
    <div v-if="isPC" class="feedbacks-pc">
      <header class="pc-header">
        <h1 class="page-title">反馈管理</h1>
      </header>

      <!-- 筛选条件 -->
      <section class="pc-card">
        <header class="card-header">
          <h2 class="card-title">筛选条件</h2>
        </header>
        <el-form :inline="true" class="filter-form">
          <el-form-item label="状态">
            <el-select v-model="filterStatus" placeholder="全部状态" clearable @change="onRefresh">
              <el-option label="全部状态" value="" />
              <el-option label="待处理" value="pending" />
              <el-option label="处理中" value="in_progress" />
              <el-option label="已处理" value="resolved" />
            </el-select>
          </el-form-item>
        </el-form>
      </section>

      <!-- 反馈列表 -->
      <section class="pc-card">
        <header class="card-header">
          <h2 class="card-title">反馈列表</h2>
        </header>
        <el-table
          :data="feedbacks"
          border
          stripe
          v-loading="loading"
          class="feedback-table"
        >
          <el-table-column prop="id" label="ID" width="80" align="center" />
          <el-table-column prop="user_type" label="用户类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getUserTypeTagType(row.user_type)" size="small">
                {{ getUserTypeName(row.user_type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="user_name" label="用户名" width="120" />
          <el-table-column prop="title" label="标题" min-width="150" />
          <el-table-column prop="content" label="内容" min-width="200">
            <template #default="{ row }">
              <el-popover
                placement="top"
                :width="400"
                trigger="click"
                :content="row.content"
              >
                <template #reference>
                  <span class="content-preview">{{ truncateText(row.content, 30) }}</span>
                </template>
              </el-popover>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)">
                {{ getStatusName(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="admin_reply" label="管理员回复" min-width="150">
            <template #default="{ row }">
              <span v-if="row.admin_reply" class="reply-text">{{ truncateText(row.admin_reply, 20) }}</span>
              <span v-else class="no-data">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="提交时间" width="180">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button type="primary" link size="small" @click="openProcessDialog(row)">
                  处理
                </el-button>
                <el-button type="danger" link size="small" @click="confirmDelete(row)">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          class="pagination"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </section>
    </div>

    <!-- 移动端版本 -->
    <div v-else class="feedbacks-mobile">
      <van-nav-bar title="反馈管理" left-arrow @click-left="$router.back()">
        <template #right>
          <van-icon name="filter-o" size="20" @click="showFilterPopup = true" />
        </template>
      </van-nav-bar>

      <div class="page-content">
        <!-- 筛选弹出层 -->
        <van-popup v-model:show="showFilterPopup" position="bottom" round>
          <div class="filter-popup">
            <header class="filter-popup-header">
              <span class="filter-popup-title">筛选条件</span>
              <button class="filter-popup-clear" @click="clearFilter">清除</button>
            </header>
            <div class="filter-popup-content">
              <div class="filter-item">
                <label class="filter-label">状态</label>
                <van-radio-group v-model="filterStatus" direction="horizontal">
                  <van-radio name="">全部</van-radio>
                  <van-radio name="pending">待处理</van-radio>
                  <van-radio name="in_progress">处理中</van-radio>
                  <van-radio name="resolved">已处理</van-radio>
                </van-radio-group>
              </div>
            </div>
            <footer class="filter-popup-footer">
              <van-button block type="primary" @click="applyFilter">确定</van-button>
            </footer>
          </div>
        </van-popup>

        <!-- 反馈列表 -->
        <div class="feedback-list">
          <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
            <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadFeedbacks">
              <article
                v-for="feedback in feedbacks"
                :key="feedback.id"
                class="feedback-item"
                @click="openProcessDialog(feedback)"
              >
                <header class="feedback-item-header">
                  <div class="feedback-user">
                    <van-tag :type="getUserTypeTagType(feedback.user_type)" size="small">
                      {{ getUserTypeName(feedback.user_type) }}
                    </van-tag>
                    <span class="user-name">{{ feedback.user_name }}</span>
                  </div>
                  <van-tag :type="getStatusTagType(feedback.status)" size="small">
                    {{ getStatusName(feedback.status) }}
                  </van-tag>
                </header>
                <h3 class="feedback-title">{{ feedback.title }}</h3>
                <p class="feedback-content">{{ truncateText(feedback.content, 50) }}</p>
                <div v-if="feedback.admin_reply" class="feedback-reply">
                  <span class="reply-label">回复：</span>
                  {{ truncateText(feedback.admin_reply, 30) }}
                </div>
                <time class="feedback-time">{{ formatTime(feedback.created_at) }}</time>
              </article>
            </van-list>
          </van-pull-refresh>
        </div>
      </div>
    </div>

    <!-- 处理对话框 -->
    <el-dialog
      v-model="processDialogVisible"
      title="处理反馈"
      width="500px"
      :close-on-click-modal="false"
      class="process-dialog"
    >
      <el-form :model="processForm" label-width="80px" :rules="processRules" ref="processFormRef">
        <el-form-item label="用户信息">
          <span>{{ currentFeedback?.user_name }} ({{ getUserTypeName(currentFeedback?.user_type) }})</span>
        </el-form-item>
        <el-form-item label="标题">
          <span>{{ currentFeedback?.title }}</span>
        </el-form-item>
        <el-form-item label="内容">
          <div class="dialog-content">{{ currentFeedback?.content }}</div>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="processForm.status" placeholder="请选择状态">
            <el-option label="处理中" value="in_progress" />
            <el-option label="已处理" value="resolved" />
          </el-select>
        </el-form-item>
        <el-form-item label="回复" prop="admin_reply">
          <el-input
            v-model="processForm.admin_reply"
            type="textarea"
            :rows="4"
            placeholder="请输入回复内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitProcess">保存</el-button>
      </template>
    </el-dialog>

    <!-- 移动端处理弹出层 -->
    <van-popup
      v-if="!isPC"
      v-model:show="mobileProcessVisible"
      position="bottom"
      round
      :style="{ height: '80%' }"
    >
      <div class="mobile-process-popup">
        <header class="mobile-process-header">
          <span class="mobile-process-title">处理反馈</span>
          <van-icon name="cross" size="20" @click="mobileProcessVisible = false" />
        </header>
        <div class="mobile-process-content">
          <div class="mobile-process-item">
            <label class="mobile-process-label">用户信息</label>
            <span>{{ currentFeedback?.user_name }} ({{ getUserTypeName(currentFeedback?.user_type) }})</span>
          </div>
          <div class="mobile-process-item">
            <label class="mobile-process-label">标题</label>
            <span>{{ currentFeedback?.title }}</span>
          </div>
          <div class="mobile-process-item">
            <label class="mobile-process-label">内容</label>
            <div class="mobile-process-content-text">{{ currentFeedback?.content }}</div>
          </div>
          <div class="mobile-process-item">
            <label class="mobile-process-label">状态</label>
            <van-radio-group v-model="processForm.status" direction="horizontal">
              <van-radio name="in_progress">处理中</van-radio>
              <van-radio name="resolved">已处理</van-radio>
            </van-radio-group>
          </div>
          <div class="mobile-process-item">
            <label class="mobile-process-label">回复</label>
            <van-field
              v-model="processForm.admin_reply"
              type="textarea"
              placeholder="请输入回复内容"
              :rows="4"
              autosize
            />
          </div>
        </div>
        <footer class="mobile-process-footer">
          <van-button block type="primary" :loading="submitting" @click="submitProcess">保存</van-button>
        </footer>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { showFailToast, showSuccessToast, showConfirmDialog } from 'vant';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getAllFeedbacks, updateFeedback, deleteFeedback } from '@/api/feedbacks';
import { formatTime } from '@/utils/time';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();

// 筛选条件
const filterStatus = ref('');
const showFilterPopup = ref(false);

// 反馈列表
const feedbacks = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const currentPage = ref(0);
const pageSize = ref(20);
const total = ref(0);
const isLoading = ref(false);

// 处理对话框
const processDialogVisible = ref(false);
const mobileProcessVisible = ref(false);
const currentFeedback = ref(null);
const processFormRef = ref(null);
const submitting = ref(false);
const processForm = ref({
  status: 'in_progress',
  admin_reply: ''
});

// 表单验证规则
const processRules = {
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  admin_reply: [{ required: true, message: '请输入回复内容', trigger: 'blur' }]
};

// 用户类型映射
const userTypeMap = {
  student: '学生',
  teacher: '教师'
};

// 状态映射
const statusMap = {
  pending: '待处理',
  in_progress: '处理中',
  resolved: '已处理'
};

function getUserTypeName(type) {
  if (!type) return '用户';
  return userTypeMap[type] || type;
}

function getStatusName(status) {
  if (!status) return '未知';
  return statusMap[status] || status;
}

function getUserTypeTagType(type) {
  const typeMap = {
    student: 'success',
    teacher: 'primary'
  };
  return typeMap[type] || 'default';
}

function getStatusTagType(status) {
  const typeMap = {
    pending: 'warning',
    in_progress: 'info',
    resolved: 'success'
  };
  return typeMap[status] || 'info';
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// 加载反馈列表
async function loadFeedbacks() {
  if (isLoading.value) return;
  if (finished.value) {
    loading.value = false;
    return;
  }

  isLoading.value = true;
  loading.value = true;
  currentPage.value++;

  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      status: filterStatus.value
    };
    const res = await getAllFeedbacks(params);
    if (res.code === 0) {
      feedbacks.value.push(...res.data.list);
      total.value = res.data.total || feedbacks.value.length;
      finished.value = res.data.list.length < pageSize.value;
    } else {
      finished.value = true;
    }
  } catch (err) {
    const errMsg = err.message || '加载反馈列表失败，请稍后重试';
    if (isPC.value) {
      ElMessage.error(errMsg);
    } else {
      showFailToast(errMsg);
    }
    finished.value = true;
  } finally {
    loading.value = false;
    refreshing.value = false;
    isLoading.value = false;
  }
}

// PC端加载指定页
async function loadFeedbacksForPage(page) {
  if (isLoading.value) return;
  isLoading.value = true;
  loading.value = true;

  try {
    const params = {
      page: page,
      pageSize: pageSize.value,
      status: filterStatus.value
    };
    const res = await getAllFeedbacks(params);
    if (res.code === 0) {
      feedbacks.value = res.data.list;
      total.value = res.data.total || feedbacks.value.length;
      finished.value = feedbacks.value.length < pageSize.value;
    } else {
      const errMsg = res.message || '加载反馈列表失败';
      if (isPC.value) {
        ElMessage.error(errMsg);
      } else {
        showFailToast(errMsg);
      }
    }
  } catch (err) {
    const errMsg = err.message || '加载反馈列表失败';
    if (isPC.value) {
      ElMessage.error(errMsg);
    } else {
      showFailToast(errMsg);
    }
  } finally {
    loading.value = false;
    refreshing.value = false;
    isLoading.value = false;
  }
}

function onRefresh() {
  refreshing.value = true;
  currentPage.value = 0;
  feedbacks.value = [];
  finished.value = false;
  isLoading.value = false;

  if (isPC.value) {
    currentPage.value = 1;
    loadFeedbacksForPage(1);
  } else {
    loadFeedbacks();
  }
}

// PC端分页变化
function handlePageChange(page) {
  currentPage.value = page;
  loadFeedbacksForPage(page);
}

// PC端每页数量变化
function handleSizeChange(size) {
  pageSize.value = size;
  currentPage.value = 1;
  loadFeedbacksForPage(1);
}

// 筛选相关
function clearFilter() {
  filterStatus.value = '';
}

function applyFilter() {
  showFilterPopup.value = false;
  onRefresh();
}

// 打开处理对话框
function openProcessDialog(feedback) {
  currentFeedback.value = feedback;
  processForm.value = {
    status: feedback.status === 'pending' ? 'in_progress' : feedback.status,
    admin_reply: feedback.admin_reply || ''
  };
  
  if (isPC.value) {
    processDialogVisible.value = true;
  } else {
    mobileProcessVisible.value = true;
  }
}

// 提交处理
async function submitProcess() {
  // 验证：如果选择"已处理"状态，必须填写回复
  if (processForm.value.status === 'resolved' && !processForm.value.admin_reply?.trim()) {
    if (isPC.value) {
      ElMessage.error('已处理状态必须填写回复内容');
    } else {
      showFailToast('已处理状态必须填写回复内容');
    }
    return;
  }

  // PC端表单验证
  if (isPC.value && processFormRef.value) {
    try {
      await processFormRef.value.validate();
    } catch {
      return;
    }
  }

  submitting.value = true;
  try {
    const res = await updateFeedback(currentFeedback.value.id, {
      status: processForm.value.status,
      admin_reply: processForm.value.admin_reply
    });
    
    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success('处理成功');
        processDialogVisible.value = false;
      } else {
        showSuccessToast('处理成功');
        mobileProcessVisible.value = false;
      }
      onRefresh();
    } else {
      const errMsg = res.message || '处理失败';
      if (isPC.value) {
        ElMessage.error(errMsg);
      } else {
        showFailToast(errMsg);
      }
    }
  } catch (err) {
    const errMsg = err.message || '处理失败';
    if (isPC.value) {
      ElMessage.error(errMsg);
    } else {
      showFailToast(errMsg);
    }
  } finally {
    submitting.value = false;
  }
}

// 删除确认
async function confirmDelete(feedback) {
  try {
    if (isPC.value) {
      await ElMessageBox.confirm('确定要删除这条反馈吗？', '确认删除', {
        type: 'warning'
      });
    } else {
      await showConfirmDialog({
        title: '确认删除',
        message: '确定要删除这条反馈吗？'
      });
    }
    await doDelete(feedback.id);
  } catch {
    // 取消删除
  }
}

// 执行删除
async function doDelete(id) {
  try {
    const res = await deleteFeedback(id);
    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success('删除成功');
      } else {
        showSuccessToast('删除成功');
      }
      onRefresh();
    } else {
      const errMsg = res.message || '删除失败';
      if (isPC.value) {
        ElMessage.error(errMsg);
      } else {
        showFailToast(errMsg);
      }
    }
  } catch (err) {
    const errMsg = err.message || '删除失败';
    if (isPC.value) {
      ElMessage.error(errMsg);
    } else {
      showFailToast(errMsg);
    }
  }
}

onMounted(() => {
  if (isPC.value) {
    currentPage.value = 1;
    loadFeedbacksForPage(1);
  }
});
</script>

<style scoped>
/* ==========================================
   设计系统变量引用
   ========================================== */

/* ========== PC端样式 ========== */
.feedbacks-pc {
  padding: var(--spacing-lg, 24px);
  max-width: 1400px;
  margin: 0 auto;
}

.pc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg, 24px);
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.pc-card {
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 8px);
  margin-bottom: var(--spacing-lg, 24px);
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
}

.card-header {
  padding: var(--spacing-md, 16px);
  border-bottom: 1px solid var(--border-color-lighter);
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color-primary);
  margin: 0;
}

/* PC端筛选表单 */
.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md, 16px);
  padding: var(--spacing-md, 16px);
}

/* PC端表格 */
.feedback-table {
  width: 100%;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xs, 4px);
}

/* PC端内容预览 */
.content-preview {
  color: var(--color-primary);
  cursor: pointer;
  transition: opacity var(--transition-duration, 0.3s);
}

.content-preview:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.reply-text {
  color: var(--color-success);
}

.no-data {
  color: var(--text-color-disabled);
}

/* PC端分页 */
.pagination {
  margin-top: var(--spacing-lg, 24px);
  padding: var(--spacing-md, 16px);
  display: flex;
  justify-content: flex-end;
}

/* 对话框内容 */
.dialog-content {
  background: var(--fill-color);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  border-radius: var(--border-radius-base, 4px);
  line-height: var(--line-height-large, 1.6);
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-color-regular);
}

/* ========== 移动端样式 ========== */
.feedbacks-mobile .page-content {
  padding-bottom: var(--spacing-lg, 24px);
  background: var(--bg-color-page);
  min-height: calc(100vh - var(--header-height, 56px));
}

/* 筛选弹出层 */
.filter-popup {
  background: var(--fill-color-blank);
}

.filter-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md, 16px);
  border-bottom: 1px solid var(--border-color-lighter);
}

.filter-popup-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.filter-popup-clear {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  transition: color var(--transition-duration, 0.3s);
}

.filter-popup-clear:hover {
  color: var(--color-primary);
}

.filter-popup-content {
  padding: var(--spacing-md, 16px);
}

.filter-item {
  margin-bottom: var(--spacing-md, 16px);
}

.filter-label {
  display: block;
  font-size: 14px;
  color: var(--text-color-regular);
  margin-bottom: var(--spacing-sm, 8px);
}

.filter-popup-footer {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  border-top: 1px solid var(--border-color-lighter);
}

/* 反馈列表 */
.feedback-list {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
}

.feedback-item {
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 8px);
  padding: var(--spacing-md, 16px);
  margin-bottom: var(--spacing-sm, 8px);
  box-shadow: var(--box-shadow-lighter, 0 1px 4px 0 rgba(0, 0, 0, 0.04));
  cursor: pointer;
  transition: transform var(--transition-duration, 0.3s),
              box-shadow var(--transition-duration, 0.3s);
}

.feedback-item:active {
  transform: scale(0.98);
}

.feedback-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm, 8px);
}

.feedback-user {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.feedback-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color-primary);
  margin: 0 0 var(--spacing-xs, 4px) 0;
  line-height: 1.4;
}

.feedback-content {
  font-size: 13px;
  color: var(--text-color-regular);
  margin: 0 0 var(--spacing-sm, 8px) 0;
  line-height: var(--line-height-base, 1.5);
}

.feedback-reply {
  font-size: 13px;
  color: var(--color-success);
  background: var(--color-success-light);
  padding: var(--spacing-sm, 8px);
  border-radius: var(--border-radius-base, 4px);
  margin-bottom: var(--spacing-sm, 8px);
}

.reply-label {
  font-weight: 500;
}

.feedback-time {
  display: block;
  font-size: 12px;
  color: var(--text-color-secondary);
  font-style: normal;
}

/* 移动端处理弹出层 */
.mobile-process-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--fill-color-blank);
}

.mobile-process-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md, 16px);
  border-bottom: 1px solid var(--border-color-lighter);
  flex-shrink: 0;
}

.mobile-process-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.mobile-process-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md, 16px);
}

.mobile-process-item {
  margin-bottom: var(--spacing-md, 16px);
}

.mobile-process-label {
  display: block;
  font-size: 13px;
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-xs, 4px);
}

.mobile-process-content-text {
  background: var(--fill-color);
  padding: var(--spacing-md, 16px);
  border-radius: var(--border-radius-large, 8px);
  line-height: var(--line-height-large, 1.6);
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-color-regular);
}

.mobile-process-footer {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  border-top: 1px solid var(--border-color-lighter);
  flex-shrink: 0;
}

/* ========== 响应式调整 ========== */
@media (max-width: 767px) {
  .feedbacks-pc {
    padding: var(--spacing-md, 16px);
  }

  .pc-header {
    margin-bottom: var(--spacing-md, 16px);
  }

  .page-title {
    font-size: 20px;
  }
}
</style>
