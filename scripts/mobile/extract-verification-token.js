/**
 * Extrait le token de vérification depuis MailHog, EmailLog (API) ou Postgres (dernier recours).
 */

const { execFileSync } = require('child_process');
const { extractTokenFromText } = require('./extract-token-from-text');
const { resolveEmailTriageEnv } = require('./resolve-email-triage-env');
const { waitForImapVerificationToken } = require('./fetch-imap-verification');
const { loadRootEnv, resolveWorkingAdminCredentials, GATEWAY_URL } = require('./resolve-admin-credentials');

async function waitForMailHogToken(email, timeoutMs = 45000) {
  const mailhogUrl =
    process.env.MAILHOG_API_URL ||
    process.env.NEXT_PUBLIC_MAILHOG_UI_URL?.replace(/\/$/, '') ||
    `http://127.0.0.1:${process.env.MAILHOG_WEB_PORT || process.env.MAILHOG_PORT || '8025'}`;
  const apiBase = mailhogUrl.includes('/api/') ? mailhogUrl.split('/api/')[0] : mailhogUrl;
  const deadline = Date.now() + timeoutMs;
  const target = email.toLowerCase();
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${apiBase}/api/v2/search?kind=to&query=${encodeURIComponent(email)}`);
      if (res.ok) {
        const json = await res.json();
        const items = json.items || [];
        for (const item of items) {
          const body =
            item?.Content?.Body ||
            item?.MIME?.Parts?.map((p) => p.Body).join('\n') ||
            '';
          const token = extractTokenFromText(body);
          if (token) return { token, source: 'mailhog' };
        }
      }
      const allRes = await fetch(`${apiBase}/api/v2/messages?limit=25`);
      if (allRes.ok) {
        const all = await allRes.json();
        for (const item of all.items || []) {
          const to = (item?.Content?.Headers?.To || []).join(' ').toLowerCase();
          if (!to.includes(target)) continue;
          const body = item?.Content?.Body || '';
          const token = extractTokenFromText(body);
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

async function waitForEmailLogToken(email, timeoutMs = 45000) {
  const { email: adminEmail, password } = await resolveWorkingAdminCredentials();
  const loginRes = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password }),
  });
  if (!loginRes.ok) throw new Error('Login admin impossible pour lire EmailLog');
  const loginData = await loginRes.json();
  const token = loginData.token || loginData.accessToken;
  const deadline = Date.now() + timeoutMs;
  const target = email.toLowerCase();
  while (Date.now() < deadline) {
    const res = await fetch(
      `${GATEWAY_URL}/api/v1/emails/logs?page=1&limit=20&to=${encodeURIComponent(email)}&type=VERIFICATION`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) {
      const json = await res.json();
      const rows = json.data || [];
      for (const row of rows) {
        const to = String(row.to || '').toLowerCase();
        if (to !== target && !to.includes(target.split('@')[0])) continue;
        const content = row.emailContent || row.metadata?.verificationUrl || JSON.stringify(row.metadata || {});
        const extracted = extractTokenFromText(content);
        if (extracted) return { token: extracted, source: 'emaillog', verifyUrl: row.metadata?.verificationUrl };
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

function fetchPostgresToken(email) {
  loadRootEnv();
  const user = process.env.POSTGRES_USER || 'jobbingtrack';
  const db = process.env.POSTGRES_DB || 'jobbingtrack';
  const password = process.env.POSTGRES_PASSWORD || '';
  const sql = `SELECT "verificationToken" FROM "User" WHERE email = '${email.replace(/'/g, "''")}' LIMIT 1;`;
  const out = execFileSync(
    'docker',
    [
      'exec',
      '-e',
      `PGPASSWORD=${password}`,
      'jobbingtrack-postgres',
      'psql',
      '-U',
      user,
      '-d',
      db,
      '-t',
      '-A',
      '-c',
      sql,
    ],
    { encoding: 'utf8' },
  ).trim();
  if (!out) return null;
  return { token: out, source: 'postgres' };
}

async function resolveVerificationToken(email, { allowPostgresFallback = false } = {}) {
  const fromMailhog = await waitForMailHogToken(email);
  if (fromMailhog) return fromMailhog;

  const triage = resolveEmailTriageEnv();
  if (triage.gmailImap || triage.ovhImap) {
    try {
      const fromImap = await waitForImapVerificationToken(email, triage, { timeoutMs: 60000 });
      if (fromImap) return fromImap;
    } catch (err) {
      console.warn(`IMAP vérif email : ${err.message}`);
    }
  }

  const fromLog = await waitForEmailLogToken(email);
  if (fromLog) return fromLog;
  if (allowPostgresFallback) {
    const fromDb = fetchPostgresToken(email);
    if (fromDb) return fromDb;
  }
  throw new Error(
    `Token introuvable pour ${email} (MailHog + IMAP + EmailLog). Vérifiez SMTP, EMAIL_GMAIL_PRO_* / EMAIL_TRIAGE_* et auth-service.`,
  );
}
module.exports = {
  extractTokenFromText,
  resolveVerificationToken,
  waitForMailHogToken,
  waitForEmailLogToken,
  fetchPostgresToken,
};
