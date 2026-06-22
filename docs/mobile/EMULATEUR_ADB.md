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


```bash
bash scripts/mobile/setup-android-emulator.sh stop
docker compose -f docker-compose.yml --profile full down
```
