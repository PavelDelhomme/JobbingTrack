#!/usr/bin/env node
/**
 * Smoke cold start sans « Garder la connexion » (Lot D ligne 319 point 4).
 * Utilise pm clear puis login avec case décochée → kill app → écran login.
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-cold-start-login-adb.js
 *
 * À lancer en fin de batterie (réinitialise les données app).
 */

const adbLib = require('../../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');

loadRootEnv();

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('Device:', phone.device);
  console.log('User:', email);

  await adbLib.flows.clearAppDataForSmoke(phone);
  await adbLib.flows.loginWithoutKeepLoggedIn(phone, email, password);
  await phone.assertVisible('Bonjour');
  console.log('✅ Login sans « Garder la connexion » → accueil OK');

  await adbLib.flows.restartApp(phone);
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  await phone.wait(3000);

  const onLogin =
    (await phone.uiContains('Email')) ||
    (await phone.uiContains('Mot de passe')) ||
    ((await phone.uiContains('Connexion')) && (await phone.uiContains('Se connecter'))) ||
    (await phone.uiContains('Connexion par empreinte'));

  if (!onLogin) {
    throw new Error('Cold start : écran login attendu, accueil encore visible');
  }
  if (await phone.uiContains('Bonjour')) {
    throw new Error('Cold start : « Bonjour » visible — session conservée à tort');
  }
  console.log('✅ Cold start sans keepLoggedIn → écran connexion OK');

  // Restaurer session pour les smokes suivants
  await adbLib.flows.loginFresh(phone, email, password);
  await phone.assertVisible('Bonjour');
  console.log('✅ Re-login standard pour laisser l\'app prête');

  console.log('\nSmoke cold start login mobile OK');
})().catch((err) => {
  console.error('Smoke cold start login mobile KO:', err.message);
  process.exit(1);
});
