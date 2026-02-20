# État du projet JobbingTrack

**Dernière mise à jour** : 20 février 2026

---

## ✅ Tests API – 36/36 passent (20/02/2026)

Les **Tests API** lancés depuis le backoffice (Tests → Tests API → Lancer) exécutent **36 tests** et **tous passent** :
- Health (gateway, /api/health, metrics), services backend (401 sans token), auth (login, profile), users, companies, **applications** (list + create), contacts, **interviews** (list + create), **calls** (list + create), events, **followups** (list + create), profile, notifications, metrics, dashboard.
- **Create Interview**, **Create Call** et **Create Followup** utilisent l’**ID de la candidature créée** dans le même run (extraction via Node dans le conteneur frontend, puis fichier `/tmp/created_application_id.txt`, puis première candidature de la liste).

**Processus recommandé** (après changement schéma BDD ou premier démarrage) :
1. `make db-push-all` — Prisma push (9 services) + init-system-metrics + init-key-tables + seed statuts + fix Application.isArchived.
2. `make db-fix-is-archived` (ou `make db-fix-isarchived`) — Au besoin, réappliquer la colonne générée isArchived (déjà fait dans db-push-all).
3. `make restart-tests-api-services` — Redémarrer application-, interview-, call-, followup-service (optionnel, si besoin).
4. Relancer les Tests API depuis le backoffice → rapport dans `tests/results/<timestamp>/`.

**Référence** : `scripts/test-api-specific.sh` (parsing JSON avec Node en priorité pour Docker frontend, fallback Python).

---

## Validé récemment (état actuel)

- **Stack** : `make up-full` → **21/21 services UP**, **41 tables** (Prisma + init-system-metrics + init-key-tables).
- **Logs** : `make logs` avec **coloration** (script `scripts/color-logs.sh`) : erreurs en **rouge** (ERROR/FATAL, HTTP 4xx/5xx, tables absentes, erreurs BDD), tags en couleur ; **timestamps** (date/heure au format ISO) affichés sur chaque ligne ; détection d’erreurs visible même quand la ligne commence par `[DEBUG]` (ex. `(HTTP 404)`).
- **Commandes** : `make start` = alias de `make up-full` ; `make fresh-start` = down + build + up-full + status (rebuild complet, utilise `docker compose build` puis `up`, **pas** `make dev`).
- **Health checks** : Les 3 services qui renvoyaient **HTTP 404** sur `GET /health` (utilisé par monitoring-c) ont été corrigés :
  - **monitoring-c** : route `GET /health` → 200 JSON ajoutée dans `ex-systems/monitoring-c/src/http_server.c`.
  - **log-collector-c** : `GET /health` accepté en plus de `GET /api/v1/health` dans `ex-systems/log-collector-c/src/http_server.c`.
  - **metrics-aggregator** (Node) : route `GET /health` ajoutée en plus de `GET /api/v1/health` dans `backend/metrics-aggregator-service/src/server.js`.
- Après **rebuild** des images concernées (`make build` ou rebuild des services monitoring-c, log-collector-c, metrics-aggregator), les health checks du collecteur doivent afficher **HTTP 200** pour ces trois services et la **disponibilité** (ex. dans les stats) doit augmenter (plus de 404 comptés comme hors ligne).
- **Tables « absentes »** ✅ **Corrigé** : Le message `[PERSISTENCE] Table container_metrics_snapshots absente` venait d’un **problème d’ordre de démarrage** (non lié au parallélisme) : metrics-aggregator démarrait avant db-push-all, donc la table n’existait pas encore. **Correction** : monitoring-c et metrics-aggregator sont maintenant démarrés **après** db-push-all dans `make up-full`. Si le message apparaît encore (ex. BDD existante sans la table), relancer `make db-push-all`.
- **Logs datetime** : `make logs` = timestamp Docker (ISO) ; `make monitoring-c-logs` = préfixe [ISO] sur monitoring-c et log-collector-c (pas de doublon entre les deux vues). **system_metrics** : tables en **public.** dans `init-system-metrics.sql` ; après mise à jour, exécuter **make db-push-all** pour éviter « relation public.system_metrics does not exist ».

---

## Admin après `make up-full`

À la fin de **`make up-full`**, le Makefile affiche soit **« ✅ Utilisateur administrateur existe »** (déjà en BDD), soit **« 🔧 Création automatique de l'admin... »** (créé à ce moment-là). Vous n’avez pas besoin de lancer `make create-admin-user` sauf si la création auto a échoué ou si vous avez lancé `CREATE_ADMIN_IF_MISSING=0 make up-full`. Identifiants : **admin@jobbingtrack.test** / **password123**.

**⚠️ `make create-admin-user` exige que la stack soit démarrée** : le script a besoin du conteneur **PostgreSQL** (`jobbingtrack-postgres`). Si vous voyez « ❌ Aucun conteneur PostgreSQL trouvé », lancez d'abord **`make up-full`**, puis **`make create-admin-user`** (pour password123, auth-service doit aussi être up).

---

## À FAIRE (par priorité)

### Priorité 1 – Immédiat ✅ (validée 2026-02-20)

1. ~~Vérifier que l’admin existe~~ — **Fait** : `make up-full` crée l’admin automatiquement ; connexion admin@jobbingtrack.test OK.
2. ~~Se connecter au backoffice~~ — **Fait**.
3. ~~Lancer les tests API depuis le backoffice~~ — **Fait** : **36/36 tests passent** (20/02/2026). Rapport généré ; Create Application → Interview / Call / Followup utilisent la candidature créée dans le run (parsing Node + fichier). Voir section **« Tests API – 36/36 passent »** en tête de STATUS.

**Logs** : pour repérer le run des Tests API dans les logs : `[TESTS API] Démarrage des Tests API depuis le backoffice` (début), `[TESTS API] Lancement de la suite Tests API`, `[TESTS API] Début exécution des tests`, `[TESTS API] Exécution des tests terminée`, `[TESTS API] Fin des Tests API` (fin). Filtrer avec : `grep "[TESTS API]"`.

### Priorité 2 – Erreurs à corriger

4. **Tables BDD** ✅ : **`make up-full`** exécute **un seul** `db-push-all` après démarrage de tous les conteneurs (9 services Prisma + init-system-metrics + init-key-tables + seed statuts). **9/9 services** synchronisés, **0 ignoré**. **init-key-tables** ajoute **User.verificationToken**, **verificationTokenExpiry**, **lastLoginAt**, **loginCount** si la table User existe ; crée aussi **container_metrics_snapshots** et **aggregated_logs** (metrics-aggregator), ce qui supprime les messages « Table container_metrics_snapshot absente » et « relation aggregated_logs does not exist » après **make db-push-all**. **workflow-service** : modèle User aligné (loginCount, lastLoginAt, verificationToken) pour ne plus les supprimer. **Code** : followup-service filtre par `status.code` ; interview-service met à jour par **statusId** ; auth met à jour **loginCount** au login. Pour tout repartir propre : **`make build`** puis **`make down && make up-full`**, puis **`make db-push-all`** si besoin. Logs : `[DB-PUSH-ALL]`, puis redémarrage de metrics-aggregator.
5. **Tests API – suite (Priorité 2)** : **List Applications 500** : fallback raw SQL sur colonne **archived** si Prisma lève « isArchived does not exist » (condition assouplie : `isArchived` + `does not exist`). **Create Interview/Call/Followup 404** : le script réutilise l’ID de la candidature créée (Create Application) ou le premier id de GET /applications ; parsing de `application` ou `data.id` dans la réponse. **Dates** : TZ (défaut Europe/Paris) pour rapports ; `summary.generatedAtISO` (UTC) dans le rapport ; UI backoffice utilise `formatReportDateLocal(..., generatedAtISO)` partout pour afficher en heure locale navigateur. Dernier run **32/36 passent, 4 échecs** (Company.isTestData ; corrigé dans application-service). **Corrections 2026-02-20** : Application.archived (application-service code + interview/call/followup Prisma), FollowUp.statusId (followup-service), JWT_SECRET pour event-service (docker-compose). **Important** : les erreurs Postgres « Application.isArchived does not exist » et « FollowUp.status does not exist » viennent des **images Docker** qui n’ont pas été reconstruites après les changements. **Corrections supplémentaires** : Application et Company sans isTestData/syncHash/entityHash/lastSyncAt (application-service) ; Event create sans contactId/companyId (event-service). **Workflow simple** : après changement code/schéma → `make build` puis `make up-full` ; relancer les Tests API. Causes principales : (1) **Login 401** — le script utilise `admin@jobbingtrack.test` / `password123` mais l’admin en BDD pouvait avoir été créé avec le hash pour « secret » (script SQL). **Correction** : `backend/scripts/database/create-admin-user.sh` privilégie désormais la création via **auth-service** (Node + bcrypt pour `ADMIN_PASSWORD`) ; si auth-service est indisponible, fallback hash « secret » (message indique de relancer avec auth up pour password123). (2) **Profile 404** — GET/PUT `/api/v1/profile/me` renvoient 404 (réponse HTML « Cannot GET/PUT ») : routes présentes dans le code profile-service ; **à faire** : **rebuild** profile-service (`make build` ou rebuild du service) et redémarrer pour que l’image embarque les routes. (3) **Notification 200 au lieu de 401** (sans token) : le service doit renvoyer 401 ; **à faire** : rebuild notification-service. Après corrections : **relancer `make create-admin-user`** (avec auth-service up) pour un admin avec password123, puis **make build** et **make up-full** (ou rebuild profile + notification), puis relancer les Tests API depuis le backoffice. **Comparaison de rapports** : implémentée (Backoffice → Rapports de tests → « Comparer des rapports »).
5b. **Couverture des tests (Priorité 2, en parallèle des échecs Tests API)** : **Backend complet** — Le script `scripts/test-api-specific.sh` couvre désormais **tous les services** : health, auth, users, companies, applications, **contacts**, **interviews**, **calls**, **events**, **followups**, **profile**, **notifications**, **metrics** (metrics-aggregator via gateway), **dashboard** (statistics, analytics events/errors/stats), **emails** (logs, stats), **workflow** (GET /workflows), **security** (firewall rules, blocked-ips, waf config, logs). **Rapports** : les runs depuis le backoffice (Tests API) génèrent un rapport (HTML + summary.json) dans `tests/results/<timestamp>/` ; `scripts/run-all-tests-with-reports.sh` inclut **Tests API Backend (script - tous services)** et **Tests Sécurité Firewall & WAF (API)** ; les rapports sont listés et comparables dans Backoffice → Rapports de tests. **Frontend / Backoffice / Sécurité** : `run-all-tests-with-reports.sh` exécute aussi User Journey, Jest API/backend, Playwright E2E (frontend + mobile), Jest frontend, tests performance, tests sécurité (injection SQL, XSS, CSRF, auth avancée, autorisation), tests firewall/WAF ; chaque catégorie produit un rapport dans le même répertoire. **À faire** : s’assurer que les tests deployment (si un service deployment est exposé au gateway) et les tests backoffice Playwright dédiés sont bien lancés selon l’env (voir Catégories 2 et 5 dans le script).
6. SMTP 503 : configurer SMTP (auth-service ou service dédié), test opérationnel, écrans backoffice Configuration SMTP et Déliverabilité.
7. **Logs emails 404** : La page `/backoffice/emails/logs` existe et appelle `GET /api/v1/emails/logs` (via gateway → auth-service). Côté code : gateway a `/api/v1/emails` → auth-service ; auth-service a `GET /logs` sous `/api/v1/emails` (authentification requise). Si 404 persiste : vérifier que le front utilise bien `NEXT_PUBLIC_API_URL` (gateway), que le token est envoyé, et les logs auth-service / api-gateway.
8. **API versioning (prioritaire)** : Le versioning API n’est pas encore en place. Route `GET /api/v1/analytics/stats/:userId/versions` (404) : existe côté dashboard-service ; gateway envoie `/api/v1/analytics*` au dashboard ; front `user-analytics/page.tsx` appelle cette URL. Si 404 persiste : vérifier logs gateway/dashboard et droits. À faire : corriger 404 + définir stratégie de versioning des APIs.
9. ~~Health checks 404~~ ✅ **Fait** : `GET /health` ajouté sur monitoring-c, log-collector-c et metrics-aggregator ; après rebuild, plus de 404 sur ces trois services.

**Checklist Priorité 2 – à valider avant de passer en phase 3**

- [x] **Tests API** : 36/36 passent. Candidature du run réutilisée pour Interview/Call/Followup (Node + fichier). **Si l’erreur persiste après build** : `make build-application-service` puis `make up-full`, Dates rapports en heure locale (TZ).
- [ ] **Couverture tests backend** : Script `test-api-specific.sh` exécute tous les services (interview, call, contact, dashboard, event, followup, profile, notification, metrics-aggregator, workflow, security, emails). Rapports générés et visibles dans Backoffice → Rapports de tests ; `make run-all-tests-with-reports` ou équivalent inclut le script + tests sécurité firewall.
- [ ] **Logs emails** : Page `/backoffice/emails/logs` et API `GET /api/v1/emails/logs` OK (pas de 404).
- [ ] **API versioning** : Corriger 404 sur `GET /api/v1/analytics/stats/:userId/versions` et mettre en place stratégie de versioning des APIs (prioritaire).
- [ ] **SMTP** (optionnel) : Config SMTP opérationnelle, test d’envoi et écrans backoffice OK.

Une fois ces points cochés (ou documentés), passer à **Priorité 3** (simplification Make/scripts, puis tests à valider), puis **Priorité 4** (sécurité).

**Base de données / modèles** : Les schémas ont été alignés (voir section **« Base de données et modèles de données – Choix appliqués »**) : **isArchived** partout, tables **\*Status** + **statusId**, **isTestData** / sync cohérents, **Notification** complet (notification-service), **Profile** lié à User (profile-service et services métier). Après modification des schémas : **make db-push-all** puis relancer les tests API. **Table Application** : le schéma Prisma utilise `isArchived @map("archived")` ; en BDD la colonne créée par Prisma est **archived**. Pour éviter l’erreur « column Application.isArchived does not exist » (clients Prisma anciens ou génération SQL), un script **make db-fix-isarchived** (ou exécuté dans **db-push-all**) ajoute la colonne **isArchived** (générée depuis **archived**). À lancer une fois après **db-push-all** si les tests Create Interview/Call/Followup renvoient 404 « Candidature non trouvée ».

**Étape suivante (Priorité 3)** : **Simplifier les commandes Make et les scripts (KIS)** : quantité de makefiles, cibles et scripts à réduire et réorganiser ; un seul flux clair (ex. build, up-full) ; docs et helpers (make help, etc.) à jour. À faire après résolution des échecs Tests API.

**Note Company.isTestData** : Si l’erreur « column Company.isTestData does not exist » persiste après correction du schéma, l’**cache Docker** n’a pas été reconstruite. Faire **`make build-application-service`** (rebuild sans cache de application-service uniquement), puis **`make up-full`**, puis relancer les Tests API. Un simple `make build` peut ne pas invalider le cache Prisma.

**Notes** : **Resend** (RESEND_API_KEY) : optionnel, à configurer plus tard. **container_logs** : table + enum `LogLevel` créés dans `init-key-tables.sql` ; la persistance des logs depuis le log collector est opérationnelle (plus de contournement dans metrics-aggregator). **Backoffice Tests API** : après lancement, un résumé s’affiche (X/Y tests passés, Z échecs). **URLs inter-conteneurs** : `.env.example` et `.env` incluent `MONITORING_C_URL` pour le metrics-aggregator.

### Priorité 3 – Simplification Make/scripts puis tests

9. **Simplifier Make et scripts (KIS)** : Réduire et réorganiser la quantité de makefiles, cibles make et scripts ; un flux clair (build, up-full, db-push-all si besoin) ; mettre à jour la doc (README, docs/*) et les helpers (make help, scripts d’aide).
10. Lancer et valider (ou documenter les échecs) : `make test-api`, `make test-security`, `make test-frontend`, `make test-backend`, `make test-e2e`, `make test-performance`, `make tests-user-journey`.
11. Compléter les tests unitaires (frontend, backend, tests/unit) ; aligner avec TESTS_END.md et docs/tests/TESTS_COMPLETS_RAPPORT.md.

### Priorité 4 – Sécurité

12. **Sécurité (WAF, détection, logs)** : La partie sécurité du backoffice (Menaces, Logs de sécurité, Firewall, etc.) est **partiellement réelle** :
    - **Menaces** : détection réelle (network-monitor lit `/proc/net/tcp`, détecte anomalies). Un **faux positif « Port Scanning »** a été corrigé : beaucoup de connexions d’une IP vers **un seul** port (ex. app → PostgreSQL 5432) n’est plus signalé comme port scan ; seules les IP touchant **plusieurs ports** différents sont considérées.
    - **Logs de sécurité** : alimentés par auth-service (login/register), firewall (règles, blocages), WAF ; les **menaces détectées** sont maintenant aussi écrites dans `security_logs`, donc elles apparaissent dans « Logs de sécurité ».
    - **À faire** : Remplacer la config WAF et la détection restantes (faux/mock) par une vraie config WAF et une détection fiable (APIs + BDD) ; affiner les seuils et exclure le trafic interne Docker si besoin.

### Base de données et modèles de données – Choix appliqués

**Schéma de référence métier** : **application-service** (`backend/application-service/prisma/schema.prisma`) pour User, Company, Application, Contact, FollowUp, Call, Interview, Event, Notification, Document, Profile et tables de jonction.

**Choix retenus et appliqués** :

| Choix | Détail |
|-------|--------|
| **isArchived (pas archived)** | Partout : Application utilise **isArchived** (Boolean). application-service, followup-service, interview-service, call-service alignés ; auth, contact, company avaient déjà isArchived. |
| **Tables \*Status + statusId** | Tables **ApplicationStatus**, **FollowUpStatus**, **InterviewStatus** et dans les entités métier un champ **statusId** (String) avec relation vers la table de statut. FollowUp utilise statusId + modèle FollowUpStatus (plus d’enum) dans auth, contact, company, followup. |
| **isTestData, syncHash, entityHash, lastSyncAt** | Ajoutés de façon **cohérente** pour filtre « données test » et sync : **User** (isTestData), **Contact**, **FollowUp**, **Call**, **Interview**, **Event**, **Document** (isTestData et, selon le modèle, syncHash, entityHash, lastSyncAt) dans application-service, auth-service, contact-service, company-service, followup-service. |
| **Notification (modèle partagé complet)** | **notification-service** : schéma remplacé par le modèle partagé (type **NotificationType** enum, **entityType**, **entityId**, **data**, **readAt**, userId, title, message, read, createdAt) avec User minimal pour la relation. Table mappée `notifications`. |
| **Profile lié à User** | Modèle **Profile** (userId, bio, headline, avatarUrl, linkedinUrl, githubUrl, website, preferences) avec relation **User** 1–1. Ajouté dans **application-service**, **auth-service**, **contact-service**, **company-service**, **followup-service**. **profile-service** : schéma avec User (minimal) + Profile pour l’API profil. |

**À faire après db-push** : Lancer **make db-push-all** (ou db-push par service) pour appliquer les changements en BDD. En cas de colonne déjà existante sous un autre nom (ex. `archived`), une migration manuelle peut être nécessaire pour renommer en `is_archived`. Ensuite : implémenter le **filtre API isTestData** (onglet Données test) et valider les tests API.

### Priorité 5 – Gestion des données

13. Onglet Données test : implémenter le filtre API (isTestData ou utilisateur de test) pour une table « données test uniquement ».
14. Abonnement & facturation : implémenter ou documenter hors scope.

### Priorité 6 – Design et UX

14. Design unifié des pages de test (Tests API, Frontend, Backoffice) : reprendre le design Tests Backend (progression, logs) ; voir TESTS_END.md § 13.
15. Depuis le backoffice : création automatique d’un utilisateur de test et des données de test au clic « Lancer les tests » (sans `make create-admin-user` à la main).

### Priorité 7 – Métier et scénarios

17. APIs métier complètes (entretiens, appels, sync, candidatures, relances, entreprises, contacts, événements, calendrier, utilisateurs, paramètres) ; voir docs/database/ (schema, ACTIONS_ET_MODIFICATIONS).
18. Scénarios Playwright, API et parcours utilisateur opérationnels (dépendent des APIs métier).
19. Worker/cron pour exécuter les tests programmés (plannings backoffice).

### Priorité 8 – Suite

19. Application mobile : connecter à l’API fonctionnelle et sécurisée (section métier stable).
20. Observabilité : tout le trafic (API, mobile, mails, user journey, tests) répertorié dans log-collector + metrics-aggregator.
21. Documentation : tenir à jour ERRORS.md, aligner RESOLUTIONS.md / TESTS_END.md avec STATUS.

---

## À valider (tests à lancer)

- **Priorité 2 (maintenant)** : **Suite immédiate** : **SMTP** (config + test + backoffice), **API versioning** (important – pas encore en place ; corriger 404 sur `GET /api/v1/analytics/stats/:userId/versions` et définir stratégie), **logs emails** (404). Tests API : 36/36 OK ; BDD : `make db-push-all` puis si besoin `make db-fix-is-archived` et `make restart-tests-api-services`.
- **Priorité 3** : Lancer les cibles make listées (make test-api, test-security, test-frontend, etc.) depuis la racine ; valider ou documenter les échecs.
- **Priorité 4 (sécurité)** : après stabilisation des tests et APIs, affiner la partie sécurité (WAF réelle, seuils, logs/menaces cohérents). Les menaces détectées sont désormais aussi enregistrées dans les logs de sécurité.
- En fin de session : noter les échecs dans STATUS.md ou TESTS_END.md.

**Commandes détaillées** : **docs/COMMANDES_UTILES.md** (aide, tests, db, logs, rebuild).

---

## Fonctionnement du projet – Parcours de vie (d’après les .md)

**Objectif** (README, docs/database/ACTIONS_ET_MODIFICATIONS) : JobbingTrack est un **outil personnel de suivi de candidatures pour un chercheur d’emploi**. L’utilisateur = le candidat qui suit **ses propres** candidatures. Ce n’est **pas** un ATS (outil recruteur/employeur).

**Parcours de vie typique** (données et APIs couverts par les 36 tests) :

1. **Auth** : Inscription / Connexion (User). Admin : `admin@jobbingtrack.test` / `password123`.
2. **Entreprises** : Le candidat crée ou réutilise des **Company** (entreprises ciblées).
3. **Candidatures** : Pour chaque entreprise / offre, il crée une **Application** (position, statut, date, plateforme, etc.). Une Application appartient à un User et à une Company.
4. **Contacts** : Il peut associer des **Contact** (recruteurs, RH) à des entreprises (ContactCompany) et à des candidatures (ContactApplication).
5. **Entretiens** : Pour une **Application**, il planifie des **Interview** (date, type, lieu). Interview → Application (obligatoire), optionnellement InterviewContact.
6. **Appels** : Il enregistre des **Call** (sujet, date, durée) liés à une **Application** (et optionnellement un Contact, une Company).
7. **Relances** : Il crée des **FollowUp** (type, date, notes) liés à une **Application**. FollowUp peut être lié à des Contact (FollowUpContact).
8. **Événements** : **Event** (calendrier) : liés au User, optionnellement à une Application, un Interview, un Call, un FollowUp.
9. **Profil** : **Profile** (bio, liens, préférences) 1–1 avec User.
10. **Notifications** : **Notification** (type, entityType, entityId, readAt) pour le User.
11. **Dashboard / Stats** : Agrégation (candidatures, entretiens, relances, etc.) et analytics.

**Interconnexion BDD** (docs/database/relations.md) : User → Application, Company, Contact, FollowUp, Call, Interview, Event, Notification. Company → Application. Application → FollowUp, Call, Interview, Event. Tables de jonction : ContactCompany, ContactApplication, FollowUpContact, InterviewContact. Statuts via tables \*Status (ApplicationStatus, FollowUpStatus, InterviewStatus) et champs statusId.

**Ce que les 36 tests API vérifient** : health des services, auth (login, profile), CRUD companies, **applications** (list + create), contacts, **interviews** (list + create, sur la candidature créée), **calls** (idem), **events**, **followups** (idem), profile, notifications, métriques, dashboard. Donc le **cœur métier** (candidature → entretien / appel / relance / événement) est couvert. Pour repérer des manques par rapport à ton besoin réel, comparer avec ce parcours et les écrans backoffice / mobile (ex. : filtres isArchived, sync mobile, rappels automatiques, etc.).

---

## Parcours de vie et traitements métier – À couvrir plus tard (hors Tests API)

**À noter** : les points ci‑dessous ne sont **pas** couverts par les Tests API (script backoffice). Ils relèvent des **parcours utilisateur** (prédéfinis / personnalisés), **tests backend**, **tests frontend**, **tests backoffice**, **Playwright E2E**, et éventuellement du **workflow-service** (traitements réguliers dans le temps). À traiter après les priorités immédiates (SMTP, API versioning, etc.).

- **Mise à jour automatique des statuts de candidature dans le temps** : vérifier que les statuts (ApplicationStatus) évoluent correctement selon les règles métier / le temps ; **à tester** via tests backend ou parcours utilisateur (pas via Tests API).
- **Création / modification en cascade** : création d’un **Event** et mise à jour des éléments liés quand une candidature change, ou quand une relance change, ou quand un entretien change ; cohérence Event ↔ Application / FollowUp / Interview.
- **Listes de types et états** : s’assurer que les listes existent et sont utilisées partout : **types d’entretien** (InterviewType), **états de candidature** (ApplicationStatus), **états de relance** (FollowUpStatus), **plateforme de candidature** (Platform), **plateforme / type de relance**, **types d’événement** (EventType), etc.
- **Cases / formulaires métier** : couvrir les cas d’usage : case candidature (création/édition), case entretien, case contact, **ajout d’entreprise**, **ajout ou création de contact lié** à une candidature, événements créés (types, liens), etc. → **parcours utilisateur** (backoffice / frontend) et tests E2E (Playwright).
- **Traitement des statuts et workflow-service** : les changements de statut (candidature, relance, entretien) et les traitements automatiques dans le temps sont censés être gérés (ou complétés) par le **workflow-service** (exécution régulière). À spécifier puis tester (backend / worker / cron).
- **Comment vérifier les mises à jour de statut automatiques** : **pas** via Tests API ; via **tests backend** (unit / intégration sur workflow-service ou jobs), **tests frontend** (composants statut), **tests backoffice**, **Playwright** (scénarios métier), et surtout **parcours utilisateur** (prédéfinis et personnalisés) pour valider bout en bout.

**Priorité immédiate (suite)** : **SMTP** (config, test, écrans backoffice), **API versioning** (très important, pas encore en place – ex. `GET /api/v1/analytics/stats/:userId/versions`, stratégie de versioning des APIs), **logs emails** (404 à corriger). Ensuite parcours de vie et traitements métier ci‑dessus.

---

## Références

- **RESOLUTIONS.md** — Ce qui est résolu ou validé (résolutions appliquées, checklist).
- **docs/COMMANDES_UTILES.md** — Commandes make utiles et ce que vous pouvez tester.
- **docs/STATISTIQUES_PROJET.md** — Statistiques projet (services, observabilité, persistance).
- **docs/tests/ECHECS_TESTS_API_2026-02-19.md** — Analyse des 15 échecs du rapport Tests API (2026-02-19) et actions à faire.
- **ERRORS.md** — Erreurs connues et statut.
- **TESTS_END.md** — Synthèse des tests et validation via make.

---

## Détail par thème (référence)

*Pour le détail technique des points ci-dessus (erreurs BDD, relances/événements/notifications, sécurité, emails, métier, etc.), les sections suivantes restent en référence. Tout ce qui est **résolu** est dans **RESOLUTIONS.md**.*

### Erreurs et corrections (à retester si besoin)

- Tests API depuis Docker : `sh` + chemins absolus, PROJECT_ROOT, volume scripts, TESTS_RESULTS_DIR, syntaxe POSIX (test-api-specific.sh, generate-test-report.sh).
- Persistance agrégateur : filtre JobbingTrack → 21 conteneurs ; rebuild metrics-aggregator si besoin.
- Tables manquantes : `make db-push-all` crée toutes les tables (Prisma 9 services + init-system-metrics.sql + init-key-tables.sql). **init-key-tables** crée aussi vulnerabilities, security_metrics, deployments (+ deployment_metrics, rollbacks) et ajoute User.verificationToken / verificationTokenExpiry si la table User existe. Ne pas lancer db-push-security / db-push-deployment seuls.
- **Rapport Tests API (2026-02-10)** : 13/47 passent, 34 échecs. Causes : (1) Login 401 (hash admin = « secret » au lieu de password123) — script create-admin-user corrigé (création via auth-service en priorité) ; (2) Profile 404 sur GET/PUT `/api/v1/profile/me` — rebuild profile-service nécessaire ; (3) Notification 200 sans token au lieu de 401 — rebuild notification-service nécessaire. Détail dans **docs/tests/ECHECS_TESTS_API_2026-02-19.md** et **ERRORS.md**. Résumé (X/Y passés, Z échecs) affiché après chaque run depuis le backoffice.
- **make refresh-bdd** : une seule commande (build → down → up-full → db-push-all). up-full démarre tous les services puis exécute **un seul** db-push-all (plus de premier passage avec seulement auth).
- **up-full** : un seul `db-push-all` après le démarrage de tous les conteneurs (postgres, redis, api-gateway, auth, frontend, profil full, monitoring-c, metrics-aggregator). Évite les « conteneur non démarré (ignoré) ». Après db-push-all, **metrics-aggregator est redémarré** pour recharger le schéma BDD et éviter les erreurs « cached plan must not change result type » et « cache lookup failed for type ».
- **container_logs** : table et enum `LogLevel` créés dans `scripts/db/init-key-tables.sql` ; persistance des logs opérationnelle (plus de contournement dans metrics-aggregator).

### Emails

- Configuration SMTP, test SMTP, écrans Configuration et Déliverabilité (non implémentés).
- Historique des emails : API et page à brancher.

### Sécurité

- **Menaces** : détection réelle (network-monitor + networkThreatDetector). Faux positif « Port Scanning » corrigé : une IP avec beaucoup de connexions vers **un seul** port (ex. app → postgres 5432) n’est plus signalée ; seules les IP touchant **plusieurs ports** le sont.
- **Logs de sécurité** : alimentés par auth (login/register), firewall (règles, blocages), WAF ; les menaces détectées sont maintenant aussi écrites dans `security_logs` (événement `network_threat_detected`), donc visibles dans Backoffice → Sécurité → Logs de sécurité.
- WAF et détection avancée : à remplacer les parties mock par vraie config et détection (APIs + BDD). Firewall (règles, statut, logs) : tables via db-push-all ; backoffice branché.

### Gestion des données

- Export : branché (GET /api/v1/admin/export/:type via gateway 5002). Import et cleanup : 501, message clair.
- Stats utilisateur : branché sur GET /api/v1/analytics/stats/:userId. Abonnement : non implémenté. Données test : filtre API à ajouter.

### Métier (APIs et backoffice)

- Entretiens, appels, sync, candidatures, relances, entreprises, contacts, événements, calendrier, utilisateurs, paramètres : à finaliser (CRUD, workflows, backoffice, scénarios). Référence : docs/database/.

### Migration et sécurisation complète

- À faire en dernier (après backoffice, tests, API stables) : migration auth vers Go/Rust, chiffrement, JWT/refresh, rate limiting, HTTPS, validation stricte. Voir section « Migration et sécurisation complète » dans l’historique du fichier si besoin.
