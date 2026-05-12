# Scripts Rapports

Scripts de consultation, génération et nettoyage des rapports de tests/performance.

## Entrées

- `show-mobile-report.sh` : ouvre ou rapatrie le rapport Playwright mobile.
- `compress-old-reports.sh` : archive les anciens rapports dans `tests/archived/`.
- `clean-empty-reports.sh` : supprime les rapports vides ou manifestement invalides.
- `clean-all-reports-docker.sh` : nettoie les rapports dans le conteneur frontend quand les permissions locales bloquent.

Les anciens chemins racine ne sont plus les points d'entrée supportés pour ces scripts.
