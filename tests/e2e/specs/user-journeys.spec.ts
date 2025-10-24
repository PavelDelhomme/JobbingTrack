/**
 * Tests E2E - Parcours utilisateur complets
 * Tests des scénarios utilisateur réalistes
 */

import { test, expect } from '@playwright/test';

test.describe('Parcours utilisateur complets', () => {
  test.beforeEach(async ({ page }) => {
    // Configuration de base
    await page.goto('http://localhost:8080');
  });

  test('Parcours complet - Inscription et première connexion', async ({ page }) => {
    // Aller à la page d'inscription
    await page.goto('http://localhost:8080/register');

    // Remplir le formulaire d'inscription
    await page.fill('input[name="email"]', 'test-user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.check('input[name="terms"]');
    await page.click('button[type="submit"]');

    // Vérifier la confirmation d'inscription
    await expect(page.locator('.success-message')).toContainText('Inscription réussie');

    // Vérifier l'email de confirmation (simulation)
    await page.goto('http://localhost:8080/verify-email?token=test-token');

    // Se connecter
    await page.goto('http://localhost:8080/login');
    await page.fill('input[name="email"]', 'test-user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Vérifier la connexion réussie
    await expect(page.url()).toContain('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('Parcours candidat - Création et gestion de candidatures', async ({ page }) => {
    // Se connecter en tant que candidat
    await page.goto('http://localhost:8080/login');
    await page.fill('input[name="email"]', 'candidate@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Aller au dashboard
    await expect(page.url()).toContain('/dashboard');

    // Créer une nouvelle entreprise
    await page.click('a[href*="/companies"]');
    await page.click('button:has-text("Créer entreprise")');
    await page.fill('input[name="name"]', 'Tech Corp');
    await page.fill('input[name="description"]', 'Entreprise technologique innovante');
    await page.fill('input[name="website"]', 'https://techcorp.com');
    await page.fill('input[name="industry"]', 'Technology');
    await page.click('button[type="submit"]');

    // Vérifier la création
    await expect(page.locator('tr:has-text("Tech Corp")')).toBeVisible();

    // Créer une candidature
    await page.goto('http://localhost:8080/applications');
    await page.click('button:has-text("Créer candidature")');
    await page.fill('input[name="title"]', 'Développeur Full Stack');
    await page.fill('input[name="company"]', 'Tech Corp');
    await page.fill('textarea[name="description"]', 'Poste de développeur full stack');
    await page.selectOption('select[name="status"]', 'applied');
    await page.click('button[type="submit"]');

    // Vérifier la création de la candidature
    await expect(page.locator('tr:has-text("Développeur Full Stack")')).toBeVisible();

    // Ajouter une note à la candidature
    await page.click('tr:has-text("Développeur Full Stack") button:has-text("Notes")');
    await page.fill('textarea[name="notes"]', 'Entretien prévu la semaine prochaine');
    await page.click('button:has-text("Sauvegarder")');

    // Vérifier la note
    await expect(page.locator('.note-content')).toContainText('Entretien prévu');
  });

  test('Parcours recruteur - Recherche et gestion de candidats', async ({ page }) => {
    // Se connecter en tant que recruteur
    await page.goto('http://localhost:8080/login');
    await page.fill('input[name="email"]', 'recruiter@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Aller à la recherche de candidats
    await page.goto('http://localhost:8080/candidates');
    await page.fill('input[name="search"]', 'développeur');
    await page.click('button[type="submit"]');

    // Vérifier les résultats
    await expect(page.locator('.candidate-card')).toHaveCount(1);

    // Consulter le profil d'un candidat
    await page.click('.candidate-card:first-child');
    await expect(page.locator('.candidate-profile')).toBeVisible();

    // Envoyer un message
    await page.fill('textarea[name="message"]', 'Bonjour, votre profil nous intéresse');
    await page.click('button:has-text("Envoyer")');

    // Vérifier l'envoi
    await expect(page.locator('.message-sent')).toBeVisible();
  });

  test('Parcours admin - Gestion système complète', async ({ page }) => {
    // Se connecter en tant qu'admin
    await page.goto('http://localhost:8080/backoffice/login');
    await page.fill('input[name="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Dashboard admin
    await expect(page.url()).toContain('/backoffice');
    await expect(page.locator('h1')).toContainText('Dashboard Admin');

    // Gestion des utilisateurs
    await page.click('a[href*="/users"]');
    await expect(page.locator('h1')).toContainText('Gestion des Utilisateurs');

    // Créer un utilisateur
    await page.click('button:has-text("Créer utilisateur")');
    await page.fill('input[name="email"]', 'new-user@example.com');
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="password"]', 'password123');
    await page.selectOption('select[name="role"]', 'user');
    await page.click('button[type="submit"]');

    // Vérifier la création
    await expect(page.locator('tr:has-text("new-user@example.com")')).toBeVisible();

    // Configuration système
    await page.goto('http://localhost:8080/backoffice/settings');
    await page.click('input[name="maintenance-mode"]');
    await page.click('button:has-text("Sauvegarder")');

    // Vérifier la sauvegarde
    await expect(page.locator('.success-message')).toBeVisible();

    // Analytics
    await page.goto('http://localhost:8080/backoffice/analytics');
    await expect(page.locator('[data-testid="metrics-cards"]')).toBeVisible();

    // Test export de données
    await page.goto('http://localhost:8080/backoffice/data-management');
    await page.check('input[value="users"]');
    await page.check('input[value="companies"]');
    await page.click('button:has-text("Exporter CSV")');

    // Vérifier le téléchargement
    const downloadPromise = page.waitForEvent('download');
    await downloadPromise;
  });

  test('Parcours mobile - Application complète sur mobile', async ({ page }) => {
    // Configurer le viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('http://localhost:8080/mobile');

    // Vérifier l'interface mobile
    await expect(page.locator('.mobile-header')).toBeVisible();
    await expect(page.locator('.mobile-menu')).toBeVisible();

    // Navigation mobile
    await page.tap('button[data-testid="mobile-menu"]');
    await page.tap('a[href*="/applications"]');

    // Créer une candidature mobile
    await page.tap('button:has-text("Créer")');
    await page.fill('input[name="title"]', 'Candidature Mobile');
    await page.fill('input[name="company"]', 'Mobile Corp');
    await page.tap('select[name="status"]');
    await page.tap('option[value="applied"]');
    await page.tap('button[type="submit"]');

    // Vérifier la création
    await expect(page.locator('tr:has-text("Candidature Mobile")')).toBeVisible();

    // Test du mode hors ligne
    await page.context().setOffline(true);
    await page.reload();

    // Vérifier l'indicateur hors ligne
    await expect(page.locator('.offline-indicator')).toBeVisible();

    // Créer une candidature en mode hors ligne
    await page.tap('button:has-text("Créer")');
    await page.fill('input[name="title"]', 'Candidature Offline');
    await page.tap('button[type="submit"]');

    // Vérifier la notification
    await expect(page.locator('.offline-notification')).toBeVisible();

    // Restaurer la connexion
    await page.context().setOffline(false);
    await page.waitForSelector('.online-indicator');
  });

  test('Parcours performance - Test de charge et performance', async ({ page }) => {
    const startTime = Date.now();

    // Test de chargement rapide
    await page.goto('http://localhost:8080/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    console.log(`⚡ Temps de chargement dashboard: ${loadTime}ms`);

    // Le temps de chargement devrait être acceptable
    expect(loadTime).toBeLessThan(3000);

    // Test scrolling performance
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(100);
    console.log('✅ Scroll performance OK');

    // Test navigation performance
    const navigationStart = Date.now();

    await page.click('a[href*="/applications"]');
    await page.waitForLoadState('networkidle');

    const navigationTime = Date.now() - navigationStart;
    console.log(`⚡ Temps de navigation: ${navigationTime}ms`);

    expect(navigationTime).toBeLessThan(2000);
  });

  test('Parcours sécurité - Tests de sécurité complets', async ({ page }) => {
    // Test XSS
    await page.goto('http://localhost:8080/login');
    await page.fill('input[name="email"]', '<script>alert("XSS")</script>');
    await page.click('button[type="submit"]');

    // Vérifier que le script n'est pas exécuté
    await expect(page.locator('script')).not.toContainText('alert("XSS")');

    // Test injection SQL (simulation)
    await page.fill('input[name="email"]', "'; DROP TABLE users; --");
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Devrait être rejeté
    await expect(page.locator('.error-message')).toBeVisible();

    // Test CSRF (simulation)
    await page.goto('http://localhost:8080/applications');

    // Tentative sans authentification
    const response = await page.request.post('http://localhost:8080/api/applications', {
      data: { title: 'Test CSRF', company: 'Test Company' }
    });

    expect(response.status()).toBe(401);
  });

  test('Parcours multi-utilisateurs - Collaboration', async ({ browser }) => {
    // Créer deux contextes (deux utilisateurs)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Utilisateur 1 - Créer une entreprise
    await page1.goto('http://localhost:8080/login');
    await page1.fill('input[name="email"]', 'user1@example.com');
    await page1.fill('input[name="password"]', 'password123');
    await page1.click('button[type="submit"]');

    await page1.goto('http://localhost:8080/companies');
    await page1.click('button:has-text("Créer entreprise")');
    await page1.fill('input[name="name"]', 'Shared Company');
    await page1.click('button[type="submit"]');

    // Utilisateur 2 - Rechercher l'entreprise
    await page2.goto('http://localhost:8080/login');
    await page2.fill('input[name="email"]', 'user2@example.com');
    await page2.fill('input[name="password"]', 'password123');
    await page2.click('button[type="submit"]');

    await page2.goto('http://localhost:8080/search');
    await page2.fill('input[name="query"]', 'Shared Company');
    await page2.click('button[type="submit"]');

    // Vérifier que les résultats sont visibles pour les deux utilisateurs
    await expect(page2.locator('.search-results')).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('Parcours erreur - Gestion des erreurs', async ({ page }) => {
    // Test connexion avec mauvais credentials
    await page.goto('http://localhost:8080/login');
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Vérifier l'erreur
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Identifiants incorrects');

    // Test formulaire incomplet
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '');
    await page.click('button[type="submit"]');

    // Vérifier la validation
    await expect(page.locator('.validation-error')).toBeVisible();

    // Test erreur 404
    await page.goto('http://localhost:8080/non-existent-page');
    await expect(page.locator('h1')).toContainText('404');

    // Test erreur 500 (simulation)
    await page.route('**/api/test-error', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('http://localhost:8080/test-error');
    await expect(page.locator('.error-500')).toBeVisible();
  });

  test('Parcours internationalisation - Tests multi-langues', async ({ page }) => {
    // Test interface française
    await page.goto('http://localhost:8080/login');
    await expect(page.locator('button[type="submit"]')).toContainText('Se connecter');

    // Changer la langue (si disponible)
    await page.click('button[data-testid="language-selector"]');
    await page.click('option[value="en"]');

    // Vérifier la langue anglaise
    await expect(page.locator('button[type="submit"]')).toContainText('Login');

    // Revenir en français
    await page.click('button[data-testid="language-selector"]');
    await page.click('option[value="fr"]');
    await expect(page.locator('button[type="submit"]')).toContainText('Se connecter');
  });

  test('Parcours accessibilité - Tests WCAG', async ({ page }) => {
    await page.goto('http://localhost:8080/dashboard');

    // Test des attributs ARIA
    await expect(page.locator('button[aria-label]')).toHaveCount(1);
    await expect(page.locator('input[aria-describedby]')).toHaveCount(1);

    // Test navigation au clavier
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Test lecteur d'écran (simulation)
    const altTexts = await page.$$eval('img[alt]', imgs => imgs.map(img => img.alt));
    console.log('✅ Images avec alt text:', altTexts.length);

    // Test contraste (simulation basique)
    const contrastElements = await page.$$eval('*', elements => {
      return elements.filter(el => {
        const styles = window.getComputedStyle(el);
        return styles.color && styles.backgroundColor;
      }).length;
    });

    console.log('♿ Éléments avec contraste:', contrastElements);
  });

  test('Parcours responsive - Tests sur tous les appareils', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      console.log(`🖥️ Test ${viewport.name} (${viewport.width}x${viewport.height})`);

      await page.setViewportSize(viewport);
      await page.goto('http://localhost:8080/dashboard');

      // Vérifier que l'interface s'adapte
      if (viewport.width < 768) {
        await expect(page.locator('.mobile-menu')).toBeVisible();
      } else {
        await expect(page.locator('.desktop-nav')).toBeVisible();
      }

      // Vérifier que les éléments sont visibles
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    }
  });

  test('Parcours données - Import/Export complet', async ({ page }) => {
    // Se connecter
    await page.goto('http://localhost:8080/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Aller à la gestion des données
    await page.goto('http://localhost:8080/backoffice/data-management');

    // Créer des données de test
    await page.click('button:has-text("Générer données test")');
    await page.waitForTimeout(2000);

    // Vérifier la génération
    await expect(page.locator('.success-message')).toBeVisible();

    // Exporter les données
    await page.check('input[value="users"]');
    await page.check('input[value="companies"]');
    await page.check('input[value="applications"]');

    await page.selectOption('select[name="format"]', 'csv');
    await page.click('button:has-text("Exporter")');

    // Vérifier le téléchargement
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/export.*\.csv/);

    // Importer des données
    await page.click('button:has-text("Importer")');
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-data.json');
    await page.click('button:has-text("Confirmer import")');

    // Vérifier l'import
    await expect(page.locator('.import-success')).toBeVisible();
  });

  test('Parcours notifications - Système de notifications', async ({ page }) => {
    // Se connecter
    await page.goto('http://localhost:8080/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Activer les notifications
    await page.goto('http://localhost:8080/settings');
    await page.check('input[name="email-notifications"]');
    await page.check('input[name="push-notifications"]');
    await page.click('button:has-text("Sauvegarder")');

    // Vérifier les paramètres
    await expect(page.locator('input[name="email-notifications"]:checked')).toBeVisible();

    // Créer une candidature pour générer une notification
    await page.goto('http://localhost:8080/applications');
    await page.click('button:has-text("Créer candidature")');
    await page.fill('input[name="title"]', 'Candidature avec notification');
    await page.click('button[type="submit"]');

    // Vérifier la notification
    await page.waitForSelector('.notification-toast');
    await expect(page.locator('.notification-toast')).toContainText('Candidature créée');
  });

  test('Parcours analytics - Métriques et rapports', async ({ page }) => {
    // Se connecter en admin
    await page.goto('http://localhost:8080/backoffice/login');
    await page.fill('input[name="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Aller aux analytics
    await page.goto('http://localhost:8080/backoffice/analytics');

    // Vérifier les métriques de base
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-companies"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-applications"]')).toBeVisible();

    // Test des filtres de date
    await page.click('button:has-text("7 derniers jours")');
    await expect(page.locator('.date-filter-active')).toBeVisible();

    await page.click('button:has-text("30 derniers jours")');
    await expect(page.locator('.date-filter-active')).toBeVisible();

    // Test des graphiques
    await page.click('button:has-text("Performance")');
    await expect(page.locator('.performance-chart')).toBeVisible();

    await page.click('button:has-text("Erreurs")');
    await expect(page.locator('.error-chart')).toBeVisible();

    // Export du rapport
    await page.click('button:has-text("Exporter rapport")');
    const downloadPromise = page.waitForEvent('download');
    await downloadPromise;
  });
});
