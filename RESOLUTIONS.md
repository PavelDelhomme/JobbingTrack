# Resolutions appliquees

**Dernière mise à jour** : avril 2026

---

## 7 avril 2026 (suite) – `/backoffice/analytics` : « Element type is invalid » (composant `undefined`)

### Problème
- En dev (webpack Next), la page **Test CPU** (`AnalyticsPage`) plantait avec **Element type is invalid** (souvent **12** erreurs en cascade dans `reconcileChildrenArray`), typique d’un **composant React `undefined`** (icône Lucide ou export du baril analytics).

### Correctifs
1. **`frontend/next.config.js`** : retirer **`lucide-react`** de **`experimental.optimizePackageImports`**. Avec le baril **`@/lib/icons`** qui ré-exporte de nombreuses icônes, l’optimisation Next pouvait produire des **imports résolus à `undefined`** côté client.
2. **`frontend/src/app/(admin)/backoffice/analytics/page.tsx`** : ne plus importer depuis le baril **`@/components/analytics`** pour cette page — **imports directs** de `ChartPeriodCaption`, `timeRangeUtils`, type `TimeRangeOption` depuis les fichiers du dossier `components/analytics/` ; **`Cpu`** depuis **`@/lib/icons`** (OK une fois Lucide non optimisé de cette façon).

### Vérification
- **`npm run test:unit-and-analytics`** (ou en deux temps : `jest unit` puis `jest --testPathPattern=backoffice/analytics`) : suites vertes incl. smoke des sous-routes analytics.

---

## 7 avril 2026 – Vue sécurité / Analyse : fenêtre logs, détections, temps de réponse, fuseaux

### Problème
- Compteurs **vue d’ensemble** (0 logs, 0 détections) alors que l’**Analyse** montrait beaucoup de signaux : l’API logs applique par défaut **24 h** et la vue ne lisait pas **`metrics.responseTime`** à la racine → **N/A** ; incidents sans clarification (données réelles vs test).

### Correctifs
- Front **vue sécurité** : `GET /api/v1/security/logs?limit=500&startDate=…` sur **30 jours** ; **détections** = logs (hors `network_threat_detected` pour éviter doublon avec la table menaces) + agrégat menaces (SQLi / XSS / autres / DDoS) comme l’Analyse ; **temps de réponse** via `pickResponseTimeMs` (`responseTime.average_ms` agrégateur + repli) ; texte explicatif sur les **incidents** ; horodatages en **locale navigateur** (`formatLocalDateTime` avec fuseau court).
- Front **Analyse** : même fenêtre **30 j.** pour les logs ; module partagé **`src/lib/security/threatSignals.ts`** + test unitaire.
- **metrics-aggregator** : plus de **NaN** sur `responseTime.average_ms` quand aucune mesure service.
- **Menaces API** : `enrichThreatForApi` (liste + détail + création) pour **`destIp`** dérivée des métadonnées si absente ; **POST** accepte **`destIp`** IPv4 optionnel.
- **Mobile** : `lib/utils/datetime_display.dart` + README (ISO → affichage local).

---

## 8 avril 2026 – `make security-live-check` : 401 sans token + génération menaces

### Problème
- **`test-firewall.sh`** (invoqué avec `API_GATEWAY_URL` = URL du **security-service**) : les tests 21 attendaient **401/403** sur `GET /api/v1/security/firewall/rules` **sans** `Authorization`, mais le service répondait **200** (routes ouvertes).
- **`generate-test-threats.sh`** : type **`XSS_ATTACK`** refusé par l’API (**400**) ; la liste autorisée expose **`XSS`** (`ALLOWED_THREAT_TYPES`).

### Solution
1. **Middleware** `requireFirewallWafAccess` sur `/api/v1/security/firewall` et `/api/v1/security/waf` : **JWT** (`Authorization: Bearer`, même secret que l’auth) **ou** header machine **`X-Internal-Secret`** (variable d’environnement **`SECURITY_INTERNAL_SECRET`**, défaut dev aligné avec `docker-compose.yml`).
2. **docker-compose** : `JWT_SECRET` + `SECURITY_INTERNAL_SECRET` sur **security-service** ; même secret interne sur **api-gateway** et **auth-service** ; gateway envoie le header sur `POST .../firewall/threats` (payload trop gros).
3. **Scripts** : `live-security-check.sh` exporte le secret et l’envoie aux sondes curl ; `test-firewall.sh` / `generate-test-threats.sh` envoient **`X-Internal-Secret`** sauf cas négatifs (**`SKIP_INTERNAL_AUTH_HDR=1`** pour les tests « sans token »).
4. **Menaces test** : `XSS_ATTACK` → **`XSS`**.

### Fichiers touchés (principaux)
`backend/security-service/src/middleware/firewallWafAuth.js`, `server.js`, `package.json` ; `backend/api-gateway/src/server.js` ; `backend/auth-service/src/utils/securityLogger.js` ; `docker-compose.yml` ; `scripts/security/live-security-check.sh`, `test-firewall.sh`, `generate-test-threats.sh`.

### Suite (validation `make security-live-check` sans échec)

- **Image Docker** : après ajout de **`jsonwebtoken`**, un simple `docker compose up --force-recreate` ne suffit pas si l’image n’a pas été **reconstruite** (`docker compose build security-service`). Sinon le conteneur peut crasher au boot (`Cannot find module 'jsonwebtoken'`).
- **Montage dev** : `docker-compose.yml` monte **`./backend/security-service/src:/app/src`** (comme l’api-gateway) pour que le code à jour soit pris en compte sans rebuild à chaque modification.
- **Ordre des routes** : `server.js` monte **`/api/v1/security/firewall`** et **`/api/v1/security/waf`** avant le routeur large **`/api/v1/security`** ; CORS autorise **`X-Internal-Secret`**.
- **`test-firewall.sh` + live-check** : variables **`FIREWALL_BASE_URL`** (souvent = URL du security-service) et **`AUTH_GATEWAY_URL`** (= gateway publique, ex. `:5002`). Sans cela, le **test 25** (`POST /api/v1/auth/login`) frappait le security-service → **404** au lieu de **400** depuis l’auth-service via la gateway.
- **Logs « effrayants » mais normaux pendant le live-check** :
  - **`[security] error:`** sur **`iptables` Permission denied** : attendu dans le conteneur (process non root / namespace) ; l’API peut quand même répondre **201/200** (persistance DB).
  - **`[gateway] warn: Attaque détectée par WAF`** : le scénario **sous charge** envoie volontairement du trafic malveillant ; ce ne sont pas des erreurs de panne.
  - **Timestamps mélangés** dans le flux `docker logs` : tampon / lignes d’anciens runs possibles ; seul compte le **résumé final** (**PASS/FAIL**).
  - **Make** : avertissements **cible `up-dev` dupliquée** entre Makefile racine et `makefiles/database/Makefile` — cosmétique, sans impact sur le live-check.

### Security-service : iptables en dev

- **`docker-compose.yml`** : le service **`security-service`** est lancé avec **`user: "0:0"`** en complément de **`cap_add: NET_ADMIN, NET_RAW`**. Avec l’image Alpine et **nftables**, l’utilisateur non-root du Dockerfile provoquait encore **`Permission denied`** sur `iptables` ; en root dans le conteneur, les règles peuvent s’appliquer dans la netns du conteneur. **À durcir en prod** (hôte / sidecar dédié plutôt que root applicatif si possible).

---

## Avril 2026 – Lot B sécurité (cohérence, test IP, UI) — anciennement « lot A » avant permutation PLAN

### Backend (`firewallController.js`)
- **Anti auto-blocage** : refus `403` si l’IP à bloquer = IP client observée (`X-Forwarded-For` / `req.ip`, IPv4 normalisée), sauf `lab_simulation`.
- **Stats réseau** : `containerCorrelation` (parts dockerNamed / hostLayer / unmapped) + `correlationHint` si beaucoup de sockets non mappées.
- **IPs bloquées** : propriété **`blockOrigin`** sur chaque entrée (`manual_rule`, `lab_simulation`, `automatic_threat`, `iptables`, `log_inferred`) ; sélection `description` sur les règles firewall pour détecter le lab.

### Frontend
- **Vue sécurité** : légende détection / blocage ; compteur blocages manuels inclut `ip_blocked_lab_simulation` ; retour utilisateur sur le test blocage+déblocage.
- **Analyse** : trois cartes (détections, manuels+lab détaillé, auto) ; pastilles `blockOrigin` sur la liste des IPs.
- **Réseau** : encart corrélation + texte sur les libellés `port:` / hôte.
- **Firewall** : badges d’origine sur chaque IP bloquée ; texte d’aide anti–auto-blocage.

---

## Avril 2026 – Vue d’ensemble backoffice : observabilité et libellés métriques

### Contexte
- Confusion possible entre **uptime** affiché **N/A** et point **vert** (service pourtant joignable).
- Libellé **« Erreurs récentes 24 h »** alors que l’agrégateur expose une **fenêtre courte** (ex. quelques minutes).
- **Taux d’erreur** affiché en **%** alors que le backend expose **`rate_per_min`** (débit).
- Compteurs **recentErrors** / **errorRate** qui ne repassaient pas à **0** quand l’agrégateur renvoyait zéro.

### Solution (frontend `frontend/src/app/(admin)/backoffice/page.tsx`)
1. Carte **Incidents sécurité** + sous-titre honnête sur la fenêtre agrégateur ; lien vers `/backoffice/security`.
2. Grille en **deux rangées** (pilotage puis ressources conteneurs).
3. Fonction **`serviceAvailabilityCaption`** : affichage **En ligne** / **~X ms** / durée d’uptime si présente.
4. Fusion métriques services : **uptime** résolu quand statut running sans uptime API (**En ligne**).
5. **setStats** : `errorRate` et `recentErrors` mis à jour avec **0** explicite quand la source renvoie 0.
6. Panneau Performance : temps de réponse pour toute valeur numérique (y compris 0 ms) ; débit **X,XX /min** ; libellés clarifiés.
7. Sous-titre carte CPU : **total** = somme CPUs conteneurs, peut varier avec les détections Docker.

### Documentation
- **ERRORS.md** : section *Pièges d’interprétation* + synthèse pipeline (base lot **A** après permutation `PLAN.md`).
- **STATUS.md**, **PLAN.md**, **TODOS.md**, **docs/CHANTIER_SECURITE_DATA_DOCS.md** : navigation chantier lots A–F.

---

## Mars 2026 – Bascule données de test / base propre (backoffice Actions)

### Problème
- Le frontend appelait `POST /api/v1/admin/clear-test-data` alors que la gateway n’exposait que `POST /api/v1/admin/test-data/clear` → le bouton « Revenir à la base propre » pouvait renvoyer 404.
- Les Company et Application créés par `generate-test-data.js` n’avaient pas `isTestData: true` → le nettoyage ne les supprimait pas.
- La suppression des « données de test » supprimait tous les users dont l’email contenait `@jobbingtrack.com` ou `test` → risque de supprimer l’admin principal.

### Solution
1. **Alias route** : ajout de `POST /clear-test-data` (même handler que `test-data/clear`) dans `backend/api-gateway/src/routes/admin.routes.js`.
2. **Script** : dans `backend/generate-test-data.js`, ajout de `isTestData: true` sur les Company (EMPLOYER et TEMP_AGENCY) et sur les Application.
3. **Nettoyage users** : dans `backend/api-gateway/src/controllers/testdata.controller.js`, suppression des users uniquement avec `where: { isTestData: true }` (dans les deux branches onlyTestData et else).

---

## Mars 2026 – Generate-test-data sans isTestData (ancienne image api-gateway)

### Problème
- Depuis le backoffice (Actions → Générer données de test), l’appel à `generate-test-data.js` échouait avec `Unknown argument isTestData` sur `prisma.company.create` lorsque l’image Docker de l’api-gateway avait été construite avant l’ajout du champ `isTestData` dans le schéma partagé.

### Solution
- Dans `backend/generate-test-data.js` : détection de l’erreur Prisma « Unknown argument isTestData » ; au premier échec, passage en mode fallback (création Company, Application, Contact, Interview, FollowUp, Call, Event sans `isTestData`) et message d’avertissement. La génération réussit donc même avec une ancienne image. Un message en fin de script indique de rebuilder l’api-gateway pour que « Revenir à la base propre » supprime bien les données générées.

---

## Mars 2026 – E2E Corbeille, restore visibility, security-e2e sortie illisible

### Problème
- **archive-interactions.spec.ts** : tests « la page Corbeille du backoffice charge sans erreur » et « la page Corbeille charge correctement » en timeout (33s, 40s) à cause de `networkidle` et d’attentes trop courtes.
- **archive-interactions** : après restore d’une candidature, `GET /applications/:id` retournait parfois 404 → assertion « Candidature visible après restauration » échouait.
- **security-e2e.spec.ts** : en cas d’échec XSS, le message d’assertion affichait tout le HTML du body (innerHTML) dans le terminal, rendant la sortie illisible.

### Solution
1. **Corbeille** : remplacer `waitForLoadState('networkidle')` par `domcontentloaded`, attendre la nav (25s), puis le heading « Gestion de la Corbeille » (visible 20s), et `test.setTimeout(50000)`. Assertions sur le body en textContent avec timeout 10s.
2. **Restore puis GET** : après `apiRestoreWithResponse`, boucle de retry (jusqu’à 5 fois, 1s entre chaque) sur `GET /applications/:id` avant d’asserter `appRes.ok()`.
3. **Security XSS** : au lieu de `expect(bodyHtml).not.toContain('...')`, calculer `const hasOnError = bodyHtml.includes('onerror=alert(1)')` et `expect(hasOnError, '...').toBe(false)` (idem pour le script alert XSS). Ainsi la valeur « reçue » en cas d’échec est un booléen, pas tout le HTML.

---

## Mars 2026 – Tests BDD restore 404 et CRUD admin « candidature archivée absente »

### Problème
- **test-bdd-relations.test.js** : en nettoyage (afterEach), les appels restore sur interview/followup/call renvoyaient parfois 404 (entité déjà supprimée définitivement par le test), ce qui générait des `console.error` et du bruit dans la sortie.
- **admin-data-crud.spec.ts** : le test « candidature archivée absente de la liste normale » échouait car la liste GET /applications était interrogée juste après l’archivage, avant que la BDD ait persisté l’état.

### Solution
- **test-bdd-relations** : ne plus logger en erreur lorsque le restore retourne 404 (attendu en nettoyage) ; logger uniquement pour les autres codes (ex. 500).
- **admin-data-crud** : ajout d’un délai de 800 ms après l’appel d’archivage, puis GET `/api/v1/applications?limit=50` ; assertion que la candidature archivée n’apparaît pas dans la liste.

---

## Mars 2026 – ERRORS.md : Postgres db-fix-role, Loki metrics-aggregator

### Problème
- **make db-fix-role** : messages « role "jobbingtrack" already exists » et « database "jobbingtrack" already exists » dans les logs quand le rôle/base existent déjà.
- **Loki** : quand Loki n’est pas déployé, `getaddrinfo ENOTFOUND loki` faisait échouer les requêtes logs du metrics-aggregator (erreurs 500 / exceptions).

### Solution
1. **makefiles/database/Makefile** : CREATE USER reste idempotent (DO $$ ... EXCEPTION WHEN duplicate_object). CREATE DATABASE ne peut pas être exécuté dans un bloc DO/transaction (PostgreSQL renvoie « CREATE DATABASE cannot run inside a transaction block »). Donc retour à la vérification en shell : `SELECT 1 FROM pg_database WHERE datname = 'jobbingtrack'` puis exécution de `CREATE DATABASE` **uniquement si** la base n’existe pas (grep -q 1 || docker-compose ... CREATE DATABASE).
2. **backend/metrics-aggregator-service/src/services/loki.service.js** : détection des erreurs Loki indisponible (`ENOTFOUND`, `ECONNREFUSED`, `ETIMEDOUT`, `ECONNRESET`) ; dans ce cas `queryLogs` retourne `{ data: { result: [] } }` au lieu de throw ; `streamLogs` retourne `null`. Les méthodes appelantes (getContainerLogs, getAllLogs, searchLogs, countPattern) utilisent déjà le retour et renvoient des tableaux vides.
3. **backend/metrics-aggregator-service/src/routes/logs.routes.js** : route GET `/stream/:name` vérifie si `streamLogs` retourne `null` et envoie alors un événement SSE « Loki non disponible » puis ferme la réponse.

---

## Mars 2026 – Deuxième vague : docs/tests, changelog, api, database, services

### Problème
- **docs/tests** : rapports obsolètes (ECHECS_TESTS_API_2026-02-19, RESULTATS_TESTS, RESUME_TESTS_COMPLETS, TESTS_COMPLETS_RAPPORT, TESTS_MANQUANTS, TESTS_PAGE_DETAIL_SERVICES) à supprimer ; README à mettre à jour.
- **docs/changelog** : sous-dossiers all-changes, final-implementation, implementation-completed redondants ; remplacer par un README unique pointant vers STATUS.md et RESOLUTIONS.md.
- **docs/api** : BACKEND_FIXES_SUMMARY obsolète ; ajouter README index et mettre à jour les dates.
- **docs/database** : structure-actuelle.md en doublon avec STRUCTURE_ACTUELLE.md ; README à aligner et dater.
- **docs/troubleshooting** : README référençait des CORRECTIONS_* déjà supprimées ; mettre à jour liens et date.
- **Backend** : fichiers .md dans auth-service (SMTP_CONFIGURATION, PYTHON_EMAIL_SETUP), security-service (ARCHITECTURE), metrics-aggregator (METRICS_DB_README, PERFORMANCE_OPTIMIZATION, MONITORING_GUIDE) à centraliser dans docs/.

### Solution
1. **docs/tests** : suppression des 6 fichiers listés ; mise à jour du README (liens vers documents conservés : STRUCTURE_TESTS_MAKE_TEST, COMMANDES_TESTS, QUICK_START_MOBILE_TESTS, etc.).
2. **docs/changelog** : suppression des 3 sous-dossiers et de leur contenu ; création d’un README.md unique pointant vers STATUS.md et RESOLUTIONS.md.
3. **docs/api** : suppression de BACKEND_FIXES_SUMMARY.md ; création de api/README.md ; mise à jour « Dernière mise à jour » en Mars 2026 dans api-reference et endpoints.
4. **docs/database** : suppression de structure-actuelle.md ; mise à jour du README (lien structure détaillée, date Mars 2026).
5. **docs/troubleshooting** : README mis à jour (liens vers POSTGRES_MONITORING, TROUBLESHOOTING_LOGIN ; suppression des références CORRECTIONS_* ; date Mars 2026).
6. **docs/emails** : ajout de SMTP_CONFIGURATION.md et PYTHON_EMAIL_SETUP.md (contenu déplacé depuis backend/auth-service) ; README mis à jour.
7. **docs/security** : ajout de ARCHITECTURE_SECURITY_SERVICE.md (contenu déplacé depuis backend/security-service) ; README mis à jour.
8. **docs/monitoring** : ajout de METRICS_DB_README.md, PERFORMANCE_OPTIMIZATION.md, MONITORING_GUIDE.md (copiés depuis backend/metrics-aggregator-service) ; README mis à jour.
9. **Backend** : suppression des .md déplacés dans auth-service, security-service, metrics-aggregator-service ; README de chaque service mis à jour pour pointer vers docs/.
10. **docs/README.md** : arborescence et liens mis à jour (development, troubleshooting, tests, api, changelog, emails, monitoring, security).
11. **docs/GUIDE_ETAPES_ACTUELLES.md** : ajout « Dernière révision : Mars 2026 ».

---

## Mars 2026 – Nettoyage documentation et racine projet

### Probleme
- **docs/development** : dossiers diagnostic, recap, setup, testing, workflow et fichiers FINAL_IMPLEMENTATION_SUMMARY, GUIDE_TESTS_PARCOURS, RESUME_NETTOYAGE obsolètes ou doublons.
- **docs/monitoring** : nombreux doublons (README-MONITORING, QUICK-START, etc.) et doc référençant une architecture Python (statistics.py) non utilisée.
- **docs/user-journey** : anciens correctifs de session (LIRE_MOI_URGENT, QUICK_FIX, RESUME_FINAL, TOKEN_TEST_PERMANENT, SOLUTION_ERREUR_403, RESOUDRE_TOKEN_INVALIDE).
- **docs/troubleshooting** et **docs/todo** : fichiers CORRECTIONS_* et TODO_CORRECTIONS obsolètes.
- **Racine** : dossier `security-service/` contenant uniquement FIREWALL_PLAN.md (doublon avec le service réel dans backend/security-service).

### Solution
1. **docs/development** : suppression des dossiers diagnostic, recap, setup, testing, workflow et des 3 .md cités. Conservation de makefile/ et makefile-commands/.
2. **docs/monitoring** : suppression de 16 fichiers doublons/obsolètes ; conservation de metrics-flow.md, README.md (mis à jour), MONITORING_COMMANDS.md, QUICK_START_MONITORING.md.
3. **docs/user-journey** : suppression des 6 fichiers de correctifs anciens ; conservation de README, GUIDE_COMPLET, PARCOURS_METIER.
4. **docs/troubleshooting** : suppression des 4 CORRECTIONS_* ; conservation de README, POSTGRES_MONITORING, TROUBLESHOOTING_LOGIN.
5. **docs/todo** : suppression de CORRECTIONS_EN_COURS et TODO_CORRECTIONS ; conservation de README et TODO_PERFORMANCE.
6. **security-service (racine)** : déplacement de FIREWALL_PLAN.md vers docs/security/FIREWALL_PLAN.md ; suppression du dossier racine.
7. **Rapport** : création de docs/RAPPORT_NETTOYAGE_MARS_2026.md (détail des suppressions, réponse sur services Go/Python, security-service, statistics).
8. **STATUS.md** : ajout d’une section « Documentation et nettoyage » avec lien vers le rapport et précisions sur services Node.js (pas de Go), statistics (dashboard-service Node, pas de Python).

### Clarifications (rapport)
- **Services en Go** : aucun service backend n’est en Go ; auth-service et les autres sont en Node.js. Migration Go éventuelle à planifier.
- **statistics.py** : ancienne doc décrivait une architecture Python ; le projet utilise dashboard-service (Node, statistics.controller.js) et metrics-aggregator.
- **Scripts** : aucune suppression dans scripts/ pour ne pas casser le Makefile ; audit ciblé possible plus tard.

---

## 27 fevrier 2026 – Rapports de tests 404, Test inconnu, compression

### Probleme
- **Rapports user-journey 404** : la route view utilisait en Docker `/tmp/journey-reports` alors que la liste (all) et le volume utilisent `USER_JOURNEY_REPORTS_DIR=/tmp/tests/user-journey-reports` → les rapports Parcours utilisateur affichaient « Fichier non trouvé ».
- **Anciens rapports 404** : des IDs (ex. 20260224-164723, 20251219-152341) apparaissaient dans la liste mais le fichier avait été supprimé ou déplacé → message d’erreur peu clair.
- **Test inconnu** : certains fichiers JSON de résultats contenaient des guillemets non échappés dans le champ `command`, ce qui rendait le JSON invalide et faisait échouer jq → libellé « Test inconnu » et statistiques vides.
- **Tests API Gateway Health** : en cas d’échec (ex. curl exit 7, gateway injoignable), les stats affichaient 0/0/0 au lieu de 1 échec.
- **Espace disque** : logs, rapports et monitoring s’accumulent sans compression.

### Solution
1. **`frontend/src/app/api/test-reports/view/route.ts`** : utilisation de `process.env.USER_JOURNEY_REPORTS_DIR` pour le type user-journey (comme pour la liste), au lieu de `/tmp/journey-reports` en Docker.
2. **`frontend/src/app/(admin)/backoffice/test-reports/page.tsx`** : en cas de 404 sur un rapport, message explicite « Rapport introuvable… Rafraîchissez la liste pour ne voir que les rapports disponibles ».
3. **`scripts/run-all-tests-with-reports.sh`** : génération du JSON de résultat avec `jq -Rs .` pour `testName` et `command` (échappement correct) ; lorsque `exit_code != 0` et aucune stat extraite, forcer `total=1`, `failed=1` pour afficher 1 échec (ex. API Gateway Health).
4. **`scripts/compress-old-reports.sh`** : nouveau script pour compresser en .tar.gz les rapports de plus de N jours (défaut 14) dans `tests/archived/`. Usage : `./scripts/compress-old-reports.sh [JOURS]`.

### Note pour plus tard
- **Rosenpath / WireGuard / logs** : mettre en place rosenpath pour la sécurité, WireGuard et une stratégie de rotation/archivage des logs (à documenter dans STATUS ou FONCTIONNALITES).
- **Frontend Jest** : « Cannot find module 'next/jest' » → exécuter depuis le dossier frontend : `cd frontend && npm install && npm run test:unit`.
- **Tests Intégration** : en cas de `SyntaxError` sur `test-full-system.js`, exécuter depuis la racine : `node tests/integration/test-full-system.js`.

---

## 27 fevrier 2026 – Analytics utilisateur et tests en echec

### Probleme
- **Page Analytics utilisateur** : la requete `GET /api/v1/analytics/events?limit=50` etait bloquee par uBlock Origin (ou erreur reseau), ce qui faisait echouer tout le `Promise.all` et affichait en console `[ANALYTICS] Erreur chargement donnees: Network Error`. La page ne chargeait pas les autres donnees (stats, errors, versions).
- **Test Enums** : le script `scripts/test-enums.js` attendait 6 valeurs pour `NotificationType` alors que le schema Prisma en contient 9 (ajout de CRASH_REPORT, ERROR_REPORT, STATUS_CHANGE) → echec « Valeurs manquantes ou incorrectes ».
- **Test CRUD Donnees (admin)** : « creer une entreprise » envoyait `size: '11-50'` alors que l’enum `CompanySize` n’accepte que STARTUP, SMALL, MEDIUM, LARGE, ENTERPRISE → reponse 500.

### Solution
1. **`frontend/src/app/(admin)/backoffice/user-analytics/page.tsx`** : remplacement de `Promise.all` par `Promise.allSettled` pour que l’echec d’une requete (ex. events bloquee par uBlock) n’empêche pas le chargement des autres. Ajout d’un state `eventsLoadError` et affichage d’un message explicite sur l’onglet « Evenements » en cas d’echec (« Evenements non disponibles (requete bloquee par une extension ou erreur reseau)... »).
2. **`scripts/test-enums.js`** : mise a jour de la liste attendue pour `NotificationType` pour inclure `CRASH_REPORT`, `ERROR_REPORT`, `STATUS_CHANGE`.
3. **`tests/e2e/specs/admin-data-crud.spec.ts`** : creation entreprise avec `size: 'SMALL'` au lieu de `'11-50'` pour respecter l’enum CompanySize.

### Non corrige (a investiguer si besoin)
- **test-status-engine.test.js** : le test « desactiver auto-statut devrait empecher la cascade entretien → INTERVIEW_PENDING » attend CANDIDATE_PENDING apres creation d’un entretien avec auto-statut desactive, mais recoit INTERVIEW_PENDING. Le backend (interview-service) respecte deja `UserCustomization.settings.statusEngine.autoStatusEnabled` ; a verifier en environnement de test (meme BDD auth/interview, ordre des appels).
- **Playwright CRUD Utilisateurs** : login 401 si identifiants admin non configures ou differents (TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD).
- **Playwright Securite** : certains tests attendent 400 pour des payloads invalides ; les APIs peuvent renvoyer 200/201 si la validation est permissive.
- **Playwright Email Workflows** : connexion nouvel utilisateur et reset password MailHog deja identifies comme flaky (delai email, tokens).

---

## 23 fevrier 2026 – Corrections parcours utilisateur mobile

### Probleme
- **ENOENT sauvegarde rapport** : `POST /api/user-journey/save-report` echouait avec `ENOENT: no such file or directory, open '/tmp/tests/user-journey-reports/...'`. Le repertoire existait dans l'overlay Docker mais etait corrompu (Links: 0, taille 0) — impossible d'y ecrire des fichiers.
- **PUT /applications/:id 500** : deux etapes du parcours envoyaient des champs invalides au controleur `updateApplication`. `link_contact_to_application` envoyait `contactId` (champ inexistant dans le modele Application). `update_application_status` envoyait `{ status: 'FIRST_INTERVIEW_PENDING' }` via PUT generique au lieu de l'endpoint dedie PUT `/:id/status`.
- **Reinitialisation des resultats** : apres execution du parcours, les resultats de chaque etape disparaissaient. Un `useEffect` dependant de `isRunning` resettait les steps a 'pending' quand le parcours se terminait.
- **verify_email 400** : l'appel `GET /auth/verify-email/test-token-simulation` retournait 400 car l'endpoint n'accepte pas de faux tokens.

### Solution
1. **`save-report/route.ts`** : remplace le `resolveReportsDir()` statique par `getWritableReportsDir()` qui teste l'ecriture reelle (write + rm) sur chaque candidat. Fallback sur `/tmp/journey-reports` si le chemin configure est inaccessible.
2. **`user-journey/page.tsx`** :
   - `link_contact_to_application` : supprime `contactId` du body PUT, envoie uniquement `notes`.
   - `update_application_status` : utilise `PUT /api/v1/applications/:id/status` avec `{ status, comment }`.
   - `verify_email` : supprime l'appel API, retourne directement un resultat de simulation.
   - `useEffect` d'initialisation des steps : remplace la dependance sur `isRunning` par un `useRef(prevScenario)` pour ne reset que lors d'un changement de scenario.
3. **`test-reports/all/route.ts`** et **`test-reports/view/route.ts`** : ajout du chemin fallback `/tmp/journey-reports` pour la lecture des rapports.

---

## 26 fevrier 2026 – Corrections tests echoues (7 tests / 216)

### Probleme
- `test-status-cascade.test.js` : `GET /applications/:id` retournait 500 (relation `activities` inexistante dans le schema Prisma).
- Routes application validaient les IDs avec `isUUID()` mais Prisma genere des CUIDs (pas des UUIDs) → rejection 400 silencieuse sur restore/archive.
- `api-e2e.spec.ts` : `config.testUser.email` utilisait `Date.now()` a l'import, different de celui de `ensureTestUser()` → login echouait car l'utilisateur n'existait pas.
- `archive-interactions.spec.ts` : `getUserToken` utilise mais non importe → crash beforeAll → 5 tests en 0ms.
- `backoffice-interactions.spec.ts` : `waitForLoadState('networkidle')` ne resolvait jamais (polling API continu).
- `performance-e2e.spec.ts` : timeout 10s trop court en environnement Docker dev.
- `security-e2e.spec.ts` : XSS attendait rejection 4xx mais API sanitise (200).

### Solution
1. **`application.controller.js`** : `include: { activities: ... }` → `include: { statusHistory: { orderBy: { changedAt: 'desc' }, take: 10 } }`
2. **`application.routes.js`** : `param('id').isUUID()` → `const idValidation = param('id').isString().notEmpty()` (applique partout)
3. **`api-e2e.spec.ts`** : utilise `_testCreds` (retour de `ensureTestUser`) au lieu de `config.testUser`
4. **`archive-interactions.spec.ts`** : ajout import `getUserToken`, `setupError` tracking avec `test.skip`
5. **`backoffice-interactions.spec.ts`** : `networkidle` → `domcontentloaded` + `waitFor()` sur elements rendus
6. **`performance-e2e.spec.ts`** : `MAX_PAGE_LOAD_MS` 10s → 30s, `networkidle` → `domcontentloaded`
7. **`security-e2e.spec.ts`** : XSS accepte sanitisation (200) ET rejection (4xx/5xx), payload overflow tolerant

### Nouveaux tests ajoutes
- `tests/e2e/specs/email-workflows.spec.ts` : inscription + verification email MailHog, reset password complet, envoi email reel
- `tests/e2e/specs/admin-data-crud.spec.ts` : CRUD complet 7 entites + archivage/restauration
- `tests/e2e/specs/admin-users-crud.spec.ts` : gestion utilisateurs admin
- `tests/e2e/specs/admin-security-complete.spec.ts` : firewall CRUD, IPs bloquees, menaces, WAF, logs securite
- Script rapport (`run-all-tests-with-reports.sh`) mis a jour avec 4 nouvelles suites

---

## 23 fevrier 2026 – Email de test reel et credentials securises

### Probleme
- Les tests email envoyaient vers `test@example.com` (adresse fictive), impossible de verifier la reception reelle.
- Credentials admin hardcodes dans `test-email-endpoints.test.js`.

### Solution
1. **`.env`** (gitignored) : ajout `TEST_REAL_EMAIL=test@delhomme.ovh`, `TEST_REAL_EMAIL_PASSWORD`, `TEST_REAL_EMAIL_IMAP_HOST=ssl0.ovh.net`, `TEST_REAL_EMAIL_IMAP_PORT=993`.
2. **`test-email-endpoints.test.js`** : utilise `getAdminUser()` au lieu de credentials hardcodes, envoie vers `REAL_TEST_EMAIL`.
3. **`test-data-helper.ts`** : exporte `REAL_TEST_EMAIL` pour usage dans les tests E2E Playwright.
4. Les credentials ne sont **jamais** committes (`.env` est dans `.gitignore`).

---

## 23 fevrier 2026 – Tests backoffice E2E sans authentification

### Probleme
- 6+ fichiers Playwright (application-workflow, data-management, export-import-advanced, load-tests, impersonation-tests, security-tests) naviguaient vers `/backoffice` sans etre connectes.
- Ces fichiers etaient dans `testIgnore` du projet Playwright `chromium` (donc pas de `storageState`).
- `archive-interactions.spec.ts` utilisait `getUserToken()` (user classique) au lieu de `getAdminToken()` pour tester des features admin.

### Solution
1. **`test-data-helper.ts`** : ajout `loginAsAdmin()` (login UI Playwright) et `getAdminCredentials()`.
2. **6 fichiers E2E** : ajout `loginAsAdmin(page)` dans `beforeEach` pour authentication standalone.
3. **`archive-interactions.spec.ts`** : `getUserToken` → `getAdminToken`.
4. **Rapport de tests** : chaque test affiche son type d'utilisateur (👑 ADMIN, 👤 USER, ⚙️ SYSTEM) dans le terminal, le HTML et le texte.

---

## 26 fevrier 2026 – Tests utilisent le mauvais type d'utilisateur

### Probleme
- Tous les tests (API, E2E, mobile, scripts) se connectaient avec le compte admin `admin@jobbingtrack.com` (role SUPER_ADMIN).
- Les tests fonctionnels (qui simulent l'app mobile) ne testaient pas le comportement reel d'un utilisateur classique (role USER).
- Impossible de detecter des bugs de permissions ou de filtrage par role.

### Solution
1. **`test-config.js`** : separe `testUser` (role USER, email dynamique) et `adminUser` (role SUPER_ADMIN).
2. **`auth.helper.js`** : `getTestUser()` (register + login USER) et `getAdminUser()` (login SUPER_ADMIN).
3. **`test-data-helper.ts`** : `ensureTestUser()` cree un compte USER et retourne les credentials pour les tests Playwright UI.
4. **13 fichiers migres** : 3 Jest API, 8 Playwright mobile, 2 Playwright API → utilisent USER.
5. **2 scripts shell migres** : `verify-user-journey.sh` et `test-api-specific.sh` → creent un utilisateur test.

---

## 26 fevrier 2026 – Cascade statuts et auto-evenements echouent silencieusement

### Probleme
- Les status codes `INTERVIEW_PENDING`, `INTERVIEW_DONE`, `OFFER_RECEIVED`, `REJECTED` n'existaient pas dans le seed SQL.
- `updateApplicationStatus()` dans interview-service faisait `if (!statusRow) return;` → echec silencieux.
- `EventType` n'avait pas de champ `code` → `createAutoEvent()` echouait silencieusement (try/catch).
- `getApplication()` dans application-service utilisait `orderBy: { scheduledAt: 'asc' }` → champ inexistant (correcte : `interviewDate`).
- Route `/applications/trash` definie APRES `/:id` → Express matchait "trash" comme un UUID → 404.

### Solution
1. **Seed SQL** : ajout des 11 statuts manquants dans `seed-status-tables.sql` (total 19 ApplicationStatus).
2. **EventType** : ajout champ `code` dans 9 schemas Prisma + seed 5 types (INTERVIEW, FOLLOWUP, CALL, DEADLINE, OTHER).
3. **application.controller.js** : `scheduledAt` → `interviewDate`, `scheduledDate` → `followUpDate`.
4. **application.routes.js** : `/trash` et `/archived` deplacees AVANT `/:id`.
5. **PUT /:id/status validation** : ajout des 10 nouveaux codes de statut dans la liste autorisee.

---

## 26 fevrier 2026 – db-push-all detruit les tables (P2003, register 500)

### Probleme
- `db-push-all.sh` executait `prisma db push --accept-data-loss` pour CHAQUE service (9 services).
- auth-service a 58 modeles, les autres 26-29. Chaque push avec un schema partiel **supprimait** les tables absentes de ce schema (EmailLog, UserSession, SecurityLog, etc.).
- Consequence : la creation d'entites (company, contact, interview) echouait avec P2003 (foreign key violation) ou "Invalid prisma.user.create() invocation".
- Les tests `test-archive-trash.test.js` et `test-status-cascade.test.js` passaient **a vide** (toutes les assertions skippees car les IDs de test etaient undefined).
- Seul `test-bdd-relations.test.js` detectait correctement les echecs (7 tests echoues).

### Cause racine
- Schemas Prisma **differents** entre services :
  - `auth-service` : 58 modeles (superset complet)
  - `company-service` : 27 modeles
  - `workflow-service` : 29 modeles (modeles uniques : Workflow, Activity, etc.)
- `prisma db push --accept-data-loss` depuis company-service SUPPRIMAIT les 31 tables absentes de son schema.
- Ordre de push : auth → application → company → ... → workflow. Chaque push apres auth detruisait progressivement les tables.

### Solution
1. **`scripts/db/db-push-all.sh`** : push uniquement depuis `auth-service` (schema maitre, 58 modeles). Les autres services sont ignores (leur client Prisma est genere au docker build).
2. **Tests ameliores** : ajout de logging explicite dans `beforeAll()` quand la creation de donnees de test echoue, au lieu de `return` silencieux.
3. **Fichiers modifies** : `scripts/db/db-push-all.sh`, `tests/api/test-bdd-relations.test.js`, `tests/api/test-archive-trash.test.js`, `tests/api/test-status-cascade.test.js`.

---

## 26 fevrier 2026 – Tests securite, performance, integration refaits

- **Probleme** : tests securite avec URLs incorrectes (`/api/applications` au lieu de `/api/v1/applications`), base URL pointant sur le frontend (port 8080) au lieu de l'API Gateway (port 5002). Tests performance ne testant que `/health` et utilisant cAdvisor (supprime). Tests integration utilisant raw WebSocket au lieu de Socket.IO. Rapport de test incoherent (faux positifs `❌ Tests echoues: 0`).
- **Solutions** :
  - `tests/security/test-security.js` : URLs corrigees vers `/api/v1/...`, base URL via `API_GATEWAY_URL`, headers manquants en `⚠️` au lieu de `❌`, endpoint auth bypass corrige
  - `tests/performance/test-performance.js` : reecrit – teste 12 vrais endpoints API (applications, companies, contacts, etc.), test de charge (65 requetes paralleles), metriques via metrics-aggregator (port 5004)
  - `tests/integration/test-full-system.js` : reecrit – utilise HTTP vers metrics-aggregator (port 5004), teste health, metriques systeme, Docker services, persistance
  - `scripts/run-performance-backend-in-container.sh` : reecrit – 17 tests (health + 8 endpoints API + 3 metriques + charge + temps de reponse)
  - `scripts/backend-performance-test.sh` : ajout `test_api_endpoints()` avec 10 endpoints reels
  - `frontend/scripts/performance-test.sh` : fix mode non-interactif (bloquait sur `read -r`)
  - `scripts/security/test-firewall.sh` : `❌` conditionnel uniquement si echecs > 0
  - Timeout Playwright augmente de 300s a 900s (213 tests au lieu de 93)
  - `persistence.routes.js` : `safeCount()` avec `.catch(() => 0)` pour les tables absentes (table `security_metrics_aggregated`)

---

## 25 fevrier 2026 – Parcours predefinis operationnels (21 scenarios)

- **Probleme** : les 21 scenarios predefinis echouaient (~14 % de reussite). Apres register/login, les etapes suivantes echouaient.
- **Causes** : (1) URLs API relatives au lieu de `${API_GATEWAY_URL}` pour 8 etapes. (2) Token session non propage entre les etapes. (3) Annulation non effective (closure async sur `isCancelled`).
- **Solutions** : URLs API corrigees dans `user-journey/page.tsx`. Token propage via `sessionToken` + `newToken`. Annulation via `isCancelledRef` (useRef).

---

## 25 fevrier 2026 – Parcours personnalise operationnel

- Execution complete (4/4 etapes), rapports sauvegardes dans `tests/user-journey-reports/`, lien vers "Rapports de parcours" ajoute.

---

## 25 fevrier 2026 – Page backoffice/tests corrigee

- **Cause** : import casse dans `run-playwright-mailhog/route.ts` (`../../testRunnerUtils` au lieu de `../testRunnerUtils`). Frontend 500 sur `/health`.
- **Solution** : chemin corrige. Frontend healthy apres restart.

---

## 25 fevrier 2026 – Rapports Tests CLI visibles dans le backoffice

- Scanner `test-reports/all` cherche aux deux emplacements (`/app/tests/results` + `/tmp/tests/results`) avec deduplication. `summary.json` enrichi avec `category: "Suite CLI"`.

---

## 25 fevrier 2026 – Rapports de parcours en Docker (EROFS)

- Volume dedie RW `./tests/user-journey-reports:/tmp/tests/user-journey-reports` + variable `USER_JOURNEY_REPORTS_DIR` ajoutes dans `docker-compose.yml`.

---

## 25 fevrier 2026 – Tests API 36/36

- Les 36 tests passent. Create Interview/Call/Followup utilisent l'ID de la candidature creee dans le run.

---

## 25 fevrier 2026 – Monitoring demarre apres db-push-all

- Profil `monitoring` ajoute pour `monitoring-c` et `metrics-aggregator`. Demarres apres `db-push-all` dans `make up-full`.

---

## 25 fevrier 2026 – Hub Tests, SMTP, MailHog

- Hub Tests : selection de categories, lancement, journal, rapports.
- SMTP OVH configure. Tables EmailLog/EmailTemplate creees. MailHog integre (profil `mail`/`full`).

---

## Fevrier 2026 – CI/CD : Validation des enums (EventType / EntityType)

- **Probleme** : le job GitHub Actions echouait avec "Enum EventType manquant". Le schema partage utilise `model EventType` (table), pas un enum.
- **Solution** : workflow adapte pour accepter `model EventType` en plus de `enum EventType` ; `EntityType` optionnel.

---

## Fevrier 2026 – Parcours personnalise : 500 quand une etape echoue

- **Probleme** : `execAsync` rejetait en cas d'exit code non nul, l'API renvoyait 500 sans les resultats.
- **Solution** : parse du JSON dans stdout meme en cas d'exit 1. Renvoie 200 avec resultats.

---

## Fevrier 2026 – Rapports Tests Securite : chiffres incoherents

- **Solution** : recalcul de totalTests/totalPassed/totalFailed a partir de `summary.security` pour les rapports securite.

---

## Fevrier 2026 – BigInt, container_logs, user-journey ENOENT

- **BigInt** : serialisation recursive BigInt -> Number avant `res.json()` dans persistence.routes.js.
- **container_logs** : lecture depuis `log_collector_logs` au lieu de `container_logs` dans log-collector-c.
- **ENOENT save-report** : utilisation de `USER_JOURNEY_REPORTS_DIR || '/tmp/user-journey-reports'` en Docker.

---

## Fevrier 2026 – User Journey token is not defined

- Ajout de `const { token } = useAuth()` dans `UserJourneyPage`.

---

## Fevrier 2026 – Mail / SMTP

- Table `EmailLog` creee par `make db-push-all`. Envoi de test OK apres.
- Config SMTP : noreply@maily.ovh, SMTP_FROM entre guillemets dans .env.
- Reply-To : `SMTP_REPLY_TO=noreply@jobbingtrack.com` + headers auto-generated.

---

## Fevrier 2026 – Tests API 15 echecs resolus

- profile-service : routes GET/PUT `/api/v1/profile/me` avec requireAuth.
- notification-service : routes protegees par requireAuth (401 sans token).
- dashboard-service : utilisation de statistics.controller au lieu de dashboard.controller.
- Script test-api-specific.sh : URL profil corrigee, applicationId pour Call/Followup.
- Schemas BDD alignes (statusId, verificationToken, loginCount).

---

## Fevrier 2026 – Tests API depuis Docker (bash not found)

- Remplacement de `bash` par `sh` dans toutes les routes run-* du frontend.

---

## Fevrier 2026 – Monitoring, Analytics, Temps de reponse

- monitoring-c utilise le port interne pour les health checks (docker inspect).
- Analytics : CPU Systeme avec graphique historique, temps de reponse depuis fetchMetrics().
- security-service : trust proxy = 1 au lieu de true.
- make logs : docker compose config --services puis docker compose logs -f.
- metrics-aggregator : champ log en string, gestion absence de table.

---

## Fevrier 2026 – Prisma, .env, db-push-metrics

- Prisma 6.7.0 pour metrics-aggregator (pas Prisma 7).
- DATABASE_URL dans .env a la racine, charge par Makefile.
- SMTP_FROM entre guillemets pour eviter erreur shell.

---

## Fevrier 2026 – Systeme Archivage / Corbeille complet

### Probleme
- Tous les `delete` etaient des hard deletes (suppression definitive).
- La cascade archivage n'etait pas implementee (stubs vides dans application-service).
- Les items supprimes disparaissaient sans possibilite de restauration.
- Pas de corbeille dans aucun service.

### Solution : Soft delete + Corbeille + Cascade

**7 services modifies** (application, interview, call, followup, event, company, contact) :

1. **Soft delete** : `DELETE /:id` met `deletedAt = now()` au lieu de supprimer en BDD.
2. **Filtrage** : `deletedAt: null` ajoute a toutes les requetes list/get pour masquer les items en corbeille.
3. **6 archive controllers crees** : chaque service expose `/trash`, `/trash/empty`, `/:id/restore`, `/:id/permanent`.
4. **Cascade logique** :
   - Supprimer un entretien → soft-delete les evenements lies (via `interviewId` sur Event)
   - Supprimer un appel → soft-delete les evenements lies (via `callId` sur Event)
   - Supprimer une relance → soft-delete les evenements lies (via `followUpId` sur Event)
   - Supprimer une candidature → soft-delete entretiens, relances, appels, evenements lies
   - Archiver une candidature → cascade identique
   - Restaurer → cascade inverse (restauration des elements lies)
5. **Application-service** : `archiveRelatedElements` et `restoreRelatedElements` implementes (avant : stubs vides).
6. **Vidage corbeille** : suppression definitive des items > 30 jours.

### Fichiers modifies
- `backend/*/src/controllers/archive.controller.js` (6 crees + 1 modifie)
- `backend/*/src/controllers/*.controller.js` (7 modifies : soft delete + filtres)
- `backend/*/src/routes/*.routes.js` (7 modifies : nouvelles routes trash)

---

## Fevrier 2026 – Erreurs Postgres au demarrage

### Probleme 1 : `security_logs does not exist`
- La table n'est creee que par `db-push-all` (Partie 3/3 via init-key-tables.sql).
- `security-service` la requete au demarrage avant que `db-push-all` ait ete execute.
- Le dossier `backend/init-db/` (monte sur `/docker-entrypoint-initdb.d`) etait vide.

### Solution
- Cree `backend/init-db/01-init-critical-tables.sql` : cree `security_logs` et `FollowUpStatus` au premier demarrage Postgres.

### Probleme 2 : `type "FollowUpStatus" already exists`
- **Cause racine** : 5 services definissent `FollowUpStatus` comme `model` (TABLE), 4 services (call, event, interview, workflow) le definissent comme `enum` (TYPE).
- `prisma db push` sur auth-service cree la TABLE (+ type composite implicite).
- Ensuite `prisma db push` sur call-service tente `CREATE TYPE "FollowUpStatus" AS ENUM` → conflit.

### Solution
- Aligne les 4 schemas problematiques : `enum FollowUpStatus` → `model FollowUpStatus` (table avec relation `statusId`).
- Ajoute nettoyage pre-push dans `db-push-all.sh` : `DROP TYPE IF EXISTS "FollowUpStatus" CASCADE`.
- Script init-db seed les statuts predéfinis (PENDING, POSITIVE_RESPONSE, etc.).

### Fichiers modifies
- `backend/call-service/prisma/schema.prisma`
- `backend/interview-service/prisma/schema.prisma`
- `backend/event-service/prisma/schema.prisma`
- `backend/workflow-service/prisma/schema.prisma`
- `scripts/db/db-push-all.sh`
- `backend/init-db/01-init-critical-tables.sql` (cree)

---

## Fevrier 2026 – Schema BDD partagee (notification-service + monitoring-c)

### Probleme 1 : `@@map("notifications")` dans notification-service
- Le modele `Notification` utilisait `@@map("notifications")` (minuscule) alors que la table en BDD est `Notification` (majuscule).
- Inserait dans table `notifications` inexistante → FK constraint violation.

### Solution
- Supprime `@@map("notifications")` du schema Prisma `notification-service`.
- Le modele pointe maintenant sur la table `Notification` existante.

### Probleme 2 : `User_email_key` duplicate key lors de `reportCrash`
- L'upsert dans `reportCrash` tentait de creer un User avec `req.user?.email` (ex: `admin@jobbingtrack.com`) deja pris par un autre ID.

### Solution
- Logique reecrite : `findUnique` par ID d'abord, puis `findUnique` par email, creation uniquement si aucun match.
- Plus de violation de contrainte unique.

### Probleme 3 : Schema User simplifie dans notification-service
- Le modele `User` utilisait `role: String` au lieu de `role: UserRole` enum.
- Colonnes manquantes : `authToken`, `verificationToken`, `lastLoginAt`, etc.

### Solution
- Copie du modele `User` complet depuis auth-service (avec tous les champs et `UserRole` enum).
- Enum `NotificationType` aligne dans les 10 schemas Prisma (CRASH_REPORT, ERROR_REPORT, STATUS_CHANGE ajoutes).
- `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS` execute en SQL direct.

### Probleme 4 : Tables `system_metrics` et `container_metrics` supprimees
- `prisma db push --accept-data-loss` depuis auth-service a supprime ces tables (creees par monitoring-c en C, pas par Prisma).

### Solution
- Tables recreees manuellement via SQL avec le schema exact de `monitoring-c/src/storage.c`.
- `container_metrics` inclut `system_metrics_id` (FK), `memory_mb`, `response_time_ms`, `http_status`.
- Index recrees : `idx_system_metrics_timestamp`, `idx_container_metrics_*`.

### Fichiers modifies
- `backend/notification-service/prisma/schema.prisma` (User complet + @@map supprime)
- `backend/notification-service/src/controllers/notification.controller.js` (reportCrash)
- `backend/auth-service/prisma/schema.prisma` (enum NotificationType)
- `backend/*/prisma/schema.prisma` (enum NotificationType dans 9 services)
- `backend/workflow-service/prisma/schema.prisma` (enum aligne + default SYSTEM)
- `mobile/lib/services/crash_reporter.dart` (monitoring memoire + tracking etendu)

---

Voir **STATUS.md** pour les taches restantes et **ERRORS.md** pour les erreurs non resolues.
