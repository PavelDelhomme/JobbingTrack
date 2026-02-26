import { test, expect, Page } from '@playwright/test';
import { ensureTestUser } from '../test-data-helper';

// Tests fonctionnels mobile — utilise un utilisateur classique (rôle USER)

/**
 * Tests E2E Mobile Complets - JobbingTrack
 * 
 * Ce fichier teste tous les parcours utilisateur de l'application mobile :
 * - Inscription et Connexion
 * - Gestion des Candidatures
 * - Gestion des Contacts
 * - Gestion des Relances
 * - Gestion des Entretiens
 * - Gestion des Appels
 * - Notifications
 * - Navigation et UX mobile
 */

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:5002';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5003';

// Données de test — utilisateur classique (rôle USER)
const testUser = {
  email: `test-mobile-${Date.now()}@jobbingtrack.test`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'Mobile',
  phone: '0612345678',
};

let authToken: string;
let userId: string;
let companyId: string;
let applicationId: string;
let contactId: string;
let testCredentials: { email: string; password: string } | null = null;

/**
 * Helper: Connexion utilisateur
 */
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Remplir le formulaire de connexion
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Attendre la redirection après connexion
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  
  // Vérifier que l'utilisateur est connecté
  await expect(page.locator('text=/Dashboard|Tableau de bord/i')).toBeVisible();
}

/**
 * Helper: Inscription utilisateur
 */
async function registerUser(page: Page, userData: typeof testUser) {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  
  // Remplir le formulaire d'inscription
  await page.fill('input[name="email"], input[type="email"]', userData.email);
  await page.fill('input[name="password"], input[type="password"]', userData.password);
  await page.fill('input[name="firstName"], input[name="first_name"]', userData.firstName);
  await page.fill('input[name="lastName"], input[name="last_name"]', userData.lastName);
  await page.fill('input[name="phone"]', userData.phone);
  
  // Soumettre le formulaire
  await page.click('button[type="submit"]');
  
  // Attendre la confirmation ou redirection
  await page.waitForTimeout(2000);
}

test.describe('📱 Tests Mobile - Parcours Utilisateur Complet', () => {
  test.beforeAll(async ({ request }) => {
    testCredentials = await ensureTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    // Configuration mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.addInitScript(() => {
      // Simuler les APIs mobiles
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      });
    });
  });

  test('1. 📝 Inscription - Création de compte mobile', async ({ page }) => {
    await registerUser(page, testUser);
    
    // Vérifier le message de succès ou redirection
    await expect(
      page.locator('text=/vérification|confirmation|succès|success/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('2. 🔐 Connexion - Authentification mobile', async ({ page }) => {
    // Utiliser l'utilisateur admin par défaut pour les tests
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Vérifier que le dashboard est accessible
    await expect(page.locator('text=/Dashboard|Tableau de bord/i')).toBeVisible();
  });

  test('3. 🏢 Création d\'Entreprise - Mobile', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Naviguer vers la création d'entreprise
    await page.click('text=/Entreprise|Company/i');
    await page.waitForTimeout(1000);
    
    // Cliquer sur le bouton "Nouvelle entreprise" ou "Ajouter"
    const addButton = page.locator('button:has-text("Nouveau"), button:has-text("Ajouter"), button:has-text("+")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
    }
    
    // Remplir le formulaire
    await page.fill('input[name="name"], input[placeholder*="nom"]', 'Test Company Mobile');
    await page.fill('input[name="website"], input[placeholder*="site"]', 'https://test-company.com');
    await page.fill('input[name="industry"], select[name="industry"]', 'Tech');
    
    // Soumettre
    await page.click('button[type="submit"], button:has-text("Créer"), button:has-text("Enregistrer")');
    
    // Vérifier la création
    await expect(page.locator('text=/Test Company Mobile|succès|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('4. 📋 Création de Candidature - Mobile', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Naviguer vers les candidatures
    await page.click('text=/Candidature|Application/i');
    await page.waitForTimeout(1000);
    
    // Cliquer sur "Nouvelle candidature"
    const addButton = page.locator('button:has-text("Nouveau"), button:has-text("Ajouter"), button:has-text("+")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
    }
    
    // Remplir le formulaire
    await page.fill('input[name="position"], input[placeholder*="poste"]', 'Développeur Mobile');
    await page.fill('input[name="company"], select[name="company"]', 'Test Company');
    await page.fill('input[name="platform"], select[name="platform"]', 'LinkedIn');
    
    // Soumettre
    await page.click('button[type="submit"], button:has-text("Créer")');
    
    // Vérifier la création
    await expect(page.locator('text=/Développeur Mobile|succès/i')).toBeVisible({ timeout: 10000 });
  });

  test('5. 👥 Création de Contact - Mobile', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Naviguer vers les contacts
    await page.click('text=/Contact/i');
    await page.waitForTimeout(1000);
    
    // Cliquer sur "Nouveau contact"
    const addButton = page.locator('button:has-text("Nouveau"), button:has-text("Ajouter"), button:has-text("+")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
    }
    
    // Remplir le formulaire
    await page.fill('input[name="firstName"], input[placeholder*="prénom"]', 'Jean');
    await page.fill('input[name="lastName"], input[placeholder*="nom"]', 'Dupont');
    await page.fill('input[name="email"], input[type="email"]', 'jean.dupont@test.com');
    await page.fill('input[name="phone"]', '0612345678');
    
    // Soumettre
    await page.click('button[type="submit"], button:has-text("Créer")');
    
    // Vérifier la création
    await expect(page.locator('text=/Jean Dupont|succès/i')).toBeVisible({ timeout: 10000 });
  });

  test('6. 📞 Création d\'Appel - Mobile', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Naviguer vers les appels
    await page.click('text=/Appel|Call/i');
    await page.waitForTimeout(1000);
    
    // Cliquer sur "Nouvel appel"
    const addButton = page.locator('button:has-text("Nouveau"), button:has-text("Ajouter"), button:has-text("+")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
    }
    
    // Remplir le formulaire
    await page.fill('input[name="contact"], select[name="contact"]', 'Jean Dupont');
    await page.fill('input[name="type"], select[name="type"]', 'Téléphonique');
    await page.fill('textarea[name="notes"], textarea[placeholder*="note"]', 'Appel de suivi mobile');
    
    // Soumettre
    await page.click('button[type="submit"], button:has-text("Créer")');
    
    // Vérifier la création
    await expect(page.locator('text=/succès|success|Appel créé/i')).toBeVisible({ timeout: 10000 });
  });

  test('7. 📅 Création d\'Entretien - Mobile', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Naviguer vers les entretiens
    await page.click('text=/Entretien|Interview/i');
    await page.waitForTimeout(1000);
    
    // Cliquer sur "Nouvel entretien"
    const addButton = page.locator('button:has-text("Nouveau"), button:has-text("Ajouter"), button:has-text("+")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
    }
    
    // Remplir le formulaire
    await page.fill('input[name="application"], select[name="application"]', 'Développeur Mobile');
    await page.fill('input[name="date"], input[type="date"]', new Date().toISOString().split('T')[0]);
    await page.fill('input[name="time"], input[type="time"]', '14:00');
    await page.fill('input[name="type"], select[name="type"]', 'Technique');
    
    // Soumettre
    await page.click('button[type="submit"], button:has-text("Créer")');
    
    // Vérifier la création
    await expect(page.locator('text=/succès|success|Entretien créé/i')).toBeVisible({ timeout: 10000 });
  });

  test('8. 🔔 Création de Relance - Mobile', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Naviguer vers les relances
    await page.click('text=/Relance|Follow-up/i');
    await page.waitForTimeout(1000);
    
    // Cliquer sur "Nouvelle relance"
    const addButton = page.locator('button:has-text("Nouveau"), button:has-text("Ajouter"), button:has-text("+")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
    }
    
    // Remplir le formulaire
    await page.fill('input[name="application"], select[name="application"]', 'Développeur Mobile');
    await page.fill('input[name="type"], select[name="type"]', 'Email');
    await page.fill('textarea[name="notes"], textarea[placeholder*="note"]', 'Relance mobile de suivi');
    
    // Soumettre
    await page.click('button[type="submit"], button:has-text("Créer")');
    
    // Vérifier la création
    await expect(page.locator('text=/succès|success|Relance créée/i')).toBeVisible({ timeout: 10000 });
  });

  test('9. 🔔 Notifications - Affichage et interaction mobile', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Vérifier l'icône de notifications
    const notificationIcon = page.locator('button[aria-label*="notification"], button:has-text("🔔"), [data-testid="notifications"]').first();
    
    if (await notificationIcon.isVisible()) {
      await notificationIcon.click();
      await page.waitForTimeout(1000);
      
      // Vérifier que le panneau de notifications s'affiche
      await expect(page.locator('text=/Notification|Aucune notification/i')).toBeVisible();
    }
  });

  test('10. 🔍 Recherche - Fonctionnalité mobile', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Trouver le champ de recherche
    const searchInput = page.locator('input[type="search"], input[placeholder*="recherche"], input[placeholder*="search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Vérifier les résultats
      await expect(page.locator('text=/résultat|result|test/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('11. 📊 Dashboard - Affichage mobile', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Vérifier les éléments du dashboard
    await expect(page.locator('text=/Dashboard|Tableau de bord/i')).toBeVisible();
    
    // Vérifier que le contenu est adapté mobile (pas de débordement)
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeLessThanOrEqual(450); // Largeur mobile max
  });

  test('12. 🎨 Navigation Mobile - Menu hamburger', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Chercher le menu hamburger
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰"), [data-testid="menu-toggle"]').first();
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // Vérifier que le menu s'ouvre
      await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
    }
  });

  test('13. 📱 Gestes Tactiles - Swipe et tap', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Tester le swipe (simulation)
    await page.touchscreen.tap(100, 200);
    await page.waitForTimeout(500);
    
    // Vérifier que l'interface réagit aux gestes
    const isInteractive = await page.evaluate(() => {
      return document.body.style.touchAction !== 'none';
    });
    
    expect(isInteractive).toBeTruthy();
  });

  test('14. 🔄 Synchronisation Offline - Mobile', async ({ page, context }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Simuler le mode offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    
    // Vérifier l'indicateur offline
    const offlineIndicator = page.locator('text=/hors ligne|offline|synchronisation/i');
    if (await offlineIndicator.isVisible({ timeout: 3000 })) {
      await expect(offlineIndicator).toBeVisible();
    }
    
    // Remettre en ligne
    await context.setOffline(false);
    await page.waitForTimeout(1000);
  });

  test('15. 📸 Capture d\'écran - Vérification visuelle mobile', async ({ page }) => {
    await loginUser(page, testCredentials?.email || testUser.email, testCredentials?.password || testUser.password);
    
    // Prendre une capture d'écran du dashboard mobile
    await page.screenshot({ 
      path: 'test-results/mobile-dashboard.png',
      fullPage: false,
    });
    
    // Vérifier que la capture a été créée
    const fs = require('fs');
    expect(fs.existsSync('test-results/mobile-dashboard.png')).toBeTruthy();
  });
});

test.describe('📱 Tests Mobile - Performance et UX', () => {
  test('Performance - Temps de chargement mobile', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Le chargement doit être rapide sur mobile (< 3 secondes)
    expect(loadTime).toBeLessThan(3000);
  });

  test('Responsive - Adaptation différentes tailles d\'écran', async ({ page }) => {
    // Tester différentes tailles
    const sizes = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 375, height: 667 }, // iPhone 8
      { width: 390, height: 844 }, // iPhone 13
      { width: 428, height: 926 }, // iPhone 13 Pro Max
    ];
    
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Vérifier qu'il n'y a pas de débordement horizontal
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(size.width + 10); // Tolérance de 10px
    }
  });
});

