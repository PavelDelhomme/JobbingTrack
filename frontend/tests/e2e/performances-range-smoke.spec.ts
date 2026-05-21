import { test, expect } from "@playwright/test";

const PAGES = [
  "/b4ck0ff1ce/performances/network",
  "/b4ck0ff1ce/performances/disk",
  "/b4ck0ff1ce/performances/containers",
  "/b4ck0ff1ce/performances/latency",
] as const;

async function waitForChartsReady(page: import("@playwright/test").Page) {
  await page
    .locator("main")
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
  await expect
    .poll(
      async () => {
        const loading = await page.getByText(/^Chargement…$/i).count();
        const charts = await page
          .locator(".recharts-responsive-container, .recharts-wrapper")
          .count();
        return loading === 0 && charts > 0;
      },
      { timeout: 90_000, intervals: [500, 1000, 2000] },
    )
    .toBeTruthy();
}

async function countCharts(page: import("@playwright/test").Page) {
  return page
    .locator(".recharts-responsive-container, .recharts-wrapper")
    .count();
}

async function expectNoNetworkErrorOverlay(
  page: import("@playwright/test").Page,
) {
  const overlay = page.getByText(/Network Error|AxiosError/i);
  await expect(overlay).toHaveCount(0, { timeout: 5_000 });
}

for (const path of PAGES) {
  test(`${path} — plages sans flash vide ni Network Error`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto(path, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await waitForChartsReady(page);
    await expectNoNetworkErrorOverlay(page);

    const initialCharts = await countCharts(page);
    expect(initialCharts).toBeGreaterThan(0);

    const range7d = page.getByRole("button", { name: /^7\s*j/i }).first();
    if (await range7d.isVisible().catch(() => false)) {
      await range7d.click();
      await page.waitForTimeout(800);
      await expectNoNetworkErrorOverlay(page);
      expect(await countCharts(page)).toBeGreaterThan(0);
      const loading = page.getByText(/^Chargement…$/i);
      await expect(loading).toHaveCount(0, { timeout: 15_000 });
    }

    const range24h = page.getByRole("button", { name: /^24\s*h/i }).first();
    if (await range24h.isVisible().catch(() => false)) {
      await range24h.click();
      await page.waitForTimeout(800);
      await expectNoNetworkErrorOverlay(page);
      expect(await countCharts(page)).toBeGreaterThan(0);
    }
  });
}
