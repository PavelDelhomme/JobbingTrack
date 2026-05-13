# Audit des scripts sans reference automatique

Controle du 13/05/2026 apres `make scripts-inventory`.

Objectif : ne pas supprimer de script de depannage sans decision explicite. Les scripts ci-dessous n'etaient pas appeles par Make, la CI ou les tests detectes automatiquement. Ils sont donc classes ici pour transformer le signal `non-reference` en decision lisible.

## Decisions

| Script | Role probable | Decision | Risque si suppression immediate | Action recommandee |
| --- | --- | --- | --- | --- |
| `scripts/db/create-all-tables.sh` | Ancien push Prisma multi-services dans les conteneurs. | Legacy DB. | Moyen : peut encore servir a diagnostiquer une derive ancienne, mais il est moins sur que `make db-push-all`. | Ne pas utiliser par defaut ; remplacer par `make db-push-all`, archiver apres validation porteur. |
| `scripts/db/fix-all-tables.sh` | Variante legacy de creation tables + analytics. | Legacy DB. | Moyen : appelle `setup-analytics-tables.sh`, mais contourne le flux DB actuel. | Garder comme reference temporaire ; preferer `make db-push-all` + `make test-database`. |
| `scripts/db/init-all-tables.sh` | Initialisation complete historique avec push Prisma par conteneur. | Legacy DB. | Moyen/eleve : execute des `prisma db push --accept-data-loss` multiples. | Ne pas raccorder a Make ; archiver si aucun usage manuel confirme. |
| `scripts/db/generate-24h-test-data.sh` | Injection manuelle de donnees CPU/system metrics de test. | Manuel/documente. | Faible : utile pour QA de graphes historiques. | Garder hors Make ; executer seulement sur base dev avec stack lancee. |
| `scripts/docker/verify-docker-setup.sh` | Diagnostic local Docker, Prisma, reseaux, conteneurs et ports. | Manuel/documente. | Faible/moyen : utile en support local quand `make up-full` echoue. | Garder comme diagnostic manuel ; ne pas l'inclure dans la CI. |
| `scripts/monitoring/check_integration.sh` | Verification d'une ancienne integration `monitoring.sh` et docs monitoring. | Legacy monitoring. | Faible : les commandes `make mon*` couvrent deja le chemin actif. | Archiver apres verification de `make mon`, `make diagnostic-metrics` et docs monitoring. |
| `scripts/monitoring/clean-monitoring.sh` | Nettoyage destructif d'anciens conteneurs monitoring. | Legacy dangereux. | Moyen : peut depanner des conteneurs anciens, mais supprime conteneurs/reseaux. | Garder non raccorde ; exiger lecture manuelle avant execution. |
| `scripts/monitoring/pause-monitoring.sh` | Pause ponctuelle de `monitoring-c`. | Manuel/documente. | Faible : utile pendant mesures ressources ou pause collecte. | Garder comme outil manuel legacy C tant que `monitoring-c` reste fallback. |
| `scripts/monitoring/resume-monitoring.sh` | Reprise ponctuelle de `monitoring-c`. | Manuel/documente. | Faible : complement de `pause-monitoring.sh`. | Garder comme outil manuel legacy C tant que `monitoring-c` reste fallback. |
| `scripts/monitoring/restart-metrics.sh` | Redemarrage ancien metrics-aggregator via compose. | Legacy monitoring. | Faible : remplace par `make restart-service SERVICE=metrics-aggregator` ou recreate cible. | Archiver ; ne pas utiliser sans mise a jour des noms de services. |
| `scripts/monitoring/start-metrics.sh` | Construction/demarrage manuel historique du metrics-aggregator. | Legacy a archiver. | Faible : ports et noms anciens, script fragile. | Ne pas executer ; preferer `make up-full`, `make restart-metrics-recreate` ou cibles service. |
| `scripts/monitoring/test-metrics.sh` | Tests d'anciens endpoints metrics sur `localhost:3014`. | Legacy tests. | Faible : couvert par `tests/services/test-metrics-aggregator.js`. | Remplacer par le smoke service actuel avant suppression. |
| `scripts/testing/run-complete-tests.sh` | Ancien orchestrateur E2E Playwright/backend. | Legacy tests. | Faible/moyen : flux remplace par `scripts/run-all-tests-with-reports.sh`. | Ne pas raccorder ; supprimer apres confirmation qu'aucun scenario unique n'y reste. |
| `scripts/testing/test-containers-access.sh` | Diagnostic manuel des acces conteneurs vers Postgres et reseau. | Manuel/documente. | Moyen : utile pour diagnostiquer les erreurs Docker/DB. | Garder manuel ; ne pas afficher de secrets en clair si script repris plus tard. |
| `scripts/testing/test-reset-password.sh` | Test manuel reset password + MailHog/SMTP. | Manuel/documente. | Moyen : utile pour QA mail. | Modernise le 13/05 : defaut gateway `API_GATEWAY_URL`/`API_GATEWAY_PORT`, metrics `METRICS_URL`/`METRICS_API_KEY` optionnelle ; garder non raccorde a Make. |
| `scripts/testing/verify-all-metrics.sh` | Verification large de metrics/services/historique. | Manuel/documente. | Moyen : utile pour QA A5 ; doit rester lance manuellement sur stack dev active. | Modernise le 13/05 : ports actuels `METRICS_URL`/`API_GATEWAY_URL`, `METRICS_API_KEY` optionnelle, contrats JSON actuels ; validation reelle **52/52**. |
| `scripts/utils/debug-tables.sh` | Debug direct des tables Postgres. | Legacy DB debug. | Faible : remplace par `make test-database` et requetes SQL ciblees. | Archiver apres migration des notes de depannage utiles. |
| `scripts/utils/rebuild-all.sh` | Rebuild Docker complet no-cache. | Manuel dangereux. | Moyen : utile en dernier recours, mais couteux/destructif pour images. | Garder non raccorde ; documenter comme operation manuelle explicite. |
| `scripts/utils/test-check-tables.sh` | Debug de detection de tables Prisma. | Legacy DB debug. | Faible : remplace par tests DB actuels. | Archiver avec `debug-tables.sh`. |
| `scripts/utils/test-table-check.sh` | Debug minimal de connexion/tables Postgres. | Legacy DB debug. | Faible : remplace par `make test-database`. | Archiver avec `debug-tables.sh`. |
| `scripts/utils/translate-french-to-english.sh` | Remplacements `sed` de textes FR -> EN dans le code. | Legacy dangereux. | Faible si supprime, mais risque eleve si execute sans revue. | Ne pas executer ; archiver ou supprimer apres validation explicite. |

## Suite

1. Garder les scripts `manuel/documente` en l'etat tant qu'ils rendent un service de diagnostic ponctuel.
2. Ne raccorder aucun script legacy a Make sans modernisation et test reel.
3. Pour le prochain lot, deplacer les scripts `legacy` dans un dossier d'archive ou les supprimer un par un apres validation explicite.
4. `verify-all-metrics.sh` est modernise ; le prochain lot peut se concentrer sur l'archivage progressif des scripts `legacy` restant classes dans ce tableau.
