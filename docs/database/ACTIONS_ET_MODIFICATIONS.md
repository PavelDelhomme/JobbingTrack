# 🎯 Actions et Modifications - Structure Base de Données

> **FICHIER PRINCIPAL** pour toutes les actions à effectuer et vos demandes de modifications de la structure de la base de données.

**📄 Documentation complète** : Voir [README.md](README.md)  
**📊 Structure actuelle** : Voir [STRUCTURE_ACTUELLE.md](STRUCTURE_ACTUELLE.md)

---

## 🎯 Objectif du Projet

**⚠️ IMPORTANT** : JobbingTrack est un **outil personnel de suivi de candidatures pour un chercheur d'emploi**.

- ✅ **Pour le candidat** : Suivre ses propres candidatures sur différents sites de recrutement
- ✅ **Centralisation** : Centraliser toutes les informations de ses candidatures
- ✅ **Automatisation** : Automatiser certaines tâches (relances, rappels, etc.)
- ❌ **PAS pour l'employeur** : Ce n'est PAS un outil pour gérer les candidatures reçues par une entreprise
- ❌ **PAS pour le recruteur** : Ce n'est PAS un outil ATS (Applicant Tracking System)

**L'utilisateur = Le candidat qui cherche un emploi et suit ses propres candidatures.**

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

**Description** : Je souhaite avoir les relations décrites dans le fichier `relations.md` et m'assurer que toutes les relations manquantes sont implémentées. 

**Contexte** : 
- **Objectif du projet** : Outil personnel de suivi de candidatures pour un chercheur d'emploi
- L'utilisateur (candidat) est le point central de toutes les données
- L'utilisateur suit ses propres candidatures sur différents sites de recrutement
- Centralisation des informations de candidatures et automatisation de certaines tâches
- **PAS de côté employeur/recruteur** : uniquement pour le candidat qui cherche un poste
- Vérifier et compléter toutes les relations many-to-many et one-to-many décrites dans la documentation

**💡 Avis Technique** : *À compléter après analyse*

**📝 Actions à Effectuer** : *À compléter après analyse*

**📄 Fichiers à Modifier** : *À compléter après analyse*

**Statut** : 🔴 **À IMPLÉMENTER**

---

### 🔧 Correction Erreurs 500 - Tables Manquantes (Company, SecurityLog)

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Description** : Erreurs 500 Internal Server Error dues à des tables manquantes dans la base de données :
- `/api/v1/companies` → Table `Company` manquante (P2021)
- `security-service` → Table `security_logs` manquante (P2021)

**Contexte** : Les tables n'existent pas dans la base de données, causant des erreurs Prisma P2021.

**💡 Avis Technique** :

**✅ PROBLÈME IDENTIFIÉ** : Les tables `Company` et `SecurityLog` n'existent pas dans la base de données (erreur Prisma P2021).

**Solution immédiate** : Ajouter des fallbacks dans les contrôleurs/services pour gérer l'erreur P2021 en mode développement.

**Solution définitive** : Exécuter `make db-push-all` pour créer toutes les tables dans la base de données.

**📝 Actions à Effectuer** :

- [x] Ajouter fallback dans `getCompanies` pour gérer erreur P2021
- [x] Ajouter fallbacks dans `securityService.js` pour toutes les méthodes utilisant `securityLog` :
  - [x] `getSecurityLogs()` - Retourne tableau vide
  - [x] `createSecurityLog()` - Retourne null
  - [x] `getSystemMetrics()` - Retourne métriques vides
  - [x] `analyzeAndRecordSecurityData()` - Ignore analyse
  - [x] `analyzeSecurityRisks()` - Retourne risques vides
  - [x] `cleanupOldLogs()` - Retourne 0
  - [x] `getSecurityMetrics()` - Retourne métriques vides
- [ ] Tester que les APIs retournent maintenant des données vides au lieu d'erreurs 500
- [ ] Exécuter `make db-push-all` pour créer toutes les tables
- [ ] Vérifier que les APIs fonctionnent correctement après création des tables

**📄 Fichiers à Modifier** :
- `backend/company-service/src/controllers/company.controller.js` - ✅ Fallback ajouté
- `backend/security-service/src/services/securityService.js` - ✅ Fallbacks ajoutés

**Statut** : 🟡 **EN COURS** - Fallbacks ajoutés, reste à créer les tables avec `make db-push-all`

---

### 👤 Profil Utilisateur et Settings

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Description** : 
- Créer une table `UserProfile` pour le profil utilisateur (expériences, compétences, etc.)
- Créer une table `UserSettings` pour les paramètres utilisateur
- Le profil utilisateur sera automatiquement rattaché à l'utilisateur
- Le profil pourra être utilisé plus tard pour analyser la potentialité de réussite d'une candidature en comparant avec d'autres candidatures ayant le même profil

**Contexte** : L'utilisateur doit pouvoir compléter son profil avec ses expériences, compétences, etc. pour aider dans l'analyse future des candidatures.

**💡 Avis Technique** : *À compléter*

**📝 Actions à Effectuer** :
- [ ] Créer modèle `UserProfile` dans `schema.prisma` :
  - `id`, `userId` (FK, unique), `experiences` (JSON ou relation), `competences` (JSON ou relation), `education`, `languages`, `summary`, etc.
- [ ] Créer modèle `UserSettings` dans `schema.prisma` :
  - `id`, `userId` (FK, unique), `notifications`, `automatisations`, `preferences`, etc.
- [ ] Créer automatiquement un profil vide à la création d'un utilisateur
- [ ] Créer interface frontend pour compléter le profil
- [ ] Créer interface frontend pour les settings

**📄 Fichiers à Modifier** :
- `backend/prisma/schema.prisma` - Ajouter modèles UserProfile et UserSettings
- `backend/auth-service/src/controllers/user.controller.js` - Créer profil automatiquement
- `frontend/src/app/(admin)/backoffice/profile/page.tsx` - Interface profil
- `frontend/src/app/(admin)/backoffice/settings/page.tsx` - Interface settings

**Statut** : 🔴 **À IMPLÉMENTER**

---

### 📝 Mise à Jour Formulaires de Création Frontend

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Description** : Mettre à jour tous les formulaires de création dans le dashboard administrateur pour :
- Candidatures
- Entreprises
- Relances
- Entretiens
- Contacts
- Appels
- Événements

**Contexte** : Les formulaires actuels ne sont pas à jour avec les règles de gestion des données.

**💡 Avis Technique** : *À compléter*

**📝 Actions à Effectuer** :
- [ ] Corriger statuts candidature : Supprimer "Brouillon", utiliser "Candidaté et en attente", etc.
- [ ] Ajouter autocomplétion pour entreprises existantes
- [ ] Ajouter autocomplétion pour localisations
- [ ] Ajouter autocomplétion pour intitulés de poste
- [ ] Gérer création automatique d'entreprise si n'existe pas
- [ ] Gérer création automatique d'entreprise pour contact si n'existe pas
- [ ] Date/heure de candidature : Date par défaut = maintenant, heure enregistrée automatiquement
- [ ] Interface pour forcer manuellement un statut (désactive automatisme)

**📄 Fichiers à Modifier** :
- `frontend/src/app/(admin)/backoffice/data/applications/page.tsx`
- `frontend/src/app/(admin)/backoffice/data/companies/page.tsx`
- `frontend/src/app/(admin)/backoffice/data/followups/page.tsx`
- `frontend/src/app/(admin)/backoffice/data/interviews/page.tsx`
- `frontend/src/app/(admin)/backoffice/data/contacts/page.tsx`
- `frontend/src/app/(admin)/backoffice/data/calls/page.tsx`
- `frontend/src/app/(admin)/backoffice/data/events/page.tsx`

**Statut** : 🔴 **À IMPLÉMENTER**

---

### 🔄 Règles de Gestion des Données

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Description** : Implémenter les règles de gestion des données suivantes :

1. **Candidature** :
   - Doit avoir une entreprise (obligatoire)
   - Si entreprise n'existe pas, la créer automatiquement à partir du nom

2. **Contact** :
   - N'est pas forcément lié à une candidature
   - Est forcément lié à une entreprise (obligatoire)
   - Si entreprise n'existe pas, la créer automatiquement

3. **Relance** :
   - Ne peut pas avoir lieu sans candidature attachée (obligatoire)
   - Est créée uniquement à partir d'une candidature
   - Récupère automatiquement l'entreprise de la candidature

4. **Entretien** :
   - Ne peut pas avoir lieu sans candidature attachée (obligatoire)
   - Est créé uniquement à partir d'une candidature
   - Récupère automatiquement l'entreprise de la candidature

5. **Appel** :
   - Peut être passé à un contact OU juste à l'entreprise OU dans le cadre d'une candidature
   - Peut être de type "candidature spontanée" pour proposer sa candidature soi-même

**Contexte** : Ces règles doivent être respectées dans le backend et le frontend.

**💡 Avis Technique** : *À compléter*

**📝 Actions à Effectuer** :
- [ ] Valider règles dans backend (controllers)
- [ ] Créer fonctions utilitaires pour création automatique d'entreprise
- [ ] Mettre à jour formulaires frontend pour respecter les règles
- [ ] Ajouter validations côté frontend et backend

**📄 Fichiers à Modifier** :
- `backend/*-service/src/controllers/*.controller.js` - Valider règles
- `backend/*-service/src/utils/company.utils.js` - Fonction création auto entreprise
- `frontend/src/app/(admin)/backoffice/data/**/page.tsx` - Mettre à jour formulaires

**Statut** : 🔴 **À IMPLÉMENTER**

---

### 📅 Création Automatique d'Événements

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Description** : Créer automatiquement un événement dans le calendrier lors de :
- Création d'une candidature
- Création d'une relance
- Création d'un entretien
- Création d'un appel

**Contexte** : L'utilisateur doit pouvoir suivre tous ses événements dans un calendrier.

**💡 Avis Technique** : *À compléter*

**📝 Actions à Effectuer** :
- [ ] Créer service `event.service.js` pour création automatique d'événements
- [ ] Appeler service lors de création candidature
- [ ] Appeler service lors de création relance
- [ ] Appeler service lors de création entretien
- [ ] Appeler service lors de création appel
- [ ] Créer interface calendrier pour visualiser tous les événements

**📄 Fichiers à Modifier** :
- `backend/*-service/src/services/event.service.js` - Service création événements
- `backend/*-service/src/controllers/*.controller.js` - Appeler service
- `frontend/src/app/(admin)/backoffice/calendar/page.tsx` - Interface calendrier

**Statut** : 🔴 **À IMPLÉMENTER**

---

### 🤖 Gestion Automatique des Statuts

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Description** : 
- Système de proposition automatique de statuts en fonction de l'état d'une candidature ou des différents champs
- Possibilité pour l'utilisateur de forcer manuellement un statut (désactive alors l'automatisme pour cette candidature)
- Si candidature marquée comme "rejetée" ou "acceptée", stopper les automatismes
- Si utilisateur indique qu'il n'est plus en recherche active, désactiver une partie des automatismes (relances, etc.)

**Contexte** : Automatiser la gestion des statuts tout en gardant le contrôle manuel.

**💡 Avis Technique** : *À compléter*

**📝 Actions à Effectuer** :
- [ ] Créer service `status.service.js` pour gestion automatique des statuts
- [ ] Définir règles de proposition automatique de statuts
- [ ] Ajouter champ `isManualStatus` dans Application pour forcer manuellement
- [ ] Ajouter champ `isRejected` et `isAccepted` dans Application
- [ ] Ajouter champ `isActiveSearch` dans UserSettings
- [ ] Désactiver automatismes si `isRejected`, `isAccepted`, ou `!isActiveSearch`

**📄 Fichiers à Modifier** :
- `backend/prisma/schema.prisma` - Ajouter champs
- `backend/*-service/src/services/status.service.js` - Service automatisation
- `frontend/src/app/(admin)/backoffice/data/applications/page.tsx` - Interface statuts

**Statut** : 🔴 **À IMPLÉMENTER**

---

### 🧪 Tests Automatisés avec Playwright

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Description** : Créer des tests automatisés avec Playwright pour tester les scénarios dans l'interface mobile du projet.

**Contexte** : Tester automatiquement les fonctionnalités pour s'assurer que tout fonctionne correctement.

**💡 Avis Technique** : *À compléter*

**📝 Actions à Effectuer** :
- [ ] Installer Playwright
- [ ] Créer tests pour scénarios de création de données
- [ ] Créer tests pour interface mobile
- [ ] Intégrer dans CI/CD

**📄 Fichiers à Modifier** :
- `tests/e2e/**/*.spec.ts` - Tests Playwright
- `.github/workflows/ci-cd.yml` - Intégrer tests

**Statut** : 🔴 **À IMPLÉMENTER**

---

### 📅 Calendrier Utilisateur

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Description** : L'utilisateur doit avoir un calendrier avec tous ses événements (candidatures, relances, entretiens, appels).

**Contexte** : Visualiser tous les événements dans un calendrier pour un suivi efficace.

**💡 Avis Technique** : *À compléter*

**📝 Actions à Effectuer** :
- [ ] Créer page calendrier `/backoffice/calendar`
- [ ] Afficher tous les événements liés à l'utilisateur
- [ ] Filtrer par type d'événement
- [ ] Vue mensuelle, hebdomadaire, quotidienne
- [ ] Intégrer avec création automatique d'événements

**📄 Fichiers à Modifier** :
- `frontend/src/app/(admin)/backoffice/calendar/page.tsx` - Interface calendrier
- `frontend/src/components/features/Calendar.tsx` - Composant calendrier

**Statut** : 🔴 **À IMPLÉMENTER**

---

### 🎯 Analyse de Potentialité de Candidature

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Description** : Utiliser le profil utilisateur (expériences, compétences) pour analyser la potentialité de réussite d'une candidature en comparant avec d'autres candidatures ayant le même profil.

**Contexte** : Aider l'utilisateur à évaluer ses chances de réussite pour une candidature donnée.

**💡 Avis Technique** : *À compléter - Fonctionnalité avancée pour plus tard*

**📝 Actions à Effectuer** :
- [ ] Créer service d'analyse de matching
- [ ] Comparer profil utilisateur avec profils de candidatures réussies
- [ ] Calculer score de potentialité
- [ ] Afficher analyse dans interface candidature

**📄 Fichiers à Modifier** :
- `backend/*-service/src/services/matching.service.js` - Service d'analyse
- `frontend/src/app/(admin)/backoffice/data/applications/[id]/page.tsx` - Afficher analyse

**Statut** : 🔴 **À IMPLÉMENTER** (Fonctionnalité avancée - Priorité basse)

---

### ⚙️ Gestion Automatisme et Statut de Recherche

**Date** : 2025-01-27  
**Demandé par** : Utilisateur

**Description** : 
- Si candidature marquée comme "rejetée" ou "acceptée", stopper les automatismes pour cette candidature
- Si utilisateur indique qu'il n'est plus en recherche active, désactiver une partie des automatismes (relances, etc.)

**Contexte** : Permettre à l'utilisateur de contrôler les automatismes selon son état de recherche.

**💡 Avis Technique** : *À compléter*

**📝 Actions à Effectuer** :
- [ ] Ajouter champ `isRejected` et `isAccepted` dans Application
- [ ] Ajouter champ `isActiveSearch` dans UserSettings
- [ ] Modifier service d'automatisation pour vérifier ces champs
- [ ] Désactiver automatismes si `isRejected`, `isAccepted`, ou `!isActiveSearch`
- [ ] Interface pour marquer candidature comme rejetée/acceptée
- [ ] Interface pour indiquer recherche active/inactive

**📄 Fichiers à Modifier** :
- `backend/prisma/schema.prisma` - Ajouter champs
- `backend/*-service/src/services/automation.service.js` - Vérifier champs
- `frontend/src/app/(admin)/backoffice/data/applications/page.tsx` - Interface statuts

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

