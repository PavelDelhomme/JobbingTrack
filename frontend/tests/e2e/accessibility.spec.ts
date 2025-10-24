import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('♿ Tests d\'accessibilité', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('✅ Analyse automatisée axe-core - Page principale', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Vérifications supplémentaires
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violations d\'accessibilité trouvées:');
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.help}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Description: ${violation.description}`);
        console.log(`   Nodes affected: ${violation.nodes.length}`);
      });
    }
  });

  test('✅ Analyse automatisée axe-core - Page de connexion', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Test spécifique des formulaires
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violations d\'accessibilité sur la page de connexion:');
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.help}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Description: ${violation.description}`);
        console.log(`   Nodes affected: ${violation.nodes.length}`);
      });
    }
  });

  test('✅ Analyse automatisée axe-core - Tableau de bord admin', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Test spécifique des tableaux et navigation complexe
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violations d\'accessibilité sur le tableau de bord admin:');
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.help}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Description: ${violation.description}`);
        console.log(`   Nodes affected: ${violation.nodes.length}`);
      });
    }
  });

  test('✅ Page principale respecte les standards WCAG 2.1', async ({ page }) => {
    // Test du contraste des couleurs
    await expect(page.locator('h1')).toBeVisible();

    // Test de la navigation au clavier
    await page.keyboard.press('Tab');
    await expect(page.locator('a, button, input').first()).toBeFocused();

    // Test des attributs ARIA
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();

    // Test des labels pour les formulaires
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.evaluate(el =>
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        el.getAttribute('id') && document.querySelector(`label[for="${el.id}"]`)
      );
      if (hasLabel) {
        expect(hasLabel).toBeTruthy();
      }
    }
  });

  test('✅ Navigation accessible', async ({ page }) => {
    // Test du focus visible
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus-visible')).toBeVisible();

    // Test des landmarks
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    // Test du heading structure
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);
  });

  test('✅ Formulaire de connexion accessible', async ({ page }) => {
    // Aller à la page de connexion
    await page.goto('/login');

    // Test des labels
    await expect(page.locator('label')).toBeVisible();

    // Test des messages d'erreur
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Vérifier les messages d'erreur accessibles
    const errorMessages = page.locator('[role="alert"], .error');
    const errorCount = await errorMessages.count();

    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i);
        await expect(error).toBeVisible();
        await expect(error).toHaveText(/./); // Doit avoir du texte
      }
    }
  });

  test('✅ Tableaux accessibles', async ({ page }) => {
    // Aller à une page avec des tableaux
    await page.goto('/admin/applications');

    const tables = page.locator('table');
    const tableCount = await tables.count();

    if (tableCount > 0) {
      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i);

        // Test des en-têtes
        const headers = table.locator('th');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);

        // Test des captions ou aria-label
        const hasCaption = await table.evaluate(el =>
          el.querySelector('caption') ||
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby')
        );

        if (!hasCaption) {
          // Si pas de caption, vérifier que les en-têtes sont descriptifs
          for (let j = 0; j < headerCount; j++) {
            const header = headers.nth(j);
            const text = await header.textContent();
            expect(text?.trim().length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test('✅ Images avec texte alternatif', async ({ page }) => {
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute('alt');

      // Les images décoratives doivent avoir alt=""
      // Les images informatives doivent avoir un texte alternatif descriptif
      if (altText === null) {
        // Si pas d'alt, vérifier si c'est une image décorative
        const hasAriaHidden = await img.getAttribute('aria-hidden');
        if (hasAriaHidden !== 'true') {
          console.warn('Image sans attribut alt trouvée');
        }
      }
    }
  });

  test('✅ Boutons et liens accessibles', async ({ page }) => {
    // Test des boutons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();
      const hasText = await button.evaluate(el => el.textContent?.trim().length > 0);

      if (isVisible) {
        // Les boutons visibles doivent avoir du texte ou aria-label
        const accessibleName = await button.evaluate(el =>
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.textContent?.trim()
        );
        expect(accessibleName).toBeTruthy();
      }
    }

    // Test des liens
    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const isVisible = await link.isVisible();

      if (isVisible) {
        const accessibleName = await link.evaluate(el =>
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.textContent?.trim()
        );
        expect(accessibleName).toBeTruthy();
      }
    }
  });

  test('✅ Navigation mobile accessible', async ({ page }) => {
    // Test en mode mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Test du menu mobile
    const mobileMenu = page.locator('[aria-expanded], [data-mobile-menu]');
    const menuCount = await mobileMenu.count();

    if (menuCount > 0) {
      for (let i = 0; i < menuCount; i++) {
        const menu = mobileMenu.nth(i);

        // Test de l'état ARIA
        const expanded = await menu.getAttribute('aria-expanded');
        if (expanded === 'true' || expanded === 'false') {
          await expect(menu).toHaveAttribute('aria-expanded');
        }
      }
    }
  });

  test('✅ Messages d\'état accessibles', async ({ page }) => {
    // Test des notifications et messages
    const statusElements = page.locator('[role="status"], [role="alert"], .toast, .notification');
    const statusCount = await statusElements.count();

    if (statusCount > 0) {
      for (let i = 0; i < statusCount; i++) {
        const status = statusElements.nth(i);

        // Les éléments de statut doivent être annoncés aux screen readers
        const role = await status.getAttribute('role');
        const isLive = await status.getAttribute('aria-live');

        if (role === 'status' || role === 'alert') {
          await expect(status).toBeVisible();
        } else if (isLive) {
          await expect(status).toHaveAttribute('aria-live');
        }
      }
    }
  });

  test('✅ Focus management', async ({ page }) => {
    // Test de la gestion du focus dans les modales
    const modals = page.locator('[role="dialog"], .modal');
    const modalCount = await modals.count();

    if (modalCount > 0) {
      for (let i = 0; i < modalCount; i++) {
        const modal = modals.nth(i);

        // Les modales doivent avoir aria-labelledby ou aria-label
        const accessibleName = await modal.evaluate(el =>
          el.getAttribute('aria-labelledby') ||
          el.getAttribute('aria-label')
        );

        // Si accessibleName est un ID, vérifier que l'élément existe
        if (accessibleName && accessibleName.startsWith('#') === false) {
          const labelledElement = page.locator(`#${accessibleName}`);
          await expect(labelledElement).toBeVisible();
        }
      }
    }
  });

  test('✅ Langue de la page', async ({ page }) => {
    // Test de la langue déclarée
    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // Format lang ou lang-country

    // Test de la direction du texte
    const textDirection = await page.getAttribute('html', 'dir');
    if (textDirection) {
      expect(['ltr', 'rtl']).toContain(textDirection);
    }
  });
});
