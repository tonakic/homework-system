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

          <div v-for="exam in exams" :key="exam.id" class="exam-card card" @click="selectExam(exam)">
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

            <!-- 前三名展示区 -->
            <div v-if="classRanking.length >= 3" class="top-three">
              <!-- 第二名 -->
              <div class="podium-item silver" :class="{ 'is-me': classRanking[1]?.isMe }">
                <div class="podium-avatar">{{ classRanking[1]?.studentName?.charAt(0) }}</div>
                <div class="podium-name">{{ classRanking[1]?.studentName }}</div>
                <div class="podium-score">{{ classRanking[1]?.score }}分</div>
                <div class="podium-rank">🥈</div>
              </div>
              <!-- 第一名 -->
              <div class="podium-item gold" :class="{ 'is-me': classRanking[0]?.isMe }">
                <div class="podium-avatar">{{ classRanking[0]?.studentName?.charAt(0) }}</div>
                <div class="podium-name">{{ classRanking[0]?.studentName }}</div>
                <div class="podium-score">{{ classRanking[0]?.score }}分</div>
                <div class="podium-rank">🥇</div>
              </div>
              <!-- 第三名 -->
              <div class="podium-item bronze" :class="{ 'is-me': classRanking[2]?.isMe }">
                <div class="podium-avatar">{{ classRanking[2]?.studentName?.charAt(0) }}</div>
                <div class="podium-name">{{ classRanking[2]?.studentName }}</div>
                <div class="podium-score">{{ classRanking[2]?.score }}分</div>
                <div class="podium-rank">🥉</div>
              </div>
            </div>

            <!-- 第四名及以后 -->
            <div v-for="item in classRanking.slice(3)" :key="item.studentId" class="ranking-item" :class="{ 'is-me': item.isMe }">
              <div class="rank-badge">{{ item.rank }}</div>
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

            <!-- 前三名展示区 -->
            <div v-if="gradeRanking.length >= 3" class="top-three">
              <!-- 第二名 -->
              <div class="podium-item silver" :class="{ 'is-me': gradeRanking[1]?.isMyClass }">
                <div class="podium-avatar">{{ gradeRanking[1]?.className?.slice(-3) }}</div>
                <div class="podium-name">{{ gradeRanking[1]?.className }}</div>
                <div class="podium-score">{{ gradeRanking[1]?.avgScore }}分</div>
                <div class="podium-rank">🥈</div>
              </div>
              <!-- 第一名 -->
              <div class="podium-item gold" :class="{ 'is-me': gradeRanking[0]?.isMyClass }">
                <div class="podium-avatar">{{ gradeRanking[0]?.className?.slice(-3) }}</div>
                <div class="podium-name">{{ gradeRanking[0]?.className }}</div>
                <div class="podium-score">{{ gradeRanking[0]?.avgScore }}分</div>
                <div class="podium-rank">🥇</div>
              </div>
              <!-- 第三名 -->
              <div class="podium-item bronze" :class="{ 'is-me': gradeRanking[2]?.isMyClass }">
                <div class="podium-avatar">{{ gradeRanking[2]?.className?.slice(-3) }}</div>
                <div class="podium-name">{{ gradeRanking[2]?.className }}</div>
                <div class="podium-score">{{ gradeRanking[2]?.avgScore }}分</div>
                <div class="podium-rank">🥉</div>
              </div>
            </div>

            <!-- 第四名及以后 -->
            <div v-for="item in gradeRanking.slice(3)" :key="item.className" class="ranking-item" :class="{ 'is-me': item.isMyClass }">
              <div class="rank-badge">{{ item.rank }}</div>
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
  background: var(--bg-color);
  padding: 20px;
}

.pc-header {
  margin-bottom: 20px;
}

.pc-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.pc-content {
  background: var(--fill-color-blank);
  border-radius: 12px;
  padding: 20px;
  min-height: calc(100vh - 120px);
  box-shadow: var(--box-shadow-light);
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
  color: var(--text-color-primary);
}

.subject-tag {
  font-size: 12px;
  color: var(--color-primary);
  background: var(--color-primary-light-9);
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
  color: var(--color-primary);
}

.total-score {
  color: var(--text-color-secondary);
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
  color: var(--text-color-primary);
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
  color: var(--text-color-secondary);
}

.score-highlight {
  font-size: 16px;
  font-weight: bold;
  color: var(--color-primary);
}

.me-tag-pc {
  margin-left: 8px;
}

/* Table Row Highlight Styles */
:deep(.gold-row) {
  background-color: var(--color-warning-light) !important;
}

:deep(.silver-row) {
  background-color: var(--fill-color) !important;
}

:deep(.bronze-row) {
  background-color: var(--color-warning-light) !important;
}

:deep(.highlight-row) {
  background-color: var(--color-primary-light-9) !important;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover > td) {
  background-color: var(--fill-color) !important;
}

:deep(.gold-row:hover > td) {
  background-color: #fff0d9 !important;
}

:deep(.silver-row:hover > td) {
  background-color: var(--border-color-lighter) !important;
}

:deep(.bronze-row:hover > td) {
  background-color: #fae8d4 !important;
}

:deep(.highlight-row:hover > td) {
  background-color: var(--color-primary-light-8) !important;
}

/* ==================== Mobile Styles ==================== */
.page {
  min-height: 100vh;
  background: var(--bg-color);
}

.page-content {
  padding: 12px;
}

.exam-list {
  padding-bottom: 60px;
}

.exam-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: transform var(--transition-duration) var(--transition-timing-function);
}

.exam-card:active {
  transform: scale(0.98);
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
  color: var(--text-color-placeholder);
}

.subject {
  color: var(--color-primary);
}

.exam-score {
  text-align: right;
}

.score-label {
  font-size: 12px;
  color: var(--text-color-placeholder);
  margin-bottom: 4px;
}

.score-value {
  font-size: 18px;
  font-weight: bold;
}

.score-value .score {
  color: var(--color-primary);
}

.score-value .total {
  color: var(--text-color-placeholder);
  font-size: 14px;
}

.grading-status {
  font-size: 12px;
  color: var(--color-warning);
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
  color: var(--text-color-primary);
}

.exam-header .van-icon {
  font-size: 20px;
  color: var(--text-color-secondary);
}

.switch-buttons {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  background: var(--bg-color);
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.ranking-list {
  padding-top: 12px;
}

/* 前三名领奖台样式 */
.top-three {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 8px;
  padding: 16px 8px 24px;
  margin-bottom: 16px;
  background: linear-gradient(180deg, var(--color-primary-light-9) 0%, var(--fill-color-blank) 100%);
  border-radius: 16px;
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 12px;
  background: var(--fill-color-blank);
  box-shadow: var(--box-shadow-light);
  transition: transform var(--transition-duration) var(--transition-timing-function);
  min-width: 80px;
}

.podium-item.gold {
  order: 2;
  padding: 16px 12px;
  background: linear-gradient(180deg, #fffbe6 0%, var(--fill-color-blank) 100%);
  border: 2px solid #ffd700;
}

.podium-item.silver {
  order: 1;
  background: linear-gradient(180deg, var(--fill-color) 0%, var(--fill-color-blank) 100%);
  border: 2px solid #c0c0c0;
}

.podium-item.bronze {
  order: 3;
  background: linear-gradient(180deg, var(--color-warning-light) 0%, var(--fill-color-blank) 100%);
  border: 2px solid #cd7f32;
}

.podium-item.is-me {
  box-shadow: 0 0 0 3px var(--color-primary-light-7);
}

.podium-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  color: var(--fill-color-blank);
  margin-bottom: 6px;
}

.podium-item.gold .podium-avatar {
  width: 48px;
  height: 48px;
  font-size: 18px;
  background: linear-gradient(135deg, #ffd700, #ffb347);
}

.podium-item.silver .podium-avatar {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
}

.podium-item.bronze .podium-avatar {
  background: linear-gradient(135deg, #cd7f32, #b8860b);
}

.podium-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color-primary);
  margin-bottom: 2px;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.podium-score {
  font-size: 14px;
  font-weight: bold;
  color: var(--color-primary);
}

.podium-rank {
  font-size: 24px;
  margin-top: 4px;
}

.podium-item.gold .podium-rank {
  font-size: 28px;
}

/* 排名列表项 */
.ranking-item {
  display: flex;
  align-items: center;
  background: var(--fill-color-blank);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: var(--box-shadow-light);
  transition: transform var(--transition-duration) var(--transition-timing-function);
}

.ranking-item:active {
  transform: scale(0.98);
}

.ranking-item.is-me {
  background: var(--color-primary-light-9);
  border: 1px solid var(--color-primary);
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
  background: var(--fill-color);
  color: var(--text-color-secondary);
  margin-right: 12px;
  flex-shrink: 0;
}

.student-info, .class-info {
  flex: 1;
  min-width: 0;
}

.student-name, .class-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.me-tag {
  font-size: 12px;
  color: var(--fill-color-blank);
  background: var(--color-primary);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

.student-class, .student-count {
  font-size: 12px;
  color: var(--text-color-placeholder);
  margin-top: 2px;
}

.score-info {
  text-align: right;
  flex-shrink: 0;
}

.score {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-primary);
}

.time-used, .avg-label {
  font-size: 12px;
  color: var(--text-color-placeholder);
  margin-top: 2px;
}

/* 移动端响应式优化 */
@media (max-width: 375px) {
  .top-three {
    gap: 6px;
    padding: 12px 4px 20px;
  }

  .podium-item {
    min-width: 70px;
    padding: 10px 6px;
  }

  .podium-item.gold {
    padding: 12px 8px;
  }

  .podium-avatar {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .podium-item.gold .podium-avatar {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .podium-name {
    font-size: 12px;
    max-width: 60px;
  }

  .podium-score {
    font-size: 13px;
  }

  .podium-rank {
    font-size: 20px;
  }

  .podium-item.gold .podium-rank {
    font-size: 24px;
  }

  .ranking-item {
    padding: 10px;
  }

  .rank-badge {
    width: 32px;
    height: 32px;
    font-size: 13px;
  }

  .student-name, .class-name {
    font-size: 14px;
  }

  .score {
    font-size: 16px;
  }
}
</style>
