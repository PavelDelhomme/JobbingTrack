# Plan d’exécution — Écosystème backoffice, API, sécurité et documentation

**Objectif** : rendre l’écosystème backoffice + API réellement opérationnel et cohérent (**monitoring / logs** en premier, **sécurité** ensuite, suivi-intérim, analytics), **à terme** **sauvegardes chiffrées délocalisées** et **continuité de service** (**lot G**), puis aligner la documentation sur l’état réel avec une feuille de route claire.

**Documents liés** : `STATUS.md` (état courant et priorités produit), `TODOS.md` (cases à cocher opérationnelles), `docs/BACKLOG.md` (backlog large et tâches « plus tard »), **`docs/CHANTIER_SECURITE_DATA_DOCS.md`** (index du chantier dans `docs/`) ; **lot G** (sauvegardes / continuité) : **`PLAN.md`** § G, **`FONCTIONNALITES.md`** § 4.4.

**Plan Cursor (IDE)** : le fichier `.cursor/plans/chantier_securite_data_docs_2c0a63b7.plan.md` peut encore nommer les lots dans l’**ancien** ordre ; **source de vérité** : ce **`PLAN.md`** (lots **A** = monitoring, **B** = sécurité, **G** = backup / continuité, avril 2026).

**`make up-full` / Compose** : la stack documentée est pensée pour le **développement local** (profils Docker, variables d’exemple, montages `src` pour le hot reload). Un déploiement **production** (VPS, secrets, non-root, sauvegardes **lot G**) reste à cadrer séparément — ne pas assimiler « `up-full` vert » à une prod prête sans durcissement.

**Dernière révision du plan** : 7 avril 2026 — **A5 (suite)** : persistance **localStorage**, timeout / clamp `limit`, alignement réseau ; **affichage temps** : dernier point et libellés via **`formatLocalDateTime`** / **`Intl` fuseau explicite** (`date.ts`) pour éviter la lecture de l’heure « dans l’ISO » comme heure locale ; tests **`date-metrics-display`** + **`normalizeMetricRows`** / **`analytics-metric-rows-normalize`** (alignement **`timestamp` ↔ timestampMs** après JSON) ; ajout **lot G** (sauvegardes chiffrées, API et backoffice admin, délocalisation, PCA/PRI) ; colonnes **État** / **Validé (porteur)** ; synthèses % par lot ; **pas de PR** tant que le porteur ne l’a pas demandé dans la conversation ; validation usage **uniquement** par vous ; **`make tests`** : **lot F1** / **`STATUS.md`**.

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
2. Les pages **sécurité** reflètent fidèlement les événements réels (dont payload overflow, injections, blocages).
3. Le suivi-intérim affiche des données utiles et cohérentes avec la base active.
4. La documentation est synchronisée avec l’état actuel et exploitable comme feuille de route de travail.

---

## Lot A — Monitoring détaillé des services, logs multi-sources, corrélation

**Synthèse (indicatif)** — Technique **~35 %** · **Validé porteur** : **0/5** (compter les « Oui » dans **Validé** ci-dessous ; mettre à jour ce ratio vous-même).

**Rappel sources de données** : le **temps réel** vient surtout de **Docker stats** / endpoints **`/api/v1/docker/service/:name`**. L’**historique fichier** est alimenté quand l’agrégateur enregistre des snapshots (`metricsHistory`, ex. sous `/tmp/metrics/history/services/<slug>/` en environnement typique) — ce n’est **pas** magiquement « toute la vie du conteneur » si la persistance n’a pas tourné ou si le conteneur est récent. Les **points « session »** sur la page détail complètent la courbe tant que l’onglet reste ouvert. Une voie **PostgreSQL** (`persistence`) existe côté agrégateur : l’**A5** vise à l’exploiter et à l’expliciter en UI.

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| A1 | **Monitoring détaillé par service** : CPU / mémoire / réseau / disque avec **précision**, **historique** (snapshots dispo + session), **auto-rafraîchissement** (10–60 s), **PIDs** / **Block I/O** documentés ; sonde HTTP santé via **nom conteneur Docker** (plus `localhost` depuis l’agrégateur) ; axes graphiques en **heure locale** + jour si série &gt; 24 h | Partiel (07/04/2026) | Non | `frontend/.../services/[serviceName]/page.tsx` ; `metrics-aggregator-service` (`docker.routes.js`, `server.js`) ; **`make status-watch`** (boucle statut, **`INTERVAL=5`** par défaut ; légende ports en **`printf '%b'`**) |
| A2 | Faire remonter les logs de **tous** les services avec filtres (service, niveau, type, période) | Partiel (07/04/2026) | Non | Gateway `admin/logs/*` ; **`/backoffice/services/logs`** ; reste niveau/type/période + `(development)/services/**` |
| A3 | Corréler logs techniques et événements sécurité dans les vues détail service | Partiel (07/04/2026) | Non | Encart liens **sécurité** + **logs multi-services** sur `/backoffice/services/[nom]` ; corrélation données unifiée (timeline / filtres croisés) encore à faire |
| A4 | Clarifier le pipeline erreurs / warnings / crash (Gateway, security-service, backoffice) | Partiel | Non | **ERRORS.md** ; affiner après A2–A3 |
| A5 | **Métriques déjà enregistrées** : brancher et **libeller** **live vs historique fichiers vs persistence BDD** sur détail service + pages monitoring liées ; enrichir **performances** / détail service (non pressé) ; **suite 07/04** : même `limit` API **réseau** que **performances** ; **timeout** axios + **clamp** `limit` (routes + SQL/Prisma) pour plages longues (ex. 30 j.) ; **localStorage** clé `jobbingtrack:analytics:shared-time-v1` pour réutiliser préréglage / plage perso / **suivre le direct** entre **performances**, **réseau**, **conteneurs** ; **affichage** : pas d’ISO brute pour « dernier point » ; **`date.ts`** (`parseChartTimestamp` objets `{ value }`, **`metricRowToTimeMs`**, **`Intl` fuseau**) ; **`timestampMs`** côté agrégateur + UI ; côté front, **`normalizeMetricRows`** aligne **`timestampMs`** sur l’**ISO** normalisé (évite décalage si JSON diverge) ; test **`analytics-metric-rows-normalize.test.ts`** ; **`injectMetricTimeGaps`** ; **`docker-compose.yml`** `postgres` **`TZ`/`PGTZ`** (`POSTGRES_SYSTEM_METRICS_TZ`, défaut UTC) ; lecture SQL **`system_metrics`** : **`AT TIME ZONE`** = **`POSTGRES_SYSTEM_METRICS_TZ`** (comme Postgres) ; **`make restart-metrics-recreate`** pour appliquer env/image ; agrégateur **`TZ=UTC`** ; test **`date-metrics-display.test.ts`** | Partiel (07/04/2026) | Non | `persistence.service.js`, `persistence.routes.js`, `analytics.service.ts`, `usePersistedSharedAnalyticsRange.ts`, `date.ts`, `injectMetricTimeGaps.ts`, `docker-compose.yml`, `analytics/page.tsx`, `analytics/performances`, `analytics/network|containers`, `centralMetricsService.ts`, `statistics`, `services/page.tsx` |

**Note (priorisation)** : poursuivre **A1–A2** en priorité ; **A5** lorsque le socle est stable.

---

## Lot B — Sécurité visible et exploitable

**Synthèse (indicatif)** — Technique **~75 %** · **Validé porteur** : **0/5** — à ajuster quand vous aurez rempli la colonne **Validé**.

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| B1 | Cohérence entre détections, menaces et IPs bloquées | Fait (07/04/2026) | Non | `getBlockedIps` + UI (firewall, menaces, analyse, vue d’ensemble) ; `threatId` depuis logs ; fenêtre logs **30 j.** alignée vue d’ensemble / Analyse ; agrégateur **sans NaN** sur `responseTime.average_ms` ; enrichissement **destIp** API menaces |
| B2 | Mode de test de blocage IP sûr (IP de test dédiée, jamais l’IP utilisateur réelle) | Renforcé | Non | `lab_simulation` ↔ `LAB_BLOCK_IP` ; **refus** de bloquer l’IP observée comme client (hors lab) ; UI feedback test vue sécurité |
| B3 | Vue sécurité : distinguer explicitement détection / blocage manuel / blocage automatique | Partiel | Non | Légende + cartes sur vue sécurité ; **Analyse** : 3 panneaux (détections, manuels+lab, auto) ; firewall : badges origine |
| B4 | Analyse réseau : éviter le conteneur « unknown » 100 % non actionnable | Partiel | Non | `containerCorrelation` + `correlationHint` API ; bannière et explications UI page réseau |
| B5 | WAF + `make security-live-check` : auth firewall/WAF sur security-service (JWT ou `X-Internal-Secret`) ; scripts alignés ; **rebuild** image si deps (`jsonwebtoken`) ; volume `src` ; `FIREWALL_BASE_URL` / `AUTH_GATEWAY_URL` ; **`user: 0:0` + NET_ADMIN** pour **iptables** en dev | Fait (04/2026) | Non | `security-service/server.js`, `scripts/security/*.sh`, `docker-compose.yml` ; **RESOLUTIONS.md** § 8 avril 2026 |

**Note (priorisation)** : **B3** et **B4** restent **Partiels** côté technique ; poursuite en parallèle du lot **A** si besoin.

---

## Lot C — Data backoffice et suivi-intérim (priorité produit)

**Synthèse (indicatif)** — Technique **~0 %** · **Validé porteur** : **0/3**

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| C1 | Diagnostiquer le vide fonctionnel de `/backoffice/suivi-interim` et corriger le flux agences / candidatures | À faire | Non | `SuiviInterimContent.tsx`, `datas/page.tsx` |
| C2 | Cohérence base principale vs base test (sans supprimer `admin@jobbingtrack.test`) | À faire | Non | Makefile, `docs/database/MIGRATIONS_ET_BASES.md` |
| C3 | Génération / nettoyage données test prévisibles et non destructifs | À faire | Non | `backend/generate-test-data.js`, routes admin gateway |

---

## Lot D — Mobile crash et observabilité applicative

**Synthèse (indicatif)** — Technique **~0 %** · **Validé porteur** : **0/3**

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| D1 | Normaliser les événements erreur / crash mobile (source, device, version, crashType) | À faire | Non | Mobile Flutter + endpoint notifications |
| D2 | Vérifier la traçabilité bout en bout vers analytics / performance / logs | À faire | Non | dashboard-service, metrics-aggregator, pages stats (voir **lot A** / **A5**) |
| D3 | Exploitation claire dans les pages monitoring / statistiques | À faire | Non | `frontend` pages admin stats / analytics |

---

## Lot E — Documentation exhaustive et nettoyage

**Synthèse (indicatif)** — Technique **~25 %** · **Validé porteur** : **0/3**

**Note 07/04** : libellés de **période** analytics (fenêtres glissantes type 24 h) + rappel sous les graphiques — voir `STATUS.md` § Analytics ; `frontend/src/components/analytics/timeRangeUtils.ts`, `TimeRangeSelector.tsx`, `ChartPeriodCaption.tsx`.

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|----------------|
| E1 | Mettre à jour et aligner : `STATUS.md`, `ERRORS.md`, `RESOLUTIONS.md`, `PROCESSUS_APPLICATION_MOBILE_ET_API.md`, `FONCTIONNALITES.md`, `docs/BACKLOG.md` | Partiel (07/04/2026) | Non | Racine + `docs/` |
| E2 | Revue `docs/` (architecture, API, endpoints, metrics, décisions, changelog, DB, sécurité, mails, tests) | À faire | Non | Dossier `docs/` |
| E3 | Nettoyer l’obsolète ; marquer explicitement le « non opérationnel » restant + plan d’action | À faire | Non | — |

---

## Lot F — Validation finale et livrables

**Synthèse (indicatif)** — Technique **~20 %** · **Validé porteur** : **0/2**

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|----------------|
| F1 | Tests ciblés API + E2E (monitoring / services, sécurité, backoffice, suivi-intérim, logs) | Partiel | Non | **`make tests`** : stack + **`.env`** avec **`API_GATEWAY_URL`** joignable depuis l’hôte (**`127.0.0.1:5002`** typ.). **17/04** : **`dockerHostUrl.js`**, **`test-api-specific.sh`** (**`mktemp`**), perf **`exit(1)`** si échecs, gateway health allégé, **`loadScore`** monitoring optionnel — **`RESOLUTIONS.md`** § 17/04. **Reste** : Playwright login / **`api-e2e`**, exit codes intégration/sécurité, résumé global **`make tests`**, tests métriques par surface (A5) |
| F2 | Récapitulatif final : corrigé / reste à faire / risques / priorités opérationnelles | À faire | Non | — |

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
2. **B** (sécurité visible) : poursuivre **B3–B4** ; valider **B1–B2–B5** côté porteur quand vous avez testé (**colonne Validé**).
3. **C** (produit intérim / données) en parallèle si possible.
4. **D** lorsque les pipelines logs/métriques (**lot A**) sont stables.
5. **E** en continu par **petites livraisons documentées** (sans PR tant que non demandé) ; éviter un gros « dump » doc en fin de chantier uniquement.
6. **F** en gate avant de considérer le chantier « clos ».
7. **G** (sauvegardes / continuité) : **après** stabilisation des lots **A/B** et clarification des contraintes hébergeur ; ne pas ralentir le socle monitoring/sécurité sans cadrage **G1**.

Pour le détail des cases à cocher au jour le jour, voir **`TODOS.md`** (aligné sur ce plan et sur **`ERRORS.md`** / **`FONCTIONNALITES.md`**).
