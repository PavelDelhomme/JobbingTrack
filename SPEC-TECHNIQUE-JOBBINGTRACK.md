# 📚 Spécifications Techniques JobbingTrack

## 🎯 Vue d'Ensemble

**JobbingTrack** est une plateforme complète de gestion intelligente du parcours de candidature, construite sur une **architecture microservices moderne** pour optimiser l'efficacité de la recherche d'emploi.

---

## 🏛️ Architecture Microservices

### 🗂️ Services & Responsabilités

| Microservice | Port | Responsabilité Principale | Base de Données | Points Clés |
|--------------|------|---------------------------|-----------------|-------------|
| **API Gateway** | 3000 | Point d'entrée unique, routage, auth global, rate-limit | - | JWT centralisé, orchestrateur |
| **Auth Service** | 3001 | Authentification, JWT/Refresh tokens, gestion profils | PostgreSQL | Auth sécurisée, SSO ready |
| **Application Service** | 3002 | CRUD candidatures, timeline, stats, liens entités | PostgreSQL | Suivi précis, analytics |
| **Company Service** | 3003 | CRUD entreprises, secteurs, informations sociétés | PostgreSQL | Base données entreprises |
| **Contact Service** | 3004 | Carnet d'adresses professionnel, liens multiples | PostgreSQL | Contacts par entreprise |
| **Interview Service** | 3005 | Planning entretiens, feedback, notifications | PostgreSQL | Gestion complète entretiens |
| **Notification Service** | 3006 | Emails automatiques, rappels, relances | Redis + SMTP | Notifications push/email |
| **Dashboard Service** | 3007 | KPIs, statistiques, analytics, cockpit utilisateur | PostgreSQL | Métriques avancées |

### 🔗 Communication Inter-Services

#### Synchrone (HTTP REST)
- **API Gateway** ↔ **Services** : Routage et authentification
- **Services** ↔ **Auth Service** : Validation tokens JWT
- **Client** ↔ **API Gateway** : Point d'entrée unique

#### Asynchrone (Events)
- **Notification Service** : Jobs cron pour rappels automatiques
- **Event-driven** : Mise à jour statuts candidatures
- **Background processing** : Envoi emails différé

---

## 🗄️ Modèles de Données (Prisma Schema)

### 📊 Entités Principales

| Entité | Champs Clés | Relations |
|--------|-------------|-----------|
| **User** | id, email, password, firstName, lastName, role, isActive | applications[], contacts[], reminders[] |
| **Application** | id, userId, companyId, position, status, applicationDate, notes | user, company, interviews[], activities[] |
| **Company** | id, name, website, industry, size, location, description | applications[], contacts[] |
| **Contact** | id, userId, companyId, firstName, lastName, email, phone, position | user, company, followUps[] |
| **Interview** | id, applicationId, type, scheduledAt, location, status, feedback | application |
| **FollowUp** | id, applicationId, contactId, type, scheduledDate, completed | application, contact |
| **Reminder** | id, userId, title, dueDate, type, relatedId, completed | user |
| **Activity** | id, applicationId, type, description, metadata, createdAt | application |
| **Document** | id, userId, name, type, url, size, mimeType | user, applications[] |
| **MessageTemplate** | id, userId, name, subject, content, type, variables[] | user |

### 🔄 Relations Complexes

```mermaid
erDiagram
    User ||--o{ Application : "creates"
    User ||--o{ Contact : "manages"
    User ||--o{ Reminder : "sets"
    
    Application }o--|| Company : "belongs to"
    Application ||--o{ Interview : "has"
    Application ||--o{ FollowUp : "generates"
    Application ||--o{ Activity : "tracks"
    
    Company ||--o{ Contact : "employs"
    Contact ||--o{ FollowUp : "receives"
```

### 📈 Enums & Statuts

#### ApplicationStatus
- `DRAFT` : Brouillon en préparation
- `SENT` : Candidature envoyée
- `IN_REVIEW` : En cours d'examen
- `INTERVIEW_SCHEDULED` : Entretien programmé
- `INTERVIEWED` : Entretien effectué
- `OFFER_RECEIVED` : Offre reçue
- `ACCEPTED` : Offre acceptée
- `REJECTED` : Candidature refusée
- `WITHDRAWN` : Candidature retirée
- `NO_RESPONSE` : Aucune réponse (>30j)

#### InterviewType
- `PHONE_SCREENING` : Entretien téléphonique
- `VIDEO` : Visioconférence
- `ON_SITE` : Sur site
- `TECHNICAL` : Test technique
- `HR` : Ressources humaines
- `MANAGER` : Avec manager
- `TEAM` : Équipe complète
- `FINAL` : Entretien final

---

## 🔐 Sécurité & Authentification

### 🎫 Système JWT
- **Access Token** : 7 jours de validité
- **Refresh Token** : 30 jours (optionnel)
- **Algorithme** : HS256 avec secrets environnement
- **Payload** : `{ userId, email, role, iat, exp }`

### 🛡️ Middlewares Sécurité
- **Rate Limiting** : 100 req/15min par IP
- **CORS** : Origins configurables par environnement
- **Helmet** : Headers sécurité HTTP
- **Validation** : express-validator sur toutes les routes

### 🔒 Protection des Données
- **Mots de passe** : Hashés avec bcrypt (12 rounds)
- **Tokens reset** : Expiration 1h, hachage SHA-256
- **Variables sensibles** : Environnement Docker uniquement
- **HTTPS** : Obligatoire en production

---

## 🚀 APIs REST Détaillées

### 🔐 Auth Service (Port 3001)

#### Endpoints Publics
```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

#### Endpoints Protégés
```http
GET /api/v1/auth/profile
PUT /api/v1/auth/profile
POST /api/v1/auth/change-password
POST /api/v1/auth/refresh-token
POST /api/v1/auth/logout
```

### 📝 Application Service (Port 3002)

#### CRUD Candidatures
```http
GET /api/v1/applications          # Liste avec filtres
GET /api/v1/applications/:id      # Détail candidature
POST /api/v1/applications         # Créer candidature
PUT /api/v1/applications/:id      # Mettre à jour
DELETE /api/v1/applications/:id   # Supprimer

GET /api/v1/applications/stats    # Statistiques utilisateur
```

#### Filtres Avancés
- `status` : Filtrer par statut
- `companyId` : Candidatures pour une entreprise
- `search` : Recherche textuelle (position, notes, entreprise)
- `sortBy` : Tri (createdAt, applicationDate, status)
- `sortOrder` : asc/desc
- `page`, `limit` : Pagination

### 🏢 Company Service (Port 3003)

```http
GET /api/v1/companies             # Liste entreprises
GET /api/v1/companies/:id         # Détail entreprise
POST /api/v1/companies            # Créer entreprise
PUT /api/v1/companies/:id         # Mettre à jour
DELETE /api/v1/companies/:id      # Supprimer

GET /api/v1/companies/search      # Recherche avancée
```

### 👥 Contact Service (Port 3004)

```http
GET /api/v1/contacts              # Liste contacts
GET /api/v1/contacts/:id          # Détail contact
POST /api/v1/contacts             # Créer contact
PUT /api/v1/contacts/:id          # Mettre à jour
DELETE /api/v1/contacts/:id       # Supprimer
```

### 📅 Interview Service (Port 3005)

```http
GET /api/v1/interviews            # Liste entretiens
GET /api/v1/interviews/:id        # Détail entretien
POST /api/v1/interviews           # Programmer entretien
PUT /api/v1/interviews/:id        # Mettre à jour
DELETE /api/v1/interviews/:id     # Annuler

GET /api/v1/interviews/upcoming   # Entretiens à venir
```

### 🔔 Notification Service (Port 3006)

```http
POST /api/v1/notifications/send-email        # Envoyer email
GET /api/v1/notifications/templates          # Templates disponibles
POST /api/v1/notifications/schedule-reminder # Programmer rappel
```

### 📊 Dashboard Service (Port 3007)

```http
GET /api/v1/dashboard/stats       # KPIs généraux
GET /api/v1/dashboard/chart-data  # Données graphiques
GET /api/v1/dashboard/timeline    # Timeline activités
GET /api/v1/dashboard/heatmap     # Heatmap calendrier
```

---

## 🔄 Workflows Métier

### 📝 Workflow Candidature

```mermaid
graph LR
    A[Créer Candidature] --> B[Status: DRAFT]
    B --> C[Envoyer] --> D[Status: SENT]
    D --> E[Programmation Auto Relance +7j]
    D --> F[Réponse Positive] --> G[Status: INTERVIEW_SCHEDULED]
    D --> H[Pas de Réponse +30j] --> I[Status: NO_RESPONSE]
    G --> J[Entretien Effectué] --> K[Status: INTERVIEWED]
    K --> L[Offre Reçue] --> M[Status: OFFER_RECEIVED]
    M --> N[Accepter] --> O[Status: ACCEPTED]
    M --> P[Refuser] --> Q[Status: WITHDRAWN]
```

### 🔔 Workflow Notifications

```mermaid
graph TD
    A[Event Trigger] --> B{Type Event}
    B -->|Candidature Envoyée| C[Programmer Relance +7j]
    B -->|Entretien Créé| D[Rappel -1j]
    B -->|Inscription| E[Email Bienvenue]
    B -->|Reset Password| F[Email Reset]
    
    C --> G[Job Cron Quotidien]
    D --> G
    G --> H[Vérifier Notifications Dues]
    H --> I[Envoyer Emails/Notifications]
```

---

## 🧪 Tests & Qualité

### 🏥 Tests de Santé (Health Checks)
Chaque service expose `/health` avec :
```json
{
  "status": "OK",
  "timestamp": "2025-10-02T21:20:00Z",
  "service": "auth-service",
  "version": "1.0.0",
  "dependencies": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### 🧪 Tests Automatisés

#### Structure Tests
```
backend/
├── tests/
│   ├── integration/           # Tests API complètes
│   │   ├── auth.test.js      # Tests authentification
│   │   ├── applications.test.js
│   │   ├── companies.test.js
│   │   └── workflows.test.js  # Tests workflows complets
│   ├── unit/                  # Tests unitaires
│   │   ├── controllers/       # Tests controllers
│   │   ├── services/          # Tests services
│   │   └── middlewares/       # Tests middlewares
│   └── fixtures/              # Données de test
├── jest.config.js             # Configuration Jest
└── setupTests.js              # Setup global
```

#### Coverage Objectifs
- **Couverture globale** : >90%
- **Couverture controllers** : >95%
- **Couverture services** : >90%
- **Couverture middlewares** : >85%

---

## 🚀 Déploiement & Infrastructure

### 🐳 Containerisation Docker

#### Services Infrastructure
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: jobbingtrack
      POSTGRES_USER: jobbingtrack
      POSTGRES_PASSWORD: jobbingtrack123
    
  redis:
    image: redis:7-alpine
    
  # 8 microservices...
```

#### Build Multi-Stage
```dockerfile
# Exemple Dockerfile service
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### 📊 Monitoring & Observabilité

#### Stack Monitoring
- **Prometheus** : Collecte métriques
- **Grafana** : Dashboards visuels
- **Jaeger** : Tracing distribué
- **Winston** : Logs structurés

#### Métriques Clés
- **Latence** : Temps réponse par endpoint
- **Throughput** : Requêtes par seconde
- **Erreurs** : Taux d'erreur par service
- **Santé** : Status services en temps réel

---

## 🔧 Configuration & Environnement

### 📁 Variables d'Environnement

#### Backend Global
```bash
NODE_ENV=development|production
PORT=3000
LOG_LEVEL=info|debug|error

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-too
JWT_EXPIRE=7d

# Redis  
REDIS_URL=redis://redis:6379

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=redacted@example.invalid
SMTP_PASS=password
SMTP_FROM="JobbingTrack <redacted@example.invalid>"

# Frontend
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

#### Par Service
Chaque service hérite des variables globales + spécifiques :
```bash
# Auth Service
AUTH_SERVICE_URL=http://auth-service:3001

# Application Service  
APPLICATION_SERVICE_URL=http://application-service:3002
```

### 🔧 Makefile Commandes

#### Développement
```bash
make dev              # Démarrage complet développement
make up               # Démarrer services existants
make down             # Arrêter tous les services
make restart          # Redémarrer tous les services
make logs             # Voir logs tous services
make logs-auth        # Logs service auth uniquement
make status           # Status containers
```

#### Base de Données
```bash
make migrate          # Exécuter migrations Prisma
make migrate-reset    # Reset complet DB
make seed             # Peupler données de test
make studio           # Ouvrir Prisma Studio
make backup           # Sauvegarde DB
make restore FILE=... # Restaurer DB
```

#### Tests & Qualité
```bash
make test             # Tous les tests
make test-unit        # Tests unitaires
make test-integration # Tests d'intégration
make test-e2e         # Tests end-to-end
make lint             # Vérification code
make format           # Formatage code
make coverage         # Couverture tests
```

#### Production
```bash
make build            # Build images production
make build-fast       # Build avec cache
make production-ready # Vérifications pré-prod
make deploy           # Déploiement
```

---

## 📊 Métriques & KPIs

### 📈 Métriques Business
- **Taux de réponse** : Candidatures avec retour / Total
- **Temps de réponse moyen** : Délai entre envoi et première réponse
- **Conversion entretiens** : Entretiens obtenus / Candidatures envoyées
- **Taux d'acceptation** : Offres acceptées / Offres reçues
- **ROI Relances** : Réponses après relance / Total relances

### 📊 Métriques Techniques
- **Latence moyenne** : <200ms pour 95% des requêtes
- **Disponibilité** : >99.9% uptime
- **Throughput** : >1000 req/sec en pointe
- **Erreurs** : <0.1% taux d'erreur

---

## 🗺️ Roadmap Technique

### 📅 Phase 1 : MVP Backend (Actuel)
- ✅ Architecture microservices 8 services
- ✅ CRUD complet toutes entités
- ✅ Authentification JWT sécurisée
- ✅ Tests automatisés basiques
- ✅ Documentation API Swagger

### 📅 Phase 2 : Dashboard Web (En cours)
- 🔄 Frontend Next.js 14 + TypeScript
- 🔄 Interface admin complète
- 🔄 Dashboard temps réel
- 🔄 Tests E2E Playwright

### 📅 Phase 3 : Mobile App (Planifié)
- 📱 React Native + Expo
- 📱 Synchronisation offline
- 📱 Notifications push natives
- 📱 Biométrie authentification

### 📅 Phase 4 : Fonctionnalités Avancées
- 🤖 IA suggestions candidatures
- 📊 Analytics prédictives  
- 🔗 Intégrations externes (LinkedIn, Indeed)
- 📧 Templates emails IA

### 📅 Phase 5 : Scale & Performance
- ☸️ Kubernetes orchestration
- 🌍 CDN global
- 🔄 Auto-scaling
- 📈 Monitoring avancé

---

## 🔗 Références & Standards

### 📚 Documentation Standards
- **OpenAPI 3.0** : Spécification API REST
- **JSON Schema** : Validation données
- **RFC 7519** : JWT tokens
- **RFC 6749** : OAuth 2.0 (futur)

### 🏗️ Architecture Patterns
- **Microservices** : Decomposition par domaine métier
- **API Gateway** : Point d'entrée unique
- **CQRS** : Séparation lecture/écriture (futur)
- **Event Sourcing** : Historique événements (futur)

### 🔒 Sécurité Standards
- **OWASP Top 10** : Prévention vulnérabilités
- **RGPD/GDPR** : Protection données personnelles
- **ISO 27001** : Sécurité information
- **SOC 2** : Contrôles sécurité (futur)

---

**📚 Ce document sert de référence technique complète pour l'équipe développement JobbingTrack**

*Version 1.0 - Dernière mise à jour : 02 Octobre 2025*