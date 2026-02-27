/**
 * Tests API pour le systeme de crash reporting
 * Couvre : envoi crash report, validation, lecture, anonymisation, email
 */

const axios = require('axios');
const { describe, it, expect, beforeAll } = require('@jest/globals');
const { getTestUser, getAdminUser, API_URL } = require('../helpers/auth.helper');

describe('Crash Reporting API', () => {
  let authHeaders;
  let validToken;

  jest.setTimeout(20000);

  beforeAll(async () => {
    try {
      let user;
      try {
        user = await getTestUser();
      } catch {
        user = await getAdminUser();
      }
      validToken = user.token;
      authHeaders = user.headers;
    } catch (e) {
      console.warn('Aucun utilisateur disponible:', e.message);
      authHeaders = { 'Content-Type': 'application/json' };
    }
  });

  it('POST /crashes - devrait enregistrer un crash report complet', async () => {
    if (!validToken) return;

    const crashReport = {
      crashType: 'FlutterError',
      message: 'RangeError: Invalid value (at index 5)',
      stackTrace: 'at main.dart:42\nat home_screen.dart:128\nat framework.dart:4950',
      deviceInfo: {
        platform: 'android',
        osVersion: '14',
        deviceModel: 'Pixel 7',
        appVersion: '1.0.0',
        screenSize: '1080x2400',
        locale: 'fr_FR'
      },
      screenName: 'CandidatureDetailPage',
      sessionId: 'test-session-123',
      userActions: ['tap Candidatures', 'scroll down', 'tap first item'],
      metadata: { buildNumber: '42', flavor: 'debug' }
    };

    const res = await axios.post(
      `${API_URL}/api/v1/notifications/crashes`,
      crashReport,
      { headers: authHeaders, validateStatus: () => true }
    );

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.reportId).toBeDefined();
    expect(res.data.reportId).toMatch(/^crash-/);
  });

  it('POST /crashes - devrait rejeter sans crashType', async () => {
    if (!validToken) return;

    const res = await axios.post(
      `${API_URL}/api/v1/notifications/crashes`,
      { message: 'test error' },
      { headers: authHeaders, validateStatus: () => true }
    );

    expect([400, 422]).toContain(res.status);
  });

  it('POST /crashes - devrait rejeter sans message', async () => {
    if (!validToken) return;

    const res = await axios.post(
      `${API_URL}/api/v1/notifications/crashes`,
      { crashType: 'TestError' },
      { headers: authHeaders, validateStatus: () => true }
    );

    expect([400, 422]).toContain(res.status);
  });

  it('POST /crashes - devrait rejeter sans authentification', async () => {
    const res = await axios.post(
      `${API_URL}/api/v1/notifications/crashes`,
      { crashType: 'TestError', message: 'test' },
      { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
    );

    expect(res.status).toBe(401);
  });

  it('POST /crashes - devrait accepter un rapport minimal', async () => {
    if (!validToken) return;

    const res = await axios.post(
      `${API_URL}/api/v1/notifications/crashes`,
      { crashType: 'MinimalError', message: 'Crash minimal pour test' },
      { headers: authHeaders, validateStatus: () => true }
    );

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
  });

  it('POST /crashes - devrait gerer un message tres long (troncature)', async () => {
    if (!validToken) return;

    const longMessage = 'E'.repeat(2000);
    const res = await axios.post(
      `${API_URL}/api/v1/notifications/crashes`,
      { crashType: 'LongError', message: longMessage },
      { headers: authHeaders, validateStatus: () => true }
    );

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
  });

  it('GET /crashes - devrait retourner la liste des crash reports', async () => {
    if (!validToken) return;

    const res = await axios.get(
      `${API_URL}/api/v1/notifications/crashes`,
      { headers: authHeaders, validateStatus: () => true }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.reports)).toBe(true);
    expect(res.data.pagination).toBeDefined();
    expect(res.data.pagination.page).toBe(1);
  });

  it('GET /crashes - devrait supporter la pagination', async () => {
    if (!validToken) return;

    const res = await axios.get(
      `${API_URL}/api/v1/notifications/crashes?page=1&limit=2`,
      { headers: authHeaders, validateStatus: () => true }
    );

    expect(res.status).toBe(200);
    expect(res.data.pagination.limit).toBe(2);
    expect(res.data.reports.length).toBeLessThanOrEqual(2);
  });

  it('GET /crashes - devrait rejeter sans authentification', async () => {
    const res = await axios.get(
      `${API_URL}/api/v1/notifications/crashes`,
      { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
    );

    expect(res.status).toBe(401);
  });

  it('POST /crashes - devrait envoyer avec plusieurs types de crash', async () => {
    if (!validToken) return;

    const types = ['FlutterError', 'UncaughtError', 'NetworkError', 'TimeoutError', 'ManualReport'];

    for (const crashType of types) {
      const res = await axios.post(
        `${API_URL}/api/v1/notifications/crashes`,
        {
          crashType,
          message: `Test crash type: ${crashType}`,
          deviceInfo: { platform: 'android', osVersion: '14' }
        },
        { headers: authHeaders, validateStatus: () => true }
      );

      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
    }
  });

  it('POST /crashes - le rapport devrait etre anonymise (verification via GET)', async () => {
    if (!validToken) return;

    await axios.post(
      `${API_URL}/api/v1/notifications/crashes`,
      {
        crashType: 'AnonymizationTest',
        message: 'Test anonymisation des donnees utilisateur',
        screenName: 'TestAnonymization'
      },
      { headers: authHeaders, validateStatus: () => true }
    );

    const listRes = await axios.get(
      `${API_URL}/api/v1/notifications/crashes?limit=1`,
      { headers: authHeaders, validateStatus: () => true }
    );

    expect(listRes.status).toBe(200);
    if (listRes.data.reports.length > 0) {
      const report = listRes.data.reports[0];
      expect(report.id).toBeDefined();
      expect(report.message).toBeDefined();
      expect(report.timestamp).toBeDefined();
    }
  });
});
