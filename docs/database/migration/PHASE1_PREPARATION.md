# 📋 Phase 1 : Préparation - Migration Statuts Enum → Tables

> **Documentation complète** de la Phase 1 de migration des enums vers des tables de statuts personnalisables.

**Date de création** : 2025-11-27  
**Branche** : `database/structure-revision`  
**Statut** : ✅ **TERMINÉ**

---

## 🎯 Objectif de la Phase 1

La Phase 1 consiste à **préparer** la migration en créant :
1. ✅ Scripts de backup de la base de données
2. ✅ Scripts de migration pour créer les tables
3. ✅ Scripts de seed pour les statuts système
4. ✅ Documentation du processus de migration
5. ✅ Tests sur une base de test

---

## 📁 Fichiers Créés

### Scripts de Migration

| Fichier | Description | Usage |
|---------|-------------|-------|
| `scripts/database/migration-phase1-backup.js` | Crée un backup complet de la BDD avant migration | `node scripts/database/migration-phase1-backup.js` |
| `scripts/database/migration-phase2-create-tables.js` | Crée les modèles dans le schéma Prisma | `node scripts/database/migration-phase2-create-tables.js` |
| `scripts/database/seed-statuses.js` | Seed des statuts système par défaut | `node scripts/database/seed-statuses.js` |

### Documentation

| Fichier | Description |
|---------|-------------|
| `docs/database/migration/PHASE1_PREPARATION.md` | Ce fichier - Documentation complète de la Phase 1 |
| `docs/database/migration/README.md` | Index de la documentation de migration |

---

## 🔄 Processus de Migration

### Étape 1 : Backup de la Base de Données

**Avant toute modification**, créer un backup complet :

```bash
# Via script Node.js
node scripts/database/migration-phase1-backup.js

# Ou via Makefile (si créé)
make db-backup-before-migration
```

**Ce que fait le script** :
- ✅ Crée un backup PostgreSQL complet (via `pg_dump`)
- ✅ Sauvegarde les données critiques (Applications, FollowUps, Interviews)
- ✅ Crée un fichier de métadonnées avec les informations de backup
- ✅ Stocke tout dans `backups/migrations/`

**Fichiers créés** :
- `backup_YYYY-MM-DD_HH-MM-SS.sql` - Backup PostgreSQL complet
- `data_backup_YYYY-MM-DD_HH-MM-SS.json` - Données critiques au format JSON
- `metadata_YYYY-MM-DD_HH-MM-SS.json` - Métadonnées du backup

### Étape 2 : Création des Tables dans le Schéma Prisma

**Modifier le schéma Prisma** pour ajouter les modèles de statuts :

```bash
# Via script Node.js
node scripts/database/migration-phase2-create-tables.js

# Ou manuellement (voir section suivante)
```

**Ce que fait le script** :
- ✅ Ajoute les modèles `ApplicationStatus`, `InterviewStatus`, `FollowUpStatus` au schéma
- ✅ Génère le script de seed pour les statuts système
- ✅ **Ne modifie PAS encore** les modèles `Application`, `Interview`, `FollowUp` (Phase 3)

**Modèles créés** :

```prisma
model ApplicationStatus {
  id            String    @id @default(cuid())
  code          String    @unique
  name          String
  description   String?
  order         Int
  color         String?
  icon          String?
  userId        String?
  isPredefined  Boolean   @default(false)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  applications  Application[]
  
  @@index([code])
  @@index([userId])
  @@index([isPredefined])
  @@index([isActive])
  @@index([order])
}
```

**Même structure pour** `InterviewStatus` et `FollowUpStatus`.

### Étape 3 : Application du Schéma à la Base de Données

**Appliquer les modifications** à la base de données :

```bash
# Formater le schéma
npx prisma format

# Générer le client Prisma
npx prisma generate

# Appliquer les modifications (sans migration formelle)
npx prisma db push

# Ou via Makefile
make db-push-all
```

### Étape 4 : Seed des Statuts Système

**Créer les statuts système par défaut** :

```bash
node scripts/database/seed-statuses.js
```

**Statuts créés** :
- ✅ **12 ApplicationStatus** (CANDIDATE_PENDING, NO_RESPONSE, etc.)
- ✅ **5 InterviewStatus** (SCHEDULED, COMPLETED, etc.)
- ✅ **5 FollowUpStatus** (PENDING, POSITIVE_RESPONSE, etc.)

**Tous avec** :
- `userId = null` (statut système)
- `isPredefined = true`
- `isActive = true`

---

## 🧪 Tests sur Base de Test

### Créer une Base de Test

```bash
# Créer une base de données de test
docker exec jobbingtrack-postgres psql -U jobbingtrack -c "CREATE DATABASE jobbingtrack_test;"

# Modifier DATABASE_URL temporairement
export DATABASE_URL="postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack_test"

# Appliquer le schéma
npx prisma db push

# Exécuter le seed
node scripts/database/seed-statuses.js
```

### Vérifier les Tables Créées

```bash
# Lister les tables
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack_test -c "\dt"

# Vérifier les statuts créés
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack_test -c "SELECT code, name, \"isPredefined\" FROM \"ApplicationStatus\";"
```

### Nettoyer la Base de Test

```bash
# Supprimer la base de test
docker exec jobbingtrack-postgres psql -U jobbingtrack -c "DROP DATABASE jobbingtrack_test;"
```

---

## ⚠️ Points d'Attention

### 1. Backup Obligatoire

**⚠️ IMPORTANT** : Toujours faire un backup avant d'exécuter les scripts de migration.

### 2. Ordre d'Exécution

**L'ordre est critique** :
1. ✅ Backup
2. ✅ Création des modèles dans le schéma
3. ✅ Application du schéma (`db push`)
4. ✅ Seed des statuts système
5. ⏳ Migration des données (Phase 3)

### 3. Rollback

**Pour annuler les modifications** :

```bash
# Restaurer le schéma Prisma
git checkout backend/prisma/schema.prisma

# Restaurer la base de données depuis le backup
docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack < backups/migrations/backup_YYYY-MM-DD_HH-MM-SS.sql
```

### 4. Services en Cours d'Exécution

**⚠️ Arrêter les services** avant de modifier le schéma :

```bash
# Arrêter tous les services
make down

# Ou arrêter uniquement les services utilisant Prisma
docker-compose stop auth-service application-service interview-service followup-service
```

---

## ✅ Checklist Phase 1

- [x] ✅ Script de backup créé (`migration-phase1-backup.js`)
- [x] ✅ Script de création des tables créé (`migration-phase2-create-tables.js`)
- [x] ✅ Script de seed créé (`seed-statuses.js`)
- [x] ✅ Documentation créée (`PHASE1_PREPARATION.md`)
- [ ] ⏳ Tests sur base de test effectués
- [ ] ⏳ Backup de la base de production créé
- [ ] ⏳ Schéma Prisma modifié et testé
- [ ] ⏳ Statuts système créés et vérifiés

---

## 📚 Références

- **Fichier principal** : `docs/database/ACTIONS_ET_MODIFICATIONS.md`
- **Structure actuelle** : `docs/database/STRUCTURE_ACTUELLE.md`
- **Valeurs par défaut** : `docs/database/STRUCTURE_ACTUELLE.md#valeurs-par-défaut-des-anciens-enums`
- **Schéma Prisma** : `backend/prisma/schema.prisma`

---

## 🚀 Prochaines Étapes

Une fois la Phase 1 terminée et testée :

1. **Phase 2** : Modifier les modèles `Application`, `Interview`, `FollowUp` pour utiliser les relations
2. **Phase 3** : Migrer les données enum → tables
3. **Phase 4** : Supprimer les enums du schéma
4. **Phase 5** : Tests de validation

Voir `docs/database/migration/PHASE2_SCHEMA.md` (à créer) pour la suite.

---

**Dernière mise à jour** : 2025-11-27

