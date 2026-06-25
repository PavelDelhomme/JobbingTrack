#!/usr/bin/env node
/**
 * Configure BlueMail + compte IMAP OVH (candidatures@…) sur l'émulateur.
 *
 * Usage :
 *   node scripts/mobile/setup/configure-emulator-bluemail.js
 *   node scripts/mobile/setup/configure-emulator-bluemail.js --check-only
 */

const adbLib = require('../../../tools/adb-lib');
const { resolveEmailTriageEnv } = require('../lib/resolve-email-triage-env');
const { isBlueMailInstalled } = require('../lib/bluemail-adb');
const {
  configureBlueMailOvh,
  blueMailShowsAccount,
  verifyOvhImap,
} = require('../lib/bluemail-setup-flow');

(async () => {
  const checkOnly = process.argv.includes('--check-only');
  const cfg = resolveEmailTriageEnv();
  const email = cfg.readAccount;

  if (!email) {
    console.error('EMAIL_TRIAGE_READ_ACCOUNT absent dans .env');
    process.exit(1);
  }
  if (!cfg.ovhImap?.password && !checkOnly) {
    console.error('EMAIL_TRIAGE_READ_PASSWORD absent dans .env');
    process.exit(1);
  }

  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  console.log('Devices:', devices.map((d) => d.id).join(', ') || '(aucun)');

  const pkg = await isBlueMailInstalled(phone);
  if (!pkg) {
    console.error('BlueMail non installé — lancez : node scripts/mobile/setup/install-emulator-bluemail.js');
    process.exit(1);
  }
  console.log(`BlueMail : ${pkg}`);

  if (checkOnly) {
    if (await blueMailShowsAccount(phone, email)) {
      console.log(`Compte OVH visible dans BlueMail : ${email}`);
      process.exit(0);
    }
    const imap = await verifyOvhImap(cfg);
    if (imap.ok) {
      console.log(`IMAP serveur OK — UI BlueMail pas encore confirmée pour ${email}`);
      process.exit(2);
    }
    console.log(`Compte ${email} absent — IMAP serveur : ${imap.message}`);
    process.exit(2);
  }

  console.log(`Configuration BlueMail IMAP OVH : ${email}`);
  const result = await configureBlueMailOvh(phone, pkg, cfg);

  if (result.ok) {
    console.log(`Compte OVH configuré dans BlueMail : ${email}`);
    return;
  }

  if (result.error === 'authentication_failed') {
    console.error('');
    console.error('Connexion IMAP OVH refusée (BlueMail + serveur).');
    console.error('Vérifiez EMAIL_TRIAGE_READ_PASSWORD et IMAP activé sur manager OVH.');
    process.exit(5);
  }

  console.warn('');
  console.warn('Configuration BlueMail non confirmée automatiquement.');
  console.warn('Relancez : node scripts/mobile/setup/configure-emulator-bluemail.js --check-only');
  process.exit(4);
})().catch((err) => {
  console.error('Configuration BlueMail AVD KO:', err.message);
  process.exit(1);
});
