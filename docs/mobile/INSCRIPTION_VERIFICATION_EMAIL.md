# Inscription mobile — télémétrie obligatoire et vérification email

Dernière mise à jour : 25 juin 2026

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
| `TEST_REAL_EMAIL` | Base alias smokes API (`test+mob…@domaine`) — **boîte à lire** = adresse de base (ex. `test@delhomme.ovh`) |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | Compte courant mobile |
| `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` | Login admin rapide |
| `EMAIL_TRIAGE_READ_ACCOUNT` | **Agent email uniquement** — ne reçoit **pas** les vérifs inscription sauf si tu t'inscris avec cette adresse |

**Boîtes mail** : voir [`BOITE_MAIL_INSCRIPTION_TESTS.md`](BOITE_MAIL_INSCRIPTION_TESTS.md) — `candidatures@…` ≠ inbox inscription.

Diagnostic :

```bash
node scripts/mobile/setup/diagnose-registration-email.js
```

## Smokes ADB

```bash
node scripts/mobile/smoke-register-adb.js
node scripts/mobile/smoke-verify-email-adb.js
node scripts/mobile/smoke-resend-verification-api.js
```

Prérequis : stack up, `adb reverse tcp:5002 tcp:5002`, Samsung connecté.

Flows : `tools/adb-lib/flows.js` — `register()` laisse la télémétrie cochée (défaut UI).

## Validation porteur (ligne 319 — étape 1 / 5)

**Guide pas à pas porteur** : [`VALIDATION_ETAPE_1_INSCRIPTION.md`](VALIDATION_ETAPE_1_INSCRIPTION.md)

Checklist résumée sur **Samsung** (`adb reverse tcp:5002 tcp:5002` si besoin) :

1. **Refus télémétrie** : Inscription → décocher « Partager des données anonymes » → **S'inscrire** → snackbar rouge, pas de compte créé.
2. **Inscription OK** : recocher télémétrie + conditions → email test `@delhomme.ovh` → écran **Vérifiez votre email**.
3. **Renvoi** : bouton **Renvoyer l'email de vérification** → message vert « Un nouvel email… ».
4. **Deep link** : ouvrir le lien du mail (ou `adb shell am start -a android.intent.action.VIEW -d "jobbingtrack://verify-email?token=…"`) → **Email vérifié** → Connexion.
5. Réponse porteur : `OK Mobile — Inscription + télémétrie obligatoire + vérif email` ou `KO` + détail (voir guide étape 1).

Smokes agent (déjà OK 25/06) :

```bash
node scripts/mobile/smoke-resend-verification-api.js
node scripts/mobile/smoke-auth-password-flows-e2e.js --skip-adb
node scripts/mobile/smoke-register-adb.js
```
