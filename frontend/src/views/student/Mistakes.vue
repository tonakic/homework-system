<template>
  <div class="mistakes-page page">
    <!-- PC端布局 -->
    <div v-if="isPC" class="mistakes-pc">
      <div class="pc-header">
        <h1>错题库</h1>
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
        </div>

        <!-- 错题表格 -->
        <el-table :data="filteredMistakes" style="width: 100%" stripe>
          <el-table-column prop="content" label="题目" min-width="300">
            <template #default="{ row }">
              <div class="question-cell">
                <div class="question-text">{{ row.content }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="subject" label="科目" width="120">
            <template #default="{ row }">
              <el-tag type="warning">{{ row.subject }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="wrongCount" label="错误次数" width="100" align="center">
            <template #default="{ row }">
              <span class="wrong-count-pc">{{ row.wrongCount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lastWrongTime" label="最近错误时间" width="160">
            <template #default="{ row }">
              {{ formatLastWrongTime(row.lastWrongTime) }}
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
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="filteredMistakes.length"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </div>

        <el-empty v-if="filteredMistakes.length === 0" description="暂无错题" />
      </div>
    </div>

    <!-- 移动端布局 -->
    <div v-else>
      <van-nav-bar title="错题库" left-arrow @click-left="$router.push('/student/home')" />

      <div class="page-content">
        <div class="mistake-list">
          <div
            v-for="mistake in mistakes"
            :key="mistake.id"
            class="mistake-card card"
          >
            <div class="mistake-header">
              <span class="subject-tag">{{ mistake.subject }}</span>
              <span class="chapter">{{ mistake.chapter }}</span>
            </div>
            <div class="mistake-content">
              {{ mistake.content }}
            </div>
            <div class="mistake-info">
              <span class="wrong-count">错误 {{ mistake.wrongCount }} 次</span>
            </div>
            <div class="mistake-actions">
              <van-button size="small" type="primary" @click="practice(mistake.id)">
                重新练习
              </van-button>
            </div>
          </div>
        </div>

        <van-empty v-if="mistakes.length === 0" description="暂无错题" />
      </div>
    </div>

    <!-- 练习弹窗 -->
    <van-popup
      v-model:show="showPracticePopup"
      round
      closeable
      :style="{ width: isPC ? '600px' : '90%', maxHeight: '80vh' }"
    >
      <div class="practice-popup" v-if="currentMistake">
        <h3 class="practice-title">{{ currentMistake.subject }} - {{ currentMistake.chapter }}</h3>
        <div class="practice-type">{{ getQuestionTypeText(currentMistake.questionType) }}</div>
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
            <span class="option-letter judgment-icon">&#8730;</span>
            <span class="option-text">正确</span>
          </div>
          <div
            class="practice-option judgment-option"
            :class="{ selected: practiceAnswer === 1 }"
            @click="selectPracticeOption(1)"
          >
            <span class="option-letter judgment-icon">&#215;</span>
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
          <div class="answer-header">
            <span class="answer-label">正确答案</span>
            <span class="answer-correct">{{ formatCorrectAnswer(currentMistake) }}</span>
          </div>
          <div class="your-answer">
            <span class="answer-label">您的答案</span>
            <span :class="['answer-value', isCorrect ? 'correct' : 'wrong']">
              {{ formatYourAnswer() }}
            </span>
          </div>
          <div class="analysis" v-if="currentMistake.analysis">
            <div class="answer-label">解析</div>
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
.mistakes-page {
  min-height: 100%;
  background: #f5f5f5;
}

/* PC端样式 */
.mistakes-pc {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.pc-header {
  margin-bottom: 24px;
}

.pc-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.pc-content {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.filter-section {
  margin-bottom: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
}

.question-cell {
  padding: 8px 0;
}

.question-text {
  line-height: 1.6;
  color: #303133;
}

.wrong-count-pc {
  color: #f44336;
  font-weight: 600;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 移动端样式 */
.page-content {
  padding: 12px;
}

.mistake-card {
  margin-bottom: 12px;
}

.mistake-header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.chapter {
  font-size: 12px;
  color: #999;
}

.mistake-content {
  font-size: 15px;
  line-height: 1.5;
  margin-bottom: 12px;
}

.mistake-info {
  margin-bottom: 12px;
}

.wrong-count {
  font-size: 12px;
  color: #f44336;
}

/* 练习弹窗样式 */
.practice-popup {
  padding: 20px;
  max-height: 80vh;
  overflow-y: auto;
}

.practice-title {
  font-size: 16px;
  margin-bottom: 8px;
}

.practice-type {
  display: inline-block;
  background: #fff3e0;
  color: #ff9800;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 16px;
}

.practice-content {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.practice-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.practice-option {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.practice-option.selected {
  background: #fff3e0;
  border-color: #ff9800;
}

.practice-option .option-letter {
  width: 24px;
  height: 24px;
  background: #e0e0e0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-size: 12px;
  flex-shrink: 0;
}

.practice-option.selected .option-letter {
  background: #ff9800;
  color: white;
}

.practice-option .option-text {
  font-size: 14px;
}

.judgment-option {
  padding: 16px;
  justify-content: center;
}

.judgment-icon {
  font-size: 20px;
  font-weight: bold;
}

.practice-fill {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.fill-input {
  background: #f5f5f5;
  border-radius: 8px;
}

.practice-subjective {
  margin-bottom: 20px;
}

/* 答案解析区域 */
.answer-section {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.answer-header, .your-answer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.answer-label {
  font-size: 14px;
  color: #666;
  min-width: 60px;
}

.answer-correct {
  font-size: 14px;
  color: #4caf50;
  font-weight: 500;
}

.answer-value {
  font-size: 14px;
  font-weight: 500;
}

.answer-value.correct {
  color: #4caf50;
}

.answer-value.wrong {
  color: #f44336;
}

.analysis {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.analysis-content {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.practice-actions {
  margin-top: 16px;
}

/* 移动端响应式优化 */
@media (max-width: 375px) {
  .mistake-content {
    font-size: 14px;
  }
}
</style>
