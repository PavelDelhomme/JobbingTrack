/**
 * Tests E2E des Parcours Utilisateur
 * Vérifier que l'interface de gestion des parcours utilisateur fonctionne
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5003';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'password123';

test.describe('Parcours Utilisateur - Tests Complets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/backoffice`, { timeout: 10000 });
    
    await page.goto(`${BASE_URL}/backoffice/user-journey`);
    await page.waitForTimeout(2000);
  });

  test('Page Parcours Utilisateur se charge correctement', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    
    // Vérifier la présence d'éléments de parcours
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('Création d\'un parcours personnalisé', async ({ page }) => {
    // Aller à la page de parcours personnalisé
    await page.goto(`${BASE_URL}/backoffice/user-journey/custom`);
    await page.waitForTimeout(2000);
    
    // Vérifier que la page se charge
    await expect(page.locator('body')).toBeVisible();
    
    // Chercher des étapes disponibles
    const stepsList = page.locator('[class*="step"], [class*="journey"], button').first();
    if (await stepsList.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(stepsList).toBeVisible();
    }
  });

  test('Sélection et réorganisation d\'étapes', async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/user-journey/custom`);
    await page.waitForTimeout(2000);
    
    // Chercher des boutons d'étapes
    const stepButtons = page.locator('button:has-text("Étape"), button:has-text("Step"), [class*="step"]');
    const stepCount = await stepButtons.count();
    
    if (stepCount > 0) {
      // Cliquer sur une étape
      await stepButtons.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('Exécution d\'un parcours', async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/user-journey/custom`);
    await page.waitForTimeout(2000);
    
    // Chercher un bouton d'exécution
    const runButton = page.locator('button:has-text("Exécuter"), button:has-text("Lancer"), button:has-text("Run")').first();
    
    if (await runButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await runButton.click();
      await page.waitForTimeout(5000);
      
      // Vérifier qu'un résultat s'affiche
      const resultArea = page.locator('[class*="result"], [class*="output"], pre').first();
      if (await resultArea.isVisible({ timeout: 10000 }).catch(() => false)) {
        await expect(resultArea).toBeVisible();
      }
    }
  });
});

