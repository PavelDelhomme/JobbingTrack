import { test, expect } from '@playwright/test';

test.describe('🔗 API Critiques - Tests d\'intégration', () => {
  test.beforeEach(async ({ page }) => {
    // Configuration de base pour les tests API
    await page.goto('/');
  });

  test('devrait vérifier la santé de l\'API Gateway', async ({ page }) => {
    // Test de l'endpoint de santé
    const response = await page.request.get('/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('OK');
    expect(data.environment).toBeDefined();
    expect(data.version).toBeDefined();
  });

  test('devrait tester la connectivité avec tous les services backend', async ({ page }) => {
    // Test de connectivité avec chaque service
    const services = [
      'auth-service',
      'application-service',
      'company-service',
      'contact-service',
      'interview-service',
      'notification-service',
      'dashboard-service',
      'call-service',
      'profile-service',
      'event-service',
      'followup-service'
    ];

    for (const service of services) {
      const response = await page.request.get(`/health`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.services).toBeDefined();
      expect(data.services[service.replace('-service', '')]).toBeDefined();
    }
  });

  test('devrait gérer les erreurs d\'authentification', async ({ page }) => {
    // Test d'accès non autorisé à une route protégée
    const response = await page.request.get('/api/v1/auth/users');
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('devrait gérer les erreurs 404 pour les routes inexistantes', async ({ page }) => {
    // Test d'accès à une route API inexistante
    const response = await page.request.get('/api/v1/route-inexistante');
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('Route non trouvée');
    expect(data.availableRoutes).toBeDefined();
  });

  test('devrait gérer les timeouts de requête', async ({ page }) => {
    // Test de timeout avec une requête lente (si configuré)
    const startTime = Date.now();

    try {
      await page.request.get('/api/v1/auth/users', { timeout: 1000 });
    } catch (error) {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(2000); // Moins de 2 secondes pour l'erreur
    }
  });

  test('devrait tester la validation des données d\'entrée', async ({ page }) => {
    // Test de validation avec des données invalides
    const response = await page.request.post('/api/v1/auth/login', {
      data: {
        email: 'invalid-email',
        password: '' // Mot de passe vide
      }
    });

    expect([400, 422]).toContain(response.status()); // Bad Request ou Unprocessable Entity

    const data = await response.json();
    expect(data.error || data.message).toBeDefined();
  });

  test('devrait tester la sécurité CORS', async ({ page }) => {
    // Test des headers CORS
    const response = await page.request.get('/health');
    expect(response.ok()).toBeTruthy();

    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeDefined();
    expect(headers['access-control-allow-methods']).toBeDefined();
    expect(headers['access-control-allow-headers']).toBeDefined();
  });

  test('devrait tester la gestion des headers de sécurité', async ({ page }) => {
    // Test des headers de sécurité
    const response = await page.request.get('/health');
    expect(response.ok()).toBeTruthy();

    const headers = response.headers();

    // Vérifier les headers de sécurité
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-xss-protection']).toBeDefined();
  });

  test('devrait tester la gestion des erreurs serveur', async ({ page }) => {
    // Test d'une erreur serveur simulée
    const response = await page.request.get('/api/v1/auth/test-error');
    expect(response.status()).toBe(500);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('devrait tester la pagination des données', async ({ page }) => {
    // Test de la pagination (si implémentée)
    const response = await page.request.get('/api/v1/applications?page=1&limit=10');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.pagination || data.total).toBeDefined();
  });

  test('devrait tester les filtres et tri des données', async ({ page }) => {
    // Test des fonctionnalités de filtrage et tri
    const response = await page.request.get('/api/v1/applications?status=active&sort=createdAt&order=desc');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data.applications)).toBeTruthy();
  });

  test('devrait tester l\'export de données', async ({ page }) => {
    // Test de l'export de données (si implémenté)
    const response = await page.request.get('/api/v1/applications/export?format=csv');
    expect(response.ok()).toBeTruthy();

    expect(response.headers()['content-type']).toContain('csv');
  });
});
