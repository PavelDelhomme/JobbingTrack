# 📊 État du Projet JobbingTrack

**Dernière mise à jour** : Février 2026

---

## ⏳ À FAIRE (priorisé – par où commencer)

Cette section liste **tout ce qu’il reste à faire** pour que le projet soit pleinement opérationnel. Traiter dans l’ordre des priorités ci‑dessous.

### Comment commencer (ordre conseillé)
1. **Tester tout de suite** : redémarrer le frontend pour appliquer le volume **`./scripts:/app/scripts`** et **`PROJECT_ROOT=/app`**, puis lancer les **tests API** depuis Backoffice > Développement > Tests > Tests API. Si ça passe → OK ; sinon vérifier les logs du conteneur `jobbingtrack-frontend`.
2. **Ensuite** : corriger les erreurs restantes (SMTP 503, logs emails 404, API versions 404).
3. **Puis** : sécurité (firewall, politiques, menaces), emails (templates, config), tests Playwright/Backend/etc., reste de la liste.

**Comportement connu après `make up-full`** : la base peut être recréée vide. Le backoffice peut encore vous afficher comme « connecté » (JWT en session) alors que la page **Utilisateurs** affiche « Aucun utilisateur trouvé » : la nouvelle BDD n’a pas d’utilisateurs. Créer à nouveau un compte admin (inscription ou script de seed) dans ce cas.

---

### 1. Erreurs à résoudre en premier

**Corrigé (à retester) :**
- **Tests API depuis Docker** : (1) **`sh`** + chemins absolus, (2) **`PROJECT_ROOT=/app`** et volume **`./scripts:/app/scripts:ro`**, (3) **Permission denied** sur `/app/tests/results` → **`TESTS_RESULTS_DIR=/tmp/tests/results`** dans le conteneur frontend, (4) **passage de la commande** : la commande de test est maintenant passée à `generate-test-report.sh` entre **guillemets simples** (plus d’échappement par backslashes) pour que le 2ᵉ argument soit correctement reçu. Redémarrer le frontend puis lancer les tests API depuis Backoffice > Développement > Tests > Tests API.

**Encore à faire :**
- **Configuration emails – test SMTP** : ~~503~~ **Géré côté front** — messages clairs sur Configuration SMTP et Déliverabilité (« Service SMTP indisponible… »). Pour rendre le test opérationnel : configurer le service Python SMTP dans auth-service ou remplacer par un test Node.
- **Logs emails** : ~~404 sur /backoffice/emails/logs~~ **Corrigé** — page **Historique des emails** créée (`/backoffice/emails/logs`) ; elle appelle `GET /api/v1/emails/logs` (API Gateway → auth-service). Lien vers Email Monitor pour le détail.
- **Analytics utilisateur – versions** : `GET /api/v1/analytics/stats/:userId/versions` — la route existe dans dashboard-service ; le front gère déjà un 404 (données vides). Si 404 persiste, vérifier que le gateway envoie bien vers dashboard-service et que l’auth est transmise.
- **Tables manquantes** (si erreurs Postgres) : `firewall_rules`, `security_alerts`, `vulnerabilities`, `security_metrics`, `deployments`, etc. — s’assurer que `make db-push-all` crée toutes les tables nécessaires (auth-service schéma étendu).

### 2. Tests (complets et opérationnels)
- **Lancer les tests API** (`/backoffice/tests-api`, sous Développement > Tests) : exécution depuis backoffice (Docker), génération de rapport, lien « Voir le rapport ». Les rapports affichent désormais le bon total / réussis / échoués (parsing corrigé). **À améliorer plus tard** : couverture des endpoints, stabilité en Docker, assertions.
- **Testeur d’API (manuel)** (`/backoffice/api-tester`) : tester les endpoints à la main (URL, méthode, headers, historique, clés). Distinct de « Lancer les tests API » qui lance le script de tests automatiques.
- **Tests Playwright** : exécution et liens depuis `/backoffice/playwright-tests`.
- **Tests Backend / Frontend / Backoffice / Performance** : pages opérationnelles ; exécution synchrone + rapport.
- **Programmation de tests** : `/backoffice/performance-tests/schedule` — vérifier et compléter.
- **Rapports de tests** : filtre par catégorie, ouverture via `?open=ID` ; rapports de **sécurité** si prévus.
- **Tests de sécurité** : à définir et exécuter (sécurité réseau, WAF, firewall, etc.).

### 3. Sécurité (firewall, politique, réseau, menaces – pas encore opérationnel)
- **Firewall** : règles, statut, logs — rendre pleinement opérationnel (backend + backoffice).
- **Politique de sécurité** : WAF global, règles, IPs bloquées — compléter et tester.
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
- **Parcours prédéfinis** (`/backoffice/user-journey`) : vérifier données et navigation.
- **Parcours personnalisé** (`/backoffice/user-journey/custom`) : création, édition, exécution.

### 6. Gestion des services & données
- **Gestion des services** : liste complète, détail service (métriques, logs), management (redémarrage, config).
- **Logs des services** : centralisation, filtres, persistance.
- **Données utilisateur** : export, suppression, récupération — conformité RGPD.
- **Récupérer stats utilisateur** : API et écrans backoffice.
- **Comptes, abonnement, paiement, facturation** : si prévus — implémenter ou documenter « hors scope ».
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

### 9. Monitoring, centralLogger, événements
- **centralLogger / logger-filter** : déployer dans tous les services ; documenter ; garder logger-filter en sync.
- **Événements & rappels** : backoffice OK ; app mobile — connecter API + rappels locaux/push.
- **monitoring-c** : stabilité (ERR_EMPTY_RESPONSE, starting) ; tests de charge, CI performance.
- **Health check 404** : **log-collector-c** et **metrics-aggregator** renvoient HTTP 404 sur `/health` (monitoring-c les appelle pour le health check). Soit ajouter une route `/health` sur ces deux services, soit adapter monitoring-c pour considérer 404 comme « pas d’endpoint health » sans le compter en échec.
- **Sécurité des conteneurs** : revue des services exposés sur l’hôte (ports mappés dans docker-compose). Limiter l’exposition aux seuls services qui doivent être accessibles depuis l’extérieur (frontend, API gateway, etc.).
- **Métriques / health en inter-conteneurs** : s’assurer que les appels métriques (metrics-aggregator → monitoring-c, frontend → metrics-aggregator) et health checks restent sur le réseau Docker (noms de services), pas exposés inutilement sur localhost. Vérifier que le frontend en Docker appelle bien l’API gateway / metrics-aggregator via le réseau interne (variables d’environnement) et non localhost.

### 10. Documentation et cohérence
- **ERRORS.md** : tenir à jour (erreurs connues, corrigées, en attente).
- **RESOLUTIONS.md**, **TESTS_END.md**, **TODO_PERFORMANCE.md** : alignés avec STATUS (à faire vs fait).

**Prochaine étape suggérée** : 1) **Tester** les tests API depuis le backoffice (Docker) pour valider la correction ; 2) Corriger SMTP (503) et logs emails (404) ; 3) Sécurité (firewall, politiques, menaces) ; 4) Emails (templates, config, délivrabilité).

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

## ✅ Flux métriques : une seule source (metrics-aggregator)

- **Architecture** : le **frontend** ne parle qu’au **metrics-aggregator** (port 5004). L’aggregator récupère les données depuis **monitoring-c** (en interne), les persiste en BDD et les expose au frontend. **monitoring-c** n’est plus appelé directement par le frontend.
- **Modifications** : `centralMetricsService` utilise uniquement `metricsAggregatorUrl` (plus de fallback monitoring-c). Liste des services, détail service, métriques système/conteneurs, historique et logs passent tous par metrics-aggregator (`/api/v1/metrics`, `/api/v1/docker/services/all`, `/api/v1/docker/service/:name`, `/api/v1/docker/service/:name/logs`, etc.). Port par défaut 5004 (plus 8014). Ancien `metricsService.ts` (Prometheus/ancien système) supprimé.

---

## ✅ Modifications récentes (db-push-all, navigation, Services & Logs, liste services)

- **`make db-push-all`** : le script fait (1) Prisma db push, (2) `init-system-metrics.sql`, (3) **`init-key-tables.sql`** (security_logs, system_metrics_snapshots, network_connections, **network_threats**). Commentaire en tête du script.
- **Navigation** : section **Sécurité** sans doublon. **Statistiques & Monitoring** : uniquement « Vue d'ensemble » (suppression du doublon « Logs des conteneurs » ; les logs conteneurs restent sous **Gestion des services** > **Services & Logs**).
- **Services & Logs** : API Gateway d’abord (logs sécurité), puis log-collector pour enrichir si dispo.
- **Liste des services** : uniquement **metrics-aggregator** (`/api/v1/docker/services/all` puis `/api/v1/metrics` en fallback).
- **Détail service** : métriques et logs via metrics-aggregator uniquement.

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

## 🎯 Vue d’ensemble de l’application

| Domaine | Description | Statut |
|--------|-------------|--------|
| **API REST** | API Gateway + microservices (auth, application, company, contact, interview, call, event, followup, profile, notification, workflow, deployment, dashboard) | ✅ Opérationnel |
| **Monitoring** | monitoring-c (C), log-collector-c, métriques temps réel | ✅ Opérationnel |
| **Collecteur de statistiques** | metrics-aggregator-service (Node), persistance Prisma/PostgreSQL, snapshots système et conteneurs | ✅ Opérationnel (tables créées via `make db-push-all`) |
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

## 📋 Détails techniques (référence)

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
