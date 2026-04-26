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
      { path: '/admin/exams', title: '考试管理', icon: 'DocumentCopy' },
      { path: '/admin/grading-config', title: '批改管理', icon: 'Setting' },
      { path: '/admin/settings', title: '系统设置', icon: 'Tools' },
      { path: '/admin/logs', title: '操作日志', icon: 'List' },
      { path: '/admin/feedbacks', title: '反馈管理', icon: 'Comment' }
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

.pc-sidebar :deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
}

.pc-sidebar :deep(.el-menu-item.is-active) {
  background-color: rgba(255, 152, 0, 0.1);
  color: #ff9800;
  border-right: 3px solid #ff9800;
}

.pc-sidebar :deep(.el-menu-item:hover) {
  background-color: #f5f7fa;
}
</style>
