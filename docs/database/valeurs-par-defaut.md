# 📋 Valeurs par Défaut des Anciens Enums

**Retour** : [Index Documentation BDD](README.md)

> Liste complète des statuts système à créer lors de la migration des enums vers tables.

---

## ApplicationStatus (12 valeurs par défaut)

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

## InterviewStatus (5 valeurs par défaut)

| Code | Nom | Description | Order | Color | Icon |
|------|-----|-------------|-------|-------|------|
| `SCHEDULED` | "Programmé" | Entretien programmé | 1 | "#3B82F6" | "Calendar" |
| `COMPLETED` | "Terminé" | Entretien passé | 2 | "#10B981" | "CheckCircle" |
| `FEEDBACK_PENDING` | "En attente de retour" | En attente de retour | 3 | "#F59E0B" | "Clock" |
| `CANCELLED` | "Annulé" | Entretien annulé | 4 | "#EF4444" | "XCircle" |
| `RESCHEDULED` | "Reporté" | Entretien reporté | 5 | "#8B5CF6" | "CalendarClock" |

**Tous avec** : `userId = null`, `isPredefined = true`, `isActive = true`

---

## FollowUpStatus (5 valeurs par défaut)

| Code | Nom | Description | Order | Color | Icon |
|------|-----|-------------|-------|-------|------|
| `PENDING` | "En attente" | Relance en attente | 1 | "#3B82F6" | "Clock" |
| `POSITIVE_RESPONSE` | "Réponse positive" | Retour positif reçu | 2 | "#10B981" | "CheckCircle" |
| `NEGATIVE_RESPONSE` | "Réponse négative" | Retour négatif reçu | 3 | "#EF4444" | "XCircle" |
| `NO_RESPONSE` | "Aucun retour" | Aucun retour reçu | 4 | "#F59E0B" | "AlertCircle" |
| `PLANNED` | "Prévue" | Relance prévisionnelle | 5 | "#8B5CF6" | "Calendar" |

**Tous avec** : `userId = null`, `isPredefined = true`, `isActive = true`

---

## Script de Création

Voir [Scripts de Migration](../STRUCTURE_BDD_ACTIONS.md#scripts-de-migration-à-créer) pour les scripts à créer.

---

**Retour** : [Index Documentation BDD](README.md)

