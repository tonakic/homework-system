import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logout as logoutApi } from '@/api/auth';

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '');
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'));

  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!userInfo.value);
  const userType = computed(() => userInfo.value?.userType || '');
  const userName = computed(() => userInfo.value?.name || '');

  // 设置用户信息
  function setUserData(data) {
    token.value = data.token;
    userInfo.value = data.userInfo;
    localStorage.setItem('token', data.token);
    localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
  }

  // 清除用户信息
  async function clearUserData() {
    // 先调用后端登出API，即使失败也继续清除本地数据
    try {
      await logoutApi();
    } catch (err) {
      console.error('调用登出API失败:', err);
    }

    // 清除本地token和数据
    token.value = '';
    userInfo.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
  }

  // 检查是否首次登录
  function isFirstLogin() {
    return userInfo.value?.firstLogin === true;
  }

  // 更新首次登录状态
  function updateFirstLogin(value) {
    if (userInfo.value) {
      userInfo.value.firstLogin = value;
      localStorage.setItem('userInfo', JSON.stringify(userInfo.value));
    }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    userType,
    userName,
    setUserData,
    clearUserData,
    isFirstLogin,
    updateFirstLogin
  };
});