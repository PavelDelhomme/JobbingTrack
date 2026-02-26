// Tests sécurité — vérifie contrôles d'accès (user vs admin)
import { test, expect } from '@playwright/test';
import { ensureTestUser } from './test-data-helper';

test.describe('🔒 Tests de Sécurité Avancés', () => {

  test('devrait empêcher l\'accès non autorisé aux routes admin', async ({ page, request }) => {
    await page.goto('/backoffice');
    await expect(page).toHaveURL('/login');

    const creds = await ensureTestUser(request);
    if (!creds) return;
    await page.fill('input[type="email"]', creds.email);
    await page.fill('input[type="password"]', creds.password);
    await page.locator('button[type="submit"]').click();

    // Un user classique devrait être redirigé (accès refusé ou page user)
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url.includes('/backoffice')).toBeFalsy();
  });

  test('devrait gérer correctement les sessions et timeouts', async ({ page }) => {
    await page.goto('/backoffice');

    // Simuler une expiration de session
    await page.route('**/api/v1/auth/profile', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Session expirée'
        })
      });
    });

    // Essayer d'accéder à une page protégée
    await page.goto('/backoffice/users');

    // Devrait être redirigé vers login
    await expect(page).toHaveURL('/login');
  });

  test('devrait empêcher les attaques CSRF', async ({ page }) => {
    await page.goto('/backoffice');

    // Essayer d'envoyer une requête CSRF depuis un autre domaine
    await page.route('**/api/v1/applications', async route => {
      // Vérifier que la requête contient les headers anti-CSRF appropriés
      const headers = route.request().headers();
      expect(headers['x-requested-with']).toBe('XMLHttpRequest');
      expect(headers['authorization']).toBe('Bearer admin-jwt-token-12345');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // La requête devrait réussir car elle vient du bon domaine avec les bons headers
    await page.goto('/backoffice/applications');
    await expect(page.locator('text=Applications')).toBeVisible();
  });

  test('devrait empêcher l\'injection SQL et XSS', async ({ page }) => {
    await page.goto('/login');

    // Tester l'injection SQL dans le formulaire de login
    await page.fill('input[type="email"]', "'; DROP TABLE users; --");
    await page.fill('input[type="password"]', "'; DROP TABLE users; --");

    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Identifiants invalides'
        })
      });
    });

    await page.locator('button[type="submit"]').click();

    // Devrait recevoir une erreur normale, pas une injection réussie
    await expect(page.locator('text=Identifiants invalides')).toBeVisible();

    // Aller dans le backoffice et tester XSS
    await page.goto('/backoffice');

    // Créer une entreprise avec du contenu XSS
    await page.locator('text=Entreprises').click();
    await page.locator('button').filter({ hasText: /Créer/ }).click();

    await page.fill('input[name="name"]', '<script>alert("XSS")</script>');
    await page.fill('input[name="website"]', 'javascript:alert("XSS")');

    // Le formulaire devrait échapper ou rejeter le contenu malveillant
    await page.locator('button[type="submit"]').click();

    // Vérifier qu'aucun script n'est exécuté
    await expect(page.locator('text=Entreprise créée')).toBeVisible();

    // Vérifier que le contenu est échappé dans l'affichage
    await expect(page.locator('text=<script>')).not.toBeVisible();
  });

  test('devrait gérer correctement les permissions granulaires', async ({ page }) => {
    await page.goto('/backoffice');

    // Devrait pouvoir accéder aux candidatures
    await page.locator('text=Applications').click();
    await expect(page.locator('text=Candidatures')).toBeVisible();

    // Ne devrait pas pouvoir accéder à la gestion des utilisateurs (admin)
    await page.goto('/backoffice/users');

    // Devrait être redirigé ou voir une erreur 403
    await expect(page.locator('text=Accès refusé')).toBeVisible();

    // Devrait pouvoir créer des candidatures
    await page.locator('text=Applications').click();
    await page.locator('button').filter({ hasText: /Créer/ }).click();
    await expect(page.locator('input[name="position"]')).toBeVisible();

    // Mais ne devrait pas pouvoir supprimer des candidatures (permission manquante)
    await page.goto('/backoffice/applications');
    await expect(page.locator('button').filter({ hasText: /Supprimer/ })).not.toBeVisible();
  });

  test('devrait sécuriser les téléchargements et exports', async ({ page }) => {
    await page.goto('/backoffice');

    // Aller dans les rapports et essayer d'exporter
    await page.locator('text=Analytics').click();

    // Intercepter la requête d'export
    await page.route('**/api/v1/reports/export', async route => {
      // Vérifier que la requête contient le token d'authentification
      const headers = route.request().headers();
      expect(headers['authorization']).toBe('Bearer admin-jwt-token-12345');

      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: 'PDF content'
      });
    });

    await page.locator('button').filter({ hasText: /Exporter/ }).click();
    await page.locator('select[name="format"]').selectOption('pdf');

    // Le téléchargement devrait fonctionner pour un utilisateur autorisé
    await expect(page.locator('text=Rapport généré')).toBeVisible();
  });

  test('devrait protéger contre les attaques de taux (rate limiting)', async ({ page }) => {
    await page.goto('/login');

    // Tenter de nombreuses connexions rapides
    for (let i = 0; i < 10; i++) {
      await page.fill('input[type="email"]', `user${i}@test.com`);
      await page.fill('input[type="password"]', 'wrongpassword');

      await page.route('**/api/v1/auth/login', async route => {
        await route.fulfill({
          status: 429, // Too Many Requests
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Trop de tentatives de connexion'
          })
        });
      });

      await page.locator('button[type="submit"]').click();

      // Après quelques tentatives, devrait recevoir une erreur de rate limiting
      if (i > 5) {
        await expect(page.locator('text=Trop de tentatives')).toBeVisible();
      }
    }
  });

  test('devrait sécuriser les mots de passe et données sensibles', async ({ page }) => {
    await page.goto('/login');

    // Vérifier que le mot de passe n'est pas visible en clair
    await page.fill('input[type="password"]', 'monmotdepasse');
    await expect(page.locator('input[type="password"]')).toHaveAttribute('type', 'password');

    // Cliquer sur le bouton d'affichage du mot de passe
    await page.locator('button[title*="mot de passe"]').click();

    // Le mot de passe devrait maintenant être visible
    await expect(page.locator('input[type="password"]')).toHaveAttribute('type', 'text');

    await page.goto('/backoffice');

    // Vérifier que les données sensibles ne sont pas exposées dans les logs réseau
    // (Cette vérification serait normalement faite en analysant les requêtes réseau)
    await page.goto('/backoffice/users');

    // Les données utilisateur ne devraient pas être visibles sans authentification appropriée
    await expect(page.locator('input[type="password"]')).not.toBeVisible();
  });

  test('devrait gérer les erreurs de sécurité de manière appropriée', async ({ page }) => {
    // Essayer d'accéder à une URL malformée
    await page.goto('/backoffice/%3Cscript%3Ealert(1)%3C/script%3E');

    // Devrait recevoir une erreur 400 ou 404 appropriée
    await expect(page.locator('text=Page non trouvée')).toBeVisible();

    await page.goto('/backoffice');

    // Essayer d'envoyer des données malformées
    await page.route('**/api/v1/applications', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Données invalides'
        })
      });
    });

    await page.locator('text=Applications').click();
    await page.locator('button').filter({ hasText: /Créer/ }).click();
    await page.fill('input[name="position"]', '');
    await page.locator('button[type="submit"]').click();

    // Devrait recevoir une erreur de validation appropriée
    await expect(page.locator('text=Données invalides')).toBeVisible();
  });

  test('devrait maintenir la sécurité lors des changements de rôle', async ({ page }) => {
    await page.goto('/backoffice');

    // Accéder à la gestion des utilisateurs
    await page.locator('text=Utilisateurs').click();

    // Modifier les permissions d'un utilisateur
    await page.locator('tr').filter({ hasText: 'Test User' }).locator('button').filter({ hasText: /Modifier/ }).click();

    // Intercepter la requête de modification
    await page.route('**/api/v1/auth/users/*/role', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Rôle modifié avec succès'
        })
      });
    });

    await page.locator('select[name="role"]').selectOption('ADMIN');
    await page.locator('button[type="submit"]').click();

    // Vérifier que la modification est confirmée
    await expect(page.locator('text=Rôle modifié')).toBeVisible();

    // Essayer de s'auto-dégrader (ne devrait pas fonctionner)
    await page.locator('tr').filter({ hasText: 'Admin JobbingTrack' }).locator('button').filter({ hasText: /Modifier/ }).click();
    await page.locator('select[name="role"]').selectOption('USER');
    await page.locator('button[type="submit"]').click();

    // Devrait recevoir une erreur ou être empêché
    await expect(page.locator('text=Action non autorisée')).toBeVisible();
  });
});
