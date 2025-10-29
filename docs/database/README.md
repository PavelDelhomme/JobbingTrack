# 📊 Base de Données - JobbingTrack

[← Retour au README principal](../../README.md)

## 🎯 Vue d'ensemble

Documentation complète et centralisée de la base de données PostgreSQL de JobbingTrack, incluant l'architecture microservices, les analyses comparatives et les guides de migration.

---

## 📂 Structure de la Documentation

```
docs/database/
├── README.md (ce fichier)
├── architecture/
│   ├── database.md (structure complète v4.1)
│   └── services.md (microservices détaillés)
├── schemas/
│   ├── main-schema.prisma (schéma principal)
│   ├── auth-service.prisma (authentification)
│   ├── call-service.prisma (appels)
│   ├── event-service.prisma (événements)
│   ├── interview-service.prisma (entretiens)
│   ├── followup-service.prisma (relances)
│   └── workflow-service.prisma (automatisation)
├── analysis/
│   ├── data-structure-analysis.md (analyse initiale)
│   ├── microservice-architecture-issues.md (problèmes identifiés)
│   ├── microservice-architecture-resolved.md (solutions implémentées)
│   └── database-structure-comparison.md (comparaison spécification/implémentation)
└── migration/
    ├── migration-guide.md (guide de migration)
    └── scripts/ (scripts utilitaires)
```

---

## 🚀 Architecture Actuelle

### ✅ **Statut** : Architecture Unifiée et Optimisée

#### Configuration Recommandée :
```yaml
# docker-compose.yml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: jobbingtrack
    POSTGRES_USER: jobbingtrack
    POSTGRES_PASSWORD: jobbingtrack123
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U jobbingtrack -d jobbingtrack"]
    interval: 10s
    timeout: 5s
    retries: 5
```

#### Services Configurés :
- ✅ **Auth Service** : Utilisateurs et authentification
- ✅ **Application Service** : Candidatures et entreprises
- ✅ **Contact Service** : Gestion des contacts
- ✅ **Call Service** : Appels téléphoniques
- ✅ **Event Service** : Calendrier et événements
- ✅ **Interview Service** : Entretiens
- ✅ **FollowUp Service** : Relances
- ✅ **Workflow Service** : Automatisation
- ✅ **Security Service** : Sécurité et logs

---

## 📋 Services et Responsabilités

### Microservices Base de Données

| Service | Modèle Principal | Fonctionnalité | Schéma |
|---------|------------------|----------------|---------|
| **Auth Service** | User | Authentification, sessions | Complet avec relations |
| **Call Service** | Call | Appels, historique | Complet + relations |
| **Event Service** | Event | Calendrier, rappels | Complet + polymorphique |
| **Interview Service** | Interview | Entretiens, RH | Complet + contacts |
| **FollowUp Service** | FollowUp | Relances, emails | Complet + suivi |
| **Workflow Service** | Workflow | Automatisation, processus | Complet + templates |

### Cohérence des Données
- ✅ **Base unique** : PostgreSQL partagée
- ✅ **Schémas cohérents** : Modèles alignés
- ✅ **Relations bidirectionnelles** : Many-to-many fonctionnelles
- ✅ **Migrations synchronisées** : Évolution coordonnée

---

## 🔧 Configuration Prisma

### Configuration Partagée
```prisma
// Configuration commune
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Variables d'Environnement
```bash
# .env
DATABASE_URL="postgresql://user:pass@localhost:5432/jobbingtrack"
PRISMA_GENERATE_DATAPROXY=true
NODE_ENV="production"
```

---

## 📊 Modèles Principaux

### Entités Métier
- **User** : Utilisateurs avec rôles et permissions
- **Application** : Candidatures avec statuts détaillés
- **Company** : Entreprises avec secteurs et tailles
- **Contact** : Contacts avec relations many-to-many
- **Interview** : Entretiens avec feedback
- **FollowUp** : Relances avec suivi des réponses
- **Call** : Appels avec durées et statuts
- **Event** : Événements avec relations polymorphes

### Fonctionnalités Avancées
- **Historique** : ApplicationStatusHistory
- **Notifications** : Multi-canaux (email, push, SMS, in-app)
- **Documents** : Gestion avec versions
- **Synchronisation** : SyncQueue pour offline
- **Sécurité** : Logs et alertes temps réel
- **Workflows** : Automatisation personnalisable

---

## 🎯 Points d'Entrée Recommandés

### Développement
```bash
# Migration des schémas
npx prisma migrate dev --name init

# Génération des clients
npx prisma generate

# Studio Prisma (interface web)
npx prisma studio
```

### Production
```bash
# Migration en production
npx prisma migrate deploy

# Backup de la base
pg_dump jobbingtrack > backup.sql

# Monitoring
npx prisma studio --browser none
```

---

## 📈 Performance et Optimisation

### Index Stratégiques
- **Applications** : user_id, status, company_id, created_at
- **Contacts** : user_id, company_id, email, last_contact_date
- **Events** : user_id, start_date, type
- **Calls** : user_id, application_id, call_date, status
- **Workflows** : user_id, type, status, is_active

### Optimisations Appliquées
- ✅ **Index composites** pour requêtes multi-colonnes
- ✅ **Index partiels** pour données actives
- ✅ **Contraintes d'unicité** optimisées
- ✅ **Cascade deletes** configurées

---

## 🔍 Monitoring et Maintenance

### Métriques à Surveiller
- **Temps de réponse** des requêtes complexes
- **Utilisation des index** via `pg_stat_user_indexes`
- **Taille des tables** et croissance
- **Locks** et conflits de concurrence

### Scripts Utilitaires
```bash
# Analyse des performances
./scripts/database/performance-analysis.sh

# Vérification de cohérence
./scripts/database/consistency-check.sh

# Backup automatisé
./scripts/database/backup.sh
```

---

## 🚨 Alertes et Actions

### Si Problèmes Détectés :
1. **Cohérence** : Vérifier les relations many-to-many
2. **Performance** : Analyser les plans d'exécution
3. **Migration** : Tester en environnement de staging
4. **Backup** : Sauvegarder avant toute modification

### Support :
- 📖 [Documentation API](../../api/api-reference.md)
- 🏗️ [Architecture](../../core/architecture.md)
- 🔒 [Sécurité](../../security/guide.md)

---

## 📚 Ressources Supplémentaires

### Documentation Technique
- [Architecture Microservices](../../core/services.md)
- [Guide de Déploiement](../../deployment/production.md)
- [Variables d'Environnement](../../environment-variables.md)

### Outils et Utilitaires
- [Prisma Studio](https://www.prisma.io/studio) - Interface web
- [pgAdmin](https://www.pgadmin.org/) - Administration PostgreSQL
- [Explain Analyze](https://www.postgresql.org/docs/current/using-explain.html) - Optimisation

---

**Version** : 4.1 - Architecture Microservices Unifiée
**Dernière mise à jour** : 27 octobre 2025
**Responsable** : Architecture et Base de Données
