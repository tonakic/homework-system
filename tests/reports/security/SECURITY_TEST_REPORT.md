# 安全测试报告

## 测试概要

**测试时间:** 2026-04-22
**测试目标:** http://192.168.3.74:80
**测试框架:** Playwright + TypeScript

## 测试结果

| 测试套件 | 通过 | 失败 | 跳过 |
|---------|------|------|------|
| 跨权限访问测试 | 11 | 0 | 0 |
| 认证漏洞测试 | 9 | 0 | 1 |
| 注入攻击测试 | 15 | 0 | 0 |
| 业务逻辑漏洞测试 | 16 | 0 | 0 |
| **总计** | **51** | **0** | **1** |

**通过率: 98.1%**

---

## 测试详情

### 1. 跨权限访问测试 (cross-permission.spec.ts)

| 测试ID | 测试名称 | 结果 |
|--------|----------|------|
| CP-001 | 学生访问教师API | ✅ PASS |
| CP-002 | 学生访问管理员页面 | ✅ PASS |
| CP-003 | 学生修改他人信息 | ✅ PASS |
| CP-004 | 教师访问管理员API | ✅ PASS |
| CP-005 | 教师操作非管理班级 | ✅ PASS |
| CP-007 | 无Token访问受保护页面 (3个子测试) | ✅ PASS |
| CP-010 | Token跨角色使用 (2个子测试) | ✅ PASS |

### 2. 认证漏洞测试 (auth-vulnerability.spec.ts)

| 测试ID | 测试名称 | 结果 |
|--------|----------|------|
| AV-001 | 弱密码检测 | ✅ PASS |
| AV-002 | 空密码登录 | ✅ PASS |
| AV-003 | Token过期后访问 | ✅ PASS |
| AV-004 | 无Token访问受保护API | ✅ PASS |
| AV-005 | 伪造Token访问 | ✅ PASS |
| AV-006 | 篡改Token payload | ✅ PASS |
| AV-007 | 会话固定攻击 | ✅ PASS |
| AV-008 | 登出后Token失效 | ⏭️ SKIP |
| AV-010 | 密码重置安全 | ✅ PASS |

### 3. 注入攻击测试 (injection.spec.ts)

| 测试ID | 测试名称 | 结果 |
|--------|----------|------|
| INJ-001 | 登录SQL注入 (8个payload) | ✅ PASS |
| INJ-002 | 登录SQL注入(Union) | ✅ PASS |
| INJ-003 | 搜索框XSS (4个payload) | ✅ PASS |
| INJ-004 | 用户名存储型XSS | ✅ PASS |
| INJ-005 | 文件上传路径遍历 | ✅ PASS |
| INJ-006 | API参数注入 | ✅ PASS |
| INJ-007 | JSON注入 | ✅ PASS |
| INJ-008 | 命令注入 | ✅ PASS |
| INJ-009 | LDAP注入 | ✅ PASS |
| INJ-010 | NoSQL注入 | ✅ PASS |

### 4. 业务逻辑漏洞测试 (business-logic.spec.ts)

| 测试ID | 测试名称 | 结果 |
|--------|----------|------|
| BL-001 | 越权查看试卷 | ✅ PASS |
| BL-002 | 重复提交考试 | ✅ PASS |
| BL-004 | 分数篡改 | ✅ PASS |
| BL-006 | 删除有依赖的数据 | ✅ PASS |
| BL-007 | 数据范围越界 (2个子测试) | ✅ PASS |
| BL-008 | 并发操作竞态 | ✅ PASS |
| BL-010 | 负数/溢出攻击 (4个子测试) | ✅ PASS |

---

## 发现的安全问题

### 🔴 高风险问题

1. **无效参数导致500错误**
   - 分页参数传入非数字值会导致服务器500错误
   - 建议：添加参数验证

2. **删除操作返回500**
   - 教师删除学生API返回500而非权限错误
   - 建议：改进错误处理

### 🟡 中风险问题

1. **账号锁定机制**
   - 连续登录失败会导致账号锁定15分钟
   - 建议：测试时使用专用测试账号

### 🟢 已验证的安全特性

1. ✅ 权限隔离正确：学生、教师、管理员角色隔离有效
2. ✅ Token验证：伪造、篡改、过期Token均被正确拒绝
3. ✅ SQL注入防护：所有注入payload被正确过滤
4. ✅ XSS防护：注入脚本被正确转义
5. ✅ 路径遍历防护：路径遍历攻击被阻止

---

## 首次登录修改密码处理

**解决方案已实现：**

`AuthHelper.loginAndHandleFirstLogin()` 方法自动处理：
1. 检测 `firstLogin` 标志
2. 自动填写修改密码表单
3. 使用固定测试密码 `Test@123456`
4. 保存认证状态供后续测试使用

---

## 运行测试

```bash
# 运行所有安全测试
cd tests
./security/run-tests.sh

# 运行特定测试套件
npx playwright test --config=security/playwright.security.config.ts --project=cross-permission
npx playwright test --config=security/playwright.security.config.ts --project=auth-vulnerability
npx playwright test --config=security/playwright.security.config.ts --project=injection
npx playwright test --config=security/playwright.security.config.ts --project=business-logic
```

---

## 文件结构

```
tests/security/
├── config/
│   ├── constants.ts          # 常量和选择器
│   └── test-accounts.ts      # 动态账号管理
├── helpers/
│   ├── api-client.ts         # API客户端
│   ├── auth-helper.ts        # 认证助手（含首次登录处理）
│   └── security-helper.ts    # 安全测试工具
├── fixtures/
│   └── auth.fixture.ts       # Playwright测试夹具
├── specs/
│   ├── cross-permission.spec.ts
│   ├── auth-vulnerability.spec.ts
│   ├── injection.spec.ts
│   └── business-logic.spec.ts
└── playwright.security.config.ts
```
