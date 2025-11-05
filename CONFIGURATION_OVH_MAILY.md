# Configuration OVH avec maily.ovh pour JobbingTrack

> Guide personnalisé pour votre projet avec le domaine `maily.ovh`

---

## 🎯 Votre Situation

**Vous avez** :
- ✅ Domaine `maily.ovh` (libre d'utilisation)
- ✅ Domaine `delhomme.ovh` (déjà configuré, à ne pas toucher)
- ✅ Email existant `noreply@delhomme.ovh` (mais vous ne voulez pas l'utiliser)

**Vous voulez** :
- ✅ Envoyer des emails automatiques (reset password, vérification compte)
- ✅ Ne PAS dévoiler `delhomme.ovh` publiquement
- ✅ Séparer JobbingTrack de votre domaine personnel
- ❓ Savoir si l'offre MX Plan suffit

---

## ✅ **MA RECOMMANDATION : Utiliser `maily.ovh`**

### Pourquoi `maily.ovh` est parfait pour vous ?

1. **Séparation claire** 🎯
   - JobbingTrack → `maily.ovh` (professionnel)
   - Personnel → `delhomme.ovh` (privé)

2. **Aucune interférence** 🔒
   - Pas de risque de toucher à votre config `delhomme.ovh`
   - Configuration dédiée et isolée

3. **Professionnalisme** 💼
   - `noreply@maily.ovh` est générique et pro
   - Ne dévoile pas votre identité personnelle

4. **Flexibilité** 🚀
   - Vous pouvez tout configurer comme vous voulez
   - Pas de contraintes existantes

---

## 📋 **Étape 1 : Créer l'Adresse Email chez OVH**

### 1.1 Connexion à OVH

1. Aller sur : https://www.ovh.com/manager/web/
2. Se connecter avec vos identifiants OVH
3. Dans le menu de gauche, cliquer sur "**Emails**"
4. **Sélectionner le domaine `maily.ovh`** (pas delhomme.ovh !)

### 1.2 Créer l'Adresse Email

1. Cliquer sur l'onglet "**Comptes email**"
2. Cliquer sur "**Créer une adresse email**"
3. Remplir le formulaire :
   - **Compte** : `noreply`
   - **Domaine** : `maily.ovh` (normalement pré-rempli)
   - **Nom** : `JobbingTrack`
   - **Prénom** : `NoReply`
   - **Nom affiché** : `JobbingTrack - Ne pas répondre`
   - **Mot de passe** : Choisir un mot de passe FORT
     - Minimum 12 caractères
     - Majuscules + minuscules + chiffres + symboles
     - Exemple : `JobbingTrack2025!Secure@OVH`
     - ⚠️ **NOTEZ CE MOT DE PASSE**, vous en aurez besoin !

4. Cliquer sur "**Valider**"

**Résultat** : Vous avez maintenant `noreply@maily.ovh` ✅

---

## 📋 **Étape 2 : Vérifier la Configuration DNS**

**Important** : Pour éviter que vos emails soient marqués comme spam, vérifiez ces enregistrements DNS.

### 2.1 Accéder à la Zone DNS

1. Dans le manager OVH, aller dans "**Domaines**"
2. Cliquer sur `maily.ovh`
3. Cliquer sur l'onglet "**Zone DNS**"

### 2.2 Vérifier les Enregistrements MX

**Vous devez avoir** :

| Type | Nom | Valeur | Priorité |
|------|-----|--------|----------|
| MX | @ (ou vide) | mx1.mail.ovh.net | 1 |
| MX | @ (ou vide) | mx2.mail.ovh.net | 5 |

**Si absents** :
1. Cliquer sur "**Ajouter une entrée**"
2. Choisir "**MX**"
3. Remplir :
   - Sous-domaine : laisser vide (ou mettre `@`)
   - Priorité : 1
   - Cible : `mx1.mail.ovh.net`
4. Répéter pour `mx2.mail.ovh.net` avec priorité 5

### 2.3 Ajouter l'Enregistrement SPF (Anti-Spam)

**Vérifier la présence de** :

| Type | Nom | Valeur |
|------|-----|--------|
| TXT | @ (ou vide) | `v=spf1 include:mx.ovh.com ~all` |

**Si absent** :
1. Cliquer sur "**Ajouter une entrée**"
2. Choisir "**TXT**"
3. Remplir :
   - Sous-domaine : laisser vide (ou mettre `@`)
   - Valeur : `v=spf1 include:mx.ovh.com ~all`

**⏱️ Propagation DNS** : Les modifications DNS peuvent prendre 1 à 24 heures.

---

## 📋 **Étape 3 : Configurer le `.env` de JobbingTrack**

### 3.1 Localisation du Fichier

Le fichier `.env` se trouve **À LA RACINE** du projet :
```
/home/pactivisme/Documents/Dev/Perso/JobbingTrack/.env
```

### 3.2 Configuration SMTP Complète

**Ouvrir le fichier `.env`** et ajouter/modifier ces lignes :

```env
# ═══════════════════════════════════════════════════════════
# Configuration SMTP OVH - Domaine maily.ovh
# ═══════════════════════════════════════════════════════════

# Serveur SMTP OVH
SMTP_HOST=ssl0.ovh.net

# Port SMTP (SSL recommandé)
SMTP_PORT=465

# Sécurité SSL activée
SMTP_SECURE=true

# Identifiant : Votre email complet
SMTP_USER=noreply@maily.ovh

# Mot de passe : Le mot de passe que vous avez créé
SMTP_PASS=JobbingTrack2025!Secure@OVH

# Nom d'expéditeur (ce qui apparaît dans les emails)
SMTP_FROM="JobbingTrack <noreply@maily.ovh>"

# URL du frontend (pour les liens de reset password)
FRONTEND_URL=http://localhost:8080
```

**⚠️ REMPLACEZ** `JobbingTrack2025!Secure@OVH` par votre VRAI mot de passe !

### 3.3 Alternative avec Port 587 (STARTTLS)

Si le port 465 ne fonctionne pas, essayez le port 587 :

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@maily.ovh
SMTP_PASS=JobbingTrack2025!Secure@OVH
SMTP_FROM="JobbingTrack <noreply@maily.ovh>"
FRONTEND_URL=http://localhost:8080
```

**Différence** :
- **Port 465** : SSL dès le début (recommandé)
- **Port 587** : Connexion normale puis chiffrement (STARTTLS)

---

## 🔒 **Étape 4 : Sécurité - Protection du `.env`**

### 4.1 Vérifier que `.env` est ignoré par Git

**Vérification** :

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
git check-ignore .env
```

**Résultat attendu** : 
```
.env
```

Si le fichier apparaît, c'est bon ! ✅

**Si rien ne s'affiche** :

```bash
# Ajouter .env au .gitignore
echo ".env" >> .gitignore

# Si .env était déjà tracké, le retirer
git rm --cached .env
```

### 4.2 Vérifier le statut Git

```bash
git status
```

**Vous NE devez PAS voir** `.env` dans la liste !

Si vous le voyez :
```bash
git reset HEAD .env  # Retirer du staging
git rm --cached .env # Supprimer du tracking
```

### 4.3 **JAMAIS COMMITER le .env !**

❌ **NE JAMAIS FAIRE** :
```bash
git add .env  # ❌ NON !
git commit -a # ❌ NON ! (commit tout)
```

✅ **TOUJOURS VÉRIFIER** avant de commiter :
```bash
git status  # Vérifier qu'il n'y a pas .env
git diff    # Vérifier les modifications
```

---

## 📋 **Étape 5 : Tester la Configuration**

### 5.1 Redémarrer le Service Auth

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Redémarrer le service auth avec la nouvelle config
docker-compose --profile auth restart auth-service

# Attendre 3-5 secondes
sleep 5
```

### 5.2 Vérifier que les Variables sont Chargées

```bash
# Vérifier SMTP_HOST
docker exec jobbingtrack-auth-service sh -c 'echo "SMTP_HOST: $SMTP_HOST"'

# Vérifier SMTP_USER
docker exec jobbingtrack-auth-service sh -c 'echo "SMTP_USER: $SMTP_USER"'
```

**Résultat attendu** :
```
SMTP_HOST: ssl0.ovh.net
SMTP_USER: noreply@maily.ovh
```

### 5.3 Test 1 : Reset Password

```bash
# Tester l'envoi d'un email de reset password
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"VOTRE_VRAIE_ADRESSE@gmail.com"}'
```

**Résultat attendu** :
```json
{
  "success": true,
  "message": "Si cette adresse email existe, un lien de réinitialisation a été envoyé"
}
```

**Vérifier** : Vous devriez recevoir l'email dans votre boîte Gmail !

### 5.4 Test 2 : Vérification Email (Inscription)

```bash
# Créer un nouveau compte
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"VOTRE_VRAIE_ADRESSE@gmail.com",
    "password":"Test123!",
    "firstName":"Test",
    "lastName":"User"
  }'
```

**Vérifier** : Vous devriez recevoir 2 emails :
1. Email de bienvenue
2. Email de vérification de compte

### 5.5 Vérifier les Logs

**En cas de problème** :

```bash
# Voir les derniers logs
docker logs --tail 50 jobbingtrack-auth-service

# Filtrer les erreurs email
docker logs jobbingtrack-auth-service 2>&1 | grep -i "email\|smtp\|error"

# Suivre les logs en temps réel
docker logs -f jobbingtrack-auth-service
```

**Logs de succès attendus** :
```
✅ Email de bienvenue envoyé avec succès
✅ Email de vérification envoyé
```

**Erreurs possibles** :
```
❌ Invalid login: 535 → Mauvais mot de passe
❌ Connection refused → Port bloqué ou serveur inaccessible
```

---

## 💰 **Offre OVH : MX Plan Suffit-il ?**

### Votre Question : "L'offre MX 5 devrait suffire non ?"

**✅ OUI, LARGEMENT !**

### Détails de l'Offre MX Plan

**MX Plan** (inclus avec la plupart des hébergements OVH) :

| Critère | Limite | Votre Besoin | Verdict |
|---------|--------|--------------|---------|
| **Emails/heure** | 200 | 1-10 max | ✅ Large |
| **Emails/jour** | 4,800 | 10-50 max | ✅ Large |
| **Comptes email** | 5-100 | 1 (noreply) | ✅ Suffisant |
| **Stockage/email** | 5 GB | ~0 (transactionnel) | ✅ Large |

### Types d'Emails JobbingTrack

Vous allez envoyer des **emails transactionnels** :
- 📧 Reset password
- ✅ Vérification email
- 👋 Email de bienvenue

**Volumétrie estimée** (pour un projet en développement/MVP) :
- Reset password : ~1-5 emails/jour
- Vérifications : ~2-10 emails/jour (nouvelles inscriptions)
- Bienvenue : ~2-10 emails/jour

**TOTAL** : **~5-25 emails/jour maximum**

**200 emails/heure = 4,800 emails/jour** → Vous êtes **TRÈS LOIN** de la limite ! ✅

### Quand Upgrader ?

**Vous devrez upgrader SI** :
- ❌ Plus de 200 inscriptions/heure (très improbable !)
- ❌ Newsletters marketing (pas le cas ici)
- ❌ Campagnes massives (pas prévu)

**Pour JobbingTrack** : MX Plan suffit **largement** ! 🎯

---

## ⚡ **Configuration Production (Futur)**

Quand vous passerez en production sur un serveur public :

### Changements à faire dans `.env` :

```env
# Configuration Production
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@maily.ovh
SMTP_PASS=VotreMotDePasseOVH
SMTP_FROM="JobbingTrack <noreply@maily.ovh>"

# ⚠️ CHANGER l'URL du frontend
FRONTEND_URL=https://jobbingtrack.com  # Votre vrai domaine
```

### Recommandations Production

1. **Variables d'environnement** : Utiliser les variables serveur (pas `.env` en clair)
2. **HTTPS obligatoire** : Certificat SSL sur votre domaine
3. **DKIM** : Configurer DKIM chez OVH pour améliorer la délivrabilité
4. **Monitoring** : Surveiller les emails envoyés/reçus/rejetés

---

## 🎯 **Résumé de Votre Configuration**

```
┌─────────────────────────────────────────────────────────┐
│                    VOTRE CONFIGURATION                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Domaine utilisé : maily.ovh ✅                        │
│  Email expéditeur : noreply@maily.ovh ✅               │
│  Serveur SMTP : ssl0.ovh.net ✅                        │
│  Port : 465 (SSL) ou 587 (STARTTLS)                    │
│  Offre OVH : MX Plan (largement suffisant) ✅          │
│                                                         │
│  Domaine personnel (delhomme.ovh) :                    │
│  → PAS utilisé ✅                                       │
│  → PAS dévoilé ✅                                       │
│  → Configuration inchangée ✅                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ **Checklist Finale**

Avant de commencer, vérifiez :

- [ ] J'ai créé `noreply@maily.ovh` chez OVH
- [ ] J'ai noté le mot de passe en sécurité
- [ ] Les enregistrements DNS MX sont configurés
- [ ] L'enregistrement SPF est ajouté
- [ ] J'ai modifié le `.env` à la racine du projet
- [ ] J'ai remplacé le mot de passe par le vrai
- [ ] Le `.env` est ignoré par Git (vérifié avec `git check-ignore .env`)
- [ ] J'ai redémarré le service auth
- [ ] J'ai testé l'envoi d'email
- [ ] J'ai vérifié la réception dans ma vraie boîte mail

---

## 🆘 **Problèmes Courants**

### ❌ "Invalid login: 535"

**Causes possibles** :
1. Mauvais mot de passe dans `.env`
2. Email `noreply@maily.ovh` pas créé chez OVH
3. Compte email OVH suspendu/bloqué

**Solutions** :
1. Vérifier le mot de passe (copier/coller depuis le manager OVH)
2. Vérifier que le compte email existe bien
3. Se connecter au webmail OVH pour tester : https://www.ovh.com/fr/mail/

### ❌ "Connection timeout"

**Causes** :
1. Firewall bloque le port 465 ou 587
2. Serveur SMTP OVH temporairement indisponible

**Solutions** :
1. Essayer l'autre port (465 ↔ 587)
2. Vérifier votre connexion Internet
3. Vérifier le statut OVH : https://web-cloud.status-ovhcloud.com/

### ❌ Emails arrivent dans les spams

**Causes** :
1. SPF pas configuré
2. DKIM pas activé
3. Premier envoi (normal)

**Solutions** :
1. Vérifier l'enregistrement SPF dans la zone DNS
2. Activer DKIM chez OVH (Settings → Domaines → maily.ovh → Email → DKIM)
3. Attendre quelques jours (réputation du domaine se construit)

---

## 📞 **Support**

**Documentation OVH** :
- Créer email : https://docs.ovh.com/fr/emails/
- Configuration SMTP : https://docs.ovh.com/fr/emails/mail-mutualise-guide-de-configuration-dun-e-mail-mutualise-ovh-sur-iphone-ios-91/
- Zone DNS : https://docs.ovh.com/fr/domains/editer-ma-zone-dns/

**Votre Configuration** :
- Voir `STATUS.md` section 1.13
- Voir `MAIL.md` pour les détails SMTP généraux

---

**🎉 Vous êtes prêt ! Suivez les étapes et vos emails partiront via `noreply@maily.ovh` sans dévoiler `delhomme.ovh` !**

