#!/usr/bin/env node
/**
 * Compare les clés de .env avec .env.example (racine du dépôt).
 * Usage:
 *   node scripts/env-align-with-example.cjs
 *   node scripts/env-align-with-example.cjs --write-append-snippet /chemin/.env.append-from-example.txt
 *   node scripts/env-align-with-example.cjs --strict   # exit 1 si des clés manquent dans .env
 *
 * Ne modifie jamais .env automatiquement.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXAMPLE = path.join(ROOT, '.env.example');
const ENV = path.join(ROOT, '.env');

/** @param {string} content */
function parseEnvLines(content) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const unexport = line.replace(/^export\s+/i, '');
    const m = unexport.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (m) {
      const key = m[1];
      if (!map.has(key)) map.set(key, raw.trimEnd());
    }
  }
  return map;
}

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const writeIdx = args.indexOf('--write-append-snippet');
  const outPath = writeIdx >= 0 ? args[writeIdx + 1] : null;

  if (!fs.existsSync(EXAMPLE)) {
    console.error('Fichier introuvable:', EXAMPLE);
    process.exit(2);
  }
  if (!fs.existsSync(ENV)) {
    console.error('Fichier introuvable:', ENV, '— créez-le : cp .env.example .env');
    process.exit(2);
  }

  const exampleMap = parseEnvLines(fs.readFileSync(EXAMPLE, 'utf8'));
  const envMap = parseEnvLines(fs.readFileSync(ENV, 'utf8'));

  const exampleKeys = new Set(exampleMap.keys());
  const envKeys = new Set(envMap.keys());

  const missingInEnv = [...exampleKeys].filter((k) => !envKeys.has(k)).sort();
  const onlyInEnv = [...envKeys].filter((k) => !exampleKeys.has(k)).sort();

  console.log('══════════════════════════════════════════════════════════');
  console.log('  Alignement .env  ↔  .env.example');
  console.log('══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  .env.example : ${exampleKeys.size} variables`);
  console.log(`  .env          : ${envKeys.size} variables`);
  console.log('');

  if (missingInEnv.length) {
    console.log(`  ⚠️  Manquantes dans .env (${missingInEnv.length}) — présentes dans .env.example :`);
    for (const k of missingInEnv) {
      console.log(`      - ${k}`);
    }
    console.log('');
  } else {
    console.log('  ✅ Toutes les clés de .env.example sont définies dans .env.');
    console.log('');
  }

  if (onlyInEnv.length) {
    console.log(`  ℹ️  Uniquement dans .env (${onlyInEnv.length}) — absentes de .env.example (local / legacy) :`);
    for (const k of onlyInEnv) {
      console.log(`      - ${k}`);
    }
    console.log('');
  }

  if (outPath && missingInEnv.length) {
    const header =
      '# ---------------------------------------------------------------------------\n' +
      '# Fragment généré par : node scripts/env-align-with-example.cjs --write-append-snippet …\n' +
      `# Date : ${new Date().toISOString()}\n` +
      '# À fusionner manuellement dans .env (revoir les valeurs sensibles).\n' +
      '# ---------------------------------------------------------------------------\n\n';
    const body = missingInEnv.map((k) => exampleMap.get(k) || `${k}=`).join('\n') + '\n';
    fs.writeFileSync(outPath, header + body, 'utf8');
    console.log(`  📄 Fragment écrit : ${outPath}`);
    console.log('');
  } else if (outPath && !missingInEnv.length) {
    console.log('  Aucun fragment à écrire (rien ne manque dans .env).');
    console.log('');
  }

  console.log('  Commandes :');
  console.log('    make env-check');
  console.log('    make env-append-missing   # crée .env.append-from-example.txt');
  console.log('');

  if (strict && missingInEnv.length) {
    process.exit(1);
  }
}

main();
