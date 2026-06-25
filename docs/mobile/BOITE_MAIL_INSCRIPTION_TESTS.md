# Boîtes mail — inscription mobile vs agent email

Dernière mise à jour : 17 juin 2026

## Erreur fréquente

**`candidatures@delhomme.ovh` ne reçoit pas les mails d'inscription.**

Cette boîte sert à l’**agent email** (lecture IMAP des candidatures reçues sur cette adresse, triage, digest). Les mails de **vérification d'inscription** partent vers **l'adresse saisie dans le formulaire** mobile — rien à voir avec `candidatures@` sauf si tu t'inscris explicitement avec cette adresse (interdit pour les tests).

---

## Où vont les mails d'inscription ?

| Étape | Comportement |
|-------|----------------|
| Tu saisis `mon-alias@delhomme.ovh` sur le Samsung | Le serveur envoie **à cette adresse exacte** (SMTP réel, voir `EmailLog`) |
| Smokes API | Alias `test+mob{timestamp}@delhomme.ovh` depuis `TEST_REAL_EMAIL` dans `.env` |
| Smokes ADB `@example.com` | **Aucune boîte réelle** — test UI seulement ; `EmailLog` peut être FAILED |

Chaîne documentée agent ( **≠ inscription** ) :

```text
candidatures@delhomme.ovh  ──forward──►  pauldelhomme.pro@gmail.com
        └── IMAP agent email uniquement
```

Inscription ( **≠ agent** ) :

```text
TEST_REAL_EMAIL (ex. test@delhomme.ovh)
        └── alias test+mob…@delhomme.ovh  ──►  boîte OVH test@…  (plus-addressing)
        └── ou adresse saisie au clavier  ──►  ta boîte Proton / Gmail / OVH
```

---

## Boîte recommandée pour l'étape 1 porteur (Samsung)

Objectif : **même expérience qu'un utilisateur** + pouvoir relire le mail plusieurs fois.

| Critère | Recommandation |
|---------|----------------|
| Adresse à saisir sur le téléphone | Alias **neuf** sur ton domaine OVH, ex. `test+porteur20260617@delhomme.ovh` |
| Base `.env` smokes | `TEST_REAL_EMAIL=test@delhomme.ovh` (ou `dev@delhomme.ovh` si c'est ta base) |
| Où lire le mail | **Webmail / IMAP de `test@delhomme.ovh`** (les `+alias` arrivent sur la boîte de base) **ou** Gmail pro si forward global du domaine |
| Ne pas utiliser | `candidatures@…` pour vérifier l'inscription ; `@example.com` pour un test mail réel |
| Compte déjà utilisé | `paul.delhomme@pm.me` = `TEST_USER` — ne pas réinscrire ; créer un **alias neuf** |

Alternative valide : inscription avec une adresse **Proton** que tu consultes (`test+…@pm.me` si plus-addressing Proton activé).

---

## Vérifications agent (stack locale)

```bash
# Diagnostic sans afficher les secrets
node scripts/mobile/setup/diagnose-registration-email.js

# Derniers envois serveur (preuve SMTP)
node scripts/ops/list-email-logs.cjs | head -15

# Smoke API (alias test+mob…@delhomme.ovh, token BDD)
node scripts/mobile/smoke/api/smoke-resend-verification-api.js
```

Si `EmailLog` = **SENT** vers `test+mob…@delhomme.ovh` mais rien dans la boîte :

1. Ouvrir la boîte **`test@delhomme.ovh`** (pas `candidatures@`).
2. Vérifier spam / filtres OVH.
3. Vérifier que le forward domaine n'exclut pas les alias `+`.
4. En dernier recours : lire le token via backoffice Email Monitor ou `extract-verification-token.js` (preuve technique, pas validation porteur seule).

---

## Smoke ADB « Refuse / Telemetry »

Le smoke `smoke-register-telemetry-refuse-adb.js` remplit **Prénom = Test**, **Nom = RefuseTel** (anciennement « Refuse » / « Telemetry » — prénom/nom de test, pas un blocage produit). Il utilise `@example.com` **volontairement** : on teste seulement le **blocage si télémétrie décochée**, pas la réception mail.

---

## Liens

- [`VALIDATION_ETAPE_1_INSCRIPTION.md`](VALIDATION_ETAPE_1_INSCRIPTION.md) — procédure porteur Samsung
- [`INSCRIPTION_VERIFICATION_EMAIL.md`](INSCRIPTION_VERIFICATION_EMAIL.md) — parcours technique
- [`../emails/COMPTES_EMAIL_DEV_ET_TESTS.md`](../emails/COMPTES_EMAIL_DEV_ET_TESTS.md) — politique comptes porteur
