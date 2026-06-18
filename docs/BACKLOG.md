# Backlog technique – JobbingTrack

Ensemble des tâches techniques organisées par priorité. `docs/STATUS.md` contient l'état courant ; ce fichier contient le backlog complet.

**Chantier structuré** (lot **A** : monitoring + logs ; lot **B** : sécurité ; intérim ; doc ; **lot H** : release/préprod/conformité) : pour ne pas dupliquer la granularité, suivre **`docs/PLAN.md`** (lots A–H) et **`docs/TODOS.md`**. Le présent fichier reste la réserve pour les sujets « plus tard », la dette large et les idées non planifiées sur le calendrier court.

**Méta (11/05/2026)** : la racine ne garde que `README.md`; les fichiers de pilotage sont sous `docs/`. Revue **BDD** avant campagne de tests, interprétation des **logs gateway sécurité** et suite sécurité — voir **`docs/TODOS.md`** et **`docs/STATUS.md`**.

**Statistics & monitoring global (18/05/2026)** : KPI services et graphes erreur/disponibilité sur **`/backoffice/statistics`** + vue d’ensemble **`/backoffice`** — chantier planifié **`PLAN.md` A1h** et cases détaillées **`TODOS.md`** § **Chantier Statistiques & backoffice** (ne pas dupliquer ici).

**Statistics log-stats / persistance (20/05/2026)** : `aggregated_logs`, `log_collector_logs`, `container_logs`, métriques système/conteneurs, disponibilité, sécurité, `system_events` et `service_network_history` sont alimentés/visibles dans `/backoffice/statistics/log-stats`. Suite backlog : tests API/UI sur `/api/v1/persistence/stats`, smoke navigateur après login et contrôle granularité erreurs.

**Statistics App data (20/05/2026)** : page reprise avec **totaux**, nouveaux sur période, distributions métier, appels/relances/événements et états vides par source. Suite : persister un vrai historique métier au lieu d’un snapshot courant enrichi, et compléter les segments contacts/entreprises si les services exposent plus de détails.

**Analytics application & utilisateurs (20/05/2026)** : à reprendre après Statistics. Clarifier deux axes : analytics **application/mobile** (activité, traces, retours, signalements, parcours) et analytics **utilisateurs admin** (comptes, activité, cohortes, rôles, rétention). Ne pas confondre avec performances live infra.

**Agent email / tâches recherche emploi (09/06/2026, précisé 15/06)** : cadrage porteur ajouté dans `docs/features/EMAIL_TRIAGE_AGENT.md`. Objectif : assistant JobbingTrack capable de lire/triager Gmail **et des boîtes IMAP** configurées hors Git, relier les emails aux candidatures/entreprises, détecter candidatures, refus, propositions d’entretien, relances faites/à faire, événements et signaux utiles, puis créer tâches/relances/événements, préparer les entretiens, envoyer un digest quotidien à 18h et un récap hebdomadaire via le socle SMTP JobbingTrack, sans envoi automatique. À traiter comme chantier produit dédié **en fin de séquence**, après finalisation des logs/observabilité et P0/P1 bloquants, avec OAuth/scopes minimaux, IMAP lecture seule, audit, tokens chiffrés, Google Tasks/Calendar obligatoires, worker planifié, stockage interne des emails utiles, moteur déterministe d’abord et IA locale en renfort. Périmètre élargi noté : espace utilisateur connecté sur `/`, backoffice admin sur `/b4ck0ff1ce`, base de composants partagée, option future `user-frontend` / `backoffice-frontend`, interface web/mobile responsive, revalidation PIN, autocomplete accessible, boîte de réception agent, historique de communication par candidature/entreprise/contact (emails, relances, réponses, appels planifiés/passés si tracés), préparation/envoi relance-email contrôlé, calendrier agrégé, programmation manuelle d’appels/tâches/rappels/événements même sans email déclencheur, fiches candidature/entreprise enrichies, suivi intérim, imports Google Contacts CSV/vCard, PDF d’offre depuis URL, enrichissement entreprise et veille salons/job dating par ville/région. Make.com/Zapier ne sont pas le socle.

**Agent email — recherche v2 et Calendar (09/06/2026)** : prévoir après le MVP une barre de recherche réutilisable dans l’espace utilisateur puis dans le backoffice/admin, couvrant emails, candidatures, entreprises, contacts, tâches et événements selon permissions. Côté Google Calendar, ne jamais convertir une date sans heure en événement à `00:00`, ni créer automatiquement avant `05:00` ou après `23:00` : créer une tâche “horaire à confirmer/vérifier”, proposer un événement journée entière ou demander validation utilisateur.

**Agent email — compte personnel autorisé (10/06/2026)** : l’agent recherche d’emploi doit pouvoir être utilisé par le compte personnel non-admin du porteur, mais seulement après activation explicite. Prévoir un droit/feature flag utilisateur, une révocation admin auditée, et une séparation stricte entre rôle admin et accès au contenu email personnel.

**Agent email — tests et limites horaires Calendar (10/06/2026)** : ne jamais créer automatiquement un événement Google Calendar avant `05:00`, après `23:00` ou à `00:00` par défaut. Les tests devront couvrir ces bornes, les dates seules, les fuseaux horaires, les permissions d’accès, Gmail/IMAP lecture seule, digest SMTP/mock et génération de rapports dédiés.

**Backoffice Développement → Tests — navigation (09/06/2026)** : demande porteur de réorganiser le sous-menu Tests, trop long et peu lisible. Cible : clic direct sur Tests = vue d’ensemble, sous-menu Rapports regroupant Rapports de tests + Rapports de parcours, regroupement plus clair des tests Playwright/API/Backend/Frontend/Backoffice/Sécurité/Performance, programmation et parcours. Suivi en validation P1C après P0 CVE.

**Sécurité réseau avancée (09/06/2026)** : compléter la stratégie sécurité avec HTTP forgé/smuggling léger, DNS poisoning, UPnP abuse, session hijacking, IP spoofing, ICMP redirect, BGP hijack, ARP spoofing, MAC flooding, VLAN hopping, port scan/SYN scan/SYN flood contrôlé. Le détail opérationnel est dans `docs/security/SECURITY_TESTING_MATRIX.md`; le traitement doit rester lab/préprod autorisé, borné et non destructif.

**Sécurité lab — tests externes automatisés (13/06/2026)** : orchestrer des campagnes depuis l’extérieur du système (réseau public) via proxies et VPN gratuits d’accès public, de façon automatisée et reproductible, pour valider WAF, firewall, détection menaces et logs corrélés (ex. trafic suspect depuis plages RFC 5737 / TEST-NET). Uniquement lab/préprod autorisée, bornée, journalisée ; jamais en prod ni contre des tiers non autorisés. Compléter les seeds lab avec de vrais `network_threats` + `metadata.threatId` CUID pour les logs `critical`/`warning`/`error` (les logs `info` lab peuvent rester sans menace avec raison explicite).

**Agent API Google Apps Script — métier JobbingTrack (13/06/2026)** : l’auth Agent API (`X-Agent-Token`, token public, régénération, routes protégées, affichage Paramètres) existe déjà sur l’autre app — **ne pas refaire**. Lot futur JobbingTrack : Google Tasks, offres/jobs, événements régionaux, actions depuis les mails, calendrier, confirmations/refus, mise à jour JobbingTrack. Pas prioritaire tant que B10/B8 sécurité backoffice n’est pas stabilisé.

**Contrôles période sticky (20/05/2026)** : sur Performances/Statistics/Analytics, les barres de période doivent rester visibles en haut lors du scroll profond dans les graphes (dropdown, plage actuelle, précédent/suivant/actuelle), avec comportement cohérent clair/sombre.

**Performances — transitions de période (21/05/2026)** : le comportement sans flash vide est traité dans le chantier court : les graphes restent visibles pendant le fetch d’une nouvelle plage. Reste backlog séparé : barre période sticky au scroll profond, comparaison de périodes, brush/zoom partagé et export des séries.

**Performances — CPU & Mémoire dédié (13/06/2026)** : demande porteur de sortir les métriques CPU/mémoire d’un affichage dispersé. Créer une entrée **CPU & Mémoire** sous Synthèse et avant Temps de réponse dans la navigation Performances, avec page globale CPU + mémoire, sous-vues CPU détaillé / Mémoire détaillée, activation par service, période partagée, couleurs stables, tooltips lisibles et distinction claire entre mémoire hôte, budget JobbingTrack et limites Docker.

**Performances — I/O disque : `/proc/diskstats` (système) vs I/O par conteneur type iotop, sans root (17/06/2026, non urgent)** : idée porteur pour affiner le monitoring disque sans élargir la surface d’attaque. **Constat actuel** : `monitoring-agent-rs` lit déjà les cumuls Block I/O **par conteneur** via cgroup v2 `io.stat` (équivalent `docker stats BlockIO`), sans `/proc/<pid>/io` ni droits root — fallback `/proc` documenté comme souvent refusé (`monitoring/rust/crates/monitoring-agent/src/metrics/io.rs`). Les pages Performances **Disque** / **Conteneurs** consomment ces cumuls + débit observé (différence / temps). **Piste backlog** : compléter avec **`/proc/diskstats`** pour un **% I/O machine global** (lecture/écriture secteurs, deltas entre polls — même logique que les compteurs cumulés réseau) ; garder la granularité **par processus/conteneur** via **cgroup uniquement** (pas de clone iotop root). **Sécurité** : ne pas monter `/proc` hôte en écriture ni exiger `CAP_SYS_ADMIN` / root dans l’agent ; privilégier lecture cgroup + diskstats en lecture seule si le conteneur agent y a accès. **Décision** : **pas urgent** tant que le socle actuel (cgroup + graphes Block I/O) couvre le besoin opérationnel ; rouvrir si saturation disque réelle non expliquée par les graphes existants ou si validation porteur Disque/Conteneurs reste KO. Référence : `docs/TODOS.md` § Performances Disque, `blockIoEnrichment.js`.

**Moteur graphique dédié (après CPU & Mémoire + A5/A1h)** : ne pas le faire trop tôt. Ordre prévu : 1) clôturer/reclasser les validations P1B/P1C ouvertes ; 2) stabiliser la page **CPU & Mémoire** avec les vrais cas d’usage ; 3) finir l’alignement A5/A1h (sources live vs historique BDD, périodes partagées, axes, gaps, empty states, couleurs) ; 4) extraire alors un vrai moteur graphique partagé (`ChartShell`, `SeriesToggle`, `TimeRange`, `Legend`, `Tooltip`, `empty/error/loading states`, export/brush/zoom plus tard). Objectif : remplacer l’empilement Recharts page par page sans figer une mauvaise abstraction.

**Système de versionnement — à reprendre (15/06/2026)** : le dépôt est en mode « ultra plein » depuis longtemps sans discipline release claire. Constats : versions hétérogènes (`frontend` / services Node en `1.0.1`, racine `1.0.0`, pas de `CHANGELOG.md` unique, pas de tag Git aligné sur un lot validé porteur, branches longues type `chore/ci-pr-preprod-portainer` qui accumulent P1B/P1D sans version produit explicite). **Cible à cadrer** (lot H / `docs/operations/RELEASE_PREPROD_PRODUCTION_PLAN.md`) : semver unique produit (`MAJOR.MINOR.PATCH`), changelog par lot validé, tag Git + image Docker + affichage backoffice/login cohérents, politique « quelle version est en local / préprod / prod », et gel des numéros tant que `TODOS_A_VALIDER.md` n’a pas le OK porteur du lot concerné. Ne pas bloquer les correctifs infra (Postgres, fuites Prisma) mais ne pas annoncer de « release » tant que ce socle n’est pas défini.

**Postgres — saturation connexions `too many clients` (15/06/2026)** : symptôme observé sur `/statistics/log-stats` et proxies `persistence/*` (`FATAL: sorry, too many clients already`). Diagnostic agent : `max_connections=100`, baseline ~80–86 connexions `idle` au repos (dashboard-service ~15, security-service ~13, call/followup ~9 chacun) ; chaque microservice Node embarque son propre `PrismaClient` sans `connection_limit` dans `DATABASE_URL`. Correctifs en cours : route `/persistence/stats` déléguée au singleton `persistence.service` (plus de `new PrismaClient()` par requête) ; `docker-compose.yml` local passe `max_connections` à **200** via `POSTGRES_MAX_CONNECTIONS`. **Reste** : `connection_limit=2` ou `3` par service dans Compose, audit des `new PrismaClient()` ad hoc (ex. `securityController.getBlockedIPs`, `api-gateway/testdata.controller`), PgBouncer ou pooler si prod multi-réplicas. **Recreate postgres** requis pour appliquer `max_connections` ; surveiller `pg_stat_activity` après recreate.

**Mini-modèles locaux — Lot M proche (13/06/2026)** : le porteur confirme qu’il veut démarrer bientôt “à fond” le lot mini-modèles locaux. Garder l’ordre : règles déterministes testées d’abord, explications et seuils conservateurs, puis petits modèles locaux si les métriques prouvent un gain. Usages prioritaires : logs sécurité/agrégés, bruit vs incident, regroupement d’erreurs, suggestions de corrélation, extraction email/offre/CV et pré-tri agent email. Aucun cloud, aucun secret, aucun artefact avec données personnelles brutes.

**UX backoffice / mode clair (21/05/2026)** : validation porteur provisoire acceptée après renforcement global des surfaces/cartes/champs/couleurs. Ne plus bloquer le lot apparence global ici ; rouvrir uniquement des tickets ciblés page par page si un écran précis reste illisible.

**CI Prettier frontend (21/05/2026)** : `frontend/.prettierignore` exclut les artefacts générés et `npm run format:check` est vert localement. Le suivi restant est opérationnel : commit/push puis observation du workflow GitHub #556 dans `TODOS_A_VALIDER.md`.

**Sécurité — libellés & navigation (18/05/2026)** : pages **`/b4ck0ff1ce/security/**`** (policies, logs, etc.) — reprendre noms/titres/sous-nav (**`SecuritySubNav`**, FR, fallbacks) — **`PLAN.md` B10** + priorité rapide **`TODOS.md`**.

**WAF faux positif `consolidated=true` (18/05/2026)** : logs gateway **XSS** sur `blocked-ips?consolidated=true` — analyse **`TODOS.md`** § WAF ; correctif après validation porteur.

**Vision DHT / réseau décentralisé (fin de projet)** : idée annuaire éclaté + relais chiffrés — **`TODOS.md`** bas de fichier ; **pas** dans le scope actuel.

---

## Terminé récemment

- [x] **Forensics `api-gateway` (06/2026)** : corrélation **ALS**, logs structurés + **centralLogger**, **`TRUST_PROXY_HOPS`**, Jest **22/22** — **`STATUS.md`**, **`TODOS.md`**, **`PLAN.md`** A3/B6.
- [x] **Backoffice + BDD (05/2026)** : colonne **`Company.isTestData`** alignée schéma maître auth + fix SQL `db-push-all` ; gateway **`/api/v1/services`** tolère metrics-aggregator indisponible (réponse fallback, pas 503) — voir **`STATUS.md`**, **`ERRORS.md`**, **`TODOS.md`**.
- [x] **Fix runtime Next bloqué** : `next.config.js` passe sur un `distDir` utilisateur (`.next-local`) pour contourner les permissions root sur `frontend/.next` et les bundles `layout.js` invalides (29/04).
- [x] **Fix `getApplication` 500** : relation `activities` (inexistante) → `statusHistory`. (26/02)
- [x] **Fix routes `isUUID` → `isString`** : IDs Prisma sont des CUIDs, pas UUIDs. (26/02)
- [x] **Fix `api-e2e.spec.ts`** : credentials desynchronises → `_testCreds` direct. (26/02)
- [x] **Fix 5 fichiers E2E** : imports, networkidle → domcontentloaded, resilience. (26/02)
- [x] **4 nouvelles suites de test** : email-workflows, admin-data-crud, admin-users-crud, admin-security-complete. (26/02)
- [x] **Email de test réel** : `test-recipient@example.invalid` (via env var `TEST_REAL_EMAIL`).
- [x] **Tests backoffice E2E autonomes** : `loginAsAdmin()` dans 6 fichiers.
- [x] **Rapports avec type d'utilisateur** : badge ADMIN/USER/SYSTEM.
- [x] **Tests Playwright E2E** : pré-authentification `storageState`.
- [x] **Tests MailHog** : SMTP_HOST/PORT configurés, 3/3 passent.
- [x] **Corbeille (soft delete)** : 7 services, cascade logique.
- [x] **Cascade archivage + statuts** : auto-events, archiveRelatedElements.
- [x] **Architecture tests USER/ADMIN** : séparation complète.

## ~~Priorité haute – Phase 2 : Archivage complet~~ FAIT

- [x] Ajouter `isArchived` + `archivedAt` aux schémas : Interview, Call, FollowUp, Event, Company.
- [x] Endpoints archive/unarchive pour chaque service.
- [x] Cascade archivage/désarchivage complète.
- [x] Filtrage `isArchived: false` dans les requêtes normales.
- [x] Endpoint unifié archives fonctionnel.
- [ ] Suppression auto corbeille > 30 jours (cron/worker).
- [x] Tests E2E archivage.

## Priorité haute – Phase 3 : Interactions approfondies (en cours)

- [x] CRUD complet teste (tests E2E : admin-data-crud.spec.ts couvre 7 entites + archivage/restauration).
- [x] Système statuts avec cascade automatique (entretien créé → candidature INTERVIEW_PENDING).
- [x] Auto-création événements calendrier (entretien, relance, appel créés → événement auto).
- [ ] Notifications automatiques (sans réponse > 7j, entretien < 24h, relance en retard).
- [ ] Export/import données (CSV, JSON) avec interface backoffice.
- [x] Vérification email utilisateur : tests E2E workflow inscription + reset password via MailHog.
- [ ] Pagination et tri cohérents sur toutes les listes.
- [x] Tests E2E interactions approfondies (archivage, cascade, BDD relations, sécurité backoffice).
- [x] Architecture tests USER/ADMIN et rapports avec badge type utilisateur.
- [x] Email de test réel (`test-recipient@example.invalid`) pour vérification réception.
- [x] Tests sécurité backoffice complets (firewall CRUD, WAF, menaces, IPs bloquées, logs).

## Priorité moyenne – API et fonctionnalités

- [ ] **Stabilisation post-run `make tests` 05/05/2026 (`tests/results/20260505-113157`)** : backend candidatures **corrigé partiellement** (`application-service` create/get/update/delete + archive/trash avec fallback legacy ; création candidature repasse 201 sur scripts ciblés). Dashboard : **socle de fiabilisation appliqué** (`restart: unless-stopped` + précheck santé avant campagne). Sécurité : **itération 1 anti faux-positifs** appliquée sur intrusion detector. Restent : adaptation tests gateway Jest (CORS/logs auth), mise à jour `tab-components.test.tsx` (analytics hub), stabilisation Playwright `login.spec.ts` et `suivi-interim.spec.ts`, calibration sécurité terrain 24-48h.
- [ ] **Backoffice – Email Monitor** : vérifier que tous les emails envoyés (vérification, reset password, etc.) s'affichent correctement dans la page email-monitor ; tester complètement la partie email-monitor (filtres par type, liste, rafraîchissement).
- [ ] **API versioning** : corriger 404 sur `GET /api/v1/analytics/stats/:userId/versions`.
- [ ] **Documentation API** : Swagger/OpenAPI.
- [ ] **Rapports par catégorie** : organiser `tests/results/` en sous-dossiers.
- [ ] **Lancement tests depuis hub** : clic + vérification résultat.
- [ ] **Backoffice – règles d'envoi email par action** : configurer dynamiquement quels emails envoyer pour quelle action (inscription, entretien créé, relance, etc.) — voir `docs/emails/MAIL.md` § Récap.

## Priorité basse – Mobile et émulateur

- [ ] **App mobile Flutter** : auth, dashboard, CRUD, calendrier, notifications, sync offline.
- [ ] **Émulateur mobile – Build APK** : corriger `flutter_local_notifications`.
- [ ] **Logs Android (logcat)** : streamer dans l'UI.
- [ ] **Playwright mobile dans `make tests`** : séparer une cible smoke (rapide, stable) de la campagne longue (actuellement timeout 600s / exit 124 dans l’agrégat).

## Priorité moyenne – CI/CD et déploiement

- [ ] **CI/CD** : pipeline GitHub Actions pour microservices (build + test).
- [ ] **CI/CD** : exécution suite de tests complète dans pipeline.
- [ ] **CI/CD** : déploiement automatisé après tests passés.
- [ ] **Déploiement** : voir `docs/deployment/DEPLOIEMENT_FINAL.md`.
- [ ] **Release / préprod / conformité (lot H)** : cadrer et implémenter branche tests complets, branche/environnement préprod, bêta mobile, gates prod, licences, RGPD, retours utilisateurs/crash reports, déploiements automatisés et décision mono-repo vs multi-repo. Source : `docs/operations/RELEASE_PREPROD_PRODUCTION_PLAN.md`.

## Priorité basse – Infra hôte (Docker / noyau)

- [ ] **Redis — `vm.overcommit_memory`** : sur la machine hôte, activer **`vm.overcommit_memory=1`** (sysctl + persistance) pour supprimer l’avertissement *Memory overcommit must be enabled* et limiter les risques BGSAVE / réplication — **`TODOS.md`** **HX5**, fin **`PLAN.md`**.

## Priorité basse – Sécurité

- [ ] **Forensics menaces réseau — qualité données terrain** : ne pas dépendre uniquement de `network_threats.metadata`. Si une menace de test ou de détection réelle ne contient que peu de métadonnées (`test`, `packetsPerSec`, etc.), corréler avec `network_connections`, `security_logs.metadata.sourceIp`, `metadata.threatId`, `DDoSAttack`, `IntrusionAttempt`, puis afficher clairement ce qui manque. À compléter : provider threat-intel contrôlé pour IP externes (reverse DNS, RDAP/whois, ASN, réputation, VPN/proxy/Tor/datacenter, cache/rate-limit/source/confiance), payload/request samples, comptes impactés fiables, IPs “à surveiller” cliquables et détaillables. Ne pas utiliser de proxys gratuits non fiables et ne pas afficher d’informations personnelles non nécessaires.
- [ ] **Alertes email sécurité + disponibilité** : brancher le système mail sur les vrais problèmes : menace `CRITICAL`, CVE `critical`, blocage firewall automatique majeur, et service/conteneur critique `down` détecté par monitoring Rust / metrics-aggregator. **11/05 partiel** : `SecurityAlert` `critical/high` envoie via `notification-service` route interne + `EmailLog`. Reste : adresse admin configurable, réauthentification, audit trail, anti-flap/dédup, tests MailHog complets, et mode digest pour `high`.
- [ ] **WAF — filtrage externe uniquement** : éviter que le WAF inspecte ou bloque le trafic interne inter-services (réseaux Docker privés, healthchecks, appels service-to-service). Définir une règle d’architecture : WAF sur l’entrée gateway/public, allowlist/bypass explicite pour réseaux internes, logs séparés, tests `WAF_ENABLED=true/false` couvrant externe malveillant vs interne légitime. **11/05 partiel** : `WAF_INTERNAL_BYPASS_ENABLED` / `WAF_INTERNAL_BYPASS_CIDRS`; vérifier les CIDR réels du serveur/VPS et le `remoteAddress` après reverse proxy avant prod.
- [ ] **Tests sécurité offensifs contrôlés (B15)** : couvrir énumération URL/endpoints, injections paramètres, SQL/NoSQL, XSS, command injection, auth/JWT/IDOR, CORS, rate abuse, scans massifs, secrets, images Docker, ports exposés, TLS, spoofing IP/headers, protections DB et mobile/reverse engineering. P0 : `gitleaks` historique Git complet, `trivy` images Docker prod, `nmap` exposition `docker-compose.prod.yml`, `jwt_tool`, OWASP ZAP active scan local. Source : **`docs/security/SECURITY_TESTING_MATRIX.md`** ; cible : commandes projet, rapports et backoffice sécurité non destructif. Contrainte : ne pas analyser tout le trafic inter-conteneurs pour préserver les performances.
- [ ] **B14 — Durcissement Docker Compose & runtime** : secrets sans fallback en prod, proxy **`docker.sock`**, Redis **`requirepass`**, non-root collecteurs, **`read_only`** / limites — **`docs/security/COMPOSE_RUNTIME_HARDENING.md`**, **`PLAN.md`** **B14**, **`TODOS.md`** § **B14**.
- [x] **Tests sécurité E2E** : firewall CRUD, WAF config/toggle, menaces réseau, IPs bloquées, logs sécurité.
- [ ] **WAF** : remplacer la config mock par une vraie en production.
- [x] **Tests sécurité API** : XSS, SQLi, CSRF, payload overflow (tests/security, security-e2e.spec.ts).
- [ ] **Alertes email sur incidents critiques** (sécurité très grave, firewall, **down** service / sous-système) — cadrage **`TODOS.md` B11** + **`PREPROD_PRODUCTION_CHECKLIST.md`** § SMTP.
- [ ] **Analyse sécurité quasi temps réel** à faible coût CPU/RAM — **`TODOS.md` B12** (cadence, limites mémoire, pas de polling lourd).
- [ ] **Forensics logs (investigation)** : imposer un contrat minimal de journalisation sur les services (au moins `requestId`/`correlationId`, `clientIp`, endpoint, méthode, statut HTTP, port/proto quand pertinent) pour que la corrélation backoffice (perf ↔ sécurité ↔ logs) ne dépende pas d’heuristiques.
- [ ] **Forensics logs — déploiement progressif** : lot **05–06/2026** : microservices listés précédemment + **`api-gateway`** + **`workflow-service`** (**ALS** / contexte, Winston, **`centralLogger`**, **`TRUST_PROXY_HOPS`**) ; **reste** : QA porteur `/backoffice/performances/correlation`.
- [ ] **Corrélation fine incidents (A3/B8)** : combler les colonnes encore vides en pratique (`requestId`, endpoint, IP, proto/port, HTTP, CPU/Mémoire/TR proches, écart sec) avec contrat de logs homogène + règles d’alignement plus strictes. Inclure la vérification I/O bloc : distinguer « trou de persistance » (`null`) vs « vraie mesure zéro » (`0/0` Docker hôte).
- [ ] **Préparation post-quantique (PQC) — programme transverse** :
  - gouvernance crypto-agile (inventaire, propriétaires, dépendances externes),
  - stratégie de migration progressive pour chiffrement en transit/au repos/signatures,
  - couverture tests et observabilité pendant transition,
  - suivi conformité/réglementaire selon échéances applicables.

## Priorité basse – Produit / administration

- [ ] **Refonte Gestion des données backoffice** : remettre à jour le hub `/data-management` et les outils admin pour manipuler, archiver, purger et auditer toutes les entités (emails compressés, analytics mobile, logs) avec garde-fous — lot lointain, après validation Lot D mobile.

## Références

- `STATUS.md` : état courant du projet.
- `PLAN.md` : plan d’exécution lots A–F (backoffice, API, doc).
- `TODOS.md` : cases à cocher alignées sur le plan.
- `project/FONCTIONNALITES.md` : fonctionnalités complètes et roadmap.
- `RESOLUTIONS.md` : erreurs résolues avec détail.
- `ERRORS.md` : erreurs connues.
