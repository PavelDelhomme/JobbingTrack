/**
 * Résout email/mot de passe pour les smokes inscription + vérif email mobile.
 * @used-by scripts/mobile/setup/sync-test-env.js, scripts/mobile/smoke/api/smoke-auth-password-flows-e2e.js
 */

const fs = require('fs');
const path = require('path');
const { loadRootEnv, resolveWorkingAdminCredentials, GATEWAY_URL } = require('../lib/resolve-admin-credentials');
const { resolveEmailTriageEnv, resolveRegistrationEmail } = require('../lib/resolve-email-triage-env');

function uniqueTestEmail(baseEmail) {
  const trimmed = String(baseEmail || '').trim().toLowerCase();
  if (!trimmed.includes('@')) {
    throw new Error('TEST_REAL_EMAIL invalide dans .env');
  }
  const [local, domain] = trimmed.split('@');
  const tag = `mob${Date.now()}`;
  const localWithTag = local.includes('+') ? `${local.split('+')[0]}+${tag}` : `${local}+${tag}`;
  return `${localWithTag}@${domain}`;
}

function resolveVerificationPassword() {
  loadRootEnv();
  const candidates = [
    ['TEST_VERIFICATION_PASSWORD', process.env.TEST_VERIFICATION_PASSWORD],
    ['TEST_USER_PASSWORD', process.env.TEST_USER_PASSWORD],
    ['TEST_REAL_EMAIL_PASSWORD', process.env.TEST_REAL_EMAIL_PASSWORD],
  ];
  for (const [source, value] of candidates) {
    if (value && String(value).trim()) {
      return { password: String(value).trim(), source };
    }
  }
  throw new Error(
    'Mot de passe test manquant : définir TEST_VERIFICATION_PASSWORD, TEST_USER_PASSWORD ou TEST_REAL_EMAIL_PASSWORD dans .env',
  );
}

function resolveBaseTestEmail() {
  loadRootEnv();
  try {
    return resolveRegistrationEmail();
  } catch {
    /* repli messages historiques */
  }
  const email =
    process.env.TEST_REAL_EMAIL?.trim() ||
    process.env.TEST_REAL_EMAILS?.split(',')[0]?.trim() ||
    process.env.EMAIL_GMAIL_PRO_ACCOUNT?.trim() ||
    process.env.TEST_USER_EMAIL?.trim();
  if (!email) {
    throw new Error(
      'TEST_REAL_EMAIL, EMAIL_GMAIL_PRO_ACCOUNT ou TEST_USER_EMAIL requis dans .env',
    );
  }
  return email;
}

function compareEnvDiagnostics() {
  loadRootEnv();
  const lines = [];
  const cfg = resolveEmailTriageEnv();
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const testAdminEmail = process.env.TEST_ADMIN_EMAIL?.trim();
  const adminPass = process.env.ADMIN_PASSWORD || '';
  const testAdminPass = process.env.TEST_ADMIN_PASSWORD || '';
  if (adminEmail && testAdminEmail && adminEmail === testAdminEmail && adminPass && testAdminPass && adminPass !== testAdminPass) {
    lines.push('TEST_ADMIN_PASSWORD ≠ ADMIN_PASSWORD (même email admin)');
  }
  if (!process.env.TEST_VERIFICATION_PASSWORD?.trim()) {
    lines.push('TEST_VERIFICATION_PASSWORD absent (repli TEST_USER_PASSWORD / TEST_REAL_EMAIL_PASSWORD)');
  }
  if (!cfg.testRealEmail || cfg.testRealEmail.includes('example.invalid')) {
    lines.push('TEST_REAL_EMAIL ou EMAIL_GMAIL_PRO_ACCOUNT absent/invalide');
  }
  if (!cfg.gmailImap && !cfg.ovhImap) {
    lines.push('IMAP indisponible : renseigner EMAIL_GMAIL_PRO_PASSWORD_APPLICATION et/ou TEST_EMAIL_TRIAGE_IMAP_*');
  }
  if (cfg.gmailAccount && !cfg.digestRecipient) {
    lines.push('EMAIL_TRIAGE_DIGEST_RECIPIENT absent (repli gmail pro)');
  }
  return lines;
}

async function registerUser(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName: 'Mobile',
      lastName: 'Verify',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 409) {
    const resend = await fetch(`${GATEWAY_URL}/api/v1/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const resendData = await resend.json().catch(() => ({}));
    if (!resend.ok && resend.status !== 400) {
      throw new Error(resendData.error || resendData.message || `resend HTTP ${resend.status}`);
    }
    return { email, created: false, resend: true };
  }
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.message || `register HTTP ${res.status}`);
  }
  return { email, created: true, resend: false };
}

module.exports = {
  uniqueTestEmail,
  resolveVerificationPassword,
  resolveBaseTestEmail,
  compareEnvDiagnostics,
  registerUser,
  GATEWAY_URL,
};
