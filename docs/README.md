# Documentation JobbingTrack

[Retour au README principal](../README.md) | [Navigation](navigation.md) | [Index](INDEX.md)

Dernière mise à jour : 21 mai 2026

Ce dossier centralise la documentation projet. Les fichiers de pilotage restent a la racine de `docs/`; les documents de fond sont ranges par domaine.

## A lire en premier

- [Getting started](getting-started/README.md) : installation, demarrage et acces utiles.
- [../PILOTAGE.md](../PILOTAGE.md) : point d’entrée obligatoire avant nouvelle tâche.
- [../TODOS_A_VALIDER.md](../TODOS_A_VALIDER.md) : validations porteur bloquantes.
- [../TODOS_A_VERIFIER.md](../TODOS_A_VERIFIER.md) : vérifications techniques agent.
- [STATUS.md](STATUS.md) : etat courant reel du projet.
- [TODOS.md](TODOS.md) : prochaines actions, avec les taches a faire en premier.
- [PLAN.md](PLAN.md) : plan d'execution par lots.
- [BACKLOG.md](BACKLOG.md) : sujets reportes ou larges.
- [ERRORS.md](ERRORS.md) : erreurs connues et risques suivis.
- [RESOLUTIONS.md](RESOLUTIONS.md) : correctifs et decisions deja appliques.

## Validation et production

Les cases cochees dans `TODOS.md` signifient surtout "fait dans le depot" ou "procedure disponible". Elles ne remplacent pas une validation produit.

- [À valider par le porteur](../TODOS_A_VALIDER.md) : validations locales/visuelles/fonctionnelles qui bloquent la suite.
- [Validé par le porteur](../TODOS_DONE.md) : éléments déjà acceptés.
- [À valider avant production](../A_VALIDER_AVANT_PRODUCTION.md) : gate préprod/prod.
- [Déploiement production](../DEPLOIEMENT_PRODUCTION.md) : éléments déployés mais pas encore validés production.
- [Validation production](../VALIDATION_PRODUCTION.md) : validations préprod/prod réelles.
- [Audit sécurité projet](security/AUDIT_SEC_PROJECT.md) : risques sécurité, P0, rapports et suites attendues.
- [Branches et commits](../BRANCHES.md) : conventions de branches et commits.
- [Release preprod / production](operations/RELEASE_PREPROD_PRODUCTION_PLAN.md) : chemin vers preprod, beta, prod, RGPD et release.
- [Checklist preprod / production](operations/PREPROD_PRODUCTION_CHECKLIST.md) : controles operationnels.

## Structure actuelle

```text
docs/
├── README.md
├── INDEX.md
├── navigation.md
├── STATUS.md
├── PLAN.md
├── TODOS.md
├── BACKLOG.md
├── ERRORS.md
├── RESOLUTIONS.md
├── administration/
├── api/
├── architecture/
├── archive/
├── changelog/
├── ci-cd/
├── configuration/
├── core/
├── database/
├── deployment/
├── development/
├── emails/
├── features/
├── frontend/
├── getting-started/
├── mobile/
├── monitoring/
├── operations/
├── performance/
├── project/
├── scripts/
├── security/
├── tests/
├── todo/
├── troubleshooting/
└── user-journey/
```

Les dossiers `archive/` et certains rapports PDF sont historiques ou generes. Ne pas les utiliser comme source de verite sans verifier `STATUS.md`, `TODOS.md` et les documents de domaine recents.

## Domaines principaux

### Produit et pilotage

- [Fonctionnalites](project/FONCTIONNALITES.md)
- [Historique](project/HISTORIQUE.md)
- [Recapitulatif projet](project/RECAPITULATIF_PROJET_COMPLET.md)
- [Structure documentation](project/STRUCTURE_DOCUMENTATION.md)
- [Chantier securite / data / docs](project/CHANTIER_SECURITE_DATA_DOCS.md)

### Architecture et API

- [Architecture microservices](core/architecture/README.md)
- [Services backend](core/services/README.md)
- [Decisions architecture](architecture/decisions/README.md)
- [Architecture metriques](architecture/metrics/README.md)
- [API](api/README.md)
- [Reference API](api/api-reference/README.md)
- [Endpoints](api/endpoints/README.md)

### Base de donnees

- [Database README](database/README.md)
- [Verification BDD](database/DATABASE_VERIFICATION.md)
- [Relations](database/relations.md)
- [Migration](database/migration/README.md)
- [Analyses BDD](database/analysis/README.md)
- [Schema](database/schema/README.md)

### Securite

- [Security README](security/README.md)
- [Stats CVE / supply chain](security/STATS.md)
- [Matrice tests securite](security/SECURITY_TESTING_MATRIX.md)
- [Monitoring CVE continu](security/CVE_CONTINUOUS_MONITORING.md)
- [Dependabot alerts](security/DEPENDABOT_ALERTS_INTEGRATION.md)
- [Architecture security-service](security/ARCHITECTURE_SECURITY_SERVICE.md)
- [Compose runtime hardening](security/COMPOSE_RUNTIME_HARDENING.md)

### Frontend et backoffice

- [Frontend README](frontend/README.md)
- [Optimisations frontend](frontend/PERFORMANCE_OPTIMIZATION.md)
- [Preferences utilisateur](frontend/GUIDE_PREFERENCES_UTILISATEUR.md)
- [Page detail service](frontend/GUIDE_PAGE_DETAIL_SERVICE.md)
- [Administration](administration/README.md)
- [Gestion utilisateurs](administration/GUIDE_GESTION_UTILISATEURS.md)

Points actifs a suivre dans `TODOS.md` :

- HTTPS local backoffice et confiance CA dev.
- Navigation `/b4ck0ff1ce/performances` et cout du premier chargement.
- Audit des pages admin qui lisent encore directement `NEXT_PUBLIC_API_URL`.

### Monitoring et performance

- [Monitoring README](monitoring/README.md)
- [Guide monitoring](monitoring/MONITORING_GUIDE.md)
- [Flux metriques](monitoring/metrics-flow.md)
- [Commandes monitoring](monitoring/MONITORING_COMMANDS.md)
- [Rapport monitoring Rust / C](../monitoring/RAPPORT_MONITORING_GOOD_PRACTICE_GO_AND_C.md)
- [Performance README](performance/README.md)
- [Rapport performance](performance/RAPPORT_PERFORMANCE.md)
- [TODO performance](todo/TODO_PERFORMANCE.md)

### Deploiement, operations et configuration

- [Deployment getting started](deployment/getting-started/README.md)
- [Production](deployment/production/README.md)
- [Securite deployment](deployment/security/README.md)
- [Portainer](deployment/portainer/README.md)
- [Variables d'environnement](deployment/environment-variables/README.md)
- [Configuration ports](configuration/CONFIGURATION_PORTS.md)
- [HTTPS local dev](operations/DEV_HTTPS.md)
- [Convention Docker Compose / env](operations/DOCKER_COMPOSE_ENV_CONVENTION.md)
- [CI/CD](ci-cd/README.md)

### Tests, scripts et rapports

- [Tests README](tests/README.md)
- [Structure tests](tests/STRUCTURE_TESTS_MAKE_TEST.md)
- [Commandes tests](tests/COMMANDES_TESTS.md)
- [Couverture backoffice](tests/BACKOFFICE_TESTS_COVERAGE.md)
- [Conventions rapports](tests/RAPPORTS_CONVENTIONS.md)
- [Scripts README](scripts/README.md)
- [Inventaire scripts](scripts/SCRIPTS_INVENTORY.md)
- [Audit scripts non references](scripts/NON_REFERENCED_SCRIPTS_AUDIT.md)

### Emails, mobile et parcours utilisateur

- [Emails README](emails/README.md)
- [SMTP](emails/SMTP_CONFIGURATION.md)
- [Mail](emails/MAIL.md)
- [Mobile README](mobile/README.md)
- [Analytics mobile](mobile/analytics/README.md)
- [User journey README](user-journey/README.md)
- [Guide complet parcours utilisateur](user-journey/GUIDE_COMPLET.md)
- [Parcours metier](user-journey/PARCOURS_METIER.md)

### Depannage

- [Troubleshooting README](troubleshooting/README.md)
- [Depannage login](troubleshooting/TROUBLESHOOTING_LOGIN.md)
- [Postgres monitoring](troubleshooting/POSTGRES_MONITORING.md)
- [Changelog](changelog/README.md)

## Regles de maintenance

- Mettre les prochaines actions dans `TODOS.md`, pas dans ce README.
- Mettre les validations porteur dans `../TODOS_A_VALIDER.md`.
- Ne pas versionner de secrets, rapports generes sensibles ou artefacts locaux.
- Ne pas documenter un contournement HTTP/TLS comme solution de securite.
- Quand un dossier est archive ou legacy, le dire explicitement au lieu de le presenter comme actif.
- Si un lien devient faux apres deplacement, corriger ce fichier dans le meme lot.
