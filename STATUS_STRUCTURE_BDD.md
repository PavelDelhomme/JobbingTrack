# 📊 Structure Base de Données - JobbingTrack

> **Index principal** de la documentation complète de la structure de la base de données JobbingTrack.

---

## 🎯 FICHIERS PRINCIPAUX

### ⭐ **Pour vos demandes de modifications** : [docs/database/MODIFICATIONS_DEMANDEES.md](docs/database/MODIFICATIONS_DEMANDEES.md)
**👉 C'est ici que vous ajoutez vos demandes de modifications de structure BDD. Je donnerai mon avis et les actions à effectuer.**

### 📋 **Pour les actions à effectuer** : [docs/STRUCTURE_BDD_ACTIONS.md](docs/STRUCTURE_BDD_ACTIONS.md)

**📋 Ce fichier contient TOUTES les actions à faire** :
- ✅ Checklist complète pour système de statuts personnalisables
- ✅ Checklist pour champs de synchronisation
- ✅ Scripts de migration à créer
- ✅ Phases d'implémentation (6 phases)
- ✅ Fichiers à créer/modifier
- ✅ Tests à effectuer

**👉 C'est votre guide principal pour travailler sur la structure BDD !**

---

## 📚 Documentation Complète

**📄 Index Documentation** : [docs/database/README.md](docs/database/README.md)

### 📋 Vue d'Ensemble
- **[Structure Actuelle](docs/database/structure-actuelle.md)** - Vue d'ensemble de tous les modèles actuels (42 modèles)
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
- **[Valeurs par Défaut Enums](docs/database/valeurs-par-defaut.md)** - Statuts système à créer (12 ApplicationStatus, 5 InterviewStatus, 5 FollowUpStatus)

### 🔧 Migration & Implémentation
- **[Actions Nécessaires](docs/STRUCTURE_BDD_ACTIONS.md)** - **⭐ FICHIER PRINCIPAL** - Checklist complète de toutes les actions
- **[Modifications Nécessaires](docs/database/modifications-necessaires.md)** - Détails des modifications au schéma
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

## 🚀 Démarrage Rapide - Par Où Commencer ?

### 1️⃣ **Pour Travailler sur la Structure BDD** (RECOMMANDÉ)
👉 **Commencez par** : [docs/STRUCTURE_BDD_ACTIONS.md](docs/STRUCTURE_BDD_ACTIONS.md)
- Ce fichier contient TOUTES les actions à faire
- Checklist complète avec phases d'implémentation
- Scripts à créer, fichiers à modifier
- **C'est votre guide principal !**

### 2️⃣ **Pour Comprendre la Structure Actuelle**
1. **Vue d'ensemble** : [Structure Actuelle](docs/database/structure-actuelle.md) - 42 modèles Prisma
2. **Relations** : [Liaisons Inter-Modèles](docs/database/relations.md) - Relations 1:N et M:N
3. **Systèmes** : 
   - [Système de Synchronisation](docs/database/synchronisation.md) - Hash SHA-256
   - [Système de Statuts](docs/database/statuts-personnalisables.md) - Statuts personnalisables

### 3️⃣ **Pour Voir les Valeurs par Défaut**
👉 [Valeurs par Défaut Enums](docs/database/valeurs-par-defaut.md) - 12 ApplicationStatus, 5 InterviewStatus, 5 FollowUpStatus

### 4️⃣ **Pour la Documentation Technique Complète**
👉 [Index Documentation BDD](docs/database/README.md) - Tous les fichiers organisés

---

## 📝 Notes Importantes

- Tous les modèles applicatifs doivent avoir des champs de synchronisation (`syncHash`, `entityHash`, `lastSyncAt`)
- Les enums `ApplicationStatus`, `InterviewStatus`, `FollowUpStatus` doivent être convertis en tables
- Le système de statuts personnalisables permet aux utilisateurs de créer leurs propres statuts
- La synchronisation utilise SHA-256 pour détecter les modifications

---

**Dernière mise à jour** : 2025-01-27
