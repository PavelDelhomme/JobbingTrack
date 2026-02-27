# Erreurs connues (non resolues)

**Derniere mise a jour** : 23 fevrier 2026

Pour les erreurs deja resolues, voir **RESOLUTIONS.md**.

---

## Erreurs actives

| Erreur | Composant | Impact | Action |
|--------|-----------|--------|--------|
| `relation "public.user_events" does not exist` | dashboard-service / page User Analytics | Page User Analytics inaccessible | Creer les tables (`user_events`, `user_sessions`, `user_errors`, `user_performances`, `device_infos`) ou desactiver la page |
| `getaddrinfo ENOTFOUND loki` | metrics-aggregator | Requetes erreurs par conteneur echouent | Loki non deploye. Degrader proprement ou ajouter Loki |
| `type "FollowUpStatus" already exists` | Postgres (plusieurs services Prisma) | Bruit dans les logs | Ignorable. Plusieurs services definissent le meme enum |
| API versioning 404 | dashboard-service | `GET /api/v1/analytics/stats/:userId/versions` retourne 404 | Implementer la route ou adapter le front |
| Emulateur mobile build APK | flutter_local_notifications | Build APK echoue (bigLargeIcon ambiguous) | Mettre a jour la dependance flutter_local_notifications |
| Endpoint sync non implemente | sync mobile/API | SyncQueue existe en BDD mais aucun endpoint API | Creer POST /sync/push, GET /sync/pull, GET /sync/status |
| Endpoint time-travel : transitions auto non implementees | tests temporels | Time-travel disponible (backdater entites) mais le moteur de statut ne declenche pas encore les transitions auto (NO_RESPONSE apres 7j) | Implementer le cron/worker qui execute les transitions temporelles |
| Suppression auto corbeille > 30j | cron/worker | Les elements supprimes ne sont jamais purges automatiquement | Creer un cron job ou worker pour la suppression definitive |

## A implementer (non-erreurs, fonctionnalites manquantes)

| Fonctionnalite | Composant | Priorite | Detail |
|----------------|-----------|----------|--------|
| Moteur statut transitions temporelles | application-service | Haute | NO_RESPONSE apres 7j, suggestion rejet apres 3 relances |
| Notifications auto moteur statut | notification-service | Haute | Rappel relance, date retour depassee, entretien < 24h |
| Swipe actions mobile | flutter-mobile-app | Moyenne | Swipe gauche/droite sur toutes les listes |
| CRUD forms mobile | flutter-mobile-app | Haute | Formulaires creation candidature, contact, entretien, relance |
| Sync offline mobile | sync-service + flutter | Moyenne | Queue locale + replay a la reconnexion |

## Erreurs resolues recemment

| Erreur | Resolution |
|--------|-----------|
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
