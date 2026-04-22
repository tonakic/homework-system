<template>
  <div class="page">
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { showToast } from 'vant';
import { getRankingExams, getClassRanking, getGradeRanking } from '@/api/exams';

const loading = ref(false);
const exams = ref([]);
const selectedExam = ref(null);
const activeTab = ref('class');
const rankingLoading = ref(false);
const classRanking = ref([]);
const gradeRanking = ref([]);
const selectedClass = ref('');
const availableClasses = ref([]);

const classOptions = computed(() => {
  const options = [{ text: '全部班级', value: '' }];
  availableClasses.value.forEach(c => {
    options.push({ text: c, value: c });
  });
  return options;
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
  color: #1989fa;
}

.stat-label {
  font-size: 12px;
  color: #999;
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

.class-selector {
  margin-bottom: 12px;
}

.switch-buttons {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  background: #f5f5f5;
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
