/**
 * Config Playwright pour les tests Emails + MailHog.
 * Pas de webServer : on utilise le frontend déjà démarré (Docker sur 5003 ou dev sur 3000).
 * Évite l'erreur "Cannot find module next/dist/bin/next" quand frontend/node_modules est incomplet.
 */
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:5003';

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Pas de webServer : frontend déjà up (make up-full → port 5003) ou à lancer à la main
});
