# Inventaire Scripts

Ce fichier documente le statut attendu des scripts. L'inventaire automatique se lance avec :

```bash
make scripts-inventory
```

La commande ne supprime rien. Elle classe les scripts selon les références trouvées dans Makefiles, CI, tests et documentation.

## Dernier Contrôle

Contrôle local du 12/05/2026 : `make scripts-inventory` OK, **126 scripts** détectés, dont **58 actifs**, **26 sans référence automatique** et **18 encore à la racine**. L'inventaire signale maintenant aussi une cible de rangement probable pour les scripts racine afin de préparer des déplacements par lots avec wrappers de compatibilité quand un Makefile, la CI ou une doc référence l'ancien chemin.

Suite du 12/05 : la logique des anciens scripts d'environnement racine `sync-env.js`, `verify-env-usage.js` et `generate-env-example.sh` vit maintenant sous `scripts/env/`; les chemins racine restent des wrappers de compatibilité.

Suite du 12/05 soir : premiers déplacements sans wrapper racine quand les références étaient migrables directement : `scripts/setup/setup-ports.sh`, `scripts/db/create-prisma-tables-safe.sh`, `scripts/reports/show-mobile-report.sh`, `scripts/reports/clean-all-reports-docker.sh`.

État d'usage : le dossier reste utilisable parce que les entrées contractuelles Make/CI sont détectées, mais il n'est pas encore propre. Le prochain lot sûr doit déplacer uniquement les scripts racine à destination évidente (`ops`, `reports/monitoring`, `testing`) et garder un wrapper temporaire si l'ancien chemin est documenté ou appelé. Les **26** scripts `non-reference` ne doivent pas être supprimés avant audit manuel : certains peuvent être des outils de dépannage utilisés ponctuellement.

## Statuts

- `actif` : appelé par un Makefile, la CI ou un flux de test connu.
- `manuel/documente` : utile ponctuellement et référencé dans la documentation.
- `manuel` : référencé hors Make/CI, à garder tant que l'usage est confirmé.
- `legacy` : ancien script ou correctif ponctuel, à archiver avant suppression.
- `non-reference` : aucune référence détectée automatiquement, à auditer manuellement avant toute suppression.

## Points D'entrée Contractuels

| Script | Statut | Usage |
| --- | --- | --- |
| `scripts/db/db-push-all.sh` | actif | Synchronisation Prisma multi-services. |
| `scripts/db/seed.sh` | actif | Seed stable via Make. |
| `scripts/db/backup.sh` | actif | Backup PostgreSQL local. |
| `scripts/env-align-with-example.cjs` | actif | Wrapper historique vers l'outillage env. |
| `scripts/env-generate-secrets.cjs` | actif | Génération locale de secrets sans affichage. |
| `scripts/env-set-key.cjs` | actif | Mise à jour ciblée d'une clé `.env`. |
| `scripts/env-validate-runtime.cjs` | actif | Validation dev/prod de la configuration runtime. |
| `scripts/reorder-env-from-example.cjs` | actif | Réordonnancement `.env` selon `.env.example`. |
| `scripts/run-all-tests-with-reports.sh` | actif | Orchestration complète tests + rapports. |
| `scripts/security/cve-scan.py` | actif | Scan CVE Node/Rust/Docker. |
| `scripts/security/secrets-scan.sh` | actif | Scan secrets Git. |
| `scripts/security/ports-scan.sh` | actif | Analyse exposition ports compose. |

## Règles De Nettoyage

1. Ne jamais supprimer un script classé `actif`.
2. Pour un script `non-reference`, vérifier l'historique, les docs et les usages manuels avant de l'archiver.
3. Tout script qui modifie `.env`, Docker, la base de données ou les rapports doit documenter son mode dry-run ou ses garde-fous.
4. Les secrets ne doivent jamais être affichés en clair dans stdout, stderr ou les rapports générés.
5. Les scripts racine doivent être déplacés par lots cohérents (`testing`, `reports/monitoring`, `db`, `ops`) avec wrapper temporaire si l'ancien chemin est contractuel.
