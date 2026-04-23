<template>
  <div class="page">
    <!-- PC Version -->
    <div v-if="isPC" class="ranking-pc">
      <div class="pc-header">
        <h2>排行榜</h2>
      </div>

      <div class="pc-content">
        <!-- 考试列表 -->
        <div v-if="!selectedExam" class="exam-table-section">
          <el-table :data="exams" v-loading="loading" style="width: 100%" @row-click="selectExam">
            <el-table-column prop="title" label="考试名称" min-width="200">
              <template #default="{ row }">
                <div class="exam-title-cell">
                  <span class="title">{{ row.title }}</span>
                  <span class="subject-tag">{{ row.subject }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="endTime" label="结束时间" width="180" />
            <el-table-column prop="myScore" label="我的成绩" width="150" align="center">
              <template #default="{ row }">
                <div class="score-cell">
                  <span class="my-score">{{ row.myScore }}</span>
                  <span class="total-score">/{{ row.totalScore }}</span>
                  <el-tag v-if="!row.isGraded" type="warning" size="small" class="grading-tag">批改中</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default>
                <el-button type="primary" link>查看排名</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && exams.length === 0" description="暂无参与的考试" />
        </div>

        <!-- 排名详情 -->
        <div v-else class="ranking-detail-section">
          <div class="detail-header">
            <el-button @click="selectedExam = null" :icon="ArrowLeft">返回</el-button>
            <h3>{{ selectedExam.title }}</h3>
          </div>

          <!-- 切换按钮 -->
          <div class="tab-buttons">
            <el-radio-group v-model="activeTab" @change="switchTab">
              <el-radio-button value="class">班级排名</el-radio-button>
              <el-radio-button value="grade">年级排名</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 班级排名表格 -->
          <el-table
            v-if="activeTab === 'class'"
            :data="classRanking"
            v-loading="rankingLoading"
            style="width: 100%"
            :row-class-name="getClassRowClass"
          >
            <el-table-column prop="rank" label="排名" width="80" align="center">
              <template #default="{ row }">
                <div class="rank-cell" :class="getRankClass(row.rank)">
                  <span v-if="row.rank <= 3" class="medal">{{ ['🥇', '🥈', '🥉'][row.rank - 1] }}</span>
                  <span v-else class="rank-num">{{ row.rank }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="studentName" label="姓名" min-width="120">
              <template #default="{ row }">
                <span>{{ row.studentName }}</span>
                <el-tag v-if="row.isMe" type="success" size="small" class="me-tag-pc">我</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="className" label="班级" min-width="150" />
            <el-table-column prop="score" label="分数" width="100" align="center">
              <template #default="{ row }">
                <span class="score-highlight">{{ row.score }}分</span>
              </template>
            </el-table-column>
            <el-table-column prop="timeUsed" label="用时" width="120" align="center">
              <template #default="{ row }">
                {{ formatTime(row.timeUsed) }}
              </template>
            </el-table-column>
          </el-table>

          <!-- 年级排名表格 -->
          <el-table
            v-if="activeTab === 'grade'"
            :data="gradeRanking"
            v-loading="rankingLoading"
            style="width: 100%"
            :row-class-name="getGradeRowClass"
          >
            <el-table-column prop="rank" label="排名" width="80" align="center">
              <template #default="{ row }">
                <div class="rank-cell" :class="getRankClass(row.rank)">
                  <span v-if="row.rank <= 3" class="medal">{{ ['🥇', '🥈', '🥉'][row.rank - 1] }}</span>
                  <span v-else class="rank-num">{{ row.rank }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="className" label="班级" min-width="150">
              <template #default="{ row }">
                <span>{{ row.className }}</span>
                <el-tag v-if="row.isMyClass" type="success" size="small" class="me-tag-pc">我的班级</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="avgScore" label="平均分" width="120" align="center">
              <template #default="{ row }">
                <span class="score-highlight">{{ row.avgScore }}分</span>
              </template>
            </el-table-column>
            <el-table-column prop="studentCount" label="参考人数" width="120" align="center">
              <template #default="{ row }">
                {{ row.studentCount }}人
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="!rankingLoading && ((activeTab === 'class' && classRanking.length === 0) || (activeTab === 'grade' && gradeRanking.length === 0))" description="暂无排名数据（等待批改完成）" />
        </div>
      </div>
    </div>

    <!-- Mobile Version -->
    <div v-else>
      <van-nav-bar title="排行榜" left-arrow @click-left="$router.push('/student/home')" />

      <div class="page-content">
        <!-- 考试列表 -->
        <div v-if="!selectedExam" class="exam-list">
          <van-empty v-if="!loading && exams.length === 0" description="暂无参与的考试" />

          <div v-for="exam in exams" :key="exam.id" class="exam-item" @click="selectExam(exam)">
            <div class="exam-info">
              <div class="exam-title">{{ exam.title }}</div>
              <div class="exam-meta">
                <span class="subject">{{ exam.subject }}</span>
                <span class="time">{{ exam.endTime }}</span>
              </div>
            </div>
            <div class="exam-score">
              <div class="score-label">我的成绩</div>
              <div class="score-value">
                <span class="score">{{ exam.myScore }}</span>
                <span class="total">/{{ exam.totalScore }}</span>
              </div>
              <div v-if="!exam.isGraded" class="grading-status">批改中</div>
            </div>
          </div>
        </div>

        <!-- 排名详情 -->
        <div v-else class="ranking-detail">
          <div class="exam-header">
            <van-icon name="arrow-left" @click="selectedExam = null" />
            <span>{{ selectedExam.title }}</span>
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

            <div v-for="item in classRanking" :key="item.studentId" class="ranking-item" :class="{ 'is-me': item.isMe }">
              <div class="rank-badge" :class="getRankClass(item.rank)">
                {{ item.rank }}
              </div>
              <div class="student-info">
                <div class="student-name">{{ item.studentName }}<span v-if="item.isMe" class="me-tag">我</span></div>
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

            <div v-for="item in gradeRanking" :key="item.className" class="ranking-item" :class="{ 'is-me': item.isMyClass }">
              <div class="rank-badge" :class="getRankClass(item.rank)">
                {{ item.rank }}
              </div>
              <div class="class-info">
                <div class="class-name">{{ item.className }}<span v-if="item.isMyClass" class="me-tag">我的班级</span></div>
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
import { ref, onMounted } from 'vue';
import { showToast } from 'vant';
import { ArrowLeft } from '@element-plus/icons-vue';
import { getStudentRankingExams, getStudentClassRanking, getStudentGradeRanking } from '@/api/exams';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();

const loading = ref(false);
const exams = ref([]);
const selectedExam = ref(null);
const activeTab = ref('class');
const rankingLoading = ref(false);
const classRanking = ref([]);
const gradeRanking = ref([]);

const loadExams = async () => {
  loading.value = true;
  try {
    const res = await getStudentRankingExams();
    exams.value = res.data || [];
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

const loadClassRanking = async () => {
  rankingLoading.value = true;
  try {
    const res = await getStudentClassRanking(selectedExam.value.id);
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
    const res = await getStudentGradeRanking(selectedExam.value.id);
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

const getClassRowClass = ({ row }) => {
  if (row.isMe) return 'highlight-row';
  if (row.rank === 1) return 'gold-row';
  if (row.rank === 2) return 'silver-row';
  if (row.rank === 3) return 'bronze-row';
  return '';
};

const getGradeRowClass = ({ row }) => {
  if (row.isMyClass) return 'highlight-row';
  if (row.rank === 1) return 'gold-row';
  if (row.rank === 2) return 'silver-row';
  if (row.rank === 3) return 'bronze-row';
  return '';
};

const formatTime = (seconds) => {
  if (!seconds) return '--';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}分${secs}秒`;
};

onMounted(() => {
  loadExams();
});
</script>

<style scoped>
/* ==================== PC Styles ==================== */
.ranking-pc {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.pc-header {
  margin-bottom: 20px;
}

.pc-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.pc-content {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-height: calc(100vh - 120px);
}

.exam-table-section {
  width: 100%;
}

.exam-title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.exam-title-cell .title {
  font-weight: 500;
}

.subject-tag {
  font-size: 12px;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.score-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.my-score {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.total-score {
  color: #909399;
  font-size: 14px;
}

.grading-tag {
  margin-left: 8px;
}

/* Ranking Detail Section */
.ranking-detail-section {
  width: 100%;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.detail-header h3 {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
  margin: 0;
}

.tab-buttons {
  margin-bottom: 20px;
}

/* Rank Cell Styles */
.rank-cell {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.rank-cell .medal {
  font-size: 24px;
}

.rank-cell .rank-num {
  font-size: 16px;
  font-weight: 600;
  color: #606266;
}

.score-highlight {
  font-size: 16px;
  font-weight: bold;
  color: #409eff;
}

.me-tag-pc {
  margin-left: 8px;
}

/* Table Row Highlight Styles */
:deep(.gold-row) {
  background-color: #fff7e6 !important;
}

:deep(.silver-row) {
  background-color: #f5f5f5 !important;
}

:deep(.bronze-row) {
  background-color: #fdf2e6 !important;
}

:deep(.highlight-row) {
  background-color: #e8f4ff !important;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover > td) {
  background-color: #f5f7fa !important;
}

:deep(.gold-row:hover > td) {
  background-color: #fff0d9 !important;
}

:deep(.silver-row:hover > td) {
  background-color: #eeeeee !important;
}

:deep(.bronze-row:hover > td) {
  background-color: #fae8d4 !important;
}

:deep(.highlight-row:hover > td) {
  background-color: #d9ecff !important;
}

/* ==================== Mobile Styles ==================== */
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-content {
  padding: 12px;
}

.exam-list {
  padding-bottom: 60px;
}

.exam-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
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
  color: #333;
  margin-bottom: 8px;
}

.exam-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.subject {
  color: #1989fa;
}

.exam-score {
  text-align: right;
}

.score-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.score-value {
  font-size: 18px;
  font-weight: bold;
}

.score-value .score {
  color: #1989fa;
}

.score-value .total {
  color: #999;
  font-size: 14px;
}

.grading-status {
  font-size: 12px;
  color: #ff976a;
  margin-top: 4px;
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
  color: #333;
}

.exam-header .van-icon {
  font-size: 20px;
  color: #666;
}

.switch-buttons {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  background: #f5f5f5;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.ranking-list {
  padding-top: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.ranking-item.is-me {
  background: #e8f4ff;
  border: 1px solid #1989fa;
}

.rank-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  background: #f5f5f5;
  color: #666;
  margin-right: 12px;
}

.rank-badge.gold {
  background: linear-gradient(135deg, #ffd700, #ffb347);
  color: #fff;
}

.rank-badge.silver {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
  color: #fff;
}

.rank-badge.bronze {
  background: linear-gradient(135deg, #cd7f32, #b8860b);
  color: #fff;
}

.student-info, .class-info {
  flex: 1;
}

.student-name, .class-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.me-tag {
  font-size: 12px;
  color: #fff;
  background: #1989fa;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

.student-class, .student-count {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.score-info {
  text-align: right;
}

.score {
  font-size: 18px;
  font-weight: bold;
  color: #1989fa;
}

.time-used, .avg-label {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
</style>
