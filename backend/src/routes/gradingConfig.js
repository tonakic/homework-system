const express = require('express');
const router = express.Router();
const {
  getConfigList,
  getConfigById,
  createConfig,
  updateConfig,
  deleteConfig,
  testAIConnection,
  getDefaultConfig
} = require('../controllers/gradingConfigController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// 所有路由需要认证
router.use(authMiddleware);

// 批改配置路由仅限教师和管理员访问
router.use(roleMiddleware(['teacher', 'admin']));

// 批改配置路由
router.get('/', getConfigList);
router.get('/default', getDefaultConfig);
router.get('/:id', getConfigById);
router.post('/', createConfig);
router.put('/:id', updateConfig);
router.delete('/:id', deleteConfig);
router.post('/test', testAIConnection);

module.exports = router;
