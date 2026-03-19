import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'password123';

export const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

test('authenticate as admin', async ({ page }) => {
  test.setTimeout(90_000);

  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');

  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await Promise.all([
    // Ne pas attendre l'événement `load` (Next + compilation peut dépasser 30s)
    page.waitForURL(/\/backoffice(?:\/|$)/, { timeout: 90_000, waitUntil: 'domcontentloaded' }),
    page.locator('button[type="submit"]').click(),
  ]);

  // Attente sur un élément stable du layout AdminLayout.
  // `nav` peut être masquée selon le viewport/état sidebar ; `main` est toujours rendu.
  await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
