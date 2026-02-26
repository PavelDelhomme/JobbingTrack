import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'password123';

export const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

setup('authenticate as admin', async ({ page }) => {
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL('**/backoffice**', { timeout: 30000 });
  await expect(page.locator('body')).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
