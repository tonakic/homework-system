<template>
  <div class="mobile-layout" :class="`mobile-layout--${userType}`">
    <!-- 页面内容区域 - 添加过渡动画 -->
    <div class="mobile-page-container" :class="{ 'with-tabbar': showTabbar }">
      <router-view v-slot="{ Component, route }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </div>

    <!-- 学生端底部Tabbar -->
    <transition name="tabbar-slide">
      <div v-if="showTabbar && userType === 'student'" class="mobile-tabbar">
        <van-tabbar v-model="activeTab" route active-color="#409eff" inactive-color="#909399">
          <van-tabbar-item to="/student/home">
            <template #icon="props">
              <van-icon :name="props.active ? 'wap-home' : 'wap-home-o'" />
            </template>
            首页
          </van-tabbar-item>
          <van-tabbar-item to="/student/pending" :badge="pendingCount || ''">
            <template #icon="props">
              <van-icon :name="props.active ? 'edit' : 'edit'" />
            </template>
            待答
          </van-tabbar-item>
          <van-tabbar-item to="/student/records">
            <template #icon="props">
              <van-icon :name="props.active ? 'records' : 'records'" />
            </template>
            记录
          </van-tabbar-item>
          <van-tabbar-item to="/student/mistakes">
            <template #icon="props">
              <van-icon :name="props.active ? 'info' : 'info-o'" />
            </template>
            错题
          </van-tabbar-item>
          <van-tabbar-item to="/student/ranking">
            <template #icon="props">
              <van-icon :name="props.active ? 'medal' : 'medal-o'" />
            </template>
            排行
          </van-tabbar-item>
          <van-tabbar-item to="/student/profile">
            <template #icon="props">
              <van-icon :name="props.active ? 'manager' : 'manager-o'" />
            </template>
            我的
          </van-tabbar-item>
        </van-tabbar>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/store/user';

const route = useRoute();
const userStore = useUserStore();
const activeTab = ref(0);
const transitionName = ref('slide-left');
const pendingCount = ref(0);

const userType = computed(() => userStore.userType || route.meta.userType || 'student');

const isGuestPage = computed(() => route.meta.guest === true);
const isExamPage = computed(() => route.name === 'StudentExamStart');
const showTabbar = computed(() => !isGuestPage.value && !isExamPage.value);

// 页面切换动画方向
watch(
  () => route.path,
  (to, from) => {
    // 根据路由层级决定动画方向
    const toDepth = to.split('/').length;
    const fromDepth = from?.split('/').length || 0;
    
    if (toDepth > fromDepth) {
      transitionName.value = 'slide-left';
    } else if (toDepth < fromDepth) {
      transitionName.value = 'slide-right';
    } else {
      transitionName.value = 'fade';
    }
  }
);

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
/* ==========================================
   布局容器
   ========================================== */
.mobile-layout {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-color, #f5f7fa);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ==========================================
   页面内容区域
   ========================================== */
.mobile-page-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

.mobile-page-container.with-tabbar {
  padding-bottom: calc(var(--tabbar-height, 50px) + env(safe-area-inset-bottom, 0px));
}

/* ==========================================
   页面切换过渡动画
   ========================================== */
/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-duration, 0.3s) var(--transition-timing-function, ease);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 左滑进入 */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all var(--transition-duration, 0.3s) var(--transition-timing-function, ease);
  position: absolute;
  width: 100%;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* 右滑进入 */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all var(--transition-duration, 0.3s) var(--transition-timing-function, ease);
  position: absolute;
  width: 100%;
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* ==========================================
   底部导航栏
   ========================================== */
.mobile-tabbar {
  flex-shrink: 0;
  background-color: var(--fill-color-blank, #ffffff);
  border-top: 1px solid var(--border-color-lighter, #ebeef5);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.04);
}

/* Tabbar 出现/隐藏动画 */
.tabbar-slide-enter-active,
.tabbar-slide-leave-active {
  transition: transform var(--transition-duration, 0.3s) var(--transition-timing-function, ease);
}

.tabbar-slide-enter-from,
.tabbar-slide-leave-to {
  transform: translateY(100%);
}

/* ==========================================
   Vant Tabbar 样式覆盖
   ========================================== */
.mobile-tabbar :deep(.van-tabbar) {
  position: relative;
  background-color: transparent;
  border: none;
  box-shadow: none;
}

.mobile-tabbar :deep(.van-tabbar-item) {
  transition: all var(--transition-duration, 0.3s) ease;
}

.mobile-tabbar :deep(.van-tabbar-item--active) {
  background-color: var(--color-primary-light-9, #ecf5ff);
}

.mobile-tabbar :deep(.van-tabbar-item__icon) {
  font-size: 22px;
  transition: transform 0.2s ease;
}

.mobile-tabbar :deep(.van-tabbar-item--active .van-tabbar-item__icon) {
  transform: scale(1.1);
}

.mobile-tabbar :deep(.van-tabbar-item__text) {
  font-size: 11px;
  font-weight: 500;
}

.mobile-tabbar :deep(.van-tabbar-item--active .van-tabbar-item__text) {
  font-weight: 600;
}

/* 徽章样式 */
.mobile-tabbar :deep(.van-tabbar-item__icon .van-badge) {
  background-color: var(--color-danger, #f56c6c);
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
}

/* ==========================================
   角色主题变体
   ========================================== */
.mobile-layout--student .mobile-tabbar :deep(.van-tabbar-item--active) {
  background-color: var(--color-primary-light-9, #ecf5ff);
}

.mobile-layout--teacher .mobile-tabbar :deep(.van-tabbar-item--active) {
  background-color: rgba(103, 194, 58, 0.1);
}

.mobile-layout--admin .mobile-tabbar :deep(.van-tabbar-item--active) {
  background-color: rgba(230, 162, 60, 0.1);
}
</style>
