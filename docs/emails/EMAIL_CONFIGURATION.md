# 📧 Configuration Email - JobbingTrack

## Configuration SMTP avec OVH (maily.ovh)

Vous avez un compte email `noreply@maily.ovh` et vous voulez que les emails apparaissent comme venant de `noreply@jobbingtrack.com`.

### 1. Configuration dans `.env`

Créez ou modifiez le fichier `.env` à la racine du projet :

```env
# Configuration SMTP OVH (maily.ovh)
# Utilisez votre compte noreply@maily.ovh pour envoyer
# mais les emails apparaîtront comme venant de noreply@jobbingtrack.com

# ⚠️ IMPORTANT : Utilisez le port 587 (STARTTLS) au lieu de 465 pour une meilleure délivrabilité
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@maily.ovh
SMTP_PASS=votre_mot_de_passe_noreply
SMTP_FROM=noreply@jobbingtrack.com
SMTP_REPLY_TO=noreply@jobbingtrack.com

# URL du frontend (pour les liens dans les emails)
FRONTEND_URL=http://localhost:8080
```

**Note importante** : 
- **Port 587 (STARTTLS)** est recommandé car moins souvent bloqué que 465
- Si vous utilisez 465, mettez `SMTP_SECURE=true`
- Si vous utilisez 587, mettez `SMTP_SECURE=false` (STARTTLS)

**Important** : 
- `SMTP_USER` = votre compte email réel sur maily.ovh (`noreply@maily.ovh`)
- `SMTP_FROM` = l'adresse qui apparaîtra dans l'email (`noreply@jobbingtrack.com`)
- Le serveur SMTP OVH acceptera l'envoi car vous vous authentifiez avec `noreply@maily.ovh`
- Les destinataires verront `noreply@jobbingtrack.com` comme expéditeur

**Si vous n'avez pas encore le domaine jobbingtrack.com**, utilisez temporairement :
```env
SMTP_FROM=noreply@maily.ovh
SMTP_REPLY_TO=noreply@maily.ovh
```

### 2. Configuration dans `docker-compose.yml`

Les variables sont déjà configurées dans `docker-compose.yml` pour `auth-service`. Vérifiez qu'elles sont correctes :

```yaml
auth-service:
  environment:
    - SMTP_HOST=${SMTP_HOST:-mailhog}
    - SMTP_PORT=${SMTP_PORT:-1025}
    - SMTP_SECURE=${SMTP_SECURE:-false}
    - SMTP_USER=${SMTP_USER}
    - SMTP_PASS=${SMTP_PASS}
    - SMTP_FROM=${SMTP_FROM}
    - FRONTEND_URL=${FRONTEND_URL:-http://localhost:8080}
```

### 3. Configuration DNS pour jobbingtrack.com (si vous avez le domaine)

**⚠️ IMPORTANT** : Si vous n'avez pas encore le domaine `jobbingtrack.com`, vous pouvez :
- Soit utiliser `noreply@maily.ovh` comme `SMTP_FROM` (temporaire)
- Soit configurer le domaine `jobbingtrack.com` plus tard

**Si vous avez le domaine `jobbingtrack.com`**, pour que les emails envoyés depuis `noreply@jobbingtrack.com` via le serveur SMTP de `maily.ovh` soient acceptés, configurez le SPF :

**Dans votre zone DNS de `jobbingtrack.com`**, ajoutez :

```
Type: TXT
Nom: jobbingtrack.com
Valeur: v=spf1 include:mx.ovh.com ~all
```

Cela autorise OVH à envoyer des emails pour votre domaine.

### 4. Redémarrer le service

Après avoir modifié `.env`, redémarrez le service :

```bash
make rebuild-service SERVICE=auth-service
# ou
docker-compose restart auth-service
```

### 5. Tester la configuration

1. **Test SMTP** : Allez dans "Gestion des Emails" > "Tests de Déliverabilité" > "Test Connexion SMTP"
2. **Test DNS** : Testez le domaine `maily.ovh` pour vérifier MX, SPF, DKIM
3. **Test d'envoi** : Envoyez un email de test depuis le dashboard

### 6. Vérifier les logs

```bash
docker logs jobbingtrack-auth-service -f
```

## Configuration alternative : MailHog (développement local)

Pour tester localement sans envoyer de vrais emails :

```env
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@jobbingtrack.local
```

Accédez à l'interface MailHog : http://localhost:8025

## Dépannage

### Erreur "Service /api/v1/emails non disponible"
- Vérifiez que `auth-service` est démarré : `docker ps | grep auth-service`
- Redémarrez le service : `make restart-service SERVICE=auth-service`

### Erreur "Table User does not exist"
- Exécutez les migrations : `make db-push-all`
- Vérifiez que PostgreSQL est démarré : `docker ps | grep postgres`

### Les emails ne partent pas
- Vérifiez les logs : `docker logs jobbingtrack-auth-service -f`
- Vérifiez les variables SMTP dans `.env`
- Testez la connexion SMTP depuis l'interface

### Test DNS ne s'affiche pas
- Vérifiez que `bind-tools` est installé dans le conteneur (déjà fait)
- Vérifiez les logs pour voir les erreurs DNS
- Le test utilise `dig` avec fallback vers `dns.promises`

