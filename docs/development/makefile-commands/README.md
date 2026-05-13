# 📋 Guide des Commandes Makefile - JobbingTrack

## 🚀 Démarrage et Arrêt

### Commandes de Base

```bash
# Démarrer tous les services
make up-full

# Arrêter tous les services
make down

# Voir le statut des services
make status

# Voir les logs
make logs
```

## 💾 Gestion de la Base de Données

### Commandes de Base de Données

```bash
# Appliquer les migrations Prisma
make db-migrate

# Nettoyer UNIQUEMENT les volumes JobbingTrack
make db-clean

# Réinitialisation complète (⚠️ ATTENTION: Supprime toutes les données !)
make db-reset

# Réparer le rôle et la base PostgreSQL
make db-fix-role
```

### ⚠️ `make db-reset` - Réinitialisation Complète

Cette commande effectue une réinitialisation complète du projet :
1. Arrêt de tous les services
2. Suppression des volumes JobbingTrack
3. Redémarrage complet
4. Application des migrations Prisma
5. Création de l'utilisateur administrateur

**Confirmation requise:** Vous devrez taper `oui` pour confirmer.

## 👤 Gestion de l'Utilisateur Administrateur

### Commandes Admin

```bash
# Créer ou mettre à jour l'utilisateur administrateur depuis .env
make seed-auth

# Recréer l'utilisateur administrateur (supprime et recrée)
make recreate-admin-user
```

### Identifiants Admin

```
📧 Email:    valeur ADMIN_EMAIL dans .env
🔑 Password: valeur ADMIN_PASSWORD dans .env
👤 Prénom:   Admin
👤 Nom:      JobbingTrack
🎖️  Rôle:     SUPER_ADMIN
```

Ces identifiants peuvent être personnalisés dans le fichier `.env` :

```bash
ADMIN_EMAIL=admin@jobbingtrack.com
ADMIN_PASSWORD=change-me-generate-a-strong-admin-password
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=JobbingTrack
```

## 📊 Monitoring

### Commandes de Monitoring

```bash
# Démarrer le monitoring complet (Prometheus, cAdvisor, Grafana, Loki)
make monitoring-full

# Juste démarrer le monitoring
make monitoring-up

# Arrêter le monitoring
make monitoring-down

# Redémarrer le monitoring
make monitoring-restart

# Voir le statut du monitoring
make monitoring-ps
```

### Accès aux Services de Monitoring

```
📊 Prometheus:  http://localhost:9090
📈 Grafana:     http://localhost:3013 (admin/admin123)
📦 cAdvisor:    http://localhost:8082
```

## 🔧 Volumes Docker

### Volumes JobbingTrack

Tous les volumes utilisent maintenant le préfixe `jobbingtrack_` :

- `jobbingtrack_postgres_data` - Données PostgreSQL
- `jobbingtrack_prometheus_data` - Données Prometheus
- `jobbingtrack_metrics_data` - Données métriques
- `jobbingtrack_loki_data` - Logs Loki
- `jobbingtrack_grafana_data` - Configuration Grafana

### Nettoyage des Volumes

```bash
# Nettoyer UNIQUEMENT les volumes JobbingTrack
make db-clean

# Voir tous les volumes Docker
docker volume ls

# Supprimer un volume spécifique (⚠️ Perte de données)
docker volume rm jobbingtrack_postgres_data
```

## 🆘 Workflows Courants

### Premier Démarrage

```bash
# 1. Démarrer tout
make up-full

# 2. Attendre que PostgreSQL soit prêt (automatique)

# 3. Appliquer les migrations Prisma (si nécessaire)
make db-migrate

# 4. Créer l'utilisateur admin (si nécessaire)
make create-admin-user

# 5. Accéder au frontend
# http://localhost:8080
```

### Réinitialisation Complète

```bash
# Une seule commande pour tout réinitialiser
make db-reset

# Ou manuellement :
make down
make db-clean
make up-full
make db-migrate
make create-admin-user
```

### Résolution de Problèmes

```bash
# Si l'utilisateur admin ne fonctionne pas
make recreate-admin-user

# Si les migrations échouent
make db-fix-role
make db-migrate

# Si les services ne démarrent pas
make down
docker ps -a  # Vérifier les conteneurs
make up-full
```

## 📦 Vérifications Automatiques

Après `make up-full`, le système vérifie automatiquement :

✅ **Migrations Prisma** - Indique si `make db-migrate` est nécessaire  
✅ **Utilisateur Admin** - Indique si `make create-admin-user` est nécessaire

## 🌐 Accès aux Services

```
Frontend:           http://localhost:8080
API Gateway:        http://localhost:3000
Auth Service:       http://localhost:3001
Dashboard Service:  http://localhost:3007
Metrics Aggregator: http://localhost:8014
PostgreSQL:         localhost:5432
Redis:              localhost:6379
```

## 📝 Notes Importantes

- ⚠️ `make db-reset` supprime **toutes les données** - confirmation requise
- ✅ `make db-clean` supprime uniquement les volumes JobbingTrack
- 🔐 Changez les mots de passe par défaut en production
- 📊 Le monitoring est optionnel - utilisez `make monitoring-full`
- 🐳 Tous les volumes utilisent le préfixe `jobbingtrack_` pour faciliter le nettoyage

## 🆘 Aide

Pour voir toutes les commandes disponibles :

```bash
make help
```

Pour voir les commandes d'une catégorie spécifique :

```bash
make help | grep "database"
make help | grep "monitoring"
```
