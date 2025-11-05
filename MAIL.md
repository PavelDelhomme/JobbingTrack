# Configuration Envoi d'Emails - JobbingTrack

Guide complet pour configurer l'envoi d'emails (vérification, reset password, bienvenue).

---

## État Actuel

- ✅ **Système d'emails implémenté** (vérification, reset password, bienvenue)
- ✅ **Routes API fonctionnelles** (`/auth/verify-email`, `/auth/forgot-password`)
- ⚠️  **Configuration SMTP requise** pour l'envoi réel d'emails

Voir **STATUS.md section 1.13** pour les détails d'implémentation.

---

## 3 Solutions Disponibles

### Option 1 : MailHog (Recommandé pour développement)

**Avantages** :
- ✅ Aucune configuration externe
- ✅ Emails capturés localement (pas de vrai envoi)
- ✅ Interface web pour voir les emails
- ✅ Gratuit et simple

**Installation** :

```bash
# Ajouter au docker-compose.yml
mailhog:
  image: mailhog/mailhog
  container_name: jobbingtrack-mailhog
  ports:
    - "1025:1025"  # SMTP
    - "8025:8025"  # Web UI
  networks:
    - jobbingtrack-network
```

**Configuration `.env` racine** :

```env
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
FRONTEND_URL=http://localhost:8080
```

**Démarrage** :

```bash
docker-compose up -d mailhog
docker-compose --profile auth restart auth-service

# Interface web : http://localhost:8025
```

---

### Option 2 : Gmail App Password

**Prérequis** :
- Compte Gmail
- Authentification à 2 facteurs activée (OBLIGATOIRE)

**Étapes** :

1. Aller sur : https://myaccount.google.com/apppasswords
2. Activer l'authentification à 2 facteurs
3. Créer un App Password pour "JobbingTrack"
4. **Copier** le mot de passe de 16 caractères

**Configuration `.env` racine** :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=redacted@example.invalid
SMTP_PASS=votre_app_password_16_caracteres
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
FRONTEND_URL=http://localhost:8080
```

**⚠️  IMPORTANT** : Ne commitez JAMAIS le .env avec ce mot de passe !

---

### Option 3 : Brevo (Recommandé pour production)

**Avantages** :
- ✅ 300 emails/jour GRATUITS
- ✅ Pas d'App Password Gmail requis
- ✅ Simple à configurer
- ✅ Fiable pour production

**Étapes** :

1. Créer un compte : https://www.brevo.com/
2. Récupérer la clé SMTP dans les paramètres
3. Configurer le `.env`

**Configuration `.env` racine** :

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=redacted@example.invalid
SMTP_PASS=votre_cle_smtp_brevo
SMTP_FROM="JobbingTrack <noreply@jobbingtrack.test>"
FRONTEND_URL=https://votre-domaine.com
```

---

## Comparaison

| Solution | Difficulté | Emails/jour | Coût | Meilleur pour |
|----------|------------|-------------|------|---------------|
| **MailHog** | ⭐ Facile | ♾️ Illimité | 🆓 Gratuit | Développement |
| **Brevo** | ⭐⭐ Moyen | 300 | 🆓 Gratuit | Production |
| **Gmail** | ⭐⭐⭐ Complexe | 500 | 🆓 Gratuit | OK mais compliqué |
| **OVH** | ⭐⭐ Moyen | 200/heure | 💰 Payant | Si domaine existant |

---

## Configuration OVH (Option avancée)

**Si vous avez déjà un domaine chez OVH** :

**Configuration `.env` racine** :

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=redacted@example.invalid
SMTP_PASS=votre_mot_de_passe_ovh
SMTP_FROM="JobbingTrack <redacted@example.invalid>"
FRONTEND_URL=https://votre-domaine.com
```

**Alternative STARTTLS** :

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
# Reste identique
```

---

## Test de Configuration

**1. Redémarrer le service** :

```bash
docker-compose --profile auth restart auth-service
```

**2. Tester l'envoi** :

```bash
# Test reset password
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid"}'
```

**3. Vérifier les logs** :

```bash
docker logs --tail 50 jobbingtrack-auth-service | grep -i email
```

**Résultat attendu** :
```
✅ Email envoyé avec succès
✅ Email de vérification envoyé
```

---

## Résolution de Problèmes

### Erreur : "Invalid login: 535"

**Cause** : Mot de passe incorrect

**Solutions** :
- Gmail : Vérifier que c'est un **App Password** (pas le mot de passe principal)
- OVH : Vérifier le mot de passe de l'adresse email OVH
- Brevo : Vérifier la clé SMTP Brevo

### Erreur : "Connection refused"

**Cause** : Service SMTP non accessible

**Solutions** :
- MailHog : Vérifier que le container est démarré (`docker ps | grep mailhog`)
- Gmail/OVH/Brevo : Vérifier la connexion internet

### Emails non reçus

**Solutions** :
- Vérifier le dossier spam
- MailHog : Aller sur http://localhost:8025
- Vérifier les logs : `docker logs jobbingtrack-auth-service`

---

## Sécurité

⚠️  **IMPORTANT** :

- ❌ Ne commitez JAMAIS le fichier `.env` avec vos credentials
- ✅ Le `.env` est déjà ignoré par `.gitignore`
- ✅ Utilisez des App Passwords pour Gmail (pas le mot de passe principal)
- ✅ Changez les secrets en production
- ✅ Utilisez HTTPS en production

---

## Recommandations

**Pour développement** : Utilisez **MailHog** (simple et efficace)

**Pour production** : Utilisez **Brevo** (300 emails/jour gratuits)

---

**Voir STATUS.md section 1.12 et 1.13 pour plus de détails**

