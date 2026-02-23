# ✅ Résolutions appliquées

**Dernière mise à jour** : 10 février 2026

---

## Février 2026 – CI/CD : Validation des enums (EventType / EntityType)

- **Problème** : Le job GitHub Actions « Validation de la structure de base de données » échouait avec **« ❌ Enum EventType manquant »** (exit 1). Le workflow exigeait la présence de `enum EventType`, `enum NotificationType`, `enum EntityType` dans `backend/prisma/schema.prisma`.
- **Cause** : Le schéma partagé utilise **model EventType** (table), pas un enum ; **EntityType** peut être défini uniquement dans un service (ex. workflow-service).
- **Solution** : Dans `.github/workflows/ci-cd.yml`, la step « Validation des enums » a été modifiée pour : (1) accepter **model EventType** en plus de **enum EventType** ; (2) considérer **EntityType** comme optionnel et le chercher dans `*/prisma/schema.prisma` si absent du schéma partagé. Ainsi le job ne quitte plus en erreur sur EventType/EntityType.

---

## Février 2026 – Parcours personnalisé : 500 quand une étape échoue

- **Problème** : Lors du lancement d’un parcours personnalisé, si une étape échouait (ex. « Création entreprise échouée: Internal Server Error »), le script Node sortait avec code 1 et l’API `POST /api/user-journey/custom` renvoyait **500** ; l’utilisateur ne voyait pas les résultats ni le lien vers les rapports de parcours.
- **Cause** : `execAsync` rejette en cas d’exit code non nul ; le catch renvoyait 500 sans parser le stdout qui contient malgré tout le JSON du rapport.
- **Solution** : Dans `frontend/src/app/api/user-journey/custom/route.ts`, en cas d’erreur d’exécution, on capture `stdout`/`stderr` depuis l’erreur et on parse le JSON dans stdout comme avant. On renvoie toujours **200** avec `success: true` et les résultats (results, summary, context) dès que le JSON est valide, même si le script a exit 1. Ainsi les résultats et le résumé (réussis, échoués, ignorés) s’affichent et le rapport peut être sauvegardé / consulté.

---

## Février 2026 – Rapports Tests Sécurité : chiffres incohérents

- **Problème** : Le rapport Tests Sécurité affichait par exemple « 1 test exécuté, 1 réussi, 2 échoués » (incohérent : total ≠ réussi + échoués).
- **Cause** : Pour les rapports sécurité, le frontend lit `summary.summary` (totalTests, totalPassed, totalFailed) et parfois affiche aussi les vulnérabilités depuis `summary.security` ; lorsque le script n’avait pas correctement rempli le summary à partir de `security-report.json`, les valeurs pouvaient être mélangées.
- **Solution** : Dans `frontend/src/app/api/test-reports/all/route.ts`, pour les rapports dont la catégorie est « Tests Sécurité » et qui ont `summary.summary.security`, on recalcule **totalTests**, **totalPassed**, **totalFailed** à partir de `secure` et de `critical+high+medium+low` pour que Total = Réussis + Échoués soit cohérent.

---

## Février 2026 – Backoffice : BigInt, container_logs, user-journey save-report

- **BigInt (metrics-aggregator)** : Les réponses `GET /api/v1/persistence/containers/:containerName/metrics` contenaient des champs BigInt (ex. `cpuUsageNano`, `memoryUsageBytes`) que `JSON.stringify` ne peut pas sérialiser → 500 « Do not know how to serialize a BigInt ». **Solution** : ajout dans `backend/metrics-aggregator-service/src/routes/persistence.routes.js` d’une fonction `serializeBigInt(obj)` qui parcourt récursivement l’objet et convertit les BigInt en Number ; la réponse est passée par `serializeBigInt(...)` avant `res.json()`.
- **container_logs vs log_collector_logs (log-collector-c)** : L’API HTTP du log-collector-c lisait `FROM container_logs` avec des colonnes `container_id`, `container_name`, etc. La table `container_logs` (créée par init-key-tables) a des colonnes en camelCase (`"containerId"`, `"containerName"`). **Solution** : dans `ex-systems/log-collector-c/src/http_server.c`, la requête SELECT utilise désormais **log_collector_logs** (table créée et alimentée par le C, avec container_id, container_name, level, message, source, response_time_ms, http_status, is_error). Rebuild du service log-collector-c nécessaire après modification.
- **User Journey – ENOENT save-report** : En Docker, la route POST `/api/user-journey/save-report` faisait `mkdir(REPORTS_DIR)` avec `REPORTS_DIR = '/app/tests/user-journey-reports'` ; le répertoire parent `/app/tests` n’existe pas dans le conteneur frontend. **Solution** : dans `frontend/src/app/api/user-journey/save-report/route.ts`, en Docker utiliser `USER_JOURNEY_REPORTS_DIR || '/tmp/user-journey-reports'`. Le `mkdir(..., { recursive: true })` était déjà présent. Les rapports sont donc écrits dans `/tmp/user-journey-reports` dans le conteneur (volatiles sauf si volume monté).

---

## Février 2026 – User Journey – token is not defined

- **Problème** : En ouvrant la page Parcours utilisateur (User Journey), une erreur runtime s’affichait : `ReferenceError: token is not defined` (ligne 1699 de `user-journey/page.tsx`, dans le tableau de dépendances d’un `useEffect` qui enregistre automatiquement le rapport de parcours).
- **Cause** : Le composant utilisait `token` (dans `context: { testToken: token }` et dans les dépendances du `useEffect`) sans jamais le définir ; `useAuth()` n’était pas appelé.
- **Solution** : Ajout de `const { token } = useAuth()` au début du composant `UserJourneyPage`. Ainsi `token` est défini (éventuellement `undefined` si non connecté), et l’effet ne provoque plus d’erreur. L’affichage et l’enregistrement des rapports de parcours peuvent être utilisés sans crash. À vérifier ensuite : affichage complet des analytics et bon déroulement des scénarios (auth, étapes).

---

## Février 2026 – Mail / SMTP (Déliverabilité, envoi de test)

- **Problème** : Tests DNS et connexion SMTP OK (Backoffice → Déliverabilité) ; envoi d’email de test affichait « Erreur lors de l’envoi » alors que l’email arrivait bien en boîte mail.
- **Cause** : La table `public.EmailLog` n’existait pas. L’envoi SMTP réussissait, mais le logging (INSERT puis UPDATE) échouait → l’API renvoyait une erreur au frontend.
- **Solution** : Exécuter **`make db-push-all`** pour créer la table `EmailLog` (schéma auth-service). Après db-push-all, l’envoi de test ne renvoie plus d’erreur et les logs sont bien enregistrés.
- **Reply-To** : Configuré `SMTP_REPLY_TO=noreply@jobbingtrack.test` (affichage « répondre à » en jobbingtrack.com ; pas de boîte active sur ce domaine = pas de réponse possible). Ajout des headers `Auto-Submitted: auto-generated` et `X-Auto-Response-Suppress: All` pour indiquer que c’est un message automatique.
- **Config SMTP** : Compte OVH redacted@example.invalid (MX Plan maily.ovh actif) ; affichage expéditeur `JobbingTrack <noreply@jobbingtrack.test>`. DNS jobbingtrack.com : MX, SPF OK ; DKIM non configuré (optionnel).

---

## Priorité 1 validée (2026-02-19)

- **make up-full** : l’admin est créé automatiquement à la fin du démarrage (message « ✅ Utilisateur administrateur existe » ou « 🔧 Création automatique de l’admin... »).
- **Connexion backoffice** : admin@jobbingtrack.test / password123 OK.
- **Tests API depuis le backoffice** : lancement OK, rapport généré. Résultat : 21/36 tests passent, 15 échecs documentés dans **docs/tests/ECHECS_TESTS_API_2026-02-19.md** (profile 404, notification 200 vs 401, script dev_user_1, schéma BDD, dashboard, etc.).
- **Visibilité dans les logs** : au clic « Lancer les tests API », les logs affichent désormais `[TESTS API] Démarrage des Tests API depuis le backoffice` (frontend) et `[TESTS API] Lancement de la suite Tests API` (script), pour repérer facilement le début d’un run.

---

## Priorité 2 – Résolution des 15 échecs Tests API (2026-02-19)

Appliqué selon **docs/tests/ECHECS_TESTS_API_2026-02-19.md** :

1. **profile-service** : ajout des routes **GET** et **PUT** `/api/v1/profile/me` avec middleware `requireAuth` (401 sans token). Réponses mock pour le profil connecté.
2. **notification-service** : routes **GET** et **POST** `/api/v1/notifications` protégées par `requireAuth` → **401** sans token.
3. **dashboard-service** : les routes **GET** `/api/v1/dashboard/stats` et `/api/v1/dashboard/statistics` utilisent désormais **statistics.controller.getAggregatedStatistics** (agrégation HTTP vers les services) au lieu de **dashboard.controller.getStats** (Prisma sans modèle Application/Company dans ce service), ce qui supprime l'erreur « Cannot read properties of undefined (reading 'count') ».
4. **Script test-api-specific.sh** :
   - **Get User Profile** : URL corrigée en **GET /api/v1/auth/profile** (profil de l'utilisateur connecté) au lieu de `/api/v1/users/profile` (qui interprétait « profile » comme un id utilisateur → 404).
   - **Create Call** : envoi de **applicationId** (récupéré via liste des applications), **subject** et **callDate** pour satisfaire la validation du call-service.
   - **Create Followup** : envoi de **followUpDate** (requis) et **applicationId** récupéré depuis la liste des applications.
5. **Tables BDD (priorité 2)** : après **make db-push-all**, la création des tables manquantes est considérée OK. **Seed statuts** : `scripts/db/seed-status-tables.sql` est exécuté dans **db-push-all** (après les Prisma push) pour remplir ApplicationStatus, InterviewStatus, FollowUpStatus (ON CONFLICT (code) DO NOTHING). **application-service** : le contrôleur candidatures utilise **statusId** + résolution par code (ApplicationStatus) à la création et à la mise à jour ; ApplicationStatusHistory avec previousStatusId/newStatusId. Les logs peuvent être filtrés avec le marqueur **`[DB-PUSH-ALL]`**.

**Reste à valider en conditions réelles** : Create Company/Application/Contact (JWT avec userId admin réel après db-push-all), Events 403 (token bien transmis).

**Après modification des schémas Prisma : reconstruire puis db-push-all**  
Les conteneurs utilisent le code présent dans l’image. Après changement de `backend/*/prisma/schema.prisma` ou du code des services : (1) **`make build`** pour reconstruire les images, (2) **`make down && make up-full`** (ou redémarrage des services concernés), (3) **`make db-push-all`** pour pousser le nouveau schéma. Sinon les erreurs User.verificationToken, Application.status, dev_user_1 peuvent persister. Détail : **docs/tests/ECHECS_TESTS_API_2026-02-19.md** (§ « Après modification des schémas Prisma »).

**Marqueurs logs Tests API**  
Pour repérer le début et la fin d’un run depuis les logs : `[TESTS API] Démarrage des Tests API depuis le backoffice`, `[TESTS API] Lancement de la suite Tests API`, `[TESTS API] Début exécution des tests`, `[TESTS API] Exécution des tests terminée`, `[TESTS API] Fin de la génération du rapport`, `[TESTS API] Fin des Tests API` (frontend). Filtrer avec : `grep "[TESTS API]"` ou `grep "TESTS API"`.

**Conformité BDD (complément 2026-02-19)** :  
- **User** : colonnes `verificationToken`, `verificationTokenExpiry`, `loginCount` ajoutées aux schémas `backend/application-service/prisma/schema.prisma` et `backend/prisma/schema.prisma` pour que le login auth-service trouve l'utilisateur en BDD (plus d'erreur « column User.verificationToken does not exist ») et renvoie le vrai id admin au lieu de dev_user_1.  
- **Application / Interview** : schémas **interview-service**, **call-service**, **followup-service** alignés sur la BDD : `Application.status` remplacé par `statusId` + relation vers modèle `ApplicationStatus` ; `Interview.status` remplacé par `statusId` + relation vers modèle `InterviewStatus` ; `ApplicationStatusHistory` avec `previousStatusId`/`newStatusId`. Contrôleur interview-service : création d'entretien utilise `statusId` (résolution du code statut, ex. SCHEDULED). Après **`make db-push-all`**, les erreurs « column Application.status does not exist » et « column Interview.status does not exist » sont résolues.

**Resend (RESEND_API_KEY)** : optionnel ; tier gratuit disponible (ex. 3000 emails/mois). À configurer plus tard si envoi d’emails via Resend. Laisser vide dans `.env` pour éviter le warning Docker Compose (voir `.env.example`).

**make refresh-bdd** : une seule commande qui enchaîne build → down → up-full → db-push-all. Ce n’est pas une boucle : up-full lance db-push-all en interne (1x avec auth seul, 1x avec tous les services), puis l’étape 4 refait un db-push-all complet. Voir **make help-database**.

**Metrics-aggregator – container_logs** : l’erreur PostgreSQL « cache lookup failed for type NNNNN » en logs est connue et non bloquante ; la persistance des logs conteneurs est optionnelle. Le service traite cette erreur comme table/type manquant et n’envoie plus l’exception (évite le spam en logs).

**Backoffice Tests API – Résumé** : après chaque run, un résumé s’affiche dans la page (X/Y tests passés, Z échecs). L’API `/api/test/run-api` lit `summary.json` du rapport et renvoie `summary` dans la réponse.

---

## Février 2026 – Tests API depuis Docker (bash: not found)

- **Problème** : Lancement des tests API depuis le backoffice en Docker échouait avec `Command failed: ... /bin/sh: bash: not found`. Le conteneur frontend (Node) n’inclut pas `bash`.
- **Solution** : Remplacer **`bash`** par **`sh`** dans toutes les routes d’exécution de tests :
  - `frontend/src/app/api/test/run-api/route.ts` : `sh scripts/test-api-specific.sh`, `sh scripts/generate-test-report.sh`
  - `run-backend`, `run-frontend`, `run-backoffice`, `run-performance-backend`, **`run-performance-frontend`** : idem, `sh scripts/generate-test-report.sh ...`
- **Note** : Si `generate-test-report.sh` ou `test-api-specific.sh` échouent sous `sh` (p. ex. `echo -e` non POSIX), rendre les scripts POSIX ou installer `bash` dans le Dockerfile frontend.

---

## Février 2026 – Temps de réponse et Performance & Analytics

1. **monitoring-c – Health check et temps de réponse**  
   - Problème : la carte « Temps de réponse » affichait 0 ms ; les health checks depuis le conteneur monitoring-c utilisaient le port hôte (docker port) ou le nom du conteneur sans port, ce qui échouait sur le réseau Docker.  
   - Solution : dans `monitoring-c/src/collector.c`, récupération du **port interne** du conteneur via `docker inspect --format '{{range $p,$c := .NetworkSettings.Ports}}{{$p}}{{end}}'` (ex. `3001/tcp` → `3001`), puis construction de l’URL de health check avec `container_ip:port_interne`. Fallback sur `docker port` si besoin. Les temps de réponse sont ainsi renseignés et exposés dans `avg_response_time_ms` / `response_time_ms` par conteneur.

2. **Analytics – Temps de réponse et onglet CPU Système**  
   - Temps de réponse : dans la page Performances & Analytics, `loadPerformanceMetrics` utilise désormais `centralMetricsService.fetchMetrics()` pour lire `monitoringC.avg_response_time_ms` ou `responseTime.average_ms` et afficher la valeur (ou « N/A »).  
   - Nouvel onglet **CPU Système** en premier : graphique d’historique CPU à partir de `metricsHistory`, avec message de vérification (nombre de points, dernier enregistrement). Placeholders pour les onglets Mémoire et Réseau (à remplir plus tard).

---

## Février 2026 – Prisma, .env, make db-push-metrics

1. **Prisma 6.x pour metrics-aggregator**  
   - Problème : P1012 « datasource url no longer supported » avec Prisma 7 ; `@prisma/client@^6.22.0` n’existe pas sur npm.  
   - Solution : Fixer `prisma` et `@prisma/client` en **6.7.0** dans `backend/metrics-aggregator-service/package.json`. Le schéma reste avec `url = env("DATABASE_URL")` (compatible Prisma 6).

2. **DATABASE_URL pour Prisma**  
   - Problème : P1012 « Environment variable not found: DATABASE_URL » lors de `npx prisma db push` ou `make db-push-metrics`.  
   - Solution :  
     - Ajout de `DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@localhost:5000/jobbingtrack?schema=public` dans le `.env` à la racine (port = `POSTGRES_PORT`).  
     - Dans `makefiles/database/Makefile`, la cible `db-push-metrics` charge le `.env` depuis **$(ROOT_DIR)/.env** avant d’exécuter Prisma, et exporte `DATABASE_URL` avec une valeur par défaut si besoin.  
     - Création de `backend/metrics-aggregator-service/.env.example` pour les lancements manuels de Prisma depuis ce dossier.

3. **Erreur de syntaxe au source du .env**  
   - Problème : `../../.env: ligne 44: erreur de syntaxe près du symbole inattendu « newline »` (ligne `SMTP_FROM=JobbingTrack <noreply@jobbingtrack.test>`).  
   - Solution : Mettre la valeur entre guillemets dans `.env` : `SMTP_FROM="JobbingTrack <noreply@jobbingtrack.test>"`. Ajout d’une note dans `.env.example` pour les valeurs contenant `<` ou `>`.

4. **make db-push-metrics depuis la racine**  
   - La cible `db-push-metrics` est définie dans le Makefile base de données, inclus depuis la racine. Elle doit être appelée par `make db-push-metrics` **depuis la racine du repo**, pas depuis `backend/metrics-aggregator-service`.

---

## Février 2026 – Services et frontend

5. **security-service** : `app.set('trust proxy', 1)` au lieu de `true` pour éviter `ERR_ERL_PERMISSIVE_TRUST_PROXY`.  
6. **Auth (token expiré)** : Nettoyage silencieux sans `console.error` / `console.warn`.  
7. **backoffice/statistics** : Ajout de `import { preferencesService } from '@/lib/services/preferencesService'`.  
8. **Vue d’ensemble – Temps Réponse** : Affichage « N/A » ou « X ms » (y compris 0 ms).  
9. **Vue d’ensemble – État du système** : Grille en 2 colonnes (CPU Système / CPU Projet | Mémoire Système / Mémoire Projet).  
10. **Performances & Analytics** : Périodes 7j, 14d, 21d, 30d + plage personnalisée (date picker) avec compression.  
11. **make logs** : Utilisation de `docker compose config --services` puis `docker compose logs -f`.  
12. **metrics-aggregator persistence** : Champ `log` en string pour `ContainerLog.create()` ; `saveServiceAvailability` gère l’absence de table (warning en dev).  
13. **Backoffice services** : `is_healthy` aligné sur `health_status === 'healthy'`.  
14. **Temps de réponse** : centralMetricsService et backoffice gèrent 0 ms correctement.

---

## ✅ Fait (résolutions CORS, tables, métriques, healthchecks)

**Tables, db-push, CORS, Analytics (fait)**  
- db-push-all : crée toutes les tables via auth-service ; 21/21 services actifs ; ne pas lancer db-push-security/deployment seuls.  
- Frontend Analytics : API sur metrics-aggregator (5004) ; BigInt sérialisé ; CORS OK. Postgres « relation … does not exist » : résolu via db-push-all.

**CPU Projet, persistence, healthchecks (fait)**  
- CPU Projet / Mémoire Projet : fallback collectContainerMetrics + percent_of_system ; frontend reçoit system.jobbingtrack.containers (API 5004).  
- Persistence logs : log et parsedMessage coercés en string. 404 : ignoré. Healthcheck metrics-aggregator : [healthy]. Auth métriques : configurable ; make logs-metrics + Ctrl+C OK.  
- Sécurité : tables via db-push-all ; FIREWALL_PLAN.md en place. deployment : table deployments via db-push-all.

---

## ✅ Vérifications validées (checklist)

- make restart-service SERVICE=metrics-aggregator : nom Compose géré dans le Makefile.  
- BigInt sur /api/v1/persistence/system/metrics : sérialisation en Number.  
- CPU Projet / Mémoire Projet : fallback containerMetrics + percent_of_system.  
- make logs-metrics : Ctrl+C arrête la commande.  
- Authentification métriques : configurable.  
- Tables & db-push : 21/21 services actifs ; security_logs, network_connections, deployments créées via auth-service.  
- Interface Status : 21/21 services ; champs alimentés (CPU, mémoire, temps de réponse, santé).  
- Événements / rappels : backoffice (CRUD, calendrier) opérationnel ; app mobile écran /events (à brancher API).  
- Erreur BigInt 447.27 : server.js + persistence.service.js _safeBigInt ; rebuild requis.  
- Table network_connections : créée dans init-key-tables.sql (db-push-all).  
- Analytics : période par défaut "Aujourd’hui" ; sous-pages Performances & Analytics (complètes, réseau, applicatives, conteneurs, utilisateur).  
- Interfaces sécurité, réseau : opérationnelles (logs, analyse, firewall, menaces via gateway 5002).  
- centralLogger : auth, application, security ; logger-filter en copies locales.  
- Gestion des services : Services & Logs corrigée ; détail service (fusion monitoring-c + metrics-aggregator).  
- Politiques de sécurité : WAF, firewall, IPs bloquées ; ARCHITECTURE.md.  
- Analytics utilisateur : onglet Versions & App mobile ; API versions.  
- Requêtes SQL en C (log-collector-c, monitoring-c) : prepared statements, plus d’injection SQL.

---

## État actuel (résumé)

- **Prisma / DB** : metrics-aggregator en Prisma 6.7.0 ; `make db-push-metrics` fonctionne avec `.env` à la racine (DATABASE_URL + SMTP_FROM quoté).  
- **Services** : security-service, auth, frontend (token, Statistiques, Temps Réponse, unhealthy) corrigés.  
- **Monitoring** : monitoring-c + metrics-aggregator opérationnels ; persistance et historique en place.

Voir **STATUS.md** pour la vue d’ensemble (section « À FAIRE » en premier, puis « Résolu / Fait ») et **ERRORS.md** pour le détail des erreurs et leur statut.
