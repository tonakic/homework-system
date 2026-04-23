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
              <el-icon color="#409eff"><CircleCheck /></el-icon>
              <span>请确保网络稳定，答案将自动保存</span>
            </li>
            <li>
              <el-icon color="#409eff"><CircleCheck /></el-icon>
              <span>答题过程中请勿切换页面</span>
            </li>
            <li>
              <el-icon color="#409eff"><CircleCheck /></el-icon>
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
        <div class="card">
          <h2 class="title">{{ exam.title }}</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">科目</span>
              <span class="value">{{ exam.subject }}</span>
            </div>
            <div class="info-item">
              <span class="label">题数</span>
              <span class="value">{{ exam.questionCount }}题</span>
            </div>
            <div class="info-item">
              <span class="label">总分</span>
              <span class="value">{{ exam.totalScore }}分</span>
            </div>
            <div class="info-item">
              <span class="label">限时</span>
              <span class="value">{{ exam.duration > 0 ? exam.duration + '分钟' : '不限时' }}</span>
            </div>
          </div>
          <div class="detail-row">
            <span class="label">出题人</span>
            <span class="value">{{ exam.creatorName }}</span>
          </div>
          <div class="detail-row" v-if="exam.startTime">
            <span class="label">开始时间</span>
            <span class="value">{{ formatTime(exam.startTime) }}</span>
          </div>
          <div class="detail-row" v-if="exam.endTime">
            <span class="label">截止时间</span>
            <span class="value">{{ formatTime(exam.endTime) }}</span>
          </div>
        </div>

        <div class="tips card">
          <h4>答题须知</h4>
          <ul>
            <li>请确保网络稳定，答案将自动保存</li>
            <li>答题过程中请勿切换页面</li>
            <li>交卷前请检查所有题目是否已答</li>
          </ul>
        </div>

        <div class="actions">
          <van-button type="primary" block round @click="startExam" :loading="starting">
            开始答题
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
.loading-center {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.title {
  font-size: 18px;
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  background: #f9f9f9;
  padding: 12px;
  border-radius: 8px;
}

.info-item .label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.info-item .value {
  font-size: 16px;
  font-weight: 500;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row .label {
  color: #666;
}

.tips h4 {
  margin-bottom: 12px;
}

.tips ul {
  padding-left: 20px;
}

.tips li {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.actions {
  margin-top: 24px;
}

/* ==================== PC 端样式 ==================== */
.exam-detail-pc {
  min-height: 100%;
  background: #f5f7fa;
}

.pc-header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
}

.pc-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pc-page-title {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.pc-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 40px 40px;
}

.pc-loading-card {
  margin-bottom: 20px;
}

.pc-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 16px;
  color: #909399;
}

.pc-info-card,
.pc-tips-card,
.pc-preview-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.pc-info-card :deep(.el-card__header),
.pc-tips-card :deep(.el-card__header),
.pc-preview-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.pc-info-card :deep(.el-card__body),
.pc-tips-card :deep(.el-card__body) {
  padding: 20px;
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
  gap: 8px;
}

.pc-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.pc-card-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.pc-descriptions {
  width: 100%;
}

.pc-descriptions :deep(.el-descriptions__label) {
  width: 100px;
  color: #606266;
  font-weight: 500;
}

.pc-info-value {
  color: #303133;
}

.pc-info-value.highlight {
  color: #ff9800;
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
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  color: #606266;
}

.pc-tips-list li:last-child {
  border-bottom: none;
}

.pc-preview-count {
  font-size: 14px;
  color: #909399;
}

.pc-score-value {
  font-weight: 600;
  color: #ff9800;
}

.pc-actions {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.pc-actions .el-button {
  min-width: 200px;
}
</style>
