#!/usr/bin/env node
/**
 * Batterie smoke RAPIDE Lot D — couvre l’essentiel en ~8–15 min (Samsung, ADB_FAST=1).
 *
 *   node scripts/mobile/smoke/run/smoke-run-mobile-fast.js
 *
 * Exclut : register/verify-email IMAP, offline lourd, dual comptes pm clear, cold start.
 * Pré-vol unique : verrou ADB + session TEST_USER + comptes emailVerified.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');
const { applyRuntimeGatewayEnv, resolveGatewayUrl, isRunningInContainer } = require('../../../lib/gateway-url');
const { runPreflight } = require('./smoke-preflight');
const { restoreSmokeDeviceAfterBattery } = require('../../lib/restore-smoke-device');

loadRootEnv();

const ROOT = path.join(__dirname, '../../../..');
const NODE = process.execPath;

/** API en parallèle — rapides, sans appareil. */
const apiTests = [
  'scripts/mobile/smoke/api/smoke-analytics-api.js',
  'scripts/mobile/smoke/api/smoke-notifications-in-app-scope-api.js',
  'scripts/mobile/smoke/api/smoke-push-register-api.js',
  'scripts/mobile/smoke/api/smoke-workflow-api.js',
];

/** Parcours API métier (plus long mais sans ADB). */
const apiSequential = ['scripts/mobile/smoke/api/smoke-full-journey-api.js'];

/** ADB — session TEST_USER déjà ouverte par preflight. */
const adbTests = [
  'scripts/mobile/smoke/adb/smoke-login-user-password-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-shell-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-navigation-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-application-detail-fab-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-fab-relance-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-fab-call-entretien-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-settings-interim-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-interim-home-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-entities-adb.js',
  'scripts/mobile/smoke/adb/smoke-mobile-profile-save-adb.js',
];

/** Admin hub en fin — switch compte puis restauration porteur. */
const adbLast = ['scripts/mobile/smoke/adb/smoke-mobile-admin-hub-adb.js'];

function runScript(relPath, label, envExtra = {}) {
  const started = Date.now();
  console.log(`\n${'─'.repeat(56)}\n▶ ${label}\n   ${relPath}\n${'─'.repeat(56)}`);
  const r = spawnSync(NODE, [path.join(ROOT, relPath)], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 420000,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      ADB_FAST: '1',
      ADB_UI_CACHE_MS: '220',
      ADB_WAIT_POLL_MS: '260',
      SMOKE_SHARED_SHELL: '1',
      SMOKE_PREFLIGHT_DONE: '1',
      ...envExtra,
    },
  });
  const sec = ((Date.now() - started) / 1000).toFixed(1);
  const ok = r.status === 0;
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  console.log(`${ok ? '✅' : '❌'} ${label} — ${sec}s`);
  return { relPath, label, ok, sec, exit: r.status };
}

function runParallel(scripts, prefix) {
  const started = Date.now();
  console.log(`\n▶ ${prefix} (${scripts.length} en parallèle)`);
  const children = scripts.map((rel) => {
    const label = `${prefix} · ${path.basename(rel, '.js')}`;
    return new Promise((resolve) => {
      const t0 = Date.now();
      const cp = require('child_process').spawn(NODE, [path.join(ROOT, rel)], {
        cwd: ROOT,
        env: { ...process.env, FORCE_COLOR: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let out = '';
      cp.stdout.on('data', (d) => {
        out += d;
      });
      cp.stderr.on('data', (d) => {
        out += d;
      });
      cp.on('close', (code) => {
        const sec = ((Date.now() - t0) / 1000).toFixed(1);
        if (out) process.stdout.write(out);
        resolve({
          relPath: rel,
          label,
          ok: code === 0,
          sec,
          exit: code,
        });
      });
    });
  });
  return Promise.all(children).then((results) => {
    console.log(`▶ ${prefix} terminé en ${((Date.now() - started) / 1000).toFixed(1)}s`);
    return results;
  });
}

(async () => {
  console.log('JobbingTrack — batterie smoke RAPIDE Lot D');
  console.log(
    `Gateway smoke : ${resolveGatewayUrl({ perspective: 'host' })}` +
      (isRunningInContainer() ? ' (conteneur → interne)' : ' (hôte → port publié)'),
  );
  const t0 = Date.now();

  process.env.ADB_FAST = '1';
  process.env.ADB_UI_CACHE_MS = '220';
  process.env.ADB_WAIT_POLL_MS = '260';

  let exitCode = 0;
  try {
    await runPreflight({ prepare: true, label: 'fast-battery' });

    const results = [];

    results.push(...(await runParallel(apiTests, 'API')));

    for (const rel of apiSequential) {
      results.push(runScript(rel, `API · ${path.basename(rel, '.js')}`));
    }

    for (const rel of adbTests) {
      results.push(runScript(rel, `ADB · ${path.basename(rel, '.js')}`));
    }

    for (const rel of adbLast) {
      results.push(runScript(rel, `ADB · ${path.basename(rel, '.js')}`));
    }

    const passed = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    const totalSec = ((Date.now() - t0) / 1000 / 60).toFixed(1);

    console.log(`\n${'='.repeat(56)}`);
    console.log(`RÉSUMÉ RAPIDE — ${totalSec} min`);
    console.log(`${'='.repeat(56)}`);
    console.log(`OK : ${passed.length}/${results.length}`);
    for (const r of passed) console.log(`  ✅ ${r.label} (${r.sec}s)`);
    if (failed.length) {
      console.log(`KO : ${failed.length}`);
      for (const r of failed) console.log(`  ❌ ${r.label} (exit ${r.exit})`);
      exitCode = 1;
    } else {
      console.log('\nBatterie smoke rapide OK');
    }
  } catch (err) {
    console.error('Batterie rapide KO:', err.message);
    exitCode = 1;
  } finally {
    await restoreSmokeDeviceAfterBattery();
  }
  process.exit(exitCode);
})();
