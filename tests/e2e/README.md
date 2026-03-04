# Tests E2E (Playwright) – JobbingTrack

## Structure

- **`specs/`** – Specs par domaine
  - **`email-workflows.spec.ts`** – Workflows email complets (inscription, vérification, reset password, MailHog + emails réels).
  - **`specs/mobile/`** – Specs dédiés au flux mobile (vérification email par fournisseur)
    - **`mobile-email-verification-gmail.spec.ts`** – Inscription + vérif email (Gmail) via API.
    - **`mobile-email-verification-proton.spec.ts`** – Idem pour Proton.
    - **`mobile-email-verification-bluemail.spec.ts`** – Idem pour BlueMail/OVH.
  - **`admin-*.spec.ts`** – Backoffice, CRUD, sécurité, analytics, etc.
  - **`login.spec.ts`**, **`user-journeys.spec.ts`**, **`complete-user-journey.spec.ts`** – Auth et parcours.
- **`utils/`** – Helpers (mailhog, test-helpers).
- **`fixtures/`** – Données et fixtures Playwright.
- **`playwright.config.ts`** – Config principale.
- **`playwright.mailhog.config.ts`** – Config avec MailHog.

## Lancer les tests

Depuis la racine du projet ou depuis `tests/` :

```bash
# Tous les specs E2E (config par défaut)
cd tests && npx playwright test e2e/specs --project=chromium

# Workflows email (MailHog ou TEST_REAL_EMAILS)
cd tests && npx playwright test e2e/specs/email-workflows.spec.ts --project=chromium

# Spec mobile Gmail uniquement (email réel)
cd tests && TEST_REAL_EMAILS=redacted@example.invalid npx playwright test e2e/specs/mobile/mobile-email-verification-gmail.spec.ts --project=chromium

# Spec mobile Proton
cd tests && TEST_REAL_EMAILS=redacted@example.invalid npx playwright test e2e/specs/mobile/mobile-email-verification-proton.spec.ts --project=chromium

# Spec mobile BlueMail
cd tests && TEST_REAL_EMAILS=candidatures@example.invalid npx playwright test e2e/specs/mobile/mobile-email-verification-bluemail.spec.ts --project=chromium
```

## Prérequis

- Stack démarrée : `make up-full`
- Pour emails réels : SMTP configuré (ex. OVH), `TEST_REAL_EMAILS` ou `TEST_REAL_EMAIL` selon le spec.
- Table `EmailLog` et route `/api/v1/emails/logs` (admin) pour la vérification via API.

## Frontend vs tests/

- Les specs dans **`frontend/tests/e2e/`** sont les tests Playwright du front Next.js (config frontend).
- Les specs dans **`tests/e2e/specs/`** sont les tests E2E “backend / API + mail” (config dans `tests/`).
- Les specs **mobile** dans `tests/e2e/specs/mobile/` valident le flux inscription + vérification email (API + EmailLog) pour Gmail, Proton et BlueMail, en vue du parcours sur appareil (backoffice → émulateur mobile).
