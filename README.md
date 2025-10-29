# JobbingTrack 🚀

> Système de suivi de candidatures avec dashboard administrateur

## 📑 Table des Matières

- [🎯 Fonctionnalités](#-fonctionnalités)
- [🚀 Démarrage Rapide](#-démarrage-rapide)
- [📖 Documentation](#-documentation)
- [🛠️ Commandes Make](#️-commandes-make)

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

git clone https://github.com/OWNER/JobbingTrack.git
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

## 📖 Documentation

### 📚 [Documentation Complète](docs/README.md)

| Catégorie | Documents |
|-----------|----------|
| 🚀 **Démarrage** | [Installation](docs/deployment/getting-started/README.md) • [Configuration Dev](docs/development/setup/README.md) |
| 🏗️ **Architecture** | [Microservices](docs/core/architecture/README.md) • [Base de Données](docs/database/README.md) |
| 📡 **API** | [API Reference](docs/api/api-reference/README.md) • [Endpoints](docs/api/endpoints/README.md) |
| 💻 **Développement** | [Workflow](docs/development/workflow/README.md) • [Tests](docs/development/testing/README.md) |
| 🛠️ **Makefile** | ⭐ [Guide Complet avec Aide Intégrée](docs/development/makefile/README.md) |
| 📊 **Base de Données** | [Structure](docs/database/README.md) • [Analyses](docs/database/analysis/) |
| 🔧 **Administration** | [Guide Admin](docs/administration/README.md) |

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


📖 **[Documentation complète](docs/MAKEFILE.md)**

---

**[⬆ Retour en haut](#jobbingtrack-)**
