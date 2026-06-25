#!/usr/bin/env node
/**
 * Smoke création relance depuis FAB détail candidature (Lot D ligne 318).
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-fab-relance-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');
const {
  loginSmokeToken,
  ensureSmokeApplication,
  openSmokeApplicationDetail,
} = require('../../lib/smoke-application-target');

loadRootEnv();

async function ensureLoggedIn(phone, email, password) {
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if ((await phone.uiContains('Bonjour')) || (await phone.uiContains('Tab 1 of 4'))) {
    return;
  }
  await adbLib.flows.loginFresh(phone, email, password);
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  await phone.assertVisible('Bonjour');
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const token = await loginSmokeToken(email, password);
  const target = await ensureSmokeApplication(token);
  const phone = await adbLib.connect();
  console.log('User:', email);
  console.log('Candidature cible:', target.position);

  await ensureLoggedIn(phone, email, password);
  await openSmokeApplicationDetail(phone, target);

  try {
    await phone.tap('Ajouter');
  } catch {
    const fab = await phone.findElement('Ajouter');
    const m = fab.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    await phone.tapXY(
      Math.floor((+m[1] + +m[3]) / 2),
      Math.floor((+m[2] + +m[4]) / 2),
    );
  }
  await phone.wait(2000);
  await phone.tap('Relance');
  await phone.wait(2500);

  if (!(await phone.uiContains('Nouvelle relance'))) {
    throw new Error('Dialogue « Nouvelle relance » introuvable');
  }
  console.log('✅ FAB → Relance : dialogue ouvert');

  try {
    await phone.tap('Créer');
  } catch {
    await phone.tap('Enregistrer');
  }
  await phone.wait(4000);

  const created =
    (await phone.uiContains('Relance créée')) ||
    (await phone.uiContains('Relances')) ||
    !(await phone.uiContains('Nouvelle relance'));
  if (!created) {
    throw new Error('Création relance depuis FAB : pas de confirmation');
  }
  console.log('✅ FAB → Relance : création OK');

  await phone.back();
  await phone.wait(1500);
  await adbLib.flows.goToTab(phone, 1, { shell: true });

  console.log('\nSmoke FAB relance mobile OK');
})().catch((err) => {
  console.error('Smoke FAB relance KO:', err.message);
  process.exit(1);
});
