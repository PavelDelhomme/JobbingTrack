/**
 * Extrait le token de réinitialisation mot de passe depuis MailHog ou EmailLog.
 * @used-by scripts/mobile/smoke/api/smoke-auth-password-flows-e2e.js
 */

const { extractTokenFromText } = require('./extract-token-from-text');
const { loadRootEnv, resolveWorkingAdminCredentials, GATEWAY_URL } = require('../lib/resolve-admin-credentials');

function extractResetTokenFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const patterns = [
    /reset-password\/([a-f0-9]{32,128})/i,
    /reset-password\?token=([a-f0-9]{32,128})/i,
    /jobbingtrack:\/\/reset-password\?token=([a-f0-9]{32,128})/i,
    /token=([a-f0-9]{64})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return extractTokenFromText(text);
}

async function waitForMailHogResetToken(email, timeoutMs = 45000) {
  const mailhogUrl =
    process.env.MAILHOG_API_URL ||
    process.env.NEXT_PUBLIC_MAILHOG_UI_URL?.replace(/\/$/, '') ||
    `http://127.0.0.1:${process.env.MAILHOG_WEB_PORT || process.env.MAILHOG_PORT || '8025'}`;
  const apiBase = mailhogUrl.includes('/api/') ? mailhogUrl.split('/api/')[0] : mailhogUrl;
  const deadline = Date.now() + timeoutMs;
  const target = email.toLowerCase();
  while (Date.now() < deadline) {
    try {
      for (const fetchUrl of [
        `${apiBase}/api/v2/search?kind=to&query=${encodeURIComponent(email)}`,
        `${apiBase}/api/v2/messages?limit=30`,
      ]) {
        const res = await fetch(fetchUrl);
        if (!res.ok) continue;
        const json = await res.json();
        const items = json.items || [];
        for (const item of items) {
          if (fetchUrl.includes('messages?')) {
            const to = (item?.Content?.Headers?.To || []).join(' ').toLowerCase();
            if (!to.includes(target.split('@')[0])) continue;
          }
          const subject = (item?.Content?.Headers?.Subject || []).join(' ');
          const body =
            item?.Content?.Body ||
            item?.MIME?.Parts?.map((p) => p.Body).join('\n') ||
            '';
          const haystack = `${subject}\n${body}`;
          if (!/reset|réinitial/i.test(haystack) && !/reset-password/i.test(haystack)) continue;
          const token = extractResetTokenFromText(haystack);
          if (token) return { token, source: 'mailhog' };
        }
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  return null;
}

async function waitForEmailLogResetToken(email, timeoutMs = 45000) {
  const { email: adminEmail, password } = await resolveWorkingAdminCredentials();
  const loginRes = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password }),
  });
  if (!loginRes.ok) throw new Error('Login admin impossible pour lire EmailLog reset');
  const loginData = await loginRes.json();
  const token = loginData.token || loginData.accessToken;
  const deadline = Date.now() + timeoutMs;
  const target = email.toLowerCase();
  while (Date.now() < deadline) {
    for (const type of ['RESET_PASSWORD', '']) {
      const qs = new URLSearchParams({ page: '1', limit: '25', to: email });
      if (type) qs.set('type', type);
      const res = await fetch(`${GATEWAY_URL}/api/v1/emails/logs?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const rows = json.data || [];
      for (const row of rows) {
        const to = String(row.to || '').toLowerCase();
        if (!to.includes(target.split('@')[0])) continue;
        const content =
          row.emailContent ||
          row.metadata?.resetUrl ||
          row.metadata?.resetLink ||
          JSON.stringify(row.metadata || {});
        const extracted = extractResetTokenFromText(content);
        if (extracted) return { token: extracted, source: 'emaillog', resetUrl: row.metadata?.resetUrl };
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

async function resolveResetToken(email, { timeoutMs = 45000 } = {}) {
  const fromMailhog = await waitForMailHogResetToken(email, timeoutMs);
  if (fromMailhog) return fromMailhog;
  const fromLog = await waitForEmailLogResetToken(email, timeoutMs);
  if (fromLog) return fromLog;
  throw new Error(
    `Token reset introuvable pour ${email} (MailHog + EmailLog). Vérifiez SMTP et forgot-password.`,
  );
}

module.exports = {
  extractResetTokenFromText,
  resolveResetToken,
  waitForMailHogResetToken,
  waitForEmailLogResetToken,
};
