---
name: Playwright Security Testing Design
description: 作业系统Playwright自动化安全测试设计方案，解决首次登录修改密码阻拦问题，全面测试跨权限访问、认证漏洞、注入攻击和业务逻辑漏洞
type: project
---

# 作业系统安全测试设计方案

## 1. 概述

### 1.1 目标
为创新小学作业管理系统设计全面的自动化安全测试框架，解决首次登录修改密码阻拦问题，测试跨权限访问、认证漏洞、注入攻击和业务逻辑漏洞。

### 1.2 范围
- **跨权限访问测试**：验证角色隔离，学生不能访问教师/管理员资源
- **认证漏洞测试**：检测弱密码、Token安全问题、会话管理漏洞
- **注入攻击测试**：SQL注入、XSS、路径遍历等输入验证漏洞
- **业务逻辑漏洞测试**：越权操作、数据篡改、竞态条件

### 1.3 目标系统
- **Web界面**: http://192.168.3.74:80
- **技术栈**: Vue 3 + Node.js + Express + SQLite
- **用户角色**: 学生、教师、管理员

---

## 2. 架构设计

### 2.1 目录结构

```
tests/
├── playwright.config.ts              # 主配置文件
├── security/                          # 安全测试模块
│   ├── config/
│   │   ├── test-accounts.ts          # 动态账号管理器
│   │   └── constants.ts              # 常量定义
│   ├── helpers/
│   │   ├── auth-helper.ts            # 认证助手(含首次登录处理)
│   │   ├── api-helper.ts             # API请求助手
│   │   ├── security-helper.ts        # 安全测试工具函数
│   │   └── page-helper.ts            # 页面操作助手
│   ├── fixtures/
│   │   └── auth.fixture.ts           # Playwright fixtures
│   ├── specs/
│   │   ├── cross-permission.spec.ts  # 跨权限访问测试
│   │   ├── auth-vulnerability.spec.ts # 认证漏洞测试
│   │   ├── injection.spec.ts         # 注入攻击测试
│   │   └── business-logic.spec.ts    # 业务逻辑漏洞测试
│   └── reports/                       # 测试报告目录
└── utils/
    └── api-client.ts                 # 统一API客户端
```

### 2.2 模块职责

| 模块 | 职责 |
|------|------|
| `test-accounts.ts` | 动态创建、管理、清理测试账号 |
| `auth-helper.ts` | 处理登录、首次登录修改密码、认证状态保存 |
| `api-helper.ts` | 封装API请求，支持带/不带Token |
| `security-helper.ts` | 安全测试断言、漏洞验证工具 |
| `auth.fixture.ts` | Playwright测试夹具，提供预认证的页面/API客户端 |

---

## 3. 首次登录修改密码解决方案

### 3.1 问题分析

**现有流程：**
1. 用户登录成功后，后端返回 `firstLogin: true`
2. 前端路由守卫检测到首次登录，强制跳转到修改密码页面
3. 弹出底部弹窗，要求修改密码
4. 用户无法跳过，必须完成修改才能进入系统

**阻拦原因：**
现有测试脚本直接保存登录状态，未处理首次登录修改密码流程，导致后续测试无法正常进行。

### 3.2 解决方案

**自动处理策略：**
- 在登录后检测 `firstLogin` 标志
- 若为首次登录，自动执行修改密码操作
- 使用固定测试密码 `Test@123456`
- 保存认证状态供后续测试使用

### 3.3 实现流程

```
┌─────────────────────────────────────────────────────────────┐
│                    loginAndHandleFirstLogin()               │
├─────────────────────────────────────────────────────────────┤
│  1. 访问登录页面                                             │
│  2. 填写账号密码并提交                                       │
│  3. 检测是否跳转到修改密码页面/弹窗                          │
│     ├── 是首次登录:                                         │
│     │   ├── 等待修改密码弹窗出现                             │
│     │   ├── 填写原密码、新密码、确认密码                     │
│     │   ├── 提交修改                                        │
│     │   └── 验证修改成功                                    │
│     └── 非首次登录:                                         │
│         └── 继续正常流程                                    │
│  4. 保存认证状态到 storageState                             │
│  5. 返回认证信息                                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 选择器定义

```typescript
// 修改密码弹窗选择器
const SELECTORS = {
  // 弹窗
  passwordPopup: '.van-popup--bottom',
  
  // 输入框
  oldPassword: 'input[name="oldPassword"]',
  newPassword: 'input[name="newPassword"]',
  confirmPassword: 'input[name="confirmPassword"]',
  
  // 按钮
  submitButton: 'button:has-text("确认")',
  
  // 角色特定路由
  firstLoginRoutes: {
    student: '/student/profile?action=changePassword',
    teacher: '/teacher/profile?action=changePassword',
    admin: '/admin/settings?action=changePassword'
  }
};
```

---

## 4. 动态账号管理

### 4.1 设计原则

- **隔离性**：每个测试套件使用独立账号，互不干扰
- **可重复性**：测试账号动态创建和销毁，保证测试环境一致
- **安全性**：测试结束后清理所有临时账号数据

### 4.2 账号管理器接口

```typescript
interface TestAccount {
  id: number;
  account: string;      // 学号/工号/用户名
  password: string;     // 初始密码 123456
  testPassword: string; // 测试密码 Test@123456
  userType: 'student' | 'teacher' | 'admin';
  token?: string;
}

interface TestAccountManager {
  // 创建测试账号
  createStudent(options?: Partial<StudentOptions>): Promise<TestAccount>;
  createTeacher(options?: Partial<TeacherOptions>): Promise<TestAccount>;
  createAdmin(options?: Partial<AdminOptions>): Promise<TestAccount>;
  
  // 获取管理员Token（用于创建账号）
  getAdminToken(): Promise<string>;
  
  // 清理测试账号
  cleanup(account: TestAccount): Promise<void>;
  cleanupAll(): Promise<void>;
}
```

### 4.3 实现策略

**创建账号流程：**
1. 使用管理员账号登录获取Token
2. 调用管理API创建测试账号
3. 返回账号信息供测试使用

**清理账号流程：**
1. 使用管理员Token
2. 调用删除API移除测试账号
3. 清理相关测试数据

---

## 5. 测试用例设计

### 5.1 跨权限访问测试 (cross-permission.spec.ts)

| 用例ID | 用例名称 | 测试步骤 | 预期结果 |
|--------|----------|----------|----------|
| CP-001 | 学生访问教师API | 学生Token请求 GET /api/teachers | 403权限不足 |
| CP-002 | 学生访问管理员页面 | 学生登录后访问 /admin/home | 重定向到登录页或403 |
| CP-003 | 学生修改他人信息 | 学生Token请求 PUT /api/students/{其他学生ID} | 403权限不足 |
| CP-004 | 教师访问管理员API | 教师Token请求 GET /api/admin/stats | 403权限不足 |
| CP-005 | 教师操作非管理班级 | 教师请求操作非管理班级学生 | 403权限不足 |
| CP-006 | 管理员越权操作 | 管理员尝试删除系统关键数据 | 应被阻止 |
| CP-007 | 直接访问需要认证的页面 | 无Token访问 /student/home | 重定向到登录页 |
| CP-008 | 横向越权访问 | 学生A尝试查看学生B的试卷详情 | 403或无数据返回 |
| CP-009 | 教师批改非自己班级 | 教师尝试批改非管理班级学生试卷 | 403权限不足 |
| CP-010 | Token跨角色使用 | 学生Token访问教师端接口 | 403权限不足 |

### 5.2 认证漏洞测试 (auth-vulnerability.spec.ts)

| 用例ID | 用例名称 | 测试步骤 | 预期结果 |
|--------|----------|----------|----------|
| AV-001 | 弱密码检测 | 尝试使用123456、password等弱密码登录 | 应拒绝或提示修改 |
| AV-002 | 空密码登录 | 使用空密码尝试登录 | 拒绝登录 |
| AV-003 | Token过期后访问 | 使用过期Token访问API | 401 Token失效 |
| AV-004 | 无Token访问受保护API | 不携带Token访问需认证API | 401未授权 |
| AV-005 | 伪造Token访问 | 使用伪造的JWT Token访问 | 401 Token无效 |
| AV-006 | 篡改Token payload | 修改Token中的用户ID后访问 | 401 Token无效 |
| AV-007 | 会话固定攻击 | 登录前后Token是否变化 | 应生成新Token |
| AV-008 | 登出后Token失效 | 登出后使用原Token访问 | 401 Token失效 |
| AV-009 | 并发登录控制 | 同一账号多处登录 | 按系统策略验证 |
| AV-010 | 密码重置安全 | 验证密码重置流程安全性 | 需验证原密码 |

### 5.3 注入攻击测试 (injection.spec.ts)

| 用例ID | 用例名称 | 测试步骤 | 预期结果 |
|--------|----------|----------|----------|
| INJ-001 | 登录SQL注入 | 输入 `' OR '1'='1` 尝试登录 | 登录失败，无异常 |
| INJ-002 | 登录SQL注入(Union) | 输入 `' UNION SELECT` 尝试 | 登录失败，无异常 |
| INJ-003 | 搜索框XSS | 搜索框输入 `<script>alert(1)</script>` | 输入被转义 |
| INJ-004 | 用户名存储型XSS | 修改用户名为XSS payload | 输入被转义 |
| INJ-005 | 文件上传路径遍历 | 上传文件名包含 `../../../` | 拒绝或重命名 |
| INJ-006 | API参数注入 | API参数包含恶意字符 | 参数被过滤 |
| INJ-007 | JSON注入 | 发送格式错误的JSON | 错误处理，无异常 |
| INJ-008 | 命令注入 | 输入 `; rm -rf /` | 输入被过滤 |
| INJ-009 | LDAP注入(如有) | 输入LDAP注入字符 | 输入被过滤 |
| INJ-010 | NoSQL注入(如有) | 输入MongoDB操作符 | 输入被过滤 |

### 5.4 业务逻辑漏洞测试 (business-logic.spec.ts)

| 用例ID | 用例名称 | 测试步骤 | 预期结果 |
|--------|----------|----------|----------|
| BL-001 | 越权查看试卷 | 学生A尝试获取学生B的试卷 | 403或无数据 |
| BL-002 | 重复提交考试 | 已提交的考试再次提交 | 拒绝重复提交 |
| BL-003 | 考试时间绕过 | 过期考试尝试提交 | 拒绝提交 |
| BL-004 | 分数篡改 | 尝试修改自己的考试分数 | 应被阻止 |
| BL-005 | 批改他人试卷 | 教师批改非管理班级试卷 | 403权限不足 |
| BL-006 | 删除有依赖的数据 | 删除有考试记录的学生 | 应阻止或级联处理 |
| BL-007 | 数据范围越界 | 分页查询时修改page参数 | 参数验证 |
| BL-008 | 并发操作竞态 | 同时提交同一份试卷 | 只有一个成功 |
| BL-009 | 批量操作越权 | 批量删除包含无权限数据 | 应拒绝整体操作 |
| BL-010 | 负数/溢出攻击 | 输入负数ID或极大数值 | 参数验证 |

---

## 6. 测试框架配置

### 6.1 Playwright配置

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './security/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ['html', { outputFolder: 'security/reports/html' }],
    ['json', { outputFile: 'security/reports/results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'http://192.168.3.74:80',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'cross-permission',
      testMatch: /cross-permission\.spec\.ts/,
    },
    {
      name: 'auth-vulnerability',
      testMatch: /auth-vulnerability\.spec\.ts/,
    },
    {
      name: 'injection',
      testMatch: /injection\.spec\.ts/,
    },
    {
      name: 'business-logic',
      testMatch: /business-logic\.spec\.ts/,
    },
  ],
});
```

### 6.2 测试夹具设计

```typescript
// fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

export const test = base.extend<{
  studentPage: Page;
  teacherPage: Page;
  adminPage: Page;
  studentApi: ApiClient;
  teacherApi: ApiClient;
  adminApi: ApiClient;
  accountManager: TestAccountManager;
}>({
  studentPage: async ({ browser }, use) => {
    // 自动登录学生并处理首次登录
  },
  teacherPage: async ({ browser }, use) => {
    // 自动登录教师并处理首次登录
  },
  // ...
});
```

---

## 7. 并行执行策略

### 7.1 多子智能体分工

由于测试范围广泛，使用多个子智能体并行开发：

| 智能体 | 任务 | 产出文件 |
|--------|------|----------|
| Agent-1 | 核心基础设施 | auth-helper.ts, api-client.ts, constants.ts |
| Agent-2 | 动态账号管理 | test-accounts.ts, auth.fixture.ts |
| Agent-3 | 跨权限测试 | cross-permission.spec.ts |
| Agent-4 | 认证漏洞测试 | auth-vulnerability.spec.ts |
| Agent-5 | 注入攻击测试 | injection.spec.ts |
| Agent-6 | 业务逻辑测试 | business-logic.spec.ts |

### 7.2 依赖关系

```
Agent-1 (核心基础设施)
    ↓
Agent-2 (动态账号管理) ← 依赖 Agent-1
    ↓
Agent-3, 4, 5, 6 (测试套件) ← 依赖 Agent-1, 2
```

---

## 8. 验收标准

### 8.1 功能验收

- [ ] 所有测试脚本能正确处理首次登录修改密码
- [ ] 动态账号创建和清理正常工作
- [ ] 四类安全测试全部可执行
- [ ] 测试报告正确生成

### 8.2 质量验收

- [ ] 代码通过TypeScript类型检查
- [ ] 测试选择器稳定可靠
- [ ] 测试用例可重复执行
- [ ] 失败时提供清晰的错误信息

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 测试账号冲突 | 测试失败 | 动态账号+随机后缀 |
| 首次登录弹窗变化 | 脚本失效 | 多重选择器策略 |
| 网络不稳定 | 测试失败 | 添加重试机制 |
| 数据库状态不一致 | 测试不可重复 | 测试前清理+事务回滚 |

---

## 10. 后续优化

1. **CI/CD集成**: 将测试集成到持续集成流水线
2. **定时扫描**: 设置定时任务执行安全测试
3. **报告通知**: 测试失败时发送通知
4. **覆盖率提升**: 持续增加测试用例
5. **性能测试**: 添加API性能和安全测试
