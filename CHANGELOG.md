# Changelog - JobbingTrack

Tous les changements notables du projet JobbingTrack seront documentés dans ce fichier.

---

## [2.0.0] - 2025-10-10 - Dashboard Admin Complet

### 🎉 Ajouté

#### Système de Permissions
- **JWT enrichi** : Le token contient maintenant `userId`, `email` et `role`
- **3 niveaux de rôles** : USER, ADMIN, SUPER_ADMIN
- **Middleware de permissions** dans tous les services
- **Routes admin protégées** avec vérification du rôle

#### Gestion de la Corbeille
- **Page Trash Management** (`/backoffice/trash`)
  - Vue globale des éléments supprimés
  - Filtres par type d'entité
  - Recherche dans la corbeille
  - Restauration des éléments
  - Suppression définitive
  - Vidage complet (SUPER_ADMIN only)
  
- **API Corbeille** (`/api/v1/admin/trash`)
  - GET `/trash` : Liste tous les éléments supprimés
  - POST `/trash/:type/:id/restore` : Restaure un élément
  - DELETE `/trash/:type/:id/permanent` : Supprime définitivement
  - POST `/trash/empty` : Vide la corbeille

#### Champs de Suppression Avancés
Sur tous les modèles (Application, Interview, Contact, FollowUp, Call, Company, User) :
- `deletedAt` : Date de mise à la corbeille
- `archivedAt` : Date d'archivage
- `deletedBy` : ID de l'admin qui a supprimé
- `adminDeletedAt` : Date de suppression par admin
- `canRestore` : Indicateur de possibilité de restauration

#### Nouveaux Modèles Prisma
- **Call** : Gestion des appels téléphoniques
  - Lié aux candidatures et contacts
  - Types : OUTGOING, INCOMING, MISSED
  - Statuts : SCHEDULED, COMPLETED, CANCELLED, etc.
  
- **ApplicationContact** : Liaison N-N entre applications et contacts
  - Permet d'associer plusieurs contacts à une candidature
  - Rôle du contact (Recruteur, Manager, RH)
  - Contact principal (isPrimary)

#### Scheduler CRON (5 jobs)
- **Nettoyage automatique** : Supprime éléments > 30 jours (2h00 quotidien)
- **Rappels entretiens** : Notifie les entretiens à venir (8h00 quotidien)
- **Rappels relances** : Notifie les relances du jour (10h00 quotidien)
- **Workflows** : Traite les exécutions en attente (toutes les heures)
- **Auto-followup** : Détecte candidatures à relancer (9h00 quotidien)

#### Logs en Temps Réel
- **Server-Sent Events** (SSE) pour streamer les logs Docker
- Endpoint `/api/v1/admin/logs/:serviceName/stream`
- Reconnexion automatique
- Buffer des 50 dernières lignes

#### Scripts de Synchronisation
- `backend/sync-all-schemas.py` : Synchronise schémas Prisma
- `backend/add-advanced-deletion-fields.py` : Ajoute champs suppression
- `backend/fix-schema-duplicates.py` : Corrige doublons
- `backend/fix-all-schemas.sh` : Copie schéma référence
- `backend/test-admin-features.sh` : Tests automatisés
- `apply-updates.sh` : Script de déploiement complet

### 🔧 Modifié

#### Backend
- `backend/auth-service/src/controllers/auth.controller.js`
  - Ajout du rôle dans le JWT (register, login, refreshToken)
  
- `backend/auth-service/src/middlewares/auth.middleware.js`
  - Extraction du rôle depuis le JWT
  - Récupération du rôle depuis la BDD
  
- `backend/*/src/middlewares/auth.middleware.js` (tous les services)
  - Extraction du rôle dans tous les middlewares
  
- `backend/api-gateway/src/server.js`
  - Routes admin déplacées AVANT les routes proxy
  - Meilleure gestion de l'ordre des middlewares
  
- `backend/api-gateway/src/routes/admin.routes.js`
  - Middleware authenticate extrait le rôle
  - Routes trash ajoutées
  - Routes logs stream ajoutées
  
- `backend/api-gateway/src/controllers/logs.controller.js`
  - Ajout fonction `streamServiceLogs()` pour SSE
  
- `backend/workflow-service/src/jobs/cronScheduler.js`
  - 3 nouvelles tâches CRON ajoutées
  - Logs améliorés au démarrage

#### Frontend
- `frontend/src/components/AdminLayout.tsx`
  - Lien "Corbeille" ajouté au menu

#### Schémas Prisma (12 services)
- Modèles Call et ApplicationContact ajoutés
- Champs deletedAt, archivedAt ajoutés à tous les modèles
- Champs deletedBy, adminDeletedAt, canRestore ajoutés
- Enums CallType et CallStatus ajoutés
- Relations bidirectionnelles corrigées

### 🐛 Corrigé

- **404 sur routes admin** : Routes maintenant accessibles
- **403 Forbidden sur actions admin** : Permissions fonctionnelles
- **JWT sans rôle** : Rôle maintenant inclus dans le token
- **Schémas désynchronisés** : Tous les services synchronisés
- **Relations Prisma manquantes** : Corrigées via `prisma format`
- **Doublons dans schémas** : Script de correction créé et exécuté
- **Application service offline** : Stabilité améliorée

### 🗑️ Supprimé

- Scripts Python temporaires (gardés pour référence)
- Doublons de champs dans les schémas Prisma

### 🔒 Sécurité

- Vérification du rôle sur toutes les routes admin
- Middleware d'authentification renforcé
- Traçabilité des suppressions (deletedBy)
- Permissions granulaires (ADMIN vs SUPER_ADMIN)
- Logs d'audit sur actions sensibles

---

## [1.0.0] - 2025-10-09 - Migration Microservices

### Ajouté
- Architecture microservices (12 services)
- API Gateway
- PostgreSQL et Redis
- Docker Compose orchestration
- Health checks sur tous les services

---

## Notes de Version

### Breaking Changes
Aucun - Rétrocompatible

### Migrations Required
✅ Migration SQL appliquée : `backend/apply-migrations.sql`

### Dependencies Updated
- Prisma : Schémas mis à jour
- JWT : Payload étendu avec rôle

---

**Voir `MODIFICATIONS-COMPLETES.md` pour la documentation technique complète.**

