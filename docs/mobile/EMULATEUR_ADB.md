# Émulateur Android + smokes ADB (sans USB)

Guide rapide pour remplacer le Samsung USB par l’AVD local.

## Prérequis

- Stack JobbingTrack **démarrée** (gateway `127.0.0.1:5002`).
- Flutter SDK (`~/flutter-sdk/bin/flutter` ou `flutter` dans le PATH).
- Contrôleur ADB : `tools/emulator-controller` sur le port **5055**.

## Commandes essentielles

| Étape | Commande |
|--------|----------|
| 1. SDK + AVD (une fois, ~1–4 Go) | `bash scripts/mobile/setup-android-emulator.sh install` |
| 2. Tout-en-un (émulateur + reverse + APK) | `bash scripts/mobile/setup-android-emulator.sh up` |
| 3. Stack Docker (sans `make`) | `docker compose -f docker-compose.yml --profile full up -d` |
| 4. Contrôleur ADB | `ADB_FAST=1 node tools/emulator-controller/server.js` |
| 5. Variables session | `export MOBILE_ADB_DEVICE=emulator-5554 ADB_FAST=1` |
| 6. Smoke login | `node scripts/mobile/smoke-login-user-password-adb.js` |

> **`install` seul** ne démarre pas l’émulateur ni n’installe l’APK — enchaîner avec `up` ou `start` + `reverse`.

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
bash scripts/mobile/run-smokes-fast.sh   # batterie rapide
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
| APK absent | Pas de build | `cd mobile && flutter build apk --debug` puis `setup-android-emulator.sh reverse` |

## Arrêt propre

```bash
bash scripts/mobile/setup-android-emulator.sh stop
docker compose -f docker-compose.yml --profile full down
```
