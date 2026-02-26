# Base de données – Choix de schéma appliqués

**Schéma de référence métier** : `backend/application-service/prisma/schema.prisma` (User, Company, Application, Contact, FollowUp, Call, Interview, Event, Notification, Document, Profile).

## Choix retenus

| Choix | Détail |
|-------|--------|
| **isArchived** | Partout : Boolean. `application-service`, `followup-service`, `interview-service`, `call-service` alignés. |
| **Tables \*Status + statusId** | Tables `ApplicationStatus`, `FollowUpStatus`, `InterviewStatus` avec champ `statusId` (String) et relation. |
| **isTestData, syncHash, entityHash, lastSyncAt** | Ajoutés de façon cohérente pour filtre « données test » et sync sur User, Contact, FollowUp, Call, Interview, Event, Document. |
| **Notification** | notification-service : NotificationType enum, entityType, entityId, data, readAt, userId, title, message, read, createdAt. |
| **Profile lié à User** | Modèle Profile (userId, bio, headline, avatarUrl, linkedinUrl, githubUrl, website, preferences) 1–1 avec User. |

## Après modification des schémas

```bash
make db-push-all
```
Puis relancer les tests API.

## Table Application – isArchived

Le schéma Prisma utilise `isArchived @map("archived")` ; en BDD la colonne est `archived`. Le script `make db-fix-isarchived` (exécuté dans `db-push-all`) ajoute la colonne générée si nécessaire.

## Interconnexion BDD

User → Application, Company, Contact, FollowUp, Call, Interview, Event, Notification.
Company → Application. Application → FollowUp, Call, Interview, Event.
Tables de jonction : ContactCompany, ContactApplication, FollowUpContact, InterviewContact.
Statuts via tables \*Status et champs statusId.

Voir aussi : `docs/database/relations.md`, `docs/database/structure-actuelle.md`.
