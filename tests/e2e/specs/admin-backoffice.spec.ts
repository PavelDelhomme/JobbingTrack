/**
 * Tests E2E du Backoffice Admin
 * Tests complets de l'interface d'administration
 */

import { test, expect } from '@playwright/test';

test.describe('Backoffice Admin', () => {
  test.beforeEach(async ({ page }) => {
    // Aller à la page de login
    await page.goto('http://localhost:8080/backoffice/login');

    // Se connecter en tant qu'admin
    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Attendre la redirection vers le dashboard
    await page.waitForURL('http://localhost:8080/backoffice');
  });

  test('Dashboard admin accessible', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard Admin');
    await expect(page.locator('[data-testid="metrics-cards"]')).toBeVisible();
  });

  test('Navigation entre les sections', async ({ page }) => {
    // Test navigation vers les utilisateurs
    await page.click('a[href*="/users"]');
    await expect(page.url()).toContain('/users');
    await expect(page.locator('h1')).toContainText('Gestion des Utilisateurs');

    // Test navigation vers les entreprises
    await page.click('a[href*="/companies"]');
    await expect(page.url()).toContain('/companies');
    await expect(page.locator('h1')).toContainText('Entreprises');

    // Test navigation vers les candidatures
    await page.click('a[href*="/applications"]');
    await expect(page.url()).toContain('/applications');
    await expect(page.locator('h1')).toContainText('Candidatures');
  });

  test('Gestion des utilisateurs', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/users');

    // Créer un nouvel utilisateur
    await page.click('button:has-text("Créer utilisateur")');
    await page.fill('input[name="email"]', 'test-user@example.com');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Vérifier que l'utilisateur a été créé
    await expect(page.locator('tr:has-text("test-user@example.com")')).toBeVisible();

    // Modifier l'utilisateur
    await page.click('tr:has-text("test-user@example.com") button:has-text("Modifier")');
    await page.fill('input[name="name"]', 'Updated Test User');
    await page.click('button[type="submit"]');

    // Vérifier la modification
    await expect(page.locator('tr:has-text("Updated Test User")')).toBeVisible();

    // Supprimer l'utilisateur
    await page.click('tr:has-text("Updated Test User") button:has-text("Supprimer")');
    await page.click('button:has-text("Confirmer")');
    await expect(page.locator('tr:has-text("Updated Test User")')).not.toBeVisible();
  });

  test('Gestion des entreprises', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/companies');

    // Créer une entreprise
    await page.click('button:has-text("Créer entreprise")');
    await page.fill('input[name="name"]', 'Test Company');
    await page.fill('input[name="description"]', 'Test company description');
    await page.fill('input[name="website"]', 'https://example.com');
    await page.fill('input[name="industry"]', 'Technology');
    await page.click('button[type="submit"]');

    // Vérifier la création
    await expect(page.locator('tr:has-text("Test Company")')).toBeVisible();

    // Modifier l'entreprise
    await page.click('tr:has-text("Test Company") button:has-text("Modifier")');
    await page.fill('input[name="name"]', 'Updated Test Company');
    await page.click('button[type="submit"]');

    // Vérifier la modification
    await expect(page.locator('tr:has-text("Updated Test Company")')).toBeVisible();
  });

  test('Gestion des candidatures', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/applications');

    // Vérifier que les candidatures sont affichées
    await expect(page.locator('table')).toBeVisible();

    // Test des filtres
    await page.selectOption('select[name="status"]', 'applied');
    await expect(page.locator('tr')).toHaveCount(1); // Au moins une ligne

    await page.selectOption('select[name="status"]', 'all');
    await expect(page.locator('tr')).toBeVisible();
  });

  test('Export de données', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/data-management');

    // Sélectionner des tables à exporter
    await page.check('input[value="users"]');
    await page.check('input[value="companies"]');

    // Exporter en CSV
    await page.click('button:has-text("Exporter CSV")');

    // Vérifier que le téléchargement a commencé
    const downloadPromise = page.waitForEvent('download');
    await downloadPromise;

    console.log('✅ Export CSV réussi');
  });

  test('Interface de test Playwright', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/playwright-tests');

    // Vérifier que l'interface de test est accessible
    await expect(page.locator('h1')).toContainText('Interface de Test');

    // Créer un test simple
    await page.fill('input[name="testName"]', 'Test automatique');
    await page.fill('textarea[name="testDescription"]', 'Test généré automatiquement');
    await page.selectOption('select[name="testType"]', 'e2e');
    await page.click('button:has-text("Créer test")');

    // Vérifier que le test a été créé
    await expect(page.locator('tr:has-text("Test automatique")')).toBeVisible();
  });

  test('Métriques système', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/analytics');

    // Vérifier les métriques de base
    await expect(page.locator('[data-testid="cpu-usage"]')).toBeVisible();
    await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible();
    await expect(page.locator('[data-testid="disk-usage"]')).toBeVisible();

    // Test des onglets
    await page.click('button:has-text("Performance")');
    await expect(page.locator('.performance-metrics')).toBeVisible();

    await page.click('button:has-text("Erreurs")');
    await expect(page.locator('.error-logs')).toBeVisible();
  });

  test('Recherche globale', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/search');

    // Test de la recherche
    await page.fill('input[placeholder*="Rechercher"]', 'admin');
    await page.waitForTimeout(1000);

    // Vérifier les résultats
    await expect(page.locator('.search-results')).toBeVisible();
    await expect(page.locator('.search-result')).toHaveCount(1); // Au moins un résultat
  });

  test('Paramètres système', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/settings');

    // Test des paramètres
    await expect(page.locator('input[name="theme"]')).toBeVisible();
    await expect(page.locator('input[name="notifications"]')).toBeVisible();

    // Modifier un paramètre
    await page.click('input[name="notifications"]');
    await page.click('button:has-text("Sauvegarder")');

    // Vérifier la sauvegarde
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('Gestion des rôles et permissions', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/users');

    // Créer un utilisateur avec rôle spécifique
    await page.click('button:has-text("Créer utilisateur")');
    await page.fill('input[name="email"]', 'manager@example.com');
    await page.fill('input[name="name"]', 'Manager User');
    await page.fill('input[name="password"]', 'password123');
    await page.selectOption('select[name="role"]', 'manager');
    await page.click('button[type="submit"]');

    // Vérifier le rôle
    await expect(page.locator('tr:has-text("Manager User")')).toBeVisible();

    // Test des permissions
    await page.goto('http://localhost:8080/backoffice/admin-only');
    await expect(page.locator('.permission-denied')).toBeVisible();
  });

  test('Test de performance', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:8080/backoffice');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    console.log(`⚡ Temps de chargement du dashboard: ${loadTime}ms`);

    // Le temps de chargement devrait être raisonnable
    expect(loadTime).toBeLessThan(5000); // Moins de 5 secondes
  });

  test('Test de responsive design', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('http://localhost:8080/backoffice');

    // Vérifier que le layout s'adapte
    await expect(page.locator('.mobile-menu')).toBeVisible();
    await expect(page.locator('.responsive-grid')).toBeVisible();
  });

  test('Test d\'accessibilité', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice');

    // Test des attributs d'accessibilité
    await expect(page.locator('button[aria-label]')).toBeVisible();
    await expect(page.locator('input[aria-describedby]')).toBeVisible();

    // Test navigation au clavier
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('Test de sécurité - XSS', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/users');

    // Tenter une injection XSS
    await page.click('button:has-text("Créer utilisateur")');
    await page.fill('input[name="name"]', '<script>alert("XSS")</script>');
    await page.click('button[type="submit"]');

    // Vérifier que le script n'est pas exécuté
    await expect(page.locator('script')).not.toContainText('alert("XSS")');
  });

  test('Test de sécurité - CSRF', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/settings');

    // Tenter une requête sans token CSRF
    const response = await page.request.post('http://localhost:8080/api/settings', {
      data: { theme: 'dark' }
    });

    // Devrait être rejetée sans authentification
    expect(response.status()).toBe(401);
  });
});
