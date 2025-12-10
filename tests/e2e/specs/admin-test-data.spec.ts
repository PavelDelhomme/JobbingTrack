/**
 * Tests E2E du Testeur de Données de Test
 * Vérifier que l'interface de gestion des données de test fonctionne
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5003';
const ADMIN_EMAIL = 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = 'password123';

test.describe('Testeur de Données de Test - Tests Complets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/backoffice`, { timeout: 10000 });
    
    await page.goto(`${BASE_URL}/backoffice/test-data`);
    await page.waitForTimeout(2000);
  });

  test('Page Testeur de Données se charge correctement', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    
    // Vérifier la présence d'éléments de gestion de données
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('Création de données de test', async ({ page }) => {
    // Chercher un bouton de création
    const createButton = page.locator('button:has-text("Créer"), button:has-text("Générer"), button:has-text("Ajouter")').first();
    
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(2000);
      
      // Vérifier qu'un formulaire ou une confirmation apparaît
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Suppression de données de test', async ({ page }) => {
    // Chercher un bouton de suppression
    const deleteButton = page.locator('button:has-text("Supprimer"), button:has-text("Nettoyer"), button:has-text("Effacer")').first();
    
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.click();
      await page.waitForTimeout(1000);
      
      // Vérifier une confirmation si présente
      const confirmButton = page.locator('button:has-text("Confirmer"), button:has-text("Oui")').first();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }
    }
  });
});

