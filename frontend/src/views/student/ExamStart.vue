<template>
  <!-- PC Version - Split Layout -->
  <div v-if="isPC" class="exam-start-pc">
    <!-- PC Header -->
    <header class="pc-header">
      <div class="pc-header-left">
        <el-icon class="back-icon" @click="handleBack"><ArrowLeft /></el-icon>
        <h1 class="pc-exam-title">{{ examInfo.title }}</h1>
      </div>
      <div class="pc-header-center">
        <div class="pc-timer" :class="{ 'timer-warning': remainingSeconds < 300 }">
          <el-icon><Clock /></el-icon>
          <span class="timer-value">{{ formatTime(remainingSeconds) }}</span>
        </div>
      </div>
      <div class="pc-header-right">
        <el-button type="primary" class="submit-btn" @click="handleSubmit">
          <el-icon><Position /></el-icon>
          交卷
        </el-button>
      </div>
    </header>

    <!-- PC Main Content -->
    <main class="pc-main">
      <!-- Left Sidebar - Question Navigation -->
      <aside class="pc-sidebar">
        <div class="sidebar-header">
          <h3 class="sidebar-title">答题卡</h3>
          <div class="sidebar-stats">
            <div class="stat-item answered">
              <span class="status-dot"></span>
              <span>已答 {{ answeredCount }}</span>
            </div>
            <div class="stat-item unanswered">
              <span class="status-dot"></span>
              <span>未答 {{ unansweredCount }}</span>
            </div>
          </div>
        </div>
        <div class="sidebar-content">
          <div
            v-for="group in questionGroups"
            :key="group.type"
            class="question-group"
          >
            <div class="group-label">{{ group.label }}</div>
            <div class="group-questions">
              <button
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
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Right Main - Current Question -->
      <div class="pc-content">
        <article class="pc-question-card">
          <!-- Question Header -->
          <header class="question-header">
            <div class="question-info">
              <el-tag :type="getQuestionTagType(currentQuestion.type)" class="type-tag">
                {{ getQuestionTypeText(currentQuestion.type) }}
              </el-tag>
              <span class="question-index">第 {{ currentIndex + 1 }} 题</span>
              <span class="question-score">（{{ currentQuestion.score }}分）</span>
            </div>
          </header>

          <!-- Question Content -->
          <div class="question-content">
            {{ currentQuestion.content }}
          </div>

          <!-- Answer Area -->
          <div class="answer-area">
            <!-- Single Choice -->
            <div v-if="currentQuestion.type === 'choice'" class="options-list">
              <el-radio-group
                v-model="answers[currentQuestion.id]"
                @change="triggerAutoSave"
              >
                <el-radio
                  v-for="(option, index) in currentQuestion.options"
                  :key="index"
                  :label="index"
                  class="option-item"
                >
                  <span class="option-letter">{{ getOptionLetter(index) }}.</span>
                  <span class="option-text">{{ option }}</span>
                </el-radio>
              </el-radio-group>
            </div>

            <!-- Multiple Choice -->
            <div v-else-if="currentQuestion.type === 'multiple'" class="options-list">
              <el-checkbox-group
                v-model="answers[currentQuestion.id + '_multiple']"
                @change="triggerAutoSave"
              >
                <el-checkbox
                  v-for="(option, index) in currentQuestion.options"
                  :key="index"
                  :label="index"
                  class="option-item"
                >
                  <span class="option-letter">{{ getOptionLetter(index) }}.</span>
                  <span class="option-text">{{ option }}</span>
                </el-checkbox>
              </el-checkbox-group>
              <div class="multiple-hint">
                <el-icon><InfoFilled /></el-icon>
                已选择：{{ getMultipleSelectedLetters(currentQuestion.id) }}
              </div>
            </div>

            <!-- Judgment -->
            <div v-else-if="currentQuestion.type === 'judgment'" class="options-list judgment">
              <el-radio-group
                v-model="answers[currentQuestion.id]"
                @change="triggerAutoSave"
              >
                <el-radio :label="0" class="option-item judgment-option">
                  <span class="judgment-icon correct">✓</span>
                  <span>正确</span>
                </el-radio>
                <el-radio :label="1" class="option-item judgment-option">
                  <span class="judgment-icon incorrect">✗</span>
                  <span>错误</span>
                </el-radio>
              </el-radio-group>
            </div>

            <!-- Fill in the Blank -->
            <div v-else-if="currentQuestion.type === 'fill'" class="fill-inputs">
              <div
                v-for="(_, index) in (currentQuestion.blanks || [])"
                :key="index"
                class="fill-item"
              >
                <label class="fill-label">第 {{ index + 1 }} 空</label>
                <el-input
                  v-model="answers[currentQuestion.id + '_' + index]"
                  placeholder="请输入答案"
                  @change="triggerAutoSave"
                />
              </div>
            </div>

            <!-- Subjective -->
            <div v-else-if="currentQuestion.type === 'subjective'" class="subjective-area">
              <el-input
                v-model="answers[currentQuestion.id]"
                type="textarea"
                placeholder="请输入答案"
                :rows="8"
                :maxlength="currentQuestion.maxLength || 500"
                show-word-limit
                @change="triggerAutoSave"
              />
            </div>
          </div>

          <!-- Navigation Buttons -->
          <footer class="question-nav">
            <el-button
              size="large"
              :disabled="currentIndex === 0"
              @click="prevQuestion"
            >
              <el-icon><ArrowLeft /></el-icon>
              上一题
            </el-button>
            <div class="progress-info">
              <span class="progress-current">{{ currentIndex + 1 }}</span>
              <span class="progress-sep">/</span>
              <span class="progress-total">{{ questions.length }}</span>
            </div>
            <el-button
              size="large"
              :disabled="currentIndex === questions.length - 1"
              @click="nextQuestion"
            >
              下一题
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </footer>
        </article>
      </div>
    </main>

    <!-- Submit Dialog for PC -->
    <el-dialog
      v-model="showSubmitDialog"
      title="确认交卷"
      width="420px"
      :close-on-click-modal="false"
      class="submit-dialog"
    >
      <div class="submit-content">
        <div v-if="unansweredCount > 0" class="submit-warning">
          <el-icon class="warning-icon"><WarningFilled /></el-icon>
          <span>您还有 <strong>{{ unansweredCount }}</strong> 题未作答！</span>
        </div>
        <div class="submit-info">
          <div class="info-row">
            <span class="info-label">已答题数</span>
            <span class="info-value">{{ answeredCount }} / {{ questions.length }}</span>
          </div>
          <p class="info-tip">确认交卷后将无法修改答案。</p>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showSubmitDialog = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="confirmSubmit">
            确认交卷
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Result Dialog for PC -->
    <el-dialog
      v-model="showResultPopup"
      :title="null"
      width="380px"
      :close-on-click-modal="false"
      :show-close="false"
      class="result-dialog"
    >
      <div class="result-content">
        <!-- Pending Grading -->
        <div v-if="submitResult.hasPendingGrading || submitResult.needAIGrading" class="result-body">
          <div class="result-icon waiting">
            <el-icon><Clock /></el-icon>
          </div>
          <h3 class="result-title">交卷成功</h3>
          <p class="result-status">待批改</p>
          <p class="result-tip">批改完成后可查看成绩</p>
        </div>
        <!-- Auto Graded -->
        <div v-else-if="examInfo.autoGrade" class="result-body">
          <div class="result-icon success">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <h3 class="result-title">交卷成功</h3>
          <div class="score-display">
            <span class="score-value">{{ resultScore }}</span>
            <span class="score-unit">分</span>
          </div>
          <p class="result-tip">系统已自动批改</p>
        </div>
        <!-- Manual Grading -->
        <div v-else class="result-body">
          <div class="result-icon waiting">
            <el-icon><Clock /></el-icon>
          </div>
          <h3 class="result-title">交卷成功</h3>
          <p class="result-status">待批改</p>
          <p class="result-tip">批改完成后可查看成绩</p>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" size="large" class="confirm-btn" @click="goHome">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- Back Confirmation Dialog for PC -->
    <el-dialog
      v-model="showBackDialog"
      title="提示"
      width="380px"
      class="back-dialog"
    >
      <p class="back-message">确定要退出答题吗？当前答题进度将会保存。</p>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showBackDialog = false">取消</el-button>
          <el-button type="danger" @click="confirmBack">退出</el-button>
        </div>
      </template>
    </el-dialog>
  </div>

  <!-- Mobile Version -->
  <div v-else class="exam-start page">
    <!-- 顶部栏 -->
    <header class="header">
      <div class="header-left">
        <van-icon name="arrow-left" class="back-btn" @click="handleBack" />
        <h1 class="exam-title">{{ examInfo.title }}</h1>
      </div>
      <div class="header-right">
        <div class="progress">第 {{ currentIndex + 1 }}/{{ questions.length }} 题</div>
        <div class="timer" v-if="duration > 0" :class="{ 'timer-warning': remainingSeconds < 300 }">
          <van-icon name="clock-o" />
          <span>{{ formatTime(remainingSeconds) }}</span>
        </div>
      </div>
    </header>

    <!-- 题目区域 -->
    <main class="question-area">
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
    </main>

    <!-- 底部答题菜单栏 -->
    <footer class="exam-toolbar">
      <van-button
        class="toolbar-btn nav-btn"
        :disabled="currentIndex === 0"
        @click="prevQuestion"
      >
        <van-icon name="arrow-left" />
        上一题
      </van-button>
      <van-button
        class="toolbar-btn nav-btn"
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
    </footer>

    <!-- 跳转弹窗 -->
    <van-popup
      v-model:show="showJumpPopup"
      position="bottom"
      round
      closeable
      :style="{ height: '60%' }"
      class="jump-popup"
    >
      <div class="jump-popup-content">
        <h3 class="popup-title">题目跳转</h3>
        <div class="jump-summary">
          <div class="summary-item answered">
            <span class="dot"></span>
            <span>已答 {{ answeredCount }} 题</span>
          </div>
          <div class="summary-item unanswered">
            <span class="dot"></span>
            <span>未答 {{ questions.length - answeredCount }} 题</span>
          </div>
        </div>
        <div class="jump-groups">
          <div
            v-for="group in questionGroups"
            :key="group.type"
            class="question-group"
          >
            <div class="group-title">{{ group.label }}</div>
            <div class="group-questions" v-if="group.questions.length > 0">
              <button
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
              </button>
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
      class="submit-dialog"
      @confirm="confirmSubmit"
    >
      <div class="submit-dialog-content">
        <div v-if="unansweredCount > 0" class="warning">
          <van-icon name="warning-o" class="warning-icon" />
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
      :style="{ width: '85%', maxWidth: '340px' }"
      class="result-popup"
    >
      <div class="result-popup-content">
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
        <van-button type="primary" block round class="result-btn" @click="goHome">
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
import { useDevice } from '@/composables/useDevice';
import { ArrowLeft, ArrowRight, Clock, CircleCheck, WarningFilled, Position, InfoFilled } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const { isPC } = useDevice();

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
const showBackDialog = ref(false);
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

function getQuestionTagType(type) {
  const map = {
    choice: 'primary',
    multiple: 'success',
    fill: 'warning',
    judgment: 'info',
    subjective: 'danger'
  };
  return map[type] || 'info';
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
  if (isPC.value) {
    showBackDialog.value = true;
  } else {
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
}

function confirmBack() {
  showBackDialog.value = false;
  router.push('/student/home');
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
/* ==================== CSS 变量定义 ==================== */
:root {
  --exam-primary: var(--color-primary);
  --exam-primary-light: var(--color-primary-light-9);
  --exam-success: var(--color-success);
  --exam-success-light: var(--color-success-light-9);
  --exam-warning: var(--color-warning);
  --exam-warning-light: var(--color-warning-light-9);
  --exam-danger: var(--color-danger);
  --exam-danger-light: var(--color-danger-light-9);
  --exam-info: var(--text-color-secondary);
  --exam-info-light: var(--fill-color-light);
  
  --exam-text-primary: var(--text-color-primary);
  --exam-text-regular: var(--text-color-regular);
  --exam-text-secondary: var(--text-color-secondary);
  --exam-text-placeholder: var(--text-color-placeholder);
  
  --exam-border: var(--border-color);
  --exam-border-light: var(--border-color-light);
  --exam-border-lighter: var(--border-color-lighter);
  
  --exam-bg-page: var(--fill-color);
  --exam-bg-card: var(--fill-color-blank);
  --exam-bg-hover: var(--fill-color-light);
  
  --exam-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  --exam-shadow-light: 0 2px 8px rgba(0, 0, 0, 0.04);
  --exam-shadow-card: 0 4px 16px rgba(0, 0, 0, 0.06);
  
  --exam-radius: 8px;
  --exam-radius-lg: 12px;
  --exam-radius-xl: 16px;
  
  --exam-spacing-xs: 4px;
  --exam-spacing-sm: 8px;
  --exam-spacing-md: 16px;
  --exam-spacing-lg: 24px;
  --exam-spacing-xl: 32px;
  
  --exam-header-height: 60px;
  --exam-sidebar-width: 280px;
}

/* ==================== PC 端样式 ==================== */
.exam-start-pc {
  min-height: 100vh;
  background: var(--exam-bg-page);
  display: flex;
  flex-direction: column;
}

/* PC Header */
.pc-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--exam-header-height);
  background: var(--exam-bg-card);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--exam-spacing-lg);
  box-shadow: var(--exam-shadow-light);
  z-index: 100;
}

.pc-header-left {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-md);
}

.back-icon {
  font-size: 20px;
  color: var(--exam-text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  padding: var(--exam-spacing-sm);
  border-radius: var(--exam-radius);
}

.back-icon:hover {
  color: var(--exam-primary);
  background: var(--exam-primary-light);
}

.pc-exam-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--exam-text-primary);
  margin: 0;
}

.pc-header-center {
  display: flex;
  align-items: center;
}

.pc-timer {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-sm);
  padding: var(--exam-spacing-sm) var(--exam-spacing-lg);
  background: linear-gradient(135deg, var(--exam-primary), var(--exam-success));
  border-radius: 24px;
  color: var(--color-white);
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.pc-timer.timer-warning {
  background: linear-gradient(135deg, var(--exam-danger), var(--exam-warning));
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.timer-value {
  font-variant-numeric: tabular-nums;
}

.pc-header-right {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-md);
}

.submit-btn {
  padding: 10px 24px;
  font-weight: 500;
}

/* PC Main Layout */
.pc-main {
  display: flex;
  margin-top: var(--exam-header-height);
  min-height: calc(100vh - var(--exam-header-height));
}

/* PC Sidebar */
.pc-sidebar {
  width: var(--exam-sidebar-width);
  background: var(--exam-bg-card);
  border-right: 1px solid var(--exam-border-light);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: var(--exam-header-height);
  left: 0;
  bottom: 0;
  overflow: hidden;
}

.sidebar-header {
  padding: var(--exam-spacing-lg);
  border-bottom: 1px solid var(--exam-border-lighter);
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--exam-text-primary);
  margin: 0 0 var(--exam-spacing-md) 0;
}

.sidebar-stats {
  display: flex;
  gap: var(--exam-spacing-lg);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-xs);
  font-size: 13px;
  color: var(--exam-text-regular);
}

.stat-item .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.stat-item.answered .status-dot {
  background: var(--exam-success);
}

.stat-item.unanswered .status-dot {
  background: var(--exam-danger);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--exam-spacing-md);
}

.question-group {
  margin-bottom: var(--exam-spacing-lg);
}

.group-label {
  font-size: 13px;
  color: var(--exam-text-secondary);
  margin-bottom: var(--exam-spacing-sm);
  font-weight: 500;
}

.group-questions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--exam-spacing-sm);
}

.question-badge {
  width: 36px;
  height: 36px;
  border-radius: var(--exam-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--exam-danger-light);
  color: var(--exam-danger);
  border: 2px solid transparent;
  font-weight: 500;
}

.question-badge:hover {
  border-color: var(--exam-primary);
  transform: translateY(-1px);
}

.question-badge.answered {
  background: var(--exam-success-light);
  color: var(--exam-success);
}

.question-badge.current {
  border-color: var(--exam-primary);
  background: var(--exam-primary-light);
  color: var(--exam-primary);
  font-weight: 600;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

/* PC Content */
.pc-content {
  flex: 1;
  margin-left: var(--exam-sidebar-width);
  padding: var(--exam-spacing-lg);
  display: flex;
  justify-content: center;
}

.pc-question-card {
  width: 100%;
  max-width: 800px;
  background: var(--exam-bg-card);
  border-radius: var(--exam-radius-xl);
  box-shadow: var(--exam-shadow-card);
  overflow: hidden;
}

.question-header {
  padding: var(--exam-spacing-lg);
  border-bottom: 1px solid var(--exam-border-lighter);
}

.question-info {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-md);
}

.type-tag {
  font-weight: 500;
}

.question-index {
  font-size: 16px;
  font-weight: 600;
  color: var(--exam-text-primary);
}

.question-score {
  font-size: 14px;
  color: var(--exam-text-secondary);
}

.question-content {
  font-size: 18px;
  line-height: 1.8;
  color: var(--exam-text-primary);
  margin: var(--exam-spacing-lg);
  padding: var(--exam-spacing-lg);
  background: var(--exam-bg-page);
  border-radius: var(--exam-radius);
}

.answer-area {
  margin: var(--exam-spacing-lg);
}

/* PC Options */
.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--exam-spacing-md);
}

.option-item {
  display: flex;
  align-items: flex-start;
  padding: var(--exam-spacing-md) var(--exam-spacing-lg);
  background: var(--exam-bg-page);
  border-radius: var(--exam-radius);
  transition: all 0.2s;
  margin: 0;
  cursor: pointer;
}

.option-item:hover {
  background: var(--exam-primary-light);
}

.option-letter {
  font-weight: 600;
  margin-right: var(--exam-spacing-md);
  color: var(--exam-text-regular);
  min-width: 20px;
}

.option-text {
  flex: 1;
  color: var(--exam-text-primary);
  line-height: 1.6;
}

.multiple-hint {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-sm);
  margin-top: var(--exam-spacing-md);
  padding: var(--exam-spacing-md);
  background: var(--exam-warning-light);
  border-radius: var(--exam-radius);
  font-size: 14px;
  color: var(--exam-warning);
}

/* PC Judgment Options */
.options-list.judgment {
  flex-direction: row;
  gap: var(--exam-spacing-lg);
}

.judgment-option {
  flex: 1;
  justify-content: center;
  padding: var(--exam-spacing-lg);
}

.judgment-icon {
  font-size: 24px;
  font-weight: bold;
  margin-right: var(--exam-spacing-sm);
}

.judgment-icon.correct {
  color: var(--exam-success);
}

.judgment-icon.incorrect {
  color: var(--exam-danger);
}

/* PC Fill Inputs */
.fill-inputs {
  display: flex;
  flex-direction: column;
  gap: var(--exam-spacing-lg);
}

.fill-item {
  display: flex;
  flex-direction: column;
  gap: var(--exam-spacing-sm);
}

.fill-label {
  font-size: 14px;
  color: var(--exam-text-regular);
  font-weight: 500;
}

/* PC Subjective */
.subjective-area {
  background: var(--exam-bg-page);
  border-radius: var(--exam-radius);
  padding: var(--exam-spacing-xs);
}

/* PC Navigation */
.question-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--exam-spacing-lg);
  border-top: 1px solid var(--exam-border-lighter);
  background: var(--exam-bg-page);
}

.progress-info {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-size: 14px;
}

.progress-current {
  font-size: 18px;
  font-weight: 600;
  color: var(--exam-primary);
}

.progress-sep {
  color: var(--exam-text-secondary);
}

.progress-total {
  color: var(--exam-text-secondary);
}

/* PC Dialogs */
.submit-dialog,
.result-dialog,
.back-dialog {
  border-radius: var(--exam-radius-lg);
}

.submit-content {
  padding: var(--exam-spacing-sm) 0;
}

.submit-warning {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-sm);
  padding: var(--exam-spacing-md);
  background: var(--exam-danger-light);
  border-radius: var(--exam-radius);
  margin-bottom: var(--exam-spacing-md);
  color: var(--exam-warning);
}

.warning-icon {
  font-size: 20px;
  color: var(--exam-danger);
}

.submit-warning strong {
  color: var(--exam-danger);
}

.submit-info {
  color: var(--exam-text-regular);
  font-size: 14px;
  line-height: 1.8;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--exam-spacing-sm);
}

.info-label {
  color: var(--exam-text-secondary);
}

.info-value {
  font-weight: 500;
  color: var(--exam-text-primary);
}

.info-tip {
  color: var(--exam-text-secondary);
  font-size: 13px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--exam-spacing-md);
}

/* PC Result Dialog */
.result-content {
  text-align: center;
  padding: var(--exam-spacing-md) 0;
}

.result-body h3 {
  font-size: 20px;
  margin: var(--exam-spacing-md) 0;
  color: var(--exam-text-primary);
}

.result-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-size: 36px;
}

.result-icon.success {
  background: var(--exam-success-light);
  color: var(--exam-success);
}

.result-icon.waiting {
  background: var(--exam-warning-light);
  color: var(--exam-warning);
}

.result-status {
  font-size: 18px;
  color: var(--exam-warning);
  margin-bottom: var(--exam-spacing-xs);
}

.result-tip {
  color: var(--exam-text-secondary);
  font-size: 14px;
}

.score-display {
  margin: var(--exam-spacing-lg) 0;
}

.score-value {
  font-size: 56px;
  font-weight: 700;
  color: var(--exam-primary);
}

.score-unit {
  font-size: 20px;
  color: var(--exam-text-secondary);
  margin-left: var(--exam-spacing-xs);
}

.confirm-btn {
  width: 100%;
  margin-top: var(--exam-spacing-lg);
}

/* ==================== 移动端样式 ==================== */
.exam-start {
  min-height: 100vh;
  background: var(--exam-bg-page);
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
  background: var(--exam-bg-card);
  padding: 12px var(--exam-spacing-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--exam-shadow-light);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-md);
  flex: 1;
  min-width: 0;
}

.back-btn {
  font-size: 22px;
  color: var(--exam-text-primary);
  cursor: pointer;
  flex-shrink: 0;
  padding: var(--exam-spacing-xs);
}

.exam-title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--exam-spacing-xs);
  flex-shrink: 0;
}

.progress {
  font-size: 14px;
  color: var(--exam-text-secondary);
}

.timer {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-xs);
  color: var(--exam-danger);
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.timer.timer-warning {
  animation: pulse 1s ease-in-out infinite;
}

/* 题目区域 */
.question-area {
  margin-top: 60px;
  padding: var(--exam-spacing-md);
  flex: 1;
  overflow-y: auto;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--exam-spacing-md);
}

.question-type {
  background: var(--exam-warning-light);
  color: var(--exam-warning);
  padding: var(--exam-spacing-xs) var(--exam-spacing-md);
  border-radius: var(--exam-radius);
  font-size: 14px;
  font-weight: 500;
}

.question-score {
  color: var(--exam-text-secondary);
  font-size: 14px;
}

.question-content {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: var(--exam-spacing-lg);
  color: var(--exam-text-primary);
}

/* 选择题选项 */
.options {
  display: flex;
  flex-direction: column;
  gap: var(--exam-spacing-md);
}

.options.multiple .option {
  position: relative;
}

.options.multiple .option::before {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid var(--exam-border);
  border-radius: var(--exam-spacing-xs);
  margin-right: var(--exam-spacing-md);
  flex-shrink: 0;
  transition: all 0.2s;
}

.options.multiple .option.selected::before {
  background: var(--exam-warning);
  border-color: var(--exam-warning);
}

.multiple-hint {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-sm);
  margin-top: var(--exam-spacing-md);
  padding: var(--exam-spacing-sm) var(--exam-spacing-md);
  background: var(--exam-warning-light);
  border-radius: var(--exam-radius);
  font-size: 14px;
  color: var(--exam-warning);
}

.option {
  display: flex;
  align-items: center;
  padding: var(--exam-spacing-md);
  background: var(--exam-bg-card);
  border-radius: var(--exam-radius);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid var(--exam-border-lighter);
}

.option.selected {
  background: var(--exam-warning-light);
  border-color: var(--exam-warning);
}

.option-letter {
  width: 28px;
  height: 28px;
  background: var(--exam-bg-page);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: var(--exam-spacing-md);
  font-weight: 600;
  flex-shrink: 0;
  font-size: 14px;
  color: var(--exam-text-regular);
}

.option.selected .option-letter {
  background: var(--exam-warning);
  color: var(--color-white);
}

.option-text {
  flex: 1;
  font-size: 16px;
  color: var(--exam-text-primary);
}

/* 判断题选项 */
.options.judgment {
  flex-direction: row;
  gap: var(--exam-spacing-lg);
}

.judgment-option {
  flex: 1;
  justify-content: center;
  padding: var(--exam-spacing-lg);
}

.judgment-option .judgment-icon {
  font-size: 24px;
  font-weight: bold;
  margin-right: var(--exam-spacing-sm);
}

/* 填空题 */
.fill-inputs {
  display: flex;
  flex-direction: column;
  gap: var(--exam-spacing-md);
}

.fill-input {
  background: var(--exam-bg-card);
  border-radius: var(--exam-radius);
}

/* 主观题 */
.subjective-area {
  background: var(--exam-bg-card);
  border-radius: var(--exam-radius);
  overflow: hidden;
}

/* 底部答题菜单栏 */
.exam-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--exam-bg-card);
  padding: 10px 12px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  display: flex;
  gap: var(--exam-spacing-sm);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  z-index: 100;
}

.toolbar-btn {
  flex: 1;
  height: 40px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--exam-spacing-xs);
  border-radius: var(--exam-radius);
}

.nav-btn {
  background: var(--exam-bg-page);
  border: 1px solid var(--exam-border-light);
  color: var(--exam-text-regular);
}

.jump-btn {
  background: var(--exam-primary-light);
  color: var(--exam-primary);
  border: none;
}

.submit-btn {
  flex: 0.8;
  font-weight: 500;
}

/* 跳转弹窗 */
.jump-popup {
  border-radius: var(--exam-radius-lg) var(--exam-radius-lg) 0 0;
}

.jump-popup-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--exam-spacing-lg) var(--exam-spacing-md);
}

.popup-title {
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: var(--exam-spacing-md);
  color: var(--exam-text-primary);
}

.jump-summary {
  display: flex;
  justify-content: center;
  gap: var(--exam-spacing-lg);
  margin-bottom: var(--exam-spacing-md);
  font-size: 14px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-xs);
  color: var(--exam-text-regular);
}

.summary-item .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.summary-item.answered .dot {
  background: var(--exam-success);
}

.summary-item.unanswered .dot {
  background: var(--exam-danger);
}

.jump-groups {
  flex: 1;
  overflow-y: auto;
}

.question-group {
  margin-bottom: var(--exam-spacing-lg);
}

.group-title {
  font-size: 14px;
  color: var(--exam-text-secondary);
  margin-bottom: var(--exam-spacing-sm);
  padding-bottom: var(--exam-spacing-xs);
  border-bottom: 1px solid var(--exam-border-lighter);
}

.group-questions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--exam-spacing-sm);
}

.no-questions {
  color: var(--exam-text-secondary);
  font-size: 14px;
  padding: var(--exam-spacing-sm) 0;
}

/* 交卷确认弹窗 */
.submit-dialog-content {
  padding: var(--exam-spacing-lg);
}

.warning {
  display: flex;
  align-items: center;
  gap: var(--exam-spacing-sm);
  padding: var(--exam-spacing-md);
  background: var(--exam-warning-light);
  border-radius: var(--exam-radius);
  margin-bottom: var(--exam-spacing-md);
  color: var(--exam-warning);
}

.warning-icon {
  font-size: 20px;
  color: var(--exam-danger);
}

.warning strong {
  color: var(--exam-danger);
}

.submit-info {
  color: var(--exam-text-secondary);
  font-size: 14px;
  line-height: 1.8;
}

/* 结果弹窗 */
.result-popup {
  border-radius: var(--exam-radius-lg);
}

.result-popup-content {
  padding: var(--exam-spacing-xl) var(--exam-spacing-lg);
  text-align: center;
}

.result-popup-content h3 {
  font-size: 20px;
  margin-bottom: var(--exam-spacing-md);
  color: var(--exam-text-primary);
}

.result-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--exam-spacing-md);
  font-size: 32px;
}

.result-icon.success {
  background: var(--exam-success-light);
  color: var(--exam-success);
}

.result-icon.waiting {
  background: var(--exam-warning-light);
  color: var(--exam-warning);
}

.score-display {
  margin: var(--exam-spacing-lg) 0;
}

.score-value {
  font-size: 48px;
  font-weight: 700;
  color: var(--exam-warning);
}

.score-unit {
  font-size: 18px;
  color: var(--exam-text-secondary);
  margin-left: var(--exam-spacing-xs);
}

.score-tip {
  color: var(--exam-text-secondary);
  font-size: 14px;
  margin-bottom: var(--exam-spacing-lg);
}

.waiting-tip {
  font-size: 18px;
  color: var(--exam-warning);
  margin-bottom: var(--exam-spacing-xs);
}

.waiting-sub {
  color: var(--exam-text-secondary);
  font-size: 14px;
  margin-bottom: var(--exam-spacing-lg);
}

.result-btn {
  margin-top: var(--exam-spacing-md);
}

/* ==================== 响应式优化 ==================== */
@media (max-width: 375px) {
  .header {
    padding: 10px 12px;
  }

  .exam-title {
    font-size: 14px;
  }

  .exam-toolbar {
    gap: var(--exam-spacing-xs);
    padding: var(--exam-spacing-sm) 10px;
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

/* PC 端响应式 */
@media (min-width: 1400px) {
  .pc-sidebar {
    width: 320px;
  }
  
  .pc-content {
    margin-left: 320px;
  }
}
</style>
