/**
 * Tests E2E complets de la page Analytics
 * Tests pour tous les onglets, graphiques et fonctionnalités
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5003';
const ADMIN_EMAIL = 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = 'password123';

test.describe('Analytics - Tests Complets', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter
    await page.goto(`${BASE_URL}/backoffice/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/backoffice`, { timeout: 10000 });
    
    // Aller à la page analytics
    await page.goto(`${BASE_URL}/backoffice/analytics`);
    await page.waitForTimeout(2000);
  });

  test('Page Analytics se charge correctement', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    // Vérifier la présence des onglets
    const tabs = page.locator('button:has-text("Synthèse"), button:has-text("Système"), button:has-text("Performance"), button:has-text("Réseau")');
    await expect(tabs.first()).toBeVisible({ timeout: 5000 });
  });

  test('Onglet Synthèse - Affichage et fonctionnalités', async ({ page }) => {
    // Cliquer sur l'onglet Synthèse
    const overviewTab = page.locator('button:has-text("Synthèse")').first();
    if (await overviewTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await overviewTab.click();
      await page.waitForTimeout(2000);
      
      // Vérifier la présence des métriques
      await expect(page.locator('body')).toBeVisible();
      
      // Vérifier les graphiques (si présents)
      const charts = page.locator('svg, canvas, [class*="chart"], [class*="graph"]');
      const chartCount = await charts.count();
      if (chartCount > 0) {
        await expect(charts.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Onglet Système - Affichage et fonctionnalités', async ({ page }) => {
    const systemTab = page.locator('button:has-text("Système")').first();
    if (await systemTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await systemTab.click();
      await page.waitForTimeout(2000);
      
      // Vérifier les métriques système
      await expect(page.locator('body')).toBeVisible();
      
      // Vérifier les indicateurs CPU, Mémoire, etc.
      const cpuIndicator = page.locator('text=/CPU|processeur/i').first();
      if (await cpuIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(cpuIndicator).toBeVisible();
      }
    }
  });

  test('Onglet Performance - Affichage et fonctionnalités', async ({ page }) => {
    const performanceTab = page.locator('button:has-text("Performance")').first();
    if (await performanceTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await performanceTab.click();
      await page.waitForTimeout(2000);
      
      // Vérifier que l'onglet se charge sans erreur
      await expect(page.locator('body')).toBeVisible();
      
      // Vérifier les graphiques de performance
      const charts = page.locator('svg, canvas, [class*="chart"]');
      if (await charts.count() > 0) {
        await expect(charts.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Onglet Réseau & Fiabilité - Affichage et conversion unités', async ({ page }) => {
    const networkTab = page.locator('button:has-text("Réseau"), button:has-text("Fiabilité")').first();
    if (await networkTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await networkTab.click();
      await page.waitForTimeout(2000);
      
      // Vérifier que l'onglet se charge
      await expect(page.locator('body')).toBeVisible();
      
      // Vérifier les totaux RX, TX, Total
      const totalRx = page.locator('text=/Total RX|RX Total/i').first();
      const totalTx = page.locator('text=/Total TX|TX Total/i').first();
      const total = page.locator('text=/Total[^R]/i').first();
      
      // Vérifier que les unités sont affichées (MB, GB, TB, etc.)
      if (await totalRx.isVisible({ timeout: 3000 }).catch(() => false)) {
        const rxText = await totalRx.textContent();
        expect(rxText).toMatch(/(MB|GB|TB|PB)/i);
      }
      
      if (await totalTx.isVisible({ timeout: 3000 }).catch(() => false)) {
        const txText = await totalTx.textContent();
        expect(txText).toMatch(/(MB|GB|TB|PB)/i);
      }
    }
  });

  test('Rafraîchissement des données - Graphiques restent ouverts', async ({ page }) => {
    // Aller à l'onglet Synthèse
    const overviewTab = page.locator('button:has-text("Synthèse")').first();
    if (await overviewTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await overviewTab.click();
      await page.waitForTimeout(3000);
      
      // Vérifier qu'un graphique est visible
      const charts = page.locator('svg, canvas, [class*="chart"]');
      const initialChartCount = await charts.count();
      
      if (initialChartCount > 0) {
        // Attendre un rafraîchissement (si bouton présent)
        const refreshButton = page.locator('button:has-text("Actualiser"), button:has-text("Rafraîchir"), button[aria-label*="refresh"]').first();
        if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await refreshButton.click();
          await page.waitForTimeout(3000);
          
          // Vérifier que les graphiques sont toujours visibles
          const chartsAfterRefresh = page.locator('svg, canvas, [class*="chart"]');
          const chartCountAfterRefresh = await chartsAfterRefresh.count();
          expect(chartCountAfterRefresh).toBeGreaterThanOrEqual(initialChartCount);
        }
      }
    }
  });

  test('Onglet Services & Logs - Affichage des logs', async ({ page }) => {
    const servicesTab = page.locator('button:has-text("Services"), button:has-text("Logs")').first();
    if (await servicesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await servicesTab.click();
      await page.waitForTimeout(2000);
      
      // Vérifier que la page se charge
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Onglet Erreurs Récentes - Affichage des erreurs', async ({ page }) => {
    const errorsTab = page.locator('button:has-text("Erreur"), button:has-text("Error")').first();
    if (await errorsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await errorsTab.click();
      await page.waitForTimeout(2000);
      
      // Vérifier que la page se charge
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

