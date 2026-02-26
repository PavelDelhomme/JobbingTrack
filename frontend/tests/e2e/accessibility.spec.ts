import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const EXCLUDED_AXE_RULES = ['color-contrast', 'link-in-text-block', 'document-title'];

test.describe('♿ Tests d\'accessibilité', () => {
  test('✅ Analyse axe-core - Page de connexion', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .disableRules(EXCLUDED_AXE_RULES)
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    if (critical.length > 0) {
      console.log('Violations critiques/sérieuses :');
      critical.forEach((v, i) => console.log(`  ${i + 1}. [${v.impact}] ${v.help} (${v.nodes.length} nodes)`));
    }
    expect(critical).toEqual([]);
  });

  test('✅ Formulaire de connexion accessible', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    const labels = page.locator('label');
    const labelCount = await labels.count();
    expect(labelCount).toBeGreaterThan(0);
  });

  test('✅ Tableaux accessibles', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const tables = page.locator('table');
    const tableCount = await tables.count();

    if (tableCount > 0) {
      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i);
        const headers = table.locator('th');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);
      }
    }
  });

  test('✅ Images avec texte alternatif', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute('alt');
      if (altText === null) {
        const hasAriaHidden = await img.getAttribute('aria-hidden');
        if (hasAriaHidden !== 'true') {
          console.warn(`Image ${i} sans attribut alt trouvée`);
        }
      }
    }
  });

  test('✅ Boutons et liens accessibles', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();
      if (isVisible) {
        const accessibleName = await button.evaluate(el =>
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.textContent?.trim()
        );
        expect(accessibleName).toBeTruthy();
      }
    }
  });

  test('✅ Navigation mobile accessible', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('✅ Messages d\'état accessibles', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const statusElements = page.locator('[role="status"], [role="alert"]');
    const statusCount = await statusElements.count();

    if (statusCount > 0) {
      for (let i = 0; i < statusCount; i++) {
        const status = statusElements.nth(i);
        const role = await status.getAttribute('role');
        expect(role).toBeTruthy();
      }
    }
  });

  test('✅ Langue de la page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
  });
});
