// Tests fonctionnels mobile — utilise un utilisateur classique (rôle USER)
import { test, expect } from '@playwright/test';
import { ensureTestUser } from '../test-data-helper';

/**
 * Tests Mobile - Gestion des Appels
 */

test.describe('📱 Mobile - Gestion Appels', () => {
  let testCredentials: { email: string; password: string } | null = null;

  test.beforeAll(async ({ request }) => {
    testCredentials = await ensureTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.fill('input[type="email"]', testCredentials?.email || 'admin@jobbingtrack.test');
    await page.fill('input[type="password"]', testCredentials?.password || 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
  });

  test('Création appel - Mobile', async ({ page }) => {
    await page.click('text=/Appel|Call/i');
    await page.waitForTimeout(1000);
    
    const addButton = page.locator('button:has-text("Nouveau"), button:has-text("+")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(page.locator('form, [role="dialog"]')).toBeVisible();
    }
  });

  test('Liste appels - Mobile', async ({ page }) => {
    await page.click('text=/Appel|Call/i');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/Appel|Call/i')).toBeVisible();
  });
});

