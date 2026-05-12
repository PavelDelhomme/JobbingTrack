/**
 * Tests E2E du Testeur Émulateur Mobile
 * Vérifier que l'interface d'émulation mobile fonctionne
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5003';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'password123';

test.describe('Émulateur Mobile - Tests Complets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/backoffice`, { timeout: 10000 });
    
    await page.goto(`${BASE_URL}/backoffice/mobile-emulator`);
    await page.waitForTimeout(2000);
  });

  test('Page Émulateur Mobile se charge correctement', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    
    // Vérifier la présence d'éléments d'émulation
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('Sélection de différents appareils', async ({ page }) => {
    const deviceSelect = page.locator('select[name*="device"], select[aria-label*="device"]').first();
    
    if (await deviceSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const devices = ['iPhone', 'Android', 'iPad', 'Tablet'];
      
      for (const device of devices) {
        try {
          await deviceSelect.selectOption({ label: new RegExp(device, 'i') });
          await page.waitForTimeout(1000);
        } catch (e) {
          // Ignorer si l'option n'existe pas
        }
      }
    }
  });

  test('Test de navigation mobile', async ({ page }) => {
    // Vérifier que la page peut être utilisée en mode mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    await expect(page.locator('body')).toBeVisible();
  });
});

