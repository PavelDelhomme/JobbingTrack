# TODOS — chantier backoffice / API / doc (JobbingTrack)

Liste opérationnelle, alignée sur **`PLAN.md`** (lots A–G) et sur la logique de **`STATUS.md`**.  
Les sujets volontairement reportés restent dans **`docs/BACKLOG.md`** et la section « Plus tard » de `STATUS.md`.

**Dernière mise à jour** : 7 avril 2026 — **A1** : bloc **« Que faire concrètement ? »** (déjà fait / reste) + encart **sources d’historique** sur la page détail service ; **Dernière section** : méta (validation porteur, audit BDD, gateway, refonte doc racine + `docs/`). Voir aussi **`RESOLUTIONS.md`** et **§ Lot A — inventaire** ci-dessous. **B11/B12**, **`make type-check-frontend-log`**. *(07/04 : **`GlobalSearch`**, drawer, scroll **`#latence`**, **`STATUS_LEGEND`** / **`STATUS_FOLD`** ; 23/04 : Block I/O ; **ERRORS.md** ; 22/04 : Jest gateway, **STATS**, **B6**.)*

**À ne pas confondre** : une mention du lot **A2** dans **`PLAN.md`** ou dans la rubrique **« Fait récemment »** (doc / structuration) **ne veut pas dire** que la tâche **A2** est terminée : la case **A2** ci-dessous reste **`[ ]` partielle** tant que **gateway `admin/logs/*`** + **Loki** (ou décision explicite) ne sont pas réglés.

---

## Règles de travail (produit / Git / tests)

- **Pull requests** : **pas de PR** tant que le porteur ne l’a **pas demandé explicitement** dans la conversation.
- **Tâches « terminées » côté code** : les cases `[x]` ci-dessous reflètent surtout l’**implémentation** ; l’**acceptation produit** suit **`PLAN.md`** (colonne **Validé (porteur)** = **Oui (date)** après **votre** vérification manuelle, ou mention équivalente dans **`STATUS.md`**).
- **`make tests`** : alias de **`make test-all`** (suite **complète** + rapports dans **`tests/results/<horodatage>/`**). **Prérequis** : stack **`make up-full`**, **`make db-push-all`**, seed auth si besoin, MailHog si tests mail — sinon échecs massifs **normaux** (voir **`ERRORS.md`** et **`STATUS.md`** § 11/04/2026).
- **`make test-suite-full`** : `test-frontend` → `test-database` → `status` → `test-all` (Makefile tests).

---

## Alignement `ERRORS.md` → suivi (actions hors environnement vide)

À traiter dans le code / les lots concernés ; cocher ici seulement quand **corrigé et vérifiable** (et **Validé** dans **`PLAN.md`** si produit).

- [ ] Table **`deployments`** manquante — deployment-service (`ERRORS.md`)
- [ ] Table **`user_events`** manquante — User Analytics (`ERRORS.md`)
- [ ] **API versioning** 404 — `GET .../analytics/stats/:userId/versions` (`ERRORS.md`)
- [ ] **Sync mobile** — endpoints `POST /sync/push`, etc. (`ERRORS.md`)
- [ ] (Optionnel) Build APK **`flutter_local_notifications`** (`ERRORS.md`)

---

## Fait récemment (à ne pas re-faire)

- [x] Vue d’ensemble `/backoffice` : carte incidents sécurité, grille 2 lignes, légendes CPU total, état services (En ligne / ~ms), débit erreurs en `/min`, reset compteurs à 0 (`frontend/src/app/(admin)/backoffice/page.tsx`).
- [x] Panneau **Performance** : ligne disponibilité %, légende des sources, lien vers `/services/backoffice`, texte d’aide bas de carte (avril 2026).
- [x] Doc : **ERRORS.md** (pièges dashboard + pipeline synthèse), **FONCTIONNALITES.md** § 4.1, **RESOLUTIONS.md** (avril 2026), **STATUS.md** (structure + tableau lots), **docs/CHANTIER_…**, **docs/INDEX.md**.
- [x] **21/04** — **STATUS** / **PLAN** / **ERRORS** / **TODOS** / **README** : **`make status-watch`** & **`status-live`** (= **`make status`**, **`CLEAR`**, résumé stack vide) ; section logs backoffice (metrics-aggregator) ; **mise à jour des textes `PLAN.md`** pour cadrer les lots **A2**, **C1**, **E1** (≠ livraison complète de ces lots) ; pièges **ERRORS** (`make status` DOWN, ancien **status-live**).
- [x] **24/04** — **`make status` vs backoffice** : le statut Makefile reflète l’**état des conteneurs** (UP / healthy / ports), pas l’activité d’une page Next.js (ex. Statistiques) ni le volume de requêtes utilisateur. **`status-watch` / `status-live`** : script **`scripts/status-watch-loop.sh`** — **buffer terminal alternatif par défaut** (`ALTSCREEN=1`) pour réafficher le bloc courant **sans empiler** les cycles dans l’historique du terminal ; `ALTSCREEN=0` pour l’ancien défilement ; **`CLEAR=1`** + `ALTSCREEN=0` pour `clear` classique. **UI logs détail service** : grille date / message, couleurs (HTTP, firewall, erreurs), bouton masquer bruit firewall/WAF.
- [x] **07/04 (complément)** — **`make status`** : légende longue des ports (**`STATUS_LEGEND=1`** pour l’afficher ; **désactivée par défaut**). **`status-watch-loop.sh`** : **`STATUS_FOLD=1`** (défaut) — sortie de **`make status`** passée dans **`fold -s -w $(tput cols)`** ; **`STATUS_FOLD=0`** pour désactiver. **Front** : **`GlobalSearch.tsx`** avec **`'use client'`** (build RSC + baril **`features`**), chevron drawer **Performances** ouvert si sous-route active, **Synthèse Performances** : scroll vers **`#latence`** une seule fois par navigation vers l’ancre (pas à chaque reload des graphes). Test **`GlobalSearch.client-boundary.test.ts`** ; **`ERRORS.md`** § baril RSC.

---

## Lot A — Monitoring services + logs multi-sources (+ persistance)

### Socle graphes / données partagés (cible lot A, élargie au backoffice)

- **Vision** : le **socle** (fonctions pures de dérivation, hooks, composants Recharts réutilisables, tooltips / axes / légendes alignés) a démarré sur le **monitoring** (détail service), mais la **cible** est **toute page backoffice** qui affiche des **graphiques** ou des **vues tableau + séries** — dès qu’on standardise, sans casser l’existant.
- **Règle porteur** : **ne pas supprimer** un graphe, une série ou un bloc de données **sans validation explicite**. Un refactor « socle » = **déplacement / factorisation** dans des modules dédiés, **pas** retrait fonctionnel tant que tu n’as pas validé écran par écran.
- **Navigation (préambule lot A — avril 2026)** : drawer **Tableau de bord** — **Vue d’ensemble** ; **Performances** (`/backoffice/performances`, sous-entrées **Synthèse**, **Temps de réponse** → ancre `#latence` / route alias `/latency`, **Conteneurs** pont → Analytics, **Disque** stub, **Réseau (détail)** → `/analytics/network`) ; **Statistiques** (entrée dédiée + **Vue d’ensemble**, **App data**, **Sécurité**, **Logs (stats)** → route **`/backoffice/statistics/log-stats`** car le motif `logs/` est **gitignoré**) ; **Analytics** (hub + conteneurs, application, analytics utilisateur — **sans** doublon « Statistiques » dans ce sous-menu). **Annulation** : `git revert` / commit parent si besoin.

### Inventaire — **Metrics système & conteneurs** : ce qui est déjà sur le nouveau socle

- **Périmètre** : ici on parle du volet **métriques système & conteneurs** (charge, conteneurs Docker, séries agrégées), **pas** d’un cas isolé « un service au hasard ». Le **premier écran** déjà branché sur le socle (modèle + hook + composant) est le **détail d’un service** — parce que c’est là que vit l’**historique** exploitable (CPU, mémoire, réseau, Block I/O).
- **Référence graphes** : le rendu **CPU / mémoire** (et le reste du bloc) dans **`MonitoringServiceHistoryCharts`** sur **`/backoffice/services/[nom]`** est **nettement plus abouti** que les graphes **CPU** (et voisins) des pages **performances / analytics** actuelles. **Objectif** : **réutiliser ce patron** (axes zoomés, tooltips, dérivés) sur les vues **metrics système & conteneurs** plus larges — **sans retirer** les graphes existants tant que tu n’as pas validé la bascule (règle porteur ci-dessus).

| Zone (metrics système & conteneurs) | Fichiers / pièces | Validé par toi (rien en moins) |
|-------------------------------------|-------------------|--------------------------------|
| **Historique** détail conteneur / service : CPU, mémoire, réseau, Block I/O cumul, débit Block I/O | **`serviceHistoryChartModel.ts`**, **`useServiceHistoryChartData.ts`**, **`serviceHistorySources.ts`**, **`MonitoringServiceHistoryCharts.tsx`**, page **`services/[serviceName]/page.tsx`** (encart sources session / fichiers / BDD — **A1g** partiel) | [ ] *(relecture visuelle + reste A1d–A1e)* |
| **Performances** — CPU & mémoire % (système) | **`systemMetricsSeriesModel.ts`**, **`SystemCpuMemoryAreaCharts.tsx`**, page **`performances/page.tsx`** (`/backoffice/performances`) ; redirect **`analytics/performances`** → canonique | [ ] *(valider rendu — avril 2026)* |

### Inventaire — pages backoffice avec Recharts **hors** socle unifié (pour plus tard / A1d / A5)

*(Même composant **`recharts`** qu’aujourd’hui ; migration = chantier séparé quand tu priorises.)*

- [ ] **`/backoffice/analytics`** — `analytics/page.tsx`
- [x] **`/backoffice/performances`** — `performances/page.tsx` (redirect depuis **`/backoffice/analytics/performances`** ; sous-routes **`/latency`**, **`/containers`**, **`/disk`**)
- [x] **`/backoffice/analytics/network`** — `analytics/network/page.tsx` (cumul Mo, **débit Mo/min**, **corrélation CPU**, **temps de réponse** si colonne présente — avril 2026)
- [ ] **`/backoffice/analytics/containers`** — `analytics/containers/page.tsx`
- [ ] **`/backoffice/statistics`** — `statistics/page.tsx`
- [ ] **`/backoffice/statistique`** — `statistique/page.tsx`
- [ ] **`/backoffice/tests-performance`** — `tests-performance/page.tsx`

### Feuille de route — réseau cumul vs activité, hub Analytics, application « métriques », sécurité

- **Réseau (snapshots agrégateur)** : les compteurs **RX/TX** sont souvent des **cumuls** → courbe monotone peu parlante seule. **Fait (Performances)** : **débit Mo/min** (`buildSystemNetworkMbRateRows`) + **graphique combiné** CPU % vs RX/TX Mo/min (`SystemCpuNetworkCorrelationChart.tsx`, deux axes Y). **Suite** : **brush** / zoom aligné ; **fenêtre glissante** (moyenne) côté API ; corrélation **mémoire** optionnelle ; **graphiques supplémentaires** sur **`/backoffice/analytics/network`** (histogrammes / répartition par conteneur si données disponibles).
- **Hub `/backoffice/analytics` vs `/backoffice/performances`** : **Analytics** = vue **rapide** (test CPU + liens) ; **Performances** = **historique complet** système (CPU, mémoire, **temps de réponse agrégé** `responseTimeAvg` quand la persistance le remplit, réseau cumul + débit). Encart renvoi **Performances** sur la page Analytics (avril 2026).
- **Sous-menu Performances** : **Fait (07/04)** — entrées drawer + **`PerformancesSubNav`** : synthèse unique (cartes), **pont conteneurs** → Analytics, **stub disque** (feuille de route disque hôte / alignement détail service), **réseau** reste catégorie à part (page détail Analytics). **Suite** : routes dédiées CPU-only / mémoire-only seulement si le porteur impose le découpage (sinon ancrages internes).
- **Application** (drawer **Analytics**) : **sous-routes** `/application/performance` (ex-page live), `/application/activity`, `/application/feedback` + **`ApplicationSubNav`** ; redirect `/application` → **performance**. Périmètre cible inchangé : **perf mobile**, **traces** (resets, etc.), **retours** (emails / signalements) — pages **activité** et **retours** = emplacements réservés (chantier données **user-analytics**, **event-service**, **mail**).
- **Sécurité × observabilité** : exploiter **charge réseau**, **métriques**, **analytics** pour **surcharge**, **menaces**, **politiques** (lots **B** + **A**) — gros chantier : règles de corrélation, seuils, pas seulement réafficher des graphes dans la vue sécurité.

### Souhaits graphes / données / tableaux (priorité porteur — compléter ici)

*(Ajoute une puce `[ ]` par idée ; l’équipe ne devine pas les priorités métier.)*

- [x] **CPU & mémoire (premier pas)** : **`/backoffice/performances`** — **`SystemCpuMemoryAreaCharts`** + **`systemMetricsSeriesModel`**. **Suite possible** : **`analytics/containers`**, **`statistique`**, etc.
- [x] **Réseau** : débit **Mo/min** sur **Performances** ; idem **`/backoffice/analytics/network`**.
- [x] **Temps de réponse** : persistance + instantané par service sur **Performances**.
- [x] **Statistiques** : sous-pages **App data** / **Sécurité** / **Logs (stats)** branchées.
- [ ] **À toi** : ex. sparkline CPU sur **`/backoffice/services`** (voir **A1d**) ; autres besoins : **une ligne = une intention**.

---

#### A1 — Que faire concrètement ? (vue détail service + socle graphes)

**Périmètre** : page **`/backoffice/services/[nom]`** + modules **`frontend/src/lib/monitoring/*`**, **`MonitoringServiceHistoryCharts.tsx`**, API **`metrics-aggregator`** (**`docker.routes.js`** — **`/history`**, métriques live).

| Statut | Signification |
|--------|-----------------|
| **Fait (code)** | Implémenté dans le dépôt ; **≠** « validé par toi » → colonne **Validé** dans **`PLAN.md`**. |
| **Reste** | Pas fini ou volontairement basse prio ; tu peux cocher quand c’est livré ou reporter dans **Souhaits** ci-dessus. |

**Déjà en place (ne pas refaire sans nouveau besoin)**  
CPU / mémoire / réseau / **Block I/O** (cumul + débit) sur l’historique ; **PIDs** dans les métriques live ; **disque hôte** (encart via **`GET /api/v1/metrics`**) ; fusion **fichiers + `container_metrics_snapshots` + session** via **`loadServerHistoryPoints`** ; graphes extraits dans **`MonitoringServiceHistoryCharts`** ; tests **`serviceHistorySources`**, **`serviceHistoryChartModel`**, **`page.test.tsx`** + mock **`/api/v1/metrics`** (`npm run test:service-detail-page`, `npm run test:service-history-model`).

**À faire ensuite (ordre raisonnable)**  

- [ ] **A1 — lot parent** : cocher la case principale **A1** seulement quand **A1d / A1e / A1g** auront avancé selon **ton** objectif produit (ou quand tu auras explicitement décidé de reporter le reste dans **`docs/BACKLOG.md`**).

- [x] **A1c — partiel** : **`next/dynamic`** (`ssr: false`) pour **`MonitoringServiceHistoryCharts`** sur la page détail service ; tooltips via **`rechartsTooltipProps`** dans **`MonitoringServiceHistoryCharts.tsx`**. **Reste** : lazy / alignement sur **autres** pages Recharts lourdes (**analytics**).

- [ ] **A1d** — Réutiliser le **patron** détail service sur : **`/backoffice`** (mini-séries si API OK) ; **`analytics/*`**, **`statistics` / `statistique`** (axes, gaps, légendes) ; option liste **`/backoffice/services`** (hint ou sparkline — basse prio).

- [ ] **A1e** — Brush / zoom ; couleurs + légendes + **`rechartsTooltipTheme`** partout ; aligner **`maxPoints`** / sous-échantillonnage avec **analytics**.

- [ ] **A1f** — Contrat API **PIDs** stable (ex. `docker top`) **si** tu en as besoin côté produit.

- [x] **A1g — partiel (07/04/2026)** : encart **sources d’historique** (session / fichiers agrégateur / Postgres) sur **`services/[serviceName]/page.tsx`**. **Reste A1g** : même logique de libellés sur **autres** pages monitoring (**A5** global).

**Qualité / CI (hors « feature » mais bloque parfois)**  
Dette **`npm run type-check`** : **`ERRORS.md`** ; journal : **`make type-check-frontend-log`**.

**Roadmap sécurité** (liée mais hors A1) : **B11** / **B12** — **`PLAN.md`** / **`STATUS.md`**.

- [ ] A2 — Logs tous services + filtres — **partiel (21–22/04)** : **`/backoffice/services/logs`** + **`centralMetricsService.getServiceLogs`** + agrégateur **`since`/`until`** ; filtres **niveau / type / texte** ; **`(development)/services/applications`** (onglet logs) + **`(development)/services/backoffice/[serviceName]`** → **`/api/v1/docker/service/…/logs`**. **Suite A2 (22/04)** : **`api-gateway`** — **`dockerLogsQuery.js`** + **`normalizeDockerLogsQuery`** (proxy + réponse **`query`**) ; **`admin/logs/*`** ; **Jest** `tests/dockerLogsQuery.test.js` (incl. construction query proxy — **complément** : smoke curl / **`make tests`** avec stack). **Infra** : **log-collector-c** écoute **3019** dans le conteneur (**5099** hôte) ; **`make rebuild-log-collector-c`** après pull. **Reste** : smoke / E2E admin ; **Loki** → **`docs/BACKLOG.md`** si hors sprint.
  - [ ] **A2 suite persistance fichiers** : en plus de la **BDD** (`aggregatedLog` / persistance agrégateur), **archives compressées rotatives** (gzip) par service ou par jour, index minimal pour recherche rapide ; exposition ou doc **`make`** / UI **`/backoffice/statistics/log-stats`**.
- [ ] A3 — Vues détail service : corrélation logs techniques × sécurité (**partiel** : encart liens sécurité + logs centralisés sur la page détail ; reste : vue unifiée / timeline / API si besoin).
- [x] A4 — Synthèse pipeline dans `ERRORS.md` (§ Pièges + pipeline) ; **à réviser** après A2–A3.
- [ ] A5 — **Historique enregistré** : UI qui distingue **temps réel Docker** / **snapshots fichiers** / **persistence BDD** ; brancher les séries déjà stockées sur détail service + pages monitoring liées (analytics, stats, liste services) ; **suite** (non pressé) : encore plus de panneaux sur détail service + pages « performances ». **Suite 07/04 (partiel)** : timeout historiques + clamp `limit` + **localStorage** période partagée performances/réseau/conteneurs ; **affichage heure** : `formatLocalDateTime` dernier point ; **`normalizeMetricRows`** (`analytics.service.ts`) = **`timestampMs`** dérivé de l’**ISO** quand parseable (corrige JSON incohérent) ; tests **`date-metrics-display.test.ts`** + **`analytics-metric-rows-normalize.test.ts`** ; **`timestampMs`** API + **`metricRowToTimeMs`** / **`timeMs`** sur graphes ; **`parseChartTimestamp`** `{ value }` ; **`injectMetricTimeGaps`** ; **`docker-compose.yml`** `postgres` **TZ/PGTZ** ; **SQL `system_metrics`** : **`AT TIME ZONE`** = **`POSTGRES_SYSTEM_METRICS_TZ`** (comme Postgres) + **`make restart-metrics-recreate`** / **`monitoring-clock-refresh`** si besoin — **à valider** sur ta machine (graph aligné horloge locale) ; étendre **user-analytics** / **application** si besoin.

---

## Lot B — Sécurité

**Vision d’ensemble (tout le périmètre « sécurité » — où ça vit dans le repo)** :

| Thème | Rôle / implémentation typique | Lots / doc |
|--------|-------------------------------|--------------|
| **Firewall, WAF, règles, iptables** | `security-service`, routes proxy **`/api/v1/security/*`** via **gateway** ; UI **`/backoffice/security/firewall`** ; vérif **`make security-live-check`** | **B5**, **B10** ; `scripts/security/` |
| **Politiques (IPs, WAF)** | Données **security-service** + écrans **Politiques / Menaces** ; application : règles persistées puis **application** côté service (firewall controller) + trafic entrant filtré **gateway** / service selon archi | **B1–B3**, **B10** |
| **Menaces & analyse temps réel** | Logs **`eventType`**, table menaces, **`networkThreatDetector`** ; pages **Analyse**, **Réseau**, vue d’ensemble | **B3**, **B4**, **B6**, **B10** |
| **Logs techniques utiles enquête** | **`/backoffice/services/logs`** (metrics-aggregator) + **corrélation** avec sécurité | **A2**, **A3**, **B8** |
| **Mot de passe (complexité, reset)** | **`auth-service`** (ex. `min: 6` aujourd’hui), emails reset ; durcissement = évolution produit + **B7** audit si besoin | Auth + **B7** ; **`.env.example`** |
| **Déploiement / secrets / prod** | Compose, **`PREPROD_PRODUCTION_CHECKLIST.md`**, **`INTRUSION_DETECTION_ENABLED`**, secrets forts | **B5**, **B6** ; lot **G** ; checklist **§ manuel** ci-dessous |
| **Sauvegardes & continuité** | Pas encore le même code que le firewall — **lot G** | **G1–G7** |

- [x] B1 — Cohérence : `blockOrigin` sur IPs bloquées + affichage firewall / analyse (affiner si besoin).
- [x] B2 — Test IP lab + **refus blocage de sa propre IP** côté API ; messages UI test vue sécurité.
- [ ] B3 — **Partiel (`PLAN.md`)** — Légende vue sécurité + panneaux Analyse (détections / manuels+lab / auto) ; **reste** : badges **origine** partout (firewall), distinction détection vs blocage **homogène** sur toutes les vues.
- [ ] B4 — **Partiel (`PLAN.md`)** — Réseau : corrélation % + hint actionnable ; **reste** : cas **« unknown »** résiduels, messages API / empty states.
- [x] B5 — `make security-live-check` : auth firewall/WAF côté security-service + secret interne scripts ; types menaces `generate-test-threats` alignés sur l’API (avril 2026).
- [ ] **B6** — **Corrélation** : `X-Request-Id` / `X-Correlation-Id` — **partiel 22/04** : middleware gateway **`requestCorrelation.js`**, proxy + CORS + **`frontend/src/lib/api.ts`** ; **intrusionDetector** enrichi si réactivé. **Reste** : morgan / middleware sur **chaque** microservice + recherche côté **security-service** + mobile + NTP prod.
- [ ] **B7** — **Audit append-only** : actions sensibles (admin login, exports, IP unblock, test-data destructif, rôles) ; pas de secrets en clair ; lecture réservée rôle élevé.
- [ ] **B8** — **Backoffice** : vue **investigation / post-incident** sous **Sécurité** (filtres acteur, période, type) ; croisement menaces + audit + logs ; export horodaté + **hash** pour chaîne interne ; doc **`docs/security/`** (procédure, rôles).
- [ ] **B9** — **Mobile** : erreurs + **événements sécurité** (session révoquée, échecs auth, etc.) vers API **rate-limit** ; corrélation user/device/IP ; rappel limite appareil compromis — croiser **lot D1** / **D2**.
- [ ] **B10** — **UX backoffice sécurité** : reprendre **`/backoffice/security/**`** (vue d’ensemble, firewall, analyse, réseau, etc.) — lisible, métriques **alignées API**, empty states, unités / fenêtres temporelles explicites ; préparer emplacements **investigation (B8)** ; politique mots de passe **côté UI** (texte d’aide + lien doc) une fois règles auth figées.
- [ ] **B10 suite — incidents temps réel + score** : texte d’encart déjà posé (données BDD / démo / tests) ; **compléter** : lien vers **`ERRORS.md`** (faux positifs résiduels, **`ENOTFOUND`** si stack partielle) ; **exposer proprement la pondération du score** (aujourd’hui **`localStorage`** **`securityScoreWeights`** dans **`page.tsx`** vue sécurité) — idéalement UI « poids par famille » + persistance serveur ou doc admin si refus du localStorage seul.
- [ ] **B11 (spec / backlog)** — **Emails de rapport sur incidents critiques** : configuration (**SMTP** déjà cadré préprod **`PREPROD_PRODUCTION_CHECKLIST.md`**, **`CRASH_REPORT_EMAIL`**, etc.) étendue aux **alertes métier** — failles / menaces **très graves**, événements **firewall** majeurs, **indisponibilité** d’un service ou d’une partie du projet ; destinataires, **seuil de gravité**, **rate-limit** / regroupement pour éviter le spam ; templates ; traçabilité **B7** / investigation **B8** ; pas d’exposition de secrets dans le corps du mail.
- [ ] **B12 (spec / backlog)** — **Analyse sécurité en quasi temps réel** mais **très peu coûteuse** : boucles légères (intervalles **adaptatifs**, **backpressure**, limites mémoire sur tampons / fenêtres d’événements), éviter le **polling** agressif sur grosses tables ; option **SSE / WebSocket** **throttled** ; cohérence avec **B3–B4–B10** et charge côté **security-service** + gateway.

---

## Lot C — Suivi-intérim & données test

- [ ] C1 — `/backoffice/suivi-interim` : données utiles, flux agences ↔ candidatures — **21/04** : erreur API affichée + **Rafraîchir** + lien **test data** (`SuiviInterimContent.tsx`) ; **reste** données / filtres / validation porteur.
- [ ] C2 — Procédure claire base principale vs base test (admin préservé) — **partiel** : **`make env-check`** / **`make env-append-missing`** ; doc **`docs/database/MIGRATIONS_ET_BASES.md`** à compléter.
- [x] C3 — `generate-test-data` / clear / marquage : **partiel livré** — endpoints **`tag-likely`**, **`summary`**, clear **Document** + **EmailLog** ; UI **TestDataTab** + **`/backoffice/test-data`** (balanced) ; **`--balanced`** / **`_balanced`** ; validation **porteur** + éventuels compteurs « stats uniquement test » encore **à faire**.

---

## Lot D — Mobile & observabilité

- [ ] D1 — Schéma d’événement crash / erreur normalisé (champs obligatoires) ; **aligner** champs avec **B9** (événements sécurité mobile si même pipeline).
- [ ] D2 — Chaîne complète jusqu’aux vues analytics / logs admin.
- [ ] D3 — Libellés et filtres compréhensibles dans stats / monitoring.
- [ ] **D4 — Analytics utilisateur (événements) : périmètre & récupération** — **cadrage produit + technique** (voir **`PLAN.md`** lot **D**, note analytics) : (1) **qui** est tracké — **admins / navigateur backoffice** (parcours UI admin, pas confondre avec l’app mobile candidat) **vs** **utilisateurs finaux sur l’app mobile** ; (2) **quoi** — interactions **au-delà du seul binaire mobile** : parcours **email** (lien d’inscription, **code / token** de validation compte, **demande et confirmation de reset mot de passe**) = événements **côté serveur** (auth-service, logs mail, tables dédiées) exploitables pour stats / audit sans dépendre uniquement du SDK mobile ; (3) **où en UI** — **`/backoffice/user-analytics`** et pages **Statistiques & Monitoring** cohérentes avec ce périmètre (libellés « web admin » vs « app mobile » vs « parcours email / auth ») ; (4) **alignement** tables **`user_events`** / API (voir **`ERRORS.md`** si table ou route manquante) + croisement **B7** (audit actions sensibles admin). **Priorité** : stack **locale** (`make up-full`, Postgres OK au **`make status`**) — pas de livrable **prod** pour l’instant.

---

## Lot E — Documentation

- [x] `STATUS.md` — structure de lecture + tableau lots A–F + liens (avril 2026).
- [x] `ERRORS.md` — § Pièges dashboard + pipeline + lignes chantier A/B (avril 2026).
- [x] `FONCTIONNALITES.md` — § 4.1 dashboard détaillé + date avril 2026.
- [x] `RESOLUTIONS.md` — entrée avril 2026 (vue d’ensemble observabilité).
- [x] **`STATS.md`** — gabarit **CVE / dépendances** (services, front, mobile, Docker) + script boucle `npm audit` — **22/04** ; remplir tableaux après audits.
- [ ] `ERRORS.md` — relecture complète après lots A/C (échecs tests, nouvelles erreurs actives).
- [ ] `RESOLUTIONS.md` — derniers correctifs sécurité (lot **B**) / monitoring & logs (lot **A**) / intérim.
- [ ] `PROCESSUS_APPLICATION_MOBILE_ET_API.md` — synchro avec l’état API + mobile.
- [ ] `FONCTIONNALITES.md` — ajuster ce qui est livré vs prévu (y compris § **4.4** lot **G** quand implémenté).
- [ ] `docs/BACKLOG.md` — éviter doublons avec ce fichier ; renvoyer vers PLAN pour le chantier structuré.
- [ ] Revue ciblée des sous-dossiers `docs/` (architecture, API, DB, sécurité, tests).

---

## Lot F — Validation

- [ ] F1 — Rejouer **`make tests`** avec **`make up-full`** + **`.env`** (**`API_GATEWAY_URL=http://127.0.0.1:5002`** ou port réel) ; analyser **`tests/results/<ts>/report.html`**. **17/04** : doc **`ERRORS`/`STATUS`/`FONCTIONNALITES`/`RESOLUTIONS`** ; code **`dockerHostUrl.js`**, **`test-api-specific.sh`**, perf, gateway health — **à confirmer** sur ta machine.
- [x] F1b (partiel) — **`Status: 000`** script API : **`mktemp`** + normalisation URL ; perf : **`exit 1`** si échecs ; reste : **intégration / sécurité** tolérants **`ENOTFOUND`** (durcir plus tard).
- [ ] F2 — Rédiger le récap : fait / reste / risques / prochaines priorités (peut aller en fin de `PLAN.md` ou `STATUS.md`).
- [ ] F3 — **Couverture `tests/services/`** : pour chaque microservice encore sans script sous `tests/services/`, ajouter un smoke (health + 1–2 routes gateway typiques) ; mettre à jour `run-all-tests-with-reports.sh` si besoin ; préférer **`API_GATEWAY_URL`** (pas ports directs) sauf metrics-aggregator documenté — détail **`PLAN.md`** § F3.
- [ ] F3b — **`tests/performance/test-load-advanced.js`** : le stress **auth** utilise déjà **`apiGateway` + `/api/v1/auth/health`** ; **refonte** des autres scénarios (**companies**, **applications**, clés **`localhost:300x`**) pour tout passer par la gateway (**`dockerHostUrl` / `API_GATEWAY_URL`**, chemins **`/api/v1/...`**) comme **`test-performance.js`** — principe « sécurité = requêtes métier via gateway » ; voir **`PLAN.md`** F1 / F3 et **`STATUS.md`** § Tests de performance.

---

## Lot G — Sauvegardes sécurisées, API, délocalisation, continuité (PCA/PRI)

Spec détaillée : **`PLAN.md`** § **G** ; fonctionnel : **`FONCTIONNALITES.md`** § **4.4** ; statut projet : **`STATUS.md`** § *Sauvegardes…*.

- [ ] G1 — Cadrage sécurité : modèle de menaces, clés (vault/KMS/fichier), rotation, rôles (`SUPER_ADMIN` + service interne) ; doc `docs/operations/BACKUP_AND_DR.md` (ou équivalent).
- [ ] G2 — API backup sous gateway : jobs, statut, historique, audit, rate limit, **non publique** sans contrôle réseau.
- [ ] G3 — Pipeline **chiffrement** des dumps (pas de clair durable sur disque partagé) + vérification d’intégrité.
- [ ] G4 — **Délocalisation** (S3-compatible, autre hôte) ; secrets uniquement serveur ; option lien téléchargement **TTL court**.
- [ ] G5 — **UI backoffice admin** : déclenchement manuel, état des jobs, messages sans fuite ; restauration **sandbox** / runbook avant prod.
- [ ] G6 — **RPO/RTO**, runbook de reprise, exercices de restauration documentés.
- [ ] G7 — Durcissement Docker/réseau/logs sécurité pour le worker backup.

---

## Vue d’ensemble `/backoffice` — améliorations futures (optionnel)

- [ ] Afficher un **horodatage** ou état « connecté au metrics-aggregator » sur la carte Performance.
- [ ] Exposer un **taux d’erreurs HTTP %** si le backend fournit ce ratio (en complément du débit /min).
- [ ] Clarifier encore **sessions vs utilisateurs actifs** selon le contrat exact de l’endpoint auth (libellé + tooltip ou doc API).

## Makefile `status` / `status-watch` (implémenté 21/04 — à valider chez le porteur)

- [x] **`make status-watch`** / **`make status-live`** : boucle = **`make status`** ; défaut **sans `clear`** ; **`CLEAR=1`** pour plein écran ; séparateur gris entre cycles si pas clear ; pied de cycle coloré ; résumé **0/0** explicite.
- [ ] Relire sur ta machine : légende **5098 → 8015** (**monitoring-c**), couleurs terminal, **`INTERVAL=30`** si besoin.

## Monitoring transversal (optionnel — aligné **PLAN A5**, non pressé)

- [ ] Même **légende live / snapshots / BDD** que le détail service sur **analytics**, **statistiques**, **liste services**.
- [ ] **Détail service** : panneaux supplémentaires (redémarrages, limites cgroup, comparaison à la moyenne stack) quand l’API le permet.
- [ ] Pages **« performances »** : enrichissements UX + données (voir **PLAN.md** § Améliorations futures lot A).

---

## Rappels produit (hors lots mais prioritaires — voir STATUS.md)

Ne pas confondre avec le chantier ci-dessus ; ce sont les **P0** globaux du projet :

- [ ] Mobile utilisable quotidien (parcours inscription → CRUD → relances).
- [ ] Suivi intérim côté **mobile** (toggle utilisateur) + polish backoffice.
- [ ] Déploiement VPS simple (P1).

---

## Comment utiliser ce fichier

1. Cocher `[x]` quand la tâche est **réellement** mergée et vérifiable.
2. Si une tâche devient du « plus tard », la **déplacer** vers `docs/BACKLOG.md` avec une courte justification, et la retirer d’ici pour limiter le bruit.
3. Le plan détaillé et les critères d’acceptation : **`PLAN.md`**.

---

## Actions **manuelles** (porteur / infra — l’IA ne peut pas les valider à votre place)

Checklist détaillée et cohérente : **`docs/operations/PREPROD_PRODUCTION_CHECKLIST.md`**.

- [ ] **NTP** (ou sync équivalente) sur les hôtes **avant** de s’appuyer sur les logs pour enquête (**B6**).
- [ ] **Secrets** production : pas de défauts dev (`SECURITY_INTERNAL_SECRET`, JWT, etc.).
- [ ] **Vérification terrain** : le **security-service** permet bien de **retrouver** une trace par `requestId` / métadonnées (selon votre stockage final).
- [ ] **Mobile** : envoi d’un **identifiant de corrélation** sur les appels API (build réel, pas seulement émulateur).
- [ ] **Intrusion gateway** : Redis disponible ; relever les **faux positifs** après activation ; `INTRUSION_DETECTION_ENABLED=false` uniquement en **dépannage** ciblé.
- [ ] **SMTP prod** : **`SMTP_USER`** / **`SMTP_PASS`** réels ; **TLS** (port + `SMTP_SECURE` / `SMTP_USE_SSL`) selon le fournisseur — voir **`docs/operations/PREPROD_PRODUCTION_CHECKLIST.md`** § F.
- [ ] **Crash reports** : **`CRASH_REPORT_EMAIL`** = boîte **dédiée** et exploitable (tri, alertes) ; parcours d’essai après bascule SMTP (**on verra** quand tu activeras l’envoi réel).

---

## Analyse CVE & supply chain (voir **`STATS.md`**)

Remplir **`STATS.md`** après chaque passe d'outils ; cocher ici quand le **processus** ou la **CI** est en place (les chiffres CVE restent dans **STATS**).

- [ ] **`npm audit --omit=dev`** (ou équivalent) sur **chaque** microservice listé dans **STATS.md** § 2.1 + **frontend** + racine — reporter date et severités dans **STATS.md**.
- [ ] **Docker Scout** ou **Trivy** sur les images **jobbingtrack-*** et bases **postgres** / **redis** — résumer dans **STATS.md** § 2.5.
- [ ] Mobile : **`flutter pub outdated`** (et audit pub si disponible) sur **`mobile/`** et **`flutter-mobile-app/`** — noter dans **STATS.md** § 2.4.
- [ ] (Optionnel) Étape **audit** en CI (seuil **high** minimum) sans bloquer indéfiniment le dev local.

---

## Fichiers « dot » à la racine & déploiement (à garder en tête)

| Fichier | Rôle | Git / CI / prod |
|--------|------|------------------|
| **`.jobbingtrack-stack-mode`** | Écrit par **`make up`**, **`make up-full`**, **`make up-dev`** : contient une ligne (`up-essential`, `up-full`, `up-dev`) pour que **`make restart`** affiche le **dernier mode** de stack. Supprimé par **`make down`** / **`down-clean`** / **`restart-clean`**. | **Ignoré** (`.gitignore`) — **ne pas déployer** comme config ; recréé localement par Make. |
| **`.nettoyage_effectue`** | Ancien **marqueur manuel** (note nov. 2025 sur fusion de docs) ; **aucune** lecture par le Makefile actuel. | **Ignoré** (`.gitignore`) — supprimable sur ta machine ; **ne pas pousser**. |
| **`.node-version`** | Version Node attendue (ex. **20.19.5**) pour **asdf / nodenv / certains hébergeurs** ; en parallèle de **`.nvmrc`** (souvent identique). | **Versionné** — utile en **CI** (actions `node-version` peuvent lire le fichier) et pour les contributeurs ; en **prod** Docker, la version réelle est l’**image** (`Dockerfile`), pas ce fichier. |
| **`.nvmrc`** | Même intention que **`.node-version`** pour **`nvm use`**. | **Versionné** — idem ; aligner avec l’image Node des Dockerfiles si tu changes la majeure. |
| **`.env`**, **`.env.*`** (hors exemple) | Secrets et URLs locales. | **Ignorés** — en déploiement : variables d’environnement **injectées** (fichier env du PaaS, secrets manager), **jamais** commit du `.env` prod. |

**Déploiement (plus tard)** — pense-bête : ne pas copier les marqueurs dev (`.jobbingtrack-stack-mode`, `.nettoyage_effectue`) sur les serveurs ; documenter dans le runbook quelles variables d’environnement remplacent **`.env.example`** ; vérifier que **`.dockerignore`** n’exclut pas des fichiers nécessaires au **build** ; option : **`.deployignore`** ou équivalent si tu synchronises le dépôt par **rsync** (hors Git) pour exclure `node_modules/`, `.next/`, rapports de tests. **À trancher** avec **`docs/operations/PREPROD_PRODUCTION_CHECKLIST.md`** (lot **G** / procédure release).

---

## Dernière section du fichier — méta-chantiers (ne rien ajouter *après* sans déplacer ce bloc)

**Règle** : toute nouvelle tâche « transverse » (doc globale, audit BDD, validation porteur) s’ajoute **dans cette section** ou juste **au-dessus du tiret `---` qui précède**, pour garder **en bas de fichier** l’historique des chantiers structurels.

- [ ] **Validation produit (porteur)** : pour chaque lot livré techniquement, **vous** cochez **`PLAN.md`** (**Validé (porteur)**) ou une mention datée dans **`STATUS.md`** ; tant que ce n’est pas fait, le livrable reste « en attente d’acceptation » même si le code est mergé.
- [ ] **Revue base de données avant grosse passe de tests** : aligner schéma maître (**auth-service** / `db-push-all`), scripts **`scripts/db/*.sql`**, tables listées dans **`ERRORS.md`**, et attentes des services (déploiements, logs agrégés, etc.) — objectif : éviter les écarts « table absente » / doubles définitions lors de **`make tests`** ou **`make test-suite-full`**. Croiser **lot A2**, **A5**, **C** (données test) dans ce fichier.
- [ ] **Trafic répété `GET /api/v1/security/*` via la gateway** : ce flux correspond en général à un **client** (UI backoffice sécurité / firewall en rafraîchissement, onglet ouvert) — **ce n’est pas** une erreur isolée « mystérieuse » ; si le volume pose problème (logs, charge), **diagnostiquer la source** (quel onglet, quel intervalle) puis réduire le polling ou mutualiser les requêtes — voir **`STATUS.md`** § journalisation / diagnostic et **`ERRORS.md`** § homonyme.
- [ ] **Refonte documentation (racine + `docs/`)** : reprendre **tous** les **`.md` à la racine** et **tous les `.md` sous `docs/`** de façon **structurée** (rôles, doublons, liens, ordre de lecture, index unique ou fil d’Ariane clair) ; aligner **PLAN**, **STATUS**, **TODOS**, **ERRORS**, **RESOLUTIONS**, **STATS**, **FONCTIONNALITES**, **`docs/BACKLOG.md`**, **`docs/CHANTIER_SECURITE_DATA_DOCS.md`**. *À planifier explicitement avant grosses réécritures.*

