#!/usr/bin/env bash

# Script de configuration automatique des tests backend
# Configure tous les services backend avec les scripts de test et configurations nécessaires

set -e

echo "🔧 Configuration automatique des tests backend..."

# Liste des services backend à configurer
services=(
  "dashboard-service"
  "contact-service"
  "interview-service"
  "notification-service"
  "profile-service"
  "security-service"
  "deployment-service"
)

for service in "${services[@]}"; do
  echo "⚙️ Configuration de $service..."

  service_path="backend/$service"

  # Vérifier si le service existe
  if [ ! -d "$service_path" ]; then
    echo "⚠️ Service $service n'existe pas, passage..."
    continue
  fi

  cd "$service_path"

  # 1. Mettre à jour package.json si nécessaire
  if [ -f "package.json" ]; then
    echo "📦 Configuration package.json pour $service..."

    # Ajouter les scripts de test si manquants
    if ! grep -q "test:ci" package.json; then
      # Backup du package.json
      cp package.json package.json.backup

      # Utiliser Node.js pour modifier le JSON
      node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

        if (!pkg.scripts) pkg.scripts = {};
        if (!pkg.scripts.test) pkg.scripts.test = 'jest --config jest.config.js';
        if (!pkg.scripts['test:ci']) pkg.scripts['test:ci'] = 'jest --config jest.config.js --ci --coverage --watchAll=false';
        if (!pkg.scripts['test:watch']) pkg.scripts['test:watch'] = 'jest --config jest.config.js --watch';
        if (!pkg.scripts.lint) pkg.scripts.lint = 'eslint src/ tests/ --ext .js,.ts';
        if (!pkg.scripts['lint:fix']) pkg.scripts['lint:fix'] = 'eslint src/ tests/ --ext .js,.ts --fix';
        if (!pkg.scripts.format) pkg.scripts.format = 'prettier --write src/ tests/';
        if (!pkg.scripts['format:check']) pkg.scripts['format:check'] = 'prettier --check src/ tests/';
        if (!pkg.scripts.build) pkg.scripts.build = 'echo \"No build step required for Node.js service\"';
        if (!pkg.scripts.clean) pkg.scripts.clean = 'rm -rf coverage/ .nyc_output/';

        if (!pkg.devDependencies) pkg.devDependencies = {};
        if (!pkg.devDependencies['@typescript-eslint/eslint-plugin']) {
          pkg.devDependencies['@typescript-eslint/eslint-plugin'] = '^6.0.0';
        }
        if (!pkg.devDependencies['@typescript-eslint/parser']) {
          pkg.devDependencies['@typescript-eslint/parser'] = '^6.0.0';
        }
        if (!pkg.devDependencies.eslint) {
          pkg.devDependencies.eslint = '^8.45.0';
        }
        if (!pkg.devDependencies['eslint-config-standard']) {
          pkg.devDependencies['eslint-config-standard'] = '^17.1.0';
        }
        if (!pkg.devDependencies['eslint-plugin-node']) {
          pkg.devDependencies['eslint-plugin-node'] = '^11.1.0';
        }
        if (!pkg.devDependencies.prettier) {
          pkg.devDependencies.prettier = '^3.0.0';
        }
        if (!pkg.devDependencies.supertest) {
          pkg.devDependencies.supertest = '^6.3.3';
        }

        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('✅ package.json mis à jour');
      "
    fi
  fi

  # 2. Créer les configurations manquantes
  if [ ! -f "jest.config.js" ]; then
    cat > jest.config.js << 'EOF'
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/server.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
};
EOF
    echo "✅ jest.config.js créé"
  fi

  if [ ! -f ".eslintrc.js" ]; then
    cat > .eslintrc.js << 'EOF'
module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
  ],
};
EOF
    echo "✅ .eslintrc.js créé"
  fi

  if [ ! -f ".prettierrc" ]; then
    cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
EOF
    echo "✅ .prettierrc créé"
  fi

  # 3. Créer le dossier tests et fichiers de base
  if [ ! -d "tests" ]; then
    mkdir -p tests
    echo "✅ Dossier tests créé"
  fi

  if [ ! -f "tests/setup.js" ]; then
    cat > tests/setup.js << 'EOF'
// Configuration Jest pour les tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

jest.setTimeout(10000);

afterEach(() => {
  jest.clearAllMocks();
});

global.testConfig = {
  timeout: 10000,
  retries: 3,
};
EOF
    echo "✅ tests/setup.js créé"
  fi

  if [ ! -f "tests/server.test.js" ]; then
    # Créer un test de serveur basique
    server_test_content="const request = require('supertest');
const app = require('../src/server');

describe('${service} - Tests de base', () => {
  test('GET /health devrait retourner 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', '${service}');
  });

  test('GET / devrait retourner 404 si pas de route', async () => {
    await request(app)
      .get('/non-existent-route')
      .expect(404);
  });
});"

    echo "$server_test_content" > tests/server.test.js
    echo "✅ tests/server.test.js créé"
  fi

  cd - > /dev/null
done

echo "🎉 Configuration des tests backend terminée !"
echo ""
echo "📋 Services configurés :"
for service in "${services[@]}"; do
  if [ -d "backend/$service" ]; then
    echo "  ✅ $service"
  fi
done

echo ""
echo "💡 Prochaines étapes :"
echo "  1. Installer les dépendances : cd backend && npm install"
echo "  2. Tester un service : cd backend/auth-service && npm test"
echo "  3. Lancer tous les tests : make test-backend-only"
