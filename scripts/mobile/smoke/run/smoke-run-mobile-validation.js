#!/usr/bin/env node
/**
 * Batterie complète smokes mobile Lot D (API + ADB Samsung).
 * Bypass biométrique sur les scripts ADB — exécutable sans porteur devant l'appareil.
 *
 *   node scripts/mobile/smoke/run/smoke-run-mobile-validation.js
 *   node scripts/mobile/smoke/run/smoke-run-mobile-validation.js --skip-slow   # sans register/verify-email
 */

const { spawnSync } = require('child_process');
const path = require('path');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');
const { ensureTestAccountsReady } = require('../../setup/ensure-test-accounts-ready');
const { restoreSmokeDeviceAfterBattery } = require('../../lib/restore-smoke-device');

loadRootEnv();

const ROOT = path.join(__dirname, '../../../..');
const NODE = process.execPath;

const apiTests = [
  'scripts/mobile/smoke/api/smoke-full-journey-api.js',
  'scripts/mobile/smoke/api/smoke-notifications-in-app-scope-api.js',
  'scripts/mobile/smoke/api/smoke-analytics-api.js',
  'scripts/mobile/smoke/api/smoke-workflow-api.js',
  'scripts/mobile/smoke/api/smoke-push-register-api.js',
];

const adbTests = [
  'scripts/mobile/smoke/adb/smoke-login-user-password-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-shell-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-navigation-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-admin-hub-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-application-detail-fab-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-fab-relance-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-fab-call-entretien-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-application-sheet-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-entity-links-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-followup-nav-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-settings-interim-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-interim-calendar-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-entities-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-profile-save-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-home-upcoming-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-live-journey-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-interview-nav-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-accounts-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-interim-home-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-notification-nav-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-company-create-adb.js',
  'scripts/mobile/smoke/adb/smoke-offline-business-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-offline-telemetry-adb.js',
];

const adbTestsLast = [
  'scripts/mobile/smoke/adb/smoke-mobile-cold-start-login-adb.js',
];

const slowAdbTests = [
  'scripts/mobile/smoke/adb/smoke-register-adb.js',
  'scripts/mobile/smoke/adb/smoke-verify-email-adb.js',
  'scripts/mobile/smoke/adb/smoke-register-telemetry-refuse-adb.js',
];

function runScript(relPath, label) {
  const started = Date.now();
  console.log(`\n${'='.repeat(60)}\n▶ ${label}\n   ${relPath}\n${'='.repeat(60)}`);
  const r = spawnSync(NODE, [path.join(ROOT, relPath)], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 600000,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  const sec = ((Date.now() - started) / 1000).toFixed(1);
  const ok = r.status === 0;
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  console.log(`${ok ? '✅' : '❌'} ${label} — ${sec}s (exit ${r.status ?? 'signal'})`);
  return { relPath, label, ok, sec, exit: r.status };
}

(async () => {
  const skipSlow = process.argv.includes('--skip-slow');
  const results = [];
  let exitCode = 0;

  process.env.ADB_FAST = process.env.ADB_FAST || '1';
  process.env.ADB_UI_CACHE_MS = process.env.ADB_UI_CACHE_MS || '280';
  process.env.ADB_WAIT_POLL_MS = process.env.ADB_WAIT_POLL_MS || '320';

  console.log('JobbingTrack — batterie validation mobile Lot D');
  console.log(`Racine: ${ROOT}`);
  console.log(`Mode: ${skipSlow ? 'rapide (sans register/verify-email)' : 'complet'}`);

  try {
    await ensureTestAccountsReady();

    for (const rel of apiTests) {
      results.push(runScript(rel, `API · ${path.basename(rel, '.js')}`));
    }

    for (const rel of adbTests) {
      results.push(runScript(rel, `ADB · ${path.basename(rel, '.js')}`));
    }

    if (!skipSlow) {
      for (const rel of slowAdbTests) {
        results.push(runScript(rel, `ADB slow · ${path.basename(rel, '.js')}`));
      }
    }

    for (const rel of adbTestsLast) {
      results.push(runScript(rel, `ADB · ${path.basename(rel, '.js')}`));
    }

    const passed = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    console.log(`\n${'='.repeat(60)}`);
    console.log('RÉSUMÉ');
    console.log(`${'='.repeat(60)}`);
    console.log(`OK  : ${passed.length}/${results.length}`);
    for (const r of passed) console.log(`  ✅ ${r.label} (${r.sec}s)`);
    if (failed.length) {
      console.log(`KO  : ${failed.length}`);
      for (const r of failed) console.log(`  ❌ ${r.label} (exit ${r.exit})`);
      exitCode = 1;
    } else {
      console.log('\nBatterie validation mobile OK');
    }
  } finally {
    await restoreSmokeDeviceAfterBattery();
  }
  process.exit(exitCode);
})();
