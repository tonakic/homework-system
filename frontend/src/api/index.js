import axios from 'axios';
import { useUserStore } from '@/store/user';
import router from '@/router';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const userStore = useUserStore();
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const { response } = error;

    if (response) {
      const { status, data } = response;

      // Token过期或无效（排除登录接口的认证错误）
      const isLoginRequest = response.config?.url?.includes('/auth/login');
      if ((status === 401 || data?.code === 1003 || data?.code === 1004) && !isLoginRequest) {
        const userStore = useUserStore();
        userStore.clearUserData();

        // 跳转到登录页
        const currentPath = router.currentRoute.value.path;
        const userType = currentPath.split('/')[1] || 'student';
        router.push(`/${userType}/login`);

        return Promise.reject(new Error('登录已过期，请重新登录'));
      }

      // 其他错误（包括登录认证失败）
      return Promise.reject(new Error(data?.message || '请求失败'));
    }

    // 网络错误
    return Promise.reject(new Error('网络连接失败，请检查网络'));
  }
);

export default api;
