import { test, expect } from "@playwright/test";

const PAGES = [
  "/backoffice/statistics",
  "/backoffice/statistics/security",
  "/backoffice/statistics/log-stats",
  "/backoffice/statistics/app-data",
] as const;

for (const path of PAGES) {
  test(`${path} charge sans erreur réseau`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(path, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page
      .locator("main")
      .first()
      .waitFor({ state: "visible", timeout: 60_000 });
    await expect(page.getByText(/Network Error|AxiosError/i)).toHaveCount(0);
    const body = (await page.locator("body").textContent()) ?? "";
    expect(body.length).toBeGreaterThan(200);
    await expect(
      page.getByRole("navigation", { name: "Sous-sections Statistiques" }),
    ).toBeVisible();
    for (const label of [
      "Vue d’ensemble",
      "App data",
      "Sécurité",
      "Logs (stats)",
    ]) {
      await expect(
        page
          .getByRole("navigation", { name: "Sous-sections Statistiques" })
          .getByRole("link", { name: label }),
      ).toBeVisible();
    }
    if (path === "/backoffice/statistics") {
      await expect(
        page.getByRole("heading", { name: /Disponibilité dans le temps/i }),
      ).toBeVisible({ timeout: 90_000 });
      await expect(
        page.getByText(/Source : Persistance system_metrics/i),
      ).toBeVisible({ timeout: 90_000 });
      await expect(page.getByText(/Taux d'erreur dérivé/i)).toBeVisible();
      await expect(page.getByText(/Période : /i)).toBeVisible({
        timeout: 90_000,
      });
    }
    if (path === "/backoffice/statistics/security") {
      await expect(
        page.getByText(/Cohérence avec la console Sécurité live/i),
      ).toBeVisible({ timeout: 90_000 });
      await expect(
        page.getByText("Score persisté", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Score live", { exact: true })).toBeVisible();
    }
  });
}
