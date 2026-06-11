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

- **Option recommandée** : **redacted@example.invalid** — MX Plan **maily.ovh** actif (offre MX Plan 5), compte « noreply » créé. On utilise ce compte pour l’authentification SMTP ; on met `SMTP_FROM=JobbingTrack <redacted@example.invalid>` pour que le destinataire voie jobbingtrack.com comme expéditeur.
- **Option alternative** : **redacted@example.invalid** — si un MX Plan ou un compte existe sur jobbingtrack.com (champs MX 1/5/100 → mx1/mx2/mx3.mail.ovh.net), tu peux mettre ce compte en `SMTP_USER` / `SMTP_PASS`.
- **Stockage** : tous les envois sont loggés dans **notre BDD** (EmailLog, stats), pas dans la boîte mail OVH.

---

## 3. Config SMTP (auth-service)

L’envoi passe par le **auth-service**. Deux possibilités côté code : **Node (Nodemailer)** et/ou **service Python** (voir `backend/auth-service/PYTHON_EMAIL_SETUP.md`). Le test de connexion SMTP est en **100 % Node** ; l’envoi reset/vérification peut utiliser Node ou le script Python selon l’implémentation actuelle.

### Variables (.env – auth-service)

Exemple avec **redacted@example.invalid** (MX Plan maily.ovh actif) — affichage expéditeur jobbingtrack.com :

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USE_SSL=false
SMTP_USER=redacted@example.invalid
SMTP_PASS=<mot_de_passe_compte_maily.ovh>
SMTP_FROM=JobbingTrack <redacted@example.invalid>
SMTP_REPLY_TO=redacted@example.invalid
EMAIL_PROVIDER=SMTP
```

- **Alternative** : si tu as un compte **redacted@example.invalid**, mets `SMTP_USER=redacted@example.invalid` et `SMTP_PASS` correspondant.
- **Port 465** : pour SSL direct, `SMTP_PORT=465`, `SMTP_SECURE=false`, `SMTP_USE_SSL=true`.

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

En **dev/test**, vous pouvez utiliser **MailHog** pour capturer tous les emails sans envoyer de vrais mails. MailHog ne doit pas être utilisé comme transport final en préproduction ou production.

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

### Préprod / production : MailHog interdit comme transport final

Avant préprod/prod :

- `SMTP_HOST` doit pointer vers un fournisseur réel (OVH, Brevo, SendGrid, Mailgun, etc.), jamais `mailhog`, `localhost` ou `127.0.0.1`.
- `SMTP_USER` / `SMTP_PASS` doivent être renseignés via l'environnement serveur, Portainer ou secret manager, hors Git.
- `SMTP_FROM` doit être accepté par le fournisseur ; si le fournisseur impose le compte authentifié comme expéditeur, garder l'alias métier dans `SMTP_REPLY_TO`.
- `CRASH_REPORT_EMAIL`, `SECURITY_ALERT_EMAIL(S)` et futurs emails de digest doivent viser des alias/listes dédiés du domaine JobbingTrack, redirigés chez le fournisseur mail.
- Un smoke préprod doit prouver : réception réelle, ligne `EmailLog` en `SENT`, sujet lisible, absence de secret dans le contenu, et `messageId` fournisseur quand disponible.
- MailHog peut rester documenté pour les tests locaux, mais ne doit pas être lancé ni exposé publiquement en prod.

---

## 6.b Alertes sécurité (security-service → notification-service)

Les emails de reset/vérification passent historiquement par **auth-service**, mais les alertes sécurité critiques passent par le chemin suivant :

`security-service` → `notification-service` → SMTP/MailHog → table `EmailLog`.

Points de configuration importants :

- `SECURITY_ALERT_EMAILS` / `SECURITY_ALERT_EMAIL` : destinataires.
- `SECURITY_ALERT_EMAIL_ENABLED` : désactive l’envoi réel si `false`.
- `SECURITY_INTERNAL_SECRET` : secret interne partagé entre security-service et notification-service.
- `NOTIFICATION_SERVICE_URL` : URL interne du notification-service.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` : doivent aussi être disponibles dans **notification-service**, pas seulement dans auth-service.

En dev avec MailHog, `SMTP_HOST=mailhog`, `SMTP_PORT=1025`, sans `SMTP_USER`/`SMTP_PASS`. Le notification-service ne doit pas envoyer `AUTH PLAIN` vide.

En préprod/prod avec OVH ou fournisseur SMTP réel :

- renseigner `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USE_SSL`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` et `SMTP_REPLY_TO` dans l'environnement serveur ;
- laisser `NOTIFICATION_SMTP_HOST` vide sauf besoin très précis : dans le compose local, cette variable force MailHog pour `notification-service`, ce qui est voulu en dev mais dangereux en prod ;
- vérifier que les alertes critiques ne dépendent plus du miroir local `SECURITY_ALERT_SMTP_MIRROR_*` : le transport principal doit déjà être le SMTP réel.

Erreur connue :

- `Missing credentials for "PLAIN"` signifie que le transport SMTP tente une authentification PLAIN sans credentials complets. Vérifier que `SMTP_USER` + `SMTP_PASS` sont passés au conteneur ou, en MailHog/dev, que l’auth SMTP est bien désactivée.

---

## 7. Tests et développement (suite)

- **Tests API** : `tests/api/test-email-endpoints.test.js` (logs, test-smtp, stats, envoi test).
- **Script global** : `scripts/testing/test-api-specific.sh` inclut déjà les appels emails (logs, stats).
- **Parcours utilisateur** : `frontend/src/app/(admin)/backoffice/user-journey` — appels à `/api/v1/emails/test` (générique, reset, vérification) ; à garder et valider.
- **Données de test** : prévoir des utilisateurs avec email pour tester reset password et vérification (inscription).
- **Intégration** : exécuter les tests mail dans le run de dev (make ou script de tests) et vérifier que le parcours utilisateur et les stats backoffice reflètent bien les envois.
- **Tests E2E + MailHog** : voir section 6 ci-dessus ; spec `admin-emails-mailhog.spec.ts`.

Commandes utiles (auth-service) : voir **`backend/auth-service/PYTHON_EMAIL_SETUP.md`** (`make test-email-python`, etc.).

---

## 8. État actuel et récap

- **Tests DNS** : OK (MX, SPF). **Connexion SMTP** : OK (redacted@example.invalid, ssl0.ovh.net:587). **Envoi de test** : les emails arrivent en boîte mail, mais l’interface affiche une erreur car la table **EmailLog** n’existe pas. **Solution** : `make db-push-all` pour créer la table.
- **Reply-To** : `redacted@example.invalid` (pas de réponse attendue). Headers `Auto-Submitted: auto-generated` et `X-Auto-Response-Suppress: All` ajoutés.

### Récap – quoi faire

1. **`make db-push-all`** pour créer la table `EmailLog`, puis retester l’envoi depuis Backoffice → Déliverabilité.
2. Valider les flows **reset password** et **vérification compte** (inscription).
3. Vérifier toutes les pages backoffice (Configuration, Déliverabilité, Historique, Templates, Email Monitor) et les intégrer au tableau de bord / analytics.
4. Lancer les tests mail et le parcours utilisateur ; ajouter les données de test nécessaires.
5. **Backoffice – règles d'envoi par action (à faire)** : configurer dynamiquement quels emails sont envoyés pour quelle action (ex. inscription, entretien créé, relance auto) — page ou écran de configuration par type d'événement.

Pour le détail des étapes et la checklist à jour : **`STATUS.md`**, section « Mail / Emails – objectif et à faire ».
