# ✅ MailHog supprimé - Configuration OVH uniquement

## Changements effectués

### 1. Suppression de MailHog
- ✅ Service `mailhog` retiré de `docker-compose.yml`
- ✅ Conteneur MailHog arrêté et supprimé
- ✅ Valeurs par défaut SMTP mises à jour pour OVH

### 2. Configuration SMTP par défaut
- **SMTP_HOST** : `ssl0.ovh.net` (au lieu de `mailhog`)
- **SMTP_PORT** : `465` (au lieu de `1025`)
- **SMTP_USE_SSL** : `true` (au lieu de `false`)

### 3. Scripts mis à jour
- ✅ `test-email-diagnostic.js` : Références à MailHog supprimées
- ✅ Scripts de test adaptés pour OVH uniquement

## Configuration actuelle (27/11/2025)

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=noreply@jobbingtrack.com
SMTP_PASS=D^^DKAqR&uxF$s9HeBrX
SMTP_FROM=noreply@jobbingtrack.com
SMTP_REPLY_TO=noreply@jobbingtrack.com
SMTP_SECURE=false
SMTP_USE_SSL=true
```

**Statut** : ✅ **OPÉRATIONNEL** - Les emails sont envoyés avec succès depuis `noreply@jobbingtrack.com`

## Problème d'authentification intermittent

### Symptôme
Certains emails échouent avec l'erreur `535 Authentication failed` alors que d'autres fonctionnent.

### Causes possibles
1. **Rate limiting OVH** : Trop de tentatives d'authentification en peu de temps
2. **Timing** : Le serveur OVH peut temporairement bloquer après plusieurs connexions
3. **Caractères spéciaux** : Le mot de passe contient `^`, `&`, `$` qui peuvent nécessiter un échappement

### Solutions implémentées
- ✅ Délai automatique de 1 seconde entre chaque envoi d'email
- ✅ Gestion d'erreur améliorée dans `email_service.py` avec logs détaillés
- ⚠️ **Note** : Le retry automatique a été retiré car OVH déconnecte après plusieurs erreurs

### Recommandations
1. **Éviter les envois trop rapides** : Attendre quelques secondes entre les envois
2. **Vérifier les logs OVH** : Consulter les logs d'authentification dans l'espace client OVH
3. **Tester la connexion** : Utiliser `make test-email-python` avant d'envoyer plusieurs emails

## Commandes utiles

```bash
# Tester la connexion SMTP
make test-email-python

# Tester l'envoi d'un email
make test-email-python-reset TEST_EMAIL=votre@email.com

# Diagnostic complet
make test-email-diagnostic

# Voir les logs d'emails
make test-email-logs
```

## Notes
- MailHog n'est plus nécessaire avec un compte OVH fonctionnel
- Tous les emails sont maintenant envoyés directement via OVH SMTP
- Le tracking des emails fonctionne toujours via le dashboard `/backoffice/email-monitor`

