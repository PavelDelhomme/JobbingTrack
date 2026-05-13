# Rapports de tests – Conventions et emplacements

## Emplacements des rapports

| Type | Emplacement | Fichiers |
|------|-------------|----------|
| Tests API | `tests/results/<timestamp>/` | `api.json`, `summary.json`, `report.html` |
| Tests Sécurité agrégés | `tests/results/<timestamp>/` | `security-report.json` |
| Rapports sécurité P0 | `reports/security/<outil>-<timestamp>/` | `summary.md`, `summary.json` ou `report.html` |
| Résultats sécurité P0 | `tests/results/security/<outil>-<timestamp>/` | `summary.md`, `summary.json` ou `report.html` |
| Parcours utilisateur | `tests/user-journey-reports/` | `user-journey-<nom>-<date>_<heure>.json` |
| Suite CLI | `tests/results/<timestamp>/` | `summary.json` (category: "Suite CLI"), `report.html` |
| Playwright | `tests/results/<timestamp>/` | `playwright-report/index.html` |
| Performance | À aligner sur `tests/results/` | — |

## Accès dans le backoffice

- **Rapports de tests** : `/backoffice/test-reports` → liste tous les rapports.
- **Rapports parcours** : `/backoffice/user-journey/reports`.
- Les rapports "Suite CLI" proviennent de `make test-all` ou `./scripts/run-all-tests-with-reports.sh`.

## Détail technique

Le scanner `test-reports/all` cherche dans :
- `/app/tests/results` (volume read-only monté depuis l'hôte)
- `TESTS_RESULTS_DIR` (path `/tmp/tests/results` en écriture dans Docker)
- `USER_JOURNEY_REPORTS_DIR` (path `/tmp/tests/user-journey-reports`)
- `reports/security/**` pour les rapports sécurité locaux.
- `tests/results/security/**` pour les résultats sécurité datés.

Déduplication automatique par ID de rapport.

## Tests disponibles depuis le hub

| Catégorie | Commande CLI | Route API |
|-----------|-------------|-----------|
| API | `make test-api` | `/api/test/run-api` |
| Backend | `make test-backend` | `/api/test/run-backend` |
| Frontend | `make test-frontend` | `/api/test/run-frontend` |
| Backoffice | — | `/api/test/run-backoffice-only` |
| BDD | `make test-database` | `/api/test/run-database` |
| Sécurité | `make test-security` | `/api/test/run-security` |
| Performance | — | `/api/test/run-performance` |
| Playwright | `make test-e2e` | `/api/test/run-playwright` |
| Emails MailHog | — | `/api/test/run-playwright-mailhog` |
| Suite complète | `make test-all` | — |
