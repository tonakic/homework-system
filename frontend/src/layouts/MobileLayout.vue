<template>
  <div class="mobile-layout" :class="`mobile-layout--${userType}`">
    <div class="mobile-page-container" :class="{ 'with-tabbar': showTabbar }">
      <router-view />
    </div>

    <!-- 学生端底部Tabbar -->
    <div v-if="showTabbar && userType === 'student'" class="mobile-tabbar">
      <van-tabbar v-model="activeTab" route>
        <van-tabbar-item to="/student/home" icon="home-o">首页</van-tabbar-item>
        <van-tabbar-item to="/student/pending" icon="notes-o">待答</van-tabbar-item>
        <van-tabbar-item to="/student/records" icon="records">记录</van-tabbar-item>
        <van-tabbar-item to="/student/mistakes" icon="warning-o">错题</van-tabbar-item>
        <van-tabbar-item to="/student/ranking" icon="medal-o">排行</van-tabbar-item>
        <van-tabbar-item to="/student/profile" icon="user-o">我的</van-tabbar-item>
      </van-tabbar>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/store/user';

const route = useRoute();
const userStore = useUserStore();
const activeTab = ref(0);

const userType = computed(() => userStore.userType || route.meta.userType || 'student');

const isGuestPage = computed(() => route.meta.guest === true);
const isExamPage = computed(() => route.name === 'StudentExamStart');
const showTabbar = computed(() => !isGuestPage.value && !isExamPage.value);

// 学生端Tab高亮
watch(
  () => route.path,
  (path) => {
    if (path.includes('/student/home')) activeTab.value = 0;
    else if (path.includes('/student/pending')) activeTab.value = 1;
    else if (path.includes('/student/records')) activeTab.value = 2;
    else if (path.includes('/student/mistakes')) activeTab.value = 3;
    else if (path.includes('/student/ranking')) activeTab.value = 4;
    else if (path.includes('/student/profile')) activeTab.value = 5;
  },
  { immediate: true }
);
</script>

<style scoped>
.mobile-layout {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.mobile-page-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.mobile-page-container.with-tabbar {
  padding-bottom: 60px;
}

.mobile-tabbar {
  flex-shrink: 0;
  background: #fff;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.mobile-tabbar :deep(.van-tabbar) {
  position: relative;
}
</style>
