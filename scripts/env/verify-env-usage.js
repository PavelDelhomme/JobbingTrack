#!/usr/bin/env node

/**
 * Verifie que les variables definies dans .env.example sont referencees dans le projet.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..', '..');
const ENV_EXAMPLE_FILE = path.join(ROOT_DIR, '.env.example');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const vars = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
    if (match) {
      vars[match[1]] = true;
    }
  }

  return vars;
}

function searchVariableInFiles(varName, directories) {
  const results = [];
  const searchPatterns = [
    `\\$\\{${varName}\\}`,
    `\\$\\{${varName}:-`,
    `process\\.env\\.${varName}`,
    `process\\.env\\['${varName}'\\]`,
    `process\\.env\\["${varName}"\\]`,
    `env\\.${varName}`,
    `ENV\\[${varName}\\]`,
    `${varName}:`,
    `- ${varName}=`,
  ];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue;

    try {
      const output = execFileSync(
        'rg',
        ['--files-with-matches', '--no-messages', '-e', searchPatterns.join('|'), dir],
        { encoding: 'utf-8', cwd: ROOT_DIR },
      );

      if (output.trim()) {
        const files = output.trim().split('\n').filter(Boolean);
        results.push(...files);
      }
    } catch (error) {
      // rg exits 1 when no file matches.
    }
  }

  return [...new Set(results)];
}

function main() {
  log("\nVerification de l'utilisation des variables d'environnement\n", 'cyan');

  log('Lecture de .env.example...', 'blue');
  const envVars = parseEnvFile(ENV_EXAMPLE_FILE);
  const varNames = Object.keys(envVars);
  log(`   ${varNames.length} variables trouvees\n`, 'green');

  const searchDirs = [
    path.join(ROOT_DIR, 'backend'),
    path.join(ROOT_DIR, 'frontend'),
    path.join(ROOT_DIR, 'docker-compose.yml'),
    path.join(ROOT_DIR, 'docker-compose.prod.yml'),
    path.join(ROOT_DIR, 'scripts'),
    path.join(ROOT_DIR, 'tests'),
  ].filter((dir) => fs.existsSync(dir));

  log(`Recherche dans ${searchDirs.length} chemins...\n`, 'blue');

  const results = {
    used: [],
    unused: [],
  };

  for (const varName of varNames) {
    log(`   Verification de ${varName}...`, 'blue');
    const files = searchVariableInFiles(varName, searchDirs);

    if (files.length > 0) {
      results.used.push({ name: varName, files: files.length, locations: files.slice(0, 5) });
      log(`      Utilisee dans ${files.length} fichier(s)`, 'green');
    } else {
      results.unused.push(varName);
      log('      Non trouvee dans le code', 'yellow');
    }
  }

  log('\nResume de la verification:\n', 'cyan');
  log(`   Variables utilisees: ${results.used.length}`, 'green');
  if (results.unused.length > 0) {
    log(`   Variables non utilisees: ${results.unused.length}`, 'yellow');
    log('\n   Variables non utilisees:', 'yellow');
    results.unused.forEach((variableName) => log(`      - ${variableName}`, 'yellow'));
  }

  if (results.used.length > 0) {
    log('\n   Variables utilisees (top 10):', 'green');
    results.used
      .sort((a, b) => b.files - a.files)
      .slice(0, 10)
      .forEach(({ name, files }) => {
        log(`      - ${name}: ${files} fichier(s)`, 'green');
      });
  }

  const criticalVars = [
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'NEXT_PUBLIC_API_URL',
  ];

  log('\n   Variables critiques:', 'magenta');
  criticalVars.forEach((varName) => {
    const found = results.used.find((result) => result.name === varName);
    if (found) {
      log(`      ${varName} - Utilisee`, 'green');
    } else if (envVars[varName]) {
      log(`      ${varName} - Definie mais non trouvee dans le code`, 'yellow');
    }
  });

  log('\nVerification terminee!\n', 'green');

  if (results.unused.length > 0) {
    log(`Attention: ${results.unused.length} variable(s) non utilisee(s)`, 'yellow');
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseEnvFile, searchVariableInFiles };
