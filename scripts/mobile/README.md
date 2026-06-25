# Scripts mobile — index

Organisation par rôle. Les **raccourcis à la racine** (`smoke-preflight.js`, etc.) redirigent vers les dossiers ci-dessous.

## Raccourcis racine (wrappers)

| Raccourci | Canonique |
|-----------|-----------|
| `ensure-test-accounts-ready.js` | `setup/ensure-test-accounts-ready.js` |
| `prepare-smoke-device-adb.js` | `setup/prepare-smoke-device-adb.js` |
| `clear-smoke-device-adb.js` | `setup/clear-smoke-device-adb.js` |
| `sync-test-env.js` | `setup/sync-test-env.js` |
| `smoke-preflight.js` | `smoke/run/smoke-preflight.js` |
| `smoke-run-mobile-fast.js` | `smoke/run/smoke-run-mobile-fast.js` |
| `smoke-run-mobile-validation.js` | `smoke/run/smoke-run-mobile-validation.js` |

## Structure

| Dossier | Contenu |
|---------|---------|
| `lib/` | Modules partagés (credentials `.env`, helpers ADB, cible candidature smoke) |
| `setup/` | Préparation appareil/émulateur, comptes test, build APK, sync `.env` |
| `email/` | Récupération tokens vérif/reset (IMAP, EmailLog, extracteurs) |
| `smoke/run/` | Orchestration : pré-vol, verrou ADB, batteries rapide/complète |
| `smoke/api/` | Smokes HTTP sans appareil |
| `smoke/adb/` | Smokes UI via ADB |
| `smoke/utils/` | Utilitaires smoke (presse-papier mot de passe, etc.) |
| `test/` | Scripts de test hors smoke |

## Commandes courantes

```bash
# Comptes TEST_USER + TEST_ADMIN prêts
node scripts/mobile/ensure-test-accounts-ready.js

# Pré-vol (gateway, verrou, session smoke)
node scripts/mobile/smoke-preflight.js

# Batterie rapide Lot D (~8–15 min) — restaure la biométrie produit en fin
node scripts/mobile/smoke-run-mobile-fast.js

# Batterie complète
node scripts/mobile/smoke/run/smoke-run-mobile-validation.js

# Hub admin ADB
ADB_FAST=1 node scripts/mobile/smoke/adb/smoke-mobile-admin-hub-adb.js

# Restaurer empreinte / déverrouillage après smokes (hors mode test ADB)
node scripts/mobile/clear-smoke-device-adb.js
```

## Biométrie vs smokes

- Les smokes activent **`test_automation_skip_biometric`** (debug APK uniquement) pour éviter le prompt Samsung.
- **Hors smokes**, la connexion empreinte et le déverrouillage biométrique restent opérationnels si activés dans Paramètres.
- Les batteries `smoke-run-mobile-*` et `clear-smoke-device-adb.js` remettent `test_automation_skip_biometric=false` à la fin.
- Ne pas laisser `prepare-smoke-device-adb.js` actif en usage porteur : lancer `clear-smoke-device-adb.js` après tests.

## Makefile (cibles principales)

Voir `makefiles/mobile/Makefile` — chemins mis à jour vers `setup/` et `smoke/`.
