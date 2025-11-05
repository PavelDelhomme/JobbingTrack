# 📧 Configuration Envoi d'Emails - JobbingTrack

> **Guide Complet : MailHog (Tests) + OVH maily.ovh (Production)**

---

## 📊 État Actuel

### ✅ Ce qui est DÉJÀ fait

```
✅ Système d'emails implémenté (vérification, reset password, bienvenue)
✅ Routes API fonctionnelles (/auth/verify-email, /auth/forgot-password)
✅ Service emailService.js configuré avec auth optionnelle
✅ MailHog installé et opérationnel (tests locaux)
✅ Configuration prête pour OVH maily.ovh (production)
```

**Voir** : `STATUS.md` section 1.12 et 1.13 pour les détails d'implémentation.

---

## 🎓 Comprendre les Bases

### Qu'est-ce que SMTP ?

**SMTP** = Simple Mail Transfer Protocol (Protocole Simple de Transfert de Mail)

**Analogie simple** : 
- SMTP est comme **La Poste** 📮
- Votre application est **l'expéditeur** qui écrit une lettre ✉️
- Le serveur SMTP est **le facteur** qui va livrer la lettre 🚶
- L'email du destinataire est **l'adresse de livraison** 🏠

### Les Variables SMTP Expliquées

| Variable | C'est Quoi ? | Exemple |
|----------|--------------|---------|
| **SMTP_HOST** | Adresse du serveur SMTP | `ssl0.ovh.net` |
| **SMTP_PORT** | Numéro de port | `465` ou `587` |
| **SMTP_SECURE** | Connexion sécurisée SSL ? | `true` ou `false` |
| **SMTP_USER** | Identifiant (votre email) | `redacted@example.invalid` |
| **SMTP_PASS** | Mot de passe | `votre_mot_de_passe` |
| **SMTP_FROM** | Nom d'expéditeur | `"JobbingTrack <redacted@example.invalid>"` |

### Les Ports SMTP

**Port 465** : SSL dès le début (recommandé)
- Configuration : `SMTP_PORT=465` et `SMTP_SECURE=true`
- Connexion chiffrée de bout en bout 🔒

**Port 587** : STARTTLS (chiffrement après connexion)
- Configuration : `SMTP_PORT=587` et `SMTP_SECURE=false`
- Connexion normale puis chiffrement activé

---

## 🎯 Deux Solutions

### 🐳 Solution 1 : MailHog (Tests Locaux) - ACTUELLE

**Pour qui ?** Développement et tests locaux uniquement

**C'est quoi ?** Faux serveur SMTP qui capture les emails localement

✅ **Avantages** :
- Open Source (MIT License)
- Gratuit et illimité
- Aucun compte externe requis
- Interface web : http://localhost:8025
- Parfait pour tester votre code

❌ **Inconvénient** :
- **N'envoie PAS de vrais emails** (les utilisateurs ne reçoivent RIEN)

**Statut** : ✅ **DÉJÀ CONFIGURÉ ET OPÉRATIONNEL**

---

### 🏢 Solution 2 : OVH avec maily.ovh (Production) - À CONFIGURER

**Pour qui ?** Production - envoyer de VRAIS emails aux utilisateurs

**C'est quoi ?** Serveur SMTP OVH professionnel avec votre domaine `maily.ovh`

✅ **Avantages** :
- **Envoie de VRAIS emails** (redacted@example.invalid recevra l'email !)
- Email professionnel : `redacted@example.invalid`
- Ne dévoile pas `example.invalid` (séparation pro/perso)
- 4,800 emails/jour (MX Plan largement suffisant)
- Vous contrôlez tout

⚠️ **Configuration requise** :
- Créer l'email chez OVH (15 min)
- Vérifier DNS (normalement déjà fait)
- Modifier le `.env`

---

## 📊 Comparaison MailHog vs OVH

| Critère | MailHog (Tests) | OVH maily.ovh (Prod) |
|---------|-----------------|----------------------|
| **Vrais emails envoyés** | ❌ NON | ✅ OUI |
| **redacted@example.invalid reçoit ?** | ❌ NON | ✅ OUI |
| **Interface pour voir** | ✅ localhost:8025 | ✅ Dashboard OVH |
| **Configuration** | ✅ Déjà fait | ⏱️ 15 minutes |
| **Coût** | 🆓 Gratuit | 💰 Inclus MX Plan |
| **Pour** | 🏠 Tests dev | 🚀 Production |

---

## 🚀 Configuration OVH avec maily.ovh

### Étape 1 : Créer l'Email chez OVH (5 minutes)

**1.1 Connexion OVH**

1. Aller sur : **https://www.ovh.com/manager/web/**
2. Se connecter avec vos identifiants OVH
3. Dans le menu de gauche, cliquer sur "**Emails**"
4. **Sélectionner** : `maily.ovh` (PAS example.invalid !)

**1.2 Créer l'Adresse Email**

1. Cliquer sur l'onglet "**Comptes email**"
2. Cliquer sur "**Créer une adresse email**"
3. Remplir :
   - **Compte** : `noreply`
   - **Domaine** : `maily.ovh` (auto)
   - **Mot de passe** : Créer un mot de passe FORT
     - Minimum 12 caractères
     - Majuscules + minuscules + chiffres + symboles
     - Exemple : `JobbingTrack2025!Secure`
     - ⚠️ **NOTEZ CE MOT DE PASSE** quelque part !

4. Valider

**Résultat** : ✅ Email `redacted@example.invalid` créé !

**1.3 Tester le Webmail (Optionnel)**

Vérifier que l'email fonctionne :
1. Aller sur : https://www.ovh.com/fr/mail/
2. Se connecter : `redacted@example.invalid` + votre mot de passe
3. Vous devriez voir la boîte mail vide

---

### Étape 2 : Vérifier la Configuration DNS (5 minutes)

**Important** : Pour éviter que vos emails arrivent en spam !

**2.1 Accéder à la Zone DNS**

1. Dans le manager OVH : "**Domaines**"
2. Cliquer sur `maily.ovh`
3. Onglet "**Zone DNS**"

**2.2 Vérifier les Enregistrements MX**

**Vous DEVEZ avoir** :

| Type | Nom | Valeur | Priorité |
|------|-----|--------|----------|
| MX | @ | mx1.mail.ovh.net | 1 |
| MX | @ | mx2.mail.ovh.net | 5 |

**Si absents**, cliquer sur "Ajouter une entrée" → Choisir "MX" → Remplir

**2.3 Vérifier l'Enregistrement SPF (Anti-Spam)**

**Vous DEVEZ avoir** :

| Type | Nom | Valeur |
|------|-----|--------|
| TXT | @ | `v=spf1 include:mx.ovh.com ~all` |

**Si absent**, cliquer sur "Ajouter une entrée" → Choisir "TXT" → Remplir

⏱️ **Propagation DNS** : 1 à 24 heures (mais souvent instantané)

---

### Étape 3 : Configurer le `.env` (2 minutes)

**Fichier** : `/home/pactivisme/Documents/Dev/Perso/JobbingTrack/.env`

**Commande rapide** :

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
nano .env
```

**Remplacer TOUTE la section SMTP par** :

```env
# ═══════════════════════════════════════════════════════════
# Configuration SMTP OVH - Domaine maily.ovh (PRODUCTION)
# ═══════════════════════════════════════════════════════════

# Serveur SMTP OVH
SMTP_HOST=ssl0.ovh.net

# Port SSL (recommandé)
SMTP_PORT=465

# SSL activé
SMTP_SECURE=true

# Votre email OVH complet
SMTP_USER=redacted@example.invalid

# Mot de passe créé à l'étape 1
SMTP_PASS=REMPLACER_PAR_VOTRE_MOT_DE_PASSE_OVH

# Nom d'expéditeur
SMTP_FROM="JobbingTrack <redacted@example.invalid>"

# URL frontend (pour liens de reset)
FRONTEND_URL=http://localhost:8080
```

**⚠️ IMPORTANT** : Remplacez `REMPLACER_PAR_VOTRE_MOT_DE_PASSE_OVH` par votre VRAI mot de passe !

**Alternative Port 587** (si 465 ne marche pas) :

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
# Reste identique
```

---

### Étape 4 : Redémarrer le Service (1 minute)

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Redémarrer le service auth
docker-compose --profile auth restart auth-service

# Attendre 3 secondes
sleep 3

# Vérifier que les variables sont chargées
docker exec jobbingtrack-auth-service sh -c 'echo "SMTP: $SMTP_HOST:$SMTP_PORT | USER: $SMTP_USER"'
```

**Résultat attendu** :
```
SMTP: ssl0.ovh.net:465 | USER: redacted@example.invalid
```

---

### Étape 5 : Tester avec un VRAI Email (2 minutes)

**Test 1 : Reset Password**

```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid"}'
```

**Vérifier** : Vous (Paul Delh) devez recevoir un email dans votre boîte Gmail ! 📧

**Test 2 : Inscription**

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"redacted@example.invalid",
    "password":"Test123!",
    "firstName":"Paul",
    "lastName":"Delh"
  }'
```

**Vérifier Gmail** : Vous devez recevoir 2 emails :
1. 📧 Email de bienvenue
2. ✅ Email de vérification (avec lien cliquable)

---

## 🧪 Vérifier les Logs

**Voir les logs du service** :

```bash
docker logs --tail 30 jobbingtrack-auth-service
```

**Logs de SUCCÈS attendus** :
```
✅ Email de bienvenue envoyé à redacted@example.invalid
✅ Email de vérification envoyé à redacted@example.invalid
```

**Logs d'ERREUR possibles** :

```
❌ Invalid login: 535 
→ Mauvais mot de passe OVH

❌ Connection timeout
→ Port bloqué ou serveur inaccessible

❌ Sender address rejected
→ Email redacted@example.invalid pas créé chez OVH
```

---

## ❌ Résolution de Problèmes OVH

### Erreur : "Invalid login: 535"

**Cause** : Mauvais mot de passe dans `.env`

**Solutions** :
1. Vérifier le mot de passe (copier depuis le manager OVH)
2. Vérifier que `redacted@example.invalid` existe bien
3. Tester la connexion webmail : https://www.ovh.com/fr/mail/
   - Email : `redacted@example.invalid`
   - Mot de passe : celui du `.env`

### Erreur : "Connection timeout" ou "Connection refused"

**Causes** :
1. Firewall bloque le port 465 ou 587
2. Serveur SMTP OVH temporairement indisponible

**Solutions** :
1. Essayer l'autre port (465 ↔ 587)
2. Vérifier statut OVH : https://web-cloud.status-ovhcloud.com/
3. Tester la connexion :
   ```bash
   telnet ssl0.ovh.net 465
   # ou
   telnet ssl0.ovh.net 587
   ```

### Erreur : "Sender address rejected"

**Cause** : Email `redacted@example.invalid` pas créé ou pas activé

**Solution** :
1. Vérifier dans le manager OVH que l'email existe
2. Attendre 5-10 minutes (propagation)
3. Tester le webmail OVH

### Emails arrivent dans les SPAMS

**Causes** :
1. SPF pas configuré
2. DKIM pas activé
3. Premier envoi (normal)
4. Domaine `maily.ovh` nouveau (pas de réputation)

**Solutions** :

**Vérifier SPF** :
```bash
dig maily.ovh TXT | grep spf
# Devrait afficher : v=spf1 include:mx.ovh.com ~all
```

**Activer DKIM chez OVH** :
1. Manager OVH → Emails → `maily.ovh`
2. Onglet "Paramètres"
3. Activer DKIM (si disponible)

**Marquer comme "Non spam"** :
1. Dans Gmail, ouvrir l'email
2. Cliquer sur "Signaler comme non spam"
3. Les prochains emails arriveront dans la boîte principale

**Attendre quelques jours** :
- La réputation du domaine se construit progressivement
- Plus vous envoyez d'emails légitimes, moins vous aurez de spam

---

## 🔄 Basculer entre MailHog (Tests) et OVH (Production)

### Configuration Actuelle : MailHog (Tests)

**Fichier `.env`** :
```env
SMTP_HOST=host.docker.internal
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
FRONTEND_URL=http://localhost:8080
```

**Résultat** : Emails capturés dans http://localhost:8025 (vrais utilisateurs ne reçoivent RIEN)

---

### Configuration Production : OVH maily.ovh

**Fichier `.env`** :
```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=redacted@example.invalid
SMTP_PASS=VOTRE_MOT_DE_PASSE_OVH_ICI
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
FRONTEND_URL=http://localhost:8080
```

**⚠️ REMPLACEZ** `VOTRE_MOT_DE_PASSE_OVH_ICI` par votre vrai mot de passe créé à l'étape 1 !

**Résultat** : Emails VRAIMENT envoyés (redacted@example.invalid les recevra !)

---

### Comment Basculer ?

**Pour basculer de MailHog → OVH** :

```bash
# 1. Modifier .env (remplacer les 3 lignes SMTP)
nano .env

# 2. Redémarrer le service
docker-compose --profile auth restart auth-service

# 3. Tester
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid"}'

# 4. Vérifier votre boîte Gmail !
```

**Pour basculer de OVH → MailHog** :

```bash
# 1. Modifier .env (remettre la config MailHog)
nano .env

# 2. Redémarrer
docker-compose --profile auth restart auth-service

# 3. Voir les emails sur http://localhost:8025
```

---

## 📋 Checklist Configuration OVH

### Avant de Commencer

- [ ] J'ai accès au manager OVH (https://www.ovh.com/manager/web/)
- [ ] J'ai le domaine `maily.ovh` actif
- [ ] J'ai une offre email OVH (MX Plan suffit)

### Création Email

- [ ] Email `redacted@example.invalid` créé chez OVH
- [ ] Mot de passe noté en sécurité
- [ ] Test webmail réussi (https://www.ovh.com/fr/mail/)

### Configuration DNS

- [ ] Enregistrement MX présent (mx1.mail.ovh.net)
- [ ] Enregistrement SPF présent (v=spf1 include:mx.ovh.com ~all)

### Configuration JobbingTrack

- [ ] Fichier `.env` modifié avec OVH
- [ ] Mot de passe OVH ajouté (VRAI mot de passe)
- [ ] Service auth redémarré
- [ ] Variables vérifiées dans Docker

### Tests

- [ ] Email de test envoyé
- [ ] Email reçu dans Gmail
- [ ] Lien de vérification fonctionne
- [ ] Pas d'erreur dans les logs

---

## 🧪 Tests de Validation

### Test 1 : Inscription avec Votre Email

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"redacted@example.invalid",
    "password":"Test123!",
    "firstName":"Paul",
    "lastName":"Delh"
  }'
```

**Vérifier Gmail** :
- ✅ Email de bienvenue reçu
- ✅ Email de vérification reçu (avec lien)

### Test 2 : Reset Password

```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid"}'
```

**Vérifier Gmail** :
- ✅ Email de reset password reçu
- ✅ Lien de reset fonctionne

### Test 3 : Via l'Interface Frontend

1. Aller sur : http://localhost:8080/register
2. S'inscrire avec `redacted@example.invalid`
3. Vérifier Gmail → Email reçu !
4. Cliquer sur le lien de vérification
5. Être redirigé vers la page de confirmation

---

## 💰 Offre OVH : MX Plan Suffit-il ?

### ✅ **OUI, LARGEMENT !**

**MX Plan OVH** :
- 📊 **200 emails/heure** 
- 📊 **4,800 emails/jour**
- 📊 **5-100 comptes email** (selon offre)

**Vos besoins JobbingTrack** :
- 📧 Reset password : ~1-5/jour
- ✅ Vérifications : ~2-10/jour
- 👋 Bienvenue : ~2-10/jour

**TOTAL** : ~5-25 emails/jour

**Verdict** : Vous utilisez **< 1%** de la capacité ! ✅

**Vous devrez upgrader SEULEMENT si** :
- Plus de 200 inscriptions/heure (très improbable)
- Newsletters marketing massives (pas prévu)

---

## 🔒 Sécurité

### Protection du `.env`

✅ **Le `.env` est protégé** :

```bash
# Vérifier
git check-ignore .env

# Résultat attendu : .env
```

### ⚠️ JAMAIS Commiter le `.env` !

**NE JAMAIS faire** :
```bash
git add .env       # ❌ NON !
git commit -a      # ❌ DANGEREUX !
```

**TOUJOURS vérifier** :
```bash
git status  # .env ne doit PAS apparaître
```

### Mot de Passe OVH

- ❌ Ne commitez JAMAIS le mot de passe
- ❌ Ne le partagez JAMAIS publiquement
- ✅ Stockez-le dans un gestionnaire de mots de passe (ex: Bitwarden, 1Password)

---

## 📊 Résumé Configuration

### Développement (Actuel)

```
Solution : MailHog
Emails : Capturés localement
Interface : http://localhost:8025
Utilisateurs : Ne reçoivent RIEN
Parfait pour : Tests de code
```

### Production (À Configurer)

```
Solution : OVH maily.ovh
Emails : VRAIMENT envoyés
Utilisateurs : Reçoivent les emails
Email expéditeur : redacted@example.invalid
Parfait pour : Vrais utilisateurs
```

---

## 🎯 Prochaines Actions

### Option A : Rester sur MailHog (Tests)

**Rien à faire !** Tout fonctionne déjà ✅

### Option B : Passer à OVH (Production)

**Suivre les 5 étapes ci-dessus** :
1. ✅ Créer `redacted@example.invalid` chez OVH
2. ✅ Vérifier DNS (MX, SPF)
3. ✅ Modifier `.env` avec OVH
4. ✅ Redémarrer le service
5. ✅ Tester avec votre email Gmail

**Temps estimé** : 15-20 minutes ⏱️

---

## 📚 Ressources

### Documentation

- **MailHog GitHub** : https://github.com/mailhog/MailHog
- **OVH - Créer email** : https://docs.ovh.com/fr/emails/
- **OVH - SMTP Config** : https://docs.ovh.com/fr/emails/
- **Nodemailer** : https://nodemailer.com/

### Fichiers du Projet

```
backend/auth-service/src/services/emailService.js
→ Service d'envoi (auth optionnelle pour MailHog)

backend/auth-service/src/controllers/auth.controller.js
→ Contrôleurs (register, verify-email, forgot-password)

STATUS.md section 1.12 et 1.13
→ Documentation complète implémentation
```

---

## ✅ État Final

```
┌──────────────────────────────────────────────────────────┐
│           CONFIGURATION EMAIL JOBBINGTRACK               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Tests (Développement) :                                 │
│    Solution : MailHog ✅                                 │
│    Status : Opérationnel ✅                              │
│    Interface : http://localhost:8025 ✅                  │
│    Vrais emails : ❌ NON (capturés localement)           │
│                                                          │
│  Production (Vrais Utilisateurs) :                       │
│    Solution : OVH maily.ovh ⏱️ À CONFIGURER              │
│    Email : redacted@example.invalid                             │
│    Serveur : ssl0.ovh.net:465                            │
│    Vrais emails : ✅ OUI (redacted@example.invalid recevra)   │
│                                                          │
│  Protection Domaine Personnel :                          │
│    example.invalid : ✅ PAS utilisé (reste privé)           │
│    maily.ovh : ✅ Utilisé (séparation pro/perso)         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

**🚀 Prêt à configurer OVH ? Suivez les 5 étapes ci-dessus !**

**Questions ? Voir STATUS.md section 1.13 ou relire ce guide.**
