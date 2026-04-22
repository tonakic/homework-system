// tests/security/helpers/security-helper.ts

import { Page } from '@playwright/test';
import { ApiClient } from './api-client';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';

/**
 * 安全测试断言结果
 */
export interface SecurityAssertionResult {
  passed: boolean;
  testName: string;
  expected: string;
  actual: string;
  details?: string;
}

/**
 * 安全测试助手
 */
export class SecurityHelper {
  private page: Page;
  private apiClient: ApiClient;

  constructor(page: Page, apiClient: ApiClient) {
    this.page = page;
    this.apiClient = apiClient;
  }

  /**
   * 断言API返回权限不足
   */
  async assertForbidden(
    apiCall: () => Promise<{ status: number; data: any }>
  ): Promise<SecurityAssertionResult> {
    const { status, data } = await apiCall();

    const passed = status === HTTP_STATUS.FORBIDDEN ||
                   data.code === ERROR_CODES.PERMISSION_DENIED;

    return {
      passed,
      testName: '权限验证',
      expected: `HTTP 403 或 错误码 ${ERROR_CODES.PERMISSION_DENIED}`,
      actual: `HTTP ${status}, 错误码 ${data.code}`,
      details: data.message
    };
  }

  /**
   * 断言API返回未授权
   */
  async assertUnauthorized(
    apiCall: () => Promise<{ status: number; data: any }>
  ): Promise<SecurityAssertionResult> {
    const { status, data } = await apiCall();

    const passed = status === HTTP_STATUS.UNAUTHORIZED ||
                   data.code === ERROR_CODES.TOKEN_EXPIRED ||
                   data.code === ERROR_CODES.TOKEN_INVALID;

    return {
      passed,
      testName: '认证验证',
      expected: `HTTP 401 或 Token相关错误`,
      actual: `HTTP ${status}, 错误码 ${data.code}`,
      details: data.message
    };
  }

  /**
   * 断言页面重定向到登录页
   */
  async assertRedirectToLogin(url: string): Promise<SecurityAssertionResult> {
    await this.page.goto(url);
    await this.page.waitForTimeout(500);

    const currentUrl = this.page.url();
    const passed = currentUrl.includes('/login');

    return {
      passed,
      testName: '页面重定向验证',
      expected: '重定向到登录页',
      actual: `当前URL: ${currentUrl}`,
      details: `尝试访问: ${url}`
    };
  }

  /**
   * 测试SQL注入
   */
  async testSqlInjection(
    endpoint: string,
    payload: string,
    fieldName: string
  ): Promise<SecurityAssertionResult> {
    const { status, data } = await this.apiClient.post(endpoint, {
      [fieldName]: payload
    });

    const responseStr = JSON.stringify(data).toLowerCase();
    const sqlErrorIndicators = [
      'sql', 'syntax', 'mysql', 'sqlite', 'database', 'query',
      'select', 'insert', 'update', 'delete', 'drop', 'union'
    ];

    const hasSqlError = sqlErrorIndicators.some(indicator =>
      responseStr.includes(indicator)
    );

    const passed = !hasSqlError && status !== HTTP_STATUS.INTERNAL_ERROR;

    return {
      passed,
      testName: 'SQL注入测试',
      expected: '无SQL错误暴露',
      actual: hasSqlError ? '检测到SQL错误信息' : '响应正常',
      details: `Payload: ${payload.substring(0, 50)}...`
    };
  }

  /**
   * 测试XSS攻击
   */
  async testXss(
    page: Page,
    selector: string,
    payload: string
  ): Promise<SecurityAssertionResult> {
    await page.locator(selector).fill(payload);
    await page.waitForTimeout(300);

    const xssExecuted = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        if (script.textContent?.includes('alert') ||
            script.textContent?.includes('XSS')) {
          return true;
        }
      }

      const elementsWithEvents = document.querySelectorAll('[onclick], [onerror], [onload]');
      return elementsWithEvents.length > 0;
    });

    return {
      passed: !xssExecuted,
      testName: 'XSS注入测试',
      expected: 'XSS payload被转义或过滤',
      actual: xssExecuted ? '检测到XSS执行风险' : 'XSS payload已被转义',
      details: `Payload: ${payload.substring(0, 50)}...`
    };
  }

  /**
   * 测试弱密码
   */
  async testWeakPassword(
    userType: string,
    account: string,
    weakPassword: string
  ): Promise<SecurityAssertionResult> {
    const testClient = new ApiClient();
    const result = await testClient.login(userType as any, account, weakPassword);

    const passed = !result.success || result.firstLogin;

    return {
      passed,
      testName: '弱密码测试',
      expected: '登录失败或要求修改密码',
      actual: result.success ? '弱密码登录成功' : '登录失败',
      details: `密码: ${weakPassword}`
    };
  }

  /**
   * 测试Token安全性
   */
  async testTokenSecurity(
    validToken: string,
    testType: 'expired' | 'fake' | 'tampered' | 'empty'
  ): Promise<SecurityAssertionResult> {
    const testClient = new ApiClient();

    let testToken: string;
    let expectedBehavior: string;

    switch (testType) {
      case 'expired':
        testToken = this.createExpiredToken(validToken);
        expectedBehavior = '拒绝过期Token';
        break;
      case 'fake':
        testToken = ApiClient.createFakeToken();
        expectedBehavior = '拒绝伪造Token';
        break;
      case 'tampered':
        testToken = ApiClient.createTamperedToken(validToken, 99999);
        expectedBehavior = '拒绝篡改Token';
        break;
      case 'empty':
        testToken = '';
        expectedBehavior = '拒绝空Token';
        break;
    }

    testClient.setToken(testToken);
    const { status, data } = await testClient.getProfile();

    const passed = status === HTTP_STATUS.UNAUTHORIZED ||
                   data.code === ERROR_CODES.TOKEN_EXPIRED ||
                   data.code === ERROR_CODES.TOKEN_INVALID;

    return {
      passed,
      testName: `Token安全测试 - ${testType}`,
      expected: expectedBehavior,
      actual: `HTTP ${status}, 错误码 ${data.code}`,
      details: data.message
    };
  }

  /**
   * 创建过期Token
   */
  private createExpiredToken(originalToken: string): string {
    const parts = originalToken.split('.');
    if (parts.length !== 3) {
      return ApiClient.createFakeToken();
    }

    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      payload.iat = 0;
      payload.exp = 1;
      const newPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      return `${parts[0]}.${newPayload}.${parts[2]}`;
    } catch {
      return ApiClient.createFakeToken();
    }
  }

  /**
   * 测试越权访问
   */
  async testPrivilegeEscalation(
    lowPrivilegeToken: string,
    highPrivilegeEndpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
  ): Promise<SecurityAssertionResult> {
    const testClient = new ApiClient();
    testClient.setToken(lowPrivilegeToken);

    let result;
    switch (method) {
      case 'GET':
        result = await testClient.get(highPrivilegeEndpoint);
        break;
      case 'POST':
        result = await testClient.post(highPrivilegeEndpoint, {});
        break;
      case 'PUT':
        result = await testClient.put(highPrivilegeEndpoint, {});
        break;
      case 'DELETE':
        result = await testClient.delete(highPrivilegeEndpoint);
        break;
    }

    const { status, data } = result!;
    const passed = status === HTTP_STATUS.FORBIDDEN ||
                   data.code === ERROR_CODES.PERMISSION_DENIED ||
                   status === HTTP_STATUS.UNAUTHORIZED;

    return {
      passed,
      testName: '越权访问测试',
      expected: '权限不足或未授权',
      actual: `HTTP ${status}, 错误码 ${data.code}`,
      details: `Endpoint: ${highPrivilegeEndpoint}`
    };
  }

  /**
   * 打印安全测试结果
   */
  static printResult(result: SecurityAssertionResult): void {
    const icon = result.passed ? '✓' : '✗';
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`[${icon}] ${result.testName}: ${status}`);
    console.log(`    预期: ${result.expected}`);
    console.log(`    实际: ${result.actual}`);
    if (result.details) {
      console.log(`    详情: ${result.details}`);
    }
  }

  /**
   * 生成安全测试报告
   */
  static generateReport(results: SecurityAssertionResult[]): string {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    let report = `# 安全测试报告\n\n`;
    report += `## 概要\n\n`;
    report += `- 通过: ${passed}\n`;
    report += `- 失败: ${failed}\n`;
    report += `- 通过率: ${((passed / results.length) * 100).toFixed(1)}%\n\n`;
    report += `## 详细结果\n\n`;

    for (const result of results) {
      const icon = result.passed ? '✓' : '✗';
      report += `### ${icon} ${result.testName}\n\n`;
      report += `- **预期**: ${result.expected}\n`;
      report += `- **实际**: ${result.actual}\n`;
      if (result.details) {
        report += `- **详情**: ${result.details}\n`;
      }
      report += `\n`;
    }

    return report;
  }
}
