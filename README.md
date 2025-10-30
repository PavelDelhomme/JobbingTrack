# JobbingTrack 🚀

> Système de suivi de candidatures avec dashboard administrateur

## 📖 Documentation

### 📚 [Documentation Complète](docs/README.md) | 🧭 [Navigation Complète](docs/navigation.md) 
##  **[⚡ Guide de Démarrage Rapide](docs/getting-started/README.md)** - Commencez ici !

Accès rapide à toute la documentation du projet : architecture, API, déploiement, développement, tests, guides et bien plus.

---

## 📋 Table des Matières

- [📖 Documentation](#-documentation)
- [🎯 Fonctionnalités](#-fonctionnalités)
- [🚀 Démarrage Rapide](#-démarrage-rapide)
- [🛠️ Commandes Make](#️-commandes-make)
- [📖 Documentation Détaillée](#-documentation-détaillée)

---

## 🎯 Fonctionnalités

- ✅ Dashboard administrateur Next.js
- ✅ Microservices backend Node.js
- ✅ Monitoring temps réel
- ✅ Gestion services via interface web

---

## 🚀 Démarrage Rapide

### Prérequis

- Docker & Docker Compose
- Node.js 20.x
- Make

### Installation

#### 1. Clonner

git clone https://github.com/PavelDelhomme/JobbingTrack.git
cd JobbingTrack

#### 2. Démarrer

make up

#### 3. Accéder

- **Frontend** : http://localhost:8000
- **API Gateway** : http://localhost:3000
- **cAdvisor** : http://localhost:8081
- **Metrics Aggregator** : http://localhost:8082
- **Grafana** : http://localhost:8083 (admin/admin)
- **Prometheus** : http://localhost:9090
- **Alertmanager** : http://localhost:8085

### Commandes Essentielles

```bash
make              # Afficher l'aide complète
make up           # Services essentiels
make up-full      # Tous les services
make health       # Vérifier santé
```

### ⭐ Nouveau : Aide Contextuelle Intégrée

```bash
# Aide par module
make help-services     # Services (up, down, restart)
make help-frontend     # Frontend Next.js
make help-backend      # Backend/monitoring
make help-database     # Base de données
make help-compilation  # Build/rebuild
make help-diagnostic   # Diagnostic
make help-tests        # Tests
make help-utils        # Utilitaires
```

📖 **[Guide complet Makefile](docs/development/makefile/README.md)**

---

## 📖 Documentation Détaillée

### 📚 [Documentation Complète](docs/README.md) | 🧭 [Navigation Complète](docs/navigation.md)

#### 🚀 Démarrage et Installation
| Guide | Description |
|-------|-------------|
| [Installation Rapide](docs/deployment/getting-started/README.md) | Guide d'installation et configuration initiale |
| [Configuration Développement](docs/development/setup/README.md) | Environnement de développement Node.js, Docker, Prisma |
| [Workflow Développement](docs/development/workflow/README.md) | Processus et bonnes pratiques de développement |
| ⭐ [Guide Makefile](docs/development/makefile/README.md) | **NOUVEAU** : Système complet avec aide intégrée |

#### 🏗️ Architecture et Services
| Guide | Description |
|-------|-------------|
| [Architecture Microservices](docs/core/architecture/README.md) | Architecture technique complète 18+ microservices |
| [Services Détaillés](docs/core/services/README.md) | Documentation de chaque microservice |
| [Base de Données](docs/database/README.md) | Structure PostgreSQL, schémas et relations |
| [Analyses BDD](docs/database/analysis/) | Audits et analyses comparatives |

#### 📡 API et Intégration
| Guide | Description |
|-------|-------------|
| [API Reference](docs/api/api-reference/README.md) | Documentation complète des APIs REST |
| [Endpoints](docs/api/endpoints/README.md) | Liste exhaustive de tous les endpoints |

#### 💻 Développement et Tests
| Guide | Description |
|-------|-------------|
| [Tests et Qualité](docs/development/testing/README.md) | Stratégies de tests (unit, integration, E2E) |
| [Guide Tests](tests/README.md) | Suite de tests complète et exécution |
| [Frontend Next.js](docs/frontend/guide/README.md) | Développement interface TypeScript + Tailwind |
| [Mobile Flutter](docs/mobile/guide/README.md) | Application mobile cross-platform |

#### 🚀 Déploiement et Production
| Guide | Description |
|-------|-------------|
| [Déploiement Production](docs/deployment/production/README.md) | Configuration et déploiement production |
| [Sécurité](docs/deployment/security/README.md) | Configuration sécurité et bonnes pratiques |
| [Guide Sécurité](docs/security/guide/README.md) | Authentification, autorisations, protection |

#### 🔧 Administration et Maintenance
| Guide | Description |
|-------|-------------|
| [Guide Administration](docs/administration/README.md) | Administration système et dashboard |
| [Dépannage](docs/troubleshooting/guide/README.md) | Solutions aux problèmes courants |
| [Performance](docs/performance/guide/README.md) | Optimisations et monitoring performance |

#### 📊 Analyses et Audits
| Document | Description |
|----------|-------------|
| [Audit Complet Projet](docs/database/analysis/comprehensive-project-audit/README.md) | Audit complet du projet v4.1 |
| [Analyse Structure Données](docs/database/analysis/data-structure-analysis/README.md) | Analyse comparative structure BDD |
| [Architecture Métriques](docs/architecture/metrics/README.md) | Système de métriques final |
| [Changelog](docs/changelog/all-changes.md) | Historique complet des modifications |

### Scripts

| Dossier | Description |
|---------|-------------|
| [Setup](scripts/setup/README.md) | Installation |
| [Docker](scripts/docker/README.md) | Gestion Docker |
| [Database](scripts/db/README.md) | Scripts BDD |
| [Health](scripts/health/README.md) | Santé services |
| [Tests](tests/README.md) | Suite de tests complète |

---

## 🛠️ Commandes Make

### Démarrage
make up # Services essentiels
make up-full # Tous les services
make down # Arrêter


### Gestion Services

make start-auth
make stop-service SERVICE=backend
make logs-service SERVICE=frontend


### Tests

make test-setup # Configuration tests
make test # Tests complets
make test-unit # Tests unitaires
make test-e2e # Tests E2E (Playwright)
make test-docker-images # Tests images Docker
make test-system-verify # Vérification système

📖 **[Guide des tests](tests/README.md)**

### Diagnostics

make health # Santé services
make ps # Liste conteneurs
make status # Statut détaillé


📖 **[Documentation complète Makefile](docs/development/makefile/README.md)** | 📄 **[Documentation PDF Complète](docs/pdfs/documentation-complete.pdf)**

---

**[⬆ Retour en haut](#jobbingtrack-)**
