<template>
  <div class="mistakes-page page">
    <!-- PC端布局 -->
    <div v-if="isPC" class="mistakes-pc">
      <div class="pc-header">
        <h1>错题库</h1>
        <p class="pc-subtitle">巩固薄弱知识点，提升学习效果</p>
      </div>

      <div class="pc-content">
        <!-- 筛选区域 -->
        <div class="filter-section">
          <el-select v-model="subjectFilter" placeholder="选择科目" clearable style="width: 200px;">
            <el-option
              v-for="subject in subjectOptions"
              :key="subject"
              :label="subject"
              :value="subject"
            />
          </el-select>
          <div class="filter-stats">
            共 <span class="count">{{ filteredMistakes.length }}</span> 道错题
          </div>
        </div>

        <!-- 错题表格 -->
        <el-table :data="paginatedMistakes" style="width: 100%" stripe class="mistakes-table">
          <el-table-column prop="content" label="题目内容" min-width="300">
            <template #default="{ row }">
              <div class="question-cell">
                <div class="question-text">{{ row.content }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="subject" label="科目" width="120">
            <template #default="{ row }">
              <el-tag :type="getSubjectTagType(row.subject)" size="small">
                {{ row.subject }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="wrongCount" label="错误次数" width="100" align="center">
            <template #default="{ row }">
              <span class="wrong-count-badge">{{ row.wrongCount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lastWrongTime" label="最近错误" width="160">
            <template #default="{ row }">
              <span class="time-text">{{ formatLastWrongTime(row.lastWrongTime) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="practice(row.id)">
                重新练习
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper" v-if="filteredMistakes.length > 0">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="filteredMistakes.length"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </div>

        <el-empty v-if="filteredMistakes.length === 0" description="暂无错题，继续保持！" />
      </div>
    </div>

    <!-- 移动端布局 -->
    <div v-else class="mistakes-mobile">
      <van-nav-bar title="错题库" left-arrow @click-left="$router.push('/student/home')">
        <template #right>
          <van-icon name="filter-o" @click="showFilterPopup = true" />
        </template>
      </van-nav-bar>

      <div class="page-content">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <!-- 统计概览 -->
          <div class="stats-overview">
            <div class="stat-item">
              <span class="stat-value">{{ mistakes.length }}</span>
              <span class="stat-label">错题总数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ subjectOptions.length }}</span>
              <span class="stat-label">涉及科目</span>
            </div>
          </div>

          <!-- 错题列表 -->
          <div class="mistake-list">
            <div
              v-for="mistake in mistakes"
              :key="mistake.id"
              class="mistake-card card"
              @click="practice(mistake.id)"
            >
              <div class="mistake-header">
                <span class="subject-tag" :class="getSubjectClass(mistake.subject)">
                  {{ mistake.subject }}
                </span>
                <span class="chapter">{{ mistake.chapter }}</span>
              </div>
              <div class="mistake-content">
                {{ mistake.content }}
              </div>
              <div class="mistake-footer">
                <div class="mistake-info">
                  <span class="wrong-count">
                    <van-icon name="warning-o" />
                    错误 {{ mistake.wrongCount }} 次
                  </span>
                </div>
                <van-button size="small" type="primary" plain @click.stop="practice(mistake.id)">
                  重新练习
                </van-button>
              </div>
            </div>
          </div>

          <van-empty v-if="mistakes.length === 0" description="暂无错题，继续保持！" />
        </van-pull-refresh>
      </div>

      <!-- 筛选弹窗 -->
      <van-popup v-model:show="showFilterPopup" position="bottom" round :style="{ height: '40%' }">
        <div class="filter-popup">
          <van-nav-bar title="筛选条件">
            <template #right>
              <van-icon name="cross" @click="showFilterPopup = false" />
            </template>
          </van-nav-bar>

          <div class="filter-content">
            <div class="filter-section-mobile">
              <div class="section-label">科目</div>
              <div class="btn-group">
                <div
                  class="btn-item"
                  :class="{ active: tempSubjectFilter === '' }"
                  @click="tempSubjectFilter = ''"
                >全部</div>
                <div
                  v-for="subject in subjectOptions"
                  :key="subject"
                  class="btn-item"
                  :class="{ active: tempSubjectFilter === subject }"
                  @click="tempSubjectFilter = subject"
                >{{ subject }}</div>
              </div>
            </div>
          </div>

          <div class="filter-footer">
            <van-button block @click="resetFilter">重置</van-button>
            <van-button block type="primary" @click="confirmFilter">确定</van-button>
          </div>
        </div>
      </van-popup>
    </div>

    <!-- 练习弹窗 -->
    <van-popup
      v-model:show="showPracticePopup"
      round
      closeable
      :style="{ width: isPC ? '600px' : '90%', maxHeight: '80vh' }"
      class="practice-popup-wrapper"
    >
      <div class="practice-popup" v-if="currentMistake">
        <div class="practice-header">
          <div class="practice-meta">
            <span class="subject-badge" :class="getSubjectClass(currentMistake.subject)">
              {{ currentMistake.subject }}
            </span>
            <span class="chapter-text">{{ currentMistake.chapter }}</span>
          </div>
          <div class="question-type-badge">
            {{ getQuestionTypeText(currentMistake.questionType) }}
          </div>
        </div>

        <div class="practice-content">{{ currentMistake.content }}</div>

        <!-- 单选题 -->
        <div v-if="currentMistake.questionType === 'choice'" class="practice-options">
          <div
            v-for="(option, index) in currentMistake.options"
            :key="index"
            class="practice-option"
            :class="{ selected: practiceAnswer === index }"
            @click="selectPracticeOption(index)"
          >
            <span class="option-letter">{{ getOptionLetter(index) }}</span>
            <span class="option-text">{{ option }}</span>
          </div>
        </div>

        <!-- 多选题 -->
        <div v-else-if="currentMistake.questionType === 'multiple'" class="practice-options multiple">
          <div
            v-for="(option, index) in currentMistake.options"
            :key="index"
            class="practice-option"
            :class="{ selected: practiceMultipleAnswer.includes(index) }"
            @click="togglePracticeMultiple(index)"
          >
            <span class="option-letter">{{ getOptionLetter(index) }}</span>
            <span class="option-text">{{ option }}</span>
          </div>
        </div>

        <!-- 判断题 -->
        <div v-else-if="currentMistake.questionType === 'judgment'" class="practice-options judgment">
          <div
            class="practice-option judgment-option"
            :class="{ selected: practiceAnswer === 0 }"
            @click="selectPracticeOption(0)"
          >
            <span class="option-icon correct-icon">✓</span>
            <span class="option-text">正确</span>
          </div>
          <div
            class="practice-option judgment-option"
            :class="{ selected: practiceAnswer === 1 }"
            @click="selectPracticeOption(1)"
          >
            <span class="option-icon wrong-icon">✗</span>
            <span class="option-text">错误</span>
          </div>
        </div>

        <!-- 填空题 -->
        <div v-else-if="currentMistake.questionType === 'fill'" class="practice-fill">
          <van-field
            v-for="(_, index) in (currentMistake.options || [])"
            :key="index"
            v-model="practiceFillAnswers[index]"
            :placeholder="'第' + (index + 1) + '空'"
            class="fill-input"
          />
        </div>

        <!-- 主观题 -->
        <div v-else-if="currentMistake.questionType === 'subjective'" class="practice-subjective">
          <van-field
            v-model="practiceAnswer"
            type="textarea"
            placeholder="请输入答案"
            rows="4"
            autosize
          />
        </div>

        <!-- 答案解析区域 -->
        <div v-if="showAnswer" class="answer-section">
          <div class="answer-row">
            <span class="answer-label">正确答案</span>
            <span class="answer-correct">{{ formatCorrectAnswer(currentMistake) }}</span>
          </div>
          <div class="answer-row">
            <span class="answer-label">您的答案</span>
            <span :class="['answer-value', isCorrect ? 'correct' : 'wrong']">
              {{ formatYourAnswer() }}
            </span>
          </div>
          <div class="analysis" v-if="currentMistake.analysis">
            <div class="analysis-label">解析</div>
            <div class="analysis-content">{{ currentMistake.analysis }}</div>
          </div>
        </div>

        <div class="practice-actions">
          <van-button v-if="!showAnswer" type="primary" block @click="checkAnswer">提交答案</van-button>
          <van-button v-else block @click="closePractice">关闭</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getMistakes, getMistakeDetail } from '@/api/auth';
import { showFailToast, showSuccessToast } from 'vant';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();

const mistakes = ref([]);
const showPracticePopup = ref(false);
const currentMistake = ref(null);
const practiceAnswer = ref(null);
const practiceMultipleAnswer = ref([]);
const practiceFillAnswers = ref([]);
const showAnswer = ref(false);
const isCorrect = ref(false);

// PC端分页
const currentPage = ref(1);
const pageSize = ref(10);

// PC端筛选
const subjectFilter = ref('');

// 移动端筛选
const showFilterPopup = ref(false);
const tempSubjectFilter = ref('');
const refreshing = ref(false);

// 科目选项
const subjectOptions = computed(() => {
  const subjects = new Set(mistakes.value.map(m => m.subject).filter(Boolean));
  return Array.from(subjects);
});

// 筛选后的错题
const filteredMistakes = computed(() => {
  if (!subjectFilter.value) {
    return mistakes.value;
  }
  return mistakes.value.filter(m => m.subject === subjectFilter.value);
});

// PC端分页后的错题
const paginatedMistakes = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredMistakes.value.slice(start, end);
});

// 格式化最近错误时间
function formatLastWrongTime(time) {
  if (!time) return '--';
  const date = new Date(time);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${min}`;
}

onMounted(() => {
  loadMistakes();
});

async function loadMistakes() {
  try {
    const res = await getMistakes();
    if (res.code === 0) {
      mistakes.value = res.data || [];
    } else {
      showFailToast(res.message || '获取错题失败');
    }
  } catch (err) {
    console.error('获取错题失败:', err);
    mistakes.value = [];
  }
}

async function onRefresh() {
  await loadMistakes();
  refreshing.value = false;
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

function resetFilter() {
  tempSubjectFilter.value = '';
}

function confirmFilter() {
  subjectFilter.value = tempSubjectFilter.value;
  showFilterPopup.value = false;
}

async function practice(id) {
  try {
    const res = await getMistakeDetail(id);
    if (res.code === 0) {
      currentMistake.value = res.data;
      // 重置答题状态
      practiceAnswer.value = null;
      practiceMultipleAnswer.value = [];
      practiceFillAnswers.value = [];
      showAnswer.value = false;
      isCorrect.value = false;
      showPracticePopup.value = true;
    } else {
      showFailToast(res.message || '获取题目失败');
    }
  } catch (err) {
    console.error('获取题目详情失败:', err);
    showFailToast(err.message || '获取题目失败');
  }
}

function getQuestionTypeText(type) {
  const map = { choice: '单选题', multiple: '多选题', fill: '填空题', judgment: '判断题', subjective: '主观题' };
  return map[type] || '未知';
}

function getOptionLetter(index) {
  return String.fromCharCode(65 + index);
}

function selectPracticeOption(index) {
  practiceAnswer.value = index;
}

function togglePracticeMultiple(index) {
  const idx = practiceMultipleAnswer.value.indexOf(index);
  if (idx >= 0) {
    practiceMultipleAnswer.value.splice(idx, 1);
  } else {
    practiceMultipleAnswer.value.push(index);
  }
}

function checkAnswer() {
  showAnswer.value = true;

  // 判断答案是否正确
  const q = currentMistake.value;
  if (q.questionType === 'choice') {
    const studentAns = practiceAnswer.value !== null ? String.fromCharCode(65 + practiceAnswer.value) : '';
    isCorrect.value = studentAns === q.answer;
  } else if (q.questionType === 'judgment') {
    const studentAns = practiceAnswer.value === 0 ? 'A' : (practiceAnswer.value === 1 ? 'B' : '');
    isCorrect.value = studentAns === q.answer;
  } else if (q.questionType === 'multiple') {
    const studentAns = practiceMultipleAnswer.value.sort().map(i => getOptionLetter(i)).join('');
    isCorrect.value = studentAns === q.answer;
  } else if (q.questionType === 'fill') {
    // 填空题：比较每个空的答案
    const correctAnswers = q.options || [];
    isCorrect.value = practiceFillAnswers.value.every((ans, idx) =>
      (ans || '').trim() === (correctAnswers[idx] || '').trim()
    );
  } else {
    // 主观题：不自动判断
    isCorrect.value = false;
  }

  if (isCorrect.value) {
    showSuccessToast('回答正确');
  }
}

function formatCorrectAnswer(mistake) {
  if (mistake.questionType === 'judgment') {
    return mistake.answer === 'A' ? '正确' : '错误';
  }
  return mistake.answer;
}

function formatYourAnswer() {
  const q = currentMistake.value;
  if (q.questionType === 'choice') {
    return practiceAnswer.value !== null ? getOptionLetter(practiceAnswer.value) : '未作答';
  } else if (q.questionType === 'judgment') {
    if (practiceAnswer.value === 0) return '正确';
    if (practiceAnswer.value === 1) return '错误';
    return '未作答';
  } else if (q.questionType === 'multiple') {
    if (practiceMultipleAnswer.value.length === 0) return '未作答';
    return practiceMultipleAnswer.value.sort().map(i => getOptionLetter(i)).join('');
  } else if (q.questionType === 'fill') {
    return practiceFillAnswers.value.filter(a => a).join(', ') || '未作答';
  }
  return practiceAnswer.value || '未作答';
}

function closePractice() {
  showPracticePopup.value = false;
  currentMistake.value = null;
}
</script>

<style scoped>
/* ==================== CSS 变量引用 ==================== */
.mistakes-page {
  min-height: 100%;
  background-color: var(--bg-color);
}

/* ==================== PC端样式 ==================== */
.mistakes-pc {
  min-height: 100%;
  background-color: var(--bg-color);
  padding: var(--spacing-lg);
}

.pc-header {
  max-width: 1200px;
  margin: 0 auto var(--spacing-lg);
}

.pc-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 var(--spacing-xs);
}

.pc-subtitle {
  font-size: var(--font-size-base);
  color: var(--text-color-secondary);
  margin: 0;
}

.pc-content {
  max-width: 1200px;
  margin: 0 auto;
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-lg);
  box-shadow: var(--box-shadow-light);
}

.filter-section {
  margin-bottom: var(--spacing-lg);
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  flex-wrap: wrap;
}

.filter-stats {
  font-size: var(--font-size-base);
  color: var(--text-color-secondary);
  margin-left: auto;
}

.filter-stats .count {
  color: var(--color-primary);
  font-weight: 600;
}

.mistakes-table {
  border-radius: var(--border-radius-base);
  overflow: hidden;
}

.question-cell {
  padding: var(--spacing-sm) 0;
}

.question-text {
  line-height: 1.6;
  color: var(--text-color-primary);
}

.wrong-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 var(--spacing-sm);
  background-color: var(--color-danger-light);
  color: var(--color-danger);
  border-radius: var(--border-radius-round);
  font-size: var(--font-size-extra-small);
  font-weight: 600;
}

.time-text {
  color: var(--text-color-secondary);
  font-size: var(--font-size-small);
}

.pagination-wrapper {
  margin-top: var(--spacing-lg);
  display: flex;
  justify-content: flex-end;
}

/* ==================== 移动端样式 ==================== */
.mistakes-mobile {
  min-height: 100%;
  background-color: var(--bg-color);
}

.page-content {
  padding: var(--spacing-sm);
}

.stats-overview {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.stat-item {
  flex: 1;
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-md);
  text-align: center;
  box-shadow: var(--box-shadow-light);
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1.2;
}

.stat-label {
  display: block;
  font-size: var(--font-size-extra-small);
  color: var(--text-color-secondary);
  margin-top: var(--spacing-xs);
}

.mistake-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.mistake-card {
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-md);
  box-shadow: var(--box-shadow-light);
  cursor: pointer;
  transition: all var(--transition-duration) var(--transition-timing-function);
}

.mistake-card:active {
  transform: scale(0.98);
}

.mistake-header {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.subject-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--spacing-sm);
  border-radius: var(--border-radius-base);
  font-size: var(--font-size-extra-small);
  font-weight: 500;
}

.subject-tag.subject-chinese {
  background-color: var(--color-primary-light-9);
  color: var(--color-primary);
}

.subject-tag.subject-math {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.subject-tag.subject-english {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

.subject-tag.subject-science {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.subject-tag.subject-default {
  background-color: var(--color-info-light);
  color: var(--color-info);
}

.chapter {
  font-size: var(--font-size-extra-small);
  color: var(--text-color-secondary);
}

.mistake-content {
  font-size: var(--font-size-medium);
  line-height: 1.6;
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-sm);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mistake-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mistake-info {
  display: flex;
  align-items: center;
}

.wrong-count {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-extra-small);
  color: var(--color-danger);
}

/* 筛选弹窗 */
.filter-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filter-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm) var(--spacing-md);
}

.filter-section-mobile {
  margin-bottom: var(--spacing-md);
}

.section-label {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-sm);
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.btn-item {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-base);
  font-size: var(--font-size-base);
  color: var(--text-color-regular);
  background-color: var(--fill-color-blank);
  min-width: 60px;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-duration) var(--transition-timing-function);
}

.btn-item.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--fill-color-blank);
}

.filter-footer {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--fill-color-blank);
  border-top: 1px solid var(--border-color-lighter);
}

.filter-footer .van-button {
  flex: 1;
}

/* ==================== 练习弹窗样式 ==================== */
.practice-popup-wrapper {
  border-radius: var(--border-radius-large) !important;
}

.practice-popup {
  padding: var(--spacing-lg);
  max-height: 80vh;
  overflow-y: auto;
}

.practice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.practice-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.subject-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--spacing-sm);
  border-radius: var(--border-radius-base);
  font-size: var(--font-size-extra-small);
  font-weight: 500;
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

.chapter-text {
  font-size: var(--font-size-extra-small);
  color: var(--text-color-secondary);
}

.question-type-badge {
  display: inline-block;
  background-color: var(--color-warning-light);
  color: var(--color-warning);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-base);
  font-size: var(--font-size-extra-small);
  font-weight: 500;
}

.practice-content {
  font-size: var(--font-size-medium);
  line-height: 1.6;
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--fill-color);
  border-radius: var(--border-radius-base);
}

.practice-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.practice-option {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--fill-color);
  border-radius: var(--border-radius-base);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all var(--transition-duration) var(--transition-timing-function);
}

.practice-option:hover {
  background-color: var(--fill-color-light);
}

.practice-option.selected {
  background-color: var(--color-primary-light-9);
  border-color: var(--color-primary);
}

.practice-option .option-letter {
  width: 24px;
  height: 24px;
  background-color: var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: var(--spacing-sm);
  font-size: var(--font-size-extra-small);
  font-weight: 600;
  flex-shrink: 0;
  transition: all var(--transition-duration) var(--transition-timing-function);
}

.practice-option.selected .option-letter {
  background-color: var(--color-primary);
  color: var(--fill-color-blank);
}

.practice-option .option-text {
  font-size: var(--font-size-base);
  color: var(--text-color-primary);
}

.judgment-option {
  padding: var(--spacing-md);
  justify-content: center;
}

.option-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: var(--spacing-sm);
  font-size: 18px;
  font-weight: bold;
  transition: all var(--transition-duration) var(--transition-timing-function);
}

.correct-icon {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.wrong-icon {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

.practice-option.selected .correct-icon,
.practice-option.selected .wrong-icon {
  background-color: var(--color-primary);
  color: var(--fill-color-blank);
}

.practice-fill {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.fill-input {
  background-color: var(--fill-color);
  border-radius: var(--border-radius-base);
}

.practice-subjective {
  margin-bottom: var(--spacing-lg);
}

/* 答案解析区域 */
.answer-section {
  background-color: var(--fill-color);
  border-radius: var(--border-radius-base);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.answer-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.answer-row:last-child {
  margin-bottom: 0;
}

.answer-label {
  font-size: var(--font-size-base);
  color: var(--text-color-secondary);
  min-width: 70px;
  flex-shrink: 0;
}

.answer-correct {
  font-size: var(--font-size-base);
  color: var(--color-success);
  font-weight: 600;
}

.answer-value {
  font-size: var(--font-size-base);
  font-weight: 600;
}

.answer-value.correct {
  color: var(--color-success);
}

.answer-value.wrong {
  color: var(--color-danger);
}

.analysis {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color-lighter);
}

.analysis-label {
  font-size: var(--font-size-base);
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-xs);
}

.analysis-content {
  font-size: var(--font-size-base);
  color: var(--text-color-regular);
  line-height: 1.6;
}

.practice-actions {
  margin-top: var(--spacing-md);
}

/* ==================== 响应式优化 ==================== */
@media (max-width: 375px) {
  .mistake-content {
    font-size: var(--font-size-base);
  }

  .stat-value {
    font-size: 20px;
  }

  .stat-label {
    font-size: 11px;
  }
}
</style>
