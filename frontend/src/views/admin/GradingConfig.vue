<template>
  <div class="page">
    <!-- PC版本 -->
    <div v-if="isPC" class="grading-config-pc">
      <div class="pc-header">
        <h2 class="pc-title">批改管理</h2>
      </div>

      <el-tabs v-model="activeTab" class="pc-tabs">
        <el-tab-pane label="批改配置" name="config">
          <!-- 批改模式 -->
          <el-card class="pc-section-card" shadow="hover">
            <template #header>
              <div class="pc-section-header">
                <el-icon :size="20"><Setting /></el-icon>
                <span>批改模式</span>
              </div>
            </template>
            <el-radio-group v-model="form.grading_mode" class="mode-radio-group">
              <el-radio-button value="ai">AI批改</el-radio-button>
              <el-radio-button value="mixed">混合模式</el-radio-button>
            </el-radio-group>
          </el-card>

          <!-- AI批改设置 -->
          <el-card class="pc-section-card" shadow="hover">
            <template #header>
              <div class="pc-section-header">
                <el-icon :size="20"><Cpu /></el-icon>
                <span>AI批改设置</span>
              </div>
            </template>
            <el-form :model="form" label-width="100px" class="pc-form">
              <el-form-item label="AI提供商">
                <el-select v-model="form.ai_provider" placeholder="请选择" style="width: 240px">
                  <el-option label="DeepSeek" value="deepseek" />
                  <el-option label="Ollama (本地)" value="ollama" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="form.ai_provider === 'ollama'" label="API地址">
                <el-input v-model="form.ai_endpoint" placeholder="http://localhost:11434" style="width: 360px" />
              </el-form-item>
              <el-form-item v-if="form.ai_provider === 'deepseek'" label="API密钥">
                <el-input v-model="form.ai_api_key" type="password" placeholder="请输入密钥" show-password style="width: 360px" />
              </el-form-item>
              <el-form-item label="模型">
                <el-input v-model="form.ai_model" :placeholder="modelPlaceholder" style="width: 360px" />
              </el-form-item>
              <el-form-item>
                <el-button :loading="testing" @click="testConnection">测试连接</el-button>
                <span v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'fail']">
                  {{ testResult.message }}
                </span>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 提示词参数 -->
          <el-card class="pc-section-card" shadow="hover">
            <template #header>
              <div class="pc-section-header">
                <el-icon :size="20"><EditPen /></el-icon>
                <span>提示词参数</span>
              </div>
            </template>
            <el-form :model="form" label-width="100px" class="pc-form">
              <el-form-item label="评分严格度">
                <el-select v-model="form.prompt_strictness" placeholder="请选择" style="width: 200px">
                  <el-option label="严格" value="strict" />
                  <el-option label="中等" value="medium" />
                  <el-option label="宽松" value="loose" />
                </el-select>
              </el-form-item>
              <el-form-item label="语言风格">
                <el-select v-model="form.prompt_style" placeholder="请选择" style="width: 200px">
                  <el-option label="正式" value="formal" />
                  <el-option label="鼓励型" value="encouraging" />
                  <el-option label="轻松" value="casual" />
                </el-select>
              </el-form-item>
              <el-form-item label="评语长度">
                <el-select v-model="form.prompt_comment_length" placeholder="请选择" style="width: 200px">
                  <el-option label="简短" value="short" />
                  <el-option label="中等" value="medium" />
                  <el-option label="详细" value="detailed" />
                </el-select>
              </el-form-item>
              <el-form-item label="鼓励性语言">
                <el-slider v-model="form.prompt_encourage_ratio" :min="0" :max="100" :format-tooltip="(val) => val + '%'" style="width: 300px" />
              </el-form-item>
              <el-form-item label="错题分析">
                <el-select v-model="form.prompt_analysis_detail" placeholder="请选择" style="width: 200px">
                  <el-option label="简要" value="brief" />
                  <el-option label="中等" value="medium" />
                  <el-option label="详细" value="detailed" />
                </el-select>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 混合模式配置 -->
          <el-card v-if="form.grading_mode === 'mixed'" class="pc-section-card" shadow="hover">
            <template #header>
              <div class="pc-section-header">
                <el-icon :size="20"><Grid /></el-icon>
                <span>混合模式配置</span>
              </div>
            </template>
            <el-table :data="mixedTableData" border stripe>
              <el-table-column prop="label" label="题型" width="150" />
              <el-table-column label="批改方式">
                <template #default="{ row }">
                  <el-select v-model="form.mixed_config[row.key]" placeholder="请选择" style="width: 160px">
                    <el-option label="自动判定" value="auto" />
                    <el-option label="AI批改" value="ai" />
                    <el-option label="手动批改" value="manual" />
                  </el-select>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <!-- 模式说明 -->
          <div class="mode-info-card">
            <el-icon :size="18"><InfoFilled /></el-icon>
            <span v-if="form.grading_mode === 'ai'">AI批改：客观题自动判定，主观题由AI智能批改</span>
            <span v-else>混合模式：按题型自定义批改方式，可选择自动判定、AI批改或手动批改</span>
          </div>

          <!-- 保存按钮 -->
          <div class="save-section-pc">
            <el-button type="primary" size="large" :loading="saving" @click="saveConfig">
              <el-icon><Check /></el-icon>
              保存配置
            </el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="队列管理" name="queue">
          <!-- 队列状态统计 -->
          <el-card class="pc-section-card" shadow="hover">
            <template #header>
              <div class="pc-section-header">
                <el-icon :size="20"><DataLine /></el-icon>
                <span>队列状态</span>
              </div>
            </template>
            <div class="stats-grid-pc">
              <div class="stat-card-pc pending">
                <div class="stat-icon">
                  <el-icon :size="28"><Clock /></el-icon>
                </div>
                <div class="stat-body">
                  <div class="stat-value">{{ queueStats.pending }}</div>
                  <div class="stat-label">待处理</div>
                </div>
              </div>
              <div class="stat-card-pc processing">
                <div class="stat-icon">
                  <el-icon :size="28"><Loading /></el-icon>
                </div>
                <div class="stat-body">
                  <div class="stat-value">{{ queueStats.processing }}</div>
                  <div class="stat-label">处理中</div>
                </div>
              </div>
              <div class="stat-card-pc completed">
                <div class="stat-icon">
                  <el-icon :size="28"><CircleCheck /></el-icon>
                </div>
                <div class="stat-body">
                  <div class="stat-value">{{ queueStats.completed }}</div>
                  <div class="stat-label">已完成</div>
                </div>
              </div>
              <div class="stat-card-pc failed">
                <div class="stat-icon">
                  <el-icon :size="28"><CircleClose /></el-icon>
                </div>
                <div class="stat-body">
                  <div class="stat-value">{{ queueStats.failed }}</div>
                  <div class="stat-label">失败</div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 筛选条件 -->
          <el-card class="pc-section-card" shadow="hover">
            <template #header>
              <div class="pc-section-header">
                <el-icon :size="20"><Filter /></el-icon>
                <span>任务筛选</span>
              </div>
            </template>
            <el-form :inline="true" class="filter-form-pc">
              <el-form-item label="状态">
                <el-select v-model="taskFilter" placeholder="全部" clearable @change="changeTaskFilter" style="width: 160px">
                  <el-option label="全部" value="" />
                  <el-option label="待处理" value="pending" />
                  <el-option label="处理中" value="processing" />
                  <el-option label="已完成" value="completed" />
                  <el-option label="失败" value="failed" />
                </el-select>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 任务列表 -->
          <el-card class="pc-section-card" shadow="hover">
            <template #header>
              <div class="pc-section-header">
                <el-icon :size="20"><List /></el-icon>
                <span>任务列表</span>
              </div>
            </template>
            <el-table :data="tasks" border stripe v-loading="taskLoading">
              <el-table-column prop="student_name" label="学生" width="120" />
              <el-table-column prop="exam_title" label="考试任务" min-width="200" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getTaskStatusType(row.status)" size="small">
                    {{ getTaskStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="创建时间" width="180">
                <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
              </el-table-column>
              <el-table-column prop="error_message" label="错误信息" min-width="200">
                <template #default="{ row }">
                  <span v-if="row.error_message" class="error-text">{{ row.error_message }}</span>
                  <span v-else class="no-data">-</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button v-if="row.status === 'failed'" type="primary" link size="small" :loading="row.retrying" @click="retryTask(row)">重试</el-button>
                  <el-button v-if="row.status === 'pending' || row.status === 'processing'" type="danger" link size="small" :loading="row.cancelling" @click="cancelTask(row)">取消</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-model:current-page="taskCurrentPage"
              :page-size="taskPageSize"
              :total="taskTotal"
              layout="total, prev, pager, next"
              class="pagination-pc"
              @current-change="handleTaskPageChange"
            />
          </el-card>

          <!-- 队列配置 -->
          <el-card class="pc-section-card" shadow="hover">
            <template #header>
              <div class="pc-section-header">
                <el-icon :size="20"><Tools /></el-icon>
                <span>队列配置</span>
              </div>
            </template>
            <el-form :model="queueConfig" label-width="120px" class="pc-form">
              <el-form-item label="最大并发数">
                <el-input-number v-model="queueConfig.max_concurrent" :min="1" :max="10" />
              </el-form-item>
              <el-form-item label="最大重试次数">
                <el-input-number v-model="queueConfig.max_retries" :min="0" :max="10" />
              </el-form-item>
              <el-form-item label="任务超时时间(秒)">
                <el-input-number v-model="queueConfig.task_timeout" :min="60" :max="3600" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="savingQueueConfig" @click="saveQueueConfig">
                  <el-icon><Check /></el-icon>
                  保存队列配置
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 移动端版本 -->
    <div v-else>
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
                      <van-slider v-model="form.prompt_encourage_ratio" :min="0" :max="100" active-color="var(--primary-color, #ff9800)" />
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
                  <div class="stat-icon">
                    <van-icon name="clock-o" />
                  </div>
                  <div class="stat-body">
                    <div class="stat-value">{{ queueStats.pending }}</div>
                    <div class="stat-label">待处理</div>
                  </div>
                </div>
                <div class="stat-card processing">
                  <div class="stat-icon">
                    <van-icon name="replay" />
                  </div>
                  <div class="stat-body">
                    <div class="stat-value">{{ queueStats.processing }}</div>
                    <div class="stat-label">处理中</div>
                  </div>
                </div>
                <div class="stat-card completed">
                  <div class="stat-icon">
                    <van-icon name="passed" />
                  </div>
                  <div class="stat-body">
                    <div class="stat-value">{{ queueStats.completed }}</div>
                    <div class="stat-label">已完成</div>
                  </div>
                </div>
                <div class="stat-card failed">
                  <div class="stat-icon">
                    <van-icon name="close" />
                  </div>
                  <div class="stat-body">
                    <div class="stat-value">{{ queueStats.failed }}</div>
                    <div class="stat-label">失败</div>
                  </div>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Setting, Cpu, EditPen, Grid, InfoFilled, Check, DataLine, Clock, Loading, CircleCheck, CircleClose, Filter, List, Tools } from '@element-plus/icons-vue';
import api from '@/api/index';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();

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

// PC端混合模式表格数据
const mixedTableData = computed(() => [
  { key: 'choice', label: '单选题' },
  { key: 'multiple', label: '多选题' },
  { key: 'fill', label: '填空题' },
  { key: 'judgment', label: '判断题' },
  { key: 'subjective', label: '主观题' }
]);

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
const taskTotal = ref(0);
const isTaskLoading = ref(false);

// 队列配置
const queueConfig = reactive({
  max_concurrent: 3,
  max_retries: 3,
  task_timeout: 300
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
    processing: '',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  };
  return typeMap[status] || 'info';
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
      taskTotal.value = res.data.total || tasks.value.length;
      // 判断是否还有更多数据
      taskFinished.value = newTasks.length < taskPageSize;
    } else {
      // 接口返回错误，停止加载但不标记为完成
      console.error('加载任务列表失败:', res.message);
      taskCurrentPage.value--; // 回退页码
      taskFinished.value = false; // 允许重试
      const errMsg = res.message || '加载失败';
      if (isPC.value) {
        ElMessage.error(errMsg);
      } else {
        showFailToast(errMsg);
      }
    }
  } catch (err) {
    console.error('加载任务列表异常:', err);
    taskCurrentPage.value--; // 回退页码，允许重试
    taskFinished.value = false; // 允许重试
    const errMsg = err.message || '加载任务列表失败';
    if (isPC.value) {
      ElMessage.error(errMsg);
    } else {
      showFailToast(errMsg);
    }
  } finally {
    taskLoading.value = false;
    taskRefreshing.value = false;
    isTaskLoading.value = false;
  }
}

// PC端分页变化
async function handleTaskPageChange(page) {
  taskCurrentPage.value = page;
  tasks.value = [];
  taskFinished.value = false;
  isTaskLoading.value = false;
  taskLoading.value = false;
  await loadTasksForPage(page);
}

// 加载指定页任务
async function loadTasksForPage(page) {
  if (isTaskLoading.value) return;
  isTaskLoading.value = true;
  taskLoading.value = true;

  try {
    const params = {
      page: page,
      pageSize: taskPageSize
    };
    if (taskFilter.value) {
      params.status = taskFilter.value;
    }
    const res = await api.get('/grading-queue/tasks', { params });
    if (res.code === 0) {
      tasks.value = (res.data.list || []).map(t => ({
        ...t,
        retrying: false,
        cancelling: false
      }));
      taskTotal.value = res.data.total || tasks.value.length;
      taskFinished.value = tasks.value.length < taskPageSize;
    } else {
      const errMsg = res.message || '加载失败';
      if (isPC.value) {
        ElMessage.error(errMsg);
      } else {
        showFailToast(errMsg);
      }
    }
  } catch (err) {
    const errMsg = err.message || '加载任务列表失败';
    if (isPC.value) {
      ElMessage.error(errMsg);
    } else {
      showFailToast(errMsg);
    }
  } finally {
    taskLoading.value = false;
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

  if (isPC.value) {
    // PC端直接加载第一页
    taskCurrentPage.value = 1;
    loadTasksForPage(1);
  } else {
    // 移动端使用 nextTick 确保 van-list 状态同步后再加载
    setTimeout(() => {
      loadTasks();
    }, 50);
  }
}

// 重试任务
async function retryTask(task) {
  task.retrying = true;
  try {
    const res = await api.post(`/grading-queue/tasks/${task.id}/retry`);
    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success('任务已重新加入队列');
      } else {
        showSuccessToast('任务已重新加入队列');
      }
      onTaskRefresh();
    } else {
      const errMsg = res.message || '重试失败';
      if (isPC.value) {
        ElMessage.error(errMsg);
      } else {
        showFailToast(errMsg);
      }
    }
  } catch (err) {
    const errMsg = err.message || '重试失败';
    if (isPC.value) {
      ElMessage.error(errMsg);
    } else {
      showFailToast(errMsg);
    }
  } finally {
    task.retrying = false;
  }
}

// 取消任务
async function cancelTask(task) {
  try {
    if (isPC.value) {
      await ElMessageBox.confirm('确定要取消该批改任务吗？', '确认取消');
    } else {
      await showConfirmDialog({
        title: '确认取消',
        message: '确定要取消该批改任务吗？'
      });
    }
    task.cancelling = true;
    const res = await api.post(`/grading-queue/tasks/${task.id}/cancel`);
    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success('任务已取消');
      } else {
        showSuccessToast('任务已取消');
      }
      onTaskRefresh();
    } else {
      const errMsg = res.message || '取消失败';
      if (isPC.value) {
        ElMessage.error(errMsg);
      } else {
        showFailToast(errMsg);
      }
    }
  } catch (err) {
    if (err !== 'cancel') {
      const errMsg = err.message || '取消失败';
      if (isPC.value) {
        ElMessage.error(errMsg);
      } else {
        showFailToast(errMsg);
      }
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
      queueConfig.max_concurrent = res.data.max_concurrent || 3;
      queueConfig.max_retries = res.data.max_retries || 3;
      queueConfig.task_timeout = res.data.task_timeout || 300;
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
      if (isPC.value) {
        ElMessage.success('队列配置保存成功');
      } else {
        showSuccessToast('队列配置保存成功');
      }
    } else {
      const errMsg = res.message || '保存失败';
      if (isPC.value) {
        ElMessage.error(errMsg);
      } else {
        showFailToast(errMsg);
      }
    }
  } catch (err) {
    const errMsg = err.message || '保存失败';
    if (isPC.value) {
      ElMessage.error(errMsg);
    } else {
      showFailToast(errMsg);
    }
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
      if (isPC.value) {
        taskCurrentPage.value = 1;
        loadTasksForPage(1);
      } else {
        loadTasks();
      }
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
      if (isPC.value) {
        ElMessage.success('配置保存成功');
      } else {
        showSuccessToast('配置保存成功');
      }
      if (res.data?.id) {
        configId.value = res.data.id;
      }
    } else {
      const errMsg = res.message || '保存失败';
      if (isPC.value) {
        ElMessage.error(errMsg);
      } else {
        showFailToast(errMsg);
      }
    }
  } catch (err) {
    const errMsg = err.message || '保存失败';
    if (isPC.value) {
      ElMessage.error(errMsg);
    } else {
      showFailToast(errMsg);
    }
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
/* ========== PC端样式 ========== */
.grading-config-pc {
  padding: var(--spacing-lg, 24px);
  min-height: 100vh;
  background: var(--bg-color, #f5f7fa);
}

.pc-header {
  margin-bottom: var(--spacing-lg, 24px);
}

.pc-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color-primary, #303133);
  margin: 0;
}

.pc-tabs {
  background: var(--fill-color-blank, #ffffff);
  border-radius: var(--border-radius-large, 12px);
}

.pc-section-card {
  margin-bottom: var(--spacing-md, 16px);
  border-radius: var(--border-radius-large, 12px);
}

.pc-section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 8px);
  font-size: var(--font-size-medium, 16px);
  font-weight: 500;
  color: var(--text-color-primary, #303133);
}

.pc-form {
  max-width: 600px;
  padding: var(--spacing-sm, 8px) 0;
}

.mode-radio-group {
  display: flex;
  gap: var(--spacing-sm, 12px);
}

.test-result {
  margin-left: var(--spacing-sm, 12px);
  font-size: var(--font-size-base, 14px);
}

.test-result.success {
  color: var(--color-success, #67c23a);
}

.test-result.fail {
  color: var(--color-danger, #f56c6c);
}

/* 模式说明卡片 */
.mode-info-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 10px);
  padding: var(--spacing-md, 16px) var(--spacing-lg, 20px);
  background: linear-gradient(135deg, var(--color-primary-light-9, #ecf5ff), var(--color-primary-light-8, #d9ecff));
  border-radius: var(--border-radius-large, 12px);
  margin-bottom: var(--spacing-md, 16px);
  color: var(--color-primary, #409eff);
  font-size: var(--font-size-base, 14px);
}

/* 保存区域 */
.save-section-pc {
  display: flex;
  justify-content: center;
  padding: var(--spacing-lg, 24px) 0;
  border-top: 1px solid var(--border-color-lighter, #ebeef5);
  margin-top: var(--spacing-md, 16px);
}

/* PC端统计卡片 */
.stats-grid-pc {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md, 16px);
}

.stat-card-pc {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 16px);
  padding: var(--spacing-lg, 20px);
  background: var(--fill-color-blank, #ffffff);
  border-radius: var(--border-radius-large, 12px);
  box-shadow: var(--box-shadow-light, 0 2px 8px rgba(0, 0, 0, 0.06));
  transition: all var(--transition-duration, 0.3s) var(--transition-timing-function, cubic-bezier(0.4, 0, 0.2, 1));
  position: relative;
  overflow: hidden;
}

.stat-card-pc::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
}

.stat-card-pc.pending::before {
  background: linear-gradient(180deg, var(--color-warning, #e6a23c), #f3d19e);
}

.stat-card-pc.processing::before {
  background: linear-gradient(180deg, var(--color-primary, #409eff), var(--color-primary-light-3, #79bbff));
}

.stat-card-pc.completed::before {
  background: linear-gradient(180deg, var(--color-success, #67c23a), #85ce61);
}

.stat-card-pc.failed::before {
  background: linear-gradient(180deg, var(--color-danger, #f56c6c), #f89898);
}

.stat-card-pc:hover {
  transform: translateY(-2px);
  box-shadow: var(--box-shadow, 0 4px 12px rgba(0, 0, 0, 0.1));
}

.stat-card-pc .stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-large, 12px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card-pc.pending .stat-icon {
  background: linear-gradient(135deg, var(--color-warning-light-9, #fff7e6), var(--color-warning-light-7, #ffe7ba));
  color: var(--color-warning, #e6a23c);
}

.stat-card-pc.processing .stat-icon {
  background: linear-gradient(135deg, var(--color-primary-light-9, #ecf5ff), var(--color-primary-light-7, #c6e2ff));
  color: var(--color-primary, #409eff);
}

.stat-card-pc.completed .stat-icon {
  background: linear-gradient(135deg, var(--color-success-light-9, #e8f5e9), var(--color-success-light-7, #c8e6c9));
  color: var(--color-success, #67c23a);
}

.stat-card-pc.failed .stat-icon {
  background: linear-gradient(135deg, var(--color-danger-light-9, #ffebee), var(--color-danger-light-7, #ffcdd2));
  color: var(--color-danger, #f56c6c);
}

.stat-card-pc .stat-body {
  flex: 1;
}

.stat-card-pc .stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color-primary, #303133);
  line-height: 1.2;
}

.stat-card-pc .stat-label {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-secondary, #909399);
  margin-top: 4px;
}

/* PC端筛选表单 */
.filter-form-pc {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md, 16px);
}

/* PC端分页 */
.pagination-pc {
  margin-top: var(--spacing-md, 16px);
  display: flex;
  justify-content: flex-end;
}

.error-text {
  color: var(--color-danger, #f56c6c);
}

.no-data {
  color: var(--text-color-placeholder, #c0c4cc);
}

/* ========== 移动端样式 ========== */
.page-content {
  padding: 0;
  padding-bottom: var(--spacing-lg, 20px);
}

.config-section {
  background: var(--fill-color-blank, #ffffff);
  border-radius: var(--border-radius-large, 12px);
  margin: var(--spacing-sm, 12px);
  overflow: hidden;
  box-shadow: var(--box-shadow-lighter, 0 1px 4px rgba(0, 0, 0, 0.04));
}

.section-header {
  font-size: var(--font-size-base, 14px);
  font-weight: 500;
  color: var(--text-color-primary, #323233);
  padding: var(--spacing-sm, 12px) var(--spacing-md, 16px);
  background: var(--fill-color, #f7f8fa);
  border-bottom: 1px solid var(--border-color, #ebedf0);
}

/* 批改模式选择 */
.mode-options {
  display: flex;
  padding: var(--spacing-md, 16px);
  gap: var(--spacing-sm, 12px);
}

.mode-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: var(--spacing-sm, 12px) var(--spacing-xs, 8px);
  border: 2px solid var(--border-color, #ebedf0);
  border-radius: var(--border-radius-large, 8px);
  font-size: var(--font-size-base, 14px);
  color: var(--text-color-secondary, #646566);
  cursor: pointer;
  transition: all var(--transition-duration, 0.2s) var(--transition-timing-function, ease);
}

.mode-option.active {
  border-color: var(--primary-color, #ff9800);
  color: var(--primary-color, #ff9800);
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
}

.mode-option .van-icon {
  font-size: 16px;
}

/* 输入框 */
.cell-input {
  border: none;
  outline: none;
  text-align: right;
  font-size: var(--font-size-base, 14px);
  color: var(--text-color-primary, #323233);
  background: transparent;
  width: 150px;
}

.cell-input::placeholder {
  color: var(--text-color-placeholder, #c8c9cc);
}

/* 测试连接 */
.test-section {
  padding: var(--spacing-sm, 12px) var(--spacing-md, 16px);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 12px);
  background: var(--fill-color-blank, #ffffff);
}

.test-result {
  font-size: var(--font-size-small, 13px);
}

.test-result.success {
  color: var(--success-color, #07c160);
}

.test-result.fail {
  color: var(--danger-color, #ee0a24);
}

/* 滑块 */
.slider-cell {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 12px);
}

.slider-cell .van-slider {
  width: 100px;
}

.slider-value {
  font-size: var(--font-size-base, 14px);
  color: var(--text-color-primary, #323233);
  min-width: 40px;
  text-align: right;
}

/* 模式说明 */
.mode-desc {
  background: transparent;
  box-shadow: none;
}

.desc-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-xs, 8px);
  padding: var(--spacing-sm, 12px) var(--spacing-md, 16px);
  background: linear-gradient(135deg, #fffbe8, #fff8e1);
  border-radius: var(--border-radius-large, 8px);
  font-size: var(--font-size-small, 13px);
  color: var(--color-warning, #ed6a0c);
  line-height: 1.5;
}

.desc-item .van-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

/* 保存按钮 */
.save-section {
  margin-top: var(--spacing-lg, 24px);
  padding: 0 var(--spacing-md, 16px);
}

/* ========== 队列管理样式 ========== */

/* 统计卡片 */
.stats-section {
  padding: var(--spacing-sm, 12px);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-xs, 10px);
}

.stat-card {
  background: var(--fill-color-blank, #ffffff);
  border-radius: var(--border-radius-large, 12px);
  padding: var(--spacing-md, 16px) var(--spacing-xs, 8px);
  text-align: center;
  box-shadow: var(--box-shadow-lighter, 0 2px 8px rgba(0, 0, 0, 0.04));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs, 8px);
}

.stat-card .stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.stat-card.pending .stat-icon {
  background: linear-gradient(135deg, var(--color-warning-light-9, #fff7e6), var(--color-warning-light-7, #ffe7ba));
  color: var(--color-warning, #ff976a);
}

.stat-card.processing .stat-icon {
  background: linear-gradient(135deg, var(--color-primary-light-9, #ecf5ff), var(--color-primary-light-7, #c6e2ff));
  color: var(--color-primary, #1989fa);
}

.stat-card.completed .stat-icon {
  background: linear-gradient(135deg, var(--color-success-light-9, #e8f5e9), var(--color-success-light-7, #c8e6c9));
  color: var(--color-success, #07c160);
}

.stat-card.failed .stat-icon {
  background: linear-gradient(135deg, var(--color-danger-light-9, #ffebee), var(--color-danger-light-7, #ffcdd2));
  color: var(--color-danger, #ee0a24);
}

.stat-card .stat-body {
  flex: 1;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-card.pending .stat-value {
  color: var(--color-warning, #ff976a);
}

.stat-card.processing .stat-value {
  color: var(--color-primary, #1989fa);
}

.stat-card.completed .stat-value {
  color: var(--color-success, #07c160);
}

.stat-card.failed .stat-value {
  color: var(--color-danger, #ee0a24);
}

.stat-label {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-secondary, #969799);
  margin-top: 4px;
}

/* 筛选条件 */
.filter-section {
  background: var(--fill-color-blank, #ffffff);
  padding: var(--spacing-sm, 10px) var(--spacing-sm, 12px);
  margin-bottom: var(--spacing-xs, 10px);
}

.filter-row {
  display: flex;
  gap: var(--spacing-xs, 8px);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-row::-webkit-scrollbar {
  display: none;
}

.filter-row :deep(.van-button) {
  flex-shrink: 0;
  padding: 0 var(--spacing-sm, 12px);
}

/* 任务列表 */
.task-list {
  padding: 0 var(--spacing-sm, 12px);
}

.task-item {
  background: var(--fill-color-blank, #ffffff);
  border-radius: var(--border-radius-large, 12px);
  padding: var(--spacing-sm, 14px) var(--spacing-md, 16px);
  margin-bottom: var(--spacing-xs, 10px);
  box-shadow: var(--box-shadow-lighter, 0 1px 4px rgba(0, 0, 0, 0.04));
  transition: all var(--transition-duration, 0.2s) var(--transition-timing-function, ease);
}

.task-item:active {
  transform: scale(0.98);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs, 8px);
}

.task-student {
  font-size: var(--font-size-medium, 15px);
  font-weight: 500;
  color: var(--text-color-primary, #323233);
}

.task-info {
  margin-bottom: var(--spacing-xs, 8px);
}

.task-exam {
  font-size: var(--font-size-base, 14px);
  color: var(--text-color-secondary, #646566);
  margin-bottom: 4px;
}

.task-time {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-placeholder, #969799);
}

.task-error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: var(--font-size-extra-small, 12px);
  color: var(--color-danger, #ee0a24);
  background: linear-gradient(135deg, var(--color-danger-light-9, #fff5f5), var(--color-danger-light-7, #ffebee));
  padding: var(--spacing-xs, 8px) var(--spacing-sm, 10px);
  border-radius: var(--border-radius-base, 6px);
  margin-bottom: var(--spacing-sm, 10px);
}

.task-error .van-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm, 10px);
}

/* 队列配置 */
.config-actions {
  padding: var(--spacing-md, 16px);
}
</style>
