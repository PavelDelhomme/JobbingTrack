# Analyse des différences - Structure Base de Données JobbingTrack

## Date d'analyse : $(date)

## Modèles existants dans le schéma actuel ✅

### 1. User
- ✅ Existe avec tous les champs principaux
- ✅ Relations avec applications, contacts, reminders, documents, templates, maintenances
- ❌ Champs manquants : authToken, refreshToken, tokenExpiresAt (mais resetToken existe)

### 2. Company (Entreprise)
- ✅ Existe avec champs principaux
- ✅ Relations avec applications, contacts
- ❌ Relations many-to-many avec contacts (ContactEntreprise manquante)

### 3. Application (Candidature)
- ✅ Existe avec tous les champs principaux
- ✅ Relations avec user, company, platform, interviews, followUps, documents, activities, calls
- ❌ Relations many-to-many avec contacts (ContactCandidature manquante)
- ❌ Historique des états (HistoriqueEtatCandidature manquant)

### 4. Contact
- ✅ Existe avec tous les champs principaux
- ✅ Relations avec user, company, followUps, activities, calls
- ❌ Relations many-to-many avec entreprises (ContactEntreprise manquante)
- ❌ Relations many-to-many avec candidatures (ContactCandidature manquante)
- ❌ Relations many-to-many avec relances (RelanceContact manquante)
- ❌ Relations many-to-many avec entretiens (EntretienContact manquante)

### 5. FollowUp (Relance)
- ✅ Existe avec tous les champs principaux
- ✅ Relations avec application, contact
- ❌ Relations many-to-many avec contacts (RelanceContact manquante)
- ❌ Relations avec entreprises (entrepriseId manquant)

### 6. Call (Appel)
- ✅ Existe (nouveau modèle)
- ✅ Relations avec application, contact
- ❌ Relations optionnelles avec entreprise, relance

### 7. Interview (Entretien)
- ✅ Existe avec tous les champs principaux
- ✅ Relations avec application
- ❌ Relations many-to-many avec contacts (EntretienContact manquante)
- ❌ Relations avec entreprises (entrepriseId manquant)

### 8. Document
- ✅ Existe avec tous les champs principaux
- ✅ Relations avec user, applications (via ApplicationDocument)

## Modèles manquants à ajouter ❌

### 1. HistoriqueEtatCandidature
**Champs requis :**
- id, candidatureId, ancienEtat, nouvelEtat, commentaire, dateChangement
**Relations :**
- candidature (many-to-one)

### 2. Notification
**Champs requis :**
- id, userId, titre, message, type, lue, entityType, entityId, data, createdAt
**Relations :**
- user (many-to-one)

### 3. Event (Evenement)
**Champs requis :**
- id, userId, titre, description, dateDebut, dateFin, touteLaJournee, typeEvenement, rappelActif, rappelAvant, couleur, timestamps
**Relations :**
- user (many-to-one)
- Relations polymorphes avec Candidature, Entretien, Relance, Appel

### 4. SyncQueue
**Champs requis :**
- id, userId, action, entity, entityId, payload, synced, attempts, lastAttempt, error, timestamps
**Relations :**
- user (many-to-one)

## Tables de jonction many-to-many manquantes

### 1. ContactEntreprise
**Champs :**
- contactId, entrepriseId
**Relations :**
- Permettre à un contact de travailler pour plusieurs entreprises

### 2. ContactCandidature
**Champs :**
- contactId, candidatureId
**Relations :**
- Permettre à un contact d'intervenir sur plusieurs candidatures

### 3. RelanceContact
**Champs :**
- relanceId, contactId
**Relations :**
- Permettre à une relance d'impliquer plusieurs contacts

### 4. EntretienContact
**Champs :**
- entretienId, contactId
**Relations :**
- Permettre à un entretien de comporter plusieurs contacts

## Relations à ajouter/modifier

### User
- ✅ Relations existantes : applications, contacts, reminders, documents, templates, maintenances
- ➕ À ajouter : relances (FollowUp), appels (Call), entretiens (Interview), evenements (Event), notifications (Notification)

### Application
- ✅ Relations existantes : user, company, platform, interviews, followUps, documents, activities, calls
- ➕ À ajouter : evenements (Event), historiqueEtats (HistoriqueEtatCandidature), contacts (many-to-many via ContactCandidature)

### Company
- ✅ Relations existantes : applications, contacts
- ➕ À ajouter : relances (FollowUp), appels (Call), entretiens (Interview), contacts (many-to-many via ContactEntreprise)

### Contact
- ✅ Relations existantes : user, company, followUps, activities, calls
- ➕ À ajouter : entreprises (many-to-many via ContactEntreprise), candidatures (many-to-many via ContactCandidature), relances (many-to-many via RelanceContact), entretiens (many-to-many via EntretienContact)

### FollowUp (Relance)
- ✅ Relations existantes : application, contact
- ➕ À ajouter : user, entreprise (Company), contacts (many-to-many via RelanceContact), evenements (Event), appels (Call)

### Call (Appel)
- ✅ Relations existantes : application, contact
- ➕ À ajouter : user, entreprise (Company), relance (FollowUp), evenements (Event)

### Interview (Entretien)
- ✅ Relations existantes : application
- ➕ À ajouter : user, entreprise (Company), contacts (many-to-many via EntretienContact), evenements (Event)

## Enums à ajouter/modifier

### ApplicationStatus (actuel)
- ✅ CANDIDATE_PENDING, NO_RESPONSE, NO_RESPONSE_AFTER_FIRST_FOLLOWUP, NO_RESPONSE_AFTER_SECOND_FOLLOWUP, FIRST_INTERVIEW_PENDING, OTHER_INTERVIEW_PENDING, ACCEPTED_AFTER_INTERVIEW, REJECTED_WITHOUT_INTERVIEW, REJECTED_AFTER_INTERVIEW

### ApplicationStatus (proposé)
- ✅ Compatible avec les statuts actuels

### Nouveaux enums requis

#### EventType (pour Event)
```prisma
enum EventType {
  CANDIDATURE
  ENTRETIEN
  RELANCE
  APPEL
  REUNION
  DEADLINE
  AUTRE
}
```

#### NotificationType (pour Notification)
```prisma
enum NotificationType {
  EMAIL
  PUSH
  SMS
  IN_APP
}
```

## Plan de migration

### Phase 1 : Ajout des modèles manquants
1. HistoriqueEtatCandidature
2. Notification
3. Event
4. SyncQueue

### Phase 2 : Ajout des tables de jonction many-to-many
1. ContactEntreprise
2. ContactCandidature
3. RelanceContact
4. EntretienContact

### Phase 3 : Mise à jour des relations existantes
1. Ajout des relations manquantes dans les modèles existants
2. Mise à jour des contraintes de clés étrangères

### Phase 4 : Migration des données
1. Migration des données existantes vers la nouvelle structure
2. Validation de l'intégrité des données

### Phase 5 : Tests et validation
1. Tests unitaires des nouvelles relations
2. Tests d'intégration
3. Validation des performances
