# Structure documentation Markdown - brouillon de réorganisation

Objectif : avoir une vue claire de tous les fichiers `.md` du projet avant de réorganiser `docs/` et les fichiers Markdown à la racine.

Ce fichier est volontairement un brouillon de travail. Il contient d’abord la structure actuelle complète des fichiers Markdown, puis une structure proposée à modifier/valider avant tout déplacement.

## Règles proposées

- La racine doit rester courte : uniquement les fichiers de pilotage et d’entrée projet.
- `docs/` doit contenir la documentation durable, organisée par domaine.
- Les `README.md` dans les services doivent rester proches du code quand ils expliquent le service.
- Les rapports générés ou datés doivent aller dans `reports/` ou `tests/results/`, pas dans `docs/` durable.
- Les archives doivent être explicites sous `docs/archive/` avec une raison de conservation.
- Avant suppression : vérifier si un fichier est référencé depuis `README.md`, `PLAN.md`, `STATUS.md`, `TODOS.md`, scripts ou Makefiles.

## Structure actuelle complète

Inventaire des fichiers Markdown actuellement visibles dans le projet. Cette section sert de base de tri : elle doit rester factuelle.

```text
.
├── ERRORS.md
├── FONCTIONNALITES.md
├── PLAN.md
├── PROCESSUS_APPLICATION_MOBILE_ET_API.md
├── README.md
├── RESOLUTIONS.md
├── STATUS.md
├── STATS.md
├── STRUCTURE_DOCUMENTATION.md
├── TODOS.md
├── .github/
│   └── workflows/
│       └── README.md
├── backend/
│   ├── README.md
│   ├── api-gateway/
│   │   └── README.md
│   ├── application-service/
│   │   └── README.md
│   ├── auth-service/
│   │   ├── README.md
│   │   └── src/
│   │       └── services/
│   │           └── email/
│   │               └── README.md
│   ├── call-service/
│   │   └── README.md
│   ├── company-service/
│   │   └── README.md
│   ├── contact-service/
│   │   └── README.md
│   ├── dashboard-service/
│   │   └── README.md
│   ├── deployment-service/
│   │   └── README.md
│   ├── event-service/
│   │   └── README.md
│   ├── followup-service/
│   │   └── README.md
│   ├── interview-service/
│   │   └── README.md
│   ├── metrics-aggregator-service/
│   │   └── README.md
│   ├── notification-service/
│   │   └── README.md
│   ├── prisma/
│   │   ├── README.md
│   │   └── backup/
│   │       ├── analyse_differences.md
│   │       └── resume_changements.md
│   ├── profile-service/
│   │   └── README.md
│   ├── scripts/
│   │   └── README.md
│   ├── security-service/
│   │   └── README.md
│   ├── shared/
│   │   └── README.md
│   └── workflow-service/
│       └── README.md
├── docs/
│   ├── BACKLOG.md
│   ├── CHANTIER_SECURITE_DATA_DOCS.md
│   ├── COMMANDES_UTILES.md
│   ├── GUIDE_ETAPES_ACTUELLES.md
│   ├── HISTORIQUE.md
│   ├── INDEX.md
│   ├── RAPPORT_NETTOYAGE_MARS_2026.md
│   ├── README.md
│   ├── RECAPITULATIF_PROJET_COMPLET.md
│   ├── navigation.md
│   ├── administration/
│   │   ├── GUIDE_GESTION_UTILISATEURS.md
│   │   ├── README.md
│   │   └── SUMMARY_USER_MANAGEMENT.md
│   ├── api/
│   │   ├── README.md
│   │   ├── api-reference/
│   │   │   └── README.md
│   │   └── endpoints/
│   │       └── README.md
│   ├── architecture/
│   │   ├── decisions/
│   │   │   ├── README.md
│   │   │   ├── architecture-decision/
│   │   │   │   └── README.md
│   │   │   └── session-recap/
│   │   │       └── README.md
│   │   └── metrics/
│   │       ├── README.md
│   │       └── troubleshooting/
│   │           └── README.md
│   ├── archive/
│   │   ├── NON_FONCTIONNELS_APRES_RESOLUTION.md
│   │   └── monitoring-old/
│   │       ├── QUICK_START.md
│   │       └── README.md
│   ├── changelog/
│   │   └── README.md
│   ├── ci-cd/
│   │   └── README.md
│   ├── configuration/
│   │   ├── CONFIGURATION_PORTS.md
│   │   └── PORTS.md
│   ├── core/
│   │   ├── architecture/
│   │   │   └── README.md
│   │   └── services/
│   │       └── README.md
│   ├── database/
│   │   ├── ACTIONS_ET_MODIFICATIONS.md
│   │   ├── DATABASE_VERIFICATION.md
│   │   ├── MIGRATIONS_ET_BASES.md
│   │   ├── PRISMA_VERSIONS_ET_UPGRADE.md
│   │   ├── README.md
│   │   ├── SCHEMA_CHOIX.md
│   │   ├── STATUS_STRUCTURE_BDD.md
│   │   ├── STRUCTURE_ACTUELLE.md
│   │   ├── relations.md
│   │   ├── analysis/
│   │   │   ├── README.md
│   │   │   ├── comprehensive-project-audit/
│   │   │   │   └── README.md
│   │   │   ├── data-structure-analysis/
│   │   │   │   └── README.md
│   │   │   └── data-structure-comparison/
│   │   │       └── README.md
│   │   ├── architecture/
│   │   │   └── database/
│   │   │       └── README.md
│   │   ├── architecture-solution/
│   │   │   └── README.md
│   │   ├── decisions/
│   │   │   └── README.md
│   │   ├── migration/
│   │   │   ├── GUIDE_EXECUTION.md
│   │   │   ├── GUIDE_SIMPLE.md
│   │   │   ├── PHASE1_PREPARATION.md
│   │   │   └── README.md
│   │   ├── migration-guide/
│   │   │   └── README.md
│   │   ├── recap/
│   │   │   └── README.md
│   │   └── schema/
│   │       └── README.md
│   ├── deployment/
│   │   ├── DEPLOIEMENT_FINAL.md
│   │   ├── VPS_PORTAINER_NPM_OVH.md
│   │   ├── configuration/
│   │   │   └── CONFIGURATION_PORTS.md
│   │   ├── environment-variables/
│   │   │   └── README.md
│   │   ├── getting-started/
│   │   │   └── README.md
│   │   ├── portainer/
│   │   │   └── README.md
│   │   ├── production/
│   │   │   └── README.md
│   │   └── security/
│   │       └── README.md
│   ├── development/
│   │   ├── makefile/
│   │   │   └── README.md
│   │   └── makefile-commands/
│   │       └── README.md
│   ├── emails/
│   │   ├── MAIL.md
│   │   ├── PYTHON_EMAIL_SETUP.md
│   │   ├── README.md
│   │   └── SMTP_CONFIGURATION.md
│   ├── features/
│   │   └── SUIVI_BOITES_INTÉRIM.md
│   ├── frontend/
│   │   ├── GUIDE_ENREGISTREMENT_AUTOMATIQUE.md
│   │   ├── GUIDE_PAGE_DETAIL_SERVICE.md
│   │   ├── GUIDE_PREFERENCES_UTILISATEUR.md
│   │   ├── PERFORMANCE_OPTIMIZATION.md
│   │   └── README.md
│   ├── getting-started/
│   │   ├── ACCES_RESEAU_LOCAL.md
│   │   ├── DEMARRAGE.md
│   │   ├── DEMARRAGE_RAPIDE.md
│   │   ├── FIX_TABLE_USER.md
│   │   ├── GUIDE_EMOJIS.md
│   │   ├── GUIDE_INSTALLATION.md
│   │   ├── GUIDE_SETUP_COMPLET.md
│   │   ├── GUIDE_STRUCTURE.md
│   │   ├── QUICK_START_GUIDE.md
│   │   ├── README.md
│   │   └── REDEMARRAGE.md
│   ├── mobile/
│   │   ├── APPLICATION_MOBILE_A_FAIRE.md
│   │   ├── PROCHAINES_ETAPES.md
│   │   ├── README.md
│   │   └── analytics/
│   │       ├── DASHBOARD.md
│   │       ├── INTEGRATION.md
│   │       ├── PRIVACY.md
│   │       ├── README.md
│   │       ├── SUMMARY.md
│   │       └── TRACKING_UTILISATEUR.md
│   ├── monitoring/
│   │   ├── METRICS_DB_README.md
│   │   ├── MONITORING-GUIDE.md
│   │   ├── MONITORING_COMMANDS.md
│   │   ├── MONITORING_GUIDE.md
│   │   ├── PERFORMANCE_OPTIMIZATION.md
│   │   ├── QUICK_START_MONITORING.md
│   │   ├── README.md
│   │   └── metrics-flow.md
│   ├── operations/
│   │   ├── DOCKER_COMPOSE_ENV_CONVENTION.md
│   │   ├── PREPROD_PRODUCTION_CHECKLIST.md
│   │   └── PRE_VPS_ENV_AUDIT_AND_UPDATES.md
│   ├── performance/
│   │   ├── FINAL_PERFORMANCE_REPORT.md
│   │   ├── FIXES_AND_OPTIMIZATIONS.md
│   │   ├── FRONTEND_REPORTS_FINAL_ANALYSIS.md
│   │   ├── FRONTEND_REPORTS_SUMMARY.md
│   │   ├── PERFORMANCE_OPTIMIZATIONS_SUMMARY.md
│   │   ├── RAPPORT_PERFORMANCE.md
│   │   └── README.md
│   ├── scripts/
│   │   ├── README.md
│   │   └── deployment/
│   │       └── README.md
│   ├── security/
│   │   ├── ACTIVATION_WAF.md
│   │   ├── ARCHITECTURE_SECURITY_SERVICE.md
│   │   ├── COMPOSE_RUNTIME_HARDENING.md
│   │   ├── CVE_CONTINUOUS_MONITORING.md
│   │   ├── DEMARRAGE_SERVICES_SECURITE.md
│   │   ├── FIREWALL_PLAN.md
│   │   ├── README.md
│   │   ├── SECURITY_AUDIT.md
│   │   └── SYSTEME_SECURITE_README.md
│   ├── tests/
│   │   ├── BACKOFFICE_TESTS_COVERAGE.md
│   │   ├── COMMANDES_TESTS.md
│   │   ├── MOBILE_TESTS_README.md
│   │   ├── QUICK_START_MOBILE_TESTS.md
│   │   ├── RAPPORTS_CONVENTIONS.md
│   │   ├── README.md
│   │   ├── STRUCTURE_TESTS_MAKE_TEST.md
│   │   └── TESTS_END.md
│   ├── todo/
│   │   ├── README.md
│   │   └── TODO_PERFORMANCE.md
│   ├── troubleshooting/
│   │   ├── POSTGRES_MONITORING.md
│   │   ├── README.md
│   │   └── TROUBLESHOOTING_LOGIN.md
│   └── user-journey/
│       ├── GUIDE_COMPLET.md
│       ├── PARCOURS_METIER.md
│       └── README.md
├── flutter-mobile-app/
│   └── .dart_tool/
│       └── extension_discovery/
│           └── README.md
├── frontend/
│   ├── README.md
│   ├── src/
│   │   ├── app/
│   │   │   ├── README.md
│   │   │   └── (admin)/
│   │   │       └── backoffice/
│   │   │           └── analytics/
│   │   │               └── __tests__/
│   │   │                   └── README.md
│   │   └── lib/
│   │       └── i18n/
│   │           └── README.md
│   └── tests/
│       └── README.md
├── makefiles/
│   └── README.md
├── mobile/
│   └── README.md
├── monitoring/
│   ├── MIGRATION_RUST.md
│   ├── metrics-aggregator-c/
│   │   └── README.md
│   ├── monitoring-c/
│   │   ├── PERFORMANCE_GAINS.md
│   │   ├── README.md
│   │   ├── STORAGE.md
│   │   └── TESTING.md
│   └── rust/
│       └── README.md
├── reports/
│   └── env-audit/
│       └── README.md
├── scripts/
│   ├── README.md
│   └── monitoring/
│       └── README.md
├── tests/
│   ├── README.md
│   ├── e2e/
│   │   └── README.md
│   ├── monitoring/
│   │   └── README.md
│   ├── results/
│   │   └── resource-budget/
│   │       ├── 20260507-123510/
│   │       │   └── summary.md
│   │       ├── 20260507-123612/
│   │       │   └── summary.md
│   │       ├── 20260507-132438/
│   │       │   └── summary.md
│   │       ├── 20260507-133829/
│   │       │   └── summary.md
│   │       └── 20260507-161634/
│   │           └── summary.md
│   ├── services/
│   │   └── README.md
│   └── user-journey/
│       └── README.md
└── tools/
    ├── README.md
    └── emulator-controller/
        └── README.md
```

## Structure proposée à modifier

Proposition initiale : garder une racine courte, déplacer la documentation durable dans `docs/`, et laisser uniquement les `README.md` techniques au plus près du code.

```text
.
├── README.md
├── PLAN.md
├── STATUS.md
├── TODOS.md
├── ERRORS.md
├── RESOLUTIONS.md
├── STATS.md
├── FONCTIONNALITES.md
├── STRUCTURE_DOCUMENTATION.md
├── backend/
│   └── **/README.md              # README locaux de services uniquement
├── frontend/
│   └── **/README.md              # README locaux techniques uniquement
├── monitoring/
│   └── **/README.md              # README locaux + migration Rust si gardée près du code
├── tests/
│   ├── README.md
│   └── results/                  # artefacts générés ou historiques à décider
├── reports/
│   └── env-audit/
└── docs/
    ├── README.md
    ├── INDEX.md
    ├── project/
    │   ├── backlog.md
    │   ├── history.md
    │   ├── roadmap.md
    │   └── decisions.md
    ├── getting-started/
    ├── architecture/
    ├── api/
    ├── backend/
    ├── frontend/
    ├── mobile/
    ├── database/
    ├── security/
    ├── monitoring/
    ├── performance/
    ├── deployment/
    ├── operations/
    ├── tests/
    ├── emails/
    ├── scripts/
    ├── configuration/
    ├── troubleshooting/
    └── archive/
```

À compléter/valider :

- [ ] Fichiers à garder en racine
- [ ] Fichiers racine à déplacer dans `docs/project/`
- [ ] Dossiers `docs/` à garder
- [ ] Dossiers `docs/` à fusionner
- [ ] Dossiers `docs/` à renommer
- [ ] Fichiers à archiver
- [ ] Fichiers à supprimer
- [ ] README locaux à garder près du code
- [ ] Rapports générés à garder dans Git ou à exclure

## Points suspects à revoir

- Doublons probables : `MONITORING-GUIDE.md` vs `MONITORING_GUIDE.md`.
- Doublons probables : `CONFIGURATION_PORTS.md` dans `docs/configuration/` et `docs/deployment/configuration/`.
- Rapports datés sous `tests/results/` : à conserver comme artefacts ou déplacer hors Git si générés.
- `flutter-mobile-app/.dart_tool/.../README.md` : probablement généré, à vérifier avant conservation.
- Beaucoup de `README.md` imbriqués : utile pour GitHub, mais il faut décider lesquels sont des index durables.
- `docs/archive/` existe déjà : définir une règle de nommage et de justification.

## Plan de réorganisation à valider

1. Valider les fichiers autorisés en racine.
2. Valider les catégories définitives sous `docs/`.
3. Marquer chaque fichier actuel : garder / déplacer / fusionner / archiver / supprimer.
4. Mettre à jour les liens internes après déplacements.
5. Exécuter une recherche de liens cassés.
6. Commit par lots logiques : racine, `docs/`, services, tests/rapports.

## Tableau de décision

À remplir avant déplacement :

| Fichier | Action | Nouvelle cible | Notes |
|---|---|---|---|
| `docs/BACKLOG.md` | à décider |  | doublon potentiel avec `TODOS.md` / `PLAN.md` |
| `docs/HISTORIQUE.md` | à décider |  | peut aller dans `docs/project/` |
| `docs/RECAPITULATIF_PROJET_COMPLET.md` | à décider |  | peut être archive ou synthèse projet |
| `docs/RAPPORT_NETTOYAGE_MARS_2026.md` | à décider |  | rapport daté, probablement archive |
| `tests/results/resource-budget/*/summary.md` | à décider |  | artefacts générés |
| `flutter-mobile-app/.dart_tool/extension_discovery/README.md` | à décider |  | probablement généré |
