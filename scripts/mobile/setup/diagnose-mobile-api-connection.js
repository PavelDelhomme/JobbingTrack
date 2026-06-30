#!/usr/bin/env node
/**
 * Diagnostic connexion mobile ↔ API (erreur « connexion réseau » sur Samsung).
 *
 *   node scripts/mobile/setup/diagnose-mobile-api-connection.js
 */
const { execSync } = require('child_process');

const GATEWAY =
  process.env.API_GATEWAY_URL ||
  process.env.API_URL ||
  `http://127.0.0.1:${process.env.API_GATEWAY_PORT || '5002'}`;

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function ko(msg) {
  console.error(`❌ ${msg}`);
}

async function main() {
  console.log(`\n=== Diagnostic API mobile — ${GATEWAY} ===\n`);
  let failures = 0;

  try {
    const h = await fetch(`${GATEWAY}/health`);
    if (h.status === 200) ok(`Gateway PC /health → ${h.status}`);
    else {
      ko(`Gateway PC /health → ${h.status}`);
      failures += 1;
    }
  } catch (e) {
    ko(`Gateway PC injoignable — stack down ? (${e.message})`);
    failures += 1;
  }

  let hasDevice = false;
  try {
    const lines = sh('adb devices').split('\n').slice(1).filter((l) => l.includes('\tdevice'));
    hasDevice = lines.length > 0;
    if (hasDevice) ok(`ADB : ${lines.map((l) => l.split('\t')[0]).join(', ')}`);
    else {
      ko('Aucun appareil ADB — branchez le téléphone (débogage USB)');
      failures += 1;
    }
  } catch (e) {
    ko(`ADB indisponible (${e.message})`);
    failures += 1;
  }

  if (hasDevice) {
    try {
      const rev = sh('adb reverse --list');
      if (rev.includes('tcp:5002')) ok(`adb reverse actif : ${rev.replace(/\n/g, ' | ')}`);
      else {
        ko('adb reverse tcp:5002 ABSENT — cause fréquente de « Erreur de connexion réseau »');
        console.log('   → Correction : adb reverse tcp:5002 tcp:5002');
        failures += 1;
      }
    } catch (e) {
      ko(`adb reverse : ${e.message}`);
      failures += 1;
    }

    try {
      const fromPhone = sh(
        "adb shell 'curl -s -o /dev/null -w %{http_code} http://127.0.0.1:5002/health 2>/dev/null || echo 000'",
      );
      if (fromPhone === '200') ok('Téléphone → 127.0.0.1:5002/health → 200');
      else {
        ko(`Téléphone → 127.0.0.1:5002/health → ${fromPhone} (reverse ou gateway)`);
        failures += 1;
      }
    } catch (e) {
      ko(`Test depuis téléphone : ${e.message}`);
      failures += 1;
    }
  }

  try {
    const { loadRootEnv } = require('../../ops/load-root-env.cjs');
    loadRootEnv();
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (email && password) {
      const r = await fetch(`${GATEWAY}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (r.status === 200) ok(`Login API TEST_USER (${email}) → 200`);
      else ko(`Login API → ${r.status}`);
    }
  } catch (e) {
    ko(`Login API : ${e.message}`);
  }

  console.log('\n--- Actions si échec ---');
  console.log('  node scripts/mobile/setup/ensure-device-api-ready.js');
  console.log('  bash scripts/mobile/setup/reinstall-apk-adb.sh');
  console.log('  Sur le téléphone : écran Connexion → touchez « API » en bas → 127.0.0.1 ou IP LAN du PC\n');

  if (failures > 0) process.exit(1);
  ok('Diagnostic complet — relancez l\'app et reconnectez-vous');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
