#!/usr/bin/env node
/**
 * Smoke hub admin mobile + retour (Lot D lignes 318/321).
 * Compte TEST_ADMIN_* — logout si session user, login admin, restauration porteur.
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-admin-hub-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
const {
  resolveWorkingAdminCredentials,
  GATEWAY_URL,
  loadRootEnv,
} = require('../../lib/resolve-admin-credentials');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { ensureTestAccountsReady } = require('../../setup/ensure-test-accounts-ready');

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

async function openAdminHubFromDrawer(phone, adminEmail) {
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

  let hubVisible = await phone.uiContains('Hub administration');
  for (let i = 0; i < 8 && !hubVisible; i++) {
    await phone.drawerScrollDown();
    await phone.wait(600);
    hubVisible = await phone.uiContains('Hub administration');
  }
  if (!hubVisible && !(await phone.uiContains('ADMINISTRATION'))) {
    throw new Error('Section Administration / Hub introuvable pour compte admin');
  }
  console.log('✅ Drawer admin : identité + Hub administration visibles');

  if (!(await phone.uiContains('Hub administration'))) {
    throw new Error('Hub administration absent du drawer après scroll');
  }
  await phone.tapReliable('Hub administration');
  await phone.wait(2500);
}

async function restorePorteurSession(phone, email, password) {
  await switchToAccount(phone, email, password);
  await phone.assertVisible('Bonjour');
}

async function switchToAccount(phone, email, password, { force = false } = {}) {
  if (!force && (await phone.uiContains('Bonjour'))) {
    try {
      await adbLib.flows.goToTab(phone, 1, { shell: true });
      await phone.openNavigationDrawer();
      await phone.wait(800);
      const local = email.split('@')[0];
      const same =
        (await phone.uiContains(email)) ||
        (local.length >= 4 && (await phone.uiContains(local)));
      await phone.back();
      await phone.wait(500);
      if (same) return;
    } catch {
      /* logout ci-dessous */
    }
  }
  if (await phone.uiContains('Bonjour')) {
    await adbLib.flows.ensureLoggedOut(phone);
    await phone.wait(800);
  }
  await adbLib.flows.login(phone, email, password);
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
}

(async () => {
  const admin = await resolveWorkingAdminCredentials();
  const user = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  const sharedShell = process.env.SMOKE_SHARED_SHELL === '1';
  const preflightDone = process.env.SMOKE_PREFLIGHT_DONE === '1';

  console.log('Device:', phone.device);
  console.log('Admin:', admin.email, `(${admin.source})`);
  if (sharedShell) console.log('Mode session partagée — pas de pm clear');

  await loginAdminViaApi(admin.email, admin.password);
  if (!preflightDone) {
    await ensureTestAccountsReady();
  }

  if (sharedShell) {
    await switchToAccount(phone, admin.email, admin.password, { force: true });
  } else {
    await adbLib.flows.clearAppDataForSmoke(phone);
    await adbLib.flows.prepareSmokeSession(phone, { restart: false });
    await adbLib.flows.login(phone, admin.email, admin.password);
  }

  await adbLib.flows.dismissBiometricUnlock(phone, { password: admin.password });
  if (await phone.uiContains('vérifier votre email')) {
    throw new Error(
      `Compte admin « ${admin.email} » : email non vérifié côté API — relancer ensure-test-accounts-ready.js`,
    );
  }
  await phone.assertVisible('Bonjour');

  await openAdminHubFromDrawer(phone, admin.email);

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
