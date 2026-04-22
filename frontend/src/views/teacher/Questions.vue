<template>
  <div class="page">
    <van-nav-bar title="题库管理" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="description" size="20" style="margin-right: 12px;" @click="openImportPopup" />
        <van-icon name="plus" size="20" @click="openAddPopup" />
      </template>
    </van-nav-bar>

    <div class="page-content">
      <!-- 题库目录树 -->
      <div class="tree-section">
        <div class="section-header" @click="treeExpanded = !treeExpanded">
          <van-icon :name="treeExpanded ? 'arrow-down' : 'arrow'" />
          <span>题库目录</span>
          <van-tag type="primary" size="small">{{ totalCount }}题</van-tag>
        </div>

        <div v-show="treeExpanded" class="tree-content">
          <div v-for="subject in questionTree" :key="subject.subject" class="tree-subject">
            <div class="tree-node" @click="toggleSubject(subject.subject)">
              <van-icon :name="expandedSubjects.includes(subject.subject) ? 'arrow-down' : 'arrow'" />
              <van-icon name="bookmark-o" class="node-icon" />
              <span class="node-text">{{ subject.subject }}</span>
            </div>

            <div v-show="expandedSubjects.includes(subject.subject)" class="tree-children">
              <div v-for="grade in subject.grades" :key="grade.grade" class="tree-grade">
                <div class="tree-node" @click="toggleGrade(subject.subject, grade.grade)">
                  <van-icon :name="expandedGrades.includes(subject.subject + grade.grade) ? 'arrow-down' : 'arrow'" />
                  <van-icon name="orders-o" class="node-icon grade-icon" />
                  <span class="node-text">{{ grade.grade }}</span>
                </div>

                <div v-show="expandedGrades.includes(subject.subject + grade.grade)" class="tree-children">
                  <div v-for="chapter in grade.chapters" :key="chapter.chapter"
                       class="tree-node chapter-node"
                       :class="{ active: selectedChapter === chapter.chapter && selectedSubject === subject.subject }"
                       @click="selectChapter(subject.subject, grade.grade, chapter.chapter)">
                    <van-icon name="notes-o" class="node-icon chapter-icon" />
                    <span class="node-text">{{ chapter.chapter }}</span>
                    <van-tag type="primary" size="small" plain>{{ chapter.count }}</van-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 筛选条件 -->
      <div class="filter-section">
        <div class="filter-buttons">
          <van-button
            size="small"
            :type="filterType ? 'primary' : 'default'"
            @click="showTypePicker = true"
          >
            {{ getTypeName(filterType) || '全部类型' }}
            <van-icon name="arrow-down" />
          </van-button>
          <van-button
            size="small"
            :type="filterDifficulty ? 'primary' : 'default'"
            @click="showDifficultyPicker = true"
          >
            {{ getDifficultyName(filterDifficulty) || '全部难度' }}
            <van-icon name="arrow-down" />
          </van-button>
        </div>
        <div class="search-box">
          <van-search
            v-model="searchKeyword"
            placeholder="搜索题目"
            shape="round"
            :clearable="true"
            @search="onRefresh"
            @clear="onRefresh"
          />
        </div>
      </div>

      <!-- 类型筛选弹出层 -->
      <van-popup v-model:show="showTypePicker" position="bottom" round>
        <van-picker
          :columns="typeOptions"
          @confirm="onTypeConfirm"
          @cancel="showTypePicker = false"
        />
      </van-popup>

      <!-- 难度筛选弹出层 -->
      <van-popup v-model:show="showDifficultyPicker" position="bottom" round>
        <van-picker
          :columns="difficultyOptions"
          @confirm="onDifficultyConfirm"
          @cancel="showDifficultyPicker = false"
        />
      </van-popup>

      <!-- 当前选中 -->
      <div v-if="selectedChapter" class="current-filter">
        <van-tag closeable @close="clearFilter">
          {{ selectedSubject }} / {{ selectedGrade }} / {{ selectedChapter }}
        </van-tag>
      </div>

      <!-- 题目列表 -->
      <div class="question-list">
        <!-- 初始加载指示器 -->
        <van-loading v-if="initialLoading" class="loading-center" size="24px">加载中...</van-loading>

        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadQuestions">
            <div v-for="question in questions" :key="question.id" class="question-card" @click="showQuestionDetail(question)">
              <div class="question-header">
                <van-tag :type="getTypeTagType(question.question_type)">
                  {{ getTypeName(question.question_type) }}
                </van-tag>
                <van-tag :type="getDifficultyTagType(question.difficulty)" plain>
                  {{ getDifficultyName(question.difficulty) }}
                </van-tag>
                <span class="question-score">{{ question.score }}分</span>
              </div>
              <div class="question-content">{{ question.content }}</div>
              <div class="question-footer">
                <span class="question-chapter">{{ question.chapter || '未分类' }}</span>
                <div class="question-actions">
                  <van-icon name="edit" @click.stop="editQuestion(question)" />
                  <van-icon name="delete-o" @click.stop="confirmDelete(question)" />
                </div>
              </div>
            </div>
          </van-list>
        </van-pull-refresh>
      </div>
    </div>

    <!-- 新增/编辑题目弹窗 -->
    <van-popup
      v-model:show="showAddPopup"
      position="bottom"
      round
      style="height: 90%"
      :lock-scroll="true"
      :close-on-popstate="false"
    >
      <div class="add-popup" @touchmove.stop>
        <div class="popup-header">
          <span class="cancel-btn" @click="closeAddPopup">取消</span>
          <span class="popup-title">{{ editingQuestion ? '编辑题目' : '新增题目' }}</span>
          <van-button type="primary" size="small" :loading="saving" @click="saveQuestion">保存</van-button>
        </div>

        <div class="form-scroll" @touchmove.stop>
          <!-- 题目类型 -->
          <div class="form-section">
            <div class="section-title">题目类型</div>
            <div class="type-btns">
              <div
                v-for="t in typeList"
                :key="t.value"
                class="type-btn"
                :class="{ active: questionForm.question_type === t.value }"
                @click="questionForm.question_type = t.value"
              >
                {{ t.text }}
              </div>
            </div>
          </div>

          <!-- 基本信息 -->
          <div class="form-section">
            <div class="section-title">基本信息</div>

            <div class="form-item" @click="showSubjectSheet = true">
              <span class="item-label"><span class="required">*</span>科目</span>
              <div class="item-value">
                <span :class="{ placeholder: !questionForm.subject }">{{ questionForm.subject || '请选择' }}</span>
                <van-icon name="arrow" />
              </div>
            </div>

            <div class="form-item" @click="showGradeSheet = true">
              <span class="item-label"><span class="required">*</span>年级</span>
              <div class="item-value">
                <span :class="{ placeholder: !questionForm.grade }">{{ questionForm.grade || '请选择' }}</span>
                <van-icon name="arrow" />
              </div>
            </div>

            <div class="form-item">
              <span class="item-label"><span class="required">*</span>章节</span>
              <input v-model="questionForm.chapter" class="item-input" placeholder="如：第一章 拼音" />
            </div>

            <div class="form-item">
              <span class="item-label"><span class="required">*</span>分值</span>
              <input v-model.number="questionForm.score" type="number" class="item-input" placeholder="如：2" />
            </div>

            <div class="form-item" @click="showDifficultySheet = true">
              <span class="item-label"><span class="required">*</span>难度</span>
              <div class="item-value">
                <span>{{ getDifficultyName(questionForm.difficulty) }}</span>
                <van-icon name="arrow" />
              </div>
            </div>
          </div>

          <!-- 题目内容 -->
          <div class="form-section">
            <div class="section-title"><span class="required">*</span>题目内容</div>
            <textarea v-model="questionForm.content" class="textarea-input" placeholder="请输入题目内容" rows="3"></textarea>
          </div>

          <!-- 选项（单选题/多选题） -->
          <div class="form-section" v-if="questionForm.question_type === 'choice' || questionForm.question_type === 'multiple'">
            <div class="section-title"><span class="required">*</span>选项</div>
            <div v-for="(option, index) in questionForm.options" :key="index" class="option-item">
              <span class="option-label">{{ optionLetters[index] }}.</span>
              <input v-model="questionForm.options[index]" class="option-input" :placeholder="'请输入选项' + optionLetters[index]" />
              <van-icon v-if="questionForm.options.length > 2" name="delete-o" class="delete-icon" @click="removeOption(index)" />
            </div>
            <div v-if="questionForm.options.length < 6" class="add-option-btn" @click="addOption">+ 添加选项</div>
          </div>

          <!-- 答案 -->
          <div class="form-section">
            <div class="section-title"><span class="required">*</span>答案</div>

            <!-- 单选题答案 -->
            <div v-if="questionForm.question_type === 'choice'" class="answer-btns">
              <div
                v-for="(opt, idx) in questionForm.options"
                :key="idx"
                class="answer-btn"
                :class="{ active: questionForm.answer === optionLetters[idx] }"
                @click="questionForm.answer = optionLetters[idx]"
              >
                {{ optionLetters[idx] }}
              </div>
            </div>

            <!-- 多选题答案 -->
            <div v-else-if="questionForm.question_type === 'multiple'" class="answer-btns">
              <div
                v-for="(opt, idx) in questionForm.options"
                :key="idx"
                class="answer-btn"
                :class="{ active: questionForm.answerArray && questionForm.answerArray.includes(optionLetters[idx]) }"
                @click="toggleMultipleAnswer(optionLetters[idx])"
              >
                {{ optionLetters[idx] }}
              </div>
              <div class="answer-hint">已选：{{ questionForm.answerArray && questionForm.answerArray.length > 0 ? questionForm.answerArray.sort().join('') : '无' }}</div>
            </div>

            <!-- 判断题答案 -->
            <div v-else-if="questionForm.question_type === 'judgment'" class="answer-btns">
              <div
                class="answer-btn judgment-btn"
                :class="{ active: questionForm.answer === 'A' }"
                @click="questionForm.answer = 'A'"
              >
                正确 (√)
              </div>
              <div
                class="answer-btn judgment-btn"
                :class="{ active: questionForm.answer === 'B' }"
                @click="questionForm.answer = 'B'"
              >
                错误 (×)
              </div>
            </div>

            <textarea
              v-else
              v-model="questionForm.answerText"
              class="textarea-input"
              :placeholder="questionForm.question_type === 'fill' ? '多个答案用逗号分隔' : '请输入参考答案'"
              rows="2"
            ></textarea>
          </div>

          <!-- 解析 -->
          <div class="form-section">
            <div class="section-title">解析（可选）</div>
            <textarea v-model="questionForm.analysis" class="textarea-input" placeholder="填写答案解析" rows="2"></textarea>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 科目选择 -->
    <van-action-sheet v-model:show="showSubjectSheet" :actions="subjectActions" @select="onSelectSubject" cancel-text="取消" />

    <!-- 年级选择 -->
    <van-action-sheet v-model:show="showGradeSheet" :actions="gradeActions" @select="onSelectGrade" cancel-text="取消" />

    <!-- 难度选择 -->
    <van-action-sheet v-model:show="showDifficultySheet" :actions="difficultyActions" @select="onSelectDifficulty" cancel-text="取消" />

    <!-- 题目详情弹窗 -->
    <van-popup v-model:show="showDetailPopup" position="bottom" round style="height: 70%">
      <div class="detail-popup" v-if="currentQuestion">
        <div class="popup-header">
          <span class="cancel-btn" @click="showDetailPopup = false">关闭</span>
          <span class="popup-title">题目详情</span>
          <van-button type="primary" size="small" @click="editQuestion(currentQuestion)">编辑</van-button>
        </div>
        <div class="detail-content">
          <div class="detail-header">
            <van-tag :type="getTypeTagType(currentQuestion.question_type)">{{ getTypeName(currentQuestion.question_type) }}</van-tag>
            <van-tag :type="getDifficultyTagType(currentQuestion.difficulty)" plain>{{ getDifficultyName(currentQuestion.difficulty) }}</van-tag>
            <span>{{ currentQuestion.score }}分</span>
          </div>
          <div class="detail-section">
            <div class="section-title">题干</div>
            <div class="section-content">{{ currentQuestion.content }}</div>
          </div>
          <div v-if="currentQuestion.question_type === 'choice' || currentQuestion.question_type === 'multiple'" class="detail-section">
            <div class="section-title">选项</div>
            <div v-for="(opt, idx) in currentQuestion.options" :key="idx" class="option-item">{{ optionLetters[idx] }}. {{ opt }}</div>
          </div>
          <div class="detail-section">
            <div class="section-title">答案</div>
            <div class="section-content answer">{{ currentQuestion.answer }}</div>
          </div>
          <div v-if="currentQuestion.analysis" class="detail-section">
            <div class="section-title">解析</div>
            <div class="section-content">{{ currentQuestion.analysis }}</div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 批量导入弹窗 -->
    <van-popup
      v-model:show="showImportPopup"
      position="bottom"
      round
      style="height: 50%"
      :lock-scroll="true"
    >
      <div class="import-popup">
        <div class="popup-header">
          <span class="cancel-btn" @click="showImportPopup = false">关闭</span>
          <span class="popup-title">批量导入</span>
          <span></span>
        </div>
        <div class="import-content">
          <div class="import-desc">
            <p>支持导入 Excel 格式的题库文件（.xlsx）</p>
            <p>每个工作簿对应一种题型，示例行不会导入</p>
          </div>
          <div class="import-buttons">
            <van-uploader :after-read="handleFileUpload" accept=".xlsx,.xls" :max-count="1" class="import-uploader">
              <van-button size="large" :loading="importing" class="import-btn">
                <van-icon name="upgrade" />
                上传题库
              </van-button>
            </van-uploader>
            <van-button size="large" class="import-btn" @click="downloadTemplate">
              <van-icon name="down" />
              模板下载
            </van-button>
          </div>
          <div v-if="importResult" class="import-result">
            <van-notice-bar :color="importResult.success ? '#07c160' : '#ee0a24'" background="#f7f8fa">
              {{ importResult.message }}
            </van-notice-bar>
            <div v-if="importResult.errors && importResult.errors.length > 0" class="result-errors">
              <div class="error-title">失败原因：</div>
              <div v-for="(err, idx) in importResult.errors" :key="idx" class="error-item">
                {{ err }}
              </div>
            </div>
            <div v-if="importResult.details && importResult.details.length > 0" class="result-details">
              <p v-for="(detail, idx) in importResult.details" :key="idx">{{ detail }}</p>
            </div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant';
import api from '@/api/index';

// 触摸滚动优化
let scrollEl = null;
let startY = 0;
let isScrolling = false;

function handleTouchStart(e) {
  startY = e.touches[0].clientY;
  isScrolling = true;
}

function handleTouchMove(e) {
  if (!scrollEl || !isScrolling) return;
  const currentY = e.touches[0].clientY;
  const deltaY = currentY - startY;
  const { scrollTop, scrollHeight, clientHeight } = scrollEl;

  // 阻止边界滚动穿透
  if (deltaY > 0 && scrollTop <= 0) {
    e.preventDefault();
  } else if (deltaY < 0 && scrollTop + clientHeight >= scrollHeight) {
    e.preventDefault();
  }
  startY = currentY;
}

function handleTouchEnd() {
  isScrolling = false;
}

// 题库树
const questionTree = ref([]);
const expandedSubjects = ref([]);
const expandedGrades = ref([]);
const treeExpanded = ref(true);
const totalCount = computed(() => {
  let count = 0;
  questionTree.value.forEach(s => s.grades.forEach(g => g.chapters.forEach(c => count += c.count)));
  return count;
});

// 筛选
const selectedSubject = ref('');
const selectedGrade = ref('');
const selectedChapter = ref('');
const filterType = ref('');
const filterDifficulty = ref('');
const searchKeyword = ref('');
const showTypePicker = ref(false);
const showDifficultyPicker = ref(false);

const typeOptions = [
  { text: '全部类型', value: '' },
  { text: '单选题', value: 'choice' },
  { text: '多选题', value: 'multiple' },
  { text: '填空题', value: 'fill' },
  { text: '判断题', value: 'judgment' },
  { text: '主观题', value: 'subjective' }
];

const difficultyOptions = [
  { text: '全部难度', value: '' },
  { text: '简单', value: 'easy' },
  { text: '中等', value: 'medium' },
  { text: '困难', value: 'hard' }
];

function onTypeConfirm({ selectedOptions }) {
  filterType.value = selectedOptions[0]?.value || '';
  showTypePicker.value = false;
  onRefresh();
}

function onDifficultyConfirm({ selectedOptions }) {
  filterDifficulty.value = selectedOptions[0]?.value || '';
  showDifficultyPicker.value = false;
  onRefresh();
}

const typeList = [
  { text: '单选题', value: 'choice' },
  { text: '多选题', value: 'multiple' },
  { text: '填空题', value: 'fill' },
  { text: '判断题', value: 'judgment' },
  { text: '主观题', value: 'subjective' }
];

// 题目列表
const questions = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const currentPage = ref(0);
const pageSize = 20;
const isLoading = ref(false);  // 用于防止重复请求的独立状态
const initialLoading = ref(true);  // 初始加载状态

// 新增/编辑
const showAddPopup = ref(false);
const editingQuestion = ref(null);
const saving = ref(false);

const questionForm = reactive({
  question_type: 'choice',
  subject: '',
  grade: '',
  chapter: '',
  content: '',
  options: ['', '', '', ''],
  answer: '',
  answerArray: [],
  answerText: '',
  analysis: '',
  difficulty: 'medium',
  score: 2
});

// 选择器
const showSubjectSheet = ref(false);
const showGradeSheet = ref(false);
const showDifficultySheet = ref(false);

const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

const subjectActions = [
  { name: '语文' },
  { name: '数学' },
  { name: '英语' },
  { name: '科学' }
];

const gradeActions = [
  { name: '一年级' },
  { name: '二年级' },
  { name: '三年级' },
  { name: '四年级' },
  { name: '五年级' },
  { name: '六年级' }
];

const difficultyActions = [
  { name: '简单', value: 'easy' },
  { name: '中等', value: 'medium' },
  { name: '困难', value: 'hard' }
];

// 详情
const showDetailPopup = ref(false);
const currentQuestion = ref(null);

// 批量导入
const showImportPopup = ref(false);
const importing = ref(false);
const importResult = ref(null);

function openImportPopup() {
  importResult.value = null;
  showImportPopup.value = true;
}

async function handleFileUpload(file) {
  importing.value = true;
  importResult.value = null;
  try {
    const formData = new FormData();
    formData.append('file', file.file);
    const res = await api.post('/questions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    if (res.code === 0) {
      const errorCount = res.data.errors?.length || 0;
      const successCount = res.data.total || 0;
      importResult.value = {
        success: successCount > 0,
        message: successCount > 0
          ? (errorCount > 0 ? `成功导入 ${successCount} 道题目，失败 ${errorCount} 道` : `成功导入 ${successCount} 道题目`)
          : '导入失败，没有成功导入任何题目',
        details: res.data.details,
        errors: res.data.errors
      };
      if (successCount > 0) {
        showSuccessToast(`成功导入 ${successCount} 道题目`);
        onRefresh();
        loadQuestionTree();
      } else {
        showFailToast('导入失败');
      }
    } else {
      importResult.value = {
        success: false,
        message: res.message || '导入失败',
        details: res.data?.errors
      };
      showFailToast(res.message || '导入失败');
    }
  } catch (err) {
    importResult.value = {
      success: false,
      message: err.message || '导入失败，请检查文件格式'
    };
    showFailToast(err.message || '导入失败');
  } finally {
    importing.value = false;
  }
}

async function downloadTemplate() {
  try {
    // 从 localStorage 获取 token（与 userStore 一致）
    const token = localStorage.getItem('token');
    if (!token) {
      showFailToast('请先登录');
      return;
    }

    const response = await fetch('/api/questions/template', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `下载失败 (${response.status})`);
    }

    const blob = await response.blob();
    if (blob.size < 100) {
      throw new Error('文件太小，可能下载失败');
    }
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '题库导入模板.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    showSuccessToast('模板下载成功');
  } catch (err) {
    console.error('下载模板失败:', err);
    showFailToast('模板下载失败: ' + (err.message || '未知错误'));
  }
}

// 加载题库树
async function loadQuestionTree() {
  try {
    const res = await api.get('/questions/tree');
    if (res.code === 0) {
      questionTree.value = res.data;
    } else {
      console.error('加载题库树失败:', res.message);
    }
  } catch (err) {
    console.error('加载题库树失败:', err);
    // axios拦截器会处理认证错误并重定向到登录页
  }
}

// 展开/折叠
function toggleSubject(subject) {
  const idx = expandedSubjects.value.indexOf(subject);
  if (idx >= 0) expandedSubjects.value.splice(idx, 1);
  else expandedSubjects.value.push(subject);
}

function toggleGrade(subject, grade) {
  const key = subject + grade;
  const idx = expandedGrades.value.indexOf(key);
  if (idx >= 0) expandedGrades.value.splice(idx, 1);
  else expandedGrades.value.push(key);
}

function selectChapter(subject, grade, chapter) {
  selectedSubject.value = subject;
  selectedGrade.value = grade;
  selectedChapter.value = chapter;
  onRefresh();
}

function clearFilter() {
  selectedSubject.value = '';
  selectedGrade.value = '';
  selectedChapter.value = '';
  onRefresh();
}

// 加载题目列表
async function loadQuestions() {
  // 使用独立状态防止重复调用（van-list会自动设置loading=true）
  if (isLoading.value) return;
  isLoading.value = true;

  currentPage.value++;

  try {
    const params = {
      page: currentPage.value, pageSize,
      subject: selectedSubject.value, grade: selectedGrade.value, chapter: selectedChapter.value,
      type: filterType.value, difficulty: filterDifficulty.value,
      keyword: searchKeyword.value
    };
    const res = await api.get('/questions', { params });

    if (res.code === 0) {
      // 确保res.data.list是数组
      const list = Array.isArray(res.data?.list) ? res.data.list : [];
      questions.value.push(...list);
      finished.value = list.length < pageSize;
    } else {
      // 处理非成功响应（如认证失败等）
      console.error('加载题目失败:', res.message);
      showFailToast(res.message || '加载失败');
      finished.value = true;
    }
  } catch (err) {
    // axios拦截器会处理认证错误并重定向到登录页
    console.error('加载题目异常:', err.message);
    showFailToast(err.message || '加载题目列表失败，请稍后重试');
    finished.value = true;
  } finally {
    isLoading.value = false;
    loading.value = false;  // 必须设置false，否则van-list会一直显示加载中
    refreshing.value = false;
    initialLoading.value = false;  // 初始加载完成
  }
}

function onRefresh() {
  currentPage.value = 0;
  questions.value = [];
  finished.value = false;
  loadQuestions();
}

// 题目操作
function showQuestionDetail(question) {
  currentQuestion.value = question;
  showDetailPopup.value = true;
}

function editQuestion(question) {
  editingQuestion.value = question;
  questionForm.question_type = question.question_type;
  questionForm.subject = question.subject;
  questionForm.grade = question.grade || '';
  questionForm.chapter = question.chapter || '';
  questionForm.content = question.content;
  questionForm.options = question.options && question.options.length ? [...question.options] : ['', '', '', ''];
  questionForm.answer = question.answer;
  questionForm.answerText = question.answer;
  // 多选题答案处理
  if (question.question_type === 'multiple' && question.answer) {
    questionForm.answerArray = question.answer.split('');
  } else {
    questionForm.answerArray = [];
  }
  questionForm.analysis = question.analysis || '';
  questionForm.difficulty = question.difficulty || 'medium';
  questionForm.score = question.score || 2;
  showDetailPopup.value = false;
  showAddPopup.value = true;
}

async function confirmDelete(question) {
  try {
    await showConfirmDialog({ title: '确认删除', message: '确定要删除这道题目吗？' });
    const res = await api.delete(`/questions/${question.id}`);
    if (res.code === 0) {
      showSuccessToast('删除成功');
      onRefresh();
      loadQuestionTree();
    }
  } catch (err) { }
}

function openAddPopup() {
  editingQuestion.value = null;
  resetForm();
  showAddPopup.value = true;
  nextTick(() => {
    scrollEl = document.querySelector('.form-scroll');
    if (scrollEl) {
      scrollEl.addEventListener('touchstart', handleTouchStart, { passive: false });
      scrollEl.addEventListener('touchmove', handleTouchMove, { passive: false });
      scrollEl.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
  });
}

function closeAddPopup() {
  showAddPopup.value = false;
  editingQuestion.value = null;
  // 清理事件监听
  if (scrollEl) {
    scrollEl.removeEventListener('touchstart', handleTouchStart);
    scrollEl.removeEventListener('touchmove', handleTouchMove);
    scrollEl.removeEventListener('touchend', handleTouchEnd);
    scrollEl = null;
  }
  resetForm();
}

function resetForm() {
  questionForm.question_type = 'choice';
  questionForm.subject = '';
  questionForm.grade = '';
  questionForm.chapter = '';
  questionForm.content = '';
  questionForm.options = ['', '', '', ''];
  questionForm.answer = '';
  questionForm.answerArray = [];
  questionForm.answerText = '';
  questionForm.analysis = '';
  questionForm.difficulty = 'medium';
  questionForm.score = 2;
}

function addOption() {
  if (questionForm.options.length < 6) questionForm.options.push('');
}

function removeOption(index) {
  const removedLetter = optionLetters[index];
  questionForm.options.splice(index, 1);

  // 同步更新答案
  if (questionForm.question_type === 'multiple') {
    // 多选题：移除已删除选项对应的答案
    if (questionForm.answerArray && questionForm.answerArray.includes(removedLetter)) {
      const idx = questionForm.answerArray.indexOf(removedLetter);
      questionForm.answerArray.splice(idx, 1);
    }
  } else if (questionForm.question_type === 'choice') {
    // 单选题：如果删除的是已选答案，清空答案
    if (questionForm.answer === removedLetter) {
      questionForm.answer = '';
    }
  }
}

// 多选题答案切换
function toggleMultipleAnswer(letter) {
  if (!questionForm.answerArray) {
    questionForm.answerArray = [];
  }
  const idx = questionForm.answerArray.indexOf(letter);
  if (idx >= 0) {
    questionForm.answerArray.splice(idx, 1);
  } else {
    questionForm.answerArray.push(letter);
  }
}

// 选择器回调
function onSelectSubject(action) {
  questionForm.subject = action.name;
  showSubjectSheet.value = false;
}

function onSelectGrade(action) {
  questionForm.grade = action.name;
  showGradeSheet.value = false;
}

function onSelectDifficulty(action) {
  questionForm.difficulty = action.value;
  showDifficultySheet.value = false;
}

async function saveQuestion() {
  // 基本信息验证
  if (!questionForm.subject) {
    showFailToast('请选择科目');
    return;
  }
  if (!questionForm.grade) {
    showFailToast('请选择年级');
    return;
  }
  if (!questionForm.chapter || !questionForm.chapter.trim()) {
    showFailToast('请填写章节');
    return;
  }
  if (!questionForm.score || questionForm.score <= 0) {
    showFailToast('请填写有效分值');
    return;
  }
  if (!questionForm.content || !questionForm.content.trim()) {
    showFailToast('请填写题目内容');
    return;
  }

  // 单选题/多选题选项验证
  if (questionForm.question_type === 'choice' || questionForm.question_type === 'multiple') {
    const validOptions = questionForm.options.filter(o => o && o.trim());
    if (validOptions.length < 2) {
      showFailToast('请至少填写2个选项');
      return;
    }
  }

  // 单选题答案验证
  if (questionForm.question_type === 'choice' && !questionForm.answer) {
    showFailToast('请选择正确答案');
    return;
  }
  // 多选题答案验证
  if (questionForm.question_type === 'multiple' && (!questionForm.answerArray || questionForm.answerArray.length < 2)) {
    showFailToast('多选题至少选择2个答案');
    return;
  }
  // 判断题答案验证
  if (questionForm.question_type === 'judgment' && !questionForm.answer) {
    showFailToast('请选择正确答案');
    return;
  }
  // 填空题和主观题答案验证
  if ((questionForm.question_type === 'fill' || questionForm.question_type === 'subjective') && (!questionForm.answerText || !questionForm.answerText.trim())) {
    showFailToast('请填写参考答案');
    return;
  }

  saving.value = true;
  try {
    const data = {
      question_type: questionForm.question_type,
      subject: questionForm.subject,
      grade: questionForm.grade,
      chapter: questionForm.chapter,
      content: questionForm.content,
      options: (questionForm.question_type === 'choice' || questionForm.question_type === 'multiple') ? questionForm.options.filter(o => o && o.trim()) : null,
      answer: questionForm.question_type === 'choice' ? questionForm.answer :
              questionForm.question_type === 'multiple' ? questionForm.answerArray.sort().join('') :
              questionForm.question_type === 'judgment' ? questionForm.answer :
              questionForm.answerText,
      analysis: questionForm.analysis,
      difficulty: questionForm.difficulty,
      score: questionForm.score
    };

    let res;
    if (editingQuestion.value) {
      res = await api.put(`/questions/${editingQuestion.value.id}`, data);
    } else {
      res = await api.post('/questions', data);
    }

    if (res.code === 0) {
      showSuccessToast(editingQuestion.value ? '修改成功' : '添加成功');
      closeAddPopup();
      onRefresh();
      loadQuestionTree();
    } else {
      showFailToast(res.message || '操作失败');
    }
  } catch (err) {
    showFailToast(err.message || '操作失败');
  } finally {
    saving.value = false;
  }
}

// 工具函数
function getTypeName(type) {
  const map = { choice: '单选题', multiple: '多选题', fill: '填空题', judgment: '判断题', subjective: '主观题' };
  return map[type] || type;
}

function getTypeTagType(type) {
  const map = { choice: 'primary', multiple: 'primary', fill: 'success', judgment: 'primary', subjective: 'warning' };
  return map[type] || 'default';
}

function getDifficultyName(difficulty) {
  if (!difficulty) return '';
  const map = { easy: '简单', medium: '中等', hard: '困难' };
  return map[difficulty] || '中等';
}

function getDifficultyTagType(difficulty) {
  const map = { easy: 'success', medium: 'warning', hard: 'danger' };
  return map[difficulty] || 'default';
}

onMounted(() => {
  loadQuestionTree();
  // 不需要手动调用 loadQuestions()，van-list 会自动触发 @load
});

onUnmounted(() => {
  if (scrollEl) {
    scrollEl.removeEventListener('touchstart', handleTouchStart);
    scrollEl.removeEventListener('touchmove', handleTouchMove);
    scrollEl.removeEventListener('touchend', handleTouchEnd);
    scrollEl = null;
  }
});
</script>

<style scoped>
/* 弹窗容器 */
.add-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
  touch-action: pan-y;
  -webkit-user-select: none;
  user-select: none;
}

.page-content {
  padding-bottom: 20px;
}

.loading-center {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.tree-section {
  background: #fff;
  margin-bottom: 10px;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f7f8fa;
  gap: 8px;
}

.section-header span {
  flex: 1;
  font-weight: 500;
}

.tree-content { padding: 8px 0; }
.tree-subject { border-bottom: 1px solid #eee; }

.tree-node {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 8px;
}

.tree-node:active { background: #f5f5f5; }
.tree-node.active { background: #ecf5ff; color: #1989fa; }
.node-icon { color: #969799; }
.grade-icon { color: #1989fa; }
.chapter-icon { color: #ff976a; }
.node-text { flex: 1; }
.tree-children { padding-left: 20px; }
.chapter-node { padding-left: 40px; }

.filter-section {
  background: #fff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 10px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-buttons :deep(.van-button) {
  padding: 0 12px;
}

.filter-buttons :deep(.van-icon) {
  margin-left: 4px;
}

.search-box {
  flex: 1;
  min-width: 0;
}

.search-box :deep(.van-search) {
  padding: 8px 0;
}

.search-box :deep(.van-search__content) {
  background: #f7f8fa;
}

.current-filter { padding: 8px 16px; background: #fff; }

.question-list { padding: 0 12px; }

.question-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.question-score {
  margin-left: auto;
  color: #ff976a;
  font-weight: 500;
}

.question-content {
  font-size: 15px;
  line-height: 1.5;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.question-footer {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #969799;
}

.question-chapter { flex: 1; }
.question-actions { display: flex; gap: 16px; }

/* 弹窗头部 */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.cancel-btn {
  color: #666;
  padding: 4px 8px;
}

.popup-title {
  font-size: 16px;
  font-weight: 500;
}

/* 表单滚动区 */
.form-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: #f7f8fa;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior: contain;
  padding-bottom: 30px;
}

.form-section {
  background: #fff;
  margin: 10px 0;
  padding: 12px 16px;
}

.section-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.required {
  color: #ee0a24;
  margin-right: 2px;
}

/* 类型选择按钮 */
.type-btns {
  display: flex;
  gap: 10px;
}

.type-btn {
  flex: 1;
  padding: 10px 0;
  text-align: center;
  border: 1px solid #dcdee0;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
}

.type-btn.active {
  background: #1989fa;
  border-color: #1989fa;
  color: #fff;
}

/* 表单项 */
.form-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.form-item:last-child {
  border-bottom: none;
}

.item-label {
  width: 80px;
  color: #333;
  font-size: 14px;
}

.item-value {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: #333;
  font-size: 14px;
}

.item-value .placeholder {
  color: #999;
}

.item-value .van-icon {
  margin-left: 4px;
  color: #999;
}

.item-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  text-align: right;
  background: transparent;
  -webkit-user-select: text;
  user-select: text;
  touch-action: manipulation;
}

/* 文本框 */
.textarea-input {
  width: 100%;
  border: 1px solid #dcdee0;
  border-radius: 4px;
  padding: 10px;
  font-size: 14px;
  resize: none;
  outline: none;
  box-sizing: border-box;
  -webkit-user-select: text;
  user-select: text;
  touch-action: manipulation;
}

.textarea-input:focus {
  border-color: #1989fa;
}

/* 选项 */
.option-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.option-label {
  width: 30px;
  color: #1989fa;
  font-weight: bold;
}

.option-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  -webkit-user-select: text;
  user-select: text;
  touch-action: manipulation;
}

.delete-icon {
  color: #ee0a24;
  padding: 4px;
}

.add-option-btn {
  padding: 12px 0;
  text-align: center;
  color: #1989fa;
  font-size: 14px;
}

/* 答案按钮 */
.answer-btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.answer-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dcdee0;
  border-radius: 4px;
  font-size: 16px;
  color: #666;
}

.answer-btn.active {
  background: #1989fa;
  border-color: #1989fa;
  color: #fff;
}

/* 判断题答案按钮 */
.answer-btn.judgment-btn {
  width: auto;
  padding: 10px 20px;
  font-size: 14px;
}

/* 详情弹窗 */
.detail-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fff;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-section { margin-bottom: 16px; }
.detail-section .section-title { font-size: 14px; color: #969799; margin-bottom: 8px; }
.detail-section .section-content { font-size: 15px; line-height: 1.6; }
.detail-section .section-content.answer { color: #07c160; font-weight: 500; }

.detail-section .option-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.detail-section .option-item:last-child {
  border-bottom: none;
}

/* 批量导入弹窗 */
.import-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
}

.import-content {
  flex: 1;
  padding: 20px 16px;
  overflow-y: auto;
}

.import-desc {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.import-desc p {
  font-size: 14px;
  color: #666;
  margin: 4px 0;
}

.import-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 20px;
}

.import-uploader {
  width: 100%;
}

.import-uploader :deep(.van-uploader__wrapper) {
  display: block;
}

.import-uploader :deep(.van-uploader__input-wrapper) {
  display: block;
}

.import-btn {
  width: 100%;
}

.import-result {
  margin-top: 20px;
}

.result-details {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: #666;
}

.result-details p {
  margin: 4px 0;
}

.result-errors {
  background: #fff5f5;
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
  border: 1px solid #ffe4e4;
}

.error-title {
  font-size: 14px;
  font-weight: 500;
  color: #ee0a24;
  margin-bottom: 8px;
}

.error-item {
  font-size: 13px;
  color: #666;
  padding: 4px 0;
  border-bottom: 1px solid #ffe4e4;
}

.error-item:last-child {
  border-bottom: none;
}
</style>
