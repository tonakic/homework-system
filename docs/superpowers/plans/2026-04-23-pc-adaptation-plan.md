# PC端适配实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为创新小学作业管理系统添加PC端适配，手机端保持现有Vant界面，PC端使用Element Plus全新界面，通过设备检测自动切换。

**Architecture:** Layout分包 + 组件内条件渲染。Layout层完全独立（MobileLayout/PcLayout），页面组件内部通过 `v-if="isPC"` 切换手机端和PC端内容。设备检测通过 UA + 窗口宽度双重判断，存储于 Pinia store 全局共享。

**Tech Stack:** Vue 3 + Vite + Vant 4 + Element Plus + Pinia + Vue Router

---

## 文件结构规划

### 新增文件

```
frontend/src/
  layouts/
    PcLayout.vue              # PC端通用布局（Header + 侧边栏 + 内容区）
    MobileLayout.vue          # 手机端通用布局（迁移现有student Layout逻辑）
  composables/
    useDevice.js              # 设备检测 composable
  store/
    device.js                 # 设备状态 Pinia store
  components/
    pc/
      PcHeader.vue            # PC端顶部导航栏
      PcSidebar.vue           # PC端侧边栏菜单
      PcBreadcrumb.vue        # PC端面包屑
```

### 修改文件

```
frontend/
  package.json                # 添加 Element Plus 依赖
  vite.config.js              # 配置 Element Plus 按需加载
  src/
    main.js                   # 引入 Element Plus 样式
    router/index.js           # 支持 Layout 动态切换
    App.vue                   # 使用动态 Layout
    store/user.js             # 添加 userType 图标映射
    views/
      student/Layout.vue      # 改用动态 Layout
      teacher/Layout.vue      # 改用动态 Layout
      admin/Layout.vue        # 改用动态 Layout
      */*.vue                 # 所有页面组件添加 PC 端渲染分支
```

---

## 阶段一：基础设施搭建

### Task 1.1: 安装 Element Plus 依赖

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: 安装 Element Plus 和相关插件**

```bash
cd /workspace/projects/homework-system/frontend
npm install element-plus @element-plus/icons-vue unplugin-auto-import -D
```

Expected: 安装成功，package.json 更新

- [ ] **Step 2: 验证 package.json 依赖**

package.json 应包含：
```json
{
  "dependencies": {
    "element-plus": "^2.x.x"
  },
  "devDependencies": {
    "@element-plus/icons-vue": "^2.x.x",
    "unplugin-auto-import": "^0.x.x"
  }
}
```

---

### Task 1.2: 配置 Vite 按需加载

**Files:**
- Modify: `frontend/vite.config.js`

- [ ] **Step 1: 更新 vite.config.js**

```javascript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { VantResolver } from 'unplugin-vue-components/resolvers';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      resolvers: [
        VantResolver(),
        ElementPlusResolver()
      ],
      dts: 'src/components.d.ts'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
```

- [ ] **Step 2: 验证配置生效**

```bash
cd /workspace/projects/homework-system/frontend
npm run dev
```

Expected: 服务正常启动，无报错

---

### Task 1.3: 创建设备检测 Store

**Files:**
- Create: `frontend/src/store/device.js`

- [ ] **Step 1: 创建 device store**

```javascript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useDeviceStore = defineStore('device', () => {
  const isPC = ref(false);
  const screenWidth = ref(0);

  const checkDevice = () => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const width = window.innerWidth;

    screenWidth.value = width;
    // PC判定：非移动UA 且 宽度>=768
    isPC.value = !isMobileUA && width >= 768;
  };

  const init = () => {
    checkDevice();
    window.addEventListener('resize', checkDevice);
  };

  const destroy = () => {
    window.removeEventListener('resize', checkDevice);
  };

  return {
    isPC,
    screenWidth,
    checkDevice,
    init,
    destroy
  };
});
```

---

### Task 1.4: 创建设备检测 Composable

**Files:**
- Create: `frontend/src/composables/useDevice.js`

- [ ] **Step 1: 创建 useDevice composable**

```javascript
import { useDeviceStore } from '@/store/device';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted } from 'vue';

export function useDevice() {
  const deviceStore = useDeviceStore();
  const { isPC, screenWidth } = storeToRefs(deviceStore);

  onMounted(() => {
    deviceStore.init();
  });

  onUnmounted(() => {
    deviceStore.destroy();
  });

  return {
    isPC,
    screenWidth
  };
}
```

---

### Task 1.5: 更新 main.js 引入样式

**Files:**
- Modify: `frontend/src/main.js`

- [ ] **Step 1: 添加 Element Plus 样式引入**

```javascript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';

// 引入Vant样式
import 'vant/lib/index.css';

// 引入Element Plus样式
import 'element-plus/dist/index.css';

// 引入全局样式
import './styles/index.css';

// 引入Vant组件（按需引入通过unplugin自动处理）
import {
  showToast,
  showSuccessToast,
  showFailToast,
  showLoadingToast,
  closeToast,
  showConfirmDialog,
  showDialog,
  setToastDefaultOptions,
  setDialogDefaultOptions
} from 'vant';

// 引入Element Plus图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

const app = createApp(App);

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 配置Toast和Dialog的z-index，确保在Popup之上
setToastDefaultOptions({ zIndex: 3000 });
setDialogDefaultOptions({ zIndex: 3000 });

// 全局挂载Vant方法
app.config.globalProperties.$toast = {
  show: showToast,
  success: showSuccessToast,
  fail: showFailToast,
  loading: showLoadingToast,
  close: closeToast
};

app.config.globalProperties.$dialog = {
  confirm: showConfirmDialog,
  alert: showDialog
};

app.use(createPinia());
app.use(router);

app.mount('#app');
```

---

### Task 1.6: 创建 PC 端 Header 组件

**Files:**
- Create: `frontend/src/components/pc/PcHeader.vue`

- [ ] **Step 1: 创建 PcHeader 组件**

```vue
<template>
  <header class="pc-header">
    <div class="header-left">
      <img src="@/assets/logo.svg" alt="Logo" class="logo" v-if="false" />
      <span class="system-name">创新小学作业管理系统</span>
      <span class="user-type-badge" :class="userType">{{ userTypeLabel }}</span>
    </div>
    <div class="header-right">
      <span class="user-info">
        <el-icon><User /></el-icon>
        <span class="user-name">{{ userName }}</span>
      </span>
      <el-button type="danger" text @click="handleLogout">
        <el-icon><SwitchButton /></el-icon>
        退出
      </el-button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { ElMessageBox } from 'element-plus';

const router = useRouter();
const userStore = useUserStore();

const userType = computed(() => userStore.userType);
const userName = computed(() => userStore.userName || '用户');

const userTypeLabel = computed(() => {
  const labels = {
    student: '学生端',
    teacher: '教师端',
    admin: '管理员'
  };
  return labels[userType.value] || '';
});

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    userStore.logout();
    router.push(`/${userType.value}/login`);
  } catch {
    // 取消退出
  }
};
</script>

<style scoped>
.pc-header {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 32px;
  height: 32px;
}

.system-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.user-type-badge {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.user-type-badge.student {
  background: #e8f5e9;
  color: #4caf50;
}

.user-type-badge.teacher {
  background: #e3f2fd;
  color: #2196f3;
}

.user-type-badge.admin {
  background: #fff3e0;
  color: #ff9800;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  font-size: 14px;
}

.user-name {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
```

---

### Task 1.7: 创建 PC 端 Sidebar 组件

**Files:**
- Create: `frontend/src/components/pc/PcSidebar.vue`

- [ ] **Step 1: 创建 PcSidebar 组件**

```vue
<template>
  <el-menu
    :default-active="activeMenu"
    class="pc-sidebar"
    :collapse="isCollapse"
    router
  >
    <el-menu-item
      v-for="item in menuItems"
      :key="item.path"
      :index="item.path"
    >
      <el-icon><component :is="item.icon" /></el-icon>
      <template #title>{{ item.title }}</template>
    </el-menu-item>
  </el-menu>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/store/user';

const route = useRoute();
const userStore = useUserStore();
const isCollapse = ref(false);

const activeMenu = computed(() => route.path);

const userType = computed(() => userStore.userType);

const menuItems = computed(() => {
  const menus = {
    student: [
      { path: '/student/home', title: '首页', icon: 'HomeFilled' },
      { path: '/student/pending', title: '待做作业', icon: 'Document' },
      { path: '/student/records', title: '答题记录', icon: 'Tickets' },
      { path: '/student/mistakes', title: '错题本', icon: 'Warning' },
      { path: '/student/ranking', title: '排行榜', icon: 'Medal' },
      { path: '/student/profile', title: '个人中心', icon: 'User' }
    ],
    teacher: [
      { path: '/teacher/home', title: '首页', icon: 'HomeFilled' },
      { path: '/teacher/students', title: '学生管理', icon: 'UserFilled' },
      { path: '/teacher/questions', title: '题库管理', icon: 'Collection' },
      { path: '/teacher/exams', title: '作业管理', icon: 'DocumentCopy' },
      { path: '/teacher/grading', title: '批改评分', icon: 'EditPen' },
      { path: '/teacher/statistics', title: '数据统计', icon: 'DataAnalysis' },
      { path: '/teacher/profile', title: '个人设置', icon: 'Setting' }
    ],
    admin: [
      { path: '/admin/home', title: '首页', icon: 'HomeFilled' },
      { path: '/admin/teachers', title: '教师管理', icon: 'Avatar' },
      { path: '/admin/students', title: '学生管理', icon: 'UserFilled' },
      { path: '/admin/classes', title: '班级管理', icon: 'School' },
      { path: '/admin/questions', title: '题库管理', icon: 'Collection' },
      { path: '/admin/exams', title: '作业管理', icon: 'DocumentCopy' },
      { path: '/admin/grading-config', title: '批改配置', icon: 'Setting' },
      { path: '/admin/settings', title: '系统设置', icon: 'Tools' },
      { path: '/admin/logs', title: '操作日志', icon: 'List' }
    ]
  };
  return menus[userType.value] || [];
});

defineExpose({
  toggleCollapse: () => {
    isCollapse.value = !isCollapse.value;
  }
});
</script>

<style scoped>
.pc-sidebar {
  height: 100%;
  border-right: 1px solid #e4e7ed;
  background: #fff;
}

.pc-sidebar:not(.el-menu--collapse) {
  width: 220px;
}

.pc-sidebar .el-menu-item {
  height: 50px;
  line-height: 50px;
}

.pc-sidebar .el-menu-item.is-active {
  background-color: rgba(255, 152, 0, 0.1);
  color: #ff9800;
  border-right: 3px solid #ff9800;
}

.pc-sidebar .el-menu-item:hover {
  background-color: #f5f7fa;
}
</style>
```

---

### Task 1.8: 创建 PC 端布局组件

**Files:**
- Create: `frontend/src/layouts/PcLayout.vue`

- [ ] **Step 1: 创建 PcLayout 组件**

```vue
<template>
  <el-container class="pc-layout">
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
import { ref } from 'vue';
import PcHeader from '@/components/pc/PcHeader.vue';
import PcSidebar from '@/components/pc/PcSidebar.vue';

const sidebarRef = ref(null);
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
  max-width: 1400px;
  margin: 0 auto;
}
</style>
```

---

### Task 1.9: 创建手机端布局组件

**Files:**
- Create: `frontend/src/layouts/MobileLayout.vue`

- [ ] **Step 1: 创建 MobileLayout 组件（整合现有逻辑）**

```vue
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
```

---

### Task 1.10: 修改 App.vue 使用动态 Layout

**Files:**
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: 更新 App.vue**

```vue
<template>
  <PcLayout v-if="isPC" />
  <MobileLayout v-else />
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useDeviceStore } from '@/store/device';
import { storeToRefs } from 'pinia';
import PcLayout from '@/layouts/PcLayout.vue';
import MobileLayout from '@/layouts/MobileLayout.vue';

const deviceStore = useDeviceStore();
const { isPC } = storeToRefs(deviceStore);

onMounted(() => {
  deviceStore.init();
});
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>
```

---

### Task 1.11: 简化原有 Layout 文件

**Files:**
- Modify: `frontend/src/views/student/Layout.vue`
- Modify: `frontend/src/views/teacher/Layout.vue`
- Modify: `frontend/src/views/admin/Layout.vue`

- [ ] **Step 1: 简化 student/Layout.vue**

```vue
<template>
  <router-view />
</template>

<script setup>
// Layout 逻辑已移至 MobileLayout/PcLayout
</script>
```

- [ ] **Step 2: 简化 teacher/Layout.vue**

```vue
<template>
  <router-view />
</template>

<script setup>
// Layout 逻辑已移至 MobileLayout/PcLayout
</script>
```

- [ ] **Step 3: 简化 admin/Layout.vue**

```vue
<template>
  <router-view />
</template>

<script setup>
// Layout 逻辑已移至 MobileLayout/PcLayout
</script>
```

---

### Task 1.12: 提交基础设施代码

- [ ] **Step 1: 提交代码**

```bash
cd /workspace/projects/homework-system
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/src/main.js frontend/src/App.vue frontend/src/store/device.js frontend/src/composables/useDevice.js frontend/src/layouts/ frontend/src/components/pc/ frontend/src/views/*/Layout.vue
git commit -m "$(cat <<'EOF'
feat: 添加PC端基础设施

- 安装 Element Plus 及按需加载配置
- 创建设备检测 store 和 composable
- 创建 PC 端布局组件 (Header/Sidebar/Layout)
- 创建手机端布局组件
- 修改 App.vue 使用动态布局
- 简化原有 Layout 文件

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## 阶段二：学生端页面适配

### Task 2.1: 学生端登录页 PC 适配

**Files:**
- Modify: `frontend/src/views/student/Login.vue`

- [ ] **Step 1: 添加 PC 端登录表单**

在 `<template>` 中添加 PC 端布局：

```vue
<template>
  <!-- PC端 -->
  <div v-if="isPC" class="login-pc">
    <div class="login-card">
      <h2 class="login-title">创新小学作业系统</h2>
      <p class="login-subtitle">学生端</p>
      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入学号" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleLogin" size="large" style="width: 100%">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-footer">
        <span @click="goToOtherPortal('teacher')">教师入口</span>
        <span @click="goToOtherPortal('admin')">管理员入口</span>
      </div>
    </div>
  </div>

  <!-- 手机端（保留原有代码） -->
  <div v-else class="login-page">
    <!-- 原有手机端代码保持不变 -->
    ...
  </div>
</template>
```

- [ ] **Step 2: 在 script 中引入 isPC**

```javascript
import { useDevice } from '@/composables/useDevice';
const { isPC } = useDevice();
```

- [ ] **Step 3: 添加 PC 端样式**

```css
.login-pc {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.login-title {
  text-align: center;
  font-size: 24px;
  color: #303133;
  margin-bottom: 8px;
}

.login-subtitle {
  text-align: center;
  font-size: 14px;
  color: #ff9800;
  margin-bottom: 32px;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
}

.login-footer span {
  color: #909399;
  font-size: 13px;
  cursor: pointer;
  margin: 0 12px;
}

.login-footer span:hover {
  color: #ff9800;
}
```

---

### Task 2.2: 学生端首页 PC 适配

**Files:**
- Modify: `frontend/src/views/student/Home.vue`

- [ ] **Step 1: 读取现有文件结构后添加 PC 端布局**

PC 端首页使用 Element Plus 卡片布局展示统计数据和快捷入口。

---

### Task 2.3 ~ 2.10: 其他学生端页面

按照相同模式逐个适配：
- Pending.vue（待做作业）
- ExamDetail.vue（作业详情）
- ExamStart.vue（答题界面 - 重点，需要分屏设计）
- Records.vue（答题记录）
- RecordDetail.vue（记录详情）
- Mistakes.vue（错题本）
- Ranking.vue（排行榜）
- Profile.vue（个人中心）

---

## 阶段三：教师端页面适配

### Task 3.1 ~ 3.9: 教师端页面

重点页面：
- Questions.vue（1472行 - 题库管理）
- Exams.vue（1279行 - 作业管理）
- Grading.vue（924行 - 批改评分）

---

## 阶段四：管理员端页面适配

### Task 4.1 ~ 4.8: 管理员端页面

重点：数据管理表格、权限配置

---

## 执行策略

由于工作量较大（28个页面），建议：

1. **阶段一** 由主会话完成（基础设施）
2. **阶段二~四** 使用子智能体并行执行，每个页面独立任务

每个页面适配的通用步骤：
1. 读取现有组件
2. 添加 `import { useDevice } from '@/composables/useDevice'`
3. 在 template 添加 `v-if="isPC"` 分支
4. 实现 PC 端布局（使用 Element Plus 组件）
5. 添加 PC 端样式
6. 验证两端功能正常
7. 提交代码
