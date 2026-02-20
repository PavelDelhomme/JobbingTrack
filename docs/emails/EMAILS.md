# Emails, SMTP, logs et API versioning – Quoi faire, comment

Ce doc décrit **concrètement** ce sur quoi travailler : **SMTP**, **logs emails**, **API versioning**.

---

## 1. SMTP (envoi d’emails)

### Où c’est

- **Backend** : `backend/auth-service` (provider SMTP Nodemailer, 100 % Node).
- **Config** : variables d’environnement (docker-compose ou `.env` pour auth-service).

### Variables à renseigner

| Variable        | Exemple / description |
|----------------|------------------------|
| `SMTP_HOST`    | `ssl0.ovh.net` (ou ton serveur SMTP) |
| `SMTP_PORT`    | `465` (SSL) ou `587` (STARTTLS) |
| `SMTP_USER`    | Adresse de connexion (ex. `redacted@example.invalid`) |
| `SMTP_PASS`    | Mot de passe du compte SMTP |
| `SMTP_FROM`    | Adresse affichée (ex. `JobbingTrack <redacted@example.invalid>`) |
| `SMTP_REPLY_TO`| Optionnel, défaut = `SMTP_FROM` |
| `EMAIL_PROVIDER` | `SMTP` (défaut) ou `RESEND` |

### Ce qu’il faut faire

1. Renseigner les variables dans `.env` ou dans `docker-compose.yml` (section auth-service).
2. Redémarrer l’auth-service : `make build` puis redémarrer le service, ou `make up-full`.
3. Tester la connexion :
   - **Backoffice** : Emails → Déliverabilité → bouton « Tester la connexion SMTP ».
   - **API** : `GET /api/v1/emails/test-smtp` (avec token Bearer). Réponse 200 = OK.

### Dépannage

- **503 / « Provider non disponible »** : auth-service pas démarré ou variables absentes.
- **500 / « Connexion SMTP échouée »** : vérifier host/port/user/pass, firewall, et que le serveur SMTP accepte les connexions (SSL/TLS selon le port).

---

## 2. Logs emails (historique des envois)

### Où c’est

- **API** : `GET /api/v1/emails/logs` (gateway → auth-service).
- **Front** : Backoffice → Emails → **Historique des emails** (page `/backoffice/emails/logs`).

### Ce qu’il faut faire

1. S’assurer que la stack tourne (gateway + auth-service) et que le front appelle bien le gateway (`NEXT_PUBLIC_API_URL`).
2. Ouvrir Backoffice → Emails → Historique des emails. La page envoie `GET /api/v1/emails/logs` avec le token utilisateur.
3. Si **404** : rebuild auth-service (`make build` ou rebuild du service), redémarrer, réessayer. Le front affiche un message explicite en cas de 404.
4. Si **401** : se reconnecter au backoffice (token manquant ou expiré).

### Dépannage

- 404 : gateway ou auth-service pas à jour → rebuild auth-service.
- Liste vide : normal si aucun email envoyé ; la table `EmailLog` est alimentée à chaque envoi (reset password, vérification, etc.).

---

## 3. API versioning (versions app / appareils)

### Où c’est

- **API** : `GET /api/v1/analytics/stats/:userId/versions` (gateway → dashboard-service).
- **Front** : Backoffice → Analytics utilisateur (page qui affiche versions et appareils par utilisateur).

### Ce qu’il faut faire

1. La route existe côté dashboard-service (`/stats/:userId/versions` dans `analytics.routes.js`). Le gateway envoie `/api/v1/analytics*` au dashboard-service (port 3000).
2. Si **404** : rebuild dashboard-service, redémarrer. Vérifier que `JWT_SECRET` est le même côté auth et dashboard (token valide).
3. Côté front : la page appelle `GET /api/v1/analytics/stats/${user.id}/versions` avec le token ; s’assurer que `user.id` est bien l’ID de l’utilisateur cible.

### Dépannage

- 404 : rebuild dashboard-service ; vérifier les logs gateway et dashboard.
- 401/403 : token manquant ou invalide ; vérifier JWT_SECRET partagé.

---

## Récap – Ordre de travail conseillé

1. **SMTP** : configurer les variables → redémarrer auth-service → tester via backoffice (Déliverabilité) ou API test-smtp.
2. **Logs emails** : vérifier que `/backoffice/emails/logs` répond (pas de 404) ; si 404, rebuild auth-service.
3. **API versioning** : vérifier que la page analytics utilisateur reçoit bien les versions ; si 404, rebuild dashboard-service et JWT_SECRET.

Autres docs utiles : [README.md](README.md), [EMAIL_CONFIGURATION.md](EMAIL_CONFIGURATION.md), [EMAIL_TROUBLESHOOTING.md](EMAIL_TROUBLESHOOTING.md).
