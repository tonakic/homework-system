<template>
  <div class="page">
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
import api from '@/api/index';

// 统计数据
const classStats = ref([]);
const selectedGrade = ref('');
const showGradeFilterPicker = ref(false);

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
  try {
    const params = selectedGrade.value ? { grade: selectedGrade.value } : {};
    const res = await api.get('/admin/class-stats', { params });
    if (res.code === 0) {
      classStats.value = res.data;
    }
  } catch (e) {
    console.error('加载班级统计失败:', e);
  }
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
    showFailToast('请选择年级');
    return;
  }
  if (!classForm.class_name) {
    showFailToast('请输入班级名称');
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
      showSuccessToast(editingClass.value ? '修改成功' : '添加成功');
      closeAddPopup();
      loadClassStats();
    } else {
      showFailToast(res.message || '操作失败');
    }
  } catch (e) {
    showFailToast(e.message || '操作失败');
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

    await showConfirmDialog({
      title: '确认删除',
      message: confirmMessage
    });
    const res = await api.delete('/admin/class', { data: { class_name: item.class_name } });
    if (res.code === 0) {
      showSuccessToast('删除成功');
      loadClassStats();
    } else {
      showFailToast(res.message || '删除失败');
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
