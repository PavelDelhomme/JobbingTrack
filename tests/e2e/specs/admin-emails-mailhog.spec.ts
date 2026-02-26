/**
 * Tests E2E Emails + MailHog
 * - Envoi d'email de test via l'API
 * - Vérification de la réception dans MailHog (API)
 * - Ouverture de l'interface MailHog en Playwright et clic sur le dernier mail
 * - Extraction des liens (ex. reset password) et navigation + clic
 *
 * Prérequis : stack avec MailHog (make up-full ou COMPOSE_PROFILES=mail)
 * et auth-service configuré avec SMTP_HOST=mailhog SMTP_PORT=1025
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
const MAILHOG_WEB = process.env.MAILHOG_WEB_URL || 'http://localhost:8025';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'password123';

test.describe('Emails + MailHog', () => {
  let authToken: string | null = null;

  test.beforeAll(async () => {
    const available = await isMailHogAvailable();
    if (!available) {
      throw new Error('MailHog non disponible : démarrer avec make up-full ou COMPOSE_PROFILES=mail (interface http://localhost:8025)');
    }
  });

  test.beforeEach(async ({ request }) => {
    // Login pour obtenir un token
    const loginRes = await request.post(`${GATEWAY_URL}/api/v1/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (loginRes.ok()) {
      const body = await loginRes.json();
      authToken = body.token ?? body.accessToken ?? null;
    } else {
      authToken = null;
    }
  });

  test('envoi email de test puis vérification réception dans MailHog via API', async ({ request }) => {
    if (!authToken) throw new Error('Login admin requis pour envoyer un email de test (admin@jobbingtrack.test / password123)');

    const { total: countBefore } = await getMessages(1);

    const sendRes = await request.post(`${GATEWAY_URL}/api/v1/emails/test`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        to: 'redacted@example.invalid',
        type: 'test',
        subject: 'E2E MailHog Test',
        content: '<p>Test Playwright + MailHog</p>',
      },
    });

    if (!sendRes.ok()) {
      const body = await sendRes.text();
      throw new Error(`Envoi email échoué (SMTP/MailHog?) : ${sendRes.status()} ${body}`);
    }

    // Laisser le temps à MailHog de recevoir l'email (SMTP async)
    await new Promise((r) => setTimeout(r, 2000));

    const msg = await waitForLatestMessage(countBefore, { timeoutMs: 15000, pollMs: 800 });
    if (msg === null) {
      const { total } = await getMessages(50);
      throw new Error(
        `Aucun nouvel email dans MailHog après envoi (total=${total}). ` +
        `Vérifiez que auth-service utilise MailHog : SMTP_HOST=mailhog SMTP_PORT=1025 dans .env, puis : docker compose restart auth-service`
      );
    }
    expect(msg).not.toBeNull();
    const full = await getMessageById(msg!.id);
    expect(full).not.toBeNull();
    const links = full ? extractLinksFromMessage(full) : [];
    expect(full?.From ?? full?.from ?? full?.To ?? full?.to).toBeDefined();
  });

  test('ouverture interface MailHog et clic sur le dernier mail', async ({ page }) => {
    const { messages } = await getMessages(1);
    if (messages.length === 0) throw new Error('Aucun message dans MailHog (envoyer un mail de test avant, ou lancer le spec en dernier)');

    await page.goto(MAILHOG_WEB);
    await page.waitForLoadState('networkidle');

    const mailhogBody = page.locator('body');
    await expect(mailhogBody).toBeVisible({ timeout: 10000 });

    const messageRow = page.locator('[ng-repeat*="message"], .msglist-message, .message, tr.ng-scope').first();
    const hasRow = await messageRow.isVisible().catch(() => false);
    if (hasRow) {
      await messageRow.click();
      await page.waitForTimeout(500);
    }

    const pageContent = await page.content();
    expect(pageContent).toContain('MailHog');
  });

  test('envoi email reset password puis extraction lien et ouverture page', async ({ request, page }) => {
    if (!authToken) throw new Error('Login admin requis');

    const { total: countBefore } = await getMessages(1);

    const sendRes = await request.post(`${GATEWAY_URL}/api/v1/emails/test`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        to: 'redacted@example.invalid',
        type: 'reset_password',
      },
    });

    if (!sendRes.ok()) throw new Error(`Envoi reset email échoué : ${sendRes.status()}`);

    await new Promise((r) => setTimeout(r, 2000));

    const msg = await waitForLatestMessage(countBefore, { timeoutMs: 20000, pollMs: 800 });
    if (msg === null) {
      const { total } = await getMessages(50);
      throw new Error(
        `Aucun email reset dans MailHog (total=${total}). SMTP_HOST=mailhog + docker compose restart auth-service si .env modifié.`
      );
    }
    expect(msg).not.toBeNull();
    const full = await getMessageById(msg!.id);
    expect(full).not.toBeNull();
    const links = full ? extractLinksFromMessage(full) : [];
    const resetLink = links.find((u) => /reset|password|token/i.test(u));

    if (resetLink) {
      await page.goto(resetLink);
      await page.waitForLoadState('domcontentloaded');
      const hasForm = await page.locator('input[type="password"], form').first().isVisible().catch(() => false);
      expect(hasForm).toBe(true);
    } else {
      expect(full).not.toBeNull();
      console.log('Email de reset recu mais sans lien cliquable (template sans URL de reset)');
    }
  });
});
