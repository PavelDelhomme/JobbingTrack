import { test, expect } from '@playwright/test';

test.describe('🏢 Backoffice Administrateur - Fonctionnalités critiques', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await page.goto('/login');

    // Intercepter la requête de connexion
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'admin@jobbingtrack.com',
            firstName: 'Admin',
            lastName: 'JobbingTrack',
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
  });

  test('devrait afficher correctement la page du backoffice', async ({ page }) => {
    // Vérifier le titre de la page
    await expect(page).toHaveTitle(/JobbingTrack/);

    // Vérifier la présence du titre du backoffice
    await expect(page.locator('text=Backoffice Administrateur')).toBeVisible();

    // Vérifier la présence du menu de navigation
    await expect(page.locator('nav')).toBeVisible();

    // Vérifier la présence de quelques éléments de navigation clés
    await expect(page.locator('text=Applications')).toBeVisible();
    await expect(page.locator('text=Candidats')).toBeVisible();
    await expect(page.locator('text=Entreprises')).toBeVisible();
  });

  test('devrait permettre la navigation entre les différentes sections', async ({ page }) => {
    // Cliquer sur le lien Applications
    await page.locator('text=Applications').click();
    await expect(page.locator('text=Liste des candidatures')).toBeVisible();

    // Cliquer sur le lien Entreprises
    await page.locator('text=Entreprises').click();
    await expect(page.locator('text=Liste des entreprises')).toBeVisible();

    // Cliquer sur le lien Candidats
    await page.locator('text=Candidats').click();
    await expect(page.locator('text=Liste des contacts')).toBeVisible();
  });

  test('devrait afficher la page des statistiques/dashboard', async ({ page }) => {
    // Cliquer sur le lien Analytics/Statistiques
    await page.locator('text=Analytics').click();

    // Vérifier la présence des éléments du dashboard
    await expect(page.locator('text=Statistiques')).toBeVisible();

    // Vérifier la présence de graphiques ou métriques
    await expect(page.locator('canvas, .chart, .metric')).toBeVisible();
  });

  test('devrait permettre l\'accès à la gestion des utilisateurs (admin)', async ({ page }) => {
    // Cliquer sur le lien Utilisateurs (section admin)
    await page.locator('text=Utilisateurs').click();

    // Vérifier la présence de la liste des utilisateurs
    await expect(page.locator('text=Liste des utilisateurs')).toBeVisible();

    // Vérifier la présence d'actions administratives
    await expect(page.locator('button, a').filter({ hasText: /Modifier|Supprimer|Activer/ })).toBeVisible();
  });

  test('devrait permettre la recherche globale', async ({ page }) => {
    // Vérifier la présence du champ de recherche globale
    const searchInput = page.locator('input[placeholder*="recherche"], input[type="search"]');
    await expect(searchInput).toBeVisible();

    // Effectuer une recherche
    await searchInput.fill('test');

    // Vérifier que des résultats de recherche apparaissent
    await expect(page.locator('.search-results, .results')).toBeVisible();
  });

  test('devrait permettre l\'accès aux paramètres système', async ({ page }) => {
    // Cliquer sur le lien Paramètres
    await page.locator('text=Paramètres').click();

    // Vérifier la présence des options de configuration
    await expect(page.locator('text=Configuration')).toBeVisible();

    // Vérifier la présence du bouton de thème
    await expect(page.locator('button[title*="mode"]')).toBeVisible();
  });

  test('devrait permettre la déconnexion sécurisée', async ({ page }) => {
    // Cliquer sur le bouton de déconnexion (généralement dans le menu utilisateur)
    const logoutButton = page.locator('button, a').filter({ hasText: /Déconnexion|Logout|Se déconnecter/ });
    await expect(logoutButton).toBeVisible();

    // Cliquer sur le bouton de déconnexion
    await logoutButton.click();

    // Vérifier la redirection vers la page de connexion
    await expect(page).toHaveURL('/login');
  });

  test('devrait afficher correctement les notifications', async ({ page }) => {
    // Vérifier la présence du centre de notifications
    const notificationCenter = page.locator('.notification-center, [data-testid="notifications"]');
    await expect(notificationCenter).toBeVisible();

    // Cliquer pour ouvrir les notifications
    await notificationCenter.click();

    // Vérifier que les notifications se chargent
    await expect(page.locator('.notification-list, .notifications')).toBeVisible();
  });

  test('devrait être accessible via le clavier', async ({ page }) => {
    // Test d'accessibilité avec navigation au clavier
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Vérifier que la navigation fonctionne
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('devrait gérer les erreurs 404 pour les routes inexistantes', async ({ page }) => {
    // Tenter d'accéder à une route inexistante
    await page.goto('/backoffice/route-inexistante');

    // Vérifier la gestion de l'erreur 404
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Page non trouvée')).toBeVisible();
  });

  test('devrait maintenir la session utilisateur', async ({ page }) => {
    // Recharger la page
    await page.reload();

    // Vérifier que l'utilisateur reste connecté
    await expect(page.locator('text=Backoffice Administrateur')).toBeVisible();

    // Vérifier que les informations utilisateur sont préservées
    await expect(page.locator('text=Admin JobbingTrack')).toBeVisible();
  });

  test('devrait permettre la gestion des données sensibles (RGPD)', async ({ page }) => {
    // Accéder à la section de gestion des données
    await page.locator('text=RGPD').click();

    // Vérifier la présence des outils RGPD
    await expect(page.locator('text=Données personnelles')).toBeVisible();
    await expect(page.locator('text=Export|Suppression')).toBeVisible();
  });
});
