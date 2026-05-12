#!/usr/bin/env node
/**
 * Modifie une clé .env sans afficher les autres valeurs.
 * Usage:
 *   node scripts/env-set-key.cjs WAF_ENABLED true
 *   printf '%s' "$SECRET" | node scripts/env-set-key.cjs JWT_SECRET --stdin
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(ROOT, '.env');
const SECRET_NAME_PATTERN = /(PASSWORD|PASS|SECRET|TOKEN|KEY|API_KEY)/i;

function main() {
  const [key, value] = process.argv.slice(2);
  if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    console.error('Clé invalide.');
    process.exit(2);
  }
  const readFromStdin = value === '--stdin';
  if (value == null) {
    console.error('Valeur manquante.');
    process.exit(2);
  }
  if (SECRET_NAME_PATTERN.test(key) && !readFromStdin) {
    console.error(`${key} semble sensible : utilisez --stdin pour éviter l'exposition dans l'historique shell.`);
    process.exit(2);
  }
  if (!fs.existsSync(ENV_PATH)) {
    console.error('.env introuvable.');
    process.exit(2);
  }

  const nextValue = readFromStdin ? fs.readFileSync(0, 'utf8').replace(/\r?\n$/, '') : value;
  if (nextValue === '') {
    console.error('Valeur vide refusée.');
    process.exit(2);
  }

  const lines = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
  let updated = false;
  const next = lines.map((raw) => {
    const trimmed = raw.trim();
    const line = trimmed.replace(/^export\s+/i, '');
    if (!trimmed || trimmed.startsWith('#') || !line.startsWith(`${key}=`)) return raw;
    updated = true;
    return `${key}=${nextValue}`;
  });
  if (!updated) next.push(`${key}=${nextValue}`);
  fs.writeFileSync(ENV_PATH, next.join('\n').replace(/\n*$/, '\n'), 'utf8');
  console.log(`${key} mis à jour dans .env`);
}

main();
