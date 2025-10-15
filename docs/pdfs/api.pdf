## 🧭 Navigation Centrale

### 📖 **Documentation du Projet**
- **[Accueil](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/README.md)** | **[Documentation Centralisée](../README.md)**

### 🚀 **Démarrage Rapide**
- **[Guide Installation](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/GUIDE-DEMARRAGE-RAPIDE.md)** | **[Guide Développement](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/docs/guides/getting-started.md)**

### 📡 **API & Intégration**
- **[Documentation API](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/docs/api/v1/endpoints.md)** | **[API Technique](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/docs/technical/api.md)**

### 🚀 **Déploiement**
- **[Guide Déploiement](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/docs/deployment/GUIDE-PORTAINER.md)** | **[Déploiement Technique](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/docs/technical/deployment.md)**

### 🛠️ **Outils Développement**
- **[Scripts et Makefiles](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/docs/scripts/makefiles.md)** | **[Documentation Technique](../technical/README.md)**

### 🔧 **Documentation Technique**
- **[Architecture](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/docs/technical/architecture.md)** | **[Base de Données](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/docs/technical/database.md)** | **[Sécurité](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/docs/technical/security.md)** | **[Performance](https://github.com/OWNER/JobbingTrack/blob/feat/frontend-dashboard/docs/technical/performance.md)**

---

# 📡 API REST JobbingTrack

Documentation complète de l'API REST de JobbingTrack.

## 📋 Vue d'Ensemble

L'API JobbingTrack suit les principes REST avec une architecture microservices. Tous les endpoints sont versionnés et documentés avec OpenAPI/Swagger.

```
Base URL: http://localhost:3000/api/v1
Content-Type: application/json
Authorization: Bearer <token>
```

## 🔐 Authentification

### Connexion
```http
POST /auth/login
Content-Type: application/json

{
  "email": "redacted@example.invalid",
  "password": "password123"
}
```

**Réponse de succès** :
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "redacted@example.invalid",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Actualisation du Token
```http
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

## 👤 Gestion des Utilisateurs

### Lister les Utilisateurs
```http
GET /auth/users
Authorization: Bearer <token>
```

### Créer un Utilisateur
```http
POST /auth/register
Content-Type: application/json

{
  "email": "redacted@example.invalid",
  "password": "securepassword",
  "firstName": "New",
  "lastName": "User"
}
```

### Modifier un Utilisateur
```http
PUT /auth/users/{userId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Updated",
  "lastName": "Name",
  "role": "ADMIN"
}
```

## 📝 Candidatures (Applications)

### CRUD Complet

#### Lister les Candidatures
```http
GET /applications?status=SENT&limit=20&offset=0
Authorization: Bearer <token>
```

**Paramètres de requête** :
- `status` : Filtrer par statut
- `companyId` : Filtrer par entreprise
- `limit` : Nombre de résultats (max 100)
- `offset` : Pagination
- `sortBy` : Champ de tri (`createdAt`, `updatedAt`, `title`)
- `sortOrder` : Ordre (`asc`, `desc`)

#### Créer une Candidature
```http
POST /applications
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Développeur Full Stack",
  "description": "Poste de développeur senior",
  "companyId": "company_123",
  "status": "DRAFT",
  "priority": "HIGH",
  "location": "Paris, France",
  "salaryMin": 45000,
  "salaryMax": 55000
}
```

#### Modifier une Candidature
```http
PUT /applications/{applicationId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Développeur Full Stack Senior",
  "status": "SENT",
  "notes": "Candidature envoyée le 15/10/2025"
}
```

#### Supprimer une Candidature
```http
DELETE /applications/{applicationId}
Authorization: Bearer <token>
```

## 🏢 Entreprises (Companies)

### Lister les Entreprises
```http
GET /companies?sector=TECH&limit=50
Authorization: Bearer <token>
```

### Créer une Entreprise
```http
POST /companies
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "TechCorp",
  "sector": "Technologie",
  "industry": "Software",
  "size": "MEDIUM",
  "location": "Paris, France",
  "website": "https://techcorp.com",
  "description": "Entreprise leader en technologie"
}
```

## 👥 Contacts (Contacts)

### Lister les Contacts
```http
GET /contacts?companyId=company_123
Authorization: Bearer <token>
```

### Créer un Contact
```http
POST /contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "redacted@example.invalid",
  "phone": "+33 1 23 45 67 89",
  "position": "CTO",
  "department": "Engineering",
  "companyId": "company_123"
}
```

## 📅 Entretiens (Interviews)

### Lister les Entretiens
```http
GET /interviews?status=SCHEDULED&applicationId=app_123
Authorization: Bearer <token>
```

### Planifier un Entretien
```http
POST /interviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "TECHNICAL",
  "title": "Entretien technique",
  "description": "Discussion technique approfondie",
  "applicationId": "app_123",
  "companyId": "company_123",
  "contactId": "contact_123",
  "scheduledAt": "2025-10-20T14:00:00Z",
  "duration": 60,
  "location": "Bureau Paris",
  "meetingLink": "https://meet.google.com/abc-def-ghi"
}
```

## 🔔 Notifications

### Lister les Notifications
```http
GET /notifications?type=EMAIL&limit=20
Authorization: Bearer <token>
```

### Créer une Notification
```http
POST /notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "EMAIL",
  "title": "Rappel entretien",
  "message": "Vous avez un entretien demain à 14h",
  "recipient": "redacted@example.invalid",
  "scheduledAt": "2025-10-19T18:00:00Z"
}
```

## 📊 Dashboard et Analytics

### KPIs Généraux
```http
GET /dashboard/kpis
Authorization: Bearer <token>
```

**Réponse** :
```json
{
  "totalApplications": 156,
  "activeApplications": 89,
  "totalCompanies": 45,
  "totalContacts": 123,
  "upcomingInterviews": 12,
  "responseRate": 68.5,
  "averageTimeToResponse": 4.2
}
```

### Statistiques Détaillées
```http
GET /dashboard/stats?period=WEEKLY&metric=applications
Authorization: Bearer <token>
```

## 🔍 Recherche Avancée

### Recherche Globale
```http
GET /search?q=développeur&modules=applications,companies&limit=20
Authorization: Bearer <token>
```

### Recherche Avancée
```http
POST /search/advanced
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "react developer",
  "modules": ["applications", "companies"],
  "filters": {
    "applications": { "status": "SENT" },
    "companies": { "sector": "TECH" }
  },
  "sortBy": "relevance",
  "limit": 50
}
```

## 📞 Appels (Calls)

### Enregistrer un Appel
```http
POST /calls
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Appel de suivi",
  "applicationId": "app_123",
  "contactId": "contact_123",
  "notes": "Discussion sur le poste",
  "outcome": "POSITIVE",
  "duration": 15,
  "scheduledAt": "2025-10-18T16:30:00Z"
}
```

## 📧 Templates d'Email

### Lister les Templates
```http
GET /templates?type=FOLLOWUP
Authorization: Bearer <token>
```

### Créer un Template
```http
POST /templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Relance standard",
  "type": "FOLLOWUP",
  "subject": "Suivi de votre candidature",
  "content": "Bonjour {{contact.firstName}}, nous revenons vers vous...",
  "variables": ["contact.firstName", "company.name", "application.title"]
}
```

## 🔧 Administration

### Gestion des Services
```http
POST /admin/services/restart
Authorization: Bearer <token>
Content-Type: application/json

{
  "serviceName": "application-service"
}
```

### Logs des Services
```http
GET /admin/logs/{serviceName}?lines=100
Authorization: Bearer <token>
```

### Métriques Système
```http
GET /metrics
Authorization: Bearer <token>
```

## 📋 Codes de Statut HTTP

| Code | Description | Utilisation |
|------|-------------|-------------|
| `200` | Succès | Opération réussie |
| `201` | Créé | Ressource créée |
| `400` | Mauvaise Requête | Paramètres invalides |
| `401` | Non Autorisé | Token manquant/invalide |
| `403` | Interdit | Permissions insuffisantes |
| `404` | Non Trouvé | Ressource inexistante |
| `409` | Conflit | Conflit de données |
| `422` | Entité Non Traitée | Validation échouée |
| `429` | Trop de Requêtes | Rate limiting |
| `500` | Erreur Interne | Erreur serveur |

## 🔒 Gestion d'Erreurs

### Format d'Erreur Standard
```json
{
  "success": false,
  "error": "Description de l'erreur",
  "code": "ERROR_CODE",
  "details": {
    "field": "Détail du champ en erreur"
  }
}
```

### Codes d'Erreur Courants

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Erreur de validation des données |
| `AUTHENTICATION_ERROR` | Problème d'authentification |
| `AUTHORIZATION_ERROR` | Permissions insuffisantes |
| `NOT_FOUND` | Ressource non trouvée |
| `DUPLICATE_ERROR` | Donnée en double |
| `RATE_LIMIT_ERROR` | Limite de requêtes atteinte |

## 📊 Pagination

### Format Standard
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true,
    "nextOffset": 20,
    "totalPages": 8,
    "currentPage": 1
  }
}
```

## 🔍 Filtrage et Tri

### Filtres Communs
- `status` : Statut de la ressource
- `createdAt` : Date de création
- `updatedAt` : Date de modification
- `isActive` : Ressource active/inactive

### Tri
- `sortBy` : Champ de tri
- `sortOrder` : `asc` ou `desc`

## 🚀 Bonnes Pratiques

### Sécurité
- **Toujours inclure** l'en-tête `Authorization: Bearer <token>`
- **Valider les données** côté client et serveur
- **Utiliser HTTPS** en production

### Performance
- **Utiliser la pagination** pour les grandes listes
- **Filtrer côté serveur** avec les paramètres de requête
- **Mettre en cache** les données statiques

### Développement
- **Tester les endpoints** avec curl ou Postman
- **Utiliser les codes d'erreur** appropriés
- **Documenter les changements** d'API

---

**🎯 API JobbingTrack** - Interface RESTful moderne et sécurisée pour votre plateforme de gestion de candidatures.
