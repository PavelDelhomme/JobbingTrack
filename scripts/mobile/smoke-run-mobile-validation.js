#!/usr/bin/env node
/**
 * Batterie complète smokes mobile Lot D (API + ADB Samsung).
 * Bypass biométrique sur les scripts ADB — exécutable sans porteur devant l'appareil.
 *
 *   node scripts/mobile/smoke-run-mobile-validation.js
 *   node scripts/mobile/smoke-run-mobile-validation.js --skip-slow   # sans register/verify-email
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const NODE = process.execPath;

const apiTests = [
  'scripts/mobile/smoke-full-journey-api.js',
  'scripts/mobile/smoke-notifications-in-app-scope-api.js',
  'scripts/mobile/smoke-analytics-api.js',
  'scripts/mobile/smoke-workflow-api.js',
  'scripts/mobile/smoke-push-register-api.js',
];

const adbTests = [
  'scripts/mobile/smoke-login-user-password-adb.js',
  'scripts/mobile/smoke-mobile-shell-adb.js',
  'scripts/mobile/smoke-mobile-navigation-adb.js',
  'scripts/mobile/smoke-mobile-entities-adb.js',
  'scripts/mobile/smoke-mobile-accounts-adb.js',
  'scripts/mobile/smoke-mobile-interim-home-adb.js',
  'scripts/mobile/smoke-mobile-notification-nav-adb.js',
  'scripts/mobile/smoke-mobile-notification-nav-adb.js',
  'scripts/mobile/smoke-mobile-company-create-adb.js',
  'scripts/mobile/smoke-offline-business-adb.js',
];

const adbTestsLast = [
  'scripts/mobile/smoke-mobile-cold-start-login-adb.js',
];

const slowAdbTests = [
  'scripts/mobile/smoke-register-adb.js',
  'scripts/mobile/smoke-verify-email-adb.js',
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

  console.log('JobbingTrack — batterie validation mobile Lot D');
  console.log(`Racine: ${ROOT}`);
  console.log(`Mode: ${skipSlow ? 'rapide (sans register/verify-email)' : 'complet'}`);

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
    process.exit(1);
  }
  console.log('\nBatterie validation mobile OK');
})();
