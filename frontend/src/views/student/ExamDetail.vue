<template>
  <div class="exam-detail page">
    <van-nav-bar title="作业详情" left-arrow @click-left="$router.push('/student/home')" />

    <div class="page-content">
      <van-loading v-if="loading" class="loading-center" />

      <template v-else-if="exam.id">
        <div class="card">
          <h2 class="title">{{ exam.title }}</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">科目</span>
              <span class="value">{{ exam.subject }}</span>
            </div>
            <div class="info-item">
              <span class="label">题数</span>
              <span class="value">{{ exam.questionCount }}题</span>
            </div>
            <div class="info-item">
              <span class="label">总分</span>
              <span class="value">{{ exam.totalScore }}分</span>
            </div>
            <div class="info-item">
              <span class="label">限时</span>
              <span class="value">{{ exam.duration > 0 ? exam.duration + '分钟' : '不限时' }}</span>
            </div>
          </div>
          <div class="detail-row">
            <span class="label">出题人</span>
            <span class="value">{{ exam.creatorName }}</span>
          </div>
          <div class="detail-row" v-if="exam.startTime">
            <span class="label">开始时间</span>
            <span class="value">{{ formatTime(exam.startTime) }}</span>
          </div>
          <div class="detail-row" v-if="exam.endTime">
            <span class="label">截止时间</span>
            <span class="value">{{ formatTime(exam.endTime) }}</span>
          </div>
        </div>

        <div class="tips card">
          <h4>答题须知</h4>
          <ul>
            <li>请确保网络稳定，答案将自动保存</li>
            <li>答题过程中请勿切换页面</li>
            <li>交卷前请检查所有题目是否已答</li>
          </ul>
        </div>

        <div class="actions">
          <van-button type="primary" block round @click="startExam" :loading="starting">
            开始答题
          </van-button>
        </div>
      </template>

      <van-empty v-else description="考试任务不存在" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getExamDetail, startExam as apiStartExam } from '@/api/auth';
import { showFailToast } from 'vant';
import { formatTime } from '@/utils/time';

const route = useRoute();
const router = useRouter();
const exam = ref({});
const loading = ref(false);
const starting = ref(false);

onMounted(() => {
  loadExamDetail();
});

async function loadExamDetail() {
  loading.value = true;
  try {
    const res = await getExamDetail(route.params.id);
    if (res.code === 0) {
      exam.value = res.data;
    } else {
      showFailToast(res.message || '获取详情失败');
    }
  } catch (err) {
    console.error('获取考试详情失败:', err);
    showFailToast(err.message || '获取详情失败');
  } finally {
    loading.value = false;
  }
}

async function startExam() {
  starting.value = true;
  try {
    const res = await apiStartExam(route.params.id);
    if (res.code === 0) {
      // 将考试信息存储到sessionStorage
      sessionStorage.setItem('currentExam', JSON.stringify(res.data));
      router.push(`/student/exam/${route.params.id}/start`);
    } else {
      showFailToast(res.message || '开始答题失败');
    }
  } catch (err) {
    console.error('开始答题失败:', err);
    showFailToast(err.message || '开始答题失败');
  } finally {
    starting.value = false;
  }
}

</script>

<style scoped>
.loading-center {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.title {
  font-size: 18px;
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  background: #f9f9f9;
  padding: 12px;
  border-radius: 8px;
}

.info-item .label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.info-item .value {
  font-size: 16px;
  font-weight: 500;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row .label {
  color: #666;
}

.tips h4 {
  margin-bottom: 12px;
}

.tips ul {
  padding-left: 20px;
}

.tips li {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.actions {
  margin-top: 24px;
}
</style>
