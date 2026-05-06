# Plan d’exécution — Écosystème backoffice, API, sécurité et documentation

**Objectif** : rendre l’écosystème backoffice + API réellement opérationnel et cohérent (**monitoring / logs** en premier, **sécurité** ensuite, suivi-intérim, analytics), **à terme** **sauvegardes chiffrées délocalisées** et **continuité de service** (**lot G**), puis aligner la documentation sur l’état réel avec une feuille de route claire.

**Documents liés** : `STATUS.md` (état courant et priorités produit), `TODOS.md` (cases à cocher opérationnelles — **dernière section** = méta-chantiers : validation porteur, audit BDD avant tests massifs, refonte doc racine + `docs/`, trafic sécurité gateway), **`STATS.md`** (CVE / dépendances — tableaux à compléter après audits), **`docs/operations/PREPROD_PRODUCTION_CHECKLIST.md`** (NTP, secrets, **SMTP/TLS**, **`CRASH_REPORT_EMAIL`**, Jest gateway **en conteneur**, vérifs **manuelles** avant prod), `docs/BACKLOG.md` (backlog large et tâches « plus tard »), **`docs/CHANTIER_SECURITE_DATA_DOCS.md`** (index du chantier dans `docs/`) ; **lot G** (sauvegardes / continuité) : **`PLAN.md`** § G, **`FONCTIONNALITES.md`** § 4.4.

**Plan Cursor (IDE)** : le fichier `.cursor/plans/chantier_securite_data_docs_2c0a63b7.plan.md` peut encore nommer les lots dans l’**ancien** ordre ; **source de vérité** : ce **`PLAN.md`** (lots **A** = monitoring, **B** = sécurité, **G** = backup / continuité, avril 2026).

**`make up-full` / Compose** : la stack documentée est pensée pour le **développement local** (profils Docker, variables d’exemple, montages `src` pour le hot reload). Un déploiement **production** (VPS, secrets, non-root, sauvegardes **lot G**) reste à cadrer séparément — ne pas assimiler « `up-full` vert » à une prod prête sans durcissement.

**Dernière révision du plan** : 7 mai 2026 — **A3** suite : corrélation **`/backoffice/performances/correlation`** — fusion métadonnées incidents (**`metadata.metadata`**), filtre rechargements axios ; **`logs-watch`** robustesse pipe couleurs ; **browserslist** (`npm run browserslist:update`). Voir **`STATUS.md`** § 7 mai. Point précédent **6 mai 2026** — **A3/B6** : **`api-gateway`** forensics (voir **`STATUS.md`** § 6 mai) ; rappel **7 avril** — **A1** : **`/service/:name/history`** (fichiers + BDD) ; **socle graphes** avancé — **`serviceHistoryChartModel.ts`** + **`useServiceHistoryChartData`** ; détail **sous-lots A1a–A1g** dans **`TODOS.md`**. **A5** + graphiques analytics/statistique : toujours **à poursuivre**. **B (roadmap)** : **B11** / **B12** ; tests sécurité **`make test-security`** sans bloquer l’IP admin (**`LAB_BLOCK_IP`**, **B2**). **D** : analytics utilisateur. *(23/04 : Block I/O **aggregated** ; **B** 7/04 ; 22/04 : **B6**, **STATS**, **A2** ; **C1** ; **F1**.)*

---

## Convention : colonne « État » vs « Validé (porteur) »

| Colonne | Rôle | Qui met à jour |
|--------|------|----------------|
| **État** | Avancement **technique** dans le dépôt : **À faire** · **Partiel** (en place mais incomplet) · **Renforcé** (fait mais encore perfectible) · **Fait (jj/mm/aaaa)** (implémentation considérée mergée / stable côté code) | L’équipe / l’assistant selon le code réel — **à challenger** si incorrect. |
| **Validé (porteur)** | **Vous** avez vérifié **manuellement** que le comportement correspond à ce que vous vouliez : laissez **`Non`** tant que ce n’est pas le cas ; remplacez par **`Oui (jj/mm/aaaa)`** après test réel, **ou** indiquez la même chose dans **`STATUS.md`** (le plan peut alors être aligné). | **Le porteur produit uniquement.** |

**Règles demandées** :

- **Pas de pull request** pour l’instant : le porteur le dira dans la conversation quand le moment sera venu.
- Tant qu’une ligne n’a pas **Validé = Oui (date)** (ni équivalent explicite dans `STATUS.md`), considérer la tâche **non acceptée côté produit**, même si **État** = Fait.
- Les **pourcentages** sous chaque titre de lot sont **indicatifs** (basés sur l’état technique et l’avis documenté) : **éditez-les** si besoin. Un second indicateur **Validé porteur : x/y** compte les **Oui** dans le tableau du lot.

---

## Critères d’acceptation globaux

1. Le **monitoring** (détail par service, historique compréhensible, logs multi-services) reflète les métriques **temps réel** et, quand elles existent, les **séries déjà enregistrées** (snapshots / persistence), avec libellés clairs pour l’utilisateur.
2. Les pages **sécurité** reflètent fidèlement les événements réels (dont payload overflow, injections, blocages) et, à terme (**B6–B9**), permettent une **reconstitution** raisonnable des actions sensibles et des chaînes de requêtes en cas d’incident (dans les limites du réalisme décrites au lot **B**).
3. Le suivi-intérim affiche des données utiles et cohérentes avec la base active.
4. La documentation est synchronisée avec l’état actuel et exploitable comme feuille de route de travail.

---

## Lot A — Monitoring détaillé des services, logs multi-sources, corrélation

**Synthèse (indicatif)** — Technique **~40 %** · **Validé porteur** : **0/5** (compter les « Oui » dans **Validé** ci-dessous ; mettre à jour ce ratio vous-même).

**Rappel sources de données** : le **temps réel** vient surtout de **Docker stats** / endpoints **`/api/v1/docker/service/:name`**. L’**historique fichier** est alimenté quand l’agrégateur enregistre des snapshots (`metricsHistory`, ex. sous `/tmp/metrics/history/services/<slug>/` en environnement typique) — ce n’est **pas** magiquement « toute la vie du conteneur » si la persistance n’a pas tourné ou si le conteneur est récent. Les **points « session »** sur la page détail complètent la courbe tant que l’onglet reste ouvert. **07/04** : l’endpoint **`GET /api/v1/docker/service/:name/history`** **fusionne** aussi les lignes **PostgreSQL** `container_metrics_snapshots` (collecteur) avec les fichiers, pour un historique **visible après rechargement** en dev. L’**A5** vise à **libeller** clairement live vs fichiers vs BDD partout dans l’UI.

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| A1 | **Monitoring détaillé par service** : CPU / mémoire / réseau / disque, **historique**, **auto-rafraîchissement**, **PIDs** / **Block I/O** ; **23/04** : **Block I/O** dans **`aggregated`** + **cumul / débit** ; **07/04** : **`/history`** fichiers + **BDD** ; **07/04 (suite)** : **`serviceHistoryChartModel.ts`** + **`useServiceHistoryChartData.ts`** (dérivés graphes hors `page.tsx`) — **sous-lots détaillés** **`TODOS.md`** (**A1a–A1g**) : sources async **`serviceHistorySources.ts`**, composant **`MonitoringServiceHistoryCharts`**, branchements **overview / analytics / stats**, UX brush/zoom, **A5** légendes live vs BDD, PIDs API | Partiel (07 + 23/04/2026) | Non | `frontend/src/lib/monitoring/serviceDetailHistory.ts`, **`serviceHistoryChartModel.ts`**, **`useServiceHistoryChartData.ts`**, `.../services/[serviceName]/page.tsx` ; `metrics-aggregator-service` **`docker.routes.js`** ; **`@/components/analytics/*`** ; **`make status`** / Postgres |
| A2 | Faire remonter les logs de **tous** les services avec filtres (service, niveau, type, période) | Partiel (22/04/2026) | Non | **`/backoffice/services/logs`** + **`metrics-aggregator`** `GET /api/v1/docker/service/:name/logs` (**`lines`**, **`since`/`until`**) ; filtres **niveau / type / texte** ; **`(development)/services/applications`** + **`…/backoffice/[serviceName]`** → même route Docker. **Gateway (22/04)** : **`dockerLogsQuery.js`** + **`normalizeDockerLogsQuery`** ; proxy **`GET /api/v1/services/:serviceName/logs`** ; **`admin/logs/*`** ; Jest **`dockerLogsQuery.test.js`**. **log-collector-c** : port interne **3019** (hôte **5099**) — **`docker-compose.monitoring.yml`**, image C, **`metrics-aggregator`** `KNOWN_SERVICES`. **Reste** : smoke / E2E admin ; **Loki** |
| A3 | Corréler logs techniques et événements sécurité dans les vues détail service | Partiel (07/04/2026) | Non | Encart liens **sécurité** + **logs multi-services** sur `/backoffice/services/[nom]` ; corrélation données unifiée (timeline / filtres croisés) encore à faire. **30/04 (corrélation perf)** : table incidents alignée aux points métriques + tri/filtres ; **05–06/2026 (forensics)** : mêmes services qu’avant + **`api-gateway`** (**`requestCorrelation`**, ALS, Winston, **`centralLogger`**, **`TRUST_PROXY_HOPS`**, codes HTTP proxy) + **`workflow-service`** (**`requestContext`**, Winston, **`centralLogger`**) ; **07/05** : parsing incidents fusion **`metadata.metadata`** + moins de bruit console **aborted** au rechargement ; **reste** : **validation bout-en-bout** (QA porteur) — colonnes incidents pleines (HTTP, endpoint, IP), séries **I/O bloc** cohérentes avec la persistance. |
| A4 | Clarifier le pipeline erreurs / warnings / crash (Gateway, security-service, backoffice) | Partiel | Non | **ERRORS.md** ; affiner après A2–A3 ; **05/2026** : **`GET /api/v1/services`** ne bloque plus le backoffice si **metrics-aggregator** est temporairement indisponible (réponse **200** fallback + logs **warn** transitoires) |
| A5 | **Métriques déjà enregistrées** : brancher et **libeller** **live vs historique fichiers vs persistence BDD** sur détail service + pages monitoring liées ; enrichir **performances** / détail service (non pressé) ; **suite 07/04** : même `limit` API **réseau** que **performances** ; **timeout** axios + **clamp** `limit` (routes + SQL/Prisma) pour plages longues (ex. 30 j.) ; **localStorage** clé `jobbingtrack:analytics:shared-time-v1` pour réutiliser préréglage / plage perso / **suivre le direct** entre **performances**, **réseau**, **conteneurs** ; **affichage** : pas d’ISO brute pour « dernier point » ; **`date.ts`** (`parseChartTimestamp` objets `{ value }`, **`metricRowToTimeMs`**, **`Intl` fuseau**) ; **`timestampMs`** côté agrégateur + UI ; côté front, **`normalizeMetricRows`** aligne **`timestampMs`** sur l’**ISO** normalisé (évite décalage si JSON diverge) ; test **`analytics-metric-rows-normalize.test.ts`** ; **`injectMetricTimeGaps`** ; **`docker-compose.yml`** `postgres` **`TZ`/`PGTZ`** (`POSTGRES_SYSTEM_METRICS_TZ`, défaut UTC) ; lecture SQL **`system_metrics`** : **`AT TIME ZONE`** = **`POSTGRES_SYSTEM_METRICS_TZ`** (comme Postgres) ; **`make restart-metrics-recreate`** pour appliquer env/image ; agrégateur **`TZ=UTC`** ; test **`date-metrics-display.test.ts`** | Partiel (07/04/2026) | Non | `persistence.service.js`, `persistence.routes.js`, `analytics.service.ts`, `usePersistedSharedAnalyticsRange.ts`, `date.ts`, `injectMetricTimeGaps.ts`, `docker-compose.yml`, `analytics/page.tsx`, `analytics/performances`, `analytics/network|containers`, `centralMetricsService.ts`, `statistics`, `services/page.tsx` |

**Note (priorisation)** : poursuivre **A1–A2** en priorité ; **A5** lorsque le socle est stable.

---

## Lot B — Sécurité visible et exploitable

**Synthèse (indicatif)** — Technique **~62 %** (forensics **B6–B9** + UX **B10**) · **Validé porteur** : **0/10** — à ajuster quand vous aurez rempli la colonne **Validé**.

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| B1 | Cohérence entre détections, menaces et IPs bloquées | Fait (07/04/2026) | Non | `getBlockedIps` + UI (firewall, menaces, analyse, vue d’ensemble) ; `threatId` depuis logs ; fenêtre logs **30 j.** alignée vue d’ensemble / Analyse ; agrégateur **sans NaN** sur `responseTime.average_ms` ; enrichissement **destIp** API menaces |
| B2 | Mode de test de blocage IP sûr (IP de test dédiée, jamais l’IP utilisateur réelle) | Renforcé | Non | `lab_simulation` ↔ `LAB_BLOCK_IP` ; **refus** de bloquer l’IP observée comme client (hors lab) ; UI feedback test vue sécurité |
| B3 | Vue sécurité : distinguer explicitement détection / blocage manuel / blocage automatique | Partiel | Non | Légende + cartes sur vue sécurité ; **Analyse** : 3 panneaux (détections, manuels+lab, auto) ; firewall : badges origine |
| B4 | Analyse réseau : éviter le conteneur « unknown » 100 % non actionnable | Partiel | Non | `containerCorrelation` + `correlationHint` API ; bannière et explications UI page réseau |
| B5 | WAF + `make security-live-check` : auth firewall/WAF sur security-service (JWT ou `X-Internal-Secret`) ; scripts alignés ; **rebuild** image si deps (`jsonwebtoken`) ; volume `src` ; `FIREWALL_BASE_URL` / `AUTH_GATEWAY_URL` ; **`user: 0:0` + NET_ADMIN** pour **iptables** en dev | Fait (04/2026) | Non | `security-service/server.js`, `scripts/security/*.sh`, `docker-compose.yml` ; **RESOLUTIONS.md** § 8 avril 2026 |
| B6 | **Corrélation bout en bout** : `X-Request-Id` / `X-Correlation-Id` (gateway → services) ; horodatage **serveur** (UTC, NTP en prod) ; propagation dans **logs applicatifs** et événements **security-service** pour reconstituer une session / une requête après incident | Partiel (22/04/2026) | Non | **Fait** : **`requestCorrelation.js`** (06/05 : ALS + contexte dans logs WARN/ERROR, **`centralLogger`**, **`TRUST_PROXY_HOPS`**) ; proxy + métriques/logs + `reportPayloadTooLarge` ; **intrusionDetector** réactivé (correctif **`BRUTE_FORCE`**, pas de **`next()`** après 403, garde-fous Jest/Playwright/`INTRUSION_DETECTION_ENABLED`) ; **CORS** ; **`frontend/src/lib/api.ts`** ; Jest gateway (**22/22** `backend/api-gateway`). **Reste** (détail **manuel** : **`docs/operations/PREPROD_PRODUCTION_CHECKLIST.md`**) : morgan / middleware sur **chaque** microservice encore sans contrat ; **security-service** recherche par id ; **mobile** ; **NTP** hôtes |
| B7 | **Journal d’audit applicatif** (actions sensibles backoffice + API admin) : connexions admin, exports, déblocages IP, **test-data** destructif, changements rôles ; **append-only** en base (pas d’UPDATE sur le contenu) ou table dédiée + **accès lecture** réservé rôle élevé ; **jamais** de secrets en clair dans les entrées | À faire | Non | Schéma Prisma / migrations ; routes gateway ; UI **Sécurité** ou **Admin** : filtre par acteur, période, type d’événement |
| B8 | **Vue backoffice « investigation / post-incident »** : croisement **menaces WAF**, **audit B7**, **logs techniques** (A2), **IPs** ; export **horodaté** (CSV/JSON) avec **hash** ou empreinte pour **chaîne de conservation** légale / interne ; pas de promesse « preuve judiciaire » sans dispositif certifié — viser **traçabilité opérationnelle** forte | À faire | Non | `frontend/.../backoffice/security/**` ; APIs agrégation ; doc procédure dans **`docs/security/`** (à créer) : qui consulte, où stocker l’export |
| B9 | **Mobile** : signalement **erreurs** + signaux **sécurité** (refresh révoqué, OTP échoué N fois, changement mot de passe, sortie session forcée) vers API **authentifiée** et **limité en taux** ; côté serveur, corrélation **compte + device + IP** ; **limitation honnête** : un téléphone **rooté / compromis** peut mentir — combiner avec signaux serveur et **B7** | À faire | Non | Apps **`mobile/`** et **`flutter-mobile-app/`** ; endpoint dédié (gateway) ; **lot D1** proche |
| B10 | **UX backoffice — outils sécurité** : reprendre **`/backoffice/security`** et sous-pages (**firewall**, **analyse**, **réseau**, etc.) pour un ensemble **réellement utilisable** : lisibilité (hiérarchie visuelle, tableaux), **métriques cohérentes** avec les contrats API (libellés, unités, fenêtres temporelles), **empty states** honnêtes, **mesurabilité** (ce qui est compté / exclu), préparation des emplacements pour la vue **investigation (B8)** ; **vue d’ensemble** : éviter qu’un même **`network_threat_detected`** apparaisse à la fois comme **menace** et comme **log CRITICAL** (filtrage incidents **22/04**) ; **score** : aujourd’hui pondération locale **`securityScoreWeights`** (`localStorage`, **`page.tsx`**) — à documenter / option serveur | Partiel (22/04/2026) | Non | `frontend/src/app/(admin)/backoffice/security/**` ; **`centralMetricsService`** / clients API ; tests manuels checklist dans **`TODOS.md`** ; **`ERRORS.md`** § boot **`up-full`** / intrusion |
| B13 | **Préparation post-quantique (PQC) — crypto-agilité** : inventaire des usages cryptographiques (TLS, JWT, signatures, secrets, sauvegardes, flux inter-services, mobile), classification des données par horizon de confidentialité (court/moyen/long terme), plan de migration progressive (algorithmes hybrides quand disponibles, rotation clés/certificats, compatibilité clients), et stratégie de tests non-régression/perf. Objectif : être prêt avant bascule réglementaire sans blocage produit. | À faire | Non | `STATS.md` (inventaire), `TODOS.md` (checklist exécution), `docs/BACKLOG.md` (chantiers), `PROCESSUS_APPLICATION_MOBILE_ET_API.md` (procédures ops), runbooks sécurité/ops |

**Note (réalisme — exigence « ultra sécurisé »)** : aucune pile logicielle n’est **mathématiquement incontournable** si l’attaquant contrôle l’hyperviseur, un compte **super-admin**, le binaire mobile modifié, ou la chaîne de build. L’objectif est une **défense en profondeur** : événements **difficiles à effacer silencieusement** (copies **WORM** / **SIEM** externe, **signatures** périodiques des blocs de logs, **mTLS** service-à-service), **détection** précoce, et **runbook** après intrusion (voir **lot G6**). Les tâches **B6–B9** formalisent cette traçabilité **API + backoffice + mobile**.

**Note (priorisation)** : **B3** et **B4** restent **Partiels** ; poursuivre **B6** (services + persistance id) puis **B7–B8** ; **B10** (lisibilité / cohérence UI sécurité) peut avancer **en parallèle** dès que les réponses API sont stables, pour éviter de refaire l’UI deux fois.

**Évolutions cadrées (voir `TODOS.md` B11–B13)** — **B11** : configuration d’**envois email** de **rapport / alerte** sur événements **critiques** (vulnérabilités, menaces très graves, incidents **firewall**, **indisponibilité** service ou sous-système) — réutiliser le cadrage **SMTP** / secrets (**`PREPROD_PRODUCTION_CHECKLIST.md`**, **`CRASH_REPORT_EMAIL`**) et étendre aux canaux ops ; **B12** : boucle d’**analyse sécurité** plus **« live »** tout en restant **douce** sur mémoire et CPU (cadence, fenêtres, limites de requêtes) ; **B13** : préparation **post-quantique** (crypto-agilité, inventaire, priorisation “harvest now, decrypt later”, plan de transition).

---

## Lot C — Data backoffice et suivi-intérim (priorité produit)

**Synthèse (indicatif)** — Technique **~45 %** (**C3** + début **C1** UX) · **Validé porteur** : **0/3**

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| C1 | Diagnostiquer le vide fonctionnel de `/backoffice/suivi-interim` et corriger le flux agences / candidatures | Partiel (21/04/2026) | Non | Données **TEMP_AGENCY** + **`agencyId`** déjà branchées ; **21/04** : message d’erreur API, **Rafraîchir**, lien **test data** — **reste** : données métier / filtres / validation porteur (`SuiviInterimContent.tsx`, `datas/page.tsx`) |
| C2 | Cohérence base principale vs base test (sans supprimer `admin@jobbingtrack.com`) | Partiel (07/04/2026) | Non | `make datas-remove-tests-tags`, **`make env-check`** / **`make env-append-missing`** ; doc à compléter : `docs/database/MIGRATIONS_ET_BASES.md` |
| C3 | Génération / nettoyage données test prévisibles et non destructifs | Partiel (07/04/2026) | Non | **`testdata.controller.js`** : `POST /test-data/tag-likely`, `GET /test-data/summary`, clear étendu (**`Document`**, **`EmailLog`** test) ; **`TestDataTab.tsx`**, **`backoffice/test-data/page.tsx`** (marquer + case **balanced**) ; **`generate-test-data.js`** (`--balanced`, `_balanced` via API) ; alignement **`.env`** : **`scripts/env-align-with-example.cjs`** — **reste** : validation porteur, éventuellement stats backoffice « uniquement test » |

---

## Lot D — Mobile crash et observabilité applicative

**Synthèse (indicatif)** — Technique **~0 %** · **Validé porteur** : **0/4** (tâches **D1–D4** ; **D4** = cadrage analytics utilisateur / événements)

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| D1 | Normaliser les événements erreur / crash mobile (source, device, version, crashType) | À faire | Non | Mobile Flutter + endpoint notifications |
| D2 | Vérifier la traçabilité bout en bout vers analytics / performance / logs | À faire | Non | dashboard-service, metrics-aggregator, pages stats (voir **lot A** / **A5**) |
| D3 | Exploitation claire dans les pages monitoring / statistiques | À faire | Non | `frontend` pages admin stats / analytics — **dépend surtout du lot A5** (séries persistées + libellés live vs BDD) ; crash mobile (D1–D2) pour alimenter les compteurs |
| D4 | **Analytics utilisateur — événements** : documenter puis implémenter un **périmètre explicite** — (a) **backoffice web** (sessions / actions **admin** dans le navigateur) **≠** (b) **app mobile** utilisateurs finaux ; (c) **parcours transverses** trackés **côté API** : emails (**validation inscription**, **reset mot de passe**, codes / liens) = observabilité **au-delà du seul client mobile** ; schéma d’événements, tables (`user_events`, auth, **B7** audit), routes **`dashboard-service` / user-analytics**, libellés UI ; corriger incohérences (**`ERRORS.md`**, table manquante, 404 versions) | À faire | Non | **`TODOS.md` D4** ; `user-analytics` ; **auth-service** ; **B7** ; alignement **D1–D3** |

**Note — périmètre « analytics utilisateur »** : le backoffice peut afficher des **statistiques** qui mélangent aujourd’hui plusieurs origines. La tâche **D4** impose de **nommer** ce qui est mesuré (admin web vs mobile vs **funnel email/auth**) pour éviter les interprétations fausses et dupliquer le minimum de code (**lot A1** côté graphes temps / historique, **A5** côté séries persistées).

**Outillage mobile (hors livrable utilisateur)** : **`tools/adb-lib/`** — client ADB + flows (`loginFresh`, `navigateAllTabs`, …), scénarios, **`adb.exec` / `runner`** ; consommation typique : **`tests/user-journey/journey-builder.js`**, **`mobile/README.md`**. E2E Playwright mobile : device **`adb`** ou **`RUN_PLAYWRIGHT_MOBILE=1`** (voir **`STATUS.md`** § tests).

---

## Lot E — Documentation exhaustive et nettoyage

**Synthèse (indicatif)** — Technique **~35 %** · **Validé porteur** : **0/3**

**Note 07/04** : libellés de **période** analytics (fenêtres glissantes type 24 h) + rappel sous les graphiques — voir `STATUS.md` § Analytics ; `frontend/src/components/analytics/timeRangeUtils.ts`, `TimeRangeSelector.tsx`, `ChartPeriodCaption.tsx`.

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|----------------|
| E1 | Mettre à jour et aligner : `STATUS.md`, `ERRORS.md`, `RESOLUTIONS.md`, `PROCESSUS_APPLICATION_MOBILE_ET_API.md`, `FONCTIONNALITES.md`, `docs/BACKLOG.md` | Partiel (21/04/2026) | Non | Vague **21/04** : STATUS / PLAN / ERRORS / TODOS + **`makefiles/README.md`** (status-watch, status-live) ; **PROCESSUS**, **BACKLOG** revue large **à faire** |
| E2 | Revue `docs/` (architecture, API, endpoints, metrics, décisions, changelog, DB, sécurité, mails, tests) | À faire | Non | Dossier `docs/` |
| E3 | Nettoyer l’obsolète ; marquer explicitement le « non opérationnel » restant + plan d’action | À faire | Non | — |

---

## Lot F — Validation finale et livrables

**Synthèse (indicatif)** — Technique **~22 %** · **Validé porteur** : **0/3**

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|----------------|
| F1 | Tests ciblés API + E2E (monitoring / services, sécurité, backoffice, suivi-intérim, logs) | Partiel | Non | **`make tests`** : stack + **`.env`** avec **`API_GATEWAY_URL`** joignable depuis l’hôte (**`127.0.0.1:5002`** typ.). **17/04** : **`dockerHostUrl.js`**, **`test-api-specific.sh`** (**`mktemp`**), perf **`exit(1)`** si échecs, gateway health allégé, **`loadScore`** monitoring optionnel — **`RESOLUTIONS.md`** § 17/04. **Principe sécurité / réalisme prod** : en perf **applicative**, faire transiter les requêtes par l’**API Gateway** (WAF, rate limit, corrélation), pas par les ports internes **300x** depuis l’hôte. **`tests/performance/test-performance.js`** : déjà aligné (listes companies, events, etc. + auth **`GET /api/v1/auth/health`**). **`tests/performance/test-load-advanced.js`** : stress **auth** aligné gateway ; **companies** / **applications** du même fichier restent sur l’ancien modèle **`localhost:300x`** — même traitement que **`test-performance.js`** à planifier (**F3** / refonte fichier). **Metrics-aggregator** : exception acceptable pour sondes **infra**. **Reste** : Playwright login / **`api-e2e`**, exit codes intégration/sécurité, résumé global **`make tests`**, tests métriques par surface (A5) |
| F2 | Récapitulatif final : corrigé / reste à faire / risques / priorités opérationnelles | À faire | Non | — |
| F3 | **Couverture `tests/services/`** + **alignement perf charge** : inventaire des microservices **sans** script dédié (smoke HTTP / health) vs ceux déjà couverts ; ajouter progressivement des **`test-*-service.js`** (ou équivalent) enchaînés par **`scripts/run-all-tests-with-reports.sh`** ; objectif **fumée cohérente** après **`make up-full`**, pas exhaustivité Jest de chaque route — tracer l’écart dans **`STATUS.md`**. **Refonte `tests/performance/test-load-advanced.js`** : remplacer les bases **`localhost:300x`** (companies, applications, …) par **`normalizeGatewayUrlForHost`** + chemins **`/api/v1/...`** comme **`test-performance.js`**, pour que **toute** la charge « métier » passe par la gateway (cohérent avec **F1**). | À faire | Non | `tests/services/` ; `tests/performance/test-load-advanced.js` ; `run-all-tests-with-reports.sh` ; alignement URLs **gateway** sauf **metrics-aggregator** documenté |

---

## Lot G — Sauvegardes ultra-sécurisées, API dédiée, délocalisation et continuité de service

**Synthèse (indicatif)** — Technique **~0 %** · **Validé porteur** : **0/7** — périmètre **à concevoir puis implémenter** après validation des exigences (secrets, hébergeur, RTO/RPO).

**Objectif** : disposer d’une **stratégie de sauvegarde et de reprise** alignée sur une sécurité **strictement supérieure** au socle actuel (WAF, firewall, secrets internes) : **chiffrement**, **audit**, **principe du moindre privilège**, **aucune exposition publique** des endpoints sensibles, **délocalisation** des copies (hors serveur principal), et **interface administrateur** pour piloter les opérations sans compromettre les données.

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| G1 | **Cadrage sécurité** : modèle de menaces (vol dump, clé compromise, insider), stockage des clés (KMS / vault / fichier hors conteneur + permissions), rotation, interdiction de logger secrets ou chemins complets sensibles ; **rôles** : `SUPER_ADMIN` + service interne (`X-Internal-Secret` ou mTLS) pour jobs automatiques | À faire | Non | Spec dans `docs/` (ex. `docs/operations/BACKUP_AND_DR.md` à créer) ; alignement `security-service` / gateway |
| G2 | **API backup (non publique)** : routes sous gateway protégées (JWT admin élevé + secret interne optionnel double contrôle) ; création de **job** (dump PG, artefacts config chiffrés, métadonnées), statut, liste historique **sans** URL de téléchargement permanent ; rate limiting et **journal d’audit** (qui, quand, type d’opération) | À faire | Non | Nouveau microservice ou worker `backup-service` + routes `api-gateway` ; tables audit si besoin |
| G3 | **Chiffrement des sauvegardes** : dumps et archives **chiffrés au repos** (ex. AES-256-GCM ou équivalent validé) ; clé par backup ou clé enveloppe ; intégrité (hash / signature) vérifiable avant restauration | À faire | Non | Pipeline `pg_dump` → chiffrement stream → stockage ; pas de dump en clair sur disque partagé durable |
| G4 | **Délocalisation** : push vers **stockage distant** (S3-compatible, autre VPS, object lock / versioning si disponible) ; credentials **uniquement** via variables d’environnement / secrets Docker **jamais** commités ; option **air-gap** (export manuel chiffré téléchargeable une fois via **lien à durée de vie courte** + token) | À faire | Non | Compose profiles ; doc procédure restauration hors ligne |
| G5 | **Backoffice administrateur** : section dédiée (ex. `/backoffice/admin/backup` ou sous **Développement** selon choix UX) — lancement sauvegarde **manuelle** (avec confirmation forte), planning **lecture seule** des jobs automatiques, état (OK / erreur / en cours), **pas** de mot de passe S3 en UI ; éventuellement restauration **vers environnement de secours** / sandbox (jamais écraser prod sans workflow validé) | À faire | Non | `frontend` admin ; i18n / accessibilité ; messages d’erreur sans fuite d’infra |
| G6 | **Continuité de service (PCA/PRI)** : définir **RPO/RTO** cibles ; runbook : ordre de redémarrage services, restauration BDD, vérifs post-restore ; **exercice** de restauration documenté (trimestriel recommandé) | À faire | Non | `STATUS.md` / `docs/operations/` ; lien avec `make up-full`, migrations |
| G7 | **Durcissement transversal** : sauvegardes **read-only** sur volumes source ; conteneur backup **sans** `NET_ADMIN` si possible ; scans dépendances du worker ; corrélation **logs sécurité** si tentative d’accès non autorisé aux routes backup | À faire | Non | `docker-compose.yml`, politiques réseau |

**Note (priorisation)** : **G1 → G3 → G2 → G4** en fondation ; **G5** en parallèle dès maquettes API stables ; **G6–G7** en continu. Ne **pas** exposer d’endpoint de backup sur Internet sans tunnel/VPN ; en production, préférer **job interne** + alertes + stockage distant.

**Critères d’acceptation (lot G)** — à affiner avant implémentation :

1. Aucune sauvegarde **complète en clair** sur un volume durable partagé non chiffré.
2. Toute action sensible (création job, téléchargement one-shot) est **tracée** et réservée aux rôles autorisés.
3. Les identifiants distants ne transitent **jamais** en clair dans le navigateur ni dans les réponses API JSON génériques.
4. Documentation opérationnelle : **restaurer** la plateforme à partir d’une copie délocalisée en X étapes vérifiables.

---

## Avancement ponctuel déjà réalisé (vue d’ensemble `/backoffice`)

Ces points **ne remplacent pas** les lots ci-dessus ; ils clarifient le tableau de bord admin :

- **29/04/2026 — Stabilisation runtime Next** : correction de `frontend/next.config.js` avec `distDir` utilisateur (`.next-local`) pour éviter les erreurs `EACCES` sur `.next` créé par `root` (Docker) et les scripts front invalides (`layout.js`).
- Carte « Incidents sécurité » (libellé et lien vers `/backoffice/security`) avec sous-titre honnête sur la fenêtre agrégateur (pas « 24 h » si la métrique est courte).
- Grille métriques en **deux rangées** (pilotage puis CPU / mémoire conteneurs).
- Bloc « État des services » : libellé de droite = disponibilité / temps de réponse quand l’uptime détaillé est absent (évite vert + `N/A` ambigu).
- Panneau Performance : temps de réponse y compris à 0 ms ; **débit d’erreurs** affiché en **erreurs/min** (cohérent avec `rate_per_min` backend).
- Remise à zéro correcte des compteurs agrégés quand la source renvoie 0 ; sous-titre CPU « total » expliqué (somme des conteneurs détectés, variable).

Fichier principal : `frontend/src/app/(admin)/backoffice/page.tsx`.

### Améliorations futures (vue d’ensemble — hors critères d’acceptation)

À planifier dans **`TODOS.md`** ou le backlog si besoin :

- Horodatage ou indicateur **« métriques à jour »** / dernier fetch agrégateur.
- **% d’erreurs HTTP** (requêtes 5xx / total) si l’API expose un tel ratio, distinct du `rate_per_min` actuel.
- Mini-tendances (sparkline) sur 15 min / 1 h si stockage série temporelle disponible.
- Cohérence libellé **sessions** vs **utilisateurs actifs** selon la réponse exacte de `/auth/sessions/active`.

### Améliorations futures (lot A monitoring — non pressé, voir aussi **A5**)

- **Détail service** : plus de panneaux (threads, limites cgroup, événements restart, comparaison avec la moyenne stack).
- **Pages « performances » / analytics / statistiques** : mêmes conventions d’historique et de légende **live vs persisté** que le détail service.
- **Liste services** : aperçu sparkline ou mini-historique par ligne si l’API expose une série compacte.

---

## Ordre de travail recommandé

1. **A** (monitoring + logs) : **A1** détail service / agrégateur ; **A2** logs multi-filtres ; **A3** / **A4** ; **A5** persistance & libellés — **priorité chantier technique** actuelle.
2. **B** (sécurité visible + **forensics B6–B9** + **B10** UX) : poursuivre **B3–B4** ; valider **B1–B2–B5** côté porteur ; terminer **B6** côté microservices puis **B7** / **B8** ; **B9** avec le **lot D** ; **B10** en parallèle sur les pages **`/backoffice/security/**`**.
3. **C** (produit intérim / données) en parallèle si possible.
4. **D** lorsque les pipelines logs/métriques (**lot A**) sont stables.
5. **E** en continu par **petites livraisons documentées** (sans PR tant que non demandé) ; éviter un gros « dump » doc en fin de chantier uniquement.
6. **F** en gate avant de considérer le chantier « clos ».
7. **G** (sauvegardes / continuité) : **après** stabilisation des lots **A/B** et clarification des contraintes hébergeur ; ne pas ralentir le socle monitoring/sécurité sans cadrage **G1**.

Pour le détail des cases à cocher au jour le jour, voir **`TODOS.md`** (aligné sur ce plan et sur **`ERRORS.md`** / **`FONCTIONNALITES.md`**).

---

## Analyse CVE & dépendances (suivi transversal)

- **Document dédié** : **`STATS.md`** — inventaire **par service Node**, **frontend**, **mobile**, **images Docker** et **binaires C** ; commandes types (`npm audit`, **Docker Scout**, `flutter pub outdated`) ; tableau **à compléter** après chaque passe d’audit (dates + severités).
- **Rapport « complet »** : il est **produit par les outils** (local ou CI), pas figé dans le dépôt ; **`STATS.md`** sert de **source de vérité humaine** pour savoir quoi scanner et où enregistrer les résultats.
- **Lots concernés** : **B** (sécurité / surface d’attaque), **E** (doc), **F** (gate avant release si politique CVE stricte), **G** (images prod / registre).

### Enchaînement **A2** (logs — après CVE / en parallèle)

1. Gateway **`admin/logs/*`** : aligner **`since` / `until`** (même whitelist que **metrics-aggregator** `docker.routes.js`).
2. Smoke tests ou E2E légers sur **`/backoffice/services/logs`** et vues **`(development)/services/**`** si la CI couvre le front.
3. (Optionnel) **Loki** ou agrégateur texte si besoin dépasse **`docker logs`**.

---

## Infra locale & post-pull (fin de fichier — rappels)

- **Après `git pull`** : enchaînement usuel **`make db-push-all`** puis **`make up-full`** (ou **`make up-dev`**) pour synchroniser Postgres + relancer la stack ; détail correctifs récents (**`Company.isTestData`**, fallback **`/api/v1/services`**) dans **`STATUS.md`** / **`ERRORS.md`** (mai 2026).
- **Redis / hôte** : si les logs affichent *Memory overcommit must be enabled*, appliquer **`vm.overcommit_memory=1`** sur la **machine hôte** (sysctl) — tâche **`TODOS.md`** **HX5** ; ce n’est pas corrigé par un changement de `docker-compose` seul.
- **UI `/backoffice`** : blocs d’aide verbeux sous les cartes métriques / Performance retirés (**mai 2026**) pour alléger la vue d’ensemble ; l’aide détaillée reste dans **`ERRORS.md`**, **`STATUS.md`**, **`FONCTIONNALITES.md`** selon besoin.
