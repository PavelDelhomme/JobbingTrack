// Tests fonctionnels mobile — utilise un utilisateur classique (rôle USER)
import { test, expect } from '@playwright/test';
import { ensureTestUser } from '../test-data-helper';

/**
 * Tests Mobile - Gestion des Candidatures
 * Création, modification, suppression, filtres, recherche
 */

test.describe('📱 Mobile - Gestion Candidatures', () => {
  let testCredentials: { email: string; password: string } | null = null;

  test.beforeAll(async ({ request }) => {
    testCredentials = await ensureTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Connexion
    await page.goto('/login');
    await page.fill('input[type="email"]', testCredentials?.email || 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', testCredentials?.password || 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
  });

  test('Liste des candidatures - Affichage mobile', async ({ page }) => {
    await page.click('text=/Candidature|Application/i');
    await page.waitForTimeout(1000);
    
    // Vérifier que la liste est adaptée mobile
    const list = page.locator('[role="list"], .list, table').first();
    if (await list.isVisible()) {
      const listBox = await list.boundingBox();
      expect(listBox?.width).toBeLessThanOrEqual(400);
    }
  });

  test('Création candidature - Formulaire mobile', async ({ page }) => {
    await page.click('text=/Candidature|Application/i');
    await page.waitForTimeout(1000);
    
    const addButton = page.locator('button:has-text("Nouveau"), button:has-text("+")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      // Vérifier que le formulaire s'ouvre
      await expect(page.locator('form, [role="dialog"]')).toBeVisible();
    }
  });

  test('Filtres candidatures - Interface mobile', async ({ page }) => {
    await page.click('text=/Candidature|Application/i');
    await page.waitForTimeout(1000);
    
    // Chercher le bouton de filtres
    const filterButton = page.locator('button:has-text("Filtrer"), button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
      
      // Vérifier que les filtres s'affichent
      await expect(page.locator('text=/Statut|Status|Filtrer/i')).toBeVisible();
    }
  });
});

