<template>
  <!-- PC 版本 -->
  <div v-if="isPC" class="exam-detail-pc">
    <div class="pc-header">
      <div class="pc-header-inner">
        <h1 class="pc-page-title">作业详情</h1>
        <el-button @click="$router.push('/student/home')">
          <el-icon><ArrowLeft /></el-icon>
          返回首页
        </el-button>
      </div>
    </div>

    <div class="pc-content">
      <el-card v-if="loading" class="pc-loading-card">
        <div class="pc-loading">
          <el-icon class="is-loading" :size="32"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
      </el-card>

      <template v-else-if="exam.id">
        <!-- 作业信息卡片 -->
        <el-card shadow="hover" class="pc-info-card">
          <template #header>
            <div class="pc-card-header">
              <h2 class="pc-title">{{ exam.title }}</h2>
              <el-tag :type="getSubjectTagType(exam.subject)" size="large">
                {{ exam.subject }}
              </el-tag>
            </div>
          </template>
          <el-descriptions :column="2" border class="pc-descriptions">
            <el-descriptions-item label="科目">
              <el-tag :type="getSubjectTagType(exam.subject)" size="small">
                {{ exam.subject }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="题数">
              <span class="pc-info-value">{{ exam.questionCount }} 题</span>
            </el-descriptions-item>
            <el-descriptions-item label="总分">
              <span class="pc-info-value highlight">{{ exam.totalScore }} 分</span>
            </el-descriptions-item>
            <el-descriptions-item label="限时">
              <span class="pc-info-value">{{ exam.duration > 0 ? exam.duration + ' 分钟' : '不限时' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="出题人">
              <span class="pc-info-value">{{ exam.creatorName }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="开始时间" v-if="exam.startTime">
              <span class="pc-info-value">{{ formatTime(exam.startTime) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="截止时间" v-if="exam.endTime">
              <span class="pc-info-value">{{ formatTime(exam.endTime) }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 答题须知卡片 -->
        <el-card shadow="hover" class="pc-tips-card">
          <template #header>
            <div class="pc-card-header">
              <h3>
                <el-icon><InfoFilled /></el-icon>
                答题须知
              </h3>
            </div>
          </template>
          <ul class="pc-tips-list">
            <li>
              <el-icon :style="{ color: 'var(--color-primary)' }"><CircleCheck /></el-icon>
              <span>请确保网络稳定，答案将自动保存</span>
            </li>
            <li>
              <el-icon :style="{ color: 'var(--color-primary)' }"><CircleCheck /></el-icon>
              <span>答题过程中请勿切换页面</span>
            </li>
            <li>
              <el-icon :style="{ color: 'var(--color-primary)' }"><CircleCheck /></el-icon>
              <span>交卷前请检查所有题目是否已答</span>
            </li>
          </ul>
        </el-card>

        <!-- 考试配置预览表格（如果有题目详情） -->
        <el-card shadow="hover" class="pc-preview-card" v-if="exam.questions && exam.questions.length > 0">
          <template #header>
            <div class="pc-card-header">
              <h3>
                <el-icon><Document /></el-icon>
                题目预览
              </h3>
              <span class="pc-preview-count">共 {{ exam.questionCount }} 题</span>
            </div>
          </template>
          <el-table :data="exam.questions" style="width: 100%" stripe>
            <el-table-column type="index" label="题号" width="80" />
            <el-table-column prop="type" label="题型" width="120">
              <template #default="{ row }">
                <el-tag :type="getQuestionTypeTag(row.type)" size="small">
                  {{ getQuestionTypeText(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="content" label="题目内容" min-width="300" show-overflow-tooltip />
            <el-table-column prop="score" label="分值" width="80" align="center">
              <template #default="{ row }">
                <span class="pc-score-value">{{ row.score }} 分</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 操作按钮 -->
        <div class="pc-actions">
          <el-button type="primary" size="large" :loading="starting" @click="startExam">
            <el-icon v-if="!starting"><EditPen /></el-icon>
            {{ starting ? '正在进入...' : '开始答题' }}
          </el-button>
        </div>
      </template>

      <el-empty v-else description="考试任务不存在">
        <el-button type="primary" @click="$router.push('/student/home')">返回首页</el-button>
      </el-empty>
    </div>
  </div>

  <!-- 移动端版本 -->
  <div v-else class="exam-detail page">
    <van-nav-bar title="作业详情" left-arrow @click-left="$router.push('/student/home')" />

    <div class="page-content">
      <van-loading v-if="loading" class="loading-center" />

      <template v-else-if="exam.id">
        <!-- 作业信息卡片 -->
        <div class="exam-card card">
          <div class="exam-header">
            <h2 class="exam-title">{{ exam.title }}</h2>
            <span class="subject-badge" :class="getSubjectClass(exam.subject)">
              {{ exam.subject }}
            </span>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">题数</span>
              <span class="info-value">{{ exam.questionCount }}题</span>
            </div>
            <div class="info-item">
              <span class="info-label">总分</span>
              <span class="info-value highlight">{{ exam.totalScore }}分</span>
            </div>
            <div class="info-item">
              <span class="info-label">限时</span>
              <span class="info-value">{{ exam.duration > 0 ? exam.duration + '分钟' : '不限时' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">出题人</span>
              <span class="info-value">{{ exam.creatorName }}</span>
            </div>
          </div>

          <div class="time-info" v-if="exam.startTime || exam.endTime">
            <div class="time-row" v-if="exam.startTime">
              <span class="time-label">开始时间</span>
              <span class="time-value">{{ formatTime(exam.startTime) }}</span>
            </div>
            <div class="time-row" v-if="exam.endTime">
              <span class="time-label">截止时间</span>
              <span class="time-value">{{ formatTime(exam.endTime) }}</span>
            </div>
          </div>
        </div>

        <!-- 答题须知卡片 -->
        <div class="tips-card card">
          <h4 class="tips-title">
            <svg viewBox="0 0 24 24" fill="none" class="tips-icon">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            答题须知
          </h4>
          <ul class="tips-list">
            <li>
              <span class="tip-dot"></span>
              请确保网络稳定，答案将自动保存
            </li>
            <li>
              <span class="tip-dot"></span>
              答题过程中请勿切换页面
            </li>
            <li>
              <span class="tip-dot"></span>
              交卷前请检查所有题目是否已答
            </li>
          </ul>
        </div>

        <!-- 开始答题按钮 -->
        <div class="action-section">
          <van-button 
            type="primary" 
            block 
            round 
            size="large"
            :loading="starting" 
            @click="startExam"
            class="start-btn"
          >
            <template #icon v-if="!starting">
              <svg viewBox="0 0 24 24" fill="none" class="btn-icon">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </template>
            {{ starting ? '正在进入...' : '开始答题' }}
          </van-button>
        </div>
      </template>

      <van-empty v-else description="考试任务不存在" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getExamDetail, startExam as apiStartExam } from '@/api/auth';
import { showFailToast } from 'vant';
import { formatTime } from '@/utils/time';
import { useDevice } from '@/composables/useDevice';
import {
  ArrowLeft,
  Loading,
  InfoFilled,
  CircleCheck,
  Document,
  EditPen
} from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const { isPC } = useDevice();
const exam = ref({});
const loading = ref(false);
const starting = ref(false);

onMounted(() => {
  loadExamDetail();
});

async function loadExamDetail() {
  loading.value = true;
  try {
    const res = await getExamDetail(route.params.id);
    if (res.code === 0) {
      exam.value = res.data;
    } else {
      showFailToast(res.message || '获取详情失败');
    }
  } catch (err) {
    console.error('获取考试详情失败:', err);
    showFailToast(err.message || '获取详情失败');
  } finally {
    loading.value = false;
  }
}

async function startExam() {
  starting.value = true;
  try {
    const res = await apiStartExam(route.params.id);
    if (res.code === 0) {
      // 将考试信息存储到sessionStorage
      sessionStorage.setItem('currentExam', JSON.stringify(res.data));
      router.push(`/student/exam/${route.params.id}/start`);
    } else {
      showFailToast(res.message || '开始答题失败');
    }
  } catch (err) {
    console.error('开始答题失败:', err);
    showFailToast(err.message || '开始答题失败');
  } finally {
    starting.value = false;
  }
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

function getSubjectClass(subject) {
  const classes = {
    '语文': 'subject-chinese',
    '数学': 'subject-math',
    '英语': 'subject-english',
    '科学': 'subject-science'
  };
  return classes[subject] || 'subject-default';
}

function getQuestionTypeTag(type) {
  const types = {
    'single': 'primary',
    'multiple': 'success',
    'judge': 'warning',
    'fill': 'info',
    'essay': ''
  };
  return types[type] || 'info';
}

function getQuestionTypeText(type) {
  const texts = {
    'single': '单选题',
    'multiple': '多选题',
    'judge': '判断题',
    'fill': '填空题',
    'essay': '简答题'
  };
  return texts[type] || type;
}
</script>

<style scoped>
/* ==================== 移动端样式 ==================== */
.page {
  min-height: 100%;
  background-color: var(--bg-color);
}

.page-content {
  padding: var(--spacing-md);
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 48px;
}

/* 作业信息卡片 */
.exam-card {
  margin-bottom: var(--spacing-md);
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.exam-title {
  font-size: var(--font-size-large);
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
  flex: 1;
  margin-right: var(--spacing-sm);
  line-height: 1.4;
}

.subject-badge {
  padding: 4px 12px;
  border-radius: var(--border-radius-round);
  font-size: var(--font-size-extra-small);
  font-weight: 500;
  white-space: nowrap;
}

.subject-badge.subject-chinese {
  background-color: var(--color-primary-light-9);
  color: var(--color-primary);
}

.subject-badge.subject-math {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.subject-badge.subject-english {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

.subject-badge.subject-science {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.subject-badge.subject-default {
  background-color: var(--color-info-light);
  color: var(--color-info);
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.info-item {
  background-color: var(--fill-color);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-large);
}

.info-label {
  display: block;
  font-size: var(--font-size-extra-small);
  color: var(--text-color-secondary);
  margin-bottom: 4px;
}

.info-value {
  font-size: var(--font-size-medium);
  font-weight: 500;
  color: var(--text-color-primary);
}

.info-value.highlight {
  color: var(--color-warning);
  font-weight: 600;
}

/* 时间信息 */
.time-info {
  border-top: 1px solid var(--border-color-lighter);
  padding-top: var(--spacing-sm);
}

.time-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
}

.time-label {
  color: var(--text-color-secondary);
  font-size: var(--font-size-small);
}

.time-value {
  color: var(--text-color-regular);
  font-size: var(--font-size-small);
}

/* 答题须知卡片 */
.tips-card {
  margin-bottom: var(--spacing-md);
}

.tips-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 var(--spacing-md);
}

.tips-icon {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  font-size: var(--font-size-small);
  color: var(--text-color-regular);
  border-bottom: 1px solid var(--border-color-lighter);
}

.tips-list li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.tip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-primary);
  margin-top: 6px;
  flex-shrink: 0;
}

/* 开始答题按钮 */
.action-section {
  margin-top: var(--spacing-lg);
}

.start-btn {
  font-weight: 600;
  font-size: var(--font-size-medium);
}

.btn-icon {
  width: 18px;
  height: 18px;
  margin-right: var(--spacing-xs);
}

/* 移动端响应式优化 */
@media (max-width: 375px) {
  .page-content {
    padding: var(--spacing-sm);
  }

  .exam-title {
    font-size: var(--font-size-medium);
  }

  .info-grid {
    gap: var(--spacing-xs);
  }

  .info-item {
    padding: 10px var(--spacing-sm);
  }

  .info-value {
    font-size: var(--font-size-base);
  }

  .tips-list li {
    font-size: var(--font-size-extra-small);
  }
}

/* ==================== PC 端样式 ==================== */
.exam-detail-pc {
  min-height: 100%;
  background-color: var(--bg-color);
}

.pc-header {
  background-color: var(--fill-color-blank);
  border-bottom: 1px solid var(--border-color-light);
}

.pc-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg) 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pc-page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.pc-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg) 40px 40px;
}

.pc-loading-card {
  margin-bottom: var(--spacing-md);
}

.pc-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: var(--spacing-md);
  color: var(--text-color-secondary);
}

.pc-info-card,
.pc-tips-card,
.pc-preview-card {
  margin-bottom: var(--spacing-md);
  border-radius: 12px;
}

.pc-info-card :deep(.el-card__header),
.pc-tips-card :deep(.el-card__header),
.pc-preview-card :deep(.el-card__header) {
  padding: var(--spacing-md) 20px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.pc-info-card :deep(.el-card__body),
.pc-tips-card :deep(.el-card__body) {
  padding: var(--spacing-md);
}

.pc-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pc-card-header h2,
.pc-card-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.pc-title {
  font-size: var(--font-size-extra-large);
  font-weight: 600;
  color: var(--text-color-primary);
}

.pc-card-header h3 {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-color-primary);
}

.pc-descriptions {
  width: 100%;
}

.pc-descriptions :deep(.el-descriptions__label) {
  width: 100px;
  color: var(--text-color-regular);
  font-weight: 500;
}

.pc-info-value {
  color: var(--text-color-primary);
}

.pc-info-value.highlight {
  color: var(--color-warning);
  font-weight: 600;
}

.pc-tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.pc-tips-list li {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--border-color-lighter);
  color: var(--text-color-regular);
}

.pc-tips-list li:last-child {
  border-bottom: none;
}

.pc-preview-count {
  font-size: var(--font-size-small);
  color: var(--text-color-secondary);
}

.pc-score-value {
  font-weight: 600;
  color: var(--color-warning);
}

.pc-actions {
  display: flex;
  justify-content: center;
  padding: var(--spacing-md) 0;
}

.pc-actions .el-button {
  min-width: 200px;
}
</style>
