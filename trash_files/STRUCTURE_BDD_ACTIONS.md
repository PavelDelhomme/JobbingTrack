# 🎯 Actions Nécessaires - Structure Base de Données

> **Fichier récapitulatif** de toutes les actions à effectuer pour la structure de la base de données JobbingTrack.

**📄 Documentation complète** : Voir [docs/database/README.md](database/README.md)  
**📊 Structure actuelle** : Voir [STATUS_STRUCTURE_BDD.md](../STATUS_STRUCTURE_BDD.md)  
**⭐ Vos demandes de modifications** : Voir [docs/database/MODIFICATIONS_DEMANDEES.md](database/MODIFICATIONS_DEMANDEES.md) - **C'est ici que vous ajoutez vos demandes !**

---

## 🔴 PRIORITÉ ABSOLUE - Système de Statuts Personnalisables

### Objectif
Transformer les enums de statuts en modèles personnalisables par utilisateur avec système de statuts par défaut (système) et personnalisés.

### Modèles à Créer

#### 1. ApplicationStatus (Table)
- [ ] Créer modèle `ApplicationStatus` dans `schema.prisma`
- [ ] Champs : `id`, `userId` (nullable), `name`, `code`, `description`, `color`, `icon`, `order`, `isPredefined`, `isActive`, `createdAt`, `updatedAt`
- [ ] Contraintes : `@@unique([userId, code])`, `@@unique([userId, name])`
- [ ] Relation : ← `User` (N:1, optionnel), → `Application[]` (1:N)
- [ ] Créer script de migration : `scripts/migrations/create-default-application-statuses.js`
- [ ] Créer 12 statuts système par défaut (voir [Valeurs par Défaut](database/valeurs-par-defaut.md))

#### 2. InterviewStatus (Table)
- [ ] Créer modèle `InterviewStatus` dans `schema.prisma`
- [ ] Champs similaires à `ApplicationStatus`
- [ ] Relation : ← `User` (N:1, optionnel), → `Interview[]` (1:N)
- [ ] Créer script de migration : `scripts/migrations/create-default-interview-statuses.js`
- [ ] Créer 5 statuts système par défaut

#### 3. FollowUpStatus (Table)
- [ ] Créer modèle `FollowUpStatus` dans `schema.prisma`
- [ ] Champs similaires à `ApplicationStatus`
- [ ] Relation : ← `User` (N:1, optionnel), → `FollowUp[]` (1:N)
- [ ] Créer script de migration : `scripts/migrations/create-default-followup-statuses.js`
- [ ] Créer 5 statuts système par défaut

#### 4. PlatformType (Nouveau Modèle)
- [ ] Créer modèle `PlatformType` dans `schema.prisma`
- [ ] Champs : `id`, `userId` (nullable), `name`, `description`, `icon`, `isPredefined`, `createdAt`, `updatedAt`
- [ ] Contrainte : `@@unique([userId, name])`
- [ ] Relation : ← `User` (N:1, optionnel), → `Platform[]` (1:N)

### Modèles à Modifier

#### 1. Application
- [ ] Remplacer `status` (enum) par `applicationStatusId` (String, FK)
- [ ] Ajouter relation : ← `ApplicationStatus` (N:1)
- [ ] Créer script de migration des données existantes

#### 2. Interview
- [ ] Remplacer `status` (enum) par `interviewStatusId` (String, FK)
- [ ] Ajouter relation : ← `InterviewStatus` (N:1)
- [ ] Créer script de migration des données existantes

#### 3. FollowUp
- [ ] Remplacer `status` (enum) par `followUpStatusId` (String, FK)
- [ ] Ajouter relation : ← `FollowUpStatus` (N:1)
- [ ] Créer script de migration des données existantes

#### 4. Platform
- [ ] Ajouter `platformTypeId` (String?, FK vers `PlatformType`)
- [ ] Ajouter relation : ← `PlatformType` (N:1, optionnel)

### Enums à Supprimer
- [ ] Supprimer enum `ApplicationStatus` du schéma Prisma
- [ ] Supprimer enum `InterviewStatus` du schéma Prisma
- [ ] Supprimer enum `FollowUpStatus` du schéma Prisma

### Fonctionnalités Backend

- [ ] Créer `backend/auth-service/src/controllers/status.controller.js` :
  - `getStatuses(type, userId)` - Récupérer statuts (système + utilisateur)
  - `createStatus(type, userId, data)` - Créer statut personnalisé
  - `updateStatus(type, statusId, userId, data)` - Modifier statut personnalisé
  - `deleteStatus(type, statusId, userId)` - Supprimer statut personnalisé
- [ ] Créer routes dans `backend/auth-service/src/routes/status.routes.js`
- [ ] Ajouter middleware d'authentification

### Fonctionnalités Frontend

- [ ] Créer page `/backoffice/settings/statuses` :
  - Onglets : ApplicationStatus, InterviewStatus, FollowUpStatus
  - Liste des statuts système (non modifiables)
  - Liste des statuts personnalisés (modifiables)
  - Formulaire création/modification statut personnalisé
  - Suppression statut personnalisé (avec confirmation)

---

## 🔄 Système de Synchronisation avec Hash

### Champs à Ajouter

**À ajouter à TOUS les modèles applicatifs** dans `schema.prisma` :

- [ ] `Company` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
**Modèles applicatifs principaux** :
- [ ] `Company` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Application` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Contact` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `FollowUp` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Call` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Interview` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Event` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Document` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`

**Listes personnalisables par utilisateur** (voir [MODIFICATIONS_DEMANDEES.md](database/MODIFICATIONS_DEMANDEES.md) pour avis détaillé) :
- [ ] `Platform` : Ajouter `syncHash`, `entityHash`, `lastSyncAt` (uniquement pour entrées utilisateur, pas système)
- [ ] `FollowUpType` : Ajouter `syncHash`, `entityHash`, `lastSyncAt` (uniquement pour entrées utilisateur)
- [ ] `InterviewType` : Ajouter `syncHash`, `entityHash`, `lastSyncAt` (uniquement pour entrées utilisateur)
- [ ] `CallType` : Ajouter `syncHash`, `entityHash`, `lastSyncAt` (uniquement pour entrées utilisateur)
- [ ] `EventType` : Ajouter `syncHash`, `entityHash`, `lastSyncAt` (uniquement pour entrées utilisateur)

**Note** : Les entrées système (`userId = null`, `isPredefined = true`) n'ont PAS besoin de synchronisation car elles ne sont jamais modifiées par l'utilisateur.

### Service de Synchronisation

- [ ] Créer `backend/auth-service/src/services/sync.service.js` :
  - `calculateEntityHash(entity)` - Calcul SHA-256
  - `compareHashes(localHash, serverHash)` - Comparaison
  - `detectConflicts(localEntity, serverEntity)` - Détection conflits
  - `resolveConflict(localEntity, serverEntity, strategy)` - Résolution
  - `syncEntity(entity, userId)` - Synchronisation complète

### Scripts de Migration

- [ ] Créer `scripts/migrations/add-sync-fields.js` :
  - Ajouter colonnes `syncHash`, `entityHash`, `lastSyncAt` à tous les modèles
  - Calculer hash initial pour données existantes
  - Mettre à jour `lastSyncAt` = `updatedAt` pour données existantes

---

## 📋 Scripts de Migration à Créer

### 1. Migration Statuts (Enum → Table)
- [ ] `scripts/migrations/convert-enums-to-tables.js` :
  - Convertir données enum → tables avec statuts système
  - Créer statuts système par défaut
  - Migrer données existantes vers nouvelles tables

### 2. Migration Champs Synchronisation
- [ ] `scripts/migrations/add-sync-fields.js` :
  - Ajouter champs synchronisation
  - Calculer hash initial

### 3. Migration Données Existantes
- [ ] `scripts/migrations/migrate-existing-status-data.js` :
  - Migrer `Application.status` (enum) → `Application.applicationStatusId` (FK)
  - Migrer `Interview.status` (enum) → `Interview.interviewStatusId` (FK)
  - Migrer `FollowUp.status` (enum) → `FollowUp.followUpStatusId` (FK)

---

## 🎨 Interface Utilisateur

### Page Gestion Statuts
- [ ] Créer `/backoffice/settings/statuses/page.tsx` :
  - Tabs : ApplicationStatus, InterviewStatus, FollowUpStatus
  - Liste statuts système (lecture seule)
  - Liste statuts personnalisés (CRUD)
  - Formulaire création/modification
  - Suppression avec confirmation

### Composants
- [ ] Créer `components/features/StatusManager.tsx` :
  - Affichage liste statuts
  - Formulaire création/modification
  - Actions (edit, delete)

---

## 📊 Checklist Complète

### Phase 1 : Préparation
- [ ] Créer scripts de migration
- [ ] Tester migrations sur base de test
- [ ] Documenter processus de migration

### Phase 2 : Schéma Prisma
- [ ] Créer modèles ApplicationStatus, InterviewStatus, FollowUpStatus, PlatformType
- [ ] Modifier modèles Application, Interview, FollowUp, Platform
- [ ] Ajouter champs synchronisation à tous les modèles applicatifs
- [ ] Supprimer enums ApplicationStatus, InterviewStatus, FollowUpStatus
- [ ] Exécuter `npx prisma format`
- [ ] Exécuter `npx prisma generate`

### Phase 3 : Migration Base de Données
- [ ] Créer statuts système par défaut
- [ ] Migrer données enum → tables
- [ ] Vérifier intégrité données

### Phase 4 : Backend
- [ ] Créer controllers statuts
- [ ] Créer routes statuts
- [ ] Créer service synchronisation
- [ ] Tester endpoints API

### Phase 5 : Frontend
- [ ] Créer page gestion statuts
- [ ] Créer composants statuts
- [ ] Intégrer dans navigation
- [ ] Tester interface utilisateur

### Phase 6 : Tests
- [ ] Tests unitaires backend
- [ ] Tests intégration API
- [ ] Tests E2E frontend
- [ ] Tests migration données

---

## 📚 Documentation

- [ ] Mettre à jour `docs/database/README.md` avec nouvelles structures
- [ ] Documenter API statuts dans `docs/api/`
- [ ] Créer guide migration dans `docs/database/migration-guide/`
- [ ] Mettre à jour `STATUS.md` avec progression

---

## 🔗 Liens Utiles

- **Documentation BDD** : [docs/database/README.md](database/README.md)
- **Structure Actuelle** : [STATUS_STRUCTURE_BDD.md](../STATUS_STRUCTURE_BDD.md)
- **Relations** : [docs/database/relations.md](database/relations.md)
- **Synchronisation** : [docs/database/synchronisation.md](database/synchronisation.md)
- **Valeurs par Défaut** : [docs/database/valeurs-par-defaut.md](database/valeurs-par-defaut.md)

---

**Dernière mise à jour** : 2025-01-27

