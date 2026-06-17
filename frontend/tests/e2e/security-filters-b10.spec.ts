import { expect, test } from "@playwright/test";

test.describe("Menaces B10 — FilterBar", () => {
  test.describe.configure({ timeout: 120000 });

  test("filtres sévérité avec apply explicite", async ({ page }) => {
    await page.goto("/backoffice/security/threats", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByRole("heading", { name: /Menaces/i })).toBeVisible({
      timeout: 90000,
    });

    await page
      .getByRole("checkbox", { name: /Sévérité: Haute/i })
      .check();
    await expect(
      page.getByText("Filtres modifiés, pas encore appliqués"),
    ).toBeVisible();

    await page.getByRole("button", { name: /Appliquer les filtres/i }).click();
    await expect(page.getByText(/sévérité Haute/i)).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /Réinitialiser/i }).click();
    await expect(page.getByText(/sévérité Haute/i)).toHaveCount(0);
  });
});

test.describe("Incidents B10 — FilterBar", () => {
  test.describe.configure({ timeout: 120000 });

  test("filtres gravité avec apply explicite", async ({ page }) => {
    await page.goto("/backoffice/security/incidents", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(
      page.getByRole("heading", { name: /Incidents & menaces/i }),
    ).toBeVisible({ timeout: 90000 });

    await page
      .getByRole("checkbox", { name: /Gravité: Critique/i })
      .check();
    await expect(
      page.getByText("Filtres modifiés, pas encore appliqués"),
    ).toBeVisible();

    await page.getByRole("button", { name: /Appliquer les filtres/i }).click();
    await expect(page.getByText(/Gravité : Critique/i)).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole("button", { name: /Réinitialiser/i }).click();
    await expect(page.getByText(/Gravité : Critique/i)).toHaveCount(0);
  });
});
