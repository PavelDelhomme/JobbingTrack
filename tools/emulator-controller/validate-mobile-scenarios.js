#!/usr/bin/env node
/**
 * Valide que tous les parcours mobiles (adb-scenarios.ts) n'utilisent que des step IDs
 * implémentés dans adb-steps.ts. À lancer depuis la racine du repo :
 *   node tools/emulator-controller/validate-mobile-scenarios.js
 * ou : make verify-mobile-scenarios (si cible ajoutée)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCENARIOS_PATH = path.join(ROOT, 'frontend/src/lib/adb/adb-scenarios.ts');
const STEPS_PATH = path.join(ROOT, 'frontend/src/lib/adb/adb-steps.ts');

function extractImplementedSteps(content) {
  const steps = new Set();
  const re = /case\s+['"]([a-z0-9_]+)['"]\s*[:{]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    steps.add(m[1]);
  }
  for (let i = 1; i <= 5; i++) steps.add(`nav_tab_${i}`);
  return steps;
}

function extractScenarioSteps(content) {
  const scenarios = {};
  const lines = content.split('\n');
  let currentKey = null;
  let inSteps = false;
  let stepsBuf = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const keyMatch = line.match(/^\s*(\w+):\s*\{\s*$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      inSteps = false;
      stepsBuf = '';
    }
    if (currentKey && line.includes('steps:')) {
      inSteps = true;
      stepsBuf = line.replace(/.*steps:\s*\[/, '');
    } else if (inSteps) {
      stepsBuf += '\n' + line;
    }
    if (inSteps && stepsBuf.includes(']')) {
      const stepRe = /['"]([a-z0-9_]+)['"]/g;
      const steps = [];
      let m;
      while ((m = stepRe.exec(stepsBuf)) !== null) steps.push(m[1]);
      scenarios[currentKey] = steps;
      inSteps = false;
      currentKey = null;
    }
  }
  return scenarios;
}

function main() {
  console.log('Validation des parcours mobiles (scenarios vs steps implementes)\n');

  if (!fs.existsSync(SCENARIOS_PATH)) {
    console.error('Fichier introuvable:', SCENARIOS_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(STEPS_PATH)) {
    console.error('Fichier introuvable:', STEPS_PATH);
    process.exit(1);
  }

  const scenariosContent = fs.readFileSync(SCENARIOS_PATH, 'utf8');
  const stepsContent = fs.readFileSync(STEPS_PATH, 'utf8');

  const implemented = extractImplementedSteps(stepsContent);
  const scenarios = extractScenarioSteps(scenariosContent);

  let failed = 0;
  const primary = [
    'mobile_registration',
    'mobile_password_reset',
    'mobile_first_use',
    'mobile_daily_use',
    'mobile_complete_with_data',
    'mobile_crud_create',
    'mobile_crud_archive_corbeille',
    'mobile_complete',
  ];

  for (const [name, steps] of Object.entries(scenarios)) {
    const missing = steps.filter((s) => !implemented.has(s));
    if (missing.length > 0) {
      console.error('KO', name, 'etapes manquantes:', missing.join(', '));
      failed++;
    } else {
      const label = primary.includes(name) ? ' (principal)' : '';
      console.log('OK', name, steps.length, 'etapes' + label);
    }
  }

  console.log('\n' + Object.keys(scenarios).length + ' scenarios, ' + implemented.size + ' steps implementes');
  if (failed > 0) {
    console.error('\n' + failed + ' scenario(s) avec etapes manquantes.');
    process.exit(1);
  }
  console.log('\nTous les parcours sont coherents avec adb-steps.');
}

main();
