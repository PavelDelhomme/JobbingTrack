# 📧 FollowUp Service

Service de gestion des relances pour JobbingTrack.

## Description

Le FollowUp Service gère toutes les relances liées aux candidatures. Il permet de planifier des relances, suivre leur exécution et enregistrer les réponses reçues. Ce service peut également déclencher l'envoi automatique d'emails via le notification-service.

## Port

**3012**

## Fonctionnalités

- 📧 Planification de relances par email
- 📞 Relances téléphoniques
- 💼 Messages LinkedIn
- ✅ Suivi de l'état des relances (complétées/en attente)
- 📝 Enregistrement des réponses et résultats
- 🔔 Intégration avec le notification-service pour l'envoi automatique

## Types de relances

- **EMAIL** : Email de relance
- **PHONE** : Appel téléphonique
- **LINKEDIN** : Message LinkedIn
- **MESSAGE** : Message direct
- **MEETING** : Demande de rendez-vous
- **THANK_YOU** : Remerciement
- **STATUS_REQUEST** : Demande de statut

## Champs principaux

- **applicationId** : Candidature liée (obligatoire)
- **contactId** : Contact lié (optionnel)
- **scheduledDate** : Date prévue de relance
- **completed** : Statut (complété ou non)
- **completedDate** : Date de complétion
- **subject** : Sujet de la relance
- **message** : Contenu du message
- **response** : Réponse reçue
- **outcome** : Résultat
- **nextAction** : Prochaine action à entreprendre

## Endpoints

### Health Check
```
GET /health
```

### Routes API (à implémenter)
```
POST   /api/v1/followup              - Créer une relance
GET    /api/v1/followup              - Liste des relances
GET    /api/v1/followup/:id          - Détails d'une relance
PUT    /api/v1/followup/:id          - Modifier une relance
DELETE /api/v1/followup/:id          - Supprimer une relance
PUT    /api/v1/followup/:id/complete - Marquer comme complétée

# Filtres
GET    /api/v1/followup?completed=false      - Relances en attente
GET    /api/v1/followup?type=EMAIL           - Relances par type
GET    /api/v1/followup?applicationId=xxx    - Relances d'une candidature
```

## Démarrage

```bash
# Via Docker Compose
docker compose up followup-service

# En développement
cd followup-service
npm install
npm run dev
```

## Variables d'environnement

- `NODE_ENV` : Environnement (development/production)
- `PORT` : Port du service (3012)
- `DATABASE_URL` : URL de connexion PostgreSQL
- `JWT_SECRET` : Clé secrète JWT
- `AUTH_SERVICE_URL` : URL du service d'authentification
- `NOTIFICATION_SERVICE_URL` : URL du service de notifications

## Schéma de données

Le service utilise un modèle `FollowUp` avec les champs suivants :

- Identifiants (userId, applicationId, contactId)
- Type et planification (type, scheduledDate)
- État (completed, completedDate)
- Contenu (subject, message, response)
- Résultat (outcome, nextAction)
- Métadonnées (timestamps, soft delete, sync)

## Intégration

### Avec Notification Service
Le FollowUp Service peut appeler le Notification Service pour envoyer automatiquement des emails de relance :

```javascript
// Exemple d'intégration
const axios = require('axios');

async function sendFollowUpEmail(followUp) {
  await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/api/v1/notification/email`, {
    to: followUp.contactEmail,
    subject: followUp.subject,
    message: followUp.message
  });
}
```

## Exemples d'utilisation

### Créer une relance email
```json
{
  "userId": "user_123",
  "applicationId": "app_456",
  "contactId": "contact_789",
  "type": "EMAIL",
  "scheduledDate": "2025-10-15T10:00:00Z",
  "subject": "Suivi de ma candidature - Poste de Software Engineer",
  "message": "Bonjour,\n\nJe me permets de revenir vers vous concernant..."
}
```

### Marquer une relance comme complétée
```json
{
  "completed": true,
  "completedDate": "2025-10-15T14:30:00Z",
  "response": "Réponse positive, entretien prévu la semaine prochaine",
  "outcome": "SUCCESS",
  "nextAction": "Préparer l'entretien technique"
}
```

### Relance automatique
Le service peut inclure un cron job pour vérifier les relances planifiées et envoyer automatiquement les emails :

```javascript
// Exemple de cron job (à implémenter)
cron.schedule('0 9 * * *', async () => {
  const pendingFollowUps = await prisma.followUp.findMany({
    where: {
      completed: false,
      scheduledDate: {
        lte: new Date()
      },
      type: 'EMAIL'
    }
  });
  
  for (const followUp of pendingFollowUps) {
    await sendFollowUpEmail(followUp);
    await markAsCompleted(followUp.id);
  }
});
```

