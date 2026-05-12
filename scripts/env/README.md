# Scripts Env

Les implémentations de configuration runtime vivent ici. Les anciens chemins à la racine de `scripts/` restent comme wrappers temporaires pour ne pas casser les commandes externes.

## Entrées

- `env-align-with-example.cjs` : compare `.env` et `.env.example`.
- `env-generate-secrets.cjs` : régénère des secrets locaux forts sans les afficher.
- `env-set-key.cjs` : modifie une clé `.env`; les clés sensibles doivent passer via `--stdin`.
- `env-validate-runtime.cjs` : valide `.env`, `.env.production.example` ou `ENV_FILE=...`.
- `reorder-env-from-example.cjs` : réaligne `.env` sur `.env.example`.

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
