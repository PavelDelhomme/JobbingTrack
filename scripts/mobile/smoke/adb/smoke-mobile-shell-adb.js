#!/usr/bin/env node
/**
 * Smoke shell mobile (4 onglets) + navigation candidatures sans loginFresh bloquant.
 * Usage : node scripts/mobile/smoke/adb/smoke-mobile-shell-adb.js
 */
const adbLib = require('../../../../tools/adb-lib');
const { ensureUserShell } = require('../../lib/adb-smoke-helpers');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');

loadRootEnv();

async function assertNoFlutterErrors(adb) {
  const out = await adb.shellCommand(
    'logcat -d -t 200 | grep -E "FlutterError|RenderFlex overflowed|multiple heroes" || true',
  );
  const lines = String(out || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 0) {
    throw new Error(`Erreurs Flutter récentes:\n${lines.slice(-5).join('\n')}`);
  }
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('Device:', phone.device);
  console.log('User:', email);

  await ensureUserShell(phone, email, password);
  await phone.assertVisible('Bonjour');
  console.log('✅ Dashboard visible');

  const tabs = await adbLib.flows.navigateAllTabs(phone);
  console.log('✅ Onglets shell:', tabs.join(' | '));

  await adbLib.flows.goToTab(phone, 2, { shell: true });
  if (await phone.uiContains('Candidatures')) {
    console.log('✅ Onglet Candidatures');
  }

  try {
    await phone.tap('Entreprises');
    await phone.wait(1500);
    console.log('✅ Sous-onglet Entreprises');
    await phone.tap('Candidatures');
    await phone.wait(1500);
  } catch (e) {
    console.log('⚠️ Sous-onglets candidatures:', e.message);
  }

  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(1500);

  await assertNoFlutterErrors(phone);
  console.log('✅ Aucune FlutterError récente dans logcat');

  console.log('\nSmoke shell mobile OK');
})().catch((err) => {
  console.error('Smoke shell mobile KO:', err.message);
  process.exit(1);
});
