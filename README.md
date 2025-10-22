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

### Scripts

| Dossier | Description |
|---------|-------------|
| [Setup](scripts/setup/README.md) | Installation |
| [Docker](scripts/docker/README.md) | Gestion Docker |
| [Database](scripts/db/README.md) | Scripts BDD |
| [Health](scripts/health/README.md) | Santé services |

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


### Diagnostics

make health # Santé services
make ps # Liste conteneurs
make status # Statut détaillé


📖 **[Documentation complète](docs/MAKEFILE.md)**

---

**[⬆ Retour en haut](#jobbingtrack-)**
