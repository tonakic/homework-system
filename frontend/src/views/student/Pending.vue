<template>
  <div class="page">
    <!-- PC Version -->
    <div v-if="isPC" class="pending-pc">
      <div class="pc-header">
        <h1>待答题</h1>
        <p class="pc-subtitle">完成作业，提升自己</p>
      </div>

      <div class="pc-content">
        <div v-if="pendingExams.length > 0" class="pc-exam-grid">
          <div
            v-for="exam in paginatedExams"
            :key="exam.id"
            class="pc-exam-card"
            @click="goToExam(exam.id)"
          >
            <div class="pc-card-header">
              <div class="pc-subject-icon" :class="getSubjectClass(exam.subject)">
                {{ getSubjectIcon(exam.subject) }}
              </div>
              <div class="pc-status-badge" :class="getStatusClass(exam)">
                {{ getStatusText(exam) }}
              </div>
            </div>
            
            <h3 class="pc-card-title">{{ exam.title }}</h3>
            
            <div class="pc-card-info">
              <span class="pc-info-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                {{ exam.questionCount }}题
              </span>
              <span class="pc-info-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                {{ exam.duration ? exam.duration + '分钟' : '不限时' }}
              </span>
            </div>
            
            <div class="pc-card-meta">
              <span class="pc-meta-item">
                <span class="pc-meta-label">出题人</span>
                {{ exam.creatorName }}
              </span>
              <span class="pc-meta-item">
                <span class="pc-meta-label">截止</span>
                <span :class="{ 'text-danger': isUrgent(exam) }">
                  {{ exam.endTime ? formatTime(exam.endTime) : '无限期' }}
                </span>
              </span>
            </div>
            
            <div class="pc-card-action">
              <span class="pc-action-text">开始答题</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>

        <div v-if="pendingExams.length === 0 && !loading" class="pc-empty">
          <div class="pc-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          </div>
          <h3>暂无待答题</h3>
          <p>太棒了！所有作业都已完成</p>
        </div>

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
    <div v-else class="pending-mobile">
      <van-nav-bar title="待答题" left-arrow @click-left="$router.push('/student/home')">
        <template #right>
          <span class="pending-count">{{ pendingExams.length }}</span>
        </template>
      </van-nav-bar>

      <div class="page-content">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <div v-if="pendingExams.length > 0" class="exam-list">
            <div
              v-for="exam in pendingExams"
              :key="exam.id"
              class="exam-card"
              @click="goToExam(exam.id)"
            >
              <div class="card-left">
                <div class="subject-icon" :class="getSubjectClass(exam.subject)">
                  {{ getSubjectIcon(exam.subject) }}
                </div>
              </div>
              
              <div class="card-body">
                <div class="card-header">
                  <h3 class="card-title">{{ exam.title }}</h3>
                  <div class="status-badge" :class="getStatusClass(exam)">
                    {{ getStatusText(exam) }}
                  </div>
                </div>
                
                <div class="card-tags">
                  <span class="subject-tag">{{ exam.subject }}</span>
                  <span class="info-tag">{{ exam.questionCount }}题</span>
                  <span class="info-tag">{{ exam.duration ? exam.duration + '分钟' : '不限时' }}</span>
                </div>
                
                <div class="card-footer">
                  <span class="creator">{{ exam.creatorName }}</span>
                  <span class="deadline" :class="{ urgent: isUrgent(exam) }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    {{ exam.endTime ? formatTime(exam.endTime) : '无限期' }}
                  </span>
                </div>
              </div>
              
              <div class="card-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
          </div>

          <div v-if="pendingExams.length === 0 && !loading" class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <h3>暂无待答题</h3>
            <p>太棒了！所有作业都已完成</p>
          </div>
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

function getSubjectClass(subject) {
  const classMap = {
    '语文': 'subject-chinese',
    '数学': 'subject-math',
    '英语': 'subject-english',
    '科学': 'subject-science'
  };
  return classMap[subject] || 'subject-default';
}

function getSubjectIcon(subject) {
  const icons = {
    '语文': '文',
    '数学': '数',
    '英语': '英',
    '科学': '科'
  };
  return icons[subject] || '题';
}

function getStatusClass(exam) {
  const statusMap = {
    pending: 'status-pending',
    ongoing: 'status-ongoing',
    expired: 'status-expired'
  };
  return statusMap[exam.status] || 'status-pending';
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

function isUrgent(exam) {
  if (!exam.endTime) return false;
  const deadline = new Date(exam.endTime);
  const now = new Date();
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);
  return hoursLeft > 0 && hoursLeft < 24;
}

function formatTime(time) {
  if (!time) return '';
  const date = new Date(time);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${month}-${day} ${hour}:${min}`;
}
</script>

<style scoped>
/* ==================== CSS Variables ==================== */
.page {
  --card-radius: 12px;
  --icon-radius: 10px;
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
}

/* ==================== PC Styles ==================== */
.pending-pc {
  min-height: 100vh;
  background: var(--bg-color);
  padding: 24px;
}

.pc-header {
  max-width: 1200px;
  margin: 0 auto 24px;
}

.pc-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.pc-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.pc-content {
  max-width: 1200px;
  margin: 0 auto;
}

.pc-exam-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.pc-exam-card {
  background: var(--white);
  border-radius: var(--card-radius);
  padding: 20px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.pc-exam-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.pc-exam-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.pc-exam-card:hover::before {
  opacity: 1;
}

.pc-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.pc-subject-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--icon-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
}

.pc-subject-icon.subject-chinese {
  background: var(--color-primary-light-9);
  color: var(--color-primary);
}

.pc-subject-icon.subject-math {
  background: var(--color-success-light);
  color: var(--color-success);
}

.pc-subject-icon.subject-english {
  background: #fce4ec;
  color: #c2185b;
}

.pc-subject-icon.subject-science {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.pc-subject-icon.subject-default {
  background: #f3e5f5;
  color: #7b1fa2;
}

.pc-status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.pc-status-badge.status-pending {
  background: var(--color-primary-light-9);
  color: var(--color-primary);
}

.pc-status-badge.status-ongoing {
  background: var(--color-success-light);
  color: var(--color-success);
}

.pc-status-badge.status-expired {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.pc-card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
  line-height: 1.4;
}

.pc-card-info {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.pc-info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.pc-info-item svg {
  width: 16px;
  height: 16px;
  opacity: 0.6;
}

.pc-card-meta {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  margin-bottom: 12px;
}

.pc-meta-item {
  font-size: 13px;
  color: var(--text-secondary);
}

.pc-meta-label {
  color: var(--text-placeholder);
  margin-right: 4px;
}

.text-danger {
  color: var(--danger-color);
  font-weight: 500;
}

.pc-card-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: var(--white);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: opacity var(--transition-fast);
}

.pc-exam-card:hover .pc-card-action {
  opacity: 0.9;
}

.pc-card-action svg {
  width: 16px;
  height: 16px;
}

.pc-empty {
  text-align: center;
  padding: 60px 20px;
  background: var(--white);
  border-radius: var(--card-radius);
}

.pc-empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  background: var(--fill-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pc-empty-icon svg {
  width: 40px;
  height: 40px;
  color: var(--primary-color);
}

.pc-empty h3 {
  font-size: 18px;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.pc-empty p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding: 20px;
  background: var(--white);
  border-radius: var(--card-radius);
}

/* ==================== Mobile Styles ==================== */
.pending-mobile {
  min-height: 100vh;
  background: var(--bg-color);
}

.pending-count {
  background: var(--primary-color);
  color: var(--white);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.page-content {
  padding: 12px;
}

.exam-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exam-card {
  background: var(--white);
  border-radius: var(--card-radius);
  padding: 16px;
  display: flex;
  align-items: stretch;
  gap: 12px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.exam-card:active {
  transform: scale(0.98);
}

.exam-card::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--primary-color), var(--primary-light));
}

.card-left {
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.subject-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--icon-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.subject-icon.subject-chinese {
  background: var(--color-primary-light-9);
  color: var(--color-primary);
}

.subject-icon.subject-math {
  background: var(--color-success-light);
  color: var(--color-success);
}

.subject-icon.subject-english {
  background: #fce4ec;
  color: #c2185b;
}

.subject-icon.subject-science {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.subject-icon.subject-default {
  background: #f3e5f5;
  color: #7b1fa2;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.status-badge {
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

.status-badge.status-pending {
  background: var(--color-primary-light-9);
  color: var(--color-primary);
}

.status-badge.status-ongoing {
  background: var(--color-success-light);
  color: var(--color-success);
}

.status-badge.status-expired {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.subject-tag {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: var(--white);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.info-tag {
  background: var(--fill-color);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-placeholder);
}

.creator {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

.deadline {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.deadline svg {
  width: 12px;
  height: 12px;
}

.deadline.urgent {
  color: var(--danger-color);
  font-weight: 500;
}

.card-arrow {
  display: flex;
  align-items: center;
  color: var(--text-placeholder);
  padding-left: 4px;
}

.card-arrow svg {
  width: 18px;
  height: 18px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
}

.empty-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon svg {
  width: 36px;
  height: 36px;
  color: var(--primary-color);
}

.empty-state h3 {
  font-size: 16px;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.empty-state p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

/* Mobile Responsive */
@media (max-width: 375px) {
  .page-content {
    padding: 10px;
  }

  .exam-card {
    padding: 12px;
    gap: 10px;
  }

  .subject-icon {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .card-title {
    font-size: 14px;
  }

  .card-tags {
    gap: 4px;
  }

  .subject-tag,
  .info-tag {
    font-size: 10px;
    padding: 2px 6px;
  }

  .card-footer {
    font-size: 11px;
  }

  .creator {
    max-width: 80px;
  }
}
</style>
