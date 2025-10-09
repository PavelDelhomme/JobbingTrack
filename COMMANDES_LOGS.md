# 📋 Guide des Commandes de Logs - JobbingTrack

## 🎯 Commandes Principales

### Logs de TOUS les services (temps réel)
```bash
make logs
```

### Logs des services backend uniquement (sans PostgreSQL/Redis)
```bash
make logs-backend
```

### Logs de l'infrastructure (PostgreSQL + Redis)
```bash
make logs-infra
```

## 🔍 Logs par Service Individuel

### Tous les services (avec emojis pour identification)
```bash
# 🔐 Auth Service (port 3001)
make logs-auth-service

# 📋 Application Service (port 3002)
make logs-application-service

# 🏢 Company Service (port 3003)
make logs-company-service

# 👥 Contact Service (port 3004)
make logs-contact-service

# 🎤 Interview Service (port 3005)
make logs-interview-service

# 🔔 Notification Service (port 3006)
make logs-notification-service

# 📊 Dashboard Service (port 3007)
make logs-dashboard-service

# 🚀 API Gateway (port 3000)
make logs-api-gateway
```

### Infrastructure
```bash
# PostgreSQL
make logs-postgres

# Redis
make logs-redis
```

## 📊 Options Avancées

### Voir les N dernières lignes seulement
```bash
# Dernières 50 lignes de auth-service
docker compose -f backend/docker-compose.yml logs --tail=50 auth-service

# Dernières 100 lignes de tous les services
docker compose -f backend/docker-compose.yml logs --tail=100
```

### Logs sans le mode "follow" (ne suit pas en temps réel)
```bash
# Voir les logs d'auth-service et quitter
docker compose -f backend/docker-compose.yml logs --tail=100 auth-service

# Voir les logs de plusieurs services
docker compose -f backend/docker-compose.yml logs --tail=50 auth-service application-service
```

### Logs avec horodatage
```bash
docker compose -f backend/docker-compose.yml logs -f --timestamps auth-service
```

### Logs depuis une date/heure spécifique
```bash
docker compose -f backend/docker-compose.yml logs --since 30m  # Dernières 30 minutes
docker compose -f backend/docker-compose.yml logs --since 2h   # Dernières 2 heures
docker compose -f backend/docker-compose.yml logs --since 2025-10-09T06:00:00
```

## 🎨 Identification Visuelle

Chaque service a son **emoji unique** pour faciliter l'identification dans les logs :

| Service | Emoji | Port |
|---------|-------|------|
| API Gateway | 🚀 | 3000 |
| Auth Service | 🔐 | 3001 |
| Application Service | 📋 | 3002 |
| Company Service | 🏢 | 3003 |
| Contact Service | 👥 | 3004 |
| Interview Service | 🎤 | 3005 |
| Notification Service | 🔔 | 3006 |
| Dashboard Service | 📊 | 3007 |

## 💡 Exemples Pratiques

### Débugger un problème d'authentification
```bash
# Voir les logs en temps réel de auth-service
make logs-auth-service

# Ou
docker compose -f backend/docker-compose.yml logs -f auth-service
```

### Vérifier les démarrages
```bash
# Voir uniquement les messages de démarrage
docker compose -f backend/docker-compose.yml logs | grep "démarré sur le port"
```

### Suivre plusieurs services en même temps
```bash
# Auth + Application + Company services
docker compose -f backend/docker-compose.yml logs -f auth-service application-service company-service
```

### Chercher une erreur spécifique
```bash
# Chercher les erreurs dans tous les logs
docker compose -f backend/docker-compose.yml logs | grep -i "error"

# Chercher dans un service spécifique
docker compose -f backend/docker-compose.yml logs auth-service | grep -i "error"
```

## 🚨 Résolution de Problèmes

### "make logs" ne fonctionne pas depuis la racine
Si vous êtes à la racine du projet, assurez-vous que le Makefile pointe vers `backend/docker-compose.yml` :

```bash
# Option 1 : Aller dans le dossier backend
cd backend
make logs

# Option 2 : Utiliser directement docker compose
docker compose -f backend/docker-compose.yml logs -f

# Option 3 : Utiliser le Makefile racine (si configuré)
make logs
```

### Les logs ne s'affichent pas en temps réel
Ajoutez le flag `-f` (follow) :
```bash
docker compose -f backend/docker-compose.yml logs -f
```

### Trop de logs à l'écran
Limitez avec `--tail` :
```bash
docker compose -f backend/docker-compose.yml logs -f --tail=20
```

## 🔧 Commandes Utiles

```bash
# Statut de tous les services
make status

# Redémarrer un service (utile après modification)
make restart-auth-service

# Reconstruire et redémarrer un service
make rebuild-auth-service
```

---

**💡 Astuce** : Pour une meilleure lisibilité, utilisez toujours les commandes `make logs-<service>` qui sont plus simples à retenir !

