# Plan d'audit et restructuration documentaire

Objectif : vérifier toute la documentation avant de continuer les gros chantiers, réduire les doublons et garder une navigation simple. Ce plan complète `project/STRUCTURE_DOCUMENTATION.md` : il décrit **comment** auditer et dans quel ordre agir.

## Règles de tri

- Ne pas déplacer/supprimer un document sans vérifier ses liens depuis `README.md`, `docs/README.md`, `docs/INDEX.md`, `docs/navigation.md`, `docs/STATUS.md`, `docs/pilotage/TODOS.md`, `docs/project/PLAN.md`, scripts et Makefiles.
- Garder à la racine de `docs/` les **hubs** : `README.md`, `INDEX.md`, `navigation.md`, **`STATUS.md`**. Contenu déplacé (juin 2026) : `pilotage/TODOS.md`, `project/PLAN.md`, `project/BACKLOG.md`, `project/RESOLUTIONS.md`, `troubleshooting/ERRORS.md`. Les stubs `PLAN.md`, `TODOS.md`, etc. à la racine restent pour compatibilité liens.
- Garder les documents durables par domaine ; déplacer les rapports datés ou générés vers `reports/` ou `tests/results/`.
- Marquer explicitement les archives sous `docs/archive/` avec la raison de conservation.
- Fusionner les doublons par sujet avant suppression : ports/config, déploiement, monitoring, performance frontend, tests mobile, base de données.

## Périmètre à vérifier

| Zone | Action attendue |
|---|---|
| `docs/core/architecture/` | Vérifier cohérence avec `docs/architecture/` et éviter deux sources concurrentes. |
| `docs/database/` | Regrouper schéma, migrations, décisions et analyses ; distinguer état courant vs archives. |
| `docs/deployment/` | Aligner prod/préprod avec `operations/RELEASE_PREPROD_PRODUCTION_PLAN.md` et checklist. |
| `docs/emails/` | Centraliser SMTP, MailHog, alertes sécurité et monitoring email. |
| `docs/features/` | Garder les fiches métier actives ; déplacer les brouillons anciens si obsolètes. |
| `docs/frontend/` | Fusionner les optimisations frontend/backoffice avec le nouveau chantier fluidité. |
| `docs/getting-started/` | Vérifier doublons démarrage rapide / installation / commandes utiles. |
| `docs/mobile/` | Séparer roadmap mobile, analytics/RGPD, bêta/release, reverse engineering sécurité. |
| `docs/monitoring/` | Aligner monitoring C/Rust, metrics-aggregator, commandes et migration Rust. |
| `docs/operations/` | Garder runbooks, préprod/prod, env, release, audit documentaire. |
| `docs/pdfs/` | Vérifier si généré ; ne pas mélanger PDF générés et sources. |
| `docs/performance/` | Fusionner rapports frontend/perf historiques avec budgets actuels et gate préprod. |
| `docs/project/` | Garder vision produit, historique, structure docs, chantier sécurité/data/docs. |
| `docs/scripts/` | Vérifier que les scripts réels correspondent à la doc et aux Makefiles. |
| `docs/security/` | Conserver matrice B15, STATS, CVE, WAF, hardening ; éviter doublons avec ERRORS/TODOS. |
| `docs/tests/` | Unifier stratégie tests, commandes, rapports, mobile, Playwright et gate préprod. |
| `docs/todo/` | Fusionner avec `docs/pilotage/TODOS.md` si contenu historique ou déplacer en archive. |
| `docs/troubleshooting/` | Garder les runbooks actifs ; déplacer résolutions historiques vers `RESOLUTIONS.md` si besoin. |
| `docs/user-journey/` | Aligner parcours métier, tests de parcours et retours utilisateurs. |
| `monitoring/MIGRATION_RUST.md` | Vérifier s'il doit rester près du code ou être répliqué/indexé depuis `docs/monitoring/`. |

## Fichiers racine docs à auditer

- **`docs/STATUS.md`** : hub état courant ; liens vers pilotage, project, troubleshooting.
- **`docs/pilotage/TODOS.md`** : backlog technique ordonné ; pas de doublons fins avec `project/BACKLOG.md`.
- **`docs/project/PLAN.md`**, **`BACKLOG.md`**, **`RESOLUTIONS.md`** : vision lots, reporté, correctifs actés.
- **`docs/troubleshooting/ERRORS.md`** : erreurs actives ; résolues → `project/RESOLUTIONS.md`.
- **`docs/INDEX.md`** / **`navigation.md`** / **`README.md`** : aligner après chaque déplacement.
- Stubs racine (`PLAN.md`, `TODOS.md`, …) : redirects uniquement, pas de contenu divergent.
- **`docs/_meta/generate-pdfs.js`**, **`pdf-style.css`**, **`docs/pdfs/`** : pipeline PDF et statut généré.

## Ordre de travail proposé

1. **Sécurité / opérations / préprod** : garder cohérent avec B14/B15/H et les scans P0.
2. **Frontend / performance / tests** : intégrer la fluidité backoffice et le gate tests complets.
3. **Monitoring / migration Rust** : clarifier C vs Rust, metrics-aggregator et budgets ressources.
4. **Database / deployment / emails** : réduire doublons et aligner production réelle.
5. **Mobile / user journey / feedback RGPD** : préparer bêta mobile et retours utilisateurs.
6. **Index finaux** : mettre à jour `README.md`, `INDEX.md`, `navigation.md`, `STRUCTURE_DOCUMENTATION.md`, puis vérifier liens.

## Constats initiaux à traiter

Priorité haute :

- **Liens/index obsolètes** : `docs/INDEX.md` et `docs/navigation.md` mentionnent encore des fichiers ou dossiers absents (`ORGANISATION_DOCUMENTATION.md`, certains chemins `development/*`, plusieurs anciens fichiers emails, `monitoring/STATISTIQUES_PROJET.md`, `QUICK-START-MONITORING.md` au lieu de `QUICK_START_MONITORING.md`, anciens fichiers `user-journey/*`).
- **Guides monitoring concurrents** : `docs/monitoring/MONITORING_GUIDE.md` et `docs/monitoring/MONITORING-GUIDE.md` sont deux entrées proches mais différentes. Décider d'un guide canonique et d'une page pièges/FAQ.
- **Configuration ports doublonnée** : `docs/configuration/CONFIGURATION_PORTS.md` et `docs/deployment/configuration/CONFIGURATION_PORTS.md` ont des angles différents. Garder une source canonique et transformer l'autre en renvoi explicite ou annexe.
- **`docs/todo/README.md` obsolète** : il pointe vers des fichiers absents (`TODO_CORRECTIONS.md`, `CORRECTIONS_EN_COURS.md`) alors que le suivi réel est `docs/TODOS.md` + `docs/todo/TODO_PERFORMANCE.md`.

Priorité moyenne :

- **`docs/features/` sous-indexé** : ajouter un README ou un lien clair depuis `INDEX.md` pour `SUIVI_BOITES_INTÉRIM.md`.
- **`monitoring/MIGRATION_RUST.md` peu découvrable** : lier depuis `docs/monitoring/README.md` et/ou `project/CHANTIER_SECURITE_DATA_DOCS.md`.
- **Arbre `docs/README.md` à rafraîchir** : vérifier les entrées `mobile/guide` et `performance/guide` par rapport à la structure réelle.
- **Doublons mineurs `INDEX.md`** : vérifier les répétitions de parcours métier et les arbres historiques en bas de page.

## Validation avant gros déplacement

- Générer l'inventaire `.md`.
- Lister liens entrants vers les fichiers candidats.
- Déplacer par petit lot avec `git mv`.
- Mettre à jour liens et index immédiatement.
- Lancer au minimum `git diff --check` et une recherche de liens vers anciens chemins.
