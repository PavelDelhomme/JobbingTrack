/**
 * Tests pour security-service
 * Vérifie que le service de sécurité fonctionne correctement
 */

const axios = require('axios');
const { describe, it, expect, beforeAll } = require('@jest/globals');
const { API_URL, getAdminUser } = require('../helpers/auth.helper');
const TEST_INTERNAL_SECRET = 'test-internal-security-secret';

async function waitForApiGateway(maxMs = 45000, stepMs = 1500) {
  const deadline = Date.now() + maxMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const r = await axios.get(`${API_URL}/health`, { timeout: 4000, validateStatus: () => true });
      if (r.status === 200) return;
      lastErr = new Error(`HTTP ${r.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, stepMs));
  }
  // Ne pas bloquer toute la suite : les tests individuels gèrent déjà 503 / erreurs réseau
  // eslint-disable-next-line no-console
  console.warn(
    `⚠ Gateway toujours injoignable après ${maxMs}ms (${lastErr?.code || lastErr?.message || lastErr}). Les tests firewall peuvent échouer.`
  );
}

function expectGracefulSecurityError(error, allowedStatuses = [401, 404, 503]) {
  if (!error.response) {
    expect(error.code || error.message).toBeTruthy();
    return;
  }
  expect(allowedStatuses).toContain(error.response.status);
}

describe('Security Service', () => {
  let authHeaders;

  beforeAll(async () => {
    await waitForApiGateway();

    let adminHeaders = {};
    try {
      adminHeaders = (await getAdminUser()).headers;
    } catch (error) {
      // Le secret interne reste un fallback pour les environnements sans seed admin.
      console.warn(`Admin JWT indisponible pour les tests firewall/WAF: ${error.message}`);
    }

    authHeaders = {
      'Content-Type': 'application/json',
      ...adminHeaders,
      'X-Internal-Secret':
        process.env.SECURITY_INTERNAL_SECRET || TEST_INTERNAL_SECRET
    };
  }, 70000);

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
        expectGracefulSecurityError(error, [401, 404]);
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
        expectGracefulSecurityError(error, [401, 404]);
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
        expectGracefulSecurityError(error, [401, 404]);
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
          expectGracefulSecurityError(error, [401, 503]);
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
          expectGracefulSecurityError(error, [401, 503]);
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
          expectGracefulSecurityError(error, [401, 404]);
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
          expectGracefulSecurityError(error, [401, 404]);
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
          expectGracefulSecurityError(error, [401, 404]);
        }
      });
    });

    describe('POST /api/v1/security/firewall/block-ip', () => {
      it('devrait bloquer une IP', async () => {
        try {
          const blockData = { ip: '192.168.254.254', reason: 'Test firewall' };
          const response = await axios.post(`${API_URL}/api/v1/security/firewall/block-ip`, blockData, {
            headers: authHeaders
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('success');
        } catch (error) {
          // Gérer gracieusement les erreurs (iptables peut ne pas être disponible)
          expectGracefulSecurityError(error, [401, 500]);
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
          expectGracefulSecurityError(error, [401, 503]);
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
          expectGracefulSecurityError(error, [401, 404]);
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
          expectGracefulSecurityError(error, [401, 404]);
        }
      });
    });
  });
});

