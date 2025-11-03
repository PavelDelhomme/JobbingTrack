# 📊 Schéma Complet de la Base de Données JobbingTrack

## 🎯 Vue d'Ensemble

**Architecture** : Base de données unique PostgreSQL partagée entre tous les services  
**ORM** : Prisma  
**Schéma** : `backend/shared/prisma/schema.prisma`

---

## 📦 Modèles Principaux (12)

### 1. **User** (Utilisateur)
**Service responsable** : `auth-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique (cuid) |
| email | String | Email unique |
| password | String | Mot de passe hashé |
| firstName | String | Prénom |
| lastName | String | Nom |
| phone | String? | Téléphone |
| role | UserRole | Rôle (USER, ADMIN, SUPER_ADMIN, TESTER) |
| isActive | Boolean | Compte actif |

**Relations** :
- → `Application[]` (one-to-many)
- → `Company[]` (one-to-many)
- → `Contact[]` (one-to-many)
- → `FollowUp[]` (one-to-many)
- → `Call[]` (one-to-many)
- → `Interview[]` (one-to-many)
- → `Event[]` (one-to-many)
- → `Notification[]` (one-to-many)
- → `Document[]` (one-to-many)
- → `SyncQueue[]` (one-to-many)

---

### 2. **Company** (Entreprise)
**Service responsable** : `company-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique |
| userId | String | FK vers User |
| name | String | Nom de l'entreprise |
| website | String? | Site web |
| industry | String? | Secteur d'activité |
| size | CompanySize? | Taille (STARTUP, SMALL, MEDIUM, LARGE, ENTERPRISE) |
| location | String? | Localisation |
| logoUrl | String? | URL du logo |

**Relations** :
- ← `User` (many-to-one)
- → `Application[]` (one-to-many)
- → `ContactCompany[]` (many-to-many avec Contact)
- → `FollowUp[]` (one-to-many)
- → `Call[]` (one-to-many)
- → `Interview[]` (one-to-many)

---

### 3. **Application** (Candidature)
**Service responsable** : `application-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique |
| userId | String | FK vers User |
| companyId | String | FK vers Company |
| platformId | String? | FK vers Platform |
| position | String | Intitulé du poste |
| description | String? | Description du poste |
| jobUrl | String? | URL de l'offre |
| contractType | ContractType | CDI, CDD, ALTERNANCE, STAGE, FREELANCE, etc. |
| workMode | WorkMode? | ON_SITE, REMOTE, HYBRID |
| applicationType | ApplicationType | OFFRE, SPONTANEE |
| status | ApplicationStatus | CANDIDATE_PENDING, NO_RESPONSE, FIRST_INTERVIEW_PENDING, etc. |
| applicationDate | DateTime | Date de candidature |
| salaryMin | Int? | Salaire min (€/an) |
| salaryMax | Int? | Salaire max (€/an) |
| archived | Boolean | Archivé |

**Relations** :
- ← `User` (many-to-one)
- ← `Company` (many-to-one)
- ← `Platform` (many-to-one)
- → `ContactApplication[]` (many-to-many avec Contact)
- → `FollowUp[]` (one-to-many)
- → `Call[]` (one-to-many)
- → `Interview[]` (one-to-many)
- → `Event[]` (one-to-many)
- → `Document[]` (one-to-many)
- → `ApplicationStatusHistory[]` (one-to-many)

**Status disponibles** (ApplicationStatus) :
- `CANDIDATE_PENDING` - Candidaté et en attente
- `NO_RESPONSE` - Aucune réponse
- `NO_RESPONSE_AFTER_FIRST_FOLLOWUP` - Aucune réponse après 1 relance
- `NO_RESPONSE_AFTER_SECOND_FOLLOWUP` - Aucune réponse après 2 relances
- `FIRST_INTERVIEW_PENDING` - 1er entretien en attente
- `OTHER_INTERVIEW_PENDING` - Autre entretien en attente
- `TECHNICAL_TEST_PENDING` - Test technique en cours
- `OFFER_RECEIVED` - Offre reçue
- `ACCEPTED_AFTER_INTERVIEW` - Retenue après entretien
- `REJECTED_WITHOUT_INTERVIEW` - Non retenue sans entretien
- `REJECTED_AFTER_INTERVIEW` - Non retenue après entretien
- `WITHDRAWN` - Candidature retirée

---

### 4. **Contact**
**Service responsable** : `contact-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique |
| userId | String | FK vers User |
| firstName | String | Prénom |
| lastName | String | Nom |
| position | String? | Fonction |
| email | String? | Email |
| phone | String? | Téléphone |
| linkedinUrl | String? | Profil LinkedIn |
| notes | String? | Notes |
| isArchived | Boolean | Archivé |

**Relations** :
- ← `User` (many-to-one)
- → `ContactCompany[]` (many-to-many avec Company)
- → `ContactApplication[]` (many-to-many avec Application)
- → `FollowUpContact[]` (many-to-many avec FollowUp)
- → `InterviewContact[]` (many-to-many avec Interview)
- → `Call[]` (one-to-many)

---

### 5. **FollowUp** (Relance)
**Service responsable** : `followup-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique |
| userId | String | FK vers User |
| applicationId | String | FK vers Application |
| companyId | String | FK vers Company |
| followUpTypeId | String? | FK vers FollowUpType (personnalisable) |
| followUpMethodId | String? | FK vers FollowUpMethod (personnalisable) |
| followUpDate | DateTime | Date de la relance |
| status | FollowUpStatus | PENDING, POSITIVE_RESPONSE, NEGATIVE_RESPONSE, NO_RESPONSE, PLANNED |
| response | String? | Réponse reçue |
| notes | String? | Notes |

**Relations** :
- ← `User` (many-to-one)
- ← `Application` (many-to-one)
- ← `Company` (many-to-one)
- ← `FollowUpType` (many-to-one)
- ← `FollowUpMethod` (many-to-one)
- → `FollowUpContact[]` (many-to-many avec Contact)
- → `Call[]` (one-to-many)
- → `Event[]` (one-to-many)

**Status disponibles** (FollowUpStatus) :
- `PENDING` - Relance en attente
- `POSITIVE_RESPONSE` - Retour positif reçu
- `NEGATIVE_RESPONSE` - Retour négatif reçu
- `NO_RESPONSE` - Aucun retour
- `PLANNED` - Relance prévisionnelle

---

### 6. **Call** (Appel)
**Service responsable** : `call-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique |
| userId | String | FK vers User |
| applicationId | String? | FK vers Application (optionnel) |
| companyId | String? | FK vers Company (optionnel) |
| followUpId | String? | FK vers FollowUp (optionnel) |
| contactId | String? | FK vers Contact (optionnel) |
| callTypeId | String? | FK vers CallType (personnalisable) |
| callDate | DateTime | Date et heure de l'appel |
| duration | Int? | Durée en minutes |
| subject | String | Objet de l'appel |
| notes | String? | Notes |
| status | CallStatus | SCHEDULED, COMPLETED, MISSED, CANCELLED |

**Relations** :
- ← `User` (many-to-one)
- ← `Application` (many-to-one, optionnel)
- ← `Company` (many-to-one, optionnel)
- ← `FollowUp` (many-to-one, optionnel)
- ← `Contact` (many-to-one, optionnel)
- ← `CallType` (many-to-one)
- → `Event[]` (one-to-many)

---

### 7. **Interview** (Entretien)
**Service responsable** : `interview-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique |
| userId | String | FK vers User |
| applicationId | String | FK vers Application |
| companyId | String | FK vers Company |
| interviewTypeId | String? | FK vers InterviewType (personnalisable) |
| interviewStyleId | String? | FK vers InterviewStyle (personnalisable) |
| interviewDate | DateTime | Date et heure |
| estimatedDuration | Int? | Durée estimée (minutes) |
| location | String? | Lieu physique |
| videoLink | String? | Lien visio |
| status | InterviewStatus | SCHEDULED, COMPLETED, FEEDBACK_PENDING, CANCELLED, RESCHEDULED |
| feedbackExpectedFrom | DateTime? | Début plage de retour |
| feedbackExpectedTo | DateTime? | Fin plage de retour |
| feedbackReceived | Boolean | Retour reçu |
| outcome | InterviewOutcome? | POSITIVE, NEGATIVE, NEUTRAL, PENDING |
| notes | String? | Notes |

**Relations** :
- ← `User` (many-to-one)
- ← `Application` (many-to-one)
- ← `Company` (many-to-one)
- ← `InterviewType` (many-to-one)
- ← `InterviewStyle` (many-to-one)
- → `InterviewContact[]` (many-to-many avec Contact)
- → `Event[]` (one-to-many)

---

### 8. **Event** (Événement Calendrier)
**Service responsable** : `event-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique |
| userId | String | FK vers User |
| eventTypeId | String? | FK vers EventType (personnalisable) |
| title | String | Titre |
| description | String? | Description |
| startDate | DateTime | Date de début |
| endDate | DateTime? | Date de fin |
| allDay | Boolean | Toute la journée |
| **Lien polymorphe** | | **Un seul lien actif** |
| applicationId | String? | FK vers Application |
| interviewId | String? | FK vers Interview |
| followUpId | String? | FK vers FollowUp |
| callId | String? | FK vers Call |
| reminderEnabled | Boolean | Rappel activé |
| reminderMinutes | Int? | Minutes avant |
| color | String? | Couleur (#hex) |

**Relations** :
- ← `User` (many-to-one)
- ← `EventType` (many-to-one)
- ← `Application` (many-to-one, optionnel)
- ← `Interview` (many-to-one, optionnel)
- ← `FollowUp` (many-to-one, optionnel)
- ← `Call` (many-to-one, optionnel)

---

### 9. **Document**
**Service responsable** : `profile-service` ou `dashboard-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique |
| userId | String | FK vers User |
| applicationId | String? | FK vers Application (optionnel) |
| name | String | Nom du fichier |
| documentType | DocumentType | CV, COVER_LETTER, PORTFOLIO, CERTIFICATE, DIPLOMA, etc. |
| fileUrl | String | URL du fichier |
| fileSize | Int | Taille en bytes |
| mimeType | String | Type MIME |

---

### 10. **Notification**
**Service responsable** : `notification-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique |
| userId | String | FK vers User |
| title | String | Titre |
| message | String | Message |
| type | NotificationType | REMINDER, APPLICATION_UPDATE, INTERVIEW_SCHEDULED, etc. |
| read | Boolean | Lue |
| readAt | DateTime? | Date de lecture |
| entityType | String? | Type d'entité liée |
| entityId | String? | ID de l'entité |
| data | Json? | Données supplémentaires |

---

### 11. **ApplicationStatusHistory**
**Service responsable** : `application-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique |
| applicationId | String | FK vers Application |
| previousStatus | ApplicationStatus | Ancien statut |
| newStatus | ApplicationStatus | Nouveau statut |
| comment | String? | Commentaire |
| changedAt | DateTime | Date du changement |

---

### 12. **SyncQueue** (Synchronisation Offline)
**Service responsable** : `workflow-service`

| Champ | Type | Description |
|-------|------|-------------|
| id | String | ID unique |
| userId | String | FK vers User |
| action | SyncAction | CREATE, UPDATE, DELETE |
| entity | String | Nom de l'entité |
| entityId | String? | ID de l'entité |
| payload | Json | Données |
| synced | Boolean | Synchronisé |
| attempts | Int | Nombre de tentatives |
| lastAttempt | DateTime? | Dernière tentative |
| error | String? | Erreur |

---

## 🎨 Listes Personnalisables (7)

Les utilisateurs peuvent **ajouter leurs propres valeurs** en plus des valeurs prédéfinies.

### 1. **Platform** (Plateforme de candidature)
**Valeurs prédéfinies** : LinkedIn, Indeed, Welcome to the Jungle, Pôle Emploi, Apec, HelloWork, Glassdoor, Monster, LesJeudis, Cadremploi, Site Entreprise, Cooptation, Autre

| Champ | Description |
|-------|-------------|
| id | ID unique |
| userId | null = prédéfini, String = personnalisé par user |
| name | Nom |
| icon | Icône emoji |
| url | URL de la plateforme |
| isPredefined | true = système, false = utilisateur |

---

### 2. **FollowUpType** (Type de relance)
**Valeurs prédéfinies** : Première relance, Deuxième relance, Relance après entretien, Relance urgente, Relance de courtoisie, Autre

---

### 3. **FollowUpMethod** (Moyen de relance)
**Valeurs prédéfinies** : Email, Téléphone, LinkedIn, SMS, Courrier, En personne, Autre

---

### 4. **InterviewType** (Type d'entretien)
**Valeurs prédéfinies** : Entretien RH, Entretien Technique, Entretien Manager, Entretien Équipe, Entretien Dirigeant, Test Technique, Case Study, Assessment Center, Autre

---

### 5. **InterviewStyle** (Style d'entretien)
**Valeurs prédéfinies** : Présentiel, Visioconférence, Téléphone, Hybride

---

### 6. **EventType** (Type d'événement)
**Valeurs prédéfinies** : Entretien, Relance, Appel, Deadline, Salon emploi, Networking, Formation, Autre

| Champ | Description |
|-------|-------------|
| color | Couleur hexadécimale pour le calendrier |

---

### 7. **CallType** (Type d'appel)
**Valeurs prédéfinies** : Appel sortant, Appel entrant, Appel manqué, Rappel programmé, Autre

---

## 🔗 Tables de Jonction (Many-to-Many)

### 1. **ContactCompany**
Lie un Contact à plusieurs Entreprises (et vice-versa)

### 2. **ContactApplication**
Lie un Contact à plusieurs Candidatures (et vice-versa)

### 3. **FollowUpContact**
Lie une Relance à plusieurs Contacts (et vice-versa)

### 4. **InterviewContact**
Lie un Entretien à plusieurs Contacts (et vice-versa)

---

## 📊 Diagramme des Relations

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER                                    │
│  (auth-service)                                                  │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ├──► Company (1:N) ────► ContactCompany (M:N) ───► Contact
       │      │                                              │
       │      └──► Application (1:N)                        │
       │             │                                        │
       │             ├──► ContactApplication (M:N) ──────────┘
       │             ├──► FollowUp (1:N)
       │             │      ├──► FollowUpContact (M:N) ──► Contact
       │             │      ├──► Call (1:N)
       │             │      └──► Event (1:N)
       │             ├──► Interview (1:N)
       │             │      ├──► InterviewContact (M:N) ──► Contact
       │             │      └──► Event (1:N)
       │             ├──► Call (1:N) ──► Event (1:N)
       │             ├──► Event (1:N)
       │             ├──► Document (1:N)
       │             └──► ApplicationStatusHistory (1:N)
       │
       ├──► Contact (1:N)
       ├──► FollowUp (1:N)
       ├──► Call (1:N)
       ├──► Interview (1:N)
       ├──► Event (1:N)
       ├──► Notification (1:N)
       ├──► Document (1:N)
       └──► SyncQueue (1:N)

Listes Personnalisables (accessibles via FK) :
  - Platform
  - FollowUpType
  - FollowUpMethod
  - InterviewType
  - InterviewStyle
  - EventType
  - CallType
```

---

## 🎯 Cas d'Usage Principaux

### 1. Créer une Candidature Complète
```javascript
// 1. Créer la candidature
const application = await prisma.application.create({
  data: {
    userId: 'user_123',
    companyId: 'company_456',
    platformId: 'platform_linkedin',
    position: 'Développeur Full Stack',
    contractType: 'CDI',
    workMode: 'HYBRID',
    applicationType: 'OFFRE',
    status: 'CANDIDATE_PENDING',
    salaryMin: 45000,
    salaryMax: 55000
  }
});

// 2. Lier un contact
await prisma.contactApplication.create({
  data: {
    contactId: 'contact_789',
    applicationId: application.id
  }
});

// 3. Créer un événement calendrier
await prisma.event.create({
  data: {
    userId: 'user_123',
    title: 'Candidature envoyée',
    applicationId: application.id,
    startDate: new Date(),
    reminderEnabled: true,
    reminderMinutes: 2880 // 2 jours
  }
});
```

### 2. Programmer un Entretien
```javascript
const interview = await prisma.interview.create({
  data: {
    userId: 'user_123',
    applicationId: 'app_xyz',
    companyId: 'company_456',
    interviewTypeId: 'type_rh',
    interviewStyleId: 'style_visio',
    interviewDate: new Date('2025-11-05T14:00:00'),
    estimatedDuration: 60,
    videoLink: 'https://meet.google.com/...',
    status: 'SCHEDULED',
    // Lier des contacts
    contacts: {
      create: [
        { contactId: 'contact_789' },
        { contactId: 'contact_abc' }
      ]
    },
    // Créer automatiquement l'événement
    events: {
      create: {
        userId: 'user_123',
        title: 'Entretien RH - Google',
        startDate: new Date('2025-11-05T14:00:00'),
        endDate: new Date('2025-11-05T15:00:00'),
        reminderEnabled: true,
        reminderMinutes: 1440 // 1 jour avant
      }
    }
  }
});
```

### 3. Récupérer une Candidature avec TOUT son Contexte
```javascript
const fullApplication = await prisma.application.findUnique({
  where: { id: 'app_xyz' },
  include: {
    user: true,
    company: true,
    platform: true,
    contacts: {
      include: {
        contact: {
          include: {
            companies: {
              include: { company: true }
            }
          }
        }
      }
    },
    followUps: {
      include: {
        followUpType: true,
        followUpMethod: true,
        contacts: {
          include: { contact: true }
        }
      }
    },
    interviews: {
      include: {
        interviewType: true,
        interviewStyle: true,
        contacts: {
          include: { contact: true }
        }
      }
    },
    calls: {
      include: {
        contact: true,
        callType: true
      }
    },
    events: true,
    documents: true,
    statusHistory: {
      orderBy: { changedAt: 'desc' }
    }
  }
});
```

---

## 📝 Notes Importantes

### Soft Delete
Les modèles ont un champ `deletedAt` pour le soft delete (les données restent en DB mais sont masquées).

### Timestamps
Tous les modèles ont `createdAt` et `updatedAt` automatiques.

### Relations Polymorphes
`Event` peut pointer vers Application, Interview, FollowUp ou Call (un seul lien actif).

### Personnalisation
Les utilisateurs peuvent étendre les listes prédéfinies (Platform, InterviewType, etc.) avec leurs propres valeurs.

### Cohérence
Les Foreign Keys PostgreSQL garantissent la cohérence des données (pas de contact orphelin, etc.).

---

## 🚀 Migration

Voir `docs/DATABASE_MIGRATION_GUIDE.md` pour les étapes de migration depuis l'ancienne structure.
