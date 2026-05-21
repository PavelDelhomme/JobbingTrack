import { test, expect } from "@playwright/test";
import { e2eGatewayBaseUrl } from "../../../tests/e2e/helpers/gatewayUrl";

const MAX_PAGE_LOAD_MS = 30_000;
const MAX_API_RESPONSE_MS = 5_000;
const GATEWAY_ORIGIN = e2eGatewayBaseUrl().replace(/\/$/, "");

async function apiFetch(
  page: import("@playwright/test").Page,
  method: string,
  endpoint: string,
): Promise<{ status: number; durationMs: number }> {
  return page.evaluate(
    async ({ method, endpoint, apiBase }) => {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const start = performance.now();
      const resp = await fetch(`${apiBase}${endpoint}`, { method, headers });
      const durationMs = Math.round(performance.now() - start);

      return { status: resp.status, durationMs };
    },
    { method, endpoint, apiBase: GATEWAY_ORIGIN },
  );
}

// ═══════════════════════════════════════════════════════
// 1. TEMPS DE CHARGEMENT DES PAGES
// ═══════════════════════════════════════════════════════
test.describe("⚡ Performance – Chargement des pages", () => {
  const criticalPages = [
    { name: "Dashboard", path: "/b4ck0ff1ce" },
    { name: "Entreprises", path: "/b4ck0ff1ce/companies" },
    { name: "Contacts", path: "/b4ck0ff1ce/contacts" },
    { name: "Analytics", path: "/b4ck0ff1ce/analytics" },
    { name: "Emails", path: "/b4ck0ff1ce/emails" },
    { name: "Recherche", path: "/b4ck0ff1ce/search" },
    { name: "Utilisateurs", path: "/b4ck0ff1ce/users" },
    { name: "Sécurité", path: "/b4ck0ff1ce/security/analysis" },
  ];

  for (const { name, path } of criticalPages) {
    test(`${name} charge en moins de ${MAX_PAGE_LOAD_MS / 1000}s`, async ({
      page,
    }) => {
      const start = Date.now();
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(MAX_PAGE_LOAD_MS);
    });
  }
});

// ═══════════════════════════════════════════════════════
// 2. TEMPS DE RÉPONSE API
// ═══════════════════════════════════════════════════════
test.describe("⚡ Performance – Réponse API", () => {
  test.setTimeout(45000);
  test.beforeEach(async ({ page }) => {
    await page.goto("/b4ck0ff1ce", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForLoadState("domcontentloaded");
  });

  const apiEndpoints = [
    { name: "Health Check", endpoint: "/health" },
    { name: "Companies", endpoint: "/api/v1/companies" },
    { name: "Contacts", endpoint: "/api/v1/contacts" },
    { name: "Auth Profile", endpoint: "/api/v1/auth/profile" },
  ];

  for (const { name, endpoint } of apiEndpoints) {
    test(`API ${name} répond en moins de ${MAX_API_RESPONSE_MS / 1000}s`, async ({
      page,
    }) => {
      const res = await apiFetch(page, "GET", endpoint);
      expect(res.durationMs).toBeLessThan(MAX_API_RESPONSE_MS);
      expect([200, 304]).toContain(res.status);
    });
  }
});

// ═══════════════════════════════════════════════════════
// 3. REQUÊTES CONSÉCUTIVES
// ═══════════════════════════════════════════════════════
test.describe("⚡ Performance – Requêtes multiples", () => {
  test.setTimeout(45000);
  test.beforeEach(async ({ page }) => {
    await page.goto("/b4ck0ff1ce", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForLoadState("domcontentloaded");
  });

  test("10 requêtes consécutives au même endpoint restent stables", async ({
    page,
  }) => {
    const durations: number[] = [];

    for (let i = 0; i < 10; i++) {
      const res = await apiFetch(page, "GET", "/health");
      durations.push(res.durationMs);
      expect(res.status).toBe(200);
    }

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);

    expect(avg).toBeLessThan(MAX_API_RESPONSE_MS);
    expect(max).toBeLessThan(MAX_API_RESPONSE_MS * 2);
  });

  test("5 requêtes parallèles répondent toutes correctement", async ({
    page,
  }) => {
    const apiBase = GATEWAY_ORIGIN;
    const res = await page.evaluate(async (base: string) => {
      const token = localStorage.getItem("token") || "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const endpoints = [
        "/api/v1/companies",
        "/api/v1/contacts",
        "/api/v1/auth/profile",
        "/health",
        "/api/v1/notifications",
      ];

      const start = performance.now();
      const results = await Promise.all(
        endpoints.map(async (ep) => {
          const resp = await fetch(`${base}${ep}`, { headers });
          return { endpoint: ep, status: resp.status };
        }),
      );
      const totalMs = Math.round(performance.now() - start);

      return { results, totalMs };
    }, apiBase);

    for (const r of res.results) {
      expect([200, 304, 404]).toContain(r.status);
    }
    expect(res.totalMs).toBeLessThan(MAX_API_RESPONSE_MS * 3);
  });
});

// ═══════════════════════════════════════════════════════
// 4. NAVIGATION RAPIDE
// ═══════════════════════════════════════════════════════
test.describe("⚡ Performance – Navigation rapide", () => {
  test("navigation entre 5 pages consécutives est fluide", async ({ page }) => {
    const pages = [
      "/b4ck0ff1ce",
      "/b4ck0ff1ce/companies",
      "/b4ck0ff1ce/contacts",
      "/b4ck0ff1ce/emails",
      "/b4ck0ff1ce/users",
    ];

    const start = Date.now();

    for (const p of pages) {
      await page.goto(p);
      await page.waitForLoadState("domcontentloaded");
      const bodyLen = await page
        .locator("body")
        .textContent()
        .then((t) => t?.length ?? 0);
      expect(bodyLen).toBeGreaterThan(50);
    }

    const totalDuration = Date.now() - start;
    expect(totalDuration).toBeLessThan(MAX_PAGE_LOAD_MS * pages.length);
  });
});

// ═══════════════════════════════════════════════════════
// 5. TAILLE DU DOM
// ═══════════════════════════════════════════════════════
test.describe("⚡ Performance – DOM", () => {
  test("le dashboard n'a pas un DOM excessivement grand", async ({ page }) => {
    await page.goto("/b4ck0ff1ce");
    await page.waitForLoadState("networkidle");

    const domSize = await page.evaluate(
      () => document.querySelectorAll("*").length,
    );
    expect(domSize).toBeLessThan(10_000);
  });

  test("la page entreprises n'a pas un DOM excessivement grand", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce/companies");
    await page.waitForLoadState("networkidle");

    const domSize = await page.evaluate(
      () => document.querySelectorAll("*").length,
    );
    expect(domSize).toBeLessThan(10_000);
  });
});

// ═══════════════════════════════════════════════════════
// 6. MÉMOIRE
// ═══════════════════════════════════════════════════════
test.describe("⚡ Performance – Mémoire", () => {
  test.setTimeout(60000);
  test("pas de fuite mémoire évidente après navigation", async ({ page }) => {
    await page.goto("/b4ck0ff1ce", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForLoadState("domcontentloaded");

    const memBefore = await page.evaluate(
      () => (performance as any).memory?.usedJSHeapSize ?? 0,
    );

    for (let i = 0; i < 3; i++) {
      await page.goto("/b4ck0ff1ce/companies", {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page.waitForLoadState("domcontentloaded");
      await page.goto("/b4ck0ff1ce/contacts", {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page.waitForLoadState("domcontentloaded");
    }

    const memAfter = await page.evaluate(
      () => (performance as any).memory?.usedJSHeapSize ?? 0,
    );

    if (memBefore > 0 && memAfter > 0) {
      const growthRatio = memAfter / memBefore;
      expect(growthRatio).toBeLessThan(5);
    }
  });
});
