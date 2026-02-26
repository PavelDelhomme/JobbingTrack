import { APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5002';
export const TEST_PREFIX = 'E2ETEST';

let _cachedToken = '';

export async function getAuthToken(request: APIRequestContext): Promise<string> {
  if (_cachedToken) return _cachedToken;
  try {
    const resp = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: {
        email: process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.com',
        password: process.env.TEST_ADMIN_PASSWORD || 'password123',
      },
    });
    if (!resp.ok()) return '';
    const body = await resp.json();
    _cachedToken = body.token || body.data?.token || '';
    return _cachedToken;
  } catch {
    return '';
  }
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
        size: '11-50',
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
