/**
 * Résout des identifiants admin valides pour les smokes mobile ADB.
 * @used-by scripts/mobile/lib/resolve-user-credentials.js, scripts/mobile/lib/resolve-test-email-env.js, scripts/mobile/lib/resolve-email-triage-env.js, scripts/mobile/lib/smoke-application-target.js, scripts/mobile/smoke/run/, scripts/mobile/smoke/adb/, scripts/mobile/smoke/api/, scripts/mobile/setup/sync-test-env.js
 */

const fs = require('fs');
const path = require('path');
const {
  resolveGatewayUrl,
  applyRuntimeGatewayEnv,
} = require('../../lib/gateway-url');

function loadRootEnv() {
  const envPath = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(envPath)) {
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
      // Ne pas écraser une valeur déjà exportée (shell: export MOBILE_ADB_DEVICE=… puis source .env)
      if (process.env[key]) continue;
      // Ne pas poser de serial ADB vide → sinon auto-detect (souvent Blackview)
      if (
        (key === 'MOBILE_ADB_DEVICE' ||
          key === 'ADB_DEVICE_ID' ||
          key === 'DEVICE_SERIAL') &&
        !value
      ) {
        continue;
      }
      process.env[key] = value;
    }
  }
  const emuEnv = path.resolve(__dirname, '../../../.env.mobile-emulator');
  if (
    fs.existsSync(emuEnv) &&
    ['1', 'true', 'yes'].includes(
      String(process.env.MOBILE_PREFER_EMULATOR || '').toLowerCase(),
    )
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
  applyRuntimeGatewayEnv();
}

function getGatewayUrl() {
  return resolveGatewayUrl({ perspective: 'auto' });
}

async function probeLogin(email, password) {
  const base = getGatewayUrl();
  const headers = { 'Content-Type': 'application/json' };
  const bypass = process.env.AUTH_RATE_LIMIT_BYPASS_TOKEN || process.env.JT_SMOKE_BYPASS_TOKEN;
  if (bypass) headers['x-jt-smoke-bypass'] = bypass;
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 429) {
    const err = new Error('rate_limited');
    err.code = 'RATE_LIMITED';
    err.retryAfter = Number(res.headers.get('retry-after') || 60);
    throw err;
  }
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.token || data.accessToken);
}

function listAdminCredentialCandidates() {
  loadRootEnv();
  return [
    {
      source: 'TEST_ADMIN_*',
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
    },
    {
      source: 'ADMIN_*',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    },
  ].filter((c) => c.email && c.password);
}

async function resolveWorkingAdminCredentials() {
  const candidates = listAdminCredentialCandidates();
  if (candidates.length === 0) {
    throw new Error('TEST_ADMIN_* ou ADMIN_* requis dans .env');
  }
  const skipProbe = ['1', 'true', 'yes'].includes(
    String(process.env.SMOKE_SKIP_CREDENTIAL_PROBE || '').toLowerCase(),
  );
  if (skipProbe) {
    return candidates[0];
  }
  let rateLimited = false;
  let retryAfter = 60;
  for (const candidate of candidates) {
    try {
      if (await probeLogin(candidate.email, candidate.password)) {
        return candidate;
      }
    } catch (err) {
      if (err && err.code === 'RATE_LIMITED') {
        rateLimited = true;
        retryAfter = err.retryAfter || 60;
        break;
      }
      throw err;
    }
  }
  if (rateLimited) {
    const waitMs = Math.min(Math.max(retryAfter, 15), 90) * 1000;
    console.warn(
      `[resolve-admin] gateway 429 — attente ${Math.round(waitMs / 1000)}s puis retry 1×`,
    );
    await new Promise((r) => setTimeout(r, waitMs));
    for (const candidate of candidates) {
      try {
        if (await probeLogin(candidate.email, candidate.password)) {
          return candidate;
        }
      } catch (err) {
        if (err && err.code === 'RATE_LIMITED') {
          console.warn(
            '[resolve-admin] toujours 429 — fallback UI avec premier couple .env (sans probe)',
          );
          return candidates[0];
        }
        throw err;
      }
    }
  }
  throw new Error(
    'Aucun couple admin valide via gateway (TEST_ADMIN_* puis ADMIN_*). Vérifiez .env et la stack auth.',
  );
}

loadRootEnv();

module.exports = {
  loadRootEnv,
  getGatewayUrl,
  probeLogin,
  listAdminCredentialCandidates,
  resolveWorkingAdminCredentials,
  get GATEWAY_URL() {
    return getGatewayUrl();
  },
};
