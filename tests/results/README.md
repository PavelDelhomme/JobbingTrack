# Résultats de campagnes de tests

Artefacts générés par `scripts/run-all-tests-with-reports.sh` et scripts Statistics.

- Les dossiers `YYYYMMDD-HHMMSS/` sont **locaux** (gitignored).
- Nettoyage : `bash scripts/reports/prune-test-results.sh --apply --keep-days 14`
- Compression optionnelle : `--compress-keep 3`

Ne pas committer les rapports datés.
