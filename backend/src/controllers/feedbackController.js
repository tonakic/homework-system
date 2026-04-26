const db = require('../config/database');

// 提交反馈（学生/教师）
exports.submitFeedback = (req, res) => {
  const { title, content } = req.body;
  const { userType, userId, userName } = req.user;

  if (!title || !content) {
    return res.status(400).json({ code: 1001, message: '标题和内容不能为空' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO feedbacks (user_type, user_id, user_name, title, content, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `);
    stmt.run(userType, userId, userName, title, content);

    res.json({ code: 0, message: '反馈提交成功' });
  } catch (err) {
    res.status(500).json({ code: 1002, message: '提交失败', error: err.message });
  }
};

// 获取我的反馈列表（学生/教师）
exports.getMyFeedbacks = (req, res) => {
  const { userType, userId } = req.user;

  try {
    const stmt = db.prepare(`
      SELECT * FROM feedbacks 
      WHERE user_type = ? AND user_id = ?
      ORDER BY created_at DESC
    `);
    const feedbacks = stmt.all(userType, userId);

    res.json({ code: 0, data: feedbacks });
  } catch (err) {
    res.status(500).json({ code: 1002, message: '查询失败', error: err.message });
  }
};

// 获取所有反馈列表（管理员）
exports.getAllFeedbacks = (req, res) => {
  const { status, page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;

  try {
    let sql = 'SELECT * FROM feedbacks';
    let params = [];

    if (status && ['pending', 'in_progress', 'resolved'].includes(status)) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const stmt = db.prepare(sql);
    const feedbacks = stmt.all(...params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM feedbacks';
    if (status) countSql += ' WHERE status = ?';
    const countStmt = db.prepare(countSql);
    const total = status ? countStmt.get(status).total : countStmt.get().total;

    res.json({
      code: 0,
      data: feedbacks,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (err) {
    res.status(500).json({ code: 1002, message: '查询失败', error: err.message });
  }
};

// 更新反馈状态和回复（管理员）
exports.updateFeedback = (req, res) => {
  const { id } = req.params;
  const { status, admin_reply } = req.body;

  // 验证：标记已处理时必须填写回复
  if (status === 'resolved' && !admin_reply) {
    return res.status(400).json({ code: 1001, message: '处理反馈时必须填写回复' });
  }

  try {
    const stmt = db.prepare(`
      UPDATE feedbacks 
      SET status = ?, admin_reply = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status || 'pending', admin_reply || null, id);

    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ code: 1002, message: '更新失败', error: err.message });
  }
};

// 删除反馈（管理员）
exports.deleteFeedback = (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM feedbacks WHERE id = ?');
    stmt.run(id);

    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 1002, message: '删除失败', error: err.message });
  }
};