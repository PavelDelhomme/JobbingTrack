import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Configuration Playwright sans démarrage de serveur (standalone).
 * À utiliser quand le frontend tourne déjà (ex. Docker sur 5003, make test-full).
 * Évite EACCES sur frontend/.next quand le dossier est créé par Docker en root.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5003';
const reportDir = process.env.REPORT_DIR || '';
const outputDir = reportDir ? path.join(reportDir, 'test-results') : 'test-results';
const htmlReportDir = reportDir ? path.join(reportDir, 'playwright-report') : 'playwright-report';
const jsonReportPath = reportDir ? path.join(reportDir, 'test-results.json') : 'test-results.json';
const junitReportPath = reportDir ? path.join(reportDir, 'test-results.xml') : 'test-results.xml';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: htmlReportDir }],
    ['json', { outputFile: jsonReportPath }],
    ['junit', { outputFile: junitReportPath }],
    process.env.CI ? ['github'] : ['list'],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
    {
      name: 'Flutter Mobile App',
      use: {
        ...devices['Pixel 5'],
        baseURL: 'http://localhost:8090',
        viewport: { width: 393, height: 851 },
      },
    },
  ],
  // Ne pas lancer npm run dev : réutiliser le serveur déjà up (ex. Docker 5003)
  webServer: {
    command: 'echo',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 15_000,
  },
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
});
