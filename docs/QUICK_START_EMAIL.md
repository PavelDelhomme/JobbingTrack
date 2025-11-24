# 🚀 Configuration Email Rapide - JobbingTrack

## Configuration SMTP OVH (maily.ovh) en 5 minutes

### Étape 1 : Créer le fichier `.env`

À la racine du projet, créez un fichier `.env` avec :

```env
# Configuration SMTP OVH
# ⚠️ Utilisez le port 587 (STARTTLS) pour une meilleure délivrabilité
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=redacted@example.invalid
SMTP_PASS=votre_mot_de_passe_noreply
SMTP_FROM=noreply@jobbingtrack.test
SMTP_REPLY_TO=noreply@jobbingtrack.test

FRONTEND_URL=http://localhost:8080
```

**Remplacez** `votre_mot_de_passe_noreply` par le mot de passe réel de votre compte `redacted@example.invalid`.

### Étape 2 : Redémarrer auth-service

```bash
make rebuild-service SERVICE=auth-service
```

### Étape 3 : Tester

1. Allez dans "Gestion des Emails" > "Tests de Déliverabilité"
2. Cliquez sur "Tester la connexion SMTP"
3. Si c'est vert ✅, c'est bon !
4. Envoyez un email de test

### Si vous n'avez pas encore le domaine jobbingtrack.com

Utilisez temporairement `redacted@example.invalid` :

```env
SMTP_FROM=redacted@example.invalid
SMTP_REPLY_TO=redacted@example.invalid
```

Les emails fonctionneront, mais l'expéditeur sera `redacted@example.invalid` au lieu de `noreply@jobbingtrack.test`.

### Dépannage

**Erreur "Table User does not exist"** :
```bash
make db-push-all
```

**Service non disponible** :
```bash
make start-service SERVICE=auth-service
```

**Voir les logs** :
```bash
docker logs jobbingtrack-auth-service -f
```

