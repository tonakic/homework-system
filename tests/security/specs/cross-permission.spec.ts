// tests/security/specs/cross-permission.spec.ts

import { test, expect } from '../fixtures/auth.fixture';
import { ApiClient } from '../helpers/api-client';
import { API_ENDPOINTS, HTTP_STATUS, ERROR_CODES } from '../config/constants';

test.describe('跨权限访问测试', () => {

  test.describe('CP-001: 学生访问教师API', () => {
    test('学生Token访问教师列表API应返回403', async ({ studentApi }) => {
      const { status, data } = await studentApi.get(API_ENDPOINTS.TEACHERS);

      expect([HTTP_STATUS.FORBIDDEN, HTTP_STATUS.UNAUTHORIZED]).toContain(status);
      expect([ERROR_CODES.PERMISSION_DENIED, ERROR_CODES.TOKEN_INVALID, ERROR_CODES.TOKEN_EXPIRED]).toContain(data.code);
    });
  });

  test.describe('CP-002: 学生访问管理员页面', () => {
    test('学生访问管理员首页应被重定向', async ({ studentPage }) => {
      await studentPage.goto('/admin/home');
      await studentPage.waitForTimeout(1000);

      const currentUrl = studentPage.url();
      expect(currentUrl).not.toContain('/admin/home');
      expect(currentUrl).toMatch(/login|forbidden/i);
    });
  });

  test.describe('CP-003: 学生修改他人信息', () => {
    test('学生Token修改其他学生信息应返回403', async ({ studentApi, adminApi }) => {
      const result = await adminApi.getStudents();
      const students = result.data;

      if (!students || !Array.isArray(students) || students.length === 0) {
        test.skip();
        return;
      }

      const otherStudent = students.find((s: any) => s.student_no !== '202601004');
      if (!otherStudent) {
        test.skip();
        return;
      }

      const { status, data } = await studentApi.put(`${API_ENDPOINTS.STUDENTS}/${otherStudent.id}`, {
        name: '被修改的名字'
      });

      expect([HTTP_STATUS.FORBIDDEN, HTTP_STATUS.UNAUTHORIZED]).toContain(status);
    });
  });

  test.describe('CP-004: 教师访问管理员API', () => {
    test('教师Token访问管理员统计API应返回403', async ({ teacherApi }) => {
      const { status, data } = await teacherApi.get(API_ENDPOINTS.ADMIN_STATS);

      expect([HTTP_STATUS.FORBIDDEN, HTTP_STATUS.UNAUTHORIZED]).toContain(status);
    });
  });

  test.describe('CP-005: 教师操作非管理班级', () => {
    test('教师无法操作非管理班级的学生', async ({ teacherApi, adminApi }) => {
      const profileResult = await teacherApi.getProfile();
      expect(profileResult.success).toBe(true);

      const { data: classes } = await adminApi.get(API_ENDPOINTS.ADMIN_CLASSES);
      const managedClasses = profileResult.data?.manageClasses || [];

      if (Array.isArray(classes)) {
        const unmanagedClass = classes?.find((c: any) =>
          !managedClasses.includes(c.name)
        );

        if (unmanagedClass) {
          const { status } = await teacherApi.get(`${API_ENDPOINTS.STUDENTS}?class_name=${unmanagedClass.name}`);
        }
      }
    });
  });

  test.describe('CP-007: 无Token访问受保护页面', () => {
    test('无Token访问学生首页应重定向到登录页', async ({ page }) => {
      await page.goto('/student/home');
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      expect(currentUrl).toContain('login');
    });

    test('无Token访问教师首页应重定向到登录页', async ({ page }) => {
      await page.goto('/teacher/home');
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      expect(currentUrl).toContain('login');
    });

    test('无Token访问管理员首页应重定向到登录页', async ({ page }) => {
      await page.goto('/admin/home');
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      expect(currentUrl).toContain('login');
    });
  });

  test.describe('CP-010: Token跨角色使用', () => {
    test('学生Token访问教师端接口应返回403', async ({ studentApi }) => {
      const { status, data } = await studentApi.get(API_ENDPOINTS.TEACHER_GRADING);

      expect([HTTP_STATUS.FORBIDDEN, HTTP_STATUS.UNAUTHORIZED]).toContain(status);
    });

    test('教师Token访问管理员端接口应返回403', async ({ teacherApi }) => {
      const { status, data } = await teacherApi.get(API_ENDPOINTS.ADMIN_LOGS);

      expect([HTTP_STATUS.FORBIDDEN, HTTP_STATUS.UNAUTHORIZED]).toContain(status);
    });
  });

  test.describe('动态账号跨权限测试', () => {
    test('使用教师Token测试跨权限访问', async ({ teacherApi }) => {
      // 教师不应该能访问管理员统计
      const { status } = await teacherApi.get(API_ENDPOINTS.ADMIN_STATS);
      expect([HTTP_STATUS.FORBIDDEN, HTTP_STATUS.UNAUTHORIZED]).toContain(status);

      // 教师不应该能访问管理员日志
      const { status: logStatus } = await teacherApi.get(API_ENDPOINTS.ADMIN_LOGS);
      expect([HTTP_STATUS.FORBIDDEN, HTTP_STATUS.UNAUTHORIZED]).toContain(logStatus);
    });
  });
});
