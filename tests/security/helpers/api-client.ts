// tests/security/helpers/api-client.ts

import { API_ENDPOINTS, BASE_URL, ApiResponse, LoginResponseData, UserType, ERROR_CODES } from '../config/constants';

/**
 * API客户端 - 用于安全测试的HTTP请求封装
 */
export class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private userType: UserType | null = null;

  constructor(baseURL: string = BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * 设置认证Token
   */
  setToken(token: string, userType?: UserType): void {
    this.token = token;
    if (userType) {
      this.userType = userType;
    }
  }

  /**
   * 获取当前Token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 清除Token
   */
  clearToken(): void {
    this.token = null;
    this.userType = null;
  }

  /**
   * 发送HTTP请求
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options?: {
      body?: any;
      headers?: Record<string, string>;
      noAuth?: boolean;
    }
  ): Promise<{ status: number; data: ApiResponse<T> }> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers
    };

    if (!options?.noAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined
    });

    let data: ApiResponse<T>;
    try {
      data = await response.json();
    } catch {
      data = {
        code: -1,
        message: 'Invalid JSON response'
      };
    }

    return {
      status: response.status,
      data
    };
  }

  /**
   * GET请求
   */
  async get<T>(endpoint: string, options?: { headers?: Record<string, string>; noAuth?: boolean }) {
    return this.request<T>('GET', endpoint, options);
  }

  /**
   * POST请求
   */
  async post<T>(endpoint: string, body: any, options?: { headers?: Record<string, string>; noAuth?: boolean }) {
    return this.request<T>('POST', endpoint, { ...options, body });
  }

  /**
   * PUT请求
   */
  async put<T>(endpoint: string, body: any, options?: { headers?: Record<string, string>; noAuth?: boolean }) {
    return this.request<T>('PUT', endpoint, { ...options, body });
  }

  /**
   * DELETE请求
   */
  async delete<T>(endpoint: string, options?: { headers?: Record<string, string>; noAuth?: boolean }) {
    return this.request<T>('DELETE', endpoint, options);
  }

  /**
   * 登录
   */
  async login(
    userType: UserType,
    account: string,
    password: string
  ): Promise<{ success: boolean; token?: string; userInfo?: any; firstLogin?: boolean; error?: string }> {
    const { status, data } = await this.post<LoginResponseData>(
      API_ENDPOINTS.LOGIN,
      { userType, account, password, remember: false },
      { noAuth: true }
    );

    if (data.code === ERROR_CODES.SUCCESS && data.data) {
      this.token = data.data.token;
      this.userType = userType;
      return {
        success: true,
        token: data.data.token,
        userInfo: data.data.userInfo,
        firstLogin: data.data.userInfo.firstLogin
      };
    }

    return {
      success: false,
      error: data.message || `登录失败 (status: ${status})`
    };
  }

  /**
   * 修改密码
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const { data } = await this.post(API_ENDPOINTS.CHANGE_PASSWORD, {
      oldPassword,
      newPassword
    });

    return {
      success: data.code === ERROR_CODES.SUCCESS,
      error: data.code !== ERROR_CODES.SUCCESS ? data.message : undefined
    };
  }

  /**
   * 获取个人信息
   */
  async getProfile(): Promise<{ success: boolean; data?: any }> {
    const { data } = await this.get(API_ENDPOINTS.PROFILE);
    return {
      success: data.code === ERROR_CODES.SUCCESS,
      data: data.data
    };
  }

  /**
   * 登出
   */
  async logout(): Promise<boolean> {
    const { data } = await this.post(API_ENDPOINTS.LOGOUT, {});
    this.clearToken();
    return data.code === ERROR_CODES.SUCCESS;
  }

  /**
   * 创建学生账号（管理员操作）
   */
  async createStudent(studentData: {
    student_no: string;
    name: string;
    grade: string;
    class_name: string;
    password?: string;
  }): Promise<{ success: boolean; id?: number; error?: string }> {
    const { data, status } = await this.post(API_ENDPOINTS.STUDENTS, {
      ...studentData,
      password: studentData.password || '123456'
    });

    if (data.code === ERROR_CODES.SUCCESS && data.data) {
      return { success: true, id: data.data.id };
    }

    return { success: false, error: data.message || `创建失败 (status: ${status})` };
  }

  /**
   * 创建教师账号（管理员操作）
   */
  async createTeacher(teacherData: {
    teacher_no: string;
    name: string;
    subjects?: string[];
    manage_classes?: string[];
    password?: string;
  }): Promise<{ success: boolean; id?: number; error?: string }> {
    const { data, status } = await this.post(API_ENDPOINTS.TEACHERS, {
      ...teacherData,
      password: teacherData.password || '123456'
    });

    if (data.code === ERROR_CODES.SUCCESS && data.data) {
      return { success: true, id: data.data.id };
    }

    return { success: false, error: data.message || `创建失败 (status: ${status})` };
  }

  /**
   * 删除学生账号
   */
  async deleteStudent(studentId: number): Promise<boolean> {
    const { data } = await this.delete(`${API_ENDPOINTS.STUDENTS}/${studentId}`);
    return data.code === ERROR_CODES.SUCCESS;
  }

  /**
   * 删除教师账号
   */
  async deleteTeacher(teacherId: number): Promise<boolean> {
    const { data } = await this.delete(`${API_ENDPOINTS.TEACHERS}/${teacherId}`);
    return data.code === ERROR_CODES.SUCCESS;
  }

  /**
   * 获取学生列表
   */
  async getStudents(): Promise<{ success: boolean; data?: any[] }> {
    const { data } = await this.get(API_ENDPOINTS.STUDENTS);
    return {
      success: data.code === ERROR_CODES.SUCCESS,
      data: data.data
    };
  }

  /**
   * 获取教师列表
   */
  async getTeachers(): Promise<{ success: boolean; data?: any[] }> {
    const { data } = await this.get(API_ENDPOINTS.TEACHERS);
    return {
      success: data.code === ERROR_CODES.SUCCESS,
      data: data.data
    };
  }

  /**
   * 获取管理员统计
   */
  async getAdminStats(): Promise<{ success: boolean; data?: any; status: number }> {
    const { data, status } = await this.get(API_ENDPOINTS.ADMIN_STATS);
    return {
      success: data.code === ERROR_CODES.SUCCESS,
      data: data.data,
      status
    };
  }

  /**
   * 获取考试列表
   */
  async getExams(): Promise<{ success: boolean; data?: any[] }> {
    const { data } = await this.get(API_ENDPOINTS.EXAM_TASKS);
    return {
      success: data.code === ERROR_CODES.SUCCESS,
      data: data.data
    };
  }

  /**
   * 创建测试用的伪造Token
   */
  static createFakeToken(): string {
    const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
    const payload = Buffer.from('{"id":999,"userType":"admin","iat":1234567890}').toString('base64url');
    const signature = Buffer.from('fakesignature').toString('base64url');
    return `${header}.${payload}.${signature}`;
  }

  /**
   * 创建篡改的Token（修改用户ID）
   */
  static createTamperedToken(originalToken: string, newUserId: number): string {
    const parts = originalToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      payload.id = newUserId;
      const newPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      return `${parts[0]}.${newPayload}.${parts[2]}`;
    } catch {
      throw new Error('Failed to decode token payload');
    }
  }
}
