<template>
  <header class="pc-header-component">
    <div class="header-brand">
      <div class="brand-logo">
        <el-icon><School /></el-icon>
      </div>
      <span class="brand-name">创新小学作业管理系统</span>
      <span class="brand-badge" :class="userTypeClass">{{ userTypeLabel }}</span>
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

const userTypeClass = computed(() => `type-${userType.value}`);

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
.pc-header-component {
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
  transition: opacity var(--transition-duration);
  
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
</style>