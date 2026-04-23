<template>
  <div class="page">
    <!-- PC Version -->
    <div v-if="isPC" class="pending-pc">
      <div class="pc-header">
        <h2>待答题</h2>
      </div>

      <div class="pc-content">
        <el-table :data="paginatedExams" v-loading="loading" style="width: 100%">
          <el-table-column prop="title" label="考试名称" min-width="200">
            <template #default="{ row }">
              <div class="exam-title-cell">
                <span class="title">{{ row.title }}</span>
                <span class="subject-tag">{{ row.subject }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="subject" label="科目" width="120" />
          <el-table-column label="截止时间" width="180">
            <template #default="{ row }">
              <span v-if="row.endTime">{{ formatTime(row.endTime) }}</span>
              <span v-else class="text-muted">无限期</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row)" size="small">{{ getStatusText(row) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="goToExam(row.id)">进入答题</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="pendingExams.length === 0 && !loading" description="暂无待答题" />

        <div v-if="pendingExams.length > pageSize" class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="pendingExams.length"
            layout="prev, pager, next"
            background
          />
        </div>
      </div>
    </div>

    <!-- Mobile Version -->
    <div v-else>
      <van-nav-bar title="待答题" left-arrow @click-left="$router.push('/student/home')" />

      <div class="page-content">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <div class="exam-list">
            <div
              v-for="exam in pendingExams"
              :key="exam.id"
              class="exam-card card"
              @click="goToExam(exam.id)"
            >
              <div class="exam-status" :class="getStatusClass(exam)">
                {{ getStatusText(exam) }}
              </div>
              <h3 class="exam-title">{{ exam.title }}</h3>
              <div class="exam-info">
                <span class="subject-tag">{{ exam.subject }}</span>
                <span class="info-item">{{ exam.questionCount }}题</span>
                <span v-if="exam.duration" class="info-item">{{ exam.duration }}分钟</span>
                <span v-else class="info-item">不限时</span>
              </div>
              <div class="exam-meta">
                <span>出题人：{{ exam.creatorName }}</span>
                <span v-if="exam.startTime">开始：{{ formatTime(exam.startTime) }}</span>
                <span v-else>开始：不限</span>
                <span v-if="exam.endTime">截止：{{ formatTime(exam.endTime) }}</span>
                <span v-else>截止：无限期</span>
              </div>
            </div>
          </div>

          <van-empty v-if="pendingExams.length === 0 && !loading" description="暂无待答题" />
        </van-pull-refresh>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getStudentExams } from '@/api/auth';
import { showFailToast } from 'vant';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();
const router = useRouter();
const pendingExams = ref([]);
const loading = ref(false);
const refreshing = ref(false);
const currentPage = ref(1);
const pageSize = 10;

const paginatedExams = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return pendingExams.value.slice(start, end);
});

onMounted(() => {
  loadPendingExams();
});

async function loadPendingExams() {
  loading.value = true;
  try {
    const res = await getStudentExams();
    if (res.code === 0) {
      pendingExams.value = res.data || [];
    } else {
      showFailToast(res.message || '获取列表失败');
    }
  } catch (err) {
    // 如果API调用失败，显示错误提示
    console.error('获取待答题列表失败:', err);
    showFailToast(err.message || '获取待答题列表失败');
    pendingExams.value = [];
  } finally {
    loading.value = false;
  }
}

async function onRefresh() {
  await loadPendingExams();
  refreshing.value = false;
}

function goToExam(id) {
  router.push(`/student/exam/${id}`);
}

function getStatusClass(exam) {
  const statusMap = {
    pending: 'info',
    ongoing: 'success',
    expired: 'danger'
  };
  return statusMap[exam.status] || 'info';
}

function getStatusTagType(exam) {
  const tagTypeMap = {
    pending: 'info',
    ongoing: 'success',
    expired: 'danger'
  };
  return tagTypeMap[exam.status] || 'info';
}

function getStatusText(exam) {
  const textMap = {
    pending: '未开始',
    ongoing: '进行中',
    expired: '已过期'
  };
  return textMap[exam.status] || '未知';
}

function formatTime(time) {
  if (!time) return '';
  // 简化时间显示
  const date = new Date(time);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${month}-${day} ${hour}:${min}`;
}
</script>

<style scoped>
/* ==================== PC Styles ==================== */
.pending-pc {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.pc-header {
  margin-bottom: 20px;
}

.pc-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.pc-content {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-height: calc(100vh - 120px);
}

.exam-title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.exam-title-cell .title {
  font-weight: 500;
}

.subject-tag {
  font-size: 12px;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.text-muted {
  color: #909399;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover > td) {
  background-color: #f5f7fa !important;
}

/* ==================== Mobile Styles ==================== */
.page-content {
  padding: 12px;
}

.exam-card {
  position: relative;
  margin-bottom: 12px;
}

.exam-status {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.exam-status.info {
  background: #e3f2fd;
  color: #1976d2;
}

.exam-status.success {
  background: #e8f5e9;
  color: #388e3c;
}

.exam-status.danger {
  background: #ffebee;
  color: #d32f2f;
}

.exam-title {
  font-size: 16px;
  margin-bottom: 8px;
  padding-right: 60px;
}

.exam-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.info-item {
  font-size: 13px;
  color: #666;
}

.exam-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

/* 移动端响应式优化 */
@media (max-width: 375px) {
  .exam-title {
    font-size: 14px;
  }

  .exam-info {
    flex-wrap: wrap;
    gap: 6px;
  }

  .info-item {
    font-size: 12px;
  }

  .exam-meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
