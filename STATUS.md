# 📊 État du Projet JobbingTrack

**Dernière mise à jour** : Février 2026

---

## ✅ Modifications récentes (db-push-all, navigation, Services & Logs, liste services)

- **`make db-push-all`** : le script `scripts/db/db-push-all.sh` fait (1) Prisma db push sur tous les services (auth, application, etc.), (2) `init-system-metrics.sql` (system_metrics, container_metrics, service_availability_history), (3) **`init-key-tables.sql`** (security_logs, system_metrics_snapshots, network_connections, **network_threats**). Les tables clés sont bien créées par `make db-push-all`. Commentaire en tête du script.
- **Navigation** : section **Sécurité** sans doublon (items plats : Logs de Sécurité, Politiques, Analyse, Firewall, Réseau, Menaces). Sous **Statistiques & Monitoring** : lien **« Logs des conteneurs »** vers `/backoffice/services/logs`.
- **Services & Logs** : appel d’abord à l’API Gateway (`/api/v1/security/logs`, `/api/v1/logs`) pour afficher les logs sécurité même si log-collector (5099) renvoie 500 ; puis tentative log-collector pour enrichir.
- **Liste des services** : si monitoring-c répond avec 0 conteneurs, fallback vers **metrics-aggregator** (`/api/v1/docker/services/all`) pour afficher la liste au lieu de « Aucun service disponible ».
- **Détail service** : logs via metrics-aggregator ; affichage null-safe. À faire : graphiques sécurité dans le temps, logs par conteneur en BDD + temps réel.

---

## ✅ Modifications récentes (Gestion des services, Services & Logs, détail service – historique)

- **Administration > Gestion des Services** :
  - **Services & Logs** : le bouton et la page fonctionnent. Correction du bug (variable `normalizedServiceFilter` non définie qui faisait planter le filtre par service). Fallback logs via API Gateway (`/api/v1/security/logs`) avec URL `NEXT_PUBLIC_API_URL` (5002). Liste de services enrichie avec des noms connus pour le filtre même sans logs.
  - **Navigation** : « Services & Logs » est un sous-élément de « Gestion des Services » dans le menu (Liste des services, Services & Logs). Bouton « Retour » (flèche) sur la page Services & Logs vers `/backoffice/services`.
  - **Détail d’un service** (ex. metrics-aggregator) : fusion correcte des données (monitoring-c + metrics-aggregator) en un seul état ; recherche du conteneur avec ou sans préfixe `jobbingtrack-` ; appel à l’API docker du metrics-aggregator avec les deux noms si besoin ; lien « Retour » explicite vers la liste des services ; message clair si le service n’est pas détecté.
- **Sécurité** : Politiques de sécurité (WAF global + règles, firewall, IPs bloquées) branchées sur les APIs ; architecture documentée dans `backend/security-service/ARCHITECTURE.md`. Analytics utilisateur : onglet « Versions & App mobile » (appareils, versions par plateforme, métriques performance) avec API `GET /api/v1/analytics/stats/:userId/versions`.

---

## 🔴 Erreurs corrigées (récent)

| Erreur | Cause | Correction |
|--------|--------|------------|
| `[PERSISTENCE] The number 447.27 cannot be converted to a BigInt` | Valeurs mémoire/disque/réseau en float passées à `BigInt()` sans arrondi | **server.js** : `systemMetricsForDb.memory` (used/total/free) et `network` (rx/tx) arrondis avant envoi ; conteneurs monitoring-C : bytes arrondis. **persistence.service.js** : helper `_safeBigInt(val)` utilisé pour tous les champs BigInt (système, conteneurs, réseau). Après modif : **`make rebuild-metrics-aggregator`**. |
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

## ⏳ Ce qu’il reste à faire (suite roadmap)

- **centralLogger** : déployé dans auth-service, application-service et security-service. **logger-filter** : copies locales conservées (build Docker n’inclut pas `shared`) ; garder en sync avec `backend/shared/logger-filter.js`.
- **Interfaces sécurité/réseau** : opérationnelles — backoffice sécurité utilise l’API Gateway (5002) pour logs, analyse, firewall, menaces, tableau réseau. Analyse de sécurité via `getSecuritySummary` (security-service).
- **Événements & rappels** : backoffice en place (liste, calendrier, CRUD, filtres, type « Rappel »). App mobile : écran « Événements & Rappels » ajouté (route `/events`) ; à connecter à l’API `GET/POST /api/v1/events` et rappels locaux/push.
- **Flux métriques** : **Frontend** appelle **metrics-aggregator** (port 5004, `GET /api/v1/metrics`) en priorité ; l’aggregator récupère les métriques depuis **monitoring-c** (toutes les 10 s) et les expose. Si l’aggregator est down, le frontend bascule sur monitoring-c (fallback). À terme, le **security-service** (et d’autres) pourront alimenter l’aggregator pour un tableau de bord unifié (métriques + sécurité). Un « super-aggregator » au-dessus de tout est optionnel plus tard.
- **Organisation métriques type ex-systems** : compression graphiques mémoire/réseau en place (page Performances complètes). **Divers** : monitoring-c (stabilité, ERR_EMPTY_RESPONSE), tests de charge, CI/docs performance.
- **Statistiques & Monitoring / Sécurité** : graphiques navigables dans le temps (disponibilité, taux d'erreur, DNS) pour l'onglet Sécurité ; logs par conteneur en temps réel + persistance BDD pour consultation dans le temps et combinaison multi-conteneurs.

### À faire – Analytics, stats utilisateurs et application mobile
- **Analytics** : récupérer et afficher plus de stats (données agrégées par utilisateur, par période, par type d’événement). Enrichir les tableaux de bord (tendances, comparaisons, exports).
- **Données utilisateurs** : stats détaillées par utilisateur (sessions, appareils, versions d’app, métriques d’usage). Croisement avec les données métier (candidatures, événements, erreurs).
- **Application mobile** : remonter et afficher les métriques spécifiques (version app, OS, device, crashs, temps de chargement, événements in-app). S’assurer que l’app envoie bien `platform`, `appVersion`, `deviceId` (sessions, événements, `POST /api/v1/analytics/device`). Exploiter l’onglet « Versions & App mobile » dans Analytics utilisateur.
- **Performances & Analytics** : compléter l’onglet Performance (métriques réelles), lier les métriques mobile aux graphiques, alertes ou seuils optionnels.

**Fait (sécurité, analytics)** : Logs de sécurité (backoffice) via gateway 5002. Analyse de sécurité (résumé 24h). Firewall, menaces, tableau réseau (pages dédiées). — **Performances complètes** : page enrichie (CPU, mémoire, réseau système), plage personnalisée séparée, affichage de la plage avec flèches, **bouton « Période actuelle »**. **Analytics conteneurs** : option **« Tous les conteneurs »** avec graphiques combinés (CPU et mémoire par conteneur), sélecteur + plage + bouton Période actuelle. **Sécurité > Réseau** : libellé « Statistiques réseau orientées sécurité ». **Nouvelles pages** sous Performances & Analytics : **Performances réseau** (RX/TX système), **Performances applicatives** (temps de réponse, disponibilité, totaux utilisateurs/candidatures depuis l’app).

---

## 🎯 Vue d’ensemble de l’application

| Domaine | Description | Statut |
|--------|-------------|--------|
| **API REST** | API Gateway + microservices (auth, application, company, contact, interview, call, event, followup, profile, notification, workflow, deployment, dashboard) | ✅ Opérationnel |
| **Monitoring** | monitoring-c (C), log-collector-c, métriques temps réel | ✅ Opérationnel |
| **Collecteur de statistiques** | metrics-aggregator-service (Node), persistance Prisma/PostgreSQL, snapshots système et conteneurs | ✅ Opérationnel (tables créées via `make db-push-all`) |
| **Historique des métriques** | PostgreSQL (system_metrics, container_metrics, tables Prisma metrics-aggregator), Analytics backoffice, périodes 1h → 30j + plage personnalisée | ✅ En place |
| **Sécurité / Firewall** | security-service, WAF dans l’API Gateway, firewall engine (iptables, fallback en dev) | ✅ Opérationnel |
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
- **SMTP_FROM** : valeur avec `<...>` **entre guillemets** (ex. `SMTP_FROM="JobbingTrack <noreply@jobbingtrack.test>"`) pour éviter une erreur de syntaxe lors du `source` dans le Makefile.

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

## ⏳ À faire (suite)

### Priorité
- **centralLogger / logger-filter** : déployé dans auth, application et security ; étendre aux autres services si besoin. Copies locales du logger-filter conservées (Docker).
- **Événements & rappels** : backoffice fait (CRUD, liste, calendrier, type rappel). Mobile : écran /events en place ; brancher API + rappels/notifications.

### Graphiques, monitoring, structure
- **Compression** : étendre aux graphiques mémoire et réseau ; startDate/endDate plage personnalisée.
- **monitoring-c** : réduire ERR_EMPTY_RESPONSE / mode starting ; retry frontend si besoin.
- **Temps de réponse** : vérifier /health et avg_response_time_ms. **Frontend** : unifier /analytics vs /backoffice/analytics.
- **Références** : make git-checkout, TESTS_END.md, FIREWALL_PLAN.md. Tests de charge, CI performance.


---

## 📋 Modifications prévues / Roadmap (suite)

### Déjà en place
- **Status (backoffice)** : 21/21 services actifs ; tables créées via db-push-all ; sources (monitoring-c + metrics-aggregator) branchées.
- **Sécurité** : Tables security_logs, firewall_rules, network_connections créées ; interfaces backoffice à rendre pleinement opérationnelles si besoin.

### À faire (priorité)
- **centralLogger / logger-filter** : déployer partout ; documenter ; supprimer copies locales.
- **Événements & rappels** : backoffice (CRUD, filtres) + app mobile (calendrier, notifications).
- **Réseau** : Métriques RX/TX, menaces ; interfaces associées ; ex-systems stables et documentés.
- **Gestion des services** : liste complète (tous les services connus visibles même si monitoring-c n’en remonte qu’une partie) ; détail service stable pour tous les conteneurs (metrics-aggregator, api-gateway, etc.).
- **Analytics & mobile** : stats utilisateur enrichies, métriques app mobile (versions, crashs, perfs), tableau de bord unifié.
- **Gestion des services** : liste complète (tous les services connus visibles même si monitoring-c n’en remonte qu’une partie) ; détail service stable pour tous les conteneurs (metrics-aggregator, api-gateway, etc.).
- **Analytics & mobile** : stats utilisateur enrichies, métriques app mobile (versions, crashs, perfs), tableau de bord unifié.

### Collecte et ex-systems
- **Collecte** : CPU Projet / Mémoire Projet en continu (déjà fallback Docker + percent_of_system).
- **ex-systems** : Améliorer monitoring-c et log-collector-c (stabilité, healthchecks) ; documenter les flux ; Network Monitor en C selon FIREWALL_PLAN.md si prévu.

### centralLogger et logger-filter (backend shared)
- **centralLogger.js** (`backend/shared/utils/centralLogger.js`) : Envoi des logs ERROR/WARN/FATAL vers le metrics-aggregator (`POST /api/v1/persistence/logs`). URL par défaut : `http://jobbingtrack-metrics-aggregator:3014` (ou `METRICS_SERVICE_URL` / `METRICS_AGGREGATOR_URL`). À utiliser dans les microservices pour centraliser les logs côté agrégateur.
- **logger-filter.js** (`backend/shared/logger-filter.js`) : Filtre Winston pour supprimer le spam des erreurs P2021 (table non trouvée) en développement. Tous les services devraient importer depuis `backend/shared/logger-filter.js` (ou un chemin relatif cohérent) pour éviter les copies locales et garder un comportement unique.
- **À faire** : Vérifier que chaque service (auth, application, company, security, etc.) utilise soit le centralLogger pour les logs critiques, soit au minimum le logger-filter dans son logger Winston ; documenter l’usage dans un README shared ou dans la doc projet.

### Événements et rappels (emploi, bootcamp, entretiens, etc.)
- **Objectif** : permettre à l’utilisateur de **créer des événements** et **rappels** pour gérer son emploi / sa recherche (entretiens, bootcamps, formations, deadlines, etc.) — enregistrement des différents types d’événements liés à l’emploi.
- **Backoffice** : **interface dédiée** pour gérer / visualiser événements et rappels (liste, création, édition, suppression, filtres par type et date). À ajouter dans le menu backoffice (ex. « Événements & rappels » ou intégré au module existant).
- **Application mobile** : intégrer la **création et la gestion des événements / rappels** (calendrier, notifications, liste). Rappels locaux ou push selon la stack mobile.
- **À faire** : modèles (event-service ou module dédié), API (CRUD événements + rappels), backoffice (écrans), app mobile (écrans + rappels). Vérifier si event-service existant couvre déjà une partie et l’étendre.

### Interface Status (backoffice) et organisation des métriques
- **Status** : Vue d’ensemble avec **tous les champs alimentés** (CPU système/projet, mémoire système/projet, temps de réponse, santé des services). Vérifier que les sources (monitoring-c + metrics-aggregator) remontent bien jusqu’au frontend et qu’aucun bloc ne reste en N/A sans raison.
- **Organisation type ex-systems** : structurer le **nouveau système de métriques** comme dans ex-systems : une source claire (monitoring-c pour la collecte bas niveau, metrics-aggregator pour l’agrégation et la persistance), des endpoints documentés, des flux explicites (qui appelle qui, quels ports). Documenter dans STATUS ou un doc dédié (ex. `docs/metrics-flow.md`) : monitoring-c (5098) → metrics-aggregator (5004) → frontend (5003 backoffice). Compléter les parties manquantes (métriques réseau, santé des services, logs centralisés) pour avoir un système cohérent.

### centralLogger et consolidation
- **centralLogger** : déployé dans auth-service, application-service et security-service (transport Winston → `POST /api/v1/persistence/logs`). À étendre aux autres services si besoin (voir backend/shared/README.md).
- **logger-filter** : copies locales dans chaque service (nécessaire car le build Docker n’inclut pas `shared`) ; garder en sync avec `backend/shared/logger-filter.js`.

---

## 🚀 Commandes utiles

```bash
# Depuis la racine du repo

# Statut de tous les services
make status

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

# Arrêter
make down
```

**Note db-push** : `make db-push-all` exécute le push dans chaque conteneur (auth, application, company, etc.) ; les tables security/deployment/metrics sont créées par le schéma auth-service. Postgres et les conteneurs listés doivent être démarrés. Lancer depuis la **racine** du repo. `.env` doit contenir `DATABASE_URL=postgresql://...@localhost:PORT/jobbingtrack?schema=public` (PORT = `POSTGRES_PORT`) si besoin de Prisma en local.

---

## 📊 Statistiques projet

- **Services** : 21+ avec healthchecks (API Gateway, auth, microservices métier, security, metrics-aggregator, monitoring-c, log-collector, postgres, redis, frontend).
- **Monitoring** : monitoring-c (C) + log-collector-c ; ancien stack Prometheus/Grafana/Loki supprimé.
- **Persistance métriques** : PostgreSQL (monitoring-c + metrics-aggregator Prisma).

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

## 📝 Références

- **docs/metrics-flow.md** : flux des métriques (monitoring-c → metrics-aggregator → frontend), ports, authentification.
- **ERRORS.md** : erreurs rencontrées et statut (corrigées / en cours).
- **RESOLUTIONS.md** : résolutions appliquées (sécurité, frontend, Prisma, .env, make).
