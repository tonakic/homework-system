<template>
  <!-- PC 版本 -->
  <div v-if="isPC" class="home-pc">
    <div class="pc-header">
      <div class="pc-header-inner">
        <div class="pc-user-info">
          <div class="pc-avatar">
            {{ userStore.userName.charAt(0) }}
          </div>
          <div class="pc-welcome">
            <h2>{{ userStore.userName }}同学，欢迎回来</h2>
            <p>今天也要加油哦！</p>
          </div>
        </div>
        <div class="pc-pending-banner" @click="goToPending">
          <el-icon :size="20"><EditPen /></el-icon>
          <span>{{ pendingCount }} 项作业等待完成</span>
          <el-icon><ArrowRight /></el-icon>
        </div>
      </div>
    </div>

    <div class="pc-content">
      <!-- 统计数据 -->
      <el-row :gutter="20" class="pc-stats-row">
        <el-col :span="6">
          <el-card shadow="hover" class="pc-stat-card">
            <div class="pc-stat-item">
              <div class="pc-stat-icon completed">
                <el-icon :size="28"><CircleCheck /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ stats.completed }}</div>
                <div class="pc-stat-label">已完成</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-stat-card">
            <div class="pc-stat-item">
              <div class="pc-stat-icon avg-score">
                <el-icon :size="28"><TrendCharts /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ stats.avgScore }}</div>
                <div class="pc-stat-label">平均分</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-stat-card">
            <div class="pc-stat-item">
              <div class="pc-stat-icon correct-rate">
                <el-icon :size="28"><SuccessFilled /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ stats.correctRate }}%</div>
                <div class="pc-stat-label">正确率</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-stat-card">
            <div class="pc-stat-item">
              <div class="pc-stat-icon pending-count">
                <el-icon :size="28"><Clock /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ pendingCount }}</div>
                <div class="pc-stat-label">待答题</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 快捷入口 -->
      <el-row :gutter="20" class="pc-actions-row">
        <el-col :span="8">
          <el-card shadow="hover" class="pc-action-card hover-lift" @click="goToPending">
            <div class="pc-action-item">
              <div class="pc-action-icon pending-action">
                <el-icon :size="32"><EditPen /></el-icon>
              </div>
              <h3>待答题</h3>
              <p>{{ pendingCount }} 项作业等待完成</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="pc-action-card hover-lift" @click="goToRecords">
            <div class="pc-action-item">
              <div class="pc-action-icon records-action">
                <el-icon :size="32"><Document /></el-icon>
              </div>
              <h3>作业记录</h3>
              <p>查看历史作业与成绩</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="pc-action-card hover-lift" @click="goToRecords">
            <div class="pc-action-item">
              <div class="pc-action-icon stats-action">
                <el-icon :size="32"><DataAnalysis /></el-icon>
              </div>
              <h3>学习统计</h3>
              <p>查看学习数据分析</p>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 最近作业 -->
      <el-card shadow="hover" class="pc-table-card">
        <template #header>
          <div class="pc-table-header">
            <h3>最近作业</h3>
            <el-button type="primary" link @click="goToRecords">查看全部</el-button>
          </div>
        </template>
        <el-table :data="recentExams" style="width: 100%" @row-click="(row) => viewExam(row.id)" class="pc-exam-table">
          <el-table-column label="科目" width="100">
            <template #default="{ row }">
              <el-tag :type="getSubjectTagType(row.subject)" size="small">
                {{ row.subject }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="作业名称" min-width="200" />
          <el-table-column label="提交时间" width="180">
            <template #default="{ row }">
              <span class="pc-time">{{ row.submitTime }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'graded' ? 'success' : 'warning'" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="成绩" width="120" align="center">
            <template #default="{ row }">
              <span v-if="row.status === 'graded'" class="pc-score" :class="getScoreClass(row.score, row.totalScore)">
                {{ row.score }}/{{ row.totalScore }}
              </span>
              <span v-else class="pc-score-pending">--</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click.stop="viewExam(row.id)">
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="recentExams.length === 0" description="暂无作业记录" />
      </el-card>
    </div>
  </div>

  <!-- 移动端版本 -->
  <div v-else class="student-home page">
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
      <div class="card card-hoverable" @click="goToPending">
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
import { useDevice } from '@/composables/useDevice';
import {
  EditPen,
  ArrowRight,
  CircleCheck,
  TrendCharts,
  SuccessFilled,
  Clock,
  Document,
  DataAnalysis
} from '@element-plus/icons-vue';

const router = useRouter();
const userStore = useUserStore();
const { isPC } = useDevice();

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

function getSubjectTagType(subject) {
  const types = {
    '语文': '',
    '数学': 'success',
    '英语': 'danger',
    '科学': 'warning'
  };
  return types[subject] || 'info';
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
/* ==================== 移动端样式 ==================== */
.page {
  min-height: 100%;
  background-color: var(--bg-color);
}

.header {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light-3));
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
  background: var(--fill-color-blank);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
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
  background-color: var(--fill-color-blank);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all var(--transition-duration) var(--transition-timing-function);
  box-shadow: var(--box-shadow-light);
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
  background-color: var(--color-primary-light-9);
  color: var(--color-primary);
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
  color: var(--text-color-primary);
}

.card-content p {
  font-size: 14px;
  color: var(--text-color-secondary);
}

.card-arrow {
  color: var(--text-color-placeholder);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background-color: var(--fill-color-blank);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: var(--box-shadow-light);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--color-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 4px;
}

.section {
  background-color: var(--fill-color-blank);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--box-shadow-light);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 16px;
  color: var(--text-color-primary);
}

.section-header a {
  font-size: 14px;
  color: var(--color-primary);
  cursor: pointer;
}

.recent-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color-lighter);
  cursor: pointer;
  transition: background-color var(--transition-duration);
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-item:active {
  background-color: var(--fill-color);
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
  background-color: var(--color-primary-light-9);
  color: var(--color-primary);
}

.recent-icon.数学 {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.recent-icon.英语 {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

.recent-icon.科学 {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.recent-info {
  flex: 1;
}

.recent-title {
  font-size: 14px;
  margin-bottom: 4px;
  color: var(--text-color-primary);
}

.recent-meta {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.recent-meta span {
  margin-right: 8px;
}

.recent-score {
  font-size: 16px;
  font-weight: bold;
}

.recent-score.good {
  color: var(--color-success);
}

.recent-score.medium {
  color: var(--color-warning);
}

.recent-score.poor {
  color: var(--color-danger);
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
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.recent-status.pending {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--text-color-secondary);
}

/* ==================== PC 端样式 ==================== */
.home-pc {
  min-height: 100%;
  background-color: var(--bg-color);
}

.pc-header {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light-3));
  padding: 0;
}

.pc-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pc-user-info {
  display: flex;
  align-items: center;
}

.pc-avatar {
  width: 64px;
  height: 64px;
  background: var(--fill-color-blank);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 28px;
  font-weight: bold;
  margin-right: 20px;
  flex-shrink: 0;
}

.pc-welcome h2 {
  font-size: 24px;
  color: white;
  margin-bottom: 6px;
}

.pc-welcome p {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
}

.pc-pending-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  padding: 12px 24px;
  border-radius: 40px;
  color: white;
  font-size: 15px;
  cursor: pointer;
  transition: background var(--transition-duration);
}

.pc-pending-banner:hover {
  background: rgba(255, 255, 255, 0.3);
}

.pc-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 40px 40px;
}

/* 统计卡片行 */
.pc-stats-row {
  margin-bottom: 20px;
}

.pc-stat-card {
  border-radius: 12px;
}

.pc-stat-card :deep(.el-card__body) {
  padding: 20px;
}

.pc-stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pc-stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pc-stat-icon.completed {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.pc-stat-icon.avg-score {
  background-color: var(--color-primary-light-9);
  color: var(--color-primary);
}

.pc-stat-icon.correct-rate {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

.pc-stat-icon.pending-count {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.pc-stat-detail {
  flex: 1;
}

.pc-stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color-primary);
  line-height: 1.2;
}

.pc-stat-label {
  font-size: 13px;
  color: var(--text-color-secondary);
  margin-top: 4px;
}

/* 快捷入口行 */
.pc-actions-row {
  margin-bottom: 20px;
}

.pc-action-card {
  border-radius: 12px;
  cursor: pointer;
}

.pc-action-card :deep(.el-card__body) {
  padding: 24px;
}

.pc-action-item {
  text-align: center;
}

.pc-action-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}

.pc-action-icon.pending-action {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.pc-action-icon.records-action {
  background-color: var(--color-primary-light-9);
  color: var(--color-primary);
}

.pc-action-icon.stats-action {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

.pc-action-item h3 {
  font-size: 16px;
  color: var(--text-color-primary);
  margin-bottom: 6px;
}

.pc-action-item p {
  font-size: 13px;
  color: var(--text-color-secondary);
}

/* 表格卡片 */
.pc-table-card {
  border-radius: 12px;
}

.pc-table-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.pc-table-card :deep(.el-card__body) {
  padding: 0;
}

.pc-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pc-table-header h3 {
  font-size: 17px;
  color: var(--text-color-primary);
  font-weight: 600;
}

.pc-exam-table {
  cursor: pointer;
}

.pc-exam-table :deep(.el-table__row) {
  transition: background-color var(--transition-duration);
}

.pc-exam-table :deep(.el-table__row:hover) {
  background-color: var(--color-primary-light-9);
}

.pc-time {
  color: var(--text-color-secondary);
  font-size: 13px;
}

.pc-score {
  font-weight: 600;
  font-size: 15px;
}

.pc-score.good {
  color: var(--color-success);
}

.pc-score.medium {
  color: var(--color-warning);
}

.pc-score.poor {
  color: var(--color-danger);
}

.pc-score-pending {
  color: var(--text-color-disabled);
}
</style>