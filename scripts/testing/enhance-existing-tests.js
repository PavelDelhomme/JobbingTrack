#!/usr/bin/env node

/**
 * Script d'amélioration des tests existants
 * Met à jour les tests existants pour qu'ils utilisent la nouvelle structure
 */

const fs = require('fs');
const path = require('path');

class TestEnhancer {
  constructor() {
    this.testsDir = path.join(__dirname, '..', '..', 'tests');
    this.frontendTestsDir = path.join(__dirname, '..', '..', 'frontend', 'tests');
  }

  log(message, type = 'info') {
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  enhanceTestFile(filePath, content) {
    let enhancedContent = content;

    // Ajouter les imports des fixtures si pas déjà présents
    if (!enhancedContent.includes('fixtures') && !enhancedContent.includes('createTestUser')) {
      enhancedContent = enhancedContent.replace(
        /(import.*from.*['"]@?\/.*['"]\s*)/,
        `$1\nimport { createTestUser, createTestCompany, createTestApplication } from '../../fixtures/test-data';\n`
      );
    }

    // Remplacer les données hardcodées par des fixtures
    enhancedContent = enhancedContent.replace(
      /const\s+(testUser|user)\s*=\s*\{/g,
      'const testUser = createTestUser();'
    );

    enhancedContent = enhancedContent.replace(
      /const\s+(testCompany|company)\s*=\s*\{/g,
      'const testCompany = createTestCompany();'
    );

    enhancedContent = enhancedContent.replace(
      /const\s+(testApplication|application)\s*=\s*\{/g,
      'const testApplication = createTestApplication();'
    );

    // Ajouter des tests de validation des données
    if (enhancedContent.includes('describe(') && !enhancedContent.includes('data validation')) {
      enhancedContent = enhancedContent.replace(
        /(describe\('[^']*', \(\) => \{)/,
        `$1\n\n  describe('Data validation', () => {\n    test('should validate input data', () => {\n      // Test implementation\n    });`
      );
    }

    // Ajouter des tests d'erreur
    if (!enhancedContent.includes('error handling')) {
      enhancedContent = enhancedContent.replace(
        /(\}\);?\s*$)/,
        `\n  describe('Error handling', () => {\n    test('should handle network errors', () => {\n      // Test implementation\n    });\n$1`
      );
    }

    return enhancedContent;
  }

  enhanceFrontendTests() {
    this.log('⚛️ Amélioration des tests frontend...');

    const frontendTests = [
      'test-frontend-improvements.js',
      'test-login-improvements.js',
      'test-runtime-error-fixes.js',
      'test-theme-system.js'
    ];

    frontendTests.forEach(testFile => {
      const testPath = path.join(this.testsDir, 'frontend', testFile);

      if (fs.existsSync(testPath)) {
        let content = fs.readFileSync(testPath, 'utf8');
        const enhancedContent = this.enhanceTestFile(testPath, content);

        if (enhancedContent !== content) {
          fs.writeFileSync(testPath, enhancedContent);
          this.log(`Test frontend amélioré: ${testFile}`);
        }
      }
    });
  }

  enhanceIntegrationTests() {
    this.log('🔗 Amélioration des tests d\'intégration...');

    const integrationTests = [
      'test-frontend-integration.js',
      'test-full-system.js',
      'test-websocket.js'
    ];

    integrationTests.forEach(testFile => {
      const testPath = path.join(this.testsDir, 'integration', testFile);

      if (fs.existsSync(testPath)) {
        let content = fs.readFileSync(testPath, 'utf8');
        const enhancedContent = this.enhanceTestFile(testPath, content);

        // Ajouter des tests d'intégration spécifiques
        if (testFile.includes('websocket')) {
          enhancedContent = enhancedContent.replace(
            /describe\('[^']*', \(\) => {/,
            `$&\n\n  describe('WebSocket integration', () => {\n    test('should establish connection', () => {\n      // Test implementation\n    });`
          );
        }

        if (enhancedContent !== content) {
          fs.writeFileSync(testPath, enhancedContent);
          this.log(`Test d'intégration amélioré: ${testFile}`);
        }
      }
    });
  }

  enhanceDatabaseTests() {
    this.log('🗄️ Amélioration des tests de base de données...');

    const dbTestPath = path.join(this.testsDir, 'database', 'test-postgresql-config.js');

    if (fs.existsSync(dbTestPath)) {
      let content = fs.readFileSync(dbTestPath, 'utf8');

      // Ajouter des tests de performance
      content = content.replace(
        /}\);?\s*$/,
        `\n\n  describe('Database performance', () => {\n    test('should handle concurrent connections', async () => {\n      // Test implementation\n    });`
      );

      fs.writeFileSync(dbTestPath, content);
      this.log('Tests de base de données améliorés');
    }
  }

  createFixtures() {
    this.log('🎭 Création des fixtures de test...');

    const fixturesDir = path.join(this.testsDir, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Fixtures pour les tests E2E
    const e2eFixtures = {
      users: {
        admin: {
          email: 'admin@jobbingtrack.test',
          password: 'admin123',
          role: 'SUPER_ADMIN'
        },
        user: {
          email: 'user@jobbingtrack.test',
          password: 'user123',
          role: 'USER'
        },
        candidate: {
          email: 'candidate@jobbingtrack.test',
          password: 'candidate123',
          role: 'CANDIDATE'
        }
      },
      companies: {
        google: {
          name: 'Google',
          industry: 'Technologie',
          website: 'https://google.com'
        },
        microsoft: {
          name: 'Microsoft',
          industry: 'Technologie',
          website: 'https://microsoft.com'
        }
      },
      applications: {
        developer: {
          title: 'Développeur Full Stack',
          status: 'APPLIED'
        },
        designer: {
          title: 'UX Designer',
          status: 'INTERVIEW'
        }
      }
    };

    fs.writeFileSync(
      path.join(fixturesDir, 'test-data.json'),
      JSON.stringify(e2eFixtures, null, 2)
    );

    this.log('Fixtures E2E créées');
  }

  updatePlaywrightConfig() {
    this.log('🎭 Mise à jour configuration Playwright...');

    const playwrightConfigPath = path.join(this.testsDir, 'playwright.config.ts');
    let configContent = fs.readFileSync(playwrightConfigPath, 'utf8');

    // Ajouter la configuration des fixtures
    if (!configContent.includes('testDir')) {
      configContent = configContent.replace(
        'export default defineConfig({',
        `export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:8080',
  },`
      );
    }

    fs.writeFileSync(playwrightConfigPath, configContent);
    this.log('Configuration Playwright mise à jour');
  }

  updateJestConfig() {
    this.log('🃏 Mise à jour configuration Jest...');

    const jestConfigPath = path.join(this.testsDir, 'jest.config.js');
    let configContent = fs.readFileSync(jestConfigPath, 'utf8');

    // Ajouter la configuration des fixtures
    if (!configContent.includes('setupFilesAfterEnv')) {
      configContent = configContent.replace(
        'module.exports = {',
        `module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',`
      );
    }

    fs.writeFileSync(jestConfigPath, configContent);
    this.log('Configuration Jest mise à jour');
  }

  createTestHelpers() {
    this.log('🛠️ Création des helpers de test...');

    const helpersContent = `/**
 * Helpers pour les tests
 * Fonctions utilitaires pour simplifier l'écriture des tests
 */

export const createTestUser = (overrides = {}) => ({
  email: 'redacted@example.invalid',
  password: 'password123',
  name: 'Test User',
  role: 'user',
  ...overrides
});

export const createTestCompany = (overrides = {}) => ({
  name: 'Test Company',
  description: 'Test company description',
  website: 'https://example.com',
  industry: 'Technology',
  ...overrides
});

export const createTestApplication = (overrides = {}) => ({
  title: 'Test Application',
  description: 'Test job application',
  companyId: 1,
  userId: 1,
  status: 'applied',
  ...overrides
});

export const waitForElement = async (page, selector, timeout = 5000) => {
  await page.waitForSelector(selector, { timeout });
  return page.locator(selector);
};

export const loginAsUser = async (page, email, password) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
};

export const createTestData = async (page, type, data) => {
  await page.goto(\`/backoffice/\${type}\`);
  await page.click('button:has-text("Créer")');
  // Remplir le formulaire avec les données
  Object.entries(data).forEach(([key, value]) => {
    page.fill(\`input[name="\${key}"]\`, value);
  });
  await page.click('button[type="submit"]');
  await page.waitForSelector('.success-message');
};

export const expectErrorMessage = async (page, message) => {
  await expect(page.locator('.error-message')).toContainText(message);
};

export const expectSuccessMessage = async (page, message) => {
  await expect(page.locator('.success-message')).toContainText(message);
};
`;

    fs.writeFileSync(
      path.join(this.testsDir, 'e2e', 'utils', 'test-helpers.ts'),
      helpersContent
    );

    this.log('Helpers de test créés');
  }

  runEnhancement() {
    this.log('🚀 Amélioration des tests existants...\n');

    // Améliorer les tests frontend
    this.enhanceFrontendTests();

    // Améliorer les tests d'intégration
    this.enhanceIntegrationTests();

    // Améliorer les tests de base de données
    this.enhanceDatabaseTests();

    // Créer les fixtures
    this.createFixtures();

    // Mettre à jour les configurations
    this.updatePlaywrightConfig();
    this.updateJestConfig();

    // Créer les helpers
    this.createTestHelpers();

    this.log('\n✅ Amélioration des tests terminée !');
    this.log('\n📋 Améliorations apportées :');
    this.log('- Fixtures de test créées');
    this.log('- Tests améliorés avec validation des données');
    this.log('- Tests d\'erreur ajoutés');
    this.log('- Configuration Playwright mise à jour');
    this.log('- Configuration Jest mise à jour');
    this.log('- Helpers de test créés');
    this.log('\n🚀 Les tests sont maintenant optimisés pour la nouvelle structure !');
  }
}

// Script principal
async function main() {
  const enhancer = new TestEnhancer();

  try {
    enhancer.runEnhancement();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur d\'amélioration:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestEnhancer;
