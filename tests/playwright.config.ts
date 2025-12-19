import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour JobbingTrack
 * Tests E2E, API et interface backoffice
 */
export default defineConfig({
  // Configuration générale
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Timeout pour les tests longs
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  // Reporters
  reporter: [
    ['html', { outputFolder: 'reports/playwright-report' }],
    ['json', { outputFile: 'reports/playwright-results.json' }],
    ['junit', { outputFile: 'reports/junit-results.xml' }]
  ],

  // Configuration globale pour tous les tests
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },

  // Projets de test pour différents navigateurs et appareils
  projects: [
    // Desktop browsers
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

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Mobile landscape
    {
      name: 'Mobile Chrome Landscape',
      use: { ...devices['Pixel 5 landscape'] },
    },
    {
      name: 'Mobile Safari Landscape',
      use: { ...devices['iPhone 12 landscape'] },
    },

    // Tablet
    {
      name: 'Tablet Chrome',
      use: { ...devices['iPad Pro'] },
    },
    {
      name: 'Tablet Safari',
      use: { ...devices['iPad Pro landscape'] },
    },

    // API tests (sans navigateur)
    {
      name: 'API',
      testDir: './api',
      use: {
        baseURL: 'http://localhost:3000',
      },
      testMatch: '**/*.api.test.js',
    },

    // Backend tests
    {
      name: 'Backend',
      testDir: './backend',
      testMatch: '**/*.backend.test.js',
    }
  ],

  // Setup et teardown globaux
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts'

  // ⚠️ webServer désactivé - utilisez les services déjà démarrés avec make up-full
  // Pour éviter les conflits de réseau Docker, démarrez les services manuellement:
  // make up-full
  // Puis lancez les tests: npx playwright test
});
