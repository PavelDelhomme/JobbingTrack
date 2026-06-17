import { test, expect } from "@playwright/test";

const KPI_LINKS = [
  {
    title: /Sessions actives/i,
    url: /\/backoffice\/users\?status=active/,
  },
  {
    title: /Signaux sécurité/i,
    url: /\/backoffice\/security\/incidents/,
  },
  {
    title: /Santé système/i,
    url: /\/backoffice\/performances\/?$/,
  },
  {
    title: /Temps de réponse/i,
    url: /\/backoffice\/performances\/latency/,
  },
  {
    title: /CPU conteneurs JobbingTrack/i,
    url: /\/backoffice\/performances\/cpu-memory/,
  },
  {
    title: /Mémoire conteneurs JobbingTrack/i,
    url: /\/backoffice\/performances\/cpu-memory/,
  },
] as const;

test.describe("Backoffice — cartes KPI vue d'ensemble", () => {
  for (const { title, url } of KPI_LINKS) {
    test(`carte ${title} → destination métier`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto("/backoffice", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page
        .locator("main")
        .first()
        .waitFor({ state: "visible", timeout: 60_000 });

      const card = page.getByRole("link", { name: title }).first();
      await expect(card).toBeVisible({ timeout: 60_000 });
      await Promise.all([page.waitForURL(url, { timeout: 30_000 }), card.click()]);
      await expect(page.getByText(/Network Error|AxiosError/i)).toHaveCount(0);
    });
  }
});
