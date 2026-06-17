/**
 * Résout des identifiants admin valides pour les smokes mobile ADB.
 * Essaie TEST_ADMIN_* puis ADMIN_* via POST /api/v1/auth/login.
 */

const fs = require('fs');
const path = require('path');

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.API_URL ||
  `http://127.0.0.1:${process.env.API_GATEWAY_PORT || '5002'}`;

function loadRootEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
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
