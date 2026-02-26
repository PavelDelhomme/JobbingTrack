import { test, expect } from '@playwright/test';
import config from './test-config.js';

// Headers de test pour identifier les requêtes de test
const testHeaders = {
  'User-Agent': 'Playwright-Test/1.0',
  'X-Test-Mode': 'true'
};

// Tests API fonctionnels — utilise un utilisateur classique (rôle USER)
test.describe('🔗 Tests API uniquement - Fonctionnalités Backend', () => {
  test.beforeAll(async ({ request }) => {
    // Register the test user (regular USER) before running API tests
    await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password,
        firstName: config.testUser.firstName,
        lastName: config.testUser.lastName,
        phone: '+33600000000'
      }
    });
  });
  test('📡 Authentification API', async ({ request }) => {
    // Test de l'API d'authentification
    const response = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      },
      headers: testHeaders
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe(config.testUser.email);
  });

  test('👤 Récupération du profil utilisateur', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Récupérer le profil
    const profileResponse = await request.get(`${config.apiUrl}/api/v1/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...testHeaders
      }
    });

    expect(profileResponse.ok()).toBeTruthy();
    const profileData = await profileResponse.json();
    expect(profileData.user.email).toBe(config.testUser.email);
  });

  test('🏢 Récupération des entreprises', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Récupérer les entreprises
    const companiesResponse = await request.get(`${config.apiUrl}/api/v1/companies`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...testHeaders
      }
    });

    expect(companiesResponse.ok()).toBeTruthy();
  });

  test('📝 Récupération des candidatures', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Récupérer les candidatures
    const applicationsResponse = await request.get(`${config.apiUrl}/api/v1/applications`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...testHeaders
      }
    });

    expect(applicationsResponse.ok()).toBeTruthy();
  });

  test('👥 Récupération des contacts', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Récupérer les contacts
    const contactsResponse = await request.get(`${config.apiUrl}/api/v1/contacts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...testHeaders
      }
    });

    expect(contactsResponse.ok()).toBeTruthy();
  });

  test('📅 Récupération des entretiens', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Récupérer les entretiens
    const interviewsResponse = await request.get(`${config.apiUrl}/api/v1/interviews`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...testHeaders
      }
    });

    expect(interviewsResponse.ok()).toBeTruthy();
  });

  test('📞 Récupération des appels', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Récupérer les appels
    const callsResponse = await request.get(`${config.apiUrl}/api/v1/calls`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...testHeaders
      }
    });

    expect(callsResponse.ok()).toBeTruthy();
  });

  test('🔔 Récupération des notifications', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Récupérer les notifications
    const notificationsResponse = await request.get(`${config.apiUrl}/api/v1/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...testHeaders
      }
    });

    expect(notificationsResponse.ok()).toBeTruthy();
  });

  test('📊 Récupération du dashboard', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Récupérer les KPIs du dashboard
    const dashboardResponse = await request.get(`${config.apiUrl}/api/v1/dashboard/kpis`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...testHeaders
      }
    });

    expect(dashboardResponse.ok()).toBeTruthy();
  });

  test('🔍 Recherche globale', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Effectuer une recherche
    const searchResponse = await request.get(`${config.apiUrl}/api/v1/search?query=test`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...testHeaders
      }
    });

    expect(searchResponse.ok()).toBeTruthy();
  });

  test('📈 Métriques système', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Récupérer les métriques système
    const metricsResponse = await request.get(`${config.apiUrl}/api/v1/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...testHeaders
      }
    });

    expect(metricsResponse.ok()).toBeTruthy();
  });

  test('🎯 Test de santé des services', async ({ request }) => {
    // Tester le endpoint de santé
    const healthResponse = await request.get(`${config.apiUrl}/health`);
    expect(healthResponse.ok()).toBeTruthy();

    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('OK');
  });
});

test.describe('🚫 Tests de sécurité API', () => {
  test('🔒 Accès sans authentification', async ({ request }) => {
    // Tenter d'accéder aux données sans token
    const response = await request.get(`${config.apiUrl}/api/v1/applications`, {
      headers: testHeaders
    });
    expect(response.status()).toBe(401);
  });

  test('🔑 Token invalide', async ({ request }) => {
    // Tenter d'accéder avec un token invalide
    const response = await request.get(`${config.apiUrl}/api/v1/applications`, {
      headers: {
        'Authorization': 'Bearer invalid-token',
        ...testHeaders
      }
    });

    expect(response.status()).toBe(401);
  });

  test('🚪 Accès à des endpoints admin avec utilisateur normal', async ({ request }) => {
    // Se connecter comme utilisateur normal
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: 'user1@jobbingtrack.test',
        password: 'password123'
      },
      headers: testHeaders
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Tenter d'accéder aux utilisateurs admin
    const usersResponse = await request.get(`${config.apiUrl}/api/v1/auth/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...testHeaders
      }
    });

    // Devrait être refusé
    expect(usersResponse.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('📊 Tests de performance API', () => {
  test('⚡ Performance des requêtes API', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      },
      headers: testHeaders
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Mesurer le temps de plusieurs requêtes
    const startTime = Date.now();

    // Requêtes parallèles
    const requests = [
      request.get(`${config.apiUrl}/api/v1/companies`, { headers: { 'Authorization': `Bearer ${token}`, ...testHeaders } }),
      request.get(`${config.apiUrl}/api/v1/contacts`, { headers: { 'Authorization': `Bearer ${token}`, ...testHeaders } }),
      request.get(`${config.apiUrl}/api/v1/applications`, { headers: { 'Authorization': `Bearer ${token}`, ...testHeaders } }),
      request.get(`${config.apiUrl}/api/v1/dashboard/kpis`, { headers: { 'Authorization': `Bearer ${token}`, ...testHeaders } })
    ];

    const responses = await Promise.all(requests);
    const endTime = Date.now();

    // Toutes les requêtes doivent réussir
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });

    // Le temps total doit être raisonnable
    const totalTime = endTime - startTime;
    expect(totalTime).toBeLessThan(5000); // Moins de 5 secondes
    console.log(`Temps total pour 4 requêtes parallèles: ${totalTime}ms`);
  });

  test('🔄 Test de charge API', async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: config.testUser.email,
        password: config.testUser.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Effectuer plusieurs requêtes en série
    const endpoints = [
      `${config.apiUrl}/api/v1/companies`,
      `${config.apiUrl}/api/v1/contacts`,
      `${config.apiUrl}/api/v1/applications`,
      `${config.apiUrl}/api/v1/dashboard/kpis`
    ];

    const startTime = Date.now();

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint, {
        headers: { 'Authorization': `Bearer ${token}`, ...testHeaders }
      });
      expect(response.ok()).toBeTruthy();
    }

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(3000); // Moins de 3 secondes pour 4 requêtes
    console.log(`Temps total pour 4 requêtes en série: ${totalTime}ms`);
  });
});
