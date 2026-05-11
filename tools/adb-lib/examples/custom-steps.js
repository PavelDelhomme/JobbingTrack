#!/usr/bin/env node
/**
 * Exemple : Ecrire ses propres fonctions de test avec le Runner.
 *
 *   node tools/adb-lib/examples/custom-steps.js
 *
 * C'est la maniere la plus flexible : chaque step est une function(adb) async.
 * Tu peux combiner toutes les methodes de AdbClient comme tu veux.
 */

const adbLib = require('..');
const flows = adbLib.flows;

(async () => {
  const phone = await adbLib.connect();
  const runner = adbLib.runner(phone, { stopOnError: true });

  const report = await runner.steps([
    {
      name: 'Login complet',
      fn: async (device) => {
        await flows.loginFresh(device);
        return 'Connecte';
      },
    },
    {
      name: 'Dashboard visible',
      fn: async (device) => {
        await device.assertVisible('Bonjour');
        const nodes = await device.uiNodes();
        const visibleTexts = nodes.filter(n => n.text).map(n => n.text);
        return `${visibleTexts.length} elements visibles`;
      },
    },
    {
      name: 'Navigation Candidatures',
      fn: async (device) => {
        await device.tapTab(2);
        await device.wait(2500);
        return 'Onglet Candidatures ouvert';
      },
    },
    {
      name: 'Retour + Deconnexion',
      fn: async (device) => {
        await device.tapTab(1);
        await device.wait(2000);
        await flows.logout(device);
        return 'Deconnecte';
      },
    },
  ]);

  console.log(`\nTermine : ${report.ok} OK, ${report.fail} FAIL`);
  process.exit(report.fail > 0 ? 1 : 0);
})().catch(err => { console.error('Erreur:', err.message); process.exit(1); });
