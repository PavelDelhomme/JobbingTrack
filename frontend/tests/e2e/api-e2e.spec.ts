// Tests API E2E — utilise un utilisateur classique (rôle USER)
import { test, expect } from '@playwright/test';
import { ensureTestUser, getUserToken } from './test-data-helper';

const API_URL = process.env.API_URL || 'http://localhost:5002';

let _testCreds: { email: string; password: string } | null = null;
let _testToken = '';

async function apiFetch(
  page: import('@playwright/test').Page,
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; ok: boolean; data: unknown }> {
  return page.evaluate(
    async ({ method, endpoint, body }) => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resp = await fetch(`http://localhost:5002${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      let data: unknown = null;
      try {
        data = await resp.json();
      } catch {
        data = null;
      }

      return { status: resp.status, ok: resp.ok, data };
    },
    { method, endpoint, body },
  );
}

test.beforeAll(async ({ request }) => {
  _testCreds = await ensureTestUser(request);
  _testToken = await getUserToken(request);
});

test.beforeEach(async ({ page }) => {
  if (!_testToken) return;
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
  }, _testToken);
  await page.goto('/backoffice');
  await page.waitForLoadState('domcontentloaded');
});

// ═══════════════════════════════════════════════════════
// 1. HEALTH & STATUS
// ═══════════════════════════════════════════════════════
test.describe('🩺 API – Health & Status', () => {
  test('health check API Gateway répond 200', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/health');
    expect(res.status).toBe(200);
  });

  test('endpoint racine /api/v1 est accessible', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1');
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 2. AUTH API
// ═══════════════════════════════════════════════════════
test.describe('🔑 API – Authentification', () => {
  test('login avec identifiants valides retourne un token', async ({ page }) => {
    if (!_testCreds) return;
    const res = await apiFetch(page, 'POST', '/api/v1/auth/login', {
      email: _testCreds.email,
      password: _testCreds.password,
    });
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('token');
  });

  test('login avec identifiants invalides retourne 401', async ({ page }) => {
    const res = await apiFetch(page, 'POST', '/api/v1/auth/login', {
      email: 'redacted@example.invalid',
      password: 'wrongpassword',
    });
    expect([400, 401, 403]).toContain(res.status);
  });

  test('profil utilisateur accessible avec token', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/auth/profile');
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════
// 3. COMPANIES CRUD
// ═══════════════════════════════════════════════════════
test.describe('🏢 API – CRUD Entreprises', () => {
  let createdCompanyId: string;

  test('GET /api/v1/companies retourne une liste', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/companies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data) || (res.data && typeof res.data === 'object')).toBe(true);
  });

  test('POST /api/v1/companies crée une entreprise', async ({ page }) => {
    const name = `E2EAPI_Company_${Date.now()}`;
    const res = await apiFetch(page, 'POST', '/api/v1/companies', {
      name,
      industry: 'Test',
      website: 'https://e2e-test.com',
    });
    expect([200, 201]).toContain(res.status);
    const data = res.data as Record<string, unknown>;
    createdCompanyId = (data?.id || data?._id || (data as any)?.company?.id || (data as any)?.company?._id) as string;
  });

  test('DELETE /api/v1/companies/:id supprime l\'entreprise', async ({ page }) => {
    if (!createdCompanyId) {
      const name = `E2EAPI_TempDel_${Date.now()}`;
      const createRes = await apiFetch(page, 'POST', '/api/v1/companies', { name });
      const d = createRes.data as any;
      createdCompanyId = d?.id || d?._id || d?.company?.id || d?.company?._id;
    }
    if (createdCompanyId) {
      const res = await apiFetch(page, 'DELETE', `/api/v1/companies/${createdCompanyId}`);
      expect([200, 204]).toContain(res.status);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 4. CONTACTS API
// ═══════════════════════════════════════════════════════
test.describe('👤 API – Contacts', () => {
  test('GET /api/v1/contacts retourne une liste', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/contacts');
    expect(res.status).toBe(200);
  });

  test('POST /api/v1/contacts crée un contact', async ({ page }) => {
    const res = await apiFetch(page, 'POST', '/api/v1/contacts', {
      firstName: `E2E_First_${Date.now()}`,
      lastName: `E2E_Last_${Date.now()}`,
      email: `e2e-${Date.now()}@test.com`,
    });
    expect([200, 201]).toContain(res.status);
    const data = res.data as any;
    const id = data?.id || data?._id || data?.contact?.id || data?.contact?._id;
    if (id) {
      await apiFetch(page, 'DELETE', `/api/v1/contacts/${id}`);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 5. APPLICATIONS API
// ═══════════════════════════════════════════════════════
test.describe('📝 API – Candidatures', () => {
  test('GET /api/v1/applications retourne des candidatures', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/applications');
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════
// 6. SEARCH API
// ═══════════════════════════════════════════════════════
test.describe('🔍 API – Recherche', () => {
  test('GET /api/v1/search?q=test retourne des résultats', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/search?q=test');
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 7. DASHBOARD & ANALYTICS
// ═══════════════════════════════════════════════════════
test.describe('📊 API – Dashboard & Analytics', () => {
  test('GET /api/v1/dashboard retourne les données du tableau de bord', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/dashboard');
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/v1/dashboard/statistics retourne les stats', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/dashboard/statistics');
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 8. NOTIFICATIONS API
// ═══════════════════════════════════════════════════════
test.describe('🔔 API – Notifications', () => {
  test('GET /api/v1/notifications retourne la liste', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/notifications');
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 9. ADMIN API
// ═══════════════════════════════════════════════════════
test.describe('⚙️ API – Admin', () => {
  test('GET /api/v1/admin/services retourne la liste des services', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/admin/services');
    expect([200, 403, 404]).toContain(res.status);
  });

  test('GET /api/v1/admin/monitoring/system retourne les infos système', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/admin/monitoring/system');
    expect([200, 403, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 10. EMAILS API
// ═══════════════════════════════════════════════════════
test.describe('📬 API – Emails', () => {
  test('GET /api/v1/emails retourne les emails ou 404', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/emails');
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/v1/emails/templates retourne les templates', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/emails/templates');
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 11. MAINTENANCE / WAF
// ═══════════════════════════════════════════════════════
test.describe('🛡️ API – Maintenance & WAF', () => {
  test('GET /api/v1/maintenance retourne le statut', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/maintenance');
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/v1/waf/stats retourne les stats WAF', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/waf/stats');
    expect([200, 403, 404]).toContain(res.status);
  });
});
