# Scripts legacy — archives

Scripts déplacés ici **sans suppression** : correctifs ponctuels, migrations one-shot, campagnes de validation passées, rapports HTML figés.

**Ne pas raccorder à Make** sans modernisation. Les chemins historiques dans `docs/pilotage/` restent des preuves d’archive.

## Contenu

| Dossier | Origine | Usage |
|---------|---------|--------|
| `fixes/` | `scripts/fixes/` | Correctifs Docker/routes email (2024–2025) |
| `utils/` | `scripts/utils/debug-*`, `test-*table*` | Debug Postgres Prisma |
| `database/` | `scripts/database/migration-phase*.js` | Migration schéma one-shot (voir `docs/database/migration/`) |
| `ops/campaigns/` | `scripts/ops/run-*-validation-with-report.sh` | Campagnes P1B/P1C Statistics (juin 2026) |
| `ops/reports/` | `scripts/ops/recap-*.html` | Récap HTML agent mobile (juin 2026) |

## Actif conservé hors legacy

- `scripts/database/seed-statuses.js` — CI + workflows (ne pas archiver).

## Exécution campagne archivée

```bash
bash scripts/legacy/ops/campaigns/run-statistics-log-stats-validation-with-report.sh
```
