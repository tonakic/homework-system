/**
 * 批改队列服务
 * 实现基于数据库的持久化队列，支持并发控制
 */

const { getDatabase } = require('../config/database');
const { gradeQuestion } = require('./aiService');

class GradingQueueService {
  constructor() {
    this.isProcessing = false;
    this.activeTasks = new Set();
    this.config = null;
    this.processingTimer = null;
  }

  // ==================== 配置管理 ====================

  /**
   * 获取队列配置
   */
  async getConfig() {
    if (this.config) return this.config;

    const db = getDatabase();

    try {
      const configs = db.prepare('SELECT config_key, config_value FROM grading_queue_config').all();

      this.config = {
        maxConcurrent: 3,
        defaultMaxRetries: 3,
        retryDelayMs: 5000,
        taskTimeoutMs: 60000
      };

      for (const c of configs) {
        const value = parseInt(c.config_value, 10);
        switch (c.config_key) {
          case 'max_concurrent': this.config.maxConcurrent = value; break;
          case 'default_max_retries': this.config.defaultMaxRetries = value; break;
          case 'retry_delay_ms': this.config.retryDelayMs = value; break;
          case 'task_timeout_ms': this.config.taskTimeoutMs = value; break;
        }
      }
    } catch (err) {
      console.error('[批改队列] 读取配置失败:', err);
      this.config = {
        maxConcurrent: 3,
        defaultMaxRetries: 3,
        retryDelayMs: 5000,
        taskTimeoutMs: 60000
      };
    }

    return this.config;
  }

  /**
   * 更新队列配置
   */
  async updateConfig(key, value) {
    const db = getDatabase();
    db.prepare(`
      UPDATE grading_queue_config
      SET config_value = ?, updated_at = datetime('now')
      WHERE config_key = ?
    `).run(String(value), key);

    this.config = null;
    return this.getConfig();
  }

  /**
   * 刷新配置缓存
   */
  refreshConfig() {
    this.config = null;
  }

  // ==================== 任务管理 ====================

  /**
   * 添加批改任务到队列
   */
  async addTask(taskData) {
    const { examAnswerId, taskId, studentId, priority = 0 } = taskData;
    const db = getDatabase();
    const config = await this.getConfig();

    const existing = db.prepare(`
      SELECT id, status FROM grading_queue
      WHERE exam_answer_id = ? AND status IN ('pending', 'processing')
    `).get(examAnswerId);

    if (existing) {
      console.log(`[批改队列] 任务已存在: answerId=${examAnswerId}, status=${existing.status}`);
      return existing.id;
    }

    const result = db.prepare(`
      INSERT INTO grading_queue
        (exam_answer_id, task_id, student_id, priority, max_retries, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(examAnswerId, taskId, studentId, priority, config.defaultMaxRetries);

    console.log(`[批改队列] 任务已添加: id=${result.lastInsertRowid}, answerId=${examAnswerId}`);
    this.scheduleProcessing();

    return result.lastInsertRowid;
  }

  /**
   * 批量添加任务
   */
  async addTasks(tasks) {
    const db = getDatabase();
    const config = await this.getConfig();

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO grading_queue
        (exam_answer_id, task_id, student_id, priority, max_retries, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run(
          item.examAnswerId,
          item.taskId,
          item.studentId,
          item.priority || 0,
          config.defaultMaxRetries
        );
      }
    });

    insertMany(tasks);
    console.log(`[批改队列] 批量添加 ${tasks.length} 个任务`);
    this.scheduleProcessing();
  }

  /**
   * 获取下一个待处理任务（FIFO + 优先级）
   */
  getNextTask() {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM grading_queue
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
    `).get();
  }

  /**
   * 获取任务详情
   */
  getTask(taskId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM grading_queue WHERE id = ?').get(taskId);
  }

  /**
   * 更新任务状态
   */
  updateTaskStatus(taskId, status, additionalData = {}) {
    const db = getDatabase();
    const updates = ['status = ?', 'updated_at = datetime("now")'];
    const values = [status];

    if (status === 'processing') {
      updates.push('started_at = datetime("now")');
    }
    if (status === 'completed' || status === 'failed') {
      updates.push('completed_at = datetime("now")');
    }
    if (additionalData.errorMessage) {
      updates.push('error_message = ?');
      values.push(additionalData.errorMessage);
    }
    if (additionalData.retryCount !== undefined) {
      updates.push('retry_count = ?');
      values.push(additionalData.retryCount);
    }

    values.push(taskId);
    db.prepare(`UPDATE grading_queue SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  // ==================== 并发控制 ====================

  /**
   * 获取当前可用槽位
   */
  async getAvailableSlots() {
    const config = await this.getConfig();
    return config.maxConcurrent - this.activeTasks.size;
  }

  /**
   * 调度队列处理
   */
  scheduleProcessing() {
    if (this.processingTimer) return;

    this.processingTimer = setTimeout(() => {
      this.processingTimer = null;
      this.processQueue();
    }, 100);
  }

  /**
   * 处理队列（核心循环）
   */
  async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      while (true) {
        const availableSlots = await this.getAvailableSlots();
        if (availableSlots <= 0) break;

        const task = this.getNextTask();
        if (!task) break;

        this.updateTaskStatus(task.id, 'processing');
        this.activeTasks.add(task.id);

        this.executeTask(task).finally(() => {
          this.activeTasks.delete(task.id);
          this.scheduleProcessing();
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 执行单个批改任务
   */
  async executeTask(task) {
    const config = await this.getConfig();

    try {
      console.log(`[批改队列] 开始执行: taskId=${task.id}, answerId=${task.exam_answer_id}`);
      await this.runGrading(task);
      this.updateTaskStatus(task.id, 'completed');
      console.log(`[批改队列] 执行完成: taskId=${task.id}`);
    } catch (err) {
      console.error(`[批改队列] 执行失败: taskId=${task.id}`, err.message);

      const newRetryCount = task.retry_count + 1;

      if (newRetryCount < task.max_retries) {
        this.updateTaskStatus(task.id, 'pending', {
          retryCount: newRetryCount,
          errorMessage: err.message
        });

        console.log(`[批改队列] 任务将重试: taskId=${task.id}, retry=${newRetryCount}/${task.max_retries}`);

        setTimeout(() => this.scheduleProcessing(), config.retryDelayMs);
      } else {
        this.updateTaskStatus(task.id, 'failed', {
          errorMessage: err.message
        });

        this.markAnswerNeedsManualGrading(task.exam_answer_id, err.message);
        console.log(`[批改队列] 任务失败: taskId=${task.id}, 标记需人工批改`);
      }
    }
  }

  /**
   * 执行批改逻辑
   */
  async runGrading(task) {
    const db = getDatabase();
    const { exam_answer_id: examAnswerId, task_id: taskId } = task;

    const answerRecord = db.prepare(`
      SELECT ea.*, et.questions as task_questions, et.grading_mode, et.grading_config_id
      FROM exam_answers ea
      JOIN exam_tasks et ON ea.task_id = et.id
      WHERE ea.id = ?
    `).get(examAnswerId);

    if (!answerRecord) {
      throw new Error('答题记录不存在');
    }

    const questions = JSON.parse(answerRecord.task_questions || '[]');
    const answers = JSON.parse(answerRecord.answers || '[]');

    const gradingConfig = this.getGradingConfig(db, answerRecord);

    const questionIds = questions.map(q => typeof q === 'object' ? q.questionId : q).filter(id => id);
    const placeholders = questionIds.map(() => '?').join(',');

    const questionDetails = db.prepare(`
      SELECT id, question_type, answer, score, content, analysis FROM questions WHERE id IN (${placeholders})
    `).all(...questionIds);

    const questionMap = new Map(questionDetails.map(q => [q.id, q]));

    let totalScore = 0;
    let hasPendingGrading = false;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = typeof q === 'object' ? q.questionId : q;
      const qScore = typeof q === 'object' ? (q.score || 2) : 2;
      const detail = questionMap.get(qId);
      if (!detail) continue;

      const studentAnswer = answers[i];

      if (detail.question_type === 'choice' || detail.question_type === 'multiple' || detail.question_type === 'judgment') {
        const existingDetail = db.prepare(`
          SELECT score FROM question_answers WHERE exam_answer_id = ? AND question_id = ?
        `).get(examAnswerId, qId);
        if (existingDetail && existingDetail.score !== null) {
          totalScore += existingDetail.score;
        }
        continue;
      }

      if (detail.question_type === 'fill' || detail.question_type === 'subjective') {
        const questionData = {
          question_type: detail.question_type,
          content: detail.content,
          answer: detail.answer,
          studentAnswer: studentAnswer,
          score: qScore,
          analysis: detail.analysis
        };

        const needAI = gradingConfig.grading_mode === 'ai' ||
          (gradingConfig.grading_mode === 'mixed' && gradingConfig.mixed_config && gradingConfig.mixed_config[detail.question_type] === 'ai');

        if (needAI) {
          try {
            const result = await gradeQuestion(questionData, gradingConfig);
            totalScore += result.score || 0;

            db.prepare(`
              UPDATE question_answers
              SET score = ?, is_correct = ?, ai_score = ?, ai_comment = ?
              WHERE exam_answer_id = ? AND question_id = ?
            `).run(result.score, result.isCorrect ? 1 : 0, result.score, result.comment, examAnswerId, qId);
          } catch (err) {
            console.error(`[批改队列] AI批改失败: questionId=${qId}`, err.message);
            hasPendingGrading = true;
            db.prepare(`
              UPDATE question_answers SET ai_comment = ? WHERE exam_answer_id = ? AND question_id = ?
            `).run(`AI批改失败: ${err.message}`, examAnswerId, qId);
          }
        } else {
          hasPendingGrading = true;
        }
      }
    }

    const newStatus = hasPendingGrading ? 'submitted' : 'graded';
    db.prepare(`
      UPDATE exam_answers SET total_score = ?, status = ? WHERE id = ?
    `).run(totalScore, newStatus, examAnswerId);

    console.log(`[批改队列] 批改完成: answerId=${examAnswerId}, score=${totalScore}, status=${newStatus}`);
  }

  /**
   * 获取批改配置
   */
  getGradingConfig(db, answerRecord) {
    let configData = null;

    if (answerRecord.grading_config_id) {
      const config = db.prepare('SELECT * FROM grading_config WHERE id = ?').get(answerRecord.grading_config_id);
      if (config) {
        configData = {
          grading_mode: config.grading_mode,
          ai_provider: config.ai_provider,
          ai_model: config.ai_model,
          ai_endpoint: config.ai_endpoint,
          ai_api_key: config.ai_api_key,
          ai_temperature: config.ai_temperature,
          ai_timeout: config.ai_timeout,
          prompt_strictness: config.prompt_strictness,
          prompt_style: config.prompt_style,
          prompt_comment_length: config.prompt_comment_length,
          prompt_encourage_ratio: config.prompt_encourage_ratio,
          prompt_analysis_detail: config.prompt_analysis_detail,
          mixed_config: config.mixed_config ? JSON.parse(config.mixed_config) : null
        };
      }
    }

    if (!configData) {
      const defaultConfig = db.prepare(`
        SELECT * FROM grading_config WHERE is_default = 1 AND status != 'deleted' LIMIT 1
      `).get();

      if (defaultConfig) {
        configData = {
          grading_mode: defaultConfig.grading_mode,
          ai_provider: defaultConfig.ai_provider,
          ai_model: defaultConfig.ai_model,
          ai_endpoint: defaultConfig.ai_endpoint,
          ai_api_key: defaultConfig.ai_api_key,
          ai_temperature: defaultConfig.ai_temperature,
          ai_timeout: defaultConfig.ai_timeout,
          prompt_strictness: defaultConfig.prompt_strictness,
          prompt_style: defaultConfig.prompt_style,
          prompt_comment_length: defaultConfig.prompt_comment_length,
          prompt_encourage_ratio: defaultConfig.prompt_encourage_ratio,
          prompt_analysis_detail: defaultConfig.prompt_analysis_detail,
          mixed_config: defaultConfig.mixed_config ? JSON.parse(defaultConfig.mixed_config) : null
        };
      }
    }

    if (configData) {
      if (answerRecord.grading_mode) {
        configData.grading_mode = answerRecord.grading_mode;
      }
      return configData;
    }

    return {
      grading_mode: answerRecord.grading_mode || 'manual'
    };
  }

  /**
   * 标记需要人工批改
   */
  markAnswerNeedsManualGrading(examAnswerId, errorMessage) {
    const db = getDatabase();
    db.prepare(`
      UPDATE question_answers
      SET ai_comment = ?
      WHERE exam_answer_id = ? AND score IS NULL
    `).run(`AI批改失败，需人工批改: ${errorMessage}`, examAnswerId);
  }

  // ==================== 查询接口 ====================

  /**
   * 获取队列状态统计
   */
  getQueueStats() {
    const db = getDatabase();
    const stats = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
        COALESCE(SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END), 0) as processing_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_count,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed_count,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled_count
      FROM grading_queue
    `).get();

    return {
      pending: stats.pending_count,
      processing: stats.processing_count,
      completed: stats.completed_count,
      failed: stats.failed_count,
      cancelled: stats.cancelled_count,
      activeTasks: this.activeTasks.size
    };
  }

  /**
   * 获取任务列表（分页）
   */
  getTaskList(options = {}) {
    const { status, page = 1, pageSize = 20 } = options;
    const db = getDatabase();

    let whereClause = '';
    const params = [];

    if (status) {
      whereClause = 'WHERE gq.status = ?';
      params.push(status);
    }

    const tasks = db.prepare(`
      SELECT gq.*, s.name as student_name, s.student_no, et.title as task_title
      FROM grading_queue gq
      JOIN students s ON gq.student_id = s.id
      JOIN exam_tasks et ON gq.task_id = et.id
      ${whereClause}
      ORDER BY gq.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, (page - 1) * pageSize);

    const countParams = status ? [status] : [];
    const totalResult = db.prepare(`
      SELECT COUNT(*) as count FROM grading_queue gq ${whereClause}
    `).get(...countParams);

    return { list: tasks, total: totalResult.count, page, pageSize };
  }

  /**
   * 手动重试失败任务
   */
  retryTask(taskId) {
    const task = this.getTask(taskId);
    if (!task || task.status !== 'failed') {
      throw new Error('任务不存在或状态不正确');
    }

    this.updateTaskStatus(taskId, 'pending', {
      retryCount: 0,
      errorMessage: null
    });
    this.scheduleProcessing();
    console.log(`[批改队列] 手动重试: taskId=${taskId}`);
  }

  /**
   * 重试所有失败任务
   */
  retryAllFailed() {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE grading_queue
      SET status = 'pending', retry_count = 0, error_message = NULL, updated_at = datetime('now')
      WHERE status = 'failed'
    `).run();

    if (result.changes > 0) {
      console.log(`[批改队列] 重试所有失败任务: ${result.changes} 个`);
      this.scheduleProcessing();
    }

    return result.changes;
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status === 'processing') {
      throw new Error('正在处理的任务无法取消');
    }

    this.updateTaskStatus(taskId, 'cancelled');
    console.log(`[批改队列] 取消任务: taskId=${taskId}`);
  }

  // ==================== 服务生命周期 ====================

  /**
   * 启动队列服务
   */
  async start() {
    console.log('[批改队列] 服务启动');

    await this.getConfig();
    await this.recoverInterruptedTasks();
    this.scheduleProcessing();
  }

  /**
   * 恢复中断的任务
   */
  async recoverInterruptedTasks() {
    const db = getDatabase();

    const result = db.prepare(`
      UPDATE grading_queue
      SET status = 'pending', started_at = NULL, updated_at = datetime('now')
      WHERE status = 'processing'
    `).run();

    if (result.changes > 0) {
      console.log(`[批改队列] 恢复了 ${result.changes} 个中断的任务`);
    }
  }

  /**
   * 停止队列服务
   */
  async stop() {
    console.log('[批改队列] 服务停止');

    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    this.isProcessing = false;

    const maxWait = 30000;
    const startTime = Date.now();

    while (this.activeTasks.size > 0 && (Date.now() - startTime) < maxWait) {
      console.log(`[批改队列] 等待 ${this.activeTasks.size} 个活跃任务完成...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.activeTasks.size > 0) {
      console.log(`[批改队列] 强制停止，剩余 ${this.activeTasks.size} 个未完成任务`);
    }
  }
}

// 单例模式
let instance = null;

function getGradingQueueService() {
  if (!instance) {
    instance = new GradingQueueService();
  }
  return instance;
}

module.exports = {
  GradingQueueService,
  getGradingQueueService
};
