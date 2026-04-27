<template>
  <aside class="pc-sidebar-component" :class="{ 'is-collapsed': isCollapsed }">
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
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/store/user';

const route = useRoute();
const userStore = useUserStore();
const isCollapsed = ref(false);

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
      { path: '/admin/exams', title: '考试管理', icon: 'DocumentCopy' },
      { path: '/admin/grading-config', title: '批改管理', icon: 'Setting' },
      { path: '/admin/settings', title: '系统设置', icon: 'Tools' },
      { path: '/admin/logs', title: '操作日志', icon: 'List' },
      { path: '/admin/feedbacks', title: '反馈管理', icon: 'Comment' }
    ]
  };
  return menus[userType.value] || [];
});

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

defineExpose({
  toggleCollapse
});
</script>

<style scoped>
.pc-sidebar-component {
  width: 220px;
  background-color: #fff;
  border-right: 1px solid var(--border-color-lighter);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width var(--transition-duration) var(--transition-timing-function);
}

.pc-sidebar-component.is-collapsed {
  width: 64px;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  background-color: #fff;
  overflow-y: auto;
  
  :deep(.el-menu-item) {
    height: 50px;
    line-height: 50px;
    margin: 4px 8px;
    border-radius: 8px;
    transition: all var(--transition-duration);
    
    &:hover {
      background-color: var(--color-primary-light-9);
    }
    
    &.is-active {
      background-color: var(--color-primary-light-9);
      color: var(--color-primary);
      font-weight: 500;
    }
  }
  
  :deep(.el-menu--collapse) {
    .el-menu-item {
      margin: 4px;
      border-radius: 8px;
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
</style>