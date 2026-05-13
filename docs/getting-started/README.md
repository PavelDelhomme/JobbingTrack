# 🚀 Guide de Démarrage - JobbingTrack

Bienvenue sur **JobbingTrack**, votre plateforme de gestion de candidatures !

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Docker** (v20+) et **Docker Compose** (v2+)
- **Node.js** (v18+) et **npm** (v9+)
- **Make** (généralement préinstallé sur Linux/Mac)
- **Git**

## ⚡ Démarrage Rapide

### 1️⃣ Cloner le Projet

```bash
git clone https://github.com/votre-organisation/jobbingtrack.git
cd jobbingtrack
```

### 2️⃣ Configuration Initiale

Copier le fichier d'environnement exemple :

```bash
cp .env.example .env
```

**⚠️ IMPORTANT:** Modifiez les valeurs sensibles dans `.env` avant de créer l'admin :
- `POSTGRES_PASSWORD` - Mot de passe PostgreSQL
- `JWT_SECRET` et `JWT_REFRESH_SECRET` - Clés JWT
- `ADMIN_EMAIL` - Email administrateur
- `ADMIN_PASSWORD` - Mot de passe administrateur fort, sans valeur par défaut publique

### 3️⃣ Démarrer l'Application

```bash
# Démarrer tous les services
make up-full

# Attendre que les services démarrent (environ 30 secondes)
```

Le système vérifie automatiquement :
- ✅ Si les migrations Prisma sont nécessaires
- ✅ Si l'utilisateur admin existe

### 4️⃣ Appliquer les Migrations (si nécessaire)

```bash
make db-migrate
```

### 5️⃣ Créer l'Utilisateur Administrateur (si nécessaire)

```bash
make seed-auth
```

`make seed-auth` lit `ADMIN_EMAIL` / `ADMIN_PASSWORD` depuis `.env`, crée ou met à jour le compte `SUPER_ADMIN`, vérifie l'email et masque le mot de passe dans la sortie.

### 6️⃣ Accéder à l'Application

Ouvrez votre navigateur :

```
🌐 Frontend:    http://localhost:8080
📡 API Gateway: http://localhost:3000
```

**Identifiants admin :**
```
📧 Email:    valeur ADMIN_EMAIL dans .env
🔑 Password: valeur ADMIN_PASSWORD dans .env
```

## 🔄 Commandes Essentielles

### Gestion des Services

```bash
make up-full          # Démarrer tous les services
make down             # Arrêter tous les services
make restart          # Redémarrer tous les services
make status           # Voir le statut des services
make logs             # Voir les logs
```

### Gestion de la Base de Données

```bash
make db-migrate       # Appliquer les migrations Prisma
make db-seed          # Insérer des données de test
make db-clean         # Supprimer les volumes (nettoyage)
make db-reset         # Réinitialisation complète (⚠️ Supprime tout !)
```

### Gestion Admin

```bash
make create-admin-user    # Créer l'admin
make recreate-admin-user  # Recréer l'admin
```

### Aide

```bash
make help             # Aide générale
make help-db          # Aide base de données
```

## 📊 Monitoring (Optionnel)

Pour activer le monitoring complet (Prometheus, Grafana, Loki) :

```bash
make monitoring-full
```

Accès aux outils :
```
📊 Prometheus:  http://localhost:9090
📈 Grafana:     http://localhost:3013 (admin/admin)
```

## 🗑️ Nettoyage

### Supprimer les Volumes Obsolètes

```bash
# Supprimer uniquement les volumes JobbingTrack
make db-clean

# Supprimer les anciens volumes d'autres projets
./scripts/docker/cleanup-docker-volumes.sh
```

### Supprimer les Fichiers Obsolètes

```bash
./scripts/utils/cleanup-old-files.sh
```

## 🆘 En Cas de Problème

### Problème: Les services ne démarrent pas

```bash
# Vérifier Docker
docker ps

# Vérifier les logs
make logs

# Redémarrer proprement
make down
make up-full
```

### Problème: L'utilisateur admin ne fonctionne pas

```bash
# Recréer l'utilisateur
make recreate-admin-user
```

### Problème: Erreur de migration Prisma

```bash
# Réparer le rôle PostgreSQL
make db-fix-role

# Réappliquer les migrations
make db-migrate
```

### Réinitialisation Complète

Si tout est cassé, réinitialisez complètement :

```bash
make db-reset
# Taper 'oui' pour confirmer
```

Cette commande va :
1. Arrêter tous les services
2. Supprimer les volumes JobbingTrack
3. Redémarrer tout
4. Appliquer les migrations
5. Créer l'utilisateur admin

## 📚 Documentation Complète

- 🚀 [Guide de Redémarrage](REDEMARRAGE.md) - Comment redémarrer le projet
- 📖 [Commandes Makefile](../development/makefile-commands/README.md)
- 🔐 [Variables d'environnement](../deployment/environment-variables/README.md)
- 📊 [Configuration du monitoring](../monitoring/README.md)
- 🗄️ [Gestion de la base de données](../database/README.md)
- 🏗️ [Architecture](../core/architecture/README.md)
- 🔧 [Scripts](../scripts/README.md) - Tous les scripts disponibles

## 🎯 Prochaines Étapes

Une fois le système démarré :

1. **Connectez-vous** avec les identifiants admin
2. **Explorez le dashboard** pour voir les fonctionnalités
3. **Consultez la documentation** pour approfondir
4. **Personnalisez** les variables d'environnement pour votre usage

---

**Besoin d'aide ?** Consultez la [documentation complète](./README.md) ou les [FAQ](./troubleshooting/FAQ.md).
