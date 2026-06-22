#!/usr/bin/env node
/**
 * Smoke FAB « Ajouter » sur détail candidature (Lot D lignes 318/325).
 *
 *   node scripts/mobile/smoke-mobile-application-detail-fab-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

const SKIP_LIST_LABELS = new Set([
  'Candidatures',
  'Toutes',
  'En cours',
  'Terminées',
  'Refusées',
  'Archivées',
  'Nouvelle candidature',
  'Créer ma première candidature',
  'Rechercher',
]);

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

function nodeLabel(n) {
  return `${n.text || ''}\n${n.contentDesc || ''}`.trim();
}

async function waitApplicationsTabReady(phone, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await phone.uiContains('Aucune candidature')) return 'empty';
    if (await phone.uiContains('Impossible de charger les candidatures')) return 'error';
    const nodes = await phone.uiNodes();
    const hasCard = nodes.some(
      (n) => n.clickable && nodeLabel(n).includes('Postulé'),
    );
    if (hasCard) return 'list';
    await phone.wait(1000);
  }
  return 'timeout';
}

async function tapFirstApplicationCard(phone) {
  const nodes = await phone.uiNodes();
  const card = nodes.find((n) => n.clickable && nodeLabel(n).includes('Postulé'));
  if (card) {
    const m = card.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    const cx = Math.floor((+m[1] + +m[3]) / 2);
    const cy = Math.floor((+m[2] + +m[4]) / 2);
    await phone.tapXY(cx, cy);
    return;
  }
  await phone.tapXY(540, 1000);
}

async function openFirstApplicationDetail(phone) {
  await adbLib.flows.goToTab(phone, 2, { shell: true });
  await phone.wait(2000);
  const state = await waitApplicationsTabReady(phone);
  if (state === 'empty') {
    throw new Error('Aucune candidature — impossible de tester le FAB détail');
  }
  if (state === 'error') {
    throw new Error('Erreur chargement candidatures sur l’appareil');
  }
  if (state === 'timeout') {
    throw new Error('Liste candidatures : timeout chargement');
  }

  await tapFirstApplicationCard(phone);
  await phone.wait(2500);

  const onDetail =
    (await phone.uiContains('Ajouter')) ||
    (await phone.uiContains('Changer statut')) ||
    (await phone.uiContains('Relances')) ||
    (await phone.uiContains('Entretiens'));
  if (!onDetail) {
    throw new Error('Écran détail candidature introuvable après tap liste');
  }
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('Device:', phone.device);
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);
  await openFirstApplicationDetail(phone);
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
