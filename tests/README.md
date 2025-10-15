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
make test-all

# Tests d'application spécifiques
make test-application

# Tests d'authentification
make test-auth
```

### Tests End-to-End
```bash
# Tests e2e avec interface graphique
make test-e2e-ui

# Tests headless (CI/CD)
make test-e2e

# Tests spécifiques
make test-e2e-specific
```

### Tests de Développement
```bash
# Tests de santé rapides
make test-services

# Tests unitaires frontend
make test-frontend

# Tests automatisés complets
make test-all
```

## 📊 Données de Test

### Utilisateurs de Test
```json
{
  "admin": {
    "email": "admin@example.com",
    "password": "password123",
    "role": "ADMIN"
  },
  "user": {
    "email": "test@example.com",
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

---

## 🧭 Navigation

### 📚 **Documentation Centrale**
- **[Accueil](../../README.md)** - Vue d'ensemble du projet
- **[Documentation Organisée](../../docs/README.md)** - Documentation complète
- **[Spécifications Techniques](../../docs/SPEC-TECHNIQUE-JOBBINGTRACK.md)** - Architecture détaillée

### 🚀 **Démarrage Rapide**
- **[Guide de Démarrage Rapide](../../GUIDE-DEMARRAGE-RAPIDE.md)** - Installation express
- **[Guide de Développement](../../docs/guides/getting-started.md)** - Développement et tests

### 🧪 **Tests et Qualité**
- **[Tests Automatisés](#lancement-des-tests)** - Suite complète organisée
- **[Tests de Santé](#tests-de-santé)** - Vérification services
- **[Tests d'Intégration](#tests-dintégration)** - Workflows complets
- **[Tests End-to-End](#tests-end-to-end-e2e)** - Interface utilisateur

### 📊 **Données de Test**
- **[Données de Test](#données-de-test)** - Utilisateurs, entreprises, candidatures
- **[Fixtures E2E](./e2e/fixtures/test-data.ts)** - Données réutilisables
- **[Helpers de Test](./e2e/utils/test-helpers.ts)** - Fonctions utilitaires

### 🔧 **Configuration**
- **[Playwright Config](./e2e/playwright.config.ts)** - Configuration E2E
- **[Variables d'Environnement](#configuration)** - Configuration tests
- **[Scripts de Test](./automated-tests.sh)** - Automatisation complète

### 📦 **Déploiement**
- **[Guide de Déploiement](../../docs/deployment/README.md)** - Production complète
- **[CI/CD](../../README.md#pipeline-cicd)** - Intégration continue
- **[Monitoring](../../docs/technical/README.md#monitoring)** - Métriques et alertes

### 🛠️ **Outils de Développement**
- **[Makefiles](../../makefiles/README.md)** - Commandes automatisées
- **[Scripts de Test](../../scripts/README.md)** - Outils spécialisés
- **[Données SQL](../data/README.md)** - Configuration base de données

### 📁 **Structure du Projet**
- **[Backend](../../backend/README.md)** - Architecture microservices
- **[Frontend](../../frontend/README.md)** - Dashboard Next.js
- **[Mobile](../../mobile/README.md)** - Application React Native
- **[API](../../docs/api/README.md)** - Documentation API complète
