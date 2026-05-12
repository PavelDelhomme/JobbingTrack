#!/usr/bin/env node

/**
 * Script de synchronisation des variables d'environnement.
 *
 * Synchronise .env.example vers .env en preservant les valeurs existantes.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const ENV_EXAMPLE_FILE = path.join(ROOT_DIR, '.env.example');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { vars: {}, comments: [], lines: [] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const vars = {};
  const comments = [];
  const linesData = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      linesData.push({ type: 'empty', content: lines[i] });
      continue;
    }

    if (line.startsWith('#')) {
      comments.push({ line: i, content: lines[i] });
      linesData.push({ type: 'comment', content: lines[i] });
      continue;
    }

    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      const value = match[2];
      vars[key] = value;
      linesData.push({ type: 'var', key, value, original: lines[i] });
    } else {
      linesData.push({ type: 'unknown', content: lines[i] });
    }
  }

  return { vars, comments, lines: linesData };
}

function mergeEnvFiles(exampleData, existingData) {
  const merged = { ...exampleData.vars };
  const added = [];
  const updated = [];
  const preserved = [];

  for (const [key, value] of Object.entries(existingData.vars)) {
    if (key in merged) {
      merged[key] = value;
      preserved.push(key);
    } else {
      merged[key] = value;
      added.push(key);
    }
  }

  for (const [key] of Object.entries(exampleData.vars)) {
    if (!(key in existingData.vars)) {
      updated.push(key);
    }
  }

  return { merged, added, updated, preserved };
}

function generateEnvFile(exampleData, mergedVars) {
  const lines = [];

  for (const lineData of exampleData.lines) {
    if (lineData.type === 'empty') {
      lines.push(lineData.content);
    } else if (lineData.type === 'comment') {
      lines.push(lineData.content);
    } else if (lineData.type === 'var') {
      const key = lineData.key;
      const value = mergedVars[key] !== undefined ? mergedVars[key] : lineData.value;
      lines.push(`${key}=${value || ''}`);
    } else {
      lines.push(lineData.content);
    }
  }

  return lines.join('\n');
}

function main() {
  log("\nSynchronisation des variables d'environnement\n", 'cyan');

  if (!fs.existsSync(ENV_EXAMPLE_FILE)) {
    log("Erreur: .env.example n'existe pas!", 'red');
    process.exit(1);
  }

  log('Lecture de .env.example...', 'blue');
  const exampleData = parseEnvFile(ENV_EXAMPLE_FILE);
  log(`   ${Object.keys(exampleData.vars).length} variables trouvees dans .env.example`, 'green');

  log('Lecture de .env...', 'blue');
  const existingData = parseEnvFile(ENV_FILE);
  const existingCount = Object.keys(existingData.vars).length;
  if (existingCount > 0) {
    log(`   ${existingCount} variables trouvees dans .env`, 'green');
  } else {
    log("   .env n'existe pas ou est vide, creation d'un nouveau fichier", 'yellow');
  }

  log('\nFusion des fichiers...', 'blue');
  const { merged, added, updated, preserved } = mergeEnvFiles(exampleData, existingData);
  const newContent = generateEnvFile(exampleData, merged);

  const backupPath = `${ENV_FILE}.backup.${Date.now()}`;
  if (fs.existsSync(ENV_FILE)) {
    fs.copyFileSync(ENV_FILE, backupPath);
    log(`   Backup cree: ${path.basename(backupPath)}`, 'yellow');
  }

  fs.writeFileSync(ENV_FILE, newContent, 'utf-8');
  log('   .env mis a jour', 'green');

  log('\nResume de la synchronisation:\n', 'cyan');
  log(`   Variables preservees: ${preserved.length}`, 'green');
  if (added.length > 0) {
    log(`   Variables ajoutees depuis .env: ${added.length}`, 'yellow');
    added.forEach((key) => log(`      - ${key}`, 'yellow'));
  }
  if (updated.length > 0) {
    log(`   Nouvelles variables depuis .env.example: ${updated.length}`, 'blue');
    updated.forEach((key) => {
      const defaultValue = exampleData.vars[key];
      log(`      - ${key}${defaultValue ? `=${defaultValue}` : ''}`, 'blue');
    });
  }

  const totalVars = Object.keys(merged).length;
  log(`\n   Total: ${totalVars} variables dans .env`, 'cyan');
  log(`   Reference: ${Object.keys(exampleData.vars).length} variables dans .env.example\n`, 'cyan');

  const missingInEnv = Object.keys(exampleData.vars).filter((key) => !(key in merged));
  if (missingInEnv.length > 0) {
    log('   Variables manquantes (devraient etre presentes):', 'yellow');
    missingInEnv.forEach((key) => log(`      - ${key}`, 'yellow'));
  }

  log('Synchronisation terminee!\n', 'green');
}

if (require.main === module) {
  main();
}

module.exports = { parseEnvFile, mergeEnvFiles, generateEnvFile };
