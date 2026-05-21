// Tests E2E Suivi intérim (backoffice) — page /b4ck0ff1ce/suivi-interim, données agences/candidatures
import { test, expect } from "@playwright/test";
import { getAdminToken } from "./test-data-helper";

const API_URL = process.env.API_URL || "http://localhost:5002";

test.describe("👔 Suivi intérim (backoffice)", () => {
  test.setTimeout(50000);

  test("la page Suivi intérim charge sans erreur", async ({ page }) => {
    await page.goto("/b4ck0ff1ce/suivi-interim");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 25000 });
    const heading = page
      .getByRole("heading", { name: /Suivi intérim/i })
      .or(
        page
          .locator("h2")
          .filter({ hasText: /Suivi intérim|Boîtes d'intérim/i }),
      );
    await expect(heading.first()).toBeVisible({ timeout: 20000 });
    // Vérifier le contenu visible uniquement (éviter les faux positifs sur le payload RSC/scripts)
    const mainText =
      (await page
        .locator("main")
        .textContent()
        .catch(() => "")) ?? "";
    expect(mainText).not.toMatch(/500|Erreur serveur/i);
  });

  test("la page affiche soit des agences soit le message invitant à en créer", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce/suivi-interim");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 25000 });
    const heading = page
      .getByRole("heading", { name: /Suivi intérim/i })
      .or(page.locator("h2").filter({ hasText: /Suivi intérim/i }));
    await expect(heading.first()).toBeVisible({ timeout: 20000 });
    const bodyText = (await page.locator("body").textContent()) ?? "";
    const hasAgencies =
      /Randstad|Manpower|Boîte d'intérim|Candidatures liées/i.test(bodyText);
    const hasEmptyMessage =
      /Aucune boîte d'intérim|Créez une entreprise.*Boîte d'intérim/i.test(
        bodyText,
      );
    expect(hasAgencies || hasEmptyMessage).toBe(true);
  });

  test("après génération de données de test, la page peut afficher des agences", async ({
    page,
    request,
  }) => {
    const token = await getAdminToken(request);
    test.skip(!token, "Admin token requis");

    // Générer des données de test (inclut TEMP_AGENCY Randstad/Manpower + candidatures avec agencyId)
    const genRes = await request.post(
      `${API_URL}/api/v1/admin/generate-test-data`,
      {
        data: { preset: "standard", clean: false },
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    // Accepter 200 ou 404/502 si route absente ou service non dispo
    if (!genRes.ok() && genRes.status() !== 404 && genRes.status() !== 502) {
      test.skip(true, "generate-test-data non disponible ou erreur");
    }

    await page.goto("/b4ck0ff1ce/suivi-interim");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 25000 });
    const heading = page
      .getByRole("heading", { name: /Suivi intérim/i })
      .or(page.locator("h2").filter({ hasText: /Suivi intérim/i }));
    await expect(heading.first()).toBeVisible({ timeout: 20000 });
    const bodyText = (await page.locator("body").textContent()) ?? "";
    // Après génération standard, on doit avoir au moins le texte Suivi intérim / Boîtes d'intérim
    expect(bodyText).toMatch(
      /Suivi intérim|Boîtes d'intérim|Candidatures liées|Aucune boîte/i,
    );
  });

  test("après génération standard, au moins une boîte d'intérim est visible", async ({
    page,
    request,
  }) => {
    const token = await getAdminToken(request);
    test.skip(!token, "Admin token requis");

    const genRes = await request.post(
      `${API_URL}/api/v1/admin/generate-test-data`,
      {
        data: { preset: "standard", clean: false },
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!genRes.ok() && genRes.status() !== 404 && genRes.status() !== 502) {
      test.skip(true, "generate-test-data non disponible");
    }

    await page.goto("/b4ck0ff1ce/suivi-interim");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 25000 });
    const agencyItem = page
      .getByRole("button", { name: /Intérim.*Candidatures/i })
      .first();
    await expect(agencyItem).toBeVisible({ timeout: 15000 });
  });
});

test.describe("🖥️ Pages Backoffice Suivi intérim", () => {
  test.setTimeout(50000);

  test("la page Suivi intérim est accessible depuis le menu", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 25000 });
    // « Suivi intérim » est un sous-lien sous « Gestion des données ».
    const dataLink = page.locator('a[href="/b4ck0ff1ce/datas"]').first();
    await expect(dataLink).toBeVisible({ timeout: 15000 });
    const suiviLink = page
      .locator('a[href="/b4ck0ff1ce/suivi-interim"]')
      .first();
    if (!(await suiviLink.isVisible().catch(() => false))) {
      const dataExpander = page
        .locator(
          'a[href="/b4ck0ff1ce/datas"] + button[aria-label="Expander les sous-items"]',
        )
        .first();
      await expect(dataExpander).toBeVisible({ timeout: 10000 });
      await dataExpander.click();
    }
    await expect(suiviLink).toBeVisible({ timeout: 15000 });
    await suiviLink.click();
    await page.waitForURL(/\/b4ck0ff1ce\/suivi-interim/, { timeout: 15000 });
    const heading = page
      .getByRole("heading", { name: /Suivi intérim/i })
      .or(page.locator("h2").filter({ hasText: /Suivi intérim/i }));
    await expect(heading.first()).toBeVisible({ timeout: 15000 });
  });
});
