<template>
  <div class="student-home page">
    <div class="header">
      <div class="user-info">
        <div class="avatar">
          {{ userStore.userName.charAt(0) }}
        </div>
        <div class="welcome">
          <h2>{{ userStore.userName }}同学</h2>
          <p>今天也要加油哦！</p>
        </div>
      </div>
    </div>

    <div class="page-content">
      <!-- 待答题卡片 -->
      <div class="card" @click="goToPending">
        <div class="card-icon pending">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M8 12h8M8 8h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="card-content">
          <h3>待答题</h3>
          <p>{{ pendingCount }} 项作业等待完成</p>
        </div>
        <van-icon name="arrow" class="card-arrow" />
      </div>

      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.avgScore }}</div>
          <div class="stat-label">平均分</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.correctRate }}%</div>
          <div class="stat-label">正确率</div>
        </div>
      </div>

      <!-- 最近作业 -->
      <div class="section">
        <div class="section-header">
          <h3>最近作业</h3>
          <a @click="goToRecords">查看全部</a>
        </div>
        <div class="recent-list">
          <div
            v-for="item in recentExams"
            :key="item.id"
            class="recent-item"
            @click="viewExam(item.id)"
          >
            <div class="recent-icon" :class="item.subject">
              {{ getSubjectIcon(item.subject) }}
            </div>
            <div class="recent-info">
              <div class="recent-title">{{ item.title }}</div>
              <div class="recent-meta">
                <span>{{ item.subject }}</span>
                <span>{{ item.submitTime }}</span>
              </div>
            </div>
            <div class="recent-right">
              <span class="recent-status" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </span>
              <div v-if="item.status === 'graded'" class="recent-score" :class="getScoreClass(item.score, item.totalScore)">
                {{ item.score }}/{{ item.totalScore }}
              </div>
            </div>
          </div>
          <div v-if="recentExams.length === 0" class="empty-state">
            <p>暂无作业记录</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { getHomeStats } from '@/api/auth';
import { showFailToast } from 'vant';

const router = useRouter();
const userStore = useUserStore();

const pendingCount = ref(0);
const stats = ref({
  completed: 0,
  avgScore: 0,
  correctRate: 0
});
const recentExams = ref([]);

onMounted(() => {
  loadHomeData();
});

async function loadHomeData() {
  try {
    const res = await getHomeStats();
    if (res.code === 0) {
      pendingCount.value = res.data.pendingCount || 0;
      stats.value = res.data.stats || { completed: 0, avgScore: 0, correctRate: 0 };
      recentExams.value = res.data.recentExams || [];
    } else {
      showFailToast(res.message || '获取数据失败');
    }
  } catch (err) {
    console.error('获取首页数据失败:', err);
    showFailToast(err.message || '获取首页数据失败');
  }
}

function goToPending() {
  router.push('/student/pending');
}

function goToRecords() {
  router.push('/student/records');
}

function viewExam(id) {
  router.push(`/student/records/${id}`);
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

function getScoreClass(score, total) {
  if (score === null || score === undefined) return '';
  const rate = score / total;
  if (rate >= 0.8) return 'good';
  if (rate >= 0.6) return 'medium';
  return 'poor';
}

function getStatusClass(status) {
  if (status === 'graded') return 'graded';
  if (status === 'submitted') return 'pending';
  return '';
}

function getStatusText(status) {
  if (status === 'graded') return '已批改';
  if (status === 'submitted') return '待批改';
  return '';
}
</script>

<style scoped>
.page {
  min-height: 100%;
}

.header {
  background: linear-gradient(135deg, #ff9800 0%, #ffb74d 100%);
  padding: 20px;
  padding-top: calc(20px + env(safe-area-inset-top, 0px));
  color: white;
}

.page-content {
  padding: 12px;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar {
  width: 50px;
  height: 50px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff9800;
  font-size: 24px;
  font-weight: bold;
  margin-right: 16px;
}

.welcome h2 {
  font-size: 18px;
  margin-bottom: 4px;
}

.welcome p {
  font-size: 14px;
  opacity: 0.9;
}

/* 移动端响应式优化 */
@media (max-width: 375px) {
  .header {
    padding: 16px;
    padding-top: calc(16px + env(safe-area-inset-top, 0px));
  }

  .avatar {
    width: 40px;
    height: 40px;
    font-size: 20px;
    margin-right: 12px;
  }

  .welcome h2 {
    font-size: 16px;
  }

  .welcome p {
    font-size: 12px;
  }

  .card {
    padding: 12px;
  }

  .card-icon {
    width: 36px;
    height: 36px;
  }

  .card-content h3 {
    font-size: 14px;
  }

  .card-content p {
    font-size: 12px;
  }

  .stats-grid {
    gap: 8px;
  }

  .stat-card {
    padding: 12px;
  }

  .stat-value {
    font-size: 20px;
  }

  .stat-label {
    font-size: 11px;
  }
}

.card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.card:active {
  transform: scale(0.98);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.card-icon.pending {
  background: #fff3e0;
  color: #ff9800;
}

.card-icon svg {
  width: 24px;
  height: 24px;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  font-size: 16px;
  margin-bottom: 4px;
}

.card-content p {
  font-size: 14px;
  color: #666;
}

.card-arrow {
  color: #ccc;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #ff9800;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 16px;
}

.section-header a {
  font-size: 14px;
  color: #ff9800;
  cursor: pointer;
}

.recent-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  margin-right: 12px;
}

.recent-icon.语文 {
  background: #e3f2fd;
  color: #1976d2;
}

.recent-icon.数学 {
  background: #e8f5e9;
  color: #388e3c;
}

.recent-icon.英语 {
  background: #fce4ec;
  color: #c2185b;
}

.recent-icon.科学 {
  background: #fff3e0;
  color: #f57c00;
}

.recent-info {
  flex: 1;
}

.recent-title {
  font-size: 14px;
  margin-bottom: 4px;
}

.recent-meta {
  font-size: 12px;
  color: #999;
}

.recent-meta span {
  margin-right: 8px;
}

.recent-score {
  font-size: 16px;
  font-weight: bold;
}

.recent-score.good {
  color: #4caf50;
}

.recent-score.medium {
  color: #ff9800;
}

.recent-score.poor {
  color: #f44336;
}

.recent-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.recent-status {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

.recent-status.graded {
  background: #e8f5e9;
  color: #4caf50;
}

.recent-status.pending {
  background: #fff3e0;
  color: #ff9800;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: #999;
}
</style>
