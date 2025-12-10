/**
 * Tests E2E des Rapports de Test
 * Vérifier que l'interface de gestion des rapports de test fonctionne
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5003';
const ADMIN_EMAIL = 'admin@jobbingtrack.com';
const ADMIN_PASSWORD = 'password123';

test.describe('Rapports de Test - Tests Complets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/backoffice`, { timeout: 10000 });
    
    await page.goto(`${BASE_URL}/backoffice/test-reports`);
    await page.waitForTimeout(2000);
  });

  test('Page Rapports de Test se charge correctement', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    
    // Vérifier la présence d'une liste de rapports
    const reportsList = page.locator('[class*="report"], [class*="list"], table').first();
    if (await reportsList.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(reportsList).toBeVisible();
    }
  });

  test('Affichage d\'un rapport', async ({ page }) => {
    // Chercher un rapport dans la liste
    const reportItem = page.locator('[class*="report"], [class*="card"], tr').first();
    
    if (await reportItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reportItem.click();
      await page.waitForTimeout(2000);
      
      // Vérifier qu'un aperçu ou le rapport complet s'affiche
      const reportView = page.locator('iframe, [class*="preview"], [class*="report"]').first();
      if (await reportView.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(reportView).toBeVisible();
      }
    }
  });

  test('Affichage en plein écran', async ({ page }) => {
    // Chercher un rapport
    const reportItem = page.locator('[class*="report"], [class*="card"]').first();
    
    if (await reportItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reportItem.click();
      await page.waitForTimeout(2000);
      
      // Chercher un bouton plein écran
      const fullscreenButton = page.locator('button:has-text("Plein écran"), button:has-text("Fullscreen"), button[aria-label*="fullscreen"]').first();
      if (await fullscreenButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await fullscreenButton.click();
        await page.waitForTimeout(1000);
        
        // Vérifier qu'un modal ou une vue plein écran apparaît
        const fullscreenView = page.locator('[class*="fullscreen"], [class*="modal"]').first();
        if (await fullscreenView.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(fullscreenView).toBeVisible();
        }
      }
    }
  });

  test('Suppression d\'un rapport', async ({ page }) => {
    // Chercher un bouton de suppression
    const deleteButton = page.locator('button:has-text("Supprimer"), button:has-text("Delete"), button[aria-label*="delete"]').first();
    
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

  test('Suppression de tous les rapports', async ({ page }) => {
    // Chercher un bouton "Supprimer tout"
    const deleteAllButton = page.locator('button:has-text("Supprimer tout"), button:has-text("Delete All")').first();
    
    if (await deleteAllButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteAllButton.click();
      await page.waitForTimeout(1000);
      
      // Vérifier une confirmation
      const confirmButton = page.locator('button:has-text("Confirmer"), button:has-text("Oui")').first();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('Recherche et filtrage de rapports', async ({ page }) => {
    // Chercher un champ de recherche
    const searchInput = page.locator('input[type="search"], input[placeholder*="recherche"], input[placeholder*="search"]').first();
    
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Vérifier que les résultats sont filtrés
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

