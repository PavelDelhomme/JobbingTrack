# Mail / Emails – JobbingTrack (vue d’ensemble)

Ce document décrit l’ensemble du système mail : objectif, infra OVH (jobbingtrack.com), config SMTP, backoffice, tests et intégration (dashboard, analytics, parcours utilisateur).

**Références techniques** : **`backend/auth-service/README.md`**, **`backend/auth-service/PYTHON_EMAIL_SETUP.md`** (config SMTP et tests Python), **`STATUS.md`** (section « Mail / Emails – objectif et à faire »).

---

## 1. Objectif

- **Inscription** (app mobile / web) : l’utilisateur reçoit un **email de confirmation de compte** (vérification).
- **Mot de passe oublié** : envoi d’un **email reset password**.
- **Stockage** : tous les envois sont loggés dans **notre BDD** (table `EmailLog`, stats) — pas dans la boîte mail OVH. Objectif : gestion illimitée côté app, plateforme type Brevo dans le backoffice, sans dépendre du quota de la boîte OVH.
- **Hors scope pour l’instant** : newsletter, réception d’emails (contact / formulaire). Éventuellement en toute fin de projet.

---

## 2. Infra OVH (envoi SMTP)

- **Option recommandée** : **noreply@maily.ovh** — MX Plan **maily.ovh** actif (offre MX Plan 5), compte « noreply » créé. On utilise ce compte pour l’authentification SMTP ; on met `SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>` pour que le destinataire voie jobbingtrack.com comme expéditeur.
- **Option alternative** : **noreply@jobbingtrack.com** — si un MX Plan ou un compte existe sur jobbingtrack.com (champs MX 1/5/100 → mx1/mx2/mx3.mail.ovh.net), tu peux mettre ce compte en `SMTP_USER` / `SMTP_PASS`.
- **Stockage** : tous les envois sont loggés dans **notre BDD** (EmailLog, stats), pas dans la boîte mail OVH.

---

## 3. Config SMTP (auth-service)

L’envoi passe par le **auth-service**. Deux possibilités côté code : **Node (Nodemailer)** et/ou **service Python** (voir `backend/auth-service/PYTHON_EMAIL_SETUP.md`). Le test de connexion SMTP est en **100 % Node** ; l’envoi reset/vérification peut utiliser Node ou le script Python selon l’implémentation actuelle.

### Variables (.env – auth-service)

Exemple avec **noreply@maily.ovh** (MX Plan maily.ovh actif) — affichage expéditeur jobbingtrack.com :

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USE_SSL=false
SMTP_USER=noreply@maily.ovh
SMTP_PASS=<mot_de_passe_compte_maily.ovh>
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>
SMTP_REPLY_TO=noreply@maily.ovh
EMAIL_PROVIDER=SMTP
```

- **Alternative** : si tu as un compte **noreply@jobbingtrack.com**, mets `SMTP_USER=noreply@jobbingtrack.com` et `SMTP_PASS` correspondant.
- **Port 465** : pour SSL direct, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USE_SSL=true`.

Détail des variables et commandes de test : **`backend/auth-service/PYTHON_EMAIL_SETUP.md`**.

---

## 4. Backoffice – gestion des emails

Pages déjà en place (charte graphique backoffice) ; à brancher correctement aux APIs et au monitoring :

| Page | Route | Rôle |
|------|--------|------|
| **Dashboard Emails** | `/backoffice/emails` | Vue d’ensemble, stats (API `GET /api/v1/emails/stats`), envoi de test |
| **Configuration** | `/backoffice/emails/settings` | Config SMTP, test connexion (`GET /api/v1/emails/test-smtp`) |
| **Déliverabilité** | `/backoffice/emails/deliverability` | Test SMTP, test DNS, envoi de test |
| **Historique** | `/backoffice/emails/logs` | Liste des envois (`GET /api/v1/emails/logs`) |
| **Templates** | `/backoffice/emails/templates` | Templates (reset, vérification, etc.) — `GET/PUT /api/v1/emails/templates` |
| **Email Monitor** | `/backoffice/email-monitor` | Logs, filtres, échecs |

À faire : s’assurer que toutes ces pages appellent le **gateway** (`NEXT_PUBLIC_API_URL`), que les APIs répondent (auth-service), et que les **statistiques mail** (emails envoyés, à qui, type, statut) sont intégrées au **tableau de bord** global et à l’**analytics utilisateur** (pour un côté plateforme type Brevo).

---

## 5. APIs mail (gateway → auth-service)

- `GET /api/v1/emails/health` — santé (sans auth)
- `GET /api/v1/emails/test-smtp` — test connexion SMTP (auth)
- `GET /api/v1/emails/logs` — liste des envois (auth)
- `GET /api/v1/emails/stats` — statistiques (auth)
- `POST /api/v1/emails/test` — envoi email de test (auth)
- `GET /api/v1/emails/templates` — liste templates
- `GET/PUT /api/v1/emails/templates/:type` — détail / mise à jour template

Routes auth : `backend/auth-service/src/routes/email.routes.js` et `template.routes.js`. Gateway : `/api/v1/emails` → auth-service.

---

## 6. MailHog (développement et tests E2E)

En **dev/test**, vous pouvez utiliser **MailHog** pour capturer tous les emails sans envoyer de vrais mails :

- **Démarrage** : MailHog est inclus dans le profil **full** (`make up-full`) ou le profil **mail** :
  - `COMPOSE_PROFILES=mail docker compose up -d` pour n’avoir que MailHog + les services essentiels, ou
  - `make up-full` pour toute la stack avec MailHog.
- **Ports** : SMTP `2525` (host) → 1025 (conteneur), Web UI **8025**.
- **Configuration auth-service** : dans `.env` ou variables du conteneur :
  - `SMTP_HOST=mailhog`
  - `SMTP_PORT=1025`
  (Pas d’authentification ; depuis un autre conteneur, utiliser le service `mailhog` et le port `1025`.)
- **Interface** : http://localhost:8025 pour consulter les messages capturés.
- **Tests E2E Playwright** : `tests/e2e/specs/admin-emails-mailhog.spec.ts` envoie un email de test via l’API, vérifie la réception dans MailHog (API), ouvre l’interface MailHog et peut extraire les liens (ex. reset password) pour ouvrir la page et simuler le clic. Prérequis : stack avec MailHog + auth-service configuré en SMTP vers MailHog.

Variables optionnelles : `MAILHOG_WEB_URL` (défaut http://localhost:8025), `MAILHOG_SMTP_PORT` / `MAILHOG_WEB_PORT` dans docker-compose.

---

## 7. Tests et développement (suite)

- **Tests API** : `tests/api/test-email-endpoints.test.js` (logs, test-smtp, stats, envoi test).
- **Script global** : `scripts/test-api-specific.sh` inclut déjà les appels emails (logs, stats).
- **Parcours utilisateur** : `frontend/src/app/(admin)/backoffice/user-journey` — appels à `/api/v1/emails/test` (générique, reset, vérification) ; à garder et valider.
- **Données de test** : prévoir des utilisateurs avec email pour tester reset password et vérification (inscription).
- **Intégration** : exécuter les tests mail dans le run de dev (make ou script de tests) et vérifier que le parcours utilisateur et les stats backoffice reflètent bien les envois.
- **Tests E2E + MailHog** : voir section 6 ci-dessus ; spec `admin-emails-mailhog.spec.ts`.

Commandes utiles (auth-service) : voir **`backend/auth-service/PYTHON_EMAIL_SETUP.md`** (`make test-email-python`, etc.).

---

## 8. État actuel et récap

- **Tests DNS** : OK (MX, SPF). **Connexion SMTP** : OK (noreply@maily.ovh, ssl0.ovh.net:587). **Envoi de test** : les emails arrivent en boîte mail, mais l’interface affiche une erreur car la table **EmailLog** n’existe pas. **Solution** : `make db-push-all` pour créer la table.
- **Reply-To** : `noreply@jobbingtrack.com` (pas de réponse attendue). Headers `Auto-Submitted: auto-generated` et `X-Auto-Response-Suppress: All` ajoutés.

### Récap – quoi faire

1. **`make db-push-all`** pour créer la table `EmailLog`, puis retester l’envoi depuis Backoffice → Déliverabilité.
2. Valider les flows **reset password** et **vérification compte** (inscription).
3. Vérifier toutes les pages backoffice (Configuration, Déliverabilité, Historique, Templates, Email Monitor) et les intégrer au tableau de bord / analytics.
4. Lancer les tests mail et le parcours utilisateur ; ajouter les données de test nécessaires.

Pour le détail des étapes et la checklist à jour : **`STATUS.md`**, section « Mail / Emails – objectif et à faire ».
