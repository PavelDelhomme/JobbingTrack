#!/usr/bin/env node
/**
 * Smoke dialogues Appel + Entretien depuis FAB détail candidature (Lot D ligne 318).
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-fab-call-entretien-adb.js
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
  if ((await phone.uiContains('Bonjour')) || (await phone.uiContains('Tab 1 of 4'))) {
    return;
  }
  await adbLib.flows.loginFresh(phone, email, password);
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  await phone.assertVisible('Bonjour');
}

async function openFabMenu(phone) {
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

  // ── Entretien : date + lieu + notes
  await openFabMenu(phone);
  await phone.tap('Entretien');
  await phone.wait(2500);

  if (!(await phone.uiContains('Nouvel entretien'))) {
    throw new Error('Dialogue « Nouvel entretien » introuvable');
  }
  for (const label of ['Date et heure', 'Lieu', 'Notes']) {
    if (!(await phone.uiContains(label))) {
      throw new Error(`Entretien : champ « ${label} » introuvable`);
    }
  }
  console.log('✅ FAB → Entretien : date + lieu + notes OK');
  await phone.tap('Annuler');
  await phone.wait(1200);

  // ── Appel : contact optionnel + création rapide
  await openFabMenu(phone);
  await phone.tap('Appel');
  await phone.wait(2500);

  if (!(await phone.uiContains('Nouvel appel'))) {
    throw new Error('Dialogue « Nouvel appel » introuvable');
  }
  const hasContactFlow =
    (await phone.uiContains('Contact')) ||
    (await phone.uiContains('sans contact')) ||
    (await phone.uiContains('Choisir un contact'));
  if (!hasContactFlow) {
    throw new Error('Appel : sélection contact / sans contact introuvable');
  }
  if (!(await phone.uiContains('Notes'))) {
    throw new Error('Appel : champ Notes introuvable');
  }
  console.log('✅ FAB → Appel : contact optionnel + notes OK');
  await phone.tap('Annuler');
  await phone.wait(1200);

  console.log('\nSmoke FAB appel/entretien OK');
})().catch((err) => {
  console.error('Smoke FAB appel/entretien KO:', err.message);
  process.exit(1);
});
