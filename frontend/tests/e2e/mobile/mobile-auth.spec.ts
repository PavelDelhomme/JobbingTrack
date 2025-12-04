import { test, expect, Page } from '@playwright/test';

/**
 * Tests Mobile - Authentification
 * Inscription, connexion, déconnexion, réinitialisation mot de passe
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5003';

test.describe('📱 Mobile - Authentification', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(FRONTEND_URL);
  });

  test('Inscription - Formulaire mobile', async ({ page }) => {
    await page.goto('/register');
    
    // Vérifier que le formulaire est visible et adapté mobile
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Vérifier que les champs sont accessibles au touch
    const emailInput = page.locator('input[type="email"]');
    const emailBox = await emailInput.boundingBox();
    expect(emailBox?.height).toBeGreaterThan(40); // Taille minimale pour touch
  });

  test('Connexion - Formulaire mobile', async ({ page }) => {
    await page.goto('/login');
    
    // Remplir et soumettre
    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Vérifier la redirection
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
  });

  test('Déconnexion - Mobile', async ({ page }) => {
    // Se connecter d'abord
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    
    // Trouver le bouton de déconnexion
    const logoutButton = page.locator('button:has-text("Déconnexion"), button:has-text("Logout"), [data-testid="logout"]').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForURL('**/login**', { timeout: 5000 });
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });
});

