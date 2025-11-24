# 🔧 Dépannage Email - JobbingTrack

## Problème : Emails non délivrés (timeout de connexion)

### Symptômes
- L'email est envoyé depuis `redacted@example.invalid`
- Vous recevez un "Undelivered Mail Returned to Sender" dans la boîte `redacted@example.invalid`
- Erreur : `connect to test.com[34.224.149.186]:25: Connection timed out`

### Causes possibles

1. **Adresse email invalide** : L'adresse `redacted@example.invalid` n'existe pas
   - **Solution** : Utilisez une vraie adresse email (Gmail, OVH, etc.)

2. **Serveur SMTP bloque les envois** : OVH peut bloquer certains envois
   - **Solution** : Vérifiez les logs OVH dans votre espace client

3. **Configuration SMTP incorrecte** : Port, host, ou authentification incorrects
   - **Solution** : Vérifiez votre configuration dans `.env`

4. **Firewall/Port bloqué** : Le port 25 ou 465 peut être bloqué
   - **Solution** : Utilisez le port 587 (STARTTLS) au lieu de 465

### Configuration recommandée pour OVH

```env
# Configuration SMTP OVH (maily.ovh)
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=redacted@example.invalid
SMTP_PASS=votre_mot_de_passe_noreply
SMTP_FROM=noreply@jobbingtrack.test
```

**Note** : Utilisez le port **587** avec `SMTP_SECURE=false` (STARTTLS) au lieu de 465, car :
- Le port 587 est moins souvent bloqué
- STARTTLS est plus compatible
- Meilleure délivrabilité

### Test d'envoi

1. **Utilisez une vraie adresse email** (pas `test.com`)
2. **Vérifiez votre boîte de réception** (et les spams)
3. **Vérifiez la boîte `redacted@example.invalid`** pour les erreurs de livraison

### Vérification des logs

```bash
# Logs auth-service
docker logs jobbingtrack-auth-service -f | grep -i email

# Logs OVH
# Connectez-vous à votre espace client OVH et vérifiez les logs d'envoi
```

## Problème : Test DNS affiche "utilisateur non trouvé"

### Cause
Le message d'erreur vient probablement d'une erreur d'authentification ou d'une erreur DNS mal formatée.

### Solution
1. Vérifiez que vous êtes connecté (token valide)
2. Rechargez la page
3. Vérifiez les logs : `docker logs jobbingtrack-auth-service -f`

## Problème : Routes 404

### Routes concernées
- `/api/v1/emails/test-dns` → 404
- `/api/v1/auth/users` → 404
- `/api/v1/users` → 404

### Solutions

1. **Redémarrer auth-service** :
```bash
make restart-service SERVICE=auth-service
```

2. **Vérifier que les routes sont enregistrées** :
```bash
docker logs jobbingtrack-auth-service | grep "Route"
```

3. **Vérifier l'API Gateway** :
```bash
docker logs jobbingtrack-api-gateway | grep "emails"
```

## Problème : Utilisateur admin non trouvé

### Solution
```bash
make create-admin-user
```

Puis reconnectez-vous avec :
- Email : `admin@jobbingtrack.test`
- Password : `password123`

## Configuration SMTP optimale pour OVH

### Port 587 (STARTTLS) - Recommandé

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=redacted@example.invalid
SMTP_PASS=votre_mot_de_passe
SMTP_FROM=noreply@jobbingtrack.test
```

### Port 465 (SSL/TLS) - Alternative

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=redacted@example.invalid
SMTP_PASS=votre_mot_de_passe
SMTP_FROM=noreply@jobbingtrack.test
```

### Après modification

```bash
make rebuild-service SERVICE=auth-service
```

