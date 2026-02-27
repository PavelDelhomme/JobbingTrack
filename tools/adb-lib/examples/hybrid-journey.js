#!/usr/bin/env node
/**
 * Exemple : Parcours hybride API + Mobile (ADB).
 *
 * Combine des appels API backend (register, login) avec des interactions
 * physiques sur le telephone (verifier l'UI, naviguer, taper).
 *
 *   node tools/adb-lib/examples/hybrid-journey.js
 */

const { executeJourney } = require('../../tests/user-journey/journey-builder');

(async () => {
  const results = await executeJourney([
    // API: creer un compte et se connecter
    { step: 'register' },
    { step: 'email_validation' },
    { step: 'login' },

    // Mobile: verifier que l'app affiche le dashboard
    { step: 'mob_ensure_logged_out' },
    { step: 'mob_login', options: { email: 'admin@jobbingtrack.com', password: 'password123' } },
    { step: 'mob_assert_text', options: { text: 'Bonjour' } },

    // Mobile: naviguer dans tous les onglets
    { step: 'mob_tap_tab', options: { tab: 2 } },
    { step: 'mob_tap_tab', options: { tab: 3 } },
    { step: 'mob_tap_tab', options: { tab: 1 } },

    // Mobile: ouvrir le drawer et visiter Relances
    { step: 'mob_open_drawer' },
    { step: 'mob_drawer_item', options: { text: 'Relances' } },
    { step: 'mob_back' },

    // Mobile: deconnexion
    { step: 'mob_logout' },
  ]);

  console.log(`\nParcours hybride: ${results.successCount} OK, ${results.errorCount} FAIL`);
  process.exit(results.errorCount > 0 ? 1 : 0);
})().catch(err => { console.error('Erreur:', err.message); process.exit(1); });
