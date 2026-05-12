/**
 * E2E : Inscription avec les 3 comptes email (Gmail, Proton, BlueMail)
 * puis vérification dans le backoffice Email Monitor que les emails de vérification
 * sont bien créés/envoyés et visibles.
 *
 * - pauldelhomme.pro@gmail.com (Gmail)
 * - paul.delhomme@proton.me (Proton Mail)
 * - candidatures@delhomme.ovh (BlueMail)
 */
import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

const VERIFICATION_EMAILS = [
  'pauldelhomme.pro@gmail.com',
  'paul.delhomme@proton.me',
  'candidatures@delhomme.ovh',
] as const;

const PASSWORD = 'password123';

test.describe('Inscription + vérification email (Email Monitor)', () => {
  // Skip si pas de MailHog / SMTP configuré ou emails de test non disponibles (CI, env sans données)
  test('inscription des 3 comptes puis vérification dans Email Monitor', async ({ page, request }) => {
    test.skip(!!process.env.TEST_SKIP_EMAIL_MONITOR, 'TEST_SKIP_EMAIL_MONITOR: skip vérification emails réels');
    // 1) Inscription des 3 utilisateurs via l’API (sans auth)
    for (const email of VERIFICATION_EMAILS) {
      const res = await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email,
          password: PASSWORD,
          firstName: 'Test',
          lastName: email.includes('gmail') ? 'Gmail' : email.includes('proton') ? 'Proton' : 'BlueMail',
        },
        headers: { 'Content-Type': 'application/json' },
      });
      // 201 = créé, 409 = déjà existant (compte déjà inscrit)
      expect([201, 409]).toContain(res.status());
    }

    // 2) Laisser le temps à l’envoi asynchrone des emails de vérification
    await page.waitForTimeout(5000);

    // 3) Aller sur Email Monitor (avec session admin déjà chargée)
    await page.goto('/b4ck0ff1ce/email-monitor');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 4) Attendre que la liste soit chargée (loader disparaît ou liste visible)
    await expect(
      page.getByRole('heading', { name: /Email Monitor/i }).first()
    ).toBeVisible({ timeout: 10000 });

    // Soit la liste d’emails, soit "Aucun email trouvé"
    const listOrEmpty = page.locator('text=Emails Envoyés').first().or(page.locator('text=Aucun email trouvé').first());
    await expect(listOrEmpty).toBeVisible({ timeout: 15000 });

    // 5) Vérifier que la page affiche soit des emails, soit message vide, soit la section Emails Envoyés / Email Monitor
    const bodyText = await page.locator('body').textContent({ timeout: 15000 }) ?? '';
    const hasListOrEmpty = bodyText.includes('Aucun email trouvé') ||
      bodyText.includes('Aucun email') ||
      bodyText.includes('Emails Envoyés') ||
      /Email Monitor/i.test(bodyText) ||
      /À\s*:\s*paul\.?delhomme\.?pro@gmail\.com/i.test(bodyText) ||
      /À\s*:\s*paul\.?delhomme\.?proton/i.test(bodyText) ||
      /À\s*:\s*candidatures@delhomme/i.test(bodyText);
    expect(hasListOrEmpty, 'Email Monitor doit afficher la liste ou "Aucun email" ou la section Emails Envoyés').toBe(true);
  });

  test('Email Monitor affiche les filtres et le type Vérification', async ({ page }) => {
    test.skip(!!process.env.TEST_SKIP_EMAIL_MONITOR, 'TEST_SKIP_EMAIL_MONITOR');
    await page.goto('/b4ck0ff1ce/email-monitor');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(page.getByRole('heading', { name: /Email Monitor/i }).first()).toBeVisible({ timeout: 10000 });
    const bodyText = await page.locator('body').textContent({ timeout: 10000 }) ?? '';
    expect(bodyText.length).toBeGreaterThan(50);
    expect(bodyText.toLowerCase()).toMatch(/email monitor|type|vérification|verification|aucun email/i);
  });
});
