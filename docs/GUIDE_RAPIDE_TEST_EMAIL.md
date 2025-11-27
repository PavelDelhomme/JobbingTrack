# ⚡ Guide Rapide - Tester les Emails

## 🚨 Pourquoi le Token ne Fonctionne Pas ?

Si vous testez avec un lien comme :
```
http://localhost:8080/reset-password?token=test-reset-token-123&userId=test-user-123
```

**C'est normal que ça ne fonctionne pas !** Ce sont des tokens de test qui n'existent pas dans la base de données.

## ✅ Comment Tester Correctement

### Option 1 : Tester avec un Vrai Email

```bash
# 1. Envoyer un vrai email de réinitialisation
make test-email-python-reset TEST_EMAIL=votre@email.com

# 2. Ouvrir votre boîte mail
# 3. Cliquer sur le lien dans l'email
# 4. Le lien fonctionnera car il contient un vrai token de la base de données
```

### Option 2 : Récupérer un Token depuis la Base de Données

```bash
# 1. Créer un utilisateur (inscription)
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. Récupérer le token de vérification
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c \
  "SELECT \"verificationToken\" FROM \"User\" WHERE email = 'test@example.com';"

# 3. Utiliser le token dans l'URL
# http://localhost:8080/verify-email?token={LE_TOKEN_RÉCUPÉRÉ}
```

### Option 3 : Demander un Reset Password

```bash
# 1. Demander un reset password (crée un vrai token)
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Récupérer le token de reset
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c \
  "SELECT \"resetToken\" FROM \"User\" WHERE email = 'test@example.com';"

# 3. Utiliser le token dans l'URL
# http://localhost:8080/reset-password/{LE_TOKEN_RÉCUPÉRÉ}
```

## 📋 Format des URLs Correctes

### Reset Password
```
http://localhost:8080/reset-password/{TOKEN}
```
⚠️ **Pas de `?token=` ni de `&userId=`** - Le token est directement dans le path.

### Verify Email
```
http://localhost:8080/verify-email?token={TOKEN}
```
⚠️ **Pas de `userId`** - Seulement le token en query param.

## 🔧 Configuration pour Production

Voir `docs/CONFIGURATION_PRODUCTION_EMAIL.md` pour la configuration complète.

**Variables importantes** :
```env
FRONTEND_URL=https://app.jobbingtrack.com
BACKEND_URL=https://api.jobbingtrack.com
```

Ces variables déterminent les URLs générées dans les emails.

## 📚 Documentation Complète

- `docs/CONFIGURATION_PRODUCTION_EMAIL.md` - Configuration production
- `docs/TEST_EMAIL_DEVELOPPEMENT.md` - Tests en développement
- `docs/EMAIL_STATUS.md` - État du système email

