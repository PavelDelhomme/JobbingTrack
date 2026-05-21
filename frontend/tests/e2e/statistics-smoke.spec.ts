import { test, expect } from "@playwright/test";

const PAGES = [
  "/b4ck0ff1ce/statistics",
  "/b4ck0ff1ce/statistics/log-stats",
  "/b4ck0ff1ce/statistics/app-data",
] as const;

for (const path of PAGES) {
  test(`${path} charge sans erreur réseau`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(path, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.locator("main").first().waitFor({ state: "visible", timeout: 60_000 });
    await expect(page.getByText(/Network Error|AxiosError/i)).toHaveCount(0);
    const body = (await page.locator("body").textContent()) ?? "";
    expect(body.length).toBeGreaterThan(200);
  });
}
