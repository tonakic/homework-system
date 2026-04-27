<template>
  <div class="page">
    <!-- PC Version -->
    <div v-if="isPC" class="statistics-pc">
      <div class="pc-header">
        <h2>数据统计</h2>
        <div class="filter-bar">
          <el-select v-model="selectedGrade" placeholder="选择年级" @change="onGradeChange" style="width: 150px;">
            <el-option v-for="g in gradeList" :key="g" :label="g" :value="g" />
          </el-select>
          <el-select v-model="selectedClass" placeholder="选择班级" :disabled="!selectedGrade" style="width: 150px;">
            <el-option v-for="c in classList" :key="c" :label="c" :value="c" />
          </el-select>
          <el-button type="primary" :disabled="!selectedClass" @click="loadStatistics">查询</el-button>
        </div>
      </div>

      <div class="pc-content" v-loading="loading">
        <template v-if="statistics">
          <!-- Stats Cards -->
          <el-row :gutter="20" class="stats-row">
            <el-col :span="6">
              <el-card shadow="hover" class="stat-card">
                <div class="stat-icon exams">
                  <el-icon><Document /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ statistics.examCount || 0 }}</div>
                  <div class="stat-label">考试次数</div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="hover" class="stat-card">
                <div class="stat-icon submits">
                  <el-icon><Edit /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ statistics.submitCount || 0 }}</div>
                  <div class="stat-label">提交人次</div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="hover" class="stat-card">
                <div class="stat-icon students">
                  <el-icon><User /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ statistics.studentCount || 0 }}</div>
                  <div class="stat-label">参与学生</div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="hover" class="stat-card highlight">
                <div class="stat-icon avg">
                  <el-icon><TrendCharts /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ statistics.avgScore ? statistics.avgScore.toFixed(1) : '-' }}</div>
                  <div class="stat-label">平均分</div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- Score Range and Charts -->
          <el-row :gutter="20" class="charts-row">
            <el-col :span="12">
              <el-card shadow="hover" class="chart-card">
                <template #header>
                  <div class="card-header">
                    <span>分数分布</span>
                  </div>
                </template>
                <div class="distribution-chart">
                  <div class="dist-item" v-for="(item, index) in distributionData" :key="index">
                    <div class="dist-label">
                      <span class="label-text">{{ item.label }}</span>
                      <span class="label-count">{{ item.count }}人</span>
                    </div>
                    <el-progress
                      :percentage="item.percentage"
                      :color="item.color"
                      :stroke-width="20"
                    />
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="hover" class="chart-card">
                <template #header>
                  <div class="card-header">
                    <span>成绩概览</span>
                  </div>
                </template>
                <div class="score-overview">
                  <div class="overview-item">
                    <div class="overview-label">最高分</div>
                    <div class="overview-value good">{{ statistics.maxScore || '-' }}</div>
                  </div>
                  <div class="overview-item">
                    <div class="overview-label">最低分</div>
                    <div class="overview-value bad">{{ statistics.minScore || '-' }}</div>
                  </div>
                  <div class="overview-item">
                    <div class="overview-label">优秀率</div>
                    <div class="overview-value">{{ getExcellentRate }}%</div>
                  </div>
                  <div class="overview-item">
                    <div class="overview-label">及格率</div>
                    <div class="overview-value">{{ getPassRate }}%</div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- Exam Records Table -->
          <el-card shadow="hover" class="table-card">
            <template #header>
              <div class="card-header">
                <span>考试记录</span>
                <el-input
                  v-model="searchExam"
                  placeholder="搜索考试"
                  style="width: 200px;"
                  clearable
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </div>
            </template>
            <el-table :data="filteredExamList" style="width: 100%" @row-click="showExamStats">
              <el-table-column prop="title" label="考试名称" min-width="200">
                <template #default="{ row }">
                  <span class="exam-title-link">{{ row.title }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="subject" label="科目" width="100" />
              <el-table-column prop="submitCount" label="参考人数" width="100" align="center" />
              <el-table-column prop="avgScore" label="平均分" width="100" align="center">
                <template #default="{ row }">
                  <span :class="getScoreClass(row.avgScore)">{{ row.avgScore ? row.avgScore.toFixed(1) : '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="maxScore" label="最高分" width="100" align="center">
                <template #default="{ row }">
                  <span class="score-good">{{ row.maxScore || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="minScore" label="最低分" width="100" align="center">
                <template #default="{ row }">
                  <span class="score-bad">{{ row.minScore || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" align="center">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click.stop="showExamStats(row)">详情</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </template>

        <el-empty v-else-if="!loading" description="请选择班级查看统计数据" />
      </div>

      <!-- Exam Detail Dialog -->
      <el-dialog v-model="showExamDetail" :title="currentExam?.title" width="700px">
        <div class="dialog-content" v-if="currentExam">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="科目">{{ currentExam.subject }}</el-descriptions-item>
            <el-descriptions-item label="总分">{{ currentExam.totalScore }}分</el-descriptions-item>
            <el-descriptions-item label="参考人数">{{ currentExam.submitCount }}人</el-descriptions-item>
            <el-descriptions-item label="平均分">
              <span class="highlight-text">{{ currentExam.avgScore ? currentExam.avgScore.toFixed(1) : '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="最高分">
              <span class="score-good">{{ currentExam.maxScore || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="最低分">
              <span class="score-bad">{{ currentExam.minScore || '-' }}</span>
            </el-descriptions-item>
          </el-descriptions>

          <div class="student-ranking-section">
            <h4>成绩排名</h4>
            <el-table :data="examStudents" max-height="400">
              <el-table-column label="排名" width="80" align="center">
                <template #default="{ $index }">
                  <div class="rank-badge" :class="getRankClass($index)">{{ $index + 1 }}</div>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="学生姓名" />
              <el-table-column prop="score" label="分数" width="100" align="center">
                <template #default="{ row }">
                  <span :class="getScoreClass(row.score)">{{ row.score }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-dialog>
    </div>

    <!-- Mobile Version -->
    <div v-else>
      <van-nav-bar title="数据统计" left-arrow @click-left="$router.back()" />
      <div class="page-content">
        <!-- 班级选择 -->
        <div class="filter-section">
          <van-button
            size="small"
            :type="selectedGrade ? 'primary' : 'default'"
            @click="showGradePicker = true"
          >
            {{ selectedGrade || '选择年级' }}
            <van-icon name="arrow-down" />
          </van-button>
          <van-button
            size="small"
            :type="selectedClass ? 'primary' : 'default'"
            @click="openClassPicker"
            :disabled="!selectedGrade"
          >
            {{ selectedClass || '选择班级' }}
            <van-icon name="arrow-down" />
          </van-button>
          <van-button
            size="small"
            type="primary"
            @click="loadStatistics"
            :disabled="!selectedClass"
          >
            查询
          </van-button>
        </div>

        <!-- 年级选择弹窗 -->
        <van-popup v-model:show="showGradePicker" position="bottom" round>
          <van-picker
            :columns="gradeOptions"
            @confirm="onGradeConfirm"
            @cancel="showGradePicker = false"
          />
        </van-popup>

        <!-- 班级选择弹窗 -->
        <van-popup v-model:show="showClassPicker" position="bottom" round>
          <van-picker
            :columns="classOptions"
            @confirm="onClassConfirm"
            @cancel="showClassPicker = false"
          />
        </van-popup>

        <!-- 加载状态 -->
        <van-loading v-if="loading" class="loading-center" size="24px">加载中...</van-loading>

        <!-- 统计内容 -->
        <template v-else-if="statistics">
          <!-- 考试概览 -->
          <div class="stats-card card">
            <div class="card-title">考试概览</div>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">{{ statistics.examCount || 0 }}</div>
                <div class="stat-label">考试次数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ statistics.submitCount || 0 }}</div>
                <div class="stat-label">提交人次</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ statistics.studentCount || 0 }}</div>
                <div class="stat-label">参与学生</div>
              </div>
            </div>
          </div>

          <!-- 成绩分析 -->
          <div class="stats-card card">
            <div class="card-title">成绩分析</div>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value highlight">{{ statistics.avgScore ? statistics.avgScore.toFixed(1) : '-' }}</div>
                <div class="stat-label">平均分</div>
              </div>
              <div class="stat-item">
                <div class="stat-value good">{{ statistics.maxScore || '-' }}</div>
                <div class="stat-label">最高分</div>
              </div>
              <div class="stat-item">
                <div class="stat-value bad">{{ statistics.minScore || '-' }}</div>
                <div class="stat-label">最低分</div>
              </div>
            </div>
          </div>

          <!-- 分数分布 -->
          <div class="stats-card card">
            <div class="card-title">分数分布</div>
            <div class="distribution-list">
              <div class="distribution-item">
                <span class="dist-label">优秀 (90-100)</span>
                <div class="dist-bar-wrapper">
                  <div class="dist-bar excellent" :style="{ width: getPercentage(statistics.excellentCount, statistics.totalScores) }"></div>
                </div>
                <span class="dist-count">{{ statistics.excellentCount || 0 }}人</span>
              </div>
              <div class="distribution-item">
                <span class="dist-label">良好 (80-89)</span>
                <div class="dist-bar-wrapper">
                  <div class="dist-bar good" :style="{ width: getPercentage(statistics.goodCount, statistics.totalScores) }"></div>
                </div>
                <span class="dist-count">{{ statistics.goodCount || 0 }}人</span>
              </div>
              <div class="distribution-item">
                <span class="dist-label">中等 (70-79)</span>
                <div class="dist-bar-wrapper">
                  <div class="dist-bar medium" :style="{ width: getPercentage(statistics.mediumCount, statistics.totalScores) }"></div>
                </div>
                <span class="dist-count">{{ statistics.mediumCount || 0 }}人</span>
              </div>
              <div class="distribution-item">
                <span class="dist-label">及格 (60-69)</span>
                <div class="dist-bar-wrapper">
                  <div class="dist-bar pass" :style="{ width: getPercentage(statistics.passCount, statistics.totalScores) }"></div>
                </div>
                <span class="dist-count">{{ statistics.passCount || 0 }}人</span>
              </div>
              <div class="distribution-item">
                <span class="dist-label">不及格 (<60)</span>
                <div class="dist-bar-wrapper">
                  <div class="dist-bar fail" :style="{ width: getPercentage(statistics.failCount, statistics.totalScores) }"></div>
                </div>
                <span class="dist-count">{{ statistics.failCount || 0 }}人</span>
              </div>
            </div>
          </div>

          <!-- 考试列表 -->
          <div class="stats-card card">
            <div class="card-title">考试记录</div>
            <div v-if="examList.length === 0" class="empty-tip">暂无考试记录</div>
            <div v-else class="exam-list">
              <div v-for="exam in examList" :key="exam.id" class="exam-item" @click="showExamStats(exam)">
                <div class="exam-info">
                  <span class="exam-title">{{ exam.title }}</span>
                  <span class="exam-subject">{{ exam.subject }}</span>
                </div>
                <div class="exam-stats">
                  <span>平均分: {{ exam.avgScore ? exam.avgScore.toFixed(1) : '-' }}</span>
                  <span>参考人数: {{ exam.submitCount || 0 }}</span>
                </div>
                <van-icon name="arrow" class="arrow-icon" />
              </div>
            </div>
          </div>
        </template>

        <!-- 空状态 -->
        <van-empty v-else-if="!loading" description="请选择班级查看统计数据" />
      </div>

      <!-- 考试详情弹窗 -->
      <van-popup v-model:show="showExamDetail" position="bottom" round style="height: 70%">
        <div class="detail-popup" v-if="currentExam">
          <div class="popup-header">
            <span class="close-btn" @click="showExamDetail = false">关闭</span>
            <span class="popup-title">{{ currentExam.title }}</span>
            <span></span>
          </div>
          <div class="detail-content">
            <div class="detail-stats">
              <div class="detail-row">
                <span class="label">科目</span>
                <span class="value">{{ currentExam.subject }}</span>
              </div>
              <div class="detail-row">
                <span class="label">总分</span>
                <span class="value">{{ currentExam.totalScore }}分</span>
              </div>
              <div class="detail-row">
                <span class="label">参考人数</span>
                <span class="value">{{ currentExam.submitCount }}人</span>
              </div>
              <div class="detail-row">
                <span class="label">平均分</span>
                <span class="value highlight">{{ currentExam.avgScore ? currentExam.avgScore.toFixed(1) : '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">最高分</span>
                <span class="value good">{{ currentExam.maxScore || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">最低分</span>
                <span class="value bad">{{ currentExam.minScore || '-' }}</span>
              </div>
            </div>
            <div class="student-ranking">
              <div class="ranking-title">成绩排名</div>
              <div class="ranking-list">
                <div v-for="(student, idx) in examStudents" :key="student.id" class="ranking-item">
                  <span class="rank" :class="getRankClass(idx)">{{ idx + 1 }}</span>
                  <span class="name">{{ student.name }}</span>
                  <span class="score">{{ student.score }}分</span>
                </div>
                <div v-if="examStudents.length === 0" class="empty-tip">暂无数据</div>
              </div>
            </div>
          </div>
        </div>
      </van-popup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { showFailToast } from 'vant';
import { useDevice } from '@/composables/useDevice';
import { Document, Edit, User, TrendCharts, Search } from '@element-plus/icons-vue';
import api from '@/api/index';

const { isPC } = useDevice();

// 筛选状态
const selectedGrade = ref('');
const selectedClass = ref('');
const showGradePicker = ref(false);
const showClassPicker = ref(false);

// 数据
const loading = ref(false);
const statistics = ref(null);
const examList = ref([]);
const classList = ref([]);

// 考试详情
const showExamDetail = ref(false);
const currentExam = ref(null);
const examStudents = ref([]);

// 搜索
const searchExam = ref('');

// 年级选项（动态加载）
const gradeList = ref([]);
const gradeOptions = computed(() =>
  gradeList.value.map(g => ({ text: g, value: g }))
);

// 班级选项
const classOptions = computed(() => {
  return classList.value.map(c => ({ text: c, value: c }));
});

// PC端分数分布数据
const distributionData = computed(() => {
  if (!statistics.value) return [];
  const s = statistics.value;
  const total = s.totalScores || 1;
  return [
    { label: '优秀 (90-100)', count: s.excellentCount || 0, percentage: ((s.excellentCount || 0) / total * 100), color: 'var(--color-success)' },
    { label: '良好 (80-89)', count: s.goodCount || 0, percentage: ((s.goodCount || 0) / total * 100), color: 'var(--color-primary)' },
    { label: '中等 (70-79)', count: s.mediumCount || 0, percentage: ((s.mediumCount || 0) / total * 100), color: 'var(--color-warning)' },
    { label: '及格 (60-69)', count: s.passCount || 0, percentage: ((s.passCount || 0) / total * 100), color: '#ffd21e' },
    { label: '不及格 (<60)', count: s.failCount || 0, percentage: ((s.failCount || 0) / total * 100), color: 'var(--color-danger)' }
  ];
});

// 优秀率
const getExcellentRate = computed(() => {
  if (!statistics.value || !statistics.value.totalScores) return 0;
  return ((statistics.value.excellentCount || 0) / statistics.value.totalScores * 100).toFixed(1);
});

// 及格率
const getPassRate = computed(() => {
  if (!statistics.value || !statistics.value.totalScores) return 0;
  const pass = (statistics.value.excellentCount || 0) + (statistics.value.goodCount || 0) +
                (statistics.value.mediumCount || 0) + (statistics.value.passCount || 0);
  return (pass / statistics.value.totalScores * 100).toFixed(1);
});

// 过滤考试列表
const filteredExamList = computed(() => {
  if (!searchExam.value) return examList.value;
  return examList.value.filter(e =>
    e.title.includes(searchExam.value) || e.subject.includes(searchExam.value)
  );
});

// 加载年级列表
async function loadGrades() {
  try {
    const res = await api.get('/students/grades');
    if (res.code === 0) {
      gradeList.value = res.data || [];
    }
  } catch (err) {
    console.error('加载年级列表失败:', err);
  }
}

// 加载班级列表
async function loadClasses() {
  if (!selectedGrade.value) return;
  try {
    const res = await api.get('/students/classes', {
      params: { grade: selectedGrade.value }
    });
    if (res.code === 0) {
      classList.value = res.data || [];
    }
  } catch (err) {
    console.error('加载班级列表失败:', err);
    classList.value = [];
  }
}

// PC端年级变更
function onGradeChange() {
  selectedClass.value = '';
  classList.value = [];
  loadClasses();
}

// 年级选择确认
function onGradeConfirm({ selectedOptions }) {
  selectedGrade.value = selectedOptions[0]?.value || '';
  selectedClass.value = '';
  classList.value = [];
  showGradePicker.value = false;
  loadClasses();
}

// 班级选择确认
function onClassConfirm({ selectedOptions }) {
  selectedClass.value = selectedOptions[0]?.value || '';
  showClassPicker.value = false;
}

// 打开班级选择器
function openClassPicker() {
  if (classList.value.length === 0) {
    loadClasses();
  }
  showClassPicker.value = true;
}

// 加载统计数据
async function loadStatistics() {
  if (!selectedClass.value) return;

  loading.value = true;
  try {
    const res = await api.get('/statistics/class', {
      params: {
        grade: selectedGrade.value,
        className: selectedClass.value
      }
    });

    if (res.code === 0) {
      statistics.value = res.data.summary || null;
      examList.value = res.data.exams || [];
    } else {
      showFailToast(res.message || '加载统计数据失败');
    }
  } catch (err) {
    console.error('加载统计数据失败:', err);
    showFailToast(err.message || '加载统计数据失败');
  } finally {
    loading.value = false;
  }
}

// 显示考试详情
async function showExamStats(exam) {
  currentExam.value = exam;
  showExamDetail.value = true;

  try {
    const res = await api.get(`/statistics/exam/${exam.id}/students`, {
      params: {
        grade: selectedGrade.value,
        className: selectedClass.value
      }
    });
    if (res.code === 0) {
      examStudents.value = res.data || [];
    }
  } catch (err) {
    console.error('加载学生成绩失败:', err);
    examStudents.value = [];
  }
}

// 计算百分比
function getPercentage(count, total) {
  if (!total || total === 0) return '0%';
  return `${(count / total * 100).toFixed(1)}%`;
}

// 获取排名样式
function getRankClass(idx) {
  if (idx === 0) return 'first';
  if (idx === 1) return 'second';
  if (idx === 2) return 'third';
  return '';
}

// 获取分数样式类
function getScoreClass(score) {
  if (score >= 90) return 'score-excellent';
  if (score >= 80) return 'score-good';
  if (score >= 70) return 'score-medium';
  if (score >= 60) return 'score-pass';
  return 'score-fail';
}

onMounted(() => {
  loadGrades();
});
</script>

<style scoped>
/* ========== PC Styles ========== */
.statistics-pc {
  min-height: 100vh;
  background: var(--bg-color);
  padding: 20px;
}

.pc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.pc-header h2 {
  margin: 0;
  font-size: 24px;
  color: var(--text-color-primary);
}

.filter-bar {
  display: flex;
  gap: 12px;
}

.pc-content {
  min-height: 400px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-card .stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: var(--fill-color-blank);
  margin-right: 16px;
}

.stat-icon.exams {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.stat-icon.submits {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.stat-icon.students {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
}

.stat-icon.avg {
  background: linear-gradient(135deg, #43e97b, #38f9d7);
}

.stat-card .stat-info {
  flex: 1;
}

.stat-card .stat-value {
  font-size: 32px;
  font-weight: bold;
  color: var(--text-color-primary);
  line-height: 1.2;
}

.stat-card .stat-label {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin-top: 4px;
}

.stat-card.highlight {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
}

.stat-card.highlight .stat-value,
.stat-card.highlight .stat-label {
  color: var(--fill-color-blank);
}

.charts-row {
  margin-bottom: 20px;
}

.chart-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  font-size: 16px;
}

.distribution-chart {
  padding: 10px 0;
}

.dist-item {
  margin-bottom: 16px;
}

.dist-item:last-child {
  margin-bottom: 0;
}

.dist-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.label-text {
  color: var(--text-color-regular);
}

.label-count {
  color: var(--text-color-secondary);
}

.score-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  padding: 20px 0;
}

.overview-item {
  text-align: center;
  padding: 20px;
  background: var(--bg-color);
  border-radius: 8px;
}

.overview-label {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin-bottom: 8px;
}

.overview-value {
  font-size: 28px;
  font-weight: bold;
  color: var(--text-color-primary);
}

.overview-value.good {
  color: var(--color-success);
}

.overview-value.bad {
  color: var(--color-danger);
}

.table-card {
  margin-bottom: 20px;
}

.exam-title-link {
  color: var(--color-primary);
  cursor: pointer;
}

.exam-title-link:hover {
  text-decoration: underline;
}

.score-excellent {
  color: var(--color-success);
  font-weight: bold;
}

.score-good {
  color: var(--color-primary);
  font-weight: bold;
}

.score-medium {
  color: var(--color-warning);
}

.score-pass {
  color: var(--text-color-secondary);
}

.score-fail {
  color: var(--color-danger);
}

/* Dialog Styles */
.dialog-content {
  padding: 10px 0;
}

.highlight-text {
  color: var(--color-primary);
  font-weight: bold;
}

.student-ranking-section {
  margin-top: 24px;
}

.student-ranking-section h4 {
  margin: 0 0 16px 0;
  color: var(--text-color-primary);
  font-size: 16px;
}

.rank-badge {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  background: var(--bg-color);
  color: var(--text-color-secondary);
}

.rank-badge.first {
  background: linear-gradient(135deg, #ffd700, #ffb347);
  color: var(--fill-color-blank);
}

.rank-badge.second {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
  color: var(--fill-color-blank);
}

.rank-badge.third {
  background: linear-gradient(135deg, #cd7f32, #b8860b);
  color: var(--fill-color-blank);
}

/* ========== Mobile Styles ========== */
.page-content {
  padding: 12px;
  padding-bottom: 20px;
}

.filter-section {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--fill-color-blank);
  margin-bottom: 12px;
  border-radius: 8px;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.card {
  background: var(--fill-color-blank);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color-primary);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-color-primary);
}

.stat-value.highlight {
  color: var(--color-primary);
}

.stat-value.good {
  color: var(--color-success);
}

.stat-value.bad {
  color: var(--color-danger);
}

.stat-label {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 4px;
}

/* 分数分布 */
.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.distribution-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dist-label {
  width: 80px;
  font-size: 13px;
  color: var(--text-color-regular);
}

.dist-bar-wrapper {
  flex: 1;
  height: 8px;
  background: var(--bg-color);
  border-radius: 4px;
  overflow: hidden;
}

.dist-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.dist-bar.excellent {
  background: var(--color-success);
}

.dist-bar.good {
  background: var(--color-primary);
}

.dist-bar.medium {
  background: var(--color-warning);
}

.dist-bar.pass {
  background: #ffd21e;
}

.dist-bar.fail {
  background: var(--color-danger);
}

.dist-count {
  width: 40px;
  font-size: 12px;
  color: var(--text-color-secondary);
  text-align: right;
}

/* 考试列表 */
.exam-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exam-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--bg-color);
  border-radius: 8px;
}

.exam-info {
  flex: 1;
}

.exam-title {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-primary);
  margin-bottom: 4px;
}

.exam-subject {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.exam-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--text-color-regular);
  margin-right: 8px;
  text-align: right;
}

.arrow-icon {
  color: var(--text-color-secondary);
}

.empty-tip {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 20px;
  font-size: 14px;
}

/* 详情弹窗 */
.detail-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.close-btn {
  color: var(--text-color-secondary);
}

.popup-title {
  font-size: 16px;
  font-weight: 500;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.detail-stats {
  background: var(--bg-color);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color-lighter);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  color: var(--text-color-regular);
}

.detail-row .value {
  font-weight: 500;
}

.detail-row .value.highlight {
  color: var(--color-primary);
}

.detail-row .value.good {
  color: var(--color-success);
}

.detail-row .value.bad {
  color: var(--color-danger);
}

.ranking-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
}

.ranking-list {
  max-height: 300px;
  overflow-y: auto;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color-lighter);
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: var(--text-color-secondary);
  margin-right: 12px;
}

.rank.first {
  background: #ffd21e;
  color: var(--fill-color-blank);
  border-radius: 50%;
}

.rank.second {
  background: #c0c0c0;
  color: var(--fill-color-blank);
  border-radius: 50%;
}

.rank.third {
  background: #cd7f32;
  color: var(--fill-color-blank);
  border-radius: 50%;
}

.name {
  flex: 1;
  font-size: 14px;
}

.score {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-primary);
}
</style>
