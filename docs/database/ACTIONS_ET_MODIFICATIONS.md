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

> **⚠️ PRIORISATION** : Les demandes sont organisées par priorité :
> - 🔴 **HAUTE** : À faire en premier (formulaires, règles de gestion, profil utilisateur)
> - 🟡 **MOYENNE** : À faire après les priorités hautes (calendrier, automatismes)
> - 🟢 **BASSE** : À faire plus tard (tests, fonctionnalités avancées)

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

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire concernant la synchronisation des listes personnalisables.
> 
> Par exemple :
> - Autres modèles personnalisables à synchroniser
> - Comportements spécifiques souhaités
> - Exceptions ou cas particuliers
> - Autres précisions...

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

**💡 Avis Technique** :

**✅ ANALYSE COMPLÈTE EFFECTUÉE** : J'ai analysé le schéma Prisma (`backend/prisma/schema.prisma`) et la documentation (`docs/database/relations.md`).

#### Relations Many-to-Many (M:N) - État Actuel

**✅ 4 Relations M:N Implémentées** (via tables de jonction) :

1. **Contact ↔ Company** (via `ContactCompany`)
   - ✅ Modèle `ContactCompany` existe dans le schéma
   - ✅ Relations définies : `Contact.contacts` → `ContactCompany[]` et `Company.contacts` → `ContactCompany[]`
   - ✅ Contrainte unique : `@@unique([contactId, companyId])`
   - ✅ Index sur `contactId` et `companyId`
   - ✅ Documentation : ✅ Documentée dans `relations.md`

2. **Contact ↔ Application** (via `ContactApplication`)
   - ✅ Modèle `ContactApplication` existe dans le schéma
   - ✅ Relations définies : `Contact.applications` → `ContactApplication[]` et `Application.contacts` → `ContactApplication[]`
   - ✅ Contrainte unique : `@@unique([contactId, applicationId])`
   - ✅ Index sur `contactId` et `applicationId`
   - ✅ Documentation : ✅ Documentée dans `relations.md`

3. **FollowUp ↔ Contact** (via `FollowUpContact`)
   - ✅ Modèle `FollowUpContact` existe dans le schéma
   - ✅ Relations définies : `FollowUp.contacts` → `FollowUpContact[]` et `Contact.followUps` → `FollowUpContact[]`
   - ✅ Contrainte unique : `@@unique([followUpId, contactId])`
   - ✅ Index sur `followUpId` et `contactId`
   - ✅ Documentation : ✅ Documentée dans `relations.md`

4. **Interview ↔ Contact** (via `InterviewContact`)
   - ✅ Modèle `InterviewContact` existe dans le schéma
   - ✅ Relations définies : `Interview.contacts` → `InterviewContact[]` et `Contact.interviews` → `InterviewContact[]`
   - ✅ Contrainte unique : `@@unique([interviewId, contactId])`
   - ✅ Index sur `interviewId` et `contactId`
   - ✅ Documentation : ✅ Documentée dans `relations.md`

**✅ Toutes les relations M:N sont correctement implémentées et documentées.**

#### Relations One-to-Many (1:N) - État Actuel

**✅ 20+ Relations 1:N Implémentées** :

**User → Autres Modèles** (9 relations) :
- ✅ `User` → `Application[]` (via `userId`, `onDelete: Cascade`)
- ✅ `User` → `Company[]` (via `userId`, `onDelete: Cascade`)
- ✅ `User` → `Contact[]` (via `userId`, `onDelete: Cascade`)
- ✅ `User` → `FollowUp[]` (via `userId`, `onDelete: Cascade`)
- ✅ `User` → `Call[]` (via `userId`, `onDelete: Cascade`)
- ✅ `User` → `Interview[]` (via `userId`, `onDelete: Cascade`)
- ✅ `User` → `Event[]` (via `userId`, `onDelete: Cascade`)
- ✅ `User` → `Notification[]` (via `userId`, `onDelete: Cascade`)
- ✅ `User` → `Document[]` (via `userId`, `onDelete: Cascade`)
- ✅ `User` → `SyncQueue[]` (via `userId`, `onDelete: Cascade`)

**Company → Autres Modèles** (4 relations) :
- ✅ `Company` → `Application[]` (via `companyId`)
- ✅ `Company` → `FollowUp[]` (via `companyId`)
- ✅ `Company` → `Call[]` (via `companyId`, optionnel, `onDelete: SetNull`)
- ✅ `Company` → `Interview[]` (via `companyId`)

**Application → Autres Modèles** (6 relations) :
- ✅ `Application` → `FollowUp[]` (via `applicationId`, `onDelete: Cascade`)
- ✅ `Application` → `Call[]` (via `applicationId`, optionnel, `onDelete: SetNull`)
- ✅ `Application` → `Interview[]` (via `applicationId`, `onDelete: Cascade`)
- ✅ `Application` → `Event[]` (via `applicationId`, optionnel, `onDelete: Cascade`)
- ✅ `Application` → `Document[]` (via `applicationId`, optionnel, `onDelete: SetNull`)
- ✅ `Application` → `ApplicationStatusHistory[]` (via `applicationId`, `onDelete: Cascade`)

**Autres Relations 1:N** :
- ✅ `FollowUp` → `Call[]` (via `followUpId`, optionnel, `onDelete: SetNull`)
- ✅ `FollowUp` → `Event[]` (via `followUpId`, optionnel, `onDelete: Cascade`)
- ✅ `Interview` → `Event[]` (via `interviewId`, optionnel, `onDelete: Cascade`)
- ✅ `Call` → `Event[]` (via `callId`, optionnel, `onDelete: Cascade`)
- ✅ `Contact` → `Call[]` (via `contactId`, optionnel, `onDelete: SetNull`)

**✅ Toutes les relations 1:N sont correctement implémentées et documentées.**

#### Relations Optionnelles (Personnalisables)

**✅ 7 Relations Optionnelles Implémentées** :
- ✅ `Platform` → `Application[]` (via `platformId`, optionnel)
- ✅ `FollowUpType` → `FollowUp[]` (via `followUpTypeId`, optionnel)
- ✅ `FollowUpMethod` → `FollowUp[]` (via `followUpMethodId`, optionnel)
- ✅ `InterviewType` → `Interview[]` (via `interviewTypeId`, optionnel)
- ✅ `InterviewStyle` → `Interview[]` (via `interviewStyleId`, optionnel)
- ✅ `EventType` → `Event[]` (via `eventTypeId`, optionnel)
- ✅ `CallType` → `Call[]` (via `callTypeId`, optionnel)

**✅ Toutes les relations optionnelles sont correctement implémentées.**

#### Vérifications Techniques

**✅ Cohérence Schéma ↔ Documentation** :
- ✅ Toutes les relations du schéma Prisma sont documentées dans `relations.md`
- ✅ Toutes les relations documentées existent dans le schéma Prisma
- ✅ Aucune relation manquante détectée

**✅ Bonnes Pratiques Respectées** :
- ✅ Tables de jonction M:N avec contraintes `@@unique([field1, field2])`
- ✅ Index sur les clés étrangères pour performance
- ✅ `onDelete: Cascade` pour relations obligatoires
- ✅ `onDelete: SetNull` pour relations optionnelles
- ✅ Champs `createdAt` dans les tables de jonction

**⚠️ Points d'Attention** :
- ⚠️ Les tables de jonction n'ont pas de champs de synchronisation (`syncHash`, `entityHash`, `lastSyncAt`)
- ⚠️ Les tables de jonction n'ont pas de champ `isTestData` (mais ce n'est peut-être pas nécessaire)
- ⚠️ Pas de champ `deletedAt` dans les tables de jonction (soft delete)

**📝 Actions à Effectuer** :

- [x] ✅ Vérifier que toutes les relations M:N sont implémentées dans le schéma Prisma
- [x] ✅ Vérifier que toutes les relations 1:N sont implémentées dans le schéma Prisma
- [x] ✅ Comparer avec la documentation `relations.md`
- [x] ✅ Vérifier les contraintes et index
- [ ] **Optionnel** : Ajouter champs de synchronisation aux tables de jonction si nécessaire
- [ ] **Optionnel** : Ajouter champ `isTestData` aux tables de jonction si nécessaire
- [ ] **Optionnel** : Ajouter champ `deletedAt` aux tables de jonction pour soft delete

**📄 Fichiers à Modifier** :

- `backend/prisma/schema.prisma` - ✅ Aucune modification nécessaire (toutes les relations sont correctes)
- `docs/database/relations.md` - ✅ Documentation à jour
- `docs/database/STRUCTURE_ACTUELLE.md` - ✅ Documentation à jour

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire que vous souhaitez concernant les relations many-to-many et one-to-many.
> 
> Par exemple :
> - Relations manquantes que vous souhaitez ajouter
> - Modifications de comportement souhaitées (cascade, setNull, etc.)
> - Champs supplémentaires à ajouter aux tables de jonction
> - Autres précisions...

**Statut** : ✅ **VÉRIFIÉ** - Toutes les relations sont correctement implémentées et documentées

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

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire concernant les erreurs 500 et les tables manquantes.
> 
> Par exemple :
> - Autres tables manquantes détectées
> - Comportements spécifiques souhaités pour les fallbacks
> - Autres précisions...

**Statut** : 🟡 **EN COURS** - Fallbacks ajoutés, reste à créer les tables avec `make db-push-all`

---

### 👤 Profil Utilisateur et Settings

**Date** : 2025-01-27  
**Demandé par** : Utilisateur  
**Priorité** : 🔴 **HAUTE** - Nécessaire pour la gestion des données utilisateur

**Description** : 
- **L'entité User DOIT avoir** :
  1. Une table `UserProfile` pour le profil utilisateur (expériences, compétences, éducation, langues, etc.)
  2. Une table `UserSettings` pour les paramètres utilisateur globaux (notifications, automatisations, préférences, statut de recherche active, etc.)
- Le profil utilisateur sera **automatiquement rattaché** à l'utilisateur lors de sa création
- Le profil pourra être utilisé plus tard pour analyser la potentialité de réussite d'une candidature en comparant avec d'autres candidatures ayant le même profil dans la base de données

**Contexte** : 
- L'utilisateur doit pouvoir compléter son profil avec ses expériences, compétences, etc.
- Le profil servira à l'analyse future des candidatures (croisement avec autres candidats ayant le même profil)
- Les settings permettront de gérer les automatismes (recherche active/inactive, notifications, etc.)

**💡 Avis Technique** :

**Structure Prisma** :
```prisma
model UserProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Expériences professionnelles
  experiences Json?    // Array d'objets {company, position, startDate, endDate, description}
  
  // Compétences
  competences Json?    // Array de strings ou objets {name, level}
  
  // Éducation
  education   Json?    // Array d'objets {school, degree, field, graduationDate}
  
  // Langues
  languages   Json?    // Array d'objets {language, level}
  
  // Résumé/Description
  summary     String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model UserSettings {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Statut de recherche
  isActiveSearch  Boolean  @default(true) // Si false, désactive automatismes (relances, etc.)
  
  // Notifications
  notifications   Json?    // {email: boolean, push: boolean, etc.}
  
  // Automatisations
  automatisations Json?    // {autoStatus: boolean, autoFollowUp: boolean, etc.}
  
  // Préférences générales
  preferences     Json?    // Autres préférences utilisateur
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**📝 Actions à Effectuer** :
- [ ] Créer modèle `UserProfile` dans `schema.prisma` avec tous les champs nécessaires
- [ ] Créer modèle `UserSettings` dans `schema.prisma` avec `isActiveSearch` et autres settings
- [ ] Ajouter relations `profile` et `settings` dans modèle `User`
- [ ] Créer automatiquement un profil vide et des settings par défaut à la création d'un utilisateur
- [ ] Créer interface frontend `/backoffice/profile` pour compléter le profil
- [ ] Créer interface frontend `/backoffice/settings` pour gérer les settings
- [ ] Ajouter champ `isActiveSearch` dans interface settings pour contrôler les automatismes

**📄 Fichiers à Modifier** :
- `backend/prisma/schema.prisma` - Ajouter modèles UserProfile et UserSettings avec relations
- `backend/auth-service/src/controllers/user.controller.js` - Créer profil et settings automatiquement lors de création utilisateur
- `frontend/src/app/(admin)/backoffice/profile/page.tsx` - Interface profil (créer si n'existe pas)
- `frontend/src/app/(admin)/backoffice/settings/page.tsx` - Interface settings (créer si n'existe pas)

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire concernant le profil utilisateur et les settings.
> 
> Par exemple :
> - Champs supplémentaires à ajouter au profil
> - Settings spécifiques à implémenter
> - Comportements particuliers souhaités
> - Autres précisions...

**Statut** : 🔴 **À IMPLÉMENTER** - **PRIORITÉ HAUTE**

---

### 📝 Mise à Jour Formulaires de Création Frontend

**Date** : 2025-01-27  
**Demandé par** : Utilisateur  
**Priorité** : 🔴 **HAUTE** - Nécessaire pour la création correcte des données

**Description** : Mettre à jour **TOUS** les formulaires de création dans le dashboard administrateur pour :
- Candidatures
- Entreprises
- Relances
- Entretiens
- Contacts
- Appels
- Événements

**Contexte** : Les formulaires actuels ne sont **PAS à jour** avec les règles de gestion des données et contiennent des erreurs (ex: statut "Brouillon" qui n'existe pas).

**💡 Avis Technique** :

**1. Correction des Statuts Candidature** :
- ❌ **SUPPRIMER** : "Brouillon" (n'existe pas)
- ✅ **UTILISER** : "Candidaté et en attente", "En cours d'examen", "Entretien programmé", "Refusé", "Accepté", etc.
- Vérifier les statuts disponibles dans le modèle Prisma `ApplicationStatus` (enum ou table selon structure)

**2. Système d'Autocomplétion** :
- **Entreprises** : Proposer les entreprises existantes lors de la saisie du nom
- **Localisations** : Proposer les localisations déjà utilisées (ex: "Paris", "Lyon", "Remote")
- **Intitulés de poste** : Proposer les intitulés déjà utilisés (ex: "Développeur Full Stack", "Product Manager")
- Utiliser un composant `Autocomplete` ou `Combobox` avec recherche en temps réel
- API endpoint : `/api/v1/companies?search=...` pour entreprises
- Stocker les suggestions dans un état local ou cache

**3. Gestion Date/Heure Candidature** :
- **Date** : Champ date uniquement (pas d'heure visible pour l'utilisateur)
- **Heure** : Enregistrée automatiquement au moment de la création (`createdAt`)
- **Valeur par défaut** : Date = aujourd'hui
- L'utilisateur peut modifier la date mais pas l'heure (simplification UX)

**4. Interface Forcer Statut Manuellement** :
- Ajouter un toggle/checkbox "Forcer le statut manuellement"
- Si activé : Désactive la gestion automatique des statuts pour cette candidature
- Ajouter champ `isManualStatus` dans le formulaire

**📝 Actions à Effectuer** :
- [ ] **Corriger statuts candidature** :
  - [ ] Supprimer "Brouillon" de tous les formulaires
  - [ ] Remplacer par statuts corrects : "Candidaté et en attente", "En cours d'examen", etc.
  - [ ] Vérifier les statuts disponibles dans le backend
- [ ] **Ajouter autocomplétion** :
  - [ ] Créer composant `AutocompleteInput` réutilisable
  - [ ] Implémenter autocomplétion entreprises (avec API `/api/v1/companies?search=...`)
  - [ ] Implémenter autocomplétion localisations (récupérer depuis candidatures existantes)
  - [ ] Implémenter autocomplétion intitulés de poste (récupérer depuis candidatures existantes)
- [ ] **Gérer création automatique** :
  - [ ] Entreprise : Si nom entreprise n'existe pas, créer automatiquement
  - [ ] Contact : Si entreprise n'existe pas, créer automatiquement
- [ ] **Date/heure candidature** :
  - [ ] Champ date uniquement (type="date")
  - [ ] Valeur par défaut = aujourd'hui
  - [ ] Heure enregistrée automatiquement côté backend
- [ ] **Interface forcer statut** :
  - [ ] Ajouter toggle "Forcer le statut manuellement"
  - [ ] Si activé, désactive automatisme pour cette candidature
  - [ ] Envoyer `isManualStatus: true` au backend

**📄 Fichiers à Modifier** :
- `frontend/src/app/(admin)/backoffice/data/applications/page.tsx` - ✅ PRIORITÉ 1
- `frontend/src/app/(admin)/backoffice/data/companies/page.tsx`
- `frontend/src/app/(admin)/backoffice/data/followups/page.tsx`
- `frontend/src/app/(admin)/backoffice/data/interviews/page.tsx`
- `frontend/src/app/(admin)/backoffice/data/contacts/page.tsx`
- `frontend/src/app/(admin)/backoffice/data/calls/page.tsx`
- `frontend/src/app/(admin)/backoffice/data/events/page.tsx`
- `frontend/src/components/ui/autocomplete-input.tsx` - Créer composant réutilisable

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire concernant la mise à jour des formulaires de création.
> 
> Par exemple :
> - Champs supplémentaires à ajouter aux formulaires
> - Validations spécifiques souhaitées
> - Comportements particuliers pour l'autocomplétion
> - Autres précisions...

**Statut** : 🔴 **À IMPLÉMENTER** - **PRIORITÉ HAUTE**

---

### 🔄 Règles de Gestion des Données

**Date** : 2025-01-27  
**Demandé par** : Utilisateur  
**Priorité** : 🔴 **HAUTE** - Fondamental pour la cohérence des données

**Description** : Implémenter les règles de gestion des données suivantes **OBLIGATOIRES** :

**1. Candidature** :
- ✅ **DOIT avoir une entreprise** (obligatoire, champ requis)
- ✅ **Si entreprise n'existe pas**, la créer automatiquement à partir du nom saisi
- ✅ L'utilisateur saisit juste le nom, le système vérifie l'existence et crée si nécessaire

**2. Contact** :
- ✅ **N'est PAS forcément lié à une candidature** (relation optionnelle)
- ✅ **EST forcément lié à une entreprise** (obligatoire, champ requis)
- ✅ **Si entreprise n'existe pas**, la créer automatiquement à partir du nom saisi

**3. Relance** :
- ✅ **Ne peut PAS avoir lieu sans candidature attachée** (obligatoire)
- ✅ **Est créée UNIQUEMENT à partir d'une candidature** (pas de création standalone)
- ✅ **Récupère automatiquement l'entreprise** de la candidature associée
- ✅ Interface : Bouton "Créer une relance" depuis la page de détail d'une candidature

**4. Entretien** :
- ✅ **Ne peut PAS avoir lieu sans candidature attachée** (obligatoire)
- ✅ **Est créé UNIQUEMENT à partir d'une candidature** (pas de création standalone)
- ✅ **Récupère automatiquement l'entreprise** de la candidature associée
- ✅ Interface : Bouton "Créer un entretien" depuis la page de détail d'une candidature

**5. Appel** :
- ✅ **Peut être passé à** :
  - Un contact (optionnel)
  - OU juste à l'entreprise (optionnel)
  - OU dans le cadre d'une candidature (optionnel)
- ✅ **Peut être de type "candidature spontanée"** pour proposer sa candidature soi-même
- ✅ Au moins un de ces champs doit être rempli (contact OU entreprise OU candidature)

**Contexte** : Ces règles doivent être **strictement respectées** dans le backend et le frontend pour garantir la cohérence des données.

**💡 Avis Technique** :

**Fonction Utilitaire Création Auto Entreprise** :
```javascript
// backend/*-service/src/utils/company.utils.js
async function getOrCreateCompany(companyName, userId) {
  // 1. Chercher entreprise existante (insensible à la casse)
  let company = await prisma.company.findFirst({
    where: {
      name: { equals: companyName, mode: 'insensitive' },
      userId
    }
  });
  
  // 2. Si n'existe pas, créer
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: companyName,
        userId
      }
    });
  }
  
  return company;
}
```

**Validations Backend** :
- Valider que `companyId` est présent pour Application et Contact
- Valider que `applicationId` est présent pour FollowUp et Interview
- Valider qu'au moins un champ (contactId, companyId, applicationId) est présent pour Call

**📝 Actions à Effectuer** :
- [ ] **Créer fonction utilitaire** `getOrCreateCompany()` dans `company.utils.js`
- [ ] **Valider règles dans backend** :
  - [ ] `application.controller.js` : Vérifier entreprise obligatoire, créer si n'existe pas
  - [ ] `contact.controller.js` : Vérifier entreprise obligatoire, créer si n'existe pas
  - [ ] `followup.controller.js` : Vérifier candidature obligatoire, récupérer entreprise auto
  - [ ] `interview.controller.js` : Vérifier candidature obligatoire, récupérer entreprise auto
  - [ ] `call.controller.js` : Vérifier qu'au moins un champ (contact/company/application) est présent
- [ ] **Mettre à jour formulaires frontend** :
  - [ ] Candidature : Champ entreprise avec autocomplétion + création auto
  - [ ] Contact : Champ entreprise avec autocomplétion + création auto
  - [ ] Relance : Création uniquement depuis page candidature
  - [ ] Entretien : Création uniquement depuis page candidature
  - [ ] Appel : Champs optionnels avec validation qu'au moins un est rempli
- [ ] **Ajouter validations côté frontend** :
  - [ ] Messages d'erreur clairs si règles non respectées
  - [ ] Désactiver bouton création si règles non respectées

**📄 Fichiers à Modifier** :
- `backend/*-service/src/utils/company.utils.js` - ✅ Créer fonction `getOrCreateCompany()`
- `backend/application-service/src/controllers/application.controller.js` - Valider règles
- `backend/contact-service/src/controllers/contact.controller.js` - Valider règles
- `backend/followup-service/src/controllers/followup.controller.js` - Valider règles
- `backend/interview-service/src/controllers/interview.controller.js` - Valider règles
- `backend/call-service/src/controllers/call.controller.js` - Valider règles
- `frontend/src/app/(admin)/backoffice/data/**/page.tsx` - Mettre à jour tous les formulaires

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire concernant les règles de gestion des données.
> 
> Par exemple :
> - Règles supplémentaires à ajouter
> - Exceptions ou cas particuliers
> - Comportements spécifiques souhaités
> - Autres précisions...

**Statut** : 🔴 **À IMPLÉMENTER** - **PRIORITÉ HAUTE**

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

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire concernant la création automatique d'événements.
> 
> Par exemple :
> - Types d'événements supplémentaires à créer automatiquement
> - Paramètres spécifiques pour les événements
> - Comportements particuliers souhaités
> - Autres précisions...

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

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire concernant la gestion automatique des statuts.
> 
> Par exemple :
> - Règles spécifiques de proposition automatique de statuts
> - Comportements particuliers souhaités
> - Exceptions ou cas particuliers
> - Autres précisions...

**Statut** : 🔴 **À IMPLÉMENTER**

---

### 🧪 Tests Automatisés avec Playwright

**Date** : 2025-01-27  
**Demandé par** : Utilisateur  
**Priorité** : 🟢 **BASSE** - Après implémentation des fonctionnalités

**Description** : Créer des tests automatisés avec Playwright pour tester les scénarios dans l'interface mobile du projet.

**Contexte** : 
- Tester automatiquement les fonctionnalités pour s'assurer que tout fonctionne correctement
- **PRIORITÉ** : D'abord implémenter les fonctionnalités, ensuite tester
- Tests à faire **APRÈS** la mise à jour des formulaires et règles de gestion

**💡 Avis Technique** :

**Scénarios de Test à Implémenter** :
1. **Création de données** :
   - Créer une candidature avec entreprise existante
   - Créer une candidature avec entreprise nouvelle (création auto)
   - Créer un contact avec entreprise
   - Créer une relance depuis une candidature
   - Créer un entretien depuis une candidature
   - Créer un appel (différents types)
2. **Interface mobile** :
   - Navigation dans l'interface mobile
   - Création de données depuis mobile
   - Affichage du calendrier
   - Gestion des statuts

**📝 Actions à Effectuer** :
- [ ] **Installer Playwright** :
  - [ ] `npm install -D @playwright/test`
  - [ ] `npx playwright install`
- [ ] **Créer structure de tests** :
  - [ ] `tests/e2e/mobile/` - Tests interface mobile
  - [ ] `tests/e2e/data-creation/` - Tests création de données
- [ ] **Créer tests pour scénarios de création de données** :
  - [ ] Test création candidature
  - [ ] Test création entreprise auto
  - [ ] Test création relance depuis candidature
  - [ ] Test création entretien depuis candidature
  - [ ] Test création appel
- [ ] **Créer tests pour interface mobile** :
  - [ ] Test navigation
  - [ ] Test création données
  - [ ] Test calendrier
- [ ] **Intégrer dans CI/CD** :
  - [ ] Ajouter étape "Tests E2E" dans `.github/workflows/ci-cd.yml`
  - [ ] Exécuter tests sur chaque PR

**📄 Fichiers à Modifier** :
- `package.json` - Ajouter dépendances Playwright
- `tests/e2e/mobile/**/*.spec.ts` - Tests interface mobile
- `tests/e2e/data-creation/**/*.spec.ts` - Tests création de données
- `.github/workflows/ci-cd.yml` - Intégrer tests Playwright
- `playwright.config.ts` - Configuration Playwright

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire concernant les tests automatisés avec Playwright.
> 
> Par exemple :
> - Scénarios de test supplémentaires à ajouter
> - Cas de test spécifiques souhaités
> - Configuration particulière pour les tests
> - Autres précisions...

**Statut** : 🔴 **À IMPLÉMENTER** - **PRIORITÉ BASSE** (après implémentation fonctionnalités)

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

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire concernant le calendrier utilisateur.
> 
> Par exemple :
> - Fonctionnalités supplémentaires souhaitées pour le calendrier
> - Types d'affichage spécifiques
> - Intégrations particulières
> - Autres précisions...

**Statut** : 🔴 **À IMPLÉMENTER**

---

### 🎯 Analyse de Potentialité de Candidature

**Date** : 2025-01-27  
**Demandé par** : Utilisateur  
**Priorité** : 🟢 **TRÈS BASSE** - Fonctionnalité avancée pour plus tard

**Description** : Utiliser le profil utilisateur (expériences, compétences, éducation, langues) pour analyser la potentialité de réussite d'une candidature en comparant avec d'autres candidatures ayant le même profil dans la base de données.

**Contexte** : 
- Aider l'utilisateur à évaluer ses chances de réussite pour une candidature donnée
- Comparer le profil de l'utilisateur avec les profils de candidats qui ont réussi leurs candidatures
- Calculer un score de potentialité basé sur les similitudes de profil

**💡 Avis Technique** :

**Algorithme de Matching** :
1. Récupérer le profil utilisateur (expériences, compétences, éducation, langues)
2. Trouver toutes les candidatures "acceptées" dans la base de données
3. Pour chaque candidature acceptée, récupérer le profil du candidat
4. Comparer les profils (expériences similaires, compétences communes, etc.)
5. Calculer un score de matching (0-100%)
6. Afficher le score et les raisons (ex: "80% de chances - Profil similaire à 5 candidatures acceptées")

**Fonctionnalité Avancée** :
- Nécessite une base de données avec suffisamment de données
- Nécessite que les utilisateurs aient complété leur profil
- Peut être implémentée plus tard une fois le système de base fonctionnel

**📝 Actions à Effectuer** :
- [ ] **Créer service d'analyse de matching** `matching.service.js`
- [ ] **Implémenter algorithme de comparaison de profils** :
  - [ ] Comparer expériences (secteur, poste, durée)
  - [ ] Comparer compétences (liste de compétences communes)
  - [ ] Comparer éducation (niveau, domaine)
  - [ ] Comparer langues
- [ ] **Calculer score de potentialité** (0-100%)
- [ ] **Afficher analyse dans interface candidature** :
  - [ ] Section "Analyse de potentialité" dans page détail candidature
  - [ ] Afficher score et explications
  - [ ] Afficher nombre de candidatures similaires acceptées

**📄 Fichiers à Modifier** :
- `backend/*-service/src/services/matching.service.js` - Service d'analyse de matching
- `frontend/src/app/(admin)/backoffice/data/applications/[id]/page.tsx` - Afficher analyse de potentialité

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire concernant l'analyse de potentialité de candidature.
> 
> Par exemple :
> - Critères spécifiques à prendre en compte dans l'analyse
> - Algorithme de matching personnalisé souhaité
> - Affichage spécifique de l'analyse
> - Autres précisions...

**Statut** : 🔴 **À IMPLÉMENTER** - **PRIORITÉ TRÈS BASSE** (fonctionnalité avancée pour plus tard)

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

**📝 Compléments Utilisateur** :

> **💡 Espace pour vos précisions** : Ajoutez ici toute information supplémentaire concernant la gestion des automatismes et le statut de recherche.
> 
> Par exemple :
> - Automatismes supplémentaires à gérer
> - Comportements spécifiques souhaités
> - Exceptions ou cas particuliers
> - Autres précisions...

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

