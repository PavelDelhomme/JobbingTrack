# 🚀 JobbingTrack - Plateforme de Gestion de Candidatures

[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-3.0.0-orange.svg)](https://github.com/PavelDelhomme/JobbingTrack)
[![Node Version](https://img.shields.io/badge/node-20.x-green.svg)](package.json)

> **Plateforme complète de gestion de candidatures et de recrutement** avec architecture microservices, monitoring intégré et déploiement automatisé.

## 📑 Table des Matières

- [🎯 Fonctionnalités](#-fonctionnalités)
- [🚀 Démarrage Rapide](#-démarrage-rapide)
- [🏗️ Architecture](#️-architecture)
- [📖 Documentation](#-documentation)
- [🛠️ Commandes Make](#️-commandes-make)
- [🧪 Tests](#-tests)
- [🤝 Contribution](#-contribution)
- [📄 Licence](#-licence)

---

## 🎯 Fonctionnalités

- ✅ **Dashboard administrateur** avec Next.js
- ✅ **Microservices backend** (Node.js)
- ✅ **Système de métriques** en temps réel
- ✅ **Gestion des services** via interface web
- ✅ **Monitoring complet** avec cAdvisor et Prometheus
- ✅ **Authentification JWT** sécurisée
- ✅ **Base de données PostgreSQL** avec migrations
- ✅ **Cache Redis** pour les performances
- ✅ **Application mobile** Flutter
- ✅ **Déploiement Docker** automatisé

---

## 🚀 Démarrage Rapide

### Prérequis

- **Docker** & **Docker Compose**
- **Node.js** 20.x
- **Make** (recommandé)

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/PavelDelhomme/JobbingTrack.git
cd JobbingTrack

# 2. Lancer l'installation
make up

# 3. Accéder au dashboard
open http://localhost:8080
```

### Identifiants de connexion

- **Email** : `admin@jobbingtrack.com`
- **Mot de passe** : `SuperAdmin123!`

### Commandes Essentielles

```bash
make              # Affiche toutes les commandes
make up           # Démarre les services essentiels
make up-full      # Démarre TOUS les services
make down         # Arrête tous les services
make logs         # Voir les logs
make health       # Vérifier la santé des services
```

📖 **[Guide complet du Makefile](docs/MAKEFILE.md)**

---

## 🏗️ Architecture

Consultez la [documentation d'architecture complète](docs/ARCHITECTURE.md).

### Vue d'ensemble

```
JobbingTrack/
├── backend/           # Services backend
│   ├── api-gateway/   # Point d'entrée API
│   └── */            # Microservices
├── frontend/          # Dashboard Next.js
├── mobile/           # Application mobile Flutter
├── scripts/          # Scripts utilitaires
└── docs/             # Documentation
```

### Services Essentiels

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL** | 5432 | Base de données principale |
| **Redis** | 6379 | Cache et sessions |
| **API Gateway** | 3000 | Point d'entrée unique |
| **Frontend** | 8080 | Interface utilisateur |
| **Metrics Aggregator** | 3014 | Collecte des métriques |
| **cAdvisor** | 8080 | Monitoring Docker |

Voir aussi :
- [Services disponibles](docs/SERVICES.md)
- [Guide de développement](docs/DEVELOPMENT.md)

---

## 📖 Documentation

### Guides Principaux

| Document | Description |
|----------|-------------|
| [🏗️ Architecture](docs/ARCHITECTURE.md) | Architecture du système |
| [🚀 Développement](docs/DEVELOPMENT.md) | Guide de développement |
| [🔧 Services](docs/SERVICES.md) | Documentation des services |
| [📡 API](docs/API.md) | Documentation API REST |
| [🐛 Dépannage](docs/TROUBLESHOOTING.md) | Résolution de problèmes |

### Scripts Utilitaires

| Script | Description |
|--------|-------------|
| [Setup](scripts/setup/README.md) | Scripts d'installation |
| [Docker](scripts/docker/README.md) | Gestion Docker |
| [Database](scripts/db/README.md) | Scripts BDD |
| [Health](scripts/health/README.md) | Vérifications santé |
| [Core](scripts/core/README.md) | Scripts principaux |
| [Testing](scripts/testing/README.md) | Tests automatisés |
| [Utils](scripts/utils/README.md) | Utilitaires |

---

## 🛠️ Commandes Make

### Démarrage/Arrêt

```bash
make up              # Services essentiels uniquement
make up-full         # Tous les services
make down            # Arrêter tous les services
make restart         # Redémarrer
```

### Gestion des Services

```bash
make start-auth      # Démarrer service auth
make stop-service SERVICE=backend
make restart-service SERVICE=frontend
make logs-service SERVICE=api-gateway
```

### Diagnostics

```bash
make health          # Vérifier tous les services
make ps              # Lister les conteneurs
make status          # Statut détaillé
```

### Base de Données

```bash
make db-migrate      # Lancer les migrations
make db-seed         # Insérer données test
make db-backup       # Backup
```

📖 **[Documentation complète Makefile](docs/MAKEFILE.md)**

---

## 🧪 Tests

```bash
make test            # Tous les tests
make test-service SERVICE=backend
make test-integration # Tests d'intégration
```

Voir le [guide de test](docs/DEVELOPMENT.md#tests).

---

## 🤝 Contribution

Contributions bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md).

1. **Fork** le projet
2. **Créer** une branche (`git checkout -b feature/AmazingFeature`)
3. **Commit** (`git commit -m 'Add AmazingFeature'`)
4. **Push** (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

---

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE).

---

## 👥 Équipe

- **Pavel Delhomme** - *Développeur Principal* - [@PavelDelhomme](https://github.com/PavelDelhomme)

---

## 📞 Support

- 📧 **Email** : support@jobbingtrack.com
- 🐛 **Issues** : [GitHub Issues](https://github.com/PavelDelhomme/JobbingTrack/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/PavelDelhomme/JobbingTrack/discussions)

---

**[⬆ Retour en haut](#-jobbingtrack---plateforme-de-gestion-de-candidatures)**

---

## 📚 Documentation Téléchargeable

### 📖 **[Documentation Complète](docs/pdfs/documentation-complete.pdf)**
- Vue d'ensemble complète du projet JobbingTrack
- Architecture technique détaillée
- Guides de démarrage et d'utilisation
- Documentation API complète

### 🚀 **[Guide de Démarrage Rapide](docs/pdfs/guide-demarrage-rapide.pdf)**
- Installation et configuration express
- Premiers pas avec JobbingTrack
- Configuration des services

### 📋 **[Historique des Versions](docs/pdfs/VERSION.pdf)**
- Évolution complète du projet
- Fonctionnalités par version
- Roadmap et planning

### 📖 **[Documentation Services](docs/pdfs/services.pdf)**
- Description détaillée de tous les services
- Configuration et utilisation

### 📋 **[Guide Makefile](docs/pdfs/makefile-guide.pdf)**
- Toutes les commandes disponibles
- Guide d'utilisation détaillé

### 🏗️ **[Guide Architecture](docs/pdfs/architecture-guide.pdf)**
- Architecture technique complète
- Diagrammes et schémas

### 🗄️ **[Guide Base de données](docs/pdfs/database-guide.pdf)**
- Configuration et utilisation PostgreSQL
- Migrations et sauvegardes

### 🚀 **[Guide Déploiement](docs/pdfs/deployment-production.pdf)**
- Déploiement en production
- Configuration Docker et Kubernetes

---

*Dernière mise à jour : Janvier 2025*