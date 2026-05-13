#!/usr/bin/env node

/**
 * Script de test automatisé Node.js pour JobbingTrack
 * Alternative au script bash pour Windows
 */

const { execSync } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Couleurs ANSI
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function checkService(url, name) {
  try {
    await axios.get(url, { timeout: 5000 });
    log(`✅ ${name} est accessible`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${name} n'est pas accessible sur ${url}`, 'red');
    return false;
  }
}

async function main() {
  log('='.repeat(50), 'blue');
  log('   TESTS AUTOMATISÉS JOBBING TRACK', 'blue');
  log('='.repeat(50), 'blue');
  console.log();

  // Vérifier les services
  log('🔍 Vérification des services...', 'yellow');
  
  const frontendRunning = await checkService('http://localhost:3000', 'Frontend');
  const apiRunning = await checkService('http://localhost:3000/api/v1/auth/health', 'API Gateway');

  if (!frontendRunning) {
    log('⚠️  Frontend non accessible. Assurez-vous qu\'il est démarré avec: npm run dev', 'yellow');
  }

  if (!apiRunning) {
    log('⚠️  Backend non accessible. Assurez-vous qu\'il est démarré avec: make up-full', 'yellow');
  }

  if (!frontendRunning || !apiRunning) {
    log('\n❌ Certains services ne sont pas accessibles. Arrêt des tests.', 'red');
    process.exit(1);
  }

  console.log();
  log('='.repeat(50), 'blue');
  log('   EXÉCUTION DES TESTS E2E', 'blue');
  log('='.repeat(50), 'blue');
  console.log();

  // Créer le répertoire de rapports
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const tests = [
    {
      name: 'Connexion de base',
      file: 'e2e/specs/login.spec.ts',
      cwd: path.join(__dirname, '..', 'tests'),
    },
    {
      name: 'Backoffice administrateur',
      file: 'e2e/specs/admin-backoffice.spec.ts',
      cwd: path.join(__dirname, '..', 'tests'),
    },
    {
      name: 'Parcours utilisateur complet',
      file: 'tests/e2e/complete-user-journey.spec.ts',
      cwd: path.join(__dirname, '..', 'frontend'),
    },
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    log(`\nTest ${i + 1}/${tests.length}: ${test.name}`, 'blue');
    
    const result = execCommand(`npx playwright test ${test.file} --reporter=line`, {
      cwd: test.cwd || __dirname,
    });
    
    if (result.success) {
      passedTests++;
      log(`✅ ${test.name} - PASSÉ`, 'green');
    } else {
      failedTests++;
      log(`❌ ${test.name} - ÉCHOUÉ`, 'red');
    }
  }

  // Résumé
  console.log();
  log('='.repeat(50), 'blue');
  log('   RÉSUMÉ DES TESTS', 'blue');
  log('='.repeat(50), 'blue');
  console.log();

  log(`Total: ${tests.length} tests`, 'blue');
  log(`Réussis: ${passedTests}`, 'green');
  log(`Échoués: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  console.log();

  // Générer le rapport HTML
  log('📊 Génération du rapport HTML...', 'green');
  execCommand('npx playwright show-report', { silent: true });

  log('\n='.repeat(50), 'blue');
  log('   TESTS COMPLETS TERMINÉS', 'blue');
  log('='.repeat(50), 'blue');
  console.log();

  // Code de sortie
  process.exit(failedTests > 0 ? 1 : 0);
}

// Exécuter le script
main().catch((error) => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});

