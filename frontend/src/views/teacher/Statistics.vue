<template>
  <div class="page">
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { showFailToast } from 'vant';
import api from '@/api/index';

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

// 年级选项
const gradeOptions = [
  { text: '一年级', value: '一年级' },
  { text: '二年级', value: '二年级' },
  { text: '三年级', value: '三年级' },
  { text: '四年级', value: '四年级' },
  { text: '五年级', value: '五年级' },
  { text: '六年级', value: '六年级' }
];

// 班级选项
const classOptions = computed(() => {
  return classList.value.map(c => ({ text: c, value: c }));
});

// 加载班级列表
async function loadClasses() {
  if (!selectedGrade.value) return;
  try {
    const res = await api.get('/teacher/classes', {
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

onMounted(() => {
  // 可选：自动加载教师管理的班级数据
});
</script>

<style scoped>
.page-content {
  padding: 12px;
  padding-bottom: 20px;
}

.filter-section {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #fff;
  margin-bottom: 12px;
  border-radius: 8px;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebedf0;
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
  color: #323233;
}

.stat-value.highlight {
  color: #1989fa;
}

.stat-value.good {
  color: #07c160;
}

.stat-value.bad {
  color: #ee0a24;
}

.stat-label {
  font-size: 12px;
  color: #969799;
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
  color: #646566;
}

.dist-bar-wrapper {
  flex: 1;
  height: 8px;
  background: #f7f8fa;
  border-radius: 4px;
  overflow: hidden;
}

.dist-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.dist-bar.excellent {
  background: #07c160;
}

.dist-bar.good {
  background: #1989fa;
}

.dist-bar.medium {
  background: #ff976a;
}

.dist-bar.pass {
  background: #ffd21e;
}

.dist-bar.fail {
  background: #ee0a24;
}

.dist-count {
  width: 40px;
  font-size: 12px;
  color: #969799;
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
  background: #f7f8fa;
  border-radius: 8px;
}

.exam-info {
  flex: 1;
}

.exam-title {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 4px;
}

.exam-subject {
  font-size: 12px;
  color: #969799;
}

.exam-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #646566;
  margin-right: 8px;
  text-align: right;
}

.arrow-icon {
  color: #969799;
}

.empty-tip {
  text-align: center;
  color: #969799;
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
  border-bottom: 1px solid #ebedf0;
}

.close-btn {
  color: #969799;
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
  background: #f7f8fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #ebedf0;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  color: #646566;
}

.detail-row .value {
  font-weight: 500;
}

.detail-row .value.highlight {
  color: #1989fa;
}

.detail-row .value.good {
  color: #07c160;
}

.detail-row .value.bad {
  color: #ee0a24;
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
  border-bottom: 1px solid #ebedf0;
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
  color: #969799;
  margin-right: 12px;
}

.rank.first {
  background: #ffd21e;
  color: white;
  border-radius: 50%;
}

.rank.second {
  background: #c0c0c0;
  color: white;
  border-radius: 50%;
}

.rank.third {
  background: #cd7f32;
  color: white;
  border-radius: 50%;
}

.name {
  flex: 1;
  font-size: 14px;
}

.score {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
}
</style>
