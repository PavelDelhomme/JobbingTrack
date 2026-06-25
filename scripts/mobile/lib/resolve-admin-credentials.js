/**
 * Résout des identifiants admin valides pour les smokes mobile ADB.
 * @used-by scripts/mobile/lib/resolve-user-credentials.js, scripts/mobile/lib/resolve-test-email-env.js, scripts/mobile/lib/resolve-email-triage-env.js, scripts/mobile/lib/smoke-application-target.js, scripts/mobile/smoke/run/, scripts/mobile/smoke/adb/, scripts/mobile/smoke/api/, scripts/mobile/setup/sync-test-env.js
 */

const fs = require('fs');
const path = require('path');

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.API_URL ||
  `http://127.0.0.1:${process.env.API_GATEWAY_PORT || '5002'}`;

function loadRootEnv() {
  const envPath = path.resolve(__dirname, '../../../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
  const emuEnv = path.resolve(__dirname, '../../../.env.mobile-emulator');
  if (
    fs.existsSync(emuEnv) &&
    ['1', 'true', 'yes'].includes(String(process.env.MOBILE_PREFER_EMULATOR || '').toLowerCase())
  ) {
    for (const line of fs.readFileSync(emuEnv, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('export ')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (value.includes('${')) continue;
      process.env[key] = value;
    }
  }
}

async function probeLogin(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.token || data.accessToken);
}

function listAdminCredentialCandidates() {
  loadRootEnv();
  return [
    { source: 'TEST_ADMIN_*', email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD },
    { source: 'ADMIN_*', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  ].filter((c) => c.email && c.password);
}

async function resolveWorkingAdminCredentials() {
  const candidates = listAdminCredentialCandidates();
  if (candidates.length === 0) {
    throw new Error('TEST_ADMIN_* ou ADMIN_* requis dans .env');
  }
  for (const candidate of candidates) {
    if (await probeLogin(candidate.email, candidate.password)) {
      return candidate;
    }
  }
  throw new Error(
    'Aucun couple admin valide via gateway (TEST_ADMIN_* puis ADMIN_*). Vérifiez .env et la stack auth.',
  );
}

module.exports = {
  loadRootEnv,
  probeLogin,
  listAdminCredentialCandidates,
  resolveWorkingAdminCredentials,
  GATEWAY_URL,
};
