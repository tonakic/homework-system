<template>
  <div class="page">
    <!-- PC Version -->
    <div v-if="isPC" class="grading-pc">
      <!-- Level 1: Exam task list -->
      <div v-if="currentView === 'list'" class="pc-level-1">
        <div class="pc-header">
          <h2>批改任务</h2>
          <el-button type="primary" :loading="loading" @click="loadTaskList">刷新</el-button>
        </div>
        <el-table :data="taskList" stripe style="width: 100%" v-loading="loading">
          <el-table-column prop="title" label="考试名称" min-width="180" />
          <el-table-column prop="subject" label="科目" width="100" />
          <el-table-column label="班级" width="120">
            <template #default="{ row }">
              {{ row.grade }}{{ row.class_name }}
            </template>
          </el-table-column>
          <el-table-column label="提交情况" width="150">
            <template #default="{ row }">
              <span class="pending-count">待批改: {{ row.pending_count }}</span>
              <span class="divider">|</span>
              <span class="graded-count">已批改: {{ row.graded_count }}</span>
            </template>
          </el-table-column>
          <el-table-column label="批改模式" width="100">
            <template #default="{ row }">
              {{ getModeText(row.grading_mode) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.pending_count > 0 ? 'warning' : 'success'">
                {{ row.pending_count > 0 ? '待批改' : '已完成' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="enterTask(row)">进入批改</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="taskList.length === 0 && !loading" description="暂无批改任务" />
      </div>

      <!-- Level 2: Student list -->
      <div v-else-if="currentView === 'students'" class="pc-level-2">
        <div class="pc-header">
          <el-button link @click="backToList">
            <el-icon><ArrowLeft /></el-icon>
            返回任务列表
          </el-button>
          <h2>{{ currentTask?.title || '学生列表' }}</h2>
        </div>
        <div class="pc-summary">
          <span>科目：{{ currentTask?.subject }}</span>
          <span class="divider">|</span>
          <span class="pending-text">待批改：{{ studentList.filter(s => s.status === 'submitted').length }} 人</span>
          <span class="divider">|</span>
          <span class="graded-text">已批改：{{ studentList.filter(s => s.status === 'graded').length }} 人</span>
        </div>
        <el-table :data="studentList" stripe style="width: 100%">
          <el-table-column prop="student_name" label="学生姓名" width="120" />
          <el-table-column prop="student_no" label="学号" width="120" />
          <el-table-column label="班级" width="120">
            <template #default="{ row }">
              {{ row.grade }}{{ row.class_name }}
            </template>
          </el-table-column>
          <el-table-column label="提交时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.submit_time) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'graded' ? 'success' : 'warning'">
                {{ row.status === 'graded' ? '已批改' : '待批改' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="selectStudent(row)">批改</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="studentList.length === 0" description="暂无学生答卷" />
      </div>

      <!-- Level 3: Grading interface -->
      <div v-else-if="currentView === 'detail'" class="pc-level-3">
        <div class="pc-header">
          <el-button link @click="backToStudents">
            <el-icon><ArrowLeft /></el-icon>
            返回学生列表
          </el-button>
          <h2>{{ studentDetail.student_name || '批改详情' }}</h2>
          <div class="pc-student-info">
            <span>{{ studentDetail.grade }}{{ studentDetail.class_name }}</span>
            <span class="divider">|</span>
            <span>{{ studentDetail.student_no }}</span>
            <span class="divider">|</span>
            <span>提交时间：{{ formatTime(studentDetail.submit_time) }}</span>
            <el-tag :type="studentDetail.status === 'graded' ? 'success' : 'warning'" class="status-tag">
              {{ studentDetail.status === 'graded' ? '已批改' : '待批改' }}
            </el-tag>
          </div>
        </div>

        <div class="pc-grading-container">
          <!-- Left: Question list sidebar -->
          <div class="pc-question-sidebar">
            <div class="sidebar-title">题目列表</div>
            <div class="question-nav-list">
              <div
                v-for="(item, index) in answerDetail"
                :key="item.id"
                :class="['question-nav-item', { active: currentQuestionIndex === index }]"
                @click="currentQuestionIndex = index"
              >
                <span class="nav-index">第{{ index + 1 }}题</span>
                <span class="nav-type">{{ getTypeText(item.question_type) }}</span>
                <span class="nav-score">{{ item.max_score }}分</span>
                <el-tag
                  v-if="item.teacher_score !== null"
                  type="success"
                  size="small"
                >已批</el-tag>
                <el-tag
                  v-else-if="item.ai_score !== null"
                  type="info"
                  size="small"
                >AI</el-tag>
              </div>
            </div>
          </div>

          <!-- Right: Current question detail -->
          <div class="pc-question-detail" v-if="currentQuestion">
            <div class="question-detail-header">
              <span class="question-index">第{{ currentQuestionIndex + 1 }}题</span>
              <span class="question-type">{{ getTypeText(currentQuestion.question_type) }}</span>
              <span class="question-score">（{{ currentQuestion.max_score }}分）</span>
            </div>

            <!-- Question content -->
            <div class="question-content-section">
              <div class="section-label">题目内容</div>
              <div class="content-text">{{ currentQuestion.content }}</div>
              <!-- Options -->
              <div v-if="currentQuestion.options" class="options-list">
                <div
                  v-for="(opt, optIndex) in currentQuestion.options"
                  :key="optIndex"
                  :class="[
                    'option-item',
                    { correct: isCorrectOption(currentQuestion, optIndex) },
                    { selected: is_selected(currentQuestion, optIndex) }
                  ]"
                >
                  {{ String.fromCharCode(65 + optIndex) }}. {{ formatOptionText(opt) }}
                </div>
              </div>
            </div>

            <!-- Student answer -->
            <div class="answer-section student-answer">
              <div class="section-label">学生答案</div>
              <div class="answer-content">
                <template v-if="currentQuestion.question_type === 'choice' || currentQuestion.question_type === 'multiple'">
                  {{ formatStudentAnswer(currentQuestion) || '未作答' }}
                </template>
                <template v-else>
                  {{ currentQuestion.student_answer_text || '未作答' }}
                </template>
              </div>
            </div>

            <!-- Reference answer -->
            <div class="answer-section reference-answer">
              <div class="section-label">参考答案</div>
              <div class="answer-content">{{ currentQuestion.answer }}</div>
            </div>

            <!-- AI grading result -->
            <div v-if="currentQuestion.ai_score !== null && currentQuestion.ai_score !== undefined" class="ai-result-pc">
              <div class="result-header">
                <el-tag type="info">AI批改</el-tag>
                <span class="result-score">得分：{{ currentQuestion.ai_score }}/{{ currentQuestion.max_score }} 分</span>
              </div>
              <div v-if="currentQuestion.ai_comment" class="ai-comment">
                {{ currentQuestion.ai_comment }}
              </div>
            </div>

            <!-- Teacher grading result -->
            <div v-if="currentQuestion.teacher_score !== null" class="teacher-result-pc">
              <div class="result-header">
                <el-tag type="success">教师批改</el-tag>
                <span class="result-score">得分：{{ currentQuestion.teacher_score }}/{{ currentQuestion.max_score }} 分</span>
              </div>
              <div v-if="currentQuestion.teacher_comment" class="teacher-comment">
                {{ currentQuestion.teacher_comment }}
              </div>
            </div>

            <!-- Auto result for objective questions -->
            <div
              v-if="(currentQuestion.question_type === 'choice' || currentQuestion.question_type === 'multiple' || currentQuestion.question_type === 'judgment') && currentQuestion.is_correct !== null"
              class="auto-result-pc"
              :class="currentQuestion.is_correct ? 'correct' : 'wrong'"
            >
              <el-tag :type="currentQuestion.is_correct ? 'success' : 'danger'">
                {{ currentQuestion.is_correct ? '正确' : '错误' }}
              </el-tag>
              <span class="result-score">得分：{{ currentQuestion.score || 0 }}/{{ currentQuestion.max_score }} 分</span>
            </div>

            <!-- Teacher grading input -->
            <div
              v-if="needsTeacherGrading(currentQuestion) && (isGrading || currentQuestion.teacher_score !== null)"
              class="teacher-grading-pc"
            >
              <div class="grading-header">教师批改</div>
              <div class="grading-input-row">
                <span class="grading-label">得分：</span>
                <el-input-number
                  v-model="currentQuestion.input_score"
                  :min="0"
                  :max="currentQuestion.max_score"
                  :disabled="!isGrading"
                  :step="1"
                  :precision="0"
                />
                <span class="score-unit">/ {{ currentQuestion.max_score }} 分</span>
              </div>
              <div class="grading-comment-row">
                <span class="grading-label">批注：</span>
                <el-input
                  v-model="currentQuestion.teacher_comment"
                  type="textarea"
                  :rows="3"
                  placeholder="批注（选填）"
                  :disabled="!isGrading"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation and actions -->
        <div class="pc-grading-actions">
          <div class="nav-buttons">
            <el-button
              :disabled="currentQuestionIndex === 0"
              @click="currentQuestionIndex--"
            >
              <el-icon><ArrowLeft /></el-icon>
              上一题
            </el-button>
            <span class="question-progress">{{ currentQuestionIndex + 1 }} / {{ answerDetail.length }}</span>
            <el-button
              :disabled="currentQuestionIndex === answerDetail.length - 1"
              @click="currentQuestionIndex++"
            >
              下一题
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
          <div class="action-buttons">
            <el-button v-if="!isGrading && studentDetail.status === 'submitted'" type="primary" @click="startGrading">
              开始批改
            </el-button>
            <el-button v-if="isGrading" type="primary" :loading="saving" @click="saveGrading">
              保存批改结果
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Version -->
    <div v-else>
      <!-- 第一层：考试任务列表 -->
      <template v-if="currentView === 'list'">
        <van-nav-bar title="批改任务" left-arrow @click-left="$router.back()" />
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <div class="page-content">
            <van-empty v-if="taskList.length === 0 && !loading" description="暂无批改任务" />
            <div v-else class="task-list">
              <div
                v-for="task in taskList"
                :key="task.task_id"
                class="task-card card"
                @click="enterTask(task)"
              >
                <div class="task-header">
                  <span class="task-title">{{ task.title }}</span>
                  <span :class="['task-status', task.pending_count > 0 ? 'pending' : 'done']">
                    {{ task.pending_count > 0 ? '待批改' : '已完成' }}
                  </span>
                </div>
                <div class="task-info">
                  <span class="subject-tag">{{ task.subject }}</span>
                  <span class="divider">|</span>
                  <span class="pending-text">待批改 {{ task.pending_count }} 份</span>
                  <span class="divider">|</span>
                  <span class="graded-text">已批改 {{ task.graded_count }} 份</span>
                </div>
                <div class="task-mode">
                  批改模式：{{ getModeText(task.grading_mode) }}
                </div>
              </div>
            </div>
          </div>
        </van-pull-refresh>
      </template>

      <!-- 第二层：学生列表 -->
      <template v-else-if="currentView === 'students'">
        <van-nav-bar
          :title="currentTask?.title || '学生列表'"
          left-arrow
          @click-left="backToList"
        />
        <div class="page-content">
          <div class="task-summary card">
            <div class="summary-row">
              <span class="summary-label">科目：</span>
              <span class="summary-value">{{ currentTask?.subject }}</span>
            </div>
            <div class="summary-row">
              <span class="pending-text">待批改：{{ studentList.filter(s => s.status === 'submitted').length }} 人</span>
              <span class="divider">|</span>
              <span class="graded-text">已批改：{{ studentList.filter(s => s.status === 'graded').length }} 人</span>
            </div>
          </div>

          <van-empty v-if="studentList.length === 0" description="暂无学生答卷" />
          <div v-else class="student-list-page">
            <div
              v-for="student in studentList"
              :key="student.id"
              class="student-card card"
              @click="selectStudent(student)"
            >
              <div class="student-header">
                <span class="student-name">{{ student.student_name }}</span>
                <span :class="['student-status', student.status === 'graded' ? 'done' : 'pending']">
                  {{ student.status === 'graded' ? '已批改' : '待批改' }}
                </span>
              </div>
              <div class="student-meta">
                <span>{{ student.student_no }}</span>
                <span class="divider">|</span>
                <span>{{ student.grade }}{{ student.class_name }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 第三层：学生答卷详情/批改界面 -->
      <template v-else-if="currentView === 'detail'">
        <van-nav-bar
          :title="studentDetail.student_name || '批改详情'"
          left-arrow
          @click-left="backToStudents"
        />
        <div class="page-content">
          <!-- 学生信息卡片 -->
          <div class="student-info-card card">
            <div class="student-info">
              <div class="info-row">
                <span class="label">学生姓名：</span>
                <span class="value">{{ studentDetail.student_name }}</span>
              </div>
              <div class="info-row">
                <span class="label">年级班级：</span>
                <span class="value">{{ studentDetail.grade }}{{ studentDetail.class_name }}</span>
              </div>
              <div class="info-row">
                <span class="label">考试时间：</span>
                <span class="value">{{ formatTime(studentDetail.submit_time) }}</span>
              </div>
              <div class="info-row">
                <span class="label">批改状态：</span>
                <span :class="['status-badge', studentDetail.status === 'graded' ? 'done' : 'pending']">
                  {{ studentDetail.status === 'graded' ? '已批改' : '待批改' }}
                </span>
              </div>
              <div class="info-row">
                <span class="label">题目数量：</span>
                <span class="value">{{ answerDetail.length }} 题</span>
              </div>
            </div>
            <div v-if="studentDetail.status === 'submitted'" class="action-btn">
              <van-button type="primary" size="small" @click="startGrading">
                开始批改
              </van-button>
            </div>
          </div>

          <!-- 题目列表 -->
          <div class="question-list">
            <div
              v-for="(item, index) in answerDetail"
              :key="item.id"
              class="question-card card"
            >
              <div class="question-header">
                <span class="question-index">第{{ index + 1 }}题</span>
                <span class="question-type">{{ getTypeText(item.question_type) }}</span>
                <span class="question-score">（{{ item.max_score }}分）</span>
              </div>

              <!-- 题目内容 -->
              <div class="question-content">
                <div class="content-text">{{ item.content }}</div>
                <!-- 选项 -->
                <div v-if="item.options" class="options-list">
                  <div
                    v-for="(opt, optIndex) in item.options"
                    :key="optIndex"
                    :class="[
                      'option-item',
                      { correct: isCorrectOption(item, optIndex) },
                      { selected: is_selected(item, optIndex) }
                    ]"
                  >
                    {{ String.fromCharCode(65 + optIndex) }}. {{ formatOptionText(opt) }}
                  </div>
                </div>
              </div>

              <!-- 学生答案 -->
              <div class="answer-section student-answer">
                <div class="answer-label">学生答案：</div>
                <div class="answer-content">
                  <template v-if="item.question_type === 'choice' || item.question_type === 'multiple'">
                    {{ formatStudentAnswer(item) || '未作答' }}
                  </template>
                  <template v-else>
                    {{ item.student_answer_text || '未作答' }}
                  </template>
                </div>
              </div>

              <!-- 正确答案 -->
              <div class="answer-section reference-answer">
                <div class="answer-label">参考答案：</div>
                <div class="answer-content">{{ item.answer }}</div>
              </div>

              <!-- AI批改结果（AI批改模式或混合模式中AI批改的题目） -->
              <div v-if="item.ai_score !== null && item.ai_score !== undefined" class="ai-result">
                <div class="ai-badge">AI批改</div>
                <div class="ai-info">
                  <span>得分：{{ item.ai_score }}/{{ item.max_score }} 分</span>
                </div>
                <div v-if="item.ai_comment" class="ai-comment">
                  {{ item.ai_comment }}
                </div>
              </div>

              <!-- 教师批改区域 -->
              <div
                v-if="needsTeacherGrading(item) && (isGrading || item.teacher_score !== null)"
                class="teacher-grading"
              >
                <div class="grading-label">教师批改：</div>
                <div class="grading-input">
                  <van-stepper
                    v-model="item.input_score"
                    :min="0"
                    :max="item.max_score"
                    :disabled="!isGrading"
                    integer
                  />
                  <span class="score-unit">/{{ item.max_score }}分</span>
                </div>
                <textarea
                  v-model="item.teacher_comment"
                  class="comment-input"
                  placeholder="批注（选填）"
                  :disabled="!isGrading"
                ></textarea>
              </div>

              <!-- 已批改显示 -->
              <div v-if="item.teacher_score !== null" class="teacher-result">
                <span class="teacher-badge">教师批改</span>
                <span>得分：{{ item.teacher_score }}/{{ item.max_score }} 分</span>
                <span v-if="item.teacher_comment" class="teacher-comment-text">
                  （{{ item.teacher_comment }}）
                </span>
              </div>

              <!-- 客观题自动判定结果 -->
              <div
                v-if="(item.question_type === 'choice' || item.question_type === 'multiple' || item.question_type === 'judgment') && item.is_correct !== null"
                class="auto-result"
              >
                <span :class="['result-badge', item.is_correct ? 'correct' : 'wrong']">
                  {{ item.is_correct ? '正确' : '错误' }}
                </span>
                <span>得分：{{ item.score || 0 }}/{{ item.max_score }} 分</span>
              </div>
            </div>
          </div>

          <!-- 批改操作按钮 -->
          <div v-if="isGrading" class="grading-actions">
            <van-button block type="primary" :loading="saving" @click="saveGrading">
              保存批改结果
            </van-button>
          </div>
        </div>
      </template>

      <!-- 学生选择弹窗 -->
      <van-popup v-model:show="showStudentPicker" position="bottom" round>
        <div class="student-picker">
          <div class="picker-header">
            <span>选择学生答卷</span>
            <van-icon name="cross" @click="showStudentPicker = false" />
          </div>
          <div class="student-list">
            <div
              v-for="student in studentList"
              :key="student.id"
              class="student-item"
              @click="selectStudent(student)"
            >
              <div class="student-name">{{ student.student_name }}</div>
              <div class="student-meta">
                <span>{{ student.student_no }}</span>
                <span class="divider">|</span>
                <span :class="['status-badge', student.status === 'graded' ? 'done' : 'pending']">
                  {{ student.status === 'graded' ? '已批改' : '待批改' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </van-popup>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { showSuccessToast, showFailToast } from 'vant';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { useDevice } from '@/composables/useDevice';
import api from '@/api/index';

// Device detection
const { isPC } = useDevice();

// 视图状态
const currentView = ref('list'); // 'list' | 'students' | 'detail'
const loading = ref(false);
const refreshing = ref(false);
const saving = ref(false);
const isGrading = ref(false);

// PC current question index
const currentQuestionIndex = ref(0);

// 考试任务列表
const taskList = ref([]);

// 当前选中的任务
const currentTask = ref(null);

// 学生列表
const studentList = ref([]);
const showStudentPicker = ref(false);

// 学生答卷详情
const studentDetail = ref({});
const answerDetail = ref([]);

// Current question computed
const currentQuestion = computed(() => {
  return answerDetail.value[currentQuestionIndex.value] || null;
});

// 加载考试任务列表
async function loadTaskList() {
  loading.value = true;
  try {
    const res = await api.get('/grading/pending');
    if (res.code === 0) {
      taskList.value = res.data || [];
    }
  } catch (err) {
    console.error('加载任务列表失败:', err);
  } finally {
    loading.value = false;
  }
}

// 下拉刷新
async function onRefresh() {
  await loadTaskList();
  refreshing.value = false;
}

// 进入考试任务 - 显示学生列表
async function enterTask(task) {
  currentTask.value = task;
  try {
    const res = await api.get(`/grading/task/${task.task_id}/students`);
    if (res.code === 0) {
      studentList.value = res.data || [];
      currentView.value = 'students';
    }
  } catch (err) {
    if (isPC.value) {
      ElMessage.error(err.message || '加载学生列表失败');
    } else {
      showFailToast(err.message || '加载学生列表失败');
    }
  }
}

// 选择学生 - 进入批改详情
async function selectStudent(student) {
  showStudentPicker.value = false;
  try {
    const res = await api.get(`/grading/answer/${student.answer_id}`);
    if (res.code === 0) {
      studentDetail.value = res.data.student || {};
      answerDetail.value = (res.data.questions || []).map(q => {
        // 正确初始化 input_score：优先使用 teacher_score，其次 ai_score，再次 score
        let inputScore = 0;
        if (q.teacher_score !== null && q.teacher_score !== undefined) {
          inputScore = Number(q.teacher_score);
        } else if (q.ai_score !== null && q.ai_score !== undefined) {
          inputScore = Number(q.ai_score);
        } else if (q.score !== null && q.score !== undefined) {
          inputScore = Number(q.score);
        }
        // 确保 inputScore 在有效范围内
        inputScore = Math.max(0, Math.min(inputScore, q.max_score || 100));

        return {
          ...q,
          input_score: inputScore,
          teacher_comment: q.teacher_comment || ''
        };
      });
      isGrading.value = student.status === 'submitted';
      currentQuestionIndex.value = 0; // Reset to first question on PC
      currentView.value = 'detail';
    }
  } catch (err) {
    if (isPC.value) {
      ElMessage.error(err.message || '加载答卷详情失败');
    } else {
      showFailToast(err.message || '加载答卷详情失败');
    }
  }
}

// 返回学生列表
function backToStudents() {
  currentView.value = 'students';
  studentDetail.value = {};
  answerDetail.value = [];
  isGrading.value = false;
  currentQuestionIndex.value = 0;
}

// 返回列表
function backToList() {
  currentView.value = 'list';
  currentTask.value = null;
  studentDetail.value = {};
  answerDetail.value = [];
  isGrading.value = false;
  currentQuestionIndex.value = 0;
}

// 开始批改
function startGrading() {
  isGrading.value = true;
}

// 保存批改结果
async function saveGrading() {
  saving.value = true;
  try {
    const gradingData = answerDetail.value
      .filter(q => needsTeacherGrading(q))
      .map(q => ({
        answerDetailId: q.id,
        score: q.input_score,
        comment: q.teacher_comment
      }));

    if (gradingData.length > 0) {
      const res = await api.post('/grading/save', {
        examAnswerId: studentDetail.value.answer_id,
        gradings: gradingData
      });
      if (res.code !== 0) {
        if (isPC.value) {
          ElMessage.error(res.message || '保存失败');
        } else {
          showFailToast(res.message || '保存失败');
        }
        return;
      }
    }

    if (isPC.value) {
      ElMessage.success('批改完成');
    } else {
      showSuccessToast('批改完成');
    }
    isGrading.value = false;
    // 刷新详情
    await selectStudent({ answer_id: studentDetail.value.answer_id, status: 'graded' });
    // 刷新任务列表
    await loadTaskList();
  } catch (err) {
    if (isPC.value) {
      ElMessage.error(err.message || '保存失败');
    } else {
      showFailToast(err.message || '保存失败');
    }
  } finally {
    saving.value = false;
  }
}

// 判断是否需要教师批改
function needsTeacherGrading(item) {
  // 客观题（单选、多选、判断题）已经自动判定，不需要教师批改
  if (item.question_type === 'choice' || item.question_type === 'multiple' || item.question_type === 'judgment') {
    return false;
  }
  // AI批改模式不需要教师批改
  if (studentDetail.value?.grading_mode === 'ai') {
    return false;
  }
  // 混合模式需要检查配置
  if (studentDetail.value?.grading_mode === 'mixed') {
    // 根据题目类型判断（填空题、主观题）
    const mixedConfig = studentDetail.value?.mixed_config || {};
    const typeKey = item.question_type; // 'fill', 'subjective'
    return mixedConfig[typeKey] === 'manual';
  }
  // 手动批改模式需要教师批改（填空题、主观题）
  return true;
}

// 获取批改模式文本
function getModeText(mode) {
  const modeMap = {
    'ai': 'AI批改',
    'manual': '手动批改',
    'mixed': '混合模式'
  };
  return modeMap[mode] || mode;
}

// 获取题型文本
function getTypeText(type) {
  const typeMap = {
    'choice': '单选题',
    'multiple': '多选题',
    'fill': '填空题',
    'judgment': '判断题',
    'subjective': '主观题'
  };
  return typeMap[type] || type;
}

// 格式化时间
function formatTime(time) {
  if (!time) return '-';
  return time.replace('T', ' ').slice(0, 19);
}

// 格式化选项文本（去除已有的字母前缀）
function formatOptionText(opt) {
  if (!opt) return '';
  // 去除形如 "A. "、"A、"、"A." 等前缀
  return opt.replace(/^[A-Fa-f][.、．\s]+/, '');
}

// 格式化学生答案
function formatStudentAnswer(item) {
  if (!item.student_answer) return null;
  if (item.question_type === 'multiple') {
    return (item.student_answer || '').split('').join('、');
  }
  if (item.question_type === 'judgment') {
    const ans = item.student_answer;
    if (ans === 'A' || ans === '0' || ans === 0) return '正确';
    if (ans === 'B' || ans === '1' || ans === 1) return '错误';
    return ans;
  }
  return item.student_answer;
}

// 判断是否是正确选项
function isCorrectOption(item, optIndex) {
  const correctAnswer = item.answer || '';
  const optLetter = String.fromCharCode(65 + optIndex);
  return correctAnswer.includes(optLetter);
}

// 判断学生是否选择了该选项
function is_selected(item, optIndex) {
  const studentAns = item.student_answer || '';
  const optLetter = String.fromCharCode(65 + optIndex);
  return studentAns.includes(optLetter);
}

onMounted(() => {
  loadTaskList();
});
</script>

<style scoped>
/* ============================ Design System Variables ============================ */
/*
 * Using CSS variables from:
 * - styles/index.css (primary, success, warning, danger, info colors)
 * - Element Plus theme variables (--color-*, --text-color-*, --border-color-*, etc.)
 */

/* ============================ PC Styles ============================ */
.grading-pc {
  padding: var(--spacing-lg, 20px);
  min-height: 100vh;
  background-color: var(--bg-color);
}

.pc-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 16px);
  margin-bottom: var(--spacing-lg, 20px);
}

.pc-header h2 {
  margin: 0;
  font-size: var(--font-size-xl, 20px);
  color: var(--text-color-primary);
}

.pc-level-1,
.pc-level-2,
.pc-level-3 {
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-lg, 12px);
  padding: var(--spacing-lg, 20px);
  box-shadow: var(--box-shadow-light);
}

.pc-summary {
  padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
  background-color: var(--fill-color);
  border-radius: var(--border-radius-md, 8px);
  margin-bottom: var(--spacing-md, 16px);
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-secondary);
}

.pc-student-info {
  margin-left: auto;
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-secondary);
}

.status-tag {
  margin-left: var(--spacing-md, 12px);
}

/* PC Grading Container */
.pc-grading-container {
  display: flex;
  gap: var(--spacing-lg, 20px);
  min-height: 500px;
}

.pc-question-sidebar {
  width: 240px;
  flex-shrink: 0;
  border: 1px solid var(--border-color-lighter);
  border-radius: var(--border-radius-lg, 12px);
  overflow: hidden;
}

.sidebar-title {
  padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
  background-color: var(--fill-color);
  font-weight: 500;
  color: var(--text-color-primary);
  border-bottom: 1px solid var(--border-color-lighter);
}

.question-nav-list {
  max-height: 500px;
  overflow-y: auto;
}

.question-nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
  cursor: pointer;
  transition: background-color var(--transition-duration);
  border-bottom: 1px solid var(--border-color-extra-light, var(--border-color-lighter));
}

.question-nav-item:hover {
  background-color: var(--fill-color);
}

.question-nav-item.active {
  background-color: var(--color-primary-light-9);
  border-left: 3px solid var(--color-primary);
}

.nav-index {
  font-weight: 500;
  color: var(--text-color-primary);
}

.nav-type {
  font-size: var(--font-size-xs, 12px);
  color: var(--text-color-secondary);
}

.nav-score {
  font-size: var(--font-size-xs, 12px);
  color: var(--text-color-secondary);
  margin-left: auto;
}

/* PC Question Detail */
.pc-question-detail {
  flex: 1;
  border: 1px solid var(--border-color-lighter);
  border-radius: var(--border-radius-lg, 12px);
  padding: var(--spacing-lg, 20px);
  overflow-y: auto;
}

.question-detail-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 12px);
  margin-bottom: var(--spacing-lg, 20px);
  padding-bottom: var(--spacing-md, 16px);
  border-bottom: 1px solid var(--border-color-lighter);
}

.question-detail-header .question-index {
  font-size: var(--font-size-lg, 18px);
  font-weight: 500;
  color: var(--text-color-primary);
}

.question-detail-header .question-type {
  font-size: var(--font-size-xs, 12px);
  padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  background-color: var(--fill-color);
  border-radius: var(--border-radius-sm, 4px);
  color: var(--text-color-secondary);
}

.question-detail-header .question-score {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-placeholder);
}

.section-label {
  font-size: var(--font-size-xs, 13px);
  color: var(--text-color-placeholder);
  margin-bottom: var(--spacing-sm, 8px);
}

.question-content-section {
  margin-bottom: var(--spacing-lg, 20px);
  padding: var(--spacing-md, 16px);
  background-color: var(--fill-color-lighter, var(--fill-color));
  border-radius: var(--border-radius-md, 8px);
}

.question-content-section .content-text {
  font-size: var(--font-size-base, 15px);
  line-height: 1.8;
  color: var(--text-color-primary);
  white-space: pre-wrap;
}

.answer-section {
  margin-bottom: var(--spacing-md, 16px);
  padding: var(--spacing-md, 16px);
  border-radius: var(--border-radius-md, 8px);
}

.answer-section.student-answer {
  background-color: var(--fill-color);
  border-left: 3px solid var(--color-primary);
}

.answer-section.reference-answer {
  background-color: var(--color-success-light);
  border-left: 3px solid var(--color-success);
}

.answer-section .answer-content {
  font-size: var(--font-size-base, 15px);
  color: var(--text-color-primary);
  line-height: 1.6;
}

.ai-result-pc,
.teacher-result-pc,
.auto-result-pc {
  margin-top: var(--spacing-md, 16px);
  padding: var(--spacing-md, 16px);
  border-radius: var(--border-radius-md, 8px);
}

.ai-result-pc {
  background-color: var(--color-primary-light-9);
  border-left: 3px solid var(--color-primary);
}

.teacher-result-pc {
  background-color: var(--color-success-light);
  border-left: 3px solid var(--color-success);
}

.auto-result-pc {
  background-color: var(--fill-color);
}

.auto-result-pc.correct {
  background-color: var(--color-success-light);
}

.auto-result-pc.wrong {
  background-color: var(--color-danger-light);
}

.result-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 12px);
  margin-bottom: var(--spacing-sm, 8px);
}

.result-score {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-secondary);
}

.ai-comment,
.teacher-comment {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-secondary);
  line-height: 1.6;
  margin-top: var(--spacing-sm, 8px);
}

.teacher-grading-pc {
  margin-top: var(--spacing-lg, 20px);
  padding: var(--spacing-lg, 20px);
  background-color: var(--color-warning-light);
  border-radius: var(--border-radius-md, 8px);
  border-left: 3px solid var(--color-warning);
}

.grading-header {
  font-size: var(--font-size-base, 15px);
  font-weight: 500;
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-md, 16px);
}

.grading-input-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 12px);
  margin-bottom: var(--spacing-md, 16px);
}

.grading-label {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-secondary);
}

.score-unit {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-placeholder);
}

.grading-comment-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md, 12px);
}

.grading-comment-row .grading-label {
  padding-top: var(--spacing-sm, 8px);
  flex-shrink: 0;
}

.grading-comment-row .el-textarea {
  flex: 1;
}

/* PC Grading Actions */
.pc-grading-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-lg, 20px);
  padding: var(--spacing-md, 16px) var(--spacing-lg, 20px);
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-lg, 12px);
  border: 1px solid var(--border-color-lighter);
}

.nav-buttons {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 16px);
}

.question-progress {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-secondary);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-md, 12px);
}

/* PC Options List */
.options-list {
  margin-top: var(--spacing-md, 12px);
}

.option-item {
  padding: 10px var(--spacing-md, 14px);
  margin-bottom: var(--spacing-sm, 8px);
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-md, 6px);
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-primary);
  border: 1px solid var(--border-color-lighter);
  transition: all var(--transition-duration);
}

.option-item.correct {
  background-color: var(--color-success-light);
  color: var(--color-success);
  border-color: var(--color-success);
}

.option-item.selected {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light-9);
}

/* Divider */
.divider {
  margin: 0 var(--spacing-sm, 8px);
  color: var(--border-color);
}

/* Pending/Graded text colors */
.pending-text {
  color: var(--color-warning);
}

.graded-text {
  color: var(--color-success);
}

.pending-count {
  color: var(--color-warning);
}

.graded-count {
  color: var(--color-success);
}

/* ============================ Mobile Styles ============================ */
.page-content {
  padding: var(--spacing-sm, 12px);
  padding-bottom: var(--spacing-lg, 20px);
}

.card {
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-lg, 12px);
  padding: var(--spacing-md, 16px);
  margin-bottom: var(--spacing-sm, 12px);
  box-shadow: var(--box-shadow-light);
}

/* 任务列表 */
.task-card {
  cursor: pointer;
  transition: transform var(--transition-duration);
}

.task-card:active {
  transform: scale(0.98);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm, 8px);
}

.task-title {
  font-size: var(--font-size-md, 16px);
  font-weight: 500;
  color: var(--text-color-primary);
}

.task-status {
  font-size: var(--font-size-xs, 12px);
  padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  border-radius: var(--border-radius-sm, 4px);
}

.task-status.pending {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.task-status.done {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.task-info {
  font-size: var(--font-size-xs, 13px);
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-xs, 4px);
}

.subject-tag {
  display: inline-block;
  padding: 2px var(--spacing-sm, 8px);
  background-color: var(--color-primary-light-9);
  color: var(--color-primary);
  border-radius: var(--border-radius-sm, 4px);
  font-size: var(--font-size-xs, 12px);
}

.task-mode {
  font-size: var(--font-size-xs, 12px);
  color: var(--text-color-placeholder);
}

/* 学生列表页面 */
.task-summary {
  margin-bottom: var(--spacing-sm, 12px);
}

.summary-row {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-xs, 4px);
}

.summary-row:last-child {
  margin-bottom: 0;
}

.summary-label {
  color: var(--text-color-placeholder);
}

.summary-value {
  color: var(--text-color-primary);
}

.student-list-page {
  padding-bottom: var(--spacing-lg, 20px);
}

.student-list-page .student-card {
  cursor: pointer;
  transition: transform var(--transition-duration);
}

.student-list-page .student-card:active {
  transform: scale(0.98);
}

.student-list-page .student-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm, 8px);
}

.student-list-page .student-name {
  font-size: var(--font-size-md, 16px);
  font-weight: 500;
  color: var(--text-color-primary);
}

.student-list-page .student-status {
  font-size: var(--font-size-xs, 12px);
  padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  border-radius: var(--border-radius-sm, 4px);
}

.student-list-page .student-status.pending {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.student-list-page .student-status.done {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.student-list-page .student-meta {
  font-size: var(--font-size-xs, 13px);
  color: var(--text-color-placeholder);
}

/* 学生卡片 */
.student-info-card {
  position: relative;
}

.student-info .info-row {
  display: flex;
  margin-bottom: var(--spacing-sm, 8px);
  font-size: var(--font-size-sm, 14px);
}

.student-info .label {
  color: var(--text-color-secondary);
  width: 80px;
  flex-shrink: 0;
}

.student-info .value {
  color: var(--text-color-primary);
}

.action-btn {
  position: absolute;
  right: var(--spacing-md, 16px);
  top: 50%;
  transform: translateY(-50%);
}

.status-badge {
  display: inline-block;
  padding: 2px var(--spacing-sm, 8px);
  border-radius: var(--border-radius-sm, 4px);
  font-size: var(--font-size-xs, 12px);
}

.status-badge.done {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.status-badge.pending {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

/* 题目卡片 */
.question-card {
  margin-bottom: var(--spacing-sm, 12px);
}

.question-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 8px);
  margin-bottom: var(--spacing-sm, 12px);
}

.question-index {
  font-weight: 500;
  color: var(--text-color-primary);
}

.question-type {
  font-size: var(--font-size-xs, 12px);
  padding: 2px 6px;
  background-color: var(--fill-color);
  border-radius: var(--border-radius-sm, 4px);
  color: var(--text-color-secondary);
}

.question-score {
  font-size: var(--font-size-xs, 13px);
  color: var(--text-color-placeholder);
}

.question-content {
  margin-bottom: var(--spacing-sm, 12px);
}

.content-text {
  font-size: var(--font-size-sm, 14px);
  line-height: 1.6;
  color: var(--text-color-primary);
  white-space: pre-wrap;
}

.options-list {
  margin-top: 10px;
}

.option-item {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  margin-bottom: 6px;
  background-color: var(--fill-color);
  border-radius: var(--border-radius-md, 6px);
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-primary);
  transition: all var(--transition-duration);
}

.option-item.correct {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.option-item.selected {
  border: 1px solid var(--color-primary);
}

.answer-section {
  margin-bottom: 10px;
  padding: 10px;
  border-radius: var(--border-radius-md, 6px);
}

.answer-section.student-answer {
  background-color: var(--fill-color);
  border-left: 3px solid var(--color-primary);
}

.answer-section.reference-answer {
  background-color: var(--color-success-light);
}

.answer-label {
  font-size: var(--font-size-xs, 12px);
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-xs, 4px);
}

.answer-content {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-primary);
}

/* AI批改结果 */
.ai-result {
  margin-top: var(--spacing-sm, 12px);
  padding: 10px;
  background-color: var(--color-primary-light-9);
  border-radius: var(--border-radius-md, 6px);
  border-left: 3px solid var(--color-primary);
}

.ai-badge {
  display: inline-block;
  font-size: var(--font-size-xs, 12px);
  padding: 2px 6px;
  background-color: var(--color-primary);
  color: var(--fill-color-blank);
  border-radius: var(--border-radius-sm, 4px);
  margin-bottom: 6px;
}

.ai-info {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-primary);
}

.ai-comment {
  margin-top: 6px;
  font-size: var(--font-size-xs, 13px);
  color: var(--text-color-secondary);
  line-height: 1.5;
}

/* 教师批改区域 */
.teacher-grading {
  margin-top: var(--spacing-sm, 12px);
  padding: 10px;
  background-color: var(--color-warning-light);
  border-radius: var(--border-radius-md, 6px);
  border-left: 3px solid var(--color-warning);
}

.grading-label {
  font-size: var(--font-size-xs, 13px);
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-sm, 8px);
}

.grading-input {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  margin-bottom: 10px;
}

.score-unit {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-color-secondary);
}

.comment-input {
  width: 100%;
  padding: var(--spacing-sm, 8px);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md, 6px);
  font-size: var(--font-size-sm, 14px);
  resize: none;
  min-height: 60px;
  background-color: var(--fill-color-blank);
  color: var(--text-color-primary);
}

.comment-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.comment-input:disabled {
  background-color: var(--fill-color);
  color: var(--text-color-placeholder);
}

/* 教师批改结果 */
.teacher-result {
  margin-top: 10px;
  padding: var(--spacing-sm, 8px);
  background-color: var(--color-success-light);
  border-radius: var(--border-radius-md, 6px);
  font-size: var(--font-size-sm, 14px);
}

.teacher-badge {
  display: inline-block;
  font-size: var(--font-size-xs, 12px);
  padding: 2px 6px;
  background-color: var(--color-success);
  color: var(--fill-color-blank);
  border-radius: var(--border-radius-sm, 4px);
  margin-right: var(--spacing-sm, 8px);
}

.teacher-comment-text {
  color: var(--text-color-secondary);
  margin-left: var(--spacing-sm, 8px);
}

/* 自动判定结果 */
.auto-result {
  margin-top: 10px;
  padding: var(--spacing-sm, 8px);
  background-color: var(--fill-color);
  border-radius: var(--border-radius-md, 6px);
  font-size: var(--font-size-sm, 14px);
}

.result-badge {
  display: inline-block;
  font-size: var(--font-size-xs, 12px);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm, 4px);
  margin-right: var(--spacing-sm, 8px);
}

.result-badge.correct {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.result-badge.wrong {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

/* 批改操作 */
.grading-actions {
  margin-top: var(--spacing-lg, 20px);
  padding: 0 var(--spacing-xs, 4px);
}

/* 学生选择弹窗 */
.student-picker {
  max-height: 60vh;
  overflow-y: auto;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md, 16px);
  border-bottom: 1px solid var(--border-color-lighter);
  font-size: var(--font-size-md, 16px);
  font-weight: 500;
  color: var(--text-color-primary);
}

.student-list {
  padding: var(--spacing-sm, 8px) 0;
}

.student-item {
  padding: var(--spacing-sm, 12px) var(--spacing-md, 16px);
  cursor: pointer;
  transition: background-color var(--transition-duration);
}

.student-item:active {
  background-color: var(--fill-color);
}

.student-name {
  font-size: var(--font-size-base, 15px);
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-xs, 4px);
}

.student-meta {
  font-size: var(--font-size-xs, 13px);
  color: var(--text-color-placeholder);
}

/* ============================ Responsive Adjustments ============================ */
@media (max-width: 375px) {
  .page-content {
    padding: var(--spacing-xs, 8px);
  }

  .card {
    padding: var(--spacing-sm, 12px);
  }

  .task-title,
  .student-list-page .student-name {
    font-size: var(--font-size-sm, 14px);
  }
}
</style>
