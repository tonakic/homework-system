/**
 * AI批改服务
 * 支持多种AI提供者：DeepSeek、Ollama等
 */

/**
 * 获取提示词模板参数描述
 */
function getPromptParams(config = {}) {
  const {
    prompt_strictness = 'medium',
    prompt_style = 'encouraging',
    prompt_comment_length = 'medium',
    prompt_encourage_ratio = 30,
    prompt_analysis_detail = 'medium'
  } = config;

  // 评分严格度描述
  const strictnessMap = {
    strict: '严格按照参考答案评分，不允许任何偏差',
    medium: '适度宽松，允许同义词、近义词得分',
    loose: '宽松评分，只要意思相近即可得分'
  };

  // 语言风格描述
  const styleMap = {
    formal: '使用正式、规范的语言',
    encouraging: '使用鼓励性、温暖的语言',
    casual: '使用轻松、亲切的语言'
  };

  // 评语长度描述
  const lengthMap = {
    short: '评语简短，不超过20字',
    medium: '评语适中，30-50字',
    detailed: '评语详细，50-100字'
  };

  // 错题分析详细度描述
  const analysisMap = {
    brief: '简要指出错误点',
    medium: '分析错误原因并给出正确思路',
    detailed: '详细分析错误原因、给出正确思路和相关知识点拓展'
  };

  return {
    strictnessDesc: strictnessMap[prompt_strictness] || strictnessMap.medium,
    styleDesc: styleMap[prompt_style] || styleMap.encouraging,
    lengthDesc: lengthMap[prompt_comment_length] || lengthMap.medium,
    encourageRatio: prompt_encourage_ratio,
    analysisDesc: analysisMap[prompt_analysis_detail] || analysisMap.medium
  };
}

/**
 * 调用DeepSeek API
 */
async function callDeepSeekAPI(messages, options = {}) {
  const { apiKey, model, temperature, timeout } = options;

  if (!apiKey) {
    throw new Error('DeepSeek API密钥未配置');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout || 30000);

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages,
        temperature: temperature || 0.3,
        max_tokens: 1000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('API请求超时');
    }
    throw err;
  }
}

/**
 * 调用Ollama API
 */
async function callOllamaAPI(messages, options = {}) {
  const { endpoint, model, temperature, timeout } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout || 60000);

  try {
    const response = await fetch(`${endpoint || 'http://localhost:11434'}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'qwen2.5:7b',
        messages,
        stream: false,
        options: {
          temperature: temperature || 0.3
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Ollama请求超时');
    }
    throw err;
  }
}

/**
 * 统一AI调用接口
 */
async function callAI(messages, config = {}) {
  const provider = config.ai_provider || 'deepseek';

  if (provider === 'deepseek') {
    return callDeepSeekAPI(messages, {
      apiKey: config.ai_api_key,
      model: config.ai_model,
      temperature: config.ai_temperature,
      timeout: config.ai_timeout
    });
  } else if (provider === 'ollama') {
    return callOllamaAPI(messages, {
      endpoint: config.ai_endpoint,
      model: config.ai_model,
      temperature: config.ai_temperature,
      timeout: config.ai_timeout
    });
  }

  throw new Error(`不支持的AI提供者: ${provider}`);
}

/**
 * 解析AI返回的JSON
 */
function parseAIResponse(content) {
  try {
    // 尝试直接解析
    return JSON.parse(content);
  } catch (e) {
    // 尝试提取JSON块
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // 尝试找到JSON对象
    const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]);
    }

    throw new Error('无法解析AI返回结果');
  }
}

/**
 * AI批改填空题
 */
async function gradeFillQuestion(question, referenceAnswer, studentAnswer, score, config = {}) {
  const params = getPromptParams(config);

  const prompt = `你是一位小学教师，正在批改学生的填空题。

题目：${question}
参考答案：${referenceAnswer}
学生答案：${studentAnswer}
满分：${score}

评分要求：
1. ${params.strictnessDesc}
2. ${params.styleDesc}
3. ${params.lengthDesc}
4. 鼓励性语言占比约${params.encourageRatio}%

请以JSON格式返回：
{
  "isCorrect": true/false,
  "score": 数字,
  "comment": "评语"
}`;

  const messages = [
    { role: 'system', content: '你是一位经验丰富的小学教师，擅长批改学生作业。请以JSON格式返回批改结果。' },
    { role: 'user', content: prompt }
  ];

  const content = await callAI(messages, config);
  const result = parseAIResponse(content);

  // 确保分数在合理范围内
  result.score = Math.max(0, Math.min(score, result.score || 0));
  result.isCorrect = result.score >= score;

  return result;
}

/**
 * AI批改主观题
 */
async function gradeSubjectiveQuestion(question, referenceAnswer, scoringStandard, studentAnswer, totalScore, config = {}) {
  const params = getPromptParams(config);

  const prompt = `你是一位小学教师，正在批改学生的主观题。

题目：${question}
参考答案：${referenceAnswer}
评分标准：${scoringStandard || '根据答案完整度和正确性评分'}
学生答案：${studentAnswer}
满分：${totalScore}

评分要求：
1. ${params.strictnessDesc}
2. ${params.styleDesc}
3. ${params.lengthDesc}
4. 错题分析：${params.analysisDesc}
5. 鼓励性语言占比约${params.encourageRatio}%

请根据评分标准逐项打分，并给出总分和评语。
请以JSON格式返回：
{
  "score": 数字,
  "comment": "评语",
  "details": [
    {"item": "评分项", "score": 得分, "reason": "原因"}
  ]
}`;

  const messages = [
    { role: 'system', content: '你是一位经验丰富的小学教师，擅长批改学生作文和主观题。请以JSON格式返回批改结果。' },
    { role: 'user', content: prompt }
  ];

  const content = await callAI(messages, config);
  const result = parseAIResponse(content);

  // 确保分数在合理范围内
  result.score = Math.max(0, Math.min(totalScore, result.score || 0));

  // 设置isCorrect：得分等于满分为正确
  result.isCorrect = result.score >= totalScore;

  return result;
}

/**
 * 批改单个题目
 */
async function gradeQuestion(questionData, config = {}) {
  const { question_type, content, answer, studentAnswer, score, analysis } = questionData;

  if (question_type === 'choice') {
    // 单选题：学生答案可能是索引数字(0,1,2,3)或字母(A,B,C,D)
    let studentAns = studentAnswer;
    if (typeof studentAnswer === 'number') {
      studentAns = String.fromCharCode(65 + studentAnswer);
    } else if (typeof studentAnswer === 'string' && /^[0-3]$/.test(studentAnswer)) {
      studentAns = String.fromCharCode(65 + parseInt(studentAnswer));
    }
    const isCorrect = studentAns === answer;
    return {
      isCorrect,
      score: isCorrect ? score : 0,
      comment: isCorrect ? '回答正确' : '回答错误'
    };
  } else if (question_type === 'judgment') {
    // 判断题：学生答案可能是索引数字(0,1)或字母(A,B)或布尔值(true/false)
    let studentAns = studentAnswer;
    if (typeof studentAnswer === 'number') {
      // 0 表示正确(A), 1 表示错误(B)
      studentAns = studentAnswer === 0 ? 'A' : 'B';
    } else if (typeof studentAnswer === 'boolean') {
      studentAns = studentAnswer ? 'A' : 'B';
    } else if (typeof studentAnswer === 'string') {
      if (studentAnswer === 'true' || studentAnswer === '正确' || studentAnswer === '√') {
        studentAns = 'A';
      } else if (studentAnswer === 'false' || studentAnswer === '错误' || studentAnswer === '×') {
        studentAns = 'B';
      } else if (/^[01]$/.test(studentAnswer)) {
        studentAns = studentAnswer === '0' ? 'A' : 'B';
      }
    }
    const isCorrect = studentAns === answer;
    return {
      isCorrect,
      score: isCorrect ? score : 0,
      comment: isCorrect ? '回答正确' : '回答错误'
    };
  } else if (question_type === 'multiple') {
    // 多选题：学生答案可能是索引数组或字母字符串
    let studentAnsArr = [];
    if (Array.isArray(studentAnswer)) {
      // 检查是数字索引还是字母
      if (studentAnswer.length > 0 && typeof studentAnswer[0] === 'number') {
        studentAnsArr = studentAnswer.map(i => String.fromCharCode(65 + i)).sort();
      } else {
        studentAnsArr = studentAnswer.sort();
      }
    } else if (typeof studentAnswer === 'string') {
      studentAnsArr = studentAnswer.split('').sort();
    }
    const correctAnswerArr = answer.split('').sort();
    const isCorrect = JSON.stringify(correctAnswerArr) === JSON.stringify(studentAnsArr);
    return {
      isCorrect,
      score: isCorrect ? score : 0,
      comment: isCorrect ? '回答正确' : '回答错误'
    };
  } else if (question_type === 'fill') {
    return await gradeFillQuestion(content, answer, studentAnswer, score, config);
  } else if (question_type === 'subjective') {
    return await gradeSubjectiveQuestion(content, answer, analysis, studentAnswer, score, config);
  }

  throw new Error('未知的题目类型');
}

/**
 * 根据批改配置处理题目
 * @param {Object} questionData - 题目数据
 * @param {Object} gradingConfig - 批改配置
 * @returns {Object} - 批改结果
 */
async function gradeQuestionWithConfig(questionData, gradingConfig) {
  const { question_type } = questionData;
  const { grading_mode, mixed_config } = gradingConfig;

  // 自动判定的题型（客观题）
  const autoTypes = ['choice', 'multiple', 'judgment'];

  // 手动批改模式
  if (grading_mode === 'manual') {
    if (autoTypes.includes(question_type)) {
      // 选择题自动判定
      return gradeQuestion(questionData);
    }
    // 填空和主观题返回待批改状态
    return {
      isCorrect: null,
      score: null,
      comment: '待教师批改',
      pending: true
    };
  }

  // AI批改模式
  if (grading_mode === 'ai') {
    if (autoTypes.includes(question_type)) {
      return gradeQuestion(questionData);
    }
    return gradeQuestion(questionData, gradingConfig);
  }

  // 混合模式
  if (grading_mode === 'mixed' && mixed_config) {
    const typeConfig = mixed_config[question_type];

    if (typeConfig === 'auto' || autoTypes.includes(question_type)) {
      return gradeQuestion(questionData);
    } else if (typeConfig === 'ai') {
      return gradeQuestion(questionData, gradingConfig);
    } else {
      // manual
      return {
        isCorrect: null,
        score: null,
        comment: '待教师批改',
        pending: true
      };
    }
  }

  // 默认：选择题自动判定，其他待批改
  if (autoTypes.includes(question_type)) {
    return gradeQuestion(questionData);
  }
  return {
    isCorrect: null,
    score: null,
    comment: '待教师批改',
    pending: true
  };
}

module.exports = {
  callDeepSeekAPI,
  callOllamaAPI,
  callAI,
  parseAIResponse,
  gradeFillQuestion,
  gradeSubjectiveQuestion,
  gradeQuestion,
  gradeQuestionWithConfig,
  getPromptParams
};
