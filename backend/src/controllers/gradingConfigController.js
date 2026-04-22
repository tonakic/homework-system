const { getDatabase } = require('../config/database');
const { success, error, ErrorCodes } = require('../utils/response');

/**
 * 获取批改配置列表
 */
function getConfigList(req, res) {
  const db = getDatabase();
  const configs = db.prepare(`
    SELECT id, config_name, grading_mode, ai_provider, ai_model, ai_endpoint,
           ai_temperature, ai_timeout, prompt_strictness, prompt_style,
           prompt_comment_length, prompt_encourage_ratio, prompt_analysis_detail,
           mixed_config, is_default, status, created_at, updated_at
    FROM grading_config
    WHERE status != 'deleted'
    ORDER BY is_default DESC, created_at DESC
  `).all();

  // 解析 mixed_config JSON
  const result = configs.map(config => ({
    ...config,
    mixed_config: config.mixed_config ? JSON.parse(config.mixed_config) : null
  }));

  return success(res, result);
}

/**
 * 获取单个配置详情
 */
function getConfigById(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const config = db.prepare(`
    SELECT * FROM grading_config WHERE id = ? AND status != 'deleted'
  `).get(id);

  if (!config) {
    return error(res, ErrorCodes.RESOURCE_NOT_FOUND, '配置不存在');
  }

  // 解析 JSON 字段
  config.mixed_config = config.mixed_config ? JSON.parse(config.mixed_config) : null;
  config.prompt_subject_focus = config.prompt_subject_focus ? JSON.parse(config.prompt_subject_focus) : null;

  // 排除敏感字段
  delete config.ai_api_key;

  return success(res, config);
}

/**
 * 新增批改配置
 */
function createConfig(req, res) {
  const {
    config_name,
    grading_mode,
    ai_provider,
    ai_model,
    ai_endpoint,
    ai_api_key,
    ai_temperature,
    ai_timeout,
    prompt_strictness,
    prompt_style,
    prompt_comment_length,
    prompt_subject_focus,
    prompt_encourage_ratio,
    prompt_analysis_detail,
    mixed_config
  } = req.body;

  if (!config_name || !grading_mode) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请填写配置名称和批改模式');
  }

  const db = getDatabase();

  // 检查名称是否重复
  const existing = db.prepare('SELECT id FROM grading_config WHERE config_name = ? AND status != ?').get(config_name, 'deleted');
  if (existing) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '配置名称已存在');
  }

  try {
    const result = db.prepare(`
      INSERT INTO grading_config (
        config_name, grading_mode, ai_provider, ai_model, ai_endpoint, ai_api_key,
        ai_temperature, ai_timeout, prompt_strictness, prompt_style, prompt_comment_length,
        prompt_subject_focus, prompt_encourage_ratio, prompt_analysis_detail, mixed_config
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      config_name,
      grading_mode,
      ai_provider || null,
      ai_model || null,
      ai_endpoint || null,
      ai_api_key || null,
      ai_temperature || 0.3,
      ai_timeout || 30000,
      prompt_strictness || 'medium',
      prompt_style || 'encouraging',
      prompt_comment_length || 'medium',
      prompt_subject_focus ? JSON.stringify(prompt_subject_focus) : null,
      prompt_encourage_ratio || 30,
      prompt_analysis_detail || 'medium',
      mixed_config ? JSON.stringify(mixed_config) : null
    );

    return success(res, { id: result.lastInsertRowid }, '配置创建成功');
  } catch (err) {
    console.error('创建批改配置失败:', err);
    return error(res, ErrorCodes.DATABASE_ERROR, '创建配置失败');
  }
}

/**
 * 更新批改配置
 */
function updateConfig(req, res) {
  const { id } = req.params;
  const {
    config_name,
    grading_mode,
    ai_provider,
    ai_model,
    ai_endpoint,
    ai_api_key,
    ai_temperature,
    ai_timeout,
    prompt_strictness,
    prompt_style,
    prompt_comment_length,
    prompt_subject_focus,
    prompt_encourage_ratio,
    prompt_analysis_detail,
    mixed_config,
    is_default
  } = req.body;

  const db = getDatabase();

  const config = db.prepare('SELECT * FROM grading_config WHERE id = ? AND status != ?').get(id, 'deleted');
  if (!config) {
    return error(res, ErrorCodes.RESOURCE_NOT_FOUND, '配置不存在');
  }

  // 检查名称是否重复
  if (config_name && config_name !== config.config_name) {
    const existing = db.prepare('SELECT id FROM grading_config WHERE config_name = ? AND status != ? AND id != ?').get(config_name, 'deleted', id);
    if (existing) {
      return error(res, ErrorCodes.VALIDATION_ERROR, '配置名称已存在');
    }
  }

  try {
    // 如果设置为默认，先取消其他默认配置
    if (is_default) {
      db.prepare('UPDATE grading_config SET is_default = 0').run();
    }

    db.prepare(`
      UPDATE grading_config SET
        config_name = COALESCE(?, config_name),
        grading_mode = COALESCE(?, grading_mode),
        ai_provider = ?,
        ai_model = ?,
        ai_endpoint = ?,
        ai_api_key = ?,
        ai_temperature = COALESCE(?, ai_temperature),
        ai_timeout = COALESCE(?, ai_timeout),
        prompt_strictness = COALESCE(?, prompt_strictness),
        prompt_style = COALESCE(?, prompt_style),
        prompt_comment_length = COALESCE(?, prompt_comment_length),
        prompt_subject_focus = ?,
        prompt_encourage_ratio = COALESCE(?, prompt_encourage_ratio),
        prompt_analysis_detail = COALESCE(?, prompt_analysis_detail),
        mixed_config = ?,
        is_default = COALESCE(?, is_default),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      config_name || null,
      grading_mode || null,
      ai_provider !== undefined ? ai_provider : config.ai_provider,
      ai_model !== undefined ? ai_model : config.ai_model,
      ai_endpoint !== undefined ? ai_endpoint : config.ai_endpoint,
      ai_api_key !== undefined ? ai_api_key : config.ai_api_key,
      ai_temperature !== undefined ? ai_temperature : null,
      ai_timeout !== undefined ? ai_timeout : null,
      prompt_strictness || null,
      prompt_style || null,
      prompt_comment_length || null,
      prompt_subject_focus ? JSON.stringify(prompt_subject_focus) : null,
      prompt_encourage_ratio !== undefined ? prompt_encourage_ratio : null,
      prompt_analysis_detail || null,
      mixed_config ? JSON.stringify(mixed_config) : null,
      is_default !== undefined ? (is_default ? 1 : 0) : null,
      id
    );

    return success(res, null, '配置更新成功');
  } catch (err) {
    console.error('更新批改配置失败:', err);
    return error(res, ErrorCodes.DATABASE_ERROR, '更新配置失败');
  }
}

/**
 * 删除批改配置
 */
function deleteConfig(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  const config = db.prepare('SELECT * FROM grading_config WHERE id = ?').get(id);
  if (!config) {
    return error(res, ErrorCodes.RESOURCE_NOT_FOUND, '配置不存在');
  }

  if (config.is_default) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '默认配置不能删除');
  }

  // 检查是否有考试任务在使用此配置
  const usage = db.prepare('SELECT COUNT(*) as count FROM exam_tasks WHERE grading_config_id = ?').get(id);
  if (usage.count > 0) {
    return error(res, ErrorCodes.VALIDATION_ERROR, `有 ${usage.count} 个考试任务正在使用此配置，无法删除`);
  }

  db.prepare('UPDATE grading_config SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('deleted', id);

  return success(res, null, '配置已删除');
}

/**
 * 测试AI连接
 */
async function testAIConnection(req, res) {
  const { ai_provider, ai_endpoint, ai_api_key, ai_model } = req.body;

  if (!ai_provider) {
    return error(res, ErrorCodes.VALIDATION_ERROR, '请选择AI提供商');
  }

  try {
    let testEndpoint;
    let headers = { 'Content-Type': 'application/json' };
    let body;

    if (ai_provider === 'deepseek') {
      testEndpoint = 'https://api.deepseek.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${ai_api_key}`;
      body = {
        model: ai_model || 'deepseek-chat',
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10
      };
    } else if (ai_provider === 'ollama') {
      testEndpoint = (ai_endpoint || 'http://localhost:11434') + '/api/chat';
      body = {
        model: ai_model || 'qwen2.5:7b',
        messages: [{ role: 'user', content: '你好' }],
        stream: false
      };
    } else {
      return error(res, ErrorCodes.VALIDATION_ERROR, '不支持的AI提供商');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return success(res, { success: false, message: `连接失败: ${response.status} - ${errorText.slice(0, 200)}` });
    }

    const data = await response.json();
    return success(res, { success: true, message: '连接成功', model: ai_model || (ai_provider === 'deepseek' ? 'deepseek-chat' : 'qwen2.5:7b') });
  } catch (err) {
    if (err.name === 'AbortError') {
      return success(res, { success: false, message: '连接超时，请检查网络或服务是否启动' });
    }
    return success(res, { success: false, message: `连接失败: ${err.message}` });
  }
}

/**
 * 获取默认配置
 */
function getDefaultConfig(req, res) {
  const db = getDatabase();
  const config = db.prepare(`
    SELECT * FROM grading_config WHERE is_default = 1 AND status != 'deleted' LIMIT 1
  `).get();

  if (!config) {
    // 返回手动批改作为默认
    return success(res, { grading_mode: 'manual' });
  }

  config.mixed_config = config.mixed_config ? JSON.parse(config.mixed_config) : null;
  config.prompt_subject_focus = config.prompt_subject_focus ? JSON.parse(config.prompt_subject_focus) : null;

  // 排除敏感字段
  delete config.ai_api_key;

  return success(res, config);
}

module.exports = {
  getConfigList,
  getConfigById,
  createConfig,
  updateConfig,
  deleteConfig,
  testAIConnection,
  getDefaultConfig
};
