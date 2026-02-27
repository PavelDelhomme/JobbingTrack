/**
 * Runner de scenarios et d'actions en serie, avec reporting.
 *
 * Usage:
 *   const { createAdb } = require('./client');
 *   const { Runner } = require('./runner');
 *
 *   const adb = await createAdb();
 *   const runner = new Runner(adb);
 *
 *   // Executer un scenario predefini
 *   const report = await runner.scenario('login_quick', { email: 'admin@jobbingtrack.com' });
 *
 *   // Executer une liste d'actions custom
 *   const report2 = await runner.actions([
 *     { id: 'mob_login', params: { email: 'admin@jobbingtrack.com' } },
 *     { id: 'mob_tap', params: { text: 'Candidatures' } },
 *     { id: 'mob_assert_text', params: { text: 'Bonjour' } },
 *   ]);
 *
 *   // Executer une sequence de fonctions
 *   const report3 = await runner.steps([
 *     async (adb) => { await adb.tap('Se connecter'); return 'Tap ok'; },
 *     async (adb) => { await adb.assertVisible('Bonjour'); return 'Assert ok'; },
 *   ]);
 */

const { SCENARIOS } = require('./scenarios');
const { exec } = require('./actions');

class Runner {
  /**
   * @param {import('./client').AdbClient} adb
   * @param {object} [opts]
   * @param {(step: object) => void} [opts.onStepStart]
   * @param {(step: object) => void} [opts.onStepEnd]
   * @param {boolean} [opts.stopOnError] - arret au premier echec (default: false)
   */
  constructor(adb, opts = {}) {
    this.adb = adb;
    this.onStepStart = opts.onStepStart || (() => {});
    this.onStepEnd = opts.onStepEnd || (() => {});
    this.stopOnError = opts.stopOnError || false;
  }

  /**
   * Execute un scenario predefini par son nom.
   */
  async scenario(name, opts = {}) {
    const sc = SCENARIOS[name];
    if (!sc) throw new Error(`Scenario "${name}" inconnu. Disponibles: ${Object.keys(SCENARIOS).join(', ')}`);

    const t0 = Date.now();
    console.log(`\n--- Scenario: ${sc.name} ---`);
    console.log(`    ${sc.description}\n`);

    this.onStepStart({ type: 'scenario', name: sc.name });

    try {
      const result = await sc.run(this.adb, opts);
      const duration = Date.now() - t0;
      const report = { scenario: name, name: sc.name, status: 'success', result, duration };
      this.onStepEnd(report);
      console.log(`\n    [OK] ${sc.name} (${duration}ms)\n`);
      return report;
    } catch (err) {
      const duration = Date.now() - t0;
      const report = { scenario: name, name: sc.name, status: 'error', error: err.message, duration };
      this.onStepEnd(report);
      console.error(`\n    [FAIL] ${sc.name}: ${err.message} (${duration}ms)\n`);
      return report;
    }
  }

  /**
   * Execute une liste d'actions parametrees.
   * @param {Array<{ id: string, params?: Record<string, any>, label?: string }>} actionList
   */
  async actions(actionList) {
    const t0 = Date.now();
    const results = [];
    let ok = 0, fail = 0;

    for (let i = 0; i < actionList.length; i++) {
      const { id, params = {}, label } = actionList[i];
      const stepLabel = label || id;
      const stepNum = `[${i + 1}/${actionList.length}]`;

      this.onStepStart({ type: 'action', index: i, id, label: stepLabel });

      try {
        const msg = await exec(id, params, this.adb);
        const r = { index: i, id, label: stepLabel, status: 'success', message: msg };
        results.push(r);
        this.onStepEnd(r);
        console.log(`  ${stepNum} OK ${stepLabel}: ${msg}`);
        ok++;
      } catch (err) {
        const r = { index: i, id, label: stepLabel, status: 'error', error: err.message };
        results.push(r);
        this.onStepEnd(r);
        console.error(`  ${stepNum} FAIL ${stepLabel}: ${err.message}`);
        fail++;
        if (this.stopOnError) break;
      }
    }

    const duration = Date.now() - t0;
    console.log(`\n  Resume: ${ok} OK, ${fail} FAIL (${duration}ms)\n`);
    return { results, ok, fail, duration };
  }

  /**
   * Execute une sequence de fonctions async(adb).
   * @param {Array<{ name: string, fn: (adb) => Promise<any> }>} stepList
   */
  async steps(stepList) {
    const t0 = Date.now();
    const results = [];
    let ok = 0, fail = 0;

    for (let i = 0; i < stepList.length; i++) {
      const step = stepList[i];
      const name = step.name || `Etape ${i + 1}`;
      const fn = typeof step === 'function' ? step : step.fn;
      const stepNum = `[${i + 1}/${stepList.length}]`;

      this.onStepStart({ type: 'step', index: i, name });

      try {
        const result = await fn(this.adb);
        const r = { index: i, name, status: 'success', result };
        results.push(r);
        this.onStepEnd(r);
        console.log(`  ${stepNum} OK ${name}: ${result || ''}`);
        ok++;
      } catch (err) {
        const r = { index: i, name, status: 'error', error: err.message };
        results.push(r);
        this.onStepEnd(r);
        console.error(`  ${stepNum} FAIL ${name}: ${err.message}`);
        fail++;
        if (this.stopOnError) break;
      }
    }

    const duration = Date.now() - t0;
    console.log(`\n  Resume: ${ok} OK, ${fail} FAIL (${duration}ms)\n`);
    return { results, ok, fail, duration };
  }
}

module.exports = { Runner };
