/**
 * Tests API pour le systeme de crash reporting (route dediee gateway)
 * Endpoint : POST /api/v1/crashes (API Gateway, sans auth, enregistrement fichier)
 * Couvre : envoi crash report, validation crashType/message, reponse 201 + file
 */

const axios = require('axios');
const { describe, it, expect, beforeAll } = require('@jest/globals');
const { getTestUser, getAdminUser, API_URL } = require('../helpers/auth.helper');

describe('Crash Reporting API (Gateway /api/v1/crashes)', () => {
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
      authHeaders = { ...user.headers, 'Content-Type': 'application/json' };
    } catch (e) {
      console.warn('Aucun utilisateur disponible:', e.message);
      authHeaders = { 'Content-Type': 'application/json' };
    }
  });

  const GATEWAY_CRASH_URL = `${API_URL}/api/v1/crashes`;

  it('POST /api/v1/crashes - devrait enregistrer un crash report complet (sans auth)', async () => {
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

    const res = await axios.post(GATEWAY_CRASH_URL, crashReport, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toBeDefined();
    expect(res.data.file).toBeDefined();
    expect(res.data.file).toMatch(/^crash-/);
  });

  it('POST /api/v1/crashes - devrait rejeter sans crashType', async () => {
    const res = await axios.post(
      GATEWAY_CRASH_URL,
      { message: 'test error' },
      { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
    );

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  });

  it('POST /api/v1/crashes - devrait rejeter sans message', async () => {
    const res = await axios.post(
      GATEWAY_CRASH_URL,
      { crashType: 'TestError' },
      { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
    );

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  });

  it('POST /api/v1/crashes - devrait accepter sans authentification', async () => {
    const res = await axios.post(
      GATEWAY_CRASH_URL,
      { crashType: 'NoAuthTest', message: 'Crash sans token pour test' },
      { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
    );

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.file).toBeDefined();
  });

  it('POST /api/v1/crashes - devrait accepter un rapport minimal', async () => {
    const res = await axios.post(
      GATEWAY_CRASH_URL,
      { crashType: 'MinimalError', message: 'Crash minimal pour test' },
      { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
    );

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.file).toBeDefined();
  });

  it('POST /api/v1/crashes - devrait gerer un message tres long', async () => {
    const longMessage = 'E'.repeat(2000);
    const res = await axios.post(
      GATEWAY_CRASH_URL,
      { crashType: 'LongError', message: longMessage },
      { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
    );

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.file).toBeDefined();
  });

  it('POST /api/v1/crashes - devrait accepter avec token (optionnel)', async () => {
    if (!validToken) return;

    const res = await axios.post(
      GATEWAY_CRASH_URL,
      { crashType: 'WithAuth', message: 'Crash avec token' },
      { headers: authHeaders, validateStatus: () => true }
    );

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.file).toBeDefined();
  });

  it('POST /api/v1/crashes - plusieurs types de crash', async () => {
    const types = ['FlutterError', 'UncaughtError', 'NetworkError', 'TimeoutError', 'ManualReport'];

    for (const crashType of types) {
      const res = await axios.post(
        GATEWAY_CRASH_URL,
        {
          crashType,
          message: `Test crash type: ${crashType}`,
          deviceInfo: { platform: 'android', osVersion: '14' }
        },
        { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
      );

      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.file).toBeDefined();
    }
  });
});
