# 🐛 Guide Dépannage - JobbingTrack

Guide de résolution des problèmes pour JobbingTrack v4.1.

[← Retour à la documentation](../README.md) | [🧭 Navigation](../navigation.md)

## 🎯 Vue d'ensemble

Solutions aux problèmes courants et diagnostic pour JobbingTrack.

---

## 📋 Table des Matières

- [🖥️ Frontend / Interface](#-frontend--interface)
- [🔧 Backend / Services](#-backend--services)
- [💾 Base de Données](#-base-de-données)
- [🐳 Docker / Conteneurs](#-docker--conteneurs)
- [🔐 Authentification](#-authentification)
- [📊 Métriques / Monitoring](#-métriques--monitoring)
- [🚀 Déploiement](#-déploiement)

## 📚 Documents de Corrections

### 🐛 Corrections Appliquées
- **[Corrections Analytics Dashboard](CORRECTIONS_ANALYTICS_DASHBOARD.md)** - Corrections du tableau de bord analytics
- **[Corrections Erreurs 404 et Timeouts](CORRECTIONS_ERREURS_404_TIMEOUTS.md)** - Résolution des erreurs 404 et timeouts
- **[Corrections Finales Session](CORRECTIONS_FINALES_SESSION.md)** - Corrections finales de la session de développement
- **[Corrections Graphiques Analytics](CORRECTIONS_GRAPHIQUES_ANALYTICS.md)** - Corrections des graphiques dans le dashboard analytics

---

## 🖥️ Frontend / Interface

### ❌ Erreur: "Cannot read properties of null (reading '0')"

**Symptôme** :
```
TypeError: Cannot read properties of null (reading '0')
at BackofficePage (webpack-internal:///(app-pages-browser)/./src/app/(admin)/backoffice/page.tsx:981:451)
```

**Cause** : Accès à un tableau sans vérifier qu'il existe et contient des éléments.

**Solution** :
1. Utiliser l'optional chaining `?.` partout où vous accédez à des propriétés potentiellement nulles
2. Exemple incorrect :
```typescript
{systemMetrics?.disk?.[0]?.usage_percent !== undefined ? 
  `${systemMetrics.disk[0].usage_percent}%` : '...'}  // ❌ Accès direct
```

3. Exemple correct :
```typescript
{systemMetrics?.disk?.[0]?.usage_percent !== undefined ? 
  `${systemMetrics?.disk?.[0]?.usage_percent}%` : '...'}  // ✅ Optional chaining
```

**Prévention** :
- Toujours utiliser l'optional chaining pour les données provenant d'APIs
- Ajouter des valeurs par défaut avec `?? 0` ou `?? []`

---

### ❌ Page blanche après connexion

**Symptôme** : La page reste blanche après une connexion réussie.

**Causes possibles** :
1. Token JWT expiré
2. Cookies non configurés
3. Erreur de routing Next.js

**Solutions** :
```bash
# 1. Vider le cache du navigateur
Ctrl + Shift + R (ou Cmd + Shift + R sur Mac)

# 2. Vérifier les cookies dans DevTools
- Ouvrir DevTools (F12)
- Onglet Application > Cookies
- Vérifier que 'token' existe

# 3. Redémarrer le frontend
cd frontend
npm run dev
```

---

### ❌ Erreur "CORS policy" dans la console

**Symptôme** :
```
Access to fetch at 'http://localhost:3000' has been blocked by CORS policy
```

**Solution** :
1. Vérifier que l'API Gateway est démarrée
```bash
docker ps | grep api-gateway
```

2. Vérifier les variables d'environnement :
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:3001
```

3. Redémarrer les services :
```bash
make restart-service SERVICE=api-gateway
```

---

## 🔧 Backend / Services

### ❌ Service ne démarre pas

**Symptôme** : Un service reste en status "restarting" ou "unhealthy".

**Diagnostic** :
```bash
# Voir les logs du service
docker logs jobbingtrack-auth-service

# Vérifier le statut
docker ps -a | grep auth-service

# Vérifier la santé
docker inspect jobbingtrack-auth-service | grep -A 10 Health
```

**Solutions courantes** :

1. **Base de données non accessible** :
```bash
# Vérifier PostgreSQL
docker logs jobbingtrack-postgres

# Tester la connexion
docker exec -it jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack
```

2. **Port déjà utilisé** :
```bash
# Trouver le processus utilisant le port
sudo lsof -i :3001

# Libérer le port
sudo kill -9 <PID>
```

3. **Variables d'environnement manquantes** :
```bash
# Vérifier dans docker-compose.yml
cat backend/docker-compose.yml | grep -A 5 "auth-service:"

# Ajouter dans .env si nécessaire
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env
```

---

### ❌ Erreur "Connection refused" entre services

**Symptôme** : Les services ne peuvent pas communiquer entre eux.

**Solution** :
```bash
# 1. Vérifier le réseau Docker
docker network ls | grep jobbingtrack
docker network inspect jobbingtrack-network

# 2. Recréer le réseau si nécessaire
docker network rm jobbingtrack-network
docker network create jobbingtrack-network

# 3. Redémarrer tous les services
make down && make up-full
```

---

## 💾 Base de Données

### ❌ Erreur "relation does not exist"

**Symptôme** :
```
ERROR: relation "User" does not exist
```

**Cause** : Tables non créées ou migrations non appliquées.

**Solution** :
```bash
# 1. Appliquer les migrations
cd backend
npx prisma migrate dev

# 2. Si échec, reset la base
npx prisma migrate reset
npx prisma migrate dev

# 3. Générer le client Prisma
npx prisma generate
```

---

### ❌ Erreur "password authentication failed"

**Symptôme** : Impossible de se connecter à PostgreSQL.

**Solution** :
```bash
# 1. Vérifier les credentials
cat .env | grep POSTGRES

# 2. Reset le mot de passe
docker exec -it jobbingtrack-postgres psql -U postgres
ALTER USER jobbingtrack WITH PASSWORD 'nouveau_mot_de_passe';
\q

# 3. Mettre à jour .env
POSTGRES_PASSWORD=nouveau_mot_de_passe

# 4. Redémarrer
make restart-service SERVICE=postgres
```

---

### ❌ Base de données corrompue

**Symptôme** : Erreurs aléatoires, données incohérentes.

**Solution** :
```bash
# 1. Backup de la base actuelle
docker exec jobbingtrack-postgres pg_dump -U jobbingtrack jobbingtrack > backup.sql

# 2. Supprimer le volume
docker volume rm jobbingtrack_postgres_data

# 3. Recréer et restaurer
make up-full
docker exec -i jobbingtrack-postgres psql -U jobbingtrack jobbingtrack < backup.sql
```

---

## 🐳 Docker / Conteneurs

### ❌ Erreur "no space left on device"

**Symptôme** : Impossible de créer des conteneurs ou volumes.

**Solution** :
```bash
# 1. Nettoyer Docker
docker system prune -a --volumes

# 2. Supprimer les images inutilisées
docker image prune -a

# 3. Vérifier l'espace disque
df -h
```

---

### ❌ Build Docker échoue

**Symptôme** : `docker build` ou `docker-compose build` échoue.

**Solutions** :

1. **Cache corrompu** :
```bash
docker-compose build --no-cache
```

2. **Manque de mémoire** :
```bash
# Augmenter la mémoire Docker (Docker Desktop)
# Settings > Resources > Memory: 4GB minimum
```

3. **Dépendances npm manquantes** :
```bash
# Nettoyer node_modules et package-lock.json
rm -rf node_modules package-lock.json
npm install
```

---

### ❌ Conteneur s'arrête immédiatement

**Symptôme** : Le conteneur démarre puis s'arrête aussitôt.

**Diagnostic** :
```bash
# Voir les logs
docker logs <container_name>

# Démarrer en mode interactif pour debug
docker run -it <image_name> /bin/sh
```

---

## 🔐 Authentification

### ❌ Token JWT invalide ou expiré

**Symptôme** : Déconnexion automatique ou erreur "Invalid token".

**Solution** :
```bash
# 1. Vérifier la configuration JWT
cat .env | grep JWT_SECRET

# 2. Générer un nouveau secret si nécessaire
openssl rand -base64 64

# 3. Mettre à jour et redémarrer
echo "JWT_SECRET=<nouveau_secret>" >> .env
make restart-service SERVICE=auth-service
```

---

### ❌ Impossible de se connecter en tant qu'admin

**Symptôme** : Erreur "Invalid credentials" avec les bons identifiants.

**Solution** :
```bash
# 1. Vérifier que l'admin existe
docker exec -it jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack
SELECT * FROM "User" WHERE role = 'ADMIN';
\q

# 2. Si absent, créer l'admin
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@jobbingtrack.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'JobbingTrack',
      role: 'ADMIN'
    }
  });
}

main();
"
```

---

## 📊 Métriques / Monitoring

### ❌ Métriques non disponibles

**Symptôme** : Dashboard affiche "..." ou erreurs de chargement.

**Solution** :
```bash
# 1. Vérifier le service metrics-aggregator
docker logs jobbingtrack-metrics-aggregator

# 2. Vérifier cAdvisor
curl http://localhost:8081/metrics

# 3. Redémarrer les services de monitoring
make restart-service SERVICE=metrics-aggregator
make restart-service SERVICE=cadvisor
```

---

### ❌ Prometheus ne collecte pas les métriques

**Symptôme** : Graphiques vides dans Grafana.

**Solution** :
```bash
# 1. Vérifier la configuration Prometheus
cat backend/monitoring/configs/prometheus.yml

# 2. Tester les endpoints
curl http://localhost:3014/metrics  # Metrics Aggregator
curl http://localhost:8081/metrics  # cAdvisor

# 3. Reload Prometheus
docker exec jobbingtrack-prometheus kill -HUP 1
```

---

## 🚀 Déploiement

### ❌ Erreur lors du make up

**Symptôme** : `make up` échoue avec des erreurs.

**Solution étape par étape** :
```bash
# 1. Nettoyer complètement
make clean-all

# 2. Vérifier les variables d'environnement
cat .env

# 3. Rebuilder les images
make build

# 4. Démarrer progressivement
make up-core      # D'abord les services de base
sleep 10
make up-full      # Puis tous les services

# 5. Vérifier la santé
make health
```

---

### ❌ Migrations Prisma échouent

**Symptôme** : `npx prisma migrate dev` échoue.

**Solution** :
```bash
# 1. Vérifier que la base est accessible
docker exec -it jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1;"

# 2. Supprimer les migrations partielles
cd backend/prisma/migrations
rm -rf <derniere_migration_incomplete>

# 3. Réessayer
cd ../..
npx prisma migrate dev --name init

# 4. Si vraiment bloqué, reset
npx prisma migrate reset
```

---

## 🔍 Commandes de Diagnostic Utiles

### Vérification globale
```bash
# Statut de tous les conteneurs
docker ps -a

# Utilisation des ressources
docker stats

# Logs en temps réel
docker-compose logs -f

# Santé des services
make health
```

### Vérification réseau
```bash
# Tester la connectivité entre services
docker exec jobbingtrack-frontend ping api-gateway
docker exec jobbingtrack-auth-service ping postgres
```

### Vérification base de données
```bash
# Connexion PostgreSQL
docker exec -it jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack

# Lister les tables
\dt

# Vérifier une table
SELECT * FROM "User" LIMIT 5;

# Sortir
\q
```

---

## 📚 Ressources Supplémentaires

- 🏗️ [Architecture](../core/architecture/README.md) - Comprendre l'architecture
- 🔐 [Variables d'environnement](../deployment/environment-variables/README.md) - Configuration
- 💾 [Base de Données](../database/README.md) - Gestion BDD
- 📊 [Monitoring](../monitoring/README.md) - Système de surveillance
- 🚀 [Déploiement](../deployment/production/README.md) - Guide production

---

## 🆘 Support

Si votre problème n'est pas listé ici :

1. Consultez les logs détaillés : `make logs`
2. Vérifiez les issues GitHub : [GitHub Issues](https://github.com/votre-repo/jobbingtrack/issues)
3. Consultez la documentation complète : [docs/README.md](../README.md)

---

**Version**: 4.1  
**Dernière mise à jour**: Novembre 2025  
**Mainteneur**: JobbingTrack Team
