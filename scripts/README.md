# Scripts JobbingTrack

Ce dossier contient les scripts d'exploitation, de diagnostic, de tests et de maintenance du dépôt.

Règle simple : les nouveaux scripts vont dans un sous-dossier métier. À la racine de `scripts/` : **`README.md`**, **`run-all-tests-with-reports.sh`** (orchestrateur multi-domaines), et les **raccourcis CLI** sous `scripts/mobile/*.js` (voir [`mobile/README.md`](mobile/README.md)). Tout le reste — dont **`.env`** — vit dans un sous-dossier.

## Arborescence

```text
scripts/
├── core/          # Points d'entrée généraux et compatibilité Make
├── ci/            # Helpers CI (Docker Node, checks pipeline)
├── database/      # Scripts Node de migration/seed historiques
├── db/            # Scripts shell PostgreSQL / Prisma / métriques DB
├── docker/        # Vérifications et nettoyage Docker
├── legacy/          # Archives (fixes, debug DB, campagnes ops, migrations one-shot)
├── env/           # .env uniquement ici (voir scripts/env/README.md)
├── health/        # Vérifications .env et services
├── mobile/        # Smokes, setup ADB/APK, email test (voir `scripts/mobile/README.md`)
├── monitoring/    # Monitoring, métriques, budget ressources
├── ops/           # Diagnostics, inventaires, bootstrap agent email
├── performance/   # Benchmarks backoffice/API + benchmark commits Git
├── reports/       # Rapports de tests/performance et nettoyage de rapports
├── security/      # Firewall, WAF, CVE, menaces de test
├── setup/         # Installation machine/outillage
├── testing/       # Helpers de tests
└── utils/         # Utilitaires transverses
```

### `database/` vs `db/`

| Dossier | Rôle | Appel typique |
|---------|------|---------------|
| `scripts/db/` | Shell Make/Prisma/Postgres (push, seed, backup) | `make db-push-all`, `make db-seed` |
| `scripts/database/` | Node historique (migrations données ponctuelles) | Manuel, pas Make par défaut |

### Extensions `.js` / `.cjs`

- **`.cjs`** : modules Node CommonJS appelés en CLI (`node scripts/env/….cjs`).
- **`.js`** : scripts Node ou helpers importés ; smokes mobile et tests API.
- **`.sh`** : wrappers shell Make et ops.

### Raccourcis `scripts/mobile/` (CLI stable)

| Raccourci | Canonique |
|-----------|-----------|
| `mobile/ensure-test-accounts-ready.js` | `mobile/setup/ensure-test-accounts-ready.js` |
| `mobile/smoke-preflight.js` | `mobile/smoke/run/smoke-preflight.js` |
| `mobile/smoke-run-mobile-*.js` | `mobile/smoke/run/` |

## Points d'entrée principaux

| Script | Usage |
|--------|-------|
| `scripts/core/check.sh` | Santé globale, utilisé par `make health`. |
| `scripts/db/db-push-all.sh` | Synchronisation Prisma multi-services, utilisé par `make db-push-all`. |
| `scripts/db/seed.sh` | Wrapper stable vers `make seed-auth`, utilisé par `make db-seed`. |
| `scripts/db/backup.sh` | Backup PostgreSQL vers `backups/database/`, utilisé par `make db-backup`. |
| `scripts/db/create-prisma-tables-safe.sh` | Reconstruction Prisma manuelle en préservant les tables monitoring-c. |
| `scripts/env/env-get-key.cjs` | Lecture silencieuse d'une clé `.env` pour Make/scripts, sans sourcer le fichier. |
| `scripts/env/env-align-with-example.cjs` | Compare `.env` / `.env.example` — `make env-check`. |
| `scripts/ops/dev-https-certs.sh` | Génération et installation navigateur de la CA HTTPS dev, utilisé par `make dev-https-*`. |
| `scripts/ops/inventory-scripts.cjs` | Inventaire des scripts et références, utilisé par `make scripts-inventory`. |
| `scripts/ops/color-logs.sh` | Coloration des logs Docker. |
| `scripts/ops/logs-watch.sh` | Suivi continu des logs avec reconnexion. |
| `scripts/ops/status-watch-loop.sh` | Watch `make status`, utilisé par `make status-watch` / `status-live`. |
| `scripts/ops/timed-make.sh` | Mesure de durée d'une cible Make. |
| `scripts/ops/make-menu.sh` | Menu interactif Make. |
| `scripts/health/check-env.sh` | Validation `.env`. |
| `scripts/health/check-services.sh` | Inspection des conteneurs JobbingTrack. |
| `scripts/docker/diagnose-network.sh` | Diagnostic réseau Docker local (`veth`, `bridge`, `overlay`) quand les conteneurs ne peuvent plus se connecter. |
| `scripts/utils/diagnostic.sh` | Diagnostic général et sous-modes Docker/CORS/réseau. |
| `scripts/security/cve-scan.py` | Scan CVE Node/Rust/Docker, utilisé par `make test-cve-scan`. |
| `scripts/security/test-firewall.sh` | Tests sécurité firewall/WAF. |
| `scripts/security/waf-lab-check.sh` | Test WAF borné via HTTPS dev, utilisé par `make security-waf-lab`. |
| `scripts/monitoring/resource-budget-sample.py` | Mesure CPU/RAM/I/O p95 des conteneurs ciblés. |
| `scripts/monitoring/redis-memory-report.sh` | Rapport mémoire Redis. |
| `scripts/reports/show-mobile-report.sh` | Ouverture du rapport HTML mobile, utilisé par `make test-mobile-report`. |
| `scripts/reports/compress-old-reports.sh` | Compression des anciens rapports de tests. |
| `scripts/reports/clean-empty-reports.sh` | Nettoyage des rapports vides ou invalides. |
| `scripts/reports/clean-all-reports.sh` | Nettoyage interactif de tous les rapports. |
| `scripts/reports/clean-all-reports-docker.sh` | Nettoyage manuel des rapports dans le conteneur frontend. |
| `scripts/reports/generate-test-report.sh` | Génération de rapport depuis les routes de test backoffice. |
| `scripts/reports/generate-html-report.sh` | Génération HTML depuis un JSON de performance. |
| `scripts/reports/run-single-test-with-report.sh` | Exécution ponctuelle d'un test avec rapport. |
| `scripts/performance/performance-benchmark.sh` | Benchmark before/after léger. |
| `scripts/performance/benchmark-all-backoffice.sh` | Benchmark complet des pages backoffice. |
| `scripts/performance/backend-performance-test.sh` | Test de performance backend, utilisé par `make test-performance-backend`. |
| `scripts/performance/test-performance.js` | Test performance API/backoffice léger. |
| `scripts/performance/run-performance-backend-in-container.sh` | Test performance backend depuis le conteneur frontend. |
| `scripts/performance/run-performance-frontend-in-container.sh` | Test performance frontend depuis le conteneur frontend. |
| `scripts/run-all-tests-with-reports.sh` | Orchestration complète des tests avec rapports. |
| `scripts/testing/test-api-specific.sh` | Smoke API backend via gateway. |
| `scripts/testing/verify-user-journey.sh` | Parcours API utilisateur. |
| `scripts/testing/verify-all-metrics.sh` | Vérification manuelle metrics/services/historique sur stack active. |
| `scripts/testing/test-relations.js` | Validation des relations BDD dans le contexte auth-service. |
| `scripts/testing/test-enums.js` | Validation des enums Prisma. |
| `scripts/testing/playwright-local.sh` | Playwright local fiable (bash, `TMPDIR`/`PLAYWRIGHT_BROWSERS_PATH` projet, frontend Docker `:5003`). |
| `scripts/testing/playwright-frontend-e2e.sh` | Wrapper Playwright frontend smoke/full. |
| `scripts/testing/playwright-mobile-e2e.sh` | Wrapper Playwright mobile smoke/full. |
| `scripts/testing/playwright-tests-dir.sh` | Wrapper Playwright depuis le dossier `tests/`. |
| `scripts/monitoring/test-backoffice-metrics.sh` | Smoke métriques backoffice. |
| `scripts/monitoring/test-metrics-persistence.sh` | Vérification persistance métriques. |
| `scripts/monitoring/test-monitoring-system.sh` | Test système monitoring. |
| `scripts/docker/get-docker-node-version.sh` | Détection version Node Docker pour la CI. |

## Inventaire

L'inventaire maintenable vit dans `docs/scripts/SCRIPTS_INVENTORY.md`.
L'audit des anciens scripts sans référence automatique vit dans `docs/scripts/NON_REFERENCED_SCRIPTS_AUDIT.md`.

```bash
make scripts-inventory
```

La commande est non destructive : elle liste les scripts peu ou pas référencés pour audit manuel.
Elle affiche aussi le nombre de scripts encore à la racine et une cible de rangement probable. Les déplacements doivent rester progressifs : déplacer le script métier, garder un wrapper si l'ancien chemin est appelé par `make`, la CI ou une documentation, puis supprimer le wrapper seulement après migration des références.

## Catégories

### Base de données

- `scripts/db/` : scripts shell appelables par Make.
- `scripts/database/` : scripts Node historiques liés aux migrations de données.

Commandes utiles :

```bash
make db-push-all
make seed-auth
make db-seed
make db-backup
```

### Monitoring

`scripts/monitoring/` regroupe les scripts de diagnostic métriques, comparaison d'agents, Redis et budget ressources.

Commandes utiles :

```bash
make diagnostic-metrics
make redis-memory-report
make resource-budget-sample
```

### Sécurité

`scripts/security/` contient les tests firewall/WAF, la génération de menaces de test, le live check sécurité et le scan CVE.

Commandes utiles :

```bash
make test-firewall
make security-live-check
make test-cve-scan
```

### Docker

Si `make up-full` échoue sur `failed to add the host <=> sandbox pair interfaces`, le problème est côté réseau Docker/kernel, pas côté application. Lance :

```bash
make docker-network-diagnose
```

Réparation courante sous Linux/Arch :

```bash
sudo modprobe veth bridge br_netfilter overlay
sudo systemctl restart docker
```

Si `modprobe veth` échoue après une mise à jour kernel, redémarrer sur le kernel installé ou réinstaller les modules (`sudo pacman -Syu linux linux-headers`, puis `reboot`).

### Mobile

`scripts/mobile/` regroupe setup appareil, smokes API/ADB, helpers email et modules partagés. Index détaillé : [`scripts/mobile/README.md`](mobile/README.md).

Commandes utiles :

```bash
node scripts/mobile/ensure-test-accounts-ready.js
node scripts/mobile/smoke-preflight.js
node scripts/mobile/smoke-run-mobile-fast.js
node scripts/mobile/clear-smoke-device-adb.js
```

### Tests

L'orchestrateur global `scripts/run-all-tests-with-reports.sh` reste à la racine car il agrège plusieurs domaines. Les wrappers et helpers de test sont dans `scripts/testing/`, les tests de monitoring dans `scripts/monitoring/` et les tests de performance dans `scripts/performance/`.

Commandes utiles :

```bash
make test
make test-all
make tests-user-journey
METRICS_URL=http://127.0.0.1:5004 API_GATEWAY_URL=http://127.0.0.1:5002 scripts/testing/verify-all-metrics.sh
```

## Scripts supprimés

Les anciens scripts `scripts/fix-db-push-all.sh` et `scripts/fix-db-push-makefile.sh` ont été supprimés : ils modifiaient le Makefile de manière ponctuelle et ne sont plus référencés. La logique supportée vit maintenant directement dans `makefiles/database/Makefile` et `scripts/db/db-push-all.sh`.

## Conventions

1. Placer les nouveaux scripts dans le sous-dossier métier approprié.
2. Garder un wrapper à l'ancien chemin uniquement si un Makefile, la CI ou un test le référence.
3. Ne pas committer de rapports générés, backups, dumps SQL ou résultats de scan.
4. Documenter chaque nouveau point d'entrée dans ce README et dans le Makefile associé.
