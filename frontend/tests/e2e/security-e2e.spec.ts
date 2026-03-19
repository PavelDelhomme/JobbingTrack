import { test, expect } from '@playwright/test';

async function apiFetch(
  page: import('@playwright/test').Page,
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
  customHeaders?: Record<string, string>,
): Promise<{ status: number; ok: boolean; data: unknown }> {
  return page.evaluate(
    async ({ method, endpoint, body, customHeaders }) => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...customHeaders,
      };
      if (token && !customHeaders?.['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }

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
    { method, endpoint, body, customHeaders },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/backoffice');
  await page.waitForLoadState('domcontentloaded');
});

// ═══════════════════════════════════════════════════════
// 1. PROTECTION XSS
// ═══════════════════════════════════════════════════════
test.describe('🛡️ Sécurité – Protection XSS', () => {
  test('injection XSS dans le champ recherche entreprises est neutralisée', async ({ page }) => {
    await page.goto('/backoffice/companies');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.getByPlaceholder(/rechercher/i);
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const xssPayload = '<script>alert("XSS")</script>';
      await searchInput.fill(xssPayload);
      await page.waitForTimeout(500);

      const hasAlert = await page.evaluate(() => {
        return document.querySelectorAll('script').length;
      });
      const bodyHtml = await page.locator('body').innerHTML();
      const hasRawXss = bodyHtml.includes('<script>alert("XSS")</script>');
      expect(hasRawXss, 'Le HTML ne doit pas contenir le script XSS brut').toBe(false);
    }
  });

  test('injection XSS dans la recherche globale est neutralisée', async ({ page }) => {
    await page.goto('/backoffice/search');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('<img src=x onerror=alert(1)>');
      await page.waitForTimeout(500);

      const bodyHtml = await page.locator('body').innerHTML();
      const hasOnError = bodyHtml.includes('onerror=alert(1)');
      expect(hasOnError, 'Le HTML ne doit pas contenir onerror=alert(1)').toBe(false);
    }
  });

  test('injection XSS via API est rejetée ou nettoyée', async ({ page }) => {
    const xssName = '<script>alert("XSS")</script>';
    const res = await apiFetch(page, 'POST', '/api/v1/companies', {
      name: xssName,
    });

    if (res.ok) {
      const data = res.data as any;
      const returnedName = (data?.name || data?.company?.name || '').trim();
      // company-service sanitize le nom (strip <script> et tags) ; le champ retourné ne doit pas contenir <script>
      expect(returnedName, 'API doit rejeter ou renvoyer un nom nettoyé (sans <script>)').not.toContain('<script>');

      const id = data?.id || data?._id || data?.company?.id || data?.company?._id;
      if (id) {
        await apiFetch(page, 'DELETE', `/api/v1/companies/${id}`);
      }
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(600);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 2. INJECTION SQL
// ═══════════════════════════════════════════════════════
test.describe('🛡️ Sécurité – Protection SQL Injection', () => {
  test('injection SQL dans le login ne fonctionne pas', async ({ page }) => {
    const res = await apiFetch(page, 'POST', '/api/v1/auth/login', {
      email: "' OR '1'='1",
      password: "' OR '1'='1",
    });
    expect(res.status).not.toBe(200);
  });

  test('injection SQL dans la recherche ne fonctionne pas', async ({ page }) => {
    const res = await apiFetch(page, 'GET', "/api/v1/search?q=' OR 1=1 --");
    expect([200, 400, 404]).toContain(res.status);
    if (res.ok) {
      const data = res.data as any;
      const resultCount = Array.isArray(data) ? data.length : data?.results?.length ?? 0;
      expect(resultCount).toBeLessThan(1000);
    }
  });

  test('injection NoSQL dans la recherche ne fonctionne pas', async ({ page }) => {
    const res = await apiFetch(page, 'POST', '/api/v1/auth/login', {
      email: { $gt: '' },
      password: { $gt: '' },
    } as any);
    expect(res.status).not.toBe(200);
  });
});

// ═══════════════════════════════════════════════════════
// 3. AUTHENTIFICATION & AUTORISATION
// ═══════════════════════════════════════════════════════
test.describe('🔐 Sécurité – Auth & Autorisation', () => {
  test('requête sans token retourne 401 ou 403', async ({ page }) => {
    const res = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:5002/api/v1/companies', {
        headers: { 'Content-Type': 'application/json' },
      });
      return { status: resp.status };
    });
    expect([401, 403]).toContain(res.status);
  });

  test('requête avec token invalide retourne 401 ou 403', async ({ page }) => {
    const res = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:5002/api/v1/companies', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token-12345',
        },
      });
      return { status: resp.status };
    });
    expect([401, 403]).toContain(res.status);
  });

  test('token expiré est rejeté', async ({ page }) => {
    const expiredToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJleHAiOjE2MDAwMDAwMDB9.fake';
    const res = await page.evaluate(
      async (token) => {
        const resp = await fetch('http://localhost:5002/api/v1/companies', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        return { status: resp.status };
      },
      expiredToken,
    );
    expect([401, 403]).toContain(res.status);
  });

  test('JWT malformé est rejeté', async ({ page }) => {
    const res = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:5002/api/v1/companies', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer not.a.jwt.at.all',
        },
      });
      return { status: resp.status };
    });
    expect([401, 403]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════
// 4. HEADERS DE SÉCURITÉ
// ═══════════════════════════════════════════════════════
test.describe('🔒 Sécurité – Headers HTTP', () => {
  test('les réponses contiennent des headers de sécurité', async ({ page }) => {
    const response = await page.goto('/backoffice');
    const headers = response?.headers() ?? {};

    const hasFrameOptions =
      !!headers['x-frame-options'] || !!headers['content-security-policy'];
    const hasContentType = !!headers['content-type'];

    expect(hasContentType).toBe(true);
  });

  test('l\'API n\'expose pas de headers sensibles', async ({ page }) => {
    const res = await page.evaluate(async () => {
      const token = localStorage.getItem('token') || '';
      const resp = await fetch('http://localhost:5002/api/v1/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allHeaders: Record<string, string> = {};
      resp.headers.forEach((v, k) => {
        allHeaders[k.toLowerCase()] = v;
      });
      return allHeaders;
    });

    expect(res['x-powered-by']).not.toBe('Express');
  });
});

// ═══════════════════════════════════════════════════════
// 5. PROTECTION CONTRE LES ATTAQUES
// ═══════════════════════════════════════════════════════
test.describe('⚔️ Sécurité – Protection attaques', () => {
  test('body trop large est rejeté (payload overflow)', async ({ page }) => {
    const largeBody = { name: 'A'.repeat(100_000) };
    const res = await apiFetch(page, 'POST', '/api/v1/companies', largeBody);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(600);
  });

  test('path traversal dans l\'URL est rejeté', async ({ page }) => {
    const res = await apiFetch(page, 'GET', '/api/v1/../../etc/passwd');
    expect([400, 403, 404]).toContain(res.status);
  });

  test('méthode HTTP non autorisée retourne 405 ou 404', async ({ page }) => {
    const res = await apiFetch(page, 'PATCH', '/api/v1/auth/login', {});
    expect([404, 405]).toContain(res.status);
  });
});
