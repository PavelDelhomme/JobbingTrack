import { defineConfig, devices } from '@playwright/test';
import { findFreePort, killProcessOnPort } from './tests/utils/portUtils';
import path from 'path';

// En Docker (backoffice E2E), REPORT_DIR est exporté par generate-test-report.sh pour éviter EACCES sur /app
const reportDir = process.env.REPORT_DIR || '';
const inDocker = !!(reportDir || process.env.TESTS_RESULTS_DIR || process.env.DOCKER);
const outputDir = reportDir ? path.join(reportDir, 'test-results') : 'test-results';
const htmlReportDir = reportDir ? path.join(reportDir, 'playwright-report') : 'playwright-report';
const jsonReportPath = reportDir ? path.join(reportDir, 'test-results.json') : 'test-results.json';
const junitReportPath = reportDir ? path.join(reportDir, 'test-results.xml') : 'test-results.xml';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir,
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
    ['html', { outputFolder: htmlReportDir }],
    ['json', { outputFile: jsonReportPath }],
    ['junit', { outputFile: junitReportPath }],
    process.env.CI ? ['github'] : ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL: en Docker l'app tourne déjà sur 3000, sinon 3000 (Next.js dev par défaut). */
    baseURL: inDocker ? 'http://localhost:3000' : 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'no-auth',
      testMatch: [/login\.spec\.ts/, /accessibility\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'tests/e2e/.auth/admin.json'),
      },
      dependencies: ['setup'],
      testIgnore: [
        /auth\.setup\.ts/,
        /login\.spec\.ts/,
        /accessibility\.spec\.ts/,
        /complete-user-journey\.spec\.ts/,
        /mobile-app\.spec\.ts/,
        /user-experience\.spec\.ts/,
        /impersonation-tests\.spec\.ts/,
        /mobile\//,
        /api-only-tests\.spec\.ts/,
        /api-critiques\.spec\.ts/,
        /admin-features\.spec\.ts/,
        /application-workflow\.spec\.ts/,
        /advanced-security\.spec\.ts/,
        /security-tests\.spec\.ts/,
        /load-tests\.spec\.ts/,
        /data-management\.spec\.ts/,
        /export-import-advanced\.spec\.ts/,
        /integration-tests\.spec\.ts/,
        /performance-tests\.spec\.ts/,
      ],
    },
  ],

  /* Run your local dev server before starting the tests. En Docker, réutiliser le serveur déjà sur 3000 (évite EADDRINUSE). */
  webServer: inDocker
    ? [
        {
          command: 'echo',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 10_000,
        },
      ]
    : [
        {
          command: 'npm run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 120 * 1000,
          env: {
            WAF_ENABLED: 'false',
            RATE_LIMIT_ENABLED: 'false',
            NEXT_PUBLIC_API_URL: 'http://localhost:5002',
            NEXT_PUBLIC_AUTH_SERVICE_URL: 'http://localhost:5002',
          },
        },
        ...(process.env.CI ? [] : [
          {
            command: 'npm run dev:mobile',
            url: 'http://localhost:8090',
            reuseExistingServer: true,
            timeout: 120 * 1000,
          },
        ]),
      ],

  /* Global setup and teardown */
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
});
