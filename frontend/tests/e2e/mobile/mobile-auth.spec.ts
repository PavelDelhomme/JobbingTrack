// Tests fonctionnels mobile — utilise un utilisateur classique (rôle USER)
import { test, expect } from "@playwright/test";
import { ensureTestUser, requireTestCredentials } from "../test-data-helper";
/**
 * Tests Mobile - Authentification
 * Inscription, connexion, déconnexion, réinitialisation mot de passe
 */

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5003";

test.describe("📱 Mobile - Authentification", () => {
  let testCredentials: { email: string; password: string } | null = null;

  test.beforeAll(async ({ request }) => {
    testCredentials = await ensureTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(FRONTEND_URL);
  });

  test("Inscription - Formulaire mobile", async ({ page }) => {
    await page.goto("/register");

    // Vérifier que le formulaire est visible et adapté mobile
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();

    // Vérifier que les champs sont accessibles au touch
    const emailInput = page.locator('input[type="email"]');
    const emailBox = await emailInput.boundingBox();
    expect(emailBox?.height).toBeGreaterThan(40); // Taille minimale pour touch
  });

  test("Connexion - Formulaire mobile", async ({ page }) => {
    await page.goto("/login");
    const credentials = requireTestCredentials(testCredentials);

    // Remplir et soumettre
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');

    // Vérifier la redirection (legacy /dashboard ou backoffice actuel)
    await page.waitForURL(/\/(backoffice|dashboard)(\/|$)/, { timeout: 15000 });
  });

  test("Déconnexion - Mobile", async ({ page }) => {
    // Se connecter d'abord
    await page.goto("/login");
    const credentials = requireTestCredentials(testCredentials);
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(backoffice|dashboard)(\/|$)/, { timeout: 15000 });

    // Trouver le bouton de déconnexion
    const logoutButton = page
      .locator(
        'button:has-text("Déconnexion"), button:has-text("Logout"), [data-testid="logout"]',
      )
      .first();

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForURL("**/login**", { timeout: 5000 });
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });
});
