# Compatibilité plateformes — impact déploiement (cadrage)

**Statut** : cadrage pré-prod — **système d’alerte automatique non implémenté** (stack VPS/Portainer pas encore en place).

## Objectif

Avant chaque release large (mobile, backend, infra, desktop), détecter et documenter les changements qui impactent :

| Plateforme | Exemples de risque |
|------------|-------------------|
| Android | API min/target, permissions, ADB, Play Store |
| iOS | Xcode, signatures, App Store |
| Linux | Arch/pacman Flutter, Docker, glibc |
| Windows | WSL, Docker Desktop, scripts bash |
| Web / backoffice | Next.js, navigateurs, CSP |
| Serveur | Portainer, NPM, TLS, Redis/Postgres |

## Gate prévu (après D8 + hub tests)

1. **Matrice manuelle** : `docs/security/SECURITY_RELEASE_IMPACT_REPORT.template.md` rempli par release.
2. **Android multi-API** : [`STRATEGIE_COMPATIBILITE_ANDROID.md`](STRATEGIE_COMPATIBILITE_ANDROID.md) — **après étapes mobile 1→5**, pas avant étape 2.
3. **Script diff** (backlog) : comparer `pubspec.yaml`, `package.json`, Compose, Prisma migrations, `.env.example`.
4. **CI** (backlog) : job `release-impact-check` sur PR vers `main` / tag semver.
5. **Alerte porteur** : entrée obligatoire dans `A_VALIDER_AVANT_PRODUCTION.md` avant préprod.

## Commandes dev mobile liées

```bash
bash scripts/mobile/build-apk-debug.sh          # Flutter Arch-safe
bash scripts/mobile/sync-app-data-adb.sh        # prefs app USB → émulateur
bash scripts/mobile/setup-android-emulator.sh up
```

## Références

- `docs/mobile/CLONE_APPAREIL.md` — limites clone Samsung
- `docs/mobile/EMULATEUR_ADB.md` — workflow émulateur
- `A_VALIDER_AVANT_PRODUCTION.md` — checklist étape par étape pré-prod
- `docs/BACKLOG.md` § « Matrice impact release »
