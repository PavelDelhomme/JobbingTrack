# Security Reports

Ce dossier reçoit les rapports locaux générés par les commandes `make security-*`.

Les rapports datés sont ignorés par Git pour éviter de versionner des résultats variables, des chemins locaux ou des extraits sensibles. Seul ce fichier d’explication reste suivi.

Les routes backoffice `frontend/src/app/api/test-reports/*` scannent les sous-dossiers datés contenant `summary.md`, `summary.json` ou `report.html`. Après génération ou récupération d'artefacts CI, les rapports doivent donc rester sous la forme :

- `reports/security/<outil>-<timestamp>/summary.md`
- `reports/security/<outil>-<timestamp>/summary.json`
- `reports/security/<outil>-<timestamp>/report.html`
