# 🚀 Guide de Setup Complet - JobbingTrack

**Date de création** : 2025-11-10  
**Objectif** : Guide complet pour configurer et initialiser le projet depuis zéro

---

## 📋 Table des Matières

1. [Vue d'ensemble](#-vue-densemble)
2. [Prérequis](#-prérequis)
3. [Installation Initiale](#-installation-initiale)
4. [Configuration](#-configuration)
5. [Premier Démarrage](#-premier-démarrage)
6. [Vérification](#-vérification)
7. [Dépannage](#-dépannage)

---

## 🎯 Vue d'ensemble

Ce guide vous accompagne étape par étape pour configurer JobbingTrack sur une nouvelle machine.

**Durée estimée** : 15-30 minutes

---

## 🔧 Prérequis

### 1. Vérifier les Outils Installés

```bash
# Docker
docker --version        # Doit être >= 20.10
docker info             # Doit fonctionner sans erreur

# Docker Compose
docker compose version  # ou docker-compose --version

# Make
make --version

# Git
git --version
```

### 2. Si Docker n'est pas installé

```bash
# Option 1 : Installation automatique
make install-docker

# Option 2 : Script manuel
./scripts/setup/install-docker.sh
```

**⚠️ Important** : Après installation Docker, redémarrer la session ou exécuter :
```bash
newgrp docker
```

---

## 📦 Installation Initiale

### Étape 1 : Cloner le Projet

```bash
git clone https://github.com/OWNER/JobbingTrack.git
cd JobbingTrack
```

### Étape 2 : Vérifier la Branche

```bash
# Vérifier la branche actuelle
git branch

# Si besoin, changer de branche
git checkout main
# ou
git checkout dev
```

### Étape 3 : Setup Complet Automatique (Recommandé)

**La méthode la plus simple** :

```bash
# Setup complet en une commande
make setup
```

Cette commande va automatiquement :
1. ✅ Vérifier/installer Docker
2. ✅ Proposer d'installer les emojis
3. ✅ Démarrer tous les services
4. ✅ Appliquer les migrations Prisma (`make db-push-all`)
5. ✅ Synchroniser l'utilisateur administrateur depuis `.env`

**Identifiants admin** :
- 📧 Email : valeur `ADMIN_EMAIL` dans `.env`
- 🔑 Password : valeur `ADMIN_PASSWORD` dans `.env` (jamais affichée dans les logs)

Si vous modifiez `ADMIN_PASSWORD`, relancez :

```bash
make seed-auth
```

Cette commande met à jour le hash du compte admin existant et vérifie l'email.

### Étape 4 : Configuration Initiale (Optionnel - Si setup automatique non utilisé)

```bash
# Créer un fichier .env si nécessaire
cp .env.example .env  # Si le fichier existe

# Éditer les variables si besoin
nano .env
```

**Note** : Les variables par défaut dans `docker-compose.yml` fonctionnent généralement.

---

## ⚙️ Configuration

### Installation des Emojis (Optionnel mais Recommandé)

Pour voir correctement tous les emojis dans l'interface et les commandes :

```bash
# Installation automatique
make install-emojis

# Ou manuellement sur Manjaro/Arch
sudo pacman -S noto-fonts-emoji
fc-cache -fv
```

**⚠️ Important** : Après installation, **redémarrer votre session graphique** (déconnexion/reconnexion) ou redémarrer l'ordinateur pour que les emojis s'affichent.

📖 **Guide complet** : [GUIDE_EMOJIS.md](GUIDE_EMOJIS.md)

---

### Configuration Docker

#### Vérifier les Permissions Docker

```bash
# Vérifier que vous êtes dans le groupe docker
groups | grep docker

# Si non, ajouter votre utilisateur
sudo usermod -aG docker $USER
newgrp docker

# Vérifier
docker ps
```

#### Vérifier les Ports Disponibles

Les ports suivants doivent être libres :
- `3000` - API Gateway
- `5432` - PostgreSQL
- `6379` - Redis
- `8080` - Frontend
- `8014` - Metrics Aggregator

```bash
# Vérifier les ports (Linux)
ss -tuln | grep -E ":(3000|5432|6379|8080|8014) "

# Si un port est occupé, trouver le processus
sudo lsof -i :8080
# Arrêter le processus si nécessaire
kill -9 <PID>
```

---

## 🚀 Premier Démarrage

### Méthode Recommandée : Setup Complet

```bash
# 1. Installer Docker si nécessaire
make install-docker

# 2. Redémarrer la session Docker
newgrp docker

# 3. Démarrer tous les services
make up-full

# 4. Attendre 30-60 secondes que les services démarrent

# 5. Vérifier le statut
make status
```

### Méthode Alternative : Setup Étape par Étape

```bash
# 1. Démarrer les services de base
make up

# 2. Attendre 10 secondes
sleep 10

# 3. Appliquer les migrations Prisma
make db-push-all

# 4. Créer l'utilisateur administrateur
make create-admin-user

# 5. Vérifier
make status
```

---

## ✅ Vérification

### 1. Vérifier les Services

```bash
# Voir tous les conteneurs
make ps

# Voir le statut détaillé
make status

# Vérifier la santé
make health
```

### 2. Vérifier les Logs

```bash
# Tous les logs
make logs

# Logs du frontend
make logs-service SERVICE=frontend

# Logs de l'API Gateway
make logs-service SERVICE=api-gateway
```

### 3. Vérifier l'Accès Web

Ouvrir dans le navigateur :

- **Frontend** : http://localhost:8080
  - Devrait afficher la page de connexion
  - Si erreur JavaScript, voir section Dépannage

- **API Gateway** : http://localhost:3000
  - Devrait répondre (peut être vide)

- **Metrics** : http://localhost:8014
  - Devrait afficher les métriques

### 4. Vérifier la Base de Données

```bash
# Se connecter à PostgreSQL
docker exec -it jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack

# Lister les tables
\dt

# Vérifier l'utilisateur admin
SELECT email, "firstName", "lastName" FROM "User" WHERE email = 'admin@jobbingtrack.test';

# Quitter
\q
```

---

## 🔧 Dépannage

### Problème 1 : Erreur JavaScript dans le Frontend

**Symptôme** : `Uncaught SyntaxError: Invalid or unexpected token` dans la console

**Solutions** :

```bash
# 1. Arrêter le frontend
make stop-service SERVICE=frontend

# 2. Nettoyer le cache Next.js
docker exec jobbingtrack-frontend rm -rf /app/.next
# ou depuis l'hôte
rm -rf frontend/.next

# 3. Rebuild le frontend
cd frontend
docker-compose -f docker-compose.frontend.yml build --no-cache frontend
cd ..

# 4. Redémarrer
make restart-service SERVICE=frontend

# 5. Vérifier les logs
make logs-service SERVICE=frontend
```

### Problème 2 : Permission Denied Docker

**Symptôme** : `permission denied while trying to connect to the Docker daemon socket`

**Solution** :

```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Redémarrer la session
newgrp docker

# Vérifier
docker ps
```

### Problème 3 : Frontend ne se Build pas

**Solution** :

```bash
# Rebuild complet du frontend
cd frontend
docker-compose -f docker-compose.frontend.yml build --no-cache
cd ..

# Redémarrer
make restart-service SERVICE=frontend
```

### Problème 4 : Erreurs de Migration Prisma

**Solution** :

```bash
# Appliquer les migrations manuellement
make db-push-all

# Ou pour un service spécifique
cd backend/auth-service
npx prisma db push
cd ../..
```

### Problème 5 : Services ne Démarrant pas

**Solution** :

```bash
# 1. Vérifier les logs
make logs

# 2. Vérifier les conteneurs
docker ps -a

# 3. Redémarrer proprement
make down
make up-full

# 4. Si problème persiste, rebuild
make rebuild
make up-full
```

### Problème 6 : Port Déjà Utilisé

**Solution** :

```bash
# Trouver le processus
sudo lsof -i :8080

# Arrêter le processus
kill -9 <PID>

# Ou changer le port dans docker-compose.yml
```

---

## 📝 Checklist de Setup

### Avant de Commencer
- [ ] Docker installé et fonctionnel
- [ ] Docker Compose installé
- [ ] Make installé
- [ ] Utilisateur dans le groupe docker
- [ ] Ports libres (3000, 5432, 6379, 8080, 8014)

### Installation
- [ ] Projet cloné
- [ ] Dans le bon dossier
- [ ] Branche correcte

### Configuration
- [ ] Docker daemon démarré
- [ ] Permissions Docker OK
- [ ] Ports disponibles
- [ ] Fichier .env créé (si nécessaire)

### Démarrage
- [ ] `make up-full` exécuté avec succès
- [ ] Services démarrés (vérifier avec `make ps`)
- [ ] Frontend accessible (http://localhost:8080)
- [ ] API Gateway accessible (http://localhost:3000)

### Vérification
- [ ] Logs sans erreurs critiques
- [ ] Base de données accessible
- [ ] Migrations Prisma appliquées
- [ ] Utilisateur admin créé
- [ ] Frontend fonctionne sans erreurs JavaScript

---

## 🎯 Commandes Essentielles

### Setup Initial
```bash
make install-docker      # Installer Docker
make up-full            # Démarrer tout
make db-push-all        # Migrations Prisma
make create-admin-user  # Créer admin
```

### Gestion Services
```bash
make up-full            # Démarrer tout
make down               # Arrêter tout
make restart            # Redémarrer
make status             # Statut
make logs               # Logs
```

### Dépannage
```bash
make logs-service SERVICE=frontend  # Logs frontend
make rebuild                        # Rebuild images
make db-fix-role                    # Fix DB
```

---

## 📚 Ressources Complémentaires

- [GUIDE_INSTALLATION.md](GUIDE_INSTALLATION.md) - Guide d'installation détaillé
- [GUIDE_STRUCTURE.md](GUIDE_STRUCTURE.md) - Guide d'amélioration structure
- [README.md](../README.md) - Documentation principale
- [docs/troubleshooting/guide/README.md](../troubleshooting/guide/README.md) - Dépannage avancé

---

## 🆘 Support

Si vous rencontrez des problèmes :

1. **Vérifier les logs** : `make logs`
2. **Vérifier le statut** : `make status`
3. **Consulter la documentation** : `docs/troubleshooting/`
4. **Vérifier STATUS.md** : Pour l'état actuel du projet

---

**Dernière mise à jour** : 2025-11-10  
**Version** : 1.0

