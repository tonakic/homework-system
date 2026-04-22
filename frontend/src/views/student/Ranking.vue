<template>
  <div class="page">
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
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { showToast } from 'vant';
import { getStudentRankingExams, getStudentClassRanking, getStudentGradeRanking } from '@/api/exams';

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
