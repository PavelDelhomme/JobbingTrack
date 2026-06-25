#!/usr/bin/env node
/**
 * Désactive les prefs smoke ADB (retour usage normal : biométrie, pas de bypass test).
 * Usage: node scripts/mobile/setup/clear-smoke-device-adb.js
 */

const adbLib = require('../../../tools/adb-lib');

async function main() {
  const phone = await adbLib.connect();
  await adbLib.flows.restoreSmokeSessionPrefs(phone);
  console.log('OK — test_automation_skip_biometric=false');
  console.log(
    "Relancez l'app : connexion empreinte / déverrouillage biométrique refonctionnent si activés dans Paramètres.",
  );
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
