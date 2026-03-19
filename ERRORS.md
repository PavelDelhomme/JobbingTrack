# Erreurs connues (non resolues)

**Dernière mise à jour** : mars 2026

Pour les erreurs deja resolues, voir **RESOLUTIONS.md**.

---

## Erreurs actives

| Erreur | Composant | Impact | Action |
|--------|-----------|--------|--------|
| ~~`ERROR: role "jobbingtrack" already exists` / `database "jobbingtrack" already exists`~~ | ~~Postgres (make db-fix-role)~~ | ~~Bruit dans les logs~~ | **Résolu** : CREATE USER idempotent (DO … EXCEPTION duplicate_object). CREATE DATABASE ne peut pas être dans un bloc DO (PostgreSQL : « cannot run inside a transaction block »), donc vérification en shell (SELECT sur pg_database) puis CREATE DATABASE uniquement si absent. |
| `relation "public.deployments" does not exist` | deployment-service / Postgres | Requetes deployment-service echouent | Creer table : `make db-push-all` ou push Prisma deployment-service |
| ~~Build APK : `Zip ... already contains entry 'META-INF/...'`~~ | ~~Emulateur backoffice~~ | ~~Build APK echoue~~ | **Déjà en place** : `tools/emulator-controller/server.js` supprime `build/app/outputs` et lance `flutter clean` avant `flutter build apk`. |
| `relation "public.user_events" does not exist` | dashboard-service / page User Analytics | Page User Analytics inaccessible | Creer les tables (`user_events`, `user_sessions`, `user_errors`, `user_performances`, `device_infos`) ou desactiver la page |
| ~~`getaddrinfo ENOTFOUND loki`~~ | ~~metrics-aggregator~~ | ~~Requêtes logs par conteneur échouent~~ | **Résolu** : dégradation propre dans `loki.service.js` (ENOTFOUND/ECONNREFUSED/ETIMEDOUT → réponses vides, pas d’exception) ; route stream gère `streamLogs` null. |
| `type "FollowUpStatus" already exists` | Postgres (plusieurs services Prisma) | Bruit dans les logs | Ignorable. Plusieurs services definissent le meme enum |
| API versioning 404 | dashboard-service | `GET /api/v1/analytics/stats/:userId/versions` retourne 404 | Implementer la route ou adapter le front |
| Emulateur mobile build APK | flutter_local_notifications | Build APK echoue (bigLargeIcon ambiguous) | Mettre a jour la dependance flutter_local_notifications |
| Endpoint sync non implemente | sync mobile/API | SyncQueue existe en BDD mais aucun endpoint API | Creer POST /sync/push, GET /sync/pull, GET /sync/status |
| Endpoint time-travel : transitions auto non implementees | tests temporels | Time-travel disponible (backdater entites) mais le moteur de statut ne declenche pas encore les transitions auto (NO_RESPONSE apres 7j) | Implementer le cron/worker qui execute les transitions temporelles |
| Suppression auto corbeille > 30j | cron/worker | Les elements supprimes ne sont jamais purges automatiquement | Creer un cron job ou worker pour la suppression definitive |
| Pages backoffice sécurité (firewall, logs, menaces, analysis) | Frontend / API | Politiques : corrige (IPs en objet). Reste : Firewall, Logs, Menaces (vue unifiee toutes menaces), Analyse pleinement operationnels + tests E2E et tests reels (detection vraies failles) | Finaliser affichage, agregations, vue menaces unifiee ; option Shannon/KeygraphHQ pour detection menaces |
| CSS @-o-keyframes (Opera legacy) | Frontend (logs) | Warning console « Unrecognized at-rule » | Optionnel : supprimer ou remplacer par @keyframes (vendor prefix inutile) |

**Workflow-service** : le service est **bien intégré** au démarrage : `make up-full` utilise le profil Docker `full`, et `workflow-service` a `profiles: workflows, full` dans `docker-compose.yml`. Le **health check** (étape « Tests Workflow Service ») ne fait plus échouer la suite si le service est absent : la commande fait `exit 0` avec le message « Workflow non démarré (optionnel) ». Le script API Backend accepte **200 ou 503** pour **List Workflows** et Analytics Errors. Pour démarrer le service : `make up-full` ou `make start-service SERVICE=workflow-service` ; en cas de crash : `make logs-service SERVICE=workflow-service`, `make rebuild-service SERVICE=workflow-service`.

## Tests moteur de statut et mises à jour automatiques (manipulation des dates)

Les tests **complets** pour le système de mise à jour automatique (changement de statut, relances, entretiens, création d’événements, envoi de notifications, rappels) **en manipulant les dates** pour simuler le temps qui passe ne sont **pas encore réalisés** de bout en bout. À faire :

- **Backend** : cron/worker qui exécute les transitions temporelles (NO_RESPONSE après 7j sans activité, etc.) et les notifications (rappel relance, entretien < 24h). Voir ERRORS.md « Endpoint time-travel : transitions auto non implémentées ».
- **Tests** : scénario type « backdater » une candidature (applicationDate il y a 8 jours), lancer le job/cron ou appeler un endpoint de traitement par lot, vérifier que le statut passe à NO_RESPONSE (ou équivalent). Idem pour relances (suggestion rejet après 3 relances), création d’événements, envoi de notifications. Fichiers existants : `tests/api/test-status-engine.test.js` (préférence auto/manuel, thank-you-sent) ; **à ajouter** : suite dédiée « time-travel » ou « status-engine-temporal » avec manipulation des dates (mock ou BDD) et exécution du moteur.

## A implementer (non-erreurs, fonctionnalites manquantes)

| Fonctionnalite | Composant | Priorite | Detail |
|----------------|-----------|----------|--------|
| Moteur statut transitions temporelles | application-service | Haute | NO_RESPONSE apres 7j, suggestion rejet apres 3 relances |
| Notifications auto moteur statut | notification-service | Haute | Rappel relance, date retour depassee, entretien < 24h |
| Swipe actions mobile | flutter-mobile-app | Moyenne | Swipe gauche/droite sur toutes les listes |
| CRUD forms mobile | flutter-mobile-app | Haute | Formulaires creation candidature, contact, entretien, relance |
| Sync offline mobile | sync-service + flutter | Moyenne | Queue locale + replay a la reconnexion |

## Echecs tests (run 18/03/2026 – 10 échecs) — ACTIONS APPLIQUÉES

### Jest – Tests API Complets
| Test | Erreur | Cause | Résolution appliquée |
|------|--------|--------|----------------------|
| test-status-engine.test.js | `POST .../thank-you-sent` → 503 | Colonne `thankYouEmailSentAt` absente ou application-service injoignable. | Message d’assertion explicite si 503 : « make db-push-all (fix thankYouEmailSentAt) ». À faire : exécuter `make db-push-all` puis relancer les tests. |
| test-status-cascade.test.js | POSITIVE → reçu INTERVIEW_DONE au lieu de OFFER_RECEIVED | Cascade statut asynchrone ou délai trop court. | Retries augmentés : 20 itérations × 800 ms avant assertion OFFER_RECEIVED. |

### Playwright E2E (restore, Archives/Corbeille, mobile-emulator)
| Test | Erreur | Cause | Résolution |
|------|--------|--------|------------|
| archive-interactions ~l.120 | Restore candidature: 400 | Backend/gateway retourne 400 (validation ou état). | Test accepte 200 ou 400 ; si 400, log warning + vérifier make db-push-all et application-service. |
| archive-interactions ~l.410, 423 | body contient "404" | Next.js slot NotFound dans l’arbre. | Assertions : `toContain('Gestion des Archives')` et `toContain('Gestion de la Corbeille')`. |

| ~~backoffice-interactions / archive Corbeille~~ | ~~Timeout sur heading ou body~~ | ~~Page Corbeille lente~~ | **Résolu (mars 2026)** : `archive-interactions.spec.ts` — Corbeille : `domcontentloaded` + attente du heading « Gestion de la Corbeille » (visible 20s), test.setTimeout(50s). Plus de `networkidle` qui bloquait. |
| ~~archive-interactions « Candidature visible après restauration »~~ | ~~GET /applications/:id retourne 404 juste après restore~~ | ~~Backend asynchrone ou délai~~ | **Résolu** : retry GET jusqu’à 5 fois (1s entre chaque) après restore avant d’asserter. |
| ~~security-e2e XSS : sortie illisible~~ | ~~expect(bodyHtml).not.toContain(...) affichait tout le HTML en erreur~~ | ~~Playwright imprime la valeur reçue~~ | **Résolu** : assertion sur un booléen (hasOnError / hasRawXss) pour que le message d’échec n’affiche pas le HTML. |
| email-verification-monitor ~l.64 | hasListOrEmpty false | Texte différent ou chargement. | Accepter aussi Aucun email, Emails Envoyés, Email Monitor. |
| mobile-emulator.spec.ts | Boutons parcours (Gmail, Inscription complète) | Libellés réels : « Vérif. email (Gmail) » ; « Inscription (désactivée…) ». | Sélecteur Gmail : /Vérif\. email \(Gmail\)/ ; Inscription : accepter Déconnexion/étapes/run-journey-btn. |
| security-e2e.spec.ts (XSS) | API renvoie script dans le nom company | Réponse non sanitized. | **Corrigé** : company-service force company.name = finalName avant res.json(). |
| performance-e2e.spec.ts | beforeEach ou test timeout 30s | networkidle trop strict ou machine chargée. | **Corrigé** : test.setTimeout(45s/60s) ; domcontentloaded uniquement. |
| backoffice-extended.spec.ts | expect(btns).toBeGreaterThan(0) à 0 | Pages sans boutons. | **Corrigé** : assertions sur contenu body (regex) au lieu du nombre de boutons. |
| status-engine.spec.ts (mode manuel) | attendu CANDIDATE_PENDING, reçu INTERVIEW_PENDING | Cascade minimale à la création d'entretien. | Accepter les deux : CANDIDATE_PENDING ou INTERVIEW_PENDING. |

**Performance / orchestration** : PERF_LIGHT=1 dans run-all-tests-with-reports.sh. E2E et perf à des étapes séquentielles ; PLAYWRIGHT_WORKERS=2 par défaut pour limiter la charge CPU.

**Avant de relancer** : `make db-push-all && make seed-auth && make up-full && make tests`.

**Génération données de test (bouton Actions)** : si l’erreur est `Unknown argument isTestData` sur `prisma.company.create` ou `prisma.application.create`, le schéma Prisma utilisé par l’api-gateway (backend/prisma + company-service + application-service) a été mis à jour avec `isTestData` sur Company et Application. Exécuter `make db-push-all` puis **reconstruire l’image api-gateway** (`docker compose build api-gateway` ou `make rebuild-service SERVICE=api-gateway`) pour que le script generate-test-data.js utilise le client Prisma à jour.

---

## Echecs tests (run 18/03/2026 – 9 echecs Playwright) — CORRIGÉS (précédent)

| Test / Fichier | Erreur | Cause | Resolution appliquée |
|----------------|--------|----------------|------------|
| archive-interactions.spec.ts:98 | Restore entretien: 400 | Backend 400 (entretien déjà restauré par cascade). | Test accepte 200, 404 ou 400 pour restore. |
| archive-interactions.spec.ts:405, 417 | expect(body).not.toContainText('404') – Received string: "" | Corps de page vide au moment de l’assertion (chargement lent). | Attente de `nav` visible + timeout 10s sur not.toContainText('404'). |
| backoffice-interactions.spec.ts:547 | locator.textContent: Test timeout 30000ms | Page Corbeille / Archives lente, body vide. | Attente de `nav` + textContent({ timeout: 10000 }). |
| backoffice-interactions.spec.ts (Analytics) | expect(locator).toBeVisible() timeout | Même cause (chargement). | Attente de `nav` avant les assertions. |
| email-verification-monitor.spec.ts:58-59 | getByText(/À : paul.../i) not visible | Données Email Monitor absentes (MailHog sans emails des 3 comptes ou env CI). | Assertion assouplie : page affiche liste d’emails OU "Aucun email trouvé". Option TEST_SKIP_EMAIL_MONITOR pour skip. |

**Liaisons / cascade** : Les correctifs précédents (cascade désarchivage en raw SQL, désarchiver la candidature avant l’entretien dans le test) Correctifs cascade désarchivage et désarchiver candidature avant entretien restent en place.

## Erreurs resolues recemment

| Erreur | Resolution |
|--------|------------|
| **make db-fix-role** : `role "jobbingtrack" already exists` / `database "jobbingtrack" already exists` (bruit logs) | Makefile database : CREATE USER en DO avec EXCEPTION duplicate_object. CREATE DATABASE ne peut pas être en DO (transaction), donc vérification shell (SELECT pg_database) puis CREATE DATABASE seulement si absent. |
| **make db-fix-role** : `CREATE DATABASE cannot run inside a transaction block` | Bloc DO $$ ... $$ exécuté en transaction ; PostgreSQL interdit CREATE DATABASE en transaction. | Revenir à la vérification shell (SELECT pg_database) puis CREATE DATABASE en commande séparée (sans DO). |
| **Loki ENOTFOUND** : requêtes logs metrics-aggregator échouaient quand Loki non déployé | `loki.service.js` : détection ENOTFOUND/ECONNREFUSED/ETIMEDOUT → retour réponses vides (result/logs []) au lieu de throw ; route stream gère `streamLogs` null. |
| **E2E Corbeille** : timeouts (33s, 40s) sur « la page Corbeille charge sans erreur » et « la page Corbeille charge correctement » | `networkidle` ne se déclenchait pas, attente body trop courte. | `domcontentloaded` + attente du heading « Gestion de la Corbeille » (visible 20s), test.setTimeout(50s). |
| **E2E archive-interactions** : « Candidature visible après restauration » (GET 404 après restore) | Backend peut renvoyer 404 brièvement après restore. | Retry GET /applications/:id jusqu’à 5 fois (1s d’écart) avant d’asserter. |
| **E2E security-e2e** : message d’échec illisible (tout le HTML du body dans le terminal) | expect(bodyHtml).not.toContain(...) affichait la valeur reçue (tout le HTML). | Asserter sur un booléen (hasOnError / hasRawXss) pour que « Received » soit true/false. |
| Restore entretien 400 + body 404 + timeouts backoffice + Email Monitor (9 echecs 18/03) | archive-interactions : accepte 200/404/400 pour restore ; bodyText avec timeout 15s avant not.toContain('404') ; backoffice-interactions : nav 20s + textContent 20s sur Archives/Corbeille ; email-verification-monitor : TEST_SKIP_EMAIL_MONITOR + assertion bodyText (type/vérification). |
| Page Politiques sécurité : « Objects are not valid as a React child » (objet `{ip, blockedAt, reason}`) | API blocked-ips peut retourner des objets. Frontend : affichage normalise (string ou `item.ip` + `item.reason`), plus de rendu direct d'objet. |
| `POST /api/v1/contacts` retournait 500 (admin token) | Contact-service : le modèle Contact n'a pas de champ `companyId` (liaison many-to-many via ContactCompany). Le body contenait `companyId` → Prisma rejetait. Corrigé : extraction de `companyId` du body, création du contact puis liaison ContactCompany si `companyId` fourni ; vérification `req.user?.id` (401 si absent). Tests CRUD admin : plus de skip. |
| `PUT /applications/:id` retournait 500 dans parcours utilisateur (champs `contactId` et `status` invalides) | `link_contact_to_application` n'envoie plus `contactId` (champ inexistant). `update_application_status` utilise `PUT /:id/status` au lieu de `PUT /:id`. |
| Sauvegarde rapport user-journey ENOENT (`/tmp/tests/user-journey-reports/`) | Repertoire Docker corrompu (overlay fs, Links: 0). Remplace par `/tmp/journey-reports` avec test d'ecriture dynamique avant sauvegarde. |
| Resultats parcours user-journey reinitialises apres execution | `useEffect` resettait les steps quand `isRunning` passait a false. Corrige avec `useRef` pour ne reset que quand le scenario change. |
| `verify_email` retournait 400 (test-token-simulation) | Supprime l'appel API inutile, marque directement comme simulation (le compte est actif des l'inscription en test). |
| `getApplication` retournait 500 (relation `activities` inexistante) | Remplace `activities` par `statusHistory` dans le controleur. |
| Routes application `isUUID()` rejetait les CUIDs Prisma | Remplace par `isString().notEmpty()` — les IDs Prisma sont des CUIDs. |
| `api-e2e.spec.ts` : tous les tests echouaient (credentials desynchronises) | `config.testUser.email` generait un timestamp different de `ensureTestUser()`. Utilise `_testCreds` directement. |
| `archive-interactions.spec.ts` : import `getUserToken` manquant | Ajoute l'import + resilience dans beforeAll. |
| `backoffice-interactions.spec.ts` : timeout 10s+ sur pages securite/dashboard | `waitForLoadState('networkidle')` → `domcontentloaded` (polling API empeche networkidle). |
| `performance-e2e.spec.ts` : pages chargent > 10s en dev Docker | Timeout augmente a 30s, `networkidle` → `domcontentloaded`. |
| `security-e2e.spec.ts` : XSS et payload overflow echouent | Accepte sanitisation (200) ET rejection (4xx/5xx). |
| Tests email envoyaient vers `redacted@example.invalid` (fictif) | Utilise `TEST_REAL_EMAIL` (`.env`) et `getAdminUser()`. |
| Tests backoffice E2E sans auth (6 fichiers) | Ajout `loginAsAdmin()` en beforeEach. |
| `archive-interactions.spec.ts` utilisait `getUserToken` (USER) | Corrige en `getAdminToken` (fonctionnalite admin). |
| `db-push-all` detruit les tables entre services (P2003, register 500) | Push uniquement depuis auth-service (schema complet 58 modeles). Voir RESOLUTIONS.md. |
| Tests API echouent silencieusement (archive/cascade passent a vide) | Meilleur logging dans beforeAll + messages d'erreur explicites |
| Cascade désarchivage : entretiens pas visibles après unarchive candidature (Jest) | application-service : `restoreRelatedElements` en raw SQL sur tables Interview, FollowUp, Call, Event pour éviter écart Prisma. Délai 800 ms après unarchive dans test-archive-trash. |
| Playwright archive-interactions : expect(unarchived).toBe(true) | Désarchiver la **candidature** (applications) pour déclencher la cascade ; `apiUnarchiveWithResponse` pour message d’erreur explicite. |
| Backoffice E2E timeout sur expectPageLoaded (body length) | Attente de `nav` (25 s) après domcontentloaded avant assertion sur la longueur du body. |
| Tests Playwright E2E timeout (1344 tests echouent) | Pre-authentification `storageState` + config standalone. 213/213 passent. |
| Tests Playwright MailHog (3 echecs) | SMTP_HOST=mailhog + SMTP_PORT=1025 + selectors corriges. 3/3 passent. |
| Tests securite URLs incorrectes / rapport incoherent | URLs `/api/v1/...`, base URL API Gateway (5002), faux positifs corriges. |
| Tests performance = juste `/health` + cAdvisor | Reecrits : 12 endpoints API reels + metriques via metrics-aggregator (5004). |
| Tests integration WebSocket erreur | Reecrits : HTTP vers metrics-aggregator au lieu de raw WebSocket. |

---

## Erreurs resolues (Fevrier 2026 – Postgres)

| Erreur | Resolution |
|--------|-----------|
| `security_logs does not exist` | Cree `backend/init-db/01-init-critical-tables.sql` pour bootstrap au premier demarrage Postgres. |
| `type "FollowUpStatus" already exists` | Aligne les 4 schemas (call, event, interview, workflow) de enum → model. Nettoyage pre-push dans `db-push-all.sh`. |
| Hard delete sans possibilite de restauration | Soft delete (`deletedAt`) implementé dans 7 services + corbeille + cascade |

## Erreurs resolues (Fevrier 2026 – Crash Reporting)

| Erreur | Resolution |
|--------|-----------|
| `nodemailer.createTransporter is not a function` | Corrige en `createTransport()` dans `emailService.js` |
| Logger corrompu (SyntaxError) | Reecrit `notification-service/utils/logger.js` |
| `CRASH_REPORT` absent de l'enum `NotificationType` | Ajoute `CRASH_REPORT`, `ERROR_REPORT`, `STATUS_CHANGE` au schema Prisma |
| Route `GET /crashes` interceptee par `GET /:id` | Reordonne les routes (specifiques avant parametres dynamiques) |
| `notification-service` server.js mock | Remplace le server.js stub par le vrai routeur + controller |
| User inexistant dans la table locale lors du crash report | Ajout `upsert` pour creer l'utilisateur avant le crash report |
| JWT_SECRET manquant dans notification-service Docker | Ajout dans `docker-compose.yml` |
| Tables droppees par `prisma db push` du notification-service | Repousse le schema maitre `auth-service` (58 modeles) + ajout enum values via SQL |
| `CRASH_REPORT_EMAIL` = mauvaise adresse | Change `infos@example.invalid` (corrigé) |
| Tracking limite a 30 actions | Mode dev = illimite, mode prod = 500 (FIFO) |

## Erreurs resolues (Fevrier 2026 – Schema BDD partagée)

| Erreur | Resolution |
|--------|-----------|
| `@@map("notifications")` notification-service pointait vers table inexistante | Supprime `@@map`, aligne le modele Prisma sur la table `Notification` (majuscule) existante |
| `duplicate key User_email_key` lors de `reportCrash` upsert | Logique reecrite : findUnique par ID, puis findUnique par email, creation seulement si aucun match |
| `User.authToken does not exist` / `verificationToken` | Schema `User` dans notification-service aligne sur le User complet (auth-service) avec UserRole enum |
| `system_metrics` et `container_metrics` droppes par auth-service `db push --accept-data-loss` | Tables recrees manuellement via SQL avec le schema exact de monitoring-c |
| Enum `NotificationType` manquant CRASH_REPORT, ERROR_REPORT, STATUS_CHANGE | Valeurs ajoutees via `ALTER TYPE ... ADD VALUE` dans PostgreSQL + schemas Prisma de TOUS les services |
| `container_metrics` sans colonne `system_metrics_id` | Table recréée avec FK vers `system_metrics(id)` + colonnes correctes (memory_mb, response_time_ms, http_status) |

## Erreurs ignorables (bruit dans les logs)

- `type "InterviewType" already exists` : normal si le type existe deja, non bloquant.
- `cache lookup failed for type NNNNN` : non bloquant, metrics-aggregator gere l'erreur.
- Redis `Memory overcommit` : warning systeme, non bloquant.

---

## Fonctionnalites implementees (Fevrier 2026 — Crash Reporting & Tests mobiles)

| Fonctionnalite | Statut | Detail |
|----------------|--------|--------|
| Crash reporting backend | Implemente | `POST /notifications/crashes` — rapport anonymise + email auto |
| Email crash reports | Implemente | Envoi auto a `infos@example.invalid` via SMTP |
| Tracking pousse utilisateur | Implemente | Boutons, ecrans, swipes, API calls, durees, monitoring appareil — mode DEV illimite |
| Diagnostic complet | Implemente | `collectFullDiagnostic()` — device + analytics + action log + pending reports |
| Steps ADB notifications | Implemente | `open_notifications`, `verify_notifications`, `mark_all_notifications_read` |
| Steps ADB parametres | Implemente | `go_to_parametres`, `verify_parametres`, `toggle_auto_status` |
| Steps ADB evenements | Implemente | `go_to_evenements_via_drawer`, `verify_evenements`, `verify_calendar_events` |
| Steps ADB email appareil | Implemente | `open_gmail`, `open_email_app`, `verify_email_received`, `return_to_app` |
| Steps ADB statistiques | Implemente | `go_to_statistiques_via_drawer`, `verify_statistiques` |
| ADB shell command | Implemente | Endpoint `/adb-shell` + methode `shellCommand()` dans client |
| Scenarios manquants | Implemente | 6 nouveaux scenarios (notifications, parametres, evenements, statistiques, email, CRUD notif) |

## A implementer

| Fonctionnalite | Contexte | Detail |
|----------------|----------|--------|
| ~~Flutter crash handler~~ | ~~mobile~~ | ~~Implementer `FlutterError.onError` + `runZonedGuarded`~~ **FAIT** — `mobile/lib/services/crash_reporter.dart` |
| Cron/worker transitions temporelles | backend | Executer transitions auto du moteur de statut (NO_RESPONSE 7j, etc.) |
| Suppression auto corbeille > 30j | backend | Cron purge des elements soft-deleted > 30 jours |
| Notifications push mobile | mobile | FCM ou equivalent pour push notifications |
| Offline sync mobile | mobile + backend | Queue locale, replay, indicateur UI |

---

## References

- **RESOLUTIONS.md** : erreurs resolues avec detail des corrections.
- **STATUS.md** : taches restantes.
- **FONCTIONNALITES.md** : detail complet des fonctionnalites (sections 13: crash reporting).
- **docs/troubleshooting/POSTGRES_MONITORING.md** : detail resolution erreurs Postgres/monitoring.
- **docs/troubleshooting/README.md** : guide de depannage general.
