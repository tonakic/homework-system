<template>
  <div class="pending-page page">
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
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getStudentExams } from '@/api/auth';
import { showFailToast } from 'vant';

const router = useRouter();
const pendingExams = ref([]);
const loading = ref(false);
const refreshing = ref(false);

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
.pending-page {
  min-height: 100%;
  background: #f5f5f5;
}

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

.subject-tag {
  background: #fff3e0;
  color: #ff9800;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
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
