# 🔄 Documentation Migration - Enum → Tables Statuts Personnalisables

> **Documentation complète** du processus de migration des enums `ApplicationStatus`, `InterviewStatus`, `FollowUpStatus` vers des tables de statuts personnalisables.

**Branche** : `database/structure-revision`  
**Date de début** : 2025-11-27

---

## 📋 Vue d'Ensemble

### Objectif

Convertir les enums Prisma en tables de statuts personnalisables pour permettre :
- ✅ Statuts système par défaut (non modifiables)
- ✅ Statuts personnalisés par utilisateur (modifiables)
- ✅ Gestion via interface utilisateur
- ✅ Synchronisation mobile/offline

### Enums à Convertir

| Enum | Valeurs | Table Cible |
|------|---------|-------------|
| `ApplicationStatus` | 12 valeurs | `ApplicationStatus` |
| `InterviewStatus` | 5 valeurs | `InterviewStatus` |
| `FollowUpStatus` | 5 valeurs | `FollowUpStatus` |

---

## 📚 Documentation par Phase

### Phase 1 : Préparation ✅

**Statut** : ✅ **TERMINÉ**

- [x] Scripts de backup créés
- [x] Scripts de migration créés
- [x] Scripts de seed créés
- [x] Documentation créée

**Fichier** : [`PHASE1_PREPARATION.md`](PHASE1_PREPARATION.md)

**Actions** :
- ✅ Créer backup de la base de données
- ✅ Créer scripts de migration
- ✅ Créer scripts de seed
- ✅ Documenter le processus
- ⏳ Tester sur base de test

### Phase 2 : Schéma Prisma ⏳

**Statut** : ⏳ **EN ATTENTE**

**Fichier** : `PHASE2_SCHEMA.md` (à créer)

**Actions** :
- [ ] Modifier modèles `Application`, `Interview`, `FollowUp`
- [ ] Remplacer champs `status` (enum) par relations
- [ ] Ajouter champs de synchronisation
- [ ] Tester le schéma

### Phase 3 : Migration Données ⏳

**Statut** : ⏳ **EN ATTENTE**

**Fichier** : `PHASE3_DATA_MIGRATION.md` (à créer)

**Actions** :
- [ ] Créer script de migration des données
- [ ] Migrer enum → tables (Application, Interview, FollowUp)
- [ ] Vérifier l'intégrité des données
- [ ] Tester la migration

### Phase 4 : Suppression Enums ⏳

**Statut** : ⏳ **EN ATTENTE**

**Fichier** : `PHASE4_REMOVE_ENUMS.md` (à créer)

**Actions** :
- [ ] Supprimer enums du schéma Prisma
- [ ] Vérifier que tout fonctionne
- [ ] Nettoyer le code

### Phase 5 : Tests & Validation ⏳

**Statut** : ⏳ **EN ATTENTE**

**Fichier** : `PHASE5_TESTS.md` (à créer)

**Actions** :
- [ ] Tests unitaires backend
- [ ] Tests intégration API
- [ ] Tests E2E frontend
- [ ] Tests migration données

---

## 🛠️ Scripts Disponibles

| Script | Description | Usage |
|-------|-------------|-------|
| `migration-phase1-backup.js` | Backup complet de la BDD | `node scripts/database/migration-phase1-backup.js` |
| `migration-phase2-create-tables.js` | Crée les modèles dans le schéma | `node scripts/database/migration-phase2-create-tables.js` |
| `seed-statuses.js` | Seed des statuts système | `node scripts/database/seed-statuses.js` |

---

## 📊 Structure des Tables de Statuts

### ApplicationStatus

```prisma
model ApplicationStatus {
  id            String    @id @default(cuid())
  code          String    @unique
  name          String
  description   String?
  order         Int
  color         String?
  icon          String?
  userId        String?   // null = système, String = utilisateur
  isPredefined  Boolean   @default(false)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  applications  Application[]
}
```

**Statuts système** (12) :
- `CANDIDATE_PENDING`, `NO_RESPONSE`, `NO_RESPONSE_AFTER_FIRST_FOLLOWUP`, etc.

### InterviewStatus

```prisma
model InterviewStatus {
  // Même structure que ApplicationStatus
  interviews    Interview[]
}
```

**Statuts système** (5) :
- `SCHEDULED`, `COMPLETED`, `FEEDBACK_PENDING`, `CANCELLED`, `RESCHEDULED`

### FollowUpStatus

```prisma
model FollowUpStatus {
  // Même structure que ApplicationStatus
  followUps     FollowUp[]
}
```

**Statuts système** (5) :
- `PENDING`, `POSITIVE_RESPONSE`, `NEGATIVE_RESPONSE`, `NO_RESPONSE`, `PLANNED`

---

## 🔄 Processus de Migration Complet

```
1. Phase 1 : Préparation
   ├── Backup BDD
   ├── Créer scripts
   └── Documenter

2. Phase 2 : Schéma Prisma
   ├── Créer modèles ApplicationStatus/InterviewStatus/FollowUpStatus
   ├── Modifier Application/Interview/FollowUp
   └── Ajouter champs synchronisation

3. Phase 3 : Migration Données
   ├── Créer statuts système
   ├── Migrer données enum → tables
   └── Vérifier intégrité

4. Phase 4 : Suppression Enums
   ├── Supprimer enums du schéma
   └── Nettoyer code

5. Phase 5 : Tests
   ├── Tests unitaires
   ├── Tests intégration
   └── Tests E2E
```

---

## ⚠️ Points d'Attention

### 1. Backup Obligatoire

**⚠️ Toujours faire un backup avant de commencer la migration.**

### 2. Ordre d'Exécution

**L'ordre est critique** - Ne pas sauter d'étapes.

### 3. Tests sur Base de Test

**Toujours tester sur une base de test avant la production.**

### 4. Rollback

**Avoir un plan de rollback** en cas de problème.

---

## 📚 Références

- **Fichier principal** : `docs/database/ACTIONS_ET_MODIFICATIONS.md`
- **Structure actuelle** : `docs/database/STRUCTURE_ACTUELLE.md`
- **Valeurs par défaut** : `docs/database/STRUCTURE_ACTUELLE.md#valeurs-par-défaut-des-anciens-enums`
- **Schéma Prisma** : `backend/prisma/schema.prisma`
- **STATUS.md** : `STATUS.md#priorité-absolue---structure-base-de-données`

---

**Dernière mise à jour** : 2025-11-27

