#!/usr/bin/env node
/**
 * Smoke création relance depuis FAB détail candidature (Lot D ligne 318).
 *
 *   node scripts/mobile/smoke-mobile-fab-relance-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

function nodeLabel(n) {
  return `${n.text || ''}\n${n.contentDesc || ''}`.trim();
}

async function ensureLoggedIn(phone, email, password) {
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if ((await phone.uiContains('Bonjour')) || (await phone.uiContains('Tab 1 of 4'))) {
    return;
  }
  await adbLib.flows.loginFresh(phone, email, password);
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  await phone.assertVisible('Bonjour');
}

async function openFirstApplicationDetail(phone) {
  await adbLib.flows.goToTab(phone, 2, { shell: true });
  await phone.wait(2000);
  try {
    await phone.tap('Tab 1 of 5');
  } catch {
    /* ok */
  }
  await phone.wait(2000);
  let card = null;
  for (let i = 0; i < 15; i++) {
    card = (await phone.uiNodes()).find(
      (n) => n.clickable && nodeLabel(n).includes('Postulé'),
    );
    if (card) break;
    await phone.wait(1000);
  }
  if (!card) throw new Error('Aucune candidature pour FAB relance');
  const m = card.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  await phone.tapXY(
    Math.floor((+m[1] + +m[3]) / 2),
    Math.floor((+m[2] + +m[4]) / 2),
  );
  await phone.wait(2500);
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);
  await openFirstApplicationDetail(phone);

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
