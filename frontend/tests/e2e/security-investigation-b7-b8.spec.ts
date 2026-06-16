import { expect, test } from "@playwright/test";

test.describe("Investigation B7/B8 — parcours admin", () => {
  test.describe.configure({ mode: "serial", timeout: 120000 });

  test("page investigation — onglets, filtres et exports", async ({ page }) => {
    await page.goto("/backoffice", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await expect(page.locator("main").first()).toBeVisible({ timeout: 90000 });

    await page.goto("/backoffice/security/investigation", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect
      .poll(
        async () => {
          const heading = await page
            .getByRole("heading", { name: /Investigation/i })
            .isVisible()
            .catch(() => false);
          const loader = await page
            .getByText(/Connexion au backoffice/i)
            .isVisible()
            .catch(() => false);
          return heading && !loader;
        },
        { timeout: 90000, intervals: [1000, 2000, 3000] },
      )
      .toBeTruthy();

    await expect(page.getByRole("button", { name: /Audit B7/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Menaces & logs/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Comptes impactés/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Export menaces CSV/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Export bundle complet/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Menaces & logs/i }).click();
    await expect(page.getByText(/Menaces \(/i)).toBeVisible({ timeout: 30000 });

    await page.getByPlaceholder("203.0.113.10").fill("203.0.113.89");
    await page.getByRole("button", { name: /Appliquer les filtres/i }).click();
    await expect(page.getByText(/IP : 203\.0\.113\.89/i)).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole("button", { name: /Comptes impactés/i }).click();
    await expect(
      page.locator("table").or(page.getByText(/Aucun compte impacté/i)),
    ).toBeVisible({ timeout: 30000 });

    await page.getByRole("button", { name: /Export bundle complet/i }).click();
    await expect(page.getByText(/SHA-256/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/security_export/i)).toBeVisible({
      timeout: 20000,
    });
  });

  test("onglet audit — tableau ou empty state honnête", async ({ page }) => {
    await page.goto("/backoffice/security/investigation", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await expect(page.getByRole("heading", { name: /Investigation/i })).toBeVisible({
      timeout: 90000,
    });
    await page.getByRole("button", { name: /Audit B7/i }).click();
    await expect(
      page.locator("table").or(page.getByText(/Aucun événement d’audit/i)),
    ).toBeVisible({ timeout: 30000 });
  });
});
