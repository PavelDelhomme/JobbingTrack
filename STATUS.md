# JobbingTrack - Statut du projet

**Derniere mise a jour** : 27 fevrier 2026

---

## Recap rapide (ce qui fonctionne)

Stack 21/21 services, 47 tables, Tests API 61 (archivage + cascade + BDD), Playwright E2E 233, MailHog 3/3, Securite 64, Performance 15/15, Integration OK, 21 parcours, SMTP/MailHog, hub Tests, soft delete + corbeille + archivage 7 services, cascade statuts + archivage, auto-events, module ADB mobile reutilisable (28 scenarios, 100+ steps), parcours mobile dans journey-builder (30+ steps mobiles integres), crash reporting backend + email auto (infos@example.invalid), ADB shell command, test email sur appareil, tracking pousse utilisateur (boutons, ecrans, swipes, API calls, durees, monitoring appareil), mode DEV illimite / mode PROD 500 actions. Detail : `RESOLUTIONS.md`.

---

## Etat actuel (27 fevrier 2026)

- **Parcours utilisateur mobile** : 22 scenarios predefinis organises en 5 categories (auth, navigation, verification, crud, complet). **Emulateur** : liste complete des parcours avec **6 parcours principaux** en tête (Inscription complète, Reset mot de passe, Première utilisation, Usage quotidien, Archives & Corbeille, Parcours complet), tous lancables depuis l’interface après sélection d’un appareil ADB. Module ADB reutilisable (`tools/adb-lib/`, `frontend/src/lib/adb/`) avec 6 methodes d'utilisation (client direct, flows, actions parametrees, scenarios, runner actions, runner custom). 28 steps mobiles integres dans `journey-builder.js`.
- **Tests** : corrections appliquees (activities→statusHistory, isUUID→isString, api-e2e credentials, networkidle, enums NotificationType, CRUD admin company size). Suite partiellement en echec : 7 echecs (Enums et « creer une entreprise » corriges ; restent status-engine, Playwright CRUD users, Securite, Email Workflows a stabiliser).
- **Backoffice Analytics utilisateur** : page resilient si requete events bloquee (uBlock) : chargement partiel + message onglet Evenements.
- **Rapports de tests** : view utilise `USER_JOURNEY_REPORTS_DIR` (aligné avec la liste) ; message 404 explicite ; JSON des résultats échappé (plus de « Test inconnu ») ; script `scripts/compress-old-reports.sh` pour compresser les rapports de plus de N jours.
- **Backend CRUD** : mise à jour complète des champs pour candidature (whitelist), entretien (feedback, outcome, type/style), relance (response, type/method), appel (followUpId, callTypeId), événement (reminder, color, callId, eventTypeId), contact (whitelist).
- **Mobile** : formulaire candidature complet (création + édition) avec tous les champs ; écrans entretien / relance / appel / événement / contact à compléter sur le même modèle.
- **Notifications auto** : cron workflow-service — rappel entretien &lt; 24h (8h), « Penser à relancer » candidatures &gt; 7j (9h30), rappels relances du jour (10h) ; notifications in-app créées en BDD.
- **Tests mobiles** : tests E2E mobile existants (7 fichiers mobile-*.spec.ts). Module ADB avec 70+ steps couvrant navigation, verification ecrans, CRUD, relances, recherche.
- **CI/CD** : pipeline GitHub Actions a implementer une fois la suite de tests stable.
- **Moteur de statut** : cascade statuts existante (entretien → INTERVIEW_PENDING/DONE, outcome → OFFER_RECEIVED/REJECTED). Moteur intelligent a implementer (transitions temporelles, option auto/manuel).
- **Phase 3** : interactions backoffice en cours (CRUD, export/import, pagination).
- **Processus metier mobile** : 17 processus documentes dans `FONCTIONNALITES.md` section 10 (candidature, relance, entretien, appel, contact, statut intelligent, swipe, suppression, archivage, auto-creation entreprise, liaisons, calendrier).

---

## A faire maintenant

### ~~Phase 2 : Archivage complet~~ FAIT

- [x] `isArchived` + `archivedAt` ajoutes aux schemas Prisma : Interview, Call, FollowUp, Event, Company (45 modeles patches dans 9 fichiers)
- [x] Endpoints `POST /:id/archive`, `POST /:id/unarchive`, `GET /archived` pour 7 services
- [x] Cascade archivage : archiver candidature → archiver (isArchived) entretiens, relances, appels, evenements lies
- [x] Cascade desarchivage : desarchiver candidature → desarchiver les elements lies
- [x] Filtrage `isArchived: false` dans toutes les requetes normales
- [x] Suppression auto corbeille > 30 jours (cron job ou worker)
- [x] Tests E2E archivage/restauration effective

### Phase 3 : Interactions backoffice approfondies

#### 3.1 CRUD complet et modification de tous les champs
- [x] Modification entreprise (tous les champs : nom, site web, secteur, taille, localisation, adresse, ville)
- [x] Modification candidature (tous les champs : poste, description, URL offre, contrat, mode travail, salaire, notes, plateforme)
- [x] Modification entretien (date, type, style, duree, lieu/lien, contacts, notes, feedback, resultat)
- [x] Modification relance (date, type, methode, contacts, notes, reponse)
- [x] Modification appel (date, type, duree, sujet, notes, statut)
- [x] Modification evenement (titre, dates, type, couleur, rappel, lien entite)
- [x] Modification contact (tous les champs)

#### 3.2 Systeme de statuts avec cascade
- [x] Changement statut candidature avec historique (`ApplicationStatusHistory`)
- [x] Statuts candidature : CANDIDATE_PENDING → INTERVIEW_PENDING → INTERVIEW_DONE → OFFER_RECEIVED → REJECTED/WITHDRAWN
- [x] Mise a jour automatique statut candidature quand entretien cree → `INTERVIEW_PENDING`
- [x] Mise a jour automatique statut candidature quand entretien complete → `INTERVIEW_DONE`
- [x] Mise a jour automatique statut candidature quand resultat entretien positif → `OFFER_RECEIVED`
- [x] Mise a jour automatique statut candidature quand resultat entretien negatif → `REJECTED`
- [x] Mise a jour automatique statut candidature quand entretien annule → `CANDIDATE_PENDING`
- [x] Notification auto quand candidature sans reponse > 7 jours → "Penser a relancer" (cron 9h30)
- [x] Notification auto quand entretien dans < 24h → rappel (cron 8h)
- [x] Notification auto quand relance en retard / à faire (cron 10h, relances du jour)

#### 3.2b Moteur de statut intelligent (voir FONCTIONNALITES.md 10.6)
- [x] Preference utilisateur : mode auto (changements de statut automatiques) vs manuel (utilisateur gere tout)
- [x] Champ `autoStatusEnabled` dans les preferences (`PUT/GET /api/v1/auth/preferences`, default: true)
- [ ] **Transition auto** `CANDIDATE_PENDING` → `NO_RESPONSE` apres 7 jours sans action (cron ou job)
- [ ] **Notification** apres relance sans reponse > 5 jours (« Relance sans réponse »)
- [ ] **Notification** apres entretien passe sans retour > delai annonce (ou 7j) (« Retour entretien attendu »)
- [ ] **Suggestion** « Considerer comme rejetee ? » apres 3+ relances sans reponse (affichage UI + action possible)
- [x] Action "Rejet recu" → passage immediat a `REJECTED` (PUT /applications/:id/status, commentaire)
- [ ] Action "Email remerciement envoye" → reset compteur relance
- [x] Facteurs pris en compte : temps ecoule, nombre relances, entretiens passes, feedback (structure en place)
- [x] Tests API : `tests/api/test-status-engine.test.js` + `tests/api/test-status-cascade.test.js`
- [x] Tests E2E Playwright moteur statut : `frontend/tests/e2e/status-engine.spec.ts`
- [x] Module parcours : `tests/user-journey/modules/step-status-engine.js` + parcours `status_engine` / `status_lifecycle`
- [x] Option par candidature : champ `statusEngineOptOut` sur Application — desactiver le moteur auto pour une seule candidature (voir 10.6)
- **À venir** : quand les transitions/notifications ci‑dessus seront implémentées, ajout de tests dédiés (API + E2E + parcours) et mise à jour des rapports.

#### 3.3 Auto-creation d'evenements
- [x] Creation candidature → cree evenement "Candidature envoyee"
- [x] Creation entretien → cree automatiquement un evenement calendrier avec rappel 30min
- [x] Creation relance → cree automatiquement un evenement calendrier avec rappel 1h
- [x] Appel programme → cree automatiquement un evenement calendrier avec rappel 15min
- [ ] Changement statut → cree notification
- [ ] Evenements auto-generes par le moteur de statut (rappel relance, date retour depassee)

#### 3.4 Export / Import donnees
- [ ] Export CSV des candidatures, entreprises, contacts
- [ ] Export JSON des donnees utilisateur
- [ ] Import CSV/JSON (avec validation et preview)
- [ ] Interface backoffice pour export/import

#### 3.5 Verification email utilisateur
- [x] Endpoint `POST /api/v1/auth/verify-email/:token` fonctionnel
- [x] Envoi email verification a l'inscription
- [ ] Page de confirmation "Email verifie" (frontend)
- [x] Login refusé (401, code EMAIL_NOT_VERIFIED) si email non vérifié
- [x] Test E2E workflows email : `tests/e2e/specs/email-workflows.spec.ts` (inscription → vérification via MailHog → login ; login refusé sans vérification)

#### 3.6 Pagination et tri des listes
- [ ] Pagination coherente sur toutes les listes (page, limit, total, pages)
- [ ] Tri par colonne (date, nom, statut) sur toutes les listes
- [ ] Recherche/filtrage avance sur toutes les listes
- [ ] Tests E2E pagination et tri

#### 3.7 Tests interactions approfondies
- [x] **Suite de tests complète pour le système de statuts avec cascade et moteur intelligent** :
  - **API** : `tests/api/test-status-cascade.test.js` (cascade entretien → INTERVIEW_PENDING/DONE, outcome → OFFER_RECEIVED/REJECTED, auto-événements, historique, PUT /status, isArchived) ; `tests/api/test-status-engine.test.js` (préférence auto/manuel, mode manuel sans cascade, mode auto avec cascade, rejet direct, config, historique, time-travel).
  - **E2E Playwright** : `frontend/tests/e2e/status-engine.spec.ts` (préférences, cascade auto, pas de cascade manuel, changement manuel, historique, rejet direct).
  - **Parcours utilisateur** : `tests/user-journey/modules/step-status-engine.js` ; parcours prédéfinis `status_engine` et `status_lifecycle` dans `journey-builder.js`.
  - **Rapports** : ces tests sont inclus dans « Tests API Complets (Jest) » et « Tests API Backend (script) » du script `scripts/run-all-tests-with-reports.sh`.
- [x] Tests API archivage/desarchivage/corbeille/cascade : `tests/api/test-archive-trash.test.js` (19 tests)
- [x] Tests API cascade statuts + auto-evenements : `tests/api/test-status-cascade.test.js` (12 tests)
- [x] Tests BDD/integration relations et cascade : `tests/api/test-bdd-relations.test.js` (14 tests)
- [x] Tests E2E Playwright interactions : `frontend/tests/e2e/archive-interactions.spec.ts` (17 tests dont cascade restauration corbeille)
- [x] Helpers E2E enrichis : `apiCreateApplication`, `apiCreateInterview`, `apiArchive`, `apiUnarchive`, `apiRestore`
- [x] Tests API moteur de statut intelligent : `tests/api/test-status-engine.test.js` (10 tests : auto/manuel, cascade, config, rejet, historique, time-travel)
- [x] Tests E2E Playwright moteur statut : `frontend/tests/e2e/status-engine.spec.ts` (7 tests : auto/manuel, cascade, historique, rejet, config)
- [x] Module parcours utilisateur moteur statut : `tests/user-journey/modules/step-status-engine.js`
- [x] Parcours predefinis : `status_engine` et `status_lifecycle` dans journey-builder
- [ ] Tests swipe et actions rapides sur listes mobiles
- [ ] Tests export/import donnees
- [ ] Tests verification email
- [ ] Tests pagination et tri

#### 3.8 Architecture des tests — FAIT
- [x] **Separation USER / ADMIN**
- [x] Helpers `getTestUser()` + `getAdminUser()`
- [x] `ensureTestUser()`, `getAdminToken()`, `loginAsAdmin()`
- [x] Rapport de tests avec badge type utilisateur

#### 3.9 Email de test reel + securisation credentials — FAIT
- [x] `TEST_REAL_EMAIL` dans `.env`
- [x] Tests email avec `getAdminUser()`

#### 3.10-3.13 — FAIT (voir historique)

#### 3.14 CI/CD GitHub Actions — A FAIRE
- [ ] Pipeline GitHub Actions pour les microservices (build + test)

### Phase 3.5 : Processus metier mobile (NOUVEAU)

> Detail complet : `FONCTIONNALITES.md` section 10

#### Swipe et suppression
- [ ] Swipe gauche/droite sur toutes les listes (candidatures, contacts, entreprises, relances, entretiens, appels)
- [ ] Dialog confirmation suppression
- [ ] Undo/annuler 5 secondes via snackbar
- [ ] Suppression definitive avec confirmation renforcee
- [ ] Auto-suppression corbeille > 30 jours (cron)
- [ ] Cascade suppression candidature → relances, entretiens, appels, evenements

#### Creation et liaisons
- [ ] Formulaire creation candidature (FAB + depuis liste)
- [ ] Auto-creation entreprise lors creation candidature ou contact
- [ ] Contact standalone ou lie a candidature (3 cas)
- [ ] Entretien UNIQUEMENT depuis detail candidature (jamais standalone)
- [ ] Relance UNIQUEMENT depuis detail candidature
- [ ] Appel via candidature (liaison correcte avec entreprise)
- [ ] Contact inline lors creation entretien/relance/appel
- [ ] Liaison auto contact ↔ entreprise via ContactCompany

#### Archivage
- [ ] Archiver candidature + cascade (relances, entretiens, appels, evenements)
- [ ] Archiver contact
- [ ] Desarchiver + reactivation evenements
- [ ] Page Archives dans drawer

### Phase 4 : Synchronisation mobile / API

#### 4.1 Architecture sync
- [ ] Endpoint `POST /api/v1/sync/push` : envoyer les actions locales vers le serveur
- [ ] Endpoint `GET /api/v1/sync/pull?since=<timestamp>` : recuperer les modifications serveur
- [ ] Endpoint `GET /api/v1/sync/status` : etat de la derniere sync
- [ ] Modele `SyncQueue` : deja en BDD, ajouter les routes dans un sync-service ou dans api-gateway
- [ ] Gestion des conflits : hash de sync (`syncHash`, `entityHash`) pour detecter les modifications concurrentes
- [ ] Strategie : **last-write-wins** avec notification en cas de conflit

#### 4.2 Implementation mobile (Flutter)
- [ ] Queue locale (SQLite/Hive) pour stocker les actions offline
- [ ] Replay des actions a la reconnexion (CREATE, UPDATE, DELETE dans l'ordre)
- [ ] Indicateur de statut de sync dans l'UI (barre de progression, icone)
- [ ] Detection connectivite (online/offline) avec gestion gracieuse

#### 4.3 Tests sync
- [ ] Test API push/pull avec donnees de test
- [ ] Test conflit : modification simultanee depuis 2 appareils
- [ ] Test offline → online : actions en queue rejouees correctement
- [ ] Test mobile E2E : couper le reseau, effectuer des actions, reconnecter

### Phase 5 : Tests pour gestion du temps

> Pour tester les fonctionnalites temporelles (statut auto apres 7j, relance en retard, etc.)

#### 5.1 Strategie de test temporel
- [ ] Helper `timeTravel(days)` : modifier la date de creation d'une candidature via API admin
- [ ] Helper `setApplicationDate(id, date)` : backdater une candidature
- [ ] Helper `setFollowUpDate(id, date)` : backdater une relance
- [x] Endpoint `PUT /api/v1/applications/admin/test/time-travel` : backdater les entites (application, interview, followup, call, event)
- [x] Variable d'environnement `ENABLE_TIME_TRAVEL=true` pour activer l'endpoint (retourne 403 si desactive)

#### 5.2 Tests API temporels
- [ ] `test-status-engine.test.js` : tester les transitions temporelles
  - Creer candidature → backdater 8j → verifier que statut passe a NO_RESPONSE
  - Creer relance → backdater 6j → verifier notification "relance sans reponse"
  - Creer entretien passe → backdater 8j → verifier notification "date retour depassee"
  - Creer 3 relances sans reponse → verifier suggestion "considerer rejetee"

#### 5.3 Tests parcours mobile temporels
- [x] `step-status-engine.js` : module de test pour le moteur de statut
  - Via API : creer candidature, backdater, verifier statut auto
  - Via API : creer relances multiples, verifier suggestions
  - Via mobile (ADB) : verifier que les notifications apparaissent dans l'UI
  - Via mobile (ADB) : verifier les badges de statut sur les cartes candidature

#### 5.4 Crash reporting & error detection
- [x] Endpoint `POST /notifications/crashes` — sauvegarde + email auto
- [x] Endpoint `GET /notifications/crashes` — lecture paginee des crash reports
- [x] Email crash report a `infos@example.invalid`
- [x] Anonymisation des rapports
- [x] Handler Flutter (`FlutterError.onError` + `PlatformDispatcher.onError`)
- [x] Service `CrashReporter` dans l'app Flutter (queue, flush, tracking pousse)
- [x] Tracking pousse : boutons, ecrans, swipes, API calls, form submits, durees, monitoring appareil
- [x] Mode DEV : tracking illimite — toutes les actions conservees
- [x] Mode PROD : 500 actions max (FIFO), 100 dernieres dans les rapports
- [x] `getAnalyticsSummary()` : resume session (taps, swipes, navigations, durees par ecran)
- [x] `getDeviceMonitoring()` : OS, version, CPU, locale, hostname
- [x] `collectFullDiagnostic()` : diagnostic complet exportable
- [x] Integration dans AuthProvider (token auto, tracking login/logout)
- [x] Tests API : 11/11 (`tests/api/test-crash-reporting.test.js`)
- [x] Tests Playwright E2E : 10/10 (`frontend/tests/e2e/crash-reporting.spec.ts`)
- [x] Parcours utilisateur : 6/6 (`tests/user-journey/modules/step-crash-reporting.js`)
- [x] Parcours ADB test email sur appareil (`mobile_test_email`)
- [x] Parcours predefini `crash_reporting` et `full_with_crash` dans journey-builder

#### 5.5 Parcours mobiles etendus (100+ steps)
- [x] Notifications : `open_notifications`, `verify_notifications`, `mark_all_notifications_read`
- [x] Parametres : `go_to_parametres`, `verify_parametres`, `toggle_auto_status`
- [x] Evenements : `go_to_evenements_via_drawer`, `verify_evenements`, `verify_calendar_events`
- [x] Email appareil : `open_gmail`, `open_email_app`, `verify_email_received`, `return_to_app`
- [x] Statistiques : `go_to_statistiques_via_drawer`, `verify_statistiques`
- [x] Shell command ADB : endpoint `/adb-shell` + methode client
- [x] 6 nouveaux scenarios predefinis

---

## Plus tard (voir `docs/BACKLOG.md`)

| Tache | Detail |
|-------|--------|
| API versioning | 404 sur `GET /api/v1/analytics/stats/:userId/versions` |
| Rapports par categorie | Organiser `tests/results/` en sous-dossiers par type |
| Lancement tests depuis hub | Clic + verification resultat dans l'interface |
| Flutter crash handler | Implementer intercepteur crash dans l'app Flutter |
| Cron worker transitions temporelles | Executer les transitions auto du moteur de statut |
| Push notifications mobile | FCM / APNs pour notifications temps reel |
| App mobile Flutter | Auth, dashboard, CRUD, calendrier, notifications, sync offline (voir `FONCTIONNALITES.md` Phase 4) |
| Emulateur mobile build/run | `flutter_local_notifications` erreur compilation |
| CI/CD | Pipeline GitHub Actions (microservices) |
| Securite avancee | WAF reelle, tests enrichis |
| Deploiement | Depuis backoffice, Docker Hub, scripts SSH |
| Documentation API | Swagger/OpenAPI |

**Note emulateur** : l'emulateur ne demarre **pas** avec `make up-full` (c'est voulu). Lancer `make emulator-controller` dans un 2e terminal, puis ouvrir http://localhost:5003/backoffice/mobile-emulator.

---

## Dernier rapport de test (26/02/2026 - 13h56)

`tests/results/20260226-134610/summary.json` - **216 tests, 209 passes, 96.8%** → corrections appliquees

| Categorie | Statut | Detail |
|-----------|--------|--------|
| User Journey (API) | OK | 15/15 |
| Relations BDD | OK | 4/4 |
| Enums | OK | 3/3 |
| Email Logs | OK | 1/1 |
| Tests API Jest | **Fix** | cascade `activities→statusHistory` + `isUUID→isString` |
| Tests Backend Jest | OK | 13/13 |
| Tests API Backend (script) | OK | 47/47 |
| **Playwright E2E** | **Fix** | credentials, imports, networkidle corriges |
| **Playwright MailHog** | **OK** | **3/3** |
| **Playwright Email Workflows** | **Nouveau** | inscription, reset password, email reel |
| **Playwright CRUD Donnees** | **Nouveau** | CRUD complet 7 entites + archivage |
| **Playwright CRUD Utilisateurs** | **Nouveau** | gestion utilisateurs admin |
| **Playwright Securite Backoffice** | **Nouveau** | firewall, WAF, menaces, logs |
| Frontend Jest | OK | |
| **Performance** | **OK** | **15/15, score 100/100** |
| **Securite** | **OK** | **64 securisees, 0 critique** |
| **Integration** | **OK** | **7 OK, 0 echec** |
| API Gateway Health | OK | |
| Securite Firewall & WAF | OK | 15/15 |

---

## Module ADB mobile (NOUVEAU)

| Composant | Fichiers | Description |
|-----------|----------|-------------|
| Librairie Node.js | `tools/adb-lib/` (6 fichiers + 6 exemples) | Client ADB reutilisable, 19 actions parametrees, 17 scenarios, runner, shell command, email app |
| Frontend TS | `frontend/src/lib/adb/` (6 fichiers) | 28 scenarios, 100+ steps, integration UI emulateur |
| Journey builder | `tests/user-journey/journey-builder.js` | 30+ steps integres (actions, scenarios, flows, moteur statut) |
| Emulator controller | `tools/emulator-controller/server.js` | Build APK, install (-r), launch, shell command, screenshot, input |

**Usage rapide** :
```bash
# Depuis n'importe quel script Node.js
const adb = require('../../tools/adb-lib');
const phone = await adb.connect();
await adb.flows.loginFresh(phone);
await adb.flows.navigateAllTabs(phone);
await adb.runScenario('complete');
```

---

## Etat en un coup d'oeil

| Categorie | Fait | Reste |
|-----------|------|-------|
| Stack / BDD | 21/21 services, 47 tables, monitoring OK, soft delete + corbeille + archivage | Unifier schemas Prisma, cron purge corbeille |
| Backoffice | Connexion admin, hub Tests, parcours, rapports, E2E 233 | CRUD complet, export/import, verif email |
| Parcours | 22 scenarios mobile + 21 API, personnalise, rapports | Tests temporels |
| Tests | API 61, E2E 233, MailHog 3/3, Securite 64/64, Perf 15/15, Integration OK | Tests moteur statut, swipe, sync |
| Emails | SMTP OK, MailHog OK, pages backoffice | Verification email inscription |
| Mobile | Module ADB complet, 70+ steps, rendu emulateur, ecrans auth | CRUD forms, swipe, sync offline |
| Moteur statut | Cascade basique (entretien→statut), historique | Transitions temporelles, auto/manuel, notifications |
| Sync | Modele SyncQueue en BDD | Endpoints API, implementation mobile |
| CI/CD | -- | Pipeline a adapter |

### Couverture fonctionnelle par catégorie de test (make test-all / test-full)

| Catégorie (rapport) | Ce qui est testé |
|---------------------|-------------------|
| **User Journey (API)** | Parcours complet : auth, companies, applications, contacts, interviews, calls, followups via API. |
| **Relations BDD** | Tables de jonction, contraintes, clés étrangères (auth-service). |
| **Enums** | Valeurs des enums Prisma cohérentes avec la BDD. |
| **Email Logs** | Présence et lisibilité des logs d’emails en BDD. |
| **Tests API Complets (Jest)** | Archivage, cascade statuts, auto-events, BDD relations, status-engine, crash-reporting (tests/api/). |
| **Tests Backend Services** | Health / CRUD des microservices (company, contact, application, interview, call, followup, event, etc.). |
| **Playwright E2E Frontend** | Backoffice : dashboard, session, CRUD entreprises, sécurité (XSS, payload overflow, path traversal), performance, moteur de statut (status-engine.spec.ts). |
| **Playwright Emails MailHog** | Envoi email test, réception dans MailHog, reset password avec lien. |
| **Playwright Email Workflows** | Inscription + vérification email, forgot-password, page forgot-password. |
| **Playwright CRUD Données (admin)** | CRUD entreprise, contact, candidature, entretien, relance, appel, événement, archivage, corbeille, restauration. |
| **Playwright CRUD Utilisateurs (admin)** | Liste utilisateurs, création, connexion du nouvel utilisateur, modification rôle, désactivation, profil admin. |
| **Playwright Sécurité Backoffice** | Firewall, WAF, IPs bloquées, menaces, logs de sécurité. |
| **Tests Performance** | Latence des endpoints, charge parallèle, métriques système, stress mémoire. |
| **Tests Sécurité** | XSS, SQL injection, CSRF, auth, rate limiting, en-têtes, validation des entrées. |
| **Tests Intégration** | Health API, métriques système, services Docker, persistance. |
| **Tests API Gateway Health** | Health + métriques Prometheus du gateway. |
| **Tests Sécurité Firewall & WAF** | Règles firewall, blocage IP, menaces, config WAF, logs. |

Les rapports sont dans `tests/results/<timestamp>/`. Le backoffice affiche le rapport HTML via une iframe (Blob URL) pour éviter les erreurs de parsing ; la sortie des tests est échappée en HTML dans le script de génération. En cas d’échec, consulter les fichiers JSON par catégorie dans le même dossier et les logs des services (si disponibles via metrics-aggregator).

---

## Historique (taches completees)

<details>
<summary>Cliquer pour voir les taches terminées</summary>

### Tracking pousse & correction BDD — FAIT (26/02/2026)
- Tracking utilisateur pousse dans `CrashReporter` : boutons, ecrans, swipes, API calls, form submits, durees par ecran, monitoring appareil.
- Mode DEV illimite, mode PROD 500 actions (FIFO).
- Email crash report change : `infos@example.invalid` (corrigé).
- Correction massive BDD : tables droppees par `prisma db push` notification-service → repousse schema maitre auth-service (58 modeles) + ajout enum values SQL + restart monitoring-c.
- Zero erreurs Postgres apres correction.

### Module ADB mobile — FAIT (23/02/2026)
Module `tools/adb-lib/` : client, actions, flows, scenarios, runner. 6 exemples. 28 steps mobiles integres dans journey-builder.js. Interface emulateur avec filtres par categorie (22 scenarios, 5 categories).

### Documentation processus metier — FAIT (23/02/2026)
17 processus documentes dans `FONCTIONNALITES.md` section 10 : candidature, relance, entretien, appel, contact, statut intelligent, swipe, suppression, archivage, auto-creation entreprise, liaisons, calendrier.

### Corriger les tests Playwright E2E — FAIT
Pre-authentification `storageState`, 213/213 tests passent.

### MailHog — FAIT
Bugs data.items + selectors corriges, 3/3 passent.

### Rapports de tests — FAIT
Tri par date + noms corriges.

### Tests securite, performance, integration — FAIT
URLs corrigees, scripts reecrits, faux positifs elimines.

### Erreurs Postgres au demarrage — RESOLU
`security_logs` : init-db SQL. `FollowUpStatus` : enum → model dans 4 schemas.

### Systeme corbeille (soft delete) — FAIT
Soft delete dans 7 services, 6 archive controllers, cascade logique, filtrage `deletedAt: null`.

### db-push-all detruisait les tables — RESOLU
Push uniquement depuis auth-service (58 modeles).

### Archivage complet + cascade statuts — FAIT
`isArchived`/`archivedAt` sur 5 entites, cascade archivage/desarchivage, statuts auto, auto-creation evenements calendrier.

### Tests API archivage/cascade/BDD — FAIT
61 tests Jest + 16 tests E2E Playwright.

### Architecture tests USER/ADMIN — FAIT
Separation roles, helpers, rapport avec badge utilisateur.

### Schema BDD partagee (notification-service) — RESOLU
`@@map("notifications")` supprime, modele `User` complet avec `UserRole` enum, logique `reportCrash` reecrite.

### Enum NotificationType — RESOLU
CRASH_REPORT, ERROR_REPORT, STATUS_CHANGE ajoutes dans les 10 schemas Prisma + BDD PostgreSQL.

### Tables monitoring-c (system_metrics/container_metrics) — RESOLU
Recreees manuellement apres suppression par `prisma db push --accept-data-loss`. Schema exact de `storage.c`.

### Crash reporter Flutter enrichi — FAIT
Monitoring memoire (RSS/MaxRSS), tracking etendu (network_error, scroll, long_press, dialog, lifecycle), diagnostic complet avec actionsByType et errorActions.

</details>

---

## Demarrage rapide

```bash
make rebuild && make up-full && make db-push-all && make status
```

---

## Documentation

| Sujet | Fichier |
|-------|---------|
| Fonctionnalites completes | `FONCTIONNALITES.md` |
| Backlog complet | `docs/BACKLOG.md` |
| Demarrage complet | `docs/getting-started/DEMARRAGE.md` |
| Parcours metier | `docs/PARCOURS_METIER.md` |
| Ce qui est resolu | `RESOLUTIONS.md` |
| Erreurs connues | `ERRORS.md` |
| Performance | `TODO_PERFORMANCE.md` |
| Tests couverture E2E | `docs/tests/BACKOFFICE_TESTS_COVERAGE.md` |
| Schema BDD | `docs/database/SCHEMA_CHOIX.md` |
| Mobile checklist | `docs/mobile/APPLICATION_MOBILE_A_FAIRE.md` |
| Module ADB | `tools/adb-lib/index.js` (voir JSDoc en haut du fichier) |
| Deploiement | `docs/deployment/DEPLOIEMENT_FINAL.md` |
| Commandes utiles | `docs/COMMANDES_UTILES.md` |
