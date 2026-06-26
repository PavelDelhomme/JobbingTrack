#!/usr/bin/env node
/**
 * Smoke : bloc « Comptes de test (debug) » sur login + connexion rapide USER puis ADMIN.
 *
 *   node scripts/mobile/smoke/adb/smoke-login-debug-test-accounts-adb.js
 *
 * @used-by validation porteur étape 2 (login TEST_USER_* / TEST_ADMIN_*)
 */

const adbLib = require('../../../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { resolveWorkingAdminCredentials } = require('../../lib/resolve-admin-credentials');

async function scrollToTestAccounts(phone) {
  for (let i = 0; i < 8; i++) {
    if (await phone.uiContains('Comptes de test (debug)')) {
      if (await phone.uiContains('Administrateur')) return;
    }
    await phone.scrollDown(700);
    await phone.wait(600);
  }
  if (!(await phone.uiContains('Comptes de test (debug)'))) {
    throw new Error('Bloc « Comptes de test (debug) » introuvable sur login');
  }
}

async function scrollToAdminSection(phone) {
  for (let i = 0; i < 6; i++) {
    if (await phone.uiContains('Administrateur')) return;
    await phone.scrollDown(500);
    await phone.wait(500);
  }
  if (!(await phone.uiContains('Administrateur'))) {
    throw new Error('Ligne administrateur absente (scrollez le login)');
  }
}

async function assertTestAccountBlock(phone, userEmail, adminEmail) {
  await scrollToTestAccounts(phone);
  if (!(await phone.uiContains('Utilisateur (non admin)'))) {
    throw new Error('Ligne utilisateur (non admin) absente');
  }
  if (!(await phone.uiContains('Administrateur'))) {
    await scrollToAdminSection(phone);
  }
  if (!(await phone.uiContains('Administrateur'))) {
    throw new Error('Ligne administrateur absente');
  }
  const userLocal = userEmail.split('@')[0];
  const adminLocal = adminEmail.split('@')[0];
  if (
    !(await phone.uiContains(userEmail)) &&
    !(await phone.uiContains(userLocal.slice(0, Math.min(8, userLocal.length))))
  ) {
    throw new Error(`Email utilisateur absent de l’UI (${userEmail})`);
  }
  if (
    !(await phone.uiContains(adminEmail)) &&
    !(await phone.uiContains(adminLocal.slice(0, Math.min(8, adminLocal.length))))
  ) {
    throw new Error(`Email admin absent de l’UI (${adminEmail})`);
  }
  if (!(await phone.uiContains('Mot de passe :'))) {
    throw new Error('Mot de passe test non affiché');
  }
  console.log('Bloc comptes test : emails + mots de passe visibles');
}

async function quickLoginViaButton(phone, roleLabel) {
  await scrollToTestAccounts(phone);
  const quickLabel = roleLabel.includes('Administrateur')
    ? 'Connexion ADMIN'
    : 'Connexion USER';
  if (await phone.uiContains(quickLabel)) {
    await phone.tap(quickLabel);
  } else {
    if (roleLabel.includes('Administrateur')) {
      await scrollToAdminSection(phone);
    }
    const nodes = await phone.uiNodes();
    const roleIdx = nodes.findIndex(
      (n) => n.text && n.text.includes(roleLabel),
    );
    if (roleIdx < 0) throw new Error(`Label ${roleLabel} introuvable`);

    const button = nodes.slice(roleIdx).find(
      (n) => n.text && n.text.includes('Remplir et se connecter'),
    );
    if (!button?.bounds) {
      await phone.tap('Remplir et se connecter');
    } else {
      const m = button.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (m) {
        const cx = Math.floor((+m[1] + +m[3]) / 2);
        const cy = Math.floor((+m[2] + +m[4]) / 2);
        await phone.tapCoords(cx, cy);
      } else {
        await phone.tap('Remplir et se connecter');
      }
    }
  }

  const home =
    (await phone.waitFor('Bonjour', 20000)) ||
    (await phone.waitFor('Tab 1 of 5', 8000));
  if (!home) throw new Error(`Connexion ${roleLabel} via bouton rapide échouée`);
  console.log(`Connexion ${roleLabel} via bouton rapide OK`);
}

(async () => {
  const user = await resolveWorkingUserCredentials();
  const admin = await resolveWorkingAdminCredentials();

  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  console.log('Devices:', devices.map((d) => d.id).join(', ') || '(aucun)');

  await adbLib.flows.prepareSmokeSession(phone, { restart: true });
  await adbLib.flows.ensureLoggedOut(phone);
  await adbLib.flows.ensureFullLoginForm(phone);
  await phone.wait(1500);

  await assertTestAccountBlock(phone, user.email, admin.email);
  await quickLoginViaButton(phone, 'Utilisateur (non admin)');

  await adbLib.flows.ensureLoggedOut(phone);
  await phone.wait(2500);
  await adbLib.flows.ensureFullLoginForm(phone);
  await phone.wait(1000);

  await assertTestAccountBlock(phone, user.email, admin.email);
  await quickLoginViaButton(phone, 'Administrateur');

  console.log('Smoke login debug test accounts OK');
})().catch((err) => {
  console.error('Smoke login debug test accounts KO:', err.message);
  process.exit(1);
});
