<template>
  <div class="page">
    <!-- PC版本 -->
    <div v-if="isPC" class="students-pc">
      <div class="pc-container">
        <!-- 页面标题 -->
        <div class="page-header">
          <h1 class="page-title">学生管理</h1>
          <p class="page-subtitle">管理学生信息、班级分配和账号状态</p>
        </div>

        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <el-button type="primary" class="create-btn" @click="openAddPopup">
              <el-icon><Plus /></el-icon>
              新增学生
            </el-button>
            <el-button class="import-btn" @click="openImportPopup">
              <el-icon><Upload /></el-icon>
              批量导入
            </el-button>
          </div>
        </div>

        <!-- 搜索筛选区域 -->
        <div class="filter-card">
          <div class="filter-row">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索学号或姓名"
              clearable
              class="search-input"
              @clear="handlePCSearch"
              @keyup.enter="handlePCSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="filterGrade"
              placeholder="选择年级"
              clearable
              class="filter-select"
              @change="handleGradeChange"
            >
              <el-option
                v-for="grade in gradeList"
                :key="grade"
                :label="grade"
                :value="grade"
              />
            </el-select>
            <el-select
              v-model="filterClass"
              placeholder="选择班级"
              clearable
              class="filter-select"
              @change="handlePCSearch"
            >
              <el-option
                v-for="cls in classOptions"
                :key="cls"
                :label="cls"
                :value="cls"
              />
            </el-select>
            <el-select
              v-model="filterStatus"
              placeholder="选择状态"
              clearable
              class="filter-select filter-select-sm"
              @change="handlePCSearch"
            >
              <el-option label="正常" value="active" />
              <el-option label="停用" value="inactive" />
            </el-select>
          </div>
        </div>

        <!-- 学生列表 -->
        <div class="table-card">
          <el-table
            :data="students"
            stripe
            class="student-table"
            v-loading="loading"
          >
            <el-table-column prop="student_no" label="学号" width="120" />
            <el-table-column prop="name" label="姓名" width="120">
              <template #default="{ row }">
                <span class="student-name">{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column label="性别" width="80">
              <template #default="{ row }">
                <span class="gender-text">{{ row.gender || '未设置' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="grade" label="年级" width="100" />
            <el-table-column prop="class_name" label="班级" width="100" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <span class="status-badge" :class="row.status === 'active' ? 'status-active' : 'status-inactive'">
                  {{ row.status === 'active' ? '正常' : '停用' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="phone" label="联系电话" width="140" />
            <el-table-column label="操作" fixed="right" width="200">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button type="primary" link size="small" @click="editStudent(row)">编辑</el-button>
                  <el-button type="warning" link size="small" @click="resetPassword(row)">重置密码</el-button>
                  <el-button type="danger" link size="small" @click="deleteStudent(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="totalStudents"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handlePageSizeChange"
              @current-change="loadStudents"
            />
          </div>
        </div>
      </div>

      <!-- 新增/编辑学生弹窗 -->
      <el-dialog
        v-model="showAddPopup"
        :title="editingStudent ? '编辑学生' : '新增学生'"
        width="500px"
        :close-on-click-modal="false"
        class="student-dialog"
      >
        <el-form :model="studentForm" label-width="80px" class="student-form">
          <el-form-item label="学号" required>
            <el-input
              v-model="studentForm.student_no"
              placeholder="请输入学号"
              :disabled="!!editingStudent"
            />
          </el-form-item>
          <el-form-item label="姓名" required>
            <el-input v-model="studentForm.name" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="性别">
            <el-radio-group v-model="studentForm.gender">
              <el-radio label="男">男</el-radio>
              <el-radio label="女">女</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="年级" required>
            <el-select v-model="studentForm.grade" placeholder="请选择年级" @change="loadClassOptions">
              <el-option
                v-for="grade in gradeList"
                :key="grade"
                :label="grade"
                :value="grade"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="班级" required>
            <el-select v-model="studentForm.class_name" placeholder="请选择班级">
              <el-option
                v-for="cls in classOptions"
                :key="cls"
                :label="cls"
                :value="cls"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="家长姓名">
            <el-input v-model="studentForm.parent_name" placeholder="请输入家长姓名" />
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="studentForm.phone" placeholder="请输入联系电话" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="studentForm.remark" type="textarea" rows="2" placeholder="请输入备注" />
          </el-form-item>
        </el-form>
        <template v-if="!editingStudent" #footer>
          <span class="form-tip">新增学生默认密码为123456</span>
        </template>
        <template #footer>
          <el-button @click="closeAddPopup">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveStudent">保存</el-button>
        </template>
      </el-dialog>

      <!-- 批量导入弹窗 -->
      <el-dialog v-model="showImportPopup" title="批量导入" width="500px" class="import-dialog">
        <div class="import-content">
          <div class="import-desc">
            <p>支持导入 Excel 格式的学生信息文件（.xlsx）</p>
            <p>默认密码为 123456</p>
          </div>
          <div class="import-actions">
            <el-upload
              :show-file-list="false"
              accept=".xlsx,.xls"
              :before-upload="handleFileUpload"
            >
              <el-button type="primary" :loading="importing">
                <el-icon><Upload /></el-icon>
                上传学生文件
              </el-button>
            </el-upload>
            <el-button @click="downloadTemplate">
              <el-icon><Download /></el-icon>
              下载模板
            </el-button>
          </div>
          <div v-if="importResult" class="import-result">
            <el-alert
              :title="importResult.message"
              :type="importResult.success ? 'success' : 'error'"
              show-icon
            />
            <div v-if="importResult.details && importResult.details.length > 0" class="result-details">
              <p v-for="(detail, idx) in importResult.details" :key="idx">第{{ detail.row }}行: {{ detail.reason }}</p>
            </div>
          </div>
        </div>
      </el-dialog>
    </div>

    <!-- 移动端版本 -->
    <div v-else>
      <van-nav-bar title="学生管理" left-arrow @click-left="$router.back()">
        <template #right>
          <van-icon name="description" size="20" class="nav-icon" @click="openImportPopup" />
          <van-icon name="plus" size="20" class="nav-icon" @click="openAddPopup" />
        </template>
      </van-nav-bar>

      <div class="page-content">
        <!-- 筛选条件 -->
        <div class="filter-section">
          <div class="filter-buttons">
            <van-button
              size="small"
              :type="filterGrade ? 'primary' : 'default'"
              @click="showGradePicker = true"
            >
              {{ filterGrade || '全部年级' }}
              <van-icon name="arrow-down" />
            </van-button>
            <van-button
              size="small"
              :type="filterClass ? 'primary' : 'default'"
              @click="showClassPickerFilter = true"
            >
              {{ filterClass || '全部班级' }}
              <van-icon name="arrow-down" />
            </van-button>
            <van-button
              size="small"
              :type="filterStatus !== 'active' ? 'primary' : 'default'"
              @click="showStatusPicker = true"
            >
              {{ getStatusName(filterStatus) }}
              <van-icon name="arrow-down" />
            </van-button>
          </div>
          <div class="search-box">
            <van-search
              v-model="searchKeyword"
              placeholder="搜索学号或姓名"
              shape="round"
              :clearable="true"
              @search="onRefresh"
              @clear="onRefresh"
            />
          </div>
        </div>

        <!-- 年级筛选弹出层 -->
        <van-popup v-model:show="showGradePicker" position="bottom" round>
          <van-picker
            :columns="gradeOptions"
            @confirm="onGradeFilterConfirm"
            @cancel="showGradePicker = false"
          />
        </van-popup>

        <!-- 班级筛选弹出层 -->
        <van-popup v-model:show="showClassPickerFilter" position="bottom" round>
          <van-picker
            :columns="classFilterOptions"
            @confirm="onClassFilterConfirm"
            @cancel="showClassPickerFilter = false"
          />
        </van-popup>

        <!-- 状态筛选弹出层 -->
        <van-popup v-model:show="showStatusPicker" position="bottom" round>
          <van-picker
            :columns="statusOptions"
            @confirm="onStatusFilterConfirm"
            @cancel="showStatusPicker = false"
          />
        </van-popup>

        <!-- 学生列表 -->
        <div class="student-list">
          <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
            <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadStudents">
              <van-cell
                v-for="student in students"
                :key="student.id"
                is-link
                class="student-cell"
                @click="showStudentDetail(student)"
              >
                <template #title>
                  <div class="student-info">
                    <span class="student-name">{{ student.name }}</span>
                    <span class="status-tag" :class="student.status === 'active' ? 'tag-success' : 'tag-danger'">
                      {{ student.status === 'active' ? '正常' : '停用' }}
                    </span>
                  </div>
                </template>
                <template #label>
                  <div class="student-meta">
                    <span class="meta-item">{{ student.student_no }}</span>
                    <span class="meta-item">{{ student.grade }}{{ student.class_name }}</span>
                  </div>
                </template>
                <template #right-icon>
                  <div class="action-icons" @click.stop>
                    <van-icon name="edit" class="action-icon" @click="editStudent(student)" />
                    <van-icon name="replay" class="action-icon" @click="resetPassword(student)" />
                  </div>
                </template>
              </van-cell>
            </van-list>
          </van-pull-refresh>
        </div>
      </div>

      <!-- 新增/编辑学生弹窗 -->
      <van-popup
        v-model:show="showAddPopup"
        position="bottom"
        round
        class="form-popup"
      >
        <div class="add-popup">
          <div class="popup-header">
            <span class="cancel-btn" @click="closeAddPopup">取消</span>
            <span class="popup-title">{{ editingStudent ? '编辑学生' : '新增学生' }}</span>
            <van-button type="primary" size="small" :loading="saving" @click="saveStudent">保存</van-button>
          </div>

          <div class="form-scroll">
            <div class="form-section">
              <van-field
                v-model="studentForm.student_no"
                label="学号"
                placeholder="请输入学号"
                :rules="[{ required: true, message: '请输入学号' }]"
                :disabled="!!editingStudent"
              />
              <van-field
                v-model="studentForm.name"
                label="姓名"
                placeholder="请输入姓名"
                :rules="[{ required: true, message: '请输入姓名' }]"
              />
              <van-field name="gender" label="性别">
                <template #input>
                  <van-radio-group v-model="studentForm.gender" direction="horizontal">
                    <van-radio name="男">男</van-radio>
                    <van-radio name="女">女</van-radio>
                  </van-radio-group>
                </template>
              </van-field>
              <van-field
                v-model="studentForm.grade"
                is-link
                readonly
                label="年级"
                placeholder="请选择"
                @click="showGradeFormPicker = true"
              />
              <van-field
                v-model="studentForm.class_name"
                is-link
                readonly
                label="班级"
                placeholder="请选择"
                @click="openClassFormPicker"
              />
              <van-field
                v-model="studentForm.parent_name"
                label="家长姓名"
                placeholder="请输入家长姓名"
              />
              <van-field
                v-model="studentForm.phone"
                label="联系电话"
                placeholder="请输入联系电话"
                type="tel"
              />
              <van-field
                v-model="studentForm.remark"
                label="备注"
                placeholder="请输入备注"
                type="textarea"
                rows="2"
                autosize
              />
            </div>

            <div v-if="!editingStudent" class="form-tip-mobile">
              <van-notice-bar>新增学生默认密码为123456</van-notice-bar>
            </div>
          </div>
        </div>
      </van-popup>

      <!-- 年级选择(表单) -->
      <van-popup v-model:show="showGradeFormPicker" position="bottom" round>
        <van-picker
          :columns="gradeFormColumns"
          @confirm="onGradeFormConfirm"
          @cancel="showGradeFormPicker = false"
        />
      </van-popup>

      <!-- 班级选择(表单) -->
      <van-popup v-model:show="showClassFormPicker" position="bottom" round>
        <van-picker
          :columns="classFormColumnsWithDefault"
          @confirm="onClassFormConfirm"
          @cancel="showClassFormPicker = false"
        />
      </van-popup>

      <!-- 学生详情弹窗 -->
      <van-popup v-model:show="showDetailPopup" position="bottom" round class="detail-popup-wrapper">
        <div class="detail-popup" v-if="currentStudent">
          <div class="popup-header">
            <span class="cancel-btn" @click="showDetailPopup = false">关闭</span>
            <span class="popup-title">学生详情</span>
            <van-button type="primary" size="small" @click="editStudent(currentStudent)">编辑</van-button>
          </div>
          <div class="detail-content">
            <van-cell-group>
              <van-cell title="学号" :value="currentStudent.student_no" />
              <van-cell title="姓名" :value="currentStudent.name" />
              <van-cell title="性别" :value="currentStudent.gender || '未设置'" />
              <van-cell title="年级" :value="currentStudent.grade" />
              <van-cell title="班级" :value="currentStudent.grade + currentStudent.class_name" />
              <van-cell title="家长姓名" :value="currentStudent.parent_name || '未设置'" />
              <van-cell title="联系电话" :value="currentStudent.phone || '未设置'" />
              <van-cell title="备注" :value="currentStudent.remark || '无'" />
              <van-cell title="状态" :value="currentStudent.status === 'active' ? '正常' : '停用'" />
            </van-cell-group>
            <div class="detail-actions">
              <van-button type="warning" block @click="resetPassword(currentStudent)">重置密码</van-button>
              <van-button type="danger" block @click="deleteStudent(currentStudent)">删除学生</van-button>
            </div>
          </div>
        </div>
      </van-popup>

      <!-- 批量导入弹窗 -->
      <van-popup
        v-model:show="showImportPopup"
        position="bottom"
        round
        class="import-popup-wrapper"
        :lock-scroll="true"
      >
        <div class="import-popup">
          <div class="popup-header">
            <span class="cancel-btn" @click="showImportPopup = false">关闭</span>
            <span class="popup-title">批量导入</span>
            <span></span>
          </div>
          <div class="import-content-mobile">
            <div class="import-desc">
              <p>支持导入 Excel 格式的学生信息文件（.xlsx）</p>
              <p>默认密码为 123456，示例行不会导入</p>
            </div>
            <div class="import-buttons">
              <van-uploader :after-read="handleFileUpload" accept=".xlsx,.xls" :max-count="1" class="import-uploader">
                <van-button size="large" :loading="importing" class="import-btn">
                  <van-icon name="upgrade" />
                  上传学生
                </van-button>
              </van-uploader>
              <van-button size="large" class="import-btn" @click="downloadTemplate">
                <van-icon name="down" />
                模板下载
              </van-button>
            </div>
            <div v-if="importResult" class="import-result-mobile">
              <van-notice-bar :color="importResult.success ? 'var(--color-success)' : 'var(--color-danger)'" background="var(--fill-color)">
                {{ importResult.message }}
              </van-notice-bar>
              <div v-if="importResult.details && importResult.details.length > 0" class="result-details-mobile">
                <p v-for="(detail, idx) in importResult.details" :key="idx">第{{ detail.row }}行: {{ detail.reason }}</p>
              </div>
            </div>
          </div>
        </div>
      </van-popup>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Upload, Download, Search } from '@element-plus/icons-vue';
import api from '@/api/index';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();

// 筛选条件
const filterGrade = ref('');
const filterClass = ref('');
const filterStatus = ref('active');
const searchKeyword = ref('');

// 筛选弹出层
const showGradePicker = ref(false);
const showClassPickerFilter = ref(false);
const showStatusPicker = ref(false);

// 学生列表
const students = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const totalStudents = ref(0);

// 新增/编辑
const showAddPopup = ref(false);
const editingStudent = ref(null);
const saving = ref(false);

const studentForm = reactive({
  student_no: '',
  name: '',
  gender: '男',
  grade: '',
  class_name: '',
  parent_name: '',
  phone: '',
  remark: ''
});

// 表单选择器
const showGradeFormPicker = ref(false);
const showClassFormPicker = ref(false);
const showDetailPopup = ref(false);
const currentStudent = ref(null);

// 批量导入
const showImportPopup = ref(false);
const importing = ref(false);
const importResult = ref(null);

// 年级班级数据（从API获取）
const gradeList = ref([]);
const classOptions = ref([]);

// 筛选选项
const gradeOptions = computed(() => [
  { text: '全部年级', value: '' },
  ...gradeList.value.map(g => ({ text: g, value: g }))
]);

const classFilterOptions = computed(() => {
  return [
    { text: '全部班级', value: '' },
    ...classOptions.value.map(c => ({ text: c, value: c }))
  ];
});

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '正常', value: 'active' },
  { text: '停用', value: 'inactive' }
];

// 表单选项
const gradeFormColumns = computed(() => gradeList.value.map(g => ({ text: g, value: g })));

const classFormColumns = computed(() => {
  if (!studentForm.grade) return [];
  return classOptions.value.map(c => ({ text: c, value: c }));
});

// 班级选择器选项（带默认提示）
const classFormColumnsWithDefault = computed(() => {
  if (!studentForm.grade) {
    return [{ text: '请先选择年级', value: '' }];
  }
  if (classOptions.value.length === 0) {
    return [{ text: '该年级暂无班级', value: '' }];
  }
  return classOptions.value.map(c => ({ text: c, value: c }));
});

function getStatusName(status) {
  if (!status) return '全部状态';
  return status === 'active' ? '正常' : '停用';
}

// 加载年级列表
async function loadGradeList() {
  try {
    const res = await api.get('/students/grades');
    if (res.code === 0) {
      gradeList.value = res.data;
    }
  } catch (err) {
    console.error('加载年级列表失败:', err);
    gradeList.value = [];
  }
}

// 加载班级选项列表（根据选中年级）
async function loadClassOptions() {
  try {
    if (!studentForm.grade && !filterGrade.value) {
      classOptions.value = [];
      return;
    }
    const grade = studentForm.grade || filterGrade.value;
    const res = await api.get('/students/classes', { params: { grade } });
    if (res.code === 0) {
      classOptions.value = res.data;
    }
  } catch (err) {
    console.error('加载班级列表失败:', err);
    classOptions.value = [];
  }
}

// 加载筛选班级列表（根据筛选年级）
async function loadFilterClassOptions() {
  try {
    if (!filterGrade.value) {
      classOptions.value = [];
      return;
    }
    const res = await api.get('/students/classes', { params: { grade: filterGrade.value } });
    if (res.code === 0) {
      classOptions.value = res.data;
    }
  } catch (err) {
    console.error('加载班级列表失败:', err);
    classOptions.value = [];
  }
}

// 加载学生列表
async function loadStudents() {
  if (loading.value) return;
  loading.value = true;

  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      grade: filterGrade.value,
      class_name: filterClass.value,
      status: filterStatus.value,
      keyword: searchKeyword.value
    };
    const res = await api.get('/students', { params });
    if (res.code === 0) {
      if (isPC.value) {
        students.value = res.data.list;
        totalStudents.value = res.data.total || res.data.list.length;
      } else {
        students.value.push(...res.data.list);
        finished.value = res.data.list.length < pageSize.value;
      }
    }
  } catch (err) {
    if (isPC.value) {
      ElMessage.error(err.message || '加载学生列表失败');
    } else {
      showFailToast(err.message || '加载学生列表失败，请稍后重试');
    }
    finished.value = true;
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

function onRefresh() {
  currentPage.value = 1;
  students.value = [];
  finished.value = false;
  loadStudents();
}

// PC端搜索
function handlePCSearch() {
  currentPage.value = 1;
  loadStudents();
}

function handlePageSizeChange() {
  currentPage.value = 1;
  loadStudents();
}

// PC端年级变化
async function handleGradeChange() {
  filterClass.value = '';
  if (filterGrade.value) {
    await loadFilterClassOptions();
  } else {
    classOptions.value = [];
  }
  handlePCSearch();
}

// 筛选回调
function onGradeFilterConfirm({ selectedOptions }) {
  filterGrade.value = selectedOptions[0]?.value || '';
  filterClass.value = '';
  showGradePicker.value = false;
  loadFilterClassOptions();
  onRefresh();
}

function onClassFilterConfirm({ selectedOptions }) {
  filterClass.value = selectedOptions[0]?.value || '';
  showClassPickerFilter.value = false;
  onRefresh();
}

function onStatusFilterConfirm({ selectedOptions }) {
  filterStatus.value = selectedOptions[0]?.value || '';
  showStatusPicker.value = false;
  onRefresh();
}

// 新增/编辑学生
function openAddPopup() {
  editingStudent.value = null;
  resetForm();
  showAddPopup.value = true;
}

function closeAddPopup() {
  showAddPopup.value = false;
  editingStudent.value = null;
  resetForm();
}

function resetForm() {
  studentForm.student_no = '';
  studentForm.name = '';
  studentForm.gender = '男';
  studentForm.grade = '';
  studentForm.class_name = '';
  studentForm.parent_name = '';
  studentForm.phone = '';
  studentForm.remark = '';
}

async function editStudent(student) {
  editingStudent.value = student;
  studentForm.student_no = student.student_no;
  studentForm.name = student.name;
  studentForm.gender = student.gender || '男';
  studentForm.grade = student.grade;
  studentForm.class_name = student.class_name;
  studentForm.parent_name = student.parent_name || '';
  studentForm.phone = student.phone || '';
  studentForm.remark = student.remark || '';
  showDetailPopup.value = false;
  showAddPopup.value = true;
  // 加载该年级的班级列表
  await loadClassOptions();
}

function openClassFormPicker() {
  showClassFormPicker.value = true;
}

async function saveStudent() {
  if (!studentForm.student_no) {
    if (isPC.value) {
      ElMessage.warning('请输入学号');
    } else {
      showFailToast('请输入学号');
    }
    return;
  }
  if (!studentForm.name) {
    if (isPC.value) {
      ElMessage.warning('请输入姓名');
    } else {
      showFailToast('请输入姓名');
    }
    return;
  }
  if (!studentForm.grade) {
    if (isPC.value) {
      ElMessage.warning('请选择年级');
    } else {
      showFailToast('请选择年级');
    }
    return;
  }
  if (!studentForm.class_name) {
    if (isPC.value) {
      ElMessage.warning('请选择班级');
    } else {
      showFailToast('请选择班级');
    }
    return;
  }

  saving.value = true;
  try {
    const data = {
      student_no: studentForm.student_no,
      name: studentForm.name,
      gender: studentForm.gender,
      grade: studentForm.grade,
      class_name: studentForm.class_name,
      parent_name: studentForm.parent_name,
      phone: studentForm.phone,
      remark: studentForm.remark
    };

    let res;
    if (editingStudent.value) {
      res = await api.put(`/students/${editingStudent.value.id}`, data);
    } else {
      res = await api.post('/students', data);
    }

    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success(editingStudent.value ? '修改成功' : '添加成功');
      } else {
        showSuccessToast(editingStudent.value ? '修改成功' : '添加成功');
      }
      closeAddPopup();
      if (isPC.value) {
        handlePCSearch();
      } else {
        onRefresh();
      }
    } else {
      if (isPC.value) {
        ElMessage.error(res.message || '操作失败');
      } else {
        showFailToast(res.message || '操作失败');
      }
    }
  } catch (err) {
    if (isPC.value) {
      ElMessage.error(err.message || '操作失败');
    } else {
      showFailToast(err.message || '操作失败');
    }
  } finally {
    saving.value = false;
  }
}

// 删除学生
async function deleteStudent(student) {
  try {
    if (isPC.value) {
      await ElMessageBox.confirm(`确定要删除学生"${student.name}"吗？`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      });
    } else {
      await showConfirmDialog({
        title: '确认删除',
        message: `确定要删除学生"${student.name}"吗？`
      });
    }
    const res = await api.delete(`/students/${student.id}`);
    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success('删除成功');
      } else {
        showSuccessToast('删除成功');
        showDetailPopup.value = false;
      }
      if (isPC.value) {
        handlePCSearch();
      } else {
        onRefresh();
      }
    } else {
      if (isPC.value) {
        ElMessage.error(res.message || '删除失败');
      } else {
        showFailToast(res.message || '删除失败');
      }
    }
  } catch (err) {
    // 取消删除
  }
}

// 重置密码
async function resetPassword(student) {
  try {
    if (isPC.value) {
      await ElMessageBox.confirm(`确定要重置学生"${student.name}"的密码为123456吗？`, '确认重置', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      });
    } else {
      await showConfirmDialog({
        title: '确认重置',
        message: `确定要重置学生"${student.name}"的密码为123456吗？`
      });
    }
    const res = await api.post(`/students/${student.id}/reset-password`);
    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success('密码已重置为123456');
      } else {
        showSuccessToast('密码已重置为123456');
      }
    } else {
      if (isPC.value) {
        ElMessage.error(res.message || '重置失败');
      } else {
        showFailToast(res.message || '重置失败');
      }
    }
  } catch (err) {
    // 取消重置
  }
}

// 学生详情
function showStudentDetail(student) {
  currentStudent.value = student;
  showDetailPopup.value = true;
}

// 表单选择器回调
function onGradeFormConfirm({ selectedOptions }) {
  studentForm.grade = selectedOptions[0]?.value || '';
  studentForm.class_name = '';
  showGradeFormPicker.value = false;
  loadClassOptions();
}

function onClassFormConfirm({ selectedOptions }) {
  studentForm.class_name = selectedOptions[0]?.value || '';
  showClassFormPicker.value = false;
}

// 批量导入功能
function openImportPopup() {
  importResult.value = null;
  showImportPopup.value = true;
}

async function handleFileUpload(file) {
  importing.value = true;
  importResult.value = null;
  try {
    const formData = new FormData();
    formData.append('file', file.file || file);
    // 不手动设置 Content-Type，让 axios 自动处理 multipart/form-data
    const res = await api.post('/import/students', formData);
    if (res.code === 0) {
      importResult.value = {
        success: true,
        message: `导入完成！成功 ${res.data.success} 条，失败 ${res.data.failed} 条`,
        details: res.data.errors
      };
      if (isPC.value) {
        ElMessage.success('导入成功');
      } else {
        showSuccessToast('导入成功');
      }
      if (isPC.value) {
        handlePCSearch();
      } else {
        onRefresh();
      }
    } else {
      importResult.value = {
        success: false,
        message: res.message || '导入失败',
        details: res.data?.errors
      };
      if (isPC.value) {
        ElMessage.error(res.message || '导入失败');
      } else {
        showFailToast(res.message || '导入失败');
      }
    }
  } catch (err) {
    importResult.value = {
      success: false,
      message: err.message || '导入失败，请检查文件格式'
    };
    if (isPC.value) {
      ElMessage.error(err.message || '导入失败');
    } else {
      showFailToast(err.message || '导入失败');
    }
  } finally {
    importing.value = false;
  }
  return false; // 阻止el-upload默认上传行为
}

async function downloadTemplate() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      if (isPC.value) {
        ElMessage.warning('请先登录');
      } else {
        showFailToast('请先登录');
      }
      return;
    }

    const response = await fetch('/api/import/students/template', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `下载失败 (${response.status})`);
    }

    const blob = await response.blob();
    if (blob.size < 100) {
      throw new Error('文件太小，可能下载失败');
    }
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '学生导入模板.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    if (isPC.value) {
      ElMessage.success('模板下载成功');
    } else {
      showSuccessToast('模板下载成功');
    }
  } catch (err) {
    console.error('下载模板失败:', err);
    if (isPC.value) {
      ElMessage.error('模板下载失败: ' + (err.message || '未知错误'));
    } else {
      showFailToast('模板下载失败: ' + (err.message || '未知错误'));
    }
  }
}

onMounted(() => {
  loadGradeList();
  loadStudents();
});
</script>

<style scoped>
/* ==================== PC端样式 ==================== */
.students-pc {
  min-height: 100%;
  background-color: var(--bg-color);
}

.pc-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg) var(--spacing-xl);
}

/* 页面标题 */
.page-header {
  margin-bottom: var(--spacing-lg);
}

.page-title {
  font-size: var(--font-size-extra-large);
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-xs);
}

.page-subtitle {
  font-size: var(--font-size-small);
  color: var(--text-color-secondary);
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.toolbar-left {
  display: flex;
  gap: var(--spacing-sm);
}

.create-btn,
.import-btn {
  border-radius: var(--border-radius-base);
}

/* 筛选卡片 */
.filter-card {
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  box-shadow: var(--box-shadow-light);
}

.filter-row {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.search-input {
  width: 200px;
}

.filter-select {
  width: 150px;
}

.filter-select-sm {
  width: 120px;
}

/* 表格卡片 */
.table-card {
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-md);
  box-shadow: var(--box-shadow-light);
}

.student-table {
  width: 100%;
}

.student-name {
  font-weight: 500;
  color: var(--text-color-primary);
}

.gender-text {
  color: var(--text-color-regular);
}

/* 状态徽章 */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--border-radius-small);
  font-size: var(--font-size-extra-small);
  font-weight: 500;
}

.status-active {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.status-inactive {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--spacing-md);
}

/* 弹窗样式 */
.student-dialog :deep(.el-dialog__body) {
  padding: var(--spacing-md) var(--spacing-lg);
}

.student-form :deep(.el-form-item) {
  margin-bottom: var(--spacing-md);
}

.form-tip {
  color: var(--text-color-secondary);
  font-size: var(--font-size-extra-small);
}

/* 导入弹窗 */
.import-dialog :deep(.el-dialog__body) {
  padding: var(--spacing-md) var(--spacing-lg);
}

.import-content {
  padding: var(--spacing-sm) 0;
}

.import-desc {
  margin-bottom: var(--spacing-md);
}

.import-desc p {
  margin: var(--spacing-xs) 0;
  color: var(--text-color-regular);
  font-size: var(--font-size-small);
}

.import-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.import-result {
  margin-top: var(--spacing-md);
}

.result-details {
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--fill-color);
  border-radius: var(--border-radius-base);
  max-height: 150px;
  overflow-y: auto;
}

.result-details p {
  margin: 4px 0;
  font-size: var(--font-size-small);
  color: var(--text-color-regular);
}

/* ==================== 移动端样式 ==================== */
.page-content {
  padding-bottom: var(--spacing-lg);
  background-color: var(--bg-color);
}

.nav-icon {
  margin-left: var(--spacing-sm);
  color: var(--text-color-primary);
}

/* 筛选区域 */
.filter-section {
  background: var(--fill-color-blank);
  margin-bottom: var(--spacing-sm);
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  gap: var(--spacing-sm);
}

.filter-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.filter-buttons :deep(.van-button) {
  padding: 0 var(--spacing-sm);
}

.filter-buttons :deep(.van-icon) {
  margin-left: 4px;
}

.search-box {
  flex: 1;
  min-width: 0;
}

.search-box :deep(.van-search) {
  padding: var(--spacing-sm) 0;
}

.search-box :deep(.van-search__content) {
  background: var(--fill-color);
}

/* 学生列表 */
.student-list {
  padding: 0 var(--spacing-md);
}

.student-cell {
  margin-bottom: var(--spacing-xs);
  border-radius: var(--border-radius-base);
}

.student-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.student-name {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text-color-primary);
}

.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: var(--border-radius-small);
  font-size: var(--font-size-extra-small);
  font-weight: 500;
}

.tag-success {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.tag-danger {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

.student-meta {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: 4px;
  color: var(--text-color-secondary);
  font-size: var(--font-size-small);
}

.meta-item {
  color: var(--text-color-secondary);
}

.action-icons {
  display: flex;
  gap: var(--spacing-md);
}

.action-icon {
  color: var(--color-primary);
  font-size: 18px;
}

/* 弹窗样式 */
.form-popup {
  height: 80%;
}

.add-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--fill-color);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--fill-color-blank);
  border-bottom: 1px solid var(--border-color-lighter);
}

.cancel-btn {
  color: var(--text-color-secondary);
  padding: 4px var(--spacing-xs);
  cursor: pointer;
}

.popup-title {
  font-size: var(--font-size-medium);
  font-weight: 500;
  color: var(--text-color-primary);
}

.form-scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: var(--spacing-md);
}

.form-section {
  background: var(--fill-color-blank);
  margin-top: var(--spacing-sm);
}

.form-tip-mobile {
  padding: var(--spacing-sm) var(--spacing-md);
}

/* 详情弹窗 */
.detail-popup-wrapper {
  height: 60%;
}

.detail-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
  background: var(--fill-color);
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

/* 批量导入弹窗 */
.import-popup-wrapper {
  height: 50%;
}

.import-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--fill-color);
}

.import-content-mobile {
  flex: 1;
  padding: var(--spacing-md);
  overflow-y: auto;
}

.import-desc {
  background: var(--fill-color-blank);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-large);
  margin-bottom: var(--spacing-md);
}

.import-desc p {
  font-size: var(--font-size-small);
  color: var(--text-color-secondary);
  margin: 4px 0;
}

.import-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-md);
}

.import-uploader {
  width: 100%;
}

.import-uploader :deep(.van-uploader__wrapper) {
  display: block;
}

.import-uploader :deep(.van-uploader__input-wrapper) {
  display: block;
}

.import-btn {
  width: 100%;
}

.import-result-mobile {
  margin-top: var(--spacing-md);
}

.result-details-mobile {
  background: var(--fill-color-blank);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-base);
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-small);
  color: var(--text-color-secondary);
  max-height: 150px;
  overflow-y: auto;
}

.result-details-mobile p {
  margin: 4px 0;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 767px) {
  .pc-container {
    padding: var(--spacing-md);
  }

  .filter-row {
    flex-wrap: wrap;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }
}
</style>
