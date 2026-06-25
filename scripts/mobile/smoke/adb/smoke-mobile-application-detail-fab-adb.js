#!/usr/bin/env node
/**
 * Smoke FAB « Ajouter » sur détail candidature (Lot D lignes 318/325).
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-application-detail-fab-adb.js
 */

const adbLib = require('../../../tools/adb-lib');
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
  if (await phone.uiContains('Bonjour')) return;
  if (
    (await phone.uiContains('Email')) ||
    (await phone.uiContains('Mot de passe')) ||
    (await phone.uiContains('Se connecter'))
  ) {
    await adbLib.flows.login(phone, email, password);
  } else {
    await adbLib.flows.loginFresh(phone, email, password);
  }
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  await phone.assertVisible('Bonjour');
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const token = await loginSmokeToken(email, password);
  const target = await ensureSmokeApplication(token);
  const phone = await adbLib.connect();
  console.log('Device:', phone.device);
  console.log('User:', email);
  console.log('Candidature cible:', target.position, '→', target.companyName);

  await ensureLoggedIn(phone, email, password);
  await openSmokeApplicationDetail(phone, target);

  const onDetail =
    (await phone.uiContains('Ajouter')) ||
    (await phone.uiContains('Changer statut')) ||
    (await phone.uiContains('Relances')) ||
    (await phone.uiContains('Entretiens'));
  if (!onDetail) {
    throw new Error('Écran détail candidature introuvable après tap liste');
  }
  console.log('✅ Détail candidature : écran ouvert');

  try {
    await phone.tap('Ajouter');
  } catch {
    const fab = await phone.findElement('Ajouter');
    if (!fab) throw new Error('FAB « Ajouter » introuvable');
    const m = fab.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    await phone.tapXY(
      Math.floor((+m[1] + +m[3]) / 2),
      Math.floor((+m[2] + +m[4]) / 2),
    );
  }
  await phone.wait(2000);

  for (const label of ['Contact', 'Relance', 'Entretien', 'Appel']) {
    if (!(await phone.uiContains(label))) {
      throw new Error(`Menu FAB : option « ${label} » introuvable`);
    }
  }
  console.log('✅ FAB Ajouter : menu contact / relance / entretien / appel OK');

  await phone.back();
  await phone.wait(1200);
  if (
    (await phone.uiContains('Relance')) &&
    (await phone.uiContains('Entretien')) &&
    (await phone.uiContains('Appel'))
  ) {
    await phone.back();
    await phone.wait(800);
  }

  await phone.back();
  await phone.wait(1500);
  await adbLib.flows.goToTab(phone, 1, { shell: true });

  console.log('\nSmoke FAB détail candidature OK');
})().catch((err) => {
  console.error('Smoke application detail FAB KO:', err.message);
  process.exit(1);
});
