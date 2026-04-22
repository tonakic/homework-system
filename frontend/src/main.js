import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';

// 引入Vant样式
import 'vant/lib/index.css';

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

const app = createApp(App);

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
