# 🚀 Guide d'Installation et Configuration - JobbingTrack

**Date de création** : 2025-11-10  
**Objectif** : Guide complet pour installer, configurer et lancer le projet correctement

---

## 📋 Table des Matières

1. [Prérequis](#-prérequis)
2. [Installation](#-installation)
3. [Configuration](#-configuration)
4. [Démarrage](#-démarrage)
5. [Vérification](#-vérification)
6. [Dépannage](#-dépannage)
7. [Commandes Essentielles](#-commandes-essentielles)

---

## 🔧 Prérequis

### Logiciels Requis

#### 1. Docker & Docker Compose
```bash
# Vérifier l'installation
docker --version
docker-compose --version
# ou
docker compose version
```

**Installation si manquant** :

**Linux (Ubuntu/Debian)** :
```bash
# Installer Docker
curl -fsSL https://get.docker.com | sudo sh

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER

# Redémarrer la session ou exécuter :
newgrp docker

# Installer Docker Compose (plugin)
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Vérifier
docker compose version
```

**Linux (Manjaro/Arch)** :
```bash
# Installer Docker
sudo pacman -S docker docker-compose

# Démarrer Docker
sudo systemctl start docker
sudo systemctl enable docker

# Ajouter utilisateur au groupe
sudo usermod -aG docker $USER
newgrp docker

# Vérifier
docker --version
docker compose version
```

**macOS** :
```bash
# Installer Docker Desktop
# https://docs.docker.com/desktop/install/mac-install/

# Ou via Homebrew
brew install --cask docker
```

**Windows** :
- Télécharger Docker Desktop : https://docs.docker.com/desktop/install/windows-install/

#### 2. Make
```bash
# Vérifier
make --version
```

**Installation si manquant** :

**Linux (Ubuntu/Debian)** :
```bash
sudo apt-get install make
```

**Linux (Manjaro/Arch)** :
```bash
sudo pacman -S make
```

**macOS** :
```bash
# Déjà installé avec Xcode Command Line Tools
xcode-select --install
```

**Windows** :
- Installer via WSL ou utiliser `make` dans Git Bash

#### 3. Node.js (optionnel, pour développement)
```bash
# Vérifier
node --version  # Doit être >= 20.x
npm --version
```

**Installation** :
- https://nodejs.org/ (version LTS recommandée)

---

## 📦 Installation

### Étape 1 : Cloner le Projet

```bash
# Cloner le repository
git clone https://github.com/PavelDelhomme/JobbingTrack.git

# Aller dans le dossier
cd JobbingTrack
```

### Étape 2 : Vérifier les Prérequis

```bash
# Vérifier Docker
docker --version
docker info  # Doit fonctionner sans erreur

# Vérifier Docker Compose
docker compose version
# ou
docker-compose --version

# Vérifier Make
make --version
```

### Étape 3 : Vérifier les Ports Disponibles

Les ports suivants doivent être libres :
- `3000` - API Gateway
- `5432` - PostgreSQL
- `6379` - Redis
- `8080` - Frontend
- `8014` - Metrics Aggregator

```bash
# Vérifier les ports (Linux)
ss -tuln | grep -E ":(3000|5432|6379|8080|8014) "

# Ou avec netstat
netstat -tuln | grep -E ":(3000|5432|6379|8080|8014) "
```

Si des ports sont occupés :
```bash
# Trouver le processus
sudo lsof -i :3000

# Arrêter le processus (remplacer PID)
kill -9 <PID>
```

---

## ⚙️ Configuration

### Configuration Docker

#### Vérifier que Docker fonctionne
```bash
# Vérifier que le daemon Docker tourne
docker info

# Si erreur "permission denied" :
sudo usermod -aG docker $USER
newgrp docker

# Si erreur "Cannot connect to Docker daemon" :
sudo systemctl start docker
sudo systemctl enable docker
```

#### Vérifier Docker Compose

Le projet détecte automatiquement la commande Docker Compose :
- `docker compose` (plugin, recommandé)
- `docker-compose` (standalone)

Si aucune ne fonctionne :
```bash
# Installer Docker Compose standalone
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Vérifier
docker-compose --version
```

### Configuration Environnement

#### Variables d'Environnement (optionnel)

Créer un fichier `.env` à la racine si nécessaire :
```bash
# .env (exemple)
ADMIN_EMAIL=admin@jobbingtrack.com
ADMIN_PASSWORD=password123
DATABASE_URL=postgresql://jobbingtrack:jobbingtrack@postgres:5432/jobbingtrack
REDIS_URL=redis://redis:6379
```

**Note** : Les variables par défaut dans `docker-compose.yml` fonctionnent généralement.

### Configuration Base de Données

Les migrations Prisma sont appliquées automatiquement au démarrage, mais vous pouvez les forcer :

```bash
# Appliquer les migrations
make db-push-all

# Ou manuellement
cd backend/auth-service
npx prisma db push
```

---

## 🚀 Démarrage

### Méthode 1 : Démarrage Essentiel (Recommandé pour débuter)

```bash
# Démarrer les services essentiels
make up
```

**Services démarrés** :
- PostgreSQL
- Redis
- API Gateway
- Frontend
- Auth Service
- Dashboard Service
- Metrics Aggregator

**Accès** :
- Frontend : http://localhost:8080
- API Gateway : http://localhost:3000
- Metrics : http://localhost:8014

### Méthode 2 : Démarrage Complet

```bash
# Démarrer TOUS les services
make up-full
```

**⚠️ Important** : Cette commande :
1. Nettoie l'environnement Docker
2. Crée le réseau Docker
3. Démarre tous les services
4. Vérifie les migrations Prisma
5. Vérifie l'utilisateur admin

**Si erreur "docker: command not found"** :
```bash
# Vérifier que Docker est installé et dans le PATH
which docker

# Si non trouvé, ajouter au PATH ou utiliser le chemin complet
# Exemple : /usr/bin/docker
```

### Méthode 3 : Démarrage Sans Vérification (Contournement)

Si `make up-full` échoue avec des erreurs Docker :

```bash
# Démarrage sans vérification
make up-no-check
# ou
make up-mickdevil
```

**Note** : Cette méthode ignore les vérifications Docker mais peut échouer si Docker n'est pas correctement configuré.

---

## ✅ Vérification

### Vérifier que les Services Tournent

```bash
# Voir tous les conteneurs
make ps
# ou
docker ps

# Voir le statut détaillé
make status

# Vérifier la santé des services
make health
```

### Vérifier les Logs

```bash
# Tous les logs
make logs

# Logs d'un service spécifique
make logs-service SERVICE=api-gateway
make logs-service SERVICE=frontend
make logs-service SERVICE=auth-service
```

### Vérifier l'Accès Web

1. **Frontend** : http://localhost:8080
   - Devrait afficher la page de connexion

2. **API Gateway** : http://localhost:3000
   - Devrait répondre (peut être vide)

3. **Metrics** : http://localhost:8014
   - Devrait afficher les métriques

### Vérifier la Base de Données

```bash
# Se connecter à PostgreSQL
docker exec -it jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack

# Lister les tables
\dt

# Quitter
\q
```

---

## 🔧 Dépannage

### Problème 1 : "docker: command not found"

**Cause** : Docker n'est pas installé ou pas dans le PATH

**Solution** :
```bash
# 1. Vérifier l'installation
which docker

# 2. Si non trouvé, installer Docker (voir section Prérequis)

# 3. Vérifier le PATH
echo $PATH

# 4. Ajouter Docker au PATH si nécessaire
export PATH=$PATH:/usr/bin
```

### Problème 2 : "Cannot connect to Docker daemon"

**Cause** : Le daemon Docker n'est pas démarré

**Solution** :
```bash
# Démarrer Docker
sudo systemctl start docker

# Vérifier le statut
sudo systemctl status docker

# Activer au démarrage
sudo systemctl enable docker
```

### Problème 3 : "permission denied" avec Docker

**Cause** : L'utilisateur n'est pas dans le groupe docker

**Solution** :
```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Redémarrer la session ou :
newgrp docker

# Vérifier
docker ps
```

### Problème 4 : "docker-compose: command not found"

**Cause** : Docker Compose n'est pas installé

**Solution** :
```bash
# Le projet détecte automatiquement docker compose (plugin)
# Si ça ne fonctionne pas, installer docker-compose standalone :

sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Vérifier
docker-compose --version
```

### Problème 5 : Port déjà utilisé

**Cause** : Un autre processus utilise le port

**Solution** :
```bash
# Trouver le processus
sudo lsof -i :8080
# ou
sudo ss -tulpn | grep :8080

# Arrêter le processus
kill -9 <PID>

# Ou changer le port dans docker-compose.yml
```

### Problème 6 : Services ne démarrent pas

**Solution** :
```bash
# 1. Vérifier les logs
make logs

# 2. Vérifier les conteneurs
docker ps -a

# 3. Redémarrer proprement
make down
make up

# 4. Si problème persiste, rebuild
make rebuild
make up-full
```

### Problème 7 : Erreurs de migration Prisma

**Solution** :
```bash
# Appliquer les migrations manuellement
make db-push-all

# Ou pour un service spécifique
cd backend/auth-service
npx prisma db push
```

### Problème 8 : Frontend ne s'affiche pas

**Solution** :
```bash
# 1. Vérifier que le conteneur tourne
docker ps | grep frontend

# 2. Vérifier les logs
make logs-service SERVICE=frontend

# 3. Vérifier le port
curl http://localhost:8080

# 4. Redémarrer le frontend
make restart-service SERVICE=frontend
```

---

## 📝 Commandes Essentielles

### Démarrage/Arrêt
```bash
make up              # Services essentiels
make up-full         # Tous les services
make down            # Arrêter tous les services
make restart         # Redémarrer services actifs
```

### Gestion Services
```bash
make status          # Statut détaillé
make ps              # Liste conteneurs
make logs            # Tous les logs
make logs-service SERVICE=nom  # Logs d'un service
```

### Base de Données
```bash
make db-push-all     # Synchroniser schéma Prisma
make db-migrate      # Appliquer migrations
make db-fix-role     # Corriger permissions
```

### Tests
```bash
make tests-user-journey  # Tests parcours utilisateur
make health             # Vérifier santé services
```

### Diagnostic
```bash
make diagnostic-metrics  # Métriques système
make help               # Aide complète
```

---

## 🎯 Checklist d'Installation

### Avant de Commencer
- [ ] Docker installé et fonctionnel
- [ ] Docker Compose installé
- [ ] Make installé
- [ ] Ports libres (3000, 5432, 6379, 8080, 8014)
- [ ] Utilisateur dans le groupe docker

### Installation
- [ ] Projet cloné
- [ ] Dans le bon dossier
- [ ] Prérequis vérifiés

### Configuration
- [ ] Docker daemon démarré
- [ ] Permissions Docker OK
- [ ] Ports disponibles

### Démarrage
- [ ] `make up` exécuté avec succès
- [ ] Services démarrés (vérifier avec `make ps`)
- [ ] Frontend accessible (http://localhost:8080)
- [ ] API Gateway accessible (http://localhost:3000)

### Vérification
- [ ] Logs sans erreurs critiques
- [ ] Base de données accessible
- [ ] Migrations Prisma appliquées
- [ ] Utilisateur admin créé

---

## 📚 Ressources Complémentaires

- [STATUS.md](STATUS.md) - État actuel du projet
- [README.md](README.md) - Documentation principale
- [GUIDE_STRUCTURE.md](GUIDE_STRUCTURE.md) - Guide d'amélioration structure
- [docs/getting-started/README.md](docs/getting-started/README.md) - Guide démarrage détaillé
- [docs/troubleshooting/guide/README.md](docs/troubleshooting/guide/README.md) - Dépannage avancé

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

