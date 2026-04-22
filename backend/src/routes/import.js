const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

/**
 * 创建导入路由
 * @param {Object} upload - multer实例
 */
function createImportRoutes(upload) {
  // 所有导入路由需要认证
  router.use(authMiddleware);

  // 只有教师和管理员可以访问
  router.use(roleMiddleware(['teacher', 'admin']));

  /**
   * @route GET /api/import/students/template
   * @desc 下载学生导入模板
   * @access Teacher, Admin
   */
  router.get('/students/template', importController.downloadStudentTemplate);

  /**
   * @route POST /api/import/students
   * @desc 批量导入学生
   * @access Teacher, Admin
   */
  router.post('/students', upload.single('file'), importController.importStudents);

  /**
   * @route GET /api/import/teachers/template
   * @desc 下载教师导入模板
   * @access Admin
   */
  router.get('/teachers/template', roleMiddleware(['admin']), importController.downloadTeacherTemplate);

  /**
   * @route POST /api/import/teachers
   * @desc 批量导入教师
   * @access Admin
   */
  router.post('/teachers', roleMiddleware(['admin']), upload.single('file'), importController.importTeachers);

  return router;
}

module.exports = createImportRoutes;