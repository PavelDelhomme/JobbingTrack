/**
 * Extrait le token de vérification depuis MailHog, EmailLog (API) ou Postgres (dernier recours).
 * @used-by scripts/mobile/smoke/adb/smoke-verify-email-adb.js, scripts/mobile/smoke/api/smoke-auth-password-flows-e2e.js
 */

const { execFileSync } = require('child_process');
const { extractTokenFromText } = require('./extract-token-from-text');
const { resolveEmailTriageEnv } = require('../lib/resolve-email-triage-env');
const { waitForImapVerificationToken } = require('./fetch-imap-verification');
const { loadRootEnv, resolveWorkingAdminCredentials, GATEWAY_URL } = require('../lib/resolve-admin-credentials');

async function waitForMailHogToken(email, timeoutMs = 45000, sinceMs = 0) {
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
          const created = item?.Created ? new Date(item.Created).getTime() : 0;
          if (sinceMs && created && created < sinceMs - 5000) continue;
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
          const created = item?.Created ? new Date(item.Created).getTime() : 0;
          if (sinceMs && created && created < sinceMs - 5000) continue;
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

async function waitForEmailLogToken(email, timeoutMs = 45000, sinceMs = 0) {
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
        const sentAt = row.sentAt || row.createdAt;
        if (sinceMs && sentAt && new Date(sentAt).getTime() < sinceMs - 3000) continue;
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

async function resolveVerificationToken(email, { allowPostgresFallback = false, sinceMs = 0 } = {}) {
  const target = email.toLowerCase();
  console.log(`\n🔍 Token vérif pour « ${email} » (depuis ${sinceMs ? new Date(sinceMs).toISOString() : 'maintenant'})`);

  const fromLog = await waitForEmailLogToken(email, 35000, sinceMs);
  if (fromLog) {
    console.log(`✅ Token via EmailLog API (${fromLog.source})`);
    return fromLog;
  }
  console.log('   EmailLog : rien encore — MailHog…');

  const fromMailhog = await waitForMailHogToken(email, 25000, sinceMs);
  if (fromMailhog) {
    console.log(`✅ Token via MailHog (${fromMailhog.source})`);
    return fromMailhog;
  }
  console.log('   MailHog : rien — IMAP…');

  const triage = resolveEmailTriageEnv();
  if (triage.gmailImap) {
    console.log(`   IMAP Gmail → ${triage.gmailImap.email} (INBOX)`);
  }
  if (triage.ovhImap) {
    console.log(`   IMAP OVH → ${triage.ovhImap.email} (INBOX)`);
  }
  if (triage.gmailImap || triage.ovhImap) {
    try {
      const fromImap = await waitForImapVerificationToken(email, triage, {
        timeoutMs: 55000,
        pollMs: 3000,
        sinceMs,
      });
      if (fromImap) {
        console.log(`✅ Token via ${fromImap.source} (boîte ${fromImap.mailbox})`);
        return fromImap;
      }
    } catch (err) {
      console.warn(`   IMAP KO : ${err.message}`);
    }
  } else {
    console.log('   IMAP : aucune boîte configurée (.env EMAIL_GMAIL_PRO_* / EMAIL_TRIAGE_*)');
  }

  if (allowPostgresFallback) {
    const fromDb = fetchPostgresToken(email);
    if (fromDb) {
      console.log(`✅ Token via Postgres (${fromDb.source}) — fallback dev`);
      return fromDb;
    }
  }

  const diag = [
    `Token introuvable pour ${email}.`,
    'Vérifications :',
    '  • SMTP auth-service envoie-t-il (EmailLog SENT) ?',
    '  • Bonne boîte IMAP (forward Gmail pro vs OVH candidatures@) ?',
    '  • Pas d’autre smoke register en parallèle (verrou /tmp/jobbingtrack-smoke-*) ?',
    `  • Destinataire attendu exact : ${target}`,
  ].join('\n');
  throw new Error(diag);
}
module.exports = {
  extractTokenFromText,
  resolveVerificationToken,
  waitForMailHogToken,
  waitForEmailLogToken,
  fetchPostgresToken,
};
