#!/usr/bin/env node

/**
 * Script principal d'exécution des tests
 * Orchestre tous les types de tests (unit, integration, e2e, etc.)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, description) {
    this.log(`Exécution: ${description}`);
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        timeout: 300000, // 5 minutes timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      this.log(`${description} - SUCCESS`, 'success');
      return { success: true, output: result };
    } catch (error) {
      this.log(`${description} - FAILED: ${error.message}`, 'error');
      return { success: false, output: error.stdout || error.message };
    }
  }

  async runDatabaseTests() {
    this.log('🗄️ Tests de base de données...');
    return await this.runCommand('node tests/database/test-database.js', 'Database tests');
  }

  async runUnitTests() {
    this.log('🔧 Tests unitaires...');
    // Tests unitaires gérés par les services individuels
    return await this.runCommand('echo "Tests unitaires gérés par les services backend"', 'Unit tests');
  }

  async runIntegrationTests() {
    this.log('🔗 Tests d\'intégration...');
    // Tests d'intégration gérés par les services individuels
    return await this.runCommand('echo "Tests d\'intégration gérés par les services backend"', 'Integration tests');
  }

  async runAPITests() {
    this.log('🌐 Tests API...');
    return await this.runCommand('node tests/api/test-api.js', 'API tests');
  }

  async runE2ETests() {
    this.log('🎭 Tests E2E...');
    return await this.runCommand('cd tests && npx playwright test --headed', 'E2E tests');
  }

  async runMobileTests() {
    this.log('📱 Tests mobile...');
    return await this.runCommand('node tests/mobile/test-mobile.js', 'Mobile tests');
  }

  async runBackendTests() {
    this.log('🔧 Tests backend...');

    // Tests des services backend
    const services = [
      'api-gateway',
      'auth-service',
      'company-service',
      'application-service',
      'dashboard-service',
      'contact-service',
      'interview-service',
      'notification-service',
      'profile-service',
      'security-service',
      'deployment-service'
    ];

    for (const service of services) {
      this.log(`Test du service: ${service}`);
      try {
        const result = await this.runCommand(
          `cd backend/${service} && npm test`,
          `${service} tests`
        );
        this.results[service] = result;
      } catch (error) {
        this.log(`Erreur tests ${service}: ${error.message}`, 'error');
        this.results[service] = { success: false, output: error.message };
      }
    }
  }

  async runFrontendTests() {
    this.log('⚛️ Tests frontend...');
    return await this.runCommand('cd frontend && npm run test', 'Frontend tests');
  }

  async runPerformanceTests() {
    this.log('⚡ Tests de performance...');

    // Test de charge simple
    return await this.runCommand(
      'node tests/performance/load-test.js',
      'Performance tests'
    );
  }

  async runSecurityTests() {
    this.log('🔒 Tests de sécurité...');

    // Tests de sécurité de base
    return await this.runCommand(
      'node tests/security/test-security.js',
      'Security tests'
    );
  }

  async checkEnvironment() {
    this.log('🔍 Vérification de l\'environnement...');

    const checks = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'Docker', command: 'docker --version' },
      { name: 'Docker Compose', command: 'docker-compose --version' },
      { name: 'PostgreSQL', command: 'docker ps | grep postgres || echo "PostgreSQL not running"' },
      { name: 'Redis', command: 'docker ps | grep redis || echo "Redis not running"' }
    ];

    for (const check of checks) {
      try {
        const result = execSync(check.command, { encoding: 'utf8' }).trim();
        this.log(`${check.name}: ✅ ${result}`);
      } catch (error) {
        this.log(`${check.name}: ❌ ${error.message}`, 'error');
      }
    }
  }

  async runAllTests(options = {}) {
    const {
      database = true,
      unit = true,
      integration = true,
      api = true,
      e2e = false, // E2E tests are slower, opt-in by default
      mobile = true,
      backend = true,
      frontend = true,
      performance = false,
      security = true
    } = options;

    this.log('🚀 Démarrage de la suite de tests complète...\n');

    await this.checkEnvironment();

    const testSuite = [];

    if (database) testSuite.push(() => this.runDatabaseTests());
    if (unit) testSuite.push(() => this.runUnitTests());
    if (integration) testSuite.push(() => this.runIntegrationTests());
    if (api) testSuite.push(() => this.runAPITests());
    if (e2e) testSuite.push(() => this.runE2ETests());
    if (mobile) testSuite.push(() => this.runMobileTests());
    if (backend) testSuite.push(() => this.runBackendTests());
    if (frontend) testSuite.push(() => this.runFrontendTests());
    if (performance) testSuite.push(() => this.runPerformanceTests());
    if (security) testSuite.push(() => this.runSecurityTests());

    for (const test of testSuite) {
      await test();
    }

    const duration = Date.now() - this.startTime;
    this.log(`\n⏱️ Tests terminés en ${Math.round(duration / 1000)}s`);

    return this.results;
  }

  generateReport() {
    const reportPath = 'tests/reports/test-report.json';
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      summary: this.calculateSummary()
    };

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`📊 Rapport généré: ${reportPath}`);
    return report;
  }

  calculateSummary() {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    // Compter les tests dans chaque résultat
    Object.values(this.results).forEach(result => {
      if (result.output && typeof result.output === 'string') {
        const jestOutput = result.output;
        const lines = jestOutput.split('\n');

        let passedCount = 0;
        let failedCount = 0;

        // Chercher les lignes de résumé Jest
        const testResultsMatch = jestOutput.match(/Tests?:\s*(\d+)\s*passed(?:,\s*(\d+)\s*failed)?/i);
        const testSuiteResultsMatch = jestOutput.match(/Test Suites?:\s*(\d+)\s*passed(?:,\s*(\d+)\s*failed)?/i);

        if (testResultsMatch) {
          passedTests += parseInt(testResultsMatch[1]) || 0;
          failedTests += parseInt(testResultsMatch[2]) || 0;
          totalTests += (parseInt(testResultsMatch[1]) || 0) + (parseInt(testResultsMatch[2]) || 0);
        } else if (testSuiteResultsMatch) {
          passedTests += parseInt(testSuiteResultsMatch[1]) || 0;
          failedTests += parseInt(testSuiteResultsMatch[2]) || 0;
          totalTests += (parseInt(testSuiteResultsMatch[1]) || 0) + (parseInt(testSuiteResultsMatch[2]) || 0);
        } else {
          // Compter les tests individuels plus précisément
          lines.forEach(line => {
            const trimmed = line.trim();
            // Chercher les lignes de tests individuels
            if (trimmed.startsWith('✓') || trimmed.includes('✓')) passedCount++;
            if (trimmed.startsWith('✕') || trimmed.includes('✕')) failedCount++;
          });

          if (passedCount > 0 || failedCount > 0) {
            passedTests += passedCount;
            failedTests += failedCount;
            totalTests += passedCount + failedCount;
          }
        }
      }
    });

    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests
    };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse arguments
  args.forEach(arg => {
    switch (arg) {
      case '--no-database':
        options.database = false;
        break;
      case '--no-unit':
        options.unit = false;
        break;
      case '--no-integration':
        options.integration = false;
        break;
      case '--no-api':
        options.api = false;
        break;
      case '--e2e':
        options.e2e = true;
        break;
      case '--no-mobile':
        options.mobile = false;
        break;
      case '--no-backend':
        options.backend = false;
        break;
      case '--no-frontend':
        options.frontend = false;
        break;
      case '--performance':
        options.performance = true;
        break;
      case '--no-security':
        options.security = false;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: node run-tests.js [options]

Options:
  --no-database     Skip database tests
  --no-unit         Skip unit tests
  --no-integration  Skip integration tests
  --no-api          Skip API tests
  --e2e             Include E2E tests (slower)
  --no-mobile       Skip mobile tests
  --no-backend      Skip backend tests
  --no-frontend     Skip frontend tests
  --performance     Include performance tests
  --no-security     Skip security tests
  --help, -h        Show this help

Examples:
  node run-tests.js                    # Run all tests except E2E
  node run-tests.js --e2e             # Run all tests including E2E
  node run-tests.js --no-database     # Skip database tests
        `);
        process.exit(0);
    }
  });

  const runner = new TestRunner();

  try {
    await runner.runAllTests(options);
    const report = runner.generateReport();

    console.log('\n📋 RÉSUMÉ FINAL:');
    console.log(`✅ Tests réussis: ${report.summary.passed}`);
    console.log(`❌ Tests échoués: ${report.summary.failed}`);
    console.log(`📊 Total: ${report.summary.total}`);

    if (report.summary.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestRunner;
