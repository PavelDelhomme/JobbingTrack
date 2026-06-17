# Audit mobile — Auth + parcours candidatures

Dernière mise à jour : 17 juin 2026  
Branche : `feat/mobile-auth-applications-audit`

## Synthèse

| Zone | État avant audit | Correctif |
|------|------------------|-----------|
| `ApplicationProvider.loadApplications()` | Appels API **sans JWT** → 401 / liste vide | Propagation `token` sur toutes les méthodes CRUD |
| Écrans candidatures / home | Récupéraient `auth.token` mais ne le passaient pas au provider | `loadApplications(token: auth.token)` |
| Session cold start | Toujours `/login` après splash | Persistance token + user dans `ApiConfigStore`, `AuthProvider.restoreSession()` |
| Formulaire candidature | `createApplicationFromPayload` OK avec token ; reload liste sans token | Reload avec token |
| Auth login | OK (`/api/v1/auth/login`) | Persistance session après login |
| Sécurité B9 | `postSecurityEvent`, `onSessionRevoked`, headers corrélation | Inchangé — conforme |

## Parcours candidatures (flux attendu)

1. Splash → `autoDetectApi()` → `restoreSession()` → `/home` ou `/login`
2. Login → JWT + profil persistés
3. Home / Candidatures → `GET /api/v1/applications` avec `Authorization: Bearer`
4. Nouvelle candidature → `POST /api/v1/applications` (payload complet via `application_form_screen`)
5. Détail → relances / entretiens / appels (déjà tokenisés)

## API gateway

- Base URL dev : `http://127.0.0.1:5002` (adb reverse) ou `10.0.2.2:5002` (émulateur)
- Health : `GET /health`
- Auth : `POST /api/v1/auth/login`
- Candidatures : `GET|POST|PUT|DELETE /api/v1/applications`

## Validation technique

```bash
# Flutter système Arch peut être cassé (dart 3.12 vs snapshot) — utiliser :
export PATH="$HOME/flutter-sdk/bin:$PATH"

# Appareil physique (Samsung, etc.)
bash scripts/mobile/setup-physical-device.sh

# API mobile authentifiée (stack locale)
node tests/performance/test-mobile-api-authenticated.js

# Smoke UI login sur appareil ADB
node scripts/mobile/smoke-login-adb.js

# Scénarios ADB (candidatures, navigation)
node tools/adb-lib/examples/run-scenario.js
```

## Dettes restantes (hors ce lot)

- Refresh token / expiration JWT gérée proactivement
- Tests widget `ApplicationProvider` avec mock HTTP
- Parcours BDD bout-en-bout documenté (create → Postgres → list)
- Analytics utilisateur mobile (Lot D4/D5)
- Déploiement build release (APK/AAB)
