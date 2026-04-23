<template>
  <div class="admin-home page">
    <!-- PC端 -->
    <div v-if="isPC" class="admin-home-pc">
      <div class="header">
        <h1>管理员控制台</h1>
        <el-button type="danger" @click="handleLogout">退出登录</el-button>
      </div>

      <div class="content">
        <!-- 统计卡片 -->
        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #4caf50 0%, #81c784 100%);">
                <el-icon size="28"><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.students }}</div>
                <div class="stat-label">学生总数</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #2196f3 0%, #64b5f6 100%);">
                <el-icon size="28"><Avatar /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.teachers }}</div>
                <div class="stat-label">教师总数</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #ff9800 0%, #ffb74d 100%);">
                <el-icon size="28"><Document /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.questions }}</div>
                <div class="stat-label">题目总数</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%);">
                <el-icon size="28"><Tickets /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.exams }}</div>
                <div class="stat-label">考试任务</div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 快捷操作 -->
        <el-card shadow="never" class="quick-actions">
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-button class="action-btn" @click="router.push('/admin/teachers')">
                <el-icon><User /></el-icon>
                <span>教师管理</span>
              </el-button>
            </el-col>
            <el-col :span="6">
              <el-button class="action-btn" @click="router.push('/admin/students')">
                <el-icon><Avatar /></el-icon>
                <span>学生管理</span>
              </el-button>
            </el-col>
            <el-col :span="6">
              <el-button class="action-btn" @click="router.push('/admin/classes')">
                <el-icon><OfficeBuilding /></el-icon>
                <span>班级管理</span>
              </el-button>
            </el-col>
            <el-col :span="6">
              <el-button class="action-btn" @click="router.push('/admin/questions')">
                <el-icon><Document /></el-icon>
                <span>题库管理</span>
              </el-button>
            </el-col>
          </el-row>
          <el-row :gutter="16" style="margin-top: 16px;">
            <el-col :span="6">
              <el-button class="action-btn" @click="router.push('/admin/exams')">
                <el-icon><Tickets /></el-icon>
                <span>考试管理</span>
              </el-button>
            </el-col>
            <el-col :span="6">
              <el-button class="action-btn" @click="router.push('/admin/grading-config')">
                <el-icon><Edit /></el-icon>
                <span>批改管理</span>
              </el-button>
            </el-col>
            <el-col :span="6">
              <el-button class="action-btn" @click="router.push('/admin/settings')">
                <el-icon><Setting /></el-icon>
                <span>系统设置</span>
              </el-button>
            </el-col>
            <el-col :span="6">
              <el-button class="action-btn" @click="router.push('/admin/logs')">
                <el-icon><DocumentCopy /></el-icon>
                <span>操作日志</span>
              </el-button>
            </el-col>
          </el-row>
        </el-card>

        <!-- 系统状态 -->
        <el-card shadow="never" class="system-status">
          <template #header>
            <div class="card-header">
              <span>系统状态</span>
              <el-tag type="success" size="small">运行正常</el-tag>
            </div>
          </template>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="系统版本">v1.0.0</el-descriptions-item>
            <el-descriptions-item label="数据库状态">
              <el-tag type="success" size="small">正常</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="服务器状态">
              <el-tag type="success" size="small">正常</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="今日登录">{{ stats.todayLogins || 0 }} 人次</el-descriptions-item>
            <el-descriptions-item label="今日提交">{{ stats.todaySubmissions || 0 }} 份</el-descriptions-item>
            <el-descriptions-item label="待处理任务">{{ stats.pendingTasks || 0 }} 项</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>
    </div>

    <!-- 移动端 -->
    <div v-else>
      <van-nav-bar title="管理员控制台" />

      <div class="page-content">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ stats.students }}</div>
            <div class="stat-label">学生总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.teachers }}</div>
            <div class="stat-label">教师总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.questions }}</div>
            <div class="stat-label">题目总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.exams }}</div>
            <div class="stat-label">考试任务</div>
          </div>
        </div>

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

        <div class="logout">
          <van-button type="danger" block round @click="handleLogout">
            退出登录
          </van-button>
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
import api from '@/api/index';
import {
  User,
  Avatar,
  Document,
  Tickets,
  OfficeBuilding,
  Edit,
  Setting,
  DocumentCopy
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
/* PC端样式 */
.admin-home-pc {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
  box-sizing: border-box;
}

.admin-home-pc .header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 10px;
}

.admin-home-pc .header h1 {
  font-size: 24px;
  color: #333;
  margin: 0;
  font-weight: 600;
}

.admin-home-pc .content {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-row {
  margin-bottom: 20px;
}

.admin-home-pc .stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 12px;
}

.admin-home-pc .stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  padding: 20px;
  width: 100%;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 16px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.admin-home-pc .stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  line-height: 1.2;
}

.admin-home-pc .stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}

.quick-actions {
  margin-bottom: 20px;
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.action-btn {
  width: 100%;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  color: #606266;
  font-size: 14px;
  transition: all 0.3s;
}

.action-btn:hover {
  background: #4caf50;
  border-color: #4caf50;
  color: white;
}

.action-btn .el-icon {
  font-size: 24px;
}

.system-status {
  border-radius: 12px;
}

.system-status :deep(.el-descriptions__label) {
  font-weight: 500;
}

/* 移动端样式 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #4caf50;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.menu-list {
  margin-bottom: 16px;
}

.menu-list :deep(.van-cell) {
  padding: 24px 16px;
  font-size: 16px;
}

.menu-list :deep(.van-cell__left-icon) {
  font-size: 22px;
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.menu-list :deep(.van-cell__title) {
  display: flex;
  align-items: center;
}

.logout {
  margin-top: 32px;
}
</style>
