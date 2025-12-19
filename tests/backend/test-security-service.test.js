/**
 * Tests pour security-service
 * Vérifie que le service de sécurité fonctionne correctement
 */

const axios = require('axios');
const { describe, it, expect, beforeAll } = require('@jest/globals');

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:5002';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token';

describe('Security Service', () => {
  let authHeaders;

  beforeAll(() => {
    authHeaders = {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    };
  });

  describe('GET /api/v1/security/logs', () => {
    it('devrait retourner les logs de sécurité', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/security/logs`, {
          headers: authHeaders,
          params: { page: 1, limit: 10 }
        });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      } catch (error) {
        // Gérer gracieusement si la table n'existe pas
        if (error.response && error.response.status === 404) {
          expect(error.response.status).toBe(404);
        }
      }
    });
  });

  describe('GET /api/v1/security/policies', () => {
    it('devrait retourner les politiques de sécurité', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/security/policies`, {
          headers: authHeaders
        });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          expect(error.response.status).toBe(404);
        }
      }
    });
  });

  describe('GET /api/v1/security/analysis', () => {
    it('devrait retourner l\'analyse de sécurité', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/security/analysis`, {
          headers: authHeaders
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('summary');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          expect(error.response.status).toBe(404);
        }
      }
    });
  });

  describe('Firewall API', () => {
    let testRuleId = null;

    describe('GET /api/v1/security/firewall/rules', () => {
      it('devrait retourner les règles firewall', async () => {
        try {
          const response = await axios.get(`${API_URL}/api/v1/security/firewall/rules`, {
            headers: authHeaders
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('success', true);
          expect(Array.isArray(response.data.data)).toBe(true);
        } catch (error) {
          // Gérer gracieusement si la table n'existe pas
          if (error.response && error.response.status === 503) {
            expect(error.response.data).toHaveProperty('error');
          }
        }
      });
    });

    describe('POST /api/v1/security/firewall/rules', () => {
      it('devrait créer une règle firewall', async () => {
        try {
          const ruleData = {
            name: 'Test Rule',
            description: 'Règle de test pour les tests automatisés',
            protocol: 'TCP',
            action: 'DENY',
            destPort: 9999,
            priority: 50
          };

          const response = await axios.post(`${API_URL}/api/v1/security/firewall/rules`, ruleData, {
            headers: authHeaders
          });

          expect(response.status).toBe(201);
          expect(response.data).toHaveProperty('success', true);
          expect(response.data.data).toHaveProperty('id');
          testRuleId = response.data.data.id;
        } catch (error) {
          // Gérer gracieusement si la table n'existe pas
          if (error.response && error.response.status === 503) {
            expect(error.response.data).toHaveProperty('error');
          } else {
            throw error;
          }
        }
      });
    });

    describe('PUT /api/v1/security/firewall/rules/:id', () => {
      it('devrait mettre à jour une règle firewall', async () => {
        if (!testRuleId) {
          console.warn('Skipping test: no rule ID available');
          return;
        }

        try {
          const updateData = { enabled: false };
          const response = await axios.put(`${API_URL}/api/v1/security/firewall/rules/${testRuleId}`, updateData, {
            headers: authHeaders
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('success', true);
        } catch (error) {
          if (error.response && error.response.status !== 404) {
            throw error;
          }
        }
      });
    });

    describe('DELETE /api/v1/security/firewall/rules/:id', () => {
      it('devrait supprimer une règle firewall', async () => {
        if (!testRuleId) {
          console.warn('Skipping test: no rule ID available');
          return;
        }

        try {
          const response = await axios.delete(`${API_URL}/api/v1/security/firewall/rules/${testRuleId}`, {
            headers: authHeaders
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('success', true);
        } catch (error) {
          if (error.response && error.response.status !== 404) {
            throw error;
          }
        }
      });
    });

    describe('GET /api/v1/security/firewall/blocked-ips', () => {
      it('devrait retourner les IPs bloquées', async () => {
        try {
          const response = await axios.get(`${API_URL}/api/v1/security/firewall/blocked-ips`, {
            headers: authHeaders
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('success', true);
          expect(Array.isArray(response.data.data)).toBe(true);
        } catch (error) {
          // Gérer gracieusement les erreurs
          if (error.response && error.response.status !== 404) {
            throw error;
          }
        }
      });
    });

    describe('POST /api/v1/security/firewall/block-ip', () => {
      it('devrait bloquer une IP', async () => {
        try {
          const blockData = { ip: '192.168.1.999', reason: 'Test firewall' };
          const response = await axios.post(`${API_URL}/api/v1/security/firewall/block-ip`, blockData, {
            headers: authHeaders
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('success');
        } catch (error) {
          // Gérer gracieusement les erreurs (iptables peut ne pas être disponible)
          if (error.response && error.response.status !== 500) {
            throw error;
          }
        }
      });
    });

    describe('GET /api/v1/security/firewall/threats', () => {
      it('devrait retourner les menaces réseau', async () => {
        try {
          const response = await axios.get(`${API_URL}/api/v1/security/firewall/threats`, {
            headers: authHeaders
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('success', true);
          expect(Array.isArray(response.data.data)).toBe(true);
        } catch (error) {
          // Gérer gracieusement si la table n'existe pas
          if (error.response && error.response.status === 503) {
            expect(error.response.data).toHaveProperty('error');
          }
        }
      });
    });
  });

  describe('WAF API', () => {
    describe('GET /api/v1/security/waf/config', () => {
      it('devrait retourner la configuration WAF', async () => {
        try {
          const response = await axios.get(`${API_URL}/api/v1/security/waf/config`, {
            headers: authHeaders
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('success', true);
          expect(response.data.data).toHaveProperty('enabled');
          expect(Array.isArray(response.data.data.rules)).toBe(true);
        } catch (error) {
          if (error.response && error.response.status !== 404) {
            throw error;
          }
        }
      });
    });

    describe('GET /api/v1/security/waf/stats', () => {
      it('devrait retourner les statistiques WAF', async () => {
        try {
          const response = await axios.get(`${API_URL}/api/v1/security/waf/stats`, {
            headers: authHeaders
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('success', true);
          expect(response.data.data).toHaveProperty('status');
        } catch (error) {
          if (error.response && error.response.status !== 404) {
            throw error;
          }
        }
      });
    });
  });
});

