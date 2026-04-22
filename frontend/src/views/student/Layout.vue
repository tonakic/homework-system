<template>
  <div class="student-layout">
    <div class="page-container" :class="{ 'with-tabbar': showMainTabbar }">
      <router-view />
    </div>
    <div v-if="showMainTabbar" class="tabbar-container">
      <van-tabbar v-model="active" route>
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

const route = useRoute();
const active = ref(0);

// 判断是否是访客页面（如登录页）
const isGuestPage = computed(() => route.meta.guest === true);

// 判断是否是答题页面（隐藏主页菜单）
const isExamPage = computed(() => route.name === 'StudentExamStart');

// 是否显示主页底部菜单
const showMainTabbar = computed(() => !isGuestPage.value && !isExamPage.value);

// 根据路由设置active
watch(
  () => route.path,
  (path) => {
    if (path.includes('/student/home')) active.value = 0;
    else if (path.includes('/student/pending')) active.value = 1;
    else if (path.includes('/student/records')) active.value = 2;
    else if (path.includes('/student/mistakes')) active.value = 3;
    else if (path.includes('/student/ranking')) active.value = 4;
    else if (path.includes('/student/profile')) active.value = 5;
  },
  { immediate: true }
);
</script>

<style scoped>
.student-layout {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.page-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

/* 有底部菜单时，为页面内容预留空间 */
.page-container.with-tabbar {
  padding-bottom: 60px;
}

.tabbar-container {
  flex-shrink: 0;
  background: #fff;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.tabbar-container :deep(.van-tabbar) {
  position: relative;
}
</style>
