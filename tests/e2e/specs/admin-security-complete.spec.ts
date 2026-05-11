/**
 * Tests E2E backoffice sécurité complets
 * Pages : Firewall, Menaces réseau, Logs sécurité, Politique, Configuration WAF
 *
 * Utilise un ADMIN (SUPER_ADMIN) — fonctionnalités administration
 */

import { test, expect } from '@playwright/test';
import { e2eGatewayBaseUrl } from '../helpers/gatewayUrl';

const GATEWAY_URL = e2eGatewayBaseUrl();
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'password123';

test.describe('Sécurité Backoffice Complet (admin)', () => {
  let authToken: string;

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

  test.describe('Firewall — CRUD règles', () => {
    let ruleId: string;

    test('lister les règles firewall', async ({ request }) => {
      const res = await request.get(`${GATEWAY_URL}/api/v1/security/firewall/rules`, {
        headers: headers(),
      });
      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(data.success || Array.isArray(data.rules || data.data)).toBeTruthy();
    });

    test('créer une règle firewall', async ({ request }) => {
      const res = await request.post(`${GATEWAY_URL}/api/v1/security/firewall/rules`, {
        headers: headers(),
        data: {
          name: `E2E-Rule-${Date.now()}`,
          description: 'E2E test rule',
          sourceIp: '192.168.99.99',
          protocol: 'TCP',
          action: 'DENY',
          priority: 100,
        },
      });
      expect([200, 201]).toContain(res.status());
      const body = await res.json();
      ruleId = body.rule?.id || body.data?.id || body.id || '';
    });

    test('modifier une règle firewall', async ({ request }) => {
      if (!ruleId) return;
      const res = await request.put(`${GATEWAY_URL}/api/v1/security/firewall/rules/${ruleId}`, {
        headers: headers(),
        data: { enabled: false, priority: 200 },
      });
      expect(res.status()).toBe(200);
    });

    test('supprimer une règle firewall', async ({ request }) => {
      if (!ruleId) return;
      const res = await request.delete(`${GATEWAY_URL}/api/v1/security/firewall/rules/${ruleId}`, {
        headers: headers(),
      });
      expect(res.status()).toBe(200);
    });
  });

  test.describe('IPs bloquées', () => {
    const testIp = '10.99.99.99';

    test('lister les IPs bloquées', async ({ request }) => {
      const res = await request.get(`${GATEWAY_URL}/api/v1/security/firewall/blocked-ips`, {
        headers: headers(),
      });
      expect(res.status()).toBe(200);
    });

    test('bloquer puis débloquer une IP', async ({ request }) => {
      const blockRes = await request.post(`${GATEWAY_URL}/api/v1/security/firewall/block-ip`, {
        headers: headers(),
        data: { ip: testIp, reason: 'E2E test' },
      });
      expect(blockRes.status()).toBe(200);

      const unblockRes = await request.post(`${GATEWAY_URL}/api/v1/security/firewall/unblock-ip`, {
        headers: headers(),
        data: { ip: testIp },
      });
      expect(unblockRes.status()).toBe(200);
    });
  });

  test.describe('Menaces réseau', () => {
    test('lister les menaces', async ({ request }) => {
      const res = await request.get(`${GATEWAY_URL}/api/v1/security/firewall/threats`, {
        headers: headers(),
      });
      expect(res.status()).toBe(200);
    });

    test('créer une menace de test', async ({ request }) => {
      const res = await request.post(`${GATEWAY_URL}/api/v1/security/firewall/threats`, {
        headers: headers(),
        data: {
          threatType: 'SUSPICIOUS_REQUEST',
          sourceIp: '10.0.0.99',
          severity: 'LOW',
          metadata: { description: 'E2E test threat' },
        },
      });
      expect([200, 201]).toContain(res.status());
    });

    test('statistiques réseau', async ({ request }) => {
      const res = await request.get(`${GATEWAY_URL}/api/v1/security/firewall/network/stats`, {
        headers: headers(),
      });
      expect(res.status()).toBe(200);
    });
  });

  test.describe('WAF (Web Application Firewall)', () => {
    test('configuration WAF', async ({ request }) => {
      const res = await request.get(`${GATEWAY_URL}/api/v1/security/waf/config`, {
        headers: headers(),
      });
      expect(res.status()).toBe(200);
    });

    test('statistiques WAF', async ({ request }) => {
      const res = await request.get(`${GATEWAY_URL}/api/v1/security/waf/stats`, {
        headers: headers(),
      });
      expect(res.status()).toBe(200);
    });

    test('activer/désactiver WAF', async ({ request }) => {
      const res = await request.put(`${GATEWAY_URL}/api/v1/security/waf/toggle`, {
        headers: headers(),
        data: { enabled: true },
      });
      expect(res.status()).toBe(200);
    });
  });

  test.describe('Logs de sécurité', () => {
    test('récupérer les logs de sécurité', async ({ request }) => {
      const res = await request.get(`${GATEWAY_URL}/api/v1/security/logs`, {
        headers: headers(),
      });
      expect(res.status()).toBe(200);
    });

    test('récupérer les alertes', async ({ request }) => {
      const res = await request.get(`${GATEWAY_URL}/api/v1/security/alerts`, {
        headers: headers(),
      });
      expect([200, 404]).toContain(res.status());
    });
  });
});
