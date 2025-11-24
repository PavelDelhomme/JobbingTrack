# 📊 Structure Base de Données - JobbingTrack

> **Index principal** de la documentation complète de la structure de la base de données JobbingTrack.

**📄 Documentation complète** : Voir [docs/database/README.md](docs/database/README.md)

---

## 🚀 Navigation Rapide

### 📋 Vue d'Ensemble
- **[Structure Actuelle](docs/database/structure-actuelle.md)** - Vue d'ensemble de tous les modèles actuels
- **[Structure Souhaitée](docs/database/structure-souhaitee.md)** - Spécifications pour la structure future

### 🔗 Relations & Liaisons
- **[Liaisons Inter-Modèles](docs/database/relations.md)** - Toutes les relations 1:N et M:N implémentées

### 🔄 Systèmes Avancés
- **[Système de Synchronisation](docs/database/synchronisation.md)** - Synchronisation avec hash (SHA-256)
- **[Système de Statuts Personnalisables](docs/database/statuts-personnalisables.md)** - Statuts par défaut et personnalisés par utilisateur

### 📝 Détails Techniques
- **[Modèles Principaux](docs/database/models-principaux.md)** - Types de données complets pour tous les modèles applicatifs
- **[Tables de Jonction](docs/database/tables-jonction.md)** - Tables M:N avec types détaillés
- **[Listes Personnalisables](docs/database/listes-personnalisables.md)** - Platform, FollowUpType, InterviewType, etc.
- **[Enums](docs/database/enums.md)** - Tous les enums (18 enums)

### 📊 Modèles par Service
- **[Modèles Email](docs/database/models-email.md)** - EmailLog, EmailTemplate (auth-service)
- **[Modèles Préférences](docs/database/models-preferences.md)** - UserCustomization (auth-service)
- **[Modèles Monitoring](docs/database/models-monitoring.md)** - Métriques et logs (metrics-aggregator-service)
- **[Modèles Sécurité](docs/database/models-securite.md)** - SecurityLog, Vulnerability, etc. (security-service)

### 🎯 Valeurs par Défaut
- **[Valeurs par Défaut Enums](docs/database/valeurs-par-defaut.md)** - Statuts système à créer lors de la migration

### 🔧 Migration & Implémentation
- **[Modifications Nécessaires](docs/database/modifications-necessaires.md)** - Checklist des changements à effectuer
- **[Scripts de Migration](docs/database/scripts-migration.md)** - Scripts à créer pour la migration

---

## 📊 Statistiques

- **Total modèles** : 42 modèles Prisma
- **Enums** : 18 enums
- **Relations 1:N** : 20+
- **Relations M:N** : 4 (via tables de jonction)
- **Modèles applicatifs** : 12 modèles principaux
- **Modèles système** : 30 modèles (monitoring, sécurité, email, etc.)

---

## 🚀 Démarrage Rapide

1. **Comprendre la structure actuelle** : Commencez par [Structure Actuelle](docs/database/structure-actuelle.md)
2. **Voir les relations** : Consultez [Liaisons Inter-Modèles](docs/database/relations.md)
3. **Comprendre les systèmes** : Lisez [Système de Synchronisation](docs/database/synchronisation.md) et [Système de Statuts](docs/database/statuts-personnalisables.md)
4. **Planifier les modifications** : Voir [Modifications Nécessaires](docs/database/modifications-necessaires.md)

---

## 📝 Notes Importantes

- Tous les modèles applicatifs doivent avoir des champs de synchronisation (`syncHash`, `entityHash`, `lastSyncAt`)
- Les enums `ApplicationStatus`, `InterviewStatus`, `FollowUpStatus` doivent être convertis en tables
- Le système de statuts personnalisables permet aux utilisateurs de créer leurs propres statuts
- La synchronisation utilise SHA-256 pour détecter les modifications

---

**Dernière mise à jour** : 2025-01-27
