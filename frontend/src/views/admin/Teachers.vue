<template>
  <div class="page">
    <!-- PC 版本 -->
    <div v-if="isPC" class="teacher-page-pc">
      <div class="pc-header">
        <h2 class="pc-title">教师管理</h2>
        <div class="pc-header-actions">
          <el-button @click="openImportPopup">批量导入</el-button>
          <el-button type="primary" @click="openAddPopup">新增教师</el-button>
        </div>
      </div>

      <!-- 搜索筛选栏 -->
      <div class="pc-filter-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索工号或姓名"
          clearable
          style="width: 220px;"
          @keyup.enter="onRefresh"
          @clear="onRefresh"
        />
        <el-select
          v-model="filterSubject"
          placeholder="全部科目"
          clearable
          style="width: 140px;"
          @change="onRefresh"
        >
          <el-option
            v-for="s in subjectList"
            :key="s"
            :label="s"
            :value="s"
          />
        </el-select>
        <el-select
          v-model="filterStatus"
          placeholder="全部状态"
          clearable
          style="width: 120px;"
          @change="onRefresh"
        >
          <el-option label="正常" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
      </div>

      <!-- 教师表格 -->
      <el-table :data="teachers" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="teacher_no" label="工号(账号)" width="140" />
        <el-table-column label="科目" min-width="180">
          <template #default="{ row }">
            {{ row.subjects?.join('、') || '未设置' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="editTeacher(row)">编辑</el-button>
            <el-button type="warning" link size="small" @click="resetPassword(row)">重置密码</el-button>
            <el-button type="danger" link size="small" @click="deleteTeacher(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pc-pagination">
        <el-pagination
          v-model:current-page="pcCurrentPage"
          :page-size="pageSize"
          :total="pcTotal"
          layout="total, prev, pager, next"
          @current-change="onPcPageChange"
        />
      </div>

      <!-- 新增/编辑教师弹窗 (PC) -->
      <el-dialog
        v-model="showAddPopup"
        :title="editingTeacher ? '编辑教师' : '新增教师'"
        width="520px"
        destroy-on-close
      >
        <el-form :model="teacherForm" label-width="90px">
          <el-form-item label="工号" required>
            <el-input v-model="teacherForm.teacher_no" :disabled="!!editingTeacher" placeholder="请输入工号" />
          </el-form-item>
          <el-form-item label="姓名" required>
            <el-input v-model="teacherForm.name" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="性别">
            <el-radio-group v-model="teacherForm.gender">
              <el-radio value="男">男</el-radio>
              <el-radio value="女">女</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="教授科目" required>
            <el-select v-model="teacherForm.subjects" multiple placeholder="请选择科目" style="width: 100%;">
              <el-option v-for="s in subjectList" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="teacherForm.phone" placeholder="请输入联系电话" />
          </el-form-item>
          <el-form-item label="管理班级">
            <el-select v-model="teacherForm.manage_classes" multiple placeholder="请选择管理的班级" style="width: 100%;">
              <el-option-group v-for="(classes, grade) in allClasses" :key="grade" :label="grade">
                <el-option v-for="cls in classes" :key="cls" :label="cls" :value="cls" />
              </el-option-group>
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="teacherForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>
          <el-form-item label="状态" v-if="editingTeacher">
            <el-radio-group v-model="teacherForm.status">
              <el-radio value="active">正常</el-radio>
              <el-radio value="inactive">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <div v-if="!editingTeacher" class="pc-form-tip">新增教师默认密码为123456</div>
        <template #footer>
          <el-button @click="closeAddPopup">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveTeacher">保存</el-button>
        </template>
      </el-dialog>

      <!-- 批量导入弹窗 (PC) -->
      <el-dialog v-model="showImportPopup" title="批量导入" width="480px" destroy-on-close>
        <div class="pc-import-content">
          <div class="import-desc">
            <p>支持导入 Excel 格式的教师信息文件（.xlsx）</p>
            <p>默认密码为 123456，示例行不会导入</p>
          </div>
          <div class="import-buttons">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept=".xlsx,.xls"
              :on-change="handlePcFileUpload"
            >
              <el-button :loading="importing">上传教师</el-button>
            </el-upload>
            <el-button @click="downloadTemplate">模板下载</el-button>
          </div>
          <div v-if="importResult" class="import-result">
            <p :style="{ color: importResult.success ? 'var(--color-success)' : 'var(--color-danger)' }">{{ importResult.message }}</p>
            <div v-if="importResult.details && importResult.details.length > 0" class="result-details">
              <p v-for="(detail, idx) in importResult.details" :key="idx">第{{ detail.row }}行: {{ detail.reason }}</p>
            </div>
          </div>
        </div>
      </el-dialog>
    </div>

    <!-- 移动端版本 -->
    <div v-else>
      <van-nav-bar title="教师管理" left-arrow @click-left="$router.back()">
        <template #right>
          <van-icon name="description" size="20" style="margin-right: 12px;" @click="openImportPopup" />
          <van-icon name="plus" size="20" @click="openAddPopup" />
        </template>
      </van-nav-bar>

      <div class="page-content">
        <!-- 筛选条件 -->
        <div class="filter-section">
          <div class="filter-buttons">
            <van-button
              size="small"
              :type="filterSubject ? 'primary' : 'default'"
              @click="showSubjectPicker = true"
            >
              {{ filterSubject || '全部科目' }}
              <van-icon name="arrow-down" />
            </van-button>
            <van-button
              size="small"
              :type="filterStatus ? 'primary' : 'default'"
              @click="showStatusPicker = true"
            >
              {{ getStatusName(filterStatus) }}
              <van-icon name="arrow-down" />
            </van-button>
          </div>
          <div class="search-box">
            <van-search
              v-model="searchKeyword"
              placeholder="搜索工号或姓名"
              shape="round"
              :clearable="true"
              @search="onRefresh"
              @clear="onRefresh"
            />
          </div>
        </div>

        <!-- 科目筛选弹出层 -->
        <van-popup v-model:show="showSubjectPicker" position="bottom" round>
          <van-picker
            :columns="subjectOptions"
            @confirm="onSubjectFilterConfirm"
            @cancel="showSubjectPicker = false"
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

        <!-- 教师列表 -->
        <div class="teacher-list">
          <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
            <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadTeachers">
              <van-cell
                v-for="teacher in teachers"
                :key="teacher.id"
                is-link
                @click="showTeacherDetail(teacher)"
              >
                <template #title>
                  <div class="teacher-info">
                    <span class="teacher-name">{{ teacher.name }}</span>
                    <van-tag v-if="teacher.status === 'active'" type="success" size="small">正常</van-tag>
                    <van-tag v-else type="danger" size="small">停用</van-tag>
                  </div>
                </template>
                <template #label>
                  <div class="teacher-meta">
                    <span>{{ teacher.teacher_no }}</span>
                    <span>{{ teacher.subjects?.join('、') || '未设置' }}</span>
                  </div>
                </template>
                <template #right-icon>
                  <div class="action-icons" @click.stop>
                    <van-icon name="edit" @click="editTeacher(teacher)" />
                    <van-icon name="replay" @click="resetPassword(teacher)" />
                  </div>
                </template>
              </van-cell>
            </van-list>
          </van-pull-refresh>
        </div>
      </div>

      <!-- 新增/编辑教师弹窗 -->
      <van-popup
        v-model:show="showAddPopup"
        position="bottom"
        round
        style="height: 80%"
      >
        <div class="add-popup">
          <div class="popup-header">
            <span class="cancel-btn" @click="closeAddPopup">取消</span>
            <span class="popup-title">{{ editingTeacher ? '编辑教师' : '新增教师' }}</span>
            <van-button type="primary" size="small" :loading="saving" @click="saveTeacher">保存</van-button>
          </div>

          <div class="form-scroll">
            <div class="form-section">
              <van-field
                v-model="teacherForm.teacher_no"
                label="工号"
                placeholder="请输入工号"
                :rules="[{ required: true, message: '请输入工号' }]"
                :disabled="!!editingTeacher"
              />
              <van-field
                v-model="teacherForm.name"
                label="姓名"
                placeholder="请输入姓名"
                :rules="[{ required: true, message: '请输入姓名' }]"
              />
              <van-field name="gender" label="性别">
                <template #input>
                  <van-radio-group v-model="teacherForm.gender" direction="horizontal">
                    <van-radio name="男">男</van-radio>
                    <van-radio name="女">女</van-radio>
                  </van-radio-group>
                </template>
              </van-field>
              <van-field
                is-link
                readonly
                label="教授科目"
                placeholder="请选择科目"
                :model-value="teacherForm.subjects.join('、') || ''"
                @click="showSubjectFormPicker = true"
              />
              <van-field
                v-model="teacherForm.phone"
                label="联系电话"
                placeholder="请输入联系电话"
                type="tel"
              />
              <van-field
                is-link
                readonly
                label="管理班级"
                :model-value="teacherForm.manage_classes.join('、') || '请选择'"
                placeholder="请选择管理的班级"
                @click="showClassPicker = true"
              />
              <van-field
                v-model="teacherForm.remark"
                label="备注"
                placeholder="请输入备注"
                type="textarea"
                rows="2"
                autosize
              />
              <van-field name="status" label="状态" v-if="editingTeacher">
                <template #input>
                  <van-radio-group v-model="teacherForm.status" direction="horizontal">
                    <van-radio name="active">正常</van-radio>
                    <van-radio name="inactive">停用</van-radio>
                  </van-radio-group>
                </template>
              </van-field>
            </div>

            <div v-if="!editingTeacher" class="form-tip">
              <van-notice-bar>新增教师默认密码为123456</van-notice-bar>
            </div>
          </div>
        </div>
      </van-popup>

      <!-- 科目选择(表单) -->
      <van-popup v-model:show="showSubjectFormPicker" position="bottom" round>
        <van-picker
          :columns="subjectFormColumns"
          multiple
          @confirm="onSubjectFormConfirm"
          @cancel="showSubjectFormPicker = false"
        />
      </van-popup>

      <!-- 班级选择弹窗 -->
      <van-popup v-model:show="showClassPicker" position="bottom" round style="height: 60%">
        <div class="class-picker-popup">
          <div class="popup-header">
            <span class="cancel-btn" @click="showClassPicker = false">取消</span>
            <span class="popup-title">选择管理班级</span>
            <span class="confirm-btn" @click="confirmClassSelect">确定</span>
          </div>
          <div class="class-picker-content">
            <div v-for="(classes, grade) in allClasses" :key="grade" class="grade-section">
              <div class="grade-header" @click.stop="toggleAllClassesInGrade(grade)">
                <van-checkbox :model-value="isGradeAllSelected(grade)" @click.prevent>
                  {{ grade }}
                </van-checkbox>
                <span class="selected-count">({{ getSelectedCountInGrade(grade) }}/{{ classes.length }})</span>
              </div>
              <div class="class-list">
                <van-checkbox-group v-model="teacherForm.manage_classes">
                  <van-checkbox v-for="cls in classes" :key="cls" :name="cls" shape="square">
                    {{ cls }}
                  </van-checkbox>
                </van-checkbox-group>
              </div>
            </div>
            <div v-if="Object.keys(allClasses).length === 0" class="empty-classes">
              暂无班级数据，请先添加学生或班级
            </div>
          </div>
        </div>
      </van-popup>

      <!-- 教师详情弹窗 -->
      <van-popup v-model:show="showDetailPopup" position="bottom" round style="height: 60%">
        <div class="detail-popup" v-if="currentTeacher">
          <div class="popup-header">
            <span class="cancel-btn" @click="showDetailPopup = false">关闭</span>
            <span class="popup-title">教师详情</span>
            <van-button type="primary" size="small" @click="editTeacher(currentTeacher)">编辑</van-button>
          </div>
          <div class="detail-content">
            <van-cell-group>
              <van-cell title="工号" :value="currentTeacher.teacher_no" />
              <van-cell title="姓名" :value="currentTeacher.name" />
              <van-cell title="性别" :value="currentTeacher.gender || '未设置'" />
              <van-cell title="教授科目" :value="currentTeacher.subjects?.join('、') || '未设置'" />
              <van-cell title="联系电话" :value="currentTeacher.phone || '未设置'" />
              <van-cell title="管理班级" :value="currentTeacher.manage_classes?.join('、') || '未设置'" />
              <van-cell title="备注" :value="currentTeacher.remark || '无'" />
              <van-cell title="状态" :value="currentTeacher.status === 'active' ? '正常' : '停用'" />
              <van-cell title="创建时间" :value="currentTeacher.created_at" />
            </van-cell-group>
            <div class="detail-actions">
              <van-button type="warning" block @click="resetPassword(currentTeacher)">重置密码</van-button>
              <van-button type="danger" block @click="deleteTeacher(currentTeacher)">删除教师</van-button>
            </div>
          </div>
        </div>
      </van-popup>

      <!-- 批量导入弹窗 -->
      <van-popup
        v-model:show="showImportPopup"
        position="bottom"
        round
        style="height: 50%"
        :lock-scroll="true"
      >
        <div class="import-popup">
          <div class="popup-header">
            <span class="cancel-btn" @click="showImportPopup = false">关闭</span>
            <span class="popup-title">批量导入</span>
            <span></span>
          </div>
          <div class="import-content">
            <div class="import-desc">
              <p>支持导入 Excel 格式的教师信息文件（.xlsx）</p>
              <p>默认密码为 123456，示例行不会导入</p>
            </div>
            <div class="import-buttons">
              <van-uploader :after-read="handleFileUpload" accept=".xlsx,.xls" :max-count="1" class="import-uploader">
                <van-button size="large" :loading="importing" class="import-btn">
                  <van-icon name="upgrade" />
                  上传教师
                </van-button>
              </van-uploader>
              <van-button size="large" class="import-btn" @click="downloadTemplate">
                <van-icon name="down" />
                模板下载
              </van-button>
            </div>
            <div v-if="importResult" class="import-result">
              <van-notice-bar :color="importResult.success ? '#07c160' : '#ee0a24'" background="#f7f8fa">
                {{ importResult.message }}
              </van-notice-bar>
              <div v-if="importResult.details && importResult.details.length > 0" class="result-details">
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
import api from '@/api/index';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();

// 所有班级数据（按年级分组）
const allClasses = ref({});

// 筛选条件
const filterSubject = ref('');
const filterStatus = ref('');
const searchKeyword = ref('');

// 筛选弹出层
const showSubjectPicker = ref(false);
const showStatusPicker = ref(false);

// 教师列表
const teachers = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const currentPage = ref(0);
const pageSize = 20;

// PC 分页
const pcCurrentPage = ref(1);
const pcTotal = ref(0);

// 新增/编辑
const showAddPopup = ref(false);
const editingTeacher = ref(null);
const saving = ref(false);

const teacherForm = reactive({
  teacher_no: '',
  name: '',
  gender: '男',
  subjects: [],
  phone: '',
  manage_classes: [],
  remark: '',
  status: 'active'
});

// 表单选择器
const showSubjectFormPicker = ref(false);
const showClassPicker = ref(false);
const showDetailPopup = ref(false);
const currentTeacher = ref(null);

// 批量导入
const showImportPopup = ref(false);
const importing = ref(false);
const importResult = ref(null);

// 科目数据
const subjectList = ['语文', '数学', '英语', '科学', '道德与法治', '音乐', '美术', '体育', '信息技术'];

// 筛选选项
const subjectOptions = computed(() => [
  { text: '全部科目', value: '' },
  ...subjectList.map(s => ({ text: s, value: s }))
]);

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '正常', value: 'active' },
  { text: '停用', value: 'inactive' }
];

// 表单选项
const subjectFormColumns = subjectList.map(s => ({ text: s, value: s }));

function getStatusName(status) {
  if (!status) return '全部状态';
  return status === 'active' ? '正常' : '停用';
}

// 提示方法适配
function showSuccess(msg) {
  if (isPC.value) {
    ElMessage.success(msg);
  } else {
    showSuccessToast(msg);
  }
}

function showError(msg) {
  if (isPC.value) {
    ElMessage.error(msg);
  } else {
    showFailToast(msg);
  }
}

// 加载教师列表（移动端：无限滚动，PC端：分页）
async function loadTeachers() {
  if (loading.value) return;
  loading.value = true;
  currentPage.value++;

  try {
    const params = {
      page: currentPage.value,
      pageSize,
      subject: filterSubject.value,
      status: filterStatus.value,
      keyword: searchKeyword.value
    };
    const res = await api.get('/teachers', { params });
    if (res.code === 0) {
      teachers.value.push(...res.data.list);
      finished.value = res.data.list.length < pageSize;
    }
  } catch (err) {
    showError(err.message || '加载教师列表失败，请稍后重试');
    finished.value = true;
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

// PC 端分页加载
async function loadTeachersPc() {
  loading.value = true;
  try {
    const params = {
      page: pcCurrentPage.value,
      pageSize,
      subject: filterSubject.value,
      status: filterStatus.value,
      keyword: searchKeyword.value
    };
    const res = await api.get('/teachers', { params });
    if (res.code === 0) {
      teachers.value = res.data.list;
      pcTotal.value = res.data.total || 0;
    }
  } catch (err) {
    showError(err.message || '加载教师列表失败');
  } finally {
    loading.value = false;
  }
}

function onPcPageChange(page) {
  pcCurrentPage.value = page;
  loadTeachersPc();
}

function onRefresh() {
  if (isPC.value) {
    pcCurrentPage.value = 1;
    loadTeachersPc();
  } else {
    currentPage.value = 0;
    teachers.value = [];
    finished.value = false;
    loadTeachers();
  }
}

// 筛选回调
function onSubjectFilterConfirm({ selectedOptions }) {
  filterSubject.value = selectedOptions[0]?.value || '';
  showSubjectPicker.value = false;
  onRefresh();
}

function onStatusFilterConfirm({ selectedOptions }) {
  filterStatus.value = selectedOptions[0]?.value || '';
  showStatusPicker.value = false;
  onRefresh();
}

// 新增/编辑教师
function openAddPopup() {
  editingTeacher.value = null;
  resetForm();
  showAddPopup.value = true;
}

function closeAddPopup() {
  showAddPopup.value = false;
  editingTeacher.value = null;
  resetForm();
}

function resetForm() {
  teacherForm.teacher_no = '';
  teacherForm.name = '';
  teacherForm.gender = '男';
  teacherForm.subjects = [];
  teacherForm.phone = '';
  teacherForm.manage_classes = [];
  teacherForm.remark = '';
  teacherForm.status = 'active';
}

function editTeacher(teacher) {
  editingTeacher.value = teacher;
  teacherForm.teacher_no = teacher.teacher_no;
  teacherForm.name = teacher.name;
  teacherForm.gender = teacher.gender || '男';
  teacherForm.subjects = teacher.subjects || [];
  teacherForm.phone = teacher.phone || '';
  teacherForm.manage_classes = teacher.manage_classes || [];
  teacherForm.remark = teacher.remark || '';
  teacherForm.status = teacher.status || 'active';
  showDetailPopup.value = false;
  showAddPopup.value = true;
}

async function saveTeacher() {
  if (!teacherForm.teacher_no) {
    showError('请输入工号');
    return;
  }
  if (!teacherForm.name) {
    showError('请输入姓名');
    return;
  }
  if (teacherForm.subjects.length === 0) {
    showError('请选择教授科目');
    return;
  }

  saving.value = true;
  try {
    const data = {
      teacher_no: teacherForm.teacher_no,
      name: teacherForm.name,
      gender: teacherForm.gender,
      subjects: teacherForm.subjects,
      phone: teacherForm.phone,
      manage_classes: teacherForm.manage_classes,
      remark: teacherForm.remark,
      status: teacherForm.status
    };

    let res;
    if (editingTeacher.value) {
      res = await api.put(`/teachers/${editingTeacher.value.id}`, data);
    } else {
      res = await api.post('/teachers', data);
    }

    if (res.code === 0) {
      showSuccess(editingTeacher.value ? '修改成功' : '添加成功');
      closeAddPopup();
      onRefresh();
    } else {
      showError(res.message || '操作失败');
    }
  } catch (err) {
    showError(err.message || '操作失败');
  } finally {
    saving.value = false;
  }
}

// 删除教师
async function deleteTeacher(teacher) {
  try {
    if (isPC.value) {
      await ElMessageBox.confirm(
        `确定要删除教师"${teacher.name}"吗？`,
        '确认删除',
        { type: 'warning' }
      );
    } else {
      await showConfirmDialog({
        title: '确认删除',
        message: `确定要删除教师"${teacher.name}"吗？`
      });
    }
    const res = await api.delete(`/teachers/${teacher.id}`);
    if (res.code === 0) {
      showSuccess('删除成功');
      showDetailPopup.value = false;
      onRefresh();
    } else {
      showError(res.message || '删除失败');
    }
  } catch (err) {
    // 取消删除
  }
}

// 重置密码
async function resetPassword(teacher) {
  try {
    if (isPC.value) {
      await ElMessageBox.confirm(
        `确定要重置教师"${teacher.name}"的密码为123456吗？`,
        '确认重置',
        { type: 'warning' }
      );
    } else {
      await showConfirmDialog({
        title: '确认重置',
        message: `确定要重置教师"${teacher.name}"的密码为123456吗？`
      });
    }
    const res = await api.post(`/teachers/${teacher.id}/reset-password`);
    if (res.code === 0) {
      showSuccess('密码已重置为123456');
    } else {
      showError(res.message || '重置失败');
    }
  } catch (err) {
    // 取消重置
  }
}

// 教师详情
function showTeacherDetail(teacher) {
  currentTeacher.value = teacher;
  showDetailPopup.value = true;
}

// 表单选择器回调
function onSubjectFormConfirm({ selectedOptions }) {
  teacherForm.subjects = selectedOptions.map(opt => opt.value);
  showSubjectFormPicker.value = false;
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
    formData.append('file', file.file);
    const res = await api.post('/import/teachers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    if (res.code === 0) {
      importResult.value = {
        success: true,
        message: `导入完成！成功 ${res.data.success} 条，失败 ${res.data.failed} 条`,
        details: res.data.errors
      };
      showSuccess('导入成功');
      onRefresh();
    } else {
      importResult.value = {
        success: false,
        message: res.message || '导入失败',
        details: res.data?.errors
      };
      showError(res.message || '导入失败');
    }
  } catch (err) {
    importResult.value = {
      success: false,
      message: err.message || '导入失败，请检查文件格式'
    };
    showError(err.message || '导入失败');
  } finally {
    importing.value = false;
  }
}

// PC 端上传回调（el-upload on-change）
async function handlePcFileUpload(uploadFile) {
  importing.value = true;
  importResult.value = null;
  try {
    const formData = new FormData();
    formData.append('file', uploadFile.raw);
    const res = await api.post('/import/teachers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    if (res.code === 0) {
      importResult.value = {
        success: true,
        message: `导入完成！成功 ${res.data.success} 条，失败 ${res.data.failed} 条`,
        details: res.data.errors
      };
      showSuccess('导入成功');
      onRefresh();
    } else {
      importResult.value = {
        success: false,
        message: res.message || '导入失败',
        details: res.data?.errors
      };
      showError(res.message || '导入失败');
    }
  } catch (err) {
    importResult.value = {
      success: false,
      message: err.message || '导入失败，请检查文件格式'
    };
    showError(err.message || '导入失败');
  } finally {
    importing.value = false;
  }
}

async function downloadTemplate() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      showError('请先登录');
      return;
    }

    const response = await fetch('/api/import/teachers/template', {
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
    link.setAttribute('download', '教师导入模板.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    showSuccess('模板下载成功');
  } catch (err) {
    console.error('下载模板失败:', err);
    showError('模板下载失败: ' + (err.message || '未知错误'));
  }
}

onMounted(() => {
  if (isPC.value) {
    loadTeachersPc();
  } else {
    loadTeachers();
  }
  loadAllClasses();
});

// 加载所有班级
async function loadAllClasses() {
  try {
    const res = await api.get('/exam-tasks/all-classes');
    if (res.code === 0) {
      allClasses.value = res.data;
    }
  } catch (e) {
    console.error('加载班级列表失败:', e);
  }
}

// 班级选择辅助函数
function isGradeAllSelected(grade) {
  const classes = allClasses.value[grade] || [];
  return classes.length > 0 && classes.every(c => teacherForm.manage_classes.includes(c));
}

function getSelectedCountInGrade(grade) {
  const classes = allClasses.value[grade] || [];
  return classes.filter(c => teacherForm.manage_classes.includes(c)).length;
}

function toggleAllClassesInGrade(grade) {
  const classes = allClasses.value[grade] || [];
  const allSelected = isGradeAllSelected(grade);
  if (allSelected) {
    // 取消选择该年级所有班级
    teacherForm.manage_classes = teacherForm.manage_classes.filter(c => !c.startsWith(grade));
  } else {
    // 选择该年级所有班级
    const newClasses = classes.filter(c => !teacherForm.manage_classes.includes(c));
    teacherForm.manage_classes.push(...newClasses);
  }
}

function confirmClassSelect() {
  showClassPicker.value = false;
}
</script>

<style scoped>
.page-content {
  padding-bottom: 20px;
}

.filter-section {
  background: var(--fill-color-blank);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 10px;
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

.search-box {
  flex: 1;
  min-width: 0;
}

.search-box :deep(.van-search) {
  padding: 8px 0;
}

.search-box :deep(.van-search__content) {
  background: var(--bg-color);
}

.teacher-list {
  padding: 0 12px;
}

.teacher-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.teacher-name {
  font-size: 15px;
  font-weight: 500;
}

.teacher-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  color: var(--text-color-regular);
  font-size: 13px;
}

.action-icons {
  display: flex;
  gap: 16px;
}

.action-icons .van-icon {
  color: var(--color-primary);
  font-size: 18px;
}

/* 弹窗样式 */
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
  padding: 12px 16px;
  background: var(--fill-color-blank);
  border-bottom: 1px solid var(--border-color-lighter);
}

.cancel-btn {
  color: var(--text-color-regular);
  padding: 4px 8px;
}

.popup-title {
  font-size: 16px;
  font-weight: 500;
}

.form-scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
}

.form-section {
  background: var(--fill-color-blank);
  margin-top: 10px;
}

.form-tip {
  padding: 10px 16px;
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
  background: var(--bg-color);
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

/* 批量导入弹窗 */
.import-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
}

.import-content {
  flex: 1;
  padding: 20px 16px;
  overflow-y: auto;
}

.import-desc {
  background: var(--fill-color-blank);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.import-desc p {
  font-size: 14px;
  color: var(--text-color-regular);
  margin: 4px 0;
}

.import-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 20px;
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

.import-result {
  margin-top: 20px;
}

.result-details {
  background: var(--fill-color-blank);
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-color-regular);
  max-height: 150px;
  overflow-y: auto;
}

.result-details p {
  margin: 4px 0;
}

/* 班级选择弹窗 */
.class-picker-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
}

.class-picker-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.grade-section {
  background: var(--fill-color-blank);
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
}

.grade-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-color);
  font-weight: 500;
}

.selected-count {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-color-secondary);
  font-weight: normal;
}

.class-list {
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.class-list :deep(.van-checkbox) {
  min-width: 100px;
}

.empty-classes {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 40px 20px;
  font-size: 14px;
}

.confirm-btn {
  color: var(--color-primary);
  font-weight: 500;
  padding: 4px 8px;
}

/* PC 端样式 */
.teacher-page-pc {
  padding: 24px;
}

.pc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.pc-title {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
  color: var(--text-color-primary);
}

.pc-header-actions {
  display: flex;
  gap: 12px;
}

.pc-filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
}

.pc-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.pc-form-tip {
  color: var(--color-warning);
  font-size: 13px;
  margin-top: -8px;
  margin-bottom: 12px;
  padding-left: 90px;
}

.pc-import-content .import-desc {
  background: var(--bg-color);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.pc-import-content .import-desc p {
  font-size: 14px;
  color: var(--text-color-regular);
  margin: 4px 0;
}

.pc-import-content .import-buttons {
  display: flex;
  gap: 12px;
}

.pc-import-content .import-result {
  margin-top: 16px;
}

.pc-import-content .result-details {
  background: var(--bg-color);
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-color-regular);
  max-height: 150px;
  overflow-y: auto;
}

.pc-import-content .result-details p {
  margin: 4px 0;
}
</style>
