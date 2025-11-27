# 🔍 Vérification du compte email noreply@jobbingtrack.test

## ✅ Configuration actuelle (27/11/2025)

- **Utilisateur** : `noreply@jobbingtrack.test`
- **Mot de passe** : `D^^DKAqR&uxF$s9HeBrX`
- **Serveur SMTP** : `ssl0.ovh.net`
- **Port** : `465` (SSL)
- **Statut** : ✅ **OPÉRATIONNEL** - Les emails sont envoyés avec succès

## ⚠️ Problème d'authentification

L'erreur `535 Authentication failed` peut avoir plusieurs causes :

### 1. Vérifier que le compte est actif

1. Connectez-vous à votre espace client OVH
2. Allez dans **Emails** → **noreply@jobbingtrack.test**
3. Vérifiez que le statut est **"Actif"** (pas "En attente" ou "Suspendu")

### 2. Se connecter une première fois via le webmail

**Important** : Parfois, OVH exige une première connexion via le webmail avant d'autoriser l'accès SMTP.

1. Allez sur https://www.ovh.com/mail/
2. Connectez-vous avec :
   - **Email** : `noreply@jobbingtrack.test`
   - **Mot de passe** : `D^^DKAqR&uxF$s9HeBrX`
3. Si la connexion fonctionne, attendez 5-10 minutes
4. Réessayez l'envoi d'email

### 3. Vérifier les DNS MX

Les enregistrements MX doivent être configurés pour que le compte fonctionne :

```
Type: MX
Sous-domaine: @
Priorité: 10
Cible: mx1.mail.ovh.net
```

```
Type: MX
Sous-domaine: @
Priorité: 20
Cible: mx2.mail.ovh.net
```

### 4. Attendre la propagation

Si le compte vient d'être créé, attendez **15-30 minutes** pour que tout soit synchronisé.

### 5. Vérifier le mot de passe

Assurez-vous que le mot de passe est correct :
- Pas d'espaces avant/après
- Tous les caractères spéciaux sont présents

## 🧪 Test manuel

Testez la connexion directement :

```bash
# Dans le conteneur
docker exec -it jobbingtrack-auth-service python3

# Puis dans Python :
import smtplib
server = smtplib.SMTP_SSL('ssl0.ovh.net', 465)
server.login('noreply@jobbingtrack.test', 'D^^DKAqR&uxF$s9HeBrX')
print('✅ OK')
server.quit()
```

## 📞 Si ça ne fonctionne toujours pas

1. **Vérifiez les logs OVH** : Dans votre espace client, consultez les logs d'authentification
2. **Contactez le support OVH** : Ils peuvent vérifier si le compte est bien configuré
3. **Vérifiez que le domaine est bien actif** : Le domaine `jobbingtrack.com` doit être actif et les DNS doivent pointer vers OVH

## 🔄 Après résolution

Une fois que l'authentification fonctionne :

```bash
# Tester la connexion
make test-email-python

# Tester l'envoi
make test-email-python-reset TEST_EMAIL=test@example.invalid
```

