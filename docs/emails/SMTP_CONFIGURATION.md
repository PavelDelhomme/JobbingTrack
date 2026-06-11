# Configuration SMTP pour l'envoi d'emails

Ce document explique comment configurer l'envoi d'emails pour le service d'authentification (reset de mot de passe, emails de bienvenue, etc.). Service concerné : `backend/auth-service`.

## Configuration

Copiez le fichier `.env.example` vers `.env` dans le backend/auth-service et configurez les variables SMTP :

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
SMTP_USER="redacted@example.invalid"
SMTP_PASS="votre-app-password-16-caracteres"
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
```

### 2. OVH (Production - maily.ovh)

Configuration pour utiliser OVH avec authentification `redacted@example.invalid` mais affichage `redacted@example.invalid` :

```env
SMTP_HOST="ssl0.ovh.net"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="redacted@example.invalid"
SMTP_PASS="votre-mot-de-passe-ovh"
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
SMTP_REPLY_TO="redacted@example.invalid"
```

**Note importante** : Certains serveurs SMTP (comme OVH) peuvent rejeter les emails si le domaine `From` (`jobbingtrack.com`) diffère du domaine d'authentification (`maily.ovh`). 

**Si les emails sont rejetés**, utilisez plutôt :
```env
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
```
Dans ce cas, l'email partira et s'affichera depuis `redacted@example.invalid`, mais avec le nom d'affichage "JobbingTrack".

**Alternative** : Configurer un alias email `redacted@example.invalid` qui redirige vers `redacted@example.invalid` dans votre panneau OVH, puis utiliser :
```env
SMTP_USER="redacted@example.invalid"
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
```

---

### 3. MailHog (Pour les tests locaux)

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
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
```

3. Accédez à l'interface web : http://localhost:8025

### 4. Sendinblue / Brevo (Recommandé pour la production)

Service gratuit jusqu'à 300 emails/jour.

1. Créez un compte sur https://www.brevo.com/
2. Récupérez votre clé SMTP dans les paramètres
3. Configurez dans `.env` :

```env
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="redacted@example.invalid"
SMTP_PASS="votre-cle-smtp-brevo"
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
```

### 5. SendGrid

Service avec 100 emails/jour gratuits.

```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="apikey"
SMTP_PASS="votre-api-key-sendgrid"
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
```

### 6. Mailgun

```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="redacted@example.invalid"
SMTP_PASS="votre-mot-de-passe-mailgun"
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
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
  -d '{"email":"redacted@example.invalid"}'
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
