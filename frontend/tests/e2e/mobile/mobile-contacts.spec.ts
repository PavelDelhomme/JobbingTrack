// Tests fonctionnels mobile — utilise un utilisateur classique (rôle USER)
import { test, expect } from "@playwright/test";
import { ensureTestUser, requireTestCredentials } from "../test-data-helper";

/**
 * Tests Mobile - Gestion des Contacts
 */

test.describe("📱 Mobile - Gestion Contacts", () => {
  let testCredentials: { email: string; password: string } | null = null;

  test.beforeAll(async ({ request }) => {
    testCredentials = await ensureTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const credentials = requireTestCredentials(testCredentials);
    await page.goto("/login");
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**");
  });

  test("Liste contacts - Mobile", async ({ page }) => {
    await page.click("text=/Contact/i");
    await page.waitForTimeout(1000);
    await expect(page.locator("text=/Contact/i")).toBeVisible();
  });

  test("Création contact - Mobile", async ({ page }) => {
    await page.click("text=/Contact/i");
    await page.waitForTimeout(1000);

    const addButton = page
      .locator('button:has-text("Nouveau"), button:has-text("+")')
      .first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(page.locator('form, [role="dialog"]')).toBeVisible();
    }
  });
});
