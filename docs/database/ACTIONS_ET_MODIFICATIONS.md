# 🎯 Actions et Modifications - Structure Base de Données

> **FICHIER PRINCIPAL** pour toutes les actions à effectuer et vos demandes de modifications de la structure de la base de données.

**📄 Documentation complète** : Voir [README.md](README.md)  
**📊 Structure actuelle** : Voir [STRUCTURE_ACTUELLE.md](STRUCTURE_ACTUELLE.md)

---

## 📋 Comment Utiliser Ce Fichier

### Pour Ajouter une Demande de Modification

1. **Ajoutez votre demande** dans la section "📝 Vos Demandes de Modifications"
2. **Je donnerai mon avis technique** et les actions à effectuer
3. **Une fois implémenté**, la demande sera déplacée dans "✅ Demandes Implémentées"

### Format pour Ajouter une Demande

```markdown
### [Titre de la Demande]

**Date** : YYYY-MM-DD  
**Demandé par** : [Votre nom]

**Description** : [Description détaillée de ce que vous voulez]

**Contexte** : [Pourquoi vous voulez cette modification]

**💡 Avis Technique** : [Mon avis sera ajouté ici]

**📝 Actions à Effectuer** :
- [ ] Action 1
- [ ] Action 2

**📄 Fichiers à Modifier** :
- `chemin/vers/fichier` - Description

**Statut** : 🔴 **À IMPLÉMENTER** | 🟡 **EN COURS** | ✅ **TERMINÉ**
```

---

## 📝 Vos Demandes de Modifications

> **💡 Note** : Vous pouvez aussi consulter les propositions de travail sur les relations et données entrecroisées en bas de cette section (en italique).

### 🔄 Synchronisation des Listes Personnalisables

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Question** : Les modèles de listes personnalisables (Platform, FollowUpType, InterviewType, CallType, EventType) doivent-ils avoir un système de synchronisation (`syncHash`, `entityHash`, `lastSyncAt`) ?

**Contexte** :
- Ces modèles ont déjà `userId` (nullable) et `isPredefined` pour distinguer les entrées système et utilisateur
- Les utilisateurs peuvent créer leurs propres entrées (ex: créer une plateforme "Mon Site Web")
- Ces entrées peuvent être créées/modifiées sur mobile et serveur

**💡 Avis Technique** :

**✅ OUI, je recommande d'ajouter la synchronisation** pour les raisons suivantes :

1. **Création sur mobile** : Si un utilisateur crée une plateforme "Mon Site Web" sur mobile, elle doit être synchronisée avec le serveur
2. **Modifications simultanées** : Si l'utilisateur modifie une plateforme sur mobile ET sur web en même temps, il faut détecter le conflit
3. **Cohérence** : Pour avoir un système de synchronisation cohérent, tous les modèles modifiables par l'utilisateur devraient avoir les mêmes champs
4. **Offline-first** : Si l'application mobile fonctionne en mode offline, les modifications locales doivent être synchronisées plus tard

**⚠️ Exception** : Les entrées système (`userId = null`, `isPredefined = true`) n'ont PAS besoin de synchronisation car elles ne sont jamais modifiées par l'utilisateur.

**📝 Actions à Effectuer** :

- [ ] Ajouter champs de synchronisation aux modèles personnalisables :
  - [ ] `Platform` : `syncHash`, `entityHash`, `lastSyncAt`
  - [ ] `FollowUpType` : `syncHash`, `entityHash`, `lastSyncAt`
  - [ ] `InterviewType` : `syncHash`, `entityHash`, `lastSyncAt`
  - [ ] `CallType` : `syncHash`, `entityHash`, `lastSyncAt`
  - [ ] `EventType` : `syncHash`, `entityHash`, `lastSyncAt`
- [ ] Modifier le service de synchronisation pour gérer ces modèles
- [ ] Tester la synchronisation des listes personnalisables

**📄 Fichiers à Modifier** :
- `backend/prisma/schema.prisma` - Ajouter champs aux modèles
- `backend/auth-service/src/services/sync.service.js` - Gérer synchronisation des listes

**Statut** : 🔴 **À IMPLÉMENTER**

---

### S'assurer que les relations suivantes sont implémentées

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Description** : Je souhaite avoir les relations décrites dans le fichier `relations.md` et m'assurer que toutes les relations manquantes sont implémentées. Un utilisateur est le point central de toutes mes données globalement orienté applicatif.

**Contexte** : Vérifier et compléter toutes les relations many-to-many et one-to-many décrites dans la documentation.

**💡 Avis Technique** : *À compléter après analyse*

**📝 Actions à Effectuer** : *À compléter après analyse*

**📄 Fichiers à Modifier** : *À compléter après analyse*

**Statut** : 🔴 **À IMPLÉMENTER**

---

### 💡 Propositions de Travail - Relations et Données Entrecroisées

*Voici des propositions de travail sur les relations many-to-many et les données entrecroisées que vous pourriez vouloir implémenter :*

#### *Relations Many-to-Many Existantes à Vérifier/Améliorer*

*1. Contact ↔ Company (via ContactCompany)*
- *Vérifier que la relation fonctionne correctement*
- *Ajouter synchronisation si nécessaire*
- *Tester création/suppression de relations*

*2. Contact ↔ Application (via ContactApplication)*
- *Vérifier que la relation fonctionne correctement*
- *Ajouter synchronisation si nécessaire*
- *Tester création/suppression de relations*

*3. FollowUp ↔ Contact (via FollowUpContact)*
- *Vérifier que la relation fonctionne correctement*
- *Ajouter synchronisation si nécessaire*
- *Tester création/suppression de relations*

*4. Interview ↔ Contact (via InterviewContact)*
- *Vérifier que la relation fonctionne correctement*
- *Ajouter synchronisation si nécessaire*
- *Tester création/suppression de relations*

#### *Relations Many-to-Many Potentielles à Ajouter*

*1. Application ↔ Tag (nouvelle table ApplicationTag)*
- *Permettre de taguer les candidatures*
- *Créer modèle `Tag` avec `userId` pour tags personnalisés*
- *Créer table de jonction `ApplicationTag`*

*2. Company ↔ Tag (nouvelle table CompanyTag)*
- *Permettre de taguer les entreprises*
- *Réutiliser le modèle `Tag` existant*
- *Créer table de jonction `CompanyTag`*

*3. Application ↔ Document (nouvelle table ApplicationDocument)*
- *Lier plusieurs documents à une candidature*
- *Créer table de jonction `ApplicationDocument`*
- *Gérer upload/suppression de documents*

#### *Améliorations des Relations Existantes*

*1. Synchronisation des Tables de Jonction*
- *Ajouter `syncHash`, `entityHash`, `lastSyncAt` aux tables de jonction ?*
- *Ou gérer la synchronisation via les modèles parents ?*

*2. Gestion des Relations en Cascade*
- *Vérifier les règles `onDelete: Cascade`*
- *S'assurer que la suppression d'un Contact supprime bien les relations*
- *Tester les cas limites*

*3. Interface Utilisateur pour Gérer les Relations*
- *Créer interface pour ajouter/retirer des contacts d'une candidature*
- *Créer interface pour gérer les tags*
- *Visualiser les relations dans les pages de détail*

---

---

## ✅ Demandes Implémentées

*(Aucune pour le moment)*

---

## 🎯 Actions à Effectuer - Priorité Absolue

### 🔴 Système de Statuts Personnalisables

**Objectif** : Transformer les enums de statuts en modèles personnalisables par utilisateur avec système de statuts par défaut (système) et personnalisés.

#### Modèles à Créer

**1. ApplicationStatus (Table)**
- [ ] Créer modèle `ApplicationStatus` dans `schema.prisma`
- [ ] Champs : `id`, `userId` (nullable), `name`, `code`, `description`, `color`, `icon`, `order`, `isPredefined`, `isActive`, `createdAt`, `updatedAt`
- [ ] Contraintes : `@@unique([userId, code])`, `@@unique([userId, name])`
- [ ] Relation : ← `User` (N:1, optionnel), → `Application[]` (1:N)
- [ ] Créer script de migration : `scripts/migrations/create-default-application-statuses.js`
- [ ] Créer 12 statuts système par défaut (voir [STRUCTURE_ACTUELLE.md](STRUCTURE_ACTUELLE.md))

**2. InterviewStatus (Table)**
- [ ] Créer modèle `InterviewStatus` dans `schema.prisma`
- [ ] Champs similaires à `ApplicationStatus`
- [ ] Relation : ← `User` (N:1, optionnel), → `Interview[]` (1:N)
- [ ] Créer script de migration : `scripts/migrations/create-default-interview-statuses.js`
- [ ] Créer 5 statuts système par défaut

**3. FollowUpStatus (Table)**
- [ ] Créer modèle `FollowUpStatus` dans `schema.prisma`
- [ ] Champs similaires à `ApplicationStatus`
- [ ] Relation : ← `User` (N:1, optionnel), → `FollowUp[]` (1:N)
- [ ] Créer script de migration : `scripts/migrations/create-default-followup-statuses.js`
- [ ] Créer 5 statuts système par défaut

**4. PlatformType (Nouveau Modèle)**
- [ ] Créer modèle `PlatformType` dans `schema.prisma`
- [ ] Champs : `id`, `userId` (nullable), `name`, `description`, `icon`, `isPredefined`, `createdAt`, `updatedAt`
- [ ] Contrainte : `@@unique([userId, name])`
- [ ] Relation : ← `User` (N:1, optionnel), → `Platform[]` (1:N)

#### Modèles à Modifier

**1. Application**
- [ ] Remplacer `status` (enum) par `applicationStatusId` (String, FK)
- [ ] Ajouter relation : ← `ApplicationStatus` (N:1)
- [ ] Créer script de migration des données existantes

**2. Interview**
- [ ] Remplacer `status` (enum) par `interviewStatusId` (String, FK)
- [ ] Ajouter relation : ← `InterviewStatus` (N:1)
- [ ] Créer script de migration des données existantes

**3. FollowUp**
- [ ] Remplacer `status` (enum) par `followUpStatusId` (String, FK)
- [ ] Ajouter relation : ← `FollowUpStatus` (N:1)
- [ ] Créer script de migration des données existantes

**4. Platform**
- [ ] Ajouter `platformTypeId` (String?, FK vers `PlatformType`)
- [ ] Ajouter relation : ← `PlatformType` (N:1, optionnel)

#### Enums à Supprimer
- [ ] Supprimer enum `ApplicationStatus` du schéma Prisma
- [ ] Supprimer enum `InterviewStatus` du schéma Prisma
- [ ] Supprimer enum `FollowUpStatus` du schéma Prisma

---

### 🔄 Système de Synchronisation avec Hash

#### Champs à Ajouter

**Modèles applicatifs principaux** :
- [ ] `Company` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Application` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Contact` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `FollowUp` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Call` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Interview` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Event` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Document` : Ajouter `syncHash`, `entityHash`, `lastSyncAt`

**Listes personnalisables par utilisateur** :
- [ ] `Platform` : Ajouter `syncHash`, `entityHash`, `lastSyncAt` (uniquement pour entrées utilisateur, pas système)
- [ ] `FollowUpType` : Ajouter `syncHash`, `entityHash`, `lastSyncAt` (uniquement pour entrées utilisateur)
- [ ] `InterviewType` : Ajouter `syncHash`, `entityHash`, `lastSyncAt` (uniquement pour entrées utilisateur)
- [ ] `CallType` : Ajouter `syncHash`, `entityHash`, `lastSyncAt` (uniquement pour entrées utilisateur)
- [ ] `EventType` : Ajouter `syncHash`, `entityHash`, `lastSyncAt` (uniquement pour entrées utilisateur)

**Note** : Les entrées système (`userId = null`, `isPredefined = true`) n'ont PAS besoin de synchronisation car elles ne sont jamais modifiées par l'utilisateur.

#### Service de Synchronisation

- [ ] Créer `backend/auth-service/src/services/sync.service.js` :
  - `calculateEntityHash(entity)` - Calcul SHA-256
  - `compareHashes(localHash, serverHash)` - Comparaison
  - `detectConflicts(localEntity, serverEntity)` - Détection conflits
  - `resolveConflict(localEntity, serverEntity, strategy)` - Résolution
  - `syncEntity(entity, userId)` - Synchronisation complète

#### Scripts de Migration

- [ ] Créer `scripts/migrations/add-sync-fields.js` :
  - Ajouter colonnes `syncHash`, `entityHash`, `lastSyncAt` à tous les modèles
  - Calculer hash initial pour données existantes
  - Mettre à jour `lastSyncAt` = `updatedAt` pour données existantes

---

### 🎨 Fonctionnalités Backend

- [ ] Créer `backend/auth-service/src/controllers/status.controller.js` :
  - `getStatuses(type, userId)` - Récupérer statuts (système + utilisateur)
  - `createStatus(type, userId, data)` - Créer statut personnalisé
  - `updateStatus(type, statusId, userId, data)` - Modifier statut personnalisé
  - `deleteStatus(type, statusId, userId)` - Supprimer statut personnalisé
- [ ] Créer routes dans `backend/auth-service/src/routes/status.routes.js`
- [ ] Ajouter middleware d'authentification

---

### 🎨 Fonctionnalités Frontend

- [ ] Créer page `/backoffice/settings/statuses` :
  - Onglets : ApplicationStatus, InterviewStatus, FollowUpStatus
  - Liste des statuts système (non modifiables)
  - Liste des statuts personnalisés (modifiables)
  - Formulaire création/modification statut personnalisé
  - Suppression statut personnalisé (avec confirmation)

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

**Dernière mise à jour** : 2025-01-27

