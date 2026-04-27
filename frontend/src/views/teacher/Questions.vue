<template>
  <div class="page">
    <!-- PC版本 -->
    <div v-if="isPC" class="questions-pc">
      <div class="pc-container">
        <!-- 左侧目录树 -->
        <aside class="left-panel">
          <div class="tree-card">
            <div class="tree-header">
              <h3 class="tree-title">题库目录</h3>
              <span class="tree-count">{{ totalCount }}题</span>
            </div>
            <el-tree
              ref="treeRef"
              :data="treeData"
              :props="treeProps"
              node-key="id"
              :default-expand-all="false"
              :expand-on-click-node="false"
              :highlight-current="true"
              @node-click="handleTreeNodeClick"
            >
              <template #default="{ node, data }">
                <span class="custom-tree-node">
                  <el-icon v-if="data.type === 'subject'" class="tree-icon"><Folder /></el-icon>
                  <el-icon v-else-if="data.type === 'grade'" class="tree-icon tree-icon--grade"><Document /></el-icon>
                  <el-icon v-else class="tree-icon tree-icon--chapter"><Notebook /></el-icon>
                  <span class="node-label">{{ node.label }}</span>
                  <span v-if="data.count" class="node-count">{{ data.count }}</span>
                </span>
              </template>
            </el-tree>
          </div>
        </aside>

        <!-- 右侧内容区 -->
        <main class="right-panel">
          <!-- 工具栏 -->
          <div class="toolbar">
            <div class="toolbar-left">
              <el-button type="primary" class="toolbar-btn" @click="openAddPopup">
                <el-icon><Plus /></el-icon>
                <span>新增题目</span>
              </el-button>
              <el-button class="toolbar-btn" @click="openImportPopup">
                <el-icon><Upload /></el-icon>
                <span>批量导入</span>
              </el-button>
              <el-button type="danger" class="toolbar-btn toolbar-btn--danger" :disabled="selectedRows.length === 0" @click="batchDelete">
                <el-icon><Delete /></el-icon>
                <span>批量删除</span>
              </el-button>
            </div>
            <div class="toolbar-right">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索题目内容"
                clearable
                class="search-input"
                @clear="handlePCSearch"
                @keyup.enter="handlePCSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-select v-model="filterType" placeholder="题目类型" clearable class="filter-select" @change="handlePCSearch">
                <el-option label="单选题" value="choice" />
                <el-option label="多选题" value="multiple" />
                <el-option label="填空题" value="fill" />
                <el-option label="判断题" value="judgment" />
                <el-option label="主观题" value="subjective" />
              </el-select>
              <el-select v-model="filterDifficulty" placeholder="难度" clearable class="filter-select filter-select--small" @change="handlePCSearch">
                <el-option label="简单" value="easy" />
                <el-option label="中等" value="medium" />
                <el-option label="困难" value="hard" />
              </el-select>
            </div>
          </div>

          <!-- 当前筛选条件 -->
          <div v-if="selectedChapter" class="current-filter">
            <el-tag closable @close="clearFilter">
              {{ selectedSubject }} / {{ selectedGrade }} / {{ selectedChapter }}
            </el-tag>
          </div>

          <!-- 题目表格 -->
          <div class="table-card">
            <el-table
              ref="tableRef"
              :data="questions"
              stripe
              class="question-table"
              v-loading="loading"
              @selection-change="handleSelectionChange"
            >
              <el-table-column type="selection" width="50" />
              <el-table-column label="题目内容" min-width="300">
                <template #default="{ row }">
                  <div class="question-content-cell" @click="showQuestionDetail(row)">
                    {{ row.content }}
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="类型" width="100">
                <template #default="{ row }">
                  <span :class="['type-tag', `type-tag--${row.question_type}`]">
                    {{ getTypeName(row.question_type) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="难度" width="80">
                <template #default="{ row }">
                  <span :class="['difficulty-tag', `difficulty-tag--${row.difficulty}`]">
                    {{ getDifficultyName(row.difficulty) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="subject" label="科目" width="80" />
              <el-table-column prop="score" label="分值" width="60">
                <template #default="{ row }">
                  <span class="score-text">{{ row.score }}</span>
                </template>
              </el-table-column>
              <el-table-column label="创建时间" width="160">
                <template #default="{ row }">
                  <span class="time-text">{{ formatDate(row.created_at) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" fixed="right" width="150">
                <template #default="{ row }">
                  <div class="action-btns">
                    <el-button type="primary" link size="small" @click="editQuestion(row)">编辑</el-button>
                    <el-button type="danger" link size="small" @click="confirmDeletePC(row)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="pagination-wrapper">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[20, 50, 100]"
                :total="totalQuestions"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handlePageSizeChange"
                @current-change="loadQuestions"
              />
            </div>
          </div>
        </main>
      </div>

      <!-- 新增/编辑题目弹窗 -->
      <el-dialog
        v-model="showAddPopup"
        :title="editingQuestion ? '编辑题目' : '新增题目'"
        width="700px"
        :close-on-click-modal="false"
        class="question-dialog"
      >
        <el-form :model="questionForm" label-width="80px" class="question-form">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="题目类型" required>
                <el-select v-model="questionForm.question_type" placeholder="请选择" style="width: 100%">
                  <el-option label="单选题" value="choice" />
                  <el-option label="多选题" value="multiple" />
                  <el-option label="填空题" value="fill" />
                  <el-option label="判断题" value="judgment" />
                  <el-option label="主观题" value="subjective" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="难度" required>
                <el-select v-model="questionForm.difficulty" placeholder="请选择" style="width: 100%">
                  <el-option label="简单" value="easy" />
                  <el-option label="中等" value="medium" />
                  <el-option label="困难" value="hard" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="科目" required>
                <el-select v-model="questionForm.subject" placeholder="请选择" style="width: 100%">
                  <el-option label="语文" value="语文" />
                  <el-option label="数学" value="数学" />
                  <el-option label="英语" value="英语" />
                  <el-option label="科学" value="科学" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="年级" required>
                <el-select v-model="questionForm.grade" placeholder="请选择" style="width: 100%">
                  <el-option label="一年级" value="一年级" />
                  <el-option label="二年级" value="二年级" />
                  <el-option label="三年级" value="三年级" />
                  <el-option label="四年级" value="四年级" />
                  <el-option label="五年级" value="五年级" />
                  <el-option label="六年级" value="六年级" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="分值" required>
                <el-input-number v-model="questionForm.score" :min="1" :max="100" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="章节" required>
            <el-input v-model="questionForm.chapter" placeholder="如：第一章 拼音" />
          </el-form-item>
          <el-form-item label="题目内容" required>
            <el-input v-model="questionForm.content" type="textarea" :rows="3" placeholder="请输入题目内容" />
          </el-form-item>

          <!-- 选项（单选题/多选题） -->
          <el-form-item v-if="questionForm.question_type === 'choice' || questionForm.question_type === 'multiple'" label="选项" required>
            <div class="options-container">
              <div v-for="(option, index) in questionForm.options" :key="index" class="option-row">
                <span class="option-letter">{{ optionLetters[index] }}.</span>
                <el-input v-model="questionForm.options[index]" :placeholder="'请输入选项' + optionLetters[index]" style="flex: 1" />
                <el-button v-if="questionForm.options.length > 2" type="danger" link @click="removeOption(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <el-button v-if="questionForm.options.length < 6" type="primary" link @click="addOption">+ 添加选项</el-button>
            </div>
          </el-form-item>

          <!-- 答案 -->
          <el-form-item label="答案" required>
            <!-- 单选题答案 -->
            <div v-if="questionForm.question_type === 'choice'" class="answer-row">
              <el-radio-group v-model="questionForm.answer">
                <el-radio v-for="(opt, idx) in questionForm.options" :key="idx" :label="optionLetters[idx]">
                  {{ optionLetters[idx] }}
                </el-radio>
              </el-radio-group>
            </div>
            <!-- 多选题答案 -->
            <div v-else-if="questionForm.question_type === 'multiple'" class="answer-row">
              <el-checkbox-group v-model="questionForm.answerArray">
                <el-checkbox v-for="(opt, idx) in questionForm.options" :key="idx" :label="optionLetters[idx]">
                  {{ optionLetters[idx] }}
                </el-checkbox>
              </el-checkbox-group>
              <span class="answer-hint">已选：{{ questionForm.answerArray && questionForm.answerArray.length > 0 ? questionForm.answerArray.sort().join('') : '无' }}</span>
            </div>
            <!-- 判断题答案 -->
            <div v-else-if="questionForm.question_type === 'judgment'" class="answer-row">
              <el-radio-group v-model="questionForm.answer">
                <el-radio label="A">正确</el-radio>
                <el-radio label="B">错误</el-radio>
              </el-radio-group>
            </div>
            <!-- 填空题/主观题答案 -->
            <el-input
              v-else
              v-model="questionForm.answerText"
              type="textarea"
              :rows="2"
              :placeholder="questionForm.question_type === 'fill' ? '多个答案用逗号分隔' : '请输入参考答案'"
            />
          </el-form-item>

          <el-form-item label="解析">
            <el-input v-model="questionForm.analysis" type="textarea" :rows="2" placeholder="填写答案解析（可选）" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="closeAddPopup">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveQuestion">保存</el-button>
        </template>
      </el-dialog>

      <!-- 题目详情弹窗 -->
      <el-dialog v-model="showDetailPopup" title="题目详情" width="600px" class="detail-dialog">
        <div v-if="currentQuestion" class="detail-content">
          <div class="detail-header">
            <span :class="['type-tag', `type-tag--${currentQuestion.question_type}`]">
              {{ getTypeName(currentQuestion.question_type) }}
            </span>
            <span :class="['difficulty-tag', `difficulty-tag--${currentQuestion.difficulty}`]">
              {{ getDifficultyName(currentQuestion.difficulty) }}
            </span>
            <span class="detail-score">{{ currentQuestion.score }}分</span>
          </div>
          <div class="detail-section">
            <div class="section-title">题干</div>
            <div class="section-text">{{ currentQuestion.content }}</div>
          </div>
          <div v-if="currentQuestion.question_type === 'choice' || currentQuestion.question_type === 'multiple'" class="detail-section">
            <div class="section-title">选项</div>
            <div v-for="(opt, idx) in currentQuestion.options" :key="idx" class="option-item">{{ optionLetters[idx] }}. {{ opt }}</div>
          </div>
          <div class="detail-section">
            <div class="section-title">答案</div>
            <div class="section-text section-text--answer">{{ currentQuestion.answer }}</div>
          </div>
          <div v-if="currentQuestion.analysis" class="detail-section">
            <div class="section-title">解析</div>
            <div class="section-text">{{ currentQuestion.analysis }}</div>
          </div>
        </div>
        <template #footer>
          <el-button @click="showDetailPopup = false">关闭</el-button>
          <el-button type="primary" @click="editQuestion(currentQuestion)">编辑</el-button>
        </template>
      </el-dialog>

      <!-- 批量导入弹窗 -->
      <el-dialog v-model="showImportPopup" title="批量导入" width="500px" class="import-dialog">
        <div class="import-content">
          <p class="import-desc">支持导入 Excel 格式的题库文件（.xlsx）</p>
          <p class="import-desc">每个工作簿对应一种题型，示例行不会导入</p>
          <div class="import-actions">
            <el-upload
              :show-file-list="false"
              accept=".xlsx,.xls"
              :before-upload="handleFileUploadPC"
            >
              <el-button type="primary" :loading="importing">
                <el-icon><Upload /></el-icon>
                上传题库
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
            <div v-if="importResult.errors && importResult.errors.length > 0" class="result-errors">
              <div class="error-title">失败原因：</div>
              <div v-for="(err, idx) in importResult.errors" :key="idx" class="error-item">{{ err }}</div>
            </div>
            <div v-if="importResult.details && importResult.details.length > 0" class="result-details">
              <p v-for="(detail, idx) in importResult.details" :key="idx">{{ detail }}</p>
            </div>
          </div>
        </div>
      </el-dialog>
    </div>

    <!-- 移动端版本 -->
    <div v-else>
      <van-nav-bar title="题库管理" left-arrow @click-left="$router.back()">
        <template #right>
          <van-icon name="description" size="20" class="nav-icon" @click="openImportPopup" />
          <van-icon name="plus" size="20" class="nav-icon" @click="openAddPopup" />
        </template>
      </van-nav-bar>

      <div class="page-content">
        <!-- 题库目录树 -->
        <div class="tree-section">
          <div class="section-header" @click="treeExpanded = !treeExpanded">
            <van-icon :name="treeExpanded ? 'arrow-down' : 'arrow'" />
            <span>题库目录</span>
            <van-tag type="primary" size="small">{{ totalCount }}题</van-tag>
          </div>

          <div v-show="treeExpanded" class="tree-content">
            <div v-for="subject in questionTree" :key="subject.subject" class="tree-subject">
              <div class="tree-node" @click="toggleSubject(subject.subject)">
                <van-icon :name="expandedSubjects.includes(subject.subject) ? 'arrow-down' : 'arrow'" />
                <van-icon name="bookmark-o" class="node-icon" />
                <span class="node-text">{{ subject.subject }}</span>
              </div>

              <div v-show="expandedSubjects.includes(subject.subject)" class="tree-children">
                <div v-for="grade in subject.grades" :key="grade.grade" class="tree-grade">
                  <div class="tree-node" @click="toggleGrade(subject.subject, grade.grade)">
                    <van-icon :name="expandedGrades.includes(subject.subject + grade.grade) ? 'arrow-down' : 'arrow'" />
                    <van-icon name="orders-o" class="node-icon node-icon--grade" />
                    <span class="node-text">{{ grade.grade }}</span>
                  </div>

                  <div v-show="expandedGrades.includes(subject.subject + grade.grade)" class="tree-children">
                    <div v-for="chapter in grade.chapters" :key="chapter.chapter"
                         class="tree-node tree-node--chapter"
                         :class="{ 'is-active': selectedChapter === chapter.chapter && selectedSubject === subject.subject }"
                         @click="selectChapter(subject.subject, grade.grade, chapter.chapter)">
                      <van-icon name="notes-o" class="node-icon node-icon--chapter" />
                      <span class="node-text">{{ chapter.chapter }}</span>
                      <van-tag type="primary" size="small" plain>{{ chapter.count }}</van-tag>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 筛选条件 -->
        <div class="filter-section">
          <div class="filter-buttons">
            <van-button
              size="small"
              :type="filterType ? 'primary' : 'default'"
              @click="showTypePicker = true"
            >
              {{ getTypeName(filterType) || '全部类型' }}
              <van-icon name="arrow-down" />
            </van-button>
            <van-button
              size="small"
              :type="filterDifficulty ? 'primary' : 'default'"
              @click="showDifficultyPicker = true"
            >
              {{ getDifficultyName(filterDifficulty) || '全部难度' }}
              <van-icon name="arrow-down" />
            </van-button>
          </div>
          <div class="search-box">
            <van-search
              v-model="searchKeyword"
              placeholder="搜索题目"
              shape="round"
              :clearable="true"
              @search="onRefresh"
              @clear="onRefresh"
            />
          </div>
        </div>

        <!-- 类型筛选弹出层 -->
        <van-popup v-model:show="showTypePicker" position="bottom" round>
          <van-picker
            :columns="typeOptions"
            @confirm="onTypeConfirm"
            @cancel="showTypePicker = false"
          />
        </van-popup>

        <!-- 难度筛选弹出层 -->
        <van-popup v-model:show="showDifficultyPicker" position="bottom" round>
          <van-picker
            :columns="difficultyOptions"
            @confirm="onDifficultyConfirm"
            @cancel="showDifficultyPicker = false"
          />
        </van-popup>

        <!-- 当前选中 -->
        <div v-if="selectedChapter" class="current-filter">
          <van-tag closeable @close="clearFilter">
            {{ selectedSubject }} / {{ selectedGrade }} / {{ selectedChapter }}
          </van-tag>
        </div>

        <!-- 题目列表 -->
        <div class="question-list">
          <!-- 初始加载指示器 -->
          <van-loading v-if="initialLoading" class="loading-center" size="24px">加载中...</van-loading>

          <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
            <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadQuestions">
              <div v-for="question in questions" :key="question.id" class="question-card" @click="showQuestionDetail(question)">
                <div class="question-header">
                  <van-tag :type="getTypeTagType(question.question_type)">
                    {{ getTypeName(question.question_type) }}
                  </van-tag>
                  <van-tag :type="getDifficultyTagType(question.difficulty)" plain>
                    {{ getDifficultyName(question.difficulty) }}
                  </van-tag>
                  <span class="question-score">{{ question.score }}分</span>
                </div>
                <div class="question-content">{{ question.content }}</div>
                <div class="question-footer">
                  <span class="question-chapter">{{ question.chapter || '未分类' }}</span>
                  <div class="question-actions">
                    <van-icon name="edit" @click.stop="editQuestion(question)" />
                    <van-icon name="delete-o" @click.stop="confirmDelete(question)" />
                  </div>
                </div>
              </div>
            </van-list>
          </van-pull-refresh>
        </div>
      </div>

      <!-- 新增/编辑题目弹窗 -->
      <van-popup
        v-model:show="showAddPopup"
        position="bottom"
        round
        style="height: 90%"
        :lock-scroll="true"
        :close-on-popstate="false"
      >
        <div class="add-popup" @touchmove.stop>
          <div class="popup-header">
            <span class="cancel-btn" @click="closeAddPopup">取消</span>
            <span class="popup-title">{{ editingQuestion ? '编辑题目' : '新增题目' }}</span>
            <van-button type="primary" size="small" :loading="saving" @click="saveQuestion">保存</van-button>
          </div>

          <div class="form-scroll" @touchmove.stop>
            <!-- 题目类型 -->
            <div class="form-section">
              <div class="section-title">题目类型</div>
              <div class="type-btns">
                <div
                  v-for="t in typeList"
                  :key="t.value"
                  class="type-btn"
                  :class="{ 'is-active': questionForm.question_type === t.value }"
                  @click="questionForm.question_type = t.value"
                >
                  {{ t.text }}
                </div>
              </div>
            </div>

            <!-- 基本信息 -->
            <div class="form-section">
              <div class="section-title">基本信息</div>

              <div class="form-item" @click="showSubjectSheet = true">
                <span class="item-label"><span class="required">*</span>科目</span>
                <div class="item-value">
                  <span :class="{ 'is-placeholder': !questionForm.subject }">{{ questionForm.subject || '请选择' }}</span>
                  <van-icon name="arrow" />
                </div>
              </div>

              <div class="form-item" @click="showGradeSheet = true">
                <span class="item-label"><span class="required">*</span>年级</span>
                <div class="item-value">
                  <span :class="{ 'is-placeholder': !questionForm.grade }">{{ questionForm.grade || '请选择' }}</span>
                  <van-icon name="arrow" />
                </div>
              </div>

              <div class="form-item">
                <span class="item-label"><span class="required">*</span>章节</span>
                <input v-model="questionForm.chapter" class="item-input" placeholder="如：第一章 拼音" />
              </div>

              <div class="form-item">
                <span class="item-label"><span class="required">*</span>分值</span>
                <input v-model.number="questionForm.score" type="number" class="item-input" placeholder="如：2" />
              </div>

              <div class="form-item" @click="showDifficultySheet = true">
                <span class="item-label"><span class="required">*</span>难度</span>
                <div class="item-value">
                  <span>{{ getDifficultyName(questionForm.difficulty) }}</span>
                  <van-icon name="arrow" />
                </div>
              </div>
            </div>

            <!-- 题目内容 -->
            <div class="form-section">
              <div class="section-title"><span class="required">*</span>题目内容</div>
              <textarea v-model="questionForm.content" class="textarea-input" placeholder="请输入题目内容" rows="3"></textarea>
            </div>

            <!-- 选项（单选题/多选题） -->
            <div class="form-section" v-if="questionForm.question_type === 'choice' || questionForm.question_type === 'multiple'">
              <div class="section-title"><span class="required">*</span>选项</div>
              <div v-for="(option, index) in questionForm.options" :key="index" class="option-item">
                <span class="option-label">{{ optionLetters[index] }}.</span>
                <input v-model="questionForm.options[index]" class="option-input" :placeholder="'请输入选项' + optionLetters[index]" />
                <van-icon v-if="questionForm.options.length > 2" name="delete-o" class="delete-icon" @click="removeOption(index)" />
              </div>
              <div v-if="questionForm.options.length < 6" class="add-option-btn" @click="addOption">+ 添加选项</div>
            </div>

            <!-- 答案 -->
            <div class="form-section">
              <div class="section-title"><span class="required">*</span>答案</div>

              <!-- 单选题答案 -->
              <div v-if="questionForm.question_type === 'choice'" class="answer-btns">
                <div
                  v-for="(opt, idx) in questionForm.options"
                  :key="idx"
                  class="answer-btn"
                  :class="{ 'is-active': questionForm.answer === optionLetters[idx] }"
                  @click="questionForm.answer = optionLetters[idx]"
                >
                  {{ optionLetters[idx] }}
                </div>
              </div>

              <!-- 多选题答案 -->
              <div v-else-if="questionForm.question_type === 'multiple'" class="answer-btns">
                <div
                  v-for="(opt, idx) in questionForm.options"
                  :key="idx"
                  class="answer-btn"
                  :class="{ 'is-active': questionForm.answerArray && questionForm.answerArray.includes(optionLetters[idx]) }"
                  @click="toggleMultipleAnswer(optionLetters[idx])"
                >
                  {{ optionLetters[idx] }}
                </div>
                <div class="answer-hint">已选：{{ questionForm.answerArray && questionForm.answerArray.length > 0 ? questionForm.answerArray.sort().join('') : '无' }}</div>
              </div>

              <!-- 判断题答案 -->
              <div v-else-if="questionForm.question_type === 'judgment'" class="answer-btns">
                <div
                  class="answer-btn answer-btn--judgment"
                  :class="{ 'is-active': questionForm.answer === 'A' }"
                  @click="questionForm.answer = 'A'"
                >
                  正确
                </div>
                <div
                  class="answer-btn answer-btn--judgment"
                  :class="{ 'is-active': questionForm.answer === 'B' }"
                  @click="questionForm.answer = 'B'"
                >
                  错误
                </div>
              </div>

              <textarea
                v-else
                v-model="questionForm.answerText"
                class="textarea-input"
                :placeholder="questionForm.question_type === 'fill' ? '多个答案用逗号分隔' : '请输入参考答案'"
                rows="2"
              ></textarea>
            </div>

            <!-- 解析 -->
            <div class="form-section">
              <div class="section-title">解析（可选）</div>
              <textarea v-model="questionForm.analysis" class="textarea-input" placeholder="填写答案解析" rows="2"></textarea>
            </div>
          </div>
        </div>
      </van-popup>

      <!-- 科目选择 -->
      <van-action-sheet v-model:show="showSubjectSheet" :actions="subjectActions" @select="onSelectSubject" cancel-text="取消" />

      <!-- 年级选择 -->
      <van-action-sheet v-model:show="showGradeSheet" :actions="gradeActions" @select="onSelectGrade" cancel-text="取消" />

      <!-- 难度选择 -->
      <van-action-sheet v-model:show="showDifficultySheet" :actions="difficultyActions" @select="onSelectDifficulty" cancel-text="取消" />

      <!-- 题目详情弹窗 -->
      <van-popup v-model:show="showDetailPopup" position="bottom" round style="height: 70%">
        <div class="detail-popup" v-if="currentQuestion">
          <div class="popup-header">
            <span class="cancel-btn" @click="showDetailPopup = false">关闭</span>
            <span class="popup-title">题目详情</span>
            <van-button type="primary" size="small" @click="editQuestion(currentQuestion)">编辑</van-button>
          </div>
          <div class="detail-content">
            <div class="detail-header">
              <van-tag :type="getTypeTagType(currentQuestion.question_type)">{{ getTypeName(currentQuestion.question_type) }}</van-tag>
              <van-tag :type="getDifficultyTagType(currentQuestion.difficulty)" plain>{{ getDifficultyName(currentQuestion.difficulty) }}</van-tag>
              <span>{{ currentQuestion.score }}分</span>
            </div>
            <div class="detail-section">
              <div class="section-title">题干</div>
              <div class="section-content">{{ currentQuestion.content }}</div>
            </div>
            <div v-if="currentQuestion.question_type === 'choice' || currentQuestion.question_type === 'multiple'" class="detail-section">
              <div class="section-title">选项</div>
              <div v-for="(opt, idx) in currentQuestion.options" :key="idx" class="option-item">{{ optionLetters[idx] }}. {{ opt }}</div>
            </div>
            <div class="detail-section">
              <div class="section-title">答案</div>
              <div class="section-content section-content--answer">{{ currentQuestion.answer }}</div>
            </div>
            <div v-if="currentQuestion.analysis" class="detail-section">
              <div class="section-title">解析</div>
              <div class="section-content">{{ currentQuestion.analysis }}</div>
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
              <p>支持导入 Excel 格式的题库文件（.xlsx）</p>
              <p>每个工作簿对应一种题型，示例行不会导入</p>
            </div>
            <div class="import-buttons">
              <van-uploader :after-read="handleFileUpload" accept=".xlsx,.xls" :max-count="1" class="import-uploader">
                <van-button size="large" :loading="importing" class="import-btn">
                  <van-icon name="upgrade" />
                  上传题库
                </van-button>
              </van-uploader>
              <van-button size="large" class="import-btn" @click="downloadTemplate">
                <van-icon name="down" />
                模板下载
              </van-button>
            </div>
            <div v-if="importResult" class="import-result">
              <van-notice-bar :color="importResult.success ? 'var(--color-success)' : 'var(--color-danger)'" background="var(--bg-color)">
                {{ importResult.message }}
              </van-notice-bar>
              <div v-if="importResult.errors && importResult.errors.length > 0" class="result-errors">
                <div class="error-title">失败原因：</div>
                <div v-for="(err, idx) in importResult.errors" :key="idx" class="error-item">
                  {{ err }}
                </div>
              </div>
              <div v-if="importResult.details && importResult.details.length > 0" class="result-details">
                <p v-for="(detail, idx) in importResult.details" :key="idx">{{ detail }}</p>
              </div>
            </div>
          </div>
        </div>
      </van-popup>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Upload, Download, Search, Delete, Folder, Document, Notebook } from '@element-plus/icons-vue';
import api from '@/api/index';
import { useDevice } from '@/composables/useDevice';

const { isPC } = useDevice();

// 触摸滚动优化
let scrollEl = null;
let startY = 0;
let isScrolling = false;

function handleTouchStart(e) {
  startY = e.touches[0].clientY;
  isScrolling = true;
}

function handleTouchMove(e) {
  if (!scrollEl || !isScrolling) return;
  const currentY = e.touches[0].clientY;
  const deltaY = currentY - startY;
  const { scrollTop, scrollHeight, clientHeight } = scrollEl;

  // 阻止边界滚动穿透
  if (deltaY > 0 && scrollTop <= 0) {
    e.preventDefault();
  } else if (deltaY < 0 && scrollTop + clientHeight >= scrollHeight) {
    e.preventDefault();
  }
  startY = currentY;
}

function handleTouchEnd() {
  isScrolling = false;
}

// 题库树
const questionTree = ref([]);
const expandedSubjects = ref([]);
const expandedGrades = ref([]);
const treeExpanded = ref(true);
const totalCount = computed(() => {
  let count = 0;
  questionTree.value.forEach(s => s.grades.forEach(g => g.chapters.forEach(c => count += c.count)));
  return count;
});

// PC端树形数据
const treeRef = ref(null);
const treeProps = {
  children: 'children',
  label: 'label'
};

const treeData = computed(() => {
  return questionTree.value.map(subject => ({
    id: `subject-${subject.subject}`,
    label: subject.subject,
    type: 'subject',
    children: subject.grades.map(grade => ({
      id: `grade-${subject.subject}-${grade.grade}`,
      label: grade.grade,
      type: 'grade',
      children: grade.chapters.map(chapter => ({
        id: `chapter-${subject.subject}-${grade.grade}-${chapter.chapter}`,
        label: chapter.chapter,
        type: 'chapter',
        count: chapter.count,
        subject: subject.subject,
        grade: grade.grade,
        chapter: chapter.chapter
      }))
    }))
  }));
});

function handleTreeNodeClick(data) {
  if (data.type === 'chapter') {
    selectedSubject.value = data.subject;
    selectedGrade.value = data.grade;
    selectedChapter.value = data.chapter;
    handlePCSearch();
  }
}

// 筛选
const selectedSubject = ref('');
const selectedGrade = ref('');
const selectedChapter = ref('');
const filterType = ref('');
const filterDifficulty = ref('');
const searchKeyword = ref('');
const showTypePicker = ref(false);
const showDifficultyPicker = ref(false);

const typeOptions = [
  { text: '全部类型', value: '' },
  { text: '单选题', value: 'choice' },
  { text: '多选题', value: 'multiple' },
  { text: '填空题', value: 'fill' },
  { text: '判断题', value: 'judgment' },
  { text: '主观题', value: 'subjective' }
];

const difficultyOptions = [
  { text: '全部难度', value: '' },
  { text: '简单', value: 'easy' },
  { text: '中等', value: 'medium' },
  { text: '困难', value: 'hard' }
];

function onTypeConfirm({ selectedOptions }) {
  filterType.value = selectedOptions[0]?.value || '';
  showTypePicker.value = false;
  onRefresh();
}

function onDifficultyConfirm({ selectedOptions }) {
  filterDifficulty.value = selectedOptions[0]?.value || '';
  showDifficultyPicker.value = false;
  onRefresh();
}

const typeList = [
  { text: '单选题', value: 'choice' },
  { text: '多选题', value: 'multiple' },
  { text: '填空题', value: 'fill' },
  { text: '判断题', value: 'judgment' },
  { text: '主观题', value: 'subjective' }
];

// 题目列表
const questions = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const totalQuestions = ref(0);
const isLoading = ref(false);  // 用于防止重复请求的独立状态
const initialLoading = ref(true);  // 初始加载状态

// PC端批量选择
const selectedRows = ref([]);
const tableRef = ref(null);

function handleSelectionChange(selection) {
  selectedRows.value = selection;
}

// 新增/编辑
const showAddPopup = ref(false);
const editingQuestion = ref(null);
const saving = ref(false);

const questionForm = reactive({
  question_type: 'choice',
  subject: '',
  grade: '',
  chapter: '',
  content: '',
  options: ['', '', '', ''],
  answer: '',
  answerArray: [],
  answerText: '',
  analysis: '',
  difficulty: 'medium',
  score: 2
});

// 选择器
const showSubjectSheet = ref(false);
const showGradeSheet = ref(false);
const showDifficultySheet = ref(false);

const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

const subjectActions = [
  { name: '语文' },
  { name: '数学' },
  { name: '英语' },
  { name: '科学' }
];

const gradeActions = [
  { name: '一年级' },
  { name: '二年级' },
  { name: '三年级' },
  { name: '四年级' },
  { name: '五年级' },
  { name: '六年级' }
];

const difficultyActions = [
  { name: '简单', value: 'easy' },
  { name: '中等', value: 'medium' },
  { name: '困难', value: 'hard' }
];

// 详情
const showDetailPopup = ref(false);
const currentQuestion = ref(null);

// 批量导入
const showImportPopup = ref(false);
const importing = ref(false);
const importResult = ref(null);

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
    const res = await api.post('/questions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    if (res.code === 0) {
      const errorCount = res.data.errors?.length || 0;
      const successCount = res.data.total || 0;
      importResult.value = {
        success: successCount > 0,
        message: successCount > 0
          ? (errorCount > 0 ? `成功导入 ${successCount} 道题目，失败 ${errorCount} 道` : `成功导入 ${successCount} 道题目`)
          : '导入失败，没有成功导入任何题目',
        details: res.data.details,
        errors: res.data.errors
      };
      if (successCount > 0) {
        showSuccessToast(`成功导入 ${successCount} 道题目`);
        onRefresh();
        loadQuestionTree();
      } else {
        showFailToast('导入失败');
      }
    } else {
      importResult.value = {
        success: false,
        message: res.message || '导入失败',
        details: res.data?.errors
      };
      showFailToast(res.message || '导入失败');
    }
  } catch (err) {
    importResult.value = {
      success: false,
      message: err.message || '导入失败，请检查文件格式'
    };
    showFailToast(err.message || '导入失败');
  } finally {
    importing.value = false;
  }
}

// PC端文件上传
function handleFileUploadPC(file) {
  importing.value = true;
  importResult.value = null;

  const formData = new FormData();
  formData.append('file', file);

  api.post('/questions/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => {
    if (res.code === 0) {
      const errorCount = res.data.errors?.length || 0;
      const successCount = res.data.total || 0;
      importResult.value = {
        success: successCount > 0,
        message: successCount > 0
          ? (errorCount > 0 ? `成功导入 ${successCount} 道题目，失败 ${errorCount} 道` : `成功导入 ${successCount} 道题目`)
          : '导入失败，没有成功导入任何题目',
        details: res.data.details,
        errors: res.data.errors
      };
      if (successCount > 0) {
        ElMessage.success(`成功导入 ${successCount} 道题目`);
        handlePCSearch();
        loadQuestionTree();
      } else {
        ElMessage.error('导入失败');
      }
    } else {
      importResult.value = {
        success: false,
        message: res.message || '导入失败',
        details: res.data?.errors
      };
      ElMessage.error(res.message || '导入失败');
    }
  }).catch(err => {
    importResult.value = {
      success: false,
      message: err.message || '导入失败，请检查文件格式'
    };
    ElMessage.error(err.message || '导入失败');
  }).finally(() => {
    importing.value = false;
  });

  return false; // 阻止el-upload默认上传行为
}

async function downloadTemplate() {
  try {
    // 从 localStorage 获取 token（与 userStore 一致）
    const token = localStorage.getItem('token');
    if (!token) {
      if (isPC.value) {
        ElMessage.warning('请先登录');
      } else {
        showFailToast('请先登录');
      }
      return;
    }

    const response = await fetch('/api/questions/template', {
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
    link.setAttribute('download', '题库导入模板.xlsx');
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

// 加载题库树
async function loadQuestionTree() {
  try {
    const res = await api.get('/questions/tree');
    if (res.code === 0) {
      questionTree.value = res.data;
    } else {
      console.error('加载题库树失败:', res.message);
    }
  } catch (err) {
    console.error('加载题库树失败:', err);
    // axios拦截器会处理认证错误并重定向到登录页
  }
}

// 展开/折叠
function toggleSubject(subject) {
  const idx = expandedSubjects.value.indexOf(subject);
  if (idx >= 0) expandedSubjects.value.splice(idx, 1);
  else expandedSubjects.value.push(subject);
}

function toggleGrade(subject, grade) {
  const key = subject + grade;
  const idx = expandedGrades.value.indexOf(key);
  if (idx >= 0) expandedGrades.value.splice(idx, 1);
  else expandedGrades.value.push(key);
}

function selectChapter(subject, grade, chapter) {
  selectedSubject.value = subject;
  selectedGrade.value = grade;
  selectedChapter.value = chapter;
  onRefresh();
}

function clearFilter() {
  selectedSubject.value = '';
  selectedGrade.value = '';
  selectedChapter.value = '';
  if (isPC.value) {
    handlePCSearch();
  } else {
    onRefresh();
  }
}

// 加载题目列表
async function loadQuestions() {
  // 使用独立状态防止重复调用（van-list会自动设置loading=true）
  if (isLoading.value) return;
  isLoading.value = true;

  const params = {
    page: currentPage.value,
    pageSize: pageSize.value,
    subject: selectedSubject.value,
    grade: selectedGrade.value,
    chapter: selectedChapter.value,
    type: filterType.value,
    difficulty: filterDifficulty.value,
    keyword: searchKeyword.value
  };

  try {
    const res = await api.get('/questions', { params });

    if (res.code === 0) {
      // 确保res.data.list是数组
      const list = Array.isArray(res.data?.list) ? res.data.list : [];
      if (isPC.value) {
        questions.value = list;
        totalQuestions.value = res.data.total || list.length;
      } else {
        questions.value.push(...list);
        finished.value = list.length < pageSize.value;
      }
    } else {
      // 处理非成功响应（如认证失败等）
      console.error('加载题目失败:', res.message);
      if (isPC.value) {
        ElMessage.error(res.message || '加载失败');
      } else {
        showFailToast(res.message || '加载失败');
      }
      finished.value = true;
    }
  } catch (err) {
    // axios拦截器会处理认证错误并重定向到登录页
    console.error('加载题目异常:', err.message);
    if (isPC.value) {
      ElMessage.error(err.message || '加载题目列表失败');
    } else {
      showFailToast(err.message || '加载题目列表失败，请稍后重试');
    }
    finished.value = true;
  } finally {
    isLoading.value = false;
    loading.value = false;  // 必须设置false，否则van-list会一直显示加载中
    refreshing.value = false;
    initialLoading.value = false;  // 初始加载完成
  }
}

function onRefresh() {
  currentPage.value = 1;
  questions.value = [];
  finished.value = false;
  loadQuestions();
}

// PC端搜索
function handlePCSearch() {
  currentPage.value = 1;
  loadQuestions();
}

function handlePageSizeChange() {
  currentPage.value = 1;
  loadQuestions();
}

// 题目操作
function showQuestionDetail(question) {
  currentQuestion.value = question;
  showDetailPopup.value = true;
}

function editQuestion(question) {
  editingQuestion.value = question;
  questionForm.question_type = question.question_type;
  questionForm.subject = question.subject;
  questionForm.grade = question.grade || '';
  questionForm.chapter = question.chapter || '';
  questionForm.content = question.content;
  questionForm.options = question.options && question.options.length ? [...question.options] : ['', '', '', ''];
  questionForm.answer = question.answer;
  questionForm.answerText = question.answer;
  // 多选题答案处理
  if (question.question_type === 'multiple' && question.answer) {
    questionForm.answerArray = question.answer.split('');
  } else {
    questionForm.answerArray = [];
  }
  questionForm.analysis = question.analysis || '';
  questionForm.difficulty = question.difficulty || 'medium';
  questionForm.score = question.score || 2;
  showDetailPopup.value = false;
  showAddPopup.value = true;
}

async function confirmDelete(question) {
  try {
    await showConfirmDialog({ title: '确认删除', message: '确定要删除这道题目吗？' });
    const res = await api.delete(`/questions/${question.id}`);
    if (res.code === 0) {
      showSuccessToast('删除成功');
      onRefresh();
      loadQuestionTree();
    }
  } catch (err) { }
}

// PC端删除确认
async function confirmDeletePC(question) {
  try {
    await ElMessageBox.confirm('确定要删除这道题目吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    const res = await api.delete(`/questions/${question.id}`);
    if (res.code === 0) {
      ElMessage.success('删除成功');
      handlePCSearch();
      loadQuestionTree();
    } else {
      ElMessage.error(res.message || '删除失败');
    }
  } catch (err) {
    // 取消删除
  }
}

// PC端批量删除
async function batchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的题目');
    return;
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 道题目吗？`, '批量删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    const ids = selectedRows.value.map(q => q.id);
    const res = await api.post('/questions/batch-delete', { ids });
    if (res.code === 0) {
      ElMessage.success('删除成功');
      selectedRows.value = [];
      handlePCSearch();
      loadQuestionTree();
    } else {
      ElMessage.error(res.message || '删除失败');
    }
  } catch (err) {
    // 取消删除
  }
}

function openAddPopup() {
  editingQuestion.value = null;
  resetForm();
  showAddPopup.value = true;
  if (!isPC.value) {
    nextTick(() => {
      scrollEl = document.querySelector('.form-scroll');
      if (scrollEl) {
        scrollEl.addEventListener('touchstart', handleTouchStart, { passive: false });
        scrollEl.addEventListener('touchmove', handleTouchMove, { passive: false });
        scrollEl.addEventListener('touchend', handleTouchEnd, { passive: false });
      }
    });
  }
}

function closeAddPopup() {
  showAddPopup.value = false;
  editingQuestion.value = null;
  // 清理事件监听
  if (scrollEl) {
    scrollEl.removeEventListener('touchstart', handleTouchStart);
    scrollEl.removeEventListener('touchmove', handleTouchMove);
    scrollEl.removeEventListener('touchend', handleTouchEnd);
    scrollEl = null;
  }
  resetForm();
}

function resetForm() {
  questionForm.question_type = 'choice';
  questionForm.subject = '';
  questionForm.grade = '';
  questionForm.chapter = '';
  questionForm.content = '';
  questionForm.options = ['', '', '', ''];
  questionForm.answer = '';
  questionForm.answerArray = [];
  questionForm.answerText = '';
  questionForm.analysis = '';
  questionForm.difficulty = 'medium';
  questionForm.score = 2;
}

function addOption() {
  if (questionForm.options.length < 6) questionForm.options.push('');
}

function removeOption(index) {
  const removedLetter = optionLetters[index];
  questionForm.options.splice(index, 1);

  // 同步更新答案
  if (questionForm.question_type === 'multiple') {
    // 多选题：移除已删除选项对应的答案
    if (questionForm.answerArray && questionForm.answerArray.includes(removedLetter)) {
      const idx = questionForm.answerArray.indexOf(removedLetter);
      questionForm.answerArray.splice(idx, 1);
    }
  } else if (questionForm.question_type === 'choice') {
    // 单选题：如果删除的是已选答案，清空答案
    if (questionForm.answer === removedLetter) {
      questionForm.answer = '';
    }
  }
}

// 多选题答案切换
function toggleMultipleAnswer(letter) {
  if (!questionForm.answerArray) {
    questionForm.answerArray = [];
  }
  const idx = questionForm.answerArray.indexOf(letter);
  if (idx >= 0) {
    questionForm.answerArray.splice(idx, 1);
  } else {
    questionForm.answerArray.push(letter);
  }
}

// 选择器回调
function onSelectSubject(action) {
  questionForm.subject = action.name;
  showSubjectSheet.value = false;
}

function onSelectGrade(action) {
  questionForm.grade = action.name;
  showGradeSheet.value = false;
}

function onSelectDifficulty(action) {
  questionForm.difficulty = action.value;
  showDifficultySheet.value = false;
}

async function saveQuestion() {
  // 基本信息验证
  if (!questionForm.subject) {
    if (isPC.value) {
      ElMessage.warning('请选择科目');
    } else {
      showFailToast('请选择科目');
    }
    return;
  }
  if (!questionForm.grade) {
    if (isPC.value) {
      ElMessage.warning('请选择年级');
    } else {
      showFailToast('请选择年级');
    }
    return;
  }
  if (!questionForm.chapter || !questionForm.chapter.trim()) {
    if (isPC.value) {
      ElMessage.warning('请填写章节');
    } else {
      showFailToast('请填写章节');
    }
    return;
  }
  if (!questionForm.score || questionForm.score <= 0) {
    if (isPC.value) {
      ElMessage.warning('请填写有效分值');
    } else {
      showFailToast('请填写有效分值');
    }
    return;
  }
  if (!questionForm.content || !questionForm.content.trim()) {
    if (isPC.value) {
      ElMessage.warning('请填写题目内容');
    } else {
      showFailToast('请填写题目内容');
    }
    return;
  }

  // 单选题/多选题选项验证
  if (questionForm.question_type === 'choice' || questionForm.question_type === 'multiple') {
    const validOptions = questionForm.options.filter(o => o && o.trim());
    if (validOptions.length < 2) {
      if (isPC.value) {
        ElMessage.warning('请至少填写2个选项');
      } else {
        showFailToast('请至少填写2个选项');
      }
      return;
    }
  }

  // 单选题答案验证
  if (questionForm.question_type === 'choice' && !questionForm.answer) {
    if (isPC.value) {
      ElMessage.warning('请选择正确答案');
    } else {
      showFailToast('请选择正确答案');
    }
    return;
  }
  // 多选题答案验证
  if (questionForm.question_type === 'multiple' && (!questionForm.answerArray || questionForm.answerArray.length < 2)) {
    if (isPC.value) {
      ElMessage.warning('多选题至少选择2个答案');
    } else {
      showFailToast('多选题至少选择2个答案');
    }
    return;
  }
  // 判断题答案验证
  if (questionForm.question_type === 'judgment' && !questionForm.answer) {
    if (isPC.value) {
      ElMessage.warning('请选择正确答案');
    } else {
      showFailToast('请选择正确答案');
    }
    return;
  }
  // 填空题和主观题答案验证
  if ((questionForm.question_type === 'fill' || questionForm.question_type === 'subjective') && (!questionForm.answerText || !questionForm.answerText.trim())) {
    if (isPC.value) {
      ElMessage.warning('请填写参考答案');
    } else {
      showFailToast('请填写参考答案');
    }
    return;
  }

  saving.value = true;
  try {
    const data = {
      question_type: questionForm.question_type,
      subject: questionForm.subject,
      grade: questionForm.grade,
      chapter: questionForm.chapter,
      content: questionForm.content,
      options: (questionForm.question_type === 'choice' || questionForm.question_type === 'multiple') ? questionForm.options.filter(o => o && o.trim()) : null,
      answer: questionForm.question_type === 'choice' ? questionForm.answer :
              questionForm.question_type === 'multiple' ? questionForm.answerArray.sort().join('') :
              questionForm.question_type === 'judgment' ? questionForm.answer :
              questionForm.answerText,
      analysis: questionForm.analysis,
      difficulty: questionForm.difficulty,
      score: questionForm.score
    };

    let res;
    if (editingQuestion.value) {
      res = await api.put(`/questions/${editingQuestion.value.id}`, data);
    } else {
      res = await api.post('/questions', data);
    }

    if (res.code === 0) {
      if (isPC.value) {
        ElMessage.success(editingQuestion.value ? '修改成功' : '添加成功');
      } else {
        showSuccessToast(editingQuestion.value ? '修改成功' : '添加成功');
      }
      closeAddPopup();
      if (isPC.value) {
        handlePCSearch();
      } else {
        onRefresh();
      }
      loadQuestionTree();
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

// 工具函数
function getTypeName(type) {
  const map = { choice: '单选题', multiple: '多选题', fill: '填空题', judgment: '判断题', subjective: '主观题' };
  return map[type] || type;
}

function getTypeTagType(type) {
  const map = { choice: 'primary', multiple: 'primary', fill: 'success', judgment: 'primary', subjective: 'warning' };
  return map[type] || 'default';
}

function getElTypeTagType(type) {
  const map = { choice: 'primary', multiple: '', fill: 'success', judgment: 'primary', subjective: 'warning' };
  return map[type] || 'info';
}

function getDifficultyName(difficulty) {
  if (!difficulty) return '';
  const map = { easy: '简单', medium: '中等', hard: '困难' };
  return map[difficulty] || '中等';
}

function getDifficultyTagType(difficulty) {
  const map = { easy: 'success', medium: 'warning', hard: 'danger' };
  return map[difficulty] || 'default';
}

function getElDifficultyTagType(difficulty) {
  const map = { easy: 'success', medium: 'warning', hard: 'danger' };
  return map[difficulty] || 'info';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(() => {
  loadQuestionTree();
  if (isPC.value) {
    loadQuestions();
  }
  // 移动端不需要手动调用 loadQuestions()，van-list 会自动触发 @load
});

onUnmounted(() => {
  if (scrollEl) {
    scrollEl.removeEventListener('touchstart', handleTouchStart);
    scrollEl.removeEventListener('touchmove', handleTouchMove);
    scrollEl.removeEventListener('touchend', handleTouchEnd);
    scrollEl = null;
  }
});
</script>

<style scoped>
/* ==========================================
   PC端样式 - 使用CSS变量
   ========================================== */
.questions-pc {
  padding: var(--spacing-lg, 24px);
  min-height: calc(100vh - var(--header-height, 56px));
  background-color: var(--bg-color);
}

.pc-container {
  display: flex;
  gap: var(--spacing-lg, 24px);
  max-width: 1400px;
  margin: 0 auto;
}

/* 左侧目录树 */
.left-panel {
  width: 280px;
  flex-shrink: 0;
}

.tree-card {
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 8px);
  padding: var(--spacing-md, 16px);
  height: calc(100vh - 100px);
  overflow: auto;
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--spacing-md, 16px);
  border-bottom: 1px solid var(--border-color-lighter);
  margin-bottom: var(--spacing-md, 16px);
}

.tree-title {
  font-size: var(--font-size-medium, 16px);
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.tree-count {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--color-primary);
  font-weight: 500;
}

.custom-tree-node {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
  flex: 1;
}

.tree-icon {
  color: var(--color-primary);
  font-size: 16px;
}

.tree-icon--grade {
  color: var(--color-warning);
}

.tree-icon--chapter {
  color: var(--color-success);
}

.node-label {
  flex: 1;
  font-size: var(--font-size-small, 13px);
  color: var(--text-color-regular);
}

.node-count {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-secondary);
  background-color: var(--fill-color);
  padding: 2px 6px;
  border-radius: var(--border-radius-small, 2px);
}

/* 右侧内容区 */
.right-panel {
  flex: 1;
  min-width: 0;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md, 16px);
  background-color: var(--fill-color-blank);
  padding: var(--spacing-md, 16px);
  border-radius: var(--border-radius-large, 8px);
  box-shadow: var(--box-shadow-lighter, 0 1px 4px 0 rgba(0, 0, 0, 0.04));
}

.toolbar-left {
  display: flex;
  gap: var(--spacing-sm, 8px);
}

.toolbar-right {
  display: flex;
  gap: var(--spacing-sm, 8px);
  align-items: center;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
}

.toolbar-btn--danger {
  margin-left: var(--spacing-sm, 8px);
}

.search-input {
  width: 200px;
}

.filter-select {
  width: 120px;
}

.filter-select--small {
  width: 100px;
}

/* 当前筛选条件 */
.current-filter {
  margin-bottom: var(--spacing-md, 16px);
}

/* 表格卡片 */
.table-card {
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 8px);
  padding: var(--spacing-md, 16px);
  margin-bottom: var(--spacing-lg, 24px);
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
}

.question-table {
  width: 100%;
}

.question-content-cell {
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--text-color-regular);
  transition: color var(--transition-duration, 0.3s);
}

.question-content-cell:hover {
  color: var(--color-primary);
}

/* 类型标签 */
.type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--border-radius-small, 2px);
  font-size: var(--font-size-extra-small, 12px);
  font-weight: 500;
}

.type-tag--choice,
.type-tag--multiple,
.type-tag--judgment {
  background-color: var(--color-primary-light-9);
  color: var(--color-primary);
}

.type-tag--fill {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.type-tag--subjective {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

/* 难度标签 */
.difficulty-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--border-radius-small, 2px);
  font-size: var(--font-size-extra-small, 12px);
  font-weight: 500;
}

.difficulty-tag--easy {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.difficulty-tag--medium {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.difficulty-tag--hard {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

.score-text {
  font-weight: 600;
  color: var(--color-warning);
}

.time-text {
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-secondary);
}

.action-btns {
  display: flex;
  gap: var(--spacing-xs, 4px);
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--spacing-md, 16px);
}

/* 表单样式 */
.options-container {
  width: 100%;
}

.option-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-sm, 8px);
}

.option-letter {
  width: 24px;
  font-weight: bold;
  color: var(--color-primary);
}

.answer-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md, 16px);
  align-items: center;
}

.answer-hint {
  color: var(--text-color-secondary);
  font-size: var(--font-size-extra-small, 12px);
}

/* 详情弹窗样式 */
.detail-content {
  padding: var(--spacing-sm, 8px) 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-md, 16px);
}

.detail-score {
  color: var(--color-warning);
  font-weight: 500;
  font-size: var(--font-size-base, 14px);
}

.detail-section {
  margin-bottom: var(--spacing-md, 16px);
}

.section-title {
  font-size: var(--font-size-small, 13px);
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-sm, 8px);
}

.section-text {
  font-size: var(--font-size-base, 14px);
  line-height: 1.6;
  color: var(--text-color-primary);
}

.section-text--answer {
  color: var(--color-success);
  font-weight: 500;
}

.option-item {
  padding: var(--spacing-sm, 8px) 0;
  border-bottom: 1px solid var(--border-color-lighter);
  font-size: var(--font-size-base, 14px);
  color: var(--text-color-regular);
}

.option-item:last-child {
  border-bottom: none;
}

/* 导入弹窗样式 */
.import-content {
  padding: var(--spacing-sm, 8px) 0;
}

.import-desc {
  margin: var(--spacing-sm, 8px) 0;
  color: var(--text-color-regular);
  font-size: var(--font-size-base, 14px);
}

.import-actions {
  display: flex;
  gap: var(--spacing-md, 16px);
  margin-top: var(--spacing-lg, 24px);
}

.import-result {
  margin-top: var(--spacing-lg, 24px);
}

.result-errors {
  margin-top: var(--spacing-md, 16px);
  padding: var(--spacing-md, 16px);
  background-color: var(--color-danger-light);
  border-radius: var(--border-radius-base, 4px);
  max-height: 150px;
  overflow-y: auto;
}

.error-title {
  font-size: var(--font-size-base, 14px);
  font-weight: 500;
  color: var(--color-danger);
  margin-bottom: var(--spacing-sm, 8px);
}

.error-item {
  font-size: var(--font-size-small, 13px);
  color: var(--text-color-regular);
  padding: var(--spacing-xs, 4px) 0;
  border-bottom: 1px solid var(--border-color-lighter);
}

.error-item:last-child {
  border-bottom: none;
}

.result-details {
  margin-top: var(--spacing-md, 16px);
  padding: var(--spacing-md, 16px);
  background-color: var(--fill-color);
  border-radius: var(--border-radius-base, 4px);
  max-height: 150px;
  overflow-y: auto;
}

.result-details p {
  margin: var(--spacing-xs, 4px) 0;
  font-size: var(--font-size-small, 13px);
  color: var(--text-color-regular);
}

/* ==========================================
   移动端样式 - 使用CSS变量
   ========================================== */
.page-content {
  padding-bottom: var(--spacing-lg, 24px);
}

.loading-center {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.nav-icon {
  margin-right: var(--spacing-md, 16px);
}

.nav-icon:last-child {
  margin-right: 0;
}

.tree-section {
  background-color: var(--fill-color-blank);
  margin-bottom: var(--spacing-sm, 8px);
}

.section-header {
  display: flex;
  align-items: center;
  padding: var(--spacing-md, 16px);
  background-color: var(--fill-color);
  gap: var(--spacing-sm, 8px);
}

.section-header span {
  flex: 1;
  font-weight: 500;
  font-size: var(--font-size-base, 14px);
  color: var(--text-color-primary);
}

.tree-content {
  padding: var(--spacing-sm, 8px) 0;
}

.tree-subject {
  border-bottom: 1px solid var(--border-color-lighter);
}

.tree-node {
  display: flex;
  align-items: center;
  padding: 10px var(--spacing-md, 16px);
  gap: var(--spacing-sm, 8px);
  cursor: pointer;
  transition: background-color var(--transition-duration, 0.3s);
}

.tree-node:active {
  background-color: var(--fill-color);
}

.tree-node.is-active {
  background-color: var(--color-primary-light-9);
  color: var(--color-primary);
}

.node-icon {
  color: var(--text-color-secondary);
}

.node-icon--grade {
  color: var(--color-primary);
}

.node-icon--chapter {
  color: var(--color-warning);
}

.node-text {
  flex: 1;
  font-size: var(--font-size-base, 14px);
}

.tree-children {
  padding-left: var(--spacing-lg, 24px);
}

.tree-node--chapter {
  padding-left: 40px;
}

.filter-section {
  background-color: var(--fill-color-blank);
  margin-bottom: var(--spacing-sm, 8px);
  display: flex;
  align-items: center;
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  gap: var(--spacing-sm, 8px);
}

.filter-buttons {
  display: flex;
  gap: var(--spacing-sm, 8px);
}

.filter-buttons :deep(.van-button) {
  padding: 0 var(--spacing-md, 16px);
}

.filter-buttons :deep(.van-icon) {
  margin-left: var(--spacing-xs, 4px);
}

.search-box {
  flex: 1;
  min-width: 0;
}

.search-box :deep(.van-search) {
  padding: var(--spacing-sm, 8px) 0;
}

.search-box :deep(.van-search__content) {
  background-color: var(--fill-color);
}

.current-filter {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  background-color: var(--fill-color-blank);
}

.question-list {
  padding: 0 var(--spacing-md, 16px);
}

.question-card {
  background-color: var(--fill-color-blank);
  border-radius: var(--border-radius-large, 8px);
  padding: var(--spacing-md, 16px);
  margin-bottom: var(--spacing-sm, 8px);
  box-shadow: var(--box-shadow-lighter, 0 1px 4px 0 rgba(0, 0, 0, 0.04));
  cursor: pointer;
  transition: box-shadow var(--transition-duration, 0.3s);
}

.question-card:active {
  box-shadow: var(--box-shadow-light, 0 2px 8px 0 rgba(0, 0, 0, 0.06));
}

.question-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-sm, 8px);
}

.question-score {
  margin-left: auto;
  color: var(--color-warning);
  font-weight: 500;
  font-size: var(--font-size-base, 14px);
}

.question-content {
  font-size: var(--font-size-base, 14px);
  line-height: 1.5;
  margin-bottom: var(--spacing-sm, 8px);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--text-color-primary);
}

.question-footer {
  display: flex;
  align-items: center;
  font-size: var(--font-size-extra-small, 12px);
  color: var(--text-color-secondary);
}

.question-chapter {
  flex: 1;
}

.question-actions {
  display: flex;
  gap: var(--spacing-lg, 24px);
}

/* 弹窗容器 */
.add-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--fill-color);
  touch-action: pan-y;
  -webkit-user-select: none;
  user-select: none;
}

/* 弹窗头部 */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md, 16px);
  background-color: var(--fill-color-blank);
  border-bottom: 1px solid var(--border-color-lighter);
  position: sticky;
  top: 0;
  z-index: 10;
}

.cancel-btn {
  color: var(--text-color-secondary);
  padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  font-size: var(--font-size-base, 14px);
}

.popup-title {
  font-size: var(--font-size-medium, 16px);
  font-weight: 500;
  color: var(--text-color-primary);
}

/* 表单滚动区 */
.form-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--fill-color);
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior: contain;
  padding-bottom: 30px;
}

.form-section {
  background-color: var(--fill-color-blank);
  margin: var(--spacing-sm, 8px) 0;
  padding: var(--spacing-md, 16px);
}

.section-title {
  font-size: var(--font-size-small, 13px);
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-md, 16px);
}

.required {
  color: var(--color-danger);
  margin-right: 2px;
}

/* 类型选择按钮 */
.type-btns {
  display: flex;
  gap: var(--spacing-sm, 8px);
  flex-wrap: wrap;
}

.type-btn {
  flex: 1;
  min-width: 60px;
  padding: 10px 0;
  text-align: center;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-base, 4px);
  font-size: var(--font-size-base, 14px);
  color: var(--text-color-regular);
  cursor: pointer;
  transition: all var(--transition-duration, 0.3s);
}

.type-btn.is-active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--fill-color-blank);
}

/* 表单项 */
.form-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md, 16px) 0;
  border-bottom: 1px solid var(--border-color-lighter);
}

.form-item:last-child {
  border-bottom: none;
}

.item-label {
  width: 80px;
  color: var(--text-color-primary);
  font-size: var(--font-size-base, 14px);
}

.item-value {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--text-color-primary);
  font-size: var(--font-size-base, 14px);
}

.item-value .is-placeholder {
  color: var(--text-color-placeholder);
}

.item-value .van-icon {
  margin-left: var(--spacing-xs, 4px);
  color: var(--text-color-placeholder);
}

.item-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: var(--font-size-base, 14px);
  text-align: right;
  background: transparent;
  -webkit-user-select: text;
  user-select: text;
  touch-action: manipulation;
  color: var(--text-color-primary);
}

.item-input::placeholder {
  color: var(--text-color-placeholder);
}

/* 文本框 */
.textarea-input {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-base, 4px);
  padding: 10px;
  font-size: var(--font-size-base, 14px);
  resize: none;
  outline: none;
  box-sizing: border-box;
  -webkit-user-select: text;
  user-select: text;
  touch-action: manipulation;
  color: var(--text-color-primary);
  background-color: var(--fill-color-blank);
}

.textarea-input:focus {
  border-color: var(--color-primary);
}

.textarea-input::placeholder {
  color: var(--text-color-placeholder);
}

/* 选项 */
.option-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm, 8px) 0;
  border-bottom: 1px solid var(--border-color-lighter);
}

.option-label {
  width: 30px;
  color: var(--color-primary);
  font-weight: bold;
  font-size: var(--font-size-base, 14px);
}

.option-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: var(--font-size-base, 14px);
  background: transparent;
  -webkit-user-select: text;
  user-select: text;
  touch-action: manipulation;
  color: var(--text-color-primary);
}

.delete-icon {
  color: var(--color-danger);
  padding: var(--spacing-xs, 4px);
}

.add-option-btn {
  padding: var(--spacing-md, 16px) 0;
  text-align: center;
  color: var(--color-primary);
  font-size: var(--font-size-base, 14px);
  cursor: pointer;
}

/* 答案按钮 */
.answer-btns {
  display: flex;
  gap: var(--spacing-sm, 8px);
  flex-wrap: wrap;
}

.answer-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-base, 4px);
  font-size: var(--font-size-medium, 16px);
  color: var(--text-color-regular);
  cursor: pointer;
  transition: all var(--transition-duration, 0.3s);
}

.answer-btn.is-active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--fill-color-blank);
}

.answer-btn--judgment {
  width: auto;
  padding: 10px var(--spacing-lg, 24px);
  font-size: var(--font-size-base, 14px);
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
  background-color: var(--fill-color-blank);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-md, 16px);
}

.detail-section {
  margin-bottom: var(--spacing-md, 16px);
}

.detail-section .section-title {
  font-size: var(--font-size-small, 13px);
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-sm, 8px);
}

.detail-section .section-content {
  font-size: var(--font-size-base, 14px);
  line-height: 1.6;
  color: var(--text-color-primary);
}

.detail-section .section-content--answer {
  color: var(--color-success);
  font-weight: 500;
}

.detail-section .option-item {
  padding: var(--spacing-sm, 8px) 0;
  border-bottom: 1px solid var(--border-color-lighter);
}

.detail-section .option-item:last-child {
  border-bottom: none;
}

/* 批量导入弹窗 */
.import-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--fill-color);
}

.import-content {
  flex: 1;
  padding: var(--spacing-lg, 24px) var(--spacing-md, 16px);
  overflow-y: auto;
}

.import-desc {
  background-color: var(--fill-color-blank);
  padding: var(--spacing-md, 16px);
  border-radius: var(--border-radius-large, 8px);
  margin-bottom: var(--spacing-md, 16px);
}

.import-desc p {
  font-size: var(--font-size-base, 14px);
  color: var(--text-color-regular);
  margin: var(--spacing-xs, 4px) 0;
}

.import-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 16px);
  padding: 0 var(--spacing-lg, 24px);
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
  margin-top: var(--spacing-lg, 24px);
}

.result-details {
  background-color: var(--fill-color-blank);
  padding: var(--spacing-md, 16px);
  border-radius: var(--border-radius-large, 8px);
  margin-top: var(--spacing-md, 16px);
  font-size: var(--font-size-small, 13px);
  color: var(--text-color-regular);
}

.result-details p {
  margin: var(--spacing-xs, 4px) 0;
}

.result-errors {
  background-color: var(--color-danger-light);
  padding: var(--spacing-md, 16px);
  border-radius: var(--border-radius-large, 8px);
  margin-top: var(--spacing-md, 16px);
  border: 1px solid var(--border-color-light);
}

.error-title {
  font-size: var(--font-size-base, 14px);
  font-weight: 500;
  color: var(--color-danger);
  margin-bottom: var(--spacing-sm, 8px);
}

.error-item {
  font-size: var(--font-size-small, 13px);
  color: var(--text-color-regular);
  padding: var(--spacing-xs, 4px) 0;
  border-bottom: 1px solid var(--border-color-light);
}

.error-item:last-child {
  border-bottom: none;
}
</style>
