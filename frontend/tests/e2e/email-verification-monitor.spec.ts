/**
 * E2E : Inscription avec les 3 comptes email (Gmail, Proton, BlueMail)
 * puis vérification dans le backoffice Email Monitor que les emails de vérification
 * sont bien créés/envoyés et visibles.
 *
 * - redacted@example.invalid (Gmail)
 * - redacted@example.invalid (Proton Mail)
 * - candidatures@example.invalid (BlueMail)
 */
import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

const VERIFICATION_EMAILS = [
  'redacted@example.invalid',
  'redacted@example.invalid',
  'candidatures@example.invalid',
] as const;

const PASSWORD = 'password123';

test.describe('Inscription + vérification email (Email Monitor)', () => {
  test('inscription des 3 comptes puis vérification dans Email Monitor', async ({ page, request }) => {
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
    await page.goto('/backoffice/email-monitor');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 4) Attendre que la liste soit chargée (loader disparaît ou liste visible)
    await expect(
      page.getByRole('heading', { name: /Email Monitor/i }).first()
    ).toBeVisible({ timeout: 10000 });

    // Soit la liste d’emails, soit "Aucun email trouvé"
    const listOrEmpty = page.locator('text=Emails Envoyés').first().or(page.locator('text=Aucun email trouvé').first());
    await expect(listOrEmpty).toBeVisible({ timeout: 15000 });

    // 5) Vérifier que chaque adresse apparaît au moins une fois (À : email)
    // Note: le backend peut normaliser l'email (ex. redacted@example.invalid → redacted@example.invalid)
    await expect(page.getByText(/À :\s*paul\.?jobbingtrack\.?pro@gmail\.com/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('À : redacted@example.invalid').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('À : candidatures@example.invalid').first()).toBeVisible({ timeout: 10000 });
  });

  test('Email Monitor affiche les filtres et le type Vérification', async ({ page }) => {
    await page.goto('/backoffice/email-monitor');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(page.getByRole('heading', { name: /Email Monitor/i }).first()).toBeVisible({ timeout: 10000 });
    // Filtre par type
    await expect(page.getByText('Type d\'Email', { exact: false }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Vérification', { exact: false }).first()).toBeVisible({ timeout: 5000 });
  });
});
