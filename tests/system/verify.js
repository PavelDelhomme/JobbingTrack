#!/usr/bin/env node

/**
 * Script de vérification de la configuration des tests
 * Vérifie que tout est correctement configuré
 */

const fs = require('fs');
const path = require('path');

class TestVerifier {
  constructor() {
    this.testsDir = __dirname;
    this.checks = [];
  }

  log(message, type = 'info') {
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  checkFile(filePath, description) {
    const fullPath = path.join(this.testsDir, filePath);
    const exists = fs.existsSync(fullPath);

    this.checks.push({
      name: description,
      path: filePath,
      exists,
      status: exists ? 'success' : 'error'
    });

    if (exists) {
      this.log(`${description}: ${filePath}`, 'success');
    } else {
      this.log(`${description}: ${filePath} MANQUANT`, 'error');
    }

    return exists;
  }

  checkDirectory(dirPath, description) {
    const fullPath = path.join(this.testsDir, dirPath);
    const exists = fs.existsSync(fullPath);

    this.checks.push({
      name: description,
      path: dirPath,
      exists,
      status: exists ? 'success' : 'error'
    });

    if (exists) {
      this.log(`${description}: ${dirPath}`, 'success');
    } else {
      this.log(`${description}: ${dirPath} MANQUANT`, 'error');
    }

    return exists;
  }

  checkPackageJson() {
    this.log('📦 Vérification package.json...');

    const packagePath = path.join(this.testsDir, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      const requiredScripts = [
        'test',
        'test:all',
        'test:unit',
        'test:integration',
        'test:database',
        'test:api',
        'test:e2e'
      ];

      requiredScripts.forEach(script => {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.log(`Script ${script}: OK`, 'success');
          this.checks.push({ name: `Script ${script}`, status: 'success' });
        } else {
          this.log(`Script ${script}: MANQUANT`, 'error');
          this.checks.push({ name: `Script ${script}`, status: 'error' });
        }
      });
    } else {
      this.log('package.json: MANQUANT', 'error');
      this.checks.push({ name: 'package.json', status: 'error' });
    }
  }

  checkPlaywrightConfig() {
    this.log('🎭 Vérification configuration Playwright...');

    const configPath = path.join(this.testsDir, 'playwright.config.ts');
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf8');

      if (config.includes('localhost:8080') && config.includes('projects')) {
        this.log('Configuration Playwright: OK', 'success');
        this.checks.push({ name: 'Playwright config', status: 'success' });
      } else {
        this.log('Configuration Playwright: INVALIDE', 'error');
        this.checks.push({ name: 'Playwright config', status: 'error' });
      }
    } else {
      this.log('Configuration Playwright: MANQUANTE', 'error');
      this.checks.push({ name: 'Playwright config', status: 'error' });
    }
  }

  checkJestConfig() {
    this.log('🃏 Vérification configuration Jest...');

    const configPath = path.join(this.testsDir, 'jest.config.js');
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf8');

      if (config.includes('testEnvironment') && config.includes('testMatch')) {
        this.log('Configuration Jest: OK', 'success');
        this.checks.push({ name: 'Jest config', status: 'success' });
      } else {
        this.log('Configuration Jest: INVALIDE', 'error');
        this.checks.push({ name: 'Jest config', status: 'error' });
      }
    } else {
      this.log('Configuration Jest: MANQUANTE', 'error');
      this.checks.push({ name: 'Jest config', status: 'error' });
    }
  }

  checkDependencies() {
    this.log('📚 Vérification des dépendances...');

    const packagePath = path.join(this.testsDir, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      const requiredDeps = [
        'jest',
        'supertest',
        'axios',
        'playwright',
        '@playwright/test',
        'pg'
      ];

      const missingDeps = [];
      requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          this.log(`Dépendance ${dep}: OK`, 'success');
          this.checks.push({ name: `Dep ${dep}`, status: 'success' });
        } else if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
          this.log(`Dépendance ${dep}: OK (dev)`, 'success');
          this.checks.push({ name: `Dep ${dep}`, status: 'success' });
        } else {
          this.log(`Dépendance ${dep}: MANQUANTE`, 'error');
          this.checks.push({ name: `Dep ${dep}`, status: 'error' });
          missingDeps.push(dep);
        }
      });

      if (missingDeps.length > 0) {
        this.log(`\n⚠️ Dépendances manquantes: ${missingDeps.join(', ')}`);
        this.log('Exécutez: npm install');
      }
    }
  }

  runVerification() {
    this.log('🔍 Vérification de la configuration des tests...\n');

    // Structure de base
    this.checkDirectory('unit', 'Dossier tests unitaires');
    this.checkDirectory('integration', 'Dossier tests intégration');
    this.checkDirectory('database', 'Dossier tests base de données');
    this.checkDirectory('api', 'Dossier tests API');
    this.checkDirectory('backend', 'Dossier tests backend');
    this.checkDirectory('frontend', 'Dossier tests frontend');
    this.checkDirectory('mobile', 'Dossier tests mobile');
    this.checkDirectory('e2e', 'Dossier tests E2E');
    this.checkDirectory('performance', 'Dossier tests performance');
    this.checkDirectory('security', 'Dossier tests sécurité');
    this.checkDirectory('reports', 'Dossier rapports');
    this.checkDirectory('fixtures', 'Dossier fixtures');

    // Fichiers de configuration
    this.checkFile('package.json', 'package.json');
    this.checkFile('jest.config.js', 'Configuration Jest');
    this.checkFile('jest.setup.js', 'Setup Jest');
    this.checkFile('playwright.config.ts', 'Configuration Playwright');
    this.checkFile('run-tests.js', 'Script principal');
    this.checkFile('setup.js', 'Script setup');
    this.checkFile('README.md', 'Documentation');

    // Tests principaux
    this.checkFile('unit/test-utils.js', 'Tests unitaires utilitaires');
    this.checkFile('database/test-database.js', 'Tests base de données');
    this.checkFile('api/test-api.js', 'Tests API');
    this.checkFile('backend/test-services.js', 'Tests services backend');
    this.checkFile('mobile/test-mobile.js', 'Tests mobile');
    this.checkFile('performance/test-performance.js', 'Tests performance');
    this.checkFile('security/test-security.js', 'Tests sécurité');
    this.checkFile('e2e/specs/admin-backoffice.spec.ts', 'Tests E2E backoffice');
    this.checkFile('e2e/specs/user-journeys.spec.ts', 'Tests E2E parcours utilisateur');

    // Configurations
    this.checkPackageJson();
    this.checkPlaywrightConfig();
    this.checkJestConfig();
    this.checkDependencies();

    // Résumé
    const total = this.checks.length;
    const successful = this.checks.filter(c => c.status === 'success').length;
    const failed = total - successful;

    this.log(`\n📊 RÉSUMÉ:`);
    this.log(`Total vérifications: ${total}`);
    this.log(`Réussies: ${successful}`, 'success');
    this.log(`Échouées: ${failed}`, failed > 0 ? 'error' : 'success');

    if (failed === 0) {
      this.log('\n✅ Configuration des tests COMPLÈTE !');
      this.log('Vous pouvez maintenant exécuter: make test');
    } else {
      this.log('\n⚠️ Configuration incomplète');
      this.log('Exécutez: make test-setup');
    }

    return { total, successful, failed };
  }
}

// Script principal
async function main() {
  const verifier = new TestVerifier();

  try {
    const result = verifier.runVerification();

    if (result.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erreur de vérification:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestVerifier;
