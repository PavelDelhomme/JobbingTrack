# Inscription mobile — télémétrie obligatoire et vérification email

Dernière mise à jour : 19 juin 2026

## Parcours inscription

1. Écran **Inscription** (`register_screen.dart`)
2. Cases obligatoires :
   - **Conditions d'utilisation** (`_acceptTerms`)
   - **Télémétrie anonyme** (`_acceptTelemetry`, cochée par défaut) — le refus bloque la création
3. Après succès → `PendingVerificationScreen` (« Vérifiez votre email »)
4. Pas de session JWT tant que l'email n'est pas vérifié

## Vérification email

| Méthode | Détail |
|---------|--------|
| Deep link | `jobbingtrack://verify-email?token=…` → « Email vérifié » → login |
| Mail dev | MailHog / `EmailLog` — token via `scripts/mobile/extract-verification-token.js` |

## Variables `.env` (smokes)

| Variable | Usage |
|----------|--------|
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | Compte courant mobile |
| `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` | Login admin rapide |

## Smokes ADB

```bash
node scripts/mobile/smoke-register-adb.js
node scripts/mobile/smoke-verify-email-adb.js
```

Prérequis : stack up, `adb reverse tcp:5002 tcp:5002`, Samsung connecté.

Flows : `tools/adb-lib/flows.js` — `register()` laisse la télémétrie cochée (défaut UI).

## Validation porteur

`TODOS_A_VALIDER.md` ligne **317**.
