# Scripts

[← Retour à la documentation](../README.md) | [🧭 Navigation](../navigation.md)

La documentation source du dossier scripts est maintenue dans [`../../scripts/README.md`](../../scripts/README.md).

## Résumé

Les scripts sont organisés par domaine :

- `scripts/core/` : points d'entrée généraux et compatibilité Make.
- `scripts/db/` et `scripts/database/` : PostgreSQL, Prisma, seed, backup et migrations historiques.
- `scripts/docker/` : Docker et conteneurs.
- `scripts/health/` : santé `.env` et services.
- `scripts/monitoring/` : métriques, Redis, budget ressources.
- `scripts/security/` : firewall, WAF, CVE, menaces de test.
- `scripts/setup/` : installation locale.
- `scripts/testing/` : helpers de tests.
- `scripts/utils/` : utilitaires transverses.

## Commandes recommandées

```bash
make health
make db-push-all
make db-seed
make db-backup
make test
make test-cve-scan
make diagnostic-metrics
```

## Notes de maintenance

Cette page ne doit plus lister des fichiers un par un pour éviter la dérive documentaire. Audits ponctuels : [`AUDIT_CLEANUP_2026-06-26.md`](AUDIT_CLEANUP_2026-06-26.md), [`NON_REFERENCED_SCRIPTS_AUDIT.md`](NON_REFERENCED_SCRIPTS_AUDIT.md), inventaire [`SCRIPTS_INVENTORY.md`](SCRIPTS_INVENTORY.md) — **07/07** : pas de nouvelle dette ; source opérationnelle = `scripts/README.md`.

Lorsqu'un script est ajouté, déplacé ou supprimé, mettre à jour :

- `scripts/README.md` pour l'inventaire opérationnel ;
- le Makefile qui expose la commande ;
- la documentation métier concernée si le script fait partie d'un runbook.
