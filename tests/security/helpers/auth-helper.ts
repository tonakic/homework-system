// tests/security/helpers/auth-helper.ts

import { Page, BrowserContext } from '@playwright/test';
import {
  SELECTORS,
  PASSWORDS,
  WAIT_CONFIG,
  FIRST_LOGIN_ROUTES,
  UserType,
  TestAccount
} from '../config/constants';
import { ApiClient } from './api-client';

/**
 * 认证助手 - 处理登录和首次登录修改密码
 */
export class AuthHelper {
  private page: Page;
  private apiClient: ApiClient;

  constructor(page: Page, baseURL?: string) {
    this.page = page;
    this.apiClient = new ApiClient(baseURL);
  }

  /**
   * 完整的登录流程（包含首次登录修改密码处理）
   * 这是解决测试阻拦的核心方法
   */
  async loginAndHandleFirstLogin(
    userType: UserType,
    account: string,
    password: string,
    newPassword: string = PASSWORDS.TEST_NEW
  ): Promise<{ success: boolean; token?: string; isFirstLogin: boolean; error?: string }> {
    console.log(`[AuthHelper] 开始登录 ${userType}: ${account}`);

    // 1. 尝试API登录
    const loginResult = await this.apiClient.login(userType, account, password);

    if (loginResult.success) {
      if (loginResult.firstLogin) {
        console.log(`[AuthHelper] 首次登录检测，需要修改密码`);

        const changeResult = await this.apiClient.changePassword(password, newPassword);
        if (!changeResult.success) {
          console.log(`[AuthHelper] API修改密码失败，尝试UI方式...`);
          await this.uiLoginAndHandleFirstLogin(userType, account, password, newPassword);
        } else {
          console.log(`[AuthHelper] 密码已修改为: ${newPassword}`);
          const reLoginResult = await this.apiClient.login(userType, account, newPassword);
          if (reLoginResult.success) {
            return { success: true, token: reLoginResult.token, isFirstLogin: true };
          }
        }
      }

      return {
        success: true,
        token: loginResult.token,
        isFirstLogin: loginResult.firstLogin || false
      };
    }

    // 2. 如果原密码失败，尝试新密码
    if (password !== newPassword) {
      console.log(`[AuthHelper] 原密码登录失败，尝试新密码...`);
      const retryResult = await this.apiClient.login(userType, account, newPassword);

      if (retryResult.success) {
        return {
          success: true,
          token: retryResult.token,
          isFirstLogin: false
        };
      }
    }

    // 3. UI登录
    console.log(`[AuthHelper] API登录失败，尝试UI登录...`);
    return await this.uiLoginAndHandleFirstLogin(userType, account, password, newPassword);
  }

  /**
   * UI方式登录并处理首次登录
   */
  private async uiLoginAndHandleFirstLogin(
    userType: UserType,
    account: string,
    password: string,
    newPassword: string
  ): Promise<{ success: boolean; token?: string; isFirstLogin: boolean; error?: string }> {
    const loginPath = `/${userType}/login`;

    await this.page.goto(loginPath);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);

    await this.fillLoginForm(account, password);
    await this.page.locator(SELECTORS.LOGIN.submitButton).first().click();
    await this.page.waitForTimeout(1500);

    const currentUrl = this.page.url();
    const isFirstLogin = this.checkFirstLoginUrl(currentUrl, userType);

    if (isFirstLogin) {
      console.log(`[AuthHelper] UI检测到首次登录，处理修改密码...`);
      await this.handlePasswordChangeUI(password, newPassword);
    }

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);

    const token = await this.getTokenFromStorage();

    return {
      success: !!token,
      token: token || undefined,
      isFirstLogin,
      error: token ? undefined : '无法获取认证Token'
    };
  }

  /**
   * 填写登录表单
   */
  private async fillLoginForm(account: string, password: string): Promise<void> {
    const accountInput = this.page.locator(SELECTORS.LOGIN.accountInput).first();
    const passwordInput = this.page.locator(SELECTORS.LOGIN.passwordInput).first();

    await accountInput.fill('');
    await accountInput.fill(account);
    await this.page.waitForTimeout(200);

    await passwordInput.fill('');
    await passwordInput.fill(password);
    await this.page.waitForTimeout(200);
  }

  /**
   * 检查URL是否表示首次登录
   */
  private checkFirstLoginUrl(url: string, userType: UserType): boolean {
    return url.includes('profile') || url.includes('settings') || url.includes('changePassword');
  }

  /**
   * UI方式处理修改密码
   */
  private async handlePasswordChangeUI(oldPassword: string, newPassword: string): Promise<void> {
    try {
      const dialogButton = this.page.locator(SELECTORS.CHANGE_PASSWORD.dialogConfirm);
      if (await dialogButton.count() > 0) {
        await dialogButton.first().click({ timeout: 2000 });
        await this.page.waitForTimeout(500);
      }

      await this.page.waitForSelector(SELECTORS.CHANGE_PASSWORD.popup, {
        timeout: WAIT_CONFIG.PASSWORD_CHANGE_TIMEOUT
      });
      await this.page.waitForTimeout(500);

      const popup = this.page.locator(SELECTORS.CHANGE_PASSWORD.popup);
      const passwordInputs = popup.locator('input[type="password"]');
      const inputCount = await passwordInputs.count();

      console.log(`[AuthHelper] 找到 ${inputCount} 个密码输入框`);

      if (inputCount >= 3) {
        await passwordInputs.nth(0).fill(oldPassword);
        await passwordInputs.nth(1).fill(newPassword);
        await passwordInputs.nth(2).fill(newPassword);
      } else if (inputCount >= 2) {
        await passwordInputs.nth(0).fill(newPassword);
        await passwordInputs.nth(1).fill(newPassword);
      } else if (inputCount === 1) {
        await passwordInputs.nth(0).fill(newPassword);
      }

      await this.page.waitForTimeout(300);

      const submitButton = this.page.locator(SELECTORS.CHANGE_PASSWORD.submitButton).first();
      await submitButton.click({ force: true });

      try {
        await this.page.waitForURL(/\/home/, { timeout: WAIT_CONFIG.LOGIN_REDIRECT_TIMEOUT });
        console.log(`[AuthHelper] 密码修改成功，已跳转到首页`);
      } catch {
        console.log(`[AuthHelper] 等待跳转超时，当前URL: ${this.page.url()}`);
      }

    } catch (error) {
      console.log(`[AuthHelper] 修改密码处理失败: ${error}`);
      throw error;
    }
  }

  /**
   * 从localStorage获取Token
   */
  async getTokenFromStorage(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('token');
    });
  }

  /**
   * 从localStorage获取用户信息
   */
  async getUserInfoFromStorage(): Promise<any | null> {
    const userInfoStr = await this.page.evaluate(() => {
      return localStorage.getItem('userInfo');
    });

    if (userInfoStr) {
      try {
        return JSON.parse(userInfoStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 保存认证状态到文件
   */
  async saveAuthState(context: BrowserContext, path: string): Promise<void> {
    await context.storageState({ path });
    console.log(`[AuthHelper] 认证状态已保存到: ${path}`);
  }

  /**
   * 检查当前是否已认证
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getTokenFromStorage();
    if (!token) return false;

    this.apiClient.setToken(token);
    const result = await this.apiClient.getProfile();
    return result.success;
  }

  /**
   * 确保已认证
   */
  async ensureAuthenticated(
    userType: UserType,
    account: string,
    password: string,
    newPassword?: string
  ): Promise<boolean> {
    if (await this.isAuthenticated()) {
      return true;
    }

    const result = await this.loginAndHandleFirstLogin(
      userType,
      account,
      password,
      newPassword || PASSWORDS.TEST_NEW
    );
    return result.success;
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
    });

    this.apiClient.clearToken();
  }

  /**
   * 获取API客户端
   */
  getApiClient(): ApiClient {
    return this.apiClient;
  }
}

/**
 * 创建认证助手的便捷方法
 */
export function createAuthHelper(page: Page, baseURL?: string): AuthHelper {
  return new AuthHelper(page, baseURL);
}
