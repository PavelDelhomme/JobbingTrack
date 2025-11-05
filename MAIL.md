# 📧 Configuration Envoi d'Emails - JobbingTrack

> **Solution Open Source Simple : MailHog**

---

## 📊 État Actuel

### ✅ Ce qui est DÉJÀ fait

```
✅ Système d'emails implémenté (vérification, reset password, bienvenue)
✅ Routes API fonctionnelles (/auth/verify-email, /auth/forgot-password)
✅ Service emailService.js configuré avec auth optionnelle
✅ MailHog installé et opérationnel
✅ Configuration .env complétée
✅ Tests réussis (2/2 emails envoyés)
```

### ⚠️ Ce qu'il manque

```
⚠️ Rien ! Tout est opérationnel avec MailHog ✅
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

**Comment ça marche ?**

```
Votre Application (JobbingTrack)
         ↓
    [1. Écrit l'email]
         ↓
    MailHog (Serveur SMTP local)
         ↓
    [2. Capture l'email (ne l'envoie PAS)]
         ↓
    Interface Web MailHog (http://localhost:8025)
         ↓
    Vous lisez l'email dans le navigateur 📬
```

### Les Variables SMTP Expliquées

| Variable | C'est Quoi ? | Valeur pour MailHog |
|----------|--------------|---------------------|
| **SMTP_HOST** | Adresse du serveur SMTP | `host.docker.internal` |
| **SMTP_PORT** | Numéro de port | `1025` |
| **SMTP_SECURE** | Connexion sécurisée (SSL) ? | `false` |
| **SMTP_USER** | Identifiant (vide pour MailHog) | *(vide)* |
| **SMTP_PASS** | Mot de passe (vide pour MailHog) | *(vide)* |
| **SMTP_FROM** | Nom d'expéditeur | `"JobbingTrack <noreply@...>"` |

---

## 🐳 **Solution : MailHog (Open Source)**

**GitHub** : https://github.com/mailhog/MailHog  
**License** : MIT (Open Source)  
**Statut** : ✅ **INSTALLÉ ET OPÉRATIONNEL**

### C'est Quoi ?

**MailHog** est un **faux serveur SMTP** qui intercepte TOUS vos emails et les affiche dans une interface web au lieu de les envoyer vraiment.

**Analogie** : C'est comme une **boîte aux lettres factice** 📬. Vous mettez vos lettres dedans, elles ne partent jamais sur Internet, mais vous pouvez les ouvrir et les lire dans votre navigateur.

### Avantages

- ✅ **100% Open Source** (MIT License)
- ✅ **100% Local** (pas besoin d'Internet)
- ✅ **100% Gratuit** et illimité
- ✅ **Zéro configuration externe** (pas de compte)
- ✅ **Interface web** : http://localhost:8025
- ✅ **Parfait pour tests** : Aucun risque d'envoyer des emails par erreur
- ✅ **Aucun spam** : Les emails ne partent JAMAIS sur Internet
- ✅ **Rapide** : Déjà installé et fonctionnel

### Inconvénients

- ❌ N'envoie pas de **vrais emails** (juste pour développement/tests)
- *(Pour la production, vous devrez utiliser un vrai service SMTP comme OVH avec maily.ovh)*

---

## ⚙️ Configuration Actuelle (DÉJÀ FAITE)

### docker-compose.yml

```yaml
services:
  # ... autres services ...

  # MailHog - Serveur SMTP Open Source
  mailhog:
    image: mailhog/mailhog:latest
    container_name: jobbingtrack-mailhog
    ports:
      - "2525:1025"  # SMTP (pour envoyer)
      - "8025:8025"  # Interface Web (pour lire)
    networks:
      - jobbingtrack-network
    restart: unless-stopped
```

**Note** : Vous avez MailHog qui tourne **déjà en système** (port 1025), donc le container Docker utilise le port 2525 pour éviter les conflits.

### Fichier `.env` (racine du projet)

```env
# Configuration MailHog
SMTP_HOST=host.docker.internal
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
FRONTEND_URL=http://localhost:8080
```

**Explications** :
- `SMTP_HOST=host.docker.internal` → Pointe vers votre machine hôte (où MailHog système tourne)
- `SMTP_PORT=1025` → Port SMTP de MailHog
- `SMTP_SECURE=false` → Pas de SSL (inutile en local)
- `SMTP_USER=` (vide) → MailHog n'a pas besoin d'authentification
- `SMTP_PASS=` (vide) → MailHog n'a pas besoin de mot de passe
- `SMTP_FROM` → Le nom qui apparaîtra comme expéditeur

### backend/auth-service/src/services/emailService.js

**Modification effectuée** : Authentification optionnelle

```javascript
class EmailService {
  constructor() {
    const config = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      tls: {
        rejectUnauthorized: false
      }
    };

    // Ajouter l'auth seulement si SMTP_USER est défini
    if (process.env.SMTP_USER && process.env.SMTP_USER.trim() !== '') {
      config.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      };
    }

    this.transporter = nodemailer.createTransport(config);
  }
}
```

**Pourquoi ?** MailHog n'a pas besoin d'authentification (pas de user/pass), contrairement à Gmail ou Brevo.

---

## 🚀 Utilisation

### Voir les Emails

**Interface MailHog** : **http://localhost:8025**

Ouvrez cette URL dans votre navigateur pour voir **TOUS les emails** envoyés ! 📬

### Test 1 : Créer un Compte

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"redacted@example.invalid",
    "password":"Test123!",
    "firstName":"Test",
    "lastName":"User"
  }'
```

**Résultat attendu** :
```json
{
  "success": true,
  "message": "Compte créé avec succès. Un email de vérification a été envoyé..."
}
```

**Aller sur http://localhost:8025** → Vous verrez :
- 📧 Email de bienvenue
- ✅ Email de vérification avec lien

### Test 2 : Reset Password

```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid"}'
```

**Aller sur http://localhost:8025** → Vous verrez l'email de reset password 🔑

### Test 3 : Via l'Interface Frontend

1. **Ouvrir** : http://localhost:8080/register
2. **Créer un compte** avec n'importe quel email
3. **Aller sur** : http://localhost:8025
4. **Voir les emails** reçus dans l'interface MailHog ! 🎉

---

## 🧪 Tests et Vérification

### Vérifier que MailHog fonctionne

**Interface web** :
```bash
curl -I http://localhost:8025
```

**Résultat attendu** : `HTTP/1.1 200 OK`

### Vérifier les Variables dans Docker

```bash
docker exec jobbingtrack-auth-service sh -c 'echo "SMTP_HOST: $SMTP_HOST | PORT: $SMTP_PORT"'
```

**Résultat attendu** :
```
SMTP_HOST: host.docker.internal | PORT: 1025
```

### Vérifier les Logs

```bash
# Voir les logs du service auth
docker logs --tail 30 jobbingtrack-auth-service

# Filtrer les logs email
docker logs jobbingtrack-auth-service 2>&1 | grep -i "email"
```

**Logs de succès attendus** :
```
✅ Email de bienvenue envoyé à redacted@example.invalid
✅ Email de vérification envoyé à redacted@example.invalid
```

---

## 🔧 Redémarrer MailHog (si nécessaire)

### Si MailHog système (votre cas actuel)

```bash
# Trouver le processus
ps aux | grep mailhog | grep -v grep

# Noter le PID (première colonne de nombres)

# Tuer le processus
kill PID  # Remplacer PID par le numéro

# Relancer MailHog
mailhog &

# Vérifier qu'il tourne
curl -I http://localhost:8025
```

### Si MailHog Docker (futur)

```bash
# Redémarrer
docker-compose restart mailhog

# Voir les logs
docker logs mailhog
```

---

## ❌ Résolution de Problèmes

### Erreur : "Connection refused"

**Cause** : MailHog n'est pas démarré

**Solution** :
```bash
# Vérifier si MailHog tourne
ps aux | grep mailhog

# Si absent, démarrer
mailhog &
```

### Erreur : "Missing credentials for PLAIN"

**Cause** : emailService.js essaie d'envoyer des credentials vides

**Solution** : ✅ **DÉJÀ CORRIGÉ** dans `emailService.js` (auth optionnelle)

### Interface MailHog ne s'affiche pas (http://localhost:8025)

**Causes possibles** :
1. MailHog n'est pas démarré
2. Port 8025 utilisé par un autre processus

**Solutions** :
```bash
# Vérifier le processus
ps aux | grep mailhog

# Vérifier le port
lsof -i :8025

# Redémarrer MailHog
pkill mailhog
mailhog &
```

### Emails n'apparaissent pas dans MailHog

**Vérifications** :
```bash
# 1. Vérifier que le service auth est bien configuré
docker exec jobbingtrack-auth-service sh -c 'echo $SMTP_HOST'
# Devrait afficher : host.docker.internal

# 2. Vérifier les logs pour voir si l'email a été envoyé
docker logs --tail 20 jobbingtrack-auth-service | grep -i email

# 3. Tester l'envoi
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid","password":"Test123!","firstName":"Test","lastName":"User"}'
```

---

## 🔒 Sécurité

### Le `.env` est-il sécurisé ?

✅ **OUI** - Le fichier `.env` est :
- ✅ Ignoré par Git (`.gitignore`)
- ✅ Local uniquement
- ✅ Pas de credentials sensibles (MailHog n'a pas besoin de mot de passe)

### Vérifier

```bash
# Vérifier que .env est ignoré
git check-ignore .env

# Résultat attendu : .env
```

---

## 📊 Tests Effectués et Réussis

```
✅ Email de bienvenue envoyé à redacted@example.invalid
✅ Email de vérification envoyé à redacted@example.invalid  
✅ Email reset password : Prêt (route opérationnelle)

Logs :
[32minfo[39m: Email de vérification envoyé ✅
[32minfo[39m: Email de bienvenue envoyé ✅
```

---

## 🌐 Interface MailHog

**URL** : **http://localhost:8025**

### Fonctionnalités de l'Interface

- 📧 **Liste des emails** reçus
- 📨 **Lecture du contenu** HTML et texte
- 👤 **Expéditeur** et destinataire
- 📅 **Date et heure** de réception
- 🔍 **Recherche** dans les emails
- 🗑️ **Suppression** d'emails
- 📥 **Téléchargement** du source (EML)

### Exemple d'Utilisation

1. **Créer un compte** sur http://localhost:8080/register
2. **Aller sur** http://localhost:8025
3. **Cliquer** sur l'email reçu
4. **Voir** le contenu HTML (email de bienvenue)
5. **Cliquer** sur le lien de vérification
6. **Être redirigé** vers la page de vérification

---

## 🔧 Commandes Utiles

### Redémarrer le Service Auth

```bash
docker-compose --profile auth restart auth-service
```

### Voir les Logs en Temps Réel

```bash
docker logs -f jobbingtrack-auth-service
```

### Vérifier la Configuration SMTP

```bash
docker exec jobbingtrack-auth-service sh -c 'printenv | grep SMTP'
```

### Tester l'Envoi Manuel

```bash
# Reset password
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid"}'

# Inscription
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid","password":"Test123!","firstName":"Nouveau","lastName":"Test"}'
```

---

## 🎯 Passer en Production (Futur)

### Quand vous voudrez envoyer de VRAIS emails

**Option 1 : OVH avec maily.ovh**
- ✅ Domaine professionnel
- ✅ Contrôle total
- ⚠️ Configuration DNS requise (MX, SPF, DKIM)

Configuration `.env` production :
```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=redacted@example.invalid
SMTP_PASS=votre_mot_de_passe_ovh
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
FRONTEND_URL=https://jobbingtrack.com
```

**Étapes** :
1. Créer `redacted@example.invalid` chez OVH
2. Configurer DNS (MX, SPF)
3. Modifier `.env` production
4. Redémarrer le service

**Option 2 : Service Cloud (si vous changez d'avis)**

Voir la documentation dans `backend/auth-service/SMTP_CONFIGURATION.md` pour :
- Brevo (300 emails/jour gratuits)
- SendGrid (100 emails/jour gratuits)
- Mailgun (gros volumes)

---

## 📚 Ressources

### Documentation

- **MailHog GitHub** : https://github.com/mailhog/MailHog
- **Nodemailer** : https://nodemailer.com/ (utilisé par JobbingTrack)
- **STATUS.md** : Section 1.12 et 1.13 (implémentation complète)

### Fichiers du Projet

```
backend/auth-service/src/services/emailService.js
→ Service d'envoi d'emails (avec auth optionnelle)

backend/auth-service/src/controllers/auth.controller.js
→ Contrôleurs pour register, verify-email, forgot-password

backend/auth-service/src/routes/auth.routes.js
→ Routes API
```

---

## ✅ État Final

```
┌──────────────────────────────────────────────────────────┐
│              CONFIGURATION MAILHOG                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Solution : MailHog (Open Source) ✅                    │
│  Status : Opérationnel ✅                               │
│  Interface : http://localhost:8025 ✅                   │
│  SMTP : host.docker.internal:1025 ✅                    │
│                                                          │
│  Tests :                                                 │
│    ✅ Email de bienvenue : Envoyé                       │
│    ✅ Email de vérification : Envoyé                    │
│    ✅ Email reset password : Prêt                       │
│                                                          │
│  Fichiers modifiés :                                     │
│    ✅ emailService.js (auth optionnelle)                │
│    ✅ docker-compose.yml (service MailHog)              │
│    ✅ .env (configuration SMTP)                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

**🎉 MailHog fonctionne parfaitement ! Ouvrez http://localhost:8025 pour voir vos emails !** 🚀
