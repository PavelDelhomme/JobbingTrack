# 🧪 Suite de Tests JobbingTrack

Suite complète de tests pour la plateforme JobbingTrack, incluant tests unitaires, d'intégration, E2E, de performance et de sécurité.

## 📋 Structure des Tests

```
tests/
├── README.md              # Ce fichier
├── package.json          # Configuration npm des tests
├── jest.config.js        # Configuration Jest
├── jest.setup.js         # Setup global Jest
├── playwright.config.ts  # Configuration Playwright
├── run-tests.js          # Script principal d'exécution
├── reports/              # Rapports de tests générés
├── unit/                 # Tests unitaires
│   ├── test-utils.js     # Tests des utilitaires
│   └── test-*.js         # Autres tests unitaires
├── integration/          # Tests d'intégration
│   ├── test-frontend-integration.js
│   ├── test-full-system.js
│   └── test-*.js
├── database/             # Tests de base de données
│   ├── test-database.js  # Tests DB complets
│   └── test-*.js
├── api/                  # Tests API
│   ├── test-api.js       # Tests API complets
│   └── test-*.js
├── backend/              # Tests backend
│   ├── test-services.js  # Tests des services backend
│   └── test-*.js
├── frontend/             # Tests frontend
│   ├── test-frontend-improvements.js
│   └── test-*.js
├── mobile/               # Tests mobile
│   ├── test-mobile.js    # Tests mobile complets
│   └── test-*.js
├── e2e/                  # Tests End-to-End (Playwright)
│   ├── specs/           # Spécifications de tests
│   │   ├── admin-backoffice.spec.ts
│   │   ├── user-journeys.spec.ts
│   │   └── *.spec.ts
│   ├── fixtures/        # Données de test
│   ├── utils/           # Utilitaires E2E
│   └── results/         # Résultats E2E
├── performance/          # Tests de performance
│   ├── test-performance.js
│   └── test-*.js
└── security/             # Tests de sécurité
    ├── test-security.js  # Tests de sécurité complets
    └── test-*.js
```

## 🚀 Utilisation Rapide

### Prérequis

```bash
# Installation des dépendances de test
cd tests
npm install

# Installation Playwright (si pas déjà fait)
npx playwright install
```

### Exécution des Tests

#### Tous les tests
```bash
make test-all
# ou
node tests/run-tests.js
```

#### Tests par catégorie
```bash
# Tests unitaires
make test-unit

# Tests d'intégration
make test-integration

# Tests de base de données
make test-database

# Tests API
make test-api

# Tests backend
make test-backend

# Tests frontend
make test-frontend

# Tests mobile
make test-mobile

# Tests E2E
make test-e2e

# Tests E2E avec interface
make test-e2e-ui

# Tests de performance
make test-performance

# Tests de sécurité
make test-security

# Tests rapides (sans E2E)
make test-quick

# Tests avec coverage
make test-coverage
```

#### Tests spécifiques
```bash
# Tests backend uniquement
make test-backend-only

# Tests frontend uniquement
make test-frontend-only

# Tests avec rapport détaillé
make test-report
```

## 📊 Commandes Disponibles

### Commandes Make
```bash
make test              # Tests standards (via scripts/testing)
make test-all         # Suite complète de tests
make test-quick       # Tests rapides
make test-unit        # Tests unitaires Jest
make test-integration # Tests d'intégration
make test-database    # Tests base de données
make test-api         # Tests API
make test-backend     # Tests services backend
make test-frontend    # Tests frontend
make test-mobile      # Tests mobile
make test-e2e         # Tests E2E Playwright
make test-e2e-ui      # Tests E2E avec interface graphique
make test-performance # Tests performance
make test-security    # Tests sécurité
make test-coverage    # Tests avec coverage
make test-report      # Tests avec rapport
```

### Commandes npm (depuis le dossier tests/)
```bash
npm test              # Tous les tests
npm run test:all      # Suite complète
npm run test:unit     # Tests unitaires
npm run test:integration # Tests intégration
npm run test:database # Tests base de données
npm run test:api      # Tests API
npm run test:e2e      # Tests E2E
npm run test:backend  # Tests backend
npm run test:frontend # Tests frontend
npm run test:mobile   # Tests mobile
npm run test:performance # Tests performance
npm run test:security  # Tests sécurité
npm run test:coverage # Tests avec coverage
npm run test:ci       # Tests CI
npm run test:playwright # Tests Playwright avec interface
```

## 🎯 Types de Tests

### Tests Unitaires
Tests des fonctions individuelles, utilitaires et composants isolés.

```bash
make test-unit
# Tests: formatage, validation, calculs, fichiers, dates, chaînes, objets
```

### Tests d'Intégration
Tests d'interaction entre composants et services.

```bash
make test-integration
# Tests: WebSocket, intégration frontend, système complet
```

### Tests de Base de Données
Tests des migrations, seed, intégrité et performance DB.

```bash
make test-database
# Tests: connexion, tables, contraintes, intégrité, performance
```

### Tests API
Tests complets de tous les endpoints de l'API backend.

```bash
make test-api
# Tests: authentification, utilisateurs, entreprises, candidatures, métriques
```

### Tests Backend
Tests des services backend individuels.

```bash
make test-backend
# Tests: auth-service, user-service, company-service, application-service, dashboard-service
```

### Tests Frontend
Tests des composants et fonctionnalités frontend.

```bash
make test-frontend
# Tests: améliorations, intégration, corrections runtime, système de thème
```

### Tests Mobile
Tests de l'interface et fonctionnalités mobile.

```bash
make test-mobile
# Tests: navigation, formulaires, mode hors ligne, performance, accessibilité
```

### Tests E2E (Playwright)
Tests complets du parcours utilisateur.

```bash
make test-e2e         # Exécution headless
make test-e2e-ui      # Avec interface graphique
```

**Interface Playwright dans le Backoffice:**
- Accès: `/backoffice/playwright-tests`
- Création et exécution de tests depuis l'interface admin
- Gestion des cas de test et rapports

### Tests de Performance
Tests de charge, performance et optimisation.

```bash
make test-performance
# Tests: API performance, charge, base de données, frontend, mémoire
```

### Tests de Sécurité
Tests de sécurité, vulnérabilités et conformité.

```bash
make test-security
# Tests: XSS, SQL injection, CSRF, auth bypass, rate limiting, headers, data exposure
```

## 📈 Rapports et Coverage

### Génération de Rapports
```bash
# Rapport de tous les tests
make test-report

# Coverage des tests
make test-coverage
```

### Emplacement des Rapports
```
tests/reports/
├── test-report.json        # Rapport principal
├── performance-report.json # Rapport performance
├── security-report.json    # Rapport sécurité
└── coverage/              # Coverage détaillé
    ├── index.html
    ├── lcov-report/
    └── coverage.json
```

## 🔧 Configuration

### Variables d'environnement
```bash
# Base de données de test
DATABASE_URL=postgresql://user:pass@localhost:5432/jobbingtrack_test

# API URLs
API_GATEWAY_URL=http://localhost:3000
AUTH_SERVICE_URL=http://localhost:3001
DASHBOARD_SERVICE_URL=http://localhost:3007

# JWT Secret pour les tests
JWT_SECRET=test-secret-key

# Frontend URL
FRONTEND_URL=http://localhost:8080
```

### Configuration Playwright
```bash
# Installation des navigateurs
npx playwright install

# Installation avec Chromium uniquement (plus rapide)
npx playwright install chromium

# Configuration personnalisée
# Éditer: tests/playwright.config.ts
```

### Configuration Jest
```javascript
// Configuration dans tests/jest.config.js
module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  verbose: true,
  // ...
};
```

## 🎭 Interface Playwright Backoffice

L'interface Playwright intégrée dans le backoffice admin permet de :

### Fonctionnalités
- ✅ Créer des tests personnalisés
- ✅ Exécuter des tests individuels ou en lot
- ✅ Visualiser les résultats en temps réel
- ✅ Exporter/importer des suites de tests
- ✅ Configurer des types de tests (unit, integration, e2e, performance, security)

### Accès
```
http://localhost:8080/backoffice/playwright-tests
```

### Utilisation
1. **Créer un test**: Remplir le formulaire avec nom, description et type
2. **Code optionnel**: Ajouter du code Playwright ou JavaScript personnalisé
3. **Exécuter**: Lancer le test individuellement ou en lot
4. **Surveiller**: Visualiser l'état et les résultats en temps réel

## 🛠️ Développement de Tests

### Ajouter un Test Unitaire
```javascript
// tests/unit/test-example.js
describe('Example Feature', () => {
  test('should work correctly', () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
```

### Ajouter un Test E2E
```typescript
// tests/e2e/specs/example.spec.ts
import { test, expect } from '@playwright/test';

test('Example E2E Test', async ({ page }) => {
  await page.goto('http://localhost:8080');
  await expect(page.locator('h1')).toBeVisible();
});
```

### Ajouter un Test API
```javascript
// tests/api/test-example.js
const request = require('supertest');

test('API Example', async () => {
  const response = await request('http://localhost:3000')
    .get('/api/health');

  expect(response.status).toBe(200);
});
```

## 🚨 Dépannage

### Erreurs Courantes

#### "Module not found"
```bash
# Réinstaller les dépendances
cd tests && npm install

# Vérifier les paths d'import
# Utiliser des imports relatifs: ../../lib/api
```

#### Tests E2E échouent
```bash
# Vérifier que les services sont démarrés
make up

# Vérifier les URLs dans playwright.config.ts
# Attendre que les services soient prêts
```

#### Tests de base de données échouent
```bash
# Vérifier la connexion DB
make db-status

# Vérifier les variables d'environnement
# Utiliser la bonne DATABASE_URL
```

### Logs et Debug
```bash
# Logs détaillés
DEBUG=* npm test

# Mode verbose
npm run test:unit -- --verbose

# Debug Playwright
npx playwright test --debug
```

## 📋 Bonnes Pratiques

### Tests Unitaires
- ✅ Tester une fonction à la fois
- ✅ Utiliser des mocks pour les dépendances externes
- ✅ Tester les cas d'erreur
- ✅ Noms de tests descriptifs

### Tests E2E
- ✅ Tests indépendants
- ✅ Attendre les éléments avant d'interagir
- ✅ Tests de données cohérentes
- ✅ Screenshots en cas d'échec

### Tests de Performance
- ✅ Mesurer les temps de réponse
- ✅ Tester sous charge réaliste
- ✅ Surveiller l'utilisation mémoire
- ✅ Baselines pour les régressions

### Tests de Sécurité
- ✅ Tester tous les endpoints
- ✅ Valider les entrées utilisateur
- ✅ Vérifier les permissions
- ✅ Tests d'authentification

## 🤝 Contribution

### Ajout de Nouveaux Tests
1. Créer le fichier de test dans la catégorie appropriée
2. Suivre les conventions de nommage
3. Ajouter des commentaires explicatifs
4. Mettre à jour ce README

### Standards de Code
- Utiliser ESLint
- Tests en anglais
- Commentaires en français
- Couverture minimale 80%

## 📞 Support

Pour des questions ou problèmes :
- Consulter les logs dans `tests/reports/`
- Vérifier la configuration dans ce README
- Utiliser `make test-report` pour un diagnostic complet

---

**🎯 Objectif**: 100% de couverture de code avec des tests fiables et maintenables !
