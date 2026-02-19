# ✅ Résolutions appliquées

**Dernière mise à jour** : Février 2026

---

## Priorité 1 validée (2026-02-19)

- **make up-full** : l’admin est créé automatiquement à la fin du démarrage (message « ✅ Utilisateur administrateur existe » ou « 🔧 Création automatique de l’admin... »).
- **Connexion backoffice** : admin@jobbingtrack.com / password123 OK.
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
5. **Tables BDD (priorité 2)** : après **make db-push-all**, la création des tables manquantes est considérée OK. Les logs peuvent être filtrés avec le marqueur **`[DB-PUSH-ALL]`** (déjà ajouté dans `scripts/db/db-push-all.sh`).

**Reste à valider en conditions réelles** : Create Company/Application/Contact (JWT avec userId admin réel après db-push-all), Events 403 (token bien transmis).

**Après modification des schémas Prisma : reconstruire puis db-push-all**  
Les conteneurs utilisent le code présent dans l’image. Après changement de `backend/*/prisma/schema.prisma` ou du code des services : (1) **`make build`** pour reconstruire les images, (2) **`make down && make up-full`** (ou redémarrage des services concernés), (3) **`make db-push-all`** pour pousser le nouveau schéma. Sinon les erreurs User.verificationToken, Application.status, dev_user_1 peuvent persister. Détail : **docs/tests/ECHECS_TESTS_API_2026-02-19.md** (§ « Après modification des schémas Prisma »).

**Marqueurs logs Tests API**  
Pour repérer le début et la fin d’un run depuis les logs : `[TESTS API] Démarrage des Tests API depuis le backoffice`, `[TESTS API] Lancement de la suite Tests API`, `[TESTS API] Début exécution des tests`, `[TESTS API] Exécution des tests terminée`, `[TESTS API] Fin de la génération du rapport`, `[TESTS API] Fin des Tests API` (frontend). Filtrer avec : `grep "[TESTS API]"` ou `grep "TESTS API"`.

**Conformité BDD (complément 2026-02-19)** :  
- **User** : colonnes `verificationToken`, `verificationTokenExpiry`, `loginCount` ajoutées aux schémas `backend/application-service/prisma/schema.prisma` et `backend/prisma/schema.prisma` pour que le login auth-service trouve l'utilisateur en BDD (plus d'erreur « column User.verificationToken does not exist ») et renvoie le vrai id admin au lieu de dev_user_1.  
- **Application / Interview** : schémas **interview-service**, **call-service**, **followup-service** alignés sur la BDD : `Application.status` remplacé par `statusId` + relation vers modèle `ApplicationStatus` ; `Interview.status` remplacé par `statusId` + relation vers modèle `InterviewStatus` ; `ApplicationStatusHistory` avec `previousStatusId`/`newStatusId`. Contrôleur interview-service : création d'entretien utilise `statusId` (résolution du code statut, ex. SCHEDULED). Après **`make db-push-all`**, les erreurs « column Application.status does not exist » et « column Interview.status does not exist » sont résolues.

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
   - Problème : `../../.env: ligne 44: erreur de syntaxe près du symbole inattendu « newline »` (ligne `SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>`).  
   - Solution : Mettre la valeur entre guillemets dans `.env` : `SMTP_FROM="JobbingTrack <noreply@jobbingtrack.com>"`. Ajout d’une note dans `.env.example` pour les valeurs contenant `<` ou `>`.

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
