# Scripts Testing - JobbingTrack

[← Scripts](../README.md) | [← README principal](../../README.md) | [📚 Documentation](../../docs/README.md) | [🧭 Navigation](../../docs/navigation.md)

## 🎯 Vue d'ensemble

Les scripts de test automatisent l'exécution des tests unitaires, d'intégration et end-to-end du projet JobbingTrack.

## 📁 Scripts disponibles

| Script | Description | Usage |
|--------|-------------|-------|
| `run-tests.sh` | Exécute les tests automatisés | `./scripts/testing/run-tests.sh --all` |

## 🧪 Types de tests

### Tests unitaires
- Tests des composants individuels
- Tests des fonctions et modules
- Tests des services backend

### Tests d'intégration
- Tests des interactions entre services
- Tests des APIs
- Tests des bases de données

### Tests end-to-end (E2E)
- Tests des flux utilisateur complets
- Tests de l'interface utilisateur
- Tests de bout en bout

## 🚀 Utilisation

### Exécution des tests

```bash
# Tous les tests
./scripts/testing/run-tests.sh --all

# Tests unitaires uniquement
./scripts/testing/run-tests.sh --unit

# Tests d'intégration uniquement
./scripts/testing/run-tests.sh --integration

# Tests E2E uniquement
./scripts/testing/run-tests.sh --e2e

# Tests d'un service spécifique
./scripts/testing/run-tests.sh --service=auth-service

# Tests avec couverture
./scripts/testing/run-tests.sh --coverage
```

### Options disponibles

- `--all` : Exécuter tous les tests
- `--unit` : Tests unitaires uniquement
- `--integration` : Tests d'intégration uniquement
- `--e2e` : Tests end-to-end uniquement
- `--service=<service>` : Tests d'un service spécifique
- `--coverage` : Générer un rapport de couverture
- `--verbose` : Mode verbeux
- `--parallel` : Exécution en parallèle
- `--watch` : Mode surveillance (re-exécution automatique)

## 📊 Rapports et métriques

### Couverture de code

```bash
# Générer un rapport de couverture
./scripts/testing/run-tests.sh --coverage

# Rapports disponibles dans
./coverage/
├── backend-coverage.html
├── frontend-coverage.html
└── combined-coverage.json
```

### Rapports de tests

```bash
# Rapports disponibles dans
./test-results/
├── unit-tests.xml
├── integration-tests.xml
├── e2e-tests.xml
└── summary.json
```

## 🔧 Configuration

### Variables d'environnement

```bash
# Configuration des tests
export TEST_ENV=development
export TEST_DATABASE_URL=postgresql://test:test@localhost:5432/jobbingtrack_test
export TEST_TIMEOUT=30000

# Configuration de couverture
export COVERAGE_THRESHOLD=80
export COVERAGE_REPORTER=html,json

# Configuration des tests E2E
export E2E_BASE_URL=http://localhost:8080
export E2E_HEADLESS=true
```

### Fichiers de configuration

- `jest.config.js` : Configuration Jest (frontend)
- `playwright.config.ts` : Configuration Playwright (E2E)
- `package.json` : Scripts de test npm

## 🏗️ Structure des tests

### Tests backend

```
backend/
├── auth-service/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   └── jest.config.js
├── api-gateway/
│   └── tests/
└── ...
```

### Tests frontend

```
frontend/
├── src/
│   ├── __tests__/
│   ├── components/
│   │   └── __tests__/
│   └── pages/
│       └── __tests__/
├── tests/
│   ├── e2e/
│   └── integration/
└── jest.config.js
```

## 🔄 Intégration CI/CD

### GitHub Actions

Les tests sont automatiquement exécutés sur :

- **Push** : Tests unitaires et d'intégration
- **Pull Request** : Tous les tests
- **Release** : Tests complets + couverture

### Pipeline de tests

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: ./scripts/testing/run-tests.sh --unit

- name: Run Integration Tests
  run: ./scripts/testing/run-tests.sh --integration

- name: Run E2E Tests
  run: ./scripts/testing/run-tests.sh --e2e

- name: Generate Coverage Report
  run: ./scripts/testing/run-tests.sh --coverage
```

## 🐛 Résolution de problèmes

### Problèmes courants

1. **Tests qui échouent de manière intermittente**
   ```bash
   # Augmenter les timeouts
   export TEST_TIMEOUT=60000
   ./scripts/testing/run-tests.sh --all
   ```

2. **Problèmes de base de données de test**
   ```bash
   # Réinitialiser la base de test
   make db-reset
   ./scripts/testing/run-tests.sh --all
   ```

3. **Tests E2E qui échouent**
   ```bash
   # Mode non-headless pour debug
   export E2E_HEADLESS=false
   ./scripts/testing/run-tests.sh --e2e
   ```

### Debugging

```bash
# Mode verbose pour plus de détails
./scripts/testing/run-tests.sh --verbose

# Tests d'un fichier spécifique
./scripts/testing/run-tests.sh --file=auth.test.js

# Mode debug avec logs
export DEBUG=true
./scripts/testing/run-tests.sh --all
```

## 🔄 Intégration avec Makefile

Les scripts de test sont intégrés avec le Makefile principal :

```bash
# Équivalents Makefile
make test                    # = ./scripts/testing/run-tests.sh --all
make test-unit              # = ./scripts/testing/run-tests.sh --unit
make test-integration       # = ./scripts/testing/run-tests.sh --integration
make test-e2e              # = ./scripts/testing/run-tests.sh --e2e
make test-coverage         # = ./scripts/testing/run-tests.sh --coverage
```

## 📚 Ressources supplémentaires

- [Documentation des scripts](../README.md) - Vue d'ensemble
- [Guide de développement](../../docs/DEVELOPMENT.md) - Développement
- [Documentation des tests](../../docs/TESTING.md) - Tests détaillés
- [Configuration Jest](https://jestjs.io/docs/configuration)
- [Configuration Playwright](https://playwright.dev/docs/test-configuration)

---

[← Retour à la documentation des scripts](../README.md) | [Scripts Utils →](../utils/README.md)
