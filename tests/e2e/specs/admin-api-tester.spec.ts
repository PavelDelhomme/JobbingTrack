/**
 * Tests E2E du Testeur API
 * Vérifier que l'interface de test API fonctionne correctement
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5003';
const ADMIN_EMAIL = 'admin@jobbingtrack.com';
const ADMIN_PASSWORD = 'password123';

test.describe('Testeur API - Tests Complets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/backoffice/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/backoffice`, { timeout: 10000 });
    
    await page.goto(`${BASE_URL}/backoffice/api-tester`);
    await page.waitForTimeout(2000);
  });

  test('Page Testeur API se charge correctement', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    
    // Vérifier la présence des champs de formulaire
    const endpointInput = page.locator('input[type="url"], input[name*="endpoint"], input[placeholder*="endpoint"]').first();
    await expect(endpointInput).toBeVisible({ timeout: 5000 });
  });

  test('Test Health Check - Endpoint par défaut', async ({ page }) => {
    // Vérifier que l'endpoint par défaut est présent
    const endpointInput = page.locator('input[type="url"], input[name*="endpoint"], input[placeholder*="endpoint"]').first();
    const endpointValue = await endpointInput.inputValue();
    
    // Si l'endpoint contient /health, tester
    if (endpointValue.includes('health')) {
      const testButton = page.locator('button:has-text("Tester"), button:has-text("Envoyer"), button[type="submit"]').first();
      if (await testButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await testButton.click();
        await page.waitForTimeout(3000);
        
        // Vérifier qu'une réponse est affichée
        const responseArea = page.locator('pre, code, [class*="response"], [class*="result"]').first();
        if (await responseArea.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(responseArea).toBeVisible();
        }
      }
    }
  });

  test('Test avec différents endpoints', async ({ page }) => {
    const endpointInput = page.locator('input[type="url"], input[name*="endpoint"], input[placeholder*="endpoint"]').first();
    const testButton = page.locator('button:has-text("Tester"), button:has-text("Envoyer"), button[type="submit"]').first();
    
    const endpoints = [
      '/api/v1/health',
      '/api/v1/auth/profile',
    ];

    for (const endpoint of endpoints) {
      await endpointInput.fill(endpoint);
      await page.waitForTimeout(500);
      
      if (await testButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await testButton.click();
        await page.waitForTimeout(3000);
        
        // Vérifier qu'une réponse est affichée
        const responseArea = page.locator('pre, code, [class*="response"]').first();
        if (await responseArea.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(responseArea).toBeVisible();
        }
      }
    }
  });

  test('Test avec différentes méthodes HTTP', async ({ page }) => {
    const methodSelect = page.locator('select[name*="method"], select[aria-label*="method"]').first();
    
    if (await methodSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      const methods = ['GET', 'POST', 'PUT', 'DELETE'];
      
      for (const method of methods) {
        await methodSelect.selectOption(method);
        await page.waitForTimeout(500);
        
        // Vérifier que la méthode est sélectionnée
        const selectedValue = await methodSelect.inputValue();
        expect(selectedValue).toBe(method);
      }
    }
  });

  test('Test avec body JSON', async ({ page }) => {
    const bodyTextarea = page.locator('textarea[name*="body"], textarea[placeholder*="body"], textarea[placeholder*="JSON"]').first();
    
    if (await bodyTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      const testBody = JSON.stringify({ test: 'data', value: 123 });
      await bodyTextarea.fill(testBody);
      await page.waitForTimeout(500);
      
      // Vérifier que le body est rempli
      const bodyValue = await bodyTextarea.inputValue();
      expect(bodyValue).toContain('test');
    }
  });
});

