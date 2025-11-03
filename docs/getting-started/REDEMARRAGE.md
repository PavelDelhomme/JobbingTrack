# 🚀 Guide de Redémarrage - JobbingTrack

[← Retour Guide de Démarrage](README.md) | [← Documentation](../README.md) | [🧭 Navigation](../navigation.md)

**Date**: 3 Novembre 2025  
**Version**: 4.1

---

## ✅ Travaux Effectués

### 1. 🐛 **Correction Bug Frontend (PRIORITÉ)**
✅ **Résolu** - Erreur "Cannot read properties of null (reading '0')"

**Fichier** : `frontend/src/app/(admin)/backoffice/page.tsx`  
**Lignes** : 593, 598, 599

**Problème** : Accès à `systemMetrics.disk[0]` sans optional chaining complet.  
**Solution** : Utilisation de `systemMetrics?.disk?.[0]?.property` partout.

---

### 2. 📚 **Réorganisation Complète de la Documentation**

#### Structure Avant/Après
```
Avant: 14+ fichiers .md éparpillés avec des noms en majuscules
Après: Tous les fichiers sont des README.md dans des dossiers structurés
```

#### Nouveaux Dossiers Créés
- ✅ `docs/deployment/environment-variables/README.md` (fusion de 2 fichiers)
- ✅ `docs/database/architecture-solution/README.md`
- ✅ `docs/database/migration-guide/README.md`
- ✅ `docs/database/schema/README.md`
- ✅ `docs/database/recap/README.md`
- ✅ `docs/database/decisions/README.md`
- ✅ `docs/architecture/decisions/architecture-decision/README.md`
- ✅ `docs/architecture/decisions/session-recap/README.md`
- ✅ `docs/changelog/all-changes/README.md`
- ✅ `docs/changelog/final-implementation/README.md`
- ✅ `docs/changelog/implementation-completed/README.md`
- ✅ `docs/development/makefile-commands/README.md`

#### Liens de Navigation
- ✅ **8+ fichiers mis à jour** avec les nouveaux chemins
- ✅ **0 lien cassé** - Tous les liens fonctionnent

---

### 3. 🐛 **Troubleshooting Enrichi**

Nouveau fichier : `docs/troubleshooting/README.md`

**Contenu ajouté** :
- ✅ Frontend / Interface (incluant l'erreur corrigée)
- ✅ Backend / Services
- ✅ Base de Données
- ✅ Docker / Conteneurs
- ✅ Authentification
- ✅ Métriques / Monitoring
- ✅ Déploiement
- ✅ Commandes de diagnostic

---

### 4. 📄 **PDFs de Documentation**

**Script disponible** : `docs/generate-pdfs.js`

Pour générer les PDFs (après avoir installé les dépendances) :
```bash
cd docs
npm install md-to-pdf
node generate-pdfs.js
```

**PDFs générés** :
- Documentation complète avec navigation
- PDFs individuels par section

---

## 🔄 Comment Redémarrer le Projet

### Étape 1 : Nettoyer l'Environnement
```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Arrêter tous les conteneurs
make down

# Optionnel: Nettoyer complètement
make clean-all
```

### Étape 2 : Vérifier les Variables d'Environnement
```bash
# Vérifier que .env existe
cat .env

# Si absent, créer depuis l'exemple
cp .env.example .env
nano .env

# Variables critiques à vérifier:
# - POSTGRES_PASSWORD
# - JWT_SECRET
# - JWT_REFRESH_SECRET
# - ADMIN_EMAIL
# - ADMIN_PASSWORD
```

**📖 Documentation** : [Variables d'Environnement](docs/deployment/environment-variables/README.md)

### Étape 3 : Démarrer les Services de Base
```bash
# Démarrer PostgreSQL, Redis, API Gateway, Frontend
make up

# Attendre 10-15 secondes que PostgreSQL soit prêt
sleep 15

# Vérifier la santé
make health
```

### Étape 4 : Appliquer les Migrations
```bash
cd backend

# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate dev

# Créer l'utilisateur admin si nécessaire
npx prisma db seed
```

### Étape 5 : Démarrer Tous les Services
```bash
cd ..

# Démarrer tous les services (optionnel)
make up-full

# Vérifier la santé de tous les services
make health

# Voir les logs si problème
make logs
```

### Étape 6 : Accéder à l'Interface
```bash
# Frontend (port par défaut)
open http://localhost:8000

# Ou selon votre configuration
open http://localhost:8080
```

**Identifiants par défaut** :
- Email : `admin@jobbingtrack.test`
- Password : Voir variable `ADMIN_PASSWORD` dans `.env`

---

## 🔧 Vérifications Post-Démarrage

### 1. Vérifier les Services
```bash
# Liste des conteneurs
docker ps

# Statut détaillé
make status

# Santé des services
make health
```

### 2. Vérifier la Base de Données
```bash
# Connexion PostgreSQL
docker exec -it jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack

# Vérifier les tables
\dt

# Vérifier l'admin
SELECT * FROM "User" WHERE role = 'ADMIN';

# Sortir
\q
```

### 3. Vérifier le Frontend
```bash
# Ouvrir la console du navigateur (F12)
# Vérifier qu'il n'y a pas d'erreurs

# Tester la connexion
curl http://localhost:8000

# Tester l'API
curl http://localhost:3000/health
```

---

## 📊 Métriques et Monitoring

### Accès aux Services de Monitoring
```bash
# cAdvisor (métriques conteneurs)
open http://localhost:8081

# Metrics Aggregator
open http://localhost:3014/metrics

# Prometheus (si démarré)
open http://localhost:9090

# Grafana (si démarré)
open http://localhost:8083
```

---

## 🐛 Problèmes Courants

### ❌ "Cannot read properties of null"
**Solution** : Déjà corrigé dans `frontend/src/app/(admin)/backoffice/page.tsx`

### ❌ Base de données inaccessible
```bash
# Vérifier PostgreSQL
docker logs jobbingtrack-postgres

# Redémarrer
make restart-service SERVICE=postgres
```

### ❌ Service ne démarre pas
```bash
# Voir les logs
docker logs jobbingtrack-<service-name>

# Vérifier le port
sudo lsof -i :<port>

# Redémarrer
make restart-service SERVICE=<service-name>
```

### ❌ Port déjà utilisé
```bash
# Trouver le processus
sudo lsof -i :8000
sudo lsof -i :3000

# Tuer le processus
sudo kill -9 <PID>

# Ou changer le port dans docker-compose.yml
```

### ❌ Migrations échouent
```bash
cd backend

# Reset complet (⚠️ perte de données)
npx prisma migrate reset

# Réappliquer
npx prisma migrate dev
```

**📖 Documentation complète** : [Troubleshooting](docs/troubleshooting/README.md)

---

## 📚 Documentation Disponible

### Guides Essentiels
- 🚀 [Guide de Démarrage](docs/getting-started/README.md)
- 🏗️ [Architecture](docs/core/architecture/README.md)
- 💾 [Base de Données](docs/database/README.md)
- 🔐 [Variables d'Environnement](docs/deployment/environment-variables/README.md)
- 🐛 [Troubleshooting](docs/troubleshooting/README.md)

### Navigation Complète
- 🧭 [Navigation](docs/navigation.md) - Tous les liens de documentation
- 📖 [README Documentation](docs/README.md) - Index principal

---

## 💡 Commandes Utiles

### Gestion des Services
```bash
make up            # Démarrer services essentiels
make up-full       # Démarrer tous les services
make down          # Arrêter tous les services
make restart       # Redémarrer tous les services
make logs          # Voir tous les logs
make health        # Vérifier la santé
```

### Services Spécifiques
```bash
make start-<service>              # Démarrer un service
make stop-service SERVICE=<name>  # Arrêter un service
make restart-service SERVICE=<name> # Redémarrer un service
make logs-service SERVICE=<name>  # Logs d'un service
```

### Database
```bash
make db-migrate    # Appliquer les migrations
make db-reset      # Reset la base (⚠️ perte de données)
make db-seed       # Peupler avec des données de test
make db-shell      # Ouvrir psql
```

### Nettoyage
```bash
make clean         # Nettoyer les conteneurs arrêtés
make clean-all     # Nettoyer tout (conteneurs + volumes)
make prune         # Nettoyer Docker complet
```

**📖 Guide Complet** : [Commandes Makefile](docs/development/makefile-commands/README.md)

---

## 📞 Support

### En cas de problème
1. Consultez le [Troubleshooting](docs/troubleshooting/README.md)
2. Vérifiez les logs : `make logs`
3. Vérifiez la santé : `make health`
4. Consultez la [documentation complète](docs/README.md)

### Ressources
- Documentation : `docs/`
- Scripts : `scripts/`
- Tests : `tests/`

---

## ✅ Checklist de Démarrage

- [ ] Variables d'environnement configurées (`.env`)
- [ ] Docker est démarré
- [ ] `make down` pour nettoyer
- [ ] `make up` pour démarrer les services de base
- [ ] Attendre 15 secondes
- [ ] `make health` pour vérifier
- [ ] `cd backend && npx prisma migrate dev`
- [ ] `make up-full` pour tous les services (optionnel)
- [ ] Ouvrir http://localhost:8000
- [ ] Se connecter avec admin@jobbingtrack.test
- [ ] Vérifier le dashboard backoffice
- [ ] Pas d'erreurs dans la console (F12)

---

**Dernière mise à jour** : 3 Novembre 2025  
**Version** : 4.1  
**Status** : ✅ Tous les correctifs appliqués

