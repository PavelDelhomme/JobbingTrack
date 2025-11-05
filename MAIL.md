# 📧 Guide Complet - Envoi d'Emails pour JobbingTrack

> **Pour débutants et experts** : Tout comprendre sur l'envoi d'emails et configurer votre système pas à pas

---

## 📚 Table des Matières

1. [Comprendre les Bases](#-comprendre-les-bases)
2. [État Actuel du Projet](#-état-actuel-du-projet)
3. [Solutions Disponibles (7 options)](#-solutions-disponibles)
   - [Option 1 : MailHog](#option-1--mailhog-développement-local)
   - [Option 2 : Mailtrap](#option-2--mailtrap-tests-professionnels)
   - [Option 3 : Gmail](#option-3--gmail-app-password)
   - [Option 4 : Brevo (Sendinblue)](#option-4--brevo-sendinblue)
   - [Option 5 : SendGrid](#option-5--sendgrid)
   - [Option 6 : Mailgun](#option-6--mailgun)
   - [Option 7 : OVH Email](#option-7--ovh-email)
4. [Tableau Comparatif](#-tableau-comparatif-complet)
5. [Guide de Choix](#-guide-de-choix)
6. [Tests et Résolution de Problèmes](#-tests-et-résolution-de-problèmes)

---

## 🎓 Comprendre les Bases

### Qu'est-ce que SMTP ?

**SMTP** = Simple Mail Transfer Protocol (Protocole Simple de Transfert de Mail)

**Analogie simple** : 
- SMTP est comme **La Poste** 📮
- Votre application est **l'expéditeur** qui écrit une lettre ✉️
- Le serveur SMTP est **le facteur** qui va livrer la lettre 🚶
- L'email du destinataire est **l'adresse de livraison** 🏠

**Comment ça marche ?**

```
Votre Application (JobbingTrack)
         ↓
    [1. Écrit l'email]
         ↓
    Serveur SMTP (MailHog/Gmail/Brevo/etc.)
         ↓
    [2. Envoie l'email via Internet]
         ↓
    Serveur Email du Destinataire (Gmail/Outlook/Yahoo/etc.)
         ↓
    [3. Stocke dans la boîte mail]
         ↓
    Destinataire lit l'email 📬
```

### Les Variables SMTP Expliquées

Quand vous configurez SMTP, vous devez renseigner ces informations :

| Variable | C'est Quoi ? | Exemple |
|----------|--------------|---------|
| **SMTP_HOST** | L'adresse du serveur SMTP (comme une adresse postale) | `smtp.gmail.com` |
| **SMTP_PORT** | Le numéro de "porte" pour entrer dans le serveur | `587` ou `465` |
| **SMTP_SECURE** | Utiliser une connexion sécurisée (chiffrée) ? | `true` ou `false` |
| **SMTP_USER** | Votre identifiant (comme votre nom d'expéditeur) | `votre@email.com` |
| **SMTP_PASS** | Votre mot de passe (pour prouver que c'est vous) | `motdepasse123` |
| **SMTP_FROM** | Le nom qui apparaîtra comme expéditeur | `"JobbingTrack <noreply@app.com>"` |

### Les Ports SMTP Expliqués

**Port 25** : Le port historique (souvent bloqué par les FAI pour éviter le spam)

**Port 587** : Port moderne avec STARTTLS (chiffrement après connexion)
- ✅ Recommandé pour la plupart des cas
- ✅ Connexion non chiffrée au début, puis chiffrement activé
- Configuration : `SMTP_PORT=587` et `SMTP_SECURE=false`

**Port 465** : Port avec SSL/TLS (chiffrement dès le début)
- ✅ Connexion chiffrée de bout en bout
- Configuration : `SMTP_PORT=465` et `SMTP_SECURE=true`

**Analogie** :
- **Port 587** = Vous parlez normalement au facteur, puis passez dans un bureau privé 🚪
- **Port 465** = Vous êtes directement dans un bureau privé dès le début 🔒

---

## 📊 État Actuel du Projet

### Ce qui est DÉJÀ fait ✅

```
✅ Backend configuré pour envoyer des emails
✅ Routes API fonctionnelles :
   - /api/v1/auth/register → Envoi email de bienvenue
   - /api/v1/auth/verify-email → Vérification par lien
   - /api/v1/auth/forgot-password → Reset de mot de passe
✅ Templates d'emails HTML créés
✅ Service nodemailer configuré (backend/auth-service/src/services/emailService.js)
```

### Ce qu'il manque ⚠️

```
⚠️ Configuration SMTP dans le fichier .env
⚠️ Choix d'un service SMTP (MailHog/Gmail/Brevo/etc.)
```

**Résumé** : Le système d'emails est prêt à 95%, il ne manque que la configuration SMTP !

---

## 🎯 Solutions Disponibles

---

### Option 1 : 🐳 MailHog (Développement Local)

**Pour qui ?** 
- ✅ Développement et tests locaux
- ✅ Vous voulez voir les emails sans les envoyer vraiment
- ✅ Vous ne voulez pas configurer de compte externe

**C'est quoi ?**

MailHog est un **faux serveur SMTP** qui intercepte TOUS vos emails et les affiche dans une interface web au lieu de les envoyer vraiment.

**Analogie** : C'est comme une **boîte aux lettres factice** 📬. Vous mettez vos lettres dedans, elles ne partent jamais, mais vous pouvez les ouvrir et les lire quand vous voulez.

**Avantages** :
- ✅ **100% local** : Pas besoin d'Internet
- ✅ **Gratuit** et illimité
- ✅ **Zéro configuration externe** (pas de compte à créer)
- ✅ **Interface web** pour voir tous les emails : http://localhost:8025
- ✅ **Parfait pour les tests** : Aucun risque d'envoyer des emails par erreur
- ✅ **Rapide** : Installation en 2 minutes

**Inconvénients** :
- ❌ N'envoie pas de vrais emails (juste pour le développement)

#### 📝 Installation Détaillée

**Méthode 1 : Avec Docker (RECOMMANDÉ)**

1️⃣ **Ouvrir le fichier `docker-compose.yml`** à la racine du projet

2️⃣ **Ajouter ce bloc** dans la section `services:` :

```yaml
services:
  # ... autres services ...
  
  # MailHog - Serveur SMTP de test
  mailhog:
    image: mailhog/mailhog:latest
    container_name: jobbingtrack-mailhog
    ports:
      - "1025:1025"  # Port SMTP (pour envoyer)
      - "8025:8025"  # Interface Web (pour voir les emails)
    networks:
      - jobbingtrack-network
    restart: unless-stopped
```

3️⃣ **Configurer le fichier `.env`** à la **racine du projet** :

```env
# Configuration MailHog
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.local>"
FRONTEND_URL=http://localhost:8080
```

**Explication ligne par ligne** :
- `SMTP_HOST=mailhog` → Le nom du container Docker
- `SMTP_PORT=1025` → Le port SMTP de MailHog
- `SMTP_SECURE=false` → Pas de chiffrement (inutile en local)
- `SMTP_USER=` → Vide (MailHog n'a pas besoin d'authentification)
- `SMTP_PASS=` → Vide (MailHog n'a pas besoin de mot de passe)
- `SMTP_FROM` → Le nom qui apparaîtra comme expéditeur
- `FRONTEND_URL` → L'URL de votre frontend

4️⃣ **Démarrer MailHog** :

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Démarrer MailHog
docker-compose up -d mailhog

# Redémarrer le service auth avec la nouvelle config
docker-compose --profile auth restart auth-service
```

5️⃣ **Vérifier que ça fonctionne** :

```bash
# Ouvrir l'interface MailHog dans votre navigateur
http://localhost:8025

# Vous devriez voir une page vide (pas d'emails pour l'instant)
```

6️⃣ **Tester l'envoi** :

```bash
# Créer un compte pour tester
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Aller sur http://localhost:8025
# Vous verrez l'email de bienvenue ! 🎉
```

**Méthode 2 : Installation Standalone (Sans Docker)**

Sur **Linux Manjaro/Arch** :
```bash
yay -S mailhog
mailhog  # Lancer MailHog
# Interface : http://localhost:8025
# SMTP : localhost:1025
```

Sur **macOS** :
```bash
brew install mailhog
mailhog  # Lancer MailHog
```

Sur **Windows** :
1. Télécharger : https://github.com/mailhog/MailHog/releases
2. Exécuter `MailHog.exe`

**Configuration `.env` pour MailHog standalone** :
```env
SMTP_HOST=localhost  # (au lieu de mailhog)
SMTP_PORT=1025
# Reste identique
```

---

### Option 2 : 📮 Mailtrap (Tests Professionnels)

**Pour qui ?**
- ✅ Tests en équipe (partage avec collègues)
- ✅ Besoin de tester sur différents clients emails (Gmail, Outlook, etc.)
- ✅ Besoin d'analyser les emails (temps de chargement, spam score, etc.)

**C'est quoi ?**

Mailtrap est une **boîte email de test en ligne**. Comme MailHog mais dans le cloud, avec des fonctionnalités avancées.

**Analogie** : C'est comme une **boîte postale partagée** 📫 dans le cloud. Toute votre équipe peut voir les emails de test.

**Avantages** :
- ✅ **Interface web professionnelle**
- ✅ **Test de rendu** (voir comment l'email s'affiche sur Gmail, Outlook, etc.)
- ✅ **Analyse spam** (détecte si votre email risque d'être marqué comme spam)
- ✅ **Partage en équipe** (plusieurs développeurs peuvent voir les mêmes emails)
- ✅ **100 emails/mois gratuits**
- ✅ **Pas d'installation** (tout en ligne)

**Inconvénients** :
- ❌ Nécessite un compte (inscription)
- ❌ Limité à 100 emails/mois en gratuit

#### 📝 Installation Détaillée

1️⃣ **Créer un compte Mailtrap** :

- Aller sur : https://mailtrap.io/
- Cliquer sur "Sign Up" (Inscription)
- Choisir "Email Testing" (pas Email Sending)
- Créer un compte gratuit

2️⃣ **Récupérer vos identifiants SMTP** :

- Une fois connecté, aller dans "Inboxes"
- Cliquer sur votre inbox (ou en créer une)
- Aller dans l'onglet "SMTP Settings"
- Sélectionner "Nodemailer" dans le menu déroulant

Vous verrez quelque chose comme :

```javascript
host: 'sandbox.smtp.mailtrap.io',
port: 2525,
auth: {
  user: 'abc123def456',
  pass: 'xyz789uvw012'
}
```

3️⃣ **Configurer le fichier `.env`** :

```env
# Configuration Mailtrap
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=abc123def456
SMTP_PASS=xyz789uvw012
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"
FRONTEND_URL=http://localhost:8080
```

**⚠️ IMPORTANT** : Remplacez `abc123def456` et `xyz789uvw012` par VOS vraies valeurs depuis Mailtrap !

4️⃣ **Redémarrer le service** :

```bash
docker-compose --profile auth restart auth-service
```

5️⃣ **Tester et voir les emails** :

```bash
# Envoyer un email de test
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Aller sur https://mailtrap.io/inboxes
# Vous verrez l'email avec plein d'infos (spam score, HTML, texte brut, etc.)
```

---

### Option 3 : 📧 Gmail App Password

**Pour qui ?**
- ✅ Vous voulez envoyer de VRAIS emails
- ✅ Vous avez déjà un compte Gmail
- ✅ Petite quantité d'emails (< 500/jour)

**C'est quoi ?**

Utiliser Gmail comme serveur SMTP pour envoyer vos emails via votre propre adresse Gmail.

**⚠️ IMPORTANT** : Vous NE POUVEZ PAS utiliser votre mot de passe Gmail normal. Vous devez créer un **App Password** (mot de passe d'application).

**Pourquoi un App Password ?**

Pour des raisons de sécurité, Google ne permet pas aux applications externes d'utiliser votre mot de passe principal. Un App Password est un mot de passe spécial (16 caractères) généré par Google juste pour votre application.

**Analogie** : C'est comme donner une **clé temporaire** 🔑 à quelqu'un pour qu'il puisse poster du courrier en votre nom, sans lui donner la clé principale de votre maison.

**Avantages** :
- ✅ **Vrais emails envoyés** (arrivent dans la vraie boîte mail du destinataire)
- ✅ **Gratuit** (500 emails/jour)
- ✅ **Fiable** (infrastructure Google)
- ✅ **Facile** si vous avez déjà un compte Gmail

**Inconvénients** :
- ❌ **Configuration complexe** (authentification 2 facteurs obligatoire)
- ❌ **Limité** à 500 emails/jour
- ❌ **Risque** : Si vous envoyez trop de spam, votre compte Gmail peut être bloqué

#### 📝 Installation Détaillée

**Étape 1 : Activer l'Authentification à 2 Facteurs (OBLIGATOIRE)**

1. Aller sur : https://myaccount.google.com/security
2. Dans "Comment vous connecter à Google", cliquer sur "Validation en deux étapes"
3. Cliquer sur "Commencer"
4. Suivre les étapes (vous devrez vérifier votre numéro de téléphone)
5. Activer la validation en deux étapes

**Étape 2 : Générer un App Password**

1. Aller sur : https://myaccount.google.com/apppasswords
2. Se connecter si nécessaire
3. Dans "Sélectionner l'application", choisir "**Autre (nom personnalisé)**"
4. Taper "**JobbingTrack**"
5. Cliquer sur "**Générer**"

Vous verrez un mot de passe de 16 caractères comme :

```
abcd efgh ijkl mnop
```

**⚠️ COPIEZ CE MOT DE PASSE IMMÉDIATEMENT** : Vous ne pourrez plus le revoir !

**Étape 3 : Configurer le fichier `.env`**

```env
# Configuration Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM="JobbingTrack <votre.email@gmail.com>"
FRONTEND_URL=http://localhost:8080
```

**Explications** :
- `SMTP_USER` → Votre adresse Gmail complète
- `SMTP_PASS` → Le mot de passe de 16 caractères (SANS espaces)
- `SMTP_FROM` → Le nom qui apparaîtra (utilisez votre email Gmail)

**Étape 4 : Redémarrer et tester**

```bash
docker-compose --profile auth restart auth-service

# Tester avec votre vraie adresse email
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"VOTRE_VRAIE_ADRESSE@gmail.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Vérifier votre boîte Gmail : vous devriez avoir reçu l'email ! 🎉
```

**⚠️ Sécurité** :
- ❌ Ne commitez JAMAIS le fichier `.env` sur Git
- ❌ Ne partagez JAMAIS votre App Password
- ✅ Si compromis, supprimez l'App Password et recréez-en un nouveau

---

### Option 4 : 📨 Brevo (Sendinblue)

**Pour qui ?**
- ✅ Production (vrais emails en grande quantité)
- ✅ Statistiques avancées (taux d'ouverture, clics, etc.)
- ✅ Gestion professionnelle des emails

**C'est quoi ?**

Brevo (ancien nom : Sendinblue) est un **service professionnel d'envoi d'emails** avec des outils marketing avancés.

**Analogie** : C'est comme avoir votre **propre service postal professionnel** 📮 avec suivi des colis, statistiques de livraison, etc.

**Avantages** :
- ✅ **300 emails/jour GRATUITS** (9000/mois)
- ✅ **Statistiques complètes** (taux d'ouverture, clics, bounces)
- ✅ **Templates d'emails** professionnels
- ✅ **Gestion de listes** de contacts
- ✅ **Réputation IP** professionnelle (moins de risque de spam)
- ✅ **Support client**

**Inconvénients** :
- ❌ Nécessite inscription et validation
- ❌ Limité à 300 emails/jour en gratuit
- ❌ Nécessite une connexion Internet

#### 📝 Installation Détaillée

**Étape 1 : Créer un Compte Brevo**

1. Aller sur : https://www.brevo.com/
2. Cliquer sur "Sign Up Free" (Inscription Gratuite)
3. Remplir le formulaire :
   - Email professionnel (ou personnel)
   - Mot de passe
   - Nom de l'entreprise : "JobbingTrack"
4. Vérifier votre email (cliquer sur le lien reçu)
5. Compléter votre profil

**Étape 2 : Récupérer la Clé SMTP**

1. Une fois connecté, aller dans le menu ☰ en haut à droite
2. Cliquer sur "**SMTP & API**"
3. Aller dans l'onglet "**SMTP**"
4. Vous verrez :

```
Serveur SMTP : smtp-relay.brevo.com
Port : 587
Login : votre-email@example.com
Mot de passe SMTP : [Cliquer pour générer]
```

5. Si pas de mot de passe SMTP, cliquer sur "**Créer une nouvelle clé SMTP**"
6. **Copier la clé générée** (elle ressemble à : `xsmtpsib-a1b2c3d4...`)

**Étape 3 : Configurer le fichier `.env`**

```env
# Configuration Brevo
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@example.com
SMTP_PASS=xsmtpsib-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"
FRONTEND_URL=http://localhost:8080
```

**Explications** :
- `SMTP_USER` → Votre email utilisé pour créer le compte Brevo
- `SMTP_PASS` → La clé SMTP (commence par `xsmtpsib-`)
- `SMTP_FROM` → Le nom d'expéditeur (peut être différent de SMTP_USER)

**Étape 4 : Valider l'Email Expéditeur** (IMPORTANT)

Avant de pouvoir envoyer des emails, vous devez **valider votre domaine d'expédition** :

1. Dans Brevo, aller dans "**Senders & IP**"
2. Cliquer sur "**Add a Sender**"
3. Entrer l'email `noreply@jobbingtrack.com` (ou votre domaine)
4. Brevo va envoyer un email de validation
5. Cliquer sur le lien dans l'email

**Alternative** : Utilisez votre propre email validé :
```env
SMTP_FROM="JobbingTrack <votre.email@gmail.com>"
```

**Étape 5 : Tester**

```bash
docker-compose --profile auth restart auth-service

# Envoyer un email de test
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"destinataire@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Vérifier dans Brevo : Dashboard → Statistics
# Vous verrez l'email envoyé avec plein de stats ! 📊
```

---

### Option 5 : 📬 SendGrid

**Pour qui ?**
- ✅ Gros volumes d'emails (production)
- ✅ Intégrations avancées (webhooks, templates dynamiques)
- ✅ Infrastructure Twilio (fiable)

**C'est quoi ?**

SendGrid (appartenant à Twilio) est un des **leaders mondiaux** de l'envoi d'emails transactionnels (emails automatiques comme les confirmations, resets, etc.).

**Avantages** :
- ✅ **100 emails/jour GRATUITS** (3000/mois)
- ✅ **Infrastructure mondiale** (très rapide)
- ✅ **Réputation IP excellente**
- ✅ **Templates dynamiques** (personnalisation avancée)
- ✅ **Webhooks** (savoir quand un email est ouvert, cliqué, etc.)
- ✅ **Documentation excellente**

**Inconvénients** :
- ❌ Configuration plus complexe
- ❌ Validation du compte peut prendre 24-48h
- ❌ Limité à 100 emails/jour en gratuit

#### 📝 Installation Détaillée

**Étape 1 : Créer un Compte SendGrid**

1. Aller sur : https://signup.sendgrid.com/
2. Remplir le formulaire d'inscription
3. Vérifier votre email
4. **Important** : Répondre au questionnaire SendGrid :
   - Type d'envoi : "Transactional Emails"
   - Nombre d'emails : "< 10,000/month"
   - Description : "User authentication emails for a job tracking application"

**Étape 2 : Créer une Clé API**

1. Dans le dashboard SendGrid, aller dans "**Settings**" → "**API Keys**"
2. Cliquer sur "**Create API Key**"
3. Nom : "JobbingTrack SMTP"
4. Permissions : "**Full Access**" (ou "Mail Send" seulement)
5. Cliquer sur "**Create & View**"
6. **COPIER LA CLÉ** immédiatement (elle commence par `SG.`)

**⚠️ IMPORTANT** : Cette clé ne sera affichée qu'une seule fois !

**Étape 3 : Configurer le fichier `.env`**

```env
# Configuration SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.abc123def456xyz789
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"
FRONTEND_URL=http://localhost:8080
```

**Explications TRÈS IMPORTANTES** :
- `SMTP_USER=apikey` → Mettez EXACTEMENT le mot "apikey" (pas votre email !)
- `SMTP_PASS` → La clé API qui commence par `SG.`
- `SMTP_FROM` → L'email d'expéditeur (doit être validé)

**Étape 4 : Valider l'Email Expéditeur**

1. Dans SendGrid, aller dans "**Settings**" → "**Sender Authentication**"
2. Choisir "**Single Sender Verification**" (le plus simple)
3. Cliquer sur "**Create New Sender**"
4. Remplir le formulaire :
   - From Email : `noreply@jobbingtrack.com` (ou votre email)
   - From Name : "JobbingTrack"
   - Reply To : Votre email
   - Company : "JobbingTrack"
   - Adresse : Votre adresse
5. SendGrid va envoyer un email de validation
6. Cliquer sur le lien pour valider

**Étape 5 : Tester**

```bash
docker-compose --profile auth restart auth-service

# Test
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Vérifier dans SendGrid → Activity
```

---

### Option 6 : 📮 Mailgun

**Pour qui ?**
- ✅ Développeurs qui aiment l'API REST
- ✅ Besoin de flexibilité (routes, webhooks avancés)
- ✅ Applications avec gros volumes

**C'est quoi ?**

Mailgun est un **service d'envoi d'emails par API** très populaire chez les développeurs. Racheté par Sinch.

**Avantages** :
- ✅ **100 emails/jour GRATUITS** pendant 3 mois
- ✅ **API REST très puissante**
- ✅ **Routes emails avancées** (répondre aux emails, transferts)
- ✅ **Logs détaillés** (30 jours de conservation)
- ✅ **Validation d'emails** intégrée

**Inconvénients** :
- ❌ Nécessite carte bancaire (même pour le plan gratuit)
- ❌ Gratuit seulement 3 mois (puis 0.80$/1000 emails)
- ❌ Configuration domaine obligatoire

#### 📝 Installation Détaillée

**Étape 1 : Créer un Compte Mailgun**

1. Aller sur : https://www.mailgun.com/
2. Cliquer sur "Start Sending" ou "Sign Up"
3. Remplir le formulaire
4. **⚠️ Carte bancaire requise** (mais pas de charge pendant 3 mois)

**Étape 2 : Récupérer les Identifiants SMTP**

1. Dans le dashboard, aller dans "**Sending**" → "**Domain Settings**"
2. Vous verrez un domaine sandbox : `sandboxXXXXXXXX.mailgun.org`
3. Cliquer sur le domaine
4. Aller dans "**SMTP credentials**"
5. Noter :
   - SMTP hostname : `smtp.mailgun.org`
   - Port : 587
   - Username : `postmaster@sandboxXXXX.mailgun.org`
   - Default password : (cliquer pour voir ou reset)

**Étape 3 : Configurer le fichier `.env`**

```env
# Configuration Mailgun
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@sandboxXXXXXXXX.mailgun.org
SMTP_PASS=votre_mot_de_passe_mailgun
SMTP_FROM="JobbingTrack <noreply@sandboxXXXX.mailgun.org>"
FRONTEND_URL=http://localhost:8080
```

**Étape 4 : Autoriser les Destinataires (Sandbox)**

⚠️ Avec le domaine sandbox, vous devez **autoriser chaque email destinataire** :

1. Dans Mailgun, aller dans "**Sending**" → "**Authorized Recipients**"
2. Entrer l'email destinataire
3. Cliquer sur "Add"
4. Le destinataire recevra un email de validation

**Alternative** : Utiliser votre propre domaine (configuration DNS requise)

**Étape 5 : Tester**

```bash
docker-compose --profile auth restart auth-service

# Test (avec un email autorisé)
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"votre_email_autorise@gmail.com","password":"Test123!","firstName":"Test","lastName":"User"}'
```

---

### Option 7 : 🏢 OVH Email

**Pour qui ?**
- ✅ Vous avez déjà un domaine chez OVH
- ✅ Vous voulez un email professionnel (`contact@votre-domaine.com`)
- ✅ Production avec contrôle total

**C'est quoi ?**

Utiliser les serveurs SMTP d'OVH avec votre propre domaine et adresses emails professionnelles.

**Avantages** :
- ✅ **Email professionnel** avec votre domaine
- ✅ **200 emails/heure** inclus
- ✅ **Réputation de domaine** que vous contrôlez
- ✅ **Pas de limite d'emails/jour** (juste 200/heure)
- ✅ **Support OVH**

**Inconvénients** :
- ❌ **Payant** (besoin d'un domaine + hébergement email OVH)
- ❌ Configuration DNS requise
- ❌ Besoin de créer une adresse email OVH

#### 📝 Installation Détaillée

**Prérequis** : Vous devez avoir :
- ✅ Un domaine chez OVH (ex: `votre-domaine.com`)
- ✅ Une offre email OVH (MX Plan inclus avec la plupart des hébergements)

**Étape 1 : Créer une Adresse Email OVH**

1. Connexion : https://www.ovh.com/manager/web/
2. Dans "**Emails**", cliquer sur votre domaine
3. Onglet "**Comptes email**"
4. Cliquer sur "**Créer une adresse email**"
5. Remplir :
   - Nom du compte : `noreply` (donnera `noreply@votre-domaine.com`)
   - Mot de passe : Choisir un mot de passe fort
6. Créer le compte

**Étape 2 : Identifier le Serveur SMTP OVH**

Les serveurs SMTP OVH :
- `ssl0.ovh.net` (principal)
- Ou `ssl1.ovh.net` (alternatif)

**Étape 3 : Configurer le fichier `.env`**

```env
# Configuration OVH avec SSL (Port 465)
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@votre-domaine.com
SMTP_PASS=votre_mot_de_passe_ovh
SMTP_FROM="JobbingTrack <noreply@votre-domaine.com>"
FRONTEND_URL=https://votre-domaine.com
```

**Alternative avec STARTTLS (Port 587)** :
```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
# Reste identique
```

**Étape 4 : Vérifier la Configuration DNS** (Important !)

Pour éviter que vos emails soient marqués comme spam, vérifiez ces enregistrements DNS :

1. Dans le manager OVH, aller dans "**Domaines**" → Votre domaine → "**Zone DNS**"
2. Vérifier la présence de :

```dns
Type  | Nom                 | Valeur
------|---------------------|---------------------------
MX    | @                   | mx1.mail.ovh.net (priorité 1)
MX    | @                   | mx2.mail.ovh.net (priorité 5)
TXT   | @                   | v=spf1 include:mx.ovh.com ~all
```

3. Si manquants, les ajouter

**Étape 5 : Tester**

```bash
docker-compose --profile auth restart auth-service

# Test
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"votre_email@gmail.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Vérifier la réception dans votre boîte Gmail
```

---

## 📊 Tableau Comparatif Complet

| Solution | Prix | Emails/mois | Complexité | Vrais Emails | Statistiques | Recommandé Pour |
|----------|------|-------------|------------|--------------|--------------|-----------------|
| **MailHog** | 🆓 Gratuit | ♾️ Illimité | ⭐ Facile | ❌ Non | ❌ Basique | 🏠 **Développement local** |
| **Mailtrap** | 🆓 Gratuit | 🎯 100 | ⭐ Facile | ❌ Non | ✅ Avancées | 👥 **Tests en équipe** |
| **Gmail** | 🆓 Gratuit | 🎯 15,000 | ⭐⭐⭐ Moyen | ✅ Oui | ❌ Aucune | 🔨 **Petits projets** |
| **Brevo** | 🆓 Gratuit | 🎯 9,000 | ⭐⭐ Facile | ✅ Oui | ✅ Complètes | 🚀 **Production (PME)** |
| **SendGrid** | 🆓 Gratuit | 🎯 3,000 | ⭐⭐ Moyen | ✅ Oui | ✅ Complètes | 🏢 **Production (professionnelle)** |
| **Mailgun** | 💰 0.80$/1k | 🎯 3,000 (3 mois) | ⭐⭐⭐ Difficile | ✅ Oui | ✅ Avancées | 💼 **Gros volumes** |
| **OVH** | 💰 Payant | 🎯 4,800/jour | ⭐⭐ Moyen | ✅ Oui | ❌ Basiques | 🏢 **Domaine pro existant** |

**Légende** :
- 🆓 = Gratuit
- 💰 = Payant
- ⭐ = Facile
- ⭐⭐ = Moyen
- ⭐⭐⭐ = Difficile
- ✅ = Oui
- ❌ = Non

---

## 🎯 Guide de Choix

### Quel Service Choisir ?

**Utilisez ce diagramme de décision** :

```
Vous développez en local ?
│
├─ OUI → MailHog 🏠
│        (Simple, rapide, parfait pour dev)
│
└─ NON → Vous voulez envoyer de VRAIS emails ?
         │
         ├─ NON (juste tester) → Mailtrap 📮
         │                        (Tests avancés, partage en équipe)
         │
         └─ OUI → Quel est votre besoin ?
                  │
                  ├─ Petit projet perso → Gmail 📧
                  │                        (Gratuit, simple, 500 emails/jour suffit)
                  │
                  ├─ Production PME/Startup → Brevo 📨
                  │                            (300 emails/jour gratuits, stats complètes)
                  │
                  ├─ Production professionnelle → SendGrid 📬
                  │                                (100 emails/jour, très fiable)
                  │
                  ├─ Gros volumes → Mailgun 📮
                  │                  (API puissante, routes avancées)
                  │
                  └─ Vous avez déjà un domaine OVH ? → OVH 🏢
                                                        (Email professionnel)
```

### Recommandations par Cas d'Usage

**🏠 Développement Local** :
→ **MailHog** (Docker) ou **Mailtrap** (cloud)

**🧪 Tests et QA** :
→ **Mailtrap** (analyse spam, rendu multi-clients)

**🚀 MVP / Prototype** :
→ **Brevo** ou **Gmail** (gratuit, fiable)

**🏢 Production (< 10k emails/mois)** :
→ **Brevo** (meilleur rapport qualité/prix)

**🏢 Production (> 10k emails/mois)** :
→ **SendGrid** ou **Mailgun** (infrastructure robuste)

**💼 Entreprise avec domaine propre** :
→ **OVH** ou **Mailgun** (contrôle total)

---

## 🧪 Tests et Résolution de Problèmes

### Test Général (toutes solutions)

**1. Redémarrer le service** :
```bash
docker-compose --profile auth restart auth-service
```

**2. Vérifier que les variables sont chargées** :
```bash
docker exec jobbingtrack-auth-service sh -c 'echo "SMTP_HOST: $SMTP_HOST"'
```

**3. Envoyer un email de test** :
```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**4. Vérifier les logs** :
```bash
docker logs --tail 50 jobbingtrack-auth-service | grep -i email
```

### Erreurs Courantes et Solutions

#### ❌ Erreur : "Invalid login: 535"

**Cause** : Mauvais identifiants SMTP

**Solutions** :
- **Gmail** : Vérifiez que c'est un **App Password**, pas votre mot de passe Gmail
- **Brevo/SendGrid/Mailgun** : Vérifiez que vous avez copié la clé complète
- **OVH** : Vérifiez le mot de passe de l'adresse email OVH

#### ❌ Erreur : "Connection refused" ou "ECONNREFUSED"

**Cause** : Le serveur SMTP n'est pas accessible

**Solutions** :
- **MailHog Docker** : Vérifiez que le container est démarré : `docker ps | grep mailhog`
- **Services cloud** : Vérifiez votre connexion Internet
- Vérifiez le `SMTP_HOST` et `SMTP_PORT`

#### ❌ Erreur : "Sender address rejected"

**Cause** : L'adresse email d'expéditeur (SMTP_FROM) n'est pas validée

**Solutions** :
- **Brevo/SendGrid/Mailgun** : Validez l'email expéditeur dans le dashboard
- **Gmail** : Utilisez votre email Gmail dans `SMTP_FROM`

#### ❌ Emails arrivent dans les spams

**Cause** : Mauvaise réputation du serveur ou configuration DNS manquante

**Solutions** :
- **MailHog/Mailtrap** : Normal (pas de vrais emails)
- **Gmail** : Normal pour les tests (pas de domaine pro)
- **Brevo/SendGrid** : Vérifier SPF/DKIM configurés
- **OVH** : Configurer SPF, DKIM et DMARC dans la zone DNS

#### ❌ Erreur : "self signed certificate"

**Cause** : Problème de certificat SSL

**Solution** :
Ajouter dans `backend/auth-service/src/services/emailService.js` :
```javascript
tls: {
  rejectUnauthorized: false  // À utiliser seulement en développement !
}
```

### Logs Utiles

**Voir les erreurs SMTP** :
```bash
docker logs jobbingtrack-auth-service 2>&1 | grep -E "(SMTP|email|Error)"
```

**Suivre les logs en temps réel** :
```bash
docker logs -f jobbingtrack-auth-service
```

---

## 🔒 Sécurité - Checklist

- [ ] Le fichier `.env` est dans `.gitignore`
- [ ] Vous n'avez JAMAIS commité le `.env` sur Git
- [ ] Gmail : Vous utilisez un **App Password** (pas le mot de passe principal)
- [ ] Les clés API sont stockées dans `.env` (pas en dur dans le code)
- [ ] En production : HTTPS activé (`FRONTEND_URL=https://...`)
- [ ] En production : `SMTP_SECURE=true` (port 465) pour chiffrement SSL

---

## 📚 Ressources et Documentation

### Documentation Officielle

- **MailHog** : https://github.com/mailhog/MailHog
- **Mailtrap** : https://mailtrap.io/docs/
- **Gmail SMTP** : https://support.google.com/mail/answer/7126229
- **Brevo** : https://developers.brevo.com/docs
- **SendGrid** : https://docs.sendgrid.com/
- **Mailgun** : https://documentation.mailgun.com/
- **OVH** : https://docs.ovh.com/fr/emails/

### Nodemailer (utilisé par JobbingTrack)

- Documentation : https://nodemailer.com/
- SMTP Setup : https://nodemailer.com/smtp/

---

## 🎯 Pour Aller Plus Loin

### Ajouter des Templates HTML Personnalisés

Modifier `backend/auth-service/src/services/emailService.js` pour personnaliser vos emails.

### Configurer SPF, DKIM, DMARC (Production)

Pour éviter que vos emails soient marqués comme spam :

**SPF** (Sender Policy Framework) :
```dns
Type: TXT
Nom: @
Valeur: v=spf1 include:_spf.brevo.com ~all
```

**DKIM** (DomainKeys Identified Mail) :
Généré automatiquement par Brevo/SendGrid/Mailgun

**DMARC** (Domain-based Message Authentication) :
```dns
Type: TXT
Nom: _dmarc
Valeur: v=DMARC1; p=none; rua=mailto:admin@votre-domaine.com
```

### Monitoring des Emails

- **Brevo/SendGrid/Mailgun** : Dashboards intégrés
- **Gmail** : Pas de monitoring (à éviter en production)
- **MailHog** : Interface web http://localhost:8025

---

**📖 Voir STATUS.md section 1.12 et 1.13 pour l'état complet de l'implémentation**

---

**Besoin d'aide ?** Ouvrez une issue sur GitHub ou consultez la documentation Nodemailer.
