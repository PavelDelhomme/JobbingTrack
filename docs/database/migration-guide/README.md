# 🔄 Guide de Migration vers le Schéma Partagé

## 🎯 Objectif

Migrer de l'ancienne architecture (schémas Prisma séparés par service) vers la **nouvelle architecture avec schéma partagé unique**.

---

## 📋 Avant de Commencer

### Vérifications Préalables

```bash
# 1. Sauvegarder la base de données actuelle
make db-backup

# 2. Vérifier l'état actuel
docker exec -it jobbingtrack-postgres psql -U postgres -d jobbingtrack

# Lister toutes les tables
\dt

# Sortir
\q
```

---

## 🗺️ Plan de Migration

### Phase 1 : Préparation ✅
1. ✅ Créer le schéma partagé (`backend/shared/prisma/schema.prisma`)
2. ✅ Créer le seed des données prédéfinies
3. ✅ Documenter la nouvelle structure

### Phase 2 : Configuration des Services
1. Configurer chaque service pour utiliser le schéma partagé
2. Mettre à jour les `package.json`
3. Mettre à jour les Dockerfiles

### Phase 3 : Migration des Données
1. Créer la migration initiale
2. Appliquer la migration
3. Seed des données prédéfinies

### Phase 4 : Validation
1. Tester les endpoints
2. Vérifier les relations
3. Valider la synchronisation offline

---

## 🛠️ Phase 2 : Configuration des Services

### Étape 1 : Créer le package `@jobbingtrack/database`

Créons un package partagé pour le client Prisma.

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack/backend/shared
```

**Créer `package.json`** :
```json
{
  "name": "@jobbingtrack/database",
  "version": "1.0.0",
  "description": "Schéma Prisma partagé pour JobbingTrack",
  "main": "index.js",
  "scripts": {
    "generate": "prisma generate",
    "migrate": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "seed": "node prisma/seed.js",
    "studio": "prisma studio"
  },
  "prisma": {
    "seed": "node prisma/seed.js"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0"
  }
}
```

**Créer `index.js`** :
```javascript
const { PrismaClient } = require('@prisma/client');

// Instance singleton du client Prisma
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // En développement, utiliser une instance globale pour éviter trop de connexions
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.prisma;
}

module.exports = { prisma, PrismaClient };
```

### Étape 2 : Installer les dépendances

```bash
cd backend/shared
npm install
```

### Étape 3 : Générer le client Prisma

```bash
cd backend/shared
npx prisma generate
```

### Étape 4 : Configurer chaque service

Pour **chaque service** qui utilise Prisma :

#### A. Mettre à jour `package.json`

```json
{
  "dependencies": {
    "@jobbingtrack/database": "file:../shared"
  }
}
```

#### B. Mettre à jour les imports dans le code

**Ancien** :
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
```

**Nouveau** :
```javascript
const { prisma } = require('@jobbingtrack/database');
```

#### C. Supprimer le dossier `prisma/` local

```bash
# Pour chaque service (exemple avec auth-service)
rm -rf backend/auth-service/prisma
```

#### D. Mettre à jour le Dockerfile

**Ancien** :
```dockerfile
COPY prisma ./prisma/
RUN npx prisma generate
```

**Nouveau** (pas de génération locale, le package shared le gère) :
```dockerfile
# Copier package.json qui référence @jobbingtrack/database
COPY package*.json ./

# Copier le package shared
COPY --from=shared /app ./node_modules/@jobbingtrack/database

# Installer les dépendances
RUN npm install --omit=dev
```

---

## 🔄 Phase 3 : Migration des Données

### Étape 1 : Créer la migration initiale

```bash
cd backend/shared

# Créer la migration
npx prisma migrate dev --name init_shared_schema
```

Cette commande va :
1. Analyser le schéma Prisma
2. Comparer avec la DB actuelle
3. Générer les fichiers SQL de migration
4. **Demander confirmation** avant d'appliquer

### Étape 2 : Vérifier la migration générée

```bash
# Ouvrir le fichier de migration
cat prisma/migrations/XXXXXXXX_init_shared_schema/migration.sql
```

**Vérifier** :
- ✅ Les nouvelles tables sont créées
- ✅ Les tables existantes ne sont PAS supprimées
- ✅ Les colonnes manquantes sont ajoutées
- ✅ Les Foreign Keys sont créées
- ⚠️ **Si des tables sont supprimées** → ARRÊTER et corriger le schéma

### Étape 3 : Appliquer la migration

```bash
# Si la vérification est OK
npx prisma migrate deploy
```

### Étape 4 : Seed des données prédéfinies

```bash
cd backend/shared
npx prisma db seed
```

Cela va créer :
- 13 plateformes de candidature
- 6 types de relance
- 7 moyens de relance
- 9 types d'entretien
- 4 styles d'entretien
- 8 types d'événement
- 5 types d'appel

---

## 🐳 Phase 4 : Mise à Jour Docker

### Étape 1 : Créer un Dockerfile multi-stage

**`backend/shared/Dockerfile`** :
```dockerfile
FROM node:20.18.0-alpine AS shared

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Copier le schéma Prisma
COPY prisma ./prisma/

# Installer les dépendances
RUN npm install

# Générer le client Prisma
RUN npx prisma generate

# Exposer le répertoire pour les autres services
VOLUME /app
```

### Étape 2 : Mettre à jour docker-compose.yml

```yaml
version: '3.8'

services:
  # ============================================
  # DATABASE SHARED (Prisma)
  # ============================================
  database-shared:
    build:
      context: ./backend/shared
      dockerfile: Dockerfile
    volumes:
      - shared-prisma:/app
    networks:
      - jobbingtrack-network

  # ============================================
  # SERVICES (exemple avec auth-service)
  # ============================================
  auth-service:
    build:
      context: ./backend/auth-service
      dockerfile: Dockerfile
    depends_on:
      - postgres
      - database-shared
    volumes:
      - shared-prisma:/app/node_modules/@jobbingtrack/database:ro
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/jobbingtrack
    networks:
      - jobbingtrack-network

volumes:
  shared-prisma:

networks:
  jobbingtrack-network:
    driver: bridge
```

### Étape 3 : Rebuild

```bash
# Rebuild avec le nouveau schéma partagé
make rebuild
```

---

## ✅ Phase 5 : Validation

### 1. Vérifier les tables PostgreSQL

```bash
docker exec -it jobbingtrack-postgres psql -U postgres -d jobbingtrack
```

```sql
-- Lister toutes les tables
\dt

-- Vérifier les Foreign Keys
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### 2. Tester la création de données

```bash
# Créer un utilisateur de test
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@jobbingtrack.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Créer une entreprise
curl -X POST http://localhost:8083/api/companies \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Google",
    "website": "https://google.com",
    "size": "ENTERPRISE"
  }'

# Créer une candidature
curl -X POST http://localhost:8082/api/applications \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "COMPANY_ID",
    "platformId": "PLATFORM_ID",
    "position": "Senior Developer",
    "contractType": "CDI",
    "workMode": "HYBRID",
    "applicationType": "OFFRE"
  }'
```

### 3. Vérifier les relations

```sql
-- Vérifier qu'une candidature est bien liée à une company
SELECT 
  a.position, 
  u.email, 
  c.name as company_name 
FROM 
  "Application" a
  JOIN "User" u ON a."userId" = u.id
  JOIN "Company" c ON a."companyId" = c.id
LIMIT 5;

-- Vérifier les plateformes prédéfinies
SELECT * FROM "Platform" WHERE "isPredefined" = true;

-- Vérifier les types d'entretien
SELECT * FROM "InterviewType" WHERE "isPredefined" = true;
```

### 4. Tester Prisma Studio

```bash
cd backend/shared
npx prisma studio
```

Ouvrir http://localhost:5555 et :
- ✅ Vérifier que toutes les tables apparaissent
- ✅ Créer manuellement quelques données
- ✅ Vérifier les relations graphiquement

---

## 🔧 Commandes Utiles

### Générer le client Prisma

```bash
cd backend/shared
npx prisma generate
```

### Créer une nouvelle migration

```bash
cd backend/shared
npx prisma migrate dev --name add_new_field
```

### Appliquer les migrations (production)

```bash
cd backend/shared
npx prisma migrate deploy
```

### Réinitialiser la DB (⚠️ DANGER - supprime toutes les données)

```bash
cd backend/shared
npx prisma migrate reset
```

### Synchroniser le schéma sans migration

```bash
cd backend/shared
npx prisma db push
```

---

## 📊 Makefile - Nouvelles Commandes

Mettre à jour `makefiles/database/Makefile` :

```makefile
# Générer le client Prisma partagé
db-generate:
	@echo "🔧 Génération du client Prisma partagé..."
	cd backend/shared && npx prisma generate
	@echo "✅ Client généré !"

# Créer une migration
db-migrate-create:
	@echo "📝 Création d'une nouvelle migration..."
	@read -p "Nom de la migration: " name; \
	cd backend/shared && npx prisma migrate dev --name $$name

# Appliquer les migrations
db-migrate:
	@echo "📦 Application des migrations..."
	cd backend/shared && npx prisma migrate deploy
	@echo "✅ Migrations appliquées !"

# Seed des données prédéfinies
db-seed:
	@echo "🌱 Insertion des données prédéfinies..."
	cd backend/shared && npx prisma db seed
	@echo "✅ Seed terminé !"

# Prisma Studio
db-studio:
	@echo "🎨 Ouverture de Prisma Studio..."
	cd backend/shared && npx prisma studio

# Reset complet (⚠️ DANGER)
db-reset:
	@echo "⚠️  ATTENTION : Cela va SUPPRIMER toutes les données !"
	@read -p "Confirmer (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		cd backend/shared && npx prisma migrate reset --force; \
	else \
		echo "❌ Annulé"; \
	fi
```

### Utilisation

```bash
# Générer le client
make db-generate

# Créer une migration
make db-migrate-create

# Appliquer les migrations
make db-migrate

# Seed
make db-seed

# Ouvrir Prisma Studio
make db-studio

# Reset (DANGER)
make db-reset
```

---

## 🚨 Problèmes Courants

### Erreur : "Can't reach database server"

```bash
# Vérifier que PostgreSQL est démarré
docker ps | grep postgres

# Redémarrer PostgreSQL
docker restart jobbingtrack-postgres

# Vérifier la connexion
docker exec -it jobbingtrack-postgres psql -U postgres -c "SELECT 1"
```

### Erreur : "Module '@jobbingtrack/database' not found"

```bash
# Réinstaller les dépendances
cd backend/shared
npm install

# Puis dans chaque service
cd backend/auth-service
npm install
```

### Erreur : "Prisma Client did not initialize yet"

```bash
# Générer le client
cd backend/shared
npx prisma generate

# Redémarrer les services
make restart
```

### Erreur : "Migration is in a failed state"

```bash
# Marquer la migration comme résolue
cd backend/shared
npx prisma migrate resolve --applied MIGRATION_NAME

# Ou rollback
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

---

## 📝 Checklist de Migration

- [ ] ✅ Sauvegarde de la DB effectuée
- [ ] ✅ Schéma partagé créé (`backend/shared/prisma/schema.prisma`)
- [ ] ✅ Package `@jobbingtrack/database` configuré
- [ ] ✅ Seed créé (`backend/shared/prisma/seed.js`)
- [ ] ✅ Client Prisma généré (`npx prisma generate`)
- [ ] ✅ Migration initiale créée
- [ ] ✅ Migration vérifiée (pas de suppression de tables)
- [ ] ✅ Migration appliquée
- [ ] ✅ Seed appliqué
- [ ] ✅ Services mis à jour pour utiliser `@jobbingtrack/database`
- [ ] ✅ Dockerfiles mis à jour
- [ ] ✅ docker-compose.yml mis à jour
- [ ] ✅ Rebuild effectué (`make rebuild`)
- [ ] ✅ Tests de création de données OK
- [ ] ✅ Relations vérifiées dans PostgreSQL
- [ ] ✅ Prisma Studio fonctionne
- [ ] ✅ Endpoints API testés
- [ ] ✅ Synchronisation offline testée

---

## 🎉 Migration Complète !

Une fois tous les points de la checklist validés, votre architecture est migrée avec succès vers le **schéma partagé unique**.

**Avantages obtenus** :
- ✅ Une seule source de vérité pour chaque modèle
- ✅ Relations PostgreSQL réelles (Foreign Keys)
- ✅ Cohérence garantie par la base de données
- ✅ Pas de duplication de données
- ✅ Migrations centralisées
- ✅ Listes personnalisables par les utilisateurs
- ✅ Synchronisation offline prête

**Next Steps** :
1. Implémenter les endpoints API pour chaque service
2. Créer l'interface mobile React Native
3. Implémenter la synchronisation offline
4. Ajouter les tests unitaires et d'intégration
