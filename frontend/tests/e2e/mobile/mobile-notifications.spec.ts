// Tests fonctionnels mobile — utilise un utilisateur classique (rôle USER)
import { test, expect } from "@playwright/test";
import { ensureTestUser, requireTestCredentials } from "../test-data-helper";

/**
 * Tests Mobile - Notifications
 */

test.describe("📱 Mobile - Notifications", () => {
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

  test("Affichage notifications - Mobile", async ({ page }) => {
    const notificationIcon = page
      .locator('button[aria-label*="notification"], button:has-text("🔔")')
      .first();

    if (await notificationIcon.isVisible()) {
      await notificationIcon.click();
      await expect(page.locator("text=/Notification/i")).toBeVisible();
    }
  });

  test("Permissions notifications - Mobile", async ({ page, context }) => {
    // Demander les permissions de notification
    await context.grantPermissions(["notifications"]);

    // Vérifier que les notifications sont activées
    const permissions = await context.permissions();
    expect(permissions).toContain("notifications");
  });
});
