# Guide de Développement - JobbingTrack

[← Retour au README principal](../README.md)

## 🎯 Vue d'ensemble

Ce guide couvre tout ce dont vous avez besoin pour développer et contribuer au projet JobbingTrack.

## 📋 Table des matières

- [🚀 Configuration de l'environnement](#-configuration-de-lenvironnement)
- [🏗️ Architecture du projet](#️-architecture-du-projet)
- [💻 Développement](#-développement)
- [🧪 Tests](#-tests)
- [🔧 Outils de développement](#-outils-de-développement)
- [📦 Déploiement](#-déploiement)
- [🤝 Contribution](#-contribution)

---

## 🚀 Configuration de l'environnement

### Prérequis

- **Node.js** 20.x ou supérieur
- **Docker** et **Docker Compose**
- **Git**
- **Make** (optionnel mais recommandé)

### Installation

```bash
# Cloner le repository
git clone https://github.com/OWNER/JobbingTrack.git
cd JobbingTrack

# Installer les dépendances
make install

# Démarrer l'environnement de développement
make dev
```

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
# Configuration de base
NODE_ENV=development
PORT=3000

# Base de données
DATABASE_URL=postgresql://admin@jobbingtrack.test:admin@jobbingtrack.test@localhost:5432/jobbingtrack?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# API Keys (optionnel)
SENDGRID_API_KEY=your-sendgrid-key
AWS_ACCESS_KEY_ID=your-aws-key
```

---

## 🏗️ Architecture du projet

### Structure générale

```
JobbingTrack/
├── backend/           # Services backend (microservices)
│   ├── api-gateway/   # Point d'entrée API
│   ├── auth-service/  # Authentification
│   ├── user-service/  # Gestion des utilisateurs
│   └── ...
├── frontend/          # Application Next.js
├── mobile/           # Application mobile Flutter
├── scripts/          # Scripts utilitaires
├── docs/             # Documentation
└── tests/            # Tests globaux
```

### Architecture des microservices

Consultez la [documentation d'architecture complète](architecture-guide.md) pour plus de détails.

---

## 💻 Développement

### Démarrage rapide

```bash
# Démarrer tous les services
make up

# Démarrer en mode développement
make dev

# Voir les logs
make logs
```

### Services backend

Chaque service backend suit la même structure :

```
service-name/
├── src/
│   ├── controllers/   # Contrôleurs API
│   ├── models/       # Modèles de données
│   ├── routes/       # Routes API
│   ├── services/     # Logique métier
│   └── utils/        # Utilitaires
├── tests/            # Tests du service
├── package.json
└── Dockerfile
```

### Frontend (Next.js)

```bash
# Démarrer le frontend en mode développement
cd frontend
npm run dev

# Tests
npm test

# Build
npm run build
```

### Mobile (Flutter)

```bash
# Démarrer l'app mobile
cd mobile
flutter run

# Tests
flutter test

# Build
flutter build apk
```

---

## 🧪 Tests

### Types de tests

1. **Tests unitaires** : Tests des composants individuels
2. **Tests d'intégration** : Tests des interactions entre services
3. **Tests E2E** : Tests end-to-end de l'application

### Exécution des tests

```bash
# Tous les tests
make test

# Tests unitaires
make test-unit

# Tests d'intégration
make test-integration

# Tests E2E
make test-e2e

# Tests avec couverture
make test-coverage
```

### Configuration des tests

- **Jest** pour les tests unitaires (frontend/backend)
- **Playwright** pour les tests E2E
- **Supertest** pour les tests d'API

---

## 🔧 Outils de développement

### Makefile

Le Makefile principal centralise toutes les commandes :

```bash
# Afficher l'aide
make help

# Démarrage/arrêt
make up              # Démarrer services essentiels
make down            # Arrêter tous les services
make restart         # Redémarrer

# Développement
make dev             # Mode développement
make logs            # Voir les logs
make health          # Vérifier la santé

# Base de données
make db-migrate      # Migrations
make db-seed         # Données de test
make db-backup       # Backup

# Tests
make test            # Tous les tests
make test-coverage   # Tests avec couverture
```

### Scripts utilitaires

Consultez la [documentation des scripts](../scripts/README.md) pour plus de détails.

### Docker

```bash
# Construire toutes les images
make build

# Nettoyer les images
make clean

# Voir l'état des conteneurs
make ps
```

---

## 📦 Déploiement

### Déploiement local

```bash
# Déploiement complet
make up-full

# Vérifier la santé
make health
```

### Déploiement en production

Consultez le [guide de déploiement en production](deployment-production.md).

### Monitoring

Le système inclut un monitoring complet :

- **Prometheus** : Métriques
- **Grafana** : Tableaux de bord
- **cAdvisor** : Métriques Docker

```bash
# Démarrer le monitoring
make metrics-start

# Accéder à Grafana
open http://localhost:4000
```

---

## 🤝 Contribution

### Workflow Git

1. **Fork** le repository
2. **Créer** une branche feature
3. **Développer** et **tester**
4. **Créer** une Pull Request

```bash
# Créer une branche
git checkout -b feature/nouvelle-fonctionnalite

# Développer et tester
make test

# Commit et push
git add .
git commit -m "feat: ajouter nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite
```

### Standards de code

- **ESLint** pour le JavaScript/TypeScript
- **Prettier** pour le formatage
- **Conventional Commits** pour les messages de commit

### Pull Request

Avant de créer une PR, assurez-vous que :

- [ ] Tous les tests passent
- [ ] Le code est formaté
- [ ] La documentation est mise à jour
- [ ] Les changements sont testés

---

## 🐛 Résolution de problèmes

### Problèmes courants

1. **Services qui ne démarrent pas**
   ```bash
   make down
   make clean
   make up
   ```

2. **Problèmes de base de données**
   ```bash
   make db-reset
   make db-seed
   ```

3. **Problèmes de ports**
   ```bash
   # Vérifier les ports utilisés
   netstat -tulpn | grep :3000
   ```

### Debugging

```bash
# Logs détaillés
make logs

# Debug d'un service spécifique
make logs-service SERVICE=api-gateway

# Accès aux conteneurs
make docker-exec SERVICE=postgres
```

---

## 📚 Ressources supplémentaires

- [Documentation API](api-guide.md) - Documentation des APIs
- [Guide d'architecture](architecture-guide.md) - Architecture détaillée
- [Documentation Makefile](MAKEFILE.md) - Commandes Make
- [Guide de déploiement](deployment-guide.md) - Déploiement
- [Scripts utilitaires](../scripts/README.md) - Scripts disponibles

---

[← Retour au README principal](../README.md) | [Documentation API →](api-guide.md)

---

## Navigation

- [📚 Index](README.md)
- [🏠 Accueil](../README.md)
