# 📚 Documentation JobbingTrack

Documentation complète de la plateforme JobbingTrack - Plateforme de Gestion de Candidatures Professionnelles.

## 🏗️ Structure de la Documentation

```
/docs/
├── 📄 README.md                    # Ce fichier - Vue d'ensemble
├── 📁 technical/                   # Documentation technique détaillée
│   ├── architecture.md            # Architecture microservices
│   ├── database.md                # Schémas de base de données
│   ├── api.md                     # Documentation API REST
│   ├── security.md                # Sécurité et authentification
│   ├── deployment.md              # Déploiement et DevOps
│   └── performance.md             # Optimisations et performances
├── 📁 deployment/                  # Guides de déploiement
│   ├── development.md             # Environnement de développement
│   ├── production.md              # Déploiement en production
│   └── docker.md                  # Configuration Docker
├── 📁 api/                        # Documentation API
│   ├── v1/                        # Version actuelle de l'API
│   └── endpoints.md               # Liste complète des endpoints
├── 📁 guides/                     # Guides utilisateur
│   ├── getting-started.md         # Guide de démarrage
│   ├── administration.md          # Guide administrateur
│   └── troubleshooting.md         # Résolution de problèmes
└── 📁 scripts/                    # Documentation des scripts
    ├── makefiles.md               # Guide des Makefiles
    └── automation.md              # Scripts d'automatisation
```

## 🚀 Démarrage Rapide

### Installation et Configuration

1. **Prérequis** :
   ```bash
   # Docker et Docker Compose
   docker --version && docker-compose --version

   # Node.js 20+ (pour développement local)
   node --version
   ```

2. **Installation** :
   ```bash
   # Cloner le repository
   git clone https://github.com/PavelDelhomme/JobbingTrack.git
   cd JobbingTrack

   # Installation automatique
   make install
   ```

3. **Démarrage** :
   ```bash
   # Démarrer tout le projet
   make up

   # Ou avec reconstruction
   make start-all
   ```

### Accès à l'Application

- **Frontend** : http://localhost:8080
- **API Gateway** : http://localhost:3000
- **API Documentation** : http://localhost:3000/api-docs

### Identifiants de Connexion

```
📧 Email : admin@jobbingtrack.com
🔐 Mot de passe : SuperAdmin123!
```

## 🛠️ Développement

### Commandes Principales

```bash
# Développement
make dev              # Mode développement avec hot reload
make build            # Construire toutes les images

# Tests
make test-all         # Tous les tests
make test-e2e         # Tests end-to-end Playwright
make test-services    # Tests de santé des services

# Maintenance
make logs             # Logs en temps réel
make status           # État des services
make clean            # Nettoyage complet

# Diagnostic
make diagnose         # Diagnostic complet
make fix              # Correction automatique
make health           # Vérification santé
```

### Structure du Projet

```
JobbingTrack/
├── 📁 backend/                    # Microservices backend
│   ├── 📁 api-gateway/           # Point d'entrée API
│   ├── 📁 auth-service/          # Authentification JWT
│   ├── 📁 application-service/   # Gestion des candidatures
│   ├── 📁 company-service/       # Gestion des entreprises
│   ├── 📁 contact-service/       # Carnet d'adresses
│   ├── 📁 interview-service/     # Gestion des entretiens
│   ├── 📁 notification-service/  # Emails et notifications
│   └── 📁 dashboard-service/     # Analytics et métriques
├── 📁 frontend/                  # Interface Next.js
│   ├── 📁 src/
│   │   ├── 📁 app/              # Pages et composants
│   │   ├── 📁 components/       # Composants réutilisables
│   │   ├── 📁 hooks/            # Hooks personnalisés
│   │   └── 📁 lib/              # Utilitaires et services
│   └── 📁 tests/                # Tests Playwright E2E
├── 📁 scripts/                   # Scripts d'automatisation
├── 📁 makefiles/                 # Sous-Makefiles organisés
└── 📄 Makefile                   # Point d'entrée unifié
```

## 🎯 Fonctionnalités Clés

### ✅ Implémentées

- **🔍 Recherche Globale** : Indexation côté client avec recherche intelligente
- **📱 PWA** : Application progressive avec mode hors ligne
- **🎨 Personnalisation** : Thèmes, couleurs et préférences utilisateur
- **🔗 Intégrations** : LinkedIn API et calendriers externes
- **🧪 Tests E2E** : Suite complète de tests automatisés
- **🔒 Sécurité** : Authentification JWT, rôles et permissions
- **📊 Analytics** : Métriques temps réel et tableaux de bord

### 🚀 En Développement

- **🤖 IA/ML** : Analyse intelligente des candidatures
- **📱 App Mobile** : Applications iOS/Android natives
- **🔄 Synchronisation** : Sync multi-appareils avancée
- **📈 Reporting** : Rapports avancés et exports

## 🔧 Architecture Technique

### Backend (Microservices)
- **Node.js 20** + **Express.js** - Runtime et framework
- **PostgreSQL 15** - Base de données relationnelle
- **Redis 7** - Cache et sessions
- **Prisma ORM** - Mapping objet-relationnel
- **Docker Compose** - Orchestration

### Frontend (Next.js)
- **Next.js 14** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS
- **Zustand** - Gestion d'état
- **React Query** - Gestion des requêtes API

### DevOps & Monitoring
- **Docker** - Containerisation
- **Prometheus + Grafana** - Monitoring
- **GitHub Actions** - CI/CD
- **Playwright** - Tests E2E

## 📚 Guides Détaillés

### Pour Développeurs
- **[Guide de Développement](./technical/development.md)** - Environnement et workflows
- **[Architecture](./technical/architecture.md)** - Design et patterns
- **[API](./api/v1/README.md)** - Documentation des endpoints

### Pour Administrateurs
- **[Guide d'Administration](./guides/administration.md)** - Configuration et maintenance
- **[Déploiement](./deployment/production.md)** - Mise en production
- **[Sécurité](./technical/security.md)** - Bonnes pratiques

### Pour Utilisateurs
- **[Guide de Démarrage](./guides/getting-started.md)** - Premiers pas
- **[Fonctionnalités](./technical/features.md)** - Guide complet des features

## 🆘 Support et Aide

### Problèmes Courants
- **[Résolution de Problèmes](./guides/troubleshooting.md)** - Guide de dépannage
- **`make fix`** - Correction automatique des problèmes
- **`make diagnose`** - Diagnostic complet du système

### Contact
- **GitHub Issues** : https://github.com/PavelDelhomme/JobbingTrack/issues
- **Documentation** : https://github.com/PavelDelhomme/JobbingTrack/wiki

---

**🎯 JobbingTrack** - Votre plateforme de gestion de candidatures intelligente et moderne !
