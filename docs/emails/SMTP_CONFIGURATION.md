# Configuration SMTP pour l'envoi d'emails

Ce document explique comment configurer l'envoi d'emails JobbingTrack selon l'environnement.

Services concernés :

- `backend/auth-service` : reset password, vérification de compte, emails applicatifs historiques.
- `backend/notification-service` : alertes sécurité, notifications internes, futurs digests/rapports.

Règle centrale : **MailHog est uniquement local/dev/test**. En préproduction et production, les emails doivent passer par un SMTP réel validé (OVH, Brevo, SendGrid, Mailgun, etc.) avec logs `EmailLog` et preuve de réception.

---

## Matrice par environnement

| Environnement | Transport principal | Objectif | Règle |
|---------------|---------------------|----------|-------|
| Local / dev | MailHog (`mailhog:1025`) | Capturer les emails sans envoyer vers Internet | OK pour tests UI/E2E, reset, notifications et alertes simulées. |
| Local avec test délivrabilité | MailHog + miroir SMTP réel optionnel | Capturer localement et vérifier qu'un vrai fournisseur accepte l'email | Réservé aux alertes critiques/test porteur, jamais obligatoire pour dev quotidien. |
| Préproduction | SMTP réel | Valider TLS, identités, alias, logs et réception réelle | MailHog interdit comme transport final ; un smoke email doit arriver dans une boîte réelle. |
| Production | SMTP réel durci | Envoyer les vrais emails utilisateurs et alertes | MailHog absent/non exposé ; secrets hors Git ; rate-limit et observabilité actifs. |

---

## Configuration

Copiez le fichier `.env.example` vers `.env` dans le backend/auth-service et configurez les variables SMTP :

```bash
cp .env.example .env
```

## Options de Configuration

### 1. MailHog (développement et tests locaux)

MailHog capture les emails sans les envoyer réellement. Il doit rester limité au local/dev/test.

Docker Compose inclut déjà le service `mailhog` dans les profils `mail` et `full` :

```yaml
mailhog:
  image: mailhog/mailhog
  ports:
    - "${MAILHOG_SMTP_PORT:-2525}:1025"
    - "${MAILHOG_WEB_PORT:-8025}:8025"
```

Configuration depuis un conteneur :

```env
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USE_SSL=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=JobbingTrack <noreply@example.invalid>
SMTP_REPLY_TO=noreply@example.invalid
```

Interface web locale : http://localhost:8025.

Notes :

- Depuis l'hôte, le port SMTP exposé par défaut est `2525` (`MAILHOG_SMTP_PORT`).
- Depuis un conteneur Docker, utiliser toujours `mailhog:1025`.
- Ne jamais configurer `SMTP_HOST=mailhog` dans un environnement préprod/prod.

### 2. Gmail (développement ponctuel uniquement)

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

Gmail ne doit pas devenir le SMTP applicatif de production. Il peut servir à un test ponctuel ou à la lecture Gmail de l'agent email, pas à l'identité d'envoi officielle JobbingTrack.

### 3. OVH (préproduction / production - maily.ovh)

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

**Note importante** : certains serveurs SMTP (comme OVH selon l'offre et le domaine) peuvent rejeter les emails si le domaine `From` (`jobbingtrack.com`) diffère du compte authentifié.

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

### 4. Brevo (préproduction / production)

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

### 5. SendGrid (préproduction / production)

Service avec 100 emails/jour gratuits.

```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="apikey"
SMTP_PASS="votre-api-key-sendgrid"
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
```

### 6. Mailgun (préproduction / production)

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

Résultat attendu :

- Local/dev : email visible dans MailHog et ligne `EmailLog` en `SENT`.
- Préprod/prod : email reçu dans une boîte réelle, ligne `EmailLog` en `SENT`, `messageId` fournisseur présent si le service le journalise.

## Checklist préprod / production

Avant une bascule préprod/prod :

1. `SMTP_HOST` ne vaut pas `mailhog`, `localhost`, `127.0.0.1` ni un host Docker de test.
2. `SMTP_USER` / `SMTP_PASS` sont réels, forts et stockés hors Git.
3. `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USE_SSL` correspondent à la doc fournisseur.
4. `SMTP_FROM` est accepté par le fournisseur ; si le fournisseur impose l'expéditeur authentifié, utiliser l'alias métier en `SMTP_REPLY_TO`.
5. `CRASH_REPORT_EMAIL`, `SECURITY_ALERT_EMAIL(S)` et futurs destinataires digest sont des alias/listes dédiés, pas une boîte personnelle unique codée dans Git.
6. Un test reset/vérification, un test alerte sécurité et un test digest/notification critique sont reçus réellement.
7. Les envois apparaissent dans le backoffice Email Monitor / `EmailLog`.
8. MailHog n'est ni lancé comme dépendance prod, ni exposé publiquement.

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
- En local MailHog, vérifiez http://localhost:8025
- En préprod/prod, vérifiez les logs fournisseur, SPF/DKIM/DMARC, les quotas et la réputation du domaine.

## Sécurité

⚠️ **IMPORTANT** :

- Ne commitez JAMAIS le fichier `.env` avec vos vraies credentials
- Utilisez des variables d'environnement en production
- Changez les secrets JWT en production
- Utilisez HTTPS en production
- Limitez le nombre d'emails envoyés par IP/utilisateur pour éviter les abus
