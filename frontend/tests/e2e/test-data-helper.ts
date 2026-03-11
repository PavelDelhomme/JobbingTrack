import { APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5002';
export const TEST_PREFIX = 'E2ETEST';

let _cachedAdminToken = '';
let _cachedUserToken = '';
let _cachedUserCredentials: { email: string; password: string } | null = null;

/**
 * Token admin — pour les tests backoffice / administration.
 */
export async function getAdminToken(request: APIRequestContext): Promise<string> {
  if (_cachedAdminToken) return _cachedAdminToken;
  try {
    const resp = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: {
        email: process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.com',
        password: process.env.TEST_ADMIN_PASSWORD || 'password123',
      },
    });
    if (!resp.ok()) return '';
    const body = await resp.json();
    _cachedAdminToken = body.token || body.data?.token || '';
    return _cachedAdminToken;
  } catch {
    return '';
  }
}

/**
 * Token utilisateur classique — pour les tests fonctionnels (app mobile).
 * Crée un compte test puis se connecte.
 */
export async function getUserToken(request: APIRequestContext): Promise<string> {
  if (_cachedUserToken) return _cachedUserToken;
  const creds = await ensureTestUser(request);
  if (!creds) return '';
  return _cachedUserToken;
}

/**
 * Crée un utilisateur test (rôle USER) et retourne ses credentials.
 * Utile pour les tests Playwright UI qui ont besoin de remplir le formulaire de login.
 */
export async function ensureTestUser(request: APIRequestContext): Promise<{ email: string; password: string } | null> {
  if (_cachedUserCredentials && _cachedUserToken) return _cachedUserCredentials;
  const email = `e2e-user-${Date.now()}@jobbingtrack.test`;
  const password = 'TestPassword123!';
  try {
    await request.post(`${API_URL}/api/v1/auth/register`, {
      data: { email, password, firstName: 'E2EUser', lastName: 'Test', phone: '+33600000000' },
    });
    const resp = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email, password },
    });
    if (!resp.ok()) return null;
    const body = await resp.json();
    _cachedUserToken = body.token || body.data?.token || '';
    _cachedUserCredentials = { email, password };
    return _cachedUserCredentials;
  } catch {
    return null;
  }
}

/**
 * Credentials admin pour le login UI (formulaire Playwright).
 * Ne contient PAS le mot de passe en dur : lit .env ou utilise les défauts de dev.
 */
export function getAdminCredentials(): { email: string; password: string } {
  return {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'password123',
  };
}

/**
 * Login admin via le formulaire UI Playwright.
 * Utile pour les tests standalone qui ne bénéficient pas de storageState.
 */
export async function loginAsAdmin(page: import('@playwright/test').Page): Promise<void> {
  const creds = getAdminCredentials();
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/backoffice**', { timeout: 15000 }).catch(() => {});
}

/**
 * Adresse email réelle pour tester la réception des mails.
 * Configurée via TEST_REAL_EMAIL dans .env (gitignored).
 */
export const REAL_TEST_EMAIL = process.env.TEST_REAL_EMAIL || 'test@example.com';

/**
 * @deprecated Utiliser getAdminToken() ou getUserToken() selon le contexte.
 */
export async function getAuthToken(request: APIRequestContext): Promise<string> {
  return getAdminToken(request);
}

export function uniqueId(): string {
  return Math.random().toString(36).substring(2, 8);
}

export function testCompanyName(suffix?: string): string {
  return `${TEST_PREFIX} Corp ${suffix || uniqueId()}`;
}

export function testContactName(suffix?: string): { firstName: string; lastName: string } {
  return {
    firstName: `${TEST_PREFIX}Prenom`,
    lastName: `Contact${suffix || uniqueId()}`,
  };
}

export async function apiCreateCompany(
  request: APIRequestContext,
  token: string,
  name?: string,
): Promise<{ id: string; name: string }> {
  const companyName = name || testCompanyName();
  try {
    const resp = await request.post(`${API_URL}/api/v1/companies`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: companyName,
        industry: 'E2E Testing',
        location: 'Paris Test',
        size: 'SMALL',
        website: 'https://e2e-test.example.com',
        description: 'Donnée de test E2E - suppression automatique',
      },
    });
    if (!resp.ok()) return { id: '', name: companyName };
    const body = await resp.json();
    const c = body.company || body.data?.company || body;
    return { id: c.id || '', name: companyName };
  } catch {
    return { id: '', name: companyName };
  }
}

export async function apiCreateContact(
  request: APIRequestContext,
  token: string,
  companyId: string,
  firstName?: string,
  lastName?: string,
): Promise<{ id: string; firstName: string; lastName: string }> {
  const fn = firstName || `${TEST_PREFIX}Prenom`;
  const ln = lastName || `Contact${uniqueId()}`;
  try {
    const resp = await request.post(`${API_URL}/api/v1/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        firstName: fn,
        lastName: ln,
        email: `e2e-${Date.now()}@test.jobbingtrack.local`,
        phone: '+33600000000',
        position: 'Testeur E2E',
        companyId,
      },
    });
    if (!resp.ok()) return { id: '', firstName: fn, lastName: ln };
    const body = await resp.json();
    const c = body.contact || body.data?.contact || body;
    return { id: c.id || '', firstName: fn, lastName: ln };
  } catch {
    return { id: '', firstName: fn, lastName: ln };
  }
}

export async function apiDelete(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  id: string,
): Promise<void> {
  if (!id) return;
  try {
    await request.delete(`${API_URL}/api/v1/${endpoint}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch { /* noop */ }
}

export async function apiCreateApplication(
  request: APIRequestContext,
  token: string,
  companyId: string,
  position?: string,
): Promise<{ id: string; position: string }> {
  const pos = position || `${TEST_PREFIX} Dev ${uniqueId()}`;
  try {
    const resp = await request.post(`${API_URL}/api/v1/applications`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        companyId,
        position: pos,
        contractType: 'CDI',
        status: 'CANDIDATE_PENDING',
      },
    });
    if (!resp.ok()) return { id: '', position: pos };
    const body = await resp.json();
    const a = body.application || body.data?.application || body;
    return { id: a.id || '', position: pos };
  } catch {
    return { id: '', position: pos };
  }
}

export async function apiCreateInterview(
  request: APIRequestContext,
  token: string,
  applicationId: string,
): Promise<{ id: string }> {
  try {
    const resp = await request.post(`${API_URL}/api/v1/interviews`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        applicationId,
        interviewDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'SCHEDULED',
      },
    });
    if (!resp.ok()) return { id: '' };
    const body = await resp.json();
    return { id: body.interview?.id || '' };
  } catch {
    return { id: '' };
  }
}

export async function apiArchive(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  id: string,
): Promise<boolean> {
  if (!id) return false;
  try {
    const resp = await request.post(`${API_URL}/api/v1/${endpoint}/${id}/archive`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return resp.ok();
  } catch {
    return false;
  }
}

export async function apiUnarchive(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  id: string,
): Promise<boolean> {
  if (!id) return false;
  try {
    const resp = await request.post(`${API_URL}/api/v1/${endpoint}/${id}/unarchive`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return resp.ok();
  } catch {
    return false;
  }
}

export async function apiRestore(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  id: string,
): Promise<boolean> {
  if (!id) return false;
  try {
    const resp = await request.post(`${API_URL}/api/v1/${endpoint}/${id}/restore`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return resp.ok();
  } catch {
    return false;
  }
}

export async function cleanupTestData(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  if (!token) return;

  try {
    const resp = await request.get(`${API_URL}/api/v1/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok()) {
      const body = await resp.json();
      const contacts = body.contacts || body.data?.contacts || body.data || [];
      for (const c of contacts) {
        if (c.firstName?.includes(TEST_PREFIX) || c.lastName?.includes(TEST_PREFIX)) {
          await apiDelete(request, token, 'contacts', c.id);
        }
      }
    }
  } catch { /* noop */ }

  try {
    const resp = await request.get(`${API_URL}/api/v1/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok()) {
      const body = await resp.json();
      const companies = body.companies || body.data?.companies || body.data || [];
      for (const c of companies) {
        if (c.name?.includes(TEST_PREFIX)) {
          await apiDelete(request, token, 'companies', c.id);
        }
      }
    }
  } catch { /* noop */ }
}
