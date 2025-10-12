# 📞 Call Service

Service de gestion des appels téléphoniques pour JobbingTrack.

## Description

Le Call Service gère tous les appels téléphoniques liés aux candidatures, entreprises et contacts. Il permet de suivre l'historique des appels, planifier de nouveaux appels et enregistrer les résultats.

## Port

**3008**

## Fonctionnalités

- 📞 Gestion des appels entrants et sortants
- 📅 Planification des appels
- 📝 Enregistrement des notes d'appel
- 📊 Suivi des résultats et actions à entreprendre
- 🔗 Liaison avec les candidatures, entreprises et contacts

## Types d'appels

- **OUTBOUND** : Appel sortant
- **INBOUND** : Appel entrant
- **FOLLOWUP** : Relance
- **INQUIRY** : Demande d'information
- **SCHEDULED** : Rendez-vous téléphonique
- **COLD_CALL** : Appel à froid

## Statuts d'appels

- **PLANNED** : Planifié
- **COMPLETED** : Terminé
- **MISSED** : Manqué
- **CANCELLED** : Annulé
- **NO_ANSWER** : Pas de réponse
- **BUSY** : Occupé
- **LEFT_MESSAGE** : Message laissé

## Endpoints

### Health Check
```
GET /health
```

### Routes API (à implémenter)
```
POST   /api/v1/call         - Créer un appel
GET    /api/v1/call         - Liste des appels
GET    /api/v1/call/:id     - Détails d'un appel
PUT    /api/v1/call/:id     - Modifier un appel
DELETE /api/v1/call/:id     - Supprimer un appel
```

## Démarrage

```bash
# Via Docker Compose
docker compose up call-service

# En développement
cd call-service
npm install
npm run dev
```

## Variables d'environnement

- `NODE_ENV` : Environnement (development/production)
- `PORT` : Port du service (3008)
- `DATABASE_URL` : URL de connexion PostgreSQL
- `JWT_SECRET` : Clé secrète JWT
- `AUTH_SERVICE_URL` : URL du service d'authentification

## Schéma de données

Le service utilise un modèle `Call` avec les champs suivants :

- Informations de base (userId, applicationId, companyId, contactId)
- Détails de l'appel (scheduledAt, calledAt, duration)
- Type et statut
- Contenu (subject, notes, outcome, nextAction)
- Métadonnées (timestamps, soft delete, sync)

