#!/usr/bin/env node
/**
 * Prépare l'appareil Samsung/dev pour l'API locale :
 * - adb reverse 5002/5003
 * - purge rate-limit auth Redis (dev)
 * - smoke health + login optionnel
 *
 *   node scripts/mobile/ensure-device-api-ready.js
 */

const { execSync } = require('child_process');

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.API_URL ||
  `http://127.0.0.1:${process.env.API_GATEWAY_PORT || '5002'}`;

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

  console.log('\nPrêt — relancez l\'app mobile et connectez-vous.');
})().catch((e) => {
  console.error('ensure-device-api-ready KO:', e.message);
  process.exit(1);
});
