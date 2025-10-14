# 📡 Endpoints API JobbingTrack v1

Documentation complète de tous les endpoints de l'API REST JobbingTrack v1.

## 📋 Vue d'Ensemble

L'API JobbingTrack v1 fournit un accès programmatique complet à toutes les fonctionnalités de la plateforme.

```
Base URL: http://localhost:3000/api/v1
Content-Type: application/json
Authorization: Bearer <token>
```

## 🔐 Authentification

### Connexion Utilisateur
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponse** :
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
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

### Déconnexion
```http
POST /auth/logout
Authorization: Bearer <token>
```

## 👤 Gestion des Utilisateurs

### Lister les Utilisateurs
```http
GET /auth/users
Authorization: Bearer <token>
```

**Paramètres** :
- `limit` : Nombre de résultats (max 100)
- `offset` : Pagination
- `role` : Filtrer par rôle
- `isActive` : Filtrer par statut actif

### Créer un Utilisateur
```http
POST /auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securePassword123!",
  "firstName": "New",
  "lastName": "User",
  "role": "USER"
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

### Supprimer un Utilisateur
```http
DELETE /auth/users/{userId}
Authorization: Bearer <token>
```

## 📝 Candidatures (Applications)

### CRUD Complet

#### Lister les Candidatures
```http
GET /applications
Authorization: Bearer <token>
```

**Paramètres** :
- `status` : Filtrer par statut
- `companyId` : Filtrer par entreprise
- `limit` : Nombre de résultats
- `offset` : Pagination
- `sortBy` : Champ de tri
- `sortOrder` : Ordre de tri

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
  "salaryMax": 55000,
  "notes": "Candidature intéressante"
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

### Actions Spécialisées

#### Marquer comme Favorite
```http
POST /applications/{applicationId}/favorite
Authorization: Bearer <token>
```

#### Ajouter des Tags
```http
POST /applications/{applicationId}/tags
Authorization: Bearer <token>
Content-Type: application/json

{
  "tags": ["urgent", "senior", "react"]
}
```

## 🏢 Entreprises (Companies)

### CRUD Complet

#### Lister les Entreprises
```http
GET /companies
Authorization: Bearer <token>
```

#### Créer une Entreprise
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

#### Modifier une Entreprise
```http
PUT /companies/{companyId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "TechCorp Solutions",
  "sector": "Technologie & Services"
}
```

## 👥 Contacts (Contacts)

### CRUD Complet

#### Lister les Contacts
```http
GET /contacts
Authorization: Bearer <token>
```

#### Créer un Contact
```http
POST /contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@techcorp.com",
  "phone": "+33 1 23 45 67 89",
  "position": "CTO",
  "department": "Engineering",
  "companyId": "company_123",
  "linkedin": "https://linkedin.com/in/jean-dupont"
}
```

## 📅 Entretiens (Interviews)

### CRUD Complet

#### Lister les Entretiens
```http
GET /interviews
Authorization: Bearer <token>
```

#### Planifier un Entretien
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

### Actions Spécialisées

#### Confirmer un Entretien
```http
POST /interviews/{interviewId}/confirm
Authorization: Bearer <token>
```

#### Annuler un Entretien
```http
POST /interviews/{interviewId}/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Conflit d'agenda"
}
```

## 🔔 Notifications

### CRUD Complet

#### Lister les Notifications
```http
GET /notifications
Authorization: Bearer <token>
```

#### Créer une Notification
```http
POST /notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "EMAIL",
  "title": "Rappel entretien",
  "message": "Vous avez un entretien demain à 14h",
  "recipient": "user@example.com",
  "scheduledAt": "2025-10-19T18:00:00Z"
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

## 📊 Dashboard et Analytics

### KPIs et Métriques
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
GET /dashboard/stats
Authorization: Bearer <token>
```

## 🔍 Recherche

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

## 📧 Templates d'Email

### CRUD Complet

#### Lister les Templates
```http
GET /templates
Authorization: Bearer <token>
```

#### Créer un Template
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
GET /admin/services/status
Authorization: Bearer <token>
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

### Paramètres de Filtrage
- `status` : Statut de la ressource
- `createdAt` : Date de création
- `updatedAt` : Date de modification
- `isActive` : Ressource active/inactive

### Paramètres de Tri
- `sortBy` : Champ de tri (`createdAt`, `updatedAt`, `title`, etc.)
- `sortOrder` : Ordre (`asc`, `desc`)

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

**📡 API JobbingTrack v1** - Interface RESTful complète pour votre plateforme de gestion de candidatures.
