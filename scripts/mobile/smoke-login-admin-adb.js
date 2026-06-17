#!/usr/bin/env node
/**
 * Smoke login mobile admin sur appareil ADB (TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD depuis .env).
 *
 *   node scripts/mobile/smoke-login-admin-adb.js
 */

const { resolveWorkingAdminCredentials } = require('./resolve-admin-credentials');
const adbLib = require('../../tools/adb-lib');

(async () => {
  const { email, password, source } = await resolveWorkingAdminCredentials();

  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  console.log('Devices:', devices.map((d) => d.id).join(', ') || '(aucun)');
  console.log(`Credentials: ${source} (${email})`);

  await adbLib.flows.loginFresh(phone, email, password);
  await phone.assertVisible('Bonjour');
  console.log(`Smoke login admin mobile OK (${email})`);
})().catch((err) => {
  console.error('Smoke login admin mobile KO:', err.message);
  process.exit(1);
});
