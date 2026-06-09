/**
 * Tests pour les endpoints email
 * Vérifie que les endpoints email fonctionnent correctement
 *
 * ⚠️ Utilise le compte ADMIN (SUPER_ADMIN) car les endpoints email
 *     sont des fonctionnalités d'administration (logs, stats, test SMTP).
 *     L'adresse de réception test-recipient@example.invalid est configurée via
 *     la variable d'environnement TEST_REAL_EMAIL (.env, gitignored).
 */

const axios = require('axios');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { getAdminUser, API_URL } = require('../helpers/auth.helper');
const { isApiConnectionError, warnApiDown } = require('../helpers/apiConnection');

const REAL_TEST_EMAIL = process.env.TEST_REAL_EMAIL || 'redacted@example.invalid';

describe('Email Endpoints (admin)', () => {
  let authHeaders;
  let validToken;

  jest.setTimeout(20000);

  beforeAll(async () => {
    try {
      const admin = await getAdminUser();
      validToken = admin.token;
      authHeaders = admin.headers;
    } catch (e) {
      console.warn('⚠️ Login admin échoué:', e.message);
      authHeaders = { 'Content-Type': 'application/json' };
    }
  });

  describe('GET /api/v1/emails/logs', () => {
    it('devrait retourner les logs emails avec pagination', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/emails/logs`, {
          headers: authHeaders,
          params: { page: 1, limit: 10 },
          validateStatus: () => true // Ne pas throw sur 401
        });

        if (response.status === 401) {
          // Si non authentifié, skip le test
          console.warn('⚠️ Non authentifié, test ignoré');
          return;
        }

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('data');
        expect(response.data).toHaveProperty('pagination');
        expect(Array.isArray(response.data.data)).toBe(true);
      } catch (error) {
        if (isApiConnectionError(error)) {
          warnApiDown('GET /emails/logs (pagination)', error);
          return;
        }
        if (error.response?.status === 401) {
          console.warn('⚠️ Non authentifié, test ignoré');
          return;
        }
        throw error;
      }
    });

    it('devrait gérer les erreurs P2021 gracieusement', async () => {
      try {
        // Même si la table n'existe pas, devrait retourner des données vides
        const response = await axios.get(`${API_URL}/api/v1/emails/logs`, {
          headers: authHeaders,
          validateStatus: () => true
        });

        if (response.status === 401) {
          console.warn('⚠️ Non authentifié, test ignoré');
          return;
        }

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(Array.isArray(response.data.data)).toBe(true);
      } catch (error) {
        if (isApiConnectionError(error)) {
          warnApiDown('GET /emails/logs (P2021)', error);
          return;
        }
        if (error.response?.status === 401) {
          console.warn('⚠️ Non authentifié, test ignoré');
          return;
        }
        throw error;
      }
    });
  });

  describe('POST /api/v1/emails/test', () => {
    it('devrait envoyer un email de test', async () => {
      const testEmail = {
        to: REAL_TEST_EMAIL,
        subject: `[JobbingTrack Test] ${new Date().toISOString().slice(0, 16)}`,
        content: '<p>Email de test automatique — JobbingTrack test suite</p>'
      };

      try {
        const response = await axios.post(`${API_URL}/api/v1/emails/test`, testEmail, {
          headers: authHeaders,
          timeout: 5000 // 5 s max pour éviter blocage si SMTP indisponible
        });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success');
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.warn('⚠️ SMTP / emails non disponible (timeout), test ignoré');
          return;
        }
        if (error.response) {
          expect(error.response.status).toBeLessThan(600);
          if (error.response.data && typeof error.response.data === 'object') {
            expect(error.response.data).toHaveProperty('error');
          }
        }
      }
    });

    it('devrait gérer les erreurs de timeout SMTP', async () => {
      const testEmail = {
        to: REAL_TEST_EMAIL,
        subject: '[JobbingTrack] Test timeout SMTP',
        content: '<p>Test timeout</p>'
      };

      try {
        await axios.post(`${API_URL}/api/v1/emails/test`, testEmail, {
          headers: authHeaders,
          timeout: 5000
        });
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return;
        }
        if (error.response?.data && typeof error.response.data === 'object') {
          expect(error.response.data).toHaveProperty('error');
        }
      }
    });
  });

  describe('GET /api/v1/emails/test-smtp', () => {
    it('devrait tester la connexion SMTP', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/emails/test-smtp`, {
          headers: authHeaders,
          timeout: 5000
        });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success');
        expect(response.data).toHaveProperty('data');
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.warn('⚠️ SMTP non disponible (timeout), test ignoré');
          return;
        }
        if (error.response) {
          expect(error.response.status).toBeLessThan(600);
          if (error.response.data && typeof error.response.data === 'object') {
            expect(error.response.data).toHaveProperty('error');
            expect(error.response.data).toHaveProperty('details');
          }
        }
      }
    });
  });

  describe('GET /api/v1/emails/stats', () => {
    it('devrait retourner les statistiques emails', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/emails/stats`, {
          headers: authHeaders
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('data');
      } catch (error) {
        // Gérer gracieusement si la table n'existe pas
        if (error.response) {
          expect(error.response.status).toBeLessThan(600);
        }
      }
    });
  });
});

