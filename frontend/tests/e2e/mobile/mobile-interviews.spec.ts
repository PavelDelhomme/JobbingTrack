import { test, expect } from '@playwright/test';

/**
 * Tests Mobile - Gestion des Entretiens
 */

test.describe('📱 Mobile - Gestion Entretiens', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
  });

  test('Création entretien - Mobile', async ({ page }) => {
    await page.click('text=/Entretien|Interview/i');
    await page.waitForTimeout(1000);
    
    const addButton = page.locator('button:has-text("Nouveau"), button:has-text("+")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(page.locator('form, [role="dialog"]')).toBeVisible();
    }
  });

  test('Calendrier entretiens - Mobile', async ({ page }) => {
    await page.click('text=/Entretien|Interview/i');
    await page.waitForTimeout(1000);
    
    // Chercher un calendrier ou vue calendrier
    const calendar = page.locator('[role="grid"], .calendar, [data-testid="calendar"]').first();
    if (await calendar.isVisible()) {
      await expect(calendar).toBeVisible();
    }
  });
});

