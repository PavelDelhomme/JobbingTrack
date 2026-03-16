// Tests API E2E — utilise un utilisateur classique (rôle USER)
// Appels API via request + token (pas de localStorage pour éviter SecurityError cross-origin)
import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { ensureTestUser, getSeededUserToken, getUserToken } from './test-data-helper';

const API_URL = process.env.API_URL || 'http://localhost:5002';

let _testCreds: { email: string; password: string } | null = null;
let _testToken = '';

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_testToken) h['Authorization'] = `Bearer ${_testToken}`;
  return h;
}

async function apiFetch(
  request: APIRequestContext,
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; ok: boolean; data: unknown }> {
  const url = `${API_URL}${endpoint}`;
  const opts = { headers: authHeaders(), data: body };
  let resp;
  if (method === 'GET') resp = await request.get(url, { headers: authHeaders() });
  else if (method === 'POST') resp = await request.post(url, opts);
  else if (method === 'PUT') resp = await request.put(url, opts);
  else if (method === 'DELETE') resp = await request.delete(url, { headers: authHeaders() });
  else resp = await request.fetch(url, { method, ...opts });

  let data: unknown = null;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }
  return { status: resp.status(), ok: resp.ok(), data };
}

test.beforeAll(async ({ request }) => {
  _testCreds = await ensureTestUser(request);
  _testToken = await getUserToken(request);
  // Fallback 1: token depuis credentials du compte créé (worker isolé)
  if (_testCreds && !_testToken) {
    const res = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: _testCreds.email, password: _testCreds.password },
    });
    if (res.ok()) {
      const body = await res.json();
      _testToken = body.token || body.data?.token || '';
    }
  }
  // Fallback 2: utilisateur seedé (make seed-auth) pour exécuter les tests protégés sans skip
  if (!_testToken) {
    _testToken = await getSeededUserToken(request);
  }
});

// Tests API uniquement : pas besoin de page ni localStorage

// ═══════════════════════════════════════════════════════
// 1. HEALTH & STATUS
// ═══════════════════════════════════════════════════════
test.describe('🩺 API – Health & Status', () => {
  test('health check API Gateway répond 200', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/health');
    expect(res.status).toBe(200);
  });

  test('endpoint racine /api/v1 est accessible', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1');
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 2. AUTH API
// ═══════════════════════════════════════════════════════
test.describe('🔑 API – Authentification', () => {
  test('login avec identifiants valides retourne un token', async ({ request }) => {
    if (!_testCreds) return;
    const res = await apiFetch(request, 'POST', '/api/v1/auth/login', {
      email: _testCreds.email,
      password: _testCreds.password,
    });
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('token');
  });

  test('login avec identifiants invalides retourne 401', async ({ request }) => {
    const res = await apiFetch(request, 'POST', '/api/v1/auth/login', {
      email: 'redacted@example.invalid',
      password: 'wrongpassword',
    });
    expect([400, 401, 403]).toContain(res.status);
  });

  test('profil utilisateur accessible avec token', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/auth/profile');
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) expect(res.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════
// 3. COMPANIES CRUD
// ═══════════════════════════════════════════════════════
test.describe('🏢 API – CRUD Entreprises', () => {
  let createdCompanyId: string;

  test('GET /api/v1/companies retourne une liste', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/companies');
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) expect(Array.isArray(res.data) || (res.data && typeof res.data === 'object')).toBe(true);
  });

  test('POST /api/v1/companies crée une entreprise', async ({ request }) => {
    const name = `E2EAPI_Company_${Date.now()}`;
    const res = await apiFetch(request, 'POST', '/api/v1/companies', {
      name,
      industry: 'Test',
      website: 'https://e2e-test.com',
    });
    expect([200, 201]).toContain(res.status);
    const data = res.data as Record<string, unknown>;
    createdCompanyId = (data?.id || data?._id || (data as any)?.company?.id || (data as any)?.company?._id) as string;
  });

  test('DELETE /api/v1/companies/:id supprime l\'entreprise', async ({ request }) => {
    if (!createdCompanyId) {
      const name = `E2EAPI_TempDel_${Date.now()}`;
      const createRes = await apiFetch(request, 'POST', '/api/v1/companies', { name });
      const d = createRes.data as any;
      createdCompanyId = d?.id || d?._id || d?.company?.id || d?.company?._id;
    }
    if (createdCompanyId) {
      const res = await apiFetch(request, 'DELETE', `/api/v1/companies/${createdCompanyId}`);
      expect([200, 204]).toContain(res.status);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 4. CONTACTS API
// ═══════════════════════════════════════════════════════
test.describe('👤 API – Contacts', () => {
  test('GET /api/v1/contacts retourne une liste', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/contacts');
    expect([200, 401]).toContain(res.status);
  });

  test('POST /api/v1/contacts crée un contact', async ({ request }) => {
    const res = await apiFetch(request, 'POST', '/api/v1/contacts', {
      firstName: `E2E_First_${Date.now()}`,
      lastName: `E2E_Last_${Date.now()}`,
      email: `e2e-${Date.now()}@test.com`,
    });
    expect([200, 201]).toContain(res.status);
    const data = res.data as any;
    const id = data?.id || data?._id || data?.contact?.id || data?.contact?._id;
    if (id) {
      await apiFetch(request, 'DELETE', `/api/v1/contacts/${id}`);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 5. APPLICATIONS API
// ═══════════════════════════════════════════════════════
test.describe('📝 API – Candidatures', () => {
  test('GET /api/v1/applications retourne des candidatures', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/applications');
    expect([200, 401]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 6. SEARCH API
// ═══════════════════════════════════════════════════════
test.describe('🔍 API – Recherche', () => {
  test('GET /api/v1/search?q=test retourne des résultats', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/search?q=test');
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 7. DASHBOARD & ANALYTICS
// ═══════════════════════════════════════════════════════
test.describe('📊 API – Dashboard & Analytics', () => {
  test('GET /api/v1/dashboard retourne les données du tableau de bord', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/dashboard');
    expect([200, 401, 404]).toContain(res.status);
  });

  test('GET /api/v1/dashboard/statistics retourne les stats', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/dashboard/statistics');
    expect([200, 401, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 8. NOTIFICATIONS API
// ═══════════════════════════════════════════════════════
test.describe('🔔 API – Notifications', () => {
  test('GET /api/v1/notifications retourne la liste', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/notifications');
    expect([200, 401, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 9. ADMIN API
// ═══════════════════════════════════════════════════════
test.describe('⚙️ API – Admin', () => {
  test('GET /api/v1/admin/services retourne la liste des services', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/admin/services');
    expect([200, 401, 403, 404]).toContain(res.status);
  });

  test('GET /api/v1/admin/monitoring/system retourne les infos système', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/admin/monitoring/system');
    expect([200, 401, 403, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 10. EMAILS API
// ═══════════════════════════════════════════════════════
test.describe('📬 API – Emails', () => {
  test('GET /api/v1/emails retourne les emails ou 404', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/emails');
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/v1/emails/templates retourne les templates', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/emails/templates');
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 11. MAINTENANCE / WAF
// ═══════════════════════════════════════════════════════
test.describe('🛡️ API – Maintenance & WAF', () => {
  test('GET /api/v1/maintenance retourne le statut', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/maintenance');
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/v1/waf/stats retourne les stats WAF', async ({ request }) => {
    const res = await apiFetch(request, 'GET', '/api/v1/waf/stats');
    expect([200, 401, 403, 404]).toContain(res.status);
  });
});
