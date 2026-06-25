/**
 * Restaure les prefs appareil après une batterie smoke (biométrie produit).
 * @used-by scripts/mobile/smoke/run/smoke-run-mobile-fast.js, scripts/mobile/smoke/run/smoke-run-mobile-validation.js
 */

const adbLib = require('../../../tools/adb-lib');

async function restoreSmokeDeviceAfterBattery() {
  if (process.env.SMOKE_SKIP_RESTORE === '1') {
    console.log('ℹ️  Restauration biométrie ignorée (SMOKE_SKIP_RESTORE=1)');
    return;
  }
  try {
    const phone = await adbLib.connect();
    await adbLib.flows.restoreSmokeSessionPrefs(phone);
    console.log('✅ Appareil restauré — biométrie produit réactivée (hors mode test ADB)');
  } catch (err) {
    console.warn(`⚠️  Restauration prefs smoke : ${err.message}`);
    console.warn('   Lancez : node scripts/mobile/setup/clear-smoke-device-adb.js');
  }
}

module.exports = { restoreSmokeDeviceAfterBattery };
