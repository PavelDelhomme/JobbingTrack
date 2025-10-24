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

git clone https://github.com/PavelDelhomme/JobbingTrack.git
cd JobbingTrack

#### 2. Démarrer

make up

#### 3. Accéder

open http://localhost:8080

### Commandes Essentielles

make # Afficher l'aide
make up # Service essentiels
make up-full # Tous les services
make health # Vérifier santé

📖 **[Guide complet Makefile](docs/MAKEFILE.md)**

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [🏗️ Architecture](docs/ARCHITECTURE.md) | Architecture système |
| [🚀 Développement](docs/DEVELOPMENT.md) | Guide développement |
| [🔧 Services](docs/SERVICES.md) | Services disponibles |
| [📡 API](docs/API.md) | Documentation API |
| [🐛 Dépannage](docs/TROUBLESHOOTING.md) | Résolution problèmes |
| [🧪 Tests](tests/README.md) | Suite de tests complète |

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
