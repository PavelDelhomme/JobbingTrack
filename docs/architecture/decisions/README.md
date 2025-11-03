# 🏗️ Décisions d'Architecture - JobbingTrack

[← Retour à la documentation](../../README.md) | [🧭 Navigation](../../navigation.md)

## 🎯 Vue d'ensemble

Ce dossier contient les Architecture Decision Records (ADR) et les récapitulatifs de sessions qui documentent les décisions architecturales importantes prises pour le projet JobbingTrack.

---

## 📋 Documents

### 1. [ARCHITECTURE_DECISION.md](ARCHITECTURE_DECISION.md)
**Architecture Decision Record - Base de Données**

Document détaillant la décision architecturale majeure concernant la gestion de la base de données dans une architecture microservices.

**Contenu** :
- Contexte et problème initial (duplication des données)
- Solution retenue : Database per Service avec Schémas PostgreSQL Séparés
- Justification de la décision
- Alternatives considérées (monorepo avec package partagé)
- Recommandations d'implémentation
- Références et ressources

**Date** : Octobre 2025

---

### 2. [SESSION_RECAP_ARCHITECTURE.md](SESSION_RECAP_ARCHITECTURE.md)
**Récapitulatif Session - Architecture & Metrics Aggregator**

Récapitulatif détaillé d'une session de développement majeure portant sur l'architecture DB et l'implémentation du Metrics Aggregator.

**Contenu** :
- Problèmes résolus (contact-service, metrics-aggregator)
- Architecture DB - Clarification majeure
- Fichiers créés/modifiés
- Services avec Prisma (15/17)
- Commandes de validation
- Endpoints Metrics Aggregator
- Tests à effectuer
- Documentation créée
- Prochaines étapes

**Date** : 30 Octobre 2025  
**Durée** : ~2h

---

## 🔑 Décisions Clés

### Base de Données Unique vs Séparées

**Décision** : Utiliser une base de données PostgreSQL unique avec des relations réelles (Foreign Keys)

**Justification** :
- ✅ Cohérence garantie par la DB
- ✅ Performance (JOINs natifs)
- ✅ Simplicité de développement
- ✅ Transactions atomiques possibles
- ✅ Un seul schéma par modèle métier (pas de duplication)

**Trade-offs** :
- ⚠️ Couplage DB entre services
- ⚠️ Migrations croisées à gérer
- ⚠️ Scalabilité limitée (pas de sharding facile)

### Alternative Future

Si la scalabilité devient un problème :
- Event-Driven Architecture (Kafka/RabbitMQ)
- CQRS Pattern
- Services complètement indépendants
- → Mais complexité ++, eventual consistency

---

## 📊 Impact sur l'Architecture

### Services Affectés
- ✅ auth-service
- ✅ application-service
- ✅ call-service
- ✅ company-service
- ✅ contact-service (corrigé)
- ✅ dashboard-service
- ✅ deployment-service
- ✅ event-service
- ✅ followup-service
- ✅ interview-service
- ✅ metrics-aggregator-service (nouveau)
- ✅ notification-service
- ✅ profile-service
- ✅ security-service
- ✅ workflow-service

**Total** : 15/17 services avec Prisma

---

## 🔗 Documents Connexes

### Base de Données
- [Structure Complète BDD](../../database/DATABASE_SCHEMA_COMPLETE.md)
- [Solution Architecture BDD](../../database/DATABASE_ARCHITECTURE_SOLUTION.md)
- [Guide de Migration](../../database/DATABASE_MIGRATION_GUIDE.md)
- [Récapitulatif Nouvelle Architecture](../../database/NOUVELLE_ARCHITECTURE_DB_RECAP.md)

### Architecture Générale
- [Architecture Microservices](../../core/architecture/README.md)
- [Architecture Métriques](../metrics/README.md)
- [Services Détaillés](../../core/services/README.md)

### Développement
- [Guide de Configuration](../../development/setup/README.md)
- [Workflow de Développement](../../development/workflow/README.md)
- [Guide des Tests](../../development/testing/README.md)

---

## 📚 Références Externes

- [Prisma Multi-Schema](https://www.prisma.io/docs/guides/database/multi-schema)
- [Microservices Database Patterns](https://microservices.io/patterns/data/database-per-service.html)
- [PostgreSQL Schemas](https://www.postgresql.org/docs/current/ddl-schemas.html)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)

---

**Dernière mise à jour** : Novembre 2025

