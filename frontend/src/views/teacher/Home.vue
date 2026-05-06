<template>
  <!-- PC Version -->
  <div v-if="isPC" class="home-pc">
    <div class="pc-content">
      <!-- 统计数据 -->
      <el-row :gutter="20" class="pc-stats-row">
        <el-col :span="6">
          <el-card shadow="hover" class="pc-stat-card">
            <div class="pc-stat-item">
              <div class="pc-stat-icon students">
                <el-icon :size="28"><User /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ stats.students }}</div>
                <div class="pc-stat-label">学生总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-stat-card">
            <div class="pc-stat-item">
              <div class="pc-stat-icon exams">
                <el-icon :size="28"><EditPen /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ stats.exams }}</div>
                <div class="pc-stat-label">考试总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-stat-card">
            <div class="pc-stat-item">
              <div class="pc-stat-icon questions">
                <el-icon :size="28"><Document /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ stats.questions }}</div>
                <div class="pc-stat-label">题目总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-stat-card">
            <div class="pc-stat-item">
              <div class="pc-stat-icon pending">
                <el-icon :size="28"><Clock /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ stats.pendingGrading }}</div>
                <div class="pc-stat-label">待批改</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 快捷入口 -->
      <el-row :gutter="20" class="pc-actions-row">
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="$router.push('/teacher/students')">
            <div class="pc-action-item">
              <div class="pc-action-icon students-action">
                <el-icon :size="32"><User /></el-icon>
              </div>
              <h3>学生管理</h3>
              <p>管理学生信息</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="$router.push('/teacher/questions')">
            <div class="pc-action-item">
              <div class="pc-action-icon questions-action">
                <el-icon :size="32"><Document /></el-icon>
              </div>
              <h3>题库管理</h3>
              <p>管理题目内容</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="$router.push('/teacher/exams')">
            <div class="pc-action-item">
              <div class="pc-action-icon exams-action">
                <el-icon :size="32"><EditPen /></el-icon>
              </div>
              <h3>考试管理</h3>
              <p>创建和管理考试</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="$router.push('/teacher/grading')">
            <div class="pc-action-item">
              <div class="pc-action-icon grading-action">
                <el-icon :size="32"><Checked /></el-icon>
              </div>
              <h3>批改任务</h3>
              <p>批改学生答卷</p>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 最近考试 -->
      <el-card shadow="hover" class="pc-table-card">
        <template #header>
          <div class="pc-table-header">
            <h3>最近考试</h3>
            <el-button type="primary" link @click="$router.push('/teacher/exams')">查看全部</el-button>
          </div>
        </template>
        <el-table :data="recentExams" style="width: 100%" class="pc-exam-table">
          <el-table-column label="科目" width="100">
            <template #default="{ row }">
              <el-tag :type="getSubjectTagType(row.subject)" size="small">
                {{ row.subject }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="考试名称" min-width="200" />
          <el-table-column label="状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                {{ row.status === 'active' ? '进行中' : '已结束' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="参与人数" width="120" align="center">
            <template #default="{ row }">
              <span>{{ row.submittedCount }}/{{ row.totalCount }}</span>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">
              <span class="pc-time">{{ row.createTime }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="viewExam(row.id)">
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="recentExams.length === 0" description="暂无考试记录" />
      </el-card>
    </div>
  </div>

  <!-- Mobile Version -->
  <div v-else class="teacher-home page">
    <van-nav-bar title="教师端首页" />

    <div class="page-content">
      <div class="welcome-card card">
        <h2>欢迎，{{ userStore.userName }}</h2>
        <p>今天也要加油工作哦！</p>
      </div>

      <div class="menu-grid">
        <div class="menu-item" @click="$router.push('/teacher/students')">
          <van-icon name="user-o" size="24" />
          <span>学生管理</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/questions')">
          <van-icon name="orders-o" size="24" />
          <span>题库管理</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/exams')">
          <van-icon name="edit" size="24" />
          <span>考试管理</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/grading')">
          <van-icon name="checked" size="24" />
          <span>批改任务</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/ranking/detail')">
          <van-icon name="medal-o" size="24" />
          <span>排行榜</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/statistics')">
          <van-icon name="chart-trending-o" size="24" />
          <span>数据统计</span>
        </div>
        <div class="menu-item" @click="$router.push('/teacher/profile')">
          <van-icon name="setting-o" size="24" />
          <span>个人设置</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { useDevice } from '@/composables/useDevice';
import {
  User,
  EditPen,
  Document,
  Clock,
  Checked
} from '@element-plus/icons-vue';

const router = useRouter();
const userStore = useUserStore();
const { isPC } = useDevice();

const stats = ref({
  students: 0,
  exams: 0,
  questions: 0,
  pendingGrading: 0
});

const recentExams = ref([]);

onMounted(() => {
  loadHomeData();
});

async function loadHomeData() {
  // TODO: 实际API调用
  // 模拟数据
  stats.value = {
    students: 128,
    exams: 24,
    questions: 356,
    pendingGrading: 12
  };

  recentExams.value = [
    {
      id: 1,
      title: '三年级数学期中考试',
      subject: '数学',
      status: 'active',
      submittedCount: 35,
      totalCount: 42,
      createTime: '2024-04-15 10:30'
    },
    {
      id: 2,
      title: '三年级语文单元测试',
      subject: '语文',
      status: 'ended',
      submittedCount: 40,
      totalCount: 42,
      createTime: '2024-04-12 14:00'
    },
    {
      id: 3,
      title: '三年级英语单词测验',
      subject: '英语',
      status: 'ended',
      submittedCount: 38,
      totalCount: 42,
      createTime: '2024-04-10 09:00'
    }
  ];
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

function viewExam(id) {
  router.push(`/teacher/exams/${id}`);
}
</script>

<style scoped>
/* ==================== Mobile Styles ==================== */
.welcome-card {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light-3));
  color: white;
  margin-bottom: 16px;
}

.welcome-card h2 {
  font-size: 20px;
  margin-bottom: 8px;
}

.welcome-card p {
  font-size: 14px;
  opacity: 0.9;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.menu-item {
  background: var(--fill-color-blank);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.menu-item:active {
  transform: scale(0.95);
}

.menu-item span {
  font-size: 14px;
  color: var(--text-color-primary);
}

.menu-item .van-icon {
  color: var(--color-primary);
}

/* ==================== PC Styles ==================== */
.home-pc {
  min-height: 100%;
  background: var(--bg-color);
}

.pc-header {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light-3) 100%);
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
  color: var(--fill-color-blank);
  margin-bottom: 6px;
}

.pc-welcome p {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
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

.pc-stat-icon.students {
  background: var(--color-primary-light-9);
  color: var(--color-primary);
}

.pc-stat-icon.exams {
  background: var(--color-success-light-9);
  color: var(--color-success);
}

.pc-stat-icon.questions {
  background: var(--color-warning-light-9);
  color: var(--color-warning);
}

.pc-stat-icon.pending {
  background: var(--color-danger-light-9);
  color: var(--color-danger);
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
  transition: transform 0.2s, box-shadow 0.2s;
}

.pc-action-card:hover {
  transform: translateY(-2px);
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

.pc-action-icon.students-action {
  background: var(--color-primary-light-9);
  color: var(--color-primary);
}

.pc-action-icon.questions-action {
  background: var(--color-warning-light-9);
  color: var(--color-warning);
}

.pc-action-icon.exams-action {
  background: var(--color-success-light-9);
  color: var(--color-success);
}

.pc-action-icon.grading-action {
  background: #f3e5f5;
  color: #9c27b0;
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
  transition: background-color 0.15s;
}

.pc-exam-table :deep(.el-table__row:hover) {
  background-color: var(--color-primary-light-9);
}

.pc-time {
  color: var(--text-color-secondary);
  font-size: 13px;
}
</style>
