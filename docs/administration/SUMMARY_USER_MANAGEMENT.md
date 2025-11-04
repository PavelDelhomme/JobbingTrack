# 👥 Système Complet de Gestion des Utilisateurs

## ✅ Fonctionnalités Implémentées

### 1. **Endpoints Backend**  (/api/v1/users)

#### Routes CRUD Utilisateurs
- ✅ `GET /api/v1/users` - Lister tous les utilisateurs (alias vers `/api/v1/auth/users`)
- ✅ `GET /api/v1/users/:id` - Récupérer un utilisateur par ID
- ✅ `PUT /api/v1/users/:id` - Mettre à jour un utilisateur
- ✅ `DELETE /api/v1/users/:id` - Supprimer un utilisateur

#### Routes d'Administration
- ✅ `PUT /api/v1/users/:id/role` - Modifier le rôle d'un utilisateur
- ✅ `PUT /api/v1/users/:id/status` - Activer/désactiver un compte
- ✅ `POST /api/v1/users/:id/impersonate` - Se connecter en tant qu'un autre utilisateur

#### Routes de Vérification Email
- ✅ `POST /api/v1/users/:id/send-verification` - Envoyer un email de vérification
- ✅ `POST /api/v1/users/:id/resend-verification` - Renvoyer l'email de vérification
- ✅ `GET /api/v1/auth/verify-email/:token` - Vérifier l'email avec le token

---

### 2. **Schéma Base de Données**

```prisma
model User {
  // ... champs existants ...
  
  // ✅ NOUVEAUX CHAMPS
  emailVerified          Boolean   @default(false)
  emailVerificationToken String?
  emailVerifiedAt        DateTime?
  lastLoginAt            DateTime?
  loginCount             Int       @default(0)
}
```

---

### 3. **Impersonalisation Utilisateur** 🎭

L'impersonalisation permet aux administrateurs de se connecter en tant qu'un autre utilisateur pour le débogage ou le support.

**Comment ça marche** :
1. L'admin appelle `POST /api/v1/users/:id/impersonate`
2. Un token JWT spécial est créé avec :
   - Les données de l'utilisateur cible
   - Une propriété `impersonating: true`
   - L'ID de l'admin dans `impersonatedBy`
3. Le token expire après 2 heures (sécurité)
4. Tous les logs indiquent que c'est une impersonalisation

**Exemple de requête** :
```bash
curl -X POST http://localhost:3000/api/v1/users/USER_ID/impersonate \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Réponse** :
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER"
  },
  "message": "Vous êtes maintenant connecté en tant que John Doe",
  "impersonatedBy": {
    "id": "admin-id",
    "email": "admin@jobbingtrack.com"
  }
}
```

---

### 4. **Système de Vérification Email** ✉️

#### Inscription
1. L'utilisateur s'inscrit via `/api/v1/auth/register`
2. Un token de vérification est automatiquement généré
3. Un email de bienvenue est envoyé (async, n'échoue pas l'inscription)

#### Vérification
1. L'utilisateur clique sur le lien dans l'email : `http://localhost:3000/verify-email/TOKEN`
2. Le frontend appelle `GET /api/v1/auth/verify-email/TOKEN`
3. Le compte est marqué comme vérifié

#### Renvoyer l'Email
```bash
POST /api/v1/users/:id/resend-verification
Authorization: Bearer TOKEN
```

---

### 5. **Tracking des Connexions** 📊

À chaque connexion réussie :
- ✅ `lastLoginAt` est mis à jour avec l'heure actuelle
- ✅ `loginCount` est incrémenté de 1

Ces données permettent de :
- Détecter les comptes inactifs
- Analyser l'engagement des utilisateurs
- Afficher "Dernière connexion le..."

---

### 6. **Frontend Corrigé** 🖥️

Le frontend `/backoffice/users` utilise maintenant les bons endpoints :

**Avant** ❌ :
```typescript
await axios.get(`${API_URL}/api/v1/users`)  // 404
```

**Après** ✅ :
```typescript
await axios.get(`${API_URL}/api/v1/auth/users`)  // 200
```

---

## 📋 Migrations à Exécuter

### 1. Générer le client Prisma
```bash
cd backend/auth-service
npx prisma generate
```

### 2. Appliquer les migrations
```bash
# Option 1: Migration propre (recommandé en production)
npx prisma migrate dev --name add_email_verification_and_login_tracking

# Option 2: Push direct (dev/test)
npx prisma db push
```

### 3. Redémarrer le service
```bash
docker-compose restart auth-service
```

---

## 🧪 Tests

### Test 1: Lister les utilisateurs
```bash
curl -H "Authorization: Bearer mock-jwt-token-dev" \
  http://localhost:3000/api/v1/users
```

### Test 2: Impersonnaliser un utilisateur
```bash
curl -X POST \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:3000/api/v1/users/USER_ID/impersonate
```

### Test 3: Envoyer email de vérification
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/v1/users/USER_ID/send-verification
```

### Test 4: Vérifier l'email
```bash
curl http://localhost:3000/api/v1/auth/verify-email/TOKEN
```

---

## 🔐 Sécurité

1. **Impersonalisation** :
   - Réservée aux ADMIN et SUPER_ADMIN uniquement
   - Token limité à 2 heures
   - Tous les événements sont loggés
   - Le token contient l'ID de l'admin

2. **Vérification Email** :
   - Token unique par utilisateur
   - Pas d'expiration (mais peut être régénéré)
   - Stocké de manière sécurisée (hash crypto)

3. **Authentification** :
   - Tous les endpoints sont protégés
   - Tokens mock acceptés uniquement en dev
   - Rate limiting en production

---

## 📧 Email de Vérification - Template

```html
<!DOCTYPE html>
<html>
<head>
  <title>Vérification de votre email</title>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; padding: 30px; text-align: center;">
      <h1>🎉 Bienvenue sur JobbingTrack !</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px;">
      <p>Bonjour {firstName},</p>
      
      <p>Merci de vous être inscrit ! Veuillez vérifier votre email :</p>
      
      <a href="{verificationUrl}" 
         style="display: inline-block; padding: 12px 30px; 
                background: #667eea; color: white; 
                text-decoration: none; border-radius: 5px;">
        Vérifier mon email
      </a>
      
      <p>Ce lien est valide pendant 24 heures.</p>
    </div>
  </div>
</body>
</html>
```

---

## 🚀 Prochaines Étapes (À Faire)

### 1. Page d'Inscription Publique
- [ ] Créer `/register` accessible sans authentification
- [ ] Formulaire d'inscription avec validation
- [ ] Captcha pour éviter les bots
- [ ] Redirection après inscription

### 2. Interface de Gestion Utilisateurs Améliorée
- [ ] Table avec tri et filtres
- [ ] Actions en masse (activation/désactivation)
- [ ] Export CSV/Excel
- [ ] Historique des connexions
- [ ] Badge "Email vérifié"

### 3. Émulateur Mobile
- [ ] État persistant dans localStorage
- [ ] Sélection d'utilisateur pour impersonalisation
- [ ] Démarrage automatique de l'app
- [ ] Synchronisation entre admin et mobile

### 4. Notifications
- [ ] Notification quand un utilisateur se connecte pour la première fois
- [ ] Alerte si connexion suspecte
- [ ] Email de bienvenue après vérification

---

## 📁 Fichiers Modifiés/Créés

### Backend
1. ✅ `backend/auth-service/prisma/schema.prisma` - Nouveaux champs
2. ✅ `backend/auth-service/src/routes/users.routes.js` - **NOUVEAU**
3. ✅ `backend/auth-service/src/controllers/user.controller.js` - **NOUVEAU**
4. ✅ `backend/auth-service/src/controllers/auth.controller.js` - loginCount
5. ✅ `backend/auth-service/src/server.js` - Routes users déjà incluses

### Frontend
6. ✅ `frontend/src/app/(admin)/backoffice/users/page.tsx` - Endpoints corrigés

---

## ⚙️ Variables d'Environnement

```env
# Auth Service
JWT_SECRET=your-super-secret-key
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# SMTP (pour les emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 🔗 Liens Utiles

- [Documentation Prisma](https://www.prisma.io/docs)
- [JWT.io](https://jwt.io) - Déboguer les tokens
- [Nodemailer](https://nodemailer.com) - Configuration SMTP

---

**Date de création** : 2025-11-04  
**Version** : 1.0.0  
**Auteur** : AI Assistant

