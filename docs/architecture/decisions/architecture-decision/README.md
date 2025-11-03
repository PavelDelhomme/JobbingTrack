# 🏗️ Architecture Decision Record - Base de Données

## Contexte

JobbingTrack est une application de suivi de candidatures avec une architecture microservices.

## Problème Initial

Chaque service avait son propre schéma Prisma avec des modèles dupliqués :
- `User` défini dans 15 services
- `Company` défini dans 10 services
- `Application` défini dans 8 services
- etc.

**Conséquences** :
- Duplication massive des données
- Impossible de créer des relations réelles entre modèles
- Synchronisation complexe et source d'erreurs
- Overhead de maintenance

## Décision

### ✅ Solution Retenue : **Database per Service avec Schémas PostgreSQL Séparés**

Utiliser PostgreSQL avec des **schémas séparés** (namespaces) mais une **seule base de données**.

```sql
-- Base de données unique
CREATE DATABASE jobbingtrack;

-- Schémas séparés par domaine
CREATE SCHEMA auth;      -- Utilisateurs, authentification
CREATE SCHEMA core;      -- Modèles partagés (Company, Platform)
CREATE SCHEMA applications; -- Candidatures
CREATE SCHEMA contacts;  -- Contacts
CREATE SCHEMA calls;     -- Appels
CREATE SCHEMA interviews; -- Entretiens
CREATE SCHEMA events;    -- Événements calendrier
CREATE SCHEMA followups; -- Relances
CREATE SCHEMA notifications; -- Notifications
CREATE SCHEMA metrics;   -- Métriques (metrics-aggregator)
```

### Structure des Modèles

#### 1️⃣ **Schéma `auth`** (auth-service)
```prisma
// User est LA source de vérité
model User {
  id             String  @id @default(cuid())
  email          String  @unique
  firstName      String
  lastName       String
  // ... tous les champs
  
  @@schema("auth")
}
```

#### 2️⃣ **Schéma `core`** (Modèles partagés)
```prisma
// Company est LA source de vérité
model Company {
  id          String   @id @default(cuid())
  userId      String
  name        String
  // ...
  
  user        User     @relation(fields: [userId], references: [id], map: "auth.User")
  
  @@schema("core")
}

model Platform {
  id          String   @id @default(cuid())
  name        String   @unique
  // ...
  
  @@schema("core")
}
```

#### 3️⃣ **Schéma `applications`** (application-service)
```prisma
model Application {
  id              String   @id @default(cuid())
  userId          String   // FK vers auth.User
  companyId       String   // FK vers core.Company
  platformId      String?  // FK vers core.Platform
  // ...
  
  user            User     @relation(fields: [userId], references: [id], map: "auth.User")
  company         Company  @relation(fields: [companyId], references: [id], map: "core.Company")
  platform        Platform? @relation(fields: [platformId], references: [id], map: "core.Platform")
  
  // Relations vers autres schémas
  contacts        ContactApplication[] // contacts.ContactApplication
  interviews      Interview[]          // interviews.Interview
  calls           Call[]               // calls.Call
  
  @@schema("applications")
}
```

#### 4️⃣ **Schéma `contacts`** (contact-service)
```prisma
model Contact {
  id              String   @id @default(cuid())
  userId          String   // FK vers auth.User
  companyId       String?  // FK vers core.Company
  // ...
  
  user            User     @relation(fields: [userId], references: [id], map: "auth.User")
  company         Company? @relation(fields: [companyId], references: [id], map: "core.Company")
  
  @@schema("contacts")
}

// Table de jonction
model ContactApplication {
  id            String   @id @default(cuid())
  contactId     String   // FK vers contacts.Contact
  applicationId String   // FK vers applications.Application
  
  contact       Contact     @relation(fields: [contactId], references: [id])
  application   Application @relation(fields: [applicationId], references: [id], map: "applications.Application")
  
  @@schema("contacts")
}
```

### Avantages de cette Approche

1. **Séparation logique** : Chaque service gère son domaine
2. **Relations réelles** : Les FK PostgreSQL garantissent la cohérence
3. **Scalabilité** : Facile de migrer un schéma vers une DB séparée si nécessaire
4. **Performance** : Toutes les données dans une DB = JOINs rapides
5. **Migrations** : Chaque service gère ses migrations
6. **Backup** : Une seule DB à sauvegarder

### Désavantages

1. **Couplage DB** : Tous les services dépendent de la même DB
2. **Migrations croisées** : Changements dans `auth.User` impactent tous les services
3. **Scalabilité limitée** : Pas de sharding facile

## Alternative : Monorepo avec Package Partagé

Si les désavantages sont bloquants, utiliser un **monorepo** :

```
packages/
├── @jobbingtrack/database/       # Package npm partagé
│   ├── prisma/
│   │   └── schema.prisma        # TOUS les modèles
│   ├── src/
│   │   └── index.js            # Export { prisma }
│   └── package.json
└── services/
    ├── auth-service/
    │   └── package.json         # "@jobbingtrack/database": "workspace:*"
    ├── contact-service/
    └── ...
```

**Outils** :
- [Turborepo](https://turbo.build/repo)
- [Nx](https://nx.dev/)
- [Yarn Workspaces](https://yarnpkg.com/features/workspaces)
- [pnpm Workspaces](https://pnpm.io/workspaces)

## Recommandation Finale

**Pour JobbingTrack** : Utiliser **PostgreSQL Schemas** (Option 1)

### Phase 1 (Maintenant)
- Garder DB unique avec schémas séparés
- Chaque service a son schéma Prisma **complet** (avec références croisées)
- Migrations coordonnées

### Phase 2 (Si scalabilité nécessaire)
- Migrer vers Event Sourcing + CQRS
- Séparer les DBs
- Utiliser Kafka/RabbitMQ pour la synchronisation

## Implémentation

### 1. Créer un Schéma Prisma Global

```bash
backend/
├── shared/
│   └── prisma/
│       └── schema.prisma     # TOUS les modèles avec @@schema()
```

### 2. Générer le Client Prisma Partagé

```bash
cd backend/shared
npx prisma generate
```

### 3. Utiliser dans les Services

```javascript
// auth-service/src/index.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Accès uniquement au schéma auth
const users = await prisma.user.findMany();
```

### 4. Configuration DATABASE_URL

Chaque service peut avoir sa propre DATABASE_URL pointant vers le même PostgreSQL mais avec `schema=` différent :

```env
# auth-service
DATABASE_URL=postgresql://user:pass@postgres:5432/jobbingtrack?schema=auth

# contact-service  
DATABASE_URL=postgresql://user:pass@postgres:5432/jobbingtrack?schema=contacts

# Mais Prisma gère automatiquement les schémas croisés !
```

## Références

- [Prisma Multi-Schema](https://www.prisma.io/docs/guides/database/multi-schema)
- [Microservices Database Patterns](https://microservices.io/patterns/data/database-per-service.html)
- [PostgreSQL Schemas](https://www.postgresql.org/docs/current/ddl-schemas.html)
