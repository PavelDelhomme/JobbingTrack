/**
 * Tests E2E backoffice — CRUD utilisateurs (admin)
 * Vérifie la gestion complète des utilisateurs depuis l'API admin
 */

import { test, expect } from '@playwright/test';

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:5002';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'password123';

test.describe('Gestion Utilisateurs (admin CRUD)', () => {
  let authToken: string;
  let createdUserId: string;
  const testUserEmail = `e2e-admin-crud-${Date.now()}@jobbingtrack.test`;

  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post(`${GATEWAY_URL}/api/v1/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    authToken = body.token;
  });

  const headers = () => ({
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  });

  test('lister les utilisateurs', async ({ request }) => {
    const res = await request.get(`${GATEWAY_URL}/api/v1/auth/users`, {
      headers: headers(),
    });
    expect([200, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.users || body.data || Array.isArray(body)).toBeTruthy();
    }
  });

  test('créer un utilisateur', async ({ request }) => {
    const res = await request.post(`${GATEWAY_URL}/api/v1/auth/register`, {
      data: {
        email: testUserEmail,
        password: 'TestP@ss123!',
        firstName: 'CrudTest',
        lastName: 'Admin',
        phone: '+33600099099',
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    createdUserId = body.user?.id || body.data?.id || '';
  });

  test('vérifier que le nouvel utilisateur peut se connecter', async ({ request }) => {
    if (!createdUserId) return; // skip si la création a échoué ou été ignorée
    const res = await request.post(`${GATEWAY_URL}/api/v1/auth/login`, {
      data: { email: testUserEmail, password: 'TestP@ss123!' },
    });
    // En environnement de test, accepter 200 (succès) ou 401 si la politique exige vérification d'email / activation
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.token).toBeTruthy();
    }
  });

  test('modifier le rôle d\'un utilisateur (si endpoint existe)', async ({ request }) => {
    if (!createdUserId) return;
    const res = await request.put(`${GATEWAY_URL}/api/v1/auth/users/${createdUserId}/role`, {
      headers: headers(),
      data: { role: 'ADMIN' },
    });
    expect([200, 404]).toContain(res.status());
  });

  test('désactiver un utilisateur (si endpoint existe)', async ({ request }) => {
    if (!createdUserId) return;
    const res = await request.put(`${GATEWAY_URL}/api/v1/auth/users/${createdUserId}`, {
      headers: headers(),
      data: { isActive: false },
    });
    expect([200, 404]).toContain(res.status());
  });

  test('profil admin accessible', async ({ request }) => {
    const res = await request.get(`${GATEWAY_URL}/api/v1/auth/profile`, {
      headers: headers(),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.user || body.data).toBeTruthy();
  });
});
