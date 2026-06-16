import { test, expect, Page } from "@playwright/test";
import {
  gotoBackofficePage,
  warmupBackofficeRoutes,
} from "./backoffice-navigation";

test.beforeAll(async ({ browser }) => {
  await warmupBackofficeRoutes(browser);
});

async function expectPageLoaded(page: Page, minContentLength = 100) {
  await page.waitForLoadState("domcontentloaded");
  // La sidebar peut être hors écran sur certains viewports ; `main` est toujours rendu par AdminLayout.
  await page
    .locator("main")
    .first()
    .waitFor({ state: "visible", timeout: 45000 });
  const len = await page
    .locator("body")
    .textContent()
    .then((t) => t?.length ?? 0);
  expect(len, "Le contenu de la page doit être chargé").toBeGreaterThan(
    minContentLength,
  );
}

async function expectTabClickable(page: Page, tabText: string) {
  const tab = page
    .getByRole("button", { name: new RegExp(tabText, "i") })
    .or(
      page
        .locator(`button, [role="tab"]`)
        .filter({ hasText: new RegExp(tabText, "i") }),
    )
    .first();
  if (await tab.isVisible({ timeout: 10000 }).catch(() => false)) {
    await tab.scrollIntoViewIfNeeded().catch(() => {});
    await tab.click({ timeout: 10000 });
    await page.waitForTimeout(500);
  }
}

// ═══════════════════════════════════════════════════════
// 1. DASHBOARD PRINCIPAL
// ═══════════════════════════════════════════════════════
test.describe("🏠 Dashboard principal", () => {
  test.beforeEach(async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForLoadState("networkidle");
  });

  test("affiche le dashboard avec nav et métriques", async ({ page }) => {
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 10000 });
    const hasMetrics = await page
      .locator('[href="/backoffice/users"], [href*="security"]')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasMetrics).toBe(true);
  });

  test("affiche les cartes de métriques système", async ({ page }) => {
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 10000 });
    const bodyText = (await page.locator("body").textContent()) ?? "";
    const hasMetricTerms = /Sessions|Erreurs|Santé|Temps/i.test(bodyText);
    expect(hasMetricTerms).toBe(true);
  });

  test("maintient la session après rechargement", async ({ page }) => {
    await page.reload();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/backoffice");
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 10000 });
  });

  test("layout cohérent (pas de scroll horizontal)", async ({ page }) => {
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 10000 });
    const bodyW = await page.evaluate(() => document.body.scrollWidth);
    const viewW = await page.evaluate(() => window.innerWidth);
    expect(bodyW).toBeLessThanOrEqual(viewW + 20);
  });
});

// ═══════════════════════════════════════════════════════
// 2. STATISTIQUES & MONITORING
// ═══════════════════════════════════════════════════════
test.describe("📊 Statistiques & Monitoring", () => {
  test("page Statistiques & Monitoring Global", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/statistics", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page, 200);
  });

  test("onglets Vue ensemble / Sécurité / Logs", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/statistics", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
    await expectTabClickable(page, "Vue d");
    await expectTabClickable(page, "curit");
    await expectTabClickable(page, "Logs");
  });

  test("page Statistics (alias)", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/statistics", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page, 200);
  });
});

// ═══════════════════════════════════════════════════════
// 3. PERFORMANCES & ANALYTICS
// ═══════════════════════════════════════════════════════
test.describe("⚡ Performances & Analytics", () => {
  test("page Performances complètes", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/performances", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Performances réseau", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/performances/network", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Performances applicatives", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/analytics/application", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Analytics conteneurs", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/performances/containers", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Analytics utilisateur", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/user-analytics", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglets Analytics utilisateur", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/user-analytics", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
    await expectTabClickable(page, "Vue d");
    await expectTabClickable(page, "nements");
    await expectTabClickable(page, "Erreurs");
    await expectTabClickable(page, "Performance");
  });

  test("page Analytics CPU/système", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/analytics", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 4. SÉCURITÉ (6 pages)
// ═══════════════════════════════════════════════════════
test.describe("🔒 Sécurité", () => {
  test("page Analyse de sécurité", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/security/analysis", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Firewall", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/security/firewall", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Réseau (sécurité)", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/security/network", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Politiques de sécurité", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/security/policies", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Menaces", async ({ page }) => {
    test.setTimeout(90000);
    await gotoBackofficePage(page, "/backoffice/security/threats", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Logs de sécurité (onglet Sécurité dans statistique)", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await gotoBackofficePage(page, "/backoffice/statistics", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
    await expectTabClickable(page, "curit");
  });
});

// ═══════════════════════════════════════════════════════
// 5. GESTION DES SERVICES
// ═══════════════════════════════════════════════════════
test.describe("🔧 Services", () => {
  test("page Liste des services", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/services", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page, 200);
  });

  test("onglets Services / Logs Système", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/services", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
    await expectTabClickable(page, "Services");
    await expectTabClickable(page, "Logs");
  });

  test("page détail d'un service (api-gateway)", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/services/api-gateway", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page détail d'un service (auth-service)", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/services/auth-service", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Applications/Gestion des Services", async ({ page }) => {
    test.setTimeout(90000);
    await gotoBackofficePage(page, "/backoffice/applications", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 6. GESTION DES DONNÉES (page Data + sous-pages)
// ═══════════════════════════════════════════════════════
test.describe("💾 Gestion des données", () => {
  test("page principale Gestion des données", async ({ page }) => {
    test.setTimeout(90000);
    await gotoBackofficePage(page, "/backoffice/datas", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page, 200);
  });

  test("onglet Candidatures", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/datas?tab=applications", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglet Entreprises", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/datas?tab=companies", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglet Contacts", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/datas?tab=contacts", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglet Entretiens", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/datas?tab=interviews", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglet Appels", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/datas?tab=calls", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglet Relances", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/datas?tab=followups", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglet Événements", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/datas?tab=events", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglet Notifications", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/datas?tab=notifications", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglet Stats utilisateur", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/datas?tab=user-stats", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglet Abonnement & facturation", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/datas?tab=billing", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglet Données de test", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/datas?tab=test-data", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page standalone Data Management", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/data-management", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 7. PAGES DONNÉES INDIVIDUELLES
// ═══════════════════════════════════════════════════════
test.describe("📋 Pages données individuelles", () => {
  test("page Entreprises", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/companies", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Contacts", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/contacts", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Entretiens", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/interviews", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Appels", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/calls", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Relances", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/followups", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Événements", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/events", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Notifications", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/notifications", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 8. ARCHIVES & CORBEILLE
// ═══════════════════════════════════════════════════════
test.describe("📦 Archives & Corbeille", () => {
  test("page Archives", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/archives", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Corbeille", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/trash", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 9. UTILISATEURS
// ═══════════════════════════════════════════════════════
test.describe("👥 Utilisateurs", () => {
  test("page Gestion des utilisateurs", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/users", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page affiche un filtre de rôles ou recherche", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/users", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
    const bodyText = (await page.locator("body").textContent()) ?? "";
    const hasUserManagement = /utilisateur|role|admin|user/i.test(bodyText);
    expect(hasUserManagement).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 10. EMAILS (5 pages)
// ═══════════════════════════════════════════════════════
test.describe("📧 Emails", () => {
  test("page Gestion des emails", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/emails", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglets Email de Test / Reset Password", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/emails", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
    await expectTabClickable(page, "Email de Test");
    await expectTabClickable(page, "Reset");
  });

  test("page Email Monitor", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/email-monitor", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Templates emails", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/emails/templates", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("onglets Templates (Prévisualisation / Code / Variables)", async ({
    page,
  }) => {
    await gotoBackofficePage(page, "/backoffice/emails/templates", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
    await expectTabClickable(page, "visualisation");
    await expectTabClickable(page, "Code");
    await expectTabClickable(page, "Variables");
  });

  test("page Configuration SMTP", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/emails/settings", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Délivrabilité", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/emails/deliverability", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 11. TESTS & API (8 pages)
// ═══════════════════════════════════════════════════════
test.describe("🧪 Tests & API", () => {
  test("page Hub Tests principal", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/tests", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page, 200);
  });

  test("page Tests API", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/tests-api", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Tests Backend", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/tests-backend", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Tests Frontend", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/tests-frontend", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Tests Backoffice", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/tests-backoffice", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Emails - Déliverabilité", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/emails/deliverability", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Tests Sécurité", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/tests-security", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Tests Performance", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/tests-performance", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Testeur d'API", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/api-tester", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Rapports de tests", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/test-reports", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page, 200);
  });

  test("page Programmer tests", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/performance-tests/schedule", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Tests Performance (standalone)", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/performance-tests", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Données de test (générateur)", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/test-data", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page, 200);
  });

  test("page Tests Playwright", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/playwright-tests", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 12. PARCOURS UTILISATEUR
// ═══════════════════════════════════════════════════════
test.describe("🎯 Parcours utilisateur", () => {
  test("page Parcours prédéfinis", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/user-journey", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page affiche les scénarios disponibles", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/user-journey", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
    const bodyText = (await page.locator("body").textContent()) ?? "";
    const hasJourneys = /parcours|tape|sc.nario/i.test(bodyText);
    expect(hasJourneys).toBe(true);
  });

  test("page Parcours personnalisé", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/user-journey/custom", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });

  test("page Rapports de parcours", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/user-journey/reports", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 13. RECHERCHE
// ═══════════════════════════════════════════════════════
test.describe("🔍 Recherche", () => {
  test("page Recherche optimisée", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice/search", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 14. NAVIGATION SIDEBAR
// ═══════════════════════════════════════════════════════
test.describe("🧭 Navigation sidebar", () => {
  test("sidebar visible avec liens principaux", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 10000 });

    const nav = (await page.locator("nav").first().textContent()) ?? "";
    const hasLinks =
      /Statistiques|Services|curit|Utilisateurs|Emails|Tests|Parcours/i.test(
        nav,
      );
    expect(hasLinks).toBe(true);
  });

  test("liens de navigation fonctionnels", async ({ page }) => {
    await gotoBackofficePage(page, "/backoffice", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForLoadState("networkidle");

    const navLinks = page.locator('nav a[href*="/backoffice/"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(5);
  });
});
