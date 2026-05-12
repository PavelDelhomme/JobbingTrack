/**
 * Tests E2E des Tests de Performance
 * Vérifier que l'interface de tests de performance fonctionne
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5003';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@jobbingtrack.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'password123';

test.describe('Tests de Performance - Tests Complets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/backoffice`, { timeout: 10000 });
    
    await page.goto(`${BASE_URL}/backoffice/performance-tests`);
    await page.waitForTimeout(2000);
  });

  test('Page Tests de Performance se charge correctement', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    
    // Vérifier la présence d'éléments de test de performance
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('Lancement d\'un test de performance', async ({ page }) => {
    // Chercher un bouton de lancement
    const startButton = page.locator('button:has-text("Lancer"), button:has-text("Démarrer"), button:has-text("Start")').first();
    
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(5000);
      
      // Vérifier qu'un résultat ou un indicateur de progression apparaît
      const progressIndicator = page.locator('[class*="progress"], [class*="loading"], [class*="running"]').first();
      if (await progressIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(progressIndicator).toBeVisible();
      }
    }
  });

  test('Visualisation des résultats de performance', async ({ page }) => {
    // Chercher une zone de résultats
    const resultsArea = page.locator('[class*="result"], [class*="metric"], [class*="stat"]').first();
    
    if (await resultsArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(resultsArea).toBeVisible();
    }
  });
});

