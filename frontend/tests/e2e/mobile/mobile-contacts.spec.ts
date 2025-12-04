import { test, expect } from '@playwright/test';

/**
 * Tests Mobile - Gestion des Contacts
 */

test.describe('📱 Mobile - Gestion Contacts', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
  });

  test('Liste contacts - Mobile', async ({ page }) => {
    await page.click('text=/Contact/i');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/Contact/i')).toBeVisible();
  });

  test('Création contact - Mobile', async ({ page }) => {
    await page.click('text=/Contact/i');
    await page.waitForTimeout(1000);
    
    const addButton = page.locator('button:has-text("Nouveau"), button:has-text("+")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(page.locator('form, [role="dialog"]')).toBeVisible();
    }
  });
});

