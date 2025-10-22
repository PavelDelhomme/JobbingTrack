# Documentation Makefile - JobbingTrack

[← Retour au README principal](../README.md)

## 🎯 Vue d'ensemble

Le Makefile centralise toutes les commandes du projet JobbingTrack, offrant une interface simple et cohérente pour gérer tous les aspects du système.

## 📋 Table des matières

- [🚀 Commandes de démarrage](#-commandes-de-démarrage)
- [🔧 Gestion des services](#-gestion-des-services)
- [📊 Diagnostics et monitoring](#-diagnostics-et-monitoring)
- [🗄️ Base de données](#️-base-de-données)
- [🔨 Build et développement](#-build-et-développement)
- [🧪 Tests](#-tests)
- [📈 Monitoring](#-monitoring)
- [💡 Astuces et bonnes pratiques](#-astuces-et-bonnes-pratiques)

---

## 🚀 Commandes de démarrage

### `make` ou `make help`
Affiche l'aide complète avec toutes les commandes disponibles.

```bash
make
# ou
make help
```

### `make up`
Démarre **uniquement les services essentiels** :
- PostgreSQL
- Redis  
- API Gateway
- Frontend
- Metrics Aggregator
- cAdvisor

```bash
make up
```

**Résultat** :
```
🚀 Démarrage des services essentiels JobbingTrack...
📦 Services: postgres, redis, api-gateway, frontend

✅ Services essentiels démarrés avec succès !

🌐 Interfaces disponibles :
   Frontend:           http://localhost:8080
   API Gateway:        http://localhost:3000

🔑 Identifiants de connexion :
   Email:    admin@jobbingtrack.com
   Password: SuperAdmin123!
```

### `make up-full`
Démarre **TOUS les services** (essentiels + optionnels).

```bash
make up-full
```

### `make down`
Arrête tous les services.

```bash
make down
```

### `make restart`
Redémarre tous les services (équivaut à `make down` puis `make up-full`).

```bash
make restart
```

---

## 🔧 Gestion des services

### Démarrer des services spécifiques

```bash
# Service d'authentification
make start-auth

# Service d'applications
make start-applications

# Service de métriques
make start-metrics
```

### Gestion individuelle des services

```bash
# Arrêter un service spécifique
make stop-service SERVICE=api-gateway
make stop-service SERVICE=frontend

# Redémarrer un service
make restart-service SERVICE=postgres
make restart-service SERVICE=redis

# Voir les logs d'un service
make logs-service SERVICE=api-gateway
make logs-service SERVICE=postgres
```

### Démarrer des profils spécifiques

```bash
# Profil d'authentification
make up-profile PROFILE=auth

# Profil de monitoring
make up-profile PROFILE=monitoring

# Profil complet
make up-profile PROFILE=full
```

---

## 📊 Diagnostics et monitoring

### `make health`
Vérifie la santé de tous les services.

```bash
make health
```

### `make ps`
Liste les conteneurs actifs.

```bash
make ps
```

### `make logs`
Affiche tous les logs.

```bash
make logs

# Logs d'un service spécifique
make logs-service SERVICE=api-gateway
```

### `make status`
Statut détaillé de chaque service.

```bash
make status
```

---

## 🗄️ Base de données

### Migrations et données

```bash
# Appliquer les migrations
make db-migrate

# Insérer des données de test
make db-seed

# Reset complet de la base
make db-reset
```

### Sauvegardes et restauration

```bash
# Sauvegarde
make db-backup

# Restauration
make db-restore file=backup.sql
```

---

## 🔨 Build et développement

### Construction des services

```bash
# Build tous les services
make build

# Rebuild sans cache
make rebuild

# Nettoyage complet
make clean
```

### Développement

```bash
# Mode développement
make dev

# Vérifier les dépendances
make check-deps

# Installer les dépendances
make install-deps
```

---

## 🧪 Tests

### Exécution des tests

```bash
# Tous les tests
make test

# Tests d'intégration
make test-integration

# Tests d'un service spécifique
make test-service SERVICE=backend
```

---

## 📈 Monitoring

### Interfaces de monitoring

```bash
# Ouvrir Prometheus
make metrics

# Ouvrir cAdvisor
make cadvisor

# Logs du système de métriques
make logs-metrics
```

### Métriques disponibles

- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:4000 (admin/admin)
- **cAdvisor** : http://localhost:8080

---

## 💡 Astuces et bonnes pratiques

### Aide détaillée

```bash
# Aide pour une commande spécifique
make help-up
make help-status
make help-logs
make help-health
```

### Variables d'environnement

Le Makefile supporte plusieurs variables d'environnement :

```bash
# Variables de configuration
export COMPOSE_PROJECT_NAME=jobbingtrack
export NODE_ENV=development
export LOG_LEVEL=info

# Variables pour les services
export DATABASE_URL=postgresql://user:pass@localhost:5432/db
export REDIS_URL=redis://localhost:6379
```

### Workflow de développement typique

```bash
# 1. Démarrer l'environnement
make up

# 2. Vérifier que tout fonctionne
make health

# 3. Voir les logs si nécessaire
make logs

# 4. Faire du développement
make dev

# 5. Lancer les tests
make test

# 6. Arrêter quand terminé
make down
```

### Workflow de production

```bash
# 1. Démarrer tous les services
make up-full

# 2. Vérifier la santé
make health

# 3. Monitorer les métriques
make metrics

# 4. Vérifier les logs
make logs
```

---

## 🔍 Résolution de problèmes

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
   make ps
   ```

### Debugging

```bash
# Voir les logs détaillés
make logs

# Vérifier l'état des services
make status

# Accéder à un conteneur
make shell SERVICE=postgres
```

---

## 📚 Ressources supplémentaires

- [Guide de développement](DEVELOPMENT.md) - Développement
- [Documentation API](API.md) - APIs disponibles
- [Guide d'architecture](ARCHITECTURE.md) - Architecture
- [Scripts utilitaires](../scripts/README.md) - Scripts disponibles

---

[← Retour au README principal](../README.md) | [Guide de développement →](DEVELOPMENT.md)
---

## Navigation

- [📚 Index](README.md)
- [🏠 Accueil](../README.md)
