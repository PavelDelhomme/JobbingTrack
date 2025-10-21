## 🧭 Navigation Centrale

### 📖 **Documentation du Projet**
- **[Accueil](https://github.com/PavelDelhomme/JobbingTrack/blob/main/README.md)** | **[Documentation Centralisée](../README.md)**

### 🚀 **Démarrage Rapide**
- **[Guide Installation](https://github.com/PavelDelhomme/JobbingTrack/blob/main/GUIDE-DEMARRAGE-RAPIDE.md)** | **[Guide Développement](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/guides/getting-started.md)**

### 📡 **API & Intégration**
- **[Documentation API](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/api/v1/endpoints.md)** | **[API Technique](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/api.md)**

### 🚀 **Déploiement**
- **[Guide Déploiement](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/deployment/GUIDE-PORTAINER.md)** | **[Déploiement Technique](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/deployment.md)**

### 🛠️ **Outils Développement**
- **[Scripts et Makefiles](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/scripts/makefiles.md)** | **[Documentation Technique](../technical/README.md)**

### 🔧 **Documentation Technique**
- **[Architecture](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/architecture.md)** | **[Base de Données](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/database.md)** | **[Sécurité](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/security.md)** | **[Performance](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/performance.md)**

---

# 🗄️ Schémas de Base de Données JobbingTrack

Documentation complète des schémas de base de données utilisés dans JobbingTrack.

## 📋 Vue d'Ensemble

JobbingTrack utilise **PostgreSQL 15** avec **Prisma ORM** pour la gestion des données. Le schéma est conçu pour supporter une architecture multi-tenant avec séparation claire des données par utilisateur.

## 🏗️ Architecture des Données

### Principes de Conception

1. **Multi-tenancy** : Chaque utilisateur a ses propres données isolées
2. **Audit trail** : Historique complet de toutes les modifications
3. **Soft deletes** : Conservation des données supprimées pour l'audit
4. **Indexes optimisés** : Performance maximale pour les requêtes fréquentes
5. **Relations normalisées** : Éviter la redondance des données

### Entités Principales

```
User (Super Admin)
├── Applications (Candidatures)
├── Companies (Entreprises)
├── Contacts (Contacts professionnels)
├── Interviews (Entretiens)
├── Calls (Appels)
├── Events (Événements système)
├── Notifications (Notifications)
├── Documents (Fichiers)
└── Templates (Templates d'email)
```

## 📊 Schémas Détaillés

### Utilisateur (User)

```sql
CREATE TABLE "User" (
    id TEXT PRIMARY KEY DEFAULT cuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    phone TEXT,
    profilePicture TEXT,
    role UserRole DEFAULT 'USER',
    isActive BOOLEAN DEFAULT true,
    isDeleted BOOLEAN DEFAULT false,
    isArchived BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    deletedAt TIMESTAMP,
    archivedAt TIMESTAMP,
    resetToken TEXT,
    resetTokenExpiry TIMESTAMP,
    syncHash TEXT DEFAULT '',
    entityHash TEXT DEFAULT '',
    lastSyncAt TIMESTAMP
);
```

**Indexes** :
- `email` (UNIQUE)
- `role`, `isActive` (pour les requêtes d'administration)
- `createdAt` (pour les statistiques temporelles)

### Candidature (Application)

```sql
CREATE TABLE "Application" (
    id TEXT PRIMARY KEY DEFAULT cuid(),
    title TEXT NOT NULL,
    description TEXT,
    status ApplicationStatus DEFAULT 'DRAFT',
    priority ApplicationPriority DEFAULT 'NORMAL',
    companyId TEXT REFERENCES "Company"(id),
    userId TEXT NOT NULL REFERENCES "User"(id),
    contactId TEXT REFERENCES "Contact"(id),
    location TEXT,
    salaryMin DECIMAL,
    salaryMax DECIMAL,
    url TEXT,
    notes TEXT,
    tags TEXT[],
    isActive BOOLEAN DEFAULT true,
    isDeleted BOOLEAN DEFAULT false,
    isArchived BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    deletedAt TIMESTAMP,
    archivedAt TIMESTAMP,
    syncHash TEXT DEFAULT '',
    entityHash TEXT DEFAULT '',
    lastSyncAt TIMESTAMP
);
```

### Entreprise (Company)

```sql
CREATE TABLE "Company" (
    id TEXT PRIMARY KEY DEFAULT cuid(),
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    sector TEXT,
    industry TEXT,
    size CompanySize,
    location TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo TEXT,
    tags TEXT[],
    userId TEXT NOT NULL REFERENCES "User"(id),
    isActive BOOLEAN DEFAULT true,
    isDeleted BOOLEAN DEFAULT false,
    isArchived BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    deletedAt TIMESTAMP,
    archivedAt TIMESTAMP,
    syncHash TEXT DEFAULT '',
    entityHash TEXT DEFAULT '',
    lastSyncAt TIMESTAMP
);
```

### Contact (Contact)

```sql
CREATE TABLE "Contact" (
    id TEXT PRIMARY KEY DEFAULT cuid(),
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT,
    department TEXT,
    companyId TEXT REFERENCES "Company"(id),
    userId TEXT NOT NULL REFERENCES "User"(id),
    linkedin TEXT,
    notes TEXT,
    tags TEXT[],
    isActive BOOLEAN DEFAULT true,
    isDeleted BOOLEAN DEFAULT false,
    isArchived BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    deletedAt TIMESTAMP,
    archivedAt TIMESTAMP,
    syncHash TEXT DEFAULT '',
    entityHash TEXT DEFAULT '',
    lastSyncAt TIMESTAMP
);
```

### Entretien (Interview)

```sql
CREATE TABLE "Interview" (
    id TEXT PRIMARY KEY DEFAULT cuid(),
    type InterviewType NOT NULL,
    status InterviewStatus DEFAULT 'SCHEDULED',
    title TEXT NOT NULL,
    description TEXT,
    scheduledAt TIMESTAMP,
    duration INTEGER, -- en minutes
    location TEXT,
    meetingLink TEXT,
    notes TEXT,
    feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    applicationId TEXT REFERENCES "Application"(id),
    companyId TEXT REFERENCES "Company"(id),
    contactId TEXT REFERENCES "Contact"(id),
    userId TEXT NOT NULL REFERENCES "User"(id),
    isActive BOOLEAN DEFAULT true,
    isDeleted BOOLEAN DEFAULT false,
    isArchived BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    deletedAt TIMESTAMP,
    archivedAt TIMESTAMP,
    syncHash TEXT DEFAULT '',
    entityHash TEXT DEFAULT '',
    lastSyncAt TIMESTAMP
);
```

## 🔗 Relations et Contraintes

### Clés Étrangères

| Table | Référence | Contrainte |
|-------|-----------|------------|
| Application | userId | CASCADE |
| Application | companyId | SET NULL |
| Application | contactId | SET NULL |
| Company | userId | CASCADE |
| Contact | userId | CASCADE |
| Contact | companyId | SET NULL |
| Interview | userId | CASCADE |
| Interview | applicationId | CASCADE |
| Interview | companyId | SET NULL |
| Interview | contactId | SET NULL |

### Indexes de Performance

#### Indexes Composés pour Requêtes Fréquentes
```sql
-- Recherche par utilisateur et statut
CREATE INDEX idx_application_user_status ON "Application"(userId, status);
CREATE INDEX idx_application_user_active ON "Application"(userId, isActive);

-- Recherche par entreprise
CREATE INDEX idx_application_company ON "Application"(companyId);
CREATE INDEX idx_contact_company ON "Contact"(companyId);

-- Recherche par date (statistiques)
CREATE INDEX idx_application_created_at ON "Application"(createdAt);
CREATE INDEX idx_interview_scheduled_at ON "Interview"(scheduledAt);

-- Recherche full-text
CREATE INDEX idx_application_search ON "Application" USING GIN (to_tsvector('french', title || ' ' || description));
CREATE INDEX idx_company_search ON "Company" USING GIN (to_tsvector('french', name || ' ' || description));
```

## 🗃️ Énumerations (Enums)

### UserRole
```sql
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
```

### ApplicationStatus
```sql
CREATE TYPE "ApplicationStatus" AS ENUM (
    'DRAFT', 'SENT', 'IN_REVIEW', 'INTERVIEW_SCHEDULED',
    'INTERVIEW_COMPLETED', 'OFFER_RECEIVED', 'ACCEPTED',
    'REJECTED', 'WITHDRAWN', 'ARCHIVED'
);
```

### ApplicationPriority
```sql
CREATE TYPE "ApplicationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
```

### CompanySize
```sql
CREATE TYPE "CompanySize" AS ENUM ('STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');
```

### InterviewType
```sql
CREATE TYPE "InterviewType" AS ENUM ('PHONE', 'VIDEO', 'IN_PERSON', 'TECHNICAL', 'HR', 'FINAL');
```

### InterviewStatus
```sql
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');
```

## 🔄 Gestion des Versions et Migrations

### Stratégie de Migration

1. **Migrations Incrémentales** : Chaque changement est une migration séparée
2. **Rollback Possible** : Toutes les migrations sont réversibles
3. **Validation** : Tests automatiques après chaque migration
4. **Documentation** : Chaque migration est documentée

### Exemple de Migration

```sql
-- Migration: Ajout du champ salary à Application
ALTER TABLE "Application" ADD COLUMN "salaryMin" DECIMAL;
ALTER TABLE "Application" ADD COLUMN "salaryMax" DECIMAL;

-- Index pour les requêtes de salaire
CREATE INDEX idx_application_salary ON "Application"(salaryMin, salaryMax);
```

## 📊 Optimisations de Performance

### Indexes Stratégiques

#### Pour les Requêtes de Dashboard
```sql
-- Statistiques par mois
CREATE INDEX idx_application_created_month ON "Application"(date_trunc('month', createdAt));

-- Statistiques par statut
CREATE INDEX idx_application_status_active ON "Application"(status, isActive);
```

#### Pour la Recherche
```sql
-- Recherche full-text avec pondération
CREATE INDEX CONCURRENTLY idx_search_weighted ON "Application" USING GIN (
    (setweight(to_tsvector('french', title), 'A') ||
     setweight(to_tsvector('french', companyName), 'B') ||
     setweight(to_tsvector('french', description), 'C'))
);
```

### Partitionnement (Future)

Pour les tables volumineuses, implémentation de partitionnement par date :
```sql
-- Partitionnement par année pour les applications
CREATE TABLE "Application_y2024" PARTITION OF "Application" FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

## 🔒 Sécurité et Conformité

### RGPD et Protection des Données

- **Chiffrement** des données sensibles (mots de passe)
- **Anonymisation** possible des données de test
- **Audit trail** complet de toutes les actions
- **Conservation** configurable des données supprimées

### Sécurité des Requêtes

- **Prepared statements** pour éviter l'injection SQL
- **Validation des entrées** à tous les niveaux
- **Limitation des résultats** pour éviter les fuites de données
- **Masquage automatique** des données sensibles

## 📈 Monitoring et Métriques

### Tables de Monitoring

```sql
-- Métriques d'utilisation
CREATE TABLE "UsageMetrics" (
    id TEXT PRIMARY KEY DEFAULT cuid(),
    userId TEXT REFERENCES "User"(id),
    action TEXT NOT NULL,
    entityType TEXT,
    entityId TEXT,
    metadata JSONB,
    ipAddress INET,
    userAgent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Index pour les métriques
CREATE INDEX idx_usage_metrics_user_time ON "UsageMetrics"(userId, timestamp);
CREATE INDEX idx_usage_metrics_action ON "UsageMetrics"(action);
```

## 🛠️ Outils et Utilitaires

### Scripts de Maintenance

```bash
# Analyse des indexes
./scripts/database/analyze-indexes.sh

# Nettoyage des données obsolètes
./scripts/database/cleanup-old-data.sh

# Backup automatique
./scripts/database/backup.sh

# Vérification d'intégrité
./scripts/database/integrity-check.sh
```

### Monitoring avec pg_stat_statements

```sql
-- Activer l'extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Requête la plus lente
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

Cette architecture de base de données assure **performance**, **sécurité** et **maintenabilité** pour la plateforme JobbingTrack.
