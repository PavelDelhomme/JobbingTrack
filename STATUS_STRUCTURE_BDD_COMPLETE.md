# 📊 STRUCTURE COMPLÈTE BASE DE DONNÉES - JobbingTrack

> **Note** : Ce fichier contient la structure complète avec tous les types de données, liaisons inter-modèles, et système de synchronisation.

---

## 🔗 Liaisons Inter-Modèles Déjà Implémentées

### Relations 1:N (One-to-Many) - Déjà Implémentées

#### User → Autres Modèles
- `User` → `Application[]` (via `userId`, onDelete: Cascade)
- `User` → `Company[]` (via `userId`, onDelete: Cascade)
- `User` → `Contact[]` (via `userId`, onDelete: Cascade)
- `User` → `FollowUp[]` (via `userId`, onDelete: Cascade)
- `User` → `Call[]` (via `userId`, onDelete: Cascade)
- `User` → `Interview[]` (via `userId`, onDelete: Cascade)
- `User` → `Event[]` (via `userId`, onDelete: Cascade)
- `User` → `Notification[]` (via `userId`, onDelete: Cascade)
- `User` → `Document[]` (via `userId`, onDelete: Cascade)
- `User` → `SyncQueue[]` (via `userId`, onDelete: Cascade)

#### Company → Autres Modèles
- `Company` → `Application[]` (via `companyId`)
- `Company` → `FollowUp[]` (via `companyId`)
- `Company` → `Call[]` (via `companyId`, optionnel, onDelete: SetNull)
- `Company` → `Interview[]` (via `companyId`)

#### Application → Autres Modèles
- `Application` → `FollowUp[]` (via `applicationId`, onDelete: Cascade)
- `Application` → `Call[]` (via `applicationId`, optionnel, onDelete: SetNull)
- `Application` → `Interview[]` (via `applicationId`, onDelete: Cascade)
- `Application` → `Event[]` (via `applicationId`, optionnel, onDelete: Cascade)
- `Application` → `Document[]` (via `applicationId`, optionnel, onDelete: SetNull)
- `Application` → `ApplicationStatusHistory[]` (via `applicationId`, onDelete: Cascade)

#### FollowUp → Autres Modèles
- `FollowUp` → `Call[]` (via `followUpId`, optionnel, onDelete: SetNull)
- `FollowUp` → `Event[]` (via `followUpId`, optionnel, onDelete: Cascade)

#### Interview → Autres Modèles
- `Interview` → `Event[]` (via `interviewId`, optionnel, onDelete: Cascade)

#### Call → Autres Modèles
- `Call` → `Event[]` (via `callId`, optionnel, onDelete: Cascade)

#### Contact → Autres Modèles
- `Contact` → `Call[]` (via `contactId`, optionnel, onDelete: SetNull)

### Relations M:N (Many-to-Many) - Déjà Implémentées

#### Via Tables de Jonction
1. **Contact ↔ Company** (via `ContactCompany`)
   - `Contact` → `ContactCompany[]` → `Company`
   - Champs : `contactId`, `companyId`
   - Contrainte : `@@unique([contactId, companyId])`

2. **Contact ↔ Application** (via `ContactApplication`)
   - `Contact` → `ContactApplication[]` → `Application`
   - Champs : `contactId`, `applicationId`
   - Contrainte : `@@unique([contactId, applicationId])`

3. **FollowUp ↔ Contact** (via `FollowUpContact`)
   - `FollowUp` → `FollowUpContact[]` → `Contact`
   - Champs : `followUpId`, `contactId`
   - Contrainte : `@@unique([followUpId, contactId])`

4. **Interview ↔ Contact** (via `InterviewContact`)
   - `Interview` → `InterviewContact[]` → `Contact`
   - Champs : `interviewId`, `contactId`
   - Contrainte : `@@unique([interviewId, contactId])`

### Relations Optionnelles (Personnalisables)

#### Platform → Application
- `Platform` → `Application[]` (via `platformId`, optionnel)

#### FollowUpType → FollowUp
- `FollowUpType` → `FollowUp[]` (via `followUpTypeId`, optionnel)

#### FollowUpMethod → FollowUp
- `FollowUpMethod` → `FollowUp[]` (via `followUpMethodId`, optionnel)

#### InterviewType → Interview
- `InterviewType` → `Interview[]` (via `interviewTypeId`, optionnel)

#### InterviewStyle → Interview
- `InterviewStyle` → `Interview[]` (via `interviewStyleId`, optionnel)

#### EventType → Event
- `EventType` → `Event[]` (via `eventTypeId`, optionnel)

#### CallType → Call
- `CallType` → `Call[]` (via `callTypeId`, optionnel)

---

## 🔄 Système de Synchronisation avec Hash

### Principe

Le système de synchronisation permet de :
- Détecter les modifications locales vs serveur
- Résoudre les conflits lors de synchronisation
- Optimiser les transferts de données (seulement les modifications)
- Assurer la cohérence des données entre client et serveur

### Champs de Synchronisation à Ajouter

**À ajouter à TOUS les modèles applicatifs** :
- `syncHash` : String? - Hash calculé pour détection de modifications (SHA-256)
- `entityHash` : String? - Hash de l'entité complète pour comparaison
- `lastSyncAt` : DateTime? - Timestamp de dernière synchronisation réussie

### Modèles Concernés

Tous les modèles applicatifs doivent avoir ces champs :
- ✅ `User` - Déjà présent (à vérifier)
- ⚠️ `Company` - **À AJOUTER**
- ⚠️ `Application` - **À AJOUTER**
- ⚠️ `Contact` - **À AJOUTER**
- ⚠️ `FollowUp` - **À AJOUTER**
- ⚠️ `Call` - **À AJOUTER**
- ⚠️ `Interview` - **À AJOUTER**
- ⚠️ `Event` - **À AJOUTER**
- ⚠️ `Document` - **À AJOUTER**

### Calcul du Hash

**Algorithme** : SHA-256

**Champs inclus dans le hash** (tous les champs modifiables sauf timestamps et hash) :
- Pour `Application` : `userId`, `companyId`, `platformId`, `position`, `description`, `jobUrl`, `location`, `contractType`, `workMode`, `applicationDate`, `applicationType`, `status`, `salaryMin`, `salaryMax`, `salaryNegotiable`, `notes`, `archived`, `archivedAt`
- Même principe pour tous les autres modèles

**Format** : `SHA256(JSON.stringify(sortedFields))`

### Logique de Synchronisation

1. **Création locale** :
   - `syncHash` = null
   - `entityHash` = hash calculé
   - `lastSyncAt` = null
   - Ajout dans `SyncQueue` avec action `CREATE`

2. **Modification locale** :
   - `syncHash` = hash précédent (pour comparaison)
   - `entityHash` = nouveau hash calculé
   - `lastSyncAt` = null (non synchronisé)
   - Ajout dans `SyncQueue` avec action `UPDATE`

3. **Synchronisation réussie** :
   - `syncHash` = `entityHash` (synchronisé)
   - `lastSyncAt` = now()
   - Suppression de `SyncQueue`

4. **Résolution de conflits** :
   - Si `syncHash` local ≠ `syncHash` serveur → Conflit détecté
   - Stratégie : Last-Write-Wins ou merge manuel selon configuration

---

## 📋 Valeurs par Défaut des Anciens Enums

### ApplicationStatus (12 valeurs par défaut)

**Statuts système à créer lors de la migration** :

| Code | Nom | Description | Order | Color | Icon |
|------|-----|-------------|-------|-------|------|
| `CANDIDATE_PENDING` | "Candidaté" | Candidaté et en attente | 1 | "#3B82F6" | "Clock" |
| `NO_RESPONSE` | "Aucune réponse" | Aucune réponse reçue | 2 | "#F59E0B" | "AlertCircle" |
| `NO_RESPONSE_AFTER_FIRST_FOLLOWUP` | "Pas de réponse (1 relance)" | Aucune réponse après 1 relance | 3 | "#EF4444" | "AlertTriangle" |
| `NO_RESPONSE_AFTER_SECOND_FOLLOWUP` | "Pas de réponse (2 relances)" | Aucune réponse après 2 relances | 4 | "#DC2626" | "XCircle" |
| `FIRST_INTERVIEW_PENDING` | "1er entretien en attente" | Premier entretien programmé | 5 | "#8B5CF6" | "Calendar" |
| `OTHER_INTERVIEW_PENDING` | "Autre entretien en attente" | Autre entretien programmé | 6 | "#7C3AED" | "Calendar" |
| `TECHNICAL_TEST_PENDING` | "Test technique en cours" | Test technique en cours | 7 | "#6366F1" | "FileText" |
| `OFFER_RECEIVED` | "Offre reçue" | Offre d'emploi reçue | 8 | "#10B981" | "CheckCircle" |
| `ACCEPTED_AFTER_INTERVIEW` | "Retenue" | Retenue après entretien | 9 | "#059669" | "CheckCircle2" |
| `REJECTED_WITHOUT_INTERVIEW` | "Non retenue (sans entretien)" | Non retenue sans entretien | 10 | "#EF4444" | "X" |
| `REJECTED_AFTER_INTERVIEW` | "Non retenue (après entretien)" | Non retenue après entretien | 11 | "#DC2626" | "XCircle" |
| `WITHDRAWN` | "Candidature retirée" | Candidature retirée par le candidat | 12 | "#6B7280" | "Archive" |

**Tous avec** : `userId = null`, `isPredefined = true`, `isActive = true`

### InterviewStatus (5 valeurs par défaut)

| Code | Nom | Description | Order | Color | Icon |
|------|-----|-------------|-------|-------|------|
| `SCHEDULED` | "Programmé" | Entretien programmé | 1 | "#3B82F6" | "Calendar" |
| `COMPLETED` | "Terminé" | Entretien passé | 2 | "#10B981" | "CheckCircle" |
| `FEEDBACK_PENDING` | "En attente de retour" | En attente de retour | 3 | "#F59E0B" | "Clock" |
| `CANCELLED` | "Annulé" | Entretien annulé | 4 | "#EF4444" | "XCircle" |
| `RESCHEDULED` | "Reporté" | Entretien reporté | 5 | "#8B5CF6" | "CalendarClock" |

**Tous avec** : `userId = null`, `isPredefined = true`, `isActive = true`

### FollowUpStatus (5 valeurs par défaut)

| Code | Nom | Description | Order | Color | Icon |
|------|-----|-------------|-------|-------|------|
| `PENDING` | "En attente" | Relance en attente | 1 | "#3B82F6" | "Clock" |
| `POSITIVE_RESPONSE` | "Réponse positive" | Retour positif reçu | 2 | "#10B981" | "CheckCircle" |
| `NEGATIVE_RESPONSE` | "Réponse négative" | Retour négatif reçu | 3 | "#EF4444" | "XCircle" |
| `NO_RESPONSE` | "Aucun retour" | Aucun retour reçu | 4 | "#F59E0B" | "AlertCircle" |
| `PLANNED` | "Prévue" | Relance prévisionnelle | 5 | "#8B5CF6" | "Calendar" |

**Tous avec** : `userId = null`, `isPredefined = true`, `isActive = true`

---

## 📝 Modèles avec Types de Données Complets

### Modèles Principaux - Types Détaillés

#### 4. **Contact**
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `firstName` : String
  - `lastName` : String (indexé avec firstName)
  - `position` : String? (fonction, optionnel)
  - `email` : String? (optionnel, indexé)
  - `phone` : String? (optionnel)
  - `linkedinUrl` : String? (URL LinkedIn, optionnel)
  - `notes` : String? (optionnel)
  - `isArchived` : Boolean (@default(false))
  - `archivedAt` : DateTime? (optionnel)
  - `archivedReason` : String? (raison d'archivage, optionnel)
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel)
  - `entityHash` : String? (hash de l'entité, optionnel)
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel)
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)
  - → `ContactCompany[]` (M:N avec Company) - `companies`
  - → `ContactApplication[]` (M:N avec Application) - `applications`
  - → `FollowUpContact[]` (M:N avec FollowUp) - `followUps`
  - → `InterviewContact[]` (M:N avec Interview) - `interviews`
  - → `Call[]` (1:N) - `calls`

#### 5. **FollowUp** (Relance)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `applicationId` : String (FK vers Application, indexé, onDelete: Cascade)
  - `companyId` : String (FK vers Company, indexé)
  - `followUpTypeId` : String? (FK vers FollowUpType, optionnel)
  - `followUpMethodId` : String? (FK vers FollowUpMethod, optionnel)
  - `followUpDate` : DateTime (indexé)
  - `status` : FollowUpStatus (enum, @default(PENDING), indexé) → **À TRANSFORMER EN FK vers FollowUpStatus (table)**
  - `response` : String? (réponse reçue, optionnel)
  - `notes` : String? (optionnel)
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel)
  - `entityHash` : String? (hash de l'entité, optionnel)
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel)
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)
  - ← `Application` (N:1) - `application` (FK: applicationId)
  - ← `Company` (N:1) - `company` (FK: companyId)
  - ← `FollowUpType` (N:1, optionnel) - `followUpType` (FK: followUpTypeId)
  - ← `FollowUpMethod` (N:1, optionnel) - `followUpMethod` (FK: followUpMethodId)
  - → `FollowUpContact[]` (M:N avec Contact) - `contacts`
  - → `Call[]` (1:N) - `calls`
  - → `Event[]` (1:N) - `events`

#### 6. **Call** (Appel)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `applicationId` : String? (FK vers Application, optionnel, onDelete: SetNull)
  - `companyId` : String? (FK vers Company, optionnel, onDelete: SetNull)
  - `followUpId` : String? (FK vers FollowUp, optionnel, onDelete: SetNull)
  - `contactId` : String? (FK vers Contact, optionnel, onDelete: SetNull)
  - `callTypeId` : String? (FK vers CallType, optionnel)
  - `callDate` : DateTime (indexé)
  - `duration` : Int? (durée en minutes, optionnel)
  - `subject` : String (objet de l'appel)
  - `notes` : String? (optionnel)
  - `status` : CallStatus (enum: SCHEDULED, COMPLETED, MISSED, CANCELLED, @default(COMPLETED), indexé)
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel)
  - `entityHash` : String? (hash de l'entité, optionnel)
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel)
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)
  - ← `Application` (N:1, optionnel) - `application` (FK: applicationId)
  - ← `Company` (N:1, optionnel) - `company` (FK: companyId)
  - ← `FollowUp` (N:1, optionnel) - `followUp` (FK: followUpId)
  - ← `Contact` (N:1, optionnel) - `contact` (FK: contactId)
  - ← `CallType` (N:1, optionnel) - `callType` (FK: callTypeId)
  - → `Event[]` (1:N) - `events`

#### 7. **Interview** (Entretien)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `applicationId` : String (FK vers Application, indexé, onDelete: Cascade)
  - `companyId` : String (FK vers Company, indexé)
  - `interviewTypeId` : String? (FK vers InterviewType, optionnel)
  - `interviewStyleId` : String? (FK vers InterviewStyle, optionnel)
  - `interviewDate` : DateTime (indexé)
  - `estimatedDuration` : Int? (durée estimée en minutes, optionnel)
  - `location` : String? (lieu physique, optionnel)
  - `videoLink` : String? (lien visio, optionnel)
  - `status` : InterviewStatus (enum, @default(SCHEDULED), indexé) → **À TRANSFORMER EN FK vers InterviewStatus (table)**
  - `feedbackExpectedFrom` : DateTime? (début plage de retour, optionnel)
  - `feedbackExpectedTo` : DateTime? (fin plage de retour, optionnel)
  - `feedbackReceived` : Boolean (@default(false))
  - `outcome` : InterviewOutcome? (enum: POSITIVE, NEGATIVE, NEUTRAL, PENDING, optionnel)
  - `notes` : String? (optionnel)
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel)
  - `entityHash` : String? (hash de l'entité, optionnel)
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel)
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)
  - ← `Application` (N:1) - `application` (FK: applicationId)
  - ← `Company` (N:1) - `company` (FK: companyId)
  - ← `InterviewType` (N:1, optionnel) - `interviewType` (FK: interviewTypeId)
  - ← `InterviewStyle` (N:1, optionnel) - `interviewStyle` (FK: interviewStyleId)
  - → `InterviewContact[]` (M:N avec Contact) - `contacts`
  - → `Event[]` (1:N) - `events`

#### 8. **Event** (Événement Calendrier)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `eventTypeId` : String? (FK vers EventType, optionnel)
  - `title` : String
  - `description` : String? (optionnel)
  - `startDate` : DateTime (indexé)
  - `endDate` : DateTime? (optionnel)
  - `allDay` : Boolean (@default(false))
  - `applicationId` : String? (FK vers Application, optionnel, lien polymorphe, onDelete: Cascade, indexé)
  - `interviewId` : String? (FK vers Interview, optionnel, lien polymorphe, onDelete: Cascade, indexé)
  - `followUpId` : String? (FK vers FollowUp, optionnel, lien polymorphe, onDelete: Cascade)
  - `callId` : String? (FK vers Call, optionnel, lien polymorphe, onDelete: Cascade)
  - `reminderEnabled` : Boolean (@default(false))
  - `reminderMinutes` : Int? (minutes avant l'événement, optionnel)
  - `color` : String? (@default("#3B82F6"))
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel)
  - `entityHash` : String? (hash de l'entité, optionnel)
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel)
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)
  - ← `EventType` (N:1, optionnel) - `eventType` (FK: eventTypeId)
  - ← `Application` (N:1, optionnel - lien polymorphe) - `application` (FK: applicationId)
  - ← `Interview` (N:1, optionnel - lien polymorphe) - `interview` (FK: interviewId)
  - ← `FollowUp` (N:1, optionnel - lien polymorphe) - `followUp` (FK: followUpId)
  - ← `Call` (N:1, optionnel - lien polymorphe) - `call` (FK: callId)

#### 9. **Document**
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `applicationId` : String? (FK vers Application, optionnel, onDelete: SetNull, indexé)
  - `name` : String
  - `documentType` : DocumentType (enum: CV, COVER_LETTER, PORTFOLIO, CERTIFICATE, DIPLOMA, RECOMMENDATION, OTHER, indexé)
  - `fileUrl` : String (URL du fichier)
  - `fileSize` : Int (en bytes)
  - `mimeType` : String
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel)
  - `entityHash` : String? (hash de l'entité, optionnel)
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel)
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)
  - ← `Application` (N:1, optionnel) - `application` (FK: applicationId)

#### 10. **Notification**
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `title` : String
  - `message` : String
  - `type` : NotificationType (enum: REMINDER, APPLICATION_UPDATE, INTERVIEW_SCHEDULED, FOLLOWUP_DUE, DEADLINE, SYSTEM)
  - `read` : Boolean (@default(false), indexé)
  - `readAt` : DateTime? (optionnel)
  - `entityType` : String? (type d'entité liée, optionnel)
  - `entityId` : String? (ID de l'entité liée, optionnel)
  - `data` : Json? (données supplémentaires, optionnel)
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()), indexé)
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)

#### 11. **ApplicationStatusHistory** (Historique des Statuts)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `applicationId` : String (FK vers Application, indexé, onDelete: Cascade)
  - `previousStatus` : ApplicationStatus (enum) → **À TRANSFORMER EN FK vers ApplicationStatus (table)**
  - `newStatus` : ApplicationStatus (enum) → **À TRANSFORMER EN FK vers ApplicationStatus (table)**
  - `comment` : String? (optionnel)
  - `changedAt` : DateTime (@default(now()), indexé)
- **Relations** :
  - ← `Application` (N:1) - `application` (FK: applicationId)

#### 12. **SyncQueue** (Queue de Synchronisation Offline)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `action` : SyncAction (enum: CREATE, UPDATE, DELETE)
  - `entity` : String (nom de l'entité: Application, Interview, etc.)
  - `entityId` : String? (ID de l'entité, optionnel)
  - `payload` : Json (données de l'entité)
  - `synced` : Boolean (@default(false), indexé)
  - `attempts` : Int (@default(0))
  - `lastAttempt` : DateTime? (optionnel)
  - `error` : String? (message d'erreur, optionnel)
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()), indexé)
  - `syncedAt` : DateTime? (optionnel)
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)

### Tables de Jonction - Types Détaillés

#### 1. **ContactCompany**
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `contactId` : String (FK vers Contact, indexé, onDelete: Cascade)
  - `companyId` : String (FK vers Company, indexé, onDelete: Cascade)
  - `createdAt` : DateTime (@default(now()))
- **Contraintes** :
  - `@@unique([contactId, companyId])` - Un contact ne peut être lié qu'une fois à une entreprise
- **Relations** :
  - ← `Contact` (N:1) - `contact` (FK: contactId)
  - ← `Company` (N:1) - `company` (FK: companyId)

#### 2. **ContactApplication**
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `contactId` : String (FK vers Contact, indexé, onDelete: Cascade)
  - `applicationId` : String (FK vers Application, indexé, onDelete: Cascade)
  - `createdAt` : DateTime (@default(now()))
- **Contraintes** :
  - `@@unique([contactId, applicationId])` - Un contact ne peut être lié qu'une fois à une candidature
- **Relations** :
  - ← `Contact` (N:1) - `contact` (FK: contactId)
  - ← `Application` (N:1) - `application` (FK: applicationId)

#### 3. **FollowUpContact**
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `followUpId` : String (FK vers FollowUp, indexé, onDelete: Cascade)
  - `contactId` : String (FK vers Contact, indexé, onDelete: Cascade)
  - `createdAt` : DateTime (@default(now()))
- **Contraintes** :
  - `@@unique([followUpId, contactId])` - Un contact ne peut être lié qu'une fois à une relance
- **Relations** :
  - ← `FollowUp` (N:1) - `followUp` (FK: followUpId)
  - ← `Contact` (N:1) - `contact` (FK: contactId)

#### 4. **InterviewContact**
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `interviewId` : String (FK vers Interview, indexé, onDelete: Cascade)
  - `contactId` : String (FK vers Contact, indexé, onDelete: Cascade)
  - `createdAt` : DateTime (@default(now()))
- **Contraintes** :
  - `@@unique([interviewId, contactId])` - Un contact ne peut être lié qu'une fois à un entretien
- **Relations** :
  - ← `Interview` (N:1) - `interview` (FK: interviewId)
  - ← `Contact` (N:1) - `contact` (FK: contactId)

### Listes Personnalisables - Types Détaillés

#### 1. **Platform** (Plateformes de candidature)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String? (FK vers User, nullable pour système, indexé)
  - `name` : String
  - `icon` : String? (URL ou nom d'icône, optionnel)
  - `url` : String? (URL de la plateforme, optionnel)
  - `isPredefined` : Boolean (@default(false))
  - `platformTypeId` : String? (FK vers PlatformType, optionnel) → **À AJOUTER**
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
- **Contraintes** :
  - `@@unique([userId, name])` - Nom unique par utilisateur
- **Relations** :
  - ← `User` (N:1, optionnel) - `user` (FK: userId)
  - ← `PlatformType` (N:1, optionnel) - `platformType` (FK: platformTypeId) → **À AJOUTER**
  - → `Application[]` (1:N) - `applications`

#### 2. **FollowUpType** (Types de relance)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String? (FK vers User, nullable pour système, indexé)
  - `name` : String
  - `icon` : String? (URL ou nom d'icône, optionnel)
  - `isPredefined` : Boolean (@default(false))
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
- **Contraintes** :
  - `@@unique([userId, name])` - Nom unique par utilisateur
- **Relations** :
  - ← `User` (N:1, optionnel) - `user` (FK: userId)
  - → `FollowUp[]` (1:N) - `followUps`

#### 3. **FollowUpMethod** (Moyens de relance)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String? (FK vers User, nullable pour système, indexé)
  - `name` : String
  - `icon` : String? (URL ou nom d'icône, optionnel)
  - `isPredefined` : Boolean (@default(false))
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
- **Contraintes** :
  - `@@unique([userId, name])` - Nom unique par utilisateur
- **Relations** :
  - ← `User` (N:1, optionnel) - `user` (FK: userId)
  - → `FollowUp[]` (1:N) - `followUps`

#### 4. **InterviewType** (Types d'entretien)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String? (FK vers User, nullable pour système, indexé)
  - `name` : String
  - `icon` : String? (URL ou nom d'icône, optionnel)
  - `isPredefined` : Boolean (@default(false))
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
- **Contraintes** :
  - `@@unique([userId, name])` - Nom unique par utilisateur
- **Relations** :
  - ← `User` (N:1, optionnel) - `user` (FK: userId)
  - → `Interview[]` (1:N) - `interviews`

#### 5. **InterviewStyle** (Styles d'entretien)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String? (FK vers User, nullable pour système, indexé)
  - `name` : String
  - `icon` : String? (URL ou nom d'icône, optionnel)
  - `isPredefined` : Boolean (@default(false))
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
- **Contraintes** :
  - `@@unique([userId, name])` - Nom unique par utilisateur
- **Relations** :
  - ← `User` (N:1, optionnel) - `user` (FK: userId)
  - → `Interview[]` (1:N) - `interviews`

#### 6. **EventType** (Types d'événement)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String? (FK vers User, nullable pour système, indexé)
  - `name` : String
  - `color` : String? (couleur hex, optionnel)
  - `icon` : String? (URL ou nom d'icône, optionnel)
  - `isPredefined` : Boolean (@default(false))
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
- **Contraintes** :
  - `@@unique([userId, name])` - Nom unique par utilisateur
- **Relations** :
  - ← `User` (N:1, optionnel) - `user` (FK: userId)
  - → `Event[]` (1:N) - `events`

#### 7. **CallType** (Types d'appel)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String? (FK vers User, nullable pour système, indexé)
  - `name` : String
  - `icon` : String? (URL ou nom d'icône, optionnel)
  - `isPredefined` : Boolean (@default(false))
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
- **Contraintes** :
  - `@@unique([userId, name])` - Nom unique par utilisateur
- **Relations** :
  - ← `User` (N:1, optionnel) - `user` (FK: userId)
  - → `Call[]` (1:N) - `calls`

---

## 🔄 Système de Synchronisation - Détails Techniques

### Implémentation Requise

#### 1. Service de Synchronisation

**Fichier** : `backend/auth-service/src/services/sync.service.js`

**Fonctionnalités** :
- Calcul de hash SHA-256 pour chaque entité
- Comparaison de hashs pour détection de modifications
- Résolution de conflits (Last-Write-Wins ou merge)
- Gestion de la queue de synchronisation
- Synchronisation incrémentale (seulement les modifications)

#### 2. Champs à Ajouter dans le Schéma Prisma

**Pour tous les modèles applicatifs** :
```prisma
// Synchronisation
syncHash      String?   // Hash pour détection de modifications
entityHash    String?   // Hash de l'entité complète
lastSyncAt    DateTime? // Timestamp de dernière synchronisation
```

#### 3. Calcul du Hash

**Fonction** : `calculateEntityHash(entity)`

**Algorithme** :
1. Extraire tous les champs modifiables (exclure `id`, `createdAt`, `updatedAt`, `deletedAt`, `syncHash`, `entityHash`, `lastSyncAt`)
2. Trier les champs par ordre alphabétique
3. Créer un objet JSON avec les valeurs
4. Calculer SHA-256 de la chaîne JSON

**Exemple pour Application** :
```javascript
const fields = {
  userId: entity.userId,
  companyId: entity.companyId,
  platformId: entity.platformId,
  position: entity.position,
  description: entity.description,
  // ... tous les autres champs modifiables
};
const hash = SHA256(JSON.stringify(sortKeys(fields)));
```

#### 4. Logique de Synchronisation

**Workflow** :
1. **Client (Mobile/Web)** :
   - Modification locale → Calcul `entityHash` → `syncHash` = null → Ajout dans `SyncQueue`
   - Synchronisation → Envoi des entités avec `syncHash` et `entityHash`

2. **Serveur** :
   - Réception → Comparaison `syncHash` serveur vs `syncHash` client
   - Si identique → Pas de conflit → Mise à jour
   - Si différent → Conflit détecté → Résolution selon stratégie
   - Mise à jour `syncHash` = `entityHash` et `lastSyncAt` = now()

3. **Résolution de Conflits** :
   - **Last-Write-Wins** : Prendre la version la plus récente (`updatedAt`)
   - **Merge** : Fusionner les champs modifiés (stratégie avancée)
   - **Manuel** : Demander à l'utilisateur de choisir

---

## 📋 Résumé des Modifications Nécessaires

### Champs de Synchronisation à Ajouter

**Modèles concernés** :
- [ ] `Company` - Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Application` - Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Contact` - Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `FollowUp` - Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Call` - Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Interview` - Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Event` - Ajouter `syncHash`, `entityHash`, `lastSyncAt`
- [ ] `Document` - Ajouter `syncHash`, `entityHash`, `lastSyncAt`

### Scripts de Migration

**À créer** :
- [ ] `scripts/migrations/add-sync-fields.js` - Ajouter champs de synchronisation
- [ ] `scripts/migrations/create-default-statuses.js` - Créer statuts système par défaut
- [ ] `scripts/migrations/convert-enums-to-tables.js` - Convertir enums en tables

---

**Note** : Ce document complète `STATUS_STRUCTURE_BDD.md` avec tous les détails techniques nécessaires.

