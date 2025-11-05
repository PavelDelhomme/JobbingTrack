# 📧 Instructions : Système de Vérification d'Email

## ✅ Implémentation Complète

J'ai créé un système complet de vérification d'email par lien lors de l'inscription. Voici ce qui a été fait :

### 🔧 Backend (Auth Service)

#### 1. **Schéma Prisma** (`backend/auth-service/prisma/schema.prisma`)
   - ✅ Ajout des champs `verificationToken` et `verificationTokenExpiry`
   - ✅ Les champs `emailVerified` et `emailVerifiedAt` sont maintenant utilisés

#### 2. **Service Email** (`backend/auth-service/src/services/emailService.js`)
   - ✅ Nouvelle méthode `sendVerificationEmail(user, verificationUrl)` créée
   - ✅ Template d'email professionnel et responsive
   - ✅ Explications claires sur l'importance de la vérification

#### 3. **Contrôleur Auth** (`backend/auth-service/src/controllers/auth.controller.js`)
   - ✅ **Fonction `register` modifiée** :
     - Génère un token de vérification unique (32 bytes)
     - Expire après 24 heures
     - Envoie automatiquement l'email de vérification
     - Envoie aussi l'email de bienvenue
   
   - ✅ **Nouvelle fonction `verifyEmail(req, res)`** :
     - Vérifie le token
     - Marque l'email comme vérifié
     - Supprime le token après utilisation
     - Logs de sécurité complets
   
   - ✅ **Nouvelle fonction `resendVerificationEmail(req, res)`** :
     - Génère un nouveau token
     - Renvoie l'email de vérification
     - Protection contre l'énumération d'emails

#### 4. **Routes** (`backend/auth-service/src/routes/auth.routes.js`)
   - ✅ `GET /api/v1/auth/verify-email/:token` - Vérifier l'email
   - ✅ `POST /api/v1/auth/resend-verification` - Renvoyer l'email

### 🎨 Frontend

#### 5. **Page de Vérification** (`frontend/src/app/(auth)/verify-email/page.tsx`)
   - ✅ Interface moderne et responsive
   - ✅ Trois états : loading, success, error
   - ✅ Redirection automatique après succès
   - ✅ Formulaire pour renvoyer l'email si le token a expiré
   - ✅ Gestion des erreurs complète

---

## 🚀 Étapes d'Installation

### 1. **Exécuter la Migration Prisma**

```bash
cd backend/auth-service
npm install  # Si pas déjà fait
npx prisma migrate dev --name add_email_verification
```

Cette commande va :
- Créer une nouvelle migration SQL
- Ajouter les colonnes `verificationToken` et `verificationTokenExpiry` à la table `User`
- Mettre à jour le client Prisma

### 2. **Configurer les Variables d'Environnement**

Assurez-vous que le fichier `.env` de `backend/auth-service` contient :

```env
# Configuration SMTP (pour l'envoi d'emails)
SMTP_HOST=smtp.gmail.com  # ou votre serveur SMTP
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>

# URL du frontend (pour les liens de vérification)
FRONTEND_URL=http://localhost:5173  # ou votre URL de production

# JWT Secret
JWT_SECRET=votre-secret-jwt-super-securise
```

**Note** : Pour Gmail, vous devrez créer un "Mot de passe d'application" :
1. Allez dans votre compte Google
2. Sécurité → Validation en 2 étapes
3. Mots de passe d'application
4. Créez un nouveau mot de passe pour "Autre (nom personnalisé)"

### 3. **Redémarrer le Service Auth**

```bash
cd backend/auth-service
npm start
# ou
npm run dev  # en mode développement
```

### 4. **Tester le Frontend**

```bash
cd frontend
npm run dev
```

---

## 🧪 Tests

### Test 1 : Inscription d'un Nouvel Utilisateur

1. Allez sur `http://localhost:5173/register`
2. Créez un compte avec une vraie adresse email
3. Vérifiez votre boîte de réception
4. Vous devriez recevoir **2 emails** :
   - 📧 Email de bienvenue
   - ✅ Email de vérification avec le lien

### Test 2 : Vérification de l'Email

1. Cliquez sur le lien dans l'email de vérification
2. Vous devriez être redirigé vers `/verify-email?token=...`
3. Le message "✅ Email Vérifié !" devrait s'afficher
4. Redirection automatique vers `/login`

### Test 3 : Token Expiré

1. Attendez 24h ou modifiez manuellement la date d'expiration en BDD
2. Essayez d'utiliser le lien
3. Message d'erreur devrait s'afficher
4. Utilisez le formulaire pour renvoyer un email

### Test 4 : Renvoyer l'Email de Vérification

1. Sur la page d'erreur de vérification
2. Entrez votre email dans le formulaire
3. Cliquez sur "Renvoyer l'email"
4. Vérifiez votre boîte de réception
5. Nouveau lien devrait fonctionner

---

## 📊 API Endpoints

### 1. Vérifier un Email

```http
GET /api/v1/auth/verify-email/:token
```

**Réponse Success (200)** :
```json
{
  "success": true,
  "message": "Votre adresse email a été vérifiée avec succès !",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": true
  }
}
```

**Réponse Error (400)** :
```json
{
  "success": false,
  "error": "Token de vérification invalide ou expiré."
}
```

### 2. Renvoyer l'Email de Vérification

```http
POST /api/v1/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Réponse (200)** :
```json
{
  "success": true,
  "message": "Un nouvel email de vérification a été envoyé à votre adresse."
}
```

---

## 🔒 Sécurité

### Mesures Implémentées

1. **Token Unique** : Chaque token est généré avec `crypto.randomBytes(32)` (256 bits)
2. **Expiration** : Les tokens expirent après 24 heures
3. **Usage Unique** : Le token est supprimé après vérification
4. **Logs de Sécurité** : Toutes les tentatives sont loggées
5. **Protection Énumération** : Le endpoint resend ne révèle pas si l'email existe
6. **Rate Limiting** : Déjà en place sur l'API Gateway

---

## 📧 Configuration SMTP Alternative (pour les tests)

Si vous n'avez pas de serveur SMTP, vous pouvez utiliser **Mailtrap** pour les tests :

```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=votre-username-mailtrap
SMTP_PASS=votre-password-mailtrap
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>
```

1. Créez un compte sur https://mailtrap.io (gratuit)
2. Créez une inbox
3. Copiez les credentials SMTP
4. Tous les emails seront interceptés et visibles dans Mailtrap

---

## 🎯 Prochaines Étapes Optionnelles

### 1. Bloquer l'Accès aux Fonctionnalités si Email Non Vérifié

Dans `backend/auth-service/src/middlewares/auth.middleware.js`, ajoutez :

```javascript
const requireEmailVerified = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Veuillez vérifier votre adresse email pour accéder à cette fonctionnalité.',
        emailVerificationRequired: true
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
```

### 2. Ajouter un Badge "Email Non Vérifié" dans le Frontend

Dans le profil utilisateur, afficher un badge si `emailVerified === false` avec un bouton pour renvoyer l'email.

### 3. Rappels Automatiques

Envoyer un rappel automatique après 3 jours si l'email n'est pas vérifié.

---

## ✅ Vérification de l'Implémentation

- ✅ Schéma Prisma mis à jour
- ✅ Migration créée (à exécuter)
- ✅ Service email avec template de vérification
- ✅ Contrôleur register modifié
- ✅ Contrôleurs verifyEmail et resendVerificationEmail créés
- ✅ Routes ajoutées
- ✅ Page frontend créée
- ✅ Gestion des erreurs complète
- ✅ Logs de sécurité
- ✅ Documentation complète

---

## 🆘 Dépannage

### L'email n'arrive pas

1. Vérifiez la configuration SMTP dans `.env`
2. Vérifiez les logs du service auth : `docker logs auth-service`
3. Testez avec Mailtrap d'abord
4. Vérifiez les spams

### Le lien ne fonctionne pas

1. Vérifiez que `FRONTEND_URL` est correct dans `.env`
2. Vérifiez que la migration a été exécutée
3. Vérifiez les logs pour voir l'erreur exacte

### Token invalide immédiatement

1. Vérifiez l'heure du serveur (timezone)
2. Vérifiez que le token dans l'URL est complet
3. Vérifiez la base de données directement

---

## 📞 Support

Si vous rencontrez des problèmes, vérifiez :

1. Les logs du service auth
2. La console du navigateur
3. Les emails dans Mailtrap (si utilisé)
4. La base de données (champs verificationToken et emailVerified)

---

**Système créé par : Assistant IA**
**Date : 5 novembre 2025**
**Version : 1.0.0**

