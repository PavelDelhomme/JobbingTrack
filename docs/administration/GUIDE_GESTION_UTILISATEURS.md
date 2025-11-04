# 👥 Guide - Gestion des Utilisateurs

## 🎯 Problème résolu

La page de gestion des utilisateurs (`/backoffice/users`) retournait une erreur 404 car :
- ❌ L'API `/api/v1/users` n'existait pas dans le backend
- ❌ L'URL de l'API dans le frontend pointait vers le mauvais port (8080 au lieu de 3000)
- ❌ Aucune route n'était configurée dans l'API Gateway

## ✅ Solution mise en place

### 1. Backend - Contrôleur Users (`users.controller.js`)

Créé dans `auth-service` avec les fonctions suivantes :

#### `getAllUsers()` - Lister tous les utilisateurs
- **Accès** : ADMIN uniquement
- **Retourne** : Liste complète des utilisateurs avec leurs informations
- **Filtrage** : Exclut les utilisateurs supprimés (`deletedAt !== null`)

#### `getUserById()` - Récupérer un utilisateur spécifique
- **Accès** : Utilisateur lui-même ou ADMIN
- **Retourne** : Détails complets d'un utilisateur

#### `updateUser()` - Mettre à jour un utilisateur
- **Accès** : Utilisateur lui-même (données limitées) ou ADMIN (toutes données)
- **Champs modifiables par l'utilisateur** : firstName, lastName, phone
- **Champs modifiables par ADMIN** : isActive, role

#### `deleteUser()` - Supprimer un utilisateur
- **Accès** : ADMIN uniquement
- **Type** : Soft delete (flag `deletedAt`)
- **Protection** : Impossible de supprimer son propre compte

#### `getUserStats()` - Statistiques des utilisateurs
- **Accès** : ADMIN uniquement
- **Retourne** : total, actifs, inactifs, admins, vérifiés

### 2. Backend - Routes (`users.routes.js`)

```javascript
GET    /api/v1/users           // Liste tous les utilisateurs (ADMIN)
GET    /api/v1/users/stats     // Statistiques (ADMIN)
GET    /api/v1/users/:id       // Détails d'un utilisateur
PATCH  /api/v1/users/:id       // Mettre à jour
DELETE /api/v1/users/:id       // Supprimer (ADMIN)
```

### 3. Intégration dans le système

#### Auth Service
- ✅ Routes ajoutées dans `server.js`
- ✅ Middleware `authenticateToken` appliqué sur toutes les routes
- ✅ Vérification des rôles dans le contrôleur

#### API Gateway
- ✅ Proxy configuré : `/api/v1/users` → `auth-service:3001`
- ✅ Authentification transmise via headers

#### Frontend
- ✅ API_URL corrigée : `http://localhost:3000` (API Gateway)
- ✅ Token transmis dans les headers
- ✅ Interface complète avec recherche, filtres, actions

## 📊 Interface utilisateur

### Page principale (`/backoffice/users`)

**Statistiques** (en haut) :
```
┌─────────────────────────────────────────────────────────┐
│ Total        Actifs       Inactifs      Admins         │
│   X            Y             Z            A             │
└─────────────────────────────────────────────────────────┘
```

**Filtres** :
- 🔍 Recherche par nom ou email
- 📋 Filtre par rôle (Tous / ADMIN / USER / GUEST)
- 🔄 Bouton Actualiser

**Tableau des utilisateurs** :
- Avatar avec initiales
- Nom complet
- Email
- Rôle (badge coloré)
- Statut (Actif/Inactif - cliquable pour toggle)
- Date de création
- Actions (Éditer / Supprimer)

### Fonctionnalités

#### 1. Recherche en temps réel
- Filtre sur nom, prénom et email
- Mise à jour instantanée des résultats

#### 2. Filtrage par rôle
- **Tous** : Affiche tous les utilisateurs
- **ADMIN** : Uniquement les administrateurs
- **USER** : Uniquement les utilisateurs standards
- **GUEST** : Uniquement les invités

#### 3. Toggle Actif/Inactif
- Clic sur le badge de statut
- Mise à jour immédiate dans la base
- Rechargement automatique de la liste

#### 4. Actions
- **✏️ Éditer** : Ouvre la page de détail/édition
- **🗑️ Supprimer** : Demande confirmation puis supprime
- **Protection** : Impossible de supprimer son propre compte

## 🔒 Sécurité

### Authentification
Toutes les routes requièrent un token JWT valide transmis via header :
```javascript
Authorization: Bearer <token>
```

### Autorisations

#### Utilisateur standard
- ✅ Peut voir ses propres informations
- ✅ Peut modifier ses propres données (prénom, nom, téléphone)
- ❌ Ne peut pas voir les autres utilisateurs
- ❌ Ne peut pas modifier son rôle
- ❌ Ne peut pas se désactiver

#### Administrateur
- ✅ Peut voir tous les utilisateurs
- ✅ Peut modifier tous les utilisateurs
- ✅ Peut changer les rôles
- ✅ Peut activer/désactiver les comptes
- ✅ Peut supprimer des utilisateurs (sauf lui-même)
- ✅ Peut voir les statistiques

### Validation des données

#### Côté Backend
- Vérification du rôle avant chaque action
- Empêche l'auto-suppression
- Valide l'existence de l'utilisateur
- Filtre les champs selon les permissions

#### Côté Frontend
- Masque le bouton "Supprimer" pour son propre compte
- Affiche les actions selon les permissions
- Validation des formulaires

## 📝 Exemples d'API

### Lister tous les utilisateurs
```bash
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse** :
```json
{
  "success": true,
  "users": [
    {
      "id": "user_123",
      "email": "admin@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "2025-01-01T10:00:00.000Z",
      "lastLogin": "2025-01-03T15:30:00.000Z",
      "emailVerified": true
    }
  ],
  "total": 1
}
```

### Mettre à jour un utilisateur
```bash
curl -X PATCH http://localhost:3000/api/v1/users/user_123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

**Réponse** :
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "isActive": false
  },
  "message": "Utilisateur mis à jour avec succès"
}
```

### Supprimer un utilisateur
```bash
curl -X DELETE http://localhost:3000/api/v1/users/user_123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse** :
```json
{
  "success": true,
  "message": "Utilisateur supprimé avec succès"
}
```

### Obtenir les statistiques
```bash
curl -X GET http://localhost:3000/api/v1/users/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse** :
```json
{
  "success": true,
  "stats": {
    "total": 50,
    "active": 45,
    "inactive": 5,
    "admins": 3,
    "verified": 48
  }
}
```

## 🐛 Dépannage

### Erreur 403 (Accès refusé)
**Cause** : L'utilisateur n'a pas les droits nécessaires
**Solution** : Vérifier que l'utilisateur est ADMIN pour les actions sensibles

### Erreur 404 (Utilisateur non trouvé)
**Cause** : L'ID utilisateur n'existe pas ou est supprimé
**Solution** : Vérifier que l'utilisateur existe dans la base

### La liste est vide
**Cause** : Aucun utilisateur en base ou problème d'authentification
**Solution** :
1. Vérifier le token d'authentification
2. Vérifier que des utilisateurs existent en base
3. Vérifier les logs du auth-service

```bash
# Vérifier les utilisateurs en base
docker exec -it jobbingtrack-postgres psql -U user -d auth_db -c "SELECT id, email, role, \"isActive\" FROM \"User\" WHERE \"deletedAt\" IS NULL;"
```

### Le bouton "Supprimer" ne fonctionne pas
**Cause** : Tentative de suppression de son propre compte
**Solution** : C'est normal, la suppression de son propre compte est bloquée pour éviter les accidents

## 📁 Fichiers créés/modifiés

### Backend
- ✨ `/backend/auth-service/src/controllers/users.controller.js` - Contrôleur de gestion
- ✨ `/backend/auth-service/src/routes/users.routes.js` - Routes API
- ✏️ `/backend/auth-service/src/server.js` - Intégration des routes
- ✏️ `/backend/api-gateway/src/server.js` - Proxy vers auth-service

### Frontend
- ✏️ `/frontend/src/app/(admin)/backoffice/users/page.tsx` - Correction de l'API_URL

### Documentation
- ✨ `GUIDE_GESTION_UTILISATEURS.md` - Ce document

## 🚀 Pour tester

1. **Accéder à la page** :
```
http://localhost:8080/backoffice/users
```

2. **Vérifier que les utilisateurs s'affichent** :
- Vous devriez voir au moins votre compte administrateur
- Les statistiques devraient afficher les bons nombres

3. **Tester la recherche** :
- Taper un nom ou email dans le champ de recherche
- La liste doit se filtrer en temps réel

4. **Tester le toggle Actif/Inactif** :
- Cliquer sur le badge de statut d'un utilisateur (pas le vôtre)
- Le statut doit changer immédiatement

5. **Tester les filtres** :
- Sélectionner "Administrateurs" dans le filtre de rôle
- Seuls les admins doivent apparaître

## 💡 Améliorations futures

- [ ] Pagination pour les grandes listes
- [ ] Export des utilisateurs en CSV
- [ ] Édition en masse (activer/désactiver plusieurs utilisateurs)
- [ ] Historique des actions sur les comptes
- [ ] Réinitialisation de mot de passe par l'admin
- [ ] Envoi d'email de bienvenue
- [ ] Gestion des permissions granulaires

---

**Note** : Tous les utilisateurs listés sont ceux de la base de données PostgreSQL `auth_db`. Assurez-vous que le service `auth-service` est démarré et connecté à la base.

