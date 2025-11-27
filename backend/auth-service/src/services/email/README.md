# 📧 Service Python d'Envoi d'Emails - JobbingTrack

Service Python pour l'envoi d'emails (réinitialisation de mot de passe et vérification d'email), inspiré du code Django VTCBuilder.

## 📁 Fichiers

- **`email_service.py`** : Service principal d'envoi d'emails via SMTP
- **`test_email_smtp.py`** : Script de test pour vérifier la configuration SMTP
- **`pythonEmailService.js`** : Wrapper Node.js pour appeler le service Python

## 🚀 Utilisation

### Depuis Node.js (recommandé)

Le service est automatiquement utilisé par `emailService.js` pour :
- Réinitialisation de mot de passe (`sendPasswordResetEmail`)
- Vérification d'email (`sendVerificationEmail`)

### Depuis la ligne de commande

#### Tester la connexion SMTP

```bash
python3 email_service.py test_connection
```

#### Envoyer un email de réinitialisation

```bash
python3 email_service.py send_password_reset "user@example.com" "John Doe" "reset-token-123" "user-id-456"
```

#### Envoyer un email de vérification

```bash
python3 email_service.py send_verification "user@example.com" "John Doe" "verification-token-123" "user-id-456"
```

#### Envoyer un email générique

```bash
python3 email_service.py send_generic "user@example.com" "Sujet" "Message texte" "<html>Message HTML</html>"
```

### Script de test complet

```bash
# Dans le conteneur Docker
docker-compose exec auth-service python3 /app/src/services/email/test_email_smtp.py

# Ou depuis le répertoire du service
cd backend/auth-service/src/services/email
python3 test_email_smtp.py
```

## ⚙️ Configuration

Le service lit les variables d'environnement suivantes :

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SMTP_HOST` | Serveur SMTP | `mailhog` |
| `SMTP_PORT` | Port SMTP | `1025` |
| `SMTP_SECURE` | Utiliser TLS (STARTTLS) | `false` |
| `SMTP_USE_SSL` | Utiliser SSL (port 465) | `false` |
| `SMTP_USER` | Nom d'utilisateur SMTP | - |
| `SMTP_PASS` | Mot de passe SMTP | - |
| `SMTP_FROM` | Adresse d'expéditeur | `JobbingTrack <noreply@jobbingtrack.com>` |
| `SMTP_REPLY_TO` | Adresse de réponse | `noreply@jobbingtrack.com` |
| `FRONTEND_URL` | URL du frontend | `http://localhost:8080` |

### Configuration OVH (Production)

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USE_SSL=false
SMTP_USER=noreply@maily.ovh
SMTP_PASS=votre-mot-de-passe
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>
SMTP_REPLY_TO=noreply@jobbingtrack.com
```

### Configuration MailHog (Développement)

```env
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USE_SSL=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.local>
```

## 🔧 Installation

Python 3 est installé dans le Dockerfile du service auth-service :

```dockerfile
RUN apk add --no-cache openssl bind-tools python3 py3-pip
```

Aucune dépendance Python externe n'est requise (utilise uniquement la bibliothèque standard).

## 📝 Format de réponse

Le service retourne un JSON avec la structure suivante :

```json
{
  "success": true,
  "message": "Email envoyé avec succès à user@example.com"
}
```

En cas d'erreur :

```json
{
  "success": false,
  "error": "Message d'erreur"
}
```

## 🐛 Dépannage

### Erreur "python3: command not found"

Assurez-vous que Python 3 est installé dans le conteneur :
```bash
docker-compose exec auth-service python3 --version
```

### Erreur de connexion SMTP

1. Vérifier les variables d'environnement :
```bash
docker-compose exec auth-service env | grep SMTP
```

2. Tester la connexion :
```bash
docker-compose exec auth-service python3 /app/src/services/email/email_service.py test_connection
```

3. Vérifier les logs :
```bash
docker-compose logs auth-service | grep -i email
```

## 📚 Référence

Ce service est inspiré du code Django VTCBuilder et utilise la même approche pour l'envoi d'emails via SMTP.

