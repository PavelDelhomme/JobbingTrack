#!/usr/bin/env node

/**
 * Script de synchronisation des variables d'environnement
 * 
 * Ce script synchronise .env.example vers .env en :
 * 1. Préservant les valeurs existantes dans .env
 * 2. Ajoutant les nouvelles variables de .env.example
 * 3. Conservant les commentaires et la structure
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const ENV_EXAMPLE_FILE = path.join(ROOT_DIR, '.env.example');

// Couleurs pour la console
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
    
    // Ligne vide
    if (!line) {
      linesData.push({ type: 'empty', content: lines[i] });
      continue;
    }

    // Commentaire
    if (line.startsWith('#')) {
      comments.push({ line: i, content: lines[i] });
      linesData.push({ type: 'comment', content: lines[i] });
      continue;
    }

    // Variable d'environnement
    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      const value = match[2];
      vars[key] = value;
      linesData.push({ type: 'var', key, value, original: lines[i] });
    } else {
      // Ligne non reconnue
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

  // Préserver les valeurs existantes
  for (const [key, value] of Object.entries(existingData.vars)) {
    if (key in merged) {
      // Variable existe dans les deux, préserver la valeur existante
      merged[key] = value;
      preserved.push(key);
    } else {
      // Variable existe seulement dans .env, la garder
      merged[key] = value;
      added.push(key);
    }
  }

  // Identifier les nouvelles variables de .env.example
  for (const [key, value] of Object.entries(exampleData.vars)) {
    if (!(key in existingData.vars)) {
      // Nouvelle variable, utiliser la valeur de l'exemple (ou valeur par défaut)
      updated.push(key);
    }
  }

  return { merged, added, updated, preserved };
}

function generateEnvFile(exampleData, mergedVars) {
  const lines = [];
  let currentSection = '';

  for (const lineData of exampleData.lines) {
    if (lineData.type === 'empty') {
      lines.push(lineData.content);
    } else if (lineData.type === 'comment') {
      lines.push(lineData.content);
      // Détecter les sections
      const sectionMatch = lineData.content.match(/#\s*([A-Z\s]+)/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
      }
    } else if (lineData.type === 'var') {
      const key = lineData.key;
      const value = mergedVars[key] !== undefined ? mergedVars[key] : lineData.value;
      
      // Formater la ligne avec la valeur fusionnée
      const formattedValue = value || '';
      lines.push(`${key}=${formattedValue}`);
    } else {
      // Ligne inconnue, la préserver
      lines.push(lineData.content);
    }
  }

  return lines.join('\n');
}

function main() {
  log('\n🔄 Synchronisation des variables d\'environnement\n', 'cyan');

  // Vérifier que .env.example existe
  if (!fs.existsSync(ENV_EXAMPLE_FILE)) {
    log('❌ Erreur: .env.example n\'existe pas!', 'red');
    process.exit(1);
  }

  // Parser les fichiers
  log('📖 Lecture de .env.example...', 'blue');
  const exampleData = parseEnvFile(ENV_EXAMPLE_FILE);
  log(`   ✅ ${Object.keys(exampleData.vars).length} variables trouvées dans .env.example`, 'green');

  log('📖 Lecture de .env...', 'blue');
  const existingData = parseEnvFile(ENV_FILE);
  const existingCount = Object.keys(existingData.vars).length;
  if (existingCount > 0) {
    log(`   ✅ ${existingCount} variables trouvées dans .env`, 'green');
  } else {
    log('   ⚠️  .env n\'existe pas ou est vide, création d\'un nouveau fichier', 'yellow');
  }

  // Fusionner
  log('\n🔀 Fusion des fichiers...', 'blue');
  const { merged, added, updated, preserved } = mergeEnvFiles(exampleData, existingData);

  // Générer le nouveau contenu
  const newContent = generateEnvFile(exampleData, merged);

  // Sauvegarder
  const backupPath = `${ENV_FILE}.backup.${Date.now()}`;
  if (fs.existsSync(ENV_FILE)) {
    fs.copyFileSync(ENV_FILE, backupPath);
    log(`   💾 Backup créé: ${path.basename(backupPath)}`, 'yellow');
  }

  fs.writeFileSync(ENV_FILE, newContent, 'utf-8');
  log(`   ✅ .env mis à jour`, 'green');

  // Résumé
  log('\n📊 Résumé de la synchronisation:\n', 'cyan');
  log(`   ✅ Variables préservées: ${preserved.length}`, 'green');
  if (added.length > 0) {
    log(`   ➕ Variables ajoutées depuis .env: ${added.length}`, 'yellow');
    added.forEach(key => log(`      - ${key}`, 'yellow'));
  }
  if (updated.length > 0) {
    log(`   🆕 Nouvelles variables depuis .env.example: ${updated.length}`, 'blue');
    updated.forEach(key => {
      const defaultValue = exampleData.vars[key];
      log(`      - ${key}${defaultValue ? `=${defaultValue}` : ''}`, 'blue');
    });
  }

  const totalVars = Object.keys(merged).length;
  log(`\n   📈 Total: ${totalVars} variables dans .env`, 'cyan');
  log(`   📋 Référence: ${Object.keys(exampleData.vars).length} variables dans .env.example\n`, 'cyan');

  // Vérifier les différences
  const missingInEnv = Object.keys(exampleData.vars).filter(
    key => !(key in merged)
  );
  if (missingInEnv.length > 0) {
    log('   ⚠️  Variables manquantes (devraient être présentes):', 'yellow');
    missingInEnv.forEach(key => log(`      - ${key}`, 'yellow'));
  }

  log('✅ Synchronisation terminée!\n', 'green');
}

if (require.main === module) {
  main();
}

module.exports = { parseEnvFile, mergeEnvFiles, generateEnvFile };

