# JobbingTrack 🎯

> Application complète de suivi de candidatures avec architecture microservices et application mobile React Native.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Required-blue.svg)](https://docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org/)
[![Microservices](https://img.shields.io/badge/Architecture-Microservices-orange.svg)](https://microservices.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Description

JobbingTrack est une solution complète pour gérer et suivre vos candidatures professionnelles avec une architecture microservices moderne :

- 📝 **Suivi complet** des candidatures (statut, entreprise, poste, etc.)
- 📅 **Gestion des entretiens** avec rappels automatiques
- 👥 **Carnet de contacts** professionnels par entreprise
- 🔔 **Système de relances** programmables
- 📄 **Gestion documentaire** (CV, lettres de motivation)
- 📊 **Tableau de bord** avec statistiques détaillées
- 🔍 **API REST complète** avec documentation Swagger
- 📱 **Application mobile** React Native (à venir)
- 🏗️ **Architecture microservices** scalable et maintenable

---

## 🏗️ Architecture Microservices

### Services Disponibles

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | 3000 | Point d'entrée unique, routage et documentation |
| **Auth Service** | 3001 | Authentification, autorisation, gestion des utilisateurs |
| **Application Service** | 3002 | Gestion des candidatures |
| **Company Service** | 3003 | Gestion des entreprises |
| **Contact Service** | 3004 | Gestion des contacts professionnels |
| **Interview Service** | 3005 | Gestion des entretiens |
| **Notification Service** | 3006 | Notifications et rappels |
| **Dashboard Service** | 3007 | Statistiques et tableaux de bord |

### Infrastructure

- **PostgreSQL** : Base de données principale
- **Redis** : Cache et sessions
- **Docker Compose** : Orchestration des services
- **API Gateway** : Routage et load balancing

---

## 🚀 Démarrage Rapide

### Prérequis

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **Docker** & **Docker Compose** ([Download](https://docker.com/))
- **Git** ([Download](https://git-scm.com/))

### Installation Éclair ⚡

```bash
# 1. Cloner le repository
git clone https://github.com/OWNER/JobbingTrack.git
cd JobbingTrack

# 2. Configuration et démarrage
make dev
```

**C'est tout !** 🎉 Tous les microservices sont prêts !

---

## 📖 Guide des Commandes

### 🔍 **Découvrir les Commandes**

```bash
make help    # Affiche toutes les commandes disponibles
```

### 🚀 **Commandes de Démarrage**

| Commande | Description | Temps |
|----------|-------------|-------|
| `make dev` | 🔥 **Développement complet** - Tous les microservices | ~60s |
| `make up` | ▶️ **Démarrage rapide** - Services existants | ~30s |
| `make build` | 🏗️ **Build complet** - Toutes les images | ~90s |

### 🔄 **Gestion des Services**

```bash
make up              # Démarrer tous les services
make down            # Arrêter tous les services  
make restart         # Redémarrer tous les services
make status          # Voir le statut des services
make logs            # Logs de tous les services
```

### 🎯 **Services Spécifiques**

```bash
make start-auth-service      # Démarrer uniquement le service auth
make logs-application-service # Logs du service applications
make restart-company-service # Redémarrer le service companies
make rebuild-interview-service # Rebuild le service interviews
```

### 🗄️ **Base de Données**

```bash
make migrate         # Exécuter les migrations Prisma
make seed            # Peupler avec des données de test
```

### 🧪 **Tests**

```bash
make test            # Tests de tous les services
make test-auth       # Tests du service auth uniquement
```

### 🧹 **Maintenance**

```bash
make clean           # Nettoyer containers et volumes
make clean-all       # Nettoyage complet
```

---

## 📊 Services Disponibles

Après `make up` ou `make dev`, vous avez accès à :

| Service | URL | Description |
|---------|-----|-------------|
| **API Gateway** | http://localhost:3000 | Point d'entrée unique |
| **Documentation** | http://localhost:3000/api-docs | Swagger UI interactive |
| **Health Check** | http://localhost:3000/health | Status de tous les services |
| **Auth Service** | http://localhost:3001 | Service d'authentification |
| **Application Service** | http://localhost:3002 | Service des candidatures |
| **Company Service** | http://localhost:3003 | Service des entreprises |
| **Contact Service** | http://localhost:3004 | Service des contacts |
| **Interview Service** | http://localhost:3005 | Service des entretiens |
| **Notification Service** | http://localhost:3006 | Service des notifications |
| **Dashboard Service** | http://localhost:3007 | Service du dashboard |

---

## 🧪 Tests de l'API

### 🔐 **Compte de Test**

Après `make seed` :

- **Email :** `admin@jobbingtrack.test`  
- **Mot de passe :** `password123`

### 🚀 **Tests Rapides**

```bash
# Test de santé global
curl http://localhost:3000/health

# Test d'un service spécifique
curl http://localhost:3001/health  # Auth service
curl http://localhost:3002/health  # Application service

# Inscription via API Gateway
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "redacted@example.invalid",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Connexion
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@jobbingtrack.test", 
    "password": "password123"
  }'
```

---

## 🔧 Configuration

### 📁 **Structure du Projet**

```
JobbingTrack/
├── backend/                    # Architecture microservices
│   ├── api-gateway/           # Point d'entrée unique
│   ├── auth-service/          # Service d'authentification
│   ├── application-service/   # Service des candidatures
│   ├── company-service/       # Service des entreprises
│   ├── contact-service/       # Service des contacts
│   ├── interview-service/     # Service des entretiens
│   ├── notification-service/  # Service des notifications
│   ├── dashboard-service/     # Service du dashboard
│   ├── monitoring/            # Monitoring et métriques
│   ├── docker-compose.yml     # Configuration des services
│   └── Makefile              # Commandes automatisées
├── mobile/                    # Application mobile React Native
├── docker-compose.yml         # Configuration principale
├── Makefile                   # Commandes principales
└── README.md                  # Cette documentation
```

### ⚙️ **Variables d'Environnement**

Le fichier `.env.example` contient toutes les variables nécessaires :

```bash
# Base de données
DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack

# JWT
JWT_SECRET=your-secret-key-change-in-production-2025
JWT_REFRESH_SECRET=your-refresh-secret-change-too-2025

# Services URLs
AUTH_SERVICE_URL=http://auth-service:3001
APPLICATION_SERVICE_URL=http://application-service:3002
# ... autres services
```

---

## 🚀 Avantages de l'Architecture Microservices

### ✅ **Scalabilité**
- Chaque service peut être mis à l'échelle indépendamment
- Déploiement indépendant des services
- Technologies différentes par service si nécessaire

### ✅ **Maintenabilité**
- Code modulaire et séparé par domaine métier
- Équipes peuvent travailler sur différents services
- Tests isolés par service

### ✅ **Résilience**
- Panne d'un service n'affecte pas les autres
- Circuit breakers et retry policies
- Monitoring granulaire

### ✅ **Performance**
- Cache Redis partagé
- Load balancing via API Gateway
- Optimisations spécifiques par service

---

## 🔍 Dépannage

### ❌ **Problèmes Courants**

| Problème | Solution |
|----------|----------|
| Port déjà utilisé | `make down` puis `make up` |
| Service non accessible | `make logs-<service-name>` pour diagnostiquer |
| Erreur de migration | `make migrate` pour relancer |
| Problème de build | `make clean` puis `make build` |

### 🆘 **Reset Complet**

```bash
make clean-all       # Supprime TOUT
make dev            # Recrée tout de zéro
```

---

## 📚 Documentation API

- **Swagger UI :** http://localhost:3000/api-docs
- **Endpoints :** Tous les services via l'API Gateway
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

**🎯 JobbingTrack - Votre assistant personnel pour la recherche d'emploi avec une architecture microservices moderne !**