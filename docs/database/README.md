# 📊 Documentation Structure Base de Données - JobbingTrack

> **Index principal** de la documentation de la structure de la base de données JobbingTrack.

---

## 🎯 Objectif du Projet

**⚠️ IMPORTANT** : JobbingTrack est un **outil personnel de suivi de candidatures pour un chercheur d'emploi**.

- ✅ **Pour le candidat** : Suivre ses propres candidatures sur différents sites de recrutement
- ✅ **Centralisation** : Centraliser toutes les informations de ses candidatures
- ✅ **Automatisation** : Automatiser certaines tâches (relances, rappels, etc.)
- ❌ **PAS pour l'employeur** : Ce n'est PAS un outil pour gérer les candidatures reçues par une entreprise
- ❌ **PAS pour le recruteur** : Ce n'est PAS un outil ATS (Applicant Tracking System)

**L'utilisateur = Le candidat qui cherche un emploi et suit ses propres candidatures.**

---

## 🎯 Fichiers Essentiels (2 fichiers)

### 1. ⭐ **[ACTIONS_ET_MODIFICATIONS.md](ACTIONS_ET_MODIFICATIONS.md)** - **FICHIER PRINCIPAL**

**C'est ici que vous travaillez !**

- **Vos demandes de modifications** : Ajoutez vos demandes dans la section "📝 Vos Demandes de Modifications"
- **Actions à effectuer** : Toutes les actions à faire pour la structure BDD
- **Checklist complète** : Toutes les phases d'implémentation

**Comment utiliser** :
1. Ajoutez vos demandes dans la section "📝 Vos Demandes de Modifications"
2. Je donnerai mon avis technique et les actions à effectuer
3. Une fois implémenté, la demande sera déplacée dans "✅ Demandes Implémentées"

### 2. 📊 **[STRUCTURE_ACTUELLE.md](STRUCTURE_ACTUELLE.md)** - **Fichier de Référence**

**Structure actuelle de la base de données** :
- Résumé des modèles (42 modèles Prisma, 18 enums)
- Valeurs par défaut des anciens enums (ApplicationStatus, InterviewStatus, FollowUpStatus)
- Système de synchronisation
- Liste des modèles principaux, tables de jonction, listes personnalisables

### 3. 🔄 **[PRISMA_VERSIONS_ET_UPGRADE.md](PRISMA_VERSIONS_ET_UPGRADE.md)** - **Versions Prisma et mise à jour majeure**

- Versions Prisma par service (5.x, 6.x)
- Message « Update available 5.22.0 -> 7.4.2 » (major) : explication et lien vers le guide officiel
- Procédure pour une future mise à jour majeure (5/6 → 7)

---

## 📚 Documentation Complémentaire (Référence)

### Relations & Liaisons
- **[Liaisons Inter-Modèles](relations.md)** - Toutes les relations 1:N et M:N implémentées

### Structure Détaillée
- **[Structure Actuelle Complète](structure-actuelle.md)** - Vue d'ensemble détaillée de tous les modèles actuels (si besoin de détails)

---

## 🚀 Processus de Travail

### Pour Ajouter une Demande de Modification

1. **Ouvrez** `ACTIONS_ET_MODIFICATIONS.md`
2. **Ajoutez votre demande** dans la section "📝 Vos Demandes de Modifications"
3. **Dites-moi** : "Regarde `ACTIONS_ET_MODIFICATIONS.md`, j'ai ajouté une nouvelle demande"
4. **Je donnerai** mon avis technique et les actions à effectuer
5. **Une fois implémenté**, la demande sera déplacée dans "✅ Demandes Implémentées"

### Pour Consulter la Structure Actuelle

1. **Ouvrez** `STRUCTURE_ACTUELLE.md`
2. **Consultez** les valeurs par défaut, les modèles, les relations

---

## 📊 Statistiques

- **Total modèles** : 42 modèles Prisma
- **Enums** : 18 enums
- **Relations 1:N** : 20+
- **Relations M:N** : 4 (via tables de jonction)
- **Modèles applicatifs** : 12 modèles principaux
- **Modèles système** : 30 modèles (monitoring, sécurité, email, etc.)

---

## 📝 Notes Importantes

- Tous les modèles applicatifs doivent avoir des champs de synchronisation (`syncHash`, `entityHash`, `lastSyncAt`)
- Les enums `ApplicationStatus`, `InterviewStatus`, `FollowUpStatus` doivent être convertis en tables
- Le système de statuts personnalisables permet aux utilisateurs de créer leurs propres statuts
- La synchronisation utilise SHA-256 pour détecter les modifications

---

**Dernière mise à jour** : 2025-01-27
