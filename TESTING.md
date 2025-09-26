# 🧪 Guide de Tests - JobbingTrack Backend

Ce guide vous permet de **tester systématiquement** votre backend pour vérifier que tout fonctionne correctement.

## 📋 **Plan de Tests Complet**

### ✅ **Phase 1 : Tests d'Infrastructure**
### ✅ **Phase 2 : Tests de l'API** 
### ✅ **Phase 3 : Tests des Fonctionnalités**
### ✅ **Phase 4 : Tests de Performance**

---

## 🚀 **Phase 1 : Tests d'Infrastructure**

### **1.1 Test du Makefile**

```bash
# Vérifier que le Makefile fonctionne
make help
# ✅ Doit afficher toutes les commandes avec descriptions colorées
```

### **1.2 Test de l'Installation**

```bash
# Installation complète depuis zéro
make clean-all          # Nettoie tout
make install           # Installe les dépendances
# ✅ Doit installer sans erreur et afficher "Installation terminée!"
```

### **1.3 Test du Build**

```bash
# Test build rapide
make build-fast
# ✅ Doit construire en moins de 30 secondes
# ✅ Pas d'erreur de build
# ✅ Image créée avec succès
```

### **1.4 Test des Services**

```bash
# Démarrer tous les services
make up
# ✅ Tous les services doivent démarrer (API, DB, Redis, Adminer)

# Vérifier le statut
make status
# ✅ Tous les containers en "Up" état
```

---

## 🗄️ **Phase 2 : Tests de Base de Données**

### **2.1 Test des Migrations**

```bash
# Test migration Prisma
make migrate
# ✅ Tables créées sans erreur
# ✅ Schema appliqué correctement
```

### **2.2 Test du Seed**

```bash
# Peupler avec des données de test
make seed
# ✅ Données insérées sans erreur
# ✅ Utilisateur de test créé
```

### **2.3 Test Prisma Studio**

```bash
# Ouvrir l'interface DB
make studio
# ✅ Interface accessible sur http://localhost:5555
# ✅ Tables visibles avec données
```

---

## 🔗 **Phase 3 : Tests de l'API**

### **3.1 Test de Santé**

```bash
# Test automatique
make health
# ✅ Doit retourner status: "OK"

# Test manuel
curl http://localhost:3000/health
# ✅ Response JSON avec timestamp et version
```

### **3.2 Test Documentation**

```bash
# Vérifier Swagger
make endpoints
# ✅ Documentation accessible sur http://localhost:3000/api-docs
# ✅ Status 200 pour /api-docs
```

### **3.3 Test Authentification**

```bash
# Test inscription
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-'$(date +%s)'@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
# ✅ Status 201, utilisateur créé, tokens retournés

# Test connexion avec compte de test
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pavel@jobbingtrack.com",
    "password": "password123"
  }'
# ✅ Status 200, tokens JWT retournés
```

### **3.4 Test Candidatures**

```bash
# D'abord se connecter et récupérer le token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pavel@jobbingtrack.com","password":"password123"}' \
  | jq -r '.tokens.accessToken')

# Test création candidature
curl -X POST http://localhost:3000/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "companyName": "Test Company",
    "position": "Test Position",
    "location": "Remote",
    "type": "FULL_TIME",
    "status": "DRAFT"
  }'
# ✅ Status 201, candidature créée

# Test récupération candidatures
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/applications
# ✅ Status 200, liste des candidatures retournée

# Test statistiques
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/applications/stats
# ✅ Status 200, statistiques retournées
```

---

## 🔥 **Phase 4 : Tests de Fonctionnalités Avancées**

### **4.1 Test Hot Reload**

```bash
# Dans un terminal : voir les logs
make logs-api

# Dans un autre terminal : modifier un fichier
echo "console.log('🔥 Hot reload test - $(date)');" >> backend/src/server.js

# ✅ Le serveur doit redémarrer automatiquement
# ✅ Nouveau log visible dans les logs
```

### **4.2 Test Shell & Debug**

```bash
# Accéder au container API
make shell-api
# ✅ Shell bash/sh ouvert dans le container

# Depuis le shell, tester Prisma
npx prisma db push --preview-feature
exit

# Accéder à la DB
make shell-db
# ✅ Shell PostgreSQL ouvert
# Tester : \dt (lister les tables)
# ✅ Tables Prisma visibles
\q
```

### **4.3 Test Backup/Restore**

```bash
# Créer une sauvegarde
make backup
# ✅ Fichier backup créé dans backups/
# ✅ Nom avec timestamp

# Lister les backups
ls backups/
# ✅ Fichier .sql présent

# Test restore (optionnel - attention destructif)
# make restore FILE=backups/backup_YYYYMMDD_HHMMSS.sql
```

### **4.4 Test Qualité Code**

```bash
# Test linting
make lint
# ✅ Pas d'erreur ESLint ou warnings corrigés

# Test formatage
make format
# ✅ Code formaté avec Prettier

# Test unitaires (si implémentés)
make test
# ✅ Tests passent ou aucun test configuré
```

---

## 📊 **Phase 5 : Tests de Performance**

### **5.1 Test Build Speed**

```bash
# Build complet
time make build
# ✅ Noter le temps (baseline)

# Build rapide
time make build-fast  
# ✅ Doit être 3-5x plus rapide

# Build parallèle
time make build-parallel
# ✅ Intermédiaire entre les deux
```

### **5.2 Test Start Speed**

```bash
# Démarrage standard
make down
time make up
# ✅ Noter le temps de démarrage

# Démarrage rapide
make down
time make dev
# ✅ Démarrage optimisé
```

### **5.3 Test de Charge (Optionnel)**

```bash
# Installer Apache Bench si nécessaire
sudo apt-get install apache2-utils  # Ubuntu
brew install httpie                  # macOS

# Test de charge simple
ab -n 100 -c 10 http://localhost:3000/health
# ✅ 100 requêtes réussies
# ✅ Temps de réponse acceptable
```

---

## 🎯 **Workflow de Test Automatisé**

### **Script de Test Complet**

```bash
#!/bin/bash
echo "🧪 Test automatisé JobbingTrack Backend"

# Phase 1: Infrastructure
echo "Phase 1: Tests d'infrastructure..."
make clean-all && make install && make build-fast && make up
sleep 10

# Phase 2: Base de données  
echo "Phase 2: Tests base de données..."
make migrate && make seed

# Phase 3: API
echo "Phase 3: Tests API..."
make health && make endpoints

# Phase 4: Test complet
echo "Phase 4: Test demo complet..."
make demo

echo "✅ Tous les tests terminés !"
```

---

## ✅ **Checklist de Validation**

Cochez au fur et à mesure :

### **Infrastructure** 
- [ ] `make help` affiche toutes les commandes
- [ ] `make install` installe sans erreur
- [ ] `make build-fast` construit rapidement
- [ ] `make up` démarre tous les services
- [ ] `make status` montre tous les containers "Up"

### **Base de Données**
- [ ] `make migrate` applique les migrations
- [ ] `make seed` peuple les données de test
- [ ] `make studio` ouvre Prisma Studio
- [ ] Tables visibles avec données

### **API**
- [ ] `make health` retourne "OK"
- [ ] http://localhost:3000/health accessible
- [ ] http://localhost:3000/api-docs accessible
- [ ] Authentification fonctionne (login/register)
- [ ] CRUD candidatures fonctionne

### **Fonctionnalités**
- [ ] Hot reload fonctionne
- [ ] `make shell-api` ouvre le shell
- [ ] `make backup` crée une sauvegarde
- [ ] `make logs-api` affiche les logs

### **Performance**
- [ ] Build rapide < 30 secondes
- [ ] Démarrage < 15 secondes
- [ ] API répond < 100ms

---

## 🚨 **En Cas d'Échec**

Si un test échoue :

1. **Voir les logs détaillés :**
```bash
make logs-api        # Logs API
make status          # Status containers
docker ps -a         # Tous les containers
```

2. **Reset complet :**
```bash
make clean-all       # Supprime tout
make demo           # Recrée tout
```

3. **Debug spécifique :**
```bash
make shell-api      # Investiguer dans le container
make shell-db       # Vérifier la base de données
```

---

## 🎉 **Validation Finale**

Si **TOUS les tests passent**, votre backend JobbingTrack est **100% fonctionnel** ! 

Vous pouvez maintenant développer sereinement avec :
- `make dev` pour le développement quotidien
- `make logs-api` pour suivre les logs
- `make health` pour vérifier que tout va bien

**Félicitations ! Votre setup est parfait ! 🚀**