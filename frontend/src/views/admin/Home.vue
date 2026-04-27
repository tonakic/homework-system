<template>
  <!-- PC Version -->
  <div v-if="isPC" class="home-pc">
    <div class="pc-header">
      <div class="pc-header-inner">
        <div class="pc-user-info">
          <div class="pc-avatar">
            {{ userStore.userName.charAt(0) }}
          </div>
          <div class="pc-welcome">
            <h2>{{ userStore.userName }}，欢迎回来</h2>
            <p>系统运行正常，一切准备就绪</p>
          </div>
        </div>
        <el-button type="danger" plain @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          <span>退出登录</span>
        </el-button>
      </div>
    </div>

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
              <div class="pc-stat-icon teachers">
                <el-icon :size="28"><Avatar /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ stats.teachers }}</div>
                <div class="pc-stat-label">教师总数</div>
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
              <div class="pc-stat-icon exams">
                <el-icon :size="28"><Tickets /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ stats.exams }}</div>
                <div class="pc-stat-label">考试任务</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 快捷入口 -->
      <el-row :gutter="20" class="pc-actions-row">
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="router.push('/admin/teachers')">
            <div class="pc-action-item">
              <div class="pc-action-icon teachers-action">
                <el-icon :size="32"><User /></el-icon>
              </div>
              <h3>教师管理</h3>
              <p>管理教师账户信息</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="router.push('/admin/students')">
            <div class="pc-action-item">
              <div class="pc-action-icon students-action">
                <el-icon :size="32"><Avatar /></el-icon>
              </div>
              <h3>学生管理</h3>
              <p>管理学生账户信息</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="router.push('/admin/classes')">
            <div class="pc-action-item">
              <div class="pc-action-icon classes-action">
                <el-icon :size="32"><OfficeBuilding /></el-icon>
              </div>
              <h3>班级管理</h3>
              <p>管理班级信息</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="router.push('/admin/questions')">
            <div class="pc-action-item">
              <div class="pc-action-icon questions-action">
                <el-icon :size="32"><Document /></el-icon>
              </div>
              <h3>题库管理</h3>
              <p>管理题目内容</p>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="pc-actions-row">
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="router.push('/admin/exams')">
            <div class="pc-action-item">
              <div class="pc-action-icon exams-action">
                <el-icon :size="32"><Tickets /></el-icon>
              </div>
              <h3>考试管理</h3>
              <p>创建和管理考试</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="router.push('/admin/grading-config')">
            <div class="pc-action-item">
              <div class="pc-action-icon grading-action">
                <el-icon :size="32"><Edit /></el-icon>
              </div>
              <h3>批改管理</h3>
              <p>配置批改规则</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="router.push('/admin/settings')">
            <div class="pc-action-item">
              <div class="pc-action-icon settings-action">
                <el-icon :size="32"><Setting /></el-icon>
              </div>
              <h3>系统设置</h3>
              <p>配置系统参数</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="pc-action-card" @click="router.push('/admin/logs')">
            <div class="pc-action-item">
              <div class="pc-action-icon logs-action">
                <el-icon :size="32"><DocumentCopy /></el-icon>
              </div>
              <h3>操作日志</h3>
              <p>查看系统日志</p>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 系统状态 -->
      <el-card shadow="hover" class="pc-status-card">
        <template #header>
          <div class="pc-table-header">
            <h3>系统状态</h3>
            <el-tag type="success" size="small">
              <el-icon><CircleCheck /></el-icon>
              <span>运行正常</span>
            </el-tag>
          </div>
        </template>
        <el-descriptions :column="3" border class="pc-descriptions">
          <el-descriptions-item label="系统版本">
            <el-tag size="small" type="info">v1.0.0</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="数据库状态">
            <el-tag type="success" size="small">
              <el-icon><CircleCheck /></el-icon>
              <span>正常</span>
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="服务器状态">
            <el-tag type="success" size="small">
              <el-icon><CircleCheck /></el-icon>
              <span>正常</span>
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="今日登录">
            <span class="status-value">{{ stats.todayLogins || 0 }} 人次</span>
          </el-descriptions-item>
          <el-descriptions-item label="今日提交">
            <span class="status-value">{{ stats.todaySubmissions || 0 }} 份</span>
          </el-descriptions-item>
          <el-descriptions-item label="待处理任务">
            <span class="status-value pending">{{ stats.pendingTasks || 0 }} 项</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>
  </div>

  <!-- Mobile Version -->
  <div v-else class="admin-home page">
    <van-nav-bar title="管理员控制台" />

    <div class="page-content">
      <!-- 欢迎卡片 -->
      <div class="welcome-card card">
        <h2>欢迎，{{ userStore.userName }}</h2>
        <p>系统运行正常</p>
      </div>

      <!-- 统计数据 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon students">
            <van-icon name="user-o" size="20" />
          </div>
          <div class="stat-value">{{ stats.students }}</div>
          <div class="stat-label">学生总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teachers">
            <van-icon name="friends-o" size="20" />
          </div>
          <div class="stat-value">{{ stats.teachers }}</div>
          <div class="stat-label">教师总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon questions">
            <van-icon name="orders-o" size="20" />
          </div>
          <div class="stat-value">{{ stats.questions }}</div>
          <div class="stat-label">题目总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon exams">
            <van-icon name="notes-o" size="20" />
          </div>
          <div class="stat-value">{{ stats.exams }}</div>
          <div class="stat-label">考试任务</div>
        </div>
      </div>

      <!-- 菜单列表 -->
      <div class="menu-list">
        <van-cell-group inset>
          <van-cell title="教师管理" is-link to="/admin/teachers" icon="user-o" />
          <van-cell title="学生管理" is-link to="/admin/students" icon="friends-o" />
          <van-cell title="班级管理" is-link to="/admin/classes" icon="cluster-o" />
          <van-cell title="题库管理" is-link to="/admin/questions" icon="orders-o" />
          <van-cell title="考试管理" is-link to="/admin/exams" icon="notes-o" />
          <van-cell title="批改管理" is-link to="/admin/grading-config" icon="edit" />
          <van-cell title="系统设置" is-link to="/admin/settings" icon="setting-o" />
          <van-cell title="操作日志" is-link to="/admin/logs" icon="description" />
        </van-cell-group>
      </div>

      <!-- 退出登录 -->
      <div class="logout">
        <van-button type="danger" block round @click="handleLogout">
          退出登录
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { useDevice } from '@/composables/useDevice';
import api from '@/api/index';
import {
  User,
  Avatar,
  Document,
  Tickets,
  OfficeBuilding,
  Edit,
  Setting,
  DocumentCopy,
  SwitchButton,
  CircleCheck
} from '@element-plus/icons-vue';

const { isPC } = useDevice();
const router = useRouter();
const userStore = useUserStore();

const stats = ref({
  students: 0,
  teachers: 0,
  questions: 0,
  exams: 0,
  todayLogins: 0,
  todaySubmissions: 0,
  pendingTasks: 0
});

onMounted(async () => {
  try {
    const res = await api.get('/admin/stats');
    if (res.code === 0) {
      stats.value = res.data;
    }
  } catch (err) {
    console.error('获取统计数据失败:', err);
  }
});

async function handleLogout() {
  await userStore.clearUserData();
  router.push('/admin/login');
}
</script>

<style scoped>
/* ==================== Mobile Styles ==================== */
.page {
  min-height: 100%;
  background: var(--bg-color-page);
}

.page-content {
  padding: var(--spacing-md, 16px);
}

.welcome-card {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light-3) 100%);
  color: var(--fill-color-blank);
  margin-bottom: var(--spacing-md, 16px);
}

.welcome-card h2 {
  font-size: var(--font-size-large, 18px);
  margin-bottom: var(--spacing-xs, 4px);
}

.welcome-card p {
  font-size: var(--font-size-base, 14px);
  opacity: 0.9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md, 16px);
  margin-bottom: var(--spacing-md, 16px);
}

.stat-card {
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 8px);
  padding: var(--spacing-lg, 24px) var(--spacing-md, 16px);
  text-align: center;
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
}

.stat-card .stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-large, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-sm, 8px);
}

.stat-card .stat-icon.students {
  background: var(--color-success-light);
  color: var(--color-success);
}

.stat-card .stat-icon.teachers {
  background: var(--color-primary-light-8);
  color: var(--color-primary);
}

.stat-card .stat-icon.questions {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.stat-card .stat-icon.exams {
  background: #f3e5f5;
  color: #9c27b0;
}

.stat-card .stat-value {
  font-size: var(--font-size-extra-large, 20px);
  font-weight: 700;
  color: var(--text-color-primary);
  line-height: 1.2;
}

.stat-card .stat-label {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-secondary);
  margin-top: var(--spacing-xs, 4px);
}

.menu-list {
  margin-bottom: var(--spacing-md, 16px);
}

.menu-list :deep(.van-cell) {
  padding: var(--spacing-lg, 24px) var(--spacing-md, 16px);
  font-size: var(--font-size-base, 14px);
}

.menu-list :deep(.van-cell__left-icon) {
  font-size: 20px;
  margin-right: var(--spacing-md, 16px);
  display: flex;
  align-items: center;
}

.menu-list :deep(.van-cell__title) {
  display: flex;
  align-items: center;
}

.logout {
  margin-top: var(--spacing-xl, 32px);
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
  padding: var(--spacing-xl, 32px) var(--spacing-lg, 24px);
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
  border-radius: var(--border-radius-circle, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 28px;
  font-weight: bold;
  margin-right: var(--spacing-lg, 24px);
  flex-shrink: 0;
}

.pc-welcome h2 {
  font-size: var(--font-size-extra-large, 20px);
  color: var(--fill-color-blank);
  margin-bottom: var(--spacing-xs, 4px);
}

.pc-welcome p {
  font-size: var(--font-size-base, 14px);
  color: rgba(255, 255, 255, 0.85);
}

.pc-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg, 24px) var(--spacing-lg, 24px) var(--spacing-xl, 32px);
}

/* 统计卡片行 */
.pc-stats-row {
  margin-bottom: var(--spacing-lg, 24px);
}

.pc-stat-card {
  border-radius: var(--border-radius-large, 8px);
  border: none;
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
  transition: transform var(--transition-duration, 0.3s), box-shadow var(--transition-duration, 0.3s);
}

.pc-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--box-shadow, 0 2px 12px 0 rgba(0, 0, 0, 0.1));
}

.pc-stat-card :deep(.el-card__body) {
  padding: var(--spacing-lg, 24px);
}

.pc-stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 16px);
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
  background: var(--color-success-light);
  color: var(--color-success);
}

.pc-stat-icon.teachers {
  background: var(--color-primary-light-8);
  color: var(--color-primary);
}

.pc-stat-icon.questions {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.pc-stat-icon.exams {
  background: #f3e5f5;
  color: #9c27b0;
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
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-secondary);
  margin-top: var(--spacing-xs, 4px);
}

/* 快捷入口行 */
.pc-actions-row {
  margin-bottom: var(--spacing-lg, 24px);
}

.pc-action-card {
  border-radius: var(--border-radius-large, 8px);
  cursor: pointer;
  transition: transform var(--transition-duration, 0.3s), box-shadow var(--transition-duration, 0.3s);
  border: none;
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
}

.pc-action-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--box-shadow, 0 2px 12px 0 rgba(0, 0, 0, 0.1));
}

.pc-action-card :deep(.el-card__body) {
  padding: var(--spacing-lg, 24px);
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
  margin: 0 auto var(--spacing-md, 16px);
}

.pc-action-icon.teachers-action {
  background: var(--color-primary-light-8);
  color: var(--color-primary);
}

.pc-action-icon.students-action {
  background: var(--color-success-light);
  color: var(--color-success);
}

.pc-action-icon.classes-action {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.pc-action-icon.questions-action {
  background: #fff3e0;
  color: #ff9800;
}

.pc-action-icon.exams-action {
  background: #f3e5f5;
  color: #9c27b0;
}

.pc-action-icon.grading-action {
  background: #e8f5e9;
  color: #4caf50;
}

.pc-action-icon.settings-action {
  background: var(--color-info-light);
  color: var(--color-info);
}

.pc-action-icon.logs-action {
  background: #e3f2fd;
  color: #1976d2;
}

.pc-action-item h3 {
  font-size: var(--font-size-medium, 16px);
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-xs, 4px);
}

.pc-action-item p {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-secondary);
}

/* 系统状态卡片 */
.pc-status-card {
  border-radius: var(--border-radius-large, 8px);
  border: none;
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
}

.pc-status-card :deep(.el-card__header) {
  padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
  border-bottom: 1px solid var(--border-color-lighter);
}

.pc-status-card :deep(.el-card__body) {
  padding: var(--spacing-lg, 24px);
}

.pc-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pc-table-header h3 {
  font-size: var(--font-size-medium, 16px);
  color: var(--text-color-primary);
  font-weight: 600;
}

.pc-table-header .el-tag {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
}

.pc-descriptions :deep(.el-descriptions__label) {
  font-weight: 500;
  color: var(--text-color-regular);
}

.pc-descriptions :deep(.el-descriptions__content) {
  color: var(--text-color-primary);
}

.status-value {
  font-weight: 500;
  color: var(--text-color-primary);
}

.status-value.pending {
  color: var(--color-warning);
}

.pc-descriptions :deep(.el-tag) {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
}
</style>
