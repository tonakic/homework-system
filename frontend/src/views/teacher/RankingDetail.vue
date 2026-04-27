<template>
  <div class="page">
    <!-- PC Version -->
    <div v-if="isPC" class="ranking-pc">
      <div class="pc-header">
        <h2>排行榜</h2>
        <el-button @click="$router.push('/teacher/home')">
          <el-icon><ArrowLeft /></el-icon>
          返回首页
        </el-button>
      </div>

      <div class="pc-content">
        <!-- Exam Selection -->
        <el-card v-if="!selectedExam" shadow="hover" class="selection-card">
          <template #header>
            <div class="card-header">
              <span>选择考试</span>
              <el-input
                v-model="searchExamText"
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
          <el-table
            :data="filteredExams"
            style="width: 100%"
            v-loading="loading"
            @row-click="selectExam"
            highlight-current-row
          >
            <el-table-column prop="title" label="考试名称" min-width="200">
              <template #default="{ row }">
                <span class="exam-link">{{ row.title }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="subject" label="科目" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === '已完成' ? 'success' : 'warning'" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="submittedCount" label="已提交" width="100" align="center">
              <template #default="{ row }">
                <span class="submit-count">{{ row.submittedCount || 0 }}人</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default>
                <el-button type="primary" link size="small">查看排名</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- Ranking Detail -->
        <template v-else>
          <div class="detail-header">
            <el-button @click="selectedExam = null">
              <el-icon><ArrowLeft /></el-icon>
              返回列表
            </el-button>
            <h3>{{ selectedExam.title }}</h3>
          </div>

          <el-row :gutter="20">
            <el-col :span="16">
              <el-card shadow="hover" class="ranking-card">
                <template #header>
                  <div class="card-header">
                    <span>{{ activeTab === 'class' ? '班级排名' : '年级排名' }}</span>
                    <div class="header-controls">
                      <el-select v-model="selectedClass" placeholder="选择班级" clearable style="width: 150px;" @change="onClassChange">
                        <el-option label="全部班级" value="" />
                        <el-option v-for="c in availableClasses" :key="c" :label="c" :value="c" />
                      </el-select>
                      <el-radio-group v-model="activeTab" @change="switchTab">
                        <el-radio-button value="class">班级排名</el-radio-button>
                        <el-radio-button value="grade">年级排名</el-radio-button>
                      </el-radio-group>
                    </div>
                  </div>
                </template>

                <el-table
                  :data="currentRanking"
                  style="width: 100%"
                  v-loading="rankingLoading"
                  :row-class-name="getRowClass"
                >
                  <el-table-column label="排名" width="80" align="center">
                    <template #default="{ row }">
                      <div class="rank-badge" :class="getRankClass(row.rank)">
                        <el-icon v-if="row.rank === 1"><Trophy /></el-icon>
                        <span v-else>{{ row.rank }}</span>
                      </div>
                    </template>
                  </el-table-column>

                  <!-- Class Ranking Columns -->
                  <template v-if="activeTab === 'class'">
                    <el-table-column prop="studentName" label="学生姓名" min-width="120" />
                    <el-table-column prop="className" label="班级" width="150" />
                    <el-table-column prop="score" label="分数" width="100" align="center">
                      <template #default="{ row }">
                        <span class="score-value" :class="getScoreClass(row.score)">{{ row.score }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="timeUsed" label="用时" width="120" align="center">
                      <template #default="{ row }">
                        <span class="time-value">{{ formatTime(row.timeUsed) }}</span>
                      </template>
                    </el-table-column>
                  </template>

                  <!-- Grade Ranking Columns -->
                  <template v-else>
                    <el-table-column prop="className" label="班级" min-width="150" />
                    <el-table-column prop="studentCount" label="参考人数" width="120" align="center">
                      <template #default="{ row }">
                        <span>{{ row.studentCount }}人</span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="avgScore" label="平均分" width="120" align="center">
                      <template #default="{ row }">
                        <span class="score-value" :class="getScoreClass(row.avgScore)">{{ row.avgScore }}</span>
                      </template>
                    </el-table-column>
                  </template>
                </el-table>
              </el-card>
            </el-col>

            <el-col :span="8">
              <!-- Top Performers -->
              <el-card shadow="hover" class="top-performers-card">
                <template #header>
                  <div class="card-header">
                    <span>{{ activeTab === 'class' ? '成绩榜' : '班级榜' }}</span>
                  </div>
                </template>
                <div class="top-performers" v-if="topPerformers.length > 0">
                  <div
                    v-for="(performer, index) in topPerformers"
                    :key="index"
                    class="performer-item"
                    :class="'rank-' + (index + 1)"
                  >
                    <div class="performer-rank">
                      <el-icon v-if="index === 0" class="trophy gold"><Trophy /></el-icon>
                      <el-icon v-else-if="index === 1" class="trophy silver"><Trophy /></el-icon>
                      <el-icon v-else-if="index === 2" class="trophy bronze"><Trophy /></el-icon>
                      <span v-else>{{ index + 1 }}</span>
                    </div>
                    <div class="performer-info">
                      <div class="performer-name">
                        {{ activeTab === 'class' ? performer.studentName : performer.className }}
                      </div>
                      <div class="performer-detail" v-if="activeTab === 'class'">
                        {{ performer.className }}
                      </div>
                    </div>
                    <div class="performer-score">
                      <span class="score">{{ activeTab === 'class' ? performer.score : performer.avgScore }}</span>
                      <span class="unit">{{ activeTab === 'class' ? '分' : '分' }}</span>
                    </div>
                  </div>
                </div>
                <el-empty v-else description="暂无排名数据" :image-size="80" />
              </el-card>

              <!-- Stats Summary -->
              <el-card shadow="hover" class="stats-summary-card">
                <template #header>
                  <div class="card-header">
                    <span>统计概览</span>
                  </div>
                </template>
                <div class="stats-summary">
                  <div class="summary-item">
                    <span class="label">参与{{ activeTab === 'class' ? '学生' : '班级' }}</span>
                    <span class="value">{{ currentRanking.length }}{{ activeTab === 'class' ? '人' : '个' }}</span>
                  </div>
                  <div class="summary-item" v-if="activeTab === 'class' && classRanking.length > 0">
                    <span class="label">最高分</span>
                    <span class="value good">{{ Math.max(...classRanking.map(r => r.score)) }}</span>
                  </div>
                  <div class="summary-item" v-if="activeTab === 'class' && classRanking.length > 0">
                    <span class="label">最低分</span>
                    <span class="value bad">{{ Math.min(...classRanking.map(r => r.score)) }}</span>
                  </div>
                  <div class="summary-item" v-if="activeTab === 'class' && classRanking.length > 0">
                    <span class="label">平均分</span>
                    <span class="value">{{ (classRanking.reduce((sum, r) => sum + r.score, 0) / classRanking.length).toFixed(1) }}</span>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </template>
      </div>
    </div>

    <!-- Mobile Version -->
    <div v-else>
      <van-nav-bar title="排行榜" left-arrow @click-left="$router.push('/teacher/home')" />

      <div class="page-content">
        <!-- 考试列表 -->
        <div v-if="!selectedExam" class="exam-list">
          <van-loading v-if="loading" class="loading-center" />
          <van-empty v-else-if="exams.length === 0" description="暂无已完成的考试" />

          <div v-for="exam in exams" :key="exam.id" class="exam-item" @click="selectExam(exam)">
            <div class="exam-info">
              <div class="exam-title">{{ exam.title }}</div>
              <div class="exam-meta">
                <span class="subject">{{ exam.subject }}</span>
                <span class="status">{{ exam.status }}</span>
              </div>
            </div>
            <div class="exam-stats">
              <div class="stat-item">
                <span class="stat-value">{{ exam.submittedCount || 0 }}</span>
                <span class="stat-label">已提交</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 排名详情 -->
        <div v-else class="ranking-detail">
          <div class="exam-header">
            <van-icon name="arrow-left" @click="selectedExam = null" />
            <span>{{ selectedExam.title }}</span>
          </div>

          <!-- 班级选择 -->
          <div class="class-selector">
            <van-dropdown-menu>
              <van-dropdown-item v-model="selectedClass" :options="classOptions" @change="onClassChange" />
            </van-dropdown-menu>
          </div>

          <!-- 切换按钮 -->
          <div class="switch-buttons">
            <van-button
              :type="activeTab === 'class' ? 'primary' : 'default'"
              size="small"
              @click="switchTab('class')"
            >
              班级排名
            </van-button>
            <van-button
              :type="activeTab === 'grade' ? 'primary' : 'default'"
              size="small"
              @click="switchTab('grade')"
            >
              年级排名
            </van-button>
          </div>

          <!-- 加载状态 -->
          <van-loading v-if="rankingLoading" class="loading-center" />

          <!-- 班级排名列表 -->
          <div v-else-if="activeTab === 'class'" class="ranking-list">
            <van-empty v-if="classRanking.length === 0" description="暂无排名数据（等待批改完成）" />

            <div v-for="item in classRanking" :key="item.studentId" class="ranking-item">
              <div class="rank-badge" :class="getRankClass(item.rank)">
                {{ item.rank }}
              </div>
              <div class="student-info">
                <div class="student-name">{{ item.studentName }}</div>
                <div class="student-class">{{ item.className }}</div>
              </div>
              <div class="score-info">
                <div class="score">{{ item.score }}分</div>
                <div class="time-used">用时: {{ formatTime(item.timeUsed) }}</div>
              </div>
            </div>
          </div>

          <!-- 年级排名列表 -->
          <div v-else class="ranking-list">
            <van-empty v-if="gradeRanking.length === 0" description="暂无排名数据（等待批改完成）" />

            <div v-for="item in gradeRanking" :key="item.className" class="ranking-item">
              <div class="rank-badge" :class="getRankClass(item.rank)">
                {{ item.rank }}
              </div>
              <div class="class-info">
                <div class="class-name">{{ item.className }}</div>
                <div class="student-count">{{ item.studentCount }}人参考</div>
              </div>
              <div class="score-info">
                <div class="score">{{ item.avgScore }}分</div>
                <div class="avg-label">平均分</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { showToast } from 'vant';
import { useDevice } from '@/composables/useDevice';
import { ArrowLeft, Search, Trophy } from '@element-plus/icons-vue';
import { getRankingExams, getClassRanking, getGradeRanking } from '@/api/exams';

const { isPC } = useDevice();

const loading = ref(false);
const exams = ref([]);
const selectedExam = ref(null);
const activeTab = ref('class');
const rankingLoading = ref(false);
const classRanking = ref([]);
const gradeRanking = ref([]);
const selectedClass = ref('');
const availableClasses = ref([]);

// PC search
const searchExamText = ref('');

const classOptions = computed(() => {
  const options = [{ text: '全部班级', value: '' }];
  availableClasses.value.forEach(c => {
    options.push({ text: c, value: c });
  });
  return options;
});

// PC filtered exams
const filteredExams = computed(() => {
  if (!searchExamText.value) return exams.value;
  return exams.value.filter(e =>
    e.title.includes(searchExamText.value) ||
    e.subject.includes(searchExamText.value)
  );
});

// PC current ranking data
const currentRanking = computed(() => {
  return activeTab.value === 'class' ? classRanking.value : gradeRanking.value;
});

// PC top performers (top 5)
const topPerformers = computed(() => {
  return currentRanking.value.slice(0, 5);
});

const loadExams = async () => {
  loading.value = true;
  try {
    const res = await getRankingExams();
    exams.value = res.data || [];
    // 收集所有班级
    const classSet = new Set();
    exams.value.forEach(exam => {
      if (exam.targetClasses) {
        exam.targetClasses.forEach(c => classSet.add(c));
      }
    });
    availableClasses.value = Array.from(classSet);
  } catch (err) {
    showToast('加载失败');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const selectExam = (exam) => {
  selectedExam.value = exam;
  loadClassRanking();
};

const switchTab = (tab) => {
  activeTab.value = tab;
  if (tab === 'class') {
    loadClassRanking();
  } else {
    loadGradeRanking();
  }
};

const onClassChange = () => {
  if (activeTab.value === 'class') {
    loadClassRanking();
  } else {
    loadGradeRanking();
  }
};

const loadClassRanking = async () => {
  rankingLoading.value = true;
  try {
    const res = await getClassRanking(selectedExam.value.id, selectedClass.value);
    classRanking.value = res.data?.ranking || [];
  } catch (err) {
    showToast('加载失败');
    console.error(err);
  } finally {
    rankingLoading.value = false;
  }
};

const loadGradeRanking = async () => {
  rankingLoading.value = true;
  try {
    const res = await getGradeRanking(selectedExam.value.id);
    gradeRanking.value = res.data?.ranking || [];
  } catch (err) {
    showToast('加载失败');
    console.error(err);
  } finally {
    rankingLoading.value = false;
  }
};

const getRankClass = (rank) => {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return '';
};

const formatTime = (seconds) => {
  if (!seconds) return '--';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}分${secs}秒`;
};

// PC methods
const getRowClass = ({ row }) => {
  if (row.rank === 1) return 'top-rank-row';
  if (row.rank === 2) return 'second-rank-row';
  if (row.rank === 3) return 'third-rank-row';
  return '';
};

const getScoreClass = (score) => {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'medium';
  if (score >= 60) return 'pass';
  return 'fail';
};

onMounted(() => {
  loadExams();
});
</script>

<style scoped>
/* ========== PC Styles ========== */
.ranking-pc {
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

.pc-content {
  min-height: 400px;
}

.selection-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  font-size: 16px;
}

.exam-link {
  color: var(--color-primary);
  cursor: pointer;
}

.exam-link:hover {
  text-decoration: underline;
}

.submit-count {
  font-weight: bold;
  color: var(--color-primary);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.detail-header h3 {
  margin: 0;
  font-size: 20px;
  color: var(--text-color-primary);
}

.ranking-card {
  min-height: 400px;
}

.header-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.rank-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  background: var(--bg-color);
  color: var(--text-color-secondary);
}

.rank-badge.gold {
  background: linear-gradient(135deg, #ffd700, #ffb347);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
}

.rank-badge.silver {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
  color: white;
  box-shadow: 0 2px 8px rgba(192, 192, 192, 0.4);
}

.rank-badge.bronze {
  background: linear-gradient(135deg, #cd7f32, #b8860b);
  color: white;
  box-shadow: 0 2px 8px rgba(205, 127, 50, 0.4);
}

.score-value {
  font-weight: bold;
}

.score-value.excellent {
  color: var(--color-success);
}

.score-value.good {
  color: var(--color-primary);
}

.score-value.medium {
  color: var(--color-warning);
}

.score-value.pass {
  color: var(--text-color-secondary);
}

.score-value.fail {
  color: var(--color-danger);
}

.time-value {
  color: var(--text-color-secondary);
  font-size: 13px;
}

/* Top Performers Card */
.top-performers-card {
  margin-bottom: 20px;
}

.top-performers {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.performer-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-color);
  transition: all 0.3s;
}

.performer-item.rank-1 {
  background: linear-gradient(135deg, #fff9e6, #fff3cd);
  border: 1px solid #ffd700;
}

.performer-item.rank-2 {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border: 1px solid #c0c0c0;
}

.performer-item.rank-3 {
  background: linear-gradient(135deg, #fef5f0, #fde8dd);
  border: 1px solid #cd7f32;
}

.performer-rank {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.trophy {
  font-size: 24px;
}

.trophy.gold {
  color: #ffd700;
}

.trophy.silver {
  color: #c0c0c0;
}

.trophy.bronze {
  color: #cd7f32;
}

.performer-info {
  flex: 1;
}

.performer-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.performer-detail {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 2px;
}

.performer-score {
  text-align: right;
}

.performer-score .score {
  font-size: 20px;
  font-weight: bold;
  color: var(--text-color-primary);
}

.performer-score .unit {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-left: 2px;
}

/* Stats Summary Card */
.stats-summary-card .stats-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-color);
  border-radius: 6px;
}

.summary-item .label {
  font-size: 14px;
  color: var(--text-color-regular);
}

.summary-item .value {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-color-primary);
}

.summary-item .value.good {
  color: var(--color-success);
}

.summary-item .value.bad {
  color: var(--color-danger);
}

/* Table row highlight */
:deep(.top-rank-row) {
  background-color: #fff9e6 !important;
}

:deep(.second-rank-row) {
  background-color: #f8f9fa !important;
}

:deep(.third-rank-row) {
  background-color: #fef5f0 !important;
}

/* ========== Mobile Styles ========== */
.page {
  min-height: 100vh;
  background: var(--bg-color);
}

.page-content {
  padding: 12px;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.exam-list {
  padding-bottom: 60px;
}

.exam-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--fill-color-blank);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.exam-info {
  flex: 1;
}

.exam-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color-primary);
  margin-bottom: 8px;
}

.exam-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-color-secondary);
}

.subject {
  color: var(--color-primary);
}

.exam-stats {
  text-align: right;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: var(--color-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-color-secondary);
}

/* 排名详情 */
.ranking-detail {
  padding-bottom: 60px;
}

.exam-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.exam-header .van-icon {
  font-size: 20px;
  color: var(--text-color-regular);
}

.class-selector {
  margin-bottom: 12px;
}

.switch-buttons {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  background: var(--bg-color);
}

.ranking-list {
  padding-top: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  background: var(--fill-color-blank);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.student-info, .class-info {
  flex: 1;
}

.student-name, .class-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.student-class, .student-count {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 2px;
}

.score-info {
  text-align: right;
}

.score {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-primary);
}

.time-used, .avg-label {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 2px;
}
</style>
