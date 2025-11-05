# 🚀 Démarrage Rapide - Vérification d'Email

## ⚡ 5 Étapes pour Activer la Vérification d'Email

### 1️⃣ Exécuter la Migration (2 minutes)

```bash
cd backend/auth-service

# Option A : Avec Prisma (recommandé)
npx prisma migrate dev --name add_email_verification

# Option B : Migration SQL directe
psql -U postgres -d jobbingtrack -f prisma/migrations/add_email_verification.sql
```

### 2️⃣ Configurer SMTP (3 minutes)

Éditez `backend/auth-service/.env` :

```env
# Pour Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app  # Créé dans Google Account > Security > App Passwords
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>

# Pour Tests (Mailtrap - gratuit)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=votre-username-mailtrap
SMTP_PASS=votre-password-mailtrap

# URL Frontend
FRONTEND_URL=http://localhost:5173
```

### 3️⃣ Redémarrer le Service Auth (30 secondes)

```bash
# Si Docker
docker-compose restart auth-service

# Si Node local
cd backend/auth-service
npm run dev
```

### 4️⃣ Tester l'Inscription (1 minute)

1. Ouvrez http://localhost:5173/register
2. Créez un compte avec votre vraie adresse email
3. Vérifiez votre boîte de réception
4. Vous devriez recevoir 2 emails :
   - 🎉 Email de bienvenue
   - ✅ Email de vérification avec lien

### 5️⃣ Vérifier le Lien (30 secondes)

1. Cliquez sur le bouton "Vérifier mon email" dans l'email
2. Vous devriez voir la page de succès ✅
3. Redirection automatique vers /login après 3 secondes

---

## ✅ C'est Fait !

Votre système de vérification d'email est maintenant opérationnel.

---

## 🧪 Test Automatisé (Optionnel)

```bash
cd backend/auth-service
node test-email-verification.js
```

---

## 📚 Documentation Complète

- **Guide Complet** : `INSTRUCTIONS_VERIFICATION_EMAIL.md`
- **Résumé Technique** : `RESUME_VERIFICATION_EMAIL.md`
- **Ce Fichier** : Démarrage rapide

---

## ⚠️ Problèmes Courants

### Email pas reçu ?
→ Vérifiez les logs : `docker logs auth-service`
→ Vérifiez le dossier spam
→ Essayez avec Mailtrap d'abord

### Lien ne fonctionne pas ?
→ Vérifiez `FRONTEND_URL` dans .env
→ Vérifiez que la migration a été exécutée

### Token invalide ?
→ Le token expire après 24h
→ Utilisez le formulaire "Renvoyer l'email" sur la page d'erreur

---

## 🎯 URLs Importantes

| Endpoint | URL | Description |
|----------|-----|-------------|
| Inscription | http://localhost:5173/register | Créer un compte |
| Vérification | http://localhost:5173/verify-email?token=... | Page de vérification |
| API Verify | http://localhost:3000/api/v1/auth/verify-email/:token | Endpoint de vérification |
| API Resend | http://localhost:3000/api/v1/auth/resend-verification | Renvoyer l'email |

---

## 🎨 Aperçu Visuel

```
┌────────────────────────────────────────┐
│  1. INSCRIPTION                        │
│  • Formulaire standard                 │
│  • Bouton "Créer mon compte"           │
│  • Message : "Email de vérification    │
│    envoyé !"                           │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│  2. EMAIL REÇU                         │
│  ┌──────────────────────────────────┐  │
│  │  JobbingTrack                    │  │
│  │  Vérification de votre email     │  │
│  │                                  │  │
│  │  Bonjour [Prénom] ! 👋          │  │
│  │                                  │  │
│  │  [Bouton Vert]                   │  │
│  │  ✓ Vérifier mon email            │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│  3. PAGE DE VÉRIFICATION               │
│  ✅ Email Vérifié !                    │
│  • Message de succès                   │
│  • Redirection auto vers /login        │
│  • Bouton "Se connecter"               │
└────────────────────────────────────────┘
```

---

## 💡 Conseil Pro

Pour vos tests, utilisez **Mailtrap.io** (gratuit) :
- Tous les emails sont interceptés
- Interface web pour voir les emails
- Pas de risque d'envoyer des emails par erreur
- Parfait pour le développement

---

**Temps total d'installation : ~7 minutes** ⏱️

Bonne chance ! 🚀

