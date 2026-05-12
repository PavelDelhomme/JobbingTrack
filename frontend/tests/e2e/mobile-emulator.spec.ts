/**
 * Tests E2E Playwright — Page Backoffice Émulateur mobile
 * Vérifie que la page mobile-emulator charge, affiche les parcours et se comporte correctement
 * (avec ou sans contrôleur / appareil ADB).
 */
import { test, expect } from '@playwright/test';

test.describe('Backoffice — Émulateur mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/b4ck0ff1ce/mobile-emulator');
    await page.waitForLoadState('domcontentloaded');
  });

  test('affiche la page Émulateur mobile après connexion', async ({ page }) => {
    await expect(page).toHaveURL(/\/b4ck0ff1ce\/mobile-emulator/);
    await expect(page.locator('text=Parcours utilisateur mobile').first()).toBeVisible({ timeout: 10000 });
  });

  test('affiche la section inscription + vérification email et tous les parcours', async ({ page }) => {
    await expect(page.locator('text=Inscription + vérification email').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Tous les parcours').first()).toBeVisible({ timeout: 8000 });
    const anyScenario = page.locator('button').filter({ hasText: /Inscription \+ vérif\. email \(Gmail\)|Login rapide|Inscription compl/ }).first();
    await expect(anyScenario).toBeVisible({ timeout: 5000 });
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

  test('parcours inscription + vérif. email (Gmail, Proton, BlueMail) et autres parcours visibles', async ({ page }) => {
    await expect(page.locator('text=Inscription + vérification email').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=Tous les parcours').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    // Libellés réels des scénarios (MOBILE_SCENARIOS / adb-scenarios.ts)
    const labels = [
      /Vérif\. email \(Gmail\)/,
      /Vérif\. email \(Proton\)/,
      /Vérif\. email \(BlueMail\)/,
      /Inscription \(désactivée|complète\)/,
      'Reset mot de passe',
      'Login rapide',
      /Parcours complet/,
    ];
    let visibleCount = 0;
    for (const label of labels) {
      const btn = page.getByRole('button', { name: label }).first();
      if (await btn.isVisible().catch(() => false)) visibleCount++;
    }
    expect(visibleCount, 'Au moins 4 parcours (Gmail/Proton/BlueMail, Reset, Login, Parcours complet) doivent être visibles').toBeGreaterThanOrEqual(4);
  });

  test('affiche un statut contrôleur (connecté ou injoignable)', async ({ page }) => {
    await page.waitForTimeout(3000);
    const hasConnecte = await page.getByText(/Controleur emulateur connecte/).first().isVisible().catch(() => false);
    const hasInjoignable = await page.getByText('injoignable').first().isVisible().catch(() => false);
    expect(hasConnecte || hasInjoignable).toBeTruthy();
  });
});

test.describe('Backoffice — Émulateur mobile (interface complète, boutons et sections)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/b4ck0ff1ce/mobile-emulator');
    await page.waitForLoadState('domcontentloaded');
  });

  test('bouton Vérifier le contrôleur visible et cliquable', async ({ page }) => {
    const btn = page.getByTestId('btn-verify-controller');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await expect(btn).toBeEnabled();
    await btn.click();
    await page.waitForTimeout(500);
    // Pas d’erreur attendue ; le statut peut rester injoignable si le contrôleur ne tourne pas
  });

  test('section contrôleur : soit Démarrer le contrôleur soit Build/Installer/Lancer/Désinstaller', async ({ page }) => {
    await page.waitForTimeout(3500);
    const startController = page.getByRole('button', { name: /Démarrer le contrôleur/i }).first();
    const buildBtn = page.getByTestId('btn-build-apk');
    const installBtn = page.getByTestId('btn-install-run');
    const launchOnlyBtn = page.getByTestId('btn-launch-only');
    const uninstallBtn = page.getByTestId('btn-uninstall-app');
    const hasStart = await startController.isVisible().catch(() => false);
    const hasBuild = await buildBtn.isVisible().catch(() => false);
    const hasInstall = await installBtn.isVisible().catch(() => false);
    const hasLaunchOnly = await launchOnlyBtn.isVisible().catch(() => false);
    const hasUninstall = await uninstallBtn.isVisible().catch(() => false);
    expect(hasStart || (hasBuild && hasInstall && hasLaunchOnly && hasUninstall)).toBeTruthy();
  });

  test('boutons Build APK, Installer et lancer, Lancer seulement, Désinstaller présents quand contrôleur connecté', async ({ page }) => {
    await page.waitForTimeout(3500);
    const installBtn = page.getByTestId('btn-install-run');
    const visible = await installBtn.isVisible().catch(() => false);
    if (!visible) {
      return;
    }
    await expect(installBtn).toBeVisible();
    await expect(page.getByTestId('btn-launch-only')).toBeVisible();
    await expect(page.getByTestId('btn-uninstall-app')).toBeVisible();
    const buildOrForce = page.getByTestId('btn-build-apk').or(page.getByTestId('btn-force-rebuild'));
    await expect(buildOrForce.first()).toBeVisible();
  });

  test('bouton Lancer le parcours présent', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Lancer le parcours/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('section Nettoyer un compte test visible quand contrôleur connecté', async ({ page }) => {
    await page.waitForTimeout(3500);
    const section = page.getByTestId('section-cleanup-account');
    const visible = await section.isVisible().catch(() => false);
    if (visible) {
      await expect(page.getByText(/Nettoyer un compte test/i).first()).toBeVisible();
    }
  });

  test('Demarrer AVD et Flutter run présents quand contrôleur connecté', async ({ page }) => {
    await page.waitForTimeout(3500);
    const startAvd = page.getByTestId('btn-start-avd');
    const visible = await startAvd.isVisible().catch(() => false);
    if (!visible) {
      return;
    }
    await expect(startAvd).toBeVisible();
    await expect(page.getByRole('button', { name: /Flutter run/i }).first()).toBeVisible();
  });
});

test.describe('Backoffice — Émulateur mobile (parcours avec données)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/b4ck0ff1ce/mobile-emulator');
    await page.waitForLoadState('domcontentloaded');
  });

  test('sélection du parcours complet avec données', async ({ page }) => {
    await expect(page.locator('button:has-text("Parcours complet (avec données)")').first()).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Parcours complet (avec données)")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Génère données de test').first()).toBeVisible({ timeout: 3000 });
  });

  test('sélection du parcours Inscription complète', async ({ page }) => {
    await page.locator('text=Tous les parcours').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const inscriptionBtn = page.getByRole('button', { name: /Inscription compl|Inscription \(désactivée/ }).first();
    await expect(inscriptionBtn).toBeVisible({ timeout: 8000 });
    await inscriptionBtn.click();
    await page.waitForTimeout(500);
    const anchor = page.locator('text=Déconnexion').or(page.locator('text=Deconnexion')).or(page.locator('text=étapes')).or(page.locator('text=etapes')).or(page.locator('[data-testid="run-journey-btn"]')).first();
    await expect(anchor).toBeVisible({ timeout: 8000 });
  });

  test('sélection du parcours Archives & Corbeille', async ({ page }) => {
    await page.locator('button:has-text("Archives & Corbeille")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Archives').first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Backoffice — Émulateur mobile (exécution via système de scénarios)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/b4ck0ff1ce/mobile-emulator');
    await page.waitForLoadState('domcontentloaded');
  });

  test('lance un parcours inscription + vérif. email (Gmail) via le système de scénarios', async ({ page }) => {
    await page.locator('text=Inscription + vérification email').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const gmailBtn = page.getByRole('button', { name: /Vérif\. email \(Gmail\)/ }).first();
    await expect(gmailBtn).toBeVisible({ timeout: 10000 });
    await gmailBtn.click();
    await page.waitForTimeout(400);

    const runBtn = page.getByTestId('run-journey-btn');
    await expect(runBtn).toBeVisible({ timeout: 5000 });
    const isDisabled = await runBtn.isDisabled();

    if (isDisabled) {
      return;
    }

    await runBtn.click();
    await page.waitForTimeout(1000);

    const stepResults = page.getByTestId('journey-step-results');
    await expect(stepResults).toBeVisible({ timeout: 45000 });
    const successOrError = page.locator('[data-testid="step-success"], [data-testid="step-error"]').first();
    await expect(successOrError).toBeVisible({ timeout: 60000 });
    const hasSuccess = await page.locator('[data-testid="step-success"]').count() > 0;
    expect(hasSuccess).toBeTruthy();
  });
});
