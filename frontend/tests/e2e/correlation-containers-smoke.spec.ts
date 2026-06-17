import { test, expect } from "@playwright/test";

test.describe("Performances — Corrélation signaux conteneurs", () => {
  test("sous-page charge avec navigation et panneaux", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/backoffice/performances/correlation/containers", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page
      .locator("main")
      .first()
      .waitFor({ state: "visible", timeout: 60_000 });

    await expect(page.getByText(/Network Error|AxiosError/i)).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Sous-sections Corrélation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Signaux conteneurs" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /Corrélation — signaux conteneurs/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Synthèse des pics/i }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Comparaison superposée/i)).toBeVisible();
    await expect(page.getByText(/Détail conteneur actif/i)).toBeVisible();
  });

  test("navigation depuis Corrélation incidents", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/backoffice/performances/correlation", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page
      .locator("main")
      .first()
      .waitFor({ state: "visible", timeout: 60_000 });
    await page
      .getByRole("navigation", { name: "Sous-sections Corrélation" })
      .getByRole("link", { name: "Signaux conteneurs" })
      .click();
    await expect(page).toHaveURL(
      /\/backoffice\/performances\/correlation\/containers/,
    );
  });
});
