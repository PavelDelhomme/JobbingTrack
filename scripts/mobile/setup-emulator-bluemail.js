#!/usr/bin/env node
/**
 * Pipeline complet BlueMail + OVH sur émulateur (sans Play Store).
 *
 *   1. install-emulator-bluemail.js (pull Samsung → sideload)
 *   2. Vérification IMAP serveur (.env)
 *   3. configure-emulator-bluemail.js (UI BlueMail)
 *
 * Usage :
 *   MOBILE_ADB_DEVICE=emulator-5554 node scripts/mobile/setup-emulator-bluemail.js
 *   node scripts/mobile/setup-emulator-bluemail.js --skip-imap-check   # UI seulement
 */

const { execFileSync } = require('child_process');
const path = require('path');
const adbLib = require('../../tools/adb-lib');
const { resolveEmailTriageEnv } = require('./resolve-email-triage-env');
const { isBlueMailInstalled } = require('./lib/bluemail-adb');
const { verifyOvhImap, configureBlueMailOvh } = require('./lib/bluemail-setup-flow');

const ROOT = path.resolve(__dirname, '../..');
const skipImapCheck = process.argv.includes('--skip-imap-check');

function runNodeScript(relPath) {
  execFileSync(process.execPath, [path.join(ROOT, relPath)], {
    stdio: 'inherit',
    env: process.env,
  });
}

(async () => {
  console.log('=== BlueMail OVH — pipeline émulateur ===\n');

  console.log('[1/3] Installation BlueMail…');
  runNodeScript('scripts/mobile/install-emulator-bluemail.js');

  const cfg = resolveEmailTriageEnv();
  const email = cfg.readAccount;
  if (!email) {
    console.error('EMAIL_TRIAGE_READ_ACCOUNT absent');
    process.exit(1);
  }
  console.log(`\nCompte cible : ${email}`);

  if (!skipImapCheck) {
    console.log('\n[2/3] Vérification IMAP OVH (serveur)…');
    const imap = await verifyOvhImap(cfg);
    if (!imap.ok) {
      console.error('\nIMAP OVH KO avant configuration BlueMail.');
      console.error(`  Host : ${cfg.ovhImap?.host || 'imap.mail.ovh.net'}`);
      console.error(`  Erreur : ${imap.message}`);
      console.error('\nActions :');
      console.error('  1. Vérifier connexion sur https://mail.ovh.net avec le même mot de passe');
      console.error('  2. Manager OVH → activer IMAP sur la boîte candidatures@');
      console.error('  3. Corriger EMAIL_TRIAGE_READ_PASSWORD dans .env puis :');
      console.error('     node scripts/mobile/sync-test-env.js --write');
      console.error('\nPour forcer la config UI malgré IMAP KO : --skip-imap-check');
      process.exit(5);
    }
    console.log(`IMAP OVH OK (${imap.host})`);
  } else {
    console.log('\n[2/3] Vérification IMAP ignorée (--skip-imap-check)');
  }

  console.log('\n[3/3] Configuration BlueMail (UI)…');
  const phone = await adbLib.connect();
  const pkg = await isBlueMailInstalled(phone);
  if (!pkg) {
    console.error('BlueMail absent après install');
    process.exit(1);
  }

  const result = await configureBlueMailOvh(phone, pkg, cfg);
  if (result.ok) {
    console.log(`\nOK — BlueMail configuré (${email})`);
    process.exit(0);
  }

  if (result.error === 'authentication_failed') {
    console.error(`\nBlueMail : authentification refusée (étape ${result.step})`);
    console.error('Le mot de passe OVH dans .env est rejeté par imap.mail.ovh.net');
    process.exit(5);
  }

  console.warn(`\nConfiguration UI non confirmée (étape ${result.step})`);
  console.warn('Relancez : node scripts/mobile/configure-emulator-bluemail.js --check-only');
  process.exit(4);
})().catch((err) => {
  console.error('setup-emulator-bluemail:', err.message);
  process.exit(1);
});
