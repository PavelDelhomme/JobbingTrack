import { expect, test } from "@playwright/test";

test.describe("Services B10 — filtres liste", () => {
  test.describe.configure({ timeout: 120000 });

  test("filtres état/cpu/mémoire avec sync URL", async ({ page }) => {
    await page.goto("/backoffice/services", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(
      page.getByRole("heading", { name: /Liste des Services/i }),
    ).toBeVisible({ timeout: 90000 });

    await page.locator("label", { hasText: "État" }).locator("select").selectOption("running");
    await page.getByRole("button", { name: /Appliquer les filtres/i }).click();

    await expect(page).toHaveURL(/status=running/, { timeout: 15000 });
    await expect(page.getByText(/État : Actifs/i)).toBeVisible({ timeout: 15000 });

    await page.locator("label", { hasText: "CPU" }).locator("select").selectOption("low");
    await page.getByRole("button", { name: /Appliquer les filtres/i }).click();

    await expect(page).toHaveURL(/cpu=low/, { timeout: 15000 });

    await page.getByRole("button", { name: /Réinitialiser/i }).click();
    await expect(page).not.toHaveURL(/status=running/);
    await expect(page).not.toHaveURL(/cpu=low/);
  });
});
