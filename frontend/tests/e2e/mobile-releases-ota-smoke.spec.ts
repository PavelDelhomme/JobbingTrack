import { expect, test } from "@playwright/test";

test("Mobile releases OTA — panel chargé sans 404", async ({ page }) => {
  const releasesResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/api/v1/admin/mobile/releases") &&
      res.request().method() === "GET",
    { timeout: 120_000 },
  );

  await page.goto("/backoffice/mobile/releases", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  const res = await releasesResponse;
  expect(res.status()).toBe(200);

  await expect(page.getByRole("heading", { name: /Mobile — releases OTA/i })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: /Vue d['’]ensemble des versions/i })).toBeVisible();
  await expect(page.getByText(/Alignement des versions/i)).toBeVisible();
  await expect(page.getByText(/Build APK, publication canal dev/i)).toBeVisible();
  await expect(page.getByText(/Diagnostic API \(404\)/i)).toHaveCount(0);
  await expect(page.getByText(/Historique des builds/i)).toBeVisible();
});
