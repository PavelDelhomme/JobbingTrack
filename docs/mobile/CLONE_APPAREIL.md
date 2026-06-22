# Clone appareil — ce qui est possible (et ce qui ne l’est pas)

## Réponse courte

**Non**, l’émulateur AVD **n’est pas** une copie conforme de ton Samsung Galaxy (`R5CT…`).  
C’est un **Android AOSP / Google APIs** (API 34), sans One UI, sans apps Samsung, sans comptes Google du téléphone.

Ce qu’on peut faire **au niveau JobbingTrack** :

| Objectif | Faisable | Commande |
|----------|----------|----------|
| Même APK + session/prefs JobbingTrack | Oui (debug) | `sync-app-data-adb.sh` |
| Langue système approximative | Partiel | `sync-app-data-adb.sh --locale` |
| Comptes Google / Samsung sur l’émulateur | Non (reconnexion manuelle) | — |
| Toutes les apps + données du téléphone | Non sans root + image custom | — |
| Copie exacte One UI / firmware Samsung | Non sur AVD standard | Smart Switch PC→PC seulement |

## Workflow recommandé (Samsung USB → émulateur)

```bash
# 1. Stack + émulateur (voir EMULATEUR_ADB.md)
docker compose -f docker-compose.yml --profile full up -d
bash scripts/mobile/setup-android-emulator.sh up

# 2. APK debug (Flutter pacman Arch → utiliser le wrapper)
bash scripts/mobile/build-apk-debug.sh
adb -s R5CT7263YJL install -r mobile/build/app/outputs/flutter-apk/app-debug.apk
adb -s emulator-5554 install -r mobile/build/app/outputs/flutter-apk/app-debug.apk

# 3. Copier données JobbingTrack Samsung → émulateur
export MOBILE_ADB_SOURCE=R5CT7263YJL MOBILE_ADB_DEVICE=emulator-5554
bash scripts/mobile/sync-app-data-adb.sh --locale
```

> Remplace `R5CT7263YJL` par ton ID (`adb devices`).

## Root sur émulateur (usage avancé lab)

Le root AVD sert au **lab / debug système**, pas au clone Samsung.

```bash
EMULATOR_WRITABLE_SYSTEM=1 bash scripts/mobile/setup-android-emulator.sh start
adb -s emulator-5554 root
adb -s emulator-5554 remount
```

Limites : image `google_apis` x86_64 uniquement ; Play Store image non rootable facilement ; **ne pas** compter dessus pour prod.

## Autres Android (rétro / upgrade)

| Besoin | Approche |
|--------|----------|
| API plus basse (28, 30…) | Créer un second AVD `JobbingTrack_API30` (script à étendre) |
| API plus haute | Changer `API_LEVEL` dans `setup-android-emulator.sh` |
| Appareil physique autre marque | `setup-physical-device.sh` + `MOBILE_ADB_DEVICE=…` |
| Matrice large gamme | Voir `docs/mobile/COMPATIBILITE_PLATEFORMES.md` (gate pré-prod) |

## Contrôleur ADB (port 5055) et production VPS

Le contrôleur `tools/emulator-controller/server.js` est **outil dev local** :

- Écoute **`127.0.0.1`** par défaut (pas exposé Internet).
- **Ne pas** le déployer derrière Portainer/NPM en production.
- Sur VPS : tests mobile = pipeline CI + appareils cloud (Firebase Test Lab, etc.) — à cadrer en phase pré-prod.

Variable : `EMULATOR_CONTROLLER_HOST=127.0.0.1` (défaut).
