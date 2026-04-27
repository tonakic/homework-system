<template>
  <div class="record-detail page">
    <!-- PC Version -->
    <div v-if="isPC" class="record-detail-pc">
      <div class="pc-header">
        <el-button text @click="$router.back()" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1 class="pc-title">答题详情</h1>
      </div>

      <div v-if="loading" class="pc-loading">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <template v-else-if="record">
        <!-- 考试信息卡片 -->
        <div class="info-card">
          <div class="info-card-header">
            <h2 class="exam-title">{{ record.title }}</h2>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">科目</span>
              <span class="info-value">{{ record.subject }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">得分</span>
              <span class="info-value score" :class="getScoreClass">
                {{ record.totalScore ?? '--' }}/{{ examTotalScore }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">提交时间</span>
              <span class="info-value">{{ formatTime(record.submitTime) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">用时</span>
              <span class="info-value">{{ formatDuration(record.timeUsed) }}</span>
            </div>
          </div>
        </div>

        <!-- 答题详情 -->
        <div class="questions-section">
          <div class="section-header">
            <h3 class="section-title">答题详情</h3>
            <span class="question-count">共 {{ questions.length }} 题</span>
          </div>

          <div v-for="(q, idx) in questions" :key="q.id" class="question-item">
            <!-- 题目头部 -->
            <div class="question-header">
              <div class="question-meta">
                <span class="question-num">第{{ idx + 1 }}题</span>
                <el-tag :type="getElTypeTag(q.questionType)" size="small">
                  {{ getTypeName(q.questionType) }}
                </el-tag>
              </div>
              <div class="question-score-wrapper">
                <span class="question-score">{{ q.score ?? 0 }}分</span>
                <el-icon v-if="q.isCorrect" class="result-icon correct">
                  <CircleCheck />
                </el-icon>
                <el-icon v-else class="result-icon wrong">
                  <CircleClose />
                </el-icon>
              </div>
            </div>

            <!-- 题目内容 -->
            <div class="question-content">{{ q.content }}</div>

            <!-- 选项（选择题/多选题） -->
            <div v-if="q.options && (q.questionType === 'choice' || q.questionType === 'multiple')" class="options-list">
              <div
                v-for="(opt, optIdx) in q.options"
                :key="optIdx"
                class="option-item"
                :class="getOptionClass(q, optIdx)"
              >
                <span class="option-letter">{{ optionLetters[optIdx] }}</span>
                <span class="option-text">{{ opt }}</span>
              </div>
            </div>

            <!-- 答案对比区域 -->
            <div class="answer-compare">
              <div class="answer-row student-answer">
                <span class="answer-label">你的答案</span>
                <span class="answer-value" :class="{ correct: q.isCorrect, wrong: !q.isCorrect }">
                  {{ formatStudentAnswer(q) }}
                </span>
              </div>
              <div class="answer-row correct-answer">
                <span class="answer-label">正确答案</span>
                <span class="answer-value correct">
                  {{ formatCorrectAnswer(q.correctAnswer, q.questionType) }}
                </span>
              </div>
            </div>

            <!-- 解析 -->
            <div v-if="q.analysis" class="analysis-section">
              <div class="analysis-header">
                <span class="analysis-icon">💡</span>
                <span class="analysis-title">解析</span>
              </div>
              <div class="analysis-content">{{ q.analysis }}</div>
            </div>

            <!-- AI评语 -->
            <div v-if="q.aiComment" class="ai-comment-section">
              <div class="ai-comment-header">
                <span class="ai-icon">🤖</span>
                <span class="ai-title">AI评语</span>
              </div>
              <div class="ai-comment-content">{{ q.aiComment }}</div>
            </div>
          </div>
        </div>
      </template>

      <el-empty v-else description="记录不存在" />
    </div>

    <!-- Mobile Version -->
    <div v-else class="record-detail-mobile">
      <van-nav-bar title="答题详情" left-arrow @click-left="$router.back()" />

      <div class="page-content">
        <van-loading v-if="loading" class="loading-center" />

        <template v-else-if="record">
          <!-- 考试信息卡片 -->
          <div class="info-card">
            <h2 class="exam-title">{{ record.title }}</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">科目</span>
                <span class="info-value">{{ record.subject }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">得分</span>
                <span class="info-value score" :class="getScoreClass">
                  {{ record.totalScore ?? '--' }}/{{ examTotalScore }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">提交时间</span>
                <span class="info-value">{{ formatTime(record.submitTime) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">用时</span>
                <span class="info-value">{{ formatDuration(record.timeUsed) }}</span>
              </div>
            </div>
          </div>

          <!-- 答题详情 -->
          <div class="questions-section">
            <div class="section-header">
              <h3 class="section-title">答题详情</h3>
              <span class="question-count">共 {{ questions.length }} 题</span>
            </div>

            <div v-for="(q, idx) in questions" :key="q.id" class="question-card">
              <!-- 题目头部 -->
              <div class="question-header">
                <div class="question-meta">
                  <span class="question-num">{{ idx + 1 }}.</span>
                  <van-tag :type="getTypeTag(q.questionType)" size="small">
                    {{ getTypeName(q.questionType) }}
                  </van-tag>
                </div>
                <div class="question-score-wrapper">
                  <span class="question-score">{{ q.score ?? 0 }}分</span>
                  <van-icon v-if="q.isCorrect" name="success" class="result-icon correct" />
                  <van-icon v-else name="cross" class="result-icon wrong" />
                </div>
              </div>

              <!-- 题目内容 -->
              <div class="question-content">{{ q.content }}</div>

              <!-- 选项（选择题/多选题） -->
              <div v-if="q.options && (q.questionType === 'choice' || q.questionType === 'multiple')" class="options-list">
                <div
                  v-for="(opt, optIdx) in q.options"
                  :key="optIdx"
                  class="option-item"
                  :class="getOptionClass(q, optIdx)"
                >
                  <span class="option-letter">{{ optionLetters[optIdx] }}</span>
                  <span class="option-text">{{ opt }}</span>
                </div>
              </div>

              <!-- 答案对比区域 -->
              <div class="answer-compare">
                <div class="answer-row student-answer">
                  <span class="answer-label">你的答案</span>
                  <span class="answer-value" :class="{ correct: q.isCorrect, wrong: !q.isCorrect }">
                    {{ formatStudentAnswer(q) }}
                  </span>
                </div>
                <div class="answer-row correct-answer">
                  <span class="answer-label">正确答案</span>
                  <span class="answer-value correct">
                    {{ formatCorrectAnswer(q.correctAnswer, q.questionType) }}
                  </span>
                </div>
              </div>

              <!-- 解析 -->
              <div v-if="q.analysis" class="analysis-section">
                <div class="analysis-header">
                  <span class="analysis-icon">💡</span>
                  <span class="analysis-title">解析</span>
                </div>
                <div class="analysis-content">{{ q.analysis }}</div>
              </div>

              <!-- AI评语 -->
              <div v-if="q.aiComment" class="ai-comment-section">
                <div class="ai-comment-header">
                  <span class="ai-icon">🤖</span>
                  <span class="ai-title">AI评语</span>
                </div>
                <div class="ai-comment-content">{{ q.aiComment }}</div>
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
/* ==================== CSS 变量引用 ==================== */
.record-detail {
  min-height: 100%;
  background-color: var(--bg-color);
}

/* ==================== PC端样式 ==================== */
.record-detail-pc {
  min-height: 100%;
  background-color: var(--bg-color);
  padding: var(--spacing-lg);
  max-width: 1000px;
  margin: 0 auto;
}

.pc-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--text-color-secondary);
  transition: color var(--transition-duration) var(--transition-timing-function);
}

.back-btn:hover {
  color: var(--color-primary);
}

.pc-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.pc-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: var(--spacing-md);
  color: var(--text-color-secondary);
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large);
}

/* 信息卡片 */
.info-card {
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--box-shadow-light);
}

.info-card-header {
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color-lighter);
}

.exam-title {
  font-size: var(--font-size-large);
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.info-label {
  font-size: var(--font-size-extra-small);
  color: var(--text-color-secondary);
}

.info-value {
  font-size: var(--font-size-medium);
  font-weight: 500;
  color: var(--text-color-primary);
}

.info-value.score.good {
  color: var(--color-success);
}

.info-value.score.medium {
  color: var(--color-warning);
}

.info-value.score.poor {
  color: var(--color-danger);
}

/* 答题详情区域 */
.questions-section {
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-lg);
  box-shadow: var(--box-shadow-light);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color-lighter);
}

.section-title {
  font-size: var(--font-size-medium);
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.question-count {
  font-size: var(--font-size-small);
  color: var(--text-color-secondary);
}

/* 题目卡片 */
.question-item {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color-lighter);
}

.question-item:last-child {
  border-bottom: none;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.question-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.question-num {
  font-weight: 600;
  font-size: var(--font-size-medium);
  color: var(--text-color-primary);
}

.question-score-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.question-score {
  font-weight: 600;
  color: var(--color-warning);
}

.result-icon {
  font-size: 18px;
}

.result-icon.correct {
  color: var(--color-success);
}

.result-icon.wrong {
  color: var(--color-danger);
}

.question-content {
  font-size: var(--font-size-base);
  line-height: 1.8;
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-md);
}

/* 选项列表 */
.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.option-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--fill-color);
  border-radius: var(--border-radius-base);
  border: 1px solid transparent;
  transition: all var(--transition-duration) var(--transition-timing-function);
}

.option-item.correct {
  background-color: var(--color-success-light);
  border-color: var(--color-success);
}

.option-item.correct .option-letter,
.option-item.correct .option-text {
  color: var(--color-success);
}

.option-item.correct-answer {
  background-color: var(--color-success-light);
  border-color: var(--color-success);
}

.option-item.wrong {
  background-color: var(--color-danger-light);
  border-color: var(--color-danger);
}

.option-item.wrong .option-letter,
.option-item.wrong .option-text {
  color: var(--color-danger);
}

.option-letter {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--border-color);
  border-radius: 50%;
  font-size: var(--font-size-extra-small);
  font-weight: 600;
  flex-shrink: 0;
}

.option-text {
  font-size: var(--font-size-base);
  color: var(--text-color-regular);
  line-height: 1.5;
}

/* 答案对比区域 */
.answer-compare {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.answer-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--fill-color);
  border-radius: var(--border-radius-base);
}

.answer-row.correct-answer {
  background-color: var(--color-success-light);
}

.answer-label {
  font-size: var(--font-size-base);
  color: var(--text-color-secondary);
  flex-shrink: 0;
  min-width: 70px;
}

.answer-value {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text-color-primary);
  word-break: break-all;
}

.answer-value.correct {
  color: var(--color-success);
}

.answer-value.wrong {
  color: var(--color-danger);
}

/* 解析区域 */
.analysis-section {
  padding: var(--spacing-md);
  background-color: var(--color-primary-light-9);
  border-radius: var(--border-radius-base);
  margin-bottom: var(--spacing-sm);
}

.analysis-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
}

.analysis-icon {
  font-size: 16px;
}

.analysis-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-primary);
}

.analysis-content {
  font-size: var(--font-size-base);
  color: var(--text-color-regular);
  line-height: 1.6;
}

/* AI评语区域 */
.ai-comment-section {
  padding: var(--spacing-md);
  background-color: var(--color-warning-light);
  border-radius: var(--border-radius-base);
  border-left: 3px solid var(--color-warning);
}

.ai-comment-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
}

.ai-icon {
  font-size: 16px;
}

.ai-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-warning);
}

.ai-comment-content {
  font-size: var(--font-size-base);
  color: var(--text-color-regular);
  line-height: 1.6;
}

/* ==================== 移动端样式 ==================== */
.record-detail-mobile {
  min-height: 100%;
  background-color: var(--bg-color);
}

.page-content {
  padding: var(--spacing-sm);
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 40px;
}

/* 移动端信息卡片 */
.record-detail-mobile .info-card {
  padding: var(--spacing-md);
}

.record-detail-mobile .exam-title {
  font-size: var(--font-size-medium);
  margin-bottom: var(--spacing-md);
}

.record-detail-mobile .info-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.record-detail-mobile .info-item {
  background-color: var(--fill-color);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-base);
}

/* 移动端答题详情 */
.record-detail-mobile .questions-section {
  padding: 0;
  background-color: transparent;
  box-shadow: none;
}

.record-detail-mobile .section-header {
  padding: var(--spacing-sm) 0;
  margin-bottom: var(--spacing-sm);
  background-color: transparent;
  border-bottom: none;
}

.question-card {
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  box-shadow: var(--box-shadow-light);
}

.record-detail-mobile .question-header {
  margin-bottom: var(--spacing-sm);
}

.record-detail-mobile .question-num {
  font-size: var(--font-size-base);
}

.record-detail-mobile .question-content {
  font-size: var(--font-size-base);
  line-height: 1.6;
  margin-bottom: var(--spacing-sm);
}

.record-detail-mobile .options-list {
  margin-bottom: var(--spacing-sm);
}

.record-detail-mobile .option-item {
  padding: var(--spacing-sm);
  font-size: var(--font-size-small);
}

.record-detail-mobile .answer-compare {
  margin-bottom: var(--spacing-sm);
}

.record-detail-mobile .answer-row {
  padding: var(--spacing-sm);
}

.record-detail-mobile .answer-label {
  font-size: var(--font-size-small);
  min-width: 60px;
}

.record-detail-mobile .answer-value {
  font-size: var(--font-size-small);
}

.record-detail-mobile .analysis-section,
.record-detail-mobile .ai-comment-section {
  padding: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  margin-bottom: 0;
}

.record-detail-mobile .analysis-title,
.record-detail-mobile .ai-title {
  font-size: var(--font-size-small);
}

.record-detail-mobile .analysis-content,
.record-detail-mobile .ai-comment-content {
  font-size: var(--font-size-small);
}

/* ==================== 响应式优化 ==================== */
@media (max-width: 768px) {
  .record-detail-pc .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 375px) {
  .record-detail-mobile .exam-title {
    font-size: var(--font-size-base);
  }

  .record-detail-mobile .info-value {
    font-size: var(--font-size-base);
  }

  .record-detail-mobile .question-content {
    font-size: var(--font-size-small);
  }
}
</style>
