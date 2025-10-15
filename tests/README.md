# 🧪 Tests Automatisés - Structure Complète

Suite complète de tests automatisés organisée pour garantir la qualité et la stabilité de JobbingTrack.

## 📁 Structure Organisée

```
tests/
├── README.md                    # ← Documentation (ce fichier)
│
├── data/                       # Données de test pour tests automatisés
│   ├── test-users.json         # Utilisateurs avec différents rôles
│   ├── test-companies.json     # Entreprises fictives pour tests
│   └── test-applications.json  # Candidatures avec différents statuts
│
├── e2e/                        # Tests end-to-end avec Playwright
│   ├── specs/                  # Tests organisés par fonctionnalité
│   │   ├── login.spec.ts       # Tests d'authentification
│   │   └── ...
│   ├── fixtures/               # Données de test réutilisables
│   │   └── test-data.ts        # Fixtures TypeScript
│   ├── utils/                  # Utilitaires pour tests e2e
│   │   └── test-helpers.ts     # Fonctions helper
│   └── playwright.config.ts    # Configuration Playwright
│
├── application-tests.sh        # Tests d'application
├── auth-tests.sh              # Tests d'authentification
├── automated-tests.sh         # Tests automatisés complets
└── cleanup.sh                 # Nettoyage après tests
```

## 🎯 Types de Tests

### 🏥 Tests de Santé
- **Vérification automatique** de tous les services
- **Tests de connectivité** base de données et Redis
- **Tests d'API** endpoints critiques
- **Monitoring continu** avec seuils d'alerte

### 🔐 Tests d'Authentification
- **Inscription** avec validation complète
- **Connexion** avec JWT et cookies sécurisés
- **Reset password** avec tokens temporaires
- **Gestion profils** utilisateurs et rôles

### 📊 Tests d'Intégration
- **CRUD complet** sur toutes les entités
- **Workflows métier** de bout en bout
- **Tests de performance** avec métriques
- **Tests de sécurité** anti-injection et XSS

### 🎭 Tests End-to-End (E2E)
- **Navigation complète** interface utilisateur
- **Interactions utilisateur** réalistes
- **Tests cross-browser** (Chrome, Firefox, Safari)
- **Tests responsive** mobile et desktop

## 🚀 Démarrage Rapide

### Tests Automatisés Complets
```bash
# Tous les tests automatisés
./tests/automated-tests.sh

# Tests d'application spécifiques
./tests/application-tests.sh

# Tests d'authentification
./tests/auth-tests.sh
```

### Tests End-to-End
```bash
# Tests e2e avec interface graphique
npx playwright test --ui

# Tests headless (CI/CD)
npx playwright test

# Tests spécifiques
npx playwright test login.spec.ts
```

### Tests de Développement
```bash
# Tests de santé rapides
make test-services

# Tests unitaires (lorsque implémentés)
npm run test

# Coverage (lorsque implémenté)
npm run test:coverage
```

## 📊 Données de Test

### Utilisateurs de Test
```json
{
  "admin": {
    "email": "redacted@example.invalid",
    "password": "password123",
    "role": "ADMIN"
  },
  "user": {
    "email": "redacted@example.invalid",
    "password": "password123",
    "role": "USER"
  }
}
```

### Entreprises de Test
- **TechCorp** : Technologie, 50-200 employés
- **DataSoft** : Logiciels, 200-500 employés
- **GreenEnergy** : Énergie, 500+ employés

### Candidatures de Test
- **Statuts variés** : APPLIED, INTERVIEW, REJECTED, etc.
- **Données réalistes** pour tests de filtrage
- **Relations cohérentes** entre entités

## 🔧 Configuration

### Playwright
- **Navigateurs supportés** : Chromium, Firefox, WebKit
- **Mode headless** par défaut pour CI/CD
- **Captures d'écran** automatiques en cas d'échec
- **Parallélisation** pour performance optimale

### Variables d'Environnement
```bash
# Tests e2e
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_TIMEOUT=30000

# Tests API
API_BASE_URL=http://localhost:3000/api/v1
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/jobbingtrack_test
```

## 📈 Métriques et Rapports

### Coverage de Tests
- **Unitaires** : >90% objectif
- **Intégration** : 100% workflows critiques
- **E2E** : 80% fonctionnalités principales

### Performance
- **Temps d'exécution** < 5 minutes pour suite complète
- **Parallélisation** automatique des tests
- **Retry automatique** en cas d'échec intermittent

## 🚨 Alertes et Monitoring

### Seuils d'Alerte
- **Disponibilité services** < 99% → Alerte critique
- **Temps de réponse** > 1000ms → Alerte warning
- **Taux d'erreur** > 1% → Alerte warning

### Rapports Automatisés
- **Rapports HTML** avec captures d'écran
- **Intégration CI/CD** avec GitHub Actions
- **Notifications** Slack/Discord en cas d'échec

## 🔄 Pipeline CI/CD

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
      - run: npm run test:e2e
```

## 📚 Documentation Détaillée

Voir la [documentation principale](../../README.md) pour :
- Tutoriels avancés de développement
- Guide de déploiement en production
- Référence complète de l'API

## 🤝 Contribution

### Ajout de Tests
1. **Comprendre les données** de test existantes
2. **Suivre les patterns** établis
3. **Documenter** les nouveaux tests
4. **Maintenir la qualité** avec coverage approprié

### Bonnes Pratiques
- **Tests indépendants** : Chaque test exécutable seul
- **Données cohérentes** : Utiliser les fixtures fournies
- **Assertions claires** : Messages d'erreur explicites
- **Nettoyage automatique** : Cleanup après chaque test
