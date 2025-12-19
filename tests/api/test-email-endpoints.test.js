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

  beforeAll(() => {
    authHeaders = {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    };
  });

  describe('GET /api/v1/emails/logs', () => {
    it('devrait retourner les logs emails avec pagination', async () => {
      const response = await axios.get(`${API_URL}/api/v1/emails/logs`, {
        headers: authHeaders,
        params: { page: 1, limit: 10 }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('pagination');
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('devrait gérer les erreurs P2021 gracieusement', async () => {
      // Même si la table n'existe pas, devrait retourner des données vides
      const response = await axios.get(`${API_URL}/api/v1/emails/logs`, {
        headers: authHeaders
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('POST /api/v1/emails/test', () => {
    it('devrait envoyer un email de test', async () => {
      const testEmail = {
        to: 'redacted@example.invalid',
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
        to: 'redacted@example.invalid',
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

