# 📧 Guide ULTRA-COMPLET Configuration OVH maily.ovh

> **Guide détaillé étape par étape pour que ça FONCTIONNE à coup sûr**

---

## 🎯 Objectif

**Envoyer de VRAIS emails** via OVH avec votre domaine `maily.ovh` pour que :
- ✅ `redacted@example.invalid` reçoive les emails de vérification
- ✅ `redacted@example.invalid` reçoive les emails de reset password
- ✅ Tous vos utilisateurs reçoivent les emails

---

## ⚠️ IMPORTANT : Vous avez DÉJÀ tout le code !

**Perplexity vous dit de créer** :
- ❌ emailService.js
- ❌ authController.js
- ❌ Routes
- ❌ Templates d'emails

**MAIS vous avez DÉJÀ TOUT ÇA dans** :
- ✅ `backend/auth-service/src/services/emailService.js` (189 lignes)
- ✅ `backend/auth-service/src/controllers/auth.controller.js` (1235 lignes)
- ✅ `backend/auth-service/src/routes/auth.routes.js` (88 lignes)
- ✅ Routes `/auth/verify-email`, `/auth/forgot-password`, `/auth/resend-verification`
- ✅ Templates HTML magnifiques déjà codés

**CE QU'IL VOUS MANQUE** : Configuration OVH dans le `.env` !

---

## 📋 PARTIE 1 : Configuration OVH (Manager Web)

### Étape 1.1 : Activer l'Offre Email (Si pas déjà fait)

**Vérifier si vous avez déjà une offre email** :

1. Aller sur : https://www.ovh.com/manager/web/
2. Se connecter
3. Menu "**Emails**"
4. Chercher `maily.ovh`

**Si `maily.ovh` apparaît** : ✅ Offre déjà active, passez à l'étape 1.2

**Si `maily.ovh` n'apparaît PAS** :
1. Aller dans "**Domaines**" → `maily.ovh`
2. Chercher "**Commander**" ou "**Ajouter une offre email**"
3. Choisir **MX Plan** (suffisant pour vous)
4. Valider et attendre activation (5-30 minutes)

**MX Plan OVH** :
- Prix : Souvent inclus avec l'hébergement, sinon ~1€/mois
- Emails : 200/heure, 4,800/jour
- Comptes : 5 à 100 (selon offre)

---

### Étape 1.2 : Créer l'Adresse Email `redacted@example.invalid`

**Dans le Manager OVH** :

1. Menu "**Emails**"
2. Cliquer sur `maily.ovh`
3. Onglet "**Comptes email**"

**Vous voyez la liste des comptes email existants** (probablement vide)

4. Cliquer sur le bouton "**Créer une adresse email**" (ou "Ajouter un compte")

**Formulaire de création** :

| Champ | Valeur à Remplir | Exemple |
|-------|------------------|---------|
| **Compte** | `noreply` | `noreply` |
| **Domaine** | `maily.ovh` (auto) | `maily.ovh` |
| **Nom** | `JobbingTrack` | `JobbingTrack` |
| **Prénom** | `NoReply` | `NoReply` |
| **Nom affiché** | `JobbingTrack - Ne pas répondre` | - |
| **Mot de passe** | **CRÉER UN MOT DE PASSE FORT** | Voir ci-dessous |

**⚠️ CRÉER UN MOT DE PASSE FORT** :
- Minimum **12 caractères**
- Majuscules + minuscules + chiffres + symboles
- Exemples (ne les utilisez PAS) :
  - `JobTrack2025!Secure@OVH`
  - `M@ilyOVH#Track2025`
  - `Secure!Email$2025`

**✍️ NOTEZ CE MOT DE PASSE** quelque part (bloc-notes, gestionnaire de mots de passe) !

5. Cliquer sur "**Valider**" ou "**Créer**"

**Résultat** : ✅ Email `redacted@example.invalid` créé !

**Temps d'activation** : Instantané à 5 minutes

---

### Étape 1.3 : Tester le Compte Email (Vérification)

**Connexion au Webmail OVH** :

1. Aller sur : https://www.ovh.com/fr/mail/
2. Se connecter :
   - Email : `redacted@example.invalid`
   - Mot de passe : Celui que vous venez de créer
3. Vous devriez voir une boîte mail vide

**Si la connexion fonctionne** : ✅ Le compte est actif !

**Si erreur "Identifiants incorrects"** :
- Attendre 5 minutes (propagation)
- Vérifier le mot de passe
- Réessayer

---

### Étape 1.4 : Vérifier la Configuration DNS (IMPORTANT)

**Pourquoi ?** Pour éviter que vos emails arrivent en spam !

**Accéder à la Zone DNS** :

1. Manager OVH → Menu "**Domaines**"
2. Cliquer sur `maily.ovh`
3. Onglet "**Zone DNS**"

**Vous verrez une liste d'enregistrements DNS**

---

#### **Vérifier les Enregistrements MX** (Obligatoire)

**Chercher ces lignes** :

| Type | Sous-domaine | Cible | Priorité |
|------|--------------|-------|----------|
| MX | @ (ou vide) | mx1.mail.ovh.net | 1 |
| MX | @ (ou vide) | mx2.mail.ovh.net | 5 |
| MX | @ (ou vide) | mx3.mail.ovh.net | 10 |

**Si PRÉSENTS** : ✅ Parfait ! Passez à SPF

**Si ABSENTS** : Ajouter manuellement :

1. Cliquer sur "**Ajouter une entrée**"
2. Choisir "**MX**"
3. Remplir :
   - Sous-domaine : Laisser vide (ou mettre `@`)
   - Cible : `mx1.mail.ovh.net`
   - Priorité : `1`
4. Cliquer "**Suivant**" puis "**Valider**"
5. Répéter pour `mx2.mail.ovh.net` (priorité 5) et `mx3.mail.ovh.net` (priorité 10)

**Temps de propagation** : Instantané à 1 heure

---

#### **Vérifier l'Enregistrement SPF** (Anti-Spam)

**Chercher cette ligne** :

| Type | Sous-domaine | Valeur |
|------|--------------|--------|
| TXT | @ (ou vide) | `v=spf1 include:mx.ovh.com ~all` |

**Si PRÉSENT** : ✅ Parfait ! Tout est bon

**Si ABSENT** : Ajouter :

1. Cliquer sur "**Ajouter une entrée**"
2. Choisir "**TXT**"
3. Remplir :
   - Sous-domaine : Laisser vide (ou mettre `@`)
   - Valeur : `v=spf1 include:mx.ovh.com ~all`
4. Valider

**C'est quoi SPF ?**

SPF = Sender Policy Framework

Ça dit aux serveurs emails (Gmail, Outlook, etc.) :
> "Les emails venant de `maily.ovh` sont légitimes s'ils proviennent des serveurs OVH (mx.ovh.com)"

**Sans SPF** : Vos emails risquent d'arriver en spam 📬

**Avec SPF** : Vos emails arrivent dans la boîte principale ✅

---

#### **Vérifier DKIM** (Signature Email - Optionnel mais Recommandé)

**DKIM** = DomainKeys Identified Mail

Ça ajoute une signature cryptographique à vos emails pour prouver qu'ils viennent bien de vous.

**Activer DKIM chez OVH** :

1. Manager OVH → Emails → `maily.ovh`
2. Chercher "**DKIM**" ou "**Signature**"
3. Si option disponible, **Activer**

**Si pas d'option DKIM** : Pas grave, SPF suffit pour commencer ✅

---

### Étape 1.5 : Tester la Configuration DNS (Vérification)

**Depuis votre terminal** :

```bash
# Vérifier les enregistrements MX
dig maily.ovh MX +short

# Résultat attendu :
# 1 mx1.mail.ovh.net.
# 5 mx2.mail.ovh.net.
# 10 mx3.mail.ovh.net.
```

```bash
# Vérifier SPF
dig maily.ovh TXT +short | grep spf

# Résultat attendu :
# "v=spf1 include:mx.ovh.com ~all"
```

**Si les commandes affichent les résultats attendus** : ✅ DNS OK !

---

## 📋 PARTIE 2 : Configuration JobbingTrack (Fichier `.env`)

### Étape 2.1 : Ouvrir le Fichier `.env`

**Localisation** : `/home/pactivisme/Documents/Dev/Perso/JobbingTrack/.env`

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
nano .env
```

---

### Étape 2.2 : Chercher la Section SMTP

**Chercher ces lignes** (actuellement pour MailHog) :

```env
SMTP_HOST=host.docker.internal
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
```

---

### Étape 2.3 : Remplacer par la Configuration OVH

**SUPPRIMER les lignes ci-dessus et les REMPLACER par** :

```env
# ═══════════════════════════════════════════════════════════
# Configuration SMTP OVH - Domaine maily.ovh
# ═══════════════════════════════════════════════════════════

# Serveur SMTP OVH principal
SMTP_HOST=ssl0.ovh.net

# Port SSL/TLS (465 recommandé pour sécurité maximale)
SMTP_PORT=465

# Activer SSL (true pour port 465)
SMTP_SECURE=true

# Votre adresse email OVH complète
SMTP_USER=redacted@example.invalid

# Mot de passe créé à l'étape 1.2 (REMPLACER PAR LE VRAI !)
SMTP_PASS=VOTRE_MOT_DE_PASSE_OVH_ICI

# Nom d'expéditeur (ce qui apparaît dans les emails)
SMTP_FROM="JobbingTrack <redacted@example.invalid>"

# URL du frontend (pour les liens dans les emails)
FRONTEND_URL=http://localhost:8080
```

**⚠️ REMPLACER ABSOLUMENT** :
- `VOTRE_MOT_DE_PASSE_OVH_ICI` → Le mot de passe que vous avez créé à l'étape 1.2

**Exemple (avec un faux mot de passe)** :
```env
SMTP_PASS=JobTrack2025!Secure@OVH
```

---

### Étape 2.4 : Alternative Port 587 (Si 465 ne fonctionne pas)

**Si vous avez des erreurs avec le port 465**, essayez le port 587 (STARTTLS) :

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false  # false pour port 587 !
SMTP_USER=redacted@example.invalid
SMTP_PASS=VOTRE_MOT_DE_PASSE_OVH_ICI
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
FRONTEND_URL=http://localhost:8080
```

**Différence** :
- **Port 465** : SSL dès le début (plus sécurisé) ✅ Recommandé
- **Port 587** : STARTTLS (chiffrement après connexion)

---

### Étape 2.5 : Sauvegarder le Fichier

**Dans nano** :
1. Appuyer sur `Ctrl+O` (écrire)
2. Appuyer sur `Enter` (confirmer)
3. Appuyer sur `Ctrl+X` (quitter)

**Vérifier** :
```bash
cat .env | grep -E "^SMTP_"
```

**Résultat attendu** :
```
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=redacted@example.invalid
SMTP_PASS=VotreMotDePasse  # (votre vrai mot de passe)
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
```

---

## 📋 PARTIE 3 : Redémarrage et Tests

### Étape 3.1 : Redémarrer le Service Auth

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Arrêter et redémarrer complètement le service
docker-compose --profile auth down auth-service
docker-compose --profile auth up -d auth-service

# Attendre 5 secondes que le service démarre
sleep 5
```

---

### Étape 3.2 : Vérifier que les Variables sont Chargées

```bash
# Vérifier SMTP_HOST
docker exec jobbingtrack-auth-service sh -c 'echo "SMTP_HOST: $SMTP_HOST"'

# Résultat attendu : ssl0.ovh.net
```

```bash
# Vérifier SMTP_USER
docker exec jobbingtrack-auth-service sh -c 'echo "SMTP_USER: $SMTP_USER"'

# Résultat attendu : redacted@example.invalid
```

```bash
# Vérifier SMTP_PORT et SMTP_SECURE
docker exec jobbingtrack-auth-service sh -c 'echo "PORT: $SMTP_PORT | SECURE: $SMTP_SECURE"'

# Résultat attendu : PORT: 465 | SECURE: true
```

**Si les valeurs sont correctes** : ✅ Configuration chargée !

**Si les valeurs sont vides ou incorrectes** :
- Vérifier que le `.env` est bien à la racine du projet
- Refaire l'étape 2 (modification `.env`)
- Redémarrer : `docker-compose --profile auth restart auth-service`

---

### Étape 3.3 : Test 1 - Reset Password avec Votre Email

**Commande** :

```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid"}'
```

**Résultat API attendu** :
```json
{
  "success": true,
  "message": "Si cette adresse email existe, un lien de réinitialisation a été envoyé"
}
```

**Vérifier les LOGS** :

```bash
docker logs --tail 20 jobbingtrack-auth-service | grep -i email
```

**Logs de SUCCÈS** :
```
✅ Email de reset password envoyé à redacted@example.invalid
```

**Logs d'ERREUR possibles** :

```
❌ Invalid login: 535
→ Mauvais mot de passe dans .env

❌ Connection timeout
→ Port bloqué ou serveur inaccessible

❌ Sender address rejected
→ Email redacted@example.invalid pas créé ou pas actif
```

---

### Étape 3.4 : Vérifier Votre Boîte Gmail

**VÉRIFIER** :

1. Ouvrir Gmail : https://mail.google.com/
2. Se connecter avec `redacted@example.invalid`
3. **Chercher l'email** (vérifier aussi le dossier SPAM)

**Vous devriez voir** :

```
De : JobbingTrack <redacted@example.invalid>
Sujet : Réinitialisation de votre mot de passe - JobbingTrack
Contenu : Email HTML avec bouton "Réinitialiser mon mot de passe"
```

**Si vous recevez l'email** : 🎉 **ÇA MARCHE !!!**

**Si l'email arrive en SPAM** :
- ⚠️ Normal la première fois (domaine nouveau)
- Cliquer sur "Signaler comme non spam"
- Les prochains emails arriveront dans la boîte principale

**Si vous ne recevez RIEN** :
- Attendre 1-2 minutes (délai d'envoi)
- Vérifier les logs (erreurs ?)
- Voir section "Résolution de Problèmes" ci-dessous

---

### Étape 3.5 : Test 2 - Inscription Complète

**Commande** :

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"redacted@example.invalid",
    "password":"TestOVH123!",
    "firstName":"Paul",
    "lastName":"Delh"
  }'
```

**Vérifier Gmail** :

Vous devriez recevoir **2 emails** :
1. 📧 **Email de bienvenue** (Sujet : "Bienvenue sur JobbingTrack !")
2. ✅ **Email de vérification** (Sujet : "Vérifiez votre adresse email")

**Cliquer sur le lien** dans l'email de vérification → Compte vérifié ! ✅

---

## ❌ PARTIE 4 : Résolution de Problèmes

### Problème 1 : "Invalid login: 535"

**Message d'erreur complet** :
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Causes** :
1. Mauvais mot de passe dans `.env`
2. Email `redacted@example.invalid` pas créé
3. Email créé mais pas encore actif (attendre 5 min)

**Solutions** :

**Solution 1 : Vérifier le mot de passe**

```bash
# Tester la connexion webmail OVH
https://www.ovh.com/fr/mail/

Email : redacted@example.invalid
Mot de passe : (celui de votre .env)
```

**Si la connexion webmail fonctionne** : Mot de passe OK ✅

**Si la connexion webmail échoue** : 
- Mauvais mot de passe dans `.env`
- Copier/coller le mot de passe exactement (attention aux espaces)

**Solution 2 : Réinitialiser le mot de passe OVH**

1. Manager OVH → Emails → `maily.ovh`
2. Cliquer sur "..." à côté de `redacted@example.invalid`
3. Choisir "**Modifier le mot de passe**"
4. Créer un nouveau mot de passe
5. Mettre à jour le `.env`
6. Redémarrer : `docker-compose --profile auth restart auth-service`

---

### Problème 2 : "Connection timeout" ou "ECONNREFUSED"

**Message d'erreur** :
```
Error: connect ETIMEDOUT ssl0.ovh.net:465
OU
Error: connect ECONNREFUSED
```

**Causes** :
1. Port 465 bloqué par votre firewall/FAI
2. Serveur OVH temporairement indisponible
3. Pas de connexion Internet

**Solutions** :

**Solution 1 : Essayer le port 587**

Modifier `.env` :
```env
SMTP_PORT=587
SMTP_SECURE=false  # Important : false pour port 587 !
```

Redémarrer et retester.

**Solution 2 : Vérifier la connectivité**

```bash
# Tester si le port 465 est accessible
telnet ssl0.ovh.net 465

# Ou avec nc
nc -zv ssl0.ovh.net 465

# Si "Connected" → Port accessible ✅
# Si timeout → Port bloqué ❌
```

**Solution 3 : Vérifier le statut OVH**

Aller sur : https://web-cloud.status-ovhcloud.com/

Voir si OVH a des problèmes techniques.

**Solution 4 : Essayer le serveur alternatif**

```env
SMTP_HOST=ssl1.ovh.net  # Au lieu de ssl0
```

---

### Problème 3 : "Sender address rejected"

**Message d'erreur** :
```
Error: Mail from command failed: 550 Sender address rejected
```

**Cause** : Email `redacted@example.invalid` pas reconnu ou pas actif

**Solutions** :

1. **Vérifier** que l'email existe dans le manager OVH
2. **Attendre** 5-10 minutes (propagation)
3. **Tester** la connexion webmail (Étape 1.3)
4. **Vérifier** que `SMTP_USER` et `SMTP_FROM` utilisent le même email :

```env
SMTP_USER=redacted@example.invalid
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
```

---

### Problème 4 : Emails Arrivent en SPAM

**Cause** : Normal pour un nouveau domaine sans réputation

**Solutions** :

**Immédiate** :
1. Ouvrir l'email dans Gmail
2. Cliquer sur "**Signaler comme non spam**"
3. Les prochains emails arriveront dans la boîte principale

**À long terme** :
1. Activer DKIM chez OVH (Étape 1.4)
2. Envoyer régulièrement des emails légitimes
3. Éviter les mots "spam" dans le sujet (gratuit, urgent, cliquez ici, etc.)
4. Ajouter DMARC (avancé) :

```dns
Type : TXT
Nom : _dmarc
Valeur : v=DMARC1; p=none; rua=mailto:redacted@example.invalid
```

---

### Problème 5 : Variables Pas Chargées dans Docker

**Vérification** :
```bash
docker exec jobbingtrack-auth-service sh -c 'printenv | grep SMTP'
```

**Si rien ne s'affiche** :

**Cause** : `.env` pas lu par Docker Compose

**Solution** :

1. Vérifier que le `.env` est à la **RACINE** du projet (pas dans `backend/`)
2. Vérifier que docker-compose.yml a bien :
   ```yaml
   environment:
     - SMTP_HOST=${SMTP_HOST}
     - SMTP_PORT=${SMTP_PORT}
     # etc.
   ```
3. Redémarrer COMPLÈTEMENT :
   ```bash
   docker-compose --profile auth down
   docker-compose --profile auth up -d
   ```

---

## 📋 PARTIE 4 : Checklist Complète

### Avant de Commencer

- [ ] J'ai accès au manager OVH
- [ ] J'ai le domaine `maily.ovh`
- [ ] J'ai une offre email (MX Plan ou supérieur)

### Configuration OVH

- [ ] Email `redacted@example.invalid` créé ✅
- [ ] Mot de passe noté en sécurité ✅
- [ ] Test webmail réussi (https://www.ovh.com/fr/mail/) ✅
- [ ] Enregistrements MX présents (mx1, mx2, mx3.mail.ovh.net) ✅
- [ ] Enregistrement SPF présent (v=spf1 include:mx.ovh.com ~all) ✅
- [ ] DKIM activé (optionnel) ⚠️

### Configuration JobbingTrack

- [ ] Fichier `.env` modifié avec OVH ✅
- [ ] Mot de passe OVH ajouté (VRAI mot de passe) ✅
- [ ] Service auth redémarré ✅
- [ ] Variables vérifiées dans Docker (docker exec) ✅

### Tests

- [ ] Test reset password envoyé ✅
- [ ] Email reçu dans Gmail (redacted@example.invalid) ✅
- [ ] Test inscription réussi ✅
- [ ] 2 emails reçus (bienvenue + vérification) ✅
- [ ] Lien de vérification fonctionne ✅
- [ ] Pas d'erreur dans les logs ✅

---

## 🎯 Résumé Visuel

### AVANT (MailHog)

```
Utilisateur s'inscrit avec redacted@example.invalid
         ↓
JobbingTrack envoie l'email
         ↓
MailHog capture (localhost:8025)
         ↓
❌ Paul Delh ne reçoit RIEN dans Gmail
```

### APRÈS (OVH maily.ovh)

```
Utilisateur s'inscrit avec redacted@example.invalid
         ↓
JobbingTrack envoie l'email
         ↓
OVH ssl0.ovh.net (serveur SMTP)
         ↓
Internet (Gmail, Outlook, etc.)
         ↓
✅ Paul Delh REÇOIT l'email dans Gmail !
         ↓
Paul clique sur le lien de vérification
         ↓
✅ Compte vérifié !
```

---

## 🔒 Sécurité

### Protection du `.env`

**Vérifier que `.env` est ignoré par Git** :

```bash
git check-ignore .env
```

**Résultat attendu** : `.env`

**Si rien ne s'affiche** :

```bash
# Ajouter au .gitignore
echo ".env" >> .gitignore

# Si déjà tracké, retirer
git rm --cached .env
```

### ⚠️ JAMAIS Commiter le `.env` !

**NE JAMAIS faire** :
```bash
git add .env       # ❌ DANGEREUX !
git commit -a      # ❌ COMMIT TOUT (y compris .env)
```

**TOUJOURS vérifier avant commit** :
```bash
git status  # .env ne doit PAS apparaître
```

---

## 📊 Informations Techniques OVH

### Serveurs SMTP OVH

| Serveur | Type | Recommandation |
|---------|------|----------------|
| `ssl0.ovh.net` | Principal | ✅ Utilisez celui-ci en premier |
| `ssl1.ovh.net` | Alternatif | ⚠️ Si ssl0 ne fonctionne pas |

### Ports Disponibles

| Port | Type | SSL | Configuration |
|------|------|-----|---------------|
| **465** | SMTPS | ✅ OUI | `SMTP_SECURE=true` ✅ Recommandé |
| **587** | SMTP+STARTTLS | ⚠️ Après | `SMTP_SECURE=false` |
| ~~25~~ | SMTP | ❌ NON | Bloqué par la plupart des FAI |

### Limites MX Plan

- **200 emails/heure** (par adresse email)
- **4,800 emails/jour** (par domaine)
- **Stockage** : 5 GB par compte email

**Pour JobbingTrack** :
- Inscriptions : ~5-20/jour
- Reset password : ~2-10/jour
- Total : ~10-50 emails/jour

**Verdict** : MX Plan suffit LARGEMENT (vous utilisez < 1% !) ✅

---

## 🧪 Tests Avancés

### Test Complet avec Tous les Emails

**1. Créer un compte** :
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

**Vérifier Gmail** : 2 emails reçus (bienvenue + vérification)

**2. Cliquer sur le lien de vérification** dans l'email

**3. Tester reset password** :
```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid"}'
```

**Vérifier Gmail** : Email de reset reçu

**4. Cliquer sur le lien de reset**

**5. Réinitialiser le mot de passe**

**Tous les tests passent** : ✅ Configuration OVH 100% opérationnelle !

---

## 📚 Résumé Configuration Finale

### Fichier `.env` (Production OVH)

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=redacted@example.invalid
SMTP_PASS=VotreMotDePasseOVH
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
FRONTEND_URL=http://localhost:8080
```

### DNS maily.ovh (Vérifier)

```
MX @ → mx1.mail.ovh.net (priorité 1)
MX @ → mx2.mail.ovh.net (priorité 5)
TXT @ → v=spf1 include:mx.ovh.com ~all
```

### Service Auth

```bash
# Redémarrer
docker-compose --profile auth restart auth-service

# Vérifier
docker logs --tail 20 jobbingtrack-auth-service
```

---

## 🎯 Temps Estimé

| Étape | Temps | Détail |
|-------|-------|--------|
| **1. OVH Manager** | 10 min | Créer email + vérifier DNS |
| **2. Modifier .env** | 2 min | Copier/coller configuration |
| **3. Redémarrer** | 1 min | Docker restart |
| **4. Tests** | 5 min | Vérifier Gmail |
| **TOTAL** | **~20 minutes** | ⏱️ |

---

## ✅ État Final

```
┌──────────────────────────────────────────────────────────┐
│          CONFIGURATION OVH maily.ovh                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Email créé : redacted@example.invalid ✅                      │
│  Serveur SMTP : ssl0.ovh.net:465 ✅                     │
│  DNS configuré : MX + SPF ✅                            │
│  .env modifié : Credentials OVH ✅                      │
│  Service auth : Redémarré ✅                            │
│                                                          │
│  Tests :                                                 │
│    ✅ Reset password → redacted@example.invalid reçoit       │
│    ✅ Inscription → 2 emails reçus (bienvenue + verif)  │
│    ✅ Liens cliquables → Fonctionnels                   │
│                                                          │
│  Domaine personnel :                                     │
│    ✅ example.invalid → PAS utilisé (reste privé)          │
│    ✅ maily.ovh → Utilisé (séparation pro/perso)        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Prochaines Actions

1. **Suivre les 5 étapes** de ce guide (20 minutes)
2. **Tester** avec `redacted@example.invalid`
3. **Vérifier** la réception dans Gmail
4. **Valider** que les liens fonctionnent

**Une fois validé** : ✅ Votre système d'emails est prêt pour la production !

---

**📖 Voir aussi** :
- `MAIL.md` : Vue d'ensemble (MailHog vs OVH)
- `STATUS.md` section 1.13 : Documentation technique
- Manager OVH : https://www.ovh.com/manager/web/

