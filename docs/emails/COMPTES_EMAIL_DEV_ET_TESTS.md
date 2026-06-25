# Comptes email — dev, tests et porteur (politique)

[← Emails](README.md) | [Variables d'environnement](../deployment/environment-variables/README.md) | [Gmail / SMTP](SMTP_CONFIGURATION.md) | [Émulateur AVD](../mobile/EMULATEUR_ADB.md)

Dernière mise à jour : 22 juin 2026

## Règle centrale

Les identifiants email réels (**mots de passe compte**, **mots de passe d'application Google**, **IMAP OVH**) ne vivent **que** dans le **`.env` gitignoré** à la racine du dépôt. **Jamais** dans Git, commits, captures, tickets ou chat.

> **Ce document = dev/tests porteur sur la machine locale.**  
> Le produit « chaque utilisateur connecte sa boîte Gmail/IMAP » **n'existe pas encore** — voir **[AGENT_EMAIL_ETAT_ET_ROADMAP.md](AGENT_EMAIL_ETAT_ET_ROADMAP.md)** (OAuth, consentement RGPD, UI `/`).

**Scope autorisé** : uniquement les comptes du **porteur** pour le développement local, les smokes mobile/Playwright et l'agent email recherche — **pas** pour brancher les boîtes d'autres utilisateurs JobbingTrack via l'application.

---

## Comptes autorisés (porteur)

| Rôle | Adresse type | Usage JobbingTrack | Variables `.env` |
|------|--------------|-------------------|------------------|
| **Compte principal porteur** | `paul.delhomme@pm.me` (Proton Mail) | Utilisateur mobile de référence, smokes ADB/API, analytics test | `TEST_USER_EMAIL`, `NEXT_PUBLIC_MOBILE_TEST_USER_EMAIL` |
| **Gmail pro porteur** | ex. `pauldelhomme.pro@gmail.com` | AVD Android, IMAP agent email, digest, forward OVH | `EMAIL_GMAIL_PRO_*`, `TEST_EMAIL_TRIAGE_GMAIL_*` |
| **Boîte candidatures OVH** | ex. `candidatures@delhomme.ovh` | Lecture IMAP agent email (forward vers Gmail pro) | `EMAIL_TRIAGE_READ_ACCOUNT`, `TEST_EMAIL_TRIAGE_IMAP_*` |
| **Alias tests inscription mobile** | ex. `test+mob@delhomme.ovh` | Smokes inscription / vérif email sans polluer le compte principal | scripts `smoke-register-adb.js`, etc. |

> **Legacy** : certains smokes ou `.env` locaux mentionnent encore `paul.delhomme@proton.me`. Le compte de référence documenté est **`paul.delhomme@pm.me`** — aligner le `.env` local puis `node scripts/mobile/sync-test-env.js --write`.

### Comptes de test applicatifs (OK en local)

- Comptes **`@jobbingtrack.test`**, **`e2e-noverify-*.mailhog.local`**, **`isTestData`** en BDD.
- Comptes créés par smokes Playwright/Jest avec placeholders `example.invalid`.
- **Ne pas** y mettre de vrais mots de passe Gmail ou Proton d'autres personnes.

### Interdit

- Utiliser `EMAIL_GMAIL_PRO_*` ou un mot de passe d'application Google pour **un compte autre que le Gmail pro porteur**.
- Stocker des credentials email **utilisateur final** (inscrits prod) dans `.env` ou la doc.
- Déployer Gmail personnel comme **SMTP officiel** JobbingTrack en préprod/prod (voir [SMTP_CONFIGURATION.md](SMTP_CONFIGURATION.md)).

---

## Gmail — mot de passe compte vs mot de passe d'application

Google distingue **deux secrets** :

| Secret | Variable | Sert à |
|--------|----------|--------|
| Mot de passe **compte** Google | `EMAIL_GMAIL_PRO_PASSWORD` | Connexion manuelle / ADB sur l'émulateur Android (« Ajouter un compte Google ») |
| Mot de passe **d'application** (16 car.) | `EMAIL_GMAIL_PRO_PASSWORD_APPLICATION` | **SMTP** (`SMTP_PASS`) et **IMAP** (`imap.gmail.com`) — scripts agent email, `fetch-imap-verification.js` |

### Obtenir un mot de passe d'application (compte Gmail pro porteur uniquement)

1. Compte Google du porteur → **Sécurité** → activer **Validation en 2 étapes**.
2. Ouvrir [Mots de passe des applications](https://myaccount.google.com/apppasswords).
3. Créer une entrée nommée **`JobbingTrack`** (ou « JobbingTrack dev »).
4. Copier le code **16 caractères** dans `.env` :

```bash
EMAIL_GMAIL_PRO_PASSWORD_APPLICATION=xxxx xxxx xxxx xxxx
```

5. Pour SMTP dev ponctuel (même compte, même app password) :

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USE_SSL=false
SMTP_USER=${EMAIL_GMAIL_PRO_ACCOUNT}
SMTP_PASS=${EMAIL_GMAIL_PRO_PASSWORD_APPLICATION}
```

**Ne pas** saisir le mot de passe d'application sur l'écran de connexion Android — il sera rejeté. Voir [EMULATEUR_ADB.md](../mobile/EMULATEUR_ADB.md) § Gmail.

---

## Chaîne agent email (OVH → Gmail)

Architecture documentée pour le porteur :

```text
candidatures@delhomme.ovh  ──forward──►  pauldelhomme.pro@gmail.com
        │                                          │
        └── IMAP OVH (TEST_EMAIL_TRIAGE_IMAP_*)    └── IMAP app password (EMAIL_GMAIL_PRO_*)
```

Variables : `EMAIL_TRIAGE_READ_ACCOUNT`, `EMAIL_TRIAGE_FORWARD_ADDRESS`, `EMAIL_TRIAGE_DIGEST_RECIPIENT` — résolution centralisée : `scripts/mobile/resolve-email-triage-env.js`.

Sync `.env` tests agent :

```bash
node scripts/mobile/sync-test-env.js --write
```

---

## Cible SMTP produit — `@jobbingtrack.com`

L’expéditeur applicatif (vérif compte, reset MDP, digest) doit finir sur **`@jobbingtrack.com`**, pas `@maily.ovh`.

**État OVH (25/06/2026)** : le MX Plan sur `jobbingtrack.com` est en offre **`redirect`** (quota comptes **0/0**) — pas de boîte créable tant que l’offre n’est pas upgradée. Voir **[OVH_MX_PLAN_JOBBINGTRACK.md](OVH_MX_PLAN_JOBBINGTRACK.md)**.

En dev, continuer `maily.ovh` ou MailHog ; **refaire tous les smokes mail** après migration domaine (checklist dans ce doc).

---

## Compte principal mobile — `paul.delhomme@pm.me`

Dans `.env` local (exemple porteur — **ne pas committer**) :

```bash
TEST_USER_EMAIL=paul.delhomme@pm.me
TEST_USER_PASSWORD=<mot de passe Proton — .env uniquement>
NEXT_PUBLIC_MOBILE_TEST_USER_EMAIL=paul.delhomme@pm.me
```

Smokes concernés : `smoke-login-user-adb.js`, `smoke-analytics-test-user-sessions.js`, parcours auth mobile documentés dans [EMULATEUR_ADB.md](../mobile/EMULATEUR_ADB.md).

**Proton Mail** : pas de mot de passe d'application Google ; la réception IMAP Proton est un sujet séparé (non requis pour la vérif email JobbingTrack si MailHog / EmailLog / Gmail triage suffisent).

---

## Alignement `.env` ↔ `.env.example`

```bash
node scripts/env/env-align-with-example.cjs
node scripts/env/reorder-env-from-example.cjs --write
node scripts/mobile/sync-test-env.js --write
```

Vérifier IMAP Gmail :

```bash
node scripts/mobile/fetch-imap-verification.js --check-only
```

Configurer Gmail sur AVD (compte porteur uniquement) :

```bash
node scripts/mobile/configure-emulator-gmail.js --check-only
node scripts/mobile/configure-emulator-gmail.js
```

BlueMail + boîte OVH **`candidatures@…`** sur l’AVD (IMAP, tests vérif email) : **[EMULATEUR_ADB.md](../mobile/EMULATEUR_ADB.md)** § BlueMail + boîte OVH candidatures.

---

## Liens

- [SMTP_CONFIGURATION.md](SMTP_CONFIGURATION.md) — matrice MailHog / Gmail dev / OVH prod
- [EMAIL_TRIAGE_AGENT.md](../features/EMAIL_TRIAGE_AGENT.md) — cadrage produit agent recherche
- [resolve-email-triage-env.js](../../scripts/mobile/resolve-email-triage-env.js) — résolution machine des variables
