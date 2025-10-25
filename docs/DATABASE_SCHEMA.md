# 📊 Structure de la Base de Données - JobbingTrack

[← Retour au README principal](../README.md) | [📚 Index Documentation](README.md)

## 🎯 Vue d'ensemble

Cette documentation présente la structure complète et mise à jour de la base de données JobbingTrack, incluant tous les nouveaux modèles et relations ajoutés pour une meilleure gestion des candidatures, contacts, et interactions.

## 📋 Table des matières

- [🏗️ Architecture générale](#️-architecture-générale)
- [📦 Modèles principaux](#-modèles-principaux)
- [🔗 Relations entre modèles](#-relations-entre-modèles)
- [📊 Tables de jonction](#-tables-de-jonction)
- [🏷️ Enums et types](#️-enums-et-types)
- [🔍 Indexes et performances](#-indexes-et-performances)
- [📈 Nouveautés](#-nouveautés)

---

## 🏗️ Architecture générale

### Base de données
- **Type** : PostgreSQL 15+
- **Architecture** : Base centralisée avec schémas par service
- **ORM** : Prisma
- **Migrations** : Versionnées et rollback possible

### Principes de conception
- **Relations polymorphes** pour la flexibilité
- **Historisation** des changements importants
- **Synchronisation** mobile/offline
- **Notifications** multi-canaux
- **Audit trail** complet

---

## 📦 Modèles principaux

### 1. User (Utilisateur)
**Champs principaux** :
- `id`, `email`, `password`, `firstName`, `lastName`, `phone`, `profilePicture`
- `role`, `roles[]`, `isActive`, `resetToken`, `resetTokenExpiry`
- `isDeleted`, `isArchived`, `syncHash`, `entityHash`, `lastSyncAt`

**Relations** :
- `applications` (one-to-many) → Application
- `contacts` (one-to-many) → Contact
- `followUps` (one-to-many) → FollowUp
- `calls` (one-to-many) → Call
- `interviews` (one-to-many) → Interview
- `events` (one-to-many) → Event
- `notifications` (one-to-many) → Notification
- `statusHistory` (one-to-many) → ApplicationStatusHistory
- `syncQueues` (one-to-many) → SyncQueue

### 2. Application (Candidature)
**Champs principaux** :
- `id`, `userId`, `companyId`, `platformId`, `position`, `description`, `location`
- `type`, `salary`, `status`, `applicationDate`, `jobUrl`, `notes`
- `isArchived`, `archivedAt`, `archivedBy`, `archivedReason`

**Relations** :
- `user` (many-to-one) → User
- `company` (many-to-one) → Company
- `platform` (many-to-one) → Platform
- `interviews` (one-to-many) → Interview
- `followUps` (one-to-many) → FollowUp
- `calls` (one-to-many) → Call
- `events` (one-to-many) → Event
- `statusHistory` (one-to-many) → ApplicationStatusHistory
- `contactApplications` (many-to-many) → Contact

### 3. Company (Entreprise)
**Champs principaux** :
- `id`, `name`, `website`, `industry`, `size`, `location`, `description`, `logoUrl`

**Relations** :
- `applications` (one-to-many) → Application
- `contacts` (one-to-many) → Contact
- `followUps` (one-to-many) → FollowUp
- `calls` (one-to-many) → Call
- `interviews` (one-to-many) → Interview
- `contactCompanies` (many-to-many) → Contact

### 4. Contact
**Champs principaux** :
- `id`, `userId`, `companyId`, `firstName`, `lastName`, `position`, `email`, `phone`, `linkedinUrl`, `notes`, `lastContactDate`

**Relations** :
- `user` (many-to-one) → User
- `company` (many-to-one) → Company
- `followUps` (one-to-many) → FollowUp
- `calls` (one-to-many) → Call
- `interviews` (one-to-many) → Interview
- `contactCompanies` (many-to-many) → Company
- `contactApplications` (many-to-many) → Application
- `followUpContacts` (many-to-many) → FollowUp
- `interviewContacts` (many-to-many) → Interview
- `contactEvents` (many-to-many) → Event

### 5. FollowUp (Relance)
**Champs principaux** :
- `id`, `userId`, `applicationId`, `companyId`, `contactId`, `type`, `scheduledDate`, `completed`, `completedDate`, `sentDate`, `subject`, `message`, `response`, `responseDate`, `status`

**Relations** :
- `user` (many-to-one) → User
- `application` (many-to-one) → Application
- `company` (many-to-one) → Company
- `contact` (many-to-one) → Contact
- `events` (one-to-many) → Event
- `calls` (one-to-many) → Call
- `followUpContacts` (many-to-many) → Contact

### 6. Call (Appel)
**Champs principaux** :
- `id`, `userId`, `applicationId`, `companyId`, `contactId`, `followUpId`, `type`, `scheduledDate`, `callDate`, `duration`, `status`, `notes`, `outcome`, `followUpNeeded`

**Relations** :
- `user` (many-to-one) → User
- `application` (many-to-one) → Application
- `company` (many-to-one) → Company
- `contact` (many-to-one) → Contact
- `followUp` (many-to-one) → FollowUp
- `events` (one-to-many) → Event

### 7. Interview (Entretien)
**Champs principaux** :
- `id`, `userId`, `applicationId`, `companyId`, `type`, `scheduledAt`, `duration`, `location`, `meetingUrl`, `interviewer`, `notes`, `status`, `feedback`, `completedAt`

**Relations** :
- `user` (many-to-one) → User
- `application` (many-to-one) → Application
- `company` (many-to-one) → Company
- `events` (one-to-many) → Event
- `interviewContacts` (many-to-many) → Contact

### 8. Event (Événement)
**Champs principaux** :
- `id`, `userId`, `title`, `description`, `startDate`, `endDate`, `isAllDay`, `type`, `isReminderActive`, `reminderMinutesBefore`, `color`
- Relations polymorphes : `applicationId`, `interviewId`, `followUpId`, `callId`

**Relations** :
- `user` (many-to-one) → User
- Relations polymorphes vers Application, Interview, FollowUp, Call (un seul actif à la fois)
- `contactEvents` (many-to-many) → Contact

### 9. ApplicationStatusHistory (Historique des statuts)
**Champs principaux** :
- `id`, `applicationId`, `previousStatus`, `newStatus`, `comment`, `changedAt`, `changedBy`

**Relations** :
- `application` (many-to-one) → Application
- `user` (many-to-one optionnel) → User

### 10. Notification
**Champs principaux** :
- `id`, `userId`, `title`, `message`, `type`, `isRead`, `readAt`, `entityType`, `entityId`, `data`

**Relations** :
- `user` (many-to-one) → User

### 11. SyncQueue (Queue de synchronisation)
**Champs principaux** :
- `id`, `userId`, `action`, `entity`, `entityId`, `payload`, `isSynced`, `attempts`, `lastAttemptAt`, `error`

**Relations** :
- `user` (many-to-one) → User

---

## 🔗 Relations entre modèles

### Schéma relationnel principal

```
User
├── applications (1:N) → Application
├── contacts (1:N) → Contact
├── followUps (1:N) → FollowUp
├── calls (1:N) → Call
├── interviews (1:N) → Interview
├── events (1:N) → Event
├── notifications (1:N) → Notification
├── statusHistory (1:N) → ApplicationStatusHistory
└── syncQueues (1:N) → SyncQueue

Application
├── user (N:1) → User
├── company (N:1) → Company
├── platform (N:1) → Platform
├── interviews (1:N) → Interview
├── followUps (1:N) → FollowUp
├── calls (1:N) → Call
├── events (1:N) → Event
├── statusHistory (1:N) → ApplicationStatusHistory
└── contactApplications (N:N) → Contact

Company
├── applications (1:N) → Application
├── contacts (1:N) → Contact
├── followUps (1:N) → FollowUp
├── calls (1:N) → Call
├── interviews (1:N) → Interview
└── contactCompanies (N:N) → Contact

Contact
├── user (N:1) → User
├── company (N:1) → Company
├── followUps (1:N) → FollowUp
├── calls (1:N) → Call
├── interviews (1:N) → Interview
├── contactCompanies (N:N) → Company
├── contactApplications (N:N) → Application
├── followUpContacts (N:N) → FollowUp
├── interviewContacts (N:N) → Interview
└── contactEvents (N:N) → Event

FollowUp
├── user (N:1) → User
├── application (N:1) → Application
├── company (N:1) → Company
├── contact (N:1) → Contact
├── events (1:N) → Event
├── calls (1:N) → Call
└── followUpContacts (N:N) → Contact

Call
├── user (N:1) → User
├── application (N:1) → Application
├── company (N:1) → Company
├── contact (N:1) → Contact
├── followUp (N:1) → FollowUp
└── events (1:N) → Event

Interview
├── user (N:1) → User
├── application (N:1) → Application
├── company (N:1) → Company
├── events (1:N) → Event
└── interviewContacts (N:N) → Contact

Event
├── user (N:1) → User
├── application (1:1 optionnel) → Application (polymorphe)
├── interview (1:1 optionnel) → Interview (polymorphe)
├── followUp (1:1 optionnel) → FollowUp (polymorphe)
├── call (1:1 optionnel) → Call (polymorphe)
└── contactEvents (N:N) → Contact
```

---

## 📊 Tables de jonction

### ContactCompany
Relations many-to-many entre contacts et entreprises
- **Champs** : `contactId`, `companyId`
- **Contraintes** : Unique sur (contactId, companyId)

### ContactApplication
Relations many-to-many entre contacts et candidatures
- **Champs** : `contactId`, `applicationId`
- **Contraintes** : Unique sur (contactId, applicationId)

### FollowUpContact
Relations many-to-many entre relances et contacts
- **Champs** : `followUpId`, `contactId`
- **Contraintes** : Unique sur (followUpId, contactId)

### InterviewContact
Relations many-to-many entre entretiens et contacts
- **Champs** : `interviewId`, `contactId`
- **Contraintes** : Unique sur (interviewId, contactId)

### ContactEvent
Relations many-to-many entre contacts et événements
- **Champs** : `contactId`, `eventId`
- **Contraintes** : Unique sur (contactId, eventId)

---

## 🏷️ Enums et types

### JobType
- `FULL_TIME`, `PART_TIME`, `CONTRACT`, `FREELANCE`, `INTERNSHIP`, `TEMPORARY`, `REMOTE`, `HYBRID`

### ApplicationStatus
- `CANDIDATE_PENDING`, `NO_RESPONSE`, `NO_RESPONSE_AFTER_FIRST_FOLLOWUP`, `NO_RESPONSE_AFTER_SECOND_FOLLOWUP`
- `FIRST_INTERVIEW_PENDING`, `OTHER_INTERVIEW_PENDING`, `ACCEPTED_AFTER_INTERVIEW`
- `REJECTED_WITHOUT_INTERVIEW`, `REJECTED_AFTER_INTERVIEW`

### InterviewType
- `PHONE_SCREENING`, `VIDEO`, `ON_SITE`, `TECHNICAL`, `HR`, `MANAGER`, `TEAM`, `FINAL`

### InterviewStatus
- `UPCOMING_ARRIVAL`, `COMPLETED`, `FEEDBACK_PENDING`, `PENDING`

### FollowUpType
- `EMAIL`, `PHONE`, `LINKEDIN`, `MESSAGE`, `MEETING`

### FollowUpStatus
- `PENDING_FOLLOWUP`, `POSITIVE_RESPONSE`, `NEGATIVE_RESPONSE`, `NO_RESPONSE`, `SCHEDULED_FOLLOWUP`

### CallType
- `OUTGOING`, `INCOMING`, `MISSED`

### CallStatus
- `SCHEDULED`, `COMPLETED`, `CANCELLED`, `NO_ANSWER`, `VOICEMAIL`, `RESCHEDULED`

### EventType (NOUVEAU)
- `CANDIDATURE`, `ENTRETIEN`, `RELANCE`, `APPEL`, `REUNION`, `DEADLINE`, `AUTRE`

### NotificationType (NOUVEAU)
- `EMAIL`, `PUSH`, `SMS`, `IN_APP`

### EntityType (NOUVEAU)
- `CANDIDATURE`, `ENTRETIEN`, `RELANCE`, `APPEL`, `CONTACT`, `ENTREPRISE`, `DOCUMENT`, `EVENEMENT`

---

## 🔍 Indexes et performances

### Indexes principaux
- **User** : email, createdAt, isActive
- **Application** : userId, companyId, status, applicationDate, createdAt
- **Company** : name, industry, location
- **Contact** : userId, companyId, email, lastContactDate
- **FollowUp** : userId, applicationId, scheduledDate, status
- **Call** : userId, applicationId, callDate, status
- **Interview** : userId, applicationId, scheduledAt, status
- **Event** : userId, startDate, type
- **ApplicationStatusHistory** : applicationId, changedAt, changedBy
- **Notification** : userId, isRead, createdAt
- **SyncQueue** : userId, isSynced, createdAt

### Indexes sur les tables de jonction
- **ContactCompany** : contactId, companyId
- **ContactApplication** : contactId, applicationId
- **FollowUpContact** : followUpId, contactId
- **InterviewContact** : interviewId, contactId
- **ContactEvent** : contactId, eventId

---

## 📈 Nouveautés

### Fonctionnalités ajoutées

1. **Historique des statuts** : Suivi complet des changements de statut des candidatures
2. **Système de notifications** : Multi-canaux avec métadonnées
3. **Calendrier intégré** : Événements liés à tous les modules via relations polymorphes
4. **Synchronisation mobile** : Queue pour la synchro offline
5. **Relations many-to-many** : Contacts peuvent être liés à plusieurs entreprises et candidatures

### Améliorations des relations

1. **Contacts multi-entreprises** : Un contact peut travailler pour plusieurs entreprises
2. **Contacts multi-candidatures** : Un contact peut intervenir sur plusieurs candidatures
3. **Relances multi-contacts** : Une relance peut impliquer plusieurs contacts
4. **Entretiens multi-contacts** : Un entretien peut comporter plusieurs contacts
5. **Événements polymorphes** : Un événement peut être lié à n'importe quel module

### Performance et scalabilité

1. **Indexes optimisés** : Sur toutes les colonnes de recherche
2. **Contraintes d'intégrité** : Clés étrangères et uniques
3. **Cascades de suppression** : Cohérentes et sécurisées
4. **Normalisation** : Évite la redondance des données

---

## 📋 Migration

### Commande pour appliquer les changements
```bash
cd backend
npx prisma migrate dev --name add_missing_models_and_relations
```

### Rollback possible
Les sauvegardes des anciens schémas sont disponibles dans :
- `backend/prisma/backup/schema.prisma.backup.[timestamp]`
- `backend/prisma/backup/migrations.backup.[timestamp]/`

---

**Dernière mise à jour** : $(date +%Y-%m-%d)
**Version** : 4.1 - Structure de base de données étendue
**Équipe** : JobbingTrack Development Team
