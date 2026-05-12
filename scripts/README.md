# Scripts JobbingTrack

Ce dossier contient les scripts d'exploitation, de diagnostic, de tests et de maintenance du dépôt.

Règle simple : les nouveaux scripts doivent aller dans un sous-dossier métier. La racine reste réservée aux points d'entrée historiques appelés par `make`, la CI ou les rapports de tests.

## Arborescence

```text
scripts/
├── core/          # Points d'entrée généraux et compatibilité Make
├── database/      # Scripts Node de migration/seed historiques
├── db/            # Scripts shell PostgreSQL / Prisma / métriques DB
├── docker/        # Vérifications et nettoyage Docker
├── env/           # Documentation/outillage de configuration runtime
├── fixes/         # Correctifs ponctuels encore utiles
├── health/        # Vérifications .env et services
├── monitoring/    # Monitoring, métriques, budget ressources
├── ops/           # Diagnostics et inventaires opérationnels
├── security/      # Firewall, WAF, CVE, menaces de test
├── setup/         # Installation machine/outillage
├── testing/       # Helpers de tests
└── utils/         # Utilitaires transverses
```

## Points d'entrée principaux

| Script | Usage |
|--------|-------|
| `scripts/core/check.sh` | Santé globale, utilisé par `make health`. |
| `scripts/db/db-push-all.sh` | Synchronisation Prisma multi-services, utilisé par `make db-push-all`. |
| `scripts/db/seed.sh` | Wrapper stable vers `make seed-auth`, utilisé par `make db-seed`. |
| `scripts/db/backup.sh` | Backup PostgreSQL vers `backups/database/`, utilisé par `make db-backup`. |
| `scripts/ops/dev-https-certs.sh` | Génération et installation navigateur de la CA HTTPS dev, utilisé par `make dev-https-*`. |
| `scripts/ops/inventory-scripts.cjs` | Inventaire des scripts et références, utilisé par `make scripts-inventory`. |
| `scripts/health/check-env.sh` | Validation `.env`. |
| `scripts/health/check-services.sh` | Inspection des conteneurs JobbingTrack. |
| `scripts/docker/diagnose-network.sh` | Diagnostic réseau Docker local (`veth`, `bridge`, `overlay`) quand les conteneurs ne peuvent plus se connecter. |
| `scripts/utils/diagnostic.sh` | Diagnostic général et sous-modes Docker/CORS/réseau. |
| `scripts/security/cve-scan.py` | Scan CVE Node/Rust/Docker, utilisé par `make test-cve-scan`. |
| `scripts/security/test-firewall.sh` | Tests sécurité firewall/WAF. |
| `scripts/security/waf-lab-check.sh` | Test WAF borné via HTTPS dev, utilisé par `make security-waf-lab`. |
| `scripts/monitoring/resource-budget-sample.py` | Mesure CPU/RAM/I/O p95 des conteneurs ciblés. |
| `scripts/monitoring/redis-memory-report.sh` | Rapport mémoire Redis. |
| `scripts/run-all-tests-with-reports.sh` | Orchestration complète des tests avec rapports. |
| `scripts/verify-user-journey.sh` | Parcours API utilisateur. |
| `scripts/test-relations.js` | Validation des relations BDD dans le contexte auth-service. |
| `scripts/test-enums.js` | Validation des enums Prisma. |
| `scripts/get-docker-node-version.sh` | Détection version Node Docker pour la CI. |

## Inventaire

L'inventaire maintenable vit dans `docs/scripts/SCRIPTS_INVENTORY.md`.

```bash
make scripts-inventory
```

La commande est non destructive : elle liste les scripts peu ou pas référencés pour audit manuel.

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

### Tests

Les gros orchestrateurs restent à la racine quand ils sont appelés par plusieurs Makefiles ou rapports historiques. Les helpers secondaires sont dans `scripts/testing/`.

Commandes utiles :

```bash
make test
make test-all
make tests-user-journey
```

## Scripts supprimés

Les anciens scripts `scripts/fix-db-push-all.sh` et `scripts/fix-db-push-makefile.sh` ont été supprimés : ils modifiaient le Makefile de manière ponctuelle et ne sont plus référencés. La logique supportée vit maintenant directement dans `makefiles/database/Makefile` et `scripts/db/db-push-all.sh`.

## Conventions

1. Placer les nouveaux scripts dans le sous-dossier métier approprié.
2. Garder un wrapper à l'ancien chemin uniquement si un Makefile, la CI ou un test le référence.
3. Ne pas committer de rapports générés, backups, dumps SQL ou résultats de scan.
4. Documenter chaque nouveau point d'entrée dans ce README et dans le Makefile associé.
