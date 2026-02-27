#!/usr/bin/env node
/**
 * Exemple : Lancer un scenario predefini.
 *
 *   node tools/adb-lib/examples/run-scenario.js login_quick
 *   node tools/adb-lib/examples/run-scenario.js complete
 *   node tools/adb-lib/examples/run-scenario.js navigation_complete
 *
 * Scenarios disponibles :
 *   login_quick, registration, password_reset,
 *   navigation_complete, first_use, complete
 */

const adb = require('..');

const scenarioName = process.argv[2] || 'login_quick';

(async () => {
  console.log(`Scenario: ${scenarioName}`);
  console.log('Scenarios disponibles:', adb.listScenarios().map(s => s.id).join(', '));
  console.log();

  const report = await adb.runScenario(scenarioName);
  console.log('Resultat:', report.status, `(${report.duration}ms)`);

  process.exit(report.status === 'success' ? 0 : 1);
})().catch(err => { console.error('Erreur:', err.message); process.exit(1); });
