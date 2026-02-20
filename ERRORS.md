# 🔍 Rapport d’analyse des erreurs

**Dernière mise à jour** : Février 2026

---

## ⏳ À traiter en priorité (erreurs connues)

- **Tests API – 34 échecs (rapport 47 tests, 13 passent)** : Détail dans **docs/tests/ECHECS_TESTS_API_2026-02-19.md**. **Erreur 1 – Login 401** : le script utilise `admin@jobbingtrack.test` / `password123` mais l’admin en BDD était créé avec le hash bcrypt pour « secret » (INSERT SQL dans create-admin-user.sh). **Résolution** : le script **create-admin-user.sh** privilégie désormais la création via **auth-service** (Node + bcrypt pour `ADMIN_PASSWORD`). **Action** : lancer **`make create-admin-user`** avec **auth-service démarré** pour que l’admin ait password123. **Erreur 2 – Profile 404** : GET/PUT `/api/v1/profile/me` renvoient 404 (HTML « Cannot GET/PUT ») ; les routes existent dans le code profile-service. **Action** : **rebuild profile-service** (`make build` ou rebuild du service) pour que l’image embarque les routes. **Erreur 3 – Notification 200 au lieu de 401** : sans token, le test attend 401 mais reçoit 200 (données démo). **Action** : **rebuild notification-service**. Les autres échecs (Get Profile, List Users, Companies, etc.) sont des conséquences du login qui échoue (pas de token) ou du profile 404.
- **create-admin-user échoue « Aucun conteneur PostgreSQL trouvé »** : le script a besoin de la stack démarrée. **Ordre** : **`make up-full`** d'abord, puis **`make create-admin-user`**.
- **Tables BDD manquantes au démarrage** : logs Postgres indiquent `deployments`, `container_logs`, `system_metrics_snapshots`, `service_availability_history` absentes. **Action** : lancer **`make db-push-all`** après démarrage des services.
- **Tests API depuis Docker** : ~~`/bin/sh: bash: not found`~~ → **Corrigé** : les routes d’exécution de tests utilisent désormais **`sh`** au lieu de `bash`. Si les scripts échouent sous `sh`, les rendre POSIX ou installer `bash` dans l’image frontend.
- **Configuration emails – test SMTP** : `GET /api/v1/emails/test-smtp` → **503 (Service Unavailable)**. Rendre le service opérationnel ou gérer côté front.
- **Logs emails** : requête vers `http://localhost:5003/backoffice/emails/logs` → **404**. Corriger l’URL (API Gateway ou bon service/port).
- **Analytics utilisateur – versions** : `GET /api/v1/analytics/stats/:userId/versions?days=7` → **404**. Implémenter la route backend ou adapter le front.

Voir **STATUS.md** (section « À FAIRE ») pour la liste complète des tâches priorisées.

---

## ✅ Erreurs corrigées (Février 2026)

### Tests API – Login 401 (admin password)
- **Login 401 « Invalid email or password »** — L’admin était créé par le chemin SQL de `create-admin-user.sh` avec un hash bcrypt pour le mot de passe « secret », alors que le script de test utilise **password123**. **Correction** : `backend/scripts/database/create-admin-user.sh` privilégie désormais la création via **auth-service** (Node + `bcrypt.hash(ADMIN_PASSWORD, 10)`). Si auth-service est indisponible, fallback avec hash « secret » et message invitant à relancer avec auth up. **Action utilisateur** : lancer **`make up-full`** puis **`make create-admin-user`** (auth-service up pour password123 ; sans stack up → « Aucun conteneur PostgreSQL trouvé »).

### Prisma et base de données (metrics-aggregator)
- **P1012 « The datasource property `url` is no longer supported »** — Le projet utilise **Prisma 6.x** (6.7.0) dans `backend/metrics-aggregator-service`. Ne pas utiliser Prisma 7 en global ; les versions `prisma` et `@prisma/client` sont fixées en 6.7.0 dans le `package.json`.
- **P1012 « Environment variable not found: DATABASE_URL »** — `make db-push-metrics` charge désormais le `.env` à la racine (`$(ROOT_DIR)/.env`). Le fichier `.env` doit contenir `DATABASE_URL=postgresql://...@localhost:PORT/jobbingtrack?schema=public` (PORT = `POSTGRES_PORT`, ex. 5000).
- **Erreur de syntaxe au source du .env (ligne 44)** — `SMTP_FROM=JobbingTrack <noreply@jobbingtrack.test>` provoquait une erreur shell à cause de `<` et `>`. **Correction** : mettre la valeur entre guillemets : `SMTP_FROM="JobbingTrack <noreply@jobbingtrack.test>"`.
- **P1001 « Can't reach database server »** — Vérifier que Postgres est démarré (`docker compose up -d postgres`) et que `DATABASE_URL` utilise le bon port (celui exposé sur l’hôte, ex. 5000).

### Table User manquante (auth-service)
- **« The table `public.User` does not exist in the current database »** — L'auth-service utilise la même base PostgreSQL ; si les tables du schéma auth n'ont jamais été créées, cette erreur apparaît. **Correction** : exécuter **`make db-push-auth`** (crée les tables User, etc.) ou **`make db-push-all`** (tous les schémas). Postgres doit être démarré avant.

### Services et frontend
- **security-service** : `ValidationError: ERR_ERL_PERMISSIVE_TRUST_PROXY` — `trust proxy` passé de `true` à `1`.
- **Frontend – Token expiré** : Nettoyage silencieux (plus de messages console).
- **Page Statistiques** : `ReferenceError: preferencesService is not defined` — import `preferencesService` ajouté.
- **Vue d’ensemble – Temps Réponse** : Affichage « N/A » ou « X ms » (y compris 0 ms).
- **make logs** : « No such container » — utilisation de `docker compose config --services` puis `docker compose logs -f`.
- **metrics-aggregator** : Champ `log` (Object au lieu de String) — sérialisation en string avant `ContainerLog.create()`. Table `service_availability_history` absente — gérée par un warning en dev.
- **Backoffice – 6 services unhealthy** : `is_healthy` aligné sur `health_status === 'healthy'`.

---

## 📊 Résumé (état actuel)

### ✅ Résolu
- Erreurs Prisma P1012 (datasource url / DATABASE_URL) et chargement `.env` pour `db-push-metrics`.
- Syntaxe `.env` (SMTP_FROM entre guillemets).
- security-service, token expiré, Statistiques, Temps Réponse, make logs, metrics-aggregator persistence, compteur unhealthy.

### ⚠️ À surveiller
- **monitoring-c** : parfois en mode `starting` ; **ERR_EMPTY_RESPONSE** occasionnel.
- **Tables Prisma** : certains services peuvent encore avoir des tables manquantes (company, contact, etc.) ; créer les schémas / migrations si besoin.

### ⏳ En attente / non bloquant
- Tests (`make test-all`) peuvent échouer tant que toutes les tables et services ne sont pas en place.
- deployment-service : « Table Deployment non trouvée » en dev — à traiter si le service est utilisé.

### 🔧 Correctifs récents (temps de réponse et Analytics)
- **Carte temps de réponse à 0 ms** : monitoring-c utilise le port interne pour les health checks (docker inspect). Vue d’ensemble et Performances utilisent `monitoringC.avg_response_time_ms` / `responseTime.average_ms` depuis `fetchMetrics()`.
- **Performance & Analytics** : CPU Système avec graphique historique ; Mémoire et Réseau en place. Temps de réponse alimenté par fetchMetrics() (monitoring-c / metrics-aggregator).
- **Backoffice Analytics** : chargement accéléré (startDate/endDate, limit 500, refresh 60 s), suppression des console.log ([CPU TEST], [COMPRESSION], [CENTRAL METRICS], [STATISTICS]).
- **Drawer** : Gestion des Emails avec **subItems décalés** (Dashboard, Email Monitor, Historique, Templates, Configuration, Déliverabilité) comme Tests ; Sécurité avec subItems.
- **Tests API (Docker)** : erreur « bash: not found » — corrigée en utilisant **`sh`** dans toutes les routes run-* (run-api, run-backend, run-frontend, run-backoffice, run-performance-backend, run-performance-frontend).

---

## 🎯 Prochaines vérifications

1. Exécuter `make db-push-all` depuis la racine avec Postgres démarré et `.env` correct.
2. Vérifier que le frontend affiche bien les métriques et que les graphiques Analytics chargent les données.
3. Surveiller les logs monitoring-c (ERR_EMPTY_RESPONSE, starting).
4. Corriger les URLs / services pour **logs emails** (404) et **test SMTP** (503).
5. Implémenter ou adapter **API versions** (analytics utilisateur) si l’onglet « Versions & App mobile » est utilisé.

Pour le détail des correctifs appliqués, voir **RESOLUTIONS.md**. Pour la liste consolidée des tâches (à faire en priorité puis fait), voir **STATUS.md** (section « À FAIRE » en premier).
