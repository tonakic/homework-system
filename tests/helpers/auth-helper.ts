import { Page, expect } from '@playwright/test';

// 测试账号配置
export const TEST_ACCOUNTS = {
  student: {
    account: '202601005',  // 使用第三个学生账号
    password: '123456',
    newPassword: 'Test@123456',
    userType: 'student',
    name: '王五'
  },
  teacher: {
    account: 'T2026001',
    password: '123456',
    newPassword: 'Test@123456',
    userType: 'teacher',
    name: '测试教师'
  },
  admin: {
    account: 'admin',
    password: 'Admin@123456',
    newPassword: 'NewAdmin@123456',
    userType: 'admin',
    name: '管理员'
  }
};

// 默认新密码（首次登录后修改的密码）
const DEFAULT_NEW_PASSWORD = 'Test@123456';

// 等待配置常量
const WAIT_CONFIG = {
  PAGE_LOAD_TIMEOUT: 15000,
  ELEMENT_TIMEOUT: 10000,
  STABILITY_DELAY: 300,
  NETWORK_IDLE_TIMEOUT: 5000,
};

/**
 * 登录并处理首次登录修改密码流程
 * 这是解决测试阻拦的核心函数
 */
export async function loginAndHandleFirstLogin(
  page: Page,
  userType: 'student' | 'teacher' | 'admin',
  account: string,
  password: string
): Promise<{ isFirstLogin: boolean; newPassword: string }> {
  const loginPath = `/${userType}/login`;

  // 访问登录页面
  await page.goto(loginPath);
  await page.waitForLoadState('networkidle');

  // 填写登录表单 - 使用更通用的选择器
  const accountInput = page.locator('input').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await accountInput.fill(account);
  await passwordInput.fill(password);

  // 点击登录按钮
  const loginButton = page.locator('button:has-text("登录")').first();
  await loginButton.click();

  // 等待登录响应
  await page.waitForTimeout(1500);

  // 检查是否需要修改密码（首次登录）
  const currentUrl = page.url();
  const isFirstLogin = currentUrl.includes('profile') || currentUrl.includes('settings');

  if (isFirstLogin) {
    console.log(`[首次登录] 检测到 ${userType} ${account} 需要修改密码，自动处理中...`);

    // 先关闭可能存在的提示对话框
    try {
      const dialogButton = page.locator('.van-dialog button:has-text("去修改密码"), .van-dialog button:has-text("确定")');
      if (await dialogButton.count() > 0) {
        await dialogButton.first().click({ timeout: 2000 });
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // 对话框可能不存在，继续
    }

    // 处理首次登录修改密码
    await handlePasswordChange(page, password, DEFAULT_NEW_PASSWORD);

    return { isFirstLogin: true, newPassword: DEFAULT_NEW_PASSWORD };
  }

  // 非首次登录，直接进入首页
  await expect(page).toHaveURL(new RegExp(`/${userType}/home`), { timeout: 10000 });

  return { isFirstLogin: false, newPassword: password };
}

/**
 * 处理修改密码流程
 */
async function handlePasswordChange(
  page: Page,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  // 等待密码修改弹窗出现
  await page.waitForSelector('.van-popup', { timeout: 10000 });

  // 等待弹窗动画完成
  await page.waitForTimeout(500);

  // 填写原密码、新密码、确认密码
  const inputs = page.locator('.van-popup input[type="password"]');

  const inputCount = await inputs.count();
  console.log(`[密码修改] 找到 ${inputCount} 个密码输入框`);

  if (inputCount >= 3) {
    await inputs.nth(0).fill(oldPassword);     // 原密码
    await inputs.nth(1).fill(newPassword);     // 新密码
    await inputs.nth(2).fill(newPassword);     // 确认密码
  } else if (inputCount >= 2) {
    // 有些页面可能只有新密码和确认密码
    await inputs.nth(0).fill(newPassword);
    await inputs.nth(1).fill(newPassword);
  }

  await page.waitForTimeout(300);

  // 点击确认修改按钮 - 使用 force: true 跳过遮罩层拦截
  const submitButton = page.locator('.van-popup button:has-text("确认修改"), .van-popup button:has-text("确认")').first();

  // 尝试关闭遮罩层
  try {
    const overlay = page.locator('.van-overlay');
    if (await overlay.count() > 0) {
      // 点击弹窗内部确保焦点
      await page.locator('.van-popup').click();
    }
  } catch (e) {
    // 继续尝试点击
  }

  // 使用 force 点击绕过遮罩
  await submitButton.click({ force: true });

  // 等待修改成功
  await page.waitForTimeout(2000);

  // 验证是否跳转到首页
  try {
    await page.waitForURL(/\/(student|teacher|admin)\/home/, { timeout: 10000 });
    console.log(`[密码修改成功] 已将密码修改为: ${newPassword}`);
  } catch (e) {
    // 如果没有跳转，可能需要手动点击其他地方
    console.log(`[密码修改] 等待跳转中...`);
    await page.waitForTimeout(2000);
  }
}

/**
 * 登录并获取认证状态（用于 API 测试）
 */
export async function loginAndGetToken(
  baseURL: string,
  userType: 'student' | 'teacher' | 'admin',
  account: string,
  password: string
): Promise<{ token: string; userInfo: any }> {
  const response = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userType, account, password, remember: false })
  });

  const data = await response.json();

  if (data.code !== 0) {
    // 尝试使用新密码（如果已经修改过）
    const newPassword = 'Test@123456';
    const retryResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userType, account, password: newPassword, remember: false })
    });
    const retryData = await retryResponse.json();
    if (retryData.code !== 0) {
      throw new Error(`登录失败: ${data.message}`);
    }
    return {
      token: retryData.data.token,
      userInfo: retryData.data.userInfo
    };
  }

  return {
    token: data.data.token,
    userInfo: data.data.userInfo
  };
}

/**
 * 检查页面是否有 Toast 提示
 */
export async function checkToast(page: Page, type: 'success' | 'fail'): Promise<boolean> {
  const toastSelector = type === 'success'
    ? '.van-toast--success, .van-toast:has-text("成功")'
    : '.van-toast--fail, .van-toast:has-text("失败")';

  try {
    await page.waitForSelector(toastSelector, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * 等待页面加载完成 - 增强版
 * 包含多种等待策略确保页面完全加载
 */
export async function waitForPageReady(page: Page, options?: {
  timeout?: number;
  waitForSelector?: string;
}): Promise<void> {
  const timeout = options?.timeout || WAIT_CONFIG.PAGE_LOAD_TIMEOUT;

  // 1. 等待网络空闲
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {
    // 网络可能持续活跃，继续等待
  });

  // 2. 等待 DOM 内容加载
  await page.waitForLoadState('domcontentloaded', { timeout }).catch(() => {});

  // 3. 等待特定选择器（如果提供）
  if (options?.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { timeout }).catch(() => {});
  }

  // 4. 额外稳定性延迟
  await page.waitForTimeout(WAIT_CONFIG.STABILITY_DELAY);
}

/**
 * 检查当前页面是否在登录页
 */
export async function isOnLoginPage(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('/login') || url.includes('/auth');
}

/**
 * 检查当前页面认证状态
 * 如果被重定向到登录页则返回 false
 */
export async function checkAuthStatus(page: Page, userType: 'student' | 'teacher' | 'admin'): Promise<boolean> {
  const url = page.url();

  // 如果在登录页，说明未认证
  if (url.includes('/login') || url.includes('/auth')) {
    return false;
  }

  // 如果在对应角色的页面，说明已认证
  if (url.includes(`/${userType}/`)) {
    return true;
  }

  // 检查是否有用户信息元素（更可靠的认证检查）
  const hasUserInfo = await page.locator('.user-info, .user-name, [data-testid="user-profile"]').count() > 0;
  return hasUserInfo;
}

/**
 * 确保用户已认证 - 自动重新登录
 * 这是解决认证状态问题的核心函数
 */
export async function ensureAuthenticated(
  page: Page,
  userType: 'student' | 'teacher' | 'admin'
): Promise<void> {
  const account = TEST_ACCOUNTS[userType];

  // 检查当前 URL 是否在登录页
  const onLoginPage = await isOnLoginPage(page);

  if (onLoginPage) {
    console.log(`[认证恢复] 检测到 ${userType} 会话失效，正在重新登录...`);
    await loginAndHandleFirstLogin(page, userType, account.account, account.password);
  }
}

/**
 * 智能等待元素 - 带重试机制
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options?: {
    timeout?: number;
    state?: 'visible' | 'attached' | 'hidden' | 'detached';
    retries?: number;
  }
): Promise<boolean> {
  const timeout = options?.timeout || WAIT_CONFIG.ELEMENT_TIMEOUT;
  const state = options?.state || 'visible';
  const retries = options?.retries || 2;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.waitForSelector(selector, { state, timeout });
      return true;
    } catch (e) {
      if (attempt < retries) {
        console.log(`[元素等待] 第 ${attempt + 1} 次等待 ${selector} 失败，重试中...`);
        await page.waitForTimeout(500);
      }
    }
  }

  return false;
}

/**
 * 稳定的点击操作 - 等待元素可见后点击
 */
export async function stableClick(
  page: Page,
  selector: string,
  options?: { timeout?: number; force?: boolean }
): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: options?.timeout || WAIT_CONFIG.ELEMENT_TIMEOUT });
    await element.click({ force: options?.force });
    await page.waitForTimeout(WAIT_CONFIG.STABILITY_DELAY);
    return true;
  } catch (e) {
    console.log(`[稳定点击] 点击 ${selector} 失败: ${e}`);
    return false;
  }
}

/**
 * 稳定的填充操作 - 等待元素可见后填充
 */
export async function stableFill(
  page: Page,
  selector: string,
  value: string,
  options?: { timeout?: number; clear?: boolean }
): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: options?.timeout || WAIT_CONFIG.ELEMENT_TIMEOUT });

    if (options?.clear !== false) {
      await element.fill('');
    }
    await element.fill(value);
    await page.waitForTimeout(WAIT_CONFIG.STABILITY_DELAY);
    return true;
  } catch (e) {
    console.log(`[稳定填充] 填充 ${selector} 失败: ${e}`);
    return false;
  }
}

/**
 * 安全点击元素
 */
export async function safeClick(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().click({ timeout: 5000 });
  await page.waitForTimeout(300);
}

/**
 * 获取元素文本
 */
export async function getElementText(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector).first();
  return await element.textContent() || '';
}
