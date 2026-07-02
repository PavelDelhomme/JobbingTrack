#!/usr/bin/env node
/**
 * Prépare l'appareil Samsung/dev pour l'API locale :
 * - adb reverse 5002/5003
 * - purge rate-limit auth Redis (dev)
 * - smoke health + login optionnel
 *
 *   node scripts/mobile/setup/ensure-device-api-ready.js
 */

const { execSync } = require('child_process');
const {
  resolveGatewayUrl,
  applyRuntimeGatewayEnv,
} = require('../../lib/gateway-url');

// Charge .env racine si présent (sans écraser l'environnement déjà exporté)
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
} catch {
  /* ignore */
}

applyRuntimeGatewayEnv();
const GATEWAY_URL = resolveGatewayUrl({ perspective: 'auto' });

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

(async () => {
  try {
    const devices = sh('adb devices').split('\n').slice(1).filter((l) => l.includes('device'));
    if (devices.length) {
      sh('adb reverse tcp:5002 tcp:5002');
      sh('adb reverse tcp:5003 tcp:5003');
      console.log('OK adb reverse:', sh('adb reverse --list'));
    } else {
      console.log('WARN: aucun appareil ADB — adb reverse ignoré');
    }
  } catch (e) {
    console.warn('WARN adb:', e.message);
  }

  try {
    sh('docker exec jobbingtrack-redis redis-cli DEL rate_limit:auth:172.19.0.1 2>/dev/null || true');
    const keys = sh("docker exec jobbingtrack-redis redis-cli --scan --pattern 'rate_limit:auth:*' 2>/dev/null || true");
    for (const k of keys.split('\n').filter(Boolean)) {
      sh(`docker exec jobbingtrack-redis redis-cli DEL "${k}"`);
    }
    console.log('OK rate-limit auth Redis purgé (dev)');
  } catch (e) {
    console.warn('WARN redis purge:', e.message);
  }

  const health = await fetch(`${GATEWAY_URL}/api/v1/health`);
  console.log('Health:', health.status, health.status === 200 ? 'OK' : await health.text());

  try {
    require('../smoke/utils/copy-test-password-clipboard-adb.js');
  } catch (e) {
    console.warn('WARN clipboard:', e.message);
  }

  console.log('\nPrêt — relancez l\'app mobile (APK debug) et connectez-vous.');
  console.log('Usage normal (biométrie) : node scripts/mobile/clear-smoke-device-adb.js');
  console.log('Smokes ADB uniquement   : node scripts/mobile/prepare-smoke-device-adb.js');
})().catch((e) => {
  console.error('ensure-device-api-ready KO:', e.message);
  process.exit(1);
});
