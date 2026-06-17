#!/usr/bin/env node
/**
 * Smoke login mobile admin sur appareil ADB (TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD depuis .env).
 *
 *   node scripts/mobile/smoke-login-admin-adb.js
 */

const path = require('path');
const fs = require('fs');

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

loadRootEnv();

const adbLib = require('../../tools/adb-lib');

(async () => {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('TEST_ADMIN_EMAIL et TEST_ADMIN_PASSWORD requis dans .env');
  }

  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  console.log('Devices:', devices.map((d) => d.id).join(', ') || '(aucun)');

  await adbLib.flows.loginFresh(phone, email, password);
  await phone.assertVisible('Bonjour');
  console.log(`Smoke login admin mobile OK (${email})`);
})().catch((err) => {
  console.error('Smoke login admin mobile KO:', err.message);
  process.exit(1);
});
