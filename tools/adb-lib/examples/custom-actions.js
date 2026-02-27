#!/usr/bin/env node
/**
 * Exemple : Enchainer des actions parametrees avec le Runner.
 *
 *   node tools/adb-lib/examples/custom-actions.js
 */

const adb = require('..');

(async () => {
  const phone = await adb.connect();
  const runner = adb.runner(phone);

  const report = await runner.actions([
    { id: 'mob_ensure_logged_out', label: 'Deconnexion' },
    { id: 'mob_login', params: { email: 'admin@jobbingtrack.test', password: 'password123' }, label: 'Login admin' },
    { id: 'mob_assert_text', params: { text: 'Bonjour' }, label: 'Verifier dashboard' },
    { id: 'mob_tap_tab', params: { tab: 2 }, label: 'Aller Candidatures' },
    { id: 'mob_wait', params: { ms: 2000 }, label: 'Pause 2s' },
    { id: 'mob_tap_tab', params: { tab: 1 }, label: 'Retour Accueil' },
    { id: 'mob_scroll_down', params: { amount: 800 }, label: 'Scroll bas' },
    { id: 'mob_scroll_up', params: { amount: 800 }, label: 'Scroll haut' },
    { id: 'mob_open_drawer', label: 'Ouvrir drawer' },
    { id: 'mob_back', label: 'Fermer drawer' },
    { id: 'mob_logout', label: 'Deconnexion' },
  ]);

  console.log(`\nTermine : ${report.ok} OK, ${report.fail} FAIL`);
  process.exit(report.fail > 0 ? 1 : 0);
})().catch(err => { console.error('Erreur:', err.message); process.exit(1); });
