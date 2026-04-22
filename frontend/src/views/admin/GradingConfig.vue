<template>
  <div class="page">
    <van-nav-bar title="批改管理" left-arrow @click-left="$router.back()" />

    <div class="page-content">
      <!-- 标签页切换 -->
      <van-tabs v-model:active="activeTab" sticky shrink>
        <van-tab title="批改配置" name="config">
          <!-- 批改模式 -->
          <div class="config-section">
            <div class="section-header">批改模式</div>
            <div class="mode-options">
              <div
                :class="['mode-option', { active: form.grading_mode === 'ai' }]"
                @click="form.grading_mode = 'ai'"
              >
                <van-icon v-if="form.grading_mode === 'ai'" name="success" />
                <span>AI批改</span>
              </div>
              <div
                :class="['mode-option', { active: form.grading_mode === 'mixed' }]"
                @click="form.grading_mode = 'mixed'"
              >
                <van-icon v-if="form.grading_mode === 'mixed'" name="success" />
                <span>混合模式</span>
              </div>
            </div>
          </div>

          <!-- AI批改设置 -->
          <div class="config-section">
            <div class="section-header">AI批改设置</div>
            <van-cell-group inset>
              <van-cell title="AI提供商" :value="providerText" is-link @click="showProviderPicker = true" />
              <van-cell v-if="form.ai_provider === 'ollama'" title="API地址">
                <template #value>
                  <input v-model="form.ai_endpoint" class="cell-input" placeholder="http://localhost:11434" />
                </template>
              </van-cell>
              <van-cell v-if="form.ai_provider === 'deepseek'" title="API密钥">
                <template #value>
                  <input v-model="form.ai_api_key" type="password" class="cell-input" placeholder="请输入密钥" />
                </template>
              </van-cell>
              <van-cell title="模型">
                <template #value>
                  <input v-model="form.ai_model" class="cell-input" :placeholder="modelPlaceholder" />
                </template>
              </van-cell>
            </van-cell-group>
            <div class="test-section">
              <van-button size="small" :loading="testing" @click="testConnection">测试连接</van-button>
              <span v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'fail']">
                {{ testResult.message }}
              </span>
            </div>
          </div>

          <!-- 提示词参数 -->
          <div class="config-section">
            <div class="section-header">提示词参数</div>
            <van-cell-group inset>
              <van-cell title="评分严格度" :value="strictnessText" is-link @click="showStrictnessPicker = true" />
              <van-cell title="语言风格" :value="styleText" is-link @click="showStylePicker = true" />
              <van-cell title="评语长度" :value="lengthText" is-link @click="showLengthPicker = true" />
              <van-cell title="鼓励性语言">
                <template #value>
                  <div class="slider-cell">
                    <van-slider v-model="form.prompt_encourage_ratio" :min="0" :max="100" active-color="#1989fa" />
                    <span class="slider-value">{{ form.prompt_encourage_ratio }}%</span>
                  </div>
                </template>
              </van-cell>
              <van-cell title="错题分析" :value="analysisText" is-link @click="showAnalysisPicker = true" />
            </van-cell-group>
          </div>

          <!-- 混合模式配置 -->
          <div v-if="form.grading_mode === 'mixed'" class="config-section">
            <div class="section-header">混合模式配置</div>
            <van-cell-group inset>
              <van-cell title="单选题" :value="mixedText.choice" is-link @click="openMixedPicker('choice')" />
              <van-cell title="多选题" :value="mixedText.multiple" is-link @click="openMixedPicker('multiple')" />
              <van-cell title="填空题" :value="mixedText.fill" is-link @click="openMixedPicker('fill')" />
              <van-cell title="判断题" :value="mixedText.judgment" is-link @click="openMixedPicker('judgment')" />
              <van-cell title="主观题" :value="mixedText.subjective" is-link @click="openMixedPicker('subjective')" />
            </van-cell-group>
          </div>

          <!-- 模式说明 -->
          <div class="config-section mode-desc">
            <div class="desc-item" v-if="form.grading_mode === 'ai'">
              <van-icon name="info-o" />
              <span>AI批改：客观题自动判定，主观题由AI智能批改</span>
            </div>
            <div class="desc-item" v-else>
              <van-icon name="info-o" />
              <span>混合模式：按题型自定义批改方式，可选择自动判定、AI批改或手动批改</span>
            </div>
          </div>

          <!-- 保存按钮 -->
          <div class="save-section">
            <van-button type="primary" block :loading="saving" @click="saveConfig">保存配置</van-button>
          </div>
        </van-tab>

        <van-tab title="队列管理" name="queue">
          <!-- 队列状态统计 -->
          <div class="stats-section">
            <div class="stats-grid">
              <div class="stat-card pending">
                <div class="stat-value">{{ queueStats.pending }}</div>
                <div class="stat-label">待处理</div>
              </div>
              <div class="stat-card processing">
                <div class="stat-value">{{ queueStats.processing }}</div>
                <div class="stat-label">处理中</div>
              </div>
              <div class="stat-card completed">
                <div class="stat-value">{{ queueStats.completed }}</div>
                <div class="stat-label">已完成</div>
              </div>
              <div class="stat-card failed">
                <div class="stat-value">{{ queueStats.failed }}</div>
                <div class="stat-label">失败</div>
              </div>
            </div>
          </div>

          <!-- 筛选条件 -->
          <div class="filter-section">
            <div class="filter-row">
              <van-button
                size="small"
                :type="taskFilter === '' ? 'primary' : 'default'"
                @click="changeTaskFilter('')"
              >
                全部
              </van-button>
              <van-button
                size="small"
                :type="taskFilter === 'pending' ? 'primary' : 'default'"
                @click="changeTaskFilter('pending')"
              >
                待处理
              </van-button>
              <van-button
                size="small"
                :type="taskFilter === 'processing' ? 'primary' : 'default'"
                @click="changeTaskFilter('processing')"
              >
                处理中
              </van-button>
              <van-button
                size="small"
                :type="taskFilter === 'completed' ? 'primary' : 'default'"
                @click="changeTaskFilter('completed')"
              >
                已完成
              </van-button>
              <van-button
                size="small"
                :type="taskFilter === 'failed' ? 'primary' : 'default'"
                @click="changeTaskFilter('failed')"
              >
                失败
              </van-button>
            </div>
          </div>

          <!-- 任务列表 -->
          <div class="task-list">
            <van-pull-refresh v-model="taskRefreshing" @refresh="onTaskRefresh">
              <van-list
                v-model:loading="taskLoading"
                :finished="taskFinished"
                finished-text="没有更多了"
                @load="loadTasks"
              >
                <div v-for="task in tasks" :key="task.id" class="task-item">
                  <div class="task-header">
                    <span class="task-student">{{ task.student_name }}</span>
                    <van-tag :type="getTaskStatusType(task.status)" size="small">
                      {{ getTaskStatusText(task.status) }}
                    </van-tag>
                  </div>
                  <div class="task-info">
                    <div class="task-exam">{{ task.exam_title }}</div>
                    <div class="task-time">{{ formatTime(task.created_at) }}</div>
                  </div>
                  <div v-if="task.error_message" class="task-error">
                    <van-icon name="warning-o" />
                    {{ task.error_message }}
                  </div>
                  <div class="task-actions">
                    <van-button
                      v-if="task.status === 'failed'"
                      size="small"
                      type="primary"
                      :loading="task.retrying"
                      @click="retryTask(task)"
                    >
                      重试
                    </van-button>
                    <van-button
                      v-if="task.status === 'pending' || task.status === 'processing'"
                      size="small"
                      type="danger"
                      :loading="task.cancelling"
                      @click="cancelTask(task)"
                    >
                      取消
                    </van-button>
                  </div>
                </div>
              </van-list>
            </van-pull-refresh>
          </div>

          <!-- 队列配置 -->
          <div class="config-section">
            <div class="section-header">队列配置</div>
            <van-cell-group inset>
              <van-field
                v-model="queueConfig.max_concurrent"
                type="number"
                label="最大并发数"
                placeholder="请输入最大并发数"
                :rules="[{ required: true, message: '请输入最大并发数' }]"
              />
              <van-field
                v-model="queueConfig.max_retries"
                type="number"
                label="最大重试次数"
                placeholder="请输入最大重试次数"
                :rules="[{ required: true, message: '请输入最大重试次数' }]"
              />
              <van-field
                v-model="queueConfig.task_timeout"
                type="number"
                label="任务超时时间(秒)"
                placeholder="请输入超时时间"
                :rules="[{ required: true, message: '请输入超时时间' }]"
              />
            </van-cell-group>
            <div class="config-actions">
              <van-button type="primary" block :loading="savingQueueConfig" @click="saveQueueConfig">
                保存队列配置
              </van-button>
            </div>
          </div>
        </van-tab>
      </van-tabs>
    </div>

    <!-- 选择器弹出层 -->
    <van-popup v-model:show="showProviderPicker" position="bottom" round>
      <van-picker :columns="providerOptions" @confirm="onProviderConfirm" @cancel="showProviderPicker = false" />
    </van-popup>

    <van-popup v-model:show="showStrictnessPicker" position="bottom" round>
      <van-picker :columns="strictnessOptions" @confirm="onStrictnessConfirm" @cancel="showStrictnessPicker = false" />
    </van-popup>

    <van-popup v-model:show="showStylePicker" position="bottom" round>
      <van-picker :columns="styleOptions" @confirm="onStyleConfirm" @cancel="showStylePicker = false" />
    </van-popup>

    <van-popup v-model:show="showLengthPicker" position="bottom" round>
      <van-picker :columns="lengthOptions" @confirm="onLengthConfirm" @cancel="showLengthPicker = false" />
    </van-popup>

    <van-popup v-model:show="showAnalysisPicker" position="bottom" round>
      <van-picker :columns="analysisOptions" @confirm="onAnalysisConfirm" @cancel="showAnalysisPicker = false" />
    </van-popup>

    <van-popup v-model:show="showMixedPicker" position="bottom" round>
      <van-picker :columns="mixedModeOptions" @confirm="onMixedConfirm" @cancel="showMixedPicker = false" />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant';
import api from '@/api/index';

// 标签页
const activeTab = ref('config');

// 表单
const form = reactive({
  grading_mode: 'ai',
  ai_provider: 'deepseek',
  ai_model: '',
  ai_endpoint: '',
  ai_api_key: '',
  ai_temperature: 0.3,
  ai_timeout: 30000,
  prompt_strictness: 'medium',
  prompt_style: 'encouraging',
  prompt_comment_length: 'medium',
  prompt_encourage_ratio: 30,
  prompt_analysis_detail: 'medium',
  mixed_config: {
    choice: 'auto',
    multiple: 'auto',
    fill: 'ai',
    judgment: 'auto',
    subjective: 'manual'
  }
});

// 状态
const saving = ref(false);
const testing = ref(false);
const testResult = ref(null);
const configId = ref(null);

// 选择器
const showProviderPicker = ref(false);
const showStrictnessPicker = ref(false);
const showStylePicker = ref(false);
const showLengthPicker = ref(false);
const showAnalysisPicker = ref(false);
const showMixedPicker = ref(false);
const currentMixedType = ref('');

// 选项数据
const providerOptions = [
  { text: 'DeepSeek', value: 'deepseek' },
  { text: 'Ollama (本地)', value: 'ollama' }
];

const strictnessOptions = [
  { text: '严格', value: 'strict' },
  { text: '中等', value: 'medium' },
  { text: '宽松', value: 'loose' }
];

const styleOptions = [
  { text: '正式', value: 'formal' },
  { text: '鼓励型', value: 'encouraging' },
  { text: '轻松', value: 'casual' }
];

const lengthOptions = [
  { text: '简短', value: 'short' },
  { text: '中等', value: 'medium' },
  { text: '详细', value: 'detailed' }
];

const analysisOptions = [
  { text: '简要', value: 'brief' },
  { text: '中等', value: 'medium' },
  { text: '详细', value: 'detailed' }
];

const mixedModeOptions = [
  { text: '自动判定', value: 'auto' },
  { text: 'AI批改', value: 'ai' },
  { text: '手动批改', value: 'manual' },
];

// 计算属性
const providerText = computed(() => providerOptions.find(o => o.value === form.ai_provider)?.text || '');
const strictnessText = computed(() => strictnessOptions.find(o => o.value === form.prompt_strictness)?.text || '');
const styleText = computed(() => styleOptions.find(o => o.value === form.prompt_style)?.text || '');
const lengthText = computed(() => lengthOptions.find(o => o.value === form.prompt_comment_length)?.text || '');
const analysisText = computed(() => analysisOptions.find(o => o.value === form.prompt_analysis_detail)?.text || '');
const modelPlaceholder = computed(() => form.ai_provider === 'deepseek' ? 'deepseek-chat' : 'qwen2.5:7b');

const mixedText = computed(() => ({
  choice: mixedModeOptions.find(o => o.value === form.mixed_config.choice)?.text || '',
  multiple: mixedModeOptions.find(o => o.value === form.mixed_config.multiple)?.text || '',
  fill: mixedModeOptions.find(o => o.value === form.mixed_config.fill)?.text || '',
  judgment: mixedModeOptions.find(o => o.value === form.mixed_config.judgment)?.text || '',
  subjective: mixedModeOptions.find(o => o.value === form.mixed_config.subjective)?.text || ''
}));

// ========== 队列管理相关 ==========

// 队列统计
const queueStats = reactive({
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0
});

// 任务列表
const tasks = ref([]);
const taskFilter = ref('');
const taskLoading = ref(false);
const taskFinished = ref(false);
const taskRefreshing = ref(false);
const taskCurrentPage = ref(0);
const taskPageSize = 20;
const isTaskLoading = ref(false);

// 队列配置
const queueConfig = reactive({
  max_concurrent: '3',
  max_retries: '3',
  task_timeout: '300'
});
const savingQueueConfig = ref(false);

// 任务状态映射
const taskStatusMap = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消'
};

function getTaskStatusText(status) {
  return taskStatusMap[status] || status;
}

function getTaskStatusType(status) {
  const typeMap = {
    pending: 'warning',
    processing: 'primary',
    completed: 'success',
    failed: 'danger',
    cancelled: 'default'
  };
  return typeMap[status] || 'default';
}

// 格式化时间
function formatTime(timeStr) {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 加载队列统计
async function loadQueueStats() {
  try {
    const res = await api.get('/grading-queue/stats');
    if (res.code === 0 && res.data) {
      queueStats.pending = res.data.pending || 0;
      queueStats.processing = res.data.processing || 0;
      queueStats.completed = res.data.completed || 0;
      queueStats.failed = res.data.failed || 0;
    }
  } catch (err) {
    console.error('加载队列统计失败:', err);
  }
}

// 加载任务列表
async function loadTasks() {
  // 防止重复加载
  if (isTaskLoading.value) return;
  // 已加载完成，直接返回
  if (taskFinished.value) {
    taskLoading.value = false;
    return;
  }

  isTaskLoading.value = true;
  taskLoading.value = true;
  taskCurrentPage.value++;

  try {
    const params = {
      page: taskCurrentPage.value,
      pageSize: taskPageSize
    };
    if (taskFilter.value) {
      params.status = taskFilter.value;
    }
    const res = await api.get('/grading-queue/tasks', { params });
    if (res.code === 0) {
      const newTasks = (res.data.list || []).map(t => ({
        ...t,
        retrying: false,
        cancelling: false
      }));
      tasks.value.push(...newTasks);
      // 判断是否还有更多数据
      taskFinished.value = newTasks.length < taskPageSize;
    } else {
      // 接口返回错误，停止加载但不标记为完成
      console.error('加载任务列表失败:', res.message);
      taskCurrentPage.value--; // 回退页码
      taskFinished.value = false; // 允许重试
      showFailToast(res.message || '加载失败');
    }
  } catch (err) {
    console.error('加载任务列表异常:', err);
    taskCurrentPage.value--; // 回退页码，允许重试
    taskFinished.value = false; // 允许重试
    showFailToast(err.message || '加载任务列表失败');
  } finally {
    taskLoading.value = false;
    taskRefreshing.value = false;
    isTaskLoading.value = false;
  }
}

// 刷新任务列表
function onTaskRefresh() {
  taskRefreshing.value = true;
  taskCurrentPage.value = 0;
  tasks.value = [];
  taskFinished.value = false;
  isTaskLoading.value = false;
  taskLoading.value = false;
  loadQueueStats();
  loadTasks();
}

// 切换筛选
function changeTaskFilter(status) {
  taskFilter.value = status;
  taskCurrentPage.value = 0;
  tasks.value = [];
  taskFinished.value = false;
  isTaskLoading.value = false;
  taskLoading.value = false; // 重置加载状态
  loadQueueStats(); // 刷新统计数据
  // 使用 nextTick 确保 van-list 状态同步后再加载
  setTimeout(() => {
    loadTasks();
  }, 50);
}

// 重试任务
async function retryTask(task) {
  task.retrying = true;
  try {
    const res = await api.post(`/grading-queue/tasks/${task.id}/retry`);
    if (res.code === 0) {
      showSuccessToast('任务已重新加入队列');
      onTaskRefresh();
    } else {
      showFailToast(res.message || '重试失败');
    }
  } catch (err) {
    showFailToast(err.message || '重试失败');
  } finally {
    task.retrying = false;
  }
}

// 取消任务
async function cancelTask(task) {
  try {
    await showConfirmDialog({
      title: '确认取消',
      message: '确定要取消该批改任务吗？'
    });
    task.cancelling = true;
    const res = await api.post(`/grading-queue/tasks/${task.id}/cancel`);
    if (res.code === 0) {
      showSuccessToast('任务已取消');
      onTaskRefresh();
    } else {
      showFailToast(res.message || '取消失败');
    }
  } catch (err) {
    if (err !== 'cancel') {
      showFailToast(err.message || '取消失败');
    }
  } finally {
    task.cancelling = false;
  }
}

// 加载队列配置
async function loadQueueConfig() {
  try {
    const res = await api.get('/grading-queue/config');
    if (res.code === 0 && res.data) {
      queueConfig.max_concurrent = String(res.data.max_concurrent || '3');
      queueConfig.max_retries = String(res.data.max_retries || '3');
      queueConfig.task_timeout = String(res.data.task_timeout || '300');
    }
  } catch (err) {
    console.error('加载队列配置失败:', err);
  }
}

// 保存队列配置
async function saveQueueConfig() {
  savingQueueConfig.value = true;
  try {
    const data = {
      max_concurrent: parseInt(queueConfig.max_concurrent),
      max_retries: parseInt(queueConfig.max_retries),
      task_timeout: parseInt(queueConfig.task_timeout)
    };
    const res = await api.put('/grading-queue/config', data);
    if (res.code === 0) {
      showSuccessToast('队列配置保存成功');
    } else {
      showFailToast(res.message || '保存失败');
    }
  } catch (err) {
    showFailToast(err.message || '保存失败');
  } finally {
    savingQueueConfig.value = false;
  }
}

// 监听标签页切换
watch(activeTab, (newVal) => {
  if (newVal === 'queue') {
    loadQueueStats();
    loadQueueConfig();
    if (tasks.value.length === 0) {
      loadTasks();
    }
  }
});

// ========== 批改配置相关 ==========

// 加载配置
async function loadConfig() {
  try {
    const res = await api.get('/grading-config/default');
    if (res.code === 0 && res.data) {
      const config = res.data;
      configId.value = config.id || null;
      form.grading_mode = config.grading_mode || 'ai';
      form.ai_provider = config.ai_provider || 'deepseek';
      form.ai_model = config.ai_model || '';
      form.ai_endpoint = config.ai_endpoint || '';
      form.ai_api_key = config.ai_api_key || '';
      form.ai_temperature = config.ai_temperature || 0.3;
      form.ai_timeout = config.ai_timeout || 30000;
      form.prompt_strictness = config.prompt_strictness || 'medium';
      form.prompt_style = config.prompt_style || 'encouraging';
      form.prompt_comment_length = config.prompt_comment_length || 'medium';
      form.prompt_encourage_ratio = config.prompt_encourage_ratio || 30;
      form.prompt_analysis_detail = config.prompt_analysis_detail || 'medium';
      if (config.mixed_config) {
        form.mixed_config = { ...form.mixed_config, ...config.mixed_config };
      }
    }
  } catch (err) {
    console.error('加载配置失败:', err);
  }
}

// 保存配置
async function saveConfig() {
  saving.value = true;
  try {
    const data = { ...form, is_default: true };
    let res;
    if (configId.value) {
      res = await api.put(`/grading-config/${configId.value}`, data);
    } else {
      res = await api.post('/grading-config', { ...data, config_name: '系统批改配置' });
    }
    if (res.code === 0) {
      showSuccessToast('配置保存成功');
      if (res.data?.id) {
        configId.value = res.data.id;
      }
    } else {
      showFailToast(res.message || '保存失败');
    }
  } catch (err) {
    showFailToast(err.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

// 测试连接
async function testConnection() {
  testing.value = true;
  testResult.value = null;
  try {
    const res = await api.post('/grading-config/test', {
      ai_provider: form.ai_provider,
      ai_endpoint: form.ai_endpoint,
      ai_api_key: form.ai_api_key,
      ai_model: form.ai_model
    });
    if (res.code === 0) {
      testResult.value = res.data;
    } else {
      testResult.value = { success: false, message: res.message };
    }
  } catch (err) {
    testResult.value = { success: false, message: err.message };
  } finally {
    testing.value = false;
  }
}

// 选择器回调
function onProviderConfirm({ selectedOptions }) {
  form.ai_provider = selectedOptions[0]?.value || 'deepseek';
  showProviderPicker.value = false;
}

function onStrictnessConfirm({ selectedOptions }) {
  form.prompt_strictness = selectedOptions[0]?.value || 'medium';
  showStrictnessPicker.value = false;
}

function onStyleConfirm({ selectedOptions }) {
  form.prompt_style = selectedOptions[0]?.value || 'encouraging';
  showStylePicker.value = false;
}

function onLengthConfirm({ selectedOptions }) {
  form.prompt_comment_length = selectedOptions[0]?.value || 'medium';
  showLengthPicker.value = false;
}

function onAnalysisConfirm({ selectedOptions }) {
  form.prompt_analysis_detail = selectedOptions[0]?.value || 'medium';
  showAnalysisPicker.value = false;
}

function openMixedPicker(type) {
  currentMixedType.value = type;
  showMixedPicker.value = true;
}

function onMixedConfirm({ selectedOptions }) {
  form.mixed_config[currentMixedType.value] = selectedOptions[0]?.value || 'auto';
  showMixedPicker.value = false;
}

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.page-content {
  padding: 0;
  padding-bottom: 20px;
}

.config-section {
  background: #fff;
  border-radius: 12px;
  margin: 12px;
  overflow: hidden;
}

.section-header {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  padding: 12px 16px;
  background: #f7f8fa;
  border-bottom: 1px solid #ebedf0;
}

/* 批改模式选择 */
.mode-options {
  display: flex;
  padding: 16px;
  gap: 12px;
}

.mode-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  border: 2px solid #ebedf0;
  border-radius: 8px;
  font-size: 14px;
  color: #646566;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-option.active {
  border-color: #1989fa;
  color: #1989fa;
  background: #ecf5ff;
}

.mode-option .van-icon {
  font-size: 16px;
}

/* 输入框 */
.cell-input {
  border: none;
  outline: none;
  text-align: right;
  font-size: 14px;
  color: #323233;
  background: transparent;
  width: 150px;
}

.cell-input::placeholder {
  color: #c8c9cc;
}

/* 测试连接 */
.test-section {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
}

.test-result {
  font-size: 13px;
}

.test-result.success {
  color: #07c160;
}

.test-result.fail {
  color: #ee0a24;
}

/* 滑块 */
.slider-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-cell .van-slider {
  width: 100px;
}

.slider-value {
  font-size: 14px;
  color: #323233;
  min-width: 40px;
  text-align: right;
}

/* 模式说明 */
.mode-desc {
  background: transparent;
}

.desc-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: #fffbe8;
  border-radius: 8px;
  font-size: 13px;
  color: #ed6a0c;
  line-height: 1.5;
}

.desc-item .van-icon {
  margin-top: 2px;
}

/* 保存按钮 */
.save-section {
  margin-top: 24px;
  padding: 0 16px;
}

/* ========== 队列管理样式 ========== */

/* 统计卡片 */
.stats-section {
  padding: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #969799;
}

.stat-card.pending .stat-value {
  color: #ff976a;
}

.stat-card.processing .stat-value {
  color: #1989fa;
}

.stat-card.completed .stat-value {
  color: #07c160;
}

.stat-card.failed .stat-value {
  color: #ee0a24;
}

/* 筛选条件 */
.filter-section {
  background: #fff;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.filter-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-row::-webkit-scrollbar {
  display: none;
}

.filter-row :deep(.van-button) {
  flex-shrink: 0;
  padding: 0 12px;
}

/* 任务列表 */
.task-list {
  padding: 0 12px;
}

.task-item {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-student {
  font-size: 15px;
  font-weight: 500;
  color: #323233;
}

.task-info {
  margin-bottom: 8px;
}

.task-exam {
  font-size: 14px;
  color: #646566;
  margin-bottom: 4px;
}

.task-time {
  font-size: 12px;
  color: #969799;
}

.task-error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #ee0a24;
  background: #fff5f5;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 10px;
}

.task-error .van-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 队列配置 */
.config-actions {
  padding: 16px;
}
</style>
