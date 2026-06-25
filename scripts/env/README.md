# Scripts Env

Toute la configuration runtime **`.env`** vit ici. Il n’y a plus de wrappers à la racine de `scripts/` (supprimés 17/06/2026) : Make et la doc pointent directement vers ce dossier.

## Entrées

- `env-align-with-example.cjs` : compare `.env` et `.env.example`.
- `env-generate-secrets.cjs` : régénère des secrets locaux forts sans les afficher ; avec `--with-postgres`, régénère `POSTGRES_PASSWORD` et réécrit **`DATABASE_URL` pour l’hôte** (`POSTGRES_CLIENT_HOST` / `localhost` + `POSTGRES_PORT`), sans modifier l’URL `postgres:5432` injectée par Compose dans les conteneurs.
- `env-get-key.cjs` : lit une clé `.env` sans l’afficher dans les logs (utilisé par `configure-emulator-gmail.js`, `setup-android-emulator.sh`).
- `env-set-key.cjs` : modifie une clé `.env`; les clés sensibles doivent passer via `--stdin`.
- `env-validate-runtime.cjs` : valide `.env`, `.env.production.example` ou `ENV_FILE=...`; en mode production, refuse aussi MailHog/localhost comme transport SMTP final (`SMTP_HOST`, `NOTIFICATION_SMTP_HOST`, miroir alertes).
- `dev-test-bypass-fetch.cjs` : résout `DEV_TEST_BYPASS_TOKEN` au format attendu et expose `devTestBypassFetchHeaders()` pour les scripts Node (tests, curl via `node`).
- `dev-test-bypass-curl.inc.sh` : à sourcer depuis les scripts shell après `REPO_ROOT` ; remplit `jt_dev_bypass_curl_args` pour `curl` (en-tête `X-JobbingTrack-Dev-Test-Token`). Même règles que `config/dev-test-bypass-format.cjs`.
- `generate-env-example.sh` : wrapper déprécié, conservé pour expliquer la source de vérité `.env.example`.
- `reorder-env-from-example.cjs` : réaligne `.env` sur `.env.example`.
- `sync-env.js` : ancien synchroniseur interactif `.env.example` → `.env`, gardé pour compatibilité manuelle.
- `verify-env-usage.js` : audit manuel des variables `.env.example` référencées dans le dépôt.

## Commandes

```bash
make env-check
make env-validate
make env-validate-prod-example
ENV_FILE=.env.production make env-validate-prod
make waf-enable
make waf-disable
make waf-status
```
