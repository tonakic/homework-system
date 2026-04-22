<template>
  <div class="page">
    <van-nav-bar title="考试管理" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="plus" @click="openCreateDialog" />
      </template>
    </van-nav-bar>

    <div class="page-content">
      <van-tabs v-model:active="activeTab" sticky @change="onTabChange">
        <van-tab title="全部" />
        <van-tab title="草稿" />
        <van-tab title="已发布" />
        <van-tab title="已结束" />
      </van-tabs>

      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list v-model:loading="loading" :finished="finished" @load="loadExams">
          <van-cell v-for="exam in exams" :key="exam.id" is-link @click="showExamDetail(exam)">
            <template #title>
              <div class="exam-title">
                <span class="exam-name">{{ exam.title }}</span>
              </div>
            </template>
            <template #label>
              <div class="exam-info">
                <span>{{ exam.subject }}</span>
                <span v-if="exam.grade">{{ exam.grade }}</span>
                <span>{{ exam.questions?.length || 0 }}题</span>
                <span>{{ exam.total_score }}分</span>
              </div>
            </template>
            <template #value>
              <van-tag :type="getStatusTag(exam.status)" size="medium">{{ getStatusName(exam.status) }}</van-tag>
            </template>
          </van-cell>
        </van-list>
      </van-pull-refresh>
    </div>

    <!-- 创建考试弹窗 -->
    <van-popup v-model:show="showCreateDialog" position="bottom" round :style="{ height: '95%' }">
      <div class="form-popup">
        <van-nav-bar title="创建考试">
          <template #right><van-icon name="cross" @click="closeDialog" /></template>
        </van-nav-bar>
        <div class="scroll_form">
          <van-field v-model="form.title" label="考试标题" placeholder="请输入考试标题" :rules="[{ required: true }]" />
          <van-field v-model="form.subject" is-link readonly label="科目" placeholder="请选择" @click="showSubjectPicker = true" />
          <van-field v-model="form.grade" is-link readonly label="年级" placeholder="请选择" @click="showGradePicker = true" />
          <van-field
            v-model="selectedClassesText"
            is-link
            readonly
            label="考试班级"
            :placeholder="form.grade ? (availableClasses.length > 0 ? '请选择' : '无可用班级') : '请先选择年级'"
            :disabled="!form.grade || availableClasses.length === 0"
            @click="openClassPicker"
          />
          <van-field v-model="form.duration" type="number" label="时长(分钟)" placeholder="0为不限时" />
          <van-field v-model="form.start_time" is-link readonly label="开始时间" placeholder="点击选择" @click="showStartTimePicker = true" />
          <van-field v-model="form.end_time" is-link readonly label="结束时间" placeholder="点击选择" @click="showEndTimePicker = true" />

          <div class="section-title">题目选择</div>
          <div class="question-actions">
            <van-button type="primary" size="small" icon="edit" @click="openAutoGenerate">自动出题</van-button>
            <van-button type="primary" size="small" icon="list-switch" @click="openManualSelect">手动选题</van-button>
          </div>

          <!-- 已选题目列表 -->
          <div class="selected-questions">
            <div class="selected-header">
              <span>已选 {{ selectedQuestions.length }} 题，共 {{ totalScore }} 分</span>
              <van-button v-if="selectedQuestions.length > 0" size="mini" type="danger" plain @click="clearAllQuestions">清空</van-button>
            </div>
            <div v-if="selectedQuestions.length === 0" class="no-question">请选择题目</div>
            <div v-else class="question-list">
              <div v-for="(q, idx) in selectedQuestions" :key="q.questionId" class="question-item">
                <van-icon name="wap-nav" class="drag-handle" @touchstart="startDrag(idx)" @touchend="endDrag" />
                <div class="question-content">
                  <div class="question-meta">
                    <span class="q-num">{{ idx + 1 }}.</span>
                    <van-tag :type="getTypeTagType(q.questionType)" size="small">{{ getTypeName(q.questionType) }}</van-tag>
                    <van-tag :type="getDifficultyTagType(q.difficulty)" size="small" plain>{{ getDifficultyName(q.difficulty) }}</van-tag>
                  </div>
                  <div class="q-text">{{ q.content }}</div>
                </div>
                <div class="question-right">
                  <van-stepper v-model="q.score" min="1" max="100" theme="round" button-size="20" @change="updateTotalScore" />
                  <span class="score-label">分</span>
                  <van-icon name="delete-o" class="delete-icon" @click="removeQuestion(idx)" />
                </div>
              </div>
            </div>
          </div>

          <van-field name="grading_mode" label="批改方式">
            <template #input>
              <van-radio-group v-model="form.grading_mode" direction="horizontal">
                <van-radio name="ai">AI批改</van-radio>
                <van-radio name="mixed">混合模式</van-radio>
              </van-radio-group>
            </template>
          </van-field>
          <div class="grading-tip">
            <van-icon name="info-o" />
            <span>批改方式由管理员在「批改管理」中配置</span>
          </div>

          <div class="form-actions">
            <van-button round block type="default" @click="onSubmit">保存草稿</van-button>
            <van-button round block type="primary" @click="saveAndPublish">保存并发布</van-button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 自动出题弹窗 -->
    <van-popup v-model:show="showAutoGenerateDialog" position="bottom" round :style="{ height: '90%' }">
      <div class="auto-popup">
        <van-nav-bar>
          <template #title>
            {{ autoStep === 1 ? '自动出题 - 配置' : '自动出题 - 预览' }}
          </template>
          <template #left>
            <span v-if="autoStep === 2" class="nav-back" @click="autoStep = 1">返回</span>
            <van-icon v-else name="cross" @click="showAutoGenerateDialog = false" />
          </template>
        </van-nav-bar>

        <!-- 步骤1: 配置界面 -->
        <div v-show="autoStep === 1" class="auto-config">
          <!-- 科目选择 -->
          <div class="config-section">
            <div class="section-label"><span class="required">*</span>科目</div>
            <div class="btn-group">
              <div
                v-for="s in subjectList"
                :key="s"
                class="btn-item"
                :class="{ active: autoConfig.subject === s }"
                @click="selectAutoSubject(s)"
              >{{ s }}</div>
            </div>
          </div>

          <!-- 年级选择 -->
          <div class="config-section">
            <div class="section-label">年级（可选）</div>
            <div class="btn-group">
              <div
                class="btn-item"
                :class="{ active: autoConfig.grade === '' }"
                @click="autoConfig.grade = ''; loadAvailableChapters()"
              >不限</div>
              <div
                v-for="g in gradeList"
                :key="g"
                class="btn-item"
                :class="{ active: autoConfig.grade === g }"
                @click="autoConfig.grade = g; loadAvailableChapters()"
              >{{ g }}</div>
            </div>
          </div>

          <!-- 章节多选 -->
          <div class="config-section">
            <div class="section-row" @click="showChapterPicker = true">
              <div class="section-label">章节选择</div>
              <div class="section-value">
                <span v-if="autoConfig.chapters.length === 0" class="placeholder">不限</span>
                <span v-else class="selected-count">已选 {{ autoConfig.chapters.length }} 个</span>
                <van-icon name="arrow" />
              </div>
            </div>
            <div v-if="autoConfig.chapters.length > 0" class="chapter-tags">
              <van-tag v-for="ch in autoConfig.chapters" :key="ch" closeable type="primary" plain @close="removeChapter(ch)">{{ ch }}</van-tag>
            </div>
          </div>

          <!-- 题型配置 -->
          <div class="config-section">
            <div class="section-row">
              <div class="section-label">题型配置</div>
              <van-button size="mini" type="primary" plain @click="addQuestionConfig">+ 添加题型</van-button>
            </div>
            <div class="type-config-list">
              <div v-for="(cfg, idx) in autoConfig.questionConfig" :key="idx" class="type-config-item">
                <div class="type-config-header">
                  <van-tag :type="getTypeTagType(cfg.type)">{{ cfg.typeText }}</van-tag>
                  <van-icon name="delete-o" class="delete-icon" @click="removeQuestionConfig(idx)" />
                </div>
                <div class="type-config-body">
                  <div class="config-row">
                    <span>数量</span>
                    <van-stepper v-model="cfg.count" min="1" max="50" />
                  </div>
                  <div class="config-row">
                    <span>每题分值</span>
                    <van-stepper v-model="cfg.score" min="1" max="100" />
                  </div>
                </div>
              </div>
              <div v-if="autoConfig.questionConfig.length === 0" class="empty-tip">请点击上方按钮添加题型</div>
            </div>
          </div>

          <!-- 难度比例 -->
          <div class="config-section">
            <div class="section-label">难度比例</div>
            <div class="difficulty-config">
              <div class="difficulty-row">
                <span class="diff-label easy">简单</span>
                <van-slider v-model="autoConfig.difficultyRatio.easy" :max="100" active-color="#07c160" />
                <span class="diff-value">{{ autoConfig.difficultyRatio.easy }}%</span>
              </div>
              <div class="difficulty-row">
                <span class="diff-label medium">中等</span>
                <van-slider v-model="autoConfig.difficultyRatio.medium" :max="100" active-color="#ff976a" />
                <span class="diff-value">{{ autoConfig.difficultyRatio.medium }}%</span>
              </div>
              <div class="difficulty-row">
                <span class="diff-label hard">困难</span>
                <van-slider v-model="autoConfig.difficultyRatio.hard" :max="100" active-color="#ee0a24" />
                <span class="diff-value">{{ autoConfig.difficultyRatio.hard }}%</span>
              </div>
              <div class="difficulty-sum">
                合计: {{ difficultyTotal }}%
                <span v-if="difficultyTotal !== 100" class="warning">（建议总和为100%）</span>
              </div>
            </div>
          </div>

          <!-- 预估信息 -->
          <div class="preview-info">
            <div class="info-item">
              <van-icon name="notes-o" />
              <span>预计题目: {{ estimatedCount }} 道</span>
            </div>
            <div class="info-item">
              <van-icon name="gold-coin-o" />
              <span>预计总分: {{ estimatedScore }} 分</span>
            </div>
          </div>
        </div>

        <!-- 步骤2: 预览界面 -->
        <div v-show="autoStep === 2" class="auto-preview">
          <div class="preview-header">
            <div class="preview-stats">
              已生成 <strong>{{ generatedQuestions.length }}</strong> 题，
              共 <strong>{{ generatedTotalScore }}</strong> 分
            </div>
            <van-button size="small" type="primary" plain @click="regenerateQuestions">重新抽题</van-button>
          </div>
          <van-collapse v-model="activeCollapse" class="preview-list">
            <van-collapse-item v-for="(q, idx) in generatedQuestions" :key="q.questionId" :name="idx">
              <template #title>
                <div class="preview-item-title">
                  <span class="q-num">{{ idx + 1 }}.</span>
                  <van-tag :type="getTypeTagType(q.questionType)" size="small">{{ getTypeName(q.questionType) }}</van-tag>
                  <van-tag :type="getDifficultyTagType(q.difficulty)" size="small" plain>{{ getDifficultyName(q.difficulty) }}</van-tag>
                  <span class="q-score">{{ q.score }}分</span>
                  <van-icon v-if="q.replaced" name="replay" class="replaced-icon" />
                </div>
              </template>
              <div class="preview-item-content">
                <div class="q-content">{{ q.content }}</div>
                <div v-if="q.options && q.questionType === 'choice'" class="q-options">
                  <div v-for="(opt, optIdx) in q.options" :key="optIdx" class="opt-item">{{ optionLetters[optIdx] }}. {{ opt }}</div>
                </div>
              </div>
              <template #right-icon>
                <van-button size="mini" @click.stop="replaceQuestion(idx)">换题</van-button>
              </template>
            </van-collapse-item>
          </van-collapse>
        </div>

        <!-- 底部按钮 -->
        <div class="auto-footer">
          <van-button v-if="autoStep === 1" type="primary" block :loading="generating" @click="generateQuestions">
            开始抽题
          </van-button>
          <van-button v-else type="primary" block @click="confirmGeneratedQuestions">
            确认添加 ({{ generatedQuestions.length }}题)
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 手动选题弹窗 -->
    <van-popup v-model:show="showManualDialog" position="bottom" round :style="{ height: '90%' }">
      <div class="manual-popup">
        <van-nav-bar title="手动选题">
          <template #right><van-icon name="cross" @click="showManualDialog = false" /></template>
        </van-nav-bar>

        <!-- 筛选条件 -->
        <div class="manual-filters">
          <div class="filter-bar">
            <van-button size="small" :type="manualFilters.subject ? 'primary' : 'default'" @click="currentFilterType = 'subject'; showManualFilterPicker = true">
              {{ manualFilters.subject || '科目' }}
            </van-button>
            <van-button size="small" :type="manualFilters.grade ? 'primary' : 'default'" @click="currentFilterType = 'grade'; showManualFilterPicker = true">
              {{ manualFilters.grade || '年级' }}
            </van-button>
            <van-button size="small" :type="manualFilters.type ? 'primary' : 'default'" @click="currentFilterType = 'type'; showManualFilterPicker = true">
              {{ getTypeName(manualFilters.type) || '题型' }}
            </van-button>
            <van-button size="small" :type="manualFilters.difficulty ? 'primary' : 'default'" @click="currentFilterType = 'difficulty'; showManualFilterPicker = true">
              {{ getDifficultyName(manualFilters.difficulty) || '难度' }}
            </van-button>
          </div>
          <van-search v-model="manualFilters.keyword" placeholder="搜索题目关键词" @search="searchManualQuestions" @clear="searchManualQuestions" />
        </div>

        <!-- 题目列表 -->
        <div class="manual-list">
          <van-pull-refresh v-model="manualRefreshing" @refresh="refreshManualQuestions">
            <van-list v-model:loading="manualLoading" :finished="manualFinished" @load="loadManualQuestions">
              <div v-for="q in manualQuestions" :key="q.id" class="manual-item" @click="toggleManualSelect(q)">
                <van-checkbox :model-value="tempSelectedIds.has(q.id)" @click.stop="toggleManualSelect(q)" />
                <div class="manual-item-content">
                  <div class="manual-item-meta">
                    <van-tag :type="getTypeTagType(q.question_type)" size="small">{{ getTypeName(q.question_type) }}</van-tag>
                    <van-tag :type="getDifficultyTagType(q.difficulty)" size="small" plain>{{ getDifficultyName(q.difficulty) }}</van-tag>
                    <span class="q-score">{{ q.score }}分</span>
                  </div>
                  <div class="manual-item-text">{{ q.content }}</div>
                  <div class="manual-item-chapter">{{ q.chapter || '未分类' }}</div>
                </div>
              </div>
              <div v-if="manualQuestions.length === 0 && !manualLoading" class="empty-list">暂无题目</div>
            </van-list>
          </van-pull-refresh>
        </div>

        <!-- 底部操作栏 -->
        <div class="manual-footer">
          <span>已选 {{ tempSelectedIds.size }} 题</span>
          <van-button type="primary" size="small" @click="confirmManualSelect">确定添加</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 手动选题筛选弹窗 -->
    <van-popup v-model:show="showManualFilterPicker" position="bottom" round>
      <van-picker
        :columns="currentFilterOptions"
        @confirm="onFilterConfirm"
        @cancel="showManualFilterPicker = false"
      />
    </van-popup>

    <!-- 章节选择弹窗 -->
    <van-popup v-model:show="showChapterPicker" position="bottom" round :style="{ height: '60%' }">
      <div class="chapter-picker">
        <van-nav-bar title="选择章节">
          <template #right>
            <van-button size="small" type="primary" @click="showChapterPicker = false">确定</van-button>
          </template>
        </van-nav-bar>
        <div class="chapter-actions">
          <van-button size="small" @click="selectAllChapters">全选</van-button>
          <van-button size="small" @click="clearAllChapters">清空</van-button>
        </div>
        <div class="chapter-list">
          <van-checkbox-group v-model="autoConfig.chapters">
            <van-cell-group>
              <van-cell v-for="ch in availableChapters" :key="ch" clickable @click="toggleChapterSelect(ch)">
                <template #title>{{ ch }}</template>
                <template #right-icon>
                  <van-checkbox :name="ch" shape="square" @click.stop />
                </template>
              </van-cell>
            </van-cell-group>
          </van-checkbox-group>
          <div v-if="availableChapters.length === 0" class="empty-chapters">
            {{ autoConfig.subject ? '该条件下暂无章节' : '请先选择科目' }}
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 其他选择器 -->
    <van-popup v-model:show="showSubjectPicker" position="bottom" round>
      <van-picker :columns="subjectColumns" @confirm="onSubjectConfirm" @cancel="showSubjectPicker = false" />
    </van-popup>

    <van-popup v-model:show="showGradePicker" position="bottom" round>
      <van-picker :columns="gradeColumns" @confirm="onGradeConfirm" @cancel="showGradePicker = false" />
    </van-popup>

    <van-popup v-model:show="showClassPicker" position="bottom" round>
      <div class="class-picker-popup">
        <div class="picker-header">
          <span @click="cancelClassSelect">取消</span>
          <span>选择班级</span>
          <span @click="confirmClassSelect">确定</span>
        </div>
        <div class="picker-content">
          <van-checkbox-group v-model="form.target_classes">
            <van-cell-group>
              <van-cell v-for="c in classColumns" :key="c.value" clickable @click="toggleClass(c.value)" class="class-cell">
                <template #title>
                  <div class="class-cell-content">
                    <span>{{ c.text }}</span>
                    <van-checkbox :name="c.value" shape="square" @click.stop />
                  </div>
                </template>
              </van-cell>
            </van-cell-group>
          </van-checkbox-group>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showStartTimePicker" position="bottom" round>
      <van-picker-group title="选择开始时间" :tabs="['选择日期', '选择时间']" @confirm="onStartTimeConfirm" @cancel="showStartTimePicker = false">
        <van-date-picker v-model="startDateValue" :min-date="minDate" />
        <van-time-picker v-model="startTimeValue" />
      </van-picker-group>
    </van-popup>

    <van-popup v-model:show="showEndTimePicker" position="bottom" round>
      <van-picker-group title="选择结束时间" :tabs="['选择日期', '选择时间']" @confirm="onEndTimeConfirm" @cancel="showEndTimePicker = false">
        <van-date-picker v-model="endDateValue" :min-date="minDate" />
        <van-time-picker v-model="endTimeValue" />
      </van-picker-group>
    </van-popup>

    <!-- 考试详情弹窗 -->
    <van-popup v-model:show="showDetailDialog" position="bottom" round :style="{ height: '70%' }">
      <div class="detail-popup" v-if="currentExam">
        <van-nav-bar title="考试详情">
          <template #right><van-icon name="cross" @click="showDetailDialog = false" /></template>
        </van-nav-bar>
        <div class="detail-content">
          <div class="detail-header">
            <h3>{{ currentExam.title }}</h3>
            <van-tag :type="getStatusTag(currentExam.status)">{{ getStatusName(currentExam.status) }}</van-tag>
          </div>
          <van-cell-group>
            <van-cell title="科目" :value="currentExam.subject" />
            <van-cell title="年级" :value="currentExam.grade" />
            <van-cell title="班级" :value="currentExam.target_classes?.join(', ')" />
            <van-cell title="时长" :value="currentExam.duration ? currentExam.duration + '分钟' : '不限时'" />
            <van-cell title="总分" :value="currentExam.total_score + '分'" />
            <van-cell title="题目数量" :value="currentExam.questions?.length + '题'" />
            <van-cell title="批改方式" :value="getGradingModeName(currentExam.grading_mode)" />
            <van-cell v-if="currentExam.start_time" title="开始时间" :value="currentExam.start_time" />
            <van-cell v-if="currentExam.end_time" title="结束时间" :value="currentExam.end_time" />
          </van-cell-group>
          <div class="detail-actions">
            <van-button type="default" block @click="previewCurrentExam">预览试卷</van-button>
            <van-button v-if="currentExam.status === 'draft'" type="primary" block @click="publishCurrentExam">发布</van-button>
            <van-button v-if="currentExam.status === 'published'" type="warning" block @click="withdrawCurrentExam">撤回到草稿</van-button>
            <van-button type="danger" block @click="deleteCurrentExam">删除</van-button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 预览试卷弹窗 -->
    <van-popup v-model:show="showPreviewDialog" position="bottom" round :style="{ height: '90%' }">
      <div class="preview-popup" v-if="previewExamData">
        <van-nav-bar :title="previewExamData.title + ' - 预览'">
          <template #right><van-icon name="cross" @click="showPreviewDialog = false" /></template>
        </van-nav-bar>
        <div class="preview-content">
          <div class="preview-header">
            <h3>{{ previewExamData.title }}</h3>
            <div class="preview-meta">
              <span>科目: {{ previewExamData.subject }}</span>
              <span>总分: {{ previewExamData.total_score }}分</span>
              <span>时长: {{ previewExamData.duration ? previewExamData.duration + '分钟' : '不限时' }}</span>
            </div>
          </div>
          <div class="preview-questions">
            <div v-for="(q, idx) in previewExamData.questionDetails" :key="q.id" class="preview-question">
              <div class="question-header">
                <span class="q-num">{{ idx + 1 }}.</span>
                <van-tag :type="getTypeTagType(q.question_type)" size="small">{{ getTypeName(q.question_type) }}</van-tag>
                <van-tag :type="getDifficultyTagType(q.difficulty)" size="small" plain>{{ getDifficultyName(q.difficulty) }}</van-tag>
                <span class="q-score">{{ q.score }}分</span>
              </div>
              <div class="question-content">{{ q.content }}</div>
              <div v-if="q.options && q.question_type === 'choice'" class="question-options">
                <div v-for="(opt, optIdx) in q.options" :key="optIdx" class="opt-item">{{ optionLetters[optIdx] }}. {{ opt }}</div>
              </div>
              <div v-if="showAnswers" class="question-answer">
                <span class="answer-label">答案:</span>
                <span class="answer-text">{{ q.answer }}</span>
              </div>
            </div>
          </div>
          <div class="preview-footer">
            <van-button type="default" block @click="showAnswers = !showAnswers">
              {{ showAnswers ? '隐藏答案' : '显示答案' }}
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { showToast, showSuccessToast, showFailToast, showConfirmDialog } from 'vant';
import * as examApi from '@/api/exams';
import api from '@/api/index';

// ========== 考试列表 ==========
const activeTab = ref(0);
const refreshing = ref(false);
const loading = ref(false);
const finished = ref(false);
const exams = ref([]);
const page = ref(1);

// ========== 创建考试表单 ==========
const showCreateDialog = ref(false);
const form = reactive({
  title: '',
  subject: '',
  grade: '',
  target_classes: [],
  duration: 60,
  start_time: '',
  end_time: '',
  grading_mode: 'ai'
});

// ========== 选择器 ==========
const showSubjectPicker = ref(false);
const showGradePicker = ref(false);
const showClassPicker = ref(false);
const showStartTimePicker = ref(false);
const showEndTimePicker = ref(false);
const showDetailDialog = ref(false);
const currentExam = ref(null);

// ========== 预览试卷 ==========
const showPreviewDialog = ref(false);
const previewExamData = ref(null);
const showAnswers = ref(false);

// ========== 已选题目 ==========
const selectedQuestions = ref([]);
const totalScore = computed(() => selectedQuestions.value.reduce((sum, q) => sum + (q.score || 0), 0));

// ========== 日期时间 ==========
const today = new Date();
const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const startDateValue = ref([today.getFullYear().toString(), (today.getMonth() + 1).toString().padStart(2, '0'), today.getDate().toString().padStart(2, '0')]);
const endDateValue = ref([today.getFullYear().toString(), (today.getMonth() + 1).toString().padStart(2, '0'), today.getDate().toString().padStart(2, '0')]);
const startTimeValue = ref(['08', '00']);
const endTimeValue = ref(['18', '00']);

// ========== 基础数据 ==========
const subjectColumns = [
  { text: '语文', value: '语文' },
  { text: '数学', value: '数学' },
  { text: '英语', value: '英语' },
  { text: '科学', value: '科学' }
];

const gradeColumns = [
  { text: '一年级', value: '一年级' },
  { text: '二年级', value: '二年级' },
  { text: '三年级', value: '三年级' },
  { text: '四年级', value: '四年级' },
  { text: '五年级', value: '五年级' },
  { text: '六年级', value: '六年级' }
];

const subjectList = ['语文', '数学', '英语', '科学'];
const gradeList = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

// 班级列表（从API获取）
const availableClasses = ref([]);

const classColumns = computed(() => {
  if (!form.grade) return [];
  return availableClasses.value.map(c => ({ text: c, value: c }));
});

const selectedClassesText = computed(() => {
  if (form.target_classes.length === 0) return '';
  return form.target_classes.join(', ');
});

// ========== 自动出题 ==========
const showAutoGenerateDialog = ref(false);
const autoStep = ref(1);
const generating = ref(false);
const showChapterPicker = ref(false);
const availableChapters = ref([]);
const generatedQuestions = ref([]);
const activeCollapse = ref([]);

const autoConfig = reactive({
  subject: '',
  grade: '',
  chapters: [],
  questionConfig: [
    { type: 'choice', typeText: '单选题', count: 10, score: 2 },
    { type: 'multiple', typeText: '多选题', count: 5, score: 2 },
    { type: 'fill', typeText: '填空题', count: 5, score: 2 }
  ],
  difficultyRatio: { easy: 30, medium: 50, hard: 20 }
});

const difficultyTotal = computed(() => autoConfig.difficultyRatio.easy + autoConfig.difficultyRatio.medium + autoConfig.difficultyRatio.hard);
const estimatedCount = computed(() => autoConfig.questionConfig.reduce((sum, c) => sum + c.count, 0));
const estimatedScore = computed(() => autoConfig.questionConfig.reduce((sum, c) => sum + c.count * c.score, 0));
const generatedTotalScore = computed(() => generatedQuestions.value.reduce((sum, q) => sum + q.score, 0));

// ========== 手动选题 ==========
const showManualDialog = ref(false);
const manualLoading = ref(false);
const manualFinished = ref(false);
const manualRefreshing = ref(false);
const manualQuestions = ref([]);
const manualPage = ref(1);
const tempSelectedIds = ref(new Set());

const manualFilters = reactive({ subject: '', grade: '', type: '', difficulty: '', keyword: '' });

const manualSubjectOptions = [
  { text: '全部科目', value: '' },
  { text: '语文', value: '语文' },
  { text: '数学', value: '数学' },
  { text: '英语', value: '英语' },
  { text: '科学', value: '科学' }
];

const manualGradeOptions = [
  { text: '全部年级', value: '' },
  { text: '一年级', value: '一年级' },
  { text: '二年级', value: '二年级' },
  { text: '三年级', value: '三年级' },
  { text: '四年级', value: '四年级' },
  { text: '五年级', value: '五年级' },
  { text: '六年级', value: '六年级' }
];

const manualTypeOptions = [
  { text: '全部题型', value: '' },
  { text: '单选题', value: 'choice' },
  { text: '多选题', value: 'multiple' },
  { text: '填空题', value: 'fill' },
  { text: '判断题', value: 'judgment' },
  { text: '主观题', value: 'subjective' }
];

const manualDifficultyOptions = [
  { text: '全部难度', value: '' },
  { text: '简单', value: 'easy' },
  { text: '中等', value: 'medium' },
  { text: '困难', value: 'hard' }
];

// 筛选弹窗
const showManualFilterPicker = ref(false);
const currentFilterType = ref('');

const currentFilterOptions = computed(() => {
  const optionMap = {
    subject: manualSubjectOptions,
    grade: manualGradeOptions,
    type: manualTypeOptions,
    difficulty: manualDifficultyOptions
  };
  return optionMap[currentFilterType.value] || [];
});

watch(showManualFilterPicker, (val) => {
  if (!val) currentFilterType.value = '';
});

function onFilterConfirm({ selectedValues }) {
  const value = selectedValues[0] || '';
  manualFilters[currentFilterType.value] = value;
  showManualFilterPicker.value = false;
  currentFilterType.value = '';
  searchManualQuestions();
}

// ========== 工具函数 ==========
function getStatusTag(status) {
  return { draft: 'default', published: 'success', ended: 'primary' }[status] || 'default';
}

function getStatusName(status) {
  return { draft: '草稿', published: '已发布', ended: '已结束' }[status] || '未知';
}

function getTypeTagType(type) {
  return { choice: 'primary', multiple: 'primary', fill: 'success', judgment: 'primary', subjective: 'warning' }[type] || 'default';
}

function getDifficultyTagType(difficulty) {
  return { easy: 'success', medium: 'warning', hard: 'danger' }[difficulty] || 'default';
}

function getTypeName(type) {
  return { choice: '单选题', multiple: '多选题', fill: '填空题', judgment: '判断题', subjective: '主观题' }[type] || type;
}

function getDifficultyName(difficulty) {
  return { easy: '简单', medium: '中等', hard: '困难' }[difficulty] || '中等';
}

function getGradingModeName(mode) {
  return { ai: 'AI批改', manual: '手动批改', mixed: '混合模式' }[mode] || 'AI批改';
}

// ========== 考试列表 ==========
const isLoading = ref(false); // 防止重复加载的标志

async function loadExams() {
  // 防止重复加载
  if (isLoading.value) return;

  // 如果已经加载完成，直接返回
  if (finished.value) {
    loading.value = false;
    return;
  }

  isLoading.value = true;
  loading.value = true;

  // 如果是刷新，先清空数据
  if (refreshing.value) {
    exams.value = [];
    page.value = 1;
  }

  try {
    const statusMap = { 0: undefined, 1: 'draft', 2: 'published', 3: 'ended' };
    const res = await examApi.getExamTasks({ page: page.value, pageSize: 20, status: statusMap[activeTab.value] });
    if (res.code === 0) {
      exams.value.push(...res.data.list);
      finished.value = res.data.list.length < 20;
      if (!finished.value) page.value++;
    } else {
      finished.value = true;
    }
  } catch (e) {
    showToast(e.message);
    finished.value = true;
  } finally {
    loading.value = false;
    refreshing.value = false;
    isLoading.value = false;
  }
}

function onRefresh() {
  refreshing.value = true;
  finished.value = false;
  isLoading.value = false;
  loadExams();
}

function onTabChange() {
  exams.value = [];
  page.value = 1;
  finished.value = false;
  isLoading.value = false;
  loadExams();
}

// ========== 创建考试 ==========
function openCreateDialog() {
  resetForm();
  showCreateDialog.value = true;
}

function closeDialog() {
  showCreateDialog.value = false;
  resetForm();
}

function resetForm() {
  Object.assign(form, { title: '', subject: '', grade: '', target_classes: [], duration: 60, start_time: '', end_time: '', grading_mode: 'ai' });
  selectedQuestions.value = [];
  availableClasses.value = [];
}

// ========== 选择器回调 ==========
const onSubjectConfirm = ({ selectedValues }) => { form.subject = selectedValues[0] || ''; showSubjectPicker.value = false; };
const onGradeConfirm = async ({ selectedValues }) => {
  form.grade = selectedValues[0] || '';
  form.target_classes = [];
  showGradePicker.value = false;
  // 加载该年级的班级列表
  if (form.grade) {
    await loadAvailableClasses(form.grade);
  }
};

// 加载班级列表
async function loadAvailableClasses(grade) {
  try {
    const res = await examApi.getAvailableClasses(grade);
    if (res.code === 0) {
      availableClasses.value = res.data || [];
    }
  } catch (e) {
    console.error('加载班级列表失败:', e);
    availableClasses.value = [];
  }
}

const openClassPicker = () => {
  if (form.grade && availableClasses.value.length > 0) {
    tempSelectedClasses.value = [...form.target_classes];
    showClassPicker.value = true;
  }
};

// 临时保存选择，用于取消时恢复
const tempSelectedClasses = ref([]);

const toggleClass = (className) => {
  const idx = form.target_classes.indexOf(className);
  idx >= 0 ? form.target_classes.splice(idx, 1) : form.target_classes.push(className);
};

const cancelClassSelect = () => {
  form.target_classes = [...tempSelectedClasses.value];
  showClassPicker.value = false;
};

const confirmClassSelect = () => {
  showClassPicker.value = false;
};
const onStartTimeConfirm = () => {
  form.start_time = `${startDateValue.value.join('-')} ${startTimeValue.value.join(':')}`;
  showStartTimePicker.value = false;
};
const onEndTimeConfirm = () => {
  form.end_time = `${endDateValue.value.join('-')} ${endTimeValue.value.join(':')}`;
  showEndTimePicker.value = false;
};

// ========== 自动出题 ==========
function openAutoGenerate() {
  autoStep.value = 1;
  autoConfig.subject = form.subject || '';
  autoConfig.grade = form.grade || '';
  autoConfig.chapters = [];
  autoConfig.questionConfig = [{ type: 'choice', typeText: '单选题', count: 10, score: 2 }, { type: 'multiple', typeText: '多选题', count: 5, score: 2 }, { type: 'fill', typeText: '填空题', count: 5, score: 2 }, { type: 'judgment', typeText: '判断题', count: 5, score: 2 }];
  autoConfig.difficultyRatio = { easy: 30, medium: 50, hard: 20 };
  generatedQuestions.value = [];
  availableChapters.value = [];
  if (autoConfig.subject) loadAvailableChapters();
  showAutoGenerateDialog.value = true;
}

function selectAutoSubject(s) {
  autoConfig.subject = s;
  autoConfig.chapters = [];
  loadAvailableChapters();
}

async function loadAvailableChapters() {
  if (!autoConfig.subject) { availableChapters.value = []; return; }
  try {
    const res = await api.get('/questions/tree');
    if (res.code === 0) {
      const chapters = [];
      res.data.forEach(s => {
        if (s.subject === autoConfig.subject) {
          s.grades.forEach(g => {
            if (!autoConfig.grade || g.grade === autoConfig.grade) {
              g.chapters.forEach(c => { if (!chapters.includes(c.chapter)) chapters.push(c.chapter); });
            }
          });
        }
      });
      availableChapters.value = chapters;
    }
  } catch (e) { console.error(e); }
}

function toggleChapterSelect(ch) {
  const idx = autoConfig.chapters.indexOf(ch);
  idx >= 0 ? autoConfig.chapters.splice(idx, 1) : autoConfig.chapters.push(ch);
}

function selectAllChapters() { autoConfig.chapters = [...availableChapters.value]; }
function clearAllChapters() { autoConfig.chapters = []; }
function removeChapter(ch) { const idx = autoConfig.chapters.indexOf(ch); if (idx >= 0) autoConfig.chapters.splice(idx, 1); }

function addQuestionConfig() {
  const existingTypes = autoConfig.questionConfig.map(c => c.type);
  const newType = ['choice', 'multiple', 'fill', 'judgment', 'subjective'].find(t => !existingTypes.includes(t)) || 'choice';
  autoConfig.questionConfig.push({ type: newType, typeText: getTypeName(newType), count: 5, score: 2 });
}

function removeQuestionConfig(idx) { autoConfig.questionConfig.splice(idx, 1); }

async function generateQuestions() {
  if (!autoConfig.subject) { showToast('请选择科目'); return; }
  if (autoConfig.questionConfig.length === 0) { showToast('请添加题型配置'); return; }
  generating.value = true;
  try {
    const res = await examApi.autoGenerateQuestions({
      subject: autoConfig.subject,
      grade: autoConfig.grade || undefined,
      chapters: autoConfig.chapters.length > 0 ? autoConfig.chapters : undefined,
      question_config: autoConfig.questionConfig.map(c => ({ type: c.type, count: c.count, score: c.score })),
      difficulty_ratio: { easy: autoConfig.difficultyRatio.easy / 100, medium: autoConfig.difficultyRatio.medium / 100, hard: autoConfig.difficultyRatio.hard / 100 }
    });
    if (res.code === 0) {
      generatedQuestions.value = res.data.questions.map(q => ({ ...q, replaced: false }));
      autoStep.value = 2;
      activeCollapse.value = [];
      showSuccessToast(`成功生成 ${res.data.questions.length} 道题目`);
    } else { showFailToast(res.message || '生成失败'); }
  } catch (e) { showFailToast(e.message || '生成失败'); }
  finally { generating.value = false; }
}

async function regenerateQuestions() { await generateQuestions(); }

async function replaceQuestion(idx) {
  const oldQ = generatedQuestions.value[idx];
  try {
    const res = await examApi.autoGenerateQuestions({
      subject: autoConfig.subject,
      grade: autoConfig.grade || undefined,
      chapters: autoConfig.chapters.length > 0 ? autoConfig.chapters : undefined,
      question_config: [{ type: oldQ.questionType, count: 1, score: oldQ.score }],
      difficulty_ratio: { easy: 0.33, medium: 0.34, hard: 0.33 }
    });
    if (res.code === 0 && res.data.questions.length > 0) {
      const newQ = res.data.questions[0];
      const existingIds = generatedQuestions.value.map(q => q.questionId);
      if (!existingIds.includes(newQ.questionId)) {
        generatedQuestions.value[idx] = { ...newQ, replaced: true };
        showSuccessToast('换题成功');
      } else { showToast('抽到了重复题目，请重试'); }
    } else { showToast(res.message || '换题失败'); }
  } catch (e) { showToast(e.message || '换题失败'); }
}

function confirmGeneratedQuestions() {
  const existingIds = new Set(selectedQuestions.value.map(q => q.questionId));
  generatedQuestions.value.forEach(q => {
    if (!existingIds.has(q.questionId)) {
      selectedQuestions.value.push({ questionId: q.questionId, questionType: q.questionType, content: q.content, options: q.options, difficulty: q.difficulty, score: q.score });
    }
  });
  showAutoGenerateDialog.value = false;
  showSuccessToast(`已添加 ${generatedQuestions.value.length} 道题目`);
}

// ========== 手动选题 ==========
function openManualSelect() {
  manualFilters.subject = form.subject || '';
  manualFilters.grade = form.grade || '';
  manualFilters.type = '';
  manualFilters.difficulty = '';
  manualFilters.keyword = '';
  manualQuestions.value = [];
  manualPage.value = 1;
  manualFinished.value = false;
  tempSelectedIds.value = new Set(selectedQuestions.value.map(q => q.questionId));
  showManualDialog.value = true;
  loadManualQuestions();
}

async function loadManualQuestions() {
  if (manualLoading.value) return;
  manualLoading.value = true;
  try {
    const res = await api.get('/questions', { params: { page: manualPage.value, pageSize: 20, ...manualFilters } });
    if (res.code === 0) {
      manualQuestions.value.push(...res.data.list);
      manualFinished.value = res.data.list.length < 20;
      if (!manualFinished.value) manualPage.value++;
    }
  } catch (e) { showToast(e.message); manualFinished.value = true; }
  finally { manualLoading.value = false; manualRefreshing.value = false; }
}

function searchManualQuestions() { manualQuestions.value = []; manualPage.value = 1; manualFinished.value = false; loadManualQuestions(); }
function refreshManualQuestions() { manualRefreshing.value = true; manualQuestions.value = []; manualPage.value = 1; manualFinished.value = false; loadManualQuestions(); }

function toggleManualSelect(q) {
  tempSelectedIds.value.has(q.id) ? tempSelectedIds.value.delete(q.id) : tempSelectedIds.value.add(q.id);
}

function confirmManualSelect() {
  const existingIds = new Set(selectedQuestions.value.map(q => q.questionId));
  let addedCount = 0;
  // 只添加新选中的题目，不删除之前已选的题目
  tempSelectedIds.value.forEach(id => {
    if (!existingIds.has(id)) {
      const q = manualQuestions.value.find(item => item.id === id);
      if (q) {
        selectedQuestions.value.push({ questionId: q.id, questionType: q.question_type, content: q.content, options: q.options, difficulty: q.difficulty, score: q.score || 2 });
        addedCount++;
      }
    }
  });
  showManualDialog.value = false;
  if (addedCount > 0) {
    showToast(`已添加 ${addedCount} 道新题目，当前共 ${selectedQuestions.value.length} 题`);
  } else {
    showToast(`当前共 ${selectedQuestions.value.length} 题`);
  }
}

// ========== 已选题目管理 ==========
function removeQuestion(idx) { selectedQuestions.value.splice(idx, 1); }
function clearAllQuestions() { selectedQuestions.value = []; }
function updateTotalScore() { /* computed auto-updates */ }

// 拖拽排序
let dragIdx = null;
function startDrag(idx) { dragIdx = idx; }
function endDrag() { dragIdx = null; }

// ========== 提交考试 ==========
async function onSubmit() {
  if (selectedQuestions.value.length === 0) { showToast('请选择题目'); return; }
  try {
    const data = { ...form, questions: selectedQuestions.value.map(q => ({ questionId: q.questionId, score: q.score })), total_score: totalScore.value };
    const res = await examApi.createExamTask(data);
    if (res.code === 0) { showSuccessToast('保存成功'); closeDialog(); onRefresh(); }
    else { showFailToast(res.message || '保存失败'); }
  } catch (e) { showFailToast(e.message || '保存失败'); }
}

async function saveAndPublish() {
  if (selectedQuestions.value.length === 0) { showToast('请选择题目'); return; }
  try {
    const data = { ...form, questions: selectedQuestions.value.map(q => ({ questionId: q.questionId, score: q.score })), total_score: totalScore.value };
    const res = await examApi.createExamTask(data);
    if (res.code === 0) {
      const pubRes = await examApi.publishExamTask(res.data.id);
      if (pubRes.code === 0) { showSuccessToast('发布成功'); closeDialog(); onRefresh(); }
      else { showFailToast(pubRes.message || '发布失败'); }
    } else { showFailToast(res.message || '保存失败'); }
  } catch (e) { showFailToast(e.message || '操作失败'); }
}

// ========== 考试详情 ==========
async function showExamDetail(exam) {
  try {
    const res = await examApi.getExamTaskById(exam.id);
    if (res.code === 0) { currentExam.value = res.data; showDetailDialog.value = true; }
  } catch (e) { showToast(e.message); }
}

async function publishCurrentExam() {
  try {
    await showConfirmDialog({ title: '确认发布', message: '发布后学生将可以看到并参加考试，确定发布吗？' });
    const res = await examApi.publishExamTask(currentExam.value.id);
    if (res.code === 0) { showSuccessToast('发布成功'); showDetailDialog.value = false; onRefresh(); }
    else { showFailToast(res.message || '发布失败'); }
  } catch (e) { /* cancelled */ }
}

async function deleteCurrentExam() {
  try {
    const isPublished = currentExam.value.status === 'published';
    const message = isPublished
      ? '该考试已发布，删除将清除所有学生的答题记录，确定强制删除吗？'
      : '删除后无法恢复，确定删除吗？';
    await showConfirmDialog({ title: '确认删除', message });
    const res = await examApi.deleteExamTask(currentExam.value.id, isPublished);
    if (res.code === 0) { showSuccessToast('删除成功'); showDetailDialog.value = false; onRefresh(); }
    else { showFailToast(res.message || '删除失败'); }
  } catch (e) { /* cancelled */ }
}

async function withdrawCurrentExam() {
  try {
    await showConfirmDialog({ title: '确认撤回', message: '撤回后考试将变为草稿状态，学生将无法看到，确定撤回吗？' });
    const res = await examApi.withdrawExamTask(currentExam.value.id);
    if (res.code === 0) { showSuccessToast('撤回成功'); showDetailDialog.value = false; onRefresh(); }
    else { showFailToast(res.message || '撤回失败'); }
  } catch (e) { /* cancelled */ }
}

async function previewCurrentExam() {
  await openPreview(currentExam.value);
}

async function openPreview(exam) {
  try {
    const res = await examApi.getExamTaskById(exam.id);
    if (res.code === 0) {
      previewExamData.value = res.data;
      showAnswers.value = false;
      showPreviewDialog.value = true;
    }
  } catch (e) { showToast(e.message); }
}

async function previewExam(exam) {
  await openPreview(exam);
}

async function withdrawExam(exam) {
  try {
    await showConfirmDialog({ title: '确认撤回', message: '撤回后考试将变为草稿状态，学生将无法看到，确定撤回吗？' });
    const res = await examApi.withdrawExamTask(exam.id);
    if (res.code === 0) { showSuccessToast('撤回成功'); onRefresh(); }
    else { showFailToast(res.message || '撤回失败'); }
  } catch (e) { /* cancelled */ }
}

async function deleteExam(exam) {
  try {
    await showConfirmDialog({ title: '确认删除', message: '删除后无法恢复，确定删除吗？' });
    const res = await examApi.deleteExamTask(exam.id);
    if (res.code === 0) { showSuccessToast('删除成功'); onRefresh(); }
    else { showFailToast(res.message || '删除失败'); }
  } catch (e) { /* cancelled */ }
}

onMounted(() => {
  // van-list会自动触发loadExams，这里不需要手动调用
});
</script>

<style scoped>
.page-content { padding-bottom: 20px; }
.exam-title { display: flex; align-items: center; }
.exam-name { font-size: 15px; font-weight: 500; }
.exam-info { display: flex; gap: 8px; margin-top: 4px; color: #666; font-size: 12px; }

.form-popup { height: 100%; display: flex; flex-direction: column; }
.scroll_form { flex: 1; overflow-y: auto; padding-bottom: 20px; }

.section-title { padding: 16px 16px 8px; font-weight: bold; background: #f7f8fa; }
.question-actions { display: flex; gap: 8px; padding: 8px 16px; background: #f7f8fa; }

.selected-questions { padding: 8px 16px; background: #fff; }
.selected-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 14px; color: #333; border-bottom: 1px solid #eee; }
.question-list { max-height: 250px; overflow-y: auto; }
.question-item { display: flex; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #eee; gap: 8px; }
.drag-handle { cursor: move; color: #999; padding: 4px; }
.question-content { flex: 1; min-width: 0; }
.question-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.q-num { font-weight: 500; }
.q-text { font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.question-right { display: flex; align-items: center; gap: 4px; }
.score-label { font-size: 12px; color: #666; }
.delete-icon { color: #ee0a24; padding: 4px; margin-left: 8px; }
.no-question { text-align: center; color: #999; padding: 16px; }

.form-actions { padding: 16px; display: flex; flex-direction: column; gap: 8px; background: #fff; }

.grading-tip { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #fffbe8; color: #ed6a0c; font-size: 12px; }

.class-picker-popup { background: #fff; }
.picker-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #eee; font-size: 14px; }
.picker-header span:first-child { color: #969799; }
.picker-header span:last-child { color: #1989fa; font-weight: 500; }
.picker-content { max-height: 300px; overflow-y: auto; }
.class-cell { cursor: pointer; }
.class-cell-content { display: flex; justify-content: space-between; align-items: center; width: 100%; padding-right: 0; }
.class-cell-content .van-checkbox { pointer-events: auto; }

/* 自动出题弹窗 */
.auto-popup { height: 100%; display: flex; flex-direction: column; }
.nav-back { color: #1989fa; }
.auto-config { flex: 1; overflow-y: auto; }

.config-section { background: #fff; margin-bottom: 10px; padding: 12px 16px; }
.section-label { font-size: 15px; font-weight: 500; color: #333; margin-bottom: 10px; }
.required { color: #ee0a24; margin-right: 2px; }
.section-row { display: flex; justify-content: space-between; align-items: center; }
.section-value { display: flex; align-items: center; gap: 4px; font-size: 14px; }
.placeholder { color: #999; }
.selected-count { color: #1989fa; }

.btn-group { display: flex; flex-wrap: wrap; gap: 8px; }
.btn-item { padding: 6px 16px; border: 1px solid #dcdee0; border-radius: 4px; font-size: 14px; color: #666; background: #fff; }
.btn-item.active { background: #1989fa; border-color: #1989fa; color: #fff; }

.chapter-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }

.type-config-list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.type-config-item { background: #f7f8fa; border-radius: 8px; padding: 10px; }
.type-config-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.type-config-body { display: flex; flex-direction: column; gap: 8px; }
.config-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.empty-tip { text-align: center; color: #999; padding: 20px; font-size: 14px; }

.difficulty-config { display: flex; flex-direction: column; gap: 16px; }
.difficulty-row { display: flex; align-items: center; gap: 12px; }
.diff-label { width: 40px; font-size: 14px; }
.diff-label.easy { color: #07c160; }
.diff-label.medium { color: #ff976a; }
.diff-label.hard { color: #ee0a24; }
.diff-value { width: 40px; text-align: right; font-size: 14px; color: #333; }
.difficulty-sum { text-align: center; font-size: 13px; color: #666; padding-top: 8px; border-top: 1px solid #eee; }
.warning { color: #ff976a; }

.preview-info { display: flex; justify-content: space-around; padding: 16px; background: #fff; }
.info-item { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #666; }
.info-item .van-icon { color: #1989fa; font-size: 18px; }

/* 预览界面 */
.auto-preview { flex: 1; overflow-y: auto; }
.preview-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f7f8fa; }
.preview-stats { font-size: 14px; color: #666; }
.preview-stats strong { color: #1989fa; }
.preview-list { padding: 8px; }
.preview-item-title { display: flex; align-items: center; gap: 6px; }
.q-score { color: #ff976a; font-size: 12px; margin-left: auto; }
.replaced-icon { color: #07c160; font-size: 14px; }
.preview-item-content { padding: 8px 0; }
.q-content { white-space: normal; line-height: 1.6; font-size: 14px; }
.q-options { margin-top: 8px; padding-left: 12px; }
.opt-item { font-size: 13px; color: #666; line-height: 1.8; }

.auto-footer { padding: 12px 16px; background: #fff; border-top: 1px solid #eee; }

/* 手动选题弹窗 */
.manual-popup { height: 100%; display: flex; flex-direction: column; }
.manual-filters { background: #fff; border-bottom: 1px solid #eee; }
.filter-bar { display: flex; gap: 8px; padding: 8px 12px; overflow-x: auto; }
.filter-bar .van-button { flex-shrink: 0; min-width: 60px; }
.manual-list { flex: 1; overflow-y: auto; padding: 8px; }
.manual-item { display: flex; align-items: flex-start; padding: 12px; background: #fff; border-radius: 8px; margin-bottom: 8px; gap: 10px; }
.manual-item-content { flex: 1; min-width: 0; }
.manual-item-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.manual-item-text { font-size: 14px; color: #333; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.manual-item-chapter { font-size: 12px; color: #999; margin-top: 4px; }
.empty-list { text-align: center; color: #999; padding: 40px; }
.manual-footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fff; border-top: 1px solid #eee; }

/* 章节选择弹窗 */
.chapter-picker { height: 100%; display: flex; flex-direction: column; }
.chapter-actions { display: flex; gap: 8px; padding: 8px 16px; background: #fff; border-bottom: 1px solid #eee; }
.chapter-list { flex: 1; overflow-y: auto; }
.empty-chapters { text-align: center; color: #999; padding: 40px 20px; font-size: 14px; }

/* 详情弹窗 */
.detail-popup { height: 100%; display: flex; flex-direction: column; }
.detail-content { flex: 1; overflow-y: auto; padding: 16px; }
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.detail-header h3 { margin: 0; font-size: 18px; }
.detail-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }

/* 预览试卷弹窗 */
.preview-popup { height: 100%; display: flex; flex-direction: column; background: #f7f8fa; }
.preview-content { flex: 1; overflow-y: auto; }
.preview-popup .preview-header { background: #fff; padding: 16px; margin-bottom: 10px; }
.preview-popup .preview-header h3 { margin: 0 0 8px; font-size: 18px; }
.preview-meta { display: flex; gap: 16px; font-size: 13px; color: #666; }
.preview-questions { padding: 0 12px 20px; }
.preview-question { background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.preview-question .question-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.preview-question .q-num { font-weight: 500; }
.preview-question .q-score { color: #ff976a; font-size: 12px; margin-left: auto; }
.preview-question .question-content { font-size: 14px; line-height: 1.6; color: #333; margin-bottom: 8px; }
.preview-question .question-options { padding-left: 12px; }
.preview-question .opt-item { font-size: 13px; color: #666; line-height: 1.8; }
.preview-question .question-answer { padding: 8px 12px; background: #f0f9eb; border-radius: 4px; font-size: 13px; }
.preview-question .answer-label { color: #07c160; font-weight: 500; }
.preview-question .answer-text { color: #333; margin-left: 8px; }
.preview-footer { padding: 12px 16px; background: #fff; border-top: 1px solid #eee; }
</style>
