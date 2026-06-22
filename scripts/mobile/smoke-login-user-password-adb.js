#!/usr/bin/env node
/**
 * Smoke login TEST_USER_* par mot de passe (bypass prompt biométrique Samsung).
 * Ne purge pas les identifiants empreinte — vérifie le fallback mot de passe.
 *
 *   node scripts/mobile/smoke-login-user-password-adb.js
 */

const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const adbLib = require('../../tools/adb-lib');

(async () => {
  const { email, password, source } = await resolveWorkingUserCredentials();

  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  console.log('Devices:', devices.map((d) => d.id).join(', ') || '(aucun)');
  console.log(`Credentials: ${source} (${email})`);

  if (await phone.uiContains('Bonjour')) {
    console.log('Session déjà active — smoke login mot de passe OK');
    return;
  }

  await adbLib.flows.dismissBiometricUnlock(phone, { password });

  if (await phone.uiContains('Bonjour')) {
    console.log('Session déjà active — smoke login mot de passe OK');
    return;
  }

  const onLoginForm =
    (await phone.uiContains('Se connecter')) &&
    ((await phone.uiContains('Connexion')) || (await phone.uiContains('JobbingTrack')));

  if (onLoginForm) {
    await adbLib.flows.login(phone, email, password);
    await adbLib.flows.dismissBiometricUnlock(phone, { password });
    await phone.assertVisible('Bonjour');
    console.log(`Smoke login mot de passe TEST_USER OK (${email})`);
    return;
  }

  await adbLib.flows.loginFresh(phone, email, password);
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  await phone.assertVisible('Bonjour');
  console.log(`Smoke login mot de passe TEST_USER OK (${email})`);
})().catch((err) => {
  console.error('Smoke login mot de passe TEST_USER KO:', err.message);
  process.exit(1);
});
