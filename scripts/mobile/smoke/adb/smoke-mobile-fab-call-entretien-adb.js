#!/usr/bin/env node
/**
 * Smoke dialogues Appel + Entretien depuis FAB détail candidature (Lot D ligne 318).
 *
 * Labels UI alignés sur application_detail_screen.dart :
 *   Date et heure (jour), Lieu (optionnel), Notes, Format, …
 *
 *   SMOKE_USE_ADMIN=1 MOBILE_ADB_DEVICE=R5CT7263YJL ADB_FAST=1 \
 *   SMOKE_API_GATEWAY_URL=https://api.jobbingtrack.com \
 *   node scripts/mobile/smoke/adb/smoke-mobile-fab-call-entretien-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
require('../../lib/smoke-runtime');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const {
  loadRootEnv,
  resolveWorkingAdminCredentials,
  listAdminCredentialCandidates,
} = require('../../lib/resolve-admin-credentials');
const { connectSmokePhone, recoverFromOfflineMode, openFirstVisibleApplicationCard } = require('../../lib/adb-smoke-helpers');
const {
  loginSmokeToken,
  ensureSmokeApplication,
  openSmokeApplicationDetail,
  ensureApplicationsListTab,
} = require('../../lib/smoke-application-target');

loadRootEnv();

async function resolveSmokeCredentials() {
  if (process.env.SMOKE_USE_ADMIN === '1') {
    try {
      return await resolveWorkingAdminCredentials();
    } catch (err) {
      console.warn('probe admin KO — fallback .env:', err.message);
      return listAdminCredentialCandidates()[0];
    }
  }
  try {
    return await resolveWorkingUserCredentials();
  } catch (err) {
    console.warn('TEST_USER KO — fallback ADMIN:', err.message);
    return resolveWorkingAdminCredentials();
  }
}

async function ensureLoggedIn(phone, email, password) {
  // Session fraîche : évite cache hors-ligne d’un autre compte / token périmé
  console.log(await adbLib.flows.loginFresh(phone, email, password));
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  const ok =
    (await phone.uiContains('Bonjour')) ||
    (await phone.uiContains('Tab 1 of 4')) ||
    (await phone.uiContains('Accueil'));
  if (!ok) throw new Error('Shell introuvable après loginFresh');
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

async function assertAnyLabel(phone, labels, context) {
  for (const label of labels) {
    if (await phone.uiContains(label)) return label;
  }
  throw new Error(
    `${context} : aucun label parmi ${labels.map((l) => `« ${l} »`).join(', ')}`,
  );
}

(async () => {
  const { email, password } = await resolveSmokeCredentials();
  const token = await loginSmokeToken(email, password);
  // Nouvelle candidature en tête de liste pour éviter timeout scroll
  const target = await ensureSmokeApplication(token, { forceNew: true });
  const phone = await connectSmokePhone();
  console.log('User:', email);
  console.log('Candidature cible:', target.position);

  await ensureLoggedIn(phone, email, password);
  await ensureApplicationsListTab(phone);
  await recoverFromOfflineMode(phone);
  try {
    await openSmokeApplicationDetail(phone, target);
  } catch (err) {
    console.warn(
      `[smoke] cible API introuvable (${err.message}) — fallback carte visible`,
    );
    await ensureApplicationsListTab(phone);
    await openFirstVisibleApplicationCard(phone, target.position);
  }

  // ── Entretien
  await openFabMenu(phone);
  await phone.tap('Entretien');
  await phone.wait(2500);

  if (!(await phone.uiContains('Nouvel entretien'))) {
    throw new Error('Dialogue « Nouvel entretien » introuvable');
  }
  await assertAnyLabel(
    phone,
    ['Date et heure (jour)', 'Date et heure'],
    'Entretien date',
  );
  await assertAnyLabel(phone, ['Lieu (optionnel)', 'Lieu'], 'Entretien lieu');
  await assertAnyLabel(phone, ['Notes'], 'Entretien notes');
  console.log('✅ FAB → Entretien : champs OK');
  await phone.tap('Annuler');
  await phone.wait(1200);

  // ── Appel
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
