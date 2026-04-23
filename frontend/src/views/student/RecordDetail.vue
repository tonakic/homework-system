<template>
  <div class="record-detail page">
    <!-- PC Version -->
    <div v-if="isPC" class="record-detail-pc">
      <el-card class="header-card">
        <template #header>
          <div class="pc-header">
            <el-button text @click="$router.back()">
              <el-icon><ArrowLeft /></el-icon>
              返回
            </el-button>
            <h2 class="pc-title">答题详情</h2>
          </div>
        </template>
      </el-card>

      <el-card v-if="loading" class="content-card">
        <div class="pc-loading">
          <el-icon class="is-loading" :size="32"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
      </el-card>

      <template v-else-if="record">
        <el-card class="info-card">
          <template #header>
            <div class="card-title">{{ record.title }}</div>
          </template>
          <el-descriptions :column="4" border>
            <el-descriptions-item label="科目">{{ record.subject }}</el-descriptions-item>
            <el-descriptions-item label="得分">
              <span class="pc-score" :class="getScoreClass">{{ record.totalScore ?? '--' }}/{{ examTotalScore }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ formatTime(record.submitTime) }}</el-descriptions-item>
            <el-descriptions-item label="用时">{{ formatDuration(record.timeUsed) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="questions-card">
          <template #header>
            <div class="card-title">答题详情</div>
          </template>
          <div v-for="(q, idx) in questions" :key="q.id" class="pc-question-item">
            <div class="pc-question-header">
              <span class="pc-q-num">第{{ idx + 1 }}题</span>
              <el-tag :type="getElTypeTag(q.questionType)" size="small">{{ getTypeName(q.questionType) }}</el-tag>
              <span class="pc-q-score">{{ q.score ?? 0 }}分</span>
              <el-icon v-if="q.isCorrect" color="#67c23a" :size="18"><CircleCheck /></el-icon>
              <el-icon v-else color="#f56c6c" :size="18"><CircleClose /></el-icon>
            </div>
            <div class="pc-question-content">{{ q.content }}</div>
            <div v-if="q.options && (q.questionType === 'choice' || q.questionType === 'multiple')" class="pc-question-options">
              <div v-for="(opt, optIdx) in q.options" :key="optIdx" class="pc-opt-item" :class="getOptionClass(q, optIdx)">
                {{ optionLetters[optIdx] }}. {{ opt }}
              </div>
            </div>
            <div class="pc-answer-section">
              <div class="pc-answer-row">
                <span class="pc-answer-label">你的答案：</span>
                <span class="pc-answer-value" :class="{ 'is-correct': q.isCorrect, 'is-wrong': !q.isCorrect }">{{ formatStudentAnswer(q) }}</span>
              </div>
            </div>
            <div class="pc-answer-section correct">
              <div class="pc-answer-row">
                <span class="pc-answer-label">正确答案：</span>
                <span class="pc-answer-value is-correct">{{ formatCorrectAnswer(q.correctAnswer, q.questionType) }}</span>
              </div>
            </div>
            <div v-if="q.analysis" class="pc-analysis">
              <span class="pc-analysis-label">解析：</span>
              <span>{{ q.analysis }}</span>
            </div>
            <div v-if="q.aiComment" class="pc-ai-comment">
              <span class="pc-ai-label">AI评语：</span>
              <span>{{ q.aiComment }}</span>
            </div>
          </div>
        </el-card>
      </template>

      <el-empty v-else description="记录不存在" />
    </div>

    <!-- Mobile Version -->
    <div v-else>
      <van-nav-bar title="答题详情" left-arrow @click-left="$router.back()" />

      <div class="page-content">
        <van-loading v-if="loading" class="loading-center" />

        <template v-else-if="record">
          <div class="card">
            <h2 class="title">{{ record.title }}</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">科目</span>
                <span class="value">{{ record.subject }}</span>
              </div>
              <div class="info-item">
                <span class="label">得分</span>
                <span class="value score" :class="getScoreClass">{{ record.totalScore ?? '--' }}/{{ examTotalScore }}</span>
              </div>
              <div class="info-item">
                <span class="label">提交时间</span>
                <span class="value">{{ formatTime(record.submitTime) }}</span>
              </div>
              <div class="info-item">
                <span class="label">用时</span>
                <span class="value">{{ formatDuration(record.timeUsed) }}</span>
              </div>
            </div>
          </div>

          <div class="questions-section">
            <h3>答题详情</h3>
            <div v-for="(q, idx) in questions" :key="q.id" class="question-card card">
              <div class="question-header">
                <span class="q-num">{{ idx + 1 }}.</span>
                <van-tag :type="getTypeTag(q.questionType)" size="small">{{ getTypeName(q.questionType) }}</van-tag>
                <span class="q-score">{{ q.score ?? 0 }}分</span>
                <van-icon v-if="q.isCorrect" name="success" color="#4caf50" />
                <van-icon v-else name="cross" color="#f44336" />
              </div>
              <div class="question-content">{{ q.content }}</div>
              <div v-if="q.options && (q.questionType === 'choice' || q.questionType === 'multiple')" class="question-options">
                <div v-for="(opt, optIdx) in q.options" :key="optIdx" class="opt-item" :class="getOptionClass(q, optIdx)">
                  {{ optionLetters[optIdx] }}. {{ opt }}
                </div>
              </div>
              <div class="answer-section">
                <div class="answer-item">
                  <span class="label">你的答案：</span>
                  <span class="value" :class="{ correct: q.isCorrect, wrong: !q.isCorrect }">{{ formatStudentAnswer(q) }}</span>
                </div>
              </div>
              <div class="answer-section correct-answer">
                <div class="answer-item">
                  <span class="label">正确答案：</span>
                  <span class="value correct">{{ formatCorrectAnswer(q.correctAnswer, q.questionType) }}</span>
                </div>
              </div>
              <div v-if="q.analysis" class="analysis">
                <span class="label">解析：</span>
                <span>{{ q.analysis }}</span>
              </div>
              <!-- AI批改评语 -->
              <div v-if="q.aiComment" class="ai-comment">
                <span class="label">AI评语：</span>
                <span>{{ q.aiComment }}</span>
              </div>
            </div>
          </div>
        </template>

        <van-empty v-else description="记录不存在" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getRecordDetail } from '@/api/auth';
import { showFailToast } from 'vant';
import { formatTime } from '@/utils/time';
import { useDevice } from '@/composables/useDevice';
import { ArrowLeft, Loading, CircleCheck, CircleClose } from '@element-plus/icons-vue';

const { isPC } = useDevice();
const route = useRoute();
const record = ref(null);
const questions = ref([]);
const loading = ref(false);
const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

onMounted(() => {
  loadRecordDetail();
});

async function loadRecordDetail() {
  loading.value = true;
  try {
    const res = await getRecordDetail(route.params.id);
    if (res.code === 0) {
      record.value = res.data;
      questions.value = res.data.questions || [];
    } else {
      showFailToast(res.message || '获取详情失败');
    }
  } catch (err) {
    console.error('获取答题详情失败:', err);
    showFailToast(err.message || '获取详情失败');
  } finally {
    loading.value = false;
  }
}

const examTotalScore = computed(() => {
  // 优先使用后端返回的考试总分
  if (record.value?.examTotalScore) return record.value.examTotalScore;
  // 否则累加各题满分
  if (!questions.value.length) return 0;
  return questions.value.reduce((sum, q) => sum + (q.maxScore || q.score || 0), 0);
});

const getScoreClass = computed(() => {
  if (!record.value || record.value.totalScore === null) return '';
  const total = examTotalScore.value || 1;
  const rate = record.value.totalScore / total;
  if (rate >= 0.8) return 'good';
  if (rate >= 0.6) return 'medium';
  return 'poor';
});

function formatDuration(seconds) {
  if (!seconds) return '--';
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}分${sec}秒`;
}

function getTypeTag(type) {
  const map = { choice: 'primary', multiple: 'primary', fill: 'success', judgment: 'primary', subjective: 'warning' };
  return map[type] || 'default';
}

function getElTypeTag(type) {
  const map = { choice: 'primary', multiple: 'primary', fill: 'success', judgment: 'primary', subjective: 'warning' };
  return map[type] || 'info';
}

function getTypeName(type) {
  const map = { choice: '单选题', multiple: '多选题', fill: '填空题', judgment: '判断题', subjective: '主观题' };
  return map[type] || type;
}

function formatStudentAnswer(q) {
  const ans = q.studentAnswer;
  if (ans === null || ans === undefined) return '--';
  // 判断题特殊处理
  if (q.questionType === 'judgment') {
    if (typeof ans === 'number') {
      return ans === 0 ? '正确' : '错误';
    }
    if (typeof ans === 'string') {
      if (ans === 'A' || ans === '0') return '正确';
      if (ans === 'B' || ans === '1') return '错误';
    }
  }
  if (typeof ans === 'number') {
    return optionLetters[ans] || ans;
  }
  if (typeof ans === 'string') {
    if (ans.includes('[')) {
      try {
        const arr = JSON.parse(ans);
        return arr.join('');
      } catch (e) {}
    }
    return ans;
  }
  if (Array.isArray(ans)) {
    return ans.join('');
  }
  return String(ans);
}

function formatCorrectAnswer(ans, questionType) {
  if (!ans) return '--';
  // 判断题特殊处理
  if (questionType === 'judgment') {
    if (ans === 'A') return '正确';
    if (ans === 'B') return '错误';
    return ans;
  }
  if (typeof ans === 'string') {
    if (ans.includes('[')) {
      try {
        const arr = JSON.parse(ans);
        return arr.join('');
      } catch (e) {}
    }
    return ans;
  }
  return String(ans);
}

function getOptionClass(q, optIdx) {
  const letter = optionLetters[optIdx];
  const correct = parseCorrectAnswer(q.correctAnswer);
  const student = parseStudentAnswer(q.studentAnswer);

  const isCorrect = correct.includes(letter);
  const isSelected = student.includes(letter);

  if (isCorrect && isSelected) return 'correct';
  if (isCorrect) return 'correct-answer';
  if (isSelected) return 'wrong';
  return '';
}

function parseCorrectAnswer(ans) {
  if (!ans) return [];
  if (typeof ans === 'string') {
    if (ans.includes('[')) {
      try {
        return JSON.parse(ans);
      } catch (e) {
        return [ans];
      }
    }
    return ans.split('');
  }
  return [];
}

function parseStudentAnswer(ans) {
  if (ans === null || ans === undefined) return [];
  if (typeof ans === 'number') {
    return [optionLetters[ans]];
  }
  if (typeof ans === 'string') {
    if (ans.includes('[')) {
      try {
        return JSON.parse(ans);
      } catch (e) {}
    }
    return ans.split('');
  }
  if (Array.isArray(ans)) {
    return ans;
  }
  return [];
}
</script>

<style scoped>
/* Mobile Styles */
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

.info-item .score.good { color: #4caf50; }
.info-item .score.medium { color: #ff9800; }
.info-item .score.poor { color: #f44336; }

.info-item .status.graded { color: #4caf50; }
.info-item .status.submitted { color: #ff9800; }

.questions-section {
  margin-top: 16px;
}

.questions-section h3 {
  font-size: 16px;
  margin-bottom: 12px;
}

.question-card {
  margin-bottom: 12px;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.q-num {
  font-weight: bold;
}

.q-score {
  margin-left: auto;
  color: #ff9800;
  font-weight: bold;
}

.question-content {
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.question-options {
  margin-bottom: 12px;
}

.opt-item {
  padding: 8px 12px;
  margin-bottom: 6px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 14px;
}

.opt-item.correct {
  background: #e8f5e9;
  color: #4caf50;
  border: 1px solid #4caf50;
}

.opt-item.correct-answer {
  background: #e8f5e9;
  border: 1px solid #4caf50;
}

.opt-item.wrong {
  background: #ffebee;
  color: #f44336;
  border: 1px solid #f44336;
}

.answer-section {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 8px;
}

.answer-section.correct-answer {
  background: #e8f5e9;
  margin-bottom: 12px;
}

.answer-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.answer-item .label {
  color: #666;
  font-size: 14px;
  flex-shrink: 0;
}

.answer-item .value {
  font-weight: 500;
  word-break: break-all;
}

.answer-item .value.correct { color: #4caf50; }
.answer-item .value.wrong { color: #f44336; }

.analysis {
  padding: 12px;
  background: #e3f2fd;
  border-radius: 8px;
  font-size: 14px;
}

.analysis .label {
  color: #1976d2;
  font-weight: 500;
}

.ai-comment {
  padding: 12px;
  background: #fff3e0;
  border-radius: 8px;
  font-size: 14px;
  margin-top: 12px;
  border-left: 3px solid #ff9800;
}

.ai-comment .label {
  color: #ff9800;
  font-weight: 500;
}

/* PC Styles */
.record-detail-pc {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.pc-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pc-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.pc-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 12px;
  color: #909399;
}

.content-card {
  margin-bottom: 20px;
}

.info-card {
  margin-bottom: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

.pc-score {
  font-weight: 600;
  font-size: 16px;
}

.pc-score.good { color: #67c23a; }
.pc-score.medium { color: #e6a23c; }
.pc-score.poor { color: #f56c6c; }

.questions-card {
  margin-bottom: 20px;
}

.pc-question-item {
  padding: 20px;
  border-bottom: 1px solid #ebeef5;
}

.pc-question-item:last-child {
  border-bottom: none;
}

.pc-question-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.pc-q-num {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.pc-q-score {
  margin-left: auto;
  color: #e6a23c;
  font-weight: 600;
}

.pc-question-content {
  font-size: 15px;
  line-height: 1.8;
  color: #303133;
  margin-bottom: 16px;
}

.pc-question-options {
  margin-bottom: 16px;
}

.pc-opt-item {
  padding: 10px 16px;
  margin-bottom: 8px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 14px;
  color: #606266;
}

.pc-opt-item.correct {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #67c23a;
}

.pc-opt-item.correct-answer {
  background: #f0f9eb;
  border: 1px solid #67c23a;
}

.pc-opt-item.wrong {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #f56c6c;
}

.pc-answer-section {
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 10px;
}

.pc-answer-section.correct {
  background: #f0f9eb;
  margin-bottom: 16px;
}

.pc-answer-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.pc-answer-label {
  color: #909399;
  font-size: 14px;
  flex-shrink: 0;
}

.pc-answer-value {
  font-weight: 500;
  font-size: 14px;
  word-break: break-all;
}

.pc-answer-value.is-correct { color: #67c23a; }
.pc-answer-value.is-wrong { color: #f56c6c; }

.pc-analysis {
  padding: 12px 16px;
  background: #ecf5ff;
  border-radius: 6px;
  font-size: 14px;
  color: #409eff;
  margin-top: 12px;
}

.pc-analysis-label {
  font-weight: 600;
  color: #409eff;
}

.pc-ai-comment {
  padding: 12px 16px;
  background: #fdf6ec;
  border-radius: 6px;
  font-size: 14px;
  margin-top: 12px;
  border-left: 3px solid #e6a23c;
}

.pc-ai-label {
  font-weight: 600;
  color: #e6a23c;
}
</style>
