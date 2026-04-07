# Chantier sécurité, data backoffice et documentation

**Dernière mise à jour** : 8 avril 2026

Ce fichier **indexe** le chantier priorisé (même périmètre que le plan Cursor `chantier_securite_data_docs_*.plan.md`). La **source de vérité versionnée** dans le dépôt est :

| Fichier | Rôle |
|---------|------|
| **[PLAN.md](../PLAN.md)** | Lots A–F, critères d’acceptation, fichiers clés, ordre de travail |
| **[TODOS.md](../TODOS.md)** | Cases à cocher opérationnelles |
| **[STATUS.md](../STATUS.md)** | État projet + **tableau de suivi des lots** + priorités P0–P2 |
| **[ERRORS.md](../ERRORS.md)** | Erreurs actives + **§ Pièges d’interprétation** (dashboard admin) + pipeline erreurs (synthèse) |
| **[RESOLUTIONS.md](../RESOLUTIONS.md)** | Correctifs documentés (dont entrée avril 2026 — vue d’ensemble) |
| **[FONCTIONNALITES.md](../FONCTIONNALITES.md)** | Spec fonctionnelle, § 4.1 dashboard à jour |

## Lots (rappel)

- **A** — Sécurité visible (cohérence, test IP, UI, réseau). **A5** (`security-live-check`, auth firewall/WAF, scripts) documenté comme stable ; reste **A1–A4** partiels — voir **`PLAN.md`** / **`RESOLUTIONS.md`**.
- **B** — Logs multi-services et corrélation.
- **C** — Suivi-intérim et données test / bases.
- **D** — Crash mobile et observabilité.
- **E** — Documentation exhaustive (PROCESSUS, revue `docs/`, etc.).
- **F** — Tests ciblés et bilan.

## Liens utiles dans `docs/`

- [GUIDE_ETAPES_ACTUELLES.md](GUIDE_ETAPES_ACTUELLES.md) — quoi faire au quotidien.
- [BACKLOG.md](BACKLOG.md) — backlog large ; ne pas dupliquer le détail des lots (voir `PLAN.md`).
- [database/MIGRATIONS_ET_BASES.md](database/MIGRATIONS_ET_BASES.md) — base principale vs test (lot C).
