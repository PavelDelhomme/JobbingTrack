# Configuration Email OVH avec jobbingtrack.com

## 📋 Configuration Email OVH - JobbingTrack

> **✅ STATUT ACTUEL (27/11/2025)** : Le compte `noreply@jobbingtrack.com` est créé et opérationnel. Les emails sont envoyés avec succès.

### 1. Achat du domaine jobbingtrack.com
- ✅ **TERMINÉ** - Le domaine `jobbingtrack.com` est acheté
- ✅ **TERMINÉ** - Le compte `noreply@jobbingtrack.com` est créé

### 2. Configuration Email OVH

#### Option A : Zimbra Starter (Recommandé pour commencer)
**Avantages :**
- ✅ Simple et économique
- ✅ 5 Go de stockage par boîte
- ✅ Interface webmail incluse
- ✅ Parfait pour `noreply@jobbingtrack.com`

**Prix :** ~1€/mois par boîte mail

**Étapes :**
1. Dans votre espace client OVH, allez dans **Emails** → **Créer une adresse email**
2. Choisissez **Zimbra Starter**
3. Créez l'adresse : `noreply@jobbingtrack.com`
4. Définissez un mot de passe fort
5. Notez les identifiants SMTP :
   - **Serveur SMTP** : `ssl0.ovh.net`
   - **Port SMTP** : `465` (SSL) ou `587` (STARTTLS)
   - **Utilisateur** : `noreply@jobbingtrack.com`
   - **Mot de passe** : Le mot de passe que vous avez défini

#### Option B : Email Pro (Plus professionnel)
**Avantages :**
- ✅ Plus d'espace (10 Go)
- ✅ Synchronisation Exchange
- ✅ Meilleure délivrabilité
- ✅ Support avancé

**Prix :** ~3€/mois par boîte mail

### 3. Configuration DNS (Important pour la délivrabilité)

Une fois le domaine acheté, configurez les enregistrements DNS :

#### Enregistrements MX (Obligatoire)
```
Type: MX
Nom: @ (ou jobbingtrack.com)
Priorité: 10
Valeur: mx1.mail.ovh.net
```

```
Type: MX
Nom: @ (ou jobbingtrack.com)
Priorité: 20
Valeur: mx2.mail.ovh.net
```

#### Enregistrement SPF (Recommandé)
```
Type: TXT
Nom: @ (ou jobbingtrack.com)
Valeur: v=spf1 include:mx.ovh.com ~all
```

#### Enregistrement DKIM (Optionnel mais recommandé)
- OVH génère automatiquement les clés DKIM
- Récupérez-les dans l'interface OVH → Emails → DKIM
- Ajoutez-les comme enregistrements TXT

### 4. Mise à jour de la configuration JobbingTrack

Une fois l'adresse `noreply@jobbingtrack.com` créée, mettez à jour votre fichier `.env` :

```env
# Email Configuration SMTP OVH
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=noreply@jobbingtrack.com
SMTP_PASS=VotreMotDePasseOVH
SMTP_FROM=noreply@jobbingtrack.com
SMTP_REPLY_TO=noreply@jobbingtrack.com
SMTP_SECURE=false
SMTP_USE_SSL=true
```

### 5. Test de la configuration

```bash
# Tester la connexion SMTP
make test-email-python

# Tester l'envoi d'un email
make test-email-python-reset TEST_EMAIL=test@delhomme.ovh

# Vérifier les logs
make test-email-logs
```

### 6. Vérification de la délivrabilité

1. **Vérifier les DNS** : Utilisez `/backoffice/emails/deliverability` dans le dashboard
2. **Tester l'envoi** : Envoyez un email de test
3. **Vérifier la réception** : Vérifiez votre boîte mail (et les spams)

## ⚠️ Points importants

1. **Attendre la propagation DNS** : Les enregistrements DNS peuvent prendre 24-48h
2. **Vérifier les spams** : Les premiers emails peuvent arriver en spam
3. **Configuration SPF/DKIM** : Essentiel pour éviter les spams
4. **Mot de passe fort** : Utilisez un mot de passe sécurisé pour l'adresse email

## 🔧 Dépannage

### Les emails ne sont pas reçus
1. Vérifiez les spams
2. Vérifiez que les DNS sont bien configurés
3. Vérifiez les logs dans `/backoffice/email-monitor`
4. Testez avec `make test-email-diagnostic`

### Erreur d'authentification SMTP
1. Vérifiez que l'adresse email existe bien dans OVH
2. Vérifiez le mot de passe dans `.env`
3. Vérifiez que le port 465 est bien ouvert

### Emails en spam
1. Configurez SPF et DKIM
2. Attendez quelques jours pour que la réputation s'établisse
3. Évitez d'envoyer trop d'emails au début

## 📚 Ressources

- [Documentation OVH Email](https://docs.ovh.com/fr/emails/)
- [Configuration DNS OVH](https://docs.ovh.com/fr/domains/editer-ma-zone-dns/)
- [Configuration SPF/DKIM OVH](https://docs.ovh.com/fr/microsoft-collaborative-solutions/configuration-spf-dkim-dmarc/)

