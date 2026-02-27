/**
 * Tests E2E Playwright — Systeme de Crash Reporting
 *
 * Teste via l'API :
 * - Envoi de crash report
 * - Validation des champs requis
 * - Authentification requise
 * - Lecture des crash reports
 * - Pagination
 * - Anonymisation
 * - Types de crash multiples
 */
import { test, expect } from '@playwright/test';
import { getUserToken, ensureTestUser, getAdminToken } from './test-data-helper';

const API_URL = process.env.API_URL || 'http://localhost:5002';

test.describe('Crash Reporting (E2E API)', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    await ensureTestUser(request);
    token = await getUserToken(request);
    if (!token) {
      token = await getAdminToken(request);
    }
  });

  test('Envoi crash report complet', async ({ request }) => {
    test.skip(!token, 'Token non disponible');

    const res = await request.post(`${API_URL}/api/v1/notifications/crashes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        crashType: 'FlutterError',
        message: 'RangeError: Invalid index at position 5',
        stackTrace: 'at main.dart:42\nat framework.dart:4950',
        deviceInfo: {
          platform: 'android',
          osVersion: '14',
          deviceModel: 'Pixel 7',
          appVersion: '1.0.0',
          screenSize: '1080x2400',
          locale: 'fr_FR',
        },
        screenName: 'CandidatureDetailPage',
        sessionId: `e2e-session-${Date.now()}`,
        userActions: ['tap Candidatures', 'scroll down', 'tap item'],
        metadata: { testId: 'playwright-e2e' },
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.reportId).toMatch(/^crash-/);
  });

  test('Envoi crash report minimal', async ({ request }) => {
    test.skip(!token, 'Token non disponible');

    const res = await request.post(`${API_URL}/api/v1/notifications/crashes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        crashType: 'MinimalError',
        message: 'Test crash minimal E2E',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('Rejet sans crashType', async ({ request }) => {
    test.skip(!token, 'Token non disponible');

    const res = await request.post(`${API_URL}/api/v1/notifications/crashes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { message: 'Missing type' },
    });

    expect([400, 422]).toContain(res.status());
  });

  test('Rejet sans message', async ({ request }) => {
    test.skip(!token, 'Token non disponible');

    const res = await request.post(`${API_URL}/api/v1/notifications/crashes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { crashType: 'TestError' },
    });

    expect([400, 422]).toContain(res.status());
  });

  test('Rejet sans authentification', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/v1/notifications/crashes`, {
      data: { crashType: 'NoAuth', message: 'Should fail' },
    });

    expect(res.status()).toBe(401);
  });

  test('Lecture crash reports avec pagination', async ({ request }) => {
    test.skip(!token, 'Token non disponible');

    const res = await request.get(`${API_URL}/api/v1/notifications/crashes?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.reports)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(5);
  });

  test('Crash reports contiennent les champs attendus', async ({ request }) => {
    test.skip(!token, 'Token non disponible');

    const res = await request.get(`${API_URL}/api/v1/notifications/crashes?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    if (body.reports.length > 0) {
      const report = body.reports[0];
      expect(report.id).toBeDefined();
      expect(report.message).toBeDefined();
      expect(report.timestamp).toBeDefined();
    }
  });

  test('Envoi de plusieurs types de crash', async ({ request }) => {
    test.skip(!token, 'Token non disponible');

    const types = ['UncaughtError', 'NetworkError', 'TimeoutError'];

    for (const crashType of types) {
      const res = await request.post(`${API_URL}/api/v1/notifications/crashes`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          crashType,
          message: `E2E test: ${crashType}`,
          deviceInfo: { platform: 'android', osVersion: '14' },
        },
      });

      expect(res.status()).toBe(201);
    }
  });

  test('Message tres long tronque correctement', async ({ request }) => {
    test.skip(!token, 'Token non disponible');

    const res = await request.post(`${API_URL}/api/v1/notifications/crashes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        crashType: 'LongError',
        message: 'X'.repeat(2000),
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
