# 🚀 JobbingTrack - Plateforme de Gestion de Candidatures

[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-3.0.0-orange.svg)](https://github.com/yourusername/jobbingtrack)

> **Plateforme complète de gestion de candidatures et de recrutement** avec architecture microservices, monitoring intégré et déploiement automatisé.

## 📚 Documentation Téléchargeable

### 📖 **[Documentation Complète](https://github.com/OWNER/JobbingTrack/blob/main/README.md)**
- Vue d'ensemble complète du projet JobbingTrack
- Architecture technique détaillée
- Guides de démarrage et d'utilisation
- Documentation API complète
- **📥 [Télécharger en PDF](https://github.com/OWNER/JobbingTrack/raw/main/docs/pdfs/documentation-complete.pdf)**

### 🚀 **[Guide de Démarrage Rapide](https://github.com/OWNER/JobbingTrack/blob/main/GUIDE-DEMARRAGE-RAPIDE.md)**
- Installation et configuration express
- Premiers pas avec JobbingTrack
- Configuration des services
- **📥 [Télécharger en PDF](https://github.com/OWNER/JobbingTrack/raw/main/docs/pdfs/guide-demarrage-rapide.pdf)**

### 📋 **[Historique des Versions](https://github.com/OWNER/JobbingTrack/blob/main/VERSION.md)**
- Évolution complète du projet
- Fonctionnalités par version
- Roadmap et planning
- **📥 [Télécharger en PDF](https://github.com/OWNER/JobbingTrack/raw/main/docs/pdfs/VERSION.pdf)**

### 📖 **[Documentation Services](https://github.com/OWNER/JobbingTrack/blob/main/docs/services.md)**
- Description détaillée de tous les services
- Configuration et utilisation
- **📥 [Télécharger en PDF](https://github.com/OWNER/JobbingTrack/raw/main/docs/pdfs/services.pdf)**

### 📋 **[Guide Makefile](https://github.com/OWNER/JobbingTrack/blob/main/docs/makefile-guide.md)**
- Toutes les commandes disponibles
- Guide d'utilisation détaillé
- **📥 [Télécharger en PDF](https://github.com/OWNER/JobbingTrack/raw/main/docs/pdfs/makefile-guide.pdf)**

### 🏗️ **[Guide Architecture](https://github.com/OWNER/JobbingTrack/blob/main/docs/architecture-guide.md)**
- Architecture technique complète
- Diagrammes et schémas
- **📥 [Télécharger en PDF](https://github.com/OWNER/JobbingTrack/raw/main/docs/pdfs/architecture-guide.pdf)**

### 🗄️ **[Guide Base de données](https://github.com/OWNER/JobbingTrack/blob/main/docs/database-guide.md)**
- Configuration et utilisation PostgreSQL
- Migrations et sauvegardes
- **📥 [Télécharger en PDF](https://github.com/OWNER/JobbingTrack/raw/main/docs/pdfs/database-guide.pdf)**

### 🚀 **[Guide Déploiement](https://github.com/OWNER/JobbingTrack/blob/main/docs/deployment-production.md)**
- Déploiement en production
- Configuration Docker et Kubernetes
- **📥 [Télécharger en PDF](https://github.com/OWNER/JobbingTrack/raw/main/docs/pdfs/deployment-production.pdf)**

## 📋 Table des matières

- [🚀 Démarrage rapide](#-démarrage-rapide)
- [🏗️ Architecture](#️-architecture)
- [📁 Structure du projet](#-structure-du-projet)
- [🛠️ Scripts et outils](#️-scripts-et-outils)
- [📊 Monitoring et métriques](#-monitoring-et-métriques)
- [🔧 Développement](#-développement)
- [🚢 Déploiement](#-déploiement)
- [🔒 Sécurité](#-sécurité)
- [📚 Documentation](#-documentation)
- [🧪 Tests](#-tests)
- [🤝 Contribution](#-contribution)
- [📄 License](#-license)

## 🚀 Démarrage rapide

### Prérequis

- **Docker** et **Docker Compose**
- **Node.js** 18+ et **npm**
- **PostgreSQL** client (optionnel)
- **Git**

### Installation rapide

```bash
# 1. Cloner le repository
git clone https://github.com/AdminJobbingTrack/jobbingtrack.git
cd jobbingtrack

# 2. Installer les dépendances système
make install-deps

# 3. Démarrer les services essentiels
make up

# 4. Créer l'utilisateur administrateur
make db-seed

# 5. Accéder à l'application
# Frontend: http://localhost:8080
# API Gateway: http://localhost:3000
# Admin: admin@jobbingtrack.test / SuperAdmin123!
```

### Démarrage avec monitoring complet

```bash
# Démarrer tous les services avec métriques
make up-full

# Vérifier l'état du système
make health

# Voir les métriques
make metrics  # Prometheus
make cadvisor # cAdvisor
```

## 🏗️ Architecture

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                    JobbingTrack - Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 Frontend (React/Next.js)                                    │
│     ├── Dashboard administrateur                                │
│     ├── Interface de gestion des candidatures                   │
│     └── API de gestion des services                             │
│                                                                 │
│  🚪 API Gateway (Node.js)                                       │
│     ├── Routage vers les microservices                          │
│     ├── Authentification JWT                                    │
│     └── Rate limiting                                           │
│                                                                 │
│  🗄️ Base de données (PostgreSQL)                                │
│     ├── Tables utilisateurs, entreprises, candidatures          │
│     ├── Relations et contraintes                                │
│     └── Sauvegardes automatiques                                │
│                                                                 │
│  💾 Cache (Redis)                                               │
│     ├── Sessions utilisateur                                    │
│     ├── Cache d'API                                             │
│     └── Files temporaires                                       │
│                                                                 │
│  📊 Monitoring (Prometheus + Grafana + cAdvisor)                │
│     ├── Métriques système et applicatives                       │
│     ├── Dashboards de supervision                               │
│     └── Alertes automatiques                                    │
│                                                                 │
│  🔧 Microservices métier                                        │
│     ├── Authentification                                        │
│     ├── Gestion des candidatures                                │
│     ├── Gestion des entreprises                                 │
│     ├── Gestion des contacts                                    │
│     ├── Gestion des entretiens                                  │
│     ├── Notifications                                           │
│     ├── Workflows                                               │
│     └── Analytics                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Services essentiels (toujours démarrés)

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL** | 5432 | Base de données principale |
| **Redis** | 6379 | Cache et sessions |
| **API Gateway** | 3000 | Point d'entrée unique |
| **Frontend** | 8080 | Interface utilisateur |
| **Metrics Aggregator** | 3014 | Collecte des métriques |
| **cAdvisor** | 8080 | Monitoring Docker |

### Services optionnels (avec profiles)

| Profile | Services | Description |
|---------|----------|-------------|
| `auth` | auth-service | Gestion de l'authentification |
| `applications` | application-service | Gestion des candidatures |
| `companies` | company-service | Gestion des entreprises |
| `contacts` | contact-service | Gestion des contacts |
| `interviews` | interview-service | Gestion des entretiens |
| `notifications` | notification-service | Système de notifications |
| `monitoring` | prometheus, grafana | Surveillance complète |

## 📁 Structure du projet

```
jobbingtrack/
├── 📁 backend/                          # Services backend
│   ├── api-gateway/                     # API Gateway principal
│   ├── auth-service/                    # Service d'authentification
│   ├── application-service/             # Gestion des candidatures
│   ├── company-service/                 # Gestion des entreprises
│   ├── contact-service/                 # Gestion des contacts
│   ├── interview-service/               # Gestion des entretiens
│   ├── notification-service/            # Notifications
│   ├── dashboard-service/               # Analytics
│   ├── call-service/                    # Gestion des appels
│   ├── event-service/                   # Gestion des événements
│   ├── followup-service/                # Suivi des candidatures
│   ├── profile-service/                 # Gestion des profils
│   ├── workflow-service/                # Workflows
│   ├── metrics-aggregator-service/      # Métriques système
│   └── security-service/                # Sécurité
│
├── 📁 frontend/                         # Application frontend
│   ├── src/
│   │   ├── app/                         # Pages Next.js
│   │   ├── components/                  # Composants React
│   │   └── backoffice/                  # Interface admin
│   ├── public/                          # Assets statiques
│   └── tailwind.config.js               # Configuration Tailwind
│
├── 📁 scripts/                          # Scripts d'automatisation
│   ├── README.md                        # Documentation des scripts
│   ├── core/                           # Démarrage/arrêt/vérification
│   │   ├── start.sh                    # Démarrage système
│   │   ├── stop.sh                     # Arrêt système
│   │   └── check.sh                    # Vérification santé
│   ├── setup/                          # Installation
│   │   └── install-dependencies.sh     # Dépendances système
│   ├── database/                       # Base de données
│   │   ├── create-admin-user.sh        # Utilisateur admin
│   │   └── backup.sh                   # Sauvegardes
│   ├── deployment/                     # Déploiement
│   ├── development/                    # Développement
│   ├── monitoring/                     # Surveillance
│   ├── security/                       # Sécurité
│   ├── testing/                        # Tests
│   │   └── run-tests.sh                # Tests automatisés
│   ├── utilities/                      # Utilitaires
│   │   ├── docker-exec.sh              # Exécution Docker
│   │   └── wait-for-service.sh         # Attente de service
│   ├── docker/                         # Utilitaires Docker
│   │   └── cleanup.sh                  # Nettoyage système
│   ├── health/                         # Health checks
│   │   └── check-all.sh                # Vérification complète
│   ├── utils/                          # Outils divers
│   ├── config/                         # Configuration
│   ├── docs/                           # Documentation
│   ├── test/                           # Tests
│   └── ci/                             # CI/CD
│
├── 📁 config/                          # Configuration centralisée
│   ├── services.json                   # Définition des services
│   └── profiles.json                   # Définition des profiles
│
├── 📁 docs/                            # Documentation
│   ├── SERVICES.md                     # Documentation des services
│   ├── API.md                         # Documentation de l'API
│   ├── MAKEFILE.md                    # Documentation du Makefile
│   ├── ARCHITECTURE.md                # Architecture système
│   ├── DEVELOPMENT.md                 # Guide de développement
│   ├── DEPLOYMENT.md                  # Guide de déploiement
│   └── TROUBLESHOOTING.md             # Résolution de problèmes
│
├── 📁 data/                            # Données et fichiers
│   └── sql/                           # Scripts SQL
│
├── 📁 makefiles/                       # Sous-Makefiles
│   ├── backend/                       # Makefile backend
│   ├── frontend/                      # Makefile frontend
│   └── shared/                        # Fonctions communes
│
├── 📁 monitoring/                      # Configuration monitoring
│   ├── prometheus/                    # Configuration Prometheus
│   ├── grafana/                       # Dashboards Grafana
│   └── alertmanager/                  # Configuration alertes
│
├── 📁 production/                      # Configuration production
│   ├── nginx/                         # Configuration nginx
│   └── docker-compose.production.yml   # Compose production
│
├── 📁 tests/                          # Tests d'intégration
│   └── e2e/                          # Tests end-to-end
│
├── 📁 mobile/                         # Application mobile
│   ├── android/                       # Application Android
│   ├── ios/                          # Application iOS
│   └── lib/                          # Code partagé Flutter
│
├── 📁 deployment/                      # Scripts de déploiement
│
├── 📁 uploads/                        # Fichiers uploadés
│
├── 🐳 docker-compose.yml              # Configuration Docker Compose
├── 📋 Makefile                       # Makefile principal
├── ⚙️ .env.example                   # Variables d'environnement
├── 📖 README.md                      # Cette documentation
└── 🔧 config.json                    # Configuration globale
```

## 🛠️ Scripts et outils

### Démarrage rapide

```bash
# Services essentiels uniquement
make up

# Tous les services avec monitoring
make up-full

# Arrêt propre
make down

# Vérification de santé
make health

# Tests automatisés
make test
```

### Gestion des services

```bash
# Démarrer un profil spécifique
make up-profile PROFILE=auth
make up-profile PROFILE=monitoring

# Gestion individuelle
make start-auth
make stop-service SERVICE=api-gateway
make restart-service SERVICE=frontend
make logs-service SERVICE=postgres

# Monitoring
make metrics     # Prometheus
make cadvisor    # cAdvisor
```

### Base de données

```bash
# Sauvegarde et restauration
make db-backup
make db-restore file=backup.sql

# Migrations et seed
make db-migrate
make db-seed
make db-reset
```

### Développement

```bash
# Build et déploiement
make build
make rebuild
make clean

# Utilitaires
make shell SERVICE=postgres
make exec SERVICE=api-gateway CMD="npm install"
make check-deps
```

## 📊 Monitoring et métriques

### Interfaces disponibles

- **Frontend**: http://localhost:8080
- **API Gateway**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:4000 (admin/admin)
- **cAdvisor**: http://localhost:8080

### Métriques collectées

- **Système**: CPU, mémoire, disque, réseau
- **Docker**: Conteneurs, images, volumes
- **Application**: Requêtes, latence, erreurs
- **Base de données**: Connexions, requêtes lentes
- **Cache**: Hits/misses Redis

### Alertes configurées

- Services critiques down
- Utilisation mémoire > 90%
- Espace disque < 10%
- Erreurs API > seuil
- Latence > 5 secondes
