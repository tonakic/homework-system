<template>
  <div class="exam-start page">
    <!-- 顶部栏 -->
    <div class="header">
      <div class="header-left">
        <van-icon name="arrow-left" class="back-btn" @click="handleBack" />
        <span class="exam-title">{{ examInfo.title }}</span>
      </div>
      <div class="header-right">
        <div class="progress">第 {{ currentIndex + 1 }}/{{ questions.length }} 题</div>
        <div class="timer" v-if="duration > 0">
          <van-icon name="clock-o" />
          {{ formatTime(remainingSeconds) }}
        </div>
      </div>
    </div>

    <!-- 题目区域 -->
    <div class="question-area">
      <div class="question-header">
        <span class="question-type">{{ getQuestionTypeText(currentQuestion.type) }}</span>
        <span class="question-score">{{ currentQuestion.score }}分</span>
      </div>
      <div class="question-content">
        {{ currentQuestion.content }}
      </div>

      <!-- 单选题 -->
      <div v-if="currentQuestion.type === 'choice'" class="options">
        <div
          v-for="(option, index) in currentQuestion.options"
          :key="index"
          class="option"
          :class="{ selected: answers[currentQuestion.id] === index }"
          @click="selectOption(currentQuestion.id, index)"
        >
          <span class="option-letter">{{ getOptionLetter(index) }}</span>
          <span class="option-text">{{ option }}</span>
        </div>
      </div>

      <!-- 多选题 -->
      <div v-else-if="currentQuestion.type === 'multiple'" class="options multiple">
        <div
          v-for="(option, index) in currentQuestion.options"
          :key="index"
          class="option"
          :class="{ selected: answers[currentQuestion.id + '_multiple'] && answers[currentQuestion.id + '_multiple'].includes(index) }"
          @click="toggleMultipleOption(currentQuestion.id, index)"
        >
          <span class="option-letter">{{ getOptionLetter(index) }}</span>
          <span class="option-text">{{ option }}</span>
        </div>
        <div class="multiple-hint">已选择：{{ getMultipleSelectedLetters(currentQuestion.id) }}</div>
      </div>

      <!-- 判断题 -->
      <div v-else-if="currentQuestion.type === 'judgment'" class="options judgment">
        <div
          class="option judgment-option"
          :class="{ selected: answers[currentQuestion.id] === 0 }"
          @click="selectOption(currentQuestion.id, 0)"
        >
          <span class="option-letter judgment-icon">√</span>
          <span class="option-text">正确</span>
        </div>
        <div
          class="option judgment-option"
          :class="{ selected: answers[currentQuestion.id] === 1 }"
          @click="selectOption(currentQuestion.id, 1)"
        >
          <span class="option-letter judgment-icon">×</span>
          <span class="option-text">错误</span>
        </div>
      </div>

      <!-- 填空题 -->
      <div v-else-if="currentQuestion.type === 'fill'" class="fill-inputs">
        <van-field
          v-for="(_, index) in (currentQuestion.blanks || [])"
          :key="index"
          v-model="answers[currentQuestion.id + '_' + index]"
          :placeholder="'第' + (index + 1) + '空'"
          class="fill-input"
          @change="triggerAutoSave"
        />
      </div>

      <!-- 主观题 -->
      <div v-else-if="currentQuestion.type === 'subjective'" class="subjective-area">
        <van-field
          v-model="answers[currentQuestion.id]"
          type="textarea"
          placeholder="请输入答案"
          rows="6"
          autosize
          show-word-limit
          :maxlength="currentQuestion.maxLength || 500"
          @change="triggerAutoSave"
        />
      </div>
    </div>

    <!-- 底部答题菜单栏 -->
    <div class="exam-toolbar">
      <van-button
        class="toolbar-btn"
        :disabled="currentIndex === 0"
        @click="prevQuestion"
      >
        <van-icon name="arrow-left" />
        上一题
      </van-button>
      <van-button
        class="toolbar-btn"
        :disabled="currentIndex === questions.length - 1"
        @click="nextQuestion"
      >
        下一题
        <van-icon name="arrow" />
      </van-button>
      <van-button class="toolbar-btn jump-btn" @click="showJumpPopup = true">
        <van-icon name="apps-o" />
        跳转
      </van-button>
      <van-button class="toolbar-btn submit-btn" type="primary" @click="handleSubmit">
        交卷
      </van-button>
    </div>

    <!-- 跳转弹窗 -->
    <van-popup
      v-model:show="showJumpPopup"
      position="bottom"
      round
      closeable
      :style="{ height: '60%' }"
    >
      <div class="jump-popup">
        <h3 class="popup-title">题目跳转</h3>
        <div class="jump-summary">
          <span class="answered-count">
            <span class="dot green"></span>
            已答 {{ answeredCount }} 题
          </span>
          <span class="unanswered-count">
            <span class="dot red"></span>
            未答 {{ questions.length - answeredCount }} 题
          </span>
        </div>
        <div class="jump-content">
          <div
            v-for="group in questionGroups"
            :key="group.type"
            class="question-group"
          >
            <div class="group-title">{{ group.label }}</div>
            <div class="group-questions" v-if="group.questions.length > 0">
              <div
                v-for="q in group.questions"
                :key="q.id"
                class="question-badge"
                :class="{
                  answered: isAnswered(q),
                  current: q.index === currentIndex
                }"
                @click="jumpToQuestion(q.index)"
              >
                {{ q.index + 1 }}
              </div>
            </div>
            <div v-else class="no-questions">暂无此类题目</div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 交卷确认弹窗 -->
    <van-dialog
      v-model:show="showSubmitDialog"
      title="确认交卷"
      show-cancel-button
      @confirm="confirmSubmit"
    >
      <div class="submit-dialog-content">
        <div v-if="unansweredCount > 0" class="warning">
          <van-icon name="warning-o" color="#f44336" />
          <span>您还有 <strong>{{ unansweredCount }}</strong> 题未作答！</span>
        </div>
        <div class="submit-info">
          <p>已答题数：{{ answeredCount }} / {{ questions.length }}</p>
          <p>确认交卷后将无法修改答案。</p>
        </div>
      </div>
    </van-dialog>

    <!-- 交卷结果弹窗 -->
    <van-popup
      v-model:show="showResultPopup"
      round
      closeable
      :close-on-click-overlay="false"
      :style="{ width: '85%', maxWidth: '320px' }"
    >
      <div class="result-popup">
        <!-- 有待批改题目（混合模式含手动、AI批改响应中）：显示等待批改 -->
        <div v-if="submitResult.hasPendingGrading || submitResult.needAIGrading" class="result-manual">
          <div class="result-icon waiting">
            <van-icon name="clock-o" />
          </div>
          <h3>交卷成功</h3>
          <p class="waiting-tip">待批改</p>
          <p class="waiting-sub">批改完成后可查看成绩</p>
        </div>
        <!-- 自动批改（纯客观题且无手动）：显示分数 -->
        <div v-else-if="examInfo.autoGrade" class="result-auto">
          <div class="result-icon success">
            <van-icon name="passed" />
          </div>
          <h3>交卷成功</h3>
          <div class="score-display">
            <span class="score-value">{{ resultScore }}</span>
            <span class="score-unit">分</span>
          </div>
          <p class="score-tip">系统已自动批改</p>
        </div>
        <!-- 手动批改模式 -->
        <div v-else class="result-manual">
          <div class="result-icon waiting">
            <van-icon name="clock-o" />
          </div>
          <h3>交卷成功</h3>
          <p class="waiting-tip">待批改</p>
          <p class="waiting-sub">批改完成后可查看成绩</p>
        </div>
        <van-button type="primary" block round @click="goHome">
          确认
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showDialog, showFailToast, showSuccessToast } from 'vant';
import { getExamDetail, startExam, saveAnswer, submitExam } from '@/api/auth';

const route = useRoute();
const router = useRouter();

const currentIndex = ref(0);
const questions = ref([]);
const answers = ref({});
const examInfo = ref({
  title: '',
  duration: 0,
  autoGrade: true,
  gradingMode: 'manual'
});
const duration = ref(0);
const remainingSeconds = ref(0);
const showJumpPopup = ref(false);
const showSubmitDialog = ref(false);
const showResultPopup = ref(false);
const resultScore = ref(0);
const submitLoading = ref(false);
const startTime = ref(Date.now());
const submitResult = ref({
  hasPendingGrading: false,
  needAIGrading: false
});

let timer = null;
let autoSaveTimer = null;

// 自动保存答案（防抖）
function triggerAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(() => {
    saveAnswersToServer();
  }, 1000); // 1秒后自动保存
}

// 保存答案到服务器
async function saveAnswersToServer() {
  try {
    // 将答案转换为数组格式
    const answersArray = questions.value.map(q => {
      if (q.type === 'fill') {
        const fillAnswers = [];
        for (let i = 0; i < (q.blanks || 0); i++) {
          fillAnswers.push(answers.value[q.id + '_' + i] || '');
        }
        return fillAnswers;
      }
      if (q.type === 'multiple') {
        const selected = answers.value[q.id + '_multiple'];
        return selected ? selected.sort().map(i => getOptionLetter(i)).join('') : '';
      }
      return answers.value[q.id] !== undefined ? answers.value[q.id] : null;
    });

    await saveAnswer(route.params.id, answersArray);
  } catch (err) {
    console.error('自动保存失败:', err);
  }
}

const currentQuestion = computed(() => {
  return questions.value[currentIndex.value] || {};
});

const answeredCount = computed(() => {
  return questions.value.filter(q => isAnswered(q)).length;
});

const unansweredCount = computed(() => {
  return questions.value.length - answeredCount.value;
});

// 按题型分组的题目
const questionGroups = computed(() => {
  const types = [
    { type: 'choice', label: '单选题' },
    { type: 'multiple', label: '多选题' },
    { type: 'fill', label: '填空题' },
    { type: 'judgment', label: '判断题' },
    { type: 'subjective', label: '主观题' }
  ];

  return types.map(t => ({
    ...t,
    questions: questions.value
      .map((q, index) => ({ ...q, index }))
      .filter(q => q.type === t.type)
  }));
});

onMounted(() => {
  loadExamData();
});

// 清理计时器
function clearTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// 页面关闭前清理
onBeforeUnmount(() => {
  clearTimer();
});

async function loadExamData() {
  try {
    // 先尝试从 sessionStorage 获取（从详情页传递）
    const cachedExam = sessionStorage.getItem('currentExam');
    if (cachedExam) {
      const data = JSON.parse(cachedExam);
      applyExamData(data);
      sessionStorage.removeItem('currentExam');
      return;
    }

    // 否则调用API获取
    const res = await startExam(route.params.id);
    if (res.code === 0) {
      applyExamData(res.data);
    } else {
      showFailToast(res.message || '获取考试信息失败');
      router.back();
    }
  } catch (err) {
    console.error('加载考试数据失败:', err);
    showFailToast(err.message || '获取考试信息失败');
    router.back();
  }
}

function applyExamData(data) {
  examInfo.value = {
    title: data.title || '考试',
    duration: data.duration || 0,
    autoGrade: data.gradingMode === 'auto' || !data.questions?.some(q => !['choice', 'multiple', 'judgment'].includes(q.questionType)),
    gradingMode: data.gradingMode || 'manual'
  };

  duration.value = data.duration || 0;

  // 计算剩余时间：如果有已保存的开始时间，需要扣除已用时间
  if (data.existingAnswer && data.existingAnswer.startTime) {
    const startTimestamp = new Date(data.existingAnswer.startTime).getTime();
    const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
    remainingSeconds.value = Math.max(0, (data.duration || 0) * 60 - elapsedSeconds);
  } else {
    remainingSeconds.value = (data.duration || 0) * 60;
  }

  // 格式化题目数据
  if (data.questions && data.questions.length > 0) {
    questions.value = data.questions.map((q, index) => ({
      id: q.id,
      type: q.questionType,
      content: q.content,
      options: q.options,
      blanks: q.questionType === 'fill' ? (q.options?.length || 1) : 0,
      score: q.score,
      maxLength: q.maxLength || 500
    }));
  }

  // 恢复已保存的答案（将数组格式转换为对象格式）
  if (data.existingAnswer && data.existingAnswer.answers) {
    const savedAnswers = data.existingAnswer.answers;
    if (Array.isArray(savedAnswers)) {
      // 数组格式转换为对象格式
      questions.value.forEach((q, index) => {
        const answer = savedAnswers[index];
        if (answer !== undefined && answer !== null) {
          if (q.type === 'fill') {
            // 填空题：数组格式，转换为多个key
            if (Array.isArray(answer)) {
              answer.forEach((fillAns, fillIndex) => {
                answers.value[q.id + '_' + fillIndex] = fillAns;
              });
            }
          } else if (q.type === 'multiple') {
            // 多选题：字符串格式（如"ABC"），转换为数组索引
            if (typeof answer === 'string') {
              answers.value[q.id + '_multiple'] = answer.split('').map(c => c.charCodeAt(0) - 65);
            } else if (Array.isArray(answer)) {
              answers.value[q.id + '_multiple'] = answer;
            }
          } else {
            answers.value[q.id] = answer;
          }
        }
      });
    } else {
      // 已经是对象格式
      answers.value = savedAnswers;
    }
    if (data.existingAnswer.startTime) {
      startTime.value = new Date(data.existingAnswer.startTime).getTime();
    }
  }

  // 数据加载完成后启动计时器
  startTimer();
}

function startTimer() {
  if (duration.value > 0) {
    timer = setInterval(() => {
      if (remainingSeconds.value > 0) {
        remainingSeconds.value--;
      } else {
        // 时间到自动交卷
        handleSubmit();
      }
    }, 1000);
  }
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function getQuestionTypeText(type) {
  const map = { choice: '单选题', multiple: '多选题', fill: '填空题', judgment: '判断题', subjective: '主观题' };
  return map[type] || '未知';
}

function getOptionLetter(index) {
  return String.fromCharCode(65 + index);
}

function selectOption(questionId, optionIndex) {
  answers.value[questionId] = optionIndex;
  triggerAutoSave();
}

// 多选题切换选项
function toggleMultipleOption(questionId, optionIndex) {
  const key = questionId + '_multiple';
  if (!answers.value[key]) {
    answers.value[key] = [];
  }
  const idx = answers.value[key].indexOf(optionIndex);
  if (idx >= 0) {
    answers.value[key].splice(idx, 1);
  } else {
    answers.value[key].push(optionIndex);
  }
  triggerAutoSave();
}

// 获取多选题已选字母
function getMultipleSelectedLetters(questionId) {
  const selected = answers.value[questionId + '_multiple'];
  if (!selected || selected.length === 0) return '无';
  return selected.sort().map(i => getOptionLetter(i)).join('');
}

function isAnswered(question) {
  if (question.type === 'fill') {
    for (let i = 0; i < question.blanks; i++) {
      if (!answers.value[question.id + '_' + i]) return false;
    }
    return question.blanks > 0;
  }
  if (question.type === 'multiple') {
    const selected = answers.value[question.id + '_multiple'];
    return selected && selected.length > 0;
  }
  // 单选题和主观题：判断是否 !== undefined（因为选项0也是有效答案）
  return answers.value[question.id] !== undefined;
}

function prevQuestion() {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++;
  }
}

function jumpToQuestion(index) {
  currentIndex.value = index;
  showJumpPopup.value = false;
}

function handleBack() {
  showDialog({
    title: '提示',
    message: '确定要退出答题吗？当前答题进度将会保存。',
    confirmButtonText: '退出',
    confirmButtonColor: '#f44336'
  }).then(() => {
    router.push('/student/home');
  }).catch(() => {
    // 取消
  });
}

function handleSubmit() {
  showSubmitDialog.value = true;
}

async function confirmSubmit() {
  submitLoading.value = true;

  try {
    // 将答案转换为数组格式
    const answersArray = questions.value.map(q => {
      if (q.type === 'fill') {
        const fillAnswers = [];
        for (let i = 0; i < q.blanks; i++) {
          fillAnswers.push(answers.value[q.id + '_' + i] || '');
        }
        return fillAnswers;
      }
      if (q.type === 'multiple') {
        const selected = answers.value[q.id + '_multiple'];
        return selected ? selected.sort().map(i => getOptionLetter(i)).join('') : '';
      }
      return answers.value[q.id] !== undefined ? answers.value[q.id] : null;
    });

    // 计算答题用时（秒）
    const timeUsed = Math.floor((Date.now() - startTime.value) / 1000);

    const res = await submitExam(route.params.id, answersArray, timeUsed);

    if (res.code === 0) {
      // 保存提交结果
      submitResult.value = {
        hasPendingGrading: res.data?.hasPendingGrading || false,
        needAIGrading: res.data?.needAIGrading || false
      };

      // 判断批改模式
      if (examInfo.value.autoGrade && res.data && res.data.totalScore !== undefined) {
        resultScore.value = res.data.totalScore;
      }

      showSubmitDialog.value = false;
      showResultPopup.value = true;
      showSuccessToast('提交成功');

      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    } else {
      showFailToast(res.message || '提交失败');
    }
  } catch (err) {
    console.error('提交试卷失败:', err);
    showFailToast(err.message || '提交失败');
  } finally {
    submitLoading.value = false;
  }
}

function goHome() {
  showResultPopup.value = false;
  router.replace('/student/home');
}
</script>

<style scoped>
.exam-start {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
}

/* 顶部栏 */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.back-btn {
  font-size: 22px;
  color: #333;
  cursor: pointer;
  flex-shrink: 0;
}

.exam-title {
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.progress {
  font-size: 14px;
  color: #666;
}

.timer {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #f44336;
  font-size: 14px;
  font-weight: 500;
}

/* 题目区域 */
.question-area {
  margin-top: 60px;
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.question-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.question-type {
  background: #fff3e0;
  color: #ff9800;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.question-score {
  color: #666;
  font-size: 14px;
}

.question-content {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 24px;
}

/* 选择题选项 */
.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.options.multiple .option {
  position: relative;
}

.options.multiple .option::before {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid #e8e8e8;
  border-radius: 4px;
  margin-right: 12px;
  flex-shrink: 0;
}

.options.multiple .option.selected::before {
  background: #ff9800;
  border-color: #ff9800;
}

.multiple-hint {
  margin-top: 12px;
  padding: 8px 12px;
  background: #fff3e0;
  border-radius: 4px;
  font-size: 14px;
  color: #ff9800;
}

.option {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid #e8e8e8;
}

.option.selected {
  background: #fff3e0;
  border-color: #ff9800;
}

.option-letter {
  width: 28px;
  height: 28px;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.option.selected .option-letter {
  background: #ff9800;
  color: white;
}

.option-text {
  flex: 1;
  font-size: 16px;
}

/* 判断题选项 */
.options.judgment {
  gap: 20px;
}

.judgment-option {
  padding: 20px;
  justify-content: center;
}

.judgment-option .judgment-icon {
  font-size: 24px;
  font-weight: bold;
}

.judgment-option.selected .judgment-icon {
  background: #ff9800;
  color: white;
}

/* 填空题 */
.fill-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fill-input {
  background: white;
  border-radius: 8px;
}

/* 主观题 */
.subjective-area {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

/* 底部答题菜单栏 */
.exam-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 10px 12px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  display: flex;
  gap: 8px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.toolbar-btn {
  flex: 1;
  height: 40px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.jump-btn {
  background: #e3f2fd;
  color: #1976d2;
  border: none;
}

.submit-btn {
  flex: 0.8;
}

/* 跳转弹窗 */
.jump-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
}

.popup-title {
  text-align: center;
  font-size: 18px;
  margin-bottom: 16px;
}

.jump-summary {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 16px;
  font-size: 14px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
}

.dot.green {
  background: #4caf50;
}

.dot.red {
  background: #f44336;
}

.jump-content {
  flex: 1;
  overflow-y: auto;
}

.question-group {
  margin-bottom: 20px;
}

.group-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
}

.group-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.question-badge {
  width: 40px;
  height: 40px;
  background: #ffebee;
  color: #f44336;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.question-badge.answered {
  background: #e8f5e9;
  color: #4caf50;
}

.question-badge.current {
  border: 2px solid #ff9800;
  box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.2);
}

.no-questions {
  color: #999;
  font-size: 14px;
}

/* 交卷确认弹窗 */
.submit-dialog-content {
  padding: 20px;
}

.warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fff3e0;
  border-radius: 8px;
  margin-bottom: 16px;
  color: #e65100;
}

.warning strong {
  color: #f44336;
}

.submit-info {
  color: #666;
  font-size: 14px;
  line-height: 1.8;
}

/* 结果弹窗 */
.result-popup {
  padding: 32px 24px;
  text-align: center;
}

.result-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.result-icon.success {
  background: #e8f5e9;
  color: #4caf50;
  font-size: 32px;
}

.result-icon.waiting {
  background: #fff3e0;
  color: #ff9800;
  font-size: 32px;
}

.result-popup h3 {
  font-size: 20px;
  margin-bottom: 16px;
}

.score-display {
  margin: 20px 0;
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  color: #ff9800;
}

.score-unit {
  font-size: 18px;
  color: #666;
  margin-left: 4px;
}

.score-tip {
  color: #999;
  font-size: 14px;
  margin-bottom: 24px;
}

.waiting-tip {
  font-size: 18px;
  color: #ff9800;
  margin-bottom: 8px;
}

.waiting-sub {
  color: #999;
  font-size: 14px;
  margin-bottom: 24px;
}

/* 响应式 */
@media (max-width: 375px) {
  .header {
    padding: 10px 12px;
  }

  .exam-title {
    font-size: 14px;
  }

  .exam-toolbar {
    gap: 6px;
    padding: 8px 10px;
  }

  .toolbar-btn {
    font-size: 13px;
    height: 36px;
  }

  .question-badge {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }
}
</style>
