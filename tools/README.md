# Outils développement (`tools/`)

Dossier **non déployé comme microservice** : bibliothèques et utilitaires pour tests / émulateur.

| Sous-dossier | Rôle | Doc |
|--------------|------|-----|
| **`adb-lib/`** | Client Node, actions, flows, scénarios ADB (parcours mobile, journey-builder) | Voir `adb-lib/index.js` (JSDoc) ; **`STATUS.md`** § ADB ; **`tests/user-journey/README.md`** |
| **`emulator-controller/`** | Serveur Node (build APK, install, tap, screenshots) ; souvent lancé avec **`make up-full`** | **`emulator-controller/README.md`** |

Les scripts **`scripts/playwright-mobile-e2e.sh`** et la doc **`docs/getting-started/GUIDE_STRUCTURE.md`** peuvent aussi référencer ces chemins.
