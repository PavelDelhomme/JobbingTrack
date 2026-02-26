import { test, expect } from '@playwright/test';

test.describe('🔐 Authentification - Page de connexion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
  });

  test('devrait afficher correctement la page de connexion', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'JobbingTrack' })).toBeVisible();
    await expect(page.getByText('Backoffice Administrateur')).toBeVisible();

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('devrait permettre de basculer entre mode sombre et clair', async ({ page }) => {
    const themeButton = page.locator('button').filter({ has: page.locator('text=/☀️|🌙/') });
    await expect(themeButton).toBeVisible();

    await themeButton.click();
    await expect(themeButton).toBeVisible();

    await themeButton.click();
    await expect(themeButton).toBeVisible();
  });

  test('devrait afficher la section des informations de compte de test', async ({ page }) => {
    await expect(page.getByText('Compte de test')).toBeVisible();
    await expect(page.getByText('admin@jobbingtrack.com')).toBeVisible();
    await expect(page.getByText('password123')).toBeVisible();
  });

  test('devrait permettre la connexion avec des identifiants valides', async ({ page }) => {
    await page.locator('input[type="email"]').fill('admin@jobbingtrack.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/backoffice**', { timeout: 30000 });
    await expect(page).toHaveURL(/backoffice/);
  });

  test('devrait afficher une erreur pour des identifiants invalides', async ({ page }) => {
    await page.locator('input[type="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.animate-shake, [class*="bg-red"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('devrait être responsive sur mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('h2', { hasText: 'JobbingTrack' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('devrait afficher/masquer le mot de passe', async ({ page }) => {
    await page.locator('input[type="password"]').fill('test123');

    const toggleButton = page.locator('button').filter({ has: page.locator('text=/👁️|🙈/') });
    await expect(toggleButton).toBeVisible();

    await toggleButton.click();
    await expect(page.locator('input[type="text"][value="test123"]')).toBeVisible();

    await toggleButton.click();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
