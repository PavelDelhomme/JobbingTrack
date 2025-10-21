# 📋 Makefile - JobbingTrack

Cette documentation détaille toutes les commandes disponibles dans le Makefile de JobbingTrack.

## 🎯 Vue d'ensemble

Le Makefile de JobbingTrack est organisé de manière modulaire avec des catégories logiques et une aide contextuelle pour chaque commande.

## 📦 Démarrage rapide

### Services essentiels uniquement
```bash
make up              # Démarre postgres, redis, api-gateway, frontend
```

### Tous les services avec monitoring
```bash
make up-full         # Démarre TOUS les services avec métriques
```

### Arrêt et nettoyage
```bash
make down            # Arrêt propre de tous les services
make down-volumes    # Arrêt + suppression des volumes
make restart         # Redémarrage complet
```

## 🔧 Gestion des services

### Démarrage par profils
```bash
# Démarrer un profil spécifique
make up-profile PROFILE=auth         # Service d'authentification
make up-profile PROFILE=applications # Gestion des candidatures
make up-profile PROFILE=companies    # Gestion des entreprises
make up-profile PROFILE=monitoring   # Métriques complètes
make up-profile PROFILE=full         # TOUS les services
```

### Gestion individuelle des services
```bash
# Démarrer un service spécifique
make start-auth
make start-applications

# Arrêter un service
make stop-service SERVICE=api-gateway

# Redémarrer un service
make restart-service SERVICE=frontend

# Voir les logs d'un service
make logs-service SERVICE=postgres
```

## 🔍 Diagnostics et vérification

### Vérification de santé
```bash
make health          # Vérification complète du système
make ps             # Liste des conteneurs actifs
make logs           # Logs en temps réel de tous les services
make status         # Statut détaillé de chaque service
```

### Aide détaillée pour chaque commande
```bash
make help-up        # Aide détaillée pour 'make up'
make help-status    # Aide détaillée pour 'make status'
make help-logs      # Aide détaillée pour 'make logs'
make help-health    # Aide détaillée pour 'make health'
make help-*         # Aide pour n'importe quelle commande
```

## 🗄️ Base de données

### Sauvegarde et restauration
```bash
make db-backup      # Créer une sauvegarde
make db-restore file=backup.sql  # Restaurer depuis un fichier
```

### Gestion des données
```bash
make db-migrate     # Appliquer les migrations
make db-seed        # Insérer des données de test
make db-reset       # Reset complet de la base de données
```

## 🔨 Build et développement

### Construction des images
```bash
make build          # Build de tous les services
make rebuild        # Rebuild sans cache
make rebuild-service SERVICE=frontend  # Rebuild d'un service spécifique
make clean          # Nettoyage complet (conteneurs, volumes, images)
```

### Utilitaires de développement
```bash
make shell SERVICE=postgres     # Shell interactif dans un conteneur
make exec SERVICE=api-gateway CMD="npm install"  # Exécuter une commande
make check-deps     # Vérifier les dépendances système
```

## 🧪 Tests

### Exécution des tests
```bash
make test           # Tous les tests
make test-service SERVICE=auth  # Tests d'un service spécifique
make test-integration  # Tests d'intégration
```

### Tests avancés
```bash
./scripts/testing/run-tests.sh --auth       # Tests d'authentification
./scripts/testing/run-tests.sh --integration # Tests d'intégration
./scripts/testing/run-tests.sh --e2e        # Tests end-to-end
```

## 📈 Monitoring et métriques

### Interfaces de monitoring
```bash
make metrics        # Ouvrir Prometheus (http://localhost:9090)
make cadvisor       # Ouvrir cAdvisor (http://localhost:8080)
make logs-metrics   # Logs du système de métriques
```

### Métriques disponibles
- **Système**: CPU, mémoire, disque, réseau
- **Docker**: Conteneurs, images, volumes
- **Application**: Requêtes, latence, erreurs
- **Base de données**: Connexions, requêtes lentes

## 🛠️ Utilitaires système

### Installation et configuration
```bash
make install-deps   # Installer les dépendances système
make create-admin-user  # Créer l'utilisateur administrateur
make run-tests      # Exécuter tous les tests
make cleanup-docker # Nettoyer Docker (images, conteneurs, volumes)
make wait-for-service SERVICE_URL=http://localhost:3000/health
```

### Nettoyage et maintenance
```bash
make cleanup-docker --dry-run   # Aperçu du nettoyage
make cleanup-docker --force     # Nettoyage automatique
```

## 💡 Astuces et raccourcis

### Variables d'environnement
```bash
# Configuration admin personnalisée
SUPER_ADMIN_EMAIL=test@example.com make up

# Timeout personnalisé
DB_CONNECTION_TIMEOUT=30 make health

# Configuration des logs
LOG_LEVEL=debug make logs
```

### Commandes combinées utiles
```bash
# Démarrage complet avec vérification
make up && make health

# Redémarrage avec nettoyage
make down && make clean && make up-full

# Test complet du système
make up && make health && make test

# Maintenance complète
make down-volumes && make build && make up-full && make health
```

## 🔧 Variables d'environnement supportées

| Variable | Défaut | Description |
|----------|--------|-------------|
| `SUPER_ADMIN_EMAIL` | admin@jobbingtrack.com | Email administrateur |
| `SUPER_ADMIN_PASSWORD` | SuperAdmin123! | Mot de passe administrateur |
| `DB_CONNECTION_TIMEOUT` | 30 | Timeout connexion DB (secondes) |
| `HEALTH_CHECK_INTERVAL` | 60 | Intervalle vérifications (secondes) |
| `LOG_LEVEL` | info | Niveau de logging |
| `LOG_FILE` | /tmp/jobbingtrack.log | Fichier de logs |

## 📚 Aide contextuelle

### Aide générale
```bash
make help           # Aide organisée par catégories
```

### Aide spécifique
```bash
make help-up        # Aide détaillée pour 'make up'
make help-health    # Aide détaillée pour 'make health'
make help-db-seed   # Aide détaillée pour 'make db-seed'
make help-metrics   # Aide détaillée pour 'make metrics'
```

### Recherche de commandes
```bash
make help | grep -i "database"  # Trouver les commandes liées à la DB
make help | grep -i "test"      # Trouver les commandes de test
```

## 🚨 Gestion des erreurs

### Codes de sortie
- **0**: Succès
- **1**: Erreur (problème résolvable)
- **2**: Erreur d'usage (paramètres invalides)

### Messages d'erreur utiles
```bash
# Erreur de paramètre manquant
❌ Erreur: Spécifiez le service avec SERVICE=nom

# Erreur de service non trouvé
❌ Service 'invalid-service' non trouvé

# Erreur de dépendance manquante
❌ Docker n'est pas installé
```

## 📈 Métriques d'utilisation

Le Makefile inclut des métriques intégrées :
- **Temps d'exécution** des commandes longues
- **Compteurs d'utilisation** des fonctionnalités
- **Logs d'audit** des opérations importantes
- **Rapports de performance** disponibles

## 🔄 Automatisation

### Scripts d'automatisation
```bash
# Installation complète automatisée
./scripts/setup/install-dependencies.sh && make up && make db-seed

# Déploiement de production
make build && make down-volumes && make up-full && make health

# Maintenance hebdomadaire
make cleanup-docker && make db-backup && make health
```

### Intégration CI/CD
```bash
# Tests automatisés
make test && make health

# Build pour déploiement
make build && make test-integration

# Déploiement avec rollback
make db-backup && make up-full && make health || make db-restore file=backup.sql
```

## 🆘 Support et debugging

### Logs et debugging
```bash
# Logs détaillés
make logs | grep ERROR  # Erreurs uniquement
make logs-service SERVICE=api-gateway  # Logs d'un service

# Debugging avancé
make exec SERVICE=api-gateway CMD="npm run debug"
make shell SERVICE=postgres  # Shell de débogage
```

### Résolution de problèmes
```bash
# Diagnostic automatique
make health --fix

# Vérification des dépendances
make check-deps

# Nettoyage et redémarrage
make down && make clean && make up
```

---

**Dernière mise à jour**: Octobre 2025
**Version**: 3.0 - Makefile modulaire avec aide contextuelle
