# Documentation API - JobbingTrack

[← Retour au README principal](../README.md)

## 🎯 Vue d'ensemble

JobbingTrack utilise une architecture de microservices avec un API Gateway central. Cette documentation couvre tous les endpoints disponibles.

## 📋 Table des matières

- [🔗 API Gateway](#-api-gateway)
- [🔐 Service d'authentification](#-service-dauthentification)
- [👤 Service utilisateur](#-service-utilisateur)
- [🏢 Service entreprise](#-service-entreprise)
- [📞 Service d'appels](#-service-dappels)
- [📊 Service de métriques](#-service-de-métriques)
- [🔧 Codes d'erreur](#-codes-derreur)

---

## 🔗 API Gateway

**Base URL** : `http://localhost:3000`

L'API Gateway est le point d'entrée unique pour tous les services.

### Endpoints de santé

```http
GET /health
```

**Réponse** :
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:00:00Z",
  "services": {
    "auth": "healthy",
    "user": "healthy",
    "company": "healthy"
  }
}
```

---

## 🔐 Service d'authentification

**Base URL** : `http://localhost:3000/auth`

### Authentification

#### Connexion

```http
POST /auth/login
Content-Type: application/json

{
  "email": "redacted@example.invalid",
  "password": "password123"
}
```

**Réponse** :
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "redacted@example.invalid",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### Inscription

```http
POST /auth/register
Content-Type: application/json

{
  "email": "redacted@example.invalid",
  "password": "password123",
  "name": "John Doe"
}
```

#### Vérification du token

```http
GET /auth/verify
Authorization: Bearer <token>
```

#### Rafraîchissement du token

```http
POST /auth/refresh
Authorization: Bearer <token>
```

---

## 👤 Service utilisateur

**Base URL** : `http://localhost:3000/users`

### Gestion des utilisateurs

#### Obtenir le profil utilisateur

```http
GET /users/profile
Authorization: Bearer <token>
```

**Réponse** :
```json
{
  "id": "user-id",
  "email": "redacted@example.invalid",
  "name": "John Doe",
  "role": "user",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-27T10:00:00Z"
}
```

#### Mettre à jour le profil

```http
PUT /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "email": "redacted@example.invalid"
}
```

#### Changer le mot de passe

```http
PUT /users/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

---

## 🏢 Service entreprise

**Base URL** : `http://localhost:3000/companies`

### Gestion des entreprises

#### Lister les entreprises

```http
GET /companies
Authorization: Bearer <token>
```

**Réponse** :
```json
{
  "companies": [
    {
      "id": "company-id",
      "name": "Acme Corp",
      "description": "Une entreprise innovante",
      "website": "https://acme.com",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

#### Créer une entreprise

```http
POST /companies
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nouvelle Entreprise",
  "description": "Description de l'entreprise",
  "website": "https://nouvelle-entreprise.com"
}
```

#### Obtenir une entreprise

```http
GET /companies/{id}
Authorization: Bearer <token>
```

#### Mettre à jour une entreprise

```http
PUT /companies/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Entreprise Modifiée",
  "description": "Nouvelle description"
}
```

#### Supprimer une entreprise

```http
DELETE /companies/{id}
Authorization: Bearer <token>
```

---

## 📞 Service d'appels

**Base URL** : `http://localhost:3000/calls`

### Gestion des appels

#### Lister les appels

```http
GET /calls
Authorization: Bearer <token>
```

**Paramètres de requête** :
- `page` : Numéro de page (défaut: 1)
- `limit` : Nombre d'éléments par page (défaut: 10)
- `status` : Filtrer par statut
- `companyId` : Filtrer par entreprise

#### Créer un appel

```http
POST /calls
Authorization: Bearer <token>
Content-Type: application/json

{
  "companyId": "company-id",
  "subject": "Appel de suivi",
  "notes": "Notes de l'appel",
  "scheduledAt": "2025-01-28T14:00:00Z"
}
```

#### Mettre à jour un appel

```http
PUT /calls/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "notes": "Appel terminé avec succès"
}
```

---

## 📊 Service de métriques

**Base URL** : `http://localhost:3000/metrics`

### Métriques système

#### Obtenir les métriques

```http
GET /metrics
Authorization: Bearer <token>
```

**Réponse** :
```json
{
  "system": {
    "cpu": 45.2,
    "memory": 67.8,
    "disk": 23.1
  },
  "services": {
    "api-gateway": {
      "status": "healthy",
      "uptime": 3600,
      "requests": 1250
    }
  },
  "timestamp": "2025-01-27T10:00:00Z"
}
```

#### Métriques détaillées

```http
GET /metrics/detailed
Authorization: Bearer <token>
```

---

## 🔧 Codes d'erreur

### Codes HTTP

| Code | Description |
|------|-------------|
| 200 | Succès |
| 201 | Créé avec succès |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Ressource non trouvée |
| 422 | Erreur de validation |
| 500 | Erreur serveur |

### Format des erreurs

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Les données fournies ne sont pas valides",
    "details": [
      {
        "field": "email",
        "message": "L'email est requis"
      }
    ]
  }
}
```

### Codes d'erreur personnalisés

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Erreur de validation |
| `AUTHENTICATION_ERROR` | Erreur d'authentification |
| `AUTHORIZATION_ERROR` | Erreur d'autorisation |
| `NOT_FOUND` | Ressource non trouvée |
| `DUPLICATE_ENTRY` | Entrée en doublon |
| `SERVICE_UNAVAILABLE` | Service indisponible |

---

## 🔐 Authentification

### JWT Token

Tous les endpoints protégés nécessitent un token JWT dans l'en-tête :

```http
Authorization: Bearer <jwt-token>
```

### Rôles et permissions

- **admin** : Accès complet à tous les endpoints
- **user** : Accès aux données personnelles et aux entreprises
- **viewer** : Accès en lecture seule

---

## 📝 Exemples d'utilisation

### Client JavaScript

```javascript
// Configuration de base
const API_BASE = 'http://localhost:3000';

// Fonction pour faire des requêtes authentifiées
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

// Exemples d'utilisation
async function login(email, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

async function getCompanies() {
  return apiRequest('/companies');
}

async function createCompany(companyData) {
  return apiRequest('/companies', {
    method: 'POST',
    body: JSON.stringify(companyData)
  });
}
```

### Client cURL

```bash
# Connexion
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid","password":"password123"}'

# Obtenir les entreprises
curl -X GET http://localhost:3000/companies \
  -H "Authorization: Bearer <token>"

# Créer une entreprise
curl -X POST http://localhost:3000/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Nouvelle Entreprise","description":"Description"}'
```

---

## 📚 Ressources supplémentaires

- [Guide de développement](DEVELOPMENT.md) - Développement
- [Guide d'architecture](architecture-guide.md) - Architecture
- [Documentation Makefile](MAKEFILE.md) - Commandes Make
- [Scripts utilitaires](../scripts/README.md) - Scripts disponibles

---

[← Retour au README principal](../README.md) | [Guide de développement →](DEVELOPMENT.md)

---

## Navigation

- [📚 Index](README.md)
- [🏠 Accueil](../README.md)
