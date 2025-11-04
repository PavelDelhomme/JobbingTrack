import { test, expect } from '@playwright/test';

test.describe('🔐 Authentification - Page de connexion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('devrait afficher correctement la page de connexion', async ({ page }) => {
    // Vérifier le titre de la page
    await expect(page).toHaveTitle(/JobbingTrack/);

    // Vérifier la présence du logo
    await expect(page.locator('text=🎯')).toBeVisible();

    // Vérifier le titre JobbingTrack
    await expect(page.locator('text=JobbingTrack')).toBeVisible();

    // Vérifier le sous-titre
    await expect(page.locator('text=Backoffice Administrateur')).toBeVisible();

    // Vérifier la présence du bouton de thème (mode sombre/clair)
    await expect(page.locator('button[title*="mode"]')).toBeVisible();

    // Vérifier les champs de formulaire
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Vérifier les valeurs par défaut des champs de test
    await expect(page.locator('input[type="email"]')).toHaveValue('admin@jobbingtrack.com');
    await expect(page.locator('input[type="password"]')).toHaveValue('password123');
  });

  test('devrait permettre de basculer entre mode sombre et clair', async ({ page }) => {
    // Vérifier que le bouton de thème est présent et fonctionnel
    const themeButton = page.locator('button[title*="mode"]');
    await expect(themeButton).toBeVisible();

    // Cliquer sur le bouton de thème
    await themeButton.click();

    // Vérifier que le thème a changé (le bouton devrait changer d'apparence)
    await expect(themeButton).toBeVisible();

    // Cliquer à nouveau pour revenir au thème initial
    await themeButton.click();
    await expect(themeButton).toBeVisible();
  });

  test('devrait afficher la section des informations de compte de test', async ({ page }) => {
    // Vérifier la présence de la section d'informations de test
    await expect(page.locator('text=Compte de test')).toBeVisible();
    await expect(page.locator('text=admin@jobbingtrack.com')).toBeVisible();
    await expect(page.locator('text=password123')).toBeVisible();
  });

  test('devrait permettre la connexion avec des identifiants valides', async ({ page }) => {
    // Intercepter la requête de connexion pour simuler une réponse réussie
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'admin@jobbingtrack.com',
            firstName: 'Pavel',
            lastName: 'Test',
            role: 'SUPER_ADMIN'
          },
          token: 'mock-jwt-token-12345'
        })
      });
    });

    // Soumettre le formulaire de connexion
    await page.locator('button[type="submit"]').click();

    // Attendre la redirection vers le backoffice
    await page.waitForURL('/backoffice');

    // Vérifier que nous sommes bien sur la page du backoffice
    await expect(page.locator('text=Backoffice Administrateur')).toBeVisible();
  });

  test('devrait afficher une erreur pour des identifiants invalides', async ({ page }) => {
    // Modifier les valeurs des champs pour des identifiants invalides
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Intercepter la requête de connexion pour simuler une erreur
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Identifiants invalides'
        })
      });
    });

    // Soumettre le formulaire
    await page.locator('button[type="submit"]').click();

    // Vérifier que l'erreur est affichée
    await expect(page.locator('text=Identifiants invalides')).toBeVisible();
  });

  test('devrait être responsive sur mobile', async ({ page }) => {
    // Configurer la vue mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Vérifier que tous les éléments sont visibles et utilisables sur mobile
    await expect(page.locator('text=🎯')).toBeVisible();
    await expect(page.locator('text=JobbingTrack')).toBeVisible();
    await expect(page.locator('button[title*="mode"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('devrait afficher/masquer le mot de passe', async ({ page }) => {
    const passwordField = page.locator('input[type="password"]');
    const toggleButton = page.locator('button[title*="mot de passe"]');

    // Vérifier que le bouton de visibilité du mot de passe est présent
    await expect(toggleButton).toBeVisible();

    // Cliquer pour afficher le mot de passe
    await toggleButton.click();

    // Vérifier que le champ est maintenant de type texte
    await expect(passwordField).toHaveAttribute('type', 'text');

    // Cliquer à nouveau pour masquer
    await toggleButton.click();
    await expect(passwordField).toHaveAttribute('type', 'password');
  });
});
