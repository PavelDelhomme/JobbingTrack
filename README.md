# JobbingTrack 🎯

> Application complète de suivi de candidatures avec API REST et application mobile React Native.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Required-blue.svg)](https://docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Description

JobbingTrack est une solution complète pour gérer et suivre vos candidatures professionnelles :

- 📝 **Suivi complet** des candidatures (statut, entreprise, poste, etc.)
- 📅 **Gestion des entretiens** avec rappels automatiques
- 👥 **Carnet de contacts** professionnels par entreprise
- 🔔 **Système de relances** programmables
- 📄 **Gestion documentaire** (CV, lettres de motivation)
- 📊 **Tableau de bord** avec statistiques détaillées
- 🔍 **API REST complète** avec documentation Swagger
- 📱 **Application mobile** React Native (à venir)

---

## 🚀 Démarrage Rapide

### Prérequis

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker** & **Docker Compose** ([Download](https://docker.com/))
- **Git** ([Download](https://git-scm.com/))

### Installation Éclair ⚡

```bash
# 1. Cloner le repository
git clone https://github.com/OWNER/JobbingTrack.git
cd JobbingTrack

# 2. Configuration automatique et démarrage
make demo
```

**C'est tout !** 🎉 Votre API JobbingTrack est prête avec données de test !

---

## 📖 Guide Makefile - Toutes les Commandes

### 🔍 **Découvrir les Commandes**

```bash
make help    # Affiche toutes les commandes disponibles avec descriptions
```

### 🚀 **Commandes de Démarrage**

| Commande | Description | Temps |
|----------|-------------|-------|
| `make dev` | 🔥 **Développement rapide** - Build + Start avec hot reload | ~30s |
| `make demo` | 🎭 **Démo complète** - Reset + Build + Migrate + Seed + Test | ~60s |
| `make quick-start` | ⚡ **Start ultra-rapide** en parallèle | ~20s |

### 🏗️ **Commandes de Build**

| Commande | Description | Temps |
|----------|-------------|-------|
| `make build` | 🏗️ **Build standard** (clean, no cache) | ~90s |
| `make build-fast` | ⚡ **Build ultra-rapide** avec cache optimisé | ~15s |
| `make build-parallel` | 🚀 **Build parallèle** rapide | ~25s |

### 🔄 **Gestion des Services**

```bash
make up              # Démarrer tous les services
make down            # Arrêter tous les services  
make restart         # Redémarrer tous les services
make restart-fast    # Restart avec build rapide
make status          # Voir le statut des services
```

### 📊 **Monitoring & Logs**

```bash
make logs            # Logs de tous les services en temps réel
make logs-api        # Logs API uniquement  
make health          # Test de santé de l'API
make endpoints       # Tester les endpoints principaux
```

### 🗄️ **Gestion Base de Données**

```bash
make migrate         # Exécuter les migrations Prisma
make migrate-reset   # Reset complet de la DB (ATTENTION!)
make generate        # Générer le client Prisma
make studio          # Ouvrir Prisma Studio (DB GUI)
make seed            # Peupler avec des données de test
```

### 💾 **Sauvegarde & Restauration**

```bash
make backup                           # Sauvegarde automatique avec timestamp
make restore FILE=backups/backup.sql  # Restaurer depuis un fichier
```

### 🧪 **Tests & Qualité**

```bash
make test            # Lancer tous les tests
make test-watch      # Tests en mode watch
make test-coverage   # Tests avec couverture
make lint            # Vérifier le code (ESLint)  
make lint-fix        # Corriger automatiquement
make format          # Formater le code (Prettier)
```

### 🔧 **Debug & Shell**

```bash
make shell-api       # Accéder au shell du container API
make shell-db        # Accéder au shell PostgreSQL
```

### 🧹 **Nettoyage**

```bash
make clean           # Nettoyer containers et volumes
make clean-all       # Nettoyage complet (TOUT supprimer)
```

### 🎯 **Workflows Spéciaux**

```bash
make full-reset      # Reset complet : clean + build + migrate + seed
make production-ready # Vérifications avant production (lint + test + health)
make dev-clean       # Clean + build rapide + start
```

### 📱 **Mobile (à venir)**

```bash
make mobile-install  # Installer dépendances mobile
make mobile-ios      # Démarrer app iOS
make mobile-android  # Démarrer app Android
```

---

## 🎯 Workflows Recommandés

### 👨‍💻 **Développement Quotidien**

```bash
# Premier démarrage
make demo            # Setup complet avec données de test

# Développement quotidien
make dev             # Start rapide avec hot reload
make logs-api        # Voir les logs en temps réel
```

### 🔄 **Après Modifications du Code**

```bash
# Simple changement de code -> Hot reload automatique ✨
# Pas besoin de redemarrer !

# Changement Dockerfile/dependencies
make restart-fast    # Rebuild + restart rapide
```

### 🚨 **En Cas de Problème**

```bash
make clean           # Nettoyer
make build-fast      # Rebuilder rapidement  
make up              # Redémarrer
make health          # Vérifier que tout marche
```

### 🎭 **Préparer une Démo**

```bash
make demo            # Setup complet automatique
# -> Clean + Build + Start + Migrate + Seed + Health Check
```

---

## 📊 Services Disponibles

Après `make up` ou `make dev`, vous avez accès à :

| Service | URL | Description |
|---------|-----|-------------|
| **API REST** | http://localhost:3000 | Backend principal |
| **Documentation** | http://localhost:3000/api-docs | Swagger UI interactive |
| **Health Check** | http://localhost:3000/health | Status de l'API |
| **Adminer** | http://localhost:8080 | Interface DB (admin/admin) |
| **Prisma Studio** | http://localhost:5555 | GUI base de données |

---

## 🧪 Tests de l'API

### 🔐 **Compte de Test Automatique**

Après `make seed` ou `make demo` :

- **Email :** `admin@jobbingtrack.test`  
- **Mot de passe :** `password123`

### 🚀 **Tests Rapides**

```bash
# Test de santé
curl http://localhost:3000/health

# Inscription
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "redacted@example.invalid",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Connexion et récupération du token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@jobbingtrack.test", 
    "password": "password123"
  }'

# Utiliser le token pour créer une candidature
export TOKEN="votre_token_ici"
curl -X POST http://localhost:3000/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "companyName": "Google",
    "position": "Software Engineer",
    "location": "Paris",
    "type": "FULL_TIME",
    "status": "SENT"
  }'
```

---

## 🔧 Configuration

### 📁 **Structure du Projet**

```
JobbingTrack/
├── backend/                    # API REST Node.js
│   ├── src/                   # Code source
│   │   ├── controllers/       # Logique métier
│   │   ├── routes/            # Routes API
│   │   ├── middlewares/       # Auth, validation, etc.
│   │   ├── services/          # Services (email, etc.)
│   │   └── utils/             # Utilitaires
│   ├── prisma/               # Base de données
│   │   ├── schema.prisma     # Schéma DB
│   │   └── seed.js           # Données de test
│   ├── Dockerfile            # Image Docker
│   └── package.json          # Dépendances
├── docker-compose.yml         # Services Docker
├── Makefile                   # Commandes automatisées
└── README.md                  # Cette documentation
```

### ⚙️ **Variables d'Environnement**

Le fichier `backend/.env` contient :

```bash
# Base de données
DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack

# JWT
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# API
PORT=3000
NODE_ENV=development
```

---

## 🚀 Performance & Optimisations

### ⚡ **Build Optimisé**

- **Multi-stage Docker** avec cache des dépendances
- **DOCKER_BUILDKIT** pour builds modernes
- **Build parallèle** pour gagner du temps
- **.dockerignore** optimisé (126MB de fichiers exclus)

### 🔥 **Hot Reload**

- **Nodemon** configuré pour `src/`
- **Volume Docker** monte votre code local
- **Rechargement automatique** dès modification

### 📊 **Monitoring**

- **Health checks** automatiques
- **Logs structurés** avec Winston
- **Prisma Studio** pour debug DB

---

## 🔍 Dépannage

### ❌ **Problèmes Courants**

| Problème | Solution |
|----------|----------|
| Port déjà utilisé | `make down` puis `make up` |
| Erreur build Docker | `make clean` puis `make build-fast` |
| Problème DB | `make migrate-reset` puis `make seed` |
| API non accessible | `make health` pour diagnostiquer |

### 🆘 **Reset Complet**

```bash
make clean-all       # Supprime TOUT
make demo           # Recrée tout de zéro
```

---

## 📚 Documentation API

- **Swagger UI :** http://localhost:3000/api-docs
- **Endpoints :** Authentification, Candidatures, Entretiens, Contacts
- **Format :** JSON REST avec validation
- **Auth :** JWT Bearer tokens

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche : `git checkout -b feature/awesome-feature`
3. Commiter : `git commit -m 'Add awesome feature'`
4. Pousser : `git push origin feature/awesome-feature`
5. Ouvrir une Pull Request

---

## 📄 Licence

MIT License - Voir [LICENSE](LICENSE) pour plus de détails.

---

## 👤 Auteur

**Admin JobbingTrack**
- GitHub: [@AdminJobbingTrack](https://github.com/AdminJobbingTrack)

---

## ⭐ Support

Si ce projet vous aide, n'hésitez pas à lui donner une ⭐ !

Pour tout problème, ouvrez une [issue](https://github.com/OWNER/JobbingTrack/issues).

---

**🎯 JobbingTrack - Votre assistant personnel pour la recherche d'emploi !**