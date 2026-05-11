#!/usr/bin/env node
/**
 * Exemple : Inspecter l'UI de l'app mobile.
 * Utile pour debugger et trouver les bons textes/hints pour tes tests.
 *
 *   node tools/adb-lib/examples/inspect-ui.js
 *   node tools/adb-lib/examples/inspect-ui.js "Se connecter"
 */

const adbLib = require('..');

const searchText = process.argv[2];

(async () => {
  const phone = await adbLib.connect();

  if (searchText) {
    console.log(`Recherche: "${searchText}"\n`);
    const el = await phone.findElement(searchText);
    if (el) {
      console.log('Trouve:', el);
    } else {
      console.log('Non trouve. Elements visibles contenant du texte:');
      const nodes = await phone.uiNodes();
      nodes.filter(n => n.text || n.contentDesc).forEach(n => {
        console.log(`  "${n.text || n.contentDesc}" [${n.className}] bounds=${n.bounds} clickable=${n.clickable}`);
      });
    }
  } else {
    console.log('Tous les elements visibles:\n');
    const nodes = await phone.uiNodes();
    const withText = nodes.filter(n => n.text || n.contentDesc);
    console.log(`${withText.length} elements avec texte sur ${nodes.length} total:\n`);
    withText.forEach(n => {
      const label = n.text || `[${n.contentDesc}]`;
      const click = n.clickable ? ' [CLICKABLE]' : '';
      console.log(`  ${label}${click}  (${n.className})  bounds=${n.bounds}`);
    });
  }
})().catch(err => { console.error('Erreur:', err.message); process.exit(1); });
