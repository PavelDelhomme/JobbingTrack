#!/usr/bin/env node
/**
 * Smoke création entreprise via FAB onglet Entreprises (Lot D ligne 321 point 5).
 * Bypass biométrique — sans intervention empreinte sur l'appareil.
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-company-create-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
const { ensureUserShell, typeInLabeledField } = require('../../lib/adb-smoke-helpers');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');

loadRootEnv();

async function ensureLoggedInShell(phone, email, password) {
  await ensureUserShell(phone, email, password);
  await phone.assertVisible('Bonjour');
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  const companyName = `SmokeCo-${Date.now()}`;
  console.log('Device:', phone.device);
  console.log('User:', email);
  console.log('Entreprise test:', companyName);

  await ensureLoggedInShell(phone, email, password);
  await adbLib.flows.setInterimModeForSmoke(phone, true);
  await adbLib.flows.restartApp(phone);
  await phone.wait(2500);
  if (!(await phone.uiContains('Bonjour'))) {
    await adbLib.flows.login(phone, email, password);
  }
  await adbLib.flows.dismissBiometricUnlock(phone, { password });

  await adbLib.flows.goToTab(phone, 2, { shell: true });
  await phone.wait(2000);
  await phone.tap('Entreprises');
  await phone.wait(2500);

  try {
    await phone.tap('Nouvelle entreprise');
  } catch {
    const fab = await phone.findElement('Nouvelle entreprise');
    if (!fab) throw new Error('FAB Nouvelle entreprise introuvable');
    const m = fab.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    await phone.tapXY(
      Math.floor((+m[1] + +m[3]) / 2),
      Math.floor((+m[2] + +m[4]) / 2),
    );
  }
  await phone.wait(2000);
  await phone.assertVisible('Nouvelle entreprise');

  for (let i = 0; i < 6 && !(await phone.uiContains('intérim')); i++) {
    await phone.scrollDown(400);
    await phone.wait(450);
  }
  const nodes = await phone.uiNodes();
  const interimOption =
    (await phone.uiContains("Boîte d'intérim")) ||
    (await phone.uiContains('intérim')) ||
    nodes.some((n) => /int[eé]rim/i.test(`${n.text || ''}${n.contentDesc || ''}`));
  if (!interimOption) {
    throw new Error('Option boîte d\'intérim absente (mode intérim activé)');
  }
  console.log('✅ Dialogue : option boîte d\'intérim visible');

  await typeInLabeledField(phone, 'Nom', companyName, { editIndex: 0 });
  await phone.wait(600);
  await phone.tap('Créer');
  await phone.wait(4000);

  const created =
    (await phone.uiContains('créée')) ||
    (await phone.uiContains(companyName)) ||
    (await phone.uiContains('Entreprise'));
  if (!created) {
    throw new Error(`Entreprise « ${companyName} » non visible après création`);
  }
  console.log(`✅ Entreprise « ${companyName} » créée via FAB`);

  console.log('\nSmoke création entreprise mobile OK');
})().catch((err) => {
  console.error('Smoke création entreprise mobile KO:', err.message);
  process.exit(1);
});
