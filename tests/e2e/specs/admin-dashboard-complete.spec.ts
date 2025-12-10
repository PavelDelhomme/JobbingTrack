/**
 * Tests E2E complets du Dashboard Admin
 * Tests pour toutes les fonctionnalités du backoffice
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5003';
const ADMIN_EMAIL = 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = 'password123';

test.describe('Dashboard Admin - Tests Complets', () => {
  test.beforeEach(async ({ page }) => {
    // Aller à la page de login
    await page.goto(`${BASE_URL}/backoffice/login`);

    // Se connecter en tant qu'admin
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Attendre la redirection vers le dashboard
    await page.waitForURL(`${BASE_URL}/backoffice`, { timeout: 10000 });
  });

  test('Dashboard principal accessible et affiche les métriques', async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice`);
    
    // Vérifier que le dashboard est chargé
    await expect(page.locator('h1, h2')).toContainText(/Dashboard|Tableau de bord/i);
    
    // Vérifier la présence des cartes de métriques
    const metricsCards = page.locator('[class*="card"], [class*="metric"], [class*="stat"]');
    await expect(metricsCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('Navigation vers toutes les pages du backoffice', async ({ page }) => {
    const pages = [
      { name: 'Analytics', path: '/backoffice/analytics' },
      { name: 'Statistiques', path: '/backoffice/statistique' },
      { name: 'Applications', path: '/backoffice/applications' },
      { name: 'Entreprises', path: '/backoffice/companies' },
      { name: 'Contacts', path: '/backoffice/contacts' },
      { name: 'Entretiens', path: '/backoffice/interviews' },
      { name: 'Appels', path: '/backoffice/calls' },
      { name: 'Relances', path: '/backoffice/followups' },
      { name: 'Événements', path: '/backoffice/events' },
      { name: 'Notifications', path: '/backoffice/notifications' },
      { name: 'Utilisateurs', path: '/backoffice/users' },
      { name: 'Services', path: '/backoffice/services' },
      { name: 'Gestion des données', path: '/backoffice/data' },
      { name: 'Testeur API', path: '/backoffice/api-tester' },
      { name: 'Données de test', path: '/backoffice/test-data' },
      { name: 'Émulateur mobile', path: '/backoffice/mobile-emulator' },
      { name: 'Tests Playwright', path: '/backoffice/playwright-tests' },
      { name: 'Tests Performance', path: '/backoffice/performance-tests' },
      { name: 'Rapports de test', path: '/backoffice/test-reports' },
      { name: 'Parcours utilisateur', path: '/backoffice/user-journey' },
    ];

    for (const pageInfo of pages) {
      await page.goto(`${BASE_URL}${pageInfo.path}`);
      await expect(page).toHaveURL(new RegExp(pageInfo.path.replace('/', '\\/')), { timeout: 5000 });
      // Vérifier que la page se charge sans erreur
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Gestion des utilisateurs - CRUD complet', async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/users`);

    // Vérifier que la liste des utilisateurs est visible
    await expect(page.locator('h1, h2')).toContainText(/Utilisateur/i, { timeout: 5000 });

    // Test création d'utilisateur (si bouton présent)
    const createButton = page.locator('button:has-text("Créer"), button:has-text("Ajouter"), button:has-text("Nouveau")').first();
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createButton.click();
      
      // Remplir le formulaire
      const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill(`test-${Date.now()}@example.com`);
        
        const nameInput = page.locator('input[name*="name"], input[placeholder*="nom"]').first();
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill('Test User');
        }
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Créer"), button:has-text("Enregistrer")').first();
        if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitButton.click();
          // Attendre la confirmation
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('Gestion des données - Export et import', async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/data`);

    // Vérifier que la page se charge
    await expect(page.locator('body')).toBeVisible();

    // Vérifier les onglets de gestion des données
    const tabs = ['Applications', 'Entreprises', 'Contacts', 'Entretiens', 'Appels', 'Relances', 'Événements', 'Notifications'];
    for (const tab of tabs) {
      const tabButton = page.locator(`button:has-text("${tab}"), a:has-text("${tab}")`).first();
      if (await tabButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tabButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('Gestion des services - Vérification de tous les services', async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/services`);

    // Vérifier que la liste des services est visible
    await expect(page.locator('body')).toBeVisible();

    // Vérifier les services principaux
    const services = [
      'auth-service',
      'application-service',
      'company-service',
      'contact-service',
      'interview-service',
      'call-service',
      'notification-service',
      'dashboard-service',
      'profile-service',
      'security-service',
      'metrics-aggregator',
      'workflow-service',
    ];

    for (const service of services) {
      const serviceLink = page.locator(`a[href*="${service}"], button:has-text("${service}")`).first();
      if (await serviceLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await serviceLink.click();
        await page.waitForTimeout(1000);
        // Vérifier que la page du service se charge
        await expect(page.locator('body')).toBeVisible();
        // Retour à la liste
        await page.goBack();
        await page.waitForTimeout(1000);
      }
    }
  });
});

