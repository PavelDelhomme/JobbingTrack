# 🚀 Guide d'Exécution - Migration Statuts Enum → Tables

> **Guide pas-à-pas** pour exécuter la migration dans Docker.

**Branche** : `database/structure-revision`  
**Date** : 2025-11-27

---

## ✅ Prérequis

### 1. Vérifier que Docker est en cours d'exécution

```bash
# Vérifier que le conteneur PostgreSQL est actif
docker ps | grep postgres

# Ou via Makefile
make ps
```

### 2. Vérifier que les services sont démarrés

```bash
# Démarrer tous les services si nécessaire
make up-full

# Ou seulement PostgreSQL
docker-compose up -d postgres
```

---

## 📋 Phase 1 : Préparation (À FAIRE MAINTENANT)

### Étape 1.1 : Créer un Backup

**⚠️ IMPORTANT** : Toujours faire un backup avant de modifier la base de données !

```bash
# Depuis la racine du projet
node scripts/database/migration-phase1-backup.js
```

**Ce que ça fait** :
- ✅ Crée un backup PostgreSQL complet
- ✅ Sauvegarde les données critiques
- ✅ Stocke tout dans `backups/migrations/`

**Résultat attendu** :
```
✅ Backup PostgreSQL créé : backups/migrations/backup_YYYY-MM-DD_HH-MM-SS.sql
✅ Backup des données critiques créé : backups/migrations/data_backup_YYYY-MM-DD_HH-MM-SS.json
✅ Métadonnées créées : backups/migrations/metadata_YYYY-MM-DD_HH-MM-SS.json
```

### Étape 1.2 : Créer les Modèles dans le Schéma Prisma

```bash
# Exécuter le script qui modifie le schéma Prisma
node scripts/database/migration-phase2-create-tables.js
```

**Ce que ça fait** :
- ✅ Ajoute les modèles `ApplicationStatus`, `InterviewStatus`, `FollowUpStatus` au schéma
- ✅ Génère le script de seed automatiquement

**Résultat attendu** :
```
✅ Modèles ajoutés au schéma
✅ Script de seed généré : scripts/database/seed-statuses.js
```

### Étape 1.3 : Appliquer le Schéma à la Base de Données

```bash
# Formater le schéma Prisma
npx prisma format

# Générer le client Prisma
npx prisma generate

# Appliquer les modifications à la base de données (dans Docker)
npx prisma db push

# Ou via Makefile
make db-push-all
```

**Ce que ça fait** :
- ✅ Crée les tables `ApplicationStatus`, `InterviewStatus`, `FollowUpStatus` dans PostgreSQL (dans Docker)
- ✅ Met à jour le client Prisma

### Étape 1.4 : Créer les Statuts Système

```bash
# Exécuter le seed pour créer les statuts système par défaut
node scripts/database/seed-statuses.js
```

**Ce que ça fait** :
- ✅ Crée 12 ApplicationStatus (CANDIDATE_PENDING, NO_RESPONSE, etc.)
- ✅ Crée 5 InterviewStatus (SCHEDULED, COMPLETED, etc.)
- ✅ Crée 5 FollowUpStatus (PENDING, POSITIVE_RESPONSE, etc.)

**Vérifier** :
```bash
# Vérifier que les statuts sont créés
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT code, name, \"isPredefined\" FROM \"ApplicationStatus\" ORDER BY \"order\";"
```

---

## 📋 Phase 2 : Modifier le Schéma Prisma (SUIVANT)

Une fois la Phase 1 terminée, on passe à la Phase 2 qui consiste à :

1. **Modifier les modèles `Application`, `Interview`, `FollowUp`** :
   - Remplacer `status ApplicationStatus` (enum) par `statusId String` + relation
   - Ajouter les champs de synchronisation (`syncHash`, `entityHash`, `lastSyncAt`)

2. **Appliquer les modifications** :
   - `npx prisma format`
   - `npx prisma generate`
   - `npx prisma db push`

3. **Migrer les données** :
   - Convertir les valeurs enum existantes vers les nouvelles relations

---

## 🔍 Vérifications

### Vérifier que les Tables sont Créées

```bash
# Lister toutes les tables
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "\dt"

# Vérifier les tables de statuts
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "\d \"ApplicationStatus\""
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "\d \"InterviewStatus\""
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "\d \"FollowUpStatus\""
```

### Vérifier les Statuts Créés

```bash
# ApplicationStatus
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT code, name, \"order\" FROM \"ApplicationStatus\" ORDER BY \"order\";"

# InterviewStatus
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT code, name, \"order\" FROM \"InterviewStatus\" ORDER BY \"order\";"

# FollowUpStatus
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT code, name, \"order\" FROM \"FollowUpStatus\" ORDER BY \"order\";"
```

---

## ⚠️ En Cas de Problème

### Rollback

Si quelque chose ne va pas, restaurer depuis le backup :

```bash
# Restaurer le schéma Prisma
git checkout backend/prisma/schema.prisma

# Restaurer la base de données
docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack < backups/migrations/backup_YYYY-MM-DD_HH-MM-SS.sql
```

### Vérifier les Erreurs

```bash
# Voir les logs PostgreSQL
docker logs jobbingtrack-postgres

# Vérifier la connexion
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT version();"
```

---

## 📚 Références

- **Documentation Phase 1** : `docs/database/migration/PHASE1_PREPARATION.md`
- **Index Migration** : `docs/database/migration/README.md`
- **Schéma Prisma** : `backend/prisma/schema.prisma`

---

**Dernière mise à jour** : 2025-11-27

