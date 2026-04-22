import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,  // 禁用完全并行，确保 setup 先执行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 4,
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'http://192.168.3.74:80',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // 认证设置项目（必须先执行）
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // 学生端测试（依赖 setup）
    {
      name: 'student',
      testMatch: /specs\/student\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        storageState: '.auth/student.json',
      },
    },
    // 教师端测试（依赖 setup）
    {
      name: 'teacher',
      testMatch: /specs\/teacher\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        storageState: '.auth/teacher.json',
      },
    },
    // 管理员端测试（依赖 setup）
    {
      name: 'admin',
      testMatch: /specs\/admin\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        storageState: '.auth/admin.json',
      },
    },
    // API 测试（独立运行，不需要 setup）
    {
      name: 'api',
      testMatch: /specs\/api\.spec\.ts/,
    },
  ],
});
