# Chantier sécurité, data backoffice et documentation

**Dernière mise à jour** : 7 avril 2026 — **lot G** ajouté (sauvegardes chiffrées, API backup, délocalisation, UI admin, PCA/PRI) dans **`PLAN.md`**, **`FONCTIONNALITES.md`** § 4.4, **`STATUS.md`**, **`TODOS.md`**. Rappel : lots **A/B** (monitoring, sécurité) inchangés comme priorités d’implémentation avant **G**.

Ce fichier **indexe** le chantier priorisé (même périmètre que le plan Cursor `chantier_securite_data_docs_*.plan.md`). La **source de vérité versionnée** dans le dépôt est :

| Fichier | Rôle |
|---------|------|
| **[PLAN.md](../PLAN.md)** | Lots A–**G**, critères d’acceptation, fichiers clés, ordre de travail ( **G** = backup / continuité ) |
| **[TODOS.md](../TODOS.md)** | Cases à cocher opérationnelles |
| **[STATUS.md](../STATUS.md)** | État projet + **tableau de suivi des lots** + priorités P0–P2 |
| **[ERRORS.md](../ERRORS.md)** | Erreurs actives + **§ Pièges d’interprétation** (dashboard admin) + pipeline erreurs (synthèse) |
| **[RESOLUTIONS.md](../RESOLUTIONS.md)** | Correctifs documentés (dont entrée avril 2026 — vue d’ensemble) |
| **[FONCTIONNALITES.md](../FONCTIONNALITES.md)** | Spec fonctionnelle, § 4.1 dashboard à jour ; validation produit = porteur (**`PLAN.md`** colonne **Validé**) |

## Lots (rappel)

- **A** — Monitoring détaillé, logs multi-sources, corrélation, pipeline, **A5** métriques persistées / pages liées (voir **`PLAN.md`**).
- **B** — Sécurité visible (cohérence, test IP, UI, réseau). **B5** stable ; **B1** fait ; **B3–B4** partiels — voir **`RESOLUTIONS.md`**.
- **C** — Suivi-intérim et données test / bases.
- **D** — Crash mobile et observabilité.
- **E** — Documentation exhaustive (PROCESSUS, revue `docs/`, etc.).
- **F** — Tests ciblés et bilan (`npm run test:unit-and-analytics` dans **`make test`**, log `frontend-jest.json` ; périmètre ≠ `npm test` complet).
- **G** — Sauvegardes ultra-sécurisées : API backup (gateway), chiffrement, délocalisation, UI admin, RPO/RTO et runbooks — voir **`PLAN.md`** § G et **`FONCTIONNALITES.md`** § 4.4.

## Liens utiles dans `docs/`

- [GUIDE_ETAPES_ACTUELLES.md](GUIDE_ETAPES_ACTUELLES.md) — quoi faire au quotidien.
- [BACKLOG.md](BACKLOG.md) — backlog large ; ne pas dupliquer le détail des lots (voir `PLAN.md`).
- [database/MIGRATIONS_ET_BASES.md](database/MIGRATIONS_ET_BASES.md) — base principale vs test (lot C).
