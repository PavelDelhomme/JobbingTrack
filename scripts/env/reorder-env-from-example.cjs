#!/usr/bin/env node
/**
 * Réaligne le fichier .env sur la structure (lignes + ordre des clés) de .env.example
 * en conservant les valeurs actuelles de .env pour chaque clé connue.
 * Les clés présentes uniquement dans .env sont ajoutées en fin de fichier (tri A→Z).
 *
 * Usage:
 *   node scripts/reorder-env-from-example.cjs           # dry-run (écrit sur stdout)
 *   node scripts/reorder-env-from-example.cjs --write # réécrit .env
 *
 * Ne modifie jamais .env.example.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const EXAMPLE = path.join(ROOT, '.env.example');
const ENV = path.join(ROOT, '.env');

/** @param {string} content @returns {Map<string, string>} key -> valeur (sans trim agressif) */
function parseEnvValues(content) {
  const map = new Map();
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const unexport = line.replace(/^export\s+/i, '').trim();
    const idx = unexport.indexOf('=');
    if (idx === -1) continue;
    const key = unexport.slice(0, idx).trim();
    const val = unexport.slice(idx + 1);
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) map.set(key, val);
  }
  return map;
}

/** @returns {Set<string>} */
function parseExampleKeys(content) {
  const keys = new Set();
  for (const raw of content.split(/\r?\n/)) {
    const t = raw.trim();
    if (!t || t.startsWith('#')) continue;
    const unexport = t.replace(/^export\s+/i, '').trim();
    const idx = unexport.indexOf('=');
    if (idx === -1) continue;
    const key = unexport.slice(0, idx).trim();
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) keys.add(key);
  }
  return keys;
}

function buildMergedLines(exampleContent, envValues) {
  const exampleKeys = parseExampleKeys(exampleContent);
  const lines = [];
  for (const raw of exampleContent.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      lines.push(raw);
      continue;
    }
    const unexport = raw.replace(/^export\s+/i, '').trimEnd();
    const idx = unexport.indexOf('=');
    if (idx === -1) {
      lines.push(raw);
      continue;
    }
    const key = unexport.slice(0, idx).trim();
    const templateRest = unexport.slice(idx);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      lines.push(raw);
      continue;
    }
    if (envValues.has(key)) {
      lines.push(`${key}=${envValues.get(key)}`);
    } else {
      lines.push(`${key}${templateRest}`);
    }
  }

  const extraKeys = [...envValues.keys()].filter((k) => !exampleKeys.has(k)).sort((a, b) => a.localeCompare(b));
  if (extraKeys.length) {
    lines.push('');
    lines.push('# --- Clés présentes dans .env mais absentes de .env.example (à migrer vers l’exemple si pérennes) ---');
    for (const k of extraKeys) {
      lines.push(`${k}=${envValues.get(k)}`);
    }
  }

  return lines.join('\n').replace(/\n+$/, '\n');
}

function main() {
  const write = process.argv.includes('--write');
  if (!fs.existsSync(EXAMPLE)) {
    console.error('Fichier introuvable:', EXAMPLE);
    process.exit(2);
  }
  if (!fs.existsSync(ENV)) {
    console.error('Fichier introuvable:', ENV, '— cp .env.example .env');
    process.exit(2);
  }

  const exampleContent = fs.readFileSync(EXAMPLE, 'utf8');
  const envContent = fs.readFileSync(ENV, 'utf8');
  const envValues = parseEnvValues(envContent);
  const out = buildMergedLines(exampleContent, envValues);

  if (write) {
    fs.writeFileSync(ENV, out, 'utf8');
    console.error('OK — .env réécrit selon .env.example (valeurs locales conservées). Lancez: make env-check');
  } else {
    process.stdout.write(out);
  }
}

main();
