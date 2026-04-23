<template>
  <!-- PC 版本 -->
  <div v-if="isPC" class="classes-pc">
    <div class="pc-header">
      <h2>班级管理</h2>
      <el-button type="primary" @click="openAddPopup">
        <el-icon><Plus /></el-icon>
        新增班级
      </el-button>
    </div>

    <div class="pc-content">
      <!-- 统计数据 -->
      <el-row :gutter="20" class="pc-stats-row">
        <el-col :span="12">
          <el-card shadow="hover" class="pc-stat-card">
            <div class="pc-stat-item">
              <div class="pc-stat-icon classes-icon">
                <el-icon :size="28"><School /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ totalClasses }}</div>
                <div class="pc-stat-label">班级总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover" class="pc-stat-card">
            <div class="pc-stat-item">
              <div class="pc-stat-icon students-icon">
                <el-icon :size="28"><User /></el-icon>
              </div>
              <div class="pc-stat-detail">
                <div class="pc-stat-value">{{ totalStudents }}</div>
                <div class="pc-stat-label">学生总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 筛选区域 -->
      <el-card shadow="hover" class="pc-filter-card">
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
      </el-card>

      <!-- 班级列表 -->
      <el-card shadow="hover" class="pc-table-card">
        <el-table :data="classStats" style="width: 100%" v-loading="loading">
          <el-table-column prop="class_name" label="班级名称" min-width="150" />
          <el-table-column prop="grade" label="年级" width="120" />
          <el-table-column prop="student_count" label="学生人数" width="120" align="center">
            <template #default="{ row }">
              <el-tag type="primary" size="small">{{ row.student_count }}人</el-tag>
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
      </el-card>
    </div>

    <!-- 新增/编辑班级弹窗 -->
    <el-dialog
      v-model="showAddPopup"
      :title="editingClass ? '编辑班级' : '新增班级'"
      width="500px"
      destroy-on-close
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
    >
      <div v-if="currentClass" class="pc-detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="班级名称">{{ currentClass.class_name }}</el-descriptions-item>
          <el-descriptions-item label="年级">{{ currentClass.grade }}</el-descriptions-item>
          <el-descriptions-item label="学生人数">{{ currentClass.student_count }}人</el-descriptions-item>
        </el-descriptions>

        <div class="pc-students-section">
          <h4>班级学生</h4>
          <el-table :data="currentClassStudents" style="width: 100%" max-height="300">
            <el-table-column prop="student_no" label="学号" width="120" />
            <el-table-column prop="name" label="姓名" />
          </el-table>
          <div v-if="currentClassStudents.length === 0" class="pc-empty-tip">暂无学生</div>
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
        <div v-for="(item, index) in classStats" :key="item.class_name" class="class-card" @click="showClassDetail(item)">
          <div class="class-header">
            <span class="class-name">{{ item.class_name }}</span>
            <van-tag type="primary" size="small">{{ item.student_count }}人</van-tag>
          </div>
          <div class="class-info">
            <span>年级: {{ item.grade }}</span>
          </div>
          <div class="class-actions" @click.stop>
            <van-button size="mini" type="primary" plain @click="editClass(item)">编辑</van-button>
            <van-button size="mini" type="danger" plain @click="deleteClass(item)">删除</van-button>
          </div>
        </div>
        <div v-if="classStats.length === 0" class="empty-tip">
          暂无班级数据
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
          <van-cell-group>
            <van-cell title="班级名称" :value="currentClass.class_name" />
            <van-cell title="年级" :value="currentClass.grade" />
            <van-cell title="学生人数" :value="currentClass.student_count + '人'" />
          </van-cell-group>
          <div class="detail-section">
            <div class="section-title">班级学生</div>
            <div class="student-list">
              <van-cell v-for="student in currentClassStudents" :key="student.id" :title="student.name" :label="student.student_no" />
              <div v-if="currentClassStudents.length === 0" class="empty-tip">暂无学生</div>
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
  padding: 24px;
  min-height: 100vh;
  background: #f5f7fa;
}

.pc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.pc-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.pc-content {
  max-width: 1200px;
  margin: 0 auto;
}

.pc-stats-row {
  margin-bottom: 20px;
}

.pc-stat-card {
  border-radius: 12px;
}

.pc-stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pc-stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.pc-stat-icon.classes-icon {
  background: linear-gradient(135deg, #409eff, #79bbff);
}

.pc-stat-icon.students-icon {
  background: linear-gradient(135deg, #67c23a, #95d475);
}

.pc-stat-detail {
  flex: 1;
}

.pc-stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.pc-stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.pc-filter-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.pc-table-card {
  border-radius: 12px;
}

.pc-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.pc-detail-content {
  padding: 10px 0;
}

.pc-students-section {
  margin-top: 24px;
}

.pc-students-section h4 {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12px;
}

.pc-empty-tip {
  text-align: center;
  color: #909399;
  padding: 20px;
}

/* ========== 移动端样式 ========== */
.page-content {
  padding-bottom: 20px;
}

.stats-section {
  display: flex;
  background: #fff;
  padding: 16px;
  margin-bottom: 10px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1989fa;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  display: block;
}

.filter-section {
  background: #fff;
  margin-bottom: 10px;
  padding: 8px 12px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-buttons :deep(.van-button) {
  padding: 0 12px;
}

.filter-buttons :deep(.van-icon) {
  margin-left: 4px;
}

.class-list {
  padding: 0 12px;
}

.class-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 10px;
}

.class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.class-name {
  font-size: 16px;
  font-weight: 500;
}

.class-info {
  font-size: 13px;
  color: #666;
  margin-bottom: 10px;
}

.class-actions {
  display: flex;
  gap: 8px;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 20px;
}

/* 弹窗 */
.add-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.cancel-btn {
  color: #666;
  padding: 4px 8px;
}

.popup-title {
  font-size: 16px;
  font-weight: 500;
}

.form-content {
  flex: 1;
  padding: 10px 0;
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
  padding: 16px;
  background: #f7f8fa;
}

.detail-section {
  background: #fff;
  border-radius: 8px;
  margin-top: 12px;
  padding: 12px 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.student-list {
  max-height: 200px;
  overflow-y: auto;
}
</style>
