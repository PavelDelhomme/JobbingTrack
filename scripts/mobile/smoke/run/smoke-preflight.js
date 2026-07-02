#!/usr/bin/env node
/**
 * Pré-vol smokes : stack, verrou ADB, comptes, préparation appareil (une fois).
 *
 *   node scripts/mobile/smoke-preflight.js
 *   node scripts/mobile/smoke-preflight.js --no-prepare   # sans restart app
 */

const adbLib = require('../../../../tools/adb-lib');
const { loadRootEnv, getGatewayUrl } = require('../../lib/resolve-admin-credentials');
const { isRunningInContainer } = require('../../../lib/gateway-url');
const { ensureTestAccountsReady } = require('../../setup/ensure-test-accounts-ready');
const { acquireSmokeLock } = require('./smoke-lock');
const { resolveEmailTriageEnv } = require('../../lib/resolve-email-triage-env');

loadRootEnv();

async function checkGateway() {
  const base = getGatewayUrl().replace(/\/$/, '');
  const paths = ['/health', '/api/v1/health'];
  for (const p of paths) {
    const res = await fetch(`${base}${p}`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (res?.ok) {
      console.log(`✅ Gateway ${base}${p}`);
      return;
    }
  }
  throw new Error(`Gateway injoignable sur ${getGatewayUrl()} — lancer la stack avant les smokes`);
}

async function checkEmulatorController(phone) {
  const ok = await phone.health();
  if (!ok) {
    throw new Error(
      'Contrôleur ADB/emulator-controller injoignable — lancer le service (port 5055 par défaut)',
    );
  }
  console.log('✅ Contrôleur ADB');
}

function logEmailMailboxes() {
  const cfg = resolveEmailTriageEnv();
  console.log('Boîtes email smokes (ordre token vérif) :');
  console.log(`  1. EmailLog API (destinataire exact)`);
  console.log(`  2. MailHog (${process.env.MAILHOG_WEB_PORT || '8025'})`);
  if (cfg.gmailImap) {
    console.log(`  3. IMAP Gmail ${cfg.gmailImap.email} (forward/triage)`);
  } else {
    console.log('  3. IMAP Gmail — non configuré (EMAIL_GMAIL_PRO_*)');
  }
  if (cfg.ovhImap) {
    console.log(`  4. IMAP OVH ${cfg.ovhImap.email}`);
  } else {
    console.log('  4. IMAP OVH — non configuré (EMAIL_TRIAGE_READ_*)');
  }
  console.log(`  Cible inscription test : ${cfg.testRealEmail || '(TEST_REAL_EMAIL manquant)'}`);
}

async function runPreflight(opts = {}) {
  const { prepare = true, label = 'battery' } = opts;
  console.log('\n=== Pré-vol smokes mobile ===\n');
  console.log(
    `Gateway : ${getGatewayUrl()}` +
      (isRunningInContainer() ? ' [réseau interne]' : ' [hôte / port publié]'),
  );

  await checkGateway();
  await ensureTestAccountsReady();
  logEmailMailboxes();

  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  if (!devices.length) {
    throw new Error('Aucun appareil ADB — branchez le Samsung ou lancez l’émulateur');
  }
  console.log(`✅ Appareil ADB : ${phone.device || devices[0].id}`);

  acquireSmokeLock(phone.device || devices[0].id, label);
  console.log('✅ Verrou smoke actif (pas de script parallèle sur cet appareil)');

  await checkEmulatorController(phone);

  if (prepare) {
    await adbLib.flows.prepareSmokeSession(phone, { restart: true });
    const user = await require('../../lib/resolve-user-credentials').resolveWorkingUserCredentials();
    await adbLib.flows.login(phone, user.email, user.password);
    await phone.assertVisible('Bonjour');
    console.log('✅ Session TEST_USER prête (formulaire mot de passe, sans empreinte)');
  }

  process.env.SMOKE_SHARED_SHELL = '1';
  process.env.SMOKE_PREFLIGHT_DONE = '1';
  console.log('\nPré-vol OK — enchaîner les smokes ADB (session partagée).\n');
  return phone.device;
}

if (require.main === module) {
  const noPrepare = process.argv.includes('--no-prepare');
  runPreflight({ prepare: !noPrepare }).catch((err) => {
    console.error('Pré-vol KO:', err.message);
    process.exit(1);
  });
}

module.exports = { runPreflight, checkGateway, logEmailMailboxes };
