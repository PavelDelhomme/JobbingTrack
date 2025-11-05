# 🚀 Configurer OVH MAINTENANT - Guide Rapide

> **Pour envoyer de VRAIS emails à vos utilisateurs**

---

## 🎯 Vous Voulez Envoyer de VRAIS Emails ?

**Actuellement** : MailHog capture les emails localement (utilisateurs ne reçoivent RIEN)

**Après configuration OVH** : Les utilisateurs recevront VRAIMENT les emails ! ✅

---

## ⏱️ 5 Étapes (15 minutes)

### ✅ Étape 1 : Créer l'Email OVH (5 min)

**Aller sur** : https://www.ovh.com/manager/web/

1. Se connecter
2. Menu "**Emails**" → Sélectionner `maily.ovh`
3. Onglet "**Comptes email**"
4. Cliquer "**Créer une adresse email**"
5. Remplir :
   - Compte : `noreply`
   - Mot de passe : Créer un mot de passe FORT (12+ caractères)
   - **NOTER CE MOT DE PASSE** ✍️

**Résultat** : `redacted@example.invalid` créé ✅

---

### ✅ Étape 2 : Vérifier DNS (Optionnel - 2 min)

**Si vous voulez éviter les spams**, vérifier :

1. Manager OVH → "**Domaines**" → `maily.ovh`
2. Onglet "**Zone DNS**"
3. Chercher :
   - MX : `mx1.mail.ovh.net` (priorité 1) ✅
   - TXT : `v=spf1 include:mx.ovh.com ~all` ✅

**Si absents** : Ajouter (voir MAIL.md pour détails)

**Généralement** : Déjà configuré automatiquement par OVH ✅

---

### ✅ Étape 3 : Modifier le `.env` (2 minutes)

**Ouvrir** :
```bash
nano /home/pactivisme/Documents/Dev/Perso/JobbingTrack/.env
```

**Chercher la section SMTP et remplacer par** :

```env
# ═══════════════════════════════════════════════════════════
# SMTP OVH maily.ovh (PRODUCTION - Vrais Emails)
# ═══════════════════════════════════════════════════════════

SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=redacted@example.invalid
SMTP_PASS=VOTRE_MOT_DE_PASSE_OVH_ICI
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
FRONTEND_URL=http://localhost:8080
```

**⚠️ REMPLACER** `VOTRE_MOT_DE_PASSE_OVH_ICI` par le mot de passe créé à l'étape 1 !

**Sauvegarder** : `Ctrl+O` puis `Enter` puis `Ctrl+X`

---

### ✅ Étape 4 : Redémarrer le Service (1 minute)

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Redémarrer
docker-compose --profile auth restart auth-service

# Attendre 3 secondes
sleep 3

# Vérifier configuration
docker exec jobbingtrack-auth-service sh -c 'echo "SMTP: $SMTP_HOST | USER: $SMTP_USER"'
```

**Résultat attendu** :
```
SMTP: ssl0.ovh.net | USER: redacted@example.invalid
```

✅ Si c'est affiché, c'est bon !

---

### ✅ Étape 5 : TESTER avec Votre Vrai Email (2 minutes)

**Test Reset Password** :

```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid"}'
```

**VÉRIFIER VOTRE BOÎTE GMAIL** 📧

**Vous devriez recevoir** :
- ✅ Un email de JobbingTrack
- ✅ Expéditeur : `redacted@example.invalid`
- ✅ Avec un lien de reset password

**Si vous recevez l'email** → 🎉 **ÇA MARCHE !**

---

## 🧪 Test Complet (Inscription)

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

**VÉRIFIER GMAIL** :
- 📧 Email de bienvenue
- ✅ Email de vérification (avec lien)

**Cliquer sur le lien** → Vérification du compte !

---

## ❌ Problèmes Possibles

### Email pas reçu dans Gmail

**Vérifier** :
1. Dossier SPAM dans Gmail
2. Logs du service :
   ```bash
   docker logs --tail 20 jobbingtrack-auth-service | grep -i email
   ```

**Si erreur "Invalid login: 535"** :
- Mauvais mot de passe dans `.env`
- Vérifier : se connecter au webmail OVH avec le même mot de passe
- https://www.ovh.com/fr/mail/ → `redacted@example.invalid`

**Si erreur "Connection refused"** :
- Essayer port 587 au lieu de 465 :
  ```env
  SMTP_PORT=587
  SMTP_SECURE=false
  ```

---

## 📊 Vérification Finale

**Checklist** :

- [ ] Email `redacted@example.invalid` créé chez OVH ✅
- [ ] Mot de passe noté ✅
- [ ] `.env` modifié avec OVH ✅
- [ ] Service auth redémarré ✅
- [ ] Variables vérifiées (docker exec) ✅
- [ ] Email test envoyé ✅
- [ ] **Email reçu dans Gmail** ✅ ← **LE PLUS IMPORTANT !**

---

## 🎯 Résumé

**Avant (MailHog)** :
```
redacted@example.invalid s'inscrit
  → Email capturé dans http://localhost:8025
  → Paul ne reçoit RIEN ❌
```

**Après (OVH)** :
```
redacted@example.invalid s'inscrit
  → Email envoyé via ssl0.ovh.net
  → Paul REÇOIT l'email dans Gmail ✅
  → Paul clique sur le lien
  → Compte vérifié ! 🎉
```

---

**🚀 Suivez les 5 étapes ci-dessus pour envoyer de vrais emails !**

**Temps total : 15 minutes ⏱️**

