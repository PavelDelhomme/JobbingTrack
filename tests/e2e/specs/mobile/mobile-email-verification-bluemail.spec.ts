/**
 * Spec dédié : inscription + vérification email (BlueMail / OVH) — flux API uniquement.
 *
 * Lancer : cd tests && TEST_REAL_EMAILS=candidatures@delhomme.ovh npx playwright test e2e/specs/mobile/mobile-email-verification-bluemail.spec.ts --project=chromium
 */

import { test, expect } from '@playwright/test';

import { e2eGatewayBaseUrl } from '../../helpers/gatewayUrl';

const GATEWAY_URL = e2eGatewayBaseUrl();
const BLUEMAIL_EMAIL = process.env.TEST_REAL_EMAILS?.split(',').map((s) => s.trim()).find((e) => e.includes('delhomme.ovh') || e.includes('bluemail')) || process.env.TEST_REAL_EMAIL || 'candidatures@delhomme.ovh';
const TEST_PASSWORD = process.env.TEST_VERIFICATION_PASSWORD || 'SecureP@ss123!';

async function loginAdmin(request: any): Promise<string> {
  const res = await request.post(`${GATEWAY_URL}/api/v1/auth/login`, {
    data: { email: process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.com', password: process.env.TEST_ADMIN_PASSWORD || 'password123' },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return body.token as string;
}

function extractLinksFromHtml(html: string): string[] {
  if (!html || typeof html !== 'string') return [];
  const links: string[] = [];
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) links.push(m[1]);
  return [...new Set(links)];
}

function extractTokenFromLink(link: string): string | null {
  const tokenMatch = link.match(/[?&]token=([a-zA-Z0-9_-]+)/) || link.match(/\/verify-email\/([a-zA-Z0-9_-]+)/);
  return tokenMatch ? tokenMatch[1] : null;
}

async function waitForEmailLog(request: any, adminToken: string, toEmail: string, type: string, timeoutMs = 30000): Promise<{ emailContent?: string } | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${GATEWAY_URL}/api/v1/emails/logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { page: 1, limit: 10, to: toEmail, type },
    });
    if (res.status() === 200) {
      const json = await res.json().catch(() => ({}));
      const data = (json?.data || []) as any[];
      if (Array.isArray(data) && data.length > 0) return { emailContent: data[0]?.emailContent };
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}

test.describe('Mobile – Vérification email BlueMail / OVH', () => {
  test('inscription avec adresse BlueMail/OVH → email vérification → verify → login', async ({ request }) => {
    const adminToken = await loginAdmin(request);
    const testEmail = BLUEMAIL_EMAIL;

    const registerRes = await request.post(`${GATEWAY_URL}/api/v1/auth/register`, {
      data: {
        email: testEmail,
        password: TEST_PASSWORD,
        firstName: 'Test',
        lastName: 'BlueMail',
        phone: '+33600000000',
      },
    });
    if (registerRes.status() === 409) {
      const resendRes = await request.post(`${GATEWAY_URL}/api/v1/auth/resend-verification`, { data: { email: testEmail } });
      expect([200, 400]).toContain(resendRes.status());
    } else {
      expect([200, 201]).toContain(registerRes.status());
    }

    const log = await waitForEmailLog(request, adminToken, testEmail, 'VERIFICATION');
    expect(log, `EmailLog VERIFICATION introuvable pour ${testEmail}`).not.toBeNull();

    const html = log?.emailContent || '';
    const links = extractLinksFromHtml(html);
    const verifyLink = links.find((u) => /verify-email|verify|confirm/i.test(u)) || '';
    expect(verifyLink).toBeTruthy();
    const token = extractTokenFromLink(verifyLink);
    expect(token).toBeTruthy();

    const verifyRes = await request.get(`${GATEWAY_URL}/api/v1/auth/verify-email/${token}`);
    expect([200, 302]).toContain(verifyRes.status());

    const loginRes = await request.post(`${GATEWAY_URL}/api/v1/auth/login`, {
      data: { email: testEmail, password: TEST_PASSWORD },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.token || loginBody.accessToken).toBeTruthy();
  });
});
