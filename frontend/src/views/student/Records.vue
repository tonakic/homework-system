<template>
  <div class="records-page page">
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
          <div class="filter-section">
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
          <div class="filter-section">
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
          <div class="filter-section">
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getStudentRecords } from '@/api/auth';
import { showFailToast } from 'vant';
import { formatTime } from '@/utils/time';

const router = useRouter();
const records = ref([]);
const refreshing = ref(false);

// 筛选弹窗
const showFilterPopup = ref(false);

// 实际应用的筛选条件
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

// 筛选后的记录
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
</script>

<style scoped>
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

.filter-section {
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
