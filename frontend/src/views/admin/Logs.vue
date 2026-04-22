<template>
  <div class="page">
    <van-nav-bar title="操作日志" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon v-if="!deleteMode" name="delete-o" size="20" style="margin-right: 12px;" @click="enterDeleteMode" />
        <van-icon v-if="!deleteMode" name="down" size="20" @click="exportLogs" />
        <span v-if="deleteMode" class="cancel-btn" @click="exitDeleteMode">取消</span>
      </template>
    </van-nav-bar>

    <div class="page-content">
      <!-- 筛选条件 -->
      <div class="filter-section">
        <!-- 第一行：筛选按钮 -->
        <div class="filter-row">
          <div class="filter-buttons">
            <van-button
              size="small"
              :type="filterUserType ? 'primary' : 'default'"
              @click="showUserTypePicker = true"
            >
              {{ getUserTypeName(filterUserType) }}
              <van-icon name="arrow-down" />
            </van-button>
            <van-button
              size="small"
              :type="filterAction ? 'primary' : 'default'"
              @click="showActionPicker = true"
            >
              {{ getActionName(filterAction) }}
              <van-icon name="arrow-down" />
            </van-button>
            <van-button
              size="small"
              :type="startDate || endDate ? 'primary' : 'default'"
              @click="openDatePicker"
            >
              {{ getDateFilterShort() }}
              <van-icon name="arrow-down" />
            </van-button>
          </div>
        </div>
        <!-- 第二行：搜索框 -->
        <div class="search-row">
          <van-search
            v-model="searchKeyword"
            placeholder="搜索用户名或详情"
            shape="round"
            :clearable="true"
            @search="onRefresh"
            @clear="onRefresh"
          />
        </div>
        <!-- 日期筛选标签 -->
        <div v-if="startDate || endDate" class="date-tags">
          <van-tag type="primary" size="medium" closeable @close="clearDateFilter">
            {{ getDateFilterText() }}
          </van-tag>
        </div>
      </div>

      <!-- 用户类型筛选弹出层 -->
      <van-popup v-model:show="showUserTypePicker" position="bottom" round>
        <van-picker
          :columns="userTypeOptions"
          @confirm="onUserTypeConfirm"
          @cancel="showUserTypePicker = false"
        />
      </van-popup>

      <!-- 操作类型筛选弹出层 -->
      <van-popup v-model:show="showActionPicker" position="bottom" round>
        <van-picker
          :columns="actionOptions"
          @confirm="onActionConfirm"
          @cancel="showActionPicker = false"
        />
      </van-popup>

      <!-- 日期筛选弹出层 -->
      <van-popup v-model:show="showDatePicker" position="bottom" round>
        <div class="date-picker-header">
          <span class="date-picker-title">选择日期范围</span>
          <span class="date-picker-clear" @click="clearDateFilter">清除</span>
        </div>
        <div class="date-range-inputs">
          <div class="date-input" :class="{ active: selectingStart }" @click="selectingStart = true">
            <span class="date-label">开始日期</span>
            <span class="date-value" :class="{ placeholder: !startDate }">{{ startDate || '请选择' }}</span>
          </div>
          <span class="date-separator">至</span>
          <div class="date-input" :class="{ active: !selectingStart }" @click="selectingStart = false">
            <span class="date-label">结束日期</span>
            <span class="date-value" :class="{ placeholder: !endDate }">{{ endDate || '请选择' }}</span>
          </div>
        </div>
        <van-date-picker
          v-model="selectedDateArray"
          :title="selectingStart ? '选择开始日期' : '选择结束日期'"
          :columns-type="['year', 'month', 'day']"
          :min-date="minDate"
          :max-date="maxDate"
          @confirm="onDateConfirm"
          @cancel="cancelDatePicker"
        />
        <div class="date-picker-footer">
          <van-button block type="primary" @click="confirmDateRange">确定筛选</van-button>
        </div>
      </van-popup>

      <!-- 日志列表 -->
      <div class="log-list">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadLogs">
            <div v-for="log in logs" :key="log.id" class="log-item" :class="{ 'selected': selectedIds.includes(log.id) }" @click="toggleSelect(log.id)">
              <van-checkbox v-if="deleteMode" :model-value="selectedIds.includes(log.id)" @click.stop class="log-checkbox" />
              <div class="log-content-wrapper">
                <div class="log-header">
                  <span class="log-user">
                    <van-tag :type="getUserTypeTagType(log.user_type)" size="small">
                      {{ getUserTypeName(log.user_type) }}
                    </van-tag>
                    {{ log.user_name }}
                  </span>
                  <span class="log-time">{{ formatTime(log.created_at) }}</span>
                </div>
                <div class="log-content">
                  <span class="log-action">{{ getActionName(log.action) }}</span>
                  <span v-if="log.target_type" class="log-target">{{ getTargetTypeName(log.target_type) }}</span>
                  <span class="log-detail">{{ log.detail }}</span>
                </div>
                <div v-if="log.ip_address" class="log-ip">IP: {{ log.ip_address }}</div>
              </div>
            </div>
          </van-list>
        </van-pull-refresh>
      </div>

      <!-- 删除模式底部操作栏 -->
      <div v-if="deleteMode" class="delete-toolbar">
        <van-checkbox v-model="isAllSelected" @change="toggleSelectAll">全选</van-checkbox>
        <span class="selected-count">已选 {{ selectedIds.length }} 项</span>
        <van-button type="danger" size="small" :disabled="selectedIds.length === 0" @click="confirmDelete">
          删除
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { showFailToast, showSuccessToast, showConfirmDialog } from 'vant';
import api from '@/api/index';
import { formatTime } from '@/utils/time';

// 筛选条件
const filterUserType = ref('');
const filterAction = ref('');
const searchKeyword = ref('');
const startDate = ref('');
const endDate = ref('');

// 日期范围限制
const minDate = ref(new Date(2024, 0, 1));
const maxDate = ref(new Date());

// 筛选弹出层
const showUserTypePicker = ref(false);
const showActionPicker = ref(false);
const showDatePicker = ref(false);
const selectingStart = ref(true);

// 临时保存日期状态（用于取消时恢复）
const tempStartDate = ref('');
const tempEndDate = ref('');

// 日期选择器数组格式 [year, month, day]
const selectedDateArray = ref(['2026', '01', '01']);

// 日志列表
const logs = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const currentPage = ref(0);
const pageSize = 20;
const isLoading = ref(false);

// 删除模式
const deleteMode = ref(false);
const selectedIds = ref([]);

// 用户类型选项
const userTypeOptions = computed(() => [
  { text: '全部用户', value: '' },
  { text: '管理员', value: 'admin' },
  { text: '教师', value: 'teacher' },
  { text: '学生', value: 'student' }
]);

// 操作类型选项
const actionOptions = computed(() => [
  { text: '全部操作', value: '' },
  { text: '登录', value: 'login' },
  { text: '登出', value: 'logout' },
  { text: '新增', value: 'add' },
  { text: '修改', value: 'update' },
  { text: '删除', value: 'delete' },
  { text: '重置密码', value: 'reset_password' },
  { text: '修改密码', value: 'change_password' },
  { text: '导入', value: 'import' }
]);

// 用户类型映射
const userTypeMap = {
  admin: '管理员',
  teacher: '教师',
  student: '学生'
};

// 操作类型映射
const actionMap = {
  login: '登录',
  logout: '登出',
  add: '新增',
  update: '修改',
  delete: '删除',
  reset_password: '重置密码',
  change_password: '修改密码',
  import: '导入',
  publish: '发布',
  withdraw: '撤回',
  create: '创建'
};

// 操作对象映射
const targetTypeMap = {
  user: '用户',
  student: '学生',
  teacher: '教师',
  question: '题目',
  questions: '题目',
  exam_task: '考试任务',
  class: '班级',
  config: '系统配置'
};

// 是否全选
const isAllSelected = computed({
  get: () => logs.value.length > 0 && selectedIds.value.length === logs.value.length,
  set: () => {}
});

function getUserTypeName(type) {
  if (!type) return '用户';
  return userTypeMap[type] || type;
}

function getActionName(action) {
  if (!action) return '操作';
  return actionMap[action] || action;
}

function getTargetTypeName(targetType) {
  if (!targetType) return '';
  return targetTypeMap[targetType] || targetType;
}

function getUserTypeTagType(type) {
  const typeMap = {
    admin: 'danger',
    teacher: 'primary',
    student: 'success'
  };
  return typeMap[type] || 'default';
}

function getDateFilterShort() {
  if (!startDate.value && !endDate.value) return '日期';
  return '已选';
}

function getDateFilterText() {
  if (!startDate.value && !endDate.value) return '';
  if (startDate.value && endDate.value) return `${startDate.value} 至 ${endDate.value}`;
  if (startDate.value) return `${startDate.value} 起`;
  return `至 ${endDate.value}`;
}

// 获取日志日期范围
async function fetchDateRange() {
  try {
    const res = await api.get('/admin/logs/date-range');
    if (res.code === 0 && res.data) {
      if (res.data.minDate) {
        const [y, m, d] = res.data.minDate.split('-');
        minDate.value = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      }
      if (res.data.maxDate) {
        const [y, m, d] = res.data.maxDate.split('-');
        maxDate.value = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      }
      selectedDateArray.value = [
        String(maxDate.value.getFullYear()),
        String(maxDate.value.getMonth() + 1).padStart(2, '0'),
        String(maxDate.value.getDate()).padStart(2, '0')
      ];
    }
  } catch (err) {
    console.error('获取日期范围失败:', err);
  }
}

// 加载日志列表
async function loadLogs() {
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
      pageSize,
      user_type: filterUserType.value,
      action: filterAction.value,
      keyword: searchKeyword.value,
      start_date: startDate.value,
      end_date: endDate.value
    };
    const res = await api.get('/admin/logs', { params });
    if (res.code === 0) {
      logs.value.push(...res.data.list);
      finished.value = res.data.list.length < pageSize;
    } else {
      finished.value = true;
    }
  } catch (err) {
    showFailToast(err.message || '加载日志列表失败，请稍后重试');
    finished.value = true;
  } finally {
    loading.value = false;
    refreshing.value = false;
    isLoading.value = false;
  }
}

function onRefresh() {
  refreshing.value = true;
  currentPage.value = 0;
  logs.value = [];
  finished.value = false;
  isLoading.value = false;
  selectedIds.value = [];
  loadLogs();
}

// 筛选回调
function onUserTypeConfirm({ selectedOptions }) {
  filterUserType.value = selectedOptions[0]?.value || '';
  showUserTypePicker.value = false;
  onRefresh();
}

function onActionConfirm({ selectedOptions }) {
  filterAction.value = selectedOptions[0]?.value || '';
  showActionPicker.value = false;
  onRefresh();
}

function onDateConfirm({ selectedValues }) {
  const dateStr = selectedValues.join('-');
  if (selectingStart.value) {
    startDate.value = dateStr;
  } else {
    endDate.value = dateStr;
  }
}

function confirmDateRange() {
  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    showFailToast('开始日期不能晚于结束日期');
    return;
  }
  showDatePicker.value = false;
  onRefresh();
}

function clearDateFilter() {
  startDate.value = '';
  endDate.value = '';
  tempStartDate.value = '';
  tempEndDate.value = '';
}

function openDatePicker() {
  tempStartDate.value = startDate.value;
  tempEndDate.value = endDate.value;
  showDatePicker.value = true;
}

function cancelDatePicker() {
  startDate.value = tempStartDate.value;
  endDate.value = tempEndDate.value;
  showDatePicker.value = false;
}

// 删除模式相关
function enterDeleteMode() {
  deleteMode.value = true;
  selectedIds.value = [];
}

function exitDeleteMode() {
  deleteMode.value = false;
  selectedIds.value = [];
}

function toggleSelect(id) {
  if (!deleteMode.value) return;
  const index = selectedIds.value.indexOf(id);
  if (index > -1) {
    selectedIds.value.splice(index, 1);
  } else {
    selectedIds.value.push(id);
  }
}

function toggleSelectAll(checked) {
  if (checked) {
    selectedIds.value = logs.value.map(log => log.id);
  } else {
    selectedIds.value = [];
  }
}

async function confirmDelete() {
  if (selectedIds.value.length === 0) return;

  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除选中的 ${selectedIds.value.length} 条日志吗？`
    });
    await deleteLogs();
  } catch {
    // 取消删除
  }
}

async function deleteLogs() {
  try {
    const res = await api.delete('/admin/logs', { data: { ids: selectedIds.value } });
    if (res.code === 0) {
      showSuccessToast('删除成功');
      selectedIds.value = [];
      onRefresh();
    } else {
      showFailToast(res.message || '删除失败');
    }
  } catch (err) {
    showFailToast(err.message || '删除失败');
  }
}

// 导出日志
async function exportLogs() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      showFailToast('请先登录');
      return;
    }

    const params = new URLSearchParams();
    if (filterUserType.value) params.append('user_type', filterUserType.value);
    if (filterAction.value) params.append('action', filterAction.value);
    if (searchKeyword.value) params.append('keyword', searchKeyword.value);
    if (startDate.value) params.append('start_date', startDate.value);
    if (endDate.value) params.append('end_date', endDate.value);

    const response = await fetch(`/api/admin/logs/export?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `导出失败 (${response.status})`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = '操作日志.xlsx';
    if (contentDisposition) {
      const matches = /filename\*=UTF-8''(.+)/.exec(contentDisposition);
      if (matches) {
        filename = decodeURIComponent(matches[1]);
      }
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    showSuccessToast('导出成功');
  } catch (err) {
    console.error('导出日志失败:', err);
    showFailToast('导出失败: ' + (err.message || '未知错误'));
  }
}

onMounted(() => {
  fetchDateRange();
});
</script>

<style scoped>
.page-content {
  padding-bottom: 60px;
}

.cancel-btn {
  color: #1989fa;
  font-size: 14px;
}

.filter-section {
  background: #fff;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-buttons :deep(.van-button) {
  padding: 0 12px;
}

.filter-buttons :deep(.van-icon) {
  margin-left: 4px;
}

.search-row {
  margin: 0 -12px;
}

.search-row :deep(.van-search) {
  padding: 8px 12px;
}

.search-row :deep(.van-search__content) {
  background: #f7f8fa;
}

.date-tags {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.date-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #eee;
}

.date-picker-title {
  font-size: 16px;
  font-weight: 500;
}

.date-picker-clear {
  color: #969799;
  font-size: 14px;
}

.date-range-inputs {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
  background: #f7f8fa;
}

.date-input {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 10px 12px;
  text-align: center;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.date-input.active {
  border-color: #1989fa;
}

.date-label {
  display: block;
  font-size: 12px;
  color: #969799;
  margin-bottom: 4px;
}

.date-value {
  font-size: 15px;
  color: #323233;
}

.date-value.placeholder {
  color: #c8c9cc;
}

.date-separator {
  color: #969799;
  font-size: 14px;
}

.date-picker-footer {
  padding: 12px 16px;
  border-top: 1px solid #eee;
}

.log-list {
  padding: 0 12px;
}

.log-item {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 10px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: background-color 0.2s;
}

.log-item.selected {
  background: #f0f9ff;
}

.log-checkbox {
  flex-shrink: 0;
  margin-top: 2px;
}

.log-content-wrapper {
  flex: 1;
  min-width: 0;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.log-user {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
}

.log-time {
  font-size: 12px;
  color: #999;
}

.log-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-action {
  font-size: 14px;
  color: #1989fa;
}

.log-target {
  font-size: 13px;
  color: #07c160;
  margin-left: 8px;
}

.log-detail {
  font-size: 13px;
  color: #666;
}

.log-ip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.delete-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.selected-count {
  flex: 1;
  font-size: 14px;
  color: #666;
}
</style>
