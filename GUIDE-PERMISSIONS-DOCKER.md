# 🐳 Guide - Permissions Docker pour Fonctionnalités Admin Avancées

---

## 🎯 Problème

Les fonctionnalités suivantes nécessitent que l'API Gateway puisse exécuter des commandes Docker :
- 📋 **Logs en temps réel** : `docker logs -f`
- 🔄 **Redémarrage de services** : `docker restart`
- 🛑 **Arrêt de services** : `docker stop`
- ▶️ **Démarrage de services** : `docker start`

**Erreur actuelle** : `Permission denied`

**Raison** : L'API Gateway s'exécute en tant qu'utilisateur non-root (`nodejs`) dans le conteneur et ne peut pas accéder au socket Docker.

---

## ✅ Solutions

### Solution 1 : Exécuter en Root (Rapide, Moins Sécurisé)

**Avantages** : Rapide, fonctionne immédiatement  
**Inconvénients** : Moins sécurisé (root dans le conteneur)

#### Étapes

1. **Modifier le Dockerfile de l'API Gateway**

```dockerfile
# Fichier: backend/api-gateway/Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev

# Copier le code source
COPY . .

# ❌ COMMENTÉ - Ne pas créer d'utilisateur non-root
# RUN addgroup -g 1001 -S nodejs
# RUN adduser -S nodejs -u 1001
# RUN chown -R nodejs:nodejs /app
# USER nodejs

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]
```

2. **Rebuilder l'API Gateway**

```bash
cd backend
docker compose up -d --build api-gateway
```

3. **Tester**

```bash
./test-admin-features.sh
```

---

### Solution 2 : Permissions sur le Socket Docker (Moyen, Plus Sécurisé)

**Avantages** : Plus sécurisé que root  
**Inconvénients** : Configuration plus complexe

#### Étapes

1. **Modifier le Dockerfile**

```dockerfile
# Fichier: backend/api-gateway/Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev

# Copier le code source
COPY . .

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# ✅ NOUVEAU - Ajouter nodejs au groupe docker (GID 999 typique sur l'hôte)
RUN addgroup -g 999 docker || true
RUN adduser nodejs docker || true

# Changer les permissions
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]
```

2. **Modifier docker-compose.yml**

```yaml
api-gateway:
  build:
    context: ./api-gateway
    dockerfile: Dockerfile
  volumes:
    # ✅ Monter le socket avec le bon GID
    - /var/run/docker.sock:/var/run/docker.sock:rw
    - /usr/bin/docker:/usr/bin/docker:ro
  # ✅ NOUVEAU - Ajouter le groupe docker
  group_add:
    - "999"  # GID du groupe docker sur l'hôte
```

3. **Vérifier le GID docker sur votre machine**

```bash
getent group docker | cut -d: -f3
```

4. **Rebuilder**

```bash
cd backend
docker compose down
docker compose up -d --build api-gateway
```

---

### Solution 3 : API Docker via API REST (Production, Plus Complexe)

**Avantages** : Très sécurisé, scalable  
**Inconvénients** : Nécessite un service intermédiaire

#### Architecture

```
Frontend → API Gateway → Docker Management Service → Docker API
```

#### Étapes

1. **Créer un docker-management-service** dédié
2. **Exécuter ce service en root ou avec permissions Docker**
3. **L'API Gateway appelle ce service via HTTP**
4. **Le service gère Docker et retourne les résultats**

**Note** : Cette solution est recommandée pour la production mais est trop complexe pour le développement actuel.

---

### Solution 4 : Désactiver les Fonctionnalités (Temporaire)

**Avantages** : Aucune modification nécessaire  
**Inconvénients** : Perte de fonctionnalités

#### Frontend

Masquer les boutons/fonctionnalités non fonctionnels :

```tsx
// Dans frontend/src/app/backoffice/services/page.tsx
const canManageDocker = false; // Mettre à false

{canManageDocker && (
  <button onClick={onRestart}>
    Redémarrer
  </button>
)}
```

---

## 🎯 Recommandation

### Pour Développement
**Utilisez la Solution 1** (Root) - C'est rapide et suffisant pour le dev.

### Pour Production
**Planifiez la Solution 3** (Service dédié) - C'est la plus sécurisée et maintenable.

---

## 🧪 Test Après Application

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
./backend/test-admin-features.sh
```

Si tout est vert :
- ✅ Login SUPER_ADMIN
- ✅ Liste services
- ✅ **Logs récupérés** (nouveau !)
- ✅ Corbeille accessible
- ✅ Soft delete OK
- ✅ **Redémarrage service OK** (nouveau !)
- ✅ Scheduler actif

Alors les fonctionnalités admin avancées sont complètement opérationnelles ! 🎉

---

## 📚 Références

- Docker socket permissions : https://docs.docker.com/engine/install/linux-postinstall/
- Docker security : https://docs.docker.com/engine/security/
- Docker API : https://docs.docker.com/engine/api/

---

**Note** : Les fonctionnalités core (auth, corbeille, CRON, soft delete) fonctionnent déjà sans ces modifications ! Ces solutions ne sont nécessaires QUE si vous voulez les logs temps réel et le redémarrage de services depuis le dashboard.

