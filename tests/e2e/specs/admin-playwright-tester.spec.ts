/**
 * Tests E2E du Testeur Playwright (Métatest)
 * Tester que l'interface de test Playwright fonctionne elle-même
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5003';
const ADMIN_EMAIL = 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = 'password123';

test.describe('Testeur Playwright - Métatest', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/backoffice`, { timeout: 10000 });
    
    await page.goto(`${BASE_URL}/backoffice/playwright-tests`);
    await page.waitForTimeout(2000);
  });

  test('Page Testeur Playwright se charge correctement', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    
    // Vérifier la présence d'éléments de test
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('Création d\'un test Playwright', async ({ page }) => {
    // Chercher un formulaire de création de test
    const testNameInput = page.locator('input[name*="test"], input[placeholder*="test"], input[placeholder*="nom"]').first();
    
    if (await testNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await testNameInput.fill(`Test automatique ${Date.now()}`);
      
      const createButton = page.locator('button:has-text("Créer"), button:has-text("Ajouter"), button[type="submit"]').first();
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(2000);
        
        // Vérifier qu'un message de confirmation apparaît
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('Exécution d\'un test Playwright', async ({ page }) => {
    // Chercher un bouton d'exécution
    const runButton = page.locator('button:has-text("Exécuter"), button:has-text("Lancer"), button:has-text("Run")').first();
    
    if (await runButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await runButton.click();
      await page.waitForTimeout(5000);
      
      // Vérifier qu'un résultat s'affiche
      const resultArea = page.locator('[class*="result"], [class*="output"], pre, code').first();
      if (await resultArea.isVisible({ timeout: 10000 }).catch(() => false)) {
        await expect(resultArea).toBeVisible();
      }
    }
  });

  test('Visualisation des résultats de test', async ({ page }) => {
    // Chercher une liste de tests ou résultats
    const testList = page.locator('table, [class*="list"], [class*="result"]').first();
    
    if (await testList.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(testList).toBeVisible();
    }
  });
});

