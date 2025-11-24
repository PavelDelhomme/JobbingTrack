# 📊 Documentation Structure Base de Données - JobbingTrack

> **Index principal** de la documentation complète de la structure de la base de données JobbingTrack.

---

## 📚 Navigation Rapide

### 📋 Vue d'Ensemble
- **[Structure Actuelle](structure-actuelle.md)** - Vue d'ensemble de tous les modèles actuels
- **[Structure Souhaitée](structure-souhaitee.md)** - Spécifications pour la structure future

### 🔗 Relations & Liaisons
- **[Liaisons Inter-Modèles](relations.md)** - Toutes les relations 1:N et M:N implémentées

### 🔄 Systèmes Avancés
- **[Système de Synchronisation](synchronisation.md)** - Synchronisation avec hash (SHA-256)
- **[Système de Statuts Personnalisables](statuts-personnalisables.md)** - Statuts par défaut et personnalisés par utilisateur

### 📝 Détails Techniques
- **[Modèles Principaux](models-principaux.md)** - Types de données complets pour tous les modèles applicatifs
- **[Tables de Jonction](tables-jonction.md)** - Tables M:N avec types détaillés
- **[Listes Personnalisables](listes-personnalisables.md)** - Platform, FollowUpType, InterviewType, etc.
- **[Enums](enums.md)** - Tous les enums (18 enums)

### 📊 Modèles par Service
- **[Modèles Email](models-email.md)** - EmailLog, EmailTemplate (auth-service)
- **[Modèles Préférences](models-preferences.md)** - UserCustomization (auth-service)
- **[Modèles Monitoring](models-monitoring.md)** - Métriques et logs (metrics-aggregator-service)
- **[Modèles Sécurité](models-securite.md)** - SecurityLog, Vulnerability, etc. (security-service)

### 🎯 Valeurs par Défaut
- **[Valeurs par Défaut Enums](valeurs-par-defaut.md)** - Statuts système à créer lors de la migration

### 🔧 Migration & Implémentation
- **[Modifications Nécessaires](modifications-necessaires.md)** - Checklist des changements à effectuer
- **[Scripts de Migration](scripts-migration.md)** - Scripts à créer pour la migration

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

1. **Comprendre la structure actuelle** : Commencez par [Structure Actuelle](structure-actuelle.md)
2. **Voir les relations** : Consultez [Liaisons Inter-Modèles](relations.md)
3. **Comprendre les systèmes** : Lisez [Système de Synchronisation](synchronisation.md) et [Système de Statuts](statuts-personnalisables.md)
4. **Planifier les modifications** : Voir [Modifications Nécessaires](modifications-necessaires.md)

---

## 📝 Notes Importantes

- Tous les modèles applicatifs doivent avoir des champs de synchronisation (`syncHash`, `entityHash`, `lastSyncAt`)
- Les enums `ApplicationStatus`, `InterviewStatus`, `FollowUpStatus` doivent être convertis en tables
- Le système de statuts personnalisables permet aux utilisateurs de créer leurs propres statuts
- La synchronisation utilise SHA-256 pour détecter les modifications

---

**Dernière mise à jour** : 2025-01-27
