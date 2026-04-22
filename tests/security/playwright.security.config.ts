// tests/security/playwright.security.config.ts

import { defineConfig } from '@playwright/test';

const BASE_URL = 'http://192.168.3.74:80';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ['html', { outputFolder: '../reports/security/html' }],
    ['json', { outputFile: '../reports/security/results.json' }],
    ['list']
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'cross-permission',
      testMatch: /cross-permission\.spec\.ts/,
      timeout: 60000,
    },
    {
      name: 'auth-vulnerability',
      testMatch: /auth-vulnerability\.spec\.ts/,
      timeout: 60000,
    },
    {
      name: 'injection',
      testMatch: /injection\.spec\.ts/,
      timeout: 60000,
    },
    {
      name: 'business-logic',
      testMatch: /business-logic\.spec\.ts/,
      timeout: 60000,
    },
  ],

  outputDir: '../test-results/security',
});
