# Plan d’exécution — Écosystème backoffice, API, sécurité et documentation

**Objectif** : rendre l’écosystème backoffice + API réellement opérationnel et cohérent (**monitoring / logs** en premier, **sécurité** ensuite, suivi-intérim, analytics), **à terme** **sauvegardes chiffrées délocalisées** et **continuité de service** (**lot G**), puis aligner la documentation sur l’état réel avec une feuille de route claire.

**Documents liés** : `STATUS.md` (état courant et priorités produit), `TODOS.md` (cases à cocher opérationnelles — **dernière section** = méta-chantiers : validation porteur, audit BDD avant tests massifs, refonte doc racine + `docs/`, trafic sécurité gateway), **`security/STATS.md`** (CVE / dépendances — tableaux à compléter après audits), **`operations/PREPROD_PRODUCTION_CHECKLIST.md`** (NTP, secrets, **SMTP/TLS**, **`CRASH_REPORT_EMAIL`**, Jest gateway **en conteneur**, vérifs **manuelles** avant prod), **`security/COMPOSE_RUNTIME_HARDENING.md`** (durcissement **docker-compose** / **`docker.sock`** / Redis / non-root — lot **B14**), `BACKLOG.md` (backlog large et tâches « plus tard »), **`project/CHANTIER_SECURITE_DATA_DOCS.md`** (index du chantier dans `docs/`) ; **lot G** (sauvegardes / continuité) : **`PLAN.md`** § G, **`project/FONCTIONNALITES.md`** § 4.4.

**Release / préprod / prod** : voir **`operations/RELEASE_PREPROD_PRODUCTION_PLAN.md`** pour la séquence branche tests complets → préprod → bêta mobile → production, incluant licences, RGPD, retours utilisateurs, déploiements et décision mono-repo vs multi-repo.

**Plan Cursor (IDE)** : le fichier `.cursor/plans/chantier_securite_data_docs_2c0a63b7.plan.md` peut encore nommer les lots dans l’**ancien** ordre ; **source de vérité** : ce **`PLAN.md`** (lots **A** = monitoring, **B** = sécurité, **G** = backup / continuité, avril 2026).

**`make up-full` / Compose** : la stack documentée est pensée pour le **développement local** (profils Docker, variables d’exemple, montages `src` pour le hot reload). Un déploiement **production** (VPS, secrets, non-root, sauvegardes **lot G**) reste à cadrer séparément — ne pas assimiler « `up-full` vert » à une prod prête sans durcissement.

**Dernière révision du plan** : 13 mai 2026 — **validation BDD complète, CI/CD et scripts metrics** : `make db-push-all` relancé sur la stack Docker, `make test-database` réaligné sur la suite complète réelle (`test-database.js` + config Postgres + synchronisation `prisma db push` + `init-key-tables.sql` sur base temporaire), et validation de `log_collector_logs` + colonnes critiques (`Application.isTestData`, `Application.isArchived`, `Application.thankYouEmailSentAt`, `Company.isTestData`). Le parcours API archive/corbeille candidature repasse **21/21** et les logs Postgres post-push ne montrent plus d’erreurs `isTestData` / `log_collector_logs` / `does not exist`. Les workflows GitHub sont migrés hors actions Node 20 dépréciées (`checkout@v6.0.2`, `setup-node@v6.4.0`, `upload-artifact@v7.0.1`) avec `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`, et la validation DB CI utilise `prisma db push` + `DATABASE_URL` de test. `scripts/testing/verify-all-metrics.sh` est modernisé sur les ports exposés actuels et validé en réel (**52/52**, sortie `0`). **12/05** : **B15** outillé partiellement, validation sécurité/backoffice verte, B11 alertes email/disponibilité, B14 config/env/HTTPS dev renforcé. **Scan prod** : cible compose fusionnée corrigée ; reste durcissement des ports publiés. Historique conservé : **6–7 mai** B14/A3 corrélation, logs-watch, rechargements axios, budget ressources ; voir `STATUS.md` et `TODOS.md`.

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

**Synthèse (indicatif)** — Technique **~62 %** (forensics **B6–B9** + UX **B10** ; **B14** infra compose **partiel**) · **Validé porteur** : **0/15** — à ajuster quand vous aurez rempli la colonne **Validé** (tableau lot B : **B1–B15**).

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| B1 | Cohérence entre détections, menaces et IPs bloquées | Renforcé (11/05/2026) | Non | `getBlockedIps` + UI (firewall, menaces, analyse, vue d’ensemble) ; `threatId` depuis logs ; fenêtre logs **30 j.** alignée vue d’ensemble / Analyse ; agrégateur **sans NaN** sur `responseTime.average_ms` ; enrichissement **destIp** API menaces ; **11/05** : fallback `network_connections` + corrélation logs via `metadata.sourceIp` / `metadata.threatId` pour les menaces pauvres |
| B2 | Mode de test de blocage IP sûr (IP de test dédiée, jamais l’IP utilisateur réelle) | Renforcé | Non | `lab_simulation` ↔ `LAB_BLOCK_IP` ; **refus** de bloquer l’IP observée comme client (hors lab) ; UI feedback test vue sécurité |
| B3 | Vue sécurité : distinguer explicitement détection / blocage manuel / blocage automatique | Partiel | Non | Légende + cartes sur vue sécurité ; **Analyse** : 3 panneaux (détections, manuels+lab, auto) ; firewall : badges origine |
| B4 | Analyse réseau : éviter le conteneur « unknown » 100 % non actionnable | Partiel | Non | `containerCorrelation` + `correlationHint` API ; bannière et explications UI page réseau |
| B5 | WAF + `make security-live-check` : auth firewall/WAF sur security-service (JWT ou `X-Internal-Secret`) ; scripts alignés ; **rebuild** image si deps (`jsonwebtoken`) ; volume `src` ; `FIREWALL_BASE_URL` / `AUTH_GATEWAY_URL` ; **`user: 0:0` + NET_ADMIN** pour **iptables** en dev | Renforcé (12/05/2026) | Non | `security-service/server.js`, `scripts/security/*.sh`, `docker-compose.yml`, `backend/api-gateway/src/middleware/waf.js`. **12/05** : bypass WAF interne configurable (`WAF_INTERNAL_BYPASS_*`) conservé pour appels inter-services, mais désactivé pour trafic reverse proxy `X-Forwarded-*` sans `X-Internal-Secret`; `make security-waf-lab` valide externe bloqué via HTTPS dev et bypass interne de confiance. **Reste** : valider CIDR remote host/reverse proxy du serveur et logs séparés prod |
| B6 | **Corrélation bout en bout** : `X-Request-Id` / `X-Correlation-Id` (gateway → services) ; horodatage **serveur** (UTC, NTP en prod) ; propagation dans **logs applicatifs** et événements **security-service** pour reconstituer une session / une requête après incident | Partiel (22/04/2026) | Non | **Fait** : **`requestCorrelation.js`** (06/05 : ALS + contexte dans logs WARN/ERROR, **`centralLogger`**, **`TRUST_PROXY_HOPS`**) ; proxy + métriques/logs + `reportPayloadTooLarge` ; **intrusionDetector** réactivé (correctif **`BRUTE_FORCE`**, pas de **`next()`** après 403, garde-fous Jest/Playwright/`INTRUSION_DETECTION_ENABLED`) ; **CORS** ; **`frontend/src/lib/api.ts`** ; Jest gateway (**22/22** `backend/api-gateway`). **Reste** (détail **manuel** : **`docs/operations/PREPROD_PRODUCTION_CHECKLIST.md`**) : morgan / middleware sur **chaque** microservice encore sans contrat ; **security-service** recherche par id ; **mobile** ; **NTP** hôtes |
| B7 | **Journal d’audit applicatif** (actions sensibles backoffice + API admin) : connexions admin, exports, déblocages IP, **test-data** destructif, changements rôles ; **append-only** en base (pas d’UPDATE sur le contenu) ou table dédiée + **accès lecture** réservé rôle élevé ; **jamais** de secrets en clair dans les entrées | À faire | Non | Schéma Prisma / migrations ; routes gateway ; UI **Sécurité** ou **Admin** : filtre par acteur, période, type d’événement |
| B8 | **Vue backoffice « investigation / post-incident »** : croisement **menaces WAF**, **audit B7**, **logs techniques** (A2), **IPs** ; export **horodaté** (CSV/JSON) avec **hash** ou empreinte pour **chaîne de conservation** légale / interne ; pas de promesse « preuve judiciaire » sans dispositif certifié — viser **traçabilité opérationnelle** forte | Partiel (12/05/2026) | Non | `frontend/.../backoffice/security/**` ; APIs agrégation ; doc procédure dans **`docs/security/`** (à créer) : qui consulte, où stocker l’export. **Fait partiel** : fiche menace enrichie attacker/target/application/network, logs 24h, DDoS/intrusions liés, fallback `network_connections`, connexions détaillées depuis `investigation.network.connectionDetails`; tests forensics ciblés **6/6**; **reste** : IP intelligence ASN/VPN/proxy/Tor, payload samples, comptes impactés fiables, export signé |
| B9 | **Mobile** : signalement **erreurs** + signaux **sécurité** (refresh révoqué, OTP échoué N fois, changement mot de passe, sortie session forcée) vers API **authentifiée** et **limité en taux** ; côté serveur, corrélation **compte + device + IP** ; **limitation honnête** : un téléphone **rooté / compromis** peut mentir — combiner avec signaux serveur et **B7** | À faire | Non | Apps **`mobile/`** et **`flutter-mobile-app/`** ; endpoint dédié (gateway) ; **lot D1** proche |
| B10 | **UX backoffice — outils sécurité** : reprendre **`/backoffice/security`** et sous-pages (**firewall**, **analyse**, **réseau**, etc.) pour un ensemble **réellement utilisable** : lisibilité (hiérarchie visuelle, tableaux), **métriques cohérentes** avec les contrats API (libellés, unités, fenêtres temporelles), **empty states** honnêtes, **mesurabilité** (ce qui est compté / exclu), préparation des emplacements pour la vue **investigation (B8)** ; **vue d’ensemble** : éviter qu’un même **`network_threat_detected`** apparaisse à la fois comme **menace** et comme **log CRITICAL** (filtrage incidents **22/04**) ; **score** : aujourd’hui pondération locale **`securityScoreWeights`** (`localStorage`, **`page.tsx`**) — à documenter / option serveur | Renforcé (12/05/2026) | Non | `frontend/src/app/(admin)/backoffice/security/**` ; **`centralMetricsService`** / clients API ; tests manuels checklist dans **`TODOS.md`** ; **`ERRORS.md`** § boot **`up-full`** / intrusion. **12/05** : fetchs tolérants aux données partielles, auto-refresh non concurrent, page réseau avec IPs surveillées actionnables, Playwright sécurité **16/16** ; **reste** : seuils expliqués plus finement, WAF on/off testable proprement, parcours manuel porteur |
| B11 | **Alertes email sécurité et disponibilité** : envoyer un email pour les événements réellement critiques (SecurityAlert `critical/high`, CVE critique/haute, DDoS, intrusion sévère, firewall majeur, service/conteneur critique `down`) sans spammer ; la configuration admin doit demander réauth + audit. | Partiel (12/05/2026) | Non | **Fait** : `security-service` → `notification-service` via route interne `X-Internal-Secret`; variables `SECURITY_ALERT_EMAIL(S)`, `SECURITY_ALERT_EMAIL_LEVELS`, `SECURITY_ALERT_EMAIL_ENABLED`; logs `EmailLog`; transitions `SERVICE_DOWN` depuis metrics-aggregator avec `SECURITY_SERVICE_DOWN_ALERT_*`, `SECURITY_CRITICAL_SERVICES` et dédup anti-flap ; tests ciblés security/notification + disponibilité. **Reste** : UI admin réauth/audit, digest `high`, validation MailHog/SMTP réel |
| B12 | **Analyse sécurité continue faible coût** : garder la boucle CVE/menaces/logs proche temps réel sans polling lourd ni explosion mémoire/CPU ; verrous, fenêtres temporelles, limites de requêtes et budgets ressources. | Partiel | Non | Scanner CVE planifié côté `security-service`; **reste** : dédup fine `cveId + package + surface`, budgets, digest, observabilité des scans |
| B13 | **Préparation post-quantique (PQC) — crypto-agilité** : inventaire des usages cryptographiques (TLS, JWT, signatures, secrets, sauvegardes, flux inter-services, mobile), classification des données par horizon de confidentialité (court/moyen/long terme), plan de migration progressive (algorithmes hybrides quand disponibles, rotation clés/certificats, compatibilité clients), et stratégie de tests non-régression/perf. Objectif : être prêt avant bascule réglementaire sans blocage produit. | À faire | Non | `security/STATS.md` (inventaire), `TODOS.md` (checklist exécution), `docs/BACKLOG.md` (chantiers), `mobile/PROCESSUS_APPLICATION_MOBILE_ET_API.md` (procédures ops), runbooks sécurité/ops |
| B14 | **Durcissement Docker Compose & runtime** : supprimer les **secrets par défaut** du chemin **prod** (`${VAR:?…}` ou compose prod dédié) ; **ne pas** casser **`make up-full`** sans guide de migration ; **docker.sock** → proxy limité ou API ; **Redis** `requirepass`/ACL + harmonisation **`REDIS_URL`** ; **non-root** pour collecteurs sauf exception documentée ; **WAF** gateway **`${WAF_ENABLED:-true}`** ; **`.env.example`** **`WAF_ENABLED=true`** (prod-like ; **`false`** en local seulement pour diagnostic) ; pas de **`*.backup.*`** versionné ; bootstrap **ADMIN_*** moins exposant ; **`read_only`** + **`tmpfs`** ; limites CPU/RAM ; healthchecks sans user/DB hardcodés ; politique restart ; audit pré-VPS **`docs/operations/PRE_VPS_ENV_AUDIT_AND_UPDATES.md`** — détail **BX1–BX14** dans **`docs/security/COMPOSE_RUNTIME_HARDENING.md`** | Partiel (12/05/2026) | Non | `docker-compose.yml`, `docker-compose.https.yml`, `.env.example`, `.env.production.example`, `scripts/env/*`, `scripts/ops/dev-https-certs.sh`, `docs/operations/DEV_HTTPS.md`, `docs/scripts/SCRIPTS_INVENTORY.md`, `TODOS.md` § B14. **12/05** : `make env-validate` OK dev sans avertissement après régénération locale, `make env-generate-secrets`, `make waf-enable` / `waf-disable`, `make scripts-inventory`, `make env-validate-prod-example`, validation prod dédiée `ENV_FILE=.env.production make env-validate-prod`, `ENABLE_METRICS_AUTH=true` en dev via route Next serveur, `metrics-aggregator` protège `metrics` + `docker` + `persistence`, clé métriques injectée côté `frontend` et `api-gateway`, CORS gateway basé sur `ALLOWED_ORIGINS`, credentials mobile hors `NEXT_PUBLIC_*`, HTTPS dev via `make dev-https-install-ca` / `make dev-https-up`; validation réelle : WAF externe `403`, bypass interne secret `200`, metrics sans clé `401`, proxy serveur `200`, smoke navigateur backoffice HTTPS OK; reste Redis auth, docker.sock proxy, durcissement ports prod/non-root/read-only/tmpfs |
| B15 | **Tests sécurité offensifs contrôlés + rapports** : couvrir énumération URL/endpoints, fuzzing paramètres, SQL/NoSQL injection, XSS, command injection, auth/JWT/IDOR, CORS, rate abuse, scans massifs, secrets, images Docker, ports exposés, TLS, spoofing IP/headers, protections DB et préparation mobile/reverse engineering. Les tests doivent exister en **commandes projet** et, pour les contrôles non destructifs, dans le **backoffice sécurité** avec historique et rapports. **Contrainte perf** : détection runtime légère uniquement sur l’entrée gateway/public ; ne pas inspecter tout le trafic inter-conteneurs. | À faire | Non | **Source** : `docs/security/SECURITY_TESTING_MATRIX.md`. P0 demandé : `gitleaks` historique Git complet, `trivy` images Docker prod, `nmap` exposition `docker-compose.prod.yml`, `jwt_tool`, OWASP ZAP active scan API locale. Autres outils : `sqlmap`, `commix`, `dalfox`, `nikto`, `hydra`, Burp, `ffuf`, `gobuster`, `wfuzz`, `arjun`, `truffleHog`, `sslscan`, `testssl.sh`, `slowloris` en lab uniquement. |

**Note (réalisme — exigence « ultra sécurisé »)** : aucune pile logicielle n’est **mathématiquement incontournable** si l’attaquant contrôle l’hyperviseur, un compte **super-admin**, le binaire mobile modifié, ou la chaîne de build. L’objectif est une **défense en profondeur** : événements **difficiles à effacer silencieusement** (copies **WORM** / **SIEM** externe, **signatures** périodiques des blocs de logs, **mTLS** service-à-service), **détection** précoce, et **runbook** après intrusion (voir **lot G6**). Les tâches **B6–B9** formalisent cette traçabilité **API + backoffice + mobile**.

**Note (priorisation)** : **B3** et **B4** restent **Partiels** ; poursuivre **B6** (services + persistance id) puis **B7–B8** ; **B10** (lisibilité / cohérence UI sécurité) peut avancer **en parallèle** dès que les réponses API sont stables, pour éviter de refaire l’UI deux fois.

**Évolutions cadrées (voir `TODOS.md` B11–B15)** — **B11** : configuration d’**envois email** de **rapport / alerte** sur événements **critiques** (vulnérabilités, menaces très graves, incidents **firewall**, **indisponibilité** service ou sous-système) — réutiliser le cadrage **SMTP** / secrets (**`PREPROD_PRODUCTION_CHECKLIST.md`**, **`CRASH_REPORT_EMAIL`**) et étendre aux canaux ops ; **B12** : boucle d’**analyse sécurité** plus **« live »** tout en restant **douce** sur mémoire et CPU (cadence, fenêtres, limites de requêtes) ; **B13** : préparation **post-quantique** (crypto-agilité, inventaire, priorisation “harvest now, decrypt later”, plan de transition) ; **B15** : tests offensifs contrôlés, rapports et intégration backoffice/CLI.

---

## Lot C — Data backoffice et suivi-intérim (priorité produit)

**Synthèse (indicatif)** — Technique **~45 %** (**C3** + début **C1** UX) · **Validé porteur** : **0/3**

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| C1 | Diagnostiquer le vide fonctionnel de `/backoffice/suivi-interim` et corriger le flux agences / candidatures | Partiel (21/04/2026) | Non | Données **TEMP_AGENCY** + **`agencyId`** déjà branchées ; **21/04** : message d’erreur API, **Rafraîchir**, lien **test data** — **reste** : données métier / filtres / validation porteur (`SuiviInterimContent.tsx`, `datas/page.tsx`) |
| C2 | Cohérence base principale vs base test (sans supprimer `admin@jobbingtrack.test`) | Partiel (07/04/2026) | Non | `make datas-remove-tests-tags`, **`make env-check`** / **`make env-append-missing`** ; doc à compléter : `docs/database/MIGRATIONS_ET_BASES.md` |
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
| E1 | Mettre à jour et aligner : `STATUS.md`, `ERRORS.md`, `RESOLUTIONS.md`, `mobile/PROCESSUS_APPLICATION_MOBILE_ET_API.md`, `project/FONCTIONNALITES.md`, `docs/BACKLOG.md` | Partiel (21/04/2026) | Non | Vague **21/04** : STATUS / PLAN / ERRORS / TODOS + **`makefiles/README.md`** (status-watch, status-live) ; **PROCESSUS**, **BACKLOG** revue large **à faire** |
| E2 | Revue `docs/` (architecture, API, endpoints, metrics, décisions, changelog, DB, sécurité, mails, tests) | À faire | Non | Dossier `docs/` |
| E3 | Nettoyer l’obsolète ; marquer explicitement le « non opérationnel » restant + plan d’action | À faire | Non | — |

---

## Lot F — Validation finale et livrables

**Synthèse (indicatif)** — Technique **~22 %** · **Validé porteur** : **0/3**

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|----------------|
| F1 | Tests ciblés API + E2E (monitoring / services, sécurité, backoffice, suivi-intérim, logs) | Renforcé (13/05/2026) | Non | **`make tests`** : stack + **`.env`** avec **`API_GATEWAY_URL`** joignable depuis l’hôte (**`127.0.0.1:5002`** typ.). **13/05** : équivalent direct sans `make` validé via `bash scripts/run-all-tests-with-reports.sh` (`PLAYWRIGHT_FRONTEND_MODE=smoke`, `PERF_LIGHT=1`) : **436/436 réussis**, **1 ignoré**, sortie `0`. Runner corrigé : chargement `.env` sûr, secrets seed masqués, `exit 1` si échec, auth admin/env fiable, firewall/WAF JWT. Application corrigée : routes `/:id/status*` avant `/:id`, statut candidature enrichi, `Application.isTestData` et `log_collector_logs` dans `db-push-all`. **Reste** : tests métriques par surface (A5) et gate long préprod avant prod. |
| F2 | Récapitulatif final : corrigé / reste à faire / risques / priorités opérationnelles | À faire | Non | — |
| F3 | **Couverture `tests/services/`** + **alignement perf charge** : inventaire des microservices **sans** script dédié (smoke HTTP / health) vs ceux déjà couverts ; ajouter progressivement des **`test-*-service.js`** (ou équivalent) enchaînés par **`scripts/run-all-tests-with-reports.sh`** ; objectif **fumée cohérente** après **`make up-full`**, pas exhaustivité Jest de chaque route — tracer l’écart dans **`STATUS.md`**. **12/05** : `tests/performance/test-load-advanced.js` aligné gateway (`normalizeGatewayUrlForHost`, plus de bases `localhost:300x`) et ajouté à l’agrégat en `PERF_LIGHT=1`; `tests/services/smoke-gateway-services.js` couvre les services exposés par gateway. **13/05** : agrégat complet direct vert + smokes directs infra `metrics-aggregator` et `deployment-service`. | Renforcé (13/05/2026) | Non | Services gateway **14/14** ; metrics direct **4/4** ; deployment direct **3/3** ; `test-load-advanced.js` **46/46** ; `test-performance.js` score **100/100** ; suite agrégée **436/436** ; reste surtout gate long préprod / métriques A5 |
| F3 bis | **Restructuration `scripts/`** : finir le tri des scripts racine en dossiers métier, maintenir les commandes Make/CI/docs, puis auditer les scripts `non-reference` avant archivage ou suppression | Partiel (13/05/2026) | Non | Tri racine terminé : 0 script classé `racine`; audit des 21 scripts sans référence automatique terminé (`docs/scripts/NON_REFERENCED_SCRIPTS_AUDIT.md`), inventaire à 0 non-référencé; `test-reset-password.sh` modernisé vers gateway/metrics actuels et validé en réel après correction auth reset-token; `verify-all-metrics.sh` modernisé vers `METRICS_URL`/`API_GATEWAY_URL`, auth metrics optionnelle et contrats JSON actuels, validation réelle **52/52**; reste archivage/suppression progressive des legacy après validation |
| F4 | **Fluidité backoffice admin** : toutes les pages `/backoffice/**` doivent rester rapides au clic et au premier rendu perçu ; préchargement routes, `loading.tsx`, skeletons, lazy-loading des charts/rapports/tests, réduction polling/animations coûteuses, vérification responsive/navigation | Partiel (11/05/2026) | Non | `frontend/src/components/features/AdminLayout.tsx`, `frontend/src/app/(admin)/backoffice/loading.tsx`, pages backoffice lourdes à profiler |

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

## Lot H — Release, préprod, conformité et distribution multi-plateformes

**Synthèse (indicatif)** — Technique **~5 %** · **Validé porteur** : **0/8** — cadrage initial documenté, implémentation à faire avant passage `dev` → prod.

| # | Tâche | État | Validé (porteur) | Fichiers / notes |
|---|--------|------|------------------|------------------|
| H1 | **Branche tests complets** : définir une branche dédiée depuis `dev` pour campagne backend, frontend, API, mobile, services, BDD, sécurité, performances, Playwright, qualité, erreurs et délivrables avant toute branche prod | À faire | Non | `operations/RELEASE_PREPROD_PRODUCTION_PLAN.md`, `TODOS.md`, CI |
| H2 | **Préprod serveur** : mettre en place un environnement préprod séparé (domaines, secrets, base, stockage, monitoring, alertes) pour tester avant prod réelle | À faire | Non | `deployment/VPS_PORTAINER_NPM_OVH.md`, `operations/PREPROD_PRODUCTION_CHECKLIST.md` |
| H3 | **Bêta mobile** : préparer builds Android/iOS pointant vers préprod, canaux beta, versioning, signature, retours testeurs | À faire | Non | `mobile/`, `flutter-mobile-app/`, stores à choisir |
| H4 | **Licences et conformité dépendances** : inventorier packages/outils/API/images, obligations de notice, compatibilité de licence projet par sous-partie | À faire | Non | Futur rapport licences ; `security/STATS.md` pour surfaces |
| H5 | **RGPD / confidentialité / retours utilisateurs** : cadrer collecte, consentement, minimisation, export/suppression, rétention, rapports erreurs/crash/feedback exploitables | À faire | Non | `mobile/analytics/PRIVACY.md`, futur runbook conformité |
| H6 | **Déploiements et mises à jour automatisés** : définir branches, gates, build images, registry, migrations, rollback, publication web/mobile, release notes | À faire | Non | `.github/workflows/*`, `docs/deployment/*` |
| H7 | **Structure GitHub** : décider mono-repo vs multi-repo backend/frontend/mobile/infra selon cadence release, droits, CI, contrats API et rollback | À décider | Non | Cadrage dans `operations/RELEASE_PREPROD_PRODUCTION_PLAN.md` |
| H8 | **Gate final prod** : tests complets + préprod validée + scans sécurité + licences + RGPD + sauvegarde/restauration + monitoring/alerting + rollback | À faire | Non | Doit être validé avant merge vers branche prod |

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
8. **H** (release / préprod / conformité) : préparer en parallèle par documentation et CI, mais exécuter réellement avant toute bascule `dev` → prod.

Pour le détail des cases à cocher au jour le jour, voir **`TODOS.md`** (aligné sur ce plan et sur **`ERRORS.md`** / **`project/FONCTIONNALITES.md`**).

---

## Priorisation critique ajoutee (6 mai 2026)

Ces actions passent avant les optimisations secondaires:

1. Corrélation incidents: fiabiliser la remontée `requestId`/`endpoint`/`IP`/`HTTP`/`proto`/`port` et clarifier les "source absente".
2. Réduction charge monitoring: baisser fortement l'empreinte CPU/RAM/IO de `metrics-aggregator`, `monitoring-c`, `log-collector-c`, `redis`, et du rendu front monitoring.
3. Validation perf dédiée: tester uniquement la chaîne de récupération des métriques (impact réel CPU/RAM/IO) avec comparaison avant/après.

### Sous-chantiers critiques dérivés de l'audit technique

- `monitoring-c`: sortir de la stratégie fork/exec répétée (`docker stats` / `docker inspect` / `curl`) vers appels Docker socket/cgroups + checks parallélisés. **Traité 07/05** : inventaire conteneurs via Docker socket Unix sans shell, métriques CPU/mémoire/réseau via cgroups/proc, health checks libcurl multi parallèle ; plus aucun `popen` dans `monitoring-c`.
- health checks: basculer en mode asynchrone (batch/multi) pour éviter les latences séquentielles coûteuses.
- `log-collector-c`: rotation + découverte périodique + traitement non bloquant — **traité 07/05** (`inotify_init1(IN_NONBLOCK)`, `poll`, rescan 10s, événements fichier `len=0`, watches retirés sur rotation/suppression ; reste QA conteneur réel).
- persistance PostgreSQL collecteurs C: réduire coût des insertions répétées (préparation/reconnexion robuste).
- retention métriques: maintenir la purge active et vérifiée (pas de croissance non bornée).

---

## Analyse CVE & dépendances (suivi transversal)

- **Document dédié** : **`security/STATS.md`** — inventaire **par service Node**, **frontend**, **mobile**, **images Docker** et **binaires C** ; commandes types (`npm audit`, **Docker Scout**, `flutter pub outdated`) ; tableau **à compléter** après chaque passe d’audit (dates + severités).
- **Rapport « complet »** : il est **produit par les outils** (local ou CI), pas figé dans le dépôt ; **`security/STATS.md`** sert de **source de vérité humaine** pour savoir quoi scanner et où enregistrer les résultats.
- **Lots concernés** : **B** (sécurité / surface d’attaque), **E** (doc), **F** (gate avant release si politique CVE stricte), **G** (images prod / registre).

### Enchaînement **A2** (logs — après CVE / en parallèle)

1. Gateway **`admin/logs/*`** : aligner **`since` / `until`** (même whitelist que **metrics-aggregator** `docker.routes.js`).
2. Smoke tests ou E2E légers sur **`/backoffice/services/logs`** et vues **`(development)/services/**`** si la CI couvre le front.
3. (Optionnel) **Loki** ou agrégateur texte si besoin dépasse **`docker logs`**.

---

## Infra locale & post-pull (fin de fichier — rappels)

- **Après `git pull`** : enchaînement usuel **`make db-push-all`** puis **`make up-full`** (ou **`make up-dev`**) pour synchroniser Postgres + relancer la stack ; détail correctifs récents (**`Company.isTestData`**, fallback **`/api/v1/services`**) dans **`STATUS.md`** / **`ERRORS.md`** (mai 2026).
- **Redis / hôte** : si les logs affichent *Memory overcommit must be enabled*, appliquer **`vm.overcommit_memory=1`** sur la **machine hôte** (sysctl) — tâche **`TODOS.md`** **HX5** ; ce n’est pas corrigé par un changement de `docker-compose` seul.
- **UI `/backoffice`** : blocs d’aide verbeux sous les cartes métriques / Performance retirés (**mai 2026**) pour alléger la vue d’ensemble ; l’aide détaillée reste dans **`ERRORS.md`**, **`STATUS.md`**, **`project/FONCTIONNALITES.md`** selon besoin.
