# 🧪 Tests Email en Développement - JobbingTrack

## ⚠️ Problème : Token Invalide ou Expiré

Si vous recevez l'erreur "Token de vérification invalide ou expiré" lors du test d'un lien, voici comment résoudre le problème.

## 🔍 Causes Possibles

### 1. Token Expiré

Les tokens ont une durée de validité limitée :
- **Reset Password** : 60 minutes (1 heure)
- **Verify Email** : 24 heures

**Solution** : Demandez un nouveau lien de vérification.

### 2. Token Déjà Utilisé

Les tokens sont supprimés après utilisation (sécurité).

**Solution** : Un token ne peut être utilisé qu'une seule fois. Demandez un nouveau lien.

### 3. URL Incorrecte

Les URLs doivent correspondre aux routes frontend :
- **Reset Password** : `/reset-password/{token}` (token dans le path)
- **Verify Email** : `/verify-email?token={token}` (token en query param)

### 4. Utilisateur Déjà Vérifié

Si l'email est déjà vérifié, le token ne fonctionnera pas.

**Solution** : Vérifiez le statut de l'utilisateur dans la base de données.

## 🧪 Tests en Développement

### Tester Reset Password

```bash
# 1. Envoyer un email de réinitialisation
make test-email-python-reset TEST_EMAIL=redacted@example.invalid

# 2. Vérifier les logs
make test-email-logs

# 3. Copier le token depuis les logs ou l'email
# 4. Tester l'URL : http://localhost:8080/reset-password/{token}
```

### Tester Verify Email

```bash
# 1. Créer un utilisateur (inscription)
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "redacted@example.invalid",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. Récupérer le token depuis la base de données
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c \
  "SELECT email, \"verificationToken\", \"verificationTokenExpiry\" FROM \"User\" WHERE email = 'redacted@example.invalid';"

# 3. Tester l'URL : http://localhost:8080/verify-email?token={token}
```

### Vérifier un Token dans la Base de Données

```bash
# Voir tous les tokens de vérification
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c \
  "SELECT email, \"emailVerified\", \"verificationToken\", \"verificationTokenExpiry\" FROM \"User\" WHERE \"verificationToken\" IS NOT NULL;"

# Voir les tokens de reset password
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c \
  "SELECT email, \"resetToken\", \"resetTokenExpiry\" FROM \"User\" WHERE \"resetToken\" IS NOT NULL;"
```

## 🔧 Configuration pour les Tests

### Variables d'Environnement (Développement)

Dans votre `.env` ou `docker-compose.yml` :

```env
# URLs Développement
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:3000

# Configuration SMTP
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=noreply@jobbingtrack.test
SMTP_PASS=VotreMotDePasseOVH
SMTP_FROM=noreply@jobbingtrack.test
SMTP_REPLY_TO=noreply@jobbingtrack.test
SMTP_SECURE=false
SMTP_USE_SSL=true
```

### Vérifier la Configuration

```bash
# Vérifier les variables d'environnement dans le conteneur
docker exec jobbingtrack-auth-service env | grep -E "FRONTEND_URL|BACKEND_URL|SMTP_"

# Tester la connexion SMTP
make test-email-python

# Diagnostic complet
make test-email-diagnostic
```

## 📝 Format des URLs Générées

### Reset Password

**Format** : `{FRONTEND_URL}/reset-password/{token}`

**Exemple** :
```
http://localhost:8080/reset-password/abc123def456ghi789...
```

**Route Frontend** : `/reset-password/[token]` (Next.js dynamic route)
**Route Backend** : `GET /api/v1/auth/reset-password/:token`

### Verify Email

**Format** : `{FRONTEND_URL}/verify-email?token={token}`

**Exemple** :
```
http://localhost:8080/verify-email?token=abc123def456ghi789...
```

**Route Frontend** : `/verify-email?token=...` (query parameter)
**Route Backend** : `GET /api/v1/auth/verify-email/:token`

## ⚠️ Points Importants

1. **Les tokens expirent** : Ne testez pas avec des tokens anciens
2. **Les tokens sont à usage unique** : Une fois utilisé, le token est supprimé
3. **Vérifiez l'URL** : Assurez-vous que `FRONTEND_URL` est correct
4. **Vérifiez l'expiration** : Les tokens ont une date d'expiration dans la base de données

## 🔄 Pour la Production

Voir `docs/CONFIGURATION_PRODUCTION_EMAIL.md` pour la configuration production.

Les seules différences seront :
- `FRONTEND_URL=https://app.jobbingtrack.com` (au lieu de `http://localhost:8080`)
- `BACKEND_URL=https://api.jobbingtrack.com` (au lieu de `http://localhost:3000`)

## 📚 Documentation Complémentaire

- `docs/CONFIGURATION_PRODUCTION_EMAIL.md` - Configuration production complète
- `docs/EMAIL_STATUS.md` - État actuel du système email
- `docs/VERIFICATION_COMPTE_EMAIL.md` - Dépannage authentification

