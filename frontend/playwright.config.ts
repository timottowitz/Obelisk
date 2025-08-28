import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e/tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'e2e/test-results/html' }],
    ['json', { outputFile: 'e2e/test-results/results.json' }],
    ['junit', { outputFile: 'e2e/test-results/junit.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Global timeout for each action */
    actionTimeout: 15000,
    
    /* Global timeout for each navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  /* Test timeout */
  timeout: 60000,
  
  /* Global setup and teardown */
  globalSetup: './e2e/config/global-setup.ts',
  globalTeardown: './e2e/config/global-teardown.ts',
  
  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'e2e/test-results/artifacts',
  
  /* Folder for test snapshots */
  snapshotDir: 'e2e/snapshots',
  
  /* Maximum number of test files running in parallel */
  maxFailures: process.env.CI ? 10 : undefined,
  
  /* Expect assertions configuration */
  expect: {
    /* Maximum time expect() should wait for the condition to be met */
    timeout: 10000,
    
    /* Threshold for image comparisons */
    threshold: 0.2,
    
    /* Screenshot comparison mode */
    mode: 'default',
  },
});