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

## 2. Infra OVH (jobbingtrack.com)

- **Domaine** : jobbingtrack.com (enregistré, actif).
- **MX Plan** : jobbingtrack.com — état actif ; offre redirect / Webmail Roundcube.
- **Champs MX** :  
  - 1 mx1.mail.ovh.net  
  - 5 mx2.mail.ovh.net  
  - 100 mx3.mail.ovh.net  
- **Zone DNS** (déjà en place) :  
  - A jobbingtrack.com → 95.111.227.204  
  - A www.jobbingtrack.com → 95.111.227.204  
  - SPF : `v=spf1 include:mx.ovh.com -all`  
  - MX 1/5/100 vers mx1/mx2/mx3.mail.ovh.net  

Aucune modif DNS nécessaire pour faire marcher l’envoi SMTP. Le VPS (nginx, etc.) et la prod web peuvent être configurés en tout dernier ; pour les mails, on utilise uniquement le SMTP OVH.

---

## 3. Config SMTP (auth-service)

L’envoi passe par le **auth-service**. Deux possibilités côté code : **Node (Nodemailer)** et/ou **service Python** (voir `backend/auth-service/PYTHON_EMAIL_SETUP.md`). Le test de connexion SMTP est en **100 % Node** ; l’envoi reset/vérification peut utiliser Node ou le script Python selon l’implémentation actuelle.

### Variables (.env / docker-compose – auth-service)

Pour **OVH avec jobbingtrack.com** (compte créé dans le MX Plan, ex. `noreply@jobbingtrack.com`) :

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USE_SSL=true
SMTP_USER=noreply@jobbingtrack.com
SMTP_PASS=<mot_de_passe_compte_ovh>
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>
SMTP_REPLY_TO=noreply@jobbingtrack.com
EMAIL_PROVIDER=SMTP
```

- **Créer le compte** : dans l’espace OVH, MX Plan jobbingtrack.com → créer l’adresse (ex. `noreply@jobbingtrack.com`) et son mot de passe.
- **Port 587** : si tu préfères STARTTLS, mets `SMTP_PORT=587`, `SMTP_SECURE=false` et adapte selon `PYTHON_EMAIL_SETUP.md`.

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

## 6. Tests et développement

- **Tests API** : `tests/api/test-email-endpoints.test.js` (logs, test-smtp, stats, envoi test).
- **Script global** : `scripts/test-api-specific.sh` inclut déjà les appels emails (logs, stats).
- **Parcours utilisateur** : `frontend/src/app/(admin)/backoffice/user-journey` — appels à `/api/v1/emails/test` (générique, reset, vérification) ; à garder et valider.
- **Données de test** : prévoir des utilisateurs avec email pour tester reset password et vérification (inscription).
- **Intégration** : exécuter les tests mail dans le run de dev (make ou script de tests) et vérifier que le parcours utilisateur et les stats backoffice reflètent bien les envois.

Commandes utiles (auth-service) : voir **`backend/auth-service/PYTHON_EMAIL_SETUP.md`** (`make test-email-python`, etc.).

---

## 7. Récap – quoi faire

1. Créer le compte email OVH (ex. `noreply@jobbingtrack.com`) dans le MX Plan jobbingtrack.com.
2. Renseigner les variables SMTP dans .env / docker-compose (auth-service) et redémarrer le service.
3. Tester la connexion : Backoffice → Déliverabilité ou `GET /api/v1/emails/test-smtp`.
4. Valider les flows **reset password** et **vérification compte** (inscription) — envoi réel via SMTP, logs dans `EmailLog`.
5. Vérifier toutes les pages backoffice (Configuration, Déliverabilité, Historique, Templates, Email Monitor) et les intégrer au tableau de bord / analytics.
6. Lancer les tests mail (test-email-endpoints, test-api-specific) et le parcours utilisateur ; ajouter les données de test nécessaires.

Pour le détail des étapes et la checklist à jour : **`STATUS.md`**, section « Mail / Emails – objectif et à faire ».
