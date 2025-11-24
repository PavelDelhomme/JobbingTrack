# 🔗 Liaisons Inter-Modèles

**Retour** : [Index Documentation BDD](README.md)

> Documentation complète de toutes les relations entre modèles (1:N et M:N).

---

## Relations 1:N (One-to-Many) - Déjà Implémentées

### User → Autres Modèles
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

### Company → Autres Modèles
- `Company` → `Application[]` (via `companyId`)
- `Company` → `FollowUp[]` (via `companyId`)
- `Company` → `Call[]` (via `companyId`, optionnel, onDelete: SetNull)
- `Company` → `Interview[]` (via `companyId`)

### Application → Autres Modèles
- `Application` → `FollowUp[]` (via `applicationId`, onDelete: Cascade)
- `Application` → `Call[]` (via `applicationId`, optionnel, onDelete: SetNull)
- `Application` → `Interview[]` (via `applicationId`, onDelete: Cascade)
- `Application` → `Event[]` (via `applicationId`, optionnel, onDelete: Cascade)
- `Application` → `Document[]` (via `applicationId`, optionnel, onDelete: SetNull)
- `Application` → `ApplicationStatusHistory[]` (via `applicationId`, onDelete: Cascade)

### FollowUp → Autres Modèles
- `FollowUp` → `Call[]` (via `followUpId`, optionnel, onDelete: SetNull)
- `FollowUp` → `Event[]` (via `followUpId`, optionnel, onDelete: Cascade)

### Interview → Autres Modèles
- `Interview` → `Event[]` (via `interviewId`, optionnel, onDelete: Cascade)

### Call → Autres Modèles
- `Call` → `Event[]` (via `callId`, optionnel, onDelete: Cascade)

### Contact → Autres Modèles
- `Contact` → `Call[]` (via `contactId`, optionnel, onDelete: SetNull)

---

## Relations M:N (Many-to-Many) - Déjà Implémentées

### Via Tables de Jonction

#### 1. Contact ↔ Company (via `ContactCompany`)
- `Contact` → `ContactCompany[]` → `Company`
- Champs : `contactId`, `companyId`
- Contrainte : `@@unique([contactId, companyId])`

#### 2. Contact ↔ Application (via `ContactApplication`)
- `Contact` → `ContactApplication[]` → `Application`
- Champs : `contactId`, `applicationId`
- Contrainte : `@@unique([contactId, applicationId])`

#### 3. FollowUp ↔ Contact (via `FollowUpContact`)
- `FollowUp` → `FollowUpContact[]` → `Contact`
- Champs : `followUpId`, `contactId`
- Contrainte : `@@unique([followUpId, contactId])`

#### 4. Interview ↔ Contact (via `InterviewContact`)
- `Interview` → `InterviewContact[]` → `Contact`
- Champs : `interviewId`, `contactId`
- Contrainte : `@@unique([interviewId, contactId])`

---

## Relations Optionnelles (Personnalisables)

### Platform → Application
- `Platform` → `Application[]` (via `platformId`, optionnel)

### FollowUpType → FollowUp
- `FollowUpType` → `FollowUp[]` (via `followUpTypeId`, optionnel)

### FollowUpMethod → FollowUp
- `FollowUpMethod` → `FollowUp[]` (via `followUpMethodId`, optionnel)

### InterviewType → Interview
- `InterviewType` → `Interview[]` (via `interviewTypeId`, optionnel)

### InterviewStyle → Interview
- `InterviewStyle` → `Interview[]` (via `interviewStyleId`, optionnel)

### EventType → Event
- `EventType` → `Event[]` (via `eventTypeId`, optionnel)

### CallType → Call
- `CallType` → `Call[]` (via `callTypeId`, optionnel)

---

**Retour** : [Index Documentation BDD](README.md)

