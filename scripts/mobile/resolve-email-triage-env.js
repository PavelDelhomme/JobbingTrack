/**
 * Résout la configuration « machine email » (agent triage + smokes mobile).
 * Source de vérité : `.env` racine — jamais de secrets dans `.env.example`.
 *
 * Chaîne typique porteur :
 *   candidatures@delhomme.ovh  →  forward  →  pauldelhomme.pro@gmail.com
 *   EMAIL_TRIAGE_READ_ACCOUNT = boîte OVH lue (IMAP)
 *   EMAIL_GMAIL_PRO_ACCOUNT   = boîte Gmail (AVD + IMAP app password + digest)
 */

const { loadRootEnv } = require('./resolve-admin-credentials');

function trim(v) {
  return v && String(v).trim() ? String(v).trim() : '';
}

function isPlaceholder(value) {
  const n = String(value || '').toLowerCase();
  return (
    !n ||
    n.includes('example.invalid') ||
    n.includes('redacted@') ||
    n.includes('jobbingtrack.test')
  );
}

function resolveEmailTriageEnv(env = process.env) {
  loadRootEnv();
  const merged = { ...process.env, ...env };

  const gmailAccount = trim(merged.EMAIL_GMAIL_PRO_ACCOUNT) || trim(merged.TEST_EMAIL_TRIAGE_GMAIL_ACCOUNT);
  const readAccount = trim(merged.EMAIL_TRIAGE_READ_ACCOUNT);
  const forwardAddress = trim(merged.EMAIL_TRIAGE_FORWARD_ADDRESS) || gmailAccount;
  const digestRecipient = trim(merged.EMAIL_TRIAGE_DIGEST_RECIPIENT) || gmailAccount;

  const testRealEmail =
    trim(merged.TEST_REAL_EMAIL) ||
    trim(merged.TEST_REAL_EMAILS?.split(',')[0]) ||
    gmailAccount ||
    readAccount;

  const gmailAppPassword = trim(merged.EMAIL_GMAIL_PRO_PASSWORD_APPLICATION);
  const gmailAccountPassword = trim(merged.EMAIL_GMAIL_PRO_PASSWORD);

  const imapOvhEmail = trim(merged.TEST_EMAIL_TRIAGE_IMAP_EMAIL) || readAccount;
  const imapOvhHost =
    trim(merged.TEST_EMAIL_TRIAGE_IMAP_HOST) ||
    trim(merged.TEST_REAL_EMAIL_IMAP_HOST) ||
    'imap.mail.ovh.net';
  const imapOvhPort = trim(merged.TEST_EMAIL_TRIAGE_IMAP_PORT) || trim(merged.TEST_REAL_EMAIL_IMAP_PORT) || '993';
  const imapOvhPassword =
    trim(merged.TEST_EMAIL_TRIAGE_IMAP_PASSWORD) || trim(merged.TEST_REAL_EMAIL_IMAP_PASSWORD);

  const gmailImapReady =
    Boolean(gmailAccount && gmailAppPassword && !isPlaceholder(gmailAccount) && !isPlaceholder(gmailAppPassword));
  const ovhImapReady =
    Boolean(imapOvhEmail && imapOvhPassword && imapOvhHost && !isPlaceholder(imapOvhEmail) && !isPlaceholder(imapOvhPassword));

  return {
    gmailAccount,
    gmailAppPassword,
    gmailAccountPassword,
    readAccount,
    forwardAddress,
    digestRecipient,
    testRealEmail,
    gmailImap: gmailImapReady
      ? {
          host: 'imap.gmail.com',
          port: 993,
          email: gmailAccount,
          password: gmailAppPassword,
          secure: true,
        }
      : null,
    ovhImap: ovhImapReady
      ? {
          host: imapOvhHost,
          port: Number(imapOvhPort) || 993,
          email: imapOvhEmail,
          password: imapOvhPassword,
          secure: true,
        }
      : null,
  };
}

function resolveRegistrationEmail(env = process.env) {
  const cfg = resolveEmailTriageEnv(env);
  const base = cfg.testRealEmail;
  if (!base || isPlaceholder(base)) {
    throw new Error(
      'Email inscription test manquant : TEST_REAL_EMAIL ou EMAIL_GMAIL_PRO_ACCOUNT dans .env',
    );
  }
  return base;
}

module.exports = {
  resolveEmailTriageEnv,
  resolveRegistrationEmail,
  isPlaceholder,
};
