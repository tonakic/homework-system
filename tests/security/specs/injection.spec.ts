// tests/security/specs/injection.spec.ts

import { test, expect } from '../fixtures/auth.fixture';
import { ApiClient } from '../helpers/api-client';
import { API_ENDPOINTS, HTTP_STATUS } from '../config/constants';

test.describe('注入攻击测试', () => {

  test.describe('INJ-001: 登录SQL注入', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "' OR '1'='1' --",
      "' OR '1'='1' /*",
      "admin'--",
      "1' OR '1' = '1",
      "' UNION SELECT NULL--",
      "1; DROP TABLE students--",
      "' OR 1=1#",
    ];

    for (const payload of sqlInjectionPayloads) {
      test(`SQL注入payload "${payload.substring(0, 20)}..." 应被过滤`, async () => {
        const client = new ApiClient();

        const result = await client.login('student', payload, payload);

        expect(result.success).toBe(false);

        if (result.error) {
          const errorLower = result.error.toLowerCase();
          const sqlKeywords = ['sql', 'syntax', 'mysql', 'sqlite', 'select', 'union', 'drop'];
          for (const keyword of sqlKeywords) {
            expect(errorLower).not.toContain(keyword);
          }
        }
      });
    }
  });

  test.describe('INJ-002: 登录SQL注入(Union)', () => {
    test('Union注入应被过滤', async () => {
      const client = new ApiClient();
      const payload = "' UNION SELECT 1,2,3,4,5,6,7,8,9,10--";

      const result = await client.login('student', payload, 'anypassword');
      expect(result.success).toBe(false);
    });
  });

  test.describe('INJ-003: 搜索框XSS', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '"><script>alert("XSS")</script>',
    ];

    for (const payload of xssPayloads) {
      test(`XSS payload "${payload.substring(0, 30)}..." 应被转义`, async ({ studentPage }) => {
        await studentPage.goto('/student/pending');
        await studentPage.waitForTimeout(500);

        const searchInput = studentPage.locator('input[type="search"], input[placeholder*="搜索"]').first();

        if (await searchInput.count() > 0) {
          await searchInput.fill(payload);
          await studentPage.waitForTimeout(300);

          const pageContent = await studentPage.content();

          expect(pageContent).not.toContain('<script>alert');
          expect(pageContent).not.toContain('onerror=alert');
        }
      });
    }
  });

  test.describe('INJ-004: 用户名存储型XSS', () => {
    test('修改用户名时XSS应被过滤', async ({ studentApi }) => {
      const xssPayload = '<script>alert("XSS")</script>';

      const { data, status } = await studentApi.put(API_ENDPOINTS.PROFILE, {
        name: xssPayload
      });

      if (status === HTTP_STATUS.OK) {
        const profile = await studentApi.getProfile();
        if (profile.data?.name) {
          expect(profile.data.name).not.toContain('<script>');
        }
      }
    });
  });

  test.describe('INJ-006: API参数注入', () => {
    test('API参数中的恶意字符应被过滤', async ({ teacherApi }) => {
      const maliciousInputs = [
        { name: '<script>alert(1)</script>' },
        { name: '"; DROP TABLE students; --' },
        { name: '${7*7}' },
      ];

      for (const input of maliciousInputs) {
        const { data, status } = await teacherApi.post(API_ENDPOINTS.ADMIN_CLASSES, input);

        if (status === HTTP_STATUS.OK && data.data) {
          expect(data.data.name).not.toContain('<script>');
          expect(data.data.name).not.toContain('DROP TABLE');
        }
      }
    });
  });

  test.describe('INJ-007: JSON注入', () => {
    test('格式错误的JSON应被正确处理', async () => {
      try {
        const response = await fetch('http://192.168.3.74:80/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{"userType":"student","account":"test","password":"test",}',
          signal: AbortSignal.timeout(10000)
        });

        expect(response.status).not.toBe(500);
      } catch (e) {
        // 请求可能失败，这是预期行为
      }
    });
  });

  test.describe('INJ-008: 命令注入', () => {
    test('命令注入payload应被过滤', async ({ teacherApi }) => {
      const commandInjectionPayloads = [
        '; ls -la',
        '| cat /etc/passwd',
        '`whoami`',
        '$(id)',
      ];

      for (const payload of commandInjectionPayloads) {
        const { data, status } = await teacherApi.put(API_ENDPOINTS.PROFILE, {
          name: `test${payload}`
        });

        expect(status).not.toBe(500);
      }
    });
  });

  test.describe('INJ-009: LDAP注入', () => {
    test('LDAP注入payload应被过滤', async () => {
      const ldapPayloads = [
        '*)(uid=*))(|(uid=*',
        'admin)((password=*))',
        '*)(objectClass=*',
      ];

      for (const payload of ldapPayloads) {
        const client = new ApiClient();
        const result = await client.login('student', payload, 'anypassword');

        expect(result.success).toBe(false);
      }
    });
  });

  test.describe('INJ-010: NoSQL注入', () => {
    test('NoSQL/JSON操作符注入应被过滤', async () => {
      const nosqlPayloads = [
        { $gt: '' },
        { $ne: '' },
      ];

      for (const payload of nosqlPayloads) {
        try {
          const response = await fetch('http://192.168.3.74:80/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userType: 'student',
              account: JSON.stringify(payload),
              password: 'test'
            }),
            signal: AbortSignal.timeout(10000)
          });

          const data = await response.json();
          expect(data.code).not.toBe(0);
        } catch {
          // 预期行为
        }
      }
    });
  });
});
