#!/usr/bin/env node
/**
 * Installe BlueMail sur l'émulateur (Play Store ou sideload APK).
 *
 * Ordre :
 *   1. Déjà installé → ouverture
 *   2. Play Store réel (image google_apis_playstore) → install auto
 *   3. APK local tools/apk/*.apk → adb install
 *
 * Usage :
 *   MOBILE_ADB_DEVICE=emulator-5554 node scripts/mobile/setup/install-emulator-bluemail.js
 *   node scripts/mobile/setup/install-emulator-bluemail.js --sideload-only
 *
 * Sans Play Store : bash scripts/mobile/setup-android-emulator.sh migrate-playstore
 */

const adbLib = require('../../../tools/adb-lib');
const {
  isPlayStoreLaunchable,
  isBlueMailInstalled,
  openBlueMail,
  sideloadBlueMail,
  installViaPlayStore,
  ensureBlueMailApk,
  APK_DIR,
} = require('../lib/bluemail-adb');

(async () => {
  const sideloadOnly = process.argv.includes('--sideload-only');
  const phone = await adbLib.connect();

  let pkg = await isBlueMailInstalled(phone);
  if (pkg) {
    console.log(`BlueMail déjà installé (${pkg}) — ouverture…`);
    await openBlueMail(phone, pkg);
    console.log('OK — lancez configure-emulator-bluemail.js pour le compte OVH.');
    return;
  }

  console.log('BlueMail absent — recherche APK (Samsung USB → tools/apk → Play Store)…');
  const pulled = await ensureBlueMailApk(phone);
  if (pulled) {
    console.log(`APK prêt : ${pulled}`);
  }

  const hasStore = await isPlayStoreLaunchable(phone);
  if (!sideloadOnly && hasStore) {
    pkg = await installViaPlayStore(phone);
    if (pkg) {
      await openBlueMail(phone, pkg);
      console.log('OK — lancez : node scripts/mobile/setup/configure-emulator-bluemail.js');
      return;
    }
    console.warn('Play Store ouvert mais installation non confirmée — essai sideload…');
  } else if (!sideloadOnly) {
    console.warn('');
    console.warn('Play Store absent sur cet AVD (image google_apis sans Play).');
    console.warn('Migration recommandée :');
    console.warn('  bash scripts/mobile/setup-android-emulator.sh migrate-playstore');
    console.warn('');
  }

  const sideloaded = await sideloadBlueMail(phone);
  if (sideloaded) {
    pkg = await isBlueMailInstalled(phone);
    await openBlueMail(phone, pkg);
    console.log('OK (sideload) — lancez : node scripts/mobile/setup/configure-emulator-bluemail.js');
    return;
  }

  console.error('');
  console.error('BlueMail non installé.');
  console.error('');
  console.error('Option A — Play Store (recommandé) :');
  console.error('  bash scripts/mobile/setup-android-emulator.sh migrate-playstore');
  console.error('  node scripts/mobile/setup/install-emulator-bluemail.js');
  console.error('');
  console.error('Option B — APK manuel :');
  console.error(`  Copier me.bluemail.mail.apk dans ${APK_DIR}/`);
  console.error('  node scripts/mobile/setup/install-emulator-bluemail.js --sideload-only');
  process.exit(2);
})().catch((err) => {
  console.error('install-emulator-bluemail:', err.message);
  process.exit(1);
});
