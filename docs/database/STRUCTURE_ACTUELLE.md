# 📊 Structure Actuelle de la Base de Données

> **Fichier de référence** pour la structure actuelle de la base de données JobbingTrack.

**📄 Actions et modifications** : Voir [ACTIONS_ET_MODIFICATIONS.md](ACTIONS_ET_MODIFICATIONS.md)  
**📚 Index documentation** : Voir [README.md](README.md)

---

## 📊 Résumé

- **Modèles principaux** : 12
- **Tables de jonction** : 4
- **Listes personnalisables** : 7
- **Modèles Email** : 2
- **Modèles Préférences** : 1
- **Modèles Monitoring** : 10
- **Modèles Sécurité** : 6
- **Total modèles** : **42 modèles Prisma**
- **Enums** : **18 enums**
- **Relations 1:N** : 20+
- **Relations M:N** : 4 (via tables de jonction)

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

---

### InterviewStatus (5 valeurs par défaut)

| Code | Nom | Description | Order | Color | Icon |
|------|-----|-------------|-------|-------|------|
| `SCHEDULED` | "Programmé" | Entretien programmé | 1 | "#3B82F6" | "Calendar" |
| `COMPLETED` | "Terminé" | Entretien passé | 2 | "#10B981" | "CheckCircle" |
| `FEEDBACK_PENDING` | "En attente de retour" | En attente de retour | 3 | "#F59E0B" | "Clock" |
| `CANCELLED` | "Annulé" | Entretien annulé | 4 | "#EF4444" | "XCircle" |
| `RESCHEDULED` | "Reporté" | Entretien reporté | 5 | "#8B5CF6" | "CalendarClock" |

**Tous avec** : `userId = null`, `isPredefined = true`, `isActive = true`

---

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

## 🔄 Système de Synchronisation

### Principe

Le système de synchronisation permet de :
- Détecter les modifications locales vs serveur
- Résoudre les conflits lors de synchronisation
- Optimiser les transferts de données (seulement les modifications)
- Assurer la cohérence des données entre client et serveur

### Champs de Synchronisation

**À ajouter à TOUS les modèles applicatifs** :
- `syncHash` : String? - Hash calculé pour détection de modifications (SHA-256)
- `entityHash` : String? - Hash de l'entité complète pour comparaison
- `lastSyncAt` : DateTime? - Timestamp de dernière synchronisation réussie

### Modèles Concernés

**Modèles applicatifs principaux** :
- `Company`, `Application`, `Contact`, `FollowUp`, `Call`, `Interview`, `Event`, `Document`

**Listes personnalisables** (uniquement pour entrées utilisateur, pas système) :
- `Platform`, `FollowUpType`, `InterviewType`, `CallType`, `EventType`

**Note** : Les entrées système (`userId = null`, `isPredefined = true`) n'ont PAS besoin de synchronisation.

---

## 📚 Modèles Principaux

1. **User** (Utilisateur)
2. **Company** (Entreprise)
3. **Application** (Candidature)
4. **Contact**
5. **FollowUp** (Relance)
6. **Call** (Appel)
7. **Interview** (Entretien)
8. **Event** (Événement Calendrier)
9. **Document**
10. **Notification**
11. **ApplicationStatusHistory** (Historique des Statuts)
12. **SyncQueue** (Queue de Synchronisation Offline)

---

## 🔗 Tables de Jonction Many-to-Many (4 modèles)

1. **ContactCompany** - Contact ↔ Company
2. **ContactApplication** - Contact ↔ Application
3. **FollowUpContact** - FollowUp ↔ Contact
4. **InterviewContact** - Interview ↔ Contact

---

## 🎨 Listes Personnalisables (7 modèles)

1. **Platform** - Plateformes de candidature
2. **FollowUpType** - Types de relance
3. **InterviewType** - Types d'entretien
4. **CallType** - Types d'appel
5. **EventType** - Types d'événement
6. **PlatformType** - Types de plateforme (à créer)

---

**Dernière mise à jour** : 2025-01-27

