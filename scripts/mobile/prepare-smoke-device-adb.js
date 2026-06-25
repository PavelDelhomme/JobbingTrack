#!/usr/bin/env node
/**
 * Prépare l'appareil pour les smokes ADB (debug uniquement) :
 * - Garde la connexion (keepLoggedIn)
 * - Contourne l'écran biométrique au démarrage (sans désactiver la biométrie utilisateur)
 *
 * Usage: node scripts/mobile/prepare-smoke-device-adb.js
 */

const adbLib = require('../../tools/adb-lib');

async function main() {
  const phone = await adbLib.connect();
  await adbLib.flows.prepareSmokeSession(phone, { restart: true });
  console.log('Préparation smoke OK — app redémarrée.');
  console.log(
    'Prefs: test_automation_skip_biometric=true, auth_biometric_unlock=false, auth_keep_logged_in=true',
  );
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
