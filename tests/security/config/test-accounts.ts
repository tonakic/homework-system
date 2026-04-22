// tests/security/config/test-accounts.ts

import { ApiClient } from '../helpers/api-client';
import { TestAccount, UserType, PASSWORDS, BASE_URL } from './constants';

/**
 * 动态测试账号管理器
 */
export class TestAccountManager {
  private apiClient: ApiClient;
  private adminToken: string | null = null;
  private createdAccounts: TestAccount[] = [];
  private accountCounter: number = 0;

  constructor(baseURL: string = BASE_URL) {
    this.apiClient = new ApiClient(baseURL);
  }

  /**
   * 初始化管理员Token
   */
  private async initAdminToken(): Promise<void> {
    if (this.adminToken) return;

    const result = await this.apiClient.login('admin', 'admin', PASSWORDS.ADMIN_DEFAULT);

    if (!result.success) {
      const retryResult = await this.apiClient.login('admin', 'admin', 'NewAdmin@123456');
      if (!retryResult.success) {
        throw new Error('无法获取管理员Token，请检查管理员账号密码');
      }
      this.adminToken = retryResult.token!;
    } else {
      this.adminToken = result.token!;
    }
  }

  /**
   * 生成唯一账号编号
   */
  private generateUniqueNo(): string {
    this.accountCounter++;
    const timestamp = Date.now().toString().slice(-6);
    return `${timestamp}${this.accountCounter.toString().padStart(2, '0')}`;
  }

  /**
   * 创建学生测试账号
   */
  async createStudent(options?: {
    name?: string;
    grade?: string;
    className?: string;
  }): Promise<TestAccount> {
    await this.initAdminToken();

    const uniqueNo = this.generateUniqueNo();
    const account: TestAccount = {
      account: `TEST${uniqueNo}`,
      password: PASSWORDS.DEFAULT,
      newPassword: PASSWORDS.TEST_NEW,
      userType: 'student',
      name: options?.name || `测试学生${uniqueNo}`,
      grade: options?.grade || '一年级',
      className: options?.className || '1班'
    };

    const result = await this.apiClient.createStudent({
      student_no: account.account,
      name: account.name!,
      grade: account.grade!,
      class_name: account.className!
    });

    if (!result.success) {
      throw new Error(`创建学生账号失败: ${result.error}`);
    }

    account.id = result.id;
    this.createdAccounts.push(account);
    console.log(`[TestAccountManager] 创建学生账号: ${account.account} (ID: ${account.id})`);

    return account;
  }

  /**
   * 创建教师测试账号
   */
  async createTeacher(options?: {
    name?: string;
    subjects?: string[];
    manageClasses?: string[];
  }): Promise<TestAccount> {
    await this.initAdminToken();

    const uniqueNo = this.generateUniqueNo();
    const account: TestAccount = {
      account: `TTEST${uniqueNo}`,
      password: PASSWORDS.DEFAULT,
      newPassword: PASSWORDS.TEST_NEW,
      userType: 'teacher',
      name: options?.name || `测试教师${uniqueNo}`,
      subjects: options?.subjects || ['语文'],
      manageClasses: options?.manageClasses || ['一年级1班']
    };

    const result = await this.apiClient.createTeacher({
      teacher_no: account.account,
      name: account.name!,
      subjects: account.subjects,
      manage_classes: account.manageClasses
    });

    if (!result.success) {
      throw new Error(`创建教师账号失败: ${result.error}`);
    }

    account.id = result.id;
    this.createdAccounts.push(account);
    console.log(`[TestAccountManager] 创建教师账号: ${account.account} (ID: ${account.id})`);

    return account;
  }

  /**
   * 获取账号的认证Token
   */
  async getAccountToken(account: TestAccount): Promise<string> {
    const testClient = new ApiClient();

    let result = await testClient.login(account.userType, account.account, account.password);

    if (result.success) {
      if (result.firstLogin) {
        await testClient.changePassword(account.password, account.newPassword!);
        result = await testClient.login(account.userType, account.account, account.newPassword!);
      }
      account.token = result.token;
      return result.token!;
    }

    result = await testClient.login(account.userType, account.account, account.newPassword!);
    if (result.success) {
      account.token = result.token;
      return result.token!;
    }

    throw new Error(`无法获取账号Token: ${account.account}`);
  }

  /**
   * 清理单个测试账号
   */
  async cleanup(account: TestAccount): Promise<void> {
    if (!account.id) return;

    await this.initAdminToken();

    if (account.userType === 'student') {
      await this.apiClient.deleteStudent(account.id);
    } else if (account.userType === 'teacher') {
      await this.apiClient.deleteTeacher(account.id);
    }

    this.createdAccounts = this.createdAccounts.filter(a => a.id !== account.id);
    console.log(`[TestAccountManager] 清理账号: ${account.account} (ID: ${account.id})`);
  }

  /**
   * 清理所有已创建的测试账号
   */
  async cleanupAll(): Promise<void> {
    console.log(`[TestAccountManager] 开始清理 ${this.createdAccounts.length} 个测试账号...`);

    for (const account of [...this.createdAccounts]) {
      try {
        await this.cleanup(account);
      } catch (error) {
        console.log(`[TestAccountManager] 清理账号失败: ${account.account} - ${error}`);
      }
    }

    this.createdAccounts = [];
    console.log(`[TestAccountManager] 清理完成`);
  }

  /**
   * 获取管理员Token
   */
  async getAdminToken(): Promise<string> {
    await this.initAdminToken();
    return this.adminToken!;
  }

  /**
   * 获取所有已创建的账号
   */
  getCreatedAccounts(): TestAccount[] {
    return [...this.createdAccounts];
  }
}

/**
 * 预定义的测试账号
 */
export const PREDEFINED_ACCOUNTS = {
  student1: {
    account: '202601001',
    password: PASSWORDS.DEFAULT,
    newPassword: PASSWORDS.TEST_NEW,
    userType: 'student' as UserType,
    name: '张三'
  },
  student2: {
    account: '202601002',
    password: PASSWORDS.DEFAULT,
    newPassword: PASSWORDS.TEST_NEW,
    userType: 'student' as UserType,
    name: '李四'
  },
  student3: {
    account: '202601004',
    password: PASSWORDS.DEFAULT,
    newPassword: PASSWORDS.TEST_NEW,
    userType: 'student' as UserType,
    name: '赵六'
  },
  teacher1: {
    account: 'T2026001',
    password: PASSWORDS.DEFAULT,
    newPassword: PASSWORDS.TEST_NEW,
    userType: 'teacher' as UserType,
    name: '测试教师'
  },
  admin: {
    account: 'admin',
    password: PASSWORDS.ADMIN_DEFAULT,
    newPassword: 'NewAdmin@123456',
    userType: 'admin' as UserType,
    name: '管理员'
  }
};
