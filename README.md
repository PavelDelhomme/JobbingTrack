# 🎯 JobbingTrack - Plateforme de Suivi de Candidatures

> **Version 1.0.1** | **Architecture Microservices** | **Next.js 14** | **Flutter** | **PostgreSQL** | **Docker**

[![Version](https://img.shields.io/badge/Version-v1.0.1-green.svg)](https://github.com/PavelDelhomme/JobbingTrack)
[![Status](https://img.shields.io/badge/Status-BETA-blue.svg)]()
[![Backend](https://img.shields.io/badge/Backend-Node.js_20-green.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-Next.js_14-black.svg)]()
[![Mobile](https://img.shields.io/badge/Mobile-Flutter_3-blue.svg)]()
[![Database](https://img.shields.io/badge/Database-PostgreSQL_15-blue.svg)]()
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)]()

---

## 📖 Documentation

### 📚 Documentation Principale

- **[STATUS.md](STATUS.md)** - État complet du projet et avancement
- **[MAIL.md](MAIL.md)** - Configuration envoi d'emails (SMTP)
- **[Index Documentation](docs/INDEX_DOCUMENTATION.md)** | **[README Docs](docs/README.md)** | **[Navigation](docs/navigation.md)**

### 🚀 Démarrage Rapide
- **[⚡ Guide de Démarrage](docs/getting-started/README.md)** - Commencez ici !
- **[🚀 Démarrage Ultra-Rapide](docs/getting-started/DEMARRAGE_RAPIDE.md)** - 3 commandes
- **[🔄 Guide de Redémarrage](docs/getting-started/REDEMARRAGE.md)** - Redémarrer le projet

### 🧪 Tests & Parcours
- **[🚶 Guide Tests & Parcours](docs/development/GUIDE_TESTS_PARCOURS.md)** - Utiliser tous les outils de test
- **[🎯 Récapitulatif Final](docs/RECAPITULATIF_FINAL.md)** - Vue d'ensemble complète
- **Interface Tests** : `http://localhost:8080/backoffice/user-journey`

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
- 📱 Application mobile Flutter
- 📊 Système de monitoring et analytics mobile (en développement)

---

## 🚀 Démarrage Rapide

### Prérequis

- Docker & Docker Compose
- Node.js 20.x
- Make

### Installation

#### 1. Clonner
```bash
git clone https://github.com/PavelDelhomme/JobbingTrack.git
```
```bash
cd JobbingTrack
```
#### 2. Démarrer
```bash
make up
```
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
make up-for-tests # Services pour tests de parcours ⭐ NOUVEAU
make health       # Vérifier santé
```

### 🧪 Pour Tester les Parcours Utilisateur

**⚠️ Important** : Les tests de parcours nécessitent les services backend !

```bash
# 1. Démarrer les services de test
make up-for-tests

# 2. Attendre 10-15 secondes

# 3. Ouvrir le navigateur
# http://localhost:8080/backoffice/user-journey
```

📖 **Guide complet** : [DEMARRAGE_TESTS_PARCOURS.md](DEMARRAGE_TESTS_PARCOURS.md)

### Aide Contextuelle Intégrée

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
| ⭐ [Guide de Setup Complet](docs/getting-started/GUIDE_SETUP_COMPLET.md) | **NOUVEAU** : Setup complet depuis zéro avec commande `make setup` |
| ⭐ [Guide d'Installation](docs/getting-started/GUIDE_INSTALLATION.md) | **NOUVEAU** : Installation complète Docker, configuration, dépannage |
| 📁 [Guide d'Amélioration Structure](docs/getting-started/GUIDE_STRUCTURE.md) | **NOUVEAU** : Simplifier et clarifier la structure du projet |
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
```bash
make up # Services essentiels
make up-full # Tous les services
make down # Arrêter
```

### Gestion Services
```bash
make start-auth
make stop-service SERVICE=backend
make logs-service SERVICE=frontend
```

### Tests
```bash
make test-setup # Configuration tests
make test # Tests complets
make test-unit # Tests unitaires
make test-e2e # Tests E2E (Playwright)
make test-docker-images # Tests images Docker
make test-system-verify # Vérification système
```
📖 **[Guide des tests](tests/README.md)**

### Diagnostics
```bash
make health # Santé services
make ps # Liste conteneurs
make status # Statut détaillé
```

📖 **[Documentation complète Makefile](docs/development/makefile/README.md)** | 📄 **[Documentation PDF Complète](docs/pdfs/documentation-complete.pdf)**

## 🚧 En Développement

### 🚶 Parcours Utilisateur - Tests Automatisés
**Statut** : ✅ **DISPONIBLE**  
**Priorité** : Haute  
**URL** : `/backoffice/user-journey`

Nouvelle page de test permettant d'exécuter et analyser automatiquement tous les scénarios de parcours utilisateur complets (inscription → candidatures → relances → entretiens → statistiques).

**Fonctionnalités** :
- ▶️ **4 scénarios prédéfinis** : Complet, Rapide, Chercheur Actif, Nouvel Utilisateur
- 📊 **Analytics en temps réel** : Durée, taux de réussite, étapes échouées
- 💾 **Export JSON** : Sauvegarde des résultats de test
- 🎯 **8 étapes testées** : Register, Login, Applications, Contacts, Interviews, Followups, Calls, Statistics
- 🆕 **🛑 Annulation en cours** : Stoppez un test pendant son exécution
- 🆕 **💾 Sauvegarde automatique** : Résultats conservés après rechargement (localStorage)
- 🆕 **🗑️ Gestion historique** : Effacez complètement l'historique sauvegardé

**📖 Guides** : 
- [`GUIDE_TESTS_PARCOURS.md`](docs/development/GUIDE_TESTS_PARCOURS.md) ⭐ - Guide complet
- [`NOUVELLES_FONCTIONNALITES_PARCOURS.md`](NOUVELLES_FONCTIONNALITES_PARCOURS.md) 🆕 - Annulation & Sauvegarde

---

### 📊 Système de Monitoring et Analytics Mobile
**Statut** : 📋 Documenté (À Implémenter)  
**Priorité** : Haute  

Système complet de collecte et d'analyse des métriques de l'application mobile Flutter pour détecter les erreurs, analyser les performances et comprendre le comportement des utilisateurs.

**Documentation Complète** :
- 📄 [`docs/mobile/analytics/SUMMARY.md`](docs/mobile/analytics/SUMMARY.md) - Vue d'ensemble
- 🔧 [`docs/mobile/analytics/INTEGRATION.md`](docs/mobile/analytics/INTEGRATION.md) - Guide d'implémentation
- 🔐 [`docs/mobile/analytics/PRIVACY.md`](docs/mobile/analytics/PRIVACY.md) - Conformité RGPD
- 📊 [`docs/mobile/analytics/DASHBOARD.md`](docs/mobile/analytics/DASHBOARD.md) - Templates dashboard

**Composants à Créer** :
- 🔧 Backend : Service `mobile-analytics-service` (10+ endpoints API)
- 📱 Flutter : SDK Analytics complet (9 fichiers)
- 📊 Dashboard : Interface de visualisation des métriques
- 🐛 Monitoring : Crashes, performances, événements utilisateurs
- 📈 Analytics : Statistiques d'utilisation par module mobile

**Plan d'Implémentation** : 9-14 jours (voir [`TODO_NEXT_STEPS.md`](TODO_NEXT_STEPS.md))

### 🤖 Machine Learning & Matching
**TODO: Ajouter du vecteur et de l'embedding pour le traitement des données et analyse, afin de déterminer les profil utilisateur et le matching avec la candidature a laquelle il ont postuler afin de savoir si le profil est compatible avec la candidature**
---

**[⬆ Retour en haut](#jobbingtrack-)**
