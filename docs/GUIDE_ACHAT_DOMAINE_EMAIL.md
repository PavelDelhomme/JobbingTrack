# 🎯 Guide Rapide : Achat du domaine jobbingtrack.com et configuration email

## ✅ Oui, Zimbra Starter est parfait !

**Zimbra Starter** est une excellente option pour commencer :
- ✅ **Prix** : ~1€/mois (très économique)
- ✅ **Simple** : Configuration en 5 minutes
- ✅ **Suffisant** : 5 Go de stockage (largement assez pour noreply@)
- ✅ **Fiable** : Infrastructure OVH professionnelle

## 📝 Étapes à suivre (dans l'ordre)

### Étape 1 : Acheter le domaine jobbingtrack.com
1. Allez sur [OVH.com](https://www.ovh.com)
2. Recherchez `jobbingtrack.com`
3. Ajoutez-le au panier et finalisez l'achat
4. ⏳ **Attendez 24-48h** pour la propagation DNS

### Étape 2 : Créer l'adresse email noreply@jobbingtrack.com

**Dans votre espace client OVH :**

1. Allez dans **"Emails"** (menu de gauche)
2. Cliquez sur **"Créer une adresse email"**
3. Sélectionnez **"Zimbra Starter"** (1€/mois)
4. Remplissez :
   - **Nom de l'adresse** : `noreply`
   - **Domaine** : `jobbingtrack.com`
   - **Mot de passe** : Choisissez un mot de passe fort (notez-le !)
5. Validez la création

### Étape 3 : Noter les identifiants SMTP

Une fois l'adresse créée, notez ces informations :

```
Serveur SMTP : ssl0.ovh.net
Port SMTP : 465
Utilisateur : noreply@jobbingtrack.com
Mot de passe : [Le mot de passe que vous avez défini]
```

### Étape 4 : Configurer les DNS (Important !)

**Dans OVH → Domaine → Zone DNS :**

#### 1. Enregistrements MX (Obligatoire)
Ajoutez ces 2 enregistrements :

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

#### 2. Enregistrement SPF (Recommandé)
```
Type: TXT
Sous-domaine: @
Valeur: v=spf1 include:mx.ovh.com ~all
```

#### 3. Enregistrement DKIM (Optionnel mais recommandé)
- Dans OVH → Emails → Votre adresse → DKIM
- Copiez la clé DKIM fournie
- Ajoutez-la comme enregistrement TXT dans la zone DNS

### Étape 5 : Mettre à jour votre fichier .env

Une fois l'adresse créée, modifiez votre fichier `.env` à la racine du projet :

```env
# Email Configuration SMTP OVH (après achat du domaine)
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=noreply@jobbingtrack.com
SMTP_PASS=VotreMotDePasseOVH
SMTP_FROM=noreply@jobbingtrack.com
SMTP_REPLY_TO=noreply@jobbingtrack.com
SMTP_SECURE=false
SMTP_USE_SSL=true
```

### Étape 6 : Redémarrer les services

```bash
# Redémarrer auth-service pour prendre en compte la nouvelle config
make restart-service SERVICE=auth-service

# Tester la connexion
make test-email-python

# Tester l'envoi
make test-email-python-reset TEST_EMAIL=test@delhomme.ovh
```

## ⚠️ Points importants

1. **Attendre la propagation DNS** : Les DNS peuvent prendre 24-48h. Ne paniquez pas si ça ne marche pas immédiatement.

2. **Vérifier les spams** : Les premiers emails peuvent arriver en spam. Vérifiez votre dossier spam/courrier indésirable.

3. **Configuration SPF/DKIM** : Essentiel pour éviter que vos emails soient marqués comme spam. Configurez-les dès que possible.

4. **Mot de passe fort** : Utilisez un mot de passe sécurisé (minimum 12 caractères, avec majuscules, minuscules, chiffres et symboles).

## 🔍 Vérification

Une fois tout configuré, vérifiez dans le dashboard :
- `/backoffice/emails/deliverability` : Testez les DNS
- `/backoffice/email-monitor` : Voir tous les emails envoyés
- `/backoffice/emails/settings` : Vérifier la configuration SMTP

## ✅ Configuration Actuelle (27/11/2025)

**Statut** : ✅ **TERMINÉ** - Le domaine `jobbingtrack.com` est acheté et le compte `noreply@jobbingtrack.com` est créé et opérationnel.

**Configuration** :
- Compte : `noreply@jobbingtrack.com`
- Serveur : `ssl0.ovh.net:465` (SSL)
- Les emails sont envoyés avec succès ✅

## 📞 Besoin d'aide ?

Si vous avez des questions lors de la configuration :
1. Vérifiez les logs : `docker logs jobbingtrack-auth-service`
2. Testez la connexion : `make test-email-diagnostic`
3. Consultez la documentation OVH : https://docs.ovh.com/fr/emails/

