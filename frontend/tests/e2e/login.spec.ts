import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'password123';

test.describe('🔐 Authentification - Page de connexion', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('body').first().waitFor({ state: 'visible', timeout: 30_000 });
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
    await expect(page.getByText('admin@jobbingtrack.test')).toBeVisible();
    await expect(page.getByText('password123')).toBeVisible();
  });

  test('devrait permettre la connexion avec des identifiants valides', async ({ page }) => {
    test.setTimeout(90_000);
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect.poll(
      async () => {
        const token = await page.evaluate(() => localStorage.getItem('token') || sessionStorage.getItem('token'));
        const url = page.url();
        return token || (url.includes('/backoffice') ? 'url-backoffice' : null);
      },
      { timeout: 90_000, intervals: [500, 1000, 2000] }
    ).not.toBeNull();

    // Vérification fonctionnelle : accès backoffice sans retour sur /login.
    await page.goto('/backoffice', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('devrait afficher une erreur pour des identifiants invalides', async ({ page }) => {
    await page.locator('input[type="email"]').fill('redacted@example.invalid');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    // Selon les variantes UI: message texte explicite OU état d'erreur visuel.
    const errorText = page.getByText(/identifiants|invalid|incorrect|erreur|failed|échec/i).first();
    const errorVisual = page.locator('.animate-shake, [class*="bg-red"], [role="alert"]').first();
    const hasError = await Promise.race([
      errorText.isVisible({ timeout: 15000 }).catch(() => false),
      errorVisual.isVisible({ timeout: 15000 }).catch(() => false),
    ]);
    expect(hasError).toBe(true);
  });

  test('devrait être responsive sur mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('h2', { hasText: 'JobbingTrack' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('devrait afficher/masquer le mot de passe', async ({ page }) => {
    const pwdInput = page.locator('input[type="password"]').first();
    await pwdInput.fill('test123');

    const toggleButton = page.locator('button').filter({ has: page.locator('text=/👁️|🙈/') });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();
    await expect(pwdInput).toHaveAttribute('type', 'text');

    await toggleButton.click();
    await expect(pwdInput).toHaveAttribute('type', 'password');
  });
});
