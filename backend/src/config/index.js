require('dotenv').config();

// 生产环境必须设置JWT密钥
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('错误: 生产环境必须设置 JWT_SECRET 环境变量');
  process.exit(1);
}

// 开发环境警告
if (process.env.NODE_ENV !== 'production' && !process.env.JWT_SECRET) {
  console.warn('警告: 未设置 JWT_SECRET，使用默认密钥（仅限开发环境）');
}

module.exports = {
  // 服务配置
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development',

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-default-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    rememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN || '7d'
  },

  // 登录安全配置
  loginSecurity: {
    maxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5,
    lockTime: parseInt(process.env.LOGIN_LOCK_TIME, 10) || 15 // 分钟
  },

  // AI批改配置
  ai: {
    provider: process.env.AI_PROVIDER || 'deepseek',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'deepseek-chat',
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
    timeout: parseInt(process.env.AI_TIMEOUT, 10) || 30000,
    maxRetries: parseInt(process.env.AI_MAX_RETRIES, 10) || 3
  },

  // 文件上传配置
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10 * 1024 * 1024,
    dir: process.env.UPLOAD_DIR || 'uploads'
  },

  // 数据库配置
  database: {
    path: process.env.DATABASE_PATH || 'database/homework.db'
  }
};
