<template>
  <div class="records-page page">
    <!-- PC端布局 -->
    <div v-if="isPC" class="records-pc">
      <div class="pc-header">
        <h1>答题记录</h1>
      </div>

      <div class="pc-content">
        <!-- 筛选区域 -->
        <div class="filter-section">
          <el-select v-model="pcFilters.subject" placeholder="选择科目" clearable style="width: 160px;">
            <el-option
              v-for="s in subjectOptions"
              :key="s.value"
              :label="s.text"
              :value="s.value"
            />
          </el-select>
          <el-date-picker
            v-model="pcFilters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 280px;"
            :shortcuts="dateShortcuts"
          />
          <el-select v-model="pcFilters.status" placeholder="选择状态" clearable style="width: 140px;">
            <el-option
              v-for="st in statusOptions"
              :key="st.value"
              :label="st.text"
              :value="st.value"
            />
          </el-select>
        </div>

        <!-- 记录表格 -->
        <el-table :data="paginatedRecords" style="width: 100%" stripe>
          <el-table-column prop="title" label="作业名称" min-width="200">
            <template #default="{ row }">
              <span class="record-title-pc" @click="viewRecord(row.id)">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="subject" label="科目" width="120">
            <template #default="{ row }">
              <el-tag :type="getSubjectTagType(row.subject)" size="small">
                {{ row.subject }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="成绩" width="120" align="center">
            <template #default="{ row }">
              <span class="pc-score" :class="getScoreClass(row.total_score, row.exam_total_score)">
                {{ row.total_score ?? '--' }}/{{ row.exam_total_score }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'graded' ? 'success' : 'warning'" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提交时间" width="180">
            <template #default="{ row }">
              <span class="pc-time">{{ formatTime(row.submit_time) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="viewRecord(row.id)">
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="pcFilteredRecords.length"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </div>

        <el-empty v-if="pcFilteredRecords.length === 0" description="暂无答题记录" />
      </div>
    </div>

    <!-- 移动端布局 -->
    <div v-else>
      <van-nav-bar title="答题记录" left-arrow @click-left="$router.push('/student/home')">
        <template #right>
          <van-icon name="filter-o" @click="showFilterPopup = true" />
        </template>
      </van-nav-bar>

      <div class="page-content">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <div class="record-list">
            <div
              v-for="record in filteredRecords"
              :key="record.id"
              class="record-card card"
              @click="viewRecord(record.id)"
            >
              <div class="record-header">
                <span class="subject-tag">{{ record.subject }}</span>
                <span class="record-time">{{ formatTime(record.submit_time) }}</span>
              </div>
              <h3 class="record-title">{{ record.title }}</h3>
              <div class="record-footer">
                <div class="score" :class="getScoreClass(record.total_score, record.exam_total_score)">
                  {{ record.total_score ?? '--' }}/{{ record.exam_total_score }}
                </div>
                <span class="status" :class="getStatusClass(record.status)">
                  {{ getStatusText(record.status) }}
                </span>
              </div>
            </div>
            <van-empty v-if="filteredRecords.length === 0" description="暂无答题记录" />
          </div>
        </van-pull-refresh>
      </div>

      <!-- 筛选弹窗 -->
      <van-popup v-model:show="showFilterPopup" position="bottom" round :style="{ height: '50%' }">
        <div class="filter-popup">
          <van-nav-bar title="筛选条件">
            <template #right>
              <van-icon name="cross" @click="showFilterPopup = false" />
            </template>
          </van-nav-bar>

          <div class="filter-content">
            <!-- 科目筛选 -->
            <div class="filter-section-mobile">
              <div class="section-label">科目</div>
              <div class="btn-group">
                <div
                  v-for="s in subjectOptions"
                  :key="s.value"
                  class="btn-item"
                  :class="{ active: tempFilters.subject === s.value }"
                  @click="tempFilters.subject = s.value"
                >{{ s.text }}</div>
              </div>
            </div>

            <!-- 日期筛选 -->
            <div class="filter-section-mobile">
              <div class="section-label">答题日期</div>
              <div class="btn-group">
                <div
                  v-for="d in dateOptions"
                  :key="d.value"
                  class="btn-item"
                  :class="{ active: tempFilters.dateRange === d.value }"
                  @click="tempFilters.dateRange = d.value"
                >{{ d.text }}</div>
              </div>
            </div>

            <!-- 状态筛选 -->
            <div class="filter-section-mobile">
              <div class="section-label">状态</div>
              <div class="btn-group">
                <div
                  v-for="st in statusOptions"
                  :key="st.value"
                  class="btn-item"
                  :class="{ active: tempFilters.status === st.value }"
                  @click="tempFilters.status = st.value"
                >{{ st.text }}</div>
              </div>
            </div>
          </div>

          <div class="filter-footer">
            <van-button block @click="resetFilters">重置</van-button>
            <van-button block type="primary" @click="confirmFilters">确定</van-button>
          </div>
        </div>
      </van-popup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getStudentRecords } from '@/api/auth';
import { showFailToast } from 'vant';
import { formatTime } from '@/utils/time';
import { useDevice } from '@/composables/useDevice';

const router = useRouter();
const { isPC } = useDevice();
const records = ref([]);
const refreshing = ref(false);

// 筛选弹窗
const showFilterPopup = ref(false);

// 实际应用的筛选条件（移动端）
const filters = ref({
  subject: '',
  dateRange: '',
  status: ''
});

// 临时筛选条件（弹窗中编辑用）
const tempFilters = ref({
  subject: '',
  dateRange: '',
  status: ''
});

// PC端筛选条件
const pcFilters = ref({
  subject: '',
  dateRange: null,
  status: ''
});

// PC端分页
const currentPage = ref(1);
const pageSize = ref(10);

// 筛选选项
const subjectOptions = [
  { text: '全部', value: '' },
  { text: '语文', value: '语文' },
  { text: '数学', value: '数学' },
  { text: '英语', value: '英语' },
  { text: '科学', value: '科学' }
];

const dateOptions = [
  { text: '全部', value: '' },
  { text: '今天', value: 'today' },
  { text: '近7天', value: 'week' },
  { text: '近30天', value: 'month' }
];

const statusOptions = [
  { text: '全部', value: '' },
  { text: '已批改', value: 'graded' },
  { text: '待批改', value: 'submitted' }
];

// 日期快捷选项
const dateShortcuts = [
  {
    text: '今天',
    value: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return [today, new Date()];
    }
  },
  {
    text: '近7天',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 7 * 24 * 3600 * 1000);
      return [start, end];
    }
  },
  {
    text: '近30天',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 30 * 24 * 3600 * 1000);
      return [start, end];
    }
  }
];

// 移动端筛选后的记录
const filteredRecords = computed(() => {
  let result = records.value || [];

  // 科目筛选
  if (filters.value.subject) {
    result = result.filter(r => r.subject === filters.value.subject);
  }

  // 日期筛选
  if (filters.value.dateRange) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    result = result.filter(r => {
      if (!r.submit_time) return false;
      const recordDate = new Date(r.submit_time);

      switch (filters.value.dateRange) {
        case 'today':
          return recordDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return recordDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          return recordDate >= monthAgo;
        default:
          return true;
      }
    });
  }

  // 状态筛选
  if (filters.value.status) {
    result = result.filter(r => r.status === filters.value.status);
  }

  return result;
});

// PC端筛选后的记录
const pcFilteredRecords = computed(() => {
  let result = records.value || [];

  // 科目筛选
  if (pcFilters.value.subject) {
    result = result.filter(r => r.subject === pcFilters.value.subject);
  }

  // 日期范围筛选
  if (pcFilters.value.dateRange && pcFilters.value.dateRange.length === 2) {
    const startDate = new Date(pcFilters.value.dateRange[0]);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(pcFilters.value.dateRange[1]);
    endDate.setHours(23, 59, 59, 999);

    result = result.filter(r => {
      if (!r.submit_time) return false;
      const recordDate = new Date(r.submit_time);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }

  // 状态筛选
  if (pcFilters.value.status) {
    result = result.filter(r => r.status === pcFilters.value.status);
  }

  return result;
});

// PC端分页后的记录
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return pcFilteredRecords.value.slice(start, end);
});

// 打开弹窗时同步临时筛选条件
function openFilterPopup() {
  tempFilters.value = { ...filters.value };
  showFilterPopup.value = true;
}

// 重置筛选
function resetFilters() {
  tempFilters.value = {
    subject: '',
    dateRange: '',
    status: ''
  };
}

// 确认筛选
function confirmFilters() {
  filters.value = { ...tempFilters.value };
  showFilterPopup.value = false;
}

onMounted(() => {
  loadRecords();
});

async function loadRecords() {
  try {
    const res = await getStudentRecords();
    if (res.code === 0) {
      records.value = res.data || [];
    } else {
      showFailToast(res.message || '获取记录失败');
    }
  } catch (err) {
    console.error('获取答题记录失败:', err);
    records.value = [];
  }
}

async function onRefresh() {
  await loadRecords();
  refreshing.value = false;
}

function viewRecord(id) {
  router.push(`/student/records/${id}`);
}

function getScoreClass(score, total) {
  if (score === null || score === undefined) return '';
  const rate = score / total;
  if (rate >= 0.8) return 'good';
  if (rate >= 0.6) return 'medium';
  return 'poor';
}

function getStatusClass(status) {
  if (status === 'graded') return 'graded';
  if (status === 'submitted') return 'pending-grade';
  return '';
}

function getStatusText(status) {
  if (status === 'graded') return '已批改';
  if (status === 'submitted') return '待批改';
  return status || '未知';
}

function getSubjectTagType(subject) {
  const types = {
    '语文': '',
    '数学': 'success',
    '英语': 'danger',
    '科学': 'warning'
  };
  return types[subject] || 'info';
}
</script>

<style scoped>
/* ==================== PC端样式 ==================== */
.records-pc {
  min-height: 100%;
  background: #f5f7fa;
  padding: 24px;
}

.pc-header {
  max-width: 1200px;
  margin: 0 auto 24px;
}

.pc-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.pc-content {
  max-width: 1200px;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.filter-section {
  margin-bottom: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.record-title-pc {
  cursor: pointer;
  color: #303133;
  transition: color 0.2s;
}

.record-title-pc:hover {
  color: #409eff;
}

.pc-score {
  font-weight: 600;
  font-size: 15px;
}

.pc-score.good {
  color: #4caf50;
}

.pc-score.medium {
  color: #ff9800;
}

.pc-score.poor {
  color: #f44336;
}

.pc-time {
  color: #909399;
  font-size: 13px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* ==================== 移动端样式 ==================== */
.records-page {
  min-height: 100%;
  background: #f5f5f5;
}

.page-content {
  padding: 12px;
}

.record-card {
  margin-bottom: 12px;
}

.record-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.subject-tag {
  background: #fff3e0;
  color: #ff9800;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.record-time {
  font-size: 12px;
  color: #999;
}

.record-title {
  font-size: 16px;
  margin-bottom: 12px;
}

.record-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.score {
  font-size: 20px;
  font-weight: bold;
}

.score.good {
  color: #4caf50;
}

.score.medium {
  color: #ff9800;
}

.score.poor {
  color: #f44336;
}

.status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.status.graded {
  background: #e8f5e9;
  color: #4caf50;
}

.status.pending-grade {
  background: #fff3e0;
  color: #ff9800;
}

/* 筛选弹窗 */
.filter-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filter-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.filter-section-mobile {
  margin-bottom: 16px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 10px;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-item {
  padding: 8px 16px;
  border: 1px solid #dcdee0;
  border-radius: 4px;
  font-size: 14px;
  color: #646566;
  background: #fff;
  min-width: 60px;
  text-align: center;
}

.btn-item.active {
  background: #1989fa;
  border-color: #1989fa;
  color: #fff;
}

.filter-footer {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #ebedf0;
}

.filter-footer .van-button {
  flex: 1;
}

/* 移动端响应式优化 */
@media (max-width: 375px) {
  .record-title {
    font-size: 14px;
    margin-bottom: 8px;
  }

  .score {
    font-size: 18px;
  }
}
</style>
