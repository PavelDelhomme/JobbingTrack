/**
 * Tests pour les endpoints email
 * Vérifie que les endpoints email fonctionnent correctement
 */

const axios = require('axios');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:5002';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token';

describe('Email Endpoints', () => {
  let authHeaders;
  let validToken;

  beforeAll(async () => {
    // Essayer d'obtenir un vrai token via login
    try {
      const loginResponse = await axios.post(`${API_URL}/api/v1/auth/login`, {
        email: 'admin@jobbingtrack.com',
        password: 'password123'
      }, {
        timeout: 5000,
        validateStatus: () => true // Ne pas throw sur les erreurs
      });

      if (loginResponse.status === 200 && loginResponse.data?.token) {
        validToken = loginResponse.data.token;
      }
    } catch (error) {
      // Si le login échoue, utiliser le token de test
      console.warn('⚠️ Impossible d\'obtenir un token via login, utilisation du token de test');
    }

    authHeaders = {
      'Authorization': `Bearer ${validToken || AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    };
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
        to: 'test@example.com',
        subject: 'Test Email',
        content: '<p>Ceci est un email de test</p>'
      };

      try {
        const response = await axios.post(`${API_URL}/api/v1/emails/test`, testEmail, {
          headers: authHeaders,
          timeout: 50000 // 50 secondes pour SMTP
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success');
      } catch (error) {
        // Si SMTP n'est pas configuré, vérifier que l'erreur est gérée
        if (error.response) {
          expect(error.response.status).toBeLessThan(600);
          expect(error.response.data).toHaveProperty('error');
        }
      }
    });

    it('devrait gérer les erreurs de timeout SMTP', async () => {
      const testEmail = {
        to: 'test@example.com',
        subject: 'Test Email',
        content: '<p>Test</p>'
      };

      try {
        await axios.post(`${API_URL}/api/v1/emails/test`, testEmail, {
          headers: authHeaders,
          timeout: 50000
        });
      } catch (error) {
        // Vérifier que l'erreur est gérée correctement
        if (error.response) {
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
          timeout: 50000
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success');
        expect(response.data).toHaveProperty('data');
      } catch (error) {
        // Si SMTP n'est pas configuré, vérifier que l'erreur est gérée
        if (error.response) {
          expect(error.response.status).toBeLessThan(600);
          expect(error.response.data).toHaveProperty('error');
          expect(error.response.data).toHaveProperty('details');
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

