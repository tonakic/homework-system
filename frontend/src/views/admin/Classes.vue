<template>
  <!-- PC 版本 -->
  <div v-if="isPC" class="classes-pc">
    <div class="pc-header">
      <h2 class="pc-title">班级管理</h2>
      <el-button type="primary" @click="openAddPopup">
        <el-icon><Plus /></el-icon>
        新增班级
      </el-button>
    </div>

    <div class="pc-content">
      <!-- 统计卡片 -->
      <div class="pc-stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-icon">
            <el-icon :size="32"><School /></el-icon>
          </div>
          <div class="stat-body">
            <div class="stat-value">{{ totalClasses }}</div>
            <div class="stat-label">班级总数</div>
          </div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-icon">
            <el-icon :size="32"><User /></el-icon>
          </div>
          <div class="stat-body">
            <div class="stat-value">{{ totalStudents }}</div>
            <div class="stat-label">学生总数</div>
          </div>
        </div>
      </div>

      <!-- 筛选区域 -->
      <div class="pc-filter-card">
        <el-select
          v-model="selectedGrade"
          placeholder="选择年级"
          clearable
          @change="loadClassStats"
          style="width: 200px"
        >
          <el-option
            v-for="grade in gradeList"
            :key="grade"
            :label="grade"
            :value="grade"
          />
        </el-select>
      </div>

      <!-- 班级列表 -->
      <div class="pc-table-card">
        <el-table :data="classStats" style="width: 100%" v-loading="loading">
          <el-table-column prop="class_name" label="班级名称" min-width="150" />
          <el-table-column prop="grade" label="年级" width="120" />
          <el-table-column prop="student_count" label="学生人数" width="120" align="center">
            <template #default="{ row }">
              <span class="student-count-badge">{{ row.student_count }}人</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="showClassDetail(row)">详情</el-button>
              <el-button type="primary" link size="small" @click="editClass(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="deleteClass(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pc-pagination" v-if="total > 0">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 新增/编辑班级弹窗 -->
    <el-dialog
      v-model="showAddPopup"
      :title="editingClass ? '编辑班级' : '新增班级'"
      width="500px"
      destroy-on-close
      class="class-dialog"
    >
      <el-form :model="classForm" label-width="80px">
        <el-form-item label="年级" required>
          <el-select v-model="classForm.grade" placeholder="请选择年级" style="width: 100%">
            <el-option
              v-for="grade in gradeList"
              :key="grade"
              :label="grade"
              :value="grade"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="班级名称" required>
          <el-input v-model="classForm.class_name" placeholder="如: 1班、2班" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeAddPopup">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveClass">保存</el-button>
      </template>
    </el-dialog>

    <!-- 班级详情弹窗 -->
    <el-dialog
      v-model="showDetailPopup"
      :title="currentClass ? currentClass.class_name + ' 详情' : '班级详情'"
      width="600px"
      destroy-on-close
      class="class-dialog"
    >
      <div v-if="currentClass" class="pc-detail-content">
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <span class="detail-label">班级名称</span>
            <span class="detail-value">{{ currentClass.class_name }}</span>
          </div>
          <div class="detail-info-item">
            <span class="detail-label">年级</span>
            <span class="detail-value">{{ currentClass.grade }}</span>
          </div>
          <div class="detail-info-item">
            <span class="detail-label">学生人数</span>
            <span class="detail-value highlight">{{ currentClass.student_count }}人</span>
          </div>
        </div>

        <div class="pc-students-section">
          <h4 class="section-title">班级学生</h4>
          <el-table :data="currentClassStudents" style="width: 100%" max-height="300">
            <el-table-column prop="student_no" label="学号" width="120" />
            <el-table-column prop="name" label="姓名" />
          </el-table>
          <div v-if="currentClassStudents.length === 0" class="empty-state">
            <el-icon :size="48"><School /></el-icon>
            <p>暂无学生</p>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>

  <!-- 移动端版本 -->
  <div v-else class="page">
    <van-nav-bar title="班级管理" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="plus" size="20" @click="showAddPopup = true" />
      </template>
    </van-nav-bar>

    <div class="page-content">
      <!-- 班级统计 -->
      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-value">{{ totalClasses }}</span>
          <span class="stat-label">班级总数</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ totalStudents }}</span>
          <span class="stat-label">学生总数</span>
        </div>
      </div>

      <!-- 年级筛选 -->
      <div class="filter-section">
        <div class="filter-buttons">
          <van-button
            size="small"
            :type="selectedGrade ? 'primary' : 'default'"
            @click="showGradeFilterPicker = true"
          >
            {{ selectedGrade || '全部年级' }}
            <van-icon name="arrow-down" />
          </van-button>
        </div>
      </div>

      <!-- 年级筛选弹出层 -->
      <van-popup v-model:show="showGradeFilterPicker" position="bottom" round>
        <van-picker
          :columns="gradeOptions"
          @confirm="onGradeFilterConfirm"
          @cancel="showGradeFilterPicker = false"
        />
      </van-popup>

      <!-- 班级列表 -->
      <div class="class-list">
        <div 
          v-for="(item, index) in classStats" 
          :key="item.class_name" 
          class="class-card"
          @click="showClassDetail(item)"
        >
          <div class="class-card-header">
            <div class="class-icon">
              <el-icon><School /></el-icon>
            </div>
            <div class="class-info">
              <span class="class-name">{{ item.class_name }}</span>
              <span class="class-grade">{{ item.grade }}</span>
            </div>
            <div class="class-student-count">
              <span class="count-number">{{ item.student_count }}</span>
              <span class="count-label">人</span>
            </div>
          </div>
          <div class="class-card-actions" @click.stop>
            <van-button size="mini" type="primary" plain @click="editClass(item)">编辑</van-button>
            <van-button size="mini" type="danger" plain @click="deleteClass(item)">删除</van-button>
          </div>
        </div>
        <div v-if="classStats.length === 0" class="empty-state">
          <el-icon :size="48"><School /></el-icon>
          <p>暂无班级数据</p>
        </div>
      </div>
    </div>

    <!-- 新增班级弹窗 -->
    <van-popup v-model:show="showAddPopup" position="bottom" round style="height: 40%">
      <div class="add-popup">
        <div class="popup-header">
          <span class="cancel-btn" @click="closeAddPopup">取消</span>
          <span class="popup-title">{{ editingClass ? '编辑班级' : '新增班级' }}</span>
          <van-button type="primary" size="small" :loading="saving" @click="saveClass">保存</van-button>
        </div>
        <div class="form-content">
          <van-field
            v-model="classForm.grade"
            is-link
            readonly
            label="年级"
            placeholder="请选择年级"
            @click="showGradePicker = true"
          />
          <van-field
            v-model="classForm.class_name"
            label="班级名称"
            placeholder="如: 1班、2班"
          />
        </div>
      </div>
    </van-popup>

    <!-- 年级选择器 -->
    <van-popup v-model:show="showGradePicker" position="bottom" round>
      <van-picker :columns="gradePickerColumns" @confirm="onGradeConfirm" @cancel="showGradePicker = false" />
    </van-popup>

    <!-- 班级详情弹窗 -->
    <van-popup v-model:show="showDetailPopup" position="bottom" round style="height: 60%">
      <div class="detail-popup" v-if="currentClass">
        <div class="popup-header">
          <span class="cancel-btn" @click="showDetailPopup = false">关闭</span>
          <span class="popup-title">{{ currentClass.class_name }} 详情</span>
          <span></span>
        </div>
        <div class="detail-content">
          <div class="detail-stats">
            <div class="detail-stat-item">
              <span class="detail-stat-value">{{ currentClass.student_count }}</span>
              <span class="detail-stat-label">学生人数</span>
            </div>
          </div>
          <van-cell-group inset>
            <van-cell title="班级名称" :value="currentClass.class_name" />
            <van-cell title="年级" :value="currentClass.grade" />
          </van-cell-group>
          <div class="detail-section">
            <div class="section-title">班级学生</div>
            <div class="student-list">
              <van-cell 
                v-for="student in currentClassStudents" 
                :key="student.id" 
                :title="student.name" 
                :label="student.student_no" 
              />
              <div v-if="currentClassStudents.length === 0" class="empty-state small">
                <p>暂无学生</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, School, User } from '@element-plus/icons-vue';
import api from '@/api/index';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();

// 统计数据
const classStats = ref([]);
const selectedGrade = ref('');
const showGradeFilterPicker = ref(false);
const loading = ref(false);

// 分页
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);

// 年级列表
const gradeList = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
const gradeOptions = computed(() => [
  { text: '全部年级', value: '' },
  ...gradeList.map(g => ({ text: g, value: g }))
]);

// 年级选择器列（van-picker 需要对象格式）
const gradePickerColumns = computed(() => gradeList.map(g => ({ text: g, value: g })));

// 统计
const totalClasses = computed(() => classStats.value.length);
const totalStudents = computed(() => classStats.value.reduce((sum, c) => sum + c.student_count, 0));

// 新增/编辑
const showAddPopup = ref(false);
const showGradePicker = ref(false);
const editingClass = ref(null);
const saving = ref(false);

const classForm = reactive({
  grade: '',
  class_name: ''
});

// 详情
const showDetailPopup = ref(false);
const currentClass = ref(null);
const currentClassStudents = ref([]);

// 加载班级统计
async function loadClassStats() {
  loading.value = true;
  try {
    const params = selectedGrade.value ? { grade: selectedGrade.value } : {};
    const res = await api.get('/admin/class-stats', { params });
    if (res.code === 0) {
      classStats.value = res.data;
      total.value = res.data.length;
    }
  } catch (e) {
    console.error('加载班级统计失败:', e);
    if (isPC.value) {
      ElMessage.error('加载班级统计失败');
    }
  } finally {
    loading.value = false;
  }
}

// 分页变化
function handlePageChange(page) {
  currentPage.value = page;
  loadClassStats();
}

// 年级筛选确认
function onGradeFilterConfirm({ selectedOptions }) {
  selectedGrade.value = selectedOptions[0]?.value || '';
  showGradeFilterPicker.value = false;
  loadClassStats();
}

// 新增/编辑班级
function closeAddPopup() {
  showAddPopup.value = false;
  editingClass.value = null;
  classForm.grade = '';
  classForm.class_name = '';
}

function onGradeConfirm({ selectedOptions }) {
  classForm.grade = selectedOptions[0]?.value || '';
  showGradePicker.value = false;
}

function editClass(item) {
  editingClass.value = item;
  classForm.grade = item.grade;
  classForm.class_name = item.class_name.replace(item.grade, '');
  showAddPopup.value = true;
}

async function saveClass() {
  if (!classForm.grade) {
    if (isPC.value) {
      ElMessage.warning('请选择年级');
    } else {
      showFailToast('请选择年级');
    }
    return;
  }
  if (!classForm.class_name) {
    if (isPC.value) {
      ElMessage.warning('请输入班级名称');
    } else {
      showFailToast('请输入班级名称');
    }
    return;
  }

  saving.value = true;
  try {
    const fullClassName = classForm.grade + classForm.class_name;
    const data = {
      grade: classForm.grade,
      class_name: fullClassName,
      old_class_name: editingClass.value?.class_name
    };

    const res = await api.post('/admin/class', data);
    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success(editingClass.value ? '修改成功' : '添加成功');
      } else {
        showSuccessToast(editingClass.value ? '修改成功' : '添加成功');
      }
      closeAddPopup();
      loadClassStats();
    } else {
      if (isPC.value) {
        ElMessage.error(res.message || '操作失败');
      } else {
        showFailToast(res.message || '操作失败');
      }
    }
  } catch (e) {
    if (isPC.value) {
      ElMessage.error(e.message || '操作失败');
    } else {
      showFailToast(e.message || '操作失败');
    }
  } finally {
    saving.value = false;
  }
}

async function deleteClass(item) {
  try {
    // 检查是否有进行中的考试
    const checkRes = await api.get('/admin/class-exams', { params: { class_name: item.class_name } });
    let confirmMessage = `确定要删除班级"${item.class_name}"吗？该班级的学生将被移除班级关联。`;

    if (checkRes.code === 0 && checkRes.data?.active_exams?.length > 0) {
      const examNames = checkRes.data.active_exams.map(e => e.name).join('、');
      confirmMessage = `班级"${item.class_name}"有进行中的考试任务：${examNames}。删除班级后学生将无法继续答题，确定要删除吗？`;
    }

    if (isPC.value) {
      await ElMessageBox.confirm(confirmMessage, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      });
    } else {
      await showConfirmDialog({
        title: '确认删除',
        message: confirmMessage
      });
    }

    const res = await api.delete('/admin/class', { data: { class_name: item.class_name } });
    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success('删除成功');
      } else {
        showSuccessToast('删除成功');
      }
      loadClassStats();
    } else {
      if (isPC.value) {
        ElMessage.error(res.message || '删除失败');
      } else {
        showFailToast(res.message || '删除失败');
      }
    }
  } catch (e) {
    // 取消删除
  }
}

// 班级详情
async function showClassDetail(item) {
  currentClass.value = item;
  showDetailPopup.value = true;
  try {
    // 使用完整班级名称查询，后端会处理格式匹配
    const res = await api.get('/students', { params: { class_name: item.class_name, pageSize: 100 } });
    if (res.code === 0) {
      currentClassStudents.value = res.data.list;
    }
  } catch (e) {
    console.error('加载学生列表失败:', e);
  }
}

onMounted(() => {
  loadClassStats();
});
</script>

<style scoped>
/* ========== PC 样式 ========== */
.classes-pc {
  padding: var(--spacing-lg, 24px);
  min-height: 100vh;
  background: var(--bg-color);
}

.pc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg, 24px);
}

.pc-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.pc-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* 统计卡片网格 */
.pc-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md, 16px);
  margin-bottom: var(--spacing-md, 16px);
}

.stat-card {
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 8px);
  padding: var(--spacing-lg, 24px);
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 16px);
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
  transition: all var(--transition-duration, 0.3s) var(--transition-timing-function, cubic-bezier(0.4, 0, 0.2, 1));
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
}

.stat-card.stat-primary::before {
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-light-3));
}

.stat-card.stat-success::before {
  background: linear-gradient(180deg, var(--color-success), #85ce61);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--box-shadow);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--border-radius-large, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card.stat-primary .stat-icon {
  background: linear-gradient(135deg, var(--color-primary-light-9), var(--color-primary-light-7));
  color: var(--color-primary);
}

.stat-card.stat-success .stat-icon {
  background: linear-gradient(135deg, var(--color-success-light), #d1f0c8);
  color: var(--color-success);
}

.stat-body {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-color-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: var(--font-size-small, 13px);
  color: var(--text-color-secondary);
  margin-top: 4px;
}

/* 筛选卡片 */
.pc-filter-card {
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 8px);
  padding: var(--spacing-md, 16px);
  margin-bottom: var(--spacing-md, 16px);
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
}

/* 表格卡片 */
.pc-table-card {
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 8px);
  padding: var(--spacing-md, 16px);
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
}

.student-count-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: var(--border-radius-round, 20px);
  background: var(--color-primary-light-9);
  color: var(--color-primary);
  font-size: var(--font-size-small, 13px);
  font-weight: 500;
}

.pc-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-md, 16px);
}

/* 详情弹窗内容 */
.pc-detail-content {
  padding: var(--spacing-sm, 8px) 0;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md, 16px);
  padding: var(--spacing-md, 16px);
  background: var(--fill-color);
  border-radius: var(--border-radius-large, 8px);
  margin-bottom: var(--spacing-lg, 24px);
}

.detail-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-secondary);
}

.detail-value {
  font-size: var(--font-size-medium, 16px);
  font-weight: 500;
  color: var(--text-color-primary);
}

.detail-value.highlight {
  color: var(--color-primary);
}

.pc-students-section {
  margin-top: var(--spacing-lg, 24px);
}

.section-title {
  font-size: var(--font-size-medium, 16px);
  font-weight: 500;
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-sm, 8px);
  padding-bottom: var(--spacing-sm, 8px);
  border-bottom: 1px solid var(--border-color-lighter);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl, 32px) var(--spacing-md, 16px);
  color: var(--text-color-secondary);
}

.empty-state p {
  margin-top: var(--spacing-sm, 8px);
  font-size: var(--font-size-small, 13px);
}

/* ========== 移动端样式 ========== */
.page-content {
  padding-bottom: var(--spacing-lg, 20px);
}

.stats-section {
  display: flex;
  align-items: center;
  background: var(--fill-color-blank);
  padding: var(--spacing-md, 16px);
  margin-bottom: 10px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--border-color-lighter);
  margin: 0 var(--spacing-md, 16px);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-secondary);
  margin-top: 4px;
  display: block;
}

.filter-section {
  background: var(--fill-color-blank);
  margin-bottom: 10px;
  padding: var(--spacing-sm, 8px) var(--spacing-sm, 12px);
}

.filter-buttons {
  display: flex;
  gap: var(--spacing-sm, 8px);
}

.filter-buttons :deep(.van-button) {
  padding: 0 var(--spacing-sm, 12px);
}

.filter-buttons :deep(.van-icon) {
  margin-left: 4px;
}

.class-list {
  padding: 0 var(--spacing-sm, 12px);
}

.class-card {
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 8px);
  padding: var(--spacing-md, 16px);
  margin-bottom: 10px;
  box-shadow: var(--box-shadow-lighter, 0 1px 4px 0 rgba(0, 0, 0, 0.04));
  transition: all var(--transition-duration, 0.3s) var(--transition-timing-function, cubic-bezier(0.4, 0, 0.2, 1));
}

.class-card:active {
  transform: scale(0.98);
}

.class-card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 12px);
  margin-bottom: var(--spacing-sm, 8px);
}

.class-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--border-radius-large, 8px);
  background: linear-gradient(135deg, var(--color-primary-light-9), var(--color-primary-light-7));
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.class-info {
  flex: 1;
  min-width: 0;
}

.class-name {
  font-size: var(--font-size-medium, 16px);
  font-weight: 500;
  color: var(--text-color-primary);
  display: block;
}

.class-grade {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-secondary);
  margin-top: 2px;
  display: block;
}

.class-student-count {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xs, 8px) var(--spacing-sm, 12px);
  background: var(--color-primary-light-9);
  border-radius: var(--border-radius-base, 4px);
}

.count-number {
  font-size: var(--font-size-large, 18px);
  font-weight: 600;
  color: var(--color-primary);
  line-height: 1;
}

.count-label {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--color-primary);
}

.class-card-actions {
  display: flex;
  gap: var(--spacing-sm, 8px);
  padding-top: var(--spacing-sm, 8px);
  border-top: 1px solid var(--border-color-lighter);
}

.empty-state.small {
  padding: var(--spacing-lg, 24px);
}

.empty-state.small p {
  margin-top: 0;
}

/* 弹窗 */
.add-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm, 12px) var(--spacing-md, 16px);
  background: var(--fill-color-blank);
  border-bottom: 1px solid var(--border-color-lighter);
}

.cancel-btn {
  color: var(--text-color-secondary);
  padding: 4px var(--spacing-sm, 8px);
  font-size: var(--font-size-base, 14px);
}

.popup-title {
  font-size: var(--font-size-medium, 16px);
  font-weight: 500;
  color: var(--text-color-primary);
}

.form-content {
  flex: 1;
  padding: var(--spacing-sm, 10px) 0;
}

/* 详情弹窗 */
.detail-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md, 16px);
  background: var(--bg-color);
}

.detail-stats {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-md, 16px);
}

.detail-stat-item {
  text-align: center;
  padding: var(--spacing-md, 16px) var(--spacing-xl, 32px);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light-3));
  border-radius: var(--border-radius-large, 8px);
  color: #ffffff;
}

.detail-stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
}

.detail-stat-label {
  font-size: var(--font-size-small, 13px);
  opacity: 0.9;
  margin-top: 4px;
}

.detail-section {
  background: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 8px);
  margin-top: var(--spacing-sm, 12px);
  padding: var(--spacing-sm, 12px) var(--spacing-md, 16px);
}

.student-list {
  max-height: 200px;
  overflow-y: auto;
}
</style>
