# Résumé des changements apportés au schéma Prisma

## Date des modifications : $(date)

## Nouveaux modèles ajoutés

### 1. ApplicationStatusHistory
- **Champs** : id, applicationId, previousStatus, newStatus, comment, changedAt, changedBy
- **Relations** : application (many-to-one), user (many-to-one optionnel)
- **Objectif** : Suivre l'historique des changements de statut des candidatures

### 2. Notification
- **Champs** : id, userId, title, message, type, isRead, readAt, entityType, entityId, data
- **Relations** : user (many-to-one)
- **Objectif** : Système de notifications multi-canaux

### 3. Event (Evenement)
- **Champs** : id, userId, title, description, startDate, endDate, isAllDay, type, isReminderActive, reminderMinutesBefore, color, applicationId, interviewId, followUpId, callId
- **Relations** : user (many-to-one), relations polymorphes vers Application, Interview, FollowUp, Call, relations many-to-many avec Contact
- **Objectif** : Gestion du calendrier avec liens polymorphes vers tous les modules

### 4. SyncQueue
- **Champs** : id, userId, action, entity, entityId, payload, isSynced, attempts, lastAttemptAt, error
- **Relations** : user (many-to-one)
- **Objectif** : Queue de synchronisation pour la fonctionnalité mobile/offline

## Tables de jonction many-to-many ajoutées

### 1. ContactCompany
- Relations many-to-many entre Contact et Company
- **Champs** : id, contactId, companyId

### 2. ContactApplication
- Relations many-to-many entre Contact et Application
- **Champs** : id, contactId, applicationId

### 3. FollowUpContact
- Relations many-to-many entre FollowUp et Contact
- **Champs** : id, followUpId, contactId

### 4. InterviewContact
- Relations many-to-many entre Interview et Contact
- **Champs** : id, interviewId, contactId

### 5. ContactEvent
- Relations many-to-many entre Contact et Event
- **Champs** : id, contactId, eventId

## Relations ajoutées dans les modèles existants

### User
- ➕ followUps : FollowUp[]
- ➕ calls : Call[]
- ➕ interviews : Interview[]
- ➕ events : Event[]
- ➕ notifications : Notification[]
- ➕ statusHistory : ApplicationStatusHistory[]
- ➕ syncQueues : SyncQueue[]

### Company
- ➕ followUps : FollowUp[]
- ➕ calls : Call[]
- ➕ interviews : Interview[]
- ➕ contactCompanies : ContactCompany[]

### Application
- ➕ events : Event[]
- ➕ statusHistory : ApplicationStatusHistory[]
- ➕ contactApplications : ContactApplication[]

### Contact
- ➕ interviews : Interview[]
- ➕ events : Event[]
- ➕ notifications : Notification[]
- ➕ contactCompanies : ContactCompany[]
- ➕ contactApplications : ContactApplication[]
- ➕ followUpContacts : FollowUpContact[]
- ➕ interviewContacts : InterviewContact[]
- ➕ contactEvents : ContactEvent[]

### FollowUp
- ➕ userId : String (nouveau champ)
- ➕ companyId : String (nouveau champ)
- ➕ events : Event[]
- ➕ followUpContacts : FollowUpContact[]

### Call
- ➕ userId : String (nouveau champ)
- ➕ companyId : String? (nouveau champ)
- ➕ followUpId : String? (nouveau champ)
- ➕ events : Event[]

### Interview
- ➕ userId : String (nouveau champ)
- ➕ companyId : String (nouveau champ)
- ➕ events : Event[]
- ➕ interviewContacts : InterviewContact[]

## Nouveaux enums ajoutés

### EventType
- CANDIDATURE, ENTRETIEN, RELANCE, APPEL, REUNION, DEADLINE, AUTRE

### NotificationType
- EMAIL, PUSH, SMS, IN_APP

### EntityType
- CANDIDATURE, ENTRETIEN, RELANCE, APPEL, CONTACT, ENTREPRISE, DOCUMENT, EVENEMENT

## Modifications apportées

1. **Relations manquantes** : Ajout de toutes les relations entre les modèles existants et les nouveaux modèles
2. **Clés étrangères** : Ajout des champs userId, companyId dans FollowUp, Call, Interview
3. **Relations polymorphes** : Implémentation dans Event avec contraintes d'unicité
4. **Relations many-to-many** : Tables de jonction pour tous les cas nécessaires
5. **Indexes** : Ajout d'indexes appropriés pour les performances

## Cohérence des relations

✅ **Vérifications effectuées :**
- Toutes les relations one-to-many ont des relations correspondantes
- Les relations many-to-many utilisent des tables de jonction appropriées
- Les relations polymorphes dans Event respectent les contraintes d'unicité
- Les cascades de suppression sont cohérentes
- Les indexes sont placés sur les bonnes colonnes

## Migration

La migration a été préparée mais n'a pas pu être exécutée en raison de problèmes d'authentification avec la base de données PostgreSQL. Le schéma est validé et prêt pour la migration.

## Impact sur le code

Les services backend existants devront être mis à jour pour :
1. Utiliser les nouvelles relations
2. Implémenter les nouvelles fonctionnalités (notifications, événements, historique)
3. Gérer les relations many-to-many
4. Supporter la synchronisation mobile

## Tests recommandés

1. Tests d'intégration pour les nouvelles relations
2. Tests de performance pour les nouvelles tables
3. Tests de migration des données
4. Tests des APIs avec les nouvelles fonctionnalités
