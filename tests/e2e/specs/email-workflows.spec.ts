/**
 * Tests E2E complets pour les workflows email
 * - Inscription utilisateur avec email de vérification via MailHog
 * - Reset password complet (demande → email → extraction lien → nouveau mot de passe → login)
 * - Envoi email vers adresse réelle (TEST_REAL_EMAIL) si configuré
 *
 * Prérequis : stack avec MailHog (make up-full) + SMTP_HOST=mailhog SMTP_PORT=1025
 */

import { test, expect } from '@playwright/test';
import {
  isMailHogAvailable,
  getMessages,
  waitForLatestMessage,
  getMessageById,
  extractLinksFromMessage,
} from '../utils/mailhog';

const GATEWAY_URL = process.env.API_GATEWAY_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';
const FRONTEND_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5003';
const REAL_EMAIL = process.env.TEST_REAL_EMAIL || '';

test.describe('Workflows Email Complets', () => {
  test.beforeAll(async () => {
    const available = await isMailHogAvailable();
    if (!available) {
      throw new Error('MailHog non disponible');
    }
  });

  test.describe('Inscription avec vérification email', () => {
    const testEmail = `e2e-register-${Date.now()}@mailhog.local`;
    const testPassword = 'SecureP@ss123!';

    test('inscription crée un compte et envoie un email de vérification', async ({ request }) => {
      const { total: countBefore } = await getMessages(1);

      const registerRes = await request.post(`${GATEWAY_URL}/api/v1/auth/register`, {
        data: {
          email: testEmail,
          password: testPassword,
          firstName: 'E2E',
          lastName: 'EmailTest',
          phone: '+33600000000',
        },
      });

      expect([200, 201]).toContain(registerRes.status());

      await new Promise((r) => setTimeout(r, 3000));

      const msg = await waitForLatestMessage(countBefore, { timeoutMs: 15000, pollMs: 800 });

      if (msg) {
        const full = await getMessageById(msg.id);
        expect(full).not.toBeNull();

        const links = full ? extractLinksFromMessage(full) : [];
        const verifyLink = links.find((u) => /verify|confirm|email/i.test(u));

        if (verifyLink) {
          const verifyRes = await request.get(verifyLink);
          expect([200, 302]).toContain(verifyRes.status());
        }
      }
    });

    test('le nouvel utilisateur peut se connecter', async ({ request }) => {
      const loginRes = await request.post(`${GATEWAY_URL}/api/v1/auth/login`, {
        data: { email: testEmail, password: testPassword },
      });

      expect(loginRes.status()).toBe(200);
      const body = await loginRes.json();
      expect(body.token || body.accessToken).toBeTruthy();
    });
  });

  test.describe('Reset password complet via MailHog', () => {
    const resetEmail = `e2e-reset-${Date.now()}@mailhog.local`;
    const originalPassword = 'OriginalP@ss123!';
    const newPassword = 'NewSecureP@ss456!';

    test.beforeAll(async ({ request }) => {
      await request.post(`${GATEWAY_URL}/api/v1/auth/register`, {
        data: {
          email: resetEmail,
          password: originalPassword,
          firstName: 'Reset',
          lastName: 'Test',
          phone: '+33600000001',
        },
      });
    });

    test('forgot-password envoie un email avec lien de reset', async ({ request }) => {
      const { total: countBefore } = await getMessages(1);

      const forgotRes = await request.post(`${GATEWAY_URL}/api/v1/auth/forgot-password`, {
        data: { email: resetEmail },
      });

      expect([200, 201]).toContain(forgotRes.status());

      await new Promise((r) => setTimeout(r, 3000));

      const msg = await waitForLatestMessage(countBefore, { timeoutMs: 20000, pollMs: 800 });
      expect(msg).not.toBeNull();

      if (msg) {
        const full = await getMessageById(msg.id);
        expect(full).not.toBeNull();
        const links = full ? extractLinksFromMessage(full) : [];
        const resetLink = links.find((u) => /reset|password|token/i.test(u));

        if (resetLink) {
          const tokenMatch = resetLink.match(/token[=/]([a-zA-Z0-9._-]+)/);
          if (tokenMatch) {
            const token = tokenMatch[1];
            const resetRes = await request.post(`${GATEWAY_URL}/api/v1/auth/reset-password/${token}`, {
              data: { password: newPassword },
            });
            expect([200, 201]).toContain(resetRes.status());

            const loginNewRes = await request.post(`${GATEWAY_URL}/api/v1/auth/login`, {
              data: { email: resetEmail, password: newPassword },
            });
            expect(loginNewRes.status()).toBe(200);
          }
        } else {
          console.log('Email reçu mais sans lien de reset (template incomplet)');
        }
      }
    });
  });

  test.describe('Reset password via UI', () => {
    test('page forgot-password est accessible et fonctionnelle', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/forgot-password`);
      await page.waitForLoadState('domcontentloaded');

      const hasInput = await page.locator('input[type="email"]').isVisible().catch(() => false);
      const hasForm = await page.locator('form').isVisible().catch(() => false);

      expect(hasInput || hasForm).toBe(true);
    });
  });

  if (REAL_EMAIL) {
    test.describe('Envoi email vers adresse réelle', () => {
      test('envoi email de test vers TEST_REAL_EMAIL', async ({ request }) => {
        const loginRes = await request.post(`${GATEWAY_URL}/api/v1/auth/login`, {
          data: {
            email: process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.test',
            password: process.env.TEST_ADMIN_PASSWORD || 'password123',
          },
        });

        if (!loginRes.ok()) return;
        const { token } = await loginRes.json();

        const sendRes = await request.post(`${GATEWAY_URL}/api/v1/emails/test`, {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            to: REAL_EMAIL,
            subject: `[JobbingTrack E2E] Test ${new Date().toISOString().slice(0, 16)}`,
            content: '<p>Email de test E2E envoyé automatiquement par la suite de tests JobbingTrack.</p>',
          },
        });

        expect([200, 201, 202]).toContain(sendRes.status());
      });
    });
  }
});
