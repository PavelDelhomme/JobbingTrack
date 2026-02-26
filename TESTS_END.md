# 🧪 Répertoire des tests de fin de projet – JobbingTrack

**Objectif** : Liste exhaustive des vérifications à réaliser avant livraison / mise en production.

**État et priorités** : Pour savoir **ce qu’il reste à faire** et dans quel ordre, voir **STATUS.md** (section « À FAIRE (priorisé) »). Les tests API depuis Docker utilisent désormais `sh` au lieu de `bash` pour éviter « bash: not found » dans le conteneur.

**Validation des tests via Make** : Tous les tests doivent être lancés via le **Makefile** (racine du projet). Commandes principales : **`make test-api`**, **`make test-security`**, **`make test-frontend`**, **`make test-backend`**, **`make test-e2e`**, **`make test-performance`**, **`make tests-user-journey`**. Voir **`make tests-help`** et **`make help-tests`**. Détail dans **STATUS.md** section « Ce que vous pouvez tester (commandes make) ».

**Suite complète en une commande** : **`make test-full`** enchaîne : démarrage stack (`make up-full`), `npm install` (tests + frontend), puis **`make test-all`** (tous les tests avec rapports). En cas d’échec **EACCES** sur `frontend/node_modules` (Playwright / Jest frontend) : exécuter `sudo chown -R $(whoami) frontend/node_modules` puis relancer. Les tests **Enums** sont alignés sur le schéma Prisma (seuls les vrais enums sont validés ; ApplicationStatus / EventType sont des modèles et sont ignorés).

---

## 1. Authentification et utilisateurs

- [ ] Connexion avec identifiants valides (admin, user)
- [ ] Déconnexion et invalidation du token
- [ ] Refresh token et expiration
- [ ] Inscription (validation email si activée)
- [ ] Réinitialisation mot de passe
- [ ] Rôles (USER, ADMIN, SUPER_ADMIN) et restrictions d’accès
- [ ] Profil utilisateur : lecture et mise à jour
- [ ] Table `User` et tables liées présentes en base (`make db-push-auth` ou `make db-push-all`)

---

## 2. API et microservices

- [ ] API Gateway : routage vers auth, application, company, contact, etc.
- [ ] Health checks de chaque service (GET /health ou équivalent)
- [ ] CORS et headers pour le frontend
- [ ] Gestion des erreurs (4xx, 5xx) et messages cohérents
- [ ] Rate limiting / WAF si configurés

---

## 3. Base de données

- [ ] PostgreSQL accessible (port, DATABASE_URL)
- [ ] Migrations / schémas à jour (`make db-migrate`, `make db-push-all`)
- [ ] Tables auth (User, etc.) créées
- [ ] Tables metrics (system_metrics ou system_metrics_snapshots, container_metrics) créées
- [ ] Pas d’erreur « table does not exist » en conditions normales
- [ ] Sauvegarde / restauration (scripts ou procédure documentée)

---

## 4. Monitoring et métriques

- [ ] monitoring-c (ou ex-systems/monitoring-c) : conteneur démarré, endpoint `/api/v1/metrics`
- [ ] metrics-aggregator-service : démarré, DATABASE_URL définie
- [ ] Persistance : écriture dans PostgreSQL (snapshots ou system_metrics)
- [ ] API historique : GET `/api/v1/persistence/system/metrics` avec limit, startDate, endDate
- [ ] Données affichées dans Performances & Analytics (CPU, mémoire, réseau, disponibilité)
- [ ] Plage personnalisée (date/heure début–fin) fonctionnelle
- [ ] Temps de réponse moyen affiché (Vue d’ensemble, Analytics)

---

## 5. Frontend – Structure et routes

- [ ] Route `/backoffice` : dashboard admin
- [ ] Route `/analytics` ou `/backoffice/analytics` : page Performances & Analytics (une source de vérité documentée)
- [ ] Routes protégées : redirection vers login si non authentifié
- [ ] Mode clair / sombre cohérent
- [ ] Responsive (mobile, tablette, desktop)

---

## 6. Frontend – Pages et fonctionnalités

- [ ] Vue d’ensemble : CPU, mémoire, temps de réponse, services
- [ ] Liste des services : statut, health, actions si présentes
- [ ] Statistiques : données cohérentes avec l’API
- [ ] Analytics : graphiques (CPU, mémoire, réseau, disponibilité, par service)
- [ ] Sélecteur de plage date/heure (presets + personnalisée) lisible et utilisable
- [ ] Gestion utilisateurs (liste, création, édition, désactivation)
- [ ] Pages sécurité (firewall, menaces, réseau) si implémentées
- [ ] Pas de références à des services non démarrés (erreurs console minimales)

---

## 7. Sécurité

- [ ] security-service : healthcheck OK
- [ ] WAF / règles API Gateway opérationnelles
- [ ] Firewall (FIREWALL_PLAN.md) : étapes implémentées documentées
- [ ] Pas de secrets en clair dans le code ou le repo
- [ ] Variables sensibles dans .env (non commité)

---

## 8. Docker et déploiement

- [ ] `docker compose up` (ou make up-full) démarre les services essentiels
- [ ] Build monitoring-c : `context: ./ex-systems/monitoring-c` si applicable
- [ ] Volumes et réseaux corrects
- [ ] Healthchecks Docker définis pour les services critiques
- [ ] make db-push-all exécutable sans erreur (DATABASE_URL chargée pour metrics-aggregator)

---

## 9. Makefile et scripts

- [ ] `make db-push-auth` : crée les tables auth
- [ ] `make db-push-metrics` : schéma metrics-aggregator (DATABASE_URL depuis .env)
- [ ] `make db-push-all` : tous les schémas (y compris metrics-aggregator avec .env chargé)
- [ ] `make git-checkout` : script interactif de navigation Git
- [ ] Scripts dans `scripts/` exécutables et documentés si nécessaire

---

## 10. Données et cohérence

- [ ] Données de test (seed) optionnelles et documentées
- [ ] Pas de doublon d’appels métriques (une source : aggregator ou monitoring-c)
- [ ] Format des réponses API (success, data, count) cohérent
- [ ] Timestamps et fuseaux corrects (UTC / ISO)

---

## 11. Documentation et statut

- [ ] README à jour (installation, démarrage, variables)
- [ ] STATUS.md reflétant l’état actuel (fait / en cours / à faire)
- [ ] ERRORS.md / RESOLUTIONS.md pour les erreurs connues et solutions
- [ ] Organisation des routes frontend (admin vs backoffice) documentée ou unifiée

---

## 12. Tests automatisés

### Architecture de test (USER / ADMIN / SYSTEM)

Les rapports de tests (terminal, HTML, texte) affichent le **type d'utilisateur** par test :
- 👤 **USER** : tests fonctionnels simulant l'app mobile (API, mobile E2E, user journey)
- 👑 **ADMIN** : tests backoffice, archivage, emails, data management
- ⚙️ **SYSTEM** : tests BDD, enums, relations, health checks

Helpers centralisés :
- **Jest API** : `getTestUser()` (USER) / `getAdminUser()` (ADMIN) dans `tests/helpers/auth.helper.js`
- **Playwright E2E** : `ensureTestUser()` / `getAdminToken()` / `loginAsAdmin()` dans `test-data-helper.ts`
- **Config** : `testUser` (USER) / `adminUser` (SUPER_ADMIN) dans `test-config.js`

### Email de test réel

L'adresse `test@delhomme.ovh` vérifie la **réception réelle** des emails. Credentials dans `.env` (gitignored) :
- `TEST_REAL_EMAIL`, `TEST_REAL_EMAIL_PASSWORD`, `TEST_REAL_EMAIL_IMAP_HOST`, `TEST_REAL_EMAIL_IMAP_PORT`

### Checklist

- [ ] **Tests unitaires (backend, frontend)** : harmoniser et compléter la couverture.
- [ ] Tests unitaires passants
- [x] Tests E2E Playwright sur parcours critiques (233+ tests frontend, 4 suites MailHog/CRUD/securite)
- [ ] Tests d'accessibilité (a11y) sur les pages principales
- [ ] Aucune régression majeure après modifications
- [x] Tests Email Workflows : inscription + verification email, reset password complet (MailHog)
- [x] Tests CRUD Donnees Admin : 7 entites (entreprise, contact, candidature, entretien, relance, appel, evenement) + archivage/restauration
- [x] Tests CRUD Utilisateurs Admin : lister, creer, modifier role, desactiver
- [x] Tests Securite Backoffice : firewall CRUD, IPs bloquees, menaces, WAF, logs securite
- [ ] Tests E2E mobile : adapter les 7 fichiers mobile-*.spec.ts a la vision mobile finalisee (section 9 FONCTIONNALITES.md)

**Après `make test-full`** : vérifier le rapport (`tests/results/.../report.html`). Chaque test affiche son badge utilisateur (ADMIN/USER/SYSTEM). Si EACCES : `sudo chown -R $(whoami) frontend/node_modules` puis relancer.

---

## 13. Tests à compléter / à ajouter (nouveaux)

**Référence** : STATUS.md (sections 2, 11, 12), `docs/database/`, scripts dans `tests/` et `scripts/`.

### Tests unitaires (à mettre à jour / à compléter)
- [ ] **Tests unitaires frontend** : couverture des composants et pages (pas seulement analytics) ; aligner `npm run test:unit` / `make test-frontend` avec les specs.
- [ ] **Tests unitaires centralisés** : compléter `tests/unit` (utils + cas métier) ; harmoniser avec les tests par service backend.
- [ ] **Suite unitaire backend** : centraliser ou documenter les tests par service (auth, api-gateway, profile, etc.) et les faire passer dans la CI / rapports.

### Tests API / Backend
- [ ] **Tests API** : `make test-api` — en Docker, `MONITORING_C_URL=http://monitoring-c:8015` et `API_GATEWAY_URL` sont passés ; tests email avec timeout court (5 s) si SMTP indisponible.
- [ ] **Tests Contact** : endpoints CRUD contact, création depuis candidature, liaison entreprise (voir docs/database).
- [ ] **Tests Relance** : endpoints CRUD relance (FollowUp), liaison candidature, statuts.
- [ ] **Tests Entretien** : endpoints CRUD entretien (Interview), liaison candidature/entreprise, statuts (status vs statusId si migration).
- [ ] **Tests Notifications** : endpoints notifications (liste, création, statut).
- [ ] **Tests Appel** : endpoints CRUD appel (Call), liaison contact/entreprise/candidature.
- [ ] **Tests Intégration** : parcours complet (création utilisateur → candidature → contact → relance → entretien → appel) avec utilisateur réel (token admin ou créé), pas `dev_user_1` fictif.
- [ ] **Tests Sécurité** : firewall_rules, security_alerts (tables créées par `make db-push-all` via init-key-tables.sql), endpoints security-service sans erreur « relation does not exist ».

### Scénarios et parcours
- [ ] **User journey** : historique des scénarios exécutés (création utilisateur, contact, candidature, etc.) ; scénarios qui utilisent un utilisateur existant (admin ou créé) et non un `userId` fictif.
- [ ] **Création automatique env de test depuis l'interface** : tout géré depuis le backoffice (Tests API, Tests Backend, User journey) — création automatique d'un utilisateur de test et des données nécessaires au lancement des tests, sans que l'utilisateur doive modifier les scripts ou lancer `make create-admin-user` à la main. Un clic « Lancer les tests » doit préparer l'environnement (compte de test, BDD/seed) puis exécuter.
- [ ] **Playwright** : scénarios E2E (backoffice, parcours, test-data) opérationnels et rapports visibles.
- [ ] **Test Data (backoffice)** : interface `/backoffice/test-data` pour générer des données de test (BDD, appels API) et la lier aux tests d’interface / backoffice.

### Base de données et schéma
- [ ] **Schéma aligné** : `User.verificationToken` / `verificationTokenExpiry` présents en BDD (`make db-push-all`) ; si migration `status` → `statusId` sur Application/Interview, aligner tous les services et Prisma (auth-service vs application-service/interview-service).
- [ ] **Tables sécurité** : `firewall_rules`, `security_alerts` créées (init-key-tables.sql exécuté dans db-push-all).

### Emails et historique
- [ ] **Historique des mails** : page `/backoffice/emails/logs` et API `GET /api/v1/emails/logs` opérationnelles ; tests email (POST test, GET test-smtp) passent ou sont ignorés gracieusement si SMTP non configuré (timeout 5 s).

### Design et interface des tests
- [ ] **Design unifié** : reprendre le design de la page Tests Backend (progression, logs en direct, statuts par test) pour les autres pages de lancement de tests (Tests API, Tests Frontend, Tests Backoffice, etc.) si pas déjà fait.

---

## 14. À vérifier en fin de projet – Rétrocompatibilité

Une fois le projet finalisé, vérifier la **rétrocompatibilité** de l’ensemble (APIs, BDD, frontend, app mobile) :

- [ ] **APIs** : Les contrats (routes, corps de requête/réponse, codes HTTP) restent stables entre versions ; pas de breaking change non documenté. Versioning `/api/v1/` respecté.
- [ ] **Schémas BDD** : Les migrations Prisma (ou scripts SQL) sont réversibles ou documentées ; pas de suppression de colonne/tables sans migration de données. `make db-push-all` applique un état cohérent sur tous les services.
- [ ] **Frontend / Backoffice** : Les pages et appels API restent compatibles avec la version déployée du gateway et des services. Pas de dépendance à des champs API supprimés ou renommés sans adaptation.
- [ ] **App mobile** : Si connectée, elle fonctionne avec la version actuelle des APIs (auth, candidatures, entreprises, etc.) ; deep links et versions d’app gérés côté backend/analytics si utilisé.
- [ ] **Tests** : Tous les tests (API, backend, frontend, backoffice, sécurité, performance, user-journey) passent après les dernières modifications ; les rapports générés sont cohérents (totaux, statuts, pas de « unknown »).
- [ ] **Données existantes** : En cas de montée de version BDD (nouvelle colonne, table), les données existantes restent lisibles et les seeds/scripts ne cassent pas l’existant.

**Utilisation** : cocher chaque point au fur et à mesure. Ce fichier sert de checklist finale avant livraison ou merge.

---

## 15. Backoffice administrateur – couverture complète

Objectif : pouvoir **tester absolument tout** le backoffice admin (toutes les pages, toutes les fonctionnalités). Voir **ERRORS.md** pour les erreurs connues par page et **STATUS.md** § « Erreurs backoffice ».

### Pages à parcourir et vérifier
- [ ] **Vue d’ensemble** : CPU, mémoire, temps de réponse, services, health
- [ ] **Analytics** : Performances (CPU, mémoire, disque, réseau), Réseau, Conteneurs (métriques par conteneur), Application
- [ ] **Logs** : Services → Logs (logs agrégés, filtres niveau/service/erreurs), Security → Logs (logs sécurité)
- [ ] **User Analytics** : stats par utilisateur, événements, sessions, erreurs, versions (tables user_events, user_sessions, etc. à créer si utilisées)
- [ ] **Archives / Corbeille** : liste par service (company, user, application, etc.) — certains services renvoient 404/500 « ne supporte pas les archives »
- [ ] **Gestion utilisateurs** : liste, création, édition, désactivation, analytics par user
- [ ] **Génération de données de test** : page test-data, création companies/applications/contacts/interviews/events/followups/calls
- [ ] **Émulateur mobile** : page mobile-emulator
- [ ] **Parcours utilisateur** : parcours personnalisé, parcours prédéfinis (admin / user), sauvegarde rapports, lien « Voir les rapports de parcours »
- [ ] **Tests** : hub Tests, Tests API, Tests Backend, Tests Frontend, Tests Backoffice, Tests Sécurité, Performance, Programmer tests (schedule)
- [ ] **API Tester** : page api-tester
- [ ] **Email Monitor** : configuration, délivrabilité, historique, templates
- [ ] **Services** : liste des services, détail par service (métriques, logs temps réel, requêtes) — Loki optionnel (ENOTFOUND si non déployé)

### Fonctionnalités transverses
- [ ] Logs en temps réel par service (endpoints logs par conteneur)
- [ ] Monitoring unitaire par service (métriques, health)
- [ ] Rapports de parcours (user-journey) enregistrés et listés (répertoire en Docker : `/tmp/user-journey-reports` ou `USER_JOURNEY_REPORTS_DIR`)
- [ ] Parcours admin vs user : analytics et scénarios distincts
- [ ] Pas d’erreur 500 sur les pages listées (BigInt, container_logs, ENOENT save-report corrigés ; user_events / Loki / archives documentés)
