# 🏗️ JobbingTrack Microservices Architecture

Cette architecture microservices transforme l'application JobbingTrack monolithique en services distribués pour améliorer la scalabilité, la maintenabilité et la résilience.

## 🎯 Architecture

### Services

| Service | Port | Description | Base de données |
|---------|------|-------------|-----------------|
| **API Gateway** | 3000 | Point d'entrée unique, routage des requêtes | - |
| **Auth Service** | 3001 | Authentification, autorisation, gestion des utilisateurs | PostgreSQL |
| **Application Service** | 3002 | Gestion des candidatures | PostgreSQL |
| **Company Service** | 3003 | Gestion des entreprises | PostgreSQL |
| **Contact Service** | 3004 | Gestion des contacts | PostgreSQL |
| **Interview Service** | 3005 | Gestion des entretiens | PostgreSQL |
| **Notification Service** | 3006 | Notifications, emails, rappels | PostgreSQL + Redis |
| **Dashboard Service** | 3007 | Statistiques et tableaux de bord | PostgreSQL |

### Infrastructure

- **PostgreSQL** : Base de données principale (port 5432)
- **Redis** : Cache et sessions (port 6379)
- **Docker Compose** : Orchestration des services

## 🚀 Démarrage rapide

### Prérequis

- Docker & Docker Compose
- Make (optionnel, pour les commandes simplifiées)

### Installation

```bash
# Cloner le repository
git clone <repository-url>
cd JobbingTrack/microservices

# Démarrer tous les services
make up

# Ou avec Docker Compose directement
docker-compose up -d
```

### Vérification

```bash
# Voir le statut des services
make status

# Voir les logs
make logs

# Tester l'API Gateway
curl http://localhost:3000/health
```

## 📋 Commandes disponibles

```bash
# Gestion des services
make build          # Construire toutes les images
make up             # Démarrer tous les services
make down           # Arrêter tous les services
make logs           # Voir les logs
make dev            # Mode développement
make status         # Statut des services

# Services individuels
make start-auth-service     # Démarrer le service auth
make stop-auth-service      # Arrêter le service auth
make logs-auth-service      # Logs du service auth
make restart-auth-service   # Redémarrer le service auth
make rebuild-auth-service   # Reconstruire le service auth

# Base de données
make migrate        # Exécuter les migrations

# Maintenance
make clean          # Nettoyer les conteneurs et volumes
make test           # Exécuter les tests
```

## 🔧 Configuration

### Variables d'environnement

Chaque service utilise des variables d'environnement définies dans `docker-compose.yml` :

```yaml
environment:
  - NODE_ENV=development
  - PORT=3001
  - DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack
  - JWT_SECRET=your-secret-key
  - AUTH_SERVICE_URL=http://auth-service:3001
```

### Communication inter-services

Les services communiquent via HTTP REST. L'API Gateway route les requêtes vers les services appropriés.

## 📊 Monitoring et Logs

### Logs centralisés

```bash
# Logs de tous les services
make logs

# Logs d'un service spécifique
make logs-auth-service
```

### Health Checks

Chaque service expose un endpoint `/health` :

```bash
# API Gateway
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health
```

## 🧪 Tests

```bash
# Tests de tous les services
make test

# Tests d'un service spécifique
docker-compose exec auth-service npm test
```

## 🔄 Déploiement

### Développement

```bash
make dev
```

### Production

```bash
# Modifier docker-compose.yml pour la production
# Puis :
make build
make up
```

## 🛠️ Développement

### Structure d'un service

```
service-name/
├── src/
│   ├── controllers/     # Contrôleurs
│   ├── routes/         # Routes
│   ├── middlewares/    # Middlewares
│   ├── services/       # Services métier
│   ├── utils/          # Utilitaires
│   └── server.js       # Point d'entrée
├── prisma/             # Schéma de base de données
├── tests/              # Tests
├── Dockerfile          # Image Docker
└── package.json        # Dépendances
```

### Ajouter un nouveau service

1. Créer le dossier du service
2. Ajouter le service dans `docker-compose.yml`
3. Créer le `Dockerfile`
4. Ajouter les routes dans l'API Gateway
5. Mettre à jour le Makefile

## 🔐 Sécurité

- Chaque service a ses propres middlewares d'authentification
- Communication inter-services via réseau Docker privé
- Variables d'environnement pour les secrets
- Rate limiting sur l'API Gateway

## 📈 Scalabilité

- Chaque service peut être mis à l'échelle indépendamment
- Load balancing via l'API Gateway
- Cache Redis pour les performances
- Base de données partagée avec Prisma

## 🐛 Dépannage

### Service ne démarre pas

```bash
# Voir les logs du service
make logs-auth-service

# Redémarrer le service
make restart-auth-service

# Reconstruire le service
make rebuild-auth-service
```

### Problème de base de données

```bash
# Vérifier la connexion
docker-compose exec postgres psql -U jobbingtrack -d jobbingtrack

# Exécuter les migrations
make migrate
```

### Problème de réseau

```bash
# Vérifier le réseau Docker
docker network ls
docker network inspect microservices_jobbingtrack-network
```

## 📚 Documentation API

Une fois les services démarrés, la documentation Swagger est disponible sur :

- **API Gateway** : http://localhost:3000/api-docs
- **Services individuels** : http://localhost:300X/api-docs

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Développer le service
4. Tester avec `make test`
5. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.
