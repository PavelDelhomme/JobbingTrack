import { test, expect } from '@playwright/test';
import config from './test-config.js';

test.describe('👤 Expérience Utilisateur - Tests pour utilisateurs normaux', () => {
  test('📱 Application mobile accessible aux utilisateurs', async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto('http://localhost:8090');

    // Vérifier que l'application se charge
    await expect(page.locator('text=JobbingTrack')).toBeVisible({ timeout: 15000 });

    // Tester la connexion avec un utilisateur normal (pas admin)
    await page.fill('input[type="email"]', 'user1@jobbingtrack.test');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Se connecter")');

    // Vérifier la redirection vers l'accueil utilisateur
    await expect(page.locator('text=Bonjour 👋')).toBeVisible({ timeout: 10000 });
  });

  test('🏠 Navigation utilisateur dans l\'accueil', async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto('http://localhost:8090');

    // Se connecter comme utilisateur normal
    await page.fill('input[type="email"]', 'user1@jobbingtrack.test');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Se connecter")');

    // Vérifier la redirection
    await expect(page.locator('text=Bonjour 👋')).toBeVisible({ timeout: 10000 });

    // Vérifier que l'utilisateur voit ses statistiques personnelles
    await expect(page.locator('text=5')).toBeVisible(); // Ses candidatures
    await expect(page.locator('text=2')).toBeVisible(); // Ses entretiens

    // Vérifier les actions rapides disponibles pour l'utilisateur
    await expect(page.locator('text=📝')).toBeVisible(); // Candidatures
    await expect(page.locator('text=🏢')).toBeVisible(); // Entreprises
    await expect(page.locator('text=👤')).toBeVisible(); // Contacts
    await expect(page.locator('text=📅')).toBeVisible(); // Entretiens
  });

  test('📋 Navigation par onglets utilisateur', async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto('http://localhost:8090');

    // Se connecter comme utilisateur normal
    await page.fill('input[type="email"]', 'user1@jobbingtrack.test');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Se connecter")');

    // Vérifier la redirection
    await expect(page.locator('text=Bonjour 👋')).toBeVisible({ timeout: 10000 });

    // Vérifier la bottom navigation pour utilisateur
    await expect(page.locator('text=Accueil')).toBeVisible();
    await expect(page.locator('text=Candidatures')).toBeVisible();
    await expect(page.locator('text=Entretiens')).toBeVisible();
    await expect(page.locator('text=Profil')).toBeVisible();

    // Naviguer vers les candidatures
    await page.click('text=Candidatures');
    await expect(page.locator('text=Candidatures')).toBeVisible();

    // Naviguer vers les entretiens
    await page.click('text=Entretiens');
    await expect(page.locator('text=Entretiens')).toBeVisible();

    // Naviguer vers le profil
    await page.click('text=Profil');
    await expect(page.locator('text=Profil')).toBeVisible();

    // Retourner à l'accueil
    await page.click('text=Accueil');
    await expect(page.locator('text=Bonjour 👋')).toBeVisible();
  });

  test('🔄 Test des différents comptes utilisateur normaux', async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto('http://localhost:8090');

    // Tester les différents comptes utilisateur normaux
    const testAccounts = [
      { email: 'user1@jobbingtrack.test', name: 'User 1' },
      { email: 'user2@jobbingtrack.test', name: 'User 2' },
      { email: 'user3@jobbingtrack.test', name: 'User 3' }
    ];

    for (const account of testAccounts) {
      // Recharger la page pour chaque test
      await page.reload();

      // Se connecter avec le compte actuel
      await page.fill('input[type="email"]', account.email);
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Se connecter")');

      // Vérifier la connexion réussie
      await expect(page.locator('text=Bonjour 👋')).toBeVisible({ timeout: 10000 });

      // Vérifier que l'utilisateur voit ses propres données
      await expect(page.locator('text=5')).toBeVisible(); // Candidatures
      await expect(page.locator('text=2')).toBeVisible(); // Entretiens

      // Se déconnecter
      await page.click('[data-testid="logout-button"]');
      await expect(page.locator('text=JobbingTrack')).toBeVisible();
    }
  });

  test('📊 Interface responsive pour utilisateurs', async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto('http://localhost:8090');

    // Se connecter comme utilisateur normal
    await page.fill('input[type="email"]', 'user1@jobbingtrack.test');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Se connecter")');

    // Attendre la redirection
    await expect(page.locator('text=Bonjour 👋')).toBeVisible({ timeout: 10000 });

    // Tester différentes tailles d'écran utilisateur
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await expect(page.locator('text=Bonjour 👋')).toBeVisible();

    await page.setViewportSize({ width: 414, height: 896 }); // iPhone 11
    await expect(page.locator('text=Bonjour 👋')).toBeVisible();

    await page.setViewportSize({ width: 393, height: 851 }); // iPhone 14
    await expect(page.locator('text=Bonjour 👋')).toBeVisible();
  });

  test('🔄 Synchronisation offline pour utilisateurs', async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto('http://localhost:8090');

    // Se connecter comme utilisateur normal
    await page.fill('input[type="email"]', 'user1@jobbingtrack.test');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Se connecter")');

    // Attendre la redirection
    await expect(page.locator('text=Bonjour 👋')).toBeVisible({ timeout: 10000 });

    // Tester la synchronisation offline
    // Simuler la perte de connexion
    await page.route('**/*', route => {
      if (route.request().url().includes('localhost:3000') ||
          route.request().url().includes('localhost:3001')) {
        route.abort('connectionfailed');
      } else {
        route.continue();
      }
    });

    // Vérifier que l'indicateur offline s'affiche
    await expect(page.locator('text=Offline')).toBeVisible({ timeout: 5000 });

    // Restaurer la connexion
    await page.unroute('**/*');

    // Vérifier que l'indicateur offline disparaît
    await expect(page.locator('text=Offline')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('🔗 API pour utilisateurs normaux', () => {
  test('📡 Connexion API utilisateur normal', async ({ request }) => {
    // Tester l'API avec un utilisateur normal (pas admin)
    const response = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: 'user1@jobbingtrack.test',
        password: 'password123'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('user1@jobbingtrack.test');
    expect(data.user.role).not.toBe('SUPER_ADMIN'); // Pas admin
  });

  test('📋 Accès aux données utilisateur normal', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: 'user1@jobbingtrack.test',
        password: 'password123'
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Tester l'accès aux candidatures (données utilisateur)
    const applicationsResponse = await request.get(`${config.apiUrl}/api/v1/applications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    expect(applicationsResponse.ok()).toBeTruthy();
  });

  test('🚫 Accès restreint aux données admin', async ({ request }) => {
    // Se connecter comme utilisateur normal
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: 'user1@jobbingtrack.test',
        password: 'password123'
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Tenter d'accéder aux utilisateurs (données admin)
    const usersResponse = await request.get(`${config.apiUrl}/api/v1/auth/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Devrait être refusé (403 Forbidden ou 401 Unauthorized)
    expect(usersResponse.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('🎯 Performance utilisateur', () => {
  test('⚡ Temps de chargement utilisateur', async ({ page }) => {
    const startTime = Date.now();

    // Naviguer vers l'application mobile
    await page.goto('http://localhost:8090');

    // Attendre que l'application se charge complètement
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Le temps de chargement doit être raisonnable (< 5 secondes)
    expect(loadTime).toBeLessThan(5000);
    console.log(`Temps de chargement utilisateur: ${loadTime}ms`);
  });

  test('📊 Performance navigation utilisateur', async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto('http://localhost:8090');

    // Se connecter comme utilisateur normal
    await page.fill('input[type="email"]', 'user1@jobbingtrack.test');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Se connecter")');

    // Attendre la redirection
    await expect(page.locator('text=Bonjour 👋')).toBeVisible({ timeout: 10000 });

    // Mesurer les performances de navigation
    const navStartTime = Date.now();

    // Naviguer vers les candidatures
    await page.click('text=Candidatures');
    await page.click('text=Accueil');

    const navTime = Date.now() - navStartTime;
    expect(navTime).toBeLessThan(2000);
    console.log(`Performance navigation utilisateur: ${navTime}ms`);
  });
});
