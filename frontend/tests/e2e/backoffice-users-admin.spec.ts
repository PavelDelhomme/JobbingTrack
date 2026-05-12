/**
 * Tests E2E backoffice : filtre utilisateurs de test, nettoyage, abonnement depuis détail utilisateur.
 */
import { test, expect } from '@playwright/test';

test.describe('Backoffice – Utilisateurs (filtre test, nettoyage, abonnement)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/b4ck0ff1ce/users');
    await page.waitForLoadState('domcontentloaded');
  });

  test('affiche le filtre "Utilisateurs de test" et le bouton Nettoyer', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Gestion des Utilisateurs/i })).toBeVisible({ timeout: 10000 });
    const filterSelect = page.locator('select').filter({ has: page.locator('option[value="test"]') });
    await expect(filterSelect).toBeVisible({ timeout: 5000 });
    const cleanButton = page.getByRole('button', { name: /Nettoyer les utilisateurs de test/i });
    await expect(cleanButton).toBeVisible({ timeout: 5000 });
  });

  test('détail utilisateur affiche la section Abonnement & facturation', async ({ page }) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForURL(/\/b4ck0ff1ce\/users\/[^/]+$/).catch(() => {});
      await expect(page.getByText(/Abonnement & facturation/i)).toBeVisible({ timeout: 5000 });
      const billingLink = page.getByRole('link', { name: /Voir \/ gérer l'abonnement/i });
      await expect(billingLink).toBeVisible({ timeout: 3000 });
    }
  });

  test('page Billing avec userId affiche le contexte utilisateur', async ({ page }) => {
    await page.goto('/b4ck0ff1ce/billing?userId=test-user-id');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/Abonnement & facturation/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/test-user-id/)).toBeVisible({ timeout: 5000 });
  });
});
