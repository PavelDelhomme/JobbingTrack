/**
 * Tests E2E Playwright — Page Backoffice Émulateur mobile
 * Vérifie que la page mobile-emulator charge, affiche les parcours et se comporte correctement
 * (avec ou sans contrôleur / appareil ADB).
 */
import { test, expect } from '@playwright/test';

test.describe('Backoffice — Émulateur mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/backoffice/mobile-emulator');
    await page.waitForLoadState('domcontentloaded');
  });

  test('affiche la page Émulateur mobile après connexion', async ({ page }) => {
    await expect(page).toHaveURL(/\/backoffice\/mobile-emulator/);
    await expect(page.locator('text=Parcours utilisateur mobile').first()).toBeVisible({ timeout: 10000 });
  });

  test('affiche la section parcours principaux avec au moins un parcours', async ({ page }) => {
    await expect(page.locator('text=Parcours principaux').first()).toBeVisible({ timeout: 10000 });
    // Au moins un des 8 parcours principaux
    const parcoursPrincipal = page.locator('button:has-text("Parcours complet"), button:has-text("Inscription"), button:has-text("Reset mot de passe"), button:has-text("Première utilisation"), button:has-text("Usage quotidien"), button:has-text("Archives"), button:has-text("avec données")').first();
    await expect(parcoursPrincipal).toBeVisible({ timeout: 8000 });
  });

  test('affiche le bouton Lancer le parcours', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Lancer le parcours/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('bouton Lancer le parcours désactivé ou message si aucun appareil', async ({ page }) => {
    const btn = page.getByRole('button', { name: /Lancer le parcours/i }).first();
    await expect(btn).toBeVisible({ timeout: 8000 });
    // Soit le bouton est disabled (pas d'appareil), soit un message demande de sélectionner un appareil
    const disabled = await btn.isDisabled();
    const hasDeviceMessage = await page.locator('text=Selectionnez un appareil').isVisible();
    expect(disabled || hasDeviceMessage).toBeTruthy();
  });

  test('affiche la liste des parcours (tous les parcours ou filtre)', async ({ page }) => {
    await expect(page.locator('text=Tous les parcours').first()).toBeVisible({ timeout: 8000 });
    // Au moins un bouton de parcours dans la liste complète
    const anyScenario = page.locator('button').filter({ hasText: /Login|Inscription|Parcours|Reset|Navigation|CRUD|Verification/ }).first();
    await expect(anyScenario).toBeVisible({ timeout: 5000 });
  });

  test('les 8 parcours principaux sont présents', async ({ page }) => {
    const labels = [
      'Inscription complète',
      'Reset mot de passe',
      'Premiere utilisation',
      'Usage quotidien',
      'Parcours complet (avec données)',
      'Création candidature + relance + entretien + appel',
      'Archives & Corbeille',
      'Parcours complet',
    ];
    for (const label of labels) {
      await expect(page.locator(`button:has-text("${label}")`).first()).toBeVisible({ timeout: 6000 });
    }
  });

  test('affiche un statut contrôleur (connecté ou injoignable)', async ({ page }) => {
    // Après chargement, un log ou indicateur apparaît
    await page.waitForTimeout(3000);
    const hasControllerLog = await page.locator('text=Controleur').isVisible();
    const hasConnecte = await page.locator('text=connecte').isVisible();
    const hasInjoignable = await page.locator('text=injoignable').isVisible();
    expect(hasControllerLog || hasConnecte || hasInjoignable).toBeTruthy();
  });
});

test.describe('Backoffice — Émulateur mobile (parcours avec données)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/backoffice/mobile-emulator');
    await page.waitForLoadState('domcontentloaded');
  });

  test('sélection du parcours complet avec données', async ({ page }) => {
    await expect(page.locator('button:has-text("Parcours complet (avec données)")').first()).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Parcours complet (avec données)")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Génère données de test').first()).toBeVisible({ timeout: 3000 });
  });

  test('sélection du parcours Inscription complète', async ({ page }) => {
    await page.locator('button:has-text("Inscription complète")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Deconnexion').first()).toBeVisible({ timeout: 3000 });
  });

  test('sélection du parcours Archives & Corbeille', async ({ page }) => {
    await page.locator('button:has-text("Archives & Corbeille")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Archives').first()).toBeVisible({ timeout: 3000 });
  });
});
