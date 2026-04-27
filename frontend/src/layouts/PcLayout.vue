<template>
  <!-- 访客页面（登录页）直接渲染，无容器包裹 -->
  <router-view v-if="isGuestPage" />
  
  <!-- 正常页面使用布局容器 -->
  <div v-else class="pc-layout">
    <!-- 顶部导航栏 -->
    <header class="pc-header">
      <div class="header-brand">
        <div class="brand-logo">
          <el-icon><School /></el-icon>
        </div>
        <span class="brand-name">创新小学作业管理系统</span>
        <span class="brand-badge">{{ userTypeLabel }}</span>
      </div>
      <div class="header-user">
        <el-dropdown trigger="click" @command="handleCommand">
          <div class="user-dropdown-link">
            <div class="user-avatar">
              <el-icon><User /></el-icon>
            </div>
            <span class="user-name">{{ userName }}</span>
            <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>
                个人中心
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>
    
    <!-- 主体区域 -->
    <div class="pc-body">
      <!-- 侧边栏 -->
      <aside class="pc-sidebar" :class="{ 'is-collapsed': isCollapsed }">
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          :collapse="isCollapsed"
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
        
        <!-- 折叠按钮 -->
        <div class="sidebar-footer">
          <div class="collapse-btn" @click="toggleCollapse">
            <el-icon>
              <component :is="isCollapsed ? 'Expand' : 'Fold'" />
            </el-icon>
          </div>
        </div>
      </aside>
      
      <!-- 主内容区域 -->
      <main class="pc-main">
        <!-- 面包屑导航 -->
        <div class="main-header" v-if="showBreadcrumb">
          <div class="breadcrumb-nav">
            <span class="breadcrumb-item">
              <el-icon><HomeFilled /></el-icon>
              首页
            </span>
            <span class="breadcrumb-item" v-if="currentMenu">
              {{ currentMenu.title }}
            </span>
          </div>
          <div class="header-tools">
            <!-- 可扩展的工具按钮区域 -->
          </div>
        </div>
        
        <!-- 内容主体 -->
        <div class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="slide-up" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { ElMessageBox } from 'element-plus';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const isCollapsed = ref(false);

// 判断是否为访客页面
const isGuestPage = computed(() => route.meta.guest === true);

// 用户信息
const userType = computed(() => userStore.userType);
const userName = computed(() => userStore.userName || '用户');

// 用户类型标签
const userTypeLabel = computed(() => {
  const labels = {
    student: '学生端',
    teacher: '教师端',
    admin: '管理员'
  };
  return labels[userType.value] || '';
});

// 当前激活菜单
const activeMenu = computed(() => route.path);

// 菜单配置
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
      { path: '/admin/exams', title: '考试管理', icon: 'DocumentCopy' },
      { path: '/admin/grading-config', title: '批改管理', icon: 'Setting' },
      { path: '/admin/settings', title: '系统设置', icon: 'Tools' },
      { path: '/admin/logs', title: '操作日志', icon: 'List' },
      { path: '/admin/feedbacks', title: '反馈管理', icon: 'Comment' }
    ]
  };
  return menus[userType.value] || [];
});

// 当前菜单项
const currentMenu = computed(() => {
  return menuItems.value.find(item => item.path === route.path);
});

// 是否显示面包屑
const showBreadcrumb = computed(() => {
  return !isGuestPage.value && currentMenu.value;
});

// 切换侧边栏折叠
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

// 下拉菜单命令处理
const handleCommand = async (command) => {
  if (command === 'profile') {
    const profilePath = {
      student: '/student/profile',
      teacher: '/teacher/profile',
      admin: '/admin/settings'
    };
    router.push(profilePath[userType.value]);
  } else if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      });
      const type = userStore.userType;
      userStore.clearUserData();
      router.push(`/${type}/login`);
    } catch {
      // 取消退出
    }
  }
};
</script>

<style scoped>
/* 使用全局样式，这里只做必要的补充 */
.pc-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
}

.pc-header {
  height: var(--header-height);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light-3));
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
}

.brand-name {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 1px;
}

.brand-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-dropdown-link {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #fff;
  
  &:hover {
    opacity: 0.8;
  }
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
}

.user-name {
  color: #fff;
  font-size: 14px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-icon {
  font-size: 12px;
}

.pc-body {
  display: flex;
  height: calc(100vh - var(--header-height));
  overflow: hidden;
}

.pc-sidebar {
  width: 220px;
  background-color: #fff;
  border-right: 1px solid var(--border-color-lighter);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width var(--transition-duration) var(--transition-timing-function);
}

.pc-sidebar.is-collapsed {
  width: 64px;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  background-color: #fff;
  
  :deep(.el-menu-item) {
    height: 50px;
    line-height: 50px;
    margin: 4px 8px;
    border-radius: 8px;
    
    &:hover {
      background-color: var(--color-primary-light-9);
    }
    
    &.is-active {
      background-color: var(--color-primary-light-9);
      color: var(--color-primary);
    }
  }
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: var(--fill-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-duration);
  
  &:hover {
    background-color: var(--color-primary-light-9);
    color: var(--color-primary);
  }
}

.pc-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-color);
}

.main-header {
  padding: 12px 20px;
  background-color: #fff;
  border-bottom: 1px solid var(--border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-color-secondary);
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:not(:last-child)::after {
    content: '/';
    margin-left: 8px;
    color: var(--border-color);
  }
  
  &:last-child {
    color: var(--text-color-primary);
    font-weight: 500;
  }
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: var(--border-color-light);
    border-radius: 3px;
  }
}

/* 页面切换动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>