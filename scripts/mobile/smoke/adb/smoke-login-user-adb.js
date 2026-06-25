#!/usr/bin/env node
/**
 * Smoke login mobile utilisateur test sur appareil ADB (TEST_USER_* depuis .env).
 *
 *   node scripts/mobile/smoke/adb/smoke-login-user-adb.js
 */

const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const adbLib = require('../../../../tools/adb-lib');

(async () => {
  const { email, password, source } = await resolveWorkingUserCredentials();

  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  console.log('Devices:', devices.map((d) => d.id).join(', ') || '(aucun)');
  console.log(`Credentials: ${source} (${email})`);

  await adbLib.flows.loginFresh(phone, email, password);
  await phone.assertVisible('Bonjour');
  console.log(`Smoke login utilisateur mobile OK (${email})`);
})().catch((err) => {
  console.error('Smoke login utilisateur mobile KO:', err.message);
  process.exit(1);
});
