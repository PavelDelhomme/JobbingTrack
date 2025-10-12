# 🔌 JobbingTrack - Documentation des Endpoints API

## 🌐 API Gateway : `http://localhost:8080`

Tous les endpoints passent par l'API Gateway et sont proxifiés vers les microservices appropriés.

---

## 🔐 Auth Service (Port 3001)

### Authentification Publique
```http
POST   /api/v1/auth/register              # Inscription
POST   /api/v1/auth/login                 # Connexion
POST   /api/v1/auth/logout                # Déconnexion
POST   /api/v1/auth/refresh               # Rafraîchir le token
```

### Réinitialisation de Mot de Passe (Public)
```http
POST   /api/v1/auth/forgot-password       # Demander un lien (email requis)
GET    /api/v1/auth/reset-password/:token # Vérifier le token
POST   /api/v1/auth/reset-password/:token # Réinitialiser (password requis)
```

### Gestion Utilisateurs (Authentifié)
```http
GET    /api/v1/auth/profile               # Profil de l'utilisateur connecté
GET    /api/v1/auth/users                 # Liste tous les utilisateurs (ADMIN)
PUT    /api/v1/auth/users/:id/role        # Modifier le rôle (ADMIN)
PUT    /api/v1/auth/users/:id/status      # Activer/Désactiver (ADMIN)
DELETE /api/v1/auth/users/:id             # Supprimer un utilisateur (ADMIN)
```

**Exemple de requête :**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "redacted@example.invalid",
    "password": "password123"
  }'
```

---

## 📞 Call Service (Port 3008)

### Appels Téléphoniques (Authentifié)
```http
GET    /api/v1/calls                      # Liste des appels (page, limit, status, type, applicationId)
GET    /api/v1/calls/:id                  # Détail d'un appel
POST   /api/v1/calls                      # Créer un appel (applicationId requis)
PUT    /api/v1/calls/:id                  # Modifier un appel
DELETE /api/v1/calls/:id                  # Supprimer un appel
PUT    /api/v1/calls/:id/complete         # Marquer comme terminé (duration, outcome)
```

### Statistiques
```http
GET    /api/v1/calls/stats/overview       # Stats globales
GET    /api/v1/calls/application/:id      # Appels d'une candidature
```

**Exemple de requête :**
```bash
curl -X POST http://localhost:8080/api/v1/calls \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "APP_ID",
    "type": "OUTGOING",
    "scheduledDate": "2025-10-20T14:00:00Z",
    "phoneNumber": "+33612345678",
    "notes": "Premier contact"
  }'
```

**Types d'appels :** `OUTGOING`, `INCOMING`, `MISSED`  
**Statuts :** `SCHEDULED`, `COMPLETED`, `CANCELLED`, `NO_ANSWER`, `VOICEMAIL`, `RESCHEDULED`

---

## 🔔 Notification Service (Port 3006)

### Notifications (Authentifié)
```http
GET    /api/v1/notifications               # Liste (page, limit, type, isRead)
GET    /api/v1/notifications/:id           # Détail
POST   /api/v1/notifications               # Créer (type, title, message requis)
DELETE /api/v1/notifications/:id           # Supprimer
PUT    /api/v1/notifications/:id/mark-read # Marquer comme lue
PUT    /api/v1/notifications/mark-all-read # Tout marquer comme lu
GET    /api/v1/notifications/stats         # Statistiques
```

### Emails
```http
GET    /api/v1/notifications/emails/logs   # Logs d'emails (page, limit, status)
POST   /api/v1/notifications/emails/send   # Envoyer un email (to, subject, body)
```

### Rappels Automatiques
```http
GET    /api/v1/notifications/reminders/automated      # Liste
POST   /api/v1/notifications/reminders/automated      # Créer
PUT    /api/v1/notifications/reminders/automated/:id  # Modifier
DELETE /api/v1/notifications/reminders/automated/:id  # Supprimer
```

**Types de notifications :** `INFO`, `SUCCESS`, `WARNING`, `ERROR`, `REMINDER`, `APPLICATION_UPDATE`, `INTERVIEW_REMINDER`, `FOLLOWUP_DUE`, `CALL_SCHEDULED`

**Statuts d'emails :** `PENDING`, `SENT`, `FAILED`, `BOUNCED`

---

## 📧 Follow-up Service (Port 3012)

### Relances (Authentifié)
```http
GET    /api/v1/followups                  # Liste (page, limit, completed, type, applicationId)
GET    /api/v1/followups/:id              # Détail
POST   /api/v1/followups                  # Créer (applicationId, type, scheduledDate, subject)
PUT    /api/v1/followups/:id              # Modifier
DELETE /api/v1/followups/:id              # Supprimer
PUT    /api/v1/followups/:id/complete     # Marquer comme terminé (response optionnel)
```

### Fonctionnalités Avancées
```http
GET    /api/v1/followups/stats            # Statistiques (total, completed, successRate, etc.)
GET    /api/v1/followups/suggestions      # Suggestions intelligentes
```

**Types de relances :** `EMAIL`, `PHONE`, `LINKEDIN`, `MESSAGE`, `MEETING`

---

## 📅 Event Service (Port 3011)

### Timeline et Événements (Authentifié)
```http
GET    /api/v1/events                                    # Tous les événements (page, limit, type, dates)
GET    /api/v1/events/timeline/:entityType/:entityId    # Timeline spécifique (application|contact)
POST   /api/v1/events                                    # Créer un événement
GET    /api/v1/events/export                             # Export (entityType, entityId, format)
GET    /api/v1/events/stats                              # Statistiques
```

**Types d'événements :** `APPLICATION_CREATED`, `APPLICATION_UPDATED`, `STATUS_CHANGED`, `INTERVIEW_SCHEDULED`, `INTERVIEW_COMPLETED`, `CALL_MADE`, `CALL_COMPLETED`, `FOLLOWUP_SENT`, etc.

---

## 👨‍💼 Admin Routes (API Gateway)

### Gestion de Services
```http
POST   /api/v1/admin/services/restart     # Redémarrer un service
POST   /api/v1/admin/services/stop        # Arrêter un service
POST   /api/v1/admin/services/start       # Démarrer un service
```

### Logs
```http
GET    /api/v1/admin/logs/services        # Liste des services disponibles
GET    /api/v1/admin/logs/all             # Tous les logs (lines)
GET    /api/v1/admin/logs/:serviceName    # Logs d'un service (lines, since, until)
GET    /api/v1/admin/logs/:serviceName/stream # Stream temps réel (SSE)
```

### Corbeille
```http
GET    /api/v1/admin/trash                      # Tous les éléments supprimés
POST   /api/v1/admin/trash/:type/:id/restore    # Restaurer
DELETE /api/v1/admin/trash/:type/:id/permanent  # Suppression définitive
POST   /api/v1/admin/trash/empty                # Vider la corbeille
```

### Archives
```http
GET    /api/v1/admin/archive                    # Tous les éléments archivés
POST   /api/v1/admin/archive/:type/:id          # Archiver
POST   /api/v1/admin/archive/:type/:id/unarchive # Désarchiver
```

### Données de Test
```http
POST   /api/v1/admin/test-data/generate   # Générer des données
POST   /api/v1/admin/test-data/clear      # Effacer les données de test
GET    /api/v1/admin/test-data/status     # Status
```

### Fonctionnalités Avancées
```http
GET    /api/v1/admin/duplicates/:entityType      # Détecter doublons (companies|contacts)
POST   /api/v1/admin/duplicates/merge            # Fusionner doublons
GET    /api/v1/admin/stats/global                # Statistiques globales consolidées
GET    /api/v1/admin/logs/admin                  # Logs d'activité admin
POST   /api/v1/admin/users/:userId/anonymize     # Anonymiser un utilisateur (RGPD)
GET    /api/v1/admin/monitoring/performance      # Métriques de performance
```

### Tests de Base de Données
```http
GET    /api/v1/admin/test-db/connection          # Test connexion PostgreSQL
GET    /api/v1/admin/test-db/schema/:serviceName # Test schéma Prisma
POST   /api/v1/admin/test-db/migration-test      # Test migration (dry-run)
GET    /api/v1/admin/test-db/tables              # Liste des tables
```

### Gestion de Données (PhpMyAdmin)
```http
GET    /api/v1/admin/data/tables                 # Liste des tables disponibles
GET    /api/v1/admin/data/:tableName             # Données d'une table (page, limit, search)
POST   /api/v1/admin/data/:tableName             # Créer un enregistrement
PUT    /api/v1/admin/data/:tableName/:id         # Modifier un enregistrement
DELETE /api/v1/admin/data/:tableName/:id         # Supprimer un enregistrement
GET    /api/v1/admin/export/:tableName           # Exporter une table (format: json|csv)
POST   /api/v1/admin/data/:tableName/bulk        # Opérations en masse (operation, ids, data)
```

---

## 📝 Schémas de Requêtes

### Créer un Appel
```json
{
  "applicationId": "clxxx123",
  "contactId": "clxxx456",
  "type": "OUTGOING",
  "scheduledDate": "2025-10-20T14:00:00Z",
  "phoneNumber": "+33612345678",
  "notes": "Premier contact avec le recruteur"
}
```

### Créer une Notification
```json
{
  "type": "INFO",
  "title": "Nouvelle candidature",
  "message": "Votre candidature chez Google a été envoyée",
  "link": "/applications/clxxx123",
  "relatedId": "clxxx123",
  "relatedType": "application"
}
```

### Créer une Relance
```json
{
  "applicationId": "clxxx123",
  "contactId": "clxxx456",
  "type": "EMAIL",
  "scheduledDate": "2025-10-25T10:00:00Z",
  "subject": "Suivi de ma candidature",
  "message": "Bonjour,\n\nJe me permets..."
}
```

### Créer un Utilisateur
```json
{
  "email": "redacted@example.invalid",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+33612345678",
  "role": "USER"
}
```

### Opération en Masse
```json
{
  "operation": "DELETE",
  "ids": ["id1", "id2", "id3"]
}
```

---

## 🔑 Authentification

Toutes les routes protégées nécessitent un header `Authorization` :

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Le token JWT contient :
```json
{
  "userId": "clxxx123",
  "email": "redacted@example.invalid",
  "role": "ADMIN",
  "iat": 1697123456,
  "exp": 1697209856
}
```

---

## 📊 Réponses Standards

### Succès
```json
{
  "success": true,
  "data": { ... },
  "message": "Opération réussie"
}
```

### Erreur
```json
{
  "success": false,
  "error": "Message d'erreur",
  "details": "Détails supplémentaires"
}
```

### Liste Paginée
```json
{
  "success": true,
  "items": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```

### Statistiques
```json
{
  "success": true,
  "stats": {
    "total": 100,
    "completed": 75,
    "pending": 25,
    "rate": "75.0"
  }
}
```

---

## 🔒 Permissions par Endpoint

### 🟢 Public (Pas d'authentification)
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/forgot-password`
- GET/POST `/api/v1/auth/reset-password/:token`

### 🟡 Authentifié (Tous les rôles)
- GET `/api/v1/auth/profile`
- Tous les endpoints de `applications`, `companies`, `contacts`, `interviews`
- GET/POST/PUT/DELETE `/api/v1/calls`
- GET/POST/PUT/DELETE `/api/v1/followups`
- GET/POST/PUT/DELETE `/api/v1/notifications`
- GET `/api/v1/events`

### 🟠 Admin (ADMIN ou SUPER_ADMIN)
- GET `/api/v1/auth/users`
- PUT `/api/v1/auth/users/:id/role`
- PUT `/api/v1/auth/users/:id/status`
- DELETE `/api/v1/auth/users/:id`
- Tous les `/api/v1/admin/*` sauf opérations en masse
- GET `/api/v1/admin/logs/*`
- GET `/api/v1/admin/test-db/*`
- GET/POST/PUT/DELETE `/api/v1/admin/data/*`

### 🔴 Super Admin (SUPER_ADMIN uniquement)
- POST `/api/v1/admin/test-db/migration-test`
- POST `/api/v1/admin/data/:tableName/bulk`
- POST `/api/v1/admin/users/:userId/anonymize`

---

## 📈 Codes de Statut HTTP

- `200 OK` - Succès
- `201 Created` - Ressource créée
- `400 Bad Request` - Requête invalide
- `401 Unauthorized` - Non authentifié
- `403 Forbidden` - Permission refusée
- `404 Not Found` - Ressource non trouvée
- `409 Conflict` - Conflit (ex: email déjà utilisé)
- `500 Internal Server Error` - Erreur serveur
- `503 Service Unavailable` - Service indisponible

---

## 🧪 Tests des Endpoints

### Test Rapide de Tous les Services

```bash
# Health checks
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/auth/health
curl http://localhost:8080/api/v1/calls/health
curl http://localhost:8080/api/v1/notifications/health
curl http://localhost:8080/api/v1/followups/health
curl http://localhost:8080/api/v1/events/health
```

### Test Complet avec Token

```bash
# 1. S'authentifier
TOKEN=$(curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid","password":"password"}' \
  | jq -r '.token')

# 2. Tester les endpoints
curl http://localhost:8080/api/v1/calls -H "Authorization: Bearer $TOKEN"
curl http://localhost:8080/api/v1/notifications -H "Authorization: Bearer $TOKEN"
curl http://localhost:8080/api/v1/followups/suggestions -H "Authorization: Bearer $TOKEN"
curl http://localhost:8080/api/v1/admin/stats/global -H "Authorization: Bearer $TOKEN"
```

---

## 📦 Paramètres de Query Communs

### Pagination
```
?page=1&limit=20
```

### Filtrage
```
?status=COMPLETED
?type=OUTGOING
?isRead=false
?completed=true
```

### Dates
```
?startDate=2025-10-01
?endDate=2025-10-31
?since=1h
?until=2025-10-20
```

### Recherche
```
?search=terme
```

---

## 🔍 Endpoints de Monitoring

### Performance Globale
```http
GET /api/v1/admin/monitoring/performance
```

**Réponse :**
```json
{
  "success": true,
  "metrics": {
    "timestamp": "2025-10-12T10:00:00Z",
    "memory": {
      "heapUsed": 50000000,
      "heapTotal": 100000000
    },
    "uptime": 3600,
    "services": {
      "auth-service": { "status": "OK", "responseTime": 45 },
      "call-service": { "status": "OK", "responseTime": 32 }
    }
  }
}
```

### Statistiques Globales
```http
GET /api/v1/admin/stats/global
```

**Réponse :**
```json
{
  "success": true,
  "stats": {
    "users": { "total": 150, "active": 120 },
    "applications": { "total": 500, "byStatus": { ... } },
    "calls": { "total": 200, "completed": 150 },
    "notifications": { "total": 1000, "unread": 50 }
  }
}
```

---

## 🎯 Endpoints les Plus Utilisés

### Top 10

1. `POST /api/v1/auth/login` - Connexion
2. `GET /api/v1/applications` - Liste des candidatures
3. `GET /api/v1/calls/stats/overview` - Stats des appels
4. `GET /api/v1/followups/suggestions` - Suggestions de relances
5. `GET /api/v1/notifications` - Notifications
6. `GET /api/v1/admin/logs/:serviceName` - Logs d'un service
7. `GET /api/v1/admin/data/:tableName` - Données d'une table
8. `POST /api/v1/auth/forgot-password` - Reset password
9. `GET /api/v1/events/timeline/:type/:id` - Timeline
10. `GET /api/v1/admin/stats/global` - Stats globales

---

## 📱 Endpoints par Use Case

### Use Case 1 : Suivre une candidature

```bash
# 1. Créer la candidature
POST /api/v1/applications

# 2. Planifier un appel
POST /api/v1/calls

# 3. Programmer une relance
POST /api/v1/followups

# 4. Voir la timeline
GET /api/v1/events/timeline/application/:id
```

### Use Case 2 : Gérer un utilisateur (Admin)

```bash
# 1. Créer l'utilisateur
POST /api/v1/auth/register

# 2. Modifier le rôle
PUT /api/v1/auth/users/:id/role

# 3. Voir ses emails
GET /api/v1/notifications/emails/logs?userId=:id

# 4. Envoyer reset password
POST /api/v1/auth/forgot-password
```

### Use Case 3 : Export de données

```bash
# 1. Exporter les appels
GET /api/v1/admin/export/Call?format=csv

# 2. Exporter la timeline
GET /api/v1/events/export?entityType=application&entityId=:id&format=csv

# 3. Exporter une table complète
GET /api/v1/admin/export/User?format=json
```

---

## 🎉 Résumé

- **80+ endpoints** REST disponibles
- **9 microservices** opérationnels
- **3 niveaux** de permissions (PUBLIC, ADMIN, SUPER_ADMIN)
- **CRUD complet** sur toutes les entités
- **Statistiques** partout
- **Export/Import** de données
- **Monitoring** temps réel

**API complète et professionnelle !** 🚀

