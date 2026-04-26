<template>
  <!-- 访客页面（登录页）直接渲染，无容器包裹，背景可铺满全屏 -->
  <router-view v-if="isGuestPage" />
  <!-- 正常页面使用布局容器 -->
  <el-container v-else class="pc-layout">
    <el-header class="pc-layout-header">
      <PcHeader />
    </el-header>
    <el-container class="pc-layout-body">
      <el-aside width="auto" class="pc-layout-aside">
        <PcSidebar ref="sidebarRef" />
      </el-aside>
      <el-main class="pc-layout-main">
        <div class="main-content">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import PcHeader from '@/components/pc/PcHeader.vue';
import PcSidebar from '@/components/pc/PcSidebar.vue';

const route = useRoute();
const sidebarRef = ref(null);

const isGuestPage = computed(() => route.meta.guest === true);
</script>

<style scoped>
.pc-layout {
  height: 100vh;
  width: 100vw;
}

.pc-layout-header {
  height: 56px;
  padding: 0;
  background: #fff;
}

.pc-layout-body {
  height: calc(100vh - 56px);
}

.pc-layout-aside {
  background: #fff;
  overflow: hidden;
}

.pc-layout-main {
  background: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}

.main-content {
  /* 移除宽度限制，内容区域填满剩余空间 */
  width: 100%;
}
</style>
