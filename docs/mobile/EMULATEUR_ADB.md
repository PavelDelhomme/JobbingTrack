# Émulateur Android + smokes ADB (sans USB)

Guide rapide pour remplacer le Samsung USB par l’AVD local.

## Prérequis

- Stack JobbingTrack **démarrée** (gateway `127.0.0.1:5002`).
- Flutter SDK (`~/flutter-sdk/bin/flutter` ou `flutter` dans le PATH).
- Contrôleur ADB : `tools/emulator-controller` sur **127.0.0.1:5055** (local uniquement, pas VPS prod).

## Commandes essentielles

| Étape | Commande |
|--------|----------|
| 1. SDK + AVD (une fois, ~1–4 Go) | `bash scripts/mobile/setup-android-emulator.sh install` |
| 2. Tout-en-un (émulateur + reverse + APK) | `bash scripts/mobile/setup-android-emulator.sh up` |
| 2b. Gmail pro sur AVD (depuis `.env`) | `node scripts/mobile/configure-emulator-gmail.js` |
| 2c. BlueMail + boîte OVH candidatures (manuel AVD) | Play Store → BlueMail → IMAP `candidatures@…` (voir § BlueMail ci-dessous) |
| 3. Stack Docker (sans `make`) | `docker compose -f docker-compose.yml --profile full up -d` |
| 4. Contrôleur ADB | `ADB_FAST=1 node tools/emulator-controller/server.js` |
| 5. Variables session | `export MOBILE_ADB_DEVICE=emulator-5554 ADB_FAST=1` |
| 6. Smoke login | `node scripts/mobile/smoke-login-user-password-adb.js` |
| 7. Copier prefs Samsung → émulateur | `bash scripts/mobile/sync-app-data-adb.sh --locale` (voir `CLONE_APPAREIL.md`) |

> **`install` seul** ne démarre pas l’émulateur ni n’installe l’APK — enchaîner avec `up` ou `start` + `reverse`.

## Build APK (Arch Linux)

Le Flutter **pacman** (`/usr/bin/flutter`) peut échouer avec `Wrong full snapshot version`. Utiliser :

```bash
bash scripts/mobile/build-apk-debug.sh
# ou
export PATH="$HOME/flutter-sdk/bin:$PATH"
```

## Workflow complet (copier-coller)

```bash
# Terminal 1 — stack (depuis la racine du repo)
docker compose -f docker-compose.yml --profile full up -d

# Attendre gateway (~30 s)
curl -sf http://127.0.0.1:5002/health

# Terminal 2 — émulateur + APK
bash scripts/mobile/setup-android-emulator.sh up

# Terminal 3 — contrôleur ADB
cd tools/emulator-controller && ADB_FAST=1 node server.js

# Terminal 4 — smokes
export MOBILE_ADB_DEVICE=emulator-5554 ADB_FAST=1
node scripts/mobile/smoke-login-user-password-adb.js
bash scripts/mobile/run-smokes-fast.sh   # batterie rapide (+ capture logs pre/post)

# Capturer logs Docker + logcat (à tout moment)
bash scripts/mobile/capture-validation-logs.sh
# → tests/results/mobile-validation-<timestamp>/
```

## Samsung USB + émulateur en parallèle

Dans `.env` :

```env
MOBILE_ADB_DEVICE=          # vide = USB prioritaire
MOBILE_PREFER_EMULATOR=0
```

Pour forcer l’émulateur : `MOBILE_ADB_DEVICE=emulator-5554` ou `MOBILE_PREFER_EMULATOR=1` (+ `.env.mobile-emulator`).

## Gmail pro sur l’AVD (automatique depuis `.env`)

> **Politique** : un seul Gmail autorisé — celui du porteur (`EMAIL_GMAIL_PRO_ACCOUNT`, ex. `pauldelhomme.pro@gmail.com`). Mot de passe d'application = **SMTP/IMAP uniquement**, pas connexion Android. Compte mobile principal : **`paul.delhomme@pm.me`** (Proton). Doc complète : **[COMPTES_EMAIL_DEV_ET_TESTS.md](../emails/COMPTES_EMAIL_DEV_ET_TESTS.md)**.

Le compte Google porteur peut être ajouté sur l’émulateur pour tester la réception mail / agent email.

### Variables `.env` (racine, gitignoré)

| Variable | Rôle |
|----------|------|
| `EMAIL_GMAIL_PRO_ACCOUNT` | Adresse Gmail |
| `EMAIL_GMAIL_PRO_PASSWORD` | Mot de passe **compte** Google (écran connexion Android) |
| `EMAIL_GMAIL_PRO_PASSWORD_APPLICATION` | Mot de passe d’application Google (SMTP/IMAP — **pas** utilisé pour la connexion Android) |
| `CONFIGURE_EMULATOR_GMAIL=1` | Lance la config Gmail automatiquement après `setup-android-emulator.sh up` |

Mot de passe d’application : [Compte Google → Sécurité → Validation en 2 étapes → Mots de passe des applications](https://myaccount.google.com/apppasswords) — créer « JobbingTrack ».

### Commandes

```bash
# Prérequis : émulateur booté + contrôleur ADB (5055)
bash scripts/mobile/setup-android-emulator.sh start
cd tools/emulator-controller && ADB_FAST=1 node server.js   # autre terminal

# Configuration Gmail (lit .env via scripts/env/env-get-key.cjs)
node scripts/mobile/configure-emulator-gmail.js

# Ou via le script setup
bash scripts/mobile/setup-android-emulator.sh configure-gmail

# Vérifier sans tenter la connexion
node scripts/mobile/configure-emulator-gmail.js --check-only
```

### Limites

- La **validation 2FA** Google peut exiger une saisie manuelle sur l’émulateur (code SMS/app Authenticator).
- Le **mot de passe d’application** ne remplace pas le mot de passe compte pour « Ajouter un compte Google » dans Paramètres Android.
- Si la connexion échoue, terminez le flux sur l’émulateur puis relancez `--check-only`.

> **Distinction** : le compte Google sur l’AVD sert à **Gmail pro** (forward OVH). Ce n’est **pas** le login JobbingTrack (`TEST_USER_EMAIL` = `paul.delhomme@pm.me`). Le flux OAuth produit `/agent` (navigateur) est **optionnel** pour ces tests émulateur.

## BlueMail + boîte OVH candidatures sur l’AVD

Pour lire **`candidatures@delhomme.ovh`** (ou l’équivalent porteur) **directement en IMAP**, sans passer par le forward Gmail :

```text
candidatures@delhomme.ovh  ──forward──►  pauldelhomme.pro@gmail.com
        │                                          │
   BlueMail (IMAP OVH)                    Compte Google AVD (§ Gmail)
```

| Boîte | Client sur l’AVD | Variables `.env` |
|-------|------------------|------------------|
| Gmail pro (forward) | Compte **Google** / app Gmail | `EMAIL_GMAIL_PRO_*` |
| OVH candidatures | **BlueMail** (IMAP) | `EMAIL_TRIAGE_READ_ACCOUNT`, `TEST_EMAIL_TRIAGE_IMAP_*` |

Mot de passe OVH = mot de passe **boîte mail OVH** (pas le mot de passe d’application Google).

### Prérequis AVD

- Image émulateur avec **Google Play** (Play Store disponible).
- Émulateur booté (`setup-android-emulator.sh up` ou `start`).

### Installation BlueMail

1. Ouvrir **Play Store** sur l’émulateur.
2. Installer **BlueMail** (`com.bluemail.mail`).
3. Au premier lancement : autoriser les notifications si demandé (optionnel).

Ouverture rapide via ADB (contrôleur 5055 ou `adb -s emulator-5554`) :

```bash
adb -s emulator-5554 shell am start -n com.bluemail.mail/.activity.WelcomeActivity
# variante si échec :
adb -s emulator-5554 shell am start -a android.intent.action.MAIN -p com.bluemail.mail
```

### Configuration IMAP OVH (manuel sur l’AVD)

BlueMail → **Ajouter un compte** → **Autre (IMAP/SMTP)** :

| Champ | Valeur type porteur |
|-------|---------------------|
| Adresse | `candidatures@delhomme.ovh` (ou `EMAIL_TRIAGE_READ_ACCOUNT`) |
| Mot de passe | Mot de passe boîte OVH (`.env` : `TEST_EMAIL_TRIAGE_IMAP_PASSWORD` ou `TEST_REAL_EMAIL_IMAP_PASSWORD`) |
| Serveur entrant (IMAP) | `imap.mail.ovh.net` |
| Port IMAP | `993` |
| Chiffrement IMAP | SSL/TLS |
| Serveur sortant (SMTP) | `ssl0.ovh.net` (optionnel pour tests lecture) |
| Port SMTP | `465` (SSL) ou `587` (STARTTLS) |

Aligner les variables tests depuis le `.env` racine :

```bash
node scripts/mobile/sync-test-env.js --write
node scripts/mobile/fetch-imap-verification.js --check-only
```

### Vérification email JobbingTrack (parcours manuel)

1. Inscription ou renvoi vérif depuis l’app mobile (alias type `test+mob@delhomme.ovh` ou adresse OVH selon le test).
2. Ouvrir **BlueMail** (OVH) ou **Gmail** (forward) → mail JobbingTrack → lien de vérification.
3. Retour app → connexion avec `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`.

Smokes ADB :

```bash
export MOBILE_ADB_DEVICE=emulator-5554 ADB_FAST=1
node scripts/mobile/smoke-verify-email-adb.js
```

### Automatisation ADB (optionnel)

Le backoffice **Émulateur mobile** expose le parcours **`mobile_register_verify_bluemail`** (étape `open_bluemail`). Variables optionnelles pour remplissage auto :

```env
NEXT_PUBLIC_VERIFICATION_BLUEMAIL_EMAIL=candidatures@delhomme.ovh
NEXT_PUBLIC_VERIFICATION_BLUEMAIL_PASSWORD=<mot de passe boîte OVH — .env uniquement>
```

Sans ces clés, le parcours reste faisable **à la main** sur l’AVD.

### Limites

- BlueMail n’est **pas** requis pour le login JobbingTrack (compte **pm.me**).
- Ne pas confondre avec le produit **`/agent`** (OAuth Google côté web) — ici on teste la **réception mail sur l’appareil**.
- Credentials **porteur uniquement** — voir [COMPTES_EMAIL_DEV_ET_TESTS.md](../emails/COMPTES_EMAIL_DEV_ET_TESTS.md).

## Dépannage

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| `fetch failed` (smoke) | Contrôleur 5055 arrêté | Lancer `node tools/emulator-controller/server.js` |
| `fetch failed` | Stack arrêtée | `docker compose … up -d` + `curl 127.0.0.1:5002/health` |
| `make logs` vide | Conteneurs down | Normal après `docker compose down` — relancer la stack |
| Login KO émulateur | Écran « mot de passe oublié » | Corrigé : rebuild APK (`setup-android-emulator.sh up`) |
| `Wrong full snapshot version` | Flutter pacman Arch | `bash scripts/mobile/build-apk-debug.sh` |
| `fetch failed` (batterie) | `API_URL=api-gateway:3000` hôte | `run-smokes-fast.sh` force `127.0.0.1:5002` |
| Smokes KO émulateur seulement | Champs a11y différents Samsung | Valider sur Samsung ; voir `tests/results/.../RECAP.md` |
| BlueMail : échec IMAP OVH | Mauvais mot de passe ou host | Vérifier `imap.mail.ovh.net:993` + `fetch-imap-verification.js --check-only` |
| Play Store absent sur AVD | Image sans Google Play | Recréer AVD avec image **Play Store** (`setup-android-emulator.sh install`) |
| `POST /analytics/errors` **500** | Session mobile `sess-*` absente en BDD (FK Postgres) | Corrigé **22/06** : `ensureAnalyticsSession()` avant insert erreurs/perf. Vérifier : `node scripts/mobile/smoke-analytics-api.js` |
| Télémétrie erreurs perdue | Même cause FK + file offline | Backend upsert session ; mobile envoie déjà via `MobileAnalyticsService` + `CrashReporter` (login, CRUD, latence API) |

## Validation télémétrie (login + parcours)

Après login mobile (consentement analytics activé par défaut à l’inscription) :

```bash
# API — sessions, events, errors (dont sessionId stale)
node scripts/mobile/smoke-analytics-api.js
node scripts/mobile/smoke-analytics-test-user-sessions.js

# Vérifier absence d’erreurs FK Postgres
docker logs jobbingtrack-postgres --since 10m 2>&1 | rg "user_errors_sessionId_fkey" || echo "OK — pas de FK"
```

Le mobile remonte : **sessions** (`POST /analytics/sessions`), **événements** (navigation/écrans), **erreurs API** (status ≥ 400), **performances** (latence > 3 s), **crashes** (`POST /crashes` + `POST /analytics/errors`). Le backend crée désormais la session manquante avant toute écriture erreur/perf.

## Arrêt

```bash
bash scripts/mobile/setup-android-emulator.sh stop
docker compose -f docker-compose.yml --profile full down
```
