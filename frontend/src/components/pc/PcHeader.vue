<template>
  <header class="pc-header">
    <div class="header-left">
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
    const type = userStore.userType;
    userStore.logout();
    router.push(`/${type}/login`);
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
