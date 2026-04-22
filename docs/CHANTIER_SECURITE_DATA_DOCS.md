# Chantier sécurité, data backoffice et documentation

**Dernière mise à jour** : 22 avril 2026 — **Lot B** : **B6** corrélation (gateway + front, suite microservices) ; **B10** refonte UX pages **`/backoffice/security/**`** ; **B6–B9** forensics dans **`PLAN.md`** / **`TODOS.md`**. **7 avril 2026** — **lot G** (sauvegardes, PCA/PRI). Rappel : **A/B** avant **G**.

Ce fichier **indexe** le chantier priorisé (même périmètre que le plan Cursor `chantier_securite_data_docs_*.plan.md`). La **source de vérité versionnée** dans le dépôt est :

| Fichier | Rôle |
|---------|------|
| **[PLAN.md](../PLAN.md)** | Lots A–**G**, critères d’acceptation, fichiers clés, ordre de travail ( **G** = backup / continuité ) |
| **[TODOS.md](../TODOS.md)** | Cases à cocher opérationnelles |
| **[STATS.md](../STATS.md)** | Suivi **CVE** / dépendances (npm, Docker, Flutter) — tableaux à compléter après audits |
| **[docs/operations/PREPROD_PRODUCTION_CHECKLIST.md](operations/PREPROD_PRODUCTION_CHECKLIST.md)** | NTP, secrets, intrusion gateway, vérifs **B6** avant mise en prod |
| **[STATUS.md](../STATUS.md)** | État projet + **tableau de suivi des lots** + priorités P0–P2 |
| **[ERRORS.md](../ERRORS.md)** | Erreurs actives + **§ Pièges d’interprétation** (dashboard admin) + pipeline erreurs (synthèse) |
| **[RESOLUTIONS.md](../RESOLUTIONS.md)** | Correctifs documentés (dont entrée avril 2026 — vue d’ensemble) |
| **[FONCTIONNALITES.md](../FONCTIONNALITES.md)** | Spec fonctionnelle, § 4.1 dashboard à jour ; validation produit = porteur (**`PLAN.md`** colonne **Validé**) |

## Lots (rappel)

- **A** — Monitoring détaillé, logs multi-sources, corrélation, pipeline, **A5** métriques persistées / pages liées (voir **`PLAN.md`**).
- **B** — Sécurité visible + **forensics** (**B6–B9**) + **B10** UX outils sécurité backoffice — **`PLAN.md`** § lot B. **B5** stable ; **B1** fait — voir **`RESOLUTIONS.md`**.
- **C** — Suivi-intérim et données test / bases.
- **D** — Crash mobile et observabilité.
- **E** — Documentation exhaustive (PROCESSUS, revue `docs/`, etc.).
- **F** — Tests ciblés et bilan (`npm run test:unit-and-analytics` dans **`make test`**, log `frontend-jest.json` ; périmètre ≠ `npm test` complet).
- **G** — Sauvegardes ultra-sécurisées : API backup (gateway), chiffrement, délocalisation, UI admin, RPO/RTO et runbooks — voir **`PLAN.md`** § G et **`FONCTIONNALITES.md`** § 4.4.

## Liens utiles dans `docs/`

- [GUIDE_ETAPES_ACTUELLES.md](GUIDE_ETAPES_ACTUELLES.md) — quoi faire au quotidien.
- [BACKLOG.md](BACKLOG.md) — backlog large ; ne pas dupliquer le détail des lots (voir `PLAN.md`).
- [database/MIGRATIONS_ET_BASES.md](database/MIGRATIONS_ET_BASES.md) — base principale vs test (lot C).
