# 📅 Event Service

Service de gestion des événements globaux pour JobbingTrack.

## Description

L'Event Service centralise tous les événements du système. Il permet de suivre l'historique complet des actions effectuées sur les candidatures, entretiens, appels, contacts, etc.

## Port

**3011**

## Fonctionnalités

- 📝 Enregistrement de tous les événements système
- 🔍 Recherche et filtrage des événements
- 📊 Analyse de l'activité utilisateur
- 🔗 Liaison avec toutes les entités du système
- 📈 Timeline complète des actions

## Types d'événements

### Candidatures
- `APPLICATION_CREATED` : Candidature créée
- `APPLICATION_SENT` : Candidature envoyée
- `APPLICATION_UPDATED` : Candidature mise à jour
- `APPLICATION_REJECTED` : Candidature rejetée
- `APPLICATION_ACCEPTED` : Candidature acceptée

### Entretiens
- `INTERVIEW_SCHEDULED` : Entretien planifié
- `INTERVIEW_COMPLETED` : Entretien terminé
- `INTERVIEW_CANCELLED` : Entretien annulé

### Relances et appels
- `FOLLOWUP_SENT` : Relance envoyée
- `FOLLOWUP_RESPONDED` : Relance avec réponse
- `CALL_MADE` : Appel effectué
- `CALL_RECEIVED` : Appel reçu

### Entités
- `COMPANY_ADDED` : Entreprise ajoutée
- `CONTACT_ADDED` : Contact ajouté
- `REMINDER_CREATED` : Rappel créé
- `DOCUMENT_UPLOADED` : Document téléchargé

### Profil
- `CV_UPDATED` : CV mis à jour
- `PROFILE_UPDATED` : Profil mis à jour

## Endpoints

### Health Check
```
GET /health
```

### Routes API (à implémenter)
```
POST   /api/v1/event         - Créer un événement
GET    /api/v1/event         - Liste des événements
GET    /api/v1/event/:id     - Détails d'un événement
GET    /api/v1/event/timeline - Timeline des événements
GET    /api/v1/event/stats   - Statistiques des événements
```

## Démarrage

```bash
# Via Docker Compose
docker compose up event-service

# En développement
cd event-service
npm install
npm run dev
```

## Variables d'environnement

- `NODE_ENV` : Environnement (development/production)
- `PORT` : Port du service (3011)
- `DATABASE_URL` : URL de connexion PostgreSQL
- `REDIS_URL` : URL de connexion Redis
- `JWT_SECRET` : Clé secrète JWT
- `AUTH_SERVICE_URL` : URL du service d'authentification

## Schéma de données

Le service utilise un modèle `Event` avec les champs suivants :

- Informations de base (userId, type, title, description)
- Date d'occurrence (occurredAt)
- Métadonnées JSON (metadata)
- Relations optionnelles (applicationId, companyId, contactId, interviewId, callId, followUpId)
- Métadonnées (timestamps, soft delete, sync)

## Utilisation

Les événements sont automatiquement créés par les autres services lors d'actions importantes. Ce service sert de source de vérité pour l'historique complet de l'application.

## Exemples

### Créer un événement
```json
{
  "userId": "user_123",
  "type": "APPLICATION_SENT",
  "title": "Candidature envoyée chez Google",
  "description": "Candidature pour le poste de Software Engineer",
  "applicationId": "app_456",
  "companyId": "company_789",
  "metadata": {
    "position": "Software Engineer",
    "platform": "LinkedIn"
  }
}
```

### Récupérer la timeline
```
GET /api/v1/event/timeline?userId=user_123&limit=50
```

