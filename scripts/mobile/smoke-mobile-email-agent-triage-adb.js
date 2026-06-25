#!/usr/bin/env node
/**
 * Smoke ouverture des emails triage sur mobile (expand + sujets seed).
 *   node scripts/mobile/prepare-smoke-device-adb.js   # une fois par session
 *   node scripts/mobile/smoke-mobile-email-agent-triage-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

const EXPECTED = ['Proposition entretien', 'Relance candidature', 'Candidature reçue'];

async function openEmailAgentFromSettings(phone) {
  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(2000);
  if (!(await phone.uiContains('Paramètres'))) {
    await phone.scrollDown(400);
    await phone.wait(500);
  }
  await phone.tap('Paramètres');
  await phone.wait(2000);
  for (let i = 0; i < 10; i++) {
    if (await phone.uiContains('Agent email')) break;
    await phone.scrollDown(400);
    await phone.wait(500);
  }
  if (!(await phone.uiContains('Agent email'))) {
    throw new Error('Agent email introuvable dans Paramètres (scroller Recherche d\'emploi)');
  }
  await phone.tap('Agent email');
  await phone.wait(3000);

  for (let i = 0; i < 20; i++) {
    if (await phone.uiContains('À traiter')) break;
    if (await phone.uiContains('Rien en attente')) break;
    if (await phone.uiContains('Consentements')) {
      await phone.scrollDown(500);
      await phone.wait(600);
      continue;
    }
    await phone.wait(800);
  }
}

async function main() {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();

  console.log('[triage-adb] Préparation session smoke');
  await adbLib.flows.prepareSmokeSession(phone, { restart: true });
  console.log('[triage-adb] Connexion shell');
  const msg = await adbLib.flows.ensureAuthenticatedShell(phone, email, password);
  console.log('  →', msg);

  console.log('[1/3] Paramètres → Agent email');
  await openEmailAgentFromSettings(phone);
  if (!(await phone.uiContains('À traiter')) && !(await phone.uiContains('Rien en attente'))) {
    throw new Error('Section triage absente');
  }
  if (await phone.uiContains('Rien en attente')) {
    throw new Error('Triage vide — relancer bootstrap-admin-email-agent.cjs');
  }
  console.log('  → OK');

  console.log('[2/3] Détection des 3 sujets seed');
  let found = 0;
  for (const subject of EXPECTED) {
    for (let s = 0; s < 8; s++) {
      if (await phone.uiContains(subject)) {
        found++;
        console.log(`  → ${subject}`);
        break;
      }
      await phone.scrollDown(300);
      await phone.wait(400);
    }
  }
  if (found < 3) throw new Error(`Seulement ${found}/3 sujets visibles`);

  console.log('[3/3] Expand premier email');
  await phone.scrollUp(800);
  await phone.wait(500);
  try {
    await phone.tap('Détails email triage');
  } catch {
    await phone.tap('Proposition entretien');
  }
  await phone.wait(2000);
  const expanded =
    (await phone.uiContains('Valider')) ||
    (await phone.uiContains('Actions Google')) ||
    (await phone.uiContains('Développeur'));
  if (!expanded) throw new Error('Détail email non ouvert après expand');
  console.log('  → détail ouvert OK');
  console.log('SMOKE MOBILE TRIAGE EXPAND OK');
}

main().catch((err) => {
  console.error('SMOKE FAIL:', err.message);
  process.exit(1);
});
