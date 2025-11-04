# Configuration SMTP pour l'envoi d'emails

Ce document explique comment configurer l'envoi d'emails pour le service d'authentification (reset de mot de passe, emails de bienvenue, etc.).

## Configuration

Copiez le fichier `.env.example` vers `.env` et configurez les variables SMTP :

```bash
cp .env.example .env
```

## Options de Configuration

### 1. Gmail (Recommandé pour le développement)

1. Activez l'authentification à 2 facteurs sur votre compte Gmail
2. Générez un "App Password" : https://myaccount.google.com/apppasswords
3. Configurez dans `.env` :

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="votre-email@gmail.com"
SMTP_PASS="votre-app-password-16-caracteres"
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"
```

### 2. MailHog (Pour les tests locaux)

MailHog est un serveur SMTP de test qui capture tous les emails sans les envoyer réellement.

1. Ajoutez MailHog au docker-compose.yml :

```yaml
services:
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    networks:
      - jobbingtrack-network
```

2. Configurez dans `.env` :

```env
SMTP_HOST="mailhog"
SMTP_PORT="1025"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.local>"
```

3. Accédez à l'interface web : http://localhost:8025

### 3. Sendinblue / Brevo (Recommandé pour la production)

Service gratuit jusqu'à 300 emails/jour.

1. Créez un compte sur https://www.brevo.com/
2. Récupérez votre clé SMTP dans les paramètres
3. Configurez dans `.env` :

```env
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="votre-email@example.com"
SMTP_PASS="votre-cle-smtp-brevo"
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"
```

### 4. SendGrid

Service avec 100 emails/jour gratuits.

```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="apikey"
SMTP_PASS="votre-api-key-sendgrid"
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"
```

### 5. Mailgun

```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="postmaster@votre-domaine.mailgun.org"
SMTP_PASS="votre-mot-de-passe-mailgun"
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"
```

## Frontend URL

Configurez l'URL du frontend pour les liens de réinitialisation :

```env
FRONTEND_URL="http://localhost:8080"
```

En production :

```env
FRONTEND_URL="https://app.jobbingtrack.com"
```

## Test de la configuration

Pour tester l'envoi d'emails, utilisez la route de reset de mot de passe :

```bash
curl -X POST http://localhost:3001/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Si la configuration est correcte, vous devriez recevoir un email (ou le voir dans MailHog).

## Troubleshooting

### Erreur "Authentication failed"

- Vérifiez que le mot de passe SMTP est correct
- Pour Gmail, assurez-vous d'utiliser un App Password, pas votre mot de passe principal
- Vérifiez que l'authentification 2FA est activée (pour Gmail)

### Erreur "Connection timeout"

- Vérifiez que le port est correct (587 pour TLS, 465 pour SSL)
- Vérifiez votre pare-feu
- Pour Docker, vérifiez que les conteneurs sont sur le même réseau

### Emails non reçus

- Vérifiez le dossier spam
- Vérifiez les logs du service : `docker logs jobbingtrack-auth-service`
- Pour MailHog, vérifiez http://localhost:8025

## Sécurité

⚠️ **IMPORTANT** :

- Ne commitez JAMAIS le fichier `.env` avec vos vraies credentials
- Utilisez des variables d'environnement en production
- Changez les secrets JWT en production
- Utilisez HTTPS en production
- Limitez le nombre d'emails envoyés par IP/utilisateur pour éviter les abus

