#!/usr/bin/env node

/**
 * Script de setup pour la suite de tests
 * Installe les dépendances et configure l'environnement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestSetup {
  constructor() {
    this.rootDir = path.resolve(__dirname, '../..');
    this.testsDir = path.resolve(__dirname, '..');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async checkPrerequisites() {
    this.log('🔍 Vérification des prérequis...');

    const prerequisites = [
      { name: 'Node.js', command: 'node --version', required: true },
      { name: 'npm', command: 'npm --version', required: true },
      { name: 'Docker', command: 'docker --version', required: true },
      { name: 'Docker Compose', command: 'docker-compose --version', required: true }
    ];

    const results = {};
    for (const prereq of prerequisites) {
      try {
        const version = execSync(prereq.command, { encoding: 'utf8' }).trim();
        this.log(`${prereq.name}: ${version}`, 'success');
        results[prereq.name] = { installed: true, version };
      } catch (error) {
        if (prereq.required) {
          this.log(`${prereq.name}: NON INSTALLÉ (REQUIS)`, 'error');
          results[prereq.name] = { installed: false, required: true };
        } else {
          this.log(`${prereq.name}: NON INSTALLÉ (OPTIONNEL)`);
          results[prereq.name] = { installed: false, required: false };
        }
      }
    }

    const missingRequired = Object.values(results).filter(r => r.required && !r.installed);
    if (missingRequired.length > 0) {
      throw new Error('Prérequis manquants: ' + missingRequired.map(r => r.name).join(', '));
    }

    return results;
  }

  async installDependencies() {
    this.log('📦 Installation des dépendances...');

    // Installer les dépendances du dossier tests
    this.log('Installation des dépendances de test...');
    try {
      execSync('npm install', { cwd: this.testsDir, stdio: 'inherit' });
      this.log('Dépendances de test installées', 'success');
    } catch (error) {
      this.log('Erreur installation dépendances test', 'error');
      throw error;
    }

    // Installer Playwright
    this.log('Installation Playwright...');
    try {
      execSync('npx playwright install --yes', { cwd: this.testsDir, stdio: 'inherit' });
      this.log('Playwright installé', 'success');
    } catch (error) {
      this.log('Erreur installation Playwright', 'error');
      // Ne pas bloquer sur Playwright
    }
  }

  async createDirectories() {
    this.log('📁 Création des répertoires...');

    const directories = [
      'reports',
      'e2e/results',
      'coverage',
      'temp',
      'fixtures'
    ];

    for (const dir of directories) {
      const fullPath = path.join(this.testsDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        this.log(`Créé: ${dir}`);
      }
    }
  }

  async createConfigFiles() {
    this.log('⚙️ Création des fichiers de configuration...');

    // Configuration d'environnement de test
    const envConfig = `# Configuration d'environnement pour les tests
NODE_ENV=test
JWT_SECRET=test-secret-key-for-testing
DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack_test
API_GATEWAY_URL=http://localhost:3000
AUTH_SERVICE_URL=http://localhost:3001
DASHBOARD_SERVICE_URL=http://localhost:3007
FRONTEND_URL=http://localhost:8080
TEST_TIMEOUT=30000
TEST_RETRIES=3
PLAYWRIGHT_TIMEOUT=30000

# Configuration Playwright
PLAYWRIGHT_BASE_URL=http://localhost:8080
PLAYWRIGHT_API_URL=http://localhost:3000
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_SLOW_MO=100

# Configuration Jest
JEST_TIMEOUT=10000
JEST_COVERAGE=true
JEST_VERBOSE=true
`;

    fs.writeFileSync(path.join(this.testsDir, '.env.test'), envConfig);
    this.log('Configuration d\'environnement créée');
  }

  async createTestFixtures() {
    this.log('🎭 Création des fixtures de test...');

    // Données de test pour les utilisateurs
    const userFixtures = {
      admin: {
        email: 'admin@jobbingtrack.com',
        password: 'admin123',
        name: 'Admin Test',
        role: 'admin'
      },
      user: {
        email: 'user@jobbingtrack.com',
        password: 'user123',
        name: 'User Test',
        role: 'user'
      },
      candidate: {
        email: 'candidate@jobbingtrack.com',
        password: 'candidate123',
        name: 'Candidate Test',
        role: 'candidate'
      },
      recruiter: {
        email: 'recruiter@jobbingtrack.com',
        password: 'recruiter123',
        name: 'Recruiter Test',
        role: 'recruiter'
      }
    };

    fs.writeFileSync(
      path.join(this.testsDir, 'fixtures', 'users.json'),
      JSON.stringify(userFixtures, null, 2)
    );

    // Données de test pour les entreprises
    const companyFixtures = {
      techCorp: {
        name: 'Tech Corp',
        description: 'Entreprise technologique innovante',
        website: 'https://techcorp.com',
        industry: 'Technology',
        size: '50-200'
      },
      startup: {
        name: 'Startup Inc',
        description: 'Jeune entreprise en croissance',
        website: 'https://startup.com',
        industry: 'Technology',
        size: '1-10'
      },
      consulting: {
        name: 'Consulting Plus',
        description: 'Cabinet de conseil en management',
        website: 'https://consulting.com',
        industry: 'Consulting',
        size: '10-50'
      }
    };

    fs.writeFileSync(
      path.join(this.testsDir, 'fixtures', 'companies.json'),
      JSON.stringify(companyFixtures, null, 2)
    );

    this.log('Fixtures de test créées');
  }

  async createDockerTestSetup() {
    this.log('🐳 Configuration Docker pour les tests...');

    // Docker Compose pour les tests
    const dockerComposeTest = `version: '3.8'

services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: jobbingtrack_test
      POSTGRES_USER: jobbingtrack
      POSTGRES_PASSWORD: jobbingtrack123
    ports:
      - "5433:5432"
    volumes:
      - postgres_test_data:/var/lib/postgresql/data
    networks:
      - jobbingtrack-test

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    networks:
      - jobbingtrack-test

  api-gateway-test:
    build:
      context: ../backend/api-gateway
      dockerfile: Dockerfile
    environment:
      NODE_ENV: test
      JWT_SECRET: test-secret-key-for-testing
      DATABASE_URL: postgresql://jobbingtrack:jobbingtrack123@postgres-test:5432/jobbingtrack_test
    ports:
      - "3001:3000"
    depends_on:
      - postgres-test
      - redis-test
    networks:
      - jobbingtrack-test

volumes:
  postgres_test_data:

networks:
  jobbingtrack-test:
    driver: bridge
`;

    fs.writeFileSync(
      path.join(this.testsDir, 'docker-compose.test.yml'),
      dockerComposeTest
    );

    this.log('Configuration Docker test créée');
  }

  async createGitIgnore() {
    this.log('📝 Mise à jour .gitignore...');

    const gitignoreContent = `
# Tests
reports/
coverage/
temp/
*.log
test-results/
playwright-report/
e2e/results/
node_modules/
results/
performance-benchmark/
user-journey-reports/


# Environment de test
.env.test.local
*.env

# Cache
.cache/
.nyc_output/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
`;

    const gitignorePath = path.join(this.testsDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, gitignoreContent);
    }

    this.log('.gitignore créé');
  }

  async createScripts() {
    this.log('📜 Création des scripts utilitaires...');

    // Script de nettoyage
    const cleanupScript = `#!/bin/bash
# Script de nettoyage pour les tests

echo "🧹 Nettoyage des tests..."

# Arrêter les services de test
docker-compose -f tests/docker-compose.test.yml down -v

# Nettoyer les volumes
docker volume rm jobbingtrack_postgres_test_data 2>/dev/null || true

# Nettoyer les rapports
rm -rf tests/reports/*
rm -rf tests/coverage/*
rm -rf tests/e2e/results/*
rm -rf tests/temp/*

# Nettoyer les caches
rm -rf tests/node_modules/.cache
rm -rf tests/.nyc_output

echo "✅ Nettoyage terminé"
`;

    fs.writeFileSync(path.join(this.testsDir, 'cleanup.sh'), cleanupScript);
    execSync('chmod +x ' + path.join(this.testsDir, 'cleanup.sh'));

    this.log('Scripts utilitaires créés');
  }

  async generateDocumentation() {
    this.log('📚 Génération de la documentation...');

    const readmeContent = `# Tests JobbingTrack - Documentation Technique

## Configuration

### Variables d'environnement
\`\`\`bash
# Copier et adapter
cp tests/.env.test tests/.env.test.local
\`\`\`

### Démarrage des services de test
\`\`\`bash
# Services de test
docker-compose -f tests/docker-compose.test.yml up -d

# Frontend pour tests E2E
cd frontend && npm run dev

# Backend API
cd backend/api-gateway && npm run dev
\`\`\`

## Exécution

### Tests unitaires
\`\`\`bash
npm run test:unit
\`\`\`

### Tests E2E
\`\`\`bash
npm run test:e2e
# Avec interface
npm run test:playwright
\`\`\`

### Tests API
\`\`\`bash
npm run test:api
\`\`\`

## Structure

- \`unit/\` - Tests unitaires (Jest)
- \`e2e/\` - Tests end-to-end (Playwright)
- \`api/\` - Tests API (Supertest)
- \`integration/\` - Tests d'intégration
- \`performance/\` - Tests de performance
- \`security/\` - Tests de sécurité

## Fixtures

Données de test disponibles dans \`tests/fixtures/\`:
- \`users.json\` - Utilisateurs de test
- \`companies.json\` - Entreprises de test
- \`applications.json\` - Candidatures de test
`;

    fs.writeFileSync(path.join(this.testsDir, 'TECHNICAL.md'), readmeContent);
    this.log('Documentation technique générée');
  }

  async runSetup() {
    this.log('🚀 Configuration de la suite de tests...\n');

    try {
      await this.checkPrerequisites();
      await this.createDirectories();
      await this.installDependencies();
      await this.createConfigFiles();
      await this.createTestFixtures();
      await this.createDockerTestSetup();
      await this.createGitIgnore();
      await this.createScripts();
      await this.generateDocumentation();

      this.log('\n✅ Configuration terminée avec succès !');
      this.log('\n📋 Prochaines étapes:');
      this.log('1. Configurer les variables d\'environnement: cp tests/.env.test tests/.env.test.local');
      this.log('2. Démarrer les services: docker-compose -f tests/docker-compose.test.yml up -d');
      this.log('3. Exécuter les tests: npm test');
      this.log('4. Consulter la documentation: tests/README.md');

    } catch (error) {
      this.log(`\n❌ Erreur de configuration: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Script principal
async function main() {
  const setup = new TestSetup();

  try {
    await setup.runSetup();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestSetup;
