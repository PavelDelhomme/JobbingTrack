# Chantier sécurité, data backoffice et documentation

**Dernière mise à jour** : 11 mai 2026 — **B11** alertes email critiques backend, **B15** matrice/outillage tests sécurité offensifs contrôlés, **H** release/préprod/conformité, réorganisation `docs/` et règle performance : analyse runtime limitée à la gateway/public, pas au trafic inter-conteneurs. Historique conservé : **B14** durcissement Compose/runtime, **B6–B10** forensics/UX sécurité, **A/B** avant **G/H**.

Ce fichier **indexe** le chantier priorisé (même périmètre que le plan Cursor `chantier_securite_data_docs_*.plan.md`). La **source de vérité versionnée** dans le dépôt est :

| Fichier | Rôle |
|---------|------|
| **[PLAN.md](../PLAN.md)** | Lots A–**H**, critères d’acceptation, fichiers clés, ordre de travail ( **G** = backup / continuité, **H** = release / préprod / conformité ) |
| **[TODOS.md](../TODOS.md)** | Cases à cocher opérationnelles ; **dernière section** = méta (validation porteur, audit BDD avant tests, logs gateway sécurité, refonte doc racine + `docs/`) |
| **[STATS.md](../security/STATS.md)** | Suivi **CVE** / dépendances (npm, Docker, Flutter) — tableaux à compléter après audits |
| **[SECURITY_TESTING_MATRIX.md](../security/SECURITY_TESTING_MATRIX.md)** | Tests sécurité offensifs contrôlés, outils (`gitleaks`, `trivy`, `nmap`, `jwt_tool`, ZAP, etc.), protections attendues et contraintes performance |
| **[docs/operations/PREPROD_PRODUCTION_CHECKLIST.md](../operations/PREPROD_PRODUCTION_CHECKLIST.md)** | NTP, secrets, intrusion gateway, vérifs **B6** avant mise en prod |
| **[docs/operations/RELEASE_PREPROD_PRODUCTION_PLAN.md](../operations/RELEASE_PREPROD_PRODUCTION_PLAN.md)** | Lot **H** : branche tests complets, préprod, bêta mobile, licences, RGPD, retours utilisateurs, déploiements, mono-repo vs multi-repo |
| **[docs/security/COMPOSE_RUNTIME_HARDENING.md](../security/COMPOSE_RUNTIME_HARDENING.md)** | Lot **B14** : secrets, **`docker.sock`**, Redis, non-root, WAF gateway, fichiers backup, limites ressources — tableau **BX1–BX14** |
| **[STATUS.md](../STATUS.md)** | État projet + **tableau de suivi des lots** + priorités P0–P2 |
| **[ERRORS.md](../ERRORS.md)** | Erreurs actives + **§ Pièges d’interprétation** (dashboard admin) + pipeline erreurs (synthèse) |
| **[RESOLUTIONS.md](../RESOLUTIONS.md)** | Correctifs documentés (dont entrée avril 2026 — vue d’ensemble) |
| **[FONCTIONNALITES.md](FONCTIONNALITES.md)** | Spec fonctionnelle, § 4.1 dashboard à jour ; validation produit = porteur (**`PLAN.md`** colonne **Validé**) |

## Lots (rappel)

- **A** — Monitoring détaillé, logs multi-sources, corrélation, pipeline, **A5** métriques persistées / pages liées (voir **`../PLAN.md`**).
- **B** — Sécurité visible + **forensics** (**B6–B9**) + **B10** UX outils sécurité backoffice + **B11** alertes email + **B14** durcissement **docker-compose** / runtime + **B15** tests sécurité offensifs contrôlés — **`PLAN.md`** § lot B ; **`docs/security/COMPOSE_RUNTIME_HARDENING.md`** ; **`docs/security/SECURITY_TESTING_MATRIX.md`**. **Table de périmètre** : **`TODOS.md`** § **Lot B — Vision d’ensemble** et § **Tests sécurité offensifs contrôlés**.
- **C** — Suivi-intérim et données test / bases.
- **D** — Crash mobile et observabilité.
- **E** — Documentation exhaustive (PROCESSUS, revue `docs/`, etc.).
- **F** — Tests ciblés et bilan (`npm run test:unit-and-analytics` dans **`make test`**, log `frontend-jest.json` ; périmètre ≠ `npm test` complet).
- **G** — Sauvegardes ultra-sécurisées : API backup (gateway), chiffrement, délocalisation, UI admin, RPO/RTO et runbooks — voir **`../PLAN.md`** § G et **`FONCTIONNALITES.md`** § 4.4.
- **H** — Release, préprod, conformité, bêta mobile, licences, RGPD, retours utilisateurs, déploiements et stratégie de dépôts — voir **`../PLAN.md`** § H et **`../operations/RELEASE_PREPROD_PRODUCTION_PLAN.md`**.

## Liens utiles dans `docs/`

- [GUIDE_ETAPES_ACTUELLES.md](../getting-started/GUIDE_ETAPES_ACTUELLES.md) — quoi faire au quotidien.
- [BACKLOG.md](../BACKLOG.md) — backlog large ; ne pas dupliquer le détail des lots (voir `PLAN.md`).
- [database/MIGRATIONS_ET_BASES.md](../database/MIGRATIONS_ET_BASES.md) — base principale vs test (lot C).
