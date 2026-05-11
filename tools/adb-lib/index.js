/**
 * adb-lib – Librairie Node.js reutilisable pour controler un appareil Android
 * via ADB et l'emulator-controller.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  UTILISATION RAPIDE
 * ═══════════════════════════════════════════════════════════════════════
 *
 *   const adb = require('../../tools/adb-lib');
 *
 *   // --- Methode 1 : Client direct (controle total) ---
 *   const phone = await adb.connect();
 *   await phone.tap('Se connecter');
 *   await phone.typeInField('Email', 'admin@jobbingtrack.test');
 *   await phone.assertVisible('Bonjour');
 *   const nodes = await phone.uiNodes();
 *
 *   // --- Methode 2 : Flows de haut niveau ---
 *   await adb.flows.loginFresh(phone, 'admin@jobbingtrack.test', 'password123');
 *   await adb.flows.navigateAllTabs(phone);
 *   await adb.flows.openDrawerItem(phone, 'Relances');
 *   await adb.flows.registerAndLogin(phone, { firstName: 'Jean' });
 *
 *   // --- Methode 3 : Actions parametrees ---
 *   await adb.exec('mob_login', { email: 'admin@jobbingtrack.test' }, phone);
 *   await adb.exec('mob_tap', { text: 'Candidatures' }, phone);
 *   await adb.exec('mob_assert_text', { text: 'Bonjour' }, phone);
 *
 *   // --- Methode 4 : Scenarios predefinis ---
 *   const runner = adb.runner(phone);
 *   await runner.scenario('login_quick');
 *   await runner.scenario('complete');
 *   await runner.scenario('navigation_complete');
 *
 *   // --- Methode 5 : Runner avec liste d'actions ---
 *   await runner.actions([
 *     { id: 'mob_login', params: { email: 'admin@jobbingtrack.test' } },
 *     { id: 'mob_tap_tab', params: { tab: 2 } },
 *     { id: 'mob_assert_text', params: { text: 'Candidatures' } },
 *   ]);
 *
 *   // --- Methode 6 : Runner avec fonctions custom ---
 *   await runner.steps([
 *     { name: 'Login', fn: async (adb) => { await adb.tap('connecter'); } },
 *     { name: 'Check dashboard', fn: async (adb) => { await adb.assertVisible('Bonjour'); } },
 *   ]);
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const { AdbClient, createAdb } = require('./client');
const { exec, ACTIONS_CATALOG } = require('./actions');
const flows = require('./flows');
const { SCENARIOS } = require('./scenarios');
const { Runner } = require('./runner');

/**
 * Raccourci : connecte le premier appareil detecte.
 * @param {string} [deviceId]
 * @param {object} [opts]
 * @returns {Promise<AdbClient>}
 */
async function connect(deviceId, opts) {
  return createAdb(deviceId, opts);
}

/**
 * Raccourci : cree un Runner pour un client.
 * @param {AdbClient} adb
 * @param {object} [opts]
 * @returns {Runner}
 */
function runner(adb, opts) {
  return new Runner(adb, opts);
}

/**
 * Raccourci tout-en-un : connect + run scenario.
 * @param {string} scenarioName
 * @param {object} [opts]
 */
async function runScenario(scenarioName, opts = {}) {
  const adb = await connect(opts.deviceId, opts);
  const r = runner(adb, opts);
  return r.scenario(scenarioName, opts);
}

/**
 * Liste les scenarios disponibles.
 */
function listScenarios() {
  return Object.entries(SCENARIOS).map(([id, s]) => ({ id, name: s.name, description: s.description }));
}

/**
 * Liste les actions disponibles.
 */
function listActions() {
  return ACTIONS_CATALOG;
}

module.exports = {
  // Connexion
  connect,
  createAdb,
  AdbClient,

  // Actions individuelles
  exec,
  ACTIONS_CATALOG,
  listActions,

  // Flows haut niveau
  flows,

  // Scenarios
  SCENARIOS,
  listScenarios,

  // Runner
  Runner,
  runner,

  // Raccourcis
  runScenario,
};
