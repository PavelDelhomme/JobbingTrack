#!/usr/bin/env node
/**
 * Smoke hub admin mobile + retour (Lot D lignes 318/321).
 * Compte TEST_ADMIN_* — session propre (pm clear) pour éviter TEST_USER resté connecté.
 *
 *   node scripts/mobile/smoke-mobile-admin-hub-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const {
  resolveWorkingAdminCredentials,
  GATEWAY_URL,
  loadRootEnv,
} = require('./resolve-admin-credentials');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');

loadRootEnv();

async function loginAdminViaApi(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login admin API HTTP ${res.status}`);
  const data = await res.json();
  const role = data.user?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    throw new Error(`Compte ${email} sans rôle admin (role=${role || '?'})`);
  }
  return data;
}

async function assertAdminDrawer(phone, adminEmail) {
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(1200);
  await phone.openNavigationDrawer();
  await phone.wait(1200);

  const emailLocal = adminEmail.split('@')[0];
  const hasAdminIdentity =
    (await phone.uiContains(adminEmail)) ||
    (await phone.uiContains(emailLocal)) ||
    (await phone.uiContains('admin@jobbingtrack.com'));
  if (!hasAdminIdentity) {
    throw new Error(
      `Session admin non active — « ${adminEmail} » absent du drawer (TEST_USER encore connecté ?)`,
    );
  }

  let foundHub = await phone.uiContains('Hub administration');
  for (let i = 0; i < 8 && !foundHub; i++) {
    await phone.drawerScrollDown();
    await phone.wait(600);
    foundHub = await phone.uiContains('Hub administration');
  }
  if (!foundHub && !(await phone.uiContains('ADMINISTRATION'))) {
    throw new Error('Section Administration / Hub introuvable pour compte admin');
  }
  return true;
}

async function restorePorteurSession(phone, email, password) {
  try {
    await adbLib.flows.ensureLoggedOut(phone);
  } catch {
    /* déjà déconnecté */
  }
  await adbLib.flows.clearAppDataForSmoke(phone);
  await adbLib.flows.prepareSmokeSession(phone, { restart: false });
  await adbLib.flows.login(phone, email, password);
  await phone.wait(2500);
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  await phone.assertVisible('Bonjour');
}

(async () => {
  const admin = await resolveWorkingAdminCredentials();
  const user = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('Device:', phone.device);
  console.log('Admin:', admin.email, `(${admin.source})`);

  await loginAdminViaApi(admin.email, admin.password);
  await adbLib.flows.prepareSmokeSession(phone, { restart: false });
  await adbLib.flows.clearAppDataForSmoke(phone);
  await adbLib.flows.login(phone, admin.email, admin.password);
  await phone.wait(3000);
  await adbLib.flows.dismissBiometricUnlock(phone, { password: admin.password });
  await phone.assertVisible('Bonjour');

  await assertAdminDrawer(phone, admin.email);
  console.log('✅ Drawer admin : identité + Hub administration visibles');

  let hubOpened = false;
  for (let i = 0; i < 8; i++) {
    if (await phone.uiContains('Hub administration')) {
      await phone.tapReliable('Hub administration');
      hubOpened = true;
      break;
    }
    await phone.drawerScrollDown();
    await phone.wait(600);
  }
  if (!hubOpened) {
    throw new Error('Hub administration introuvable après scroll drawer');
  }
  await phone.wait(2500);

  if (await phone.uiContains('Accès refusé')) {
    throw new Error('Compte admin refusé sur hub — vérifier AdminAccess / rôle JWT');
  }
  const onAdmin =
    (await phone.uiContains('Administration')) ||
    (await phone.uiContains('Utilisateurs')) ||
    (await phone.uiContains('Hub')) ||
    (await phone.uiContains('Analytics'));
  if (!onAdmin) {
    throw new Error('Hub administration introuvable après tap drawer');
  }
  console.log('✅ Hub administration ouvert');

  await phone.back();
  await phone.wait(1500);
  const backOk =
    (await phone.uiContains('Bonjour')) ||
    (await phone.uiContains('Profil')) ||
    (await phone.uiContains('Tab 1 of 4'));
  if (!backOk) {
    throw new Error('Retour hub admin → écran précédent échoué');
  }
  console.log('✅ Retour hub admin OK');

  await phone.openNavigationDrawer();
  await phone.wait(1200);
  for (let i = 0; i < 6; i++) {
    if (await phone.uiContains('Statistiques')) break;
    await phone.drawerScrollDown();
    await phone.wait(500);
  }
  if (await phone.uiContains('Statistiques')) {
    await phone.tapReliable('Statistiques');
    await phone.wait(2500);
    if (await phone.uiContains('Accès refusé')) {
      throw new Error('Sous-page admin Statistiques refusée pour compte admin');
    }
    console.log('✅ Sous-page admin Statistiques accessible');
    await phone.back();
    await phone.wait(1200);
  }

  console.log('Restauration session porteur TEST_USER…');
  await restorePorteurSession(phone, user.email, user.password);
  console.log('✅ Session porteur restaurée');

  console.log('\nSmoke hub admin mobile OK');
})().catch(async (err) => {
  console.error('Smoke hub admin mobile KO:', err.message);
  try {
    const user = await resolveWorkingUserCredentials();
    const phone = await adbLib.connect();
    await restorePorteurSession(phone, user.email, user.password);
    console.log('Session porteur restaurée après échec');
  } catch {
    /* best effort */
  }
  process.exit(1);
});
