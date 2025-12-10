#!/usr/bin/env node

/**
 * Script de vérification de l'utilisation des variables d'environnement
 * 
 * Ce script vérifie que toutes les variables définies dans .env.example
 * sont bien utilisées quelque part dans le projet.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const ENV_EXAMPLE_FILE = path.join(ROOT_DIR, '.env.example');

// Couleurs pour la console
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
    `\\$\{${varName}\}`,           // ${VAR_NAME}
    `\\$\{${varName}:-`,          // ${VAR_NAME:-default}
    `process\\.env\\.${varName}`, // process.env.VAR_NAME
    `process\\.env\\['${varName}'\\]`, // process.env['VAR_NAME']
    `process\\.env\\["${varName}"\\]`, // process.env["VAR_NAME"]
    `env\\.${varName}`,            // env.VAR_NAME
    `ENV\\[${varName}\\]`,         // ENV[VAR_NAME]
    `${varName}:`,                 // VAR_NAME: (dans docker-compose)
    `- ${varName}=`,               // - VAR_NAME= (dans docker-compose)
  ];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue;

    try {
      // Utiliser grep pour chercher rapidement
      const pattern = searchPatterns.join('|');
      const command = `grep -r -l -E "${pattern}" "${dir}" 2>/dev/null || true`;
      const output = execSync(command, { encoding: 'utf-8', cwd: ROOT_DIR });
      
      if (output.trim()) {
        const files = output.trim().split('\n').filter(f => f);
        results.push(...files);
      }
    } catch (error) {
      // Ignorer les erreurs
    }
  }

  return [...new Set(results)]; // Dédupliquer
}

function main() {
  log('\n🔍 Vérification de l\'utilisation des variables d\'environnement\n', 'cyan');

  // Parser .env.example
  log('📖 Lecture de .env.example...', 'blue');
  const envVars = parseEnvFile(ENV_EXAMPLE_FILE);
  const varNames = Object.keys(envVars);
  log(`   ✅ ${varNames.length} variables trouvées\n`, 'green');

  // Directories à chercher
  const searchDirs = [
    path.join(ROOT_DIR, 'backend'),
    path.join(ROOT_DIR, 'frontend'),
    path.join(ROOT_DIR, 'docker-compose.yml'),
    path.join(ROOT_DIR, 'docker-compose.prod.yml'),
    path.join(ROOT_DIR, 'scripts'),
    path.join(ROOT_DIR, 'tests'),
  ].filter(dir => fs.existsSync(dir));

  log(`📂 Recherche dans ${searchDirs.length} répertoires...\n`, 'blue');

  const results = {
    used: [],
    unused: [],
    partial: [], // Variables partiellement utilisées
  };

  // Vérifier chaque variable
  for (const varName of varNames) {
    log(`   🔎 Vérification de ${varName}...`, 'blue');
    const files = searchVariableInFiles(varName, searchDirs);
    
    if (files.length > 0) {
      results.used.push({ name: varName, files: files.length, locations: files.slice(0, 5) });
      log(`      ✅ Utilisée dans ${files.length} fichier(s)`, 'green');
    } else {
      results.unused.push(varName);
      log(`      ⚠️  Non trouvée dans le code`, 'yellow');
    }
  }

  // Résumé
  log('\n📊 Résumé de la vérification:\n', 'cyan');
  log(`   ✅ Variables utilisées: ${results.used.length}`, 'green');
  if (results.unused.length > 0) {
    log(`   ⚠️  Variables non utilisées: ${results.unused.length}`, 'yellow');
    log('\n   Variables non utilisées:', 'yellow');
    results.unused.forEach(v => log(`      - ${v}`, 'yellow'));
  }

  // Détails des variables utilisées
  if (results.used.length > 0) {
    log('\n   Variables utilisées (top 10):', 'green');
    results.used
      .sort((a, b) => b.files - a.files)
      .slice(0, 10)
      .forEach(({ name, files }) => {
        log(`      - ${name}: ${files} fichier(s)`, 'green');
      });
  }

  // Vérifier les variables critiques
  const criticalVars = [
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'NEXT_PUBLIC_API_URL',
  ];

  log('\n   🔐 Variables critiques:', 'magenta');
  criticalVars.forEach(varName => {
    const found = results.used.find(r => r.name === varName);
    if (found) {
      log(`      ✅ ${varName} - Utilisée`, 'green');
    } else if (envVars[varName]) {
      log(`      ⚠️  ${varName} - Définie mais non trouvée dans le code`, 'yellow');
    }
  });

  log('\n✅ Vérification terminée!\n', 'green');

  // Code de sortie
  if (results.unused.length > 0) {
    log(`⚠️  Attention: ${results.unused.length} variable(s) non utilisée(s)`, 'yellow');
    process.exit(0); // Ne pas échouer, juste avertir
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseEnvFile, searchVariableInFiles };

