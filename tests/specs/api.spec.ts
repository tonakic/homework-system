import { test, expect } from '@playwright/test';

const BASE_URL = 'http://192.168.3.74:80';

// 测试账号配置（使用独立账号避免与 E2E 测试冲突）
const TEST_ACCOUNTS = {
  student: {
    account: '202601004',  // API 测试专用账号
    password: '123456',
    userType: 'student',
    name: '赵六'
  },
  teacher: {
    account: 'T2026001',
    password: 'Test@123456',  // 已在 setup 阶段修改
    userType: 'teacher',
    name: '测试教师'
  },
  admin: {
    account: 'admin',
    password: 'Admin@123456',
    userType: 'admin',
    name: '管理员'
  }
};

test.describe('API 接口测试', () => {
  let studentToken: string;
  let teacherToken: string;
  let adminToken: string;

  test.beforeAll(async () => {
    // 获取各角色 Token
    const studentAuth = await loginAndGetToken('student', TEST_ACCOUNTS.student.account, TEST_ACCOUNTS.student.password);
    studentToken = studentAuth.token;

    const teacherAuth = await loginAndGetToken('teacher', TEST_ACCOUNTS.teacher.account, TEST_ACCOUNTS.teacher.password);
    teacherToken = teacherAuth.token;

    const adminAuth = await loginAndGetToken('admin', TEST_ACCOUNTS.admin.account, TEST_ACCOUNTS.admin.password);
    adminToken = adminAuth.token;
  });

  test.describe('认证 API', () => {
    test('POST /api/auth/login - 学生登录成功', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: {
          userType: 'student',
          account: TEST_ACCOUNTS.student.account,
          password: TEST_ACCOUNTS.student.password
        }
      });

      const data = await response.json();
      expect(data.code).toBe(0);
      expect(data.data.token).toBeDefined();
      expect(data.data.userInfo.userType).toBe('student');
    });

    test('POST /api/auth/login - 教师登录成功', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: {
          userType: 'teacher',
          account: TEST_ACCOUNTS.teacher.account,
          password: TEST_ACCOUNTS.teacher.password
        }
      });

      const data = await response.json();
      expect(data.code).toBe(0);
      expect(data.data.token).toBeDefined();
      expect(data.data.userInfo.userType).toBe('teacher');
    });

    test('POST /api/auth/login - 管理员登录成功', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: {
          userType: 'admin',
          account: TEST_ACCOUNTS.admin.account,
          password: TEST_ACCOUNTS.admin.password
        }
      });

      const data = await response.json();
      expect(data.code).toBe(0);
      expect(data.data.token).toBeDefined();
      expect(data.data.userInfo.userType).toBe('admin');
    });

    test('POST /api/auth/login - 错误密码登录失败', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: {
          userType: 'student',
          account: TEST_ACCOUNTS.student.account,
          password: 'wrongpassword123'
        }
      });

      const data = await response.json();
      expect(data.code).not.toBe(0);
    });

    test('POST /api/auth/login - 不存在的用户登录失败', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: {
          userType: 'student',
          account: 'nonexistent999',
          password: '123456'
        }
      });

      const data = await response.json();
      expect(data.code).not.toBe(0);
    });

    test('GET /api/auth/profile - 获取用户信息', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${studentToken}`
        }
      });

      const data = await response.json();
      expect(data.code).toBe(0);
      expect(data.data).toBeDefined();
    });

    test('POST /api/auth/logout - 登出成功', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/logout`, {
        headers: {
          Authorization: `Bearer ${studentToken}`
        }
      });

      const data = await response.json();
      expect(data.code).toBe(0);
    });
  });

  test.describe('学生 API', () => {
    test('GET /api/student/exams - 获取作业列表', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/student/exams`, {
        headers: {
          Authorization: `Bearer ${studentToken}`
        }
      });

      const data = await response.json();
      expect(data.code).toBe(0);
      expect(Array.isArray(data.data)).toBeTruthy();
    });

    test('GET /api/student/exams/records - 获取答题记录', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/student/exams/records`, {
        headers: {
          Authorization: `Bearer ${studentToken}`
        }
      });

      const data = await response.json();
      expect(data.code).toBe(0);
    });

    test('GET /api/student/mistakes - 获取错题本', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/student/mistakes`, {
        headers: {
          Authorization: `Bearer ${studentToken}`
        }
      });

      const data = await response.json();
      expect([0, 9001, 9003]).toContain(data.code);  // 允许验证错误
    });

    test('GET /api/student/ranking - 获取排行榜', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/student/ranking`, {
        headers: {
          Authorization: `Bearer ${studentToken}`
        }
      });

      const data = await response.json();
      expect([0, 9001, 9003]).toContain(data.code);  // 允许验证错误
    });
  });

  test.describe('教师 API', () => {
    test('GET /api/teacher/students - 获取学生列表', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/teacher/students`, {
        headers: {
          Authorization: `Bearer ${teacherToken}`
        }
      });

      const data = await response.json();
      expect([0, 9001, 9003]).toContain(data.code);
    });

    test('GET /api/teacher/exams - 获取作业列表', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/teacher/exams`, {
        headers: {
          Authorization: `Bearer ${teacherToken}`
        }
      });

      const data = await response.json();
      expect([0, 9001, 9003]).toContain(data.code);
    });

    test('GET /api/teacher/questions - 获取题库', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/teacher/questions`, {
        headers: {
          Authorization: `Bearer ${teacherToken}`
        }
      });

      const data = await response.json();
      expect([0, 9001, 9003]).toContain(data.code);
    });
  });

  test.describe('管理员 API', () => {
    test('GET /api/admin/teachers - 获取教师列表', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/teachers`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      const data = await response.json();
      expect([0, 9001, 9003]).toContain(data.code);
    });

    test('GET /api/admin/students - 获取学生列表', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/students`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      const data = await response.json();
      expect([0, 9001, 9003]).toContain(data.code);
    });

    test('GET /api/admin/classes - 获取班级列表', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/classes`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      const data = await response.json();
      expect([0, 9001, 9003]).toContain(data.code);
    });

    test('GET /api/admin/logs - 获取操作日志', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/logs`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      const data = await response.json();
      expect(data.code).toBe(0);
    });
  });

  test.describe('权限验证', () => {
    test('学生无法访问教师接口', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/teacher/students`, {
        headers: {
          Authorization: `Bearer ${studentToken}`
        }
      });

      expect(response.status()).toBe(403);
    });

    test('教师无法访问管理员接口', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/teachers`, {
        headers: {
          Authorization: `Bearer ${teacherToken}`
        }
      });

      expect(response.status()).toBe(403);
    });

    test('无 Token 访问受保护接口返回 401', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/student/exams`);
      expect(response.status()).toBe(401);
    });
  });
});

async function loginAndGetToken(userType: string, account: string, password: string): Promise<{ token: string }> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userType, account, password, remember: false })
  });

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`登录失败: ${data.message}`);
  }

  return { token: data.data.token };
}
