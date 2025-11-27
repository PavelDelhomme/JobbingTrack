# 🚀 Configuration Production - Système Email JobbingTrack

## 📋 Vue d'Ensemble

Ce guide explique comment configurer le système email pour la production, notamment les URLs de vérification et de réinitialisation de mot de passe.

## 🔧 Variables d'Environnement Requises

### Variables Email SMTP

```env
# Configuration SMTP OVH (Production)
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=noreply@jobbingtrack.com
SMTP_PASS=VotreMotDePasseOVH
SMTP_FROM=noreply@jobbingtrack.com
SMTP_REPLY_TO=noreply@jobbingtrack.com
SMTP_SECURE=false
SMTP_USE_SSL=true
```

### Variables URLs Frontend/Backend

**⚠️ IMPORTANT** : Ces variables déterminent les URLs générées dans les emails.

```env
# URL du Frontend (Production)
FRONTEND_URL=https://app.jobbingtrack.com

# URL du Backend (Production)
BACKEND_URL=https://api.jobbingtrack.com
```

**En développement** :
```env
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:3000
```

## 📧 URLs Générées dans les Emails

### Reset Password (Réinitialisation de mot de passe)

**Format** : `{FRONTEND_URL}/reset-password/{token}`

**Exemple en production** :
```
https://app.jobbingtrack.com/reset-password/abc123def456...
```

**Exemple en développement** :
```
http://localhost:8080/reset-password/abc123def456...
```

**Route Frontend** : `/reset-password/[token]` (Next.js dynamic route)
**Route Backend** : `GET /api/v1/auth/reset-password/:token`

### Verify Email (Vérification d'email)

**Format** : `{FRONTEND_URL}/verify-email?token={token}`

**Exemple en production** :
```
https://app.jobbingtrack.com/verify-email?token=abc123def456...
```

**Exemple en développement** :
```
http://localhost:8080/verify-email?token=abc123def456...
```

**Route Frontend** : `/verify-email?token=...` (query parameter)
**Route Backend** : `GET /api/v1/auth/verify-email/:token`

## 🔍 Vérification des Tokens

### Problème : Token Invalide ou Expiré

Si vous recevez l'erreur "Token de vérification invalide ou expiré", vérifiez :

1. **Le token n'a pas expiré** :
   - Reset Password : Valide 60 minutes (1 heure)
   - Verify Email : Valide 24 heures

2. **Le token n'a pas déjà été utilisé** :
   - Les tokens sont supprimés après utilisation
   - Un token ne peut être utilisé qu'une seule fois

3. **L'URL est correcte** :
   - Reset Password : Token dans le path (`/reset-password/{token}`)
   - Verify Email : Token en query param (`/verify-email?token={token}`)

4. **Le domaine correspond** :
   - En production : `https://app.jobbingtrack.com`
   - En développement : `http://localhost:8080`

## 📝 Configuration Docker Compose (Production)

### Fichier `docker-compose.prod.yml`

```yaml
services:
  auth-service:
    environment:
      # URLs Production
      - FRONTEND_URL=https://app.jobbingtrack.com
      - BACKEND_URL=https://api.jobbingtrack.com
      
      # Configuration SMTP
      - SMTP_HOST=ssl0.ovh.net
      - SMTP_PORT=465
      - SMTP_USER=noreply@jobbingtrack.com
      - SMTP_PASS=${SMTP_PASS}
      - SMTP_FROM=noreply@jobbingtrack.com
      - SMTP_REPLY_TO=noreply@jobbingtrack.com
      - SMTP_SECURE=false
      - SMTP_USE_SSL=true
```

### Fichier `.env` (Production)

Créez un fichier `.env.production` :

```env
# URLs Production
FRONTEND_URL=https://app.jobbingtrack.com
BACKEND_URL=https://api.jobbingtrack.com
NEXT_PUBLIC_API_URL=https://api.jobbingtrack.com

# Configuration SMTP OVH
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=noreply@jobbingtrack.com
SMTP_PASS=VotreMotDePasseOVH
SMTP_FROM=noreply@jobbingtrack.com
SMTP_REPLY_TO=noreply@jobbingtrack.com
SMTP_SECURE=false
SMTP_USE_SSL=true

# Autres variables
NODE_ENV=production
JWT_SECRET=VotreJWTSecretTresLongEtSecurise
POSTGRES_DB=jobbingtrack
POSTGRES_USER=jobbingtrack
POSTGRES_PASSWORD=VotreMotDePassePostgres
```

## 🧪 Tests en Développement

### Tester Reset Password

```bash
# Tester l'envoi d'un email de réinitialisation
make test-email-python-reset TEST_EMAIL=votre@email.com

# Vérifier les logs
make test-email-logs
```

### Tester Verify Email

```bash
# Tester l'envoi d'un email de vérification
make test-email-python-verification TEST_EMAIL=votre@email.com

# Vérifier les logs
make test-email-logs
```

### Tester la Connexion SMTP

```bash
# Tester la connexion SMTP
make test-email-python

# Diagnostic complet
make test-email-diagnostic
```

## 🔄 Migration Développement → Production

### Étapes

1. **Mettre à jour les variables d'environnement** :
   ```bash
   # Dans votre fichier .env.production
   FRONTEND_URL=https://app.jobbingtrack.com
   BACKEND_URL=https://api.jobbingtrack.com
   ```

2. **Vérifier la configuration SMTP** :
   ```bash
   # Tester la connexion SMTP
   make test-email-python
   ```

3. **Redémarrer les services** :
   ```bash
   # En production
   docker-compose -f docker-compose.prod.yml restart auth-service
   ```

4. **Tester les emails** :
   - Envoyer un email de test depuis le dashboard
   - Vérifier que les URLs dans les emails pointent vers le bon domaine
   - Tester le clic sur les liens

## ⚠️ Points Importants

### 1. Domaine de Production

**Assurez-vous que** :
- Le domaine `app.jobbingtrack.com` (ou votre domaine) est configuré
- Les certificats SSL sont valides
- Le domaine pointe vers votre serveur

### 2. Tokens et Expiration

- **Reset Password** : 60 minutes (1 heure)
- **Verify Email** : 24 heures
- Les tokens sont supprimés après utilisation (sécurité)

### 3. Rate Limiting OVH

- OVH limite le nombre de connexions SMTP par minute
- Délai automatique de 1 seconde entre les envois (implémenté)
- En cas d'erreur `535 Authentication failed`, attendre 2-3 secondes avant de réessayer

### 4. Configuration DNS

Pour une meilleure délivrabilité en production :
- Configurez SPF : `v=spf1 include:mx.ovh.com ~all`
- Configurez DKIM (via OVH)
- Configurez DMARC (optionnel mais recommandé)

## 📚 Documentation Complémentaire

- `docs/EMAIL_STATUS.md` - État actuel du système email
- `docs/OVH_EMAIL_SETUP.md` - Configuration complète OVH
- `docs/VERIFICATION_COMPTE_EMAIL.md` - Dépannage authentification
- `docs/MAILHOG_REMOVED.md` - Suppression MailHog

## ✅ Checklist Production

Avant de mettre en production, vérifiez :

- [ ] `FRONTEND_URL` pointe vers votre domaine de production
- [ ] `BACKEND_URL` pointe vers votre API de production
- [ ] Configuration SMTP correcte (OVH)
- [ ] Certificats SSL valides
- [ ] DNS configurés (MX, SPF, DKIM)
- [ ] Tests d'envoi d'emails réussis
- [ ] Tests de clic sur les liens réussis
- [ ] Rate limiting géré (délai de 1 seconde)
- [ ] Logs d'emails fonctionnels (`/backoffice/email-monitor`)

## 🔧 Dépannage

### Les emails ne sont pas reçus

1. Vérifiez les spams
2. Vérifiez les logs : `make test-email-logs`
3. Vérifiez la configuration SMTP : `make test-email-diagnostic`
4. Vérifiez les DNS (MX, SPF, DKIM)

### Les liens ne fonctionnent pas

1. Vérifiez que `FRONTEND_URL` est correct
2. Vérifiez que le domaine pointe vers votre serveur
3. Vérifiez que les certificats SSL sont valides
4. Vérifiez que le token n'a pas expiré

### Erreur d'authentification SMTP

1. Vérifiez `SMTP_USER` et `SMTP_PASS`
2. Vérifiez que le compte email est actif dans OVH
3. Attendez 2-3 secondes entre les tests (rate limiting)
4. Vérifiez les logs OVH dans l'espace client

