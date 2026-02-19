# 📊 État du Projet JobbingTrack

**Dernière mise à jour** : Février 2026

---

## 📌 Résumé rapide

| Fait / validé | À faire en priorité |
|---------------|---------------------|
| Admin créé automatiquement par `make up-full` (ou `make create-admin-user` si besoin), rapport tests API, tests sécurité, synchro Prisma (up-full), db-push-all (9 services + init-system-metrics + init-key-tables), relances/événements/notifications (onglets data), export données (gateway branché), firewall (règles/statut/logs en BDD + backoffice), **navigation** Tableau de bord et Sécurité simplifiée (plus de double entrée), **onglet Stats utilisateur** branché sur API analytics | SMTP 503, logs emails 404, API versions 404 ; import/cleanup données (501) ; tests unitaires à compléter ; **validation de tous les tests via make** ; **sécurité : vraie config WAF et vraie détection** (actuellement faux/mock) ; design pages test ; abonnement/facturation (non implémenté) ; onglet Données test (filtre API à ajouter) |

Les éléments **déjà corrigés ou en place** sont détaillés dans la section **« ✅ DÉJÀ CORRIGÉ / EN PLACE »** ci-dessous. Les **actions immédiates** sont dans **« 🔴 À FAIRE MAINTENANT »**.

---

## 🔴 À FAIRE MAINTENANT (actionnable)

| Priorité | Action | Détail |
|----------|--------|--------|
| 1 | **Vérifier l’admin (déjà créé par `make up-full`)** | L’admin est **créé automatiquement** à la fin de **`make up-full`** si absent (`CREATE_ADMIN_IF_MISSING=1` par défaut). Vous n’avez **pas besoin** de lancer `make create-admin-user` sauf si la création auto a échoué ou si vous avez fait `CREATE_ADMIN_IF_MISSING=0 make up-full`. Vérification : `docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT email FROM \"User\" WHERE email = 'admin@jobbingtrack.com';"` — si vide, lancer **`make create-admin-user`**. Identifiants : `admin@jobbingtrack.com` / `password123`. |
| 2 | **Valider les tests API** | Backoffice > Tests > Tests API. Vérifier le rapport (table détaillée + logs services). Si login 401 : vérifier que l’admin existe (étape 1). |
| 3 | **Corriger les erreurs restantes** | SMTP 503, logs emails 404, API versions 404 (voir section 1 ci‑dessous). À traiter en priorité après validation des corrections ci‑dessous. |

**Comportement connu** : après `make up-full`, l’admin est en principe **déjà créé** (message « ✅ Utilisateur administrateur existe » ou création auto). Si la création auto avait échoué (ex. colonne `id` manquante), c’est corrigé dans `create-admin-user.sh`. En cas de doute : **`make create-admin-user`** (idempotent), puis connexion avec `admin@jobbingtrack.com` / `password123`.

---

## 🧪 Ce que vous pouvez tester (commandes make)

Toutes les commandes ci-dessous sont à lancer depuis la **racine du projet**. Les tests doivent être **validés via le Makefile** (pas de commandes manuelles sauf si indiqué).

| Commande | Description |
|----------|-------------|
| **`make help`** | Aide complète + liste des aides par catégorie |
| **`make help-db`** | Aide base de données (db-push-all, migrations, admin) |
| **`make help-tests`** | Aide globale tests (workflow, tests-reset, tests-user-journey) |
| **`make help-test`** | Aide détaillée des commandes make test-* |
| **`make tests-help`** | Guide des tests (makefiles/tests) |
| **`make test-api`** | Tests API (gateway, services) — en Docker : variables MONITORING_C_URL, API_GATEWAY_URL passées |
| **`make test-security`** | Tests sécurité (backoffice ou script) |
| **`make test-frontend`** | Tests frontend (Jest unit) |
| **`make test-backend`** | Tests backend (services) |
| **`make test-e2e`** | Tests E2E Playwright |
| **`make test-performance`** | Tests performance |
| **`make tests-user-journey`** | Parcours utilisateur via API |
| **`make db-push-all`** | Synchroniser schémas Prisma + tables monitoring/sécurité |

**À valider en fin de session** : lancer les cibles ci-dessus et confirmer que celles attendues passent (ou documenter les échecs dans STATUS / TESTS_END). Les **tests unitaires** et la **suite de tests** restent **non à jour / à compléter** (voir section 2 Tests).

---

## ✅ DÉJÀ CORRIGÉ / EN PLACE (à valider)

- **Rapport de tests API** : Résumé, table « Résultats détaillés par test », section « Logs des services » en bloc **dépliable** (`<details>`) pour ne pas masquer la fin du rapport ; libellé « Détail de l’exécution · Fin du rapport » ; échappement des guillemets dans les logs pour éviter les erreurs d’affichage ; 50 lignes max par service. Cibles Make **test-frontend** et **test-e2e** ajoutées (makefiles/tests/Makefile) pour le backoffice.
- **Tests Frontend/Backend/Backoffice (500)** : En Docker, run-frontend/run-backend/run-backoffice exécutent des commandes in-container : `npm run test:unit`, `cd /app/tests && npm run test:backend`, `npm run test:e2e`. Volume `./tests:/app/tests:ro` ajouté au frontend.
- **Synchro Prisma (up-full)** : Second `db-push-all` après démarrage de tous les services (profil full) pour que les conteneurs microservices soient démarrés au moment de la synchro.
- **Tests Sécurité** : Nav backoffice « Tests Sécurité » → `/backoffice/tests-security` ; API `POST /api/test/run-security` ; cible Make `test-security` (makefiles/tests/Makefile).
- **Persistance agrégateur** : 21 conteneurs (filtre JobbingTrack). Logs « Sauvegarde de 21 conteneurs en BDD » attendus.
- **Ports call / notification** : API Gateway utilise bien **3008** pour call-service et notification-service (plus 3006).
- **Vérification admin dans `make up-full`** : Comptage trimmé (`psql -t -A` + `tr`), création auto si absent (`CREATE_ADMIN_IF_MISSING=1`). Désactiver avec `CREATE_ADMIN_IF_MISSING=0 make up-full`.
- **Script `create-admin-user`** : INSERT inclut la colonne **`id`** (CUID-like) pour respecter la contrainte NOT NULL sur `User.id`. Plus d’erreur « null value in column "id" ».
- **Tests API (gateway + script)** : Routes `/api/v1/health` et proxy `/api/v1/metrics` ; tests services via gateway (401 sans token) ; profils en `/api/v1/profile/me` ; date événement POSIX.
- **Gestion des données – Export** : L’onglet « Gestion Données » (Export/Import) utilisait une mauvaise URL (8080). **Correction** : `DataManagementTab` appelle désormais l’API Gateway (5002). Routes **`GET /api/v1/admin/export/:type`** (applications, companies, contacts, all) branchées dans le gateway (data-management.controller) ; **import** et **cleanup** renvoient 501 (non implémentés) avec message clair.
- **Gestion des données – Onglets** : **Stats utilisateur** : branché sur `GET /api/v1/analytics/stats/:userId` (dashboard-service), affichage sessions/événements/erreurs + lien vers Analytics utilisateur. **Abonnement & facturation** : placeholder (non implémenté, hors scope ou à prévoir). **Données test** : placeholder avec bouton « Générer des données de test » (lien `/backoffice/test-data`) ; filtre API isTestData à implémenter pour table dédiée.
- **Navigation backoffice** : **Tableau de bord** et **Sécurité** : suppression de la double entrée (un item parent « Tableau de bord » / « Sécurité » qui dupliquait la section). Les sections affichent maintenant directement les liens (Vue d’ensemble, Statistiques, Performances… ; Logs, Politiques, Firewall, Réseau, Menaces) sans sous-menu redondant.
- **Commandes make d'aide** : **Toutes opérationnelles.** `make help` affiche l’aide complète et une section **« Aide par catégorie »** listant : `make help-db` (alias `help-database`), `make help-tests`, `make help-test`, `make help-migrate`, `make help-frontend`, `make help-backend`, `make help-services`, `make help-utils`, `make help-diagnostic`, `make help-compilation`, `make help-documentation`, `make help-mobile`. Chaque sous-Makefile (database, tests, frontend, etc.) définit sa cible `help-*` ; tout est inclus depuis le Makefile racine.
- **db-push-all (affichage)** : L’affichage est **cohérent** : une ligne intro indique que db-push-all comporte **3 parties** (1 = Prisma db push, 2 = tables monitoring, 3 = tables sécurité). Les parties 2 et 3 ne sont pas des « étapes optionnelles » : ce sont les **parties 2 et 3 de la même commande** (init-system-metrics.sql puis init-key-tables.sql). Libellés : « Partie 1/3 », « Partie 2/3 », « Partie 3/3 » pour éviter toute confusion.

---

## ⏳ À FAIRE (priorisé – par où commencer)

Cette section liste **tout ce qu’il reste à faire**. Traiter dans l’ordre ci‑dessous.

### Ordre conseillé
1. **Vérifier l’admin** : normalement **déjà créé** par `make up-full`. Si besoin : `make create-admin-user`, puis tests API depuis le backoffice.
2. **Erreurs restantes** : SMTP 503, logs emails 404, API versions 404 (section 1).
3. **Sécurité, emails, tests Playwright/Backend**, puis le reste de la liste.
4. **Métier, scénarios, mobile** : sections **11** (APIs + workflows : candidature → à relancer, statuts auto, relances ; statuts Application, Interview, Relance, etc. — **docs/database/** : schema, ACTIONS_ET_MODIFICATIONS, relations), **12** (scénarios Playwright/API/parcours), **13** (application mobile).
5. **Observabilité** : section **9** — tout le trafic (API, mobile, backend, émulateur, mails, user journey, tests) répertorié dans log-collector + monitoring + metrics-aggregator ; **Sécurité** (section 3), **Gestion mail** (section 4), **Redémarrage / config / logs** (section 6) restent à finaliser.
6. **Design pages de test + Firewall** : reprendre le design Tests Backend (progression, logs) pour Tests API, Frontend, Backoffice (TESTS_END.md § 13) ; finaliser Firewall (section 3).

**Récap à faire (avancer le projet)** :
- **Tests** : Compléter et mettre à jour les tests unitaires (frontend, backend, tests/unit). Valider que **toutes les commandes make test-*** (test-api, test-security, test-frontend, test-backend, test-e2e, test-performance) s’exécutent et passent (ou documenter les échecs). Voir TESTS_END.md et docs/tests/TESTS_COMPLETS_RAPPORT.md.
- **Sécurité** : Remplacer la **config WAF et la détection actuelles (faux/mock)** par une **vraie configuration WAF** et une **vraie détection** (intrusions, menaces) branchées sur les APIs et la BDD.
- **Gestion des données** : Onglet **Données test** : implémenter le filtre API (isTestData ou utilisateur de test) pour afficher une table « données test uniquement ». **Abonnement & facturation** : implémenter ou documenter hors scope.
- **Lancer les tests** : Utiliser la section **« Ce que vous pouvez tester (commandes make) »** ci-dessus ; en fin de session, lancer les make test-* et valider ou noter les échecs.

---

### 1. Erreurs à résoudre en premier

**Corrigé (à retester) :**
- **Tests API depuis Docker** : (1) **`sh`** + chemins absolus, (2) **`PROJECT_ROOT=/app`** et volume **`./scripts:/app/scripts:ro`**, (3) **Permission denied** → **`TESTS_RESULTS_DIR=/tmp/tests/results`**, (4) **passage de la commande** en guillemets simples à `generate-test-report.sh`. (5) **Rapport** : `test-api-specific.sh` sans `set -e` + syntaxe POSIX (plus de `<<<`, script invoqué en `sh`) → plus d'erreur « unexpected redirection » → tous les tests exécutés, rapport avec vrai total. Libellés rapport : « Tests exécutés », « Statistiques: Tests exécutés: X | Réussis: Y | Échoués: Z ».
- **Persistance agrégateur** : filtre JobbingTrack appliqué dès la conversion monitoring C → `containerMetrics` → « Sauvegarde de 21 conteneurs en BDD » (plus 31). Rebuild metrics-aggregator conseillé.

**Encore à faire :**
- **Configuration des emails** : **Rien de fait côté backend/front.** Configurer SMTP (auth-service ou service dédié), test SMTP opérationnel, écrans Configuration SMTP et Déliverabilité dans le backoffice. Actuellement le front peut afficher un message « Service SMTP indisponible » mais le flux n’est pas implémenté.
- **Logs emails** : **À faire.** Page Historique des emails (`/backoffice/emails/logs`) et API `GET /api/v1/emails/logs` à brancher et vérifier ; afficher les envois et statuts.
- **Analytics utilisateur – versions** : `GET /api/v1/analytics/stats/:userId/versions` — vérifier que la route est exposée par le gateway et que le front reçoit les données (404 = à corriger).
- **Tables manquantes** (si erreurs Postgres) : `firewall_rules` et `security_alerts` sont créées dans **`scripts/db/init-key-tables.sql`** (exécuté par `make db-push-all`) — relancer **`make db-push-all`** pour les créer. Autres tables via auth-service schéma étendu.


**Gestion des données — onglet Relances / Événements / Notifications** :
- **Relances** : `GET /api/v1/followups` pouvait renvoyer **500** (schéma BDD incohérent, ex. relations Application/Company). **Correction** : fallback dans followup-service (sans `include` application/company) pour renvoyer **200** avec les relances ou tableau vide + message d’avertissement. Aligner la BDD avec **`make db-push-all`** pour retrouver les données enrichies (candidature, entreprise).
- **Événements et Notifications** : onglets « Événements » et « Notifications » de la page Gestion des données (**/backoffice/data**) étaient en placeholder. **Correction** : appels réels à `GET /api/v1/events` et `GET /api/v1/notifications`, affichage en table, gestion d’erreur (message si service indisponible). event-service et notification-service : fallback 200 + tableau vide en cas de table/schéma manquant (éviter 500).

**Travail en cours (tests, BDD, emails)** :
- **Monitoring-c « non disponible » dans `make test-api`** : en Docker les tests appelaient localhost:5098 (depuis le conteneur, localhost ≠ hôte). **Correction** : Makefile passe **`MONITORING_C_URL=http://monitoring-c:8015`** et **`API_GATEWAY_URL=http://api-gateway:5002`** au conteneur. Le système de métriques n'a pas été migré : monitoring-c est toujours utilisé par l'agrégateur.
- **Tests email (timeout)** : POST /emails/test et GET /emails/test-smtp bloquaient si SMTP indisponible. **Correction** : timeout axios 5 s, skip gracieux en cas de timeout/ECONNREFUSED.
- **Erreurs BDD (tests API / user journey)** : (1) **User.verificationToken does not exist** — relancer **`make db-push-all`**. (2) **Application.status / Interview.status does not exist** (hint statusId) — aligner schémas Prisma avec la BDD si migration statusId. (3) **userId=dev_user_1 absent** — scripts de test à faire utiliser un utilisateur réel (admin ou token login) pour Company/Contact/Application.
- **Historique des mails** : toujours à résoudre (section 4).
- **Design unifié des pages de test** : reprendre le design Tests Backend (progression, logs) pour Tests API, Frontend, etc. — voir TESTS_END.md section 13.

**`make db-push-all` — ce qu'il fait (tout en une commande)** : (1) **Prisma db push** sur les 9 services (auth, application, company, contact, interview, call, followup, event, workflow) — tables métier + schéma partagé. (2) **init-system-metrics.sql** — tables system_metrics, container_metrics, service_availability_history. (3) **init-key-tables.sql** — security_logs, system_metrics_snapshots, network_connections, network_threats, **security_alerts**, **firewall_rules**. Aucune étape de vérification ou second db push à faire après : la synchro est complète. Si des tables manquent encore, relancer **`make db-push-all`** (Postgres et conteneurs doivent être démarrés).

**Base de données stats / analytics (par utilisateur)** : Les tables **UserSession**, **UserEvent**, **UserError**, **UserPerformance**, **DeviceInfo** servent à collecter les stats d'usage par utilisateur (dashboard-service, schéma auth étendu). Voir **docs/TRACKING_UTILISATEUR.md** ; anonymisation et vie privée : **docs/mobile/analytics/PRIVACY.md**. Créées par le push auth-service (schéma partagé).

**Tests — tout depuis l'interface, sans modifier les scripts** : À faire : depuis le backoffice (Tests API, Tests Backend, User journey, etc.), **création automatique** d'un utilisateur de test et des données de test si besoin (compte de test, BDD de test ou seed), sans que l'utilisateur ait à lancer `make create-admin-user` ou à modifier les scripts. Tout doit être géré dans l'interface (bouton « Lancer les tests » → préparation env de test si nécessaire → exécution). Voir TESTS_END.md § 13.

### 2. Tests (complets et opérationnels)

**Validation via Makefile (prioritaire)** : Tous les tests opérationnels doivent être **validés via le Makefile** (pas de commandes manuelles sauf si pas le choix). Cibles : `make test-api`, `make test-frontend`, `make test-backend`, `make test-e2e`, `make test-security`, `make test-performance`, `make tests-user-journey`. Voir `make tests-help` et `makefiles/tests/Makefile`. Pour une validation reproductible et CI, privilégier les cibles Make ; les exécutions programmées (section 12) et les scénarios (Playwright, user journey) doivent aussi remonter métriques backend (CPU, mémoire) vers l’agrégateur (section 9).

**Opérationnel :**
- **Tests API** (`/backoffice/tests-api`) : lancement depuis le backoffice (Docker), rapport HTML avec Résumé, table « Résultats détaillés par test », section « Logs des services » (dépliable), capture terminal. Cibles `make test-frontend` et `make test-e2e` ajoutées (délèguent à test-unit-frontend et test-e2e-frontend).

**Opérationnel (à valider) :**
- **Tests Backend** (`/backoffice/tests-backend`) : **`make test-backend`** ; en Docker `cd /app/tests && npm run test:backend` ; rapport généré. À valider : tests s’exécutent correctement depuis le conteneur frontend.
- **Tests Frontend** (`/backoffice/tests-frontend`) : **`make test-frontend`** ; en Docker exécute `npm run test:unit`. Rapport généré.
- **Tests Backoffice / E2E** (`/backoffice/tests-backoffice`) : **`make test-e2e`** ; en Docker exécute `npm run test:e2e`. Rapport généré.
- **Tests Sécurité** (`/backoffice/tests-security`) : **`make test-security`** ; page + API run-security, rapports dans Rapports de tests.
- **Tests Performance** (`/backoffice/performance-tests`) : **`make test-performance`** (ou cibles dédiées) ; run-performance-backend / run-performance-frontend. Vérifier scripts et rapports.
- **Tests Playwright** (`/backoffice/playwright-tests`) : **`make test-e2e`** / **`make test-mobile`** ; page avec scénarios ; l’exécution réelle Playwright doit être branchée et les rapports visibles (ex. playwright-report).
- **Programmation de tests** (`/backoffice/performance-tests/schedule`) : **pas opérationnel.** L’API `/api/test-reports/schedule` gère CRUD des plannings ; il manque un **worker/cron** qui exécute les tests selon l’intervalle (hourly, daily, weekly). À implémenter : job planifié qui lit les schedules actifs et lance les runs (run-api, run-backend, run-performance-*, etc.) et remonte métriques (backend, mémoire) vers l’agrégateur.

**Tests unitaires et suite de tests — non à jour / à compléter** : Les **tests unitaires** ne sont pas à jour ni tous ajoutés. **Frontend** : peu de tests unitaires (quelques `__tests__` analytics, une page backoffice) ; `npm run test:unit` / `make test-frontend` à aligner avec une couverture réelle des composants et pages. **Répertoire central** `tests/unit` : contenu minimal (ex. test-utils), à compléter. **Backend** : tests dispersés par service (auth, api-gateway, profile, etc.), pas de suite unitaire centralisée et à jour. **En résumé** : l’ensemble de la partie test (unitaires, intégration, E2E, rapports backoffice) reste à finaliser et à mettre à jour. Voir TESTS_END.md § 12–13 et `docs/tests/TESTS_COMPLETS_RAPPORT.md`.

**Rapports** : Filtre par catégorie, `?open=ID`, section Logs des services en `<details>` (dépliable) pour ne pas masquer la fin du rapport. Faciliter l’ajout de nouveaux tests (scripts + entrées backoffice) quand de nouvelles fonctionnalités sont développées.

### 3. Sécurité (firewall, politique, réseau, menaces)
- **Firewall (règles, statut, logs)** : Les **tables BDD** sont créées par **`make db-push-all`** : **`firewall_rules`**, **`security_alerts`**, **`security_logs`**, **`network_connections`**, **`network_threats`** (voir `scripts/db/init-key-tables.sql`). Le **backend** (security-service) expose règles (CRUD), IPs bloquées, logs ; le **frontend** (`/backoffice/security/firewall`) affiche règles et IPs. **À vérifier** : que toutes les données (logs en temps réel, statut firewall) sont bien persistées en BDD et reflétées dans l’UI.
- **WAF et détection** : **Actuellement ce sont des faux / mock.** Il faut implémenter une **vraie configuration WAF** (règles applicatives, blocage par pattern, IP, etc.) et une **vraie détection** (intrusions, menaces, anomalies) branchée sur les données et la BDD. À faire : remplacer les données de démo par des flux réels (API Gateway + security-service).
- **Politique de sécurité** : WAF global, règles, IPs bloquées — compléter et tester (avec vraie config).
- **Réseau** : métriques RX/TX, connexions, menaces — interfaces et données.
- **Menaces** : détection, logs, alertes — brancher données réelles et rapports.
- **Analyse sécurité** : graphiques dans le temps (disponibilité, taux d’erreur, DNS).
- **Logs de sécurité** : temps réel + persistance BDD, par conteneur.
- **Rapport de sécurité** : génération et affichage (stats globales, données sécurité).
- **Stats globales sécurité** : tableau de bord dédié si prévu.

### 4. Gestion des Emails (pas opérationnel)
- **Templates** : création, édition, liste.
- **Configuration** : SMTP, expéditeur, options — et test SMTP (503 à corriger).
- **Déliverabilité** : suivi, stats, alertes.
- **Historique / logs** : URL 404 à corriger ; afficher les envois et statuts.

### 5. Parcours utilisateur
- **Parcours prédéfinis** (`/backoffice/user-journey`) : vérifier données et navigation. **Dépendent des APIs métier** (inscription, connexion, candidatures, contacts, entretiens, relances, appels) — voir section 11 ; scénarios pas tous opérationnels — voir section 12.
- **Parcours personnalisé** (`/backoffice/user-journey/custom`) : création, édition, exécution.

### 6. Gestion des services & données
- **Gestion des services** : liste complète, détail service (métriques, logs), **redémarrage** (restart), **config** (configuration par service) — rendre pleinement opérationnels.
- **Logs des services** : centralisation, filtres, persistance ; tout doit remonter vers log-collector / agrégateur (section 9).
- **Données utilisateur** : **Export** — branché (GET `/api/v1/admin/export/:type` via gateway, onglet Gestion Données, API 5002). **Import** et **cleanup** — 501 (non implémentés), message clair dans l’UI. Suppression, récupération — conformité RGPD à compléter.
- **Récupérer stats utilisateur** : onglet **Stats utilisateur** (Gestion des données) branché sur `GET /api/v1/analytics/stats/:userId` ; affiche sessions, événements, erreurs + lien vers Analytics utilisateur.
- **Comptes, abonnement, paiement, facturation** : onglet **Abonnement & facturation** (non implémenté). Si prévus — implémenter ; sinon documenter « hors scope ».
- **Données test** : onglet **Données test** avec lien « Générer des données de test » vers `/backoffice/test-data` ; affichage d’une table « données test uniquement » à implémenter (filtre API ou flag isTestData).
- **Corbeille / archives** : restauration, purge, politique de rétention.

### 7. Application mobile & outils dev
- **Émulateur mobile** : `/backoffice/mobile-emulator` — rendre opérationnel (connexion, prévisualisation).
- **Génération de données de test** : interface `/backoffice/test-data` — génération depuis l’UI (appels API ou scripts).
- **Personnalisation / création** : parcours personnalisés, templates, etc. — vérifier que tout est créable/éditable comme prévu.

### 8. Performances & Analytics
- **Analytics** : enrichir stats (agrégations, tendances, comparaisons, exports).
- **Analytics conteneurs** : données et graphiques cohérents.
- **Performances** : onglet Performance (métriques réelles), alertes/seuils optionnels.
- **Analytics utilisateur** : onglet « Versions & App mobile » — API versions à implémenter (404).

### 9. Observabilité, centralLogger, événements

**À faire – Tout doit passer par log-collector + monitoring + metrics-aggregator** : Toute l’activité doit être **répertoriée** et **centralisée** dans le log-collector, le monitoring et l’agrégateur d’observabilité (metrics-aggregator), puis exposée au backoffice. À brancher / vérifier : **API REST** (requêtes, transit, codes, latence) ; **backend** (tous les microservices, centralLogger → agrégateur) ; **application mobile** (requêtes, erreurs, perfs → agrégateur) ; **émulateur mobile** (`/backoffice/mobile-emulator`, usage, requêtes, erreurs) ; **historique des mails** (envois, transit, statuts → logs + agrégateur si besoin) ; **parcours utilisateur** (user journey : exécution des scénarios, étapes, succès/échec, durée → logs + métriques) ; **tests** (Playwright, API, programmation : en plus des rapports, détecter et remonter utilisation backend, CPU, mémoire, latence vers l’agrégateur pour analyse).

- **Rôles et flux** : voir la section **« Observabilité : rôles et flux (agrégateur d'observabilité) »** pour le détail des trois briques (monitoring-c, log-collector-c, agrégateur d'observabilité / metrics-aggregator) et les choses à faire (log-collector-c, cyber/sécurité, renommage optionnel).
- **centralLogger / logger-filter** : déployer dans tous les services ; documenter ; garder logger-filter en sync.
- **Événements & rappels** : backoffice OK ; app mobile — connecter API + rappels locaux/push.
- **monitoring-c** : ne doit **pas** disparaître — utilisé **en interne** par l'**agrégateur d'observabilité** (metrics-aggregator) pour la collecte métriques. Le **backoffice n'appelle jamais monitoring-c** (uniquement l'agrégateur). Stabilité (ERR_EMPTY_RESPONSE, starting) ; tests de charge, CI performance.
- **Health check 404** : **log-collector-c** et **metrics-aggregator** renvoient HTTP 404 sur `/health` (monitoring-c les appelle pour le health check). Soit ajouter une route `/health` sur ces deux services, soit adapter monitoring-c pour considérer 404 comme « pas d’endpoint health » sans le compter en échec.
- **Sécurité des conteneurs** : revue des services exposés sur l’hôte (ports mappés dans docker-compose). Limiter l’exposition aux seuls services qui doivent être accessibles depuis l’extérieur (frontend, API gateway, etc.).
- **Métriques / health en inter-conteneurs** : s’assurer que les appels métriques (metrics-aggregator → monitoring-c, frontend → metrics-aggregator) et health checks restent sur le réseau Docker (noms de services), pas exposés inutilement sur localhost. Vérifier que le frontend en Docker appelle bien l’API gateway / metrics-aggregator via le réseau interne (variables d’environnement) et non localhost.

- **APIs logs / métriques en inter-conteneurs uniquement** : s'assurer que les endpoints de logs et métriques (log-collector-c, monitoring-c, metrics-aggregator) ne soient accessibles que depuis le réseau Docker (conteneurs internes). Éviter d'exposer ces ports sur l'hôte ou les restreindre via la config réseau.

### 10. Documentation et cohérence
- **ERRORS.md** : tenir à jour (erreurs connues, corrigées, en attente).
- **RESOLUTIONS.md**, **TESTS_END.md**, **TODO_PERFORMANCE.md** : alignés avec STATUS (à faire vs fait).

### 11. Fonctionnalités métier / données – non implémentées (à faire)

**Référence** : `docs/database/` (relations.md, STRUCTURE_ACTUELLE.md), schémas Prisma. La BDD et les modèles existent ; les **flux complets API + backoffice + scénarios** ne sont pas en place. Tout ce qui suit doit être géré via **API et backend**, puis exposé au backoffice, aux **parcours utilisateur** et à l’**application mobile**.

| Domaine | À faire | Détail |
|--------|---------|--------|
| **Entretiens** | ❌ Non opérationnel | CRUD entretiens, statuts (SCHEDULED, COMPLETED, CANCELLED…), liaison Application/Contact/Event. API + backoffice + scénarios. |
| **Appels** | ❌ Non opérationnel | Gestion des appels (Call), liaison Contact/Company/Application/FollowUp. API + backoffice + scénarios. |
| **Synchronisation** | ❌ Non opérationnel | Sync client/serveur (SyncQueue, syncHash, lastSyncAt). Voir `docs/database/STRUCTURE_ACTUELLE.md` (Système de synchronisation). API + mobile. |
| **Candidatures** | ❌ Partiel | Workflow complet : création → relances → entretiens → décision. Statuts (ApplicationStatus), pièces jointes, historique. API + backoffice + scénarios. |
| **Relances** | ❌ Non opérationnel | CRUD relances (FollowUp), statuts, liaison Application/Contact. API + backoffice + scénarios. |
| **Entreprises** | ❌ Partiel | CRUD entreprises (Company), liaison User/Application/Contact. Compléter API + backoffice + scénarios. |
| **Contacts** | ❌ Partiel | CRUD contacts (Contact), relations M:N (ContactCompany, ContactApplication). API + backoffice + scénarios. |
| **Événements** | ❌ Non opérationnel | CRUD événements (Event), liaison Interview/Call/Application. API + backoffice + scénarios. |
| **Calendrier** | ❌ Non opérationnel | Vue calendrier (événements, entretiens, rappels). Dépend des événements et entretiens. |
| **Utilisateurs** | ⚠️ Partiel | **Inscription** (register), **connexion** (login), **reset mot de passe** : à finaliser (emails, tokens, UX). Auth-service + backoffice. |
| **Paramètres utilisateur** | ❌ Non opérationnel | Préférences, personnalisation (UserCustomization si prévu). API + backoffice + mobile. |

**Données et stats** : agrégations, tableaux de bord métier, exports. Une fois cette partie stable et sécurisée, l’API pourra servir les **parcours utilisateur** (scénarios de test) et l’**application mobile**.

**Workflows métier / logiques en chaîne (à implémenter)** — Référence : `docs/database/ACTIONS_ET_MODIFICATIONS.md`, `docs/database/analysis/comprehensive-project-audit`. Ces logiques doivent s’enchaîner côté backend (workflow-service ou services métier) et être paramétrables (délais, activation/désactivation) :
- **Candidature** : après X jours (ex. 7) sans action ni mise à jour → proposer ou passer le statut en « À relancer » si aucun autre paramètre ne s’y oppose (ex. `isManualStatus`, statut final rejeté/accepté). Délai et règles à documenter et implémenter (status.service.js ou équivalent).
- **Gestion automatique des statuts** : proposition automatique de statuts selon l’état de la candidature ; option « Forcer le statut manuellement » (`isManualStatus`) pour désactiver l’automatisme sur une candidature ; arrêt des automatismes si candidature rejetée/acceptée ou si l’utilisateur n’est plus en recherche active (`isActiveSearch`).
- **Relances automatiques** : création/suggestion de relances selon règles métier (délais, types).
- **Rappels et événements** : création automatique d’événements (entretien prévu, relance planifiée, etc.) dans le calendrier.
- **Création automatique** : entreprise si nom saisi n’existe pas ; contact avec entreprise ; règles déjà partiellement décrites dans ACTIONS_ET_MODIFICATIONS.md.

### 12. Scénarios de test – pas tous opérationnels

- **Playwright** : scénarios E2E (backoffice, parcours) : **pas tous opérationnels** ; exécution et rapports à brancher/valider.
- **API** : tests API (health, services, login, CRUD) : **partiellement opérationnels** ; dépend des endpoints métier (candidatures, contacts, etc.) à implémenter.
- **Parcours utilisateur** : prédéfinis et personnalisés (`/backoffice/user-journey`) : **dépendent des APIs métier** (inscription, connexion, candidatures, contacts, entretiens, relances, appels) ; tant que celles-ci ne sont pas complètes, les parcours ne peuvent pas couvrir tout le flux.
- **Programmation de tests** : CRUD des plannings OK ; **worker/cron manquant** pour exécuter automatiquement les tests selon les plannings.

À faire : implémenter les APIs métier (section 11), puis valider et compléter les scénarios Playwright, API et parcours utilisateur.

### 13. Application mobile (après métier + scénarios)

- **Référence** : `docs/mobile/README.md`, Flutter existant.
- **Développement app mobile** : connecter à l’API fonctionnelle et sécurisée (auth, candidatures, événements, rappels, **synchronisation**, **paramètres utilisateur**). Toutes les fonctionnalités listées en section 11 (entretiens, appels, candidatures, relances, entreprises, contacts, événements, calendrier, inscription/connexion/reset, paramètres) devront être exposées et consommées par l’app mobile.
- **Sécurisation** : HTTPS, JWT, rate limiting, validation des entrées.
- **Stats et monitoring** : métriques d’usage, erreurs, performances côté mobile et API.

**Prochaine étape suggérée** : 1) **Admin** : déjà créé par `make up-full` ; `make create-admin-user` si besoin ; 2) **Tests API** : lancer depuis le backoffice, vérifier le rapport ; 3) **Config emails + logs emails** (à faire) ; 4) **Tests** : valider Frontend, Backend, Backoffice, Sécurité, Performance depuis le backoffice ; 5) **Programmation de tests** : ajouter un worker qui exécute les schedules ; 6) **Sécurité** (firewall, politiques, menaces) ; 7) **Partie métier** (section 11 : APIs entretiens, appels, sync, candidatures, relances, entreprises, contacts, événements, calendrier, utilisateurs, paramètres) ; 8) **Scénarios** (Playwright, API, parcours utilisateur) ; 9) **Application mobile** (API fonctionnelle et sécurisée).

---

## 🔐 Migration et sécurisation complète (à faire en dernier)

**À réaliser après** : finalisation du backoffice, tests complets, API complète et tout ce qui est listé dans les sections « À FAIRE » ci-dessus. Ne pas démarrer cette phase tant que l’API et les fonctionnalités métier ne sont pas stables.

### Objectifs
- **Authentification** : migrer le service d’authentification vers **Go** (ou Rust si possible) pour des perfs et une maintenabilité maximales, avec une sécurité renforcée.
- **Chiffrement et données** : module dédié pour le chiffrement des données en transit (API), hash forts, salage, paramètres de travail (coût) adaptés.
- **Sessions et JWT** : TTL courts, refresh token stocké côté serveur, blacklist, rotation, tokens de vérification / reset **aléatoires non prédictibles**, TTL limité, usage one-shot, **aucun secret en clair dans l’URL**.
- **Protection brute force** : rate limiting, lockout temporaire, CAPTCHA si possible.
- **Transport** : HTTPS partout (TLS).
- **Validation** : validation stricte des entrées (inputs) côté API.
- **Stack cible** : Go (ou Rust) pour le service auth et les briques sensibles, ultra performant et sécurisé.

### À planifier quand l’API sera complète
- Migration progressive du service auth (Node → Go/Rust).
- Module de chiffrement (données en transit, at-rest si besoin).
- Refonte JWT + refresh (stockage serveur, blacklist, rotation).
- Rate limiting, lockout, CAPTCHA.
- Audit et durcissement global (HTTPS, headers, validation stricte).

---

## ✅ Résolu / Fait (ce qui a été fait)

### Derniers faits (Février 2026)
- **Sécurisation SQL en C (log-collector-c, monitoring-c)** : requêtes passées en **prepared statements** (libpq `PQexecParams`) et validation des entrées. **log-collector-c** (`http_server.c`) : GET /api/v1/logs avec paramètres `$1`–`$4` (errors_only, level, container, limit), whitelist level (info/warn/error/debug), container alphanum + `-_.`, limit 1–2000. **monitoring-c** (`storage.c`) : `get_system_metrics_history` avec `PQexecParams` (start_date, end_date, limit, offset), limit 1–5000, offset 0–100000. Plus d'injection SQL sur ces chemins.
- **Metrics-aggregator – persistance JobbingTrack uniquement** : en plus du filtre à la collecte Docker, les conteneurs issus de **monitoring C** sont filtrés avant sauvegarde (`isJobbingTrackContainer`). Log : « Préparation de 21 conteneurs depuis monitoring C pour sauvegarde (X reçus, filtre JobbingTrack) » et « Sauvegarde de 21 conteneurs en BDD » (plus de 31).
- **Navigation backoffice** : **Testeur d’API (manuel)** = `/backoffice/api-tester` (tests manuels, endpoints, historique). **Lancer les tests API** = `/backoffice/tests-api` (sous Tests) = lancement du script et rapports. Tableau de bord et Sécurité en sous-catégories (bloc parent + subItems).
- **Rapports tests API** : parsing des statistiques amélioré — priorité au comptage des lignes « ✓ PASS » / « ✗ FAIL » (pattern 3) quand le résumé texte est vide ou incohérent, pour afficher le vrai total / réussis / échoués au lieu de « 1 total, 1 échoué ». Pattern 1 utilise `tail -1` pour prendre la dernière ligne de résumé.
- **Tests API depuis Docker** : `sh` + chemins absolus, `PROJECT_ROOT=/app`, volume `./scripts`, `TESTS_RESULTS_DIR`, passage de la commande en guillemets simples, `API_URL` (ex. `http://api-gateway:3000`) pour atteindre l’API depuis le conteneur frontend.
- **Page backoffice/analytics (vue d’ensemble)** : chargement accéléré — `startDate`/`endDate`, `limit` 500, rafraîchissement 60 s ; suppression des `console.log`.
- **Bouton retour et plage de dates** : sur Performances complètes, réseau, applicatives, Analytics conteneurs : bouton « ← Retour à la vue d’ensemble » puis titre et période ; **TimeRangeSelector** : « Plage personnalisée » dans `<details>`.
- **Drawer** : **Sécurité** avec item parent + subItems (Logs, Politiques, Analyse, Firewall, Réseau, Menaces). **Gestion des Emails** : un item parent « Gestion des Emails » avec **subItems décalés** (Dashboard, Email Monitor, Historique, Templates, Configuration, Déliverabilité) — même rendu que Tests. **Développement** : Tests et Parcours Utilisateur avec subItems.
- **Tests API et rapports** : PROJECT_ROOT (`/workspace`), volume `.:/workspace` ; routes run-* synchrones avec **reportId** ; lien « Voir le rapport généré » ; Rapports de tests avec catégorie (badge) et `?open=ID` ; summary.json pour catégorie/nom.

### Modifications récentes (layout, Analytics conteneurs)

- **Layout** : les pages **Performances complètes**, **Analytics conteneurs**, **Performances réseau**, **Performances applicatives** utilisent la pleine largeur (`p-6 space-y-6 w-full`), comme Analytics utilisateur.
- **Analytics conteneurs** : liste des conteneurs via **`/api/v1/docker/services/all`** (metrics-aggregator). L’historique par conteneur dépend de la persistance BDD (persistence/containers/:name/metrics).

---

## ✅ Observabilité : rôles et flux (agrégateur d'observabilité)

### Nom de concept vs nom technique
- **Agrégateur d'observabilité** (ou *Observability aggregator*) : nom de **concept** pour le service qui regroupe, traite et enregistre toutes les données d'observabilité (monitoring, logs, réseau, santé, et à terme cyber/sécurité) dans des **tables distinctes** (meilleure définition et traçabilité), puis expose au backoffice ce qu'il faut (métriques, logs, historique).
- **Nom technique** (conteneur / code) : **metrics-aggregator** (répertoire `backend/metrics-aggregator-service`, conteneur `jobbingtrack-metrics-aggregator`). Conservé pour compatibilité ; renommage optionnel plus tard en `observability-aggregator` si souhaité.

### Rôles des trois briques
| Composant | Rôle | Exemple de données | Appelé par |
|-----------|------|--------------------|------------|
| **monitoring-c** (ex-systems, C) | Collecte **métriques** système et conteneurs (CPU, mémoire, disque, réseau, load, santé des services). | `/api/v1/metrics`, historique `system_metrics` (PostgreSQL). | Agrégateur d'observabilité uniquement (pas le backoffice). |
| **log-collector-c** (ex-systems, C) | Collecte **logs** des conteneurs (stdout/stderr, niveau, message). | `/api/v1/logs`, table `container_logs`. | Peut être interrogé par l'agrégateur ou le backoffice ; souvent l'agrégateur centralise puis expose. |
| **Agrégateur d'observabilité** (Node, metrics-aggregator) | **Regroupe** les données (monitoring-c + Docker + centralLogger), **traite** (filtre JobbingTrack, normalise), **enregistre** dans des tables **distinctes** (system_metrics, container_metrics, container_logs, service_availability, security_metrics…), **expose** au backoffice (une seule API). | `/api/v1/metrics`, `/api/v1/docker/*`, `/api/v1/persistence/*`, `POST /api/v1/persistence/logs`. | **Backoffice uniquement** (frontend ne parle qu'à cet agrégateur). |

### Flux actuel
1. **monitoring-c** → agrégateur (métriques système + conteneurs).
2. **Docker** (socket) → agrégateur (liste conteneurs, logs, stats).
3. **centralLogger** (auth, application, security…) → `POST /api/v1/persistence/logs` → agrégateur → BDD.
4. **Agrégateur** → persistance dans tables distinctes (system_metrics_snapshots, container_metrics, container_logs, service_availability_history, security_metrics…).
5. **Backoffice** → uniquement **agrégateur** (port 5004) pour tout : vue d'ensemble, services, logs, historique, analytics.

### À faire (observabilité)
- Unifier / documenter l'usage de **log-collector-c** : soit l'agrégateur interroge log-collector-c pour enrichir les logs, soit les logs passent uniquement par Docker + centralLogger ; éviter doublons.
- Étendre l'agrégateur aux données **cyber / sécurité** (déjà `saveSecurityMetrics` côté persistence) : s'assurer que les flux WAF, firewall, menaces remontent vers les bonnes tables et sont exposés au backoffice.
- Optionnel : renommer le service/conteneur **metrics-aggregator** en **observability-aggregator** pour cohérence avec le rôle (docker-compose, env, frontend).

---

## ✅ Modifications récentes (db-push-all, navigation, Services & Logs, liste services)

- **`make db-push-all`** : le script fait (1) Prisma db push, (2) `init-system-metrics.sql`, (3) **`init-key-tables.sql`** (security_logs, system_metrics_snapshots, network_connections, **network_threats**). Commentaire en tête du script.
- **Navigation** : section **Sécurité** sans doublon. **Statistiques & Monitoring** : uniquement « Vue d'ensemble » (suppression du doublon « Logs des conteneurs » ; les logs conteneurs restent sous **Gestion des services** > **Services & Logs**).
- **Services & Logs** : API Gateway d’abord (logs sécurité), puis log-collector pour enrichir si dispo.
- **Liste des services** : uniquement **agrégateur d'observabilité** (metrics-aggregator) : `/api/v1/docker/services/all` puis `/api/v1/metrics` en fallback.
- **Détail service** : métriques et logs via agrégateur d'observabilité uniquement.

---

## ✅ Modifications récentes (Gestion des services, Services & Logs, détail service – historique)

- **Administration > Gestion des Services** :
  - **Services & Logs** : le bouton et la page fonctionnent. Correction du bug (variable `normalizedServiceFilter` non définie qui faisait planter le filtre par service). Fallback logs via API Gateway (`/api/v1/security/logs`) avec URL `NEXT_PUBLIC_API_URL` (5002). Liste de services enrichie avec des noms connus pour le filtre même sans logs.
  - **Navigation** : « Services & Logs » est un sous-élément de « Gestion des Services » dans le menu (Liste des services, Services & Logs). Bouton « Retour » (flèche) sur la page Services & Logs vers `/backoffice/services`.
  - **Détail d'un service** (ex. agrégateur d'observabilité / metrics-aggregator) : fusion correcte des données (monitoring-c + agrégateur) en un seul état ; recherche du conteneur avec ou sans préfixe `jobbingtrack-` ; appel à l'API docker de l'agrégateur avec les deux noms si besoin ; lien « Retour » explicite vers la liste des services ; message clair si le service n'est pas détecté.
- **Sécurité** : Politiques de sécurité (WAF global + règles, firewall, IPs bloquées) branchées sur les APIs ; architecture documentée dans `backend/security-service/ARCHITECTURE.md`. Analytics utilisateur : onglet « Versions & App mobile » (appareils, versions par plateforme, métriques performance) avec API `GET /api/v1/analytics/stats/:userId/versions`.

---

## 🔴 Erreurs corrigées (récent)

| Erreur | Cause | Correction |
|--------|--------|------------|
| **`null value in column "id" of relation "User"`** (create-admin-user) | L’INSERT dans `create-admin-user.sh` ne fournissait pas la colonne `id`, obligatoire (Prisma `@id @default(cuid())`). | **create-admin-user.sh** : l’INSERT inclut maintenant `id` avec une valeur CUID-like : `'c' \|\| substr(md5(random()::text \|\| now()::text), 1, 24)`. À relancer : **`make create-admin-user`** (ou `make up-full` qui appelle la création auto). |
| `[PERSISTENCE] The number 447.27 cannot be converted to a BigInt` | Valeurs mémoire/disque/réseau en float passées à `BigInt()` sans arrondi | **server.js** : `systemMetricsForDb.memory` (used/total/free) et `network` (rx/tx) arrondis avant envoi ; conteneurs monitoring-C : bytes arrondis. **persistence.service.js** : helper `_safeBigInt(val)` utilisé pour tous les champs BigInt. Après modif : **`make rebuild-metrics-aggregator`**. |
| `relation "public.network_connections" does not exist` | Table créée uniquement par push Prisma auth-service (parfois absent) | `scripts/db/init-key-tables.sql` : `CREATE TABLE IF NOT EXISTS network_connections` ; exécuté dans `db-push-all.sh`. |
| Health check **HTTP 404** (metrics-aggregator, monitoring-c, log-collector-c) | Ces services n’exposent pas `/health` (ou route différente) | Comportement attendu ; la disponibilité est calculée sur réponse HTTP (200 = up). Pas de changement requis. |
| `runtime.lastError` / `message channel closed` (navigateur) | Extension de navigateur (ex. Cursor), pas le code front | À ignorer côté projet. |

---

## 🟢 Ce que nous avons fait (base partagée Prisma)

- **Schéma auth-service étendu** : tous les modèles des services security, deployment et metrics-aggregator ont été ajoutés au schéma Prisma de **auth-service** (SecurityLog, NetworkConnection, Deployment, SystemMetricsSnapshot, container_logs, etc.). Une seule base PostgreSQL partagée = un seul « push » qui crée toutes les tables.
- **Script `make db-push-all`** : il ne lance plus de `prisma db push` pour **security-service**, **deployment-service** ni **metrics-aggregator**. Ces services ont un schéma partiel ; un push depuis eux supprimerait les tables des autres. Les tables security_logs, network_connections, deployments, system_metrics_snapshots, container_logs, etc. sont créées par le push **auth-service**.
- **Documentation** : STATUS.md et script `scripts/db/db-push-all.sh` indiquent de ne pas lancer `make db-push-security` ou `make db-push-deployment` seuls sur une base partagée (risque de suppression des autres tables).

---

## ✅ Étapes faites (build auth, db-push-all, 21/21 services OK)

- **Build auth-service** et **`make db-push-all`** ont été exécutés ; toutes les tables (métier, security, deployment, metrics) sont créées via le schéma auth-service.
- **`make status`** affiche **21/21 services actifs** ; plus d’erreurs Postgres « relation security_logs / network_connections does not exist ».
- **Résumé** : une seule commande `make db-push-all` crée toutes les tables ; ne pas lancer `make db-push-security` / `make db-push-deployment` seuls sur une base partagée.

---


## Corrections récentes (état du système, disque, conteneurs, centralLogger, Make rebuild)

- **Frontend – État du système** : metrics-aggregator envoie cpu.usage_percent, memory.usage_percent, disk[0].usage ; fallback frontend pour éviter N/A.
- **Conteneurs** : noms normalisés (préfixe jobbingtrack-) depuis monitoring C ; fallback monitoringC.container_count.
- **Disque backoffice** : affichage via disk[0].usage_percent ou usage.
- **centralLogger** : déployé dans auth-service. Voir backend/shared/README.md pour les autres services.
- **Rebuild metrics-aggregator** : le service dans compose s’appelle `jobbingtrack-metrics-aggregator`, pas `metrics-aggregator`. Utiliser **`make rebuild-service SERVICE=metrics-aggregator`** ou **`make rebuild-metrics-aggregator`** (le Makefile traduit le nom).
- **Table `service_availability_history`** : si erreur « The table … does not exist », exécuter **`make db-push-all`** (le script crée la table via `scripts/db/init-system-metrics.sql`). Le code metrics-aggregator affiche un seul warning puis ignore la persistance disponibilité tant que la table est absente.
- **make status** : pour metrics-aggregator, si Docker n’expose pas le port dans `docker ps`, le Makefile affiche quand même **5004 → 3014** (valeur par défaut du compose).
- **Erreurs Postgres « relation … does not exist » en masse** : les tables (service_availability_history, system_metrics_snapshots, container_logs, **security_logs**, **network_connections**, **UserCustomization**, etc.) sont créées par **auth-service** lors de `make db-push-all`. **À faire** : 1) Démarrer Postgres et auth-service (`docker compose up -d postgres auth-service` ou `make up-full`), 2) **`make db-push-all`** (à lancer depuis la racine du projet). Si les erreurs persistent : **`make rebuild-service SERVICE=auth-service`** puis **`make db-push-all`**.
- **metrics-aggregator [unhealthy]** : souvent lié aux tables absentes. Après `make db-push-all` (et éventuellement `make rebuild-metrics-aggregator`), le service devrait repasser healthy.

## 🎯 Vue d’ensemble de l’application

| Domaine | Description | Statut |
|--------|-------------|--------|
| **API REST** | API Gateway + microservices (auth, application, company, contact, interview, call, event, followup, profile, notification, workflow, deployment, dashboard) | ✅ Opérationnel |
| **Observabilité (collecte)** | **monitoring-c** (C) : métriques système/conteneurs ; **log-collector-c** (C) : logs conteneurs | ✅ Opérationnel |
| **Agrégateur d'observabilité** | metrics-aggregator (Node) : regroupe monitoring + logs + Docker + centralLogger, traite, enregistre en tables distinctes (system_metrics, container_metrics, container_logs, etc.), expose au backoffice (une seule API) | ✅ Opérationnel (tables via `make db-push-all`) |
| **Historique des métriques** | PostgreSQL (system_metrics, container_metrics, tables Prisma metrics-aggregator), Analytics backoffice, périodes 1h → 30j + plage personnalisée | ✅ En place |
| **Sécurité / Firewall** | security-service, WAF dans l’API Gateway, firewall engine (iptables, fallback en dev) ; interfaces et flux complets à finaliser | ⏳ Partiel (à finaliser) |
| **Système de comptes** | auth-service (JWT, refresh, inscriptions, rôles) | ✅ Opérationnel |
| **Application mobile** | Flutter (mobile/) ; écran Événements & Rappels ajouté (/events) ; à connecter à l’API événements | ⏳ En cours |

---

## ✅ Ce qui fonctionne (Février 2026)

### 🏥 Healthchecks et services
- Healthchecks configurés pour tous les services (frontend, api-gateway, auth, dashboard, application, company, contact, interview, call, event, followup, profile, notification, workflow, security, deployment, metrics-aggregator, monitoring-c, log-collector, postgres, redis).
- `make status` : affichage healthy/unhealthy/starting avec couleurs et uptime.
- `make logs` : utilise `docker compose logs -f` (plus d’erreur « No such container »).

### 🔒 Sécurité
- **security-service** : healthcheck OK, `trust proxy` corrigé (`1` au lieu de `true`).
- **WAF** : intégré à l’API Gateway.
- **Firewall** : moteur iptables avec fallback en développement.

### 📊 Monitoring et métriques
- **monitoring-c** : collecteur C dans **`ex-systems/monitoring-c`**, endpoint `/api/v1/metrics`, lecture **/host/proc** (env `PROCFS_PATH=/host/proc`), persistance optionnelle (system_metrics). Démarre avec le compose principal (plus de profil). Port hôte 5098.
- **metrics-aggregator-service** : agrégation, persistance Prisma (snapshots, logs conteneurs, disponibilité services). Tables créées via `make db-push-metrics` (voir ci‑dessous).
- **Frontend backoffice** : Vue d’ensemble (CPU système/projet, mémoire, temps de réponse), Statistiques, Analytics avec graphiques et compression.

### 📈 Analytics et historique
- Périodes : 1h, 6h, 24h, 3j, 7j, 14j, 21j, 30j + **plage personnalisée** (date picker).
- Compression des points pour les graphiques (CPU système).
- Données de test : `scripts/db/generate-24h-test-data.sh` (48h de données fictives).

### 🗄️ Base de données et Prisma
- **PostgreSQL** : utilisé par auth, microservices, monitoring-c et metrics-aggregator.
- **Prisma metrics-aggregator** : schéma avec `url = env("DATABASE_URL")` ; **Prisma 6.x** (6.7.0) dans le service (pas Prisma 7).
- **make db-push-metrics** : charge `DATABASE_URL` depuis le `.env` à la racine (`$(ROOT_DIR)/.env`), puis exécute `npx prisma db push` dans le metrics-aggregator. **À lancer depuis la racine du repo** ; Postgres doit être démarré (ex. `docker compose up -d postgres`) et le port dans `.env` (ex. `POSTGRES_PORT=5000`) doit correspondre au mapping Docker.

### 🎨 Frontend
- Token expiré : nettoyage silencieux (plus d’erreurs console).
- Page Statistiques : `preferencesService` importé.
- Temps de réponse : affichage « N/A » ou « X ms » (y compris 0 ms).
- État du système : 2 colonnes (CPU Système / CPU Projet | Mémoire Système / Mémoire Projet).
- Compteur « services unhealthy » aligné avec la liste (is_healthy = health_status === 'healthy').

### 📁 Fichier .env à la racine
- **DATABASE_URL** : présent (ex. `postgresql://...@localhost:5000/jobbingtrack?schema=public`) pour Prisma / CLI.
- **SMTP_FROM** : valeur avec `<...>` **entre guillemets** (ex. `SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"`) pour éviter une erreur de syntaxe lors du `source` dans le Makefile.

---

## ✅ Fait (résolutions CORS, tables, métriques, healthchecks)

### Tables, db-push, CORS, Analytics (fait)
- **db-push-all** : crée toutes les tables via auth-service ; **21/21 services actifs** ; ne pas lancer db-push-security/deployment seuls.
- **Frontend Analytics** : API sur metrics-aggregator (5004) ; BigInt sérialisé ; CORS OK. Postgres « relation … does not exist » : résolu via db-push-all.

### CPU Projet, persistence, healthchecks (fait)
- **CPU Projet / Mémoire Projet** : fallback collectContainerMetrics + percent_of_system ; frontend reçoit system.jobbingtrack.containers (API 5004).
- **Persistence logs** : log et parsedMessage coercés en string. **404** : ignoré. **Healthcheck metrics-aggregator** : [healthy]. **Auth métriques** : configurable ; make logs-metrics + Ctrl+C OK.
- **Sécurité** : tables via db-push-all ; FIREWALL_PLAN.md en place. **deployment** : table deployments via db-push-all.

---

## 📋 Détails techniques (référence)

### centralLogger et logger-filter (backend shared)
- **centralLogger.js** (`backend/shared/utils/centralLogger.js`) : Envoi des logs ERROR/WARN/FATAL vers l'**agrégateur d'observabilité** (metrics-aggregator) via `POST /api/v1/persistence/logs`. URL par défaut : `http://jobbingtrack-metrics-aggregator:3014` (ou `METRICS_SERVICE_URL` / `METRICS_AGGREGATOR_URL`). À utiliser dans les microservices pour centraliser les logs côté agrégateur.
- **logger-filter.js** (`backend/shared/logger-filter.js`) : Filtre Winston pour supprimer le spam des erreurs P2021 (table non trouvée) en développement. Tous les services devraient importer depuis `backend/shared/logger-filter.js` (ou un chemin relatif cohérent) pour éviter les copies locales et garder un comportement unique.
- **À faire** : Vérifier que chaque service (auth, application, company, security, etc.) utilise soit le centralLogger pour les logs critiques, soit au minimum le logger-filter dans son logger Winston ; documenter l’usage dans un README shared ou dans la doc projet.

### Événements et rappels (emploi, bootcamp, entretiens, etc.)
- **Objectif** : permettre à l’utilisateur de **créer des événements** et **rappels** pour gérer son emploi / sa recherche (entretiens, bootcamps, formations, deadlines, etc.) — enregistrement des différents types d’événements liés à l’emploi.
- **Backoffice** : **interface dédiée** pour gérer / visualiser événements et rappels (liste, création, édition, suppression, filtres par type et date). À ajouter dans le menu backoffice (ex. « Événements & rappels » ou intégré au module existant).
- **Application mobile** : intégrer la **création et la gestion des événements / rappels** (calendrier, notifications, liste). Rappels locaux ou push selon la stack mobile.
- **À faire** : modèles (event-service ou module dédié), API (CRUD événements + rappels), backoffice (écrans), app mobile (écrans + rappels). Vérifier si event-service existant couvre déjà une partie et l’étendre.

### Interface Status (backoffice) et organisation de l'observabilité
- **Status** : Vue d'ensemble avec **tous les champs alimentés** (CPU système/projet, mémoire système/projet, temps de réponse, santé des services). Les sources remontent ainsi : **monitoring-c** → **agrégateur d'observabilité** (metrics-aggregator) → frontend ; vérifier qu'aucun bloc ne reste en N/A sans raison.
- **Organisation** : **Trois briques** (voir section « Observabilité : rôles et flux ») : (1) **monitoring-c** = collecte métriques bas niveau ; (2) **log-collector-c** = collecte logs conteneurs ; (3) **agrégateur d'observabilité** (metrics-aggregator) = regroupement, traitement, persistance en tables distinctes, exposition backoffice. Flux : monitoring-c (8015) → agrégateur (5004) → frontend (5003). Documenter dans `docs/metrics-flow.md` ou STATUS les flux complets (métriques réseau, santé, logs centralisés).

### centralLogger et consolidation
- **centralLogger** : déployé dans auth-service, application-service et security-service (transport Winston → `POST /api/v1/persistence/logs`). À étendre aux autres services si besoin (voir backend/shared/README.md).
- **logger-filter** : copies locales dans chaque service (nécessaire car le build Docker n’inclut pas `shared`) ; garder en sync avec `backend/shared/logger-filter.js`.

---

## 🚀 Commandes utiles

### Arrêt et redémarrage complet (tout arrêter puis tout relancer)
```bash
# Depuis la racine du repo

# 1) Tout arrêter (volumes supprimés)
make down

# 2) Tout redémarrer
make up-full

# 3) Si besoin : recréer uniquement le frontend (ex. après modif volume scripts)
docker compose -f docker-compose.yml up -d --force-recreate frontend
```
**Note** : `make down` utilise uniquement `docker-compose.yml` (pas le fichier monitoring) pour éviter l’erreur « depends on undefined service monitoring-c ». Les conteneurs restants (ex. log-collector) sont stoppés par la ligne suivante dans le Makefile.

### Autres commandes
```bash
# Statut de tous les services
make status

# Arrêter SANS supprimer les volumes (garder la DB)
make down-keep-data

# Redémarrage complet en gardant les données (down-keep-data + up-full)
make restart-full

# Démarrer tous les services (Postgres doit tourner pour db-push-metrics)
make up-full
docker compose up -d postgres   # si besoin

# Créer / synchroniser toutes les tables (auth + security + deployment + metrics en une fois)
# 1) make up-full  2) make db-push-all  (auth-service doit être rebuild si schéma étendu)
make db-push-all
make db-push-auth      # auth uniquement si besoin
# Ne pas lancer db-push-security / db-push-deployment seuls sur une base partagée (ils supprimeraient les autres tables).

# Navigation Git interactive (retour à un commit ou branche)
make git-checkout

# Logs (Ctrl+C pour arrêter make logs-metrics)
make logs
make logs-metrics       # Logs du metrics-aggregator uniquement
make monitoring-c-logs

# Données de test (48h)
./scripts/db/generate-24h-test-data.sh

# Reconstruire metrics-aggregator (après correction BigInt / persistence)
make rebuild-metrics-aggregator

# Nettoyer les métriques
make db-push-metrics
make db-clean-metrics
```

**Note db-push** : `make db-push-all` exécute le push dans chaque conteneur (auth, application, company, etc.) ; les tables security/deployment/metrics sont créées par le schéma auth-service. Postgres et les conteneurs listés doivent être démarrés. Lancer depuis la **racine** du repo. `.env` doit contenir `DATABASE_URL=postgresql://...@localhost:PORT/jobbingtrack?schema=public` (PORT = `POSTGRES_PORT`) si besoin de Prisma en local.

---

## 📊 Statistiques projet

- **Services** : 21+ avec healthchecks (API Gateway, auth, microservices métier, security, **agrégateur d'observabilité** [metrics-aggregator], monitoring-c, log-collector, postgres, redis, frontend).
- **Observabilité** : **monitoring-c** (C, métriques) + **log-collector-c** (C, logs) ; **agrégateur d'observabilité** (Node) regroupe, traite, persiste en tables distinctes, expose au backoffice. Ancien stack Prometheus/Grafana/Loki supprimé.
- **Persistance** : PostgreSQL (tables distinctes : system_metrics, container_metrics, container_logs, service_availability, security_metrics… via agrégateur + auth-service schéma).

---

## ✅ Résolutions / vérifications en cours

- [x] **make restart-service SERVICE=metrics-aggregator** : nom Compose géré dans le Makefile.
- [x] **BigInt sur /api/v1/persistence/system/metrics** : sérialisation en Number.
- [x] **CPU Projet / Mémoire Projet** : fallback containerMetrics + percent_of_system.
- [x] **make logs-metrics** : Ctrl+C arrête la commande.
- [x] **Authentification métriques** : configurable.
- [x] **Tables & db-push** : 21/21 services actifs ; security_logs, network_connections, deployments créées via auth-service ; plus d’erreurs « relation … does not exist ».
- [x] **Interface Status** : 21/21 services ; champs alimentés (CPU, mémoire, temps de réponse, santé).
- [x] **Événements / rappels** : backoffice (CRUD, calendrier) opérationnel ; app mobile écran /events ajouté (à brancher API).
- [x] **Erreur BigInt 447.27** (metrics-aggregator persistence) : server.js envoie entiers ; persistence.service.js utilise `_safeBigInt()` partout ; rebuild requis.
- [x] **Table network_connections manquante** : créée dans `init-key-tables.sql`, exécutée par `db-push-all`.
- [x] **Analytics : période par défaut "Aujourd’hui"** : option ajoutée, défaut = today.
- [x] **Sous-pages Performances & Analytics** : Performances complètes, Performances réseau, Performances applicatives, Analytics conteneurs (dont option « Tous » + graphiques combinés), Analytics Utilisateur. Bouton « Période actuelle » sur Performances et Containers.
- [x] **Interfaces sécurité, réseau** : opérationnelles (logs, analyse, firewall, menaces, réseau via gateway 5002).
- [x] **centralLogger** : déployé dans auth, application, security ; logger-filter en copies locales (Docker).
- [x] **Gestion des services** : page Services & Logs corrigée (normalizedServiceFilter, API Gateway pour logs), sous-navigation (Liste des services, Services & Logs), bouton Retour. Détail service (ex. metrics-aggregator) : fusion monitoring-c + metrics-aggregator, recherche par nom avec/sans préfixe, lien Retour liste.
- [x] **Politiques de sécurité** : paramétrage WAF (toggle global + règles), section firewall (lien vers onglet Firewall), IPs bloquées (block/unblock). Architecture sécurité documentée (backend/security-service/ARCHITECTURE.md).
- [x] **Analytics utilisateur** : onglet « Versions & App mobile » (appareils, versions par plateforme, métriques performance) ; API `GET /api/v1/analytics/stats/:userId/versions`.
- [x] **Requêtes SQL en C (log-collector-c, monitoring-c)** : prepared statements (PQexecParams), validation des entrées (limit, level, container, start_date/end_date) ; plus d'injection SQL sur ces chemins.

## 📝 Références

- **docs/metrics-flow.md** : flux des métriques (monitoring-c → metrics-aggregator → frontend), ports, authentification.
- **ERRORS.md** : erreurs rencontrées et statut (corrigées / en cours).
- **RESOLUTIONS.md** : résolutions appliquées (sécurité, frontend, Prisma, .env, make).
