// tests/security/config/constants.ts

/**
 * 安全测试常量配置
 */
export const BASE_URL = 'http://192.168.3.74:80';

/**
 * 默认密码配置
 */
export const PASSWORDS = {
  DEFAULT: '123456',           // 系统默认初始密码
  TEST_NEW: 'Test@123456',     // 测试用新密码
  ADMIN_DEFAULT: 'Admin@123456', // 管理员默认密码
  WEAK_PASSWORDS: [
    '123456',
    'password',
    '111111',
    'qwerty',
    'abc123',
    '000000',
    'admin',
    'root'
  ]
};

/**
 * UI选择器定义
 */
export const SELECTORS = {
  // 登录页面
  LOGIN: {
    accountInput: 'input[name="account"], input[placeholder*="学号"], input[placeholder*="工号"], input[placeholder*="用户名"]',
    passwordInput: 'input[name="password"], input[type="password"]',
    submitButton: 'button[type="submit"], button:has-text("登录")',
    rememberCheckbox: 'input[name="remember"], .van-checkbox'
  },

  // 修改密码弹窗
  CHANGE_PASSWORD: {
    popup: '.van-popup--bottom, .van-popup',
    oldPassword: 'input[name="oldPassword"], input[placeholder*="原密码"], input[placeholder*="旧密码"]',
    newPassword: 'input[name="newPassword"], input[placeholder*="新密码"]',
    confirmPassword: 'input[name="confirmPassword"], input[placeholder*="确认"]',
    submitButton: 'button:has-text("确认修改"), button:has-text("确认"), button:has-text("提交")',
    dialogConfirm: '.van-dialog button:has-text("去修改密码"), .van-dialog button:has-text("确定")'
  },

  // 通用元素
  COMMON: {
    toast: '.van-toast',
    toastSuccess: '.van-toast--success',
    toastFail: '.van-toast--fail',
    dialog: '.van-dialog',
    overlay: '.van-overlay',
    loading: '.van-loading'
  },

  // 页面路由
  ROUTES: {
    studentLogin: '/student/login',
    teacherLogin: '/teacher/login',
    adminLogin: '/admin/login',
    studentHome: '/student/home',
    teacherHome: '/teacher/home',
    adminHome: '/admin/home',
    studentProfile: '/student/profile',
    teacherProfile: '/teacher/profile',
    adminSettings: '/admin/settings'
  }
};

/**
 * 首次登录跳转路由
 */
export const FIRST_LOGIN_ROUTES = {
  student: '/student/profile?action=changePassword',
  teacher: '/teacher/profile?action=changePassword',
  admin: '/admin/settings?action=changePassword'
};

/**
 * API端点
 */
export const API_ENDPOINTS = {
  // 认证
  LOGIN: '/api/auth/login',
  CHANGE_PASSWORD: '/api/auth/change-password',
  PROFILE: '/api/auth/profile',
  LOGOUT: '/api/auth/logout',

  // 学生
  STUDENTS: '/api/students',
  STUDENT_EXAMS: '/api/student/exams',

  // 教师
  TEACHERS: '/api/teachers',
  TEACHER_EXAMS: '/api/teacher/exams',
  TEACHER_GRADING: '/api/teacher/grading',

  // 管理员
  ADMIN_STATS: '/api/admin/stats',
  ADMIN_TEACHERS: '/api/admin/teachers',
  ADMIN_STUDENTS: '/api/admin/students',
  ADMIN_CLASSES: '/api/admin/classes',
  ADMIN_LOGS: '/api/admin/logs',
  ADMIN_CONFIG: '/api/admin/config',

  // 题库
  QUESTIONS: '/api/questions',

  // 考试
  EXAM_TASKS: '/api/exam-tasks'
};

/**
 * 错误码定义
 */
export const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_CREDENTIALS: 1001,
  ACCOUNT_LOCKED: 1002,
  TOKEN_EXPIRED: 1003,
  TOKEN_INVALID: 1004,
  PASSWORD_ERROR: 1005,
  PERMISSION_DENIED: 9002
};

/**
 * HTTP状态码
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
};

/**
 * 用户类型
 */
export type UserType = 'student' | 'teacher' | 'admin';

/**
 * 测试账号接口
 */
export interface TestAccount {
  id?: number;
  account: string;
  password: string;
  newPassword?: string;
  userType: UserType;
  name?: string;
  token?: string;
  grade?: string;
  className?: string;
  subjects?: string[];
  manageClasses?: string[];
}

/**
 * API响应接口
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

/**
 * 登录响应数据
 */
export interface LoginResponseData {
  token: string;
  userInfo: {
    id: number;
    account: string;
    name: string;
    userType: UserType;
    firstLogin: boolean;
    grade?: string;
    className?: string;
    subjects?: string[];
    manageClasses?: string[];
  };
}

/**
 * 等待配置
 */
export const WAIT_CONFIG = {
  PAGE_LOAD_TIMEOUT: 15000,
  ELEMENT_TIMEOUT: 10000,
  STABILITY_DELAY: 300,
  NETWORK_IDLE_TIMEOUT: 5000,
  PASSWORD_CHANGE_TIMEOUT: 10000,
  LOGIN_REDIRECT_TIMEOUT: 10000
};
