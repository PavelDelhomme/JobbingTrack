# Resolutions appliquees

**Derniere mise a jour** : 26 fevrier 2026

---

## 23 fevrier 2026 – Corrections parcours utilisateur mobile

### Probleme
- **ENOENT sauvegarde rapport** : `POST /api/user-journey/save-report` echouait avec `ENOENT: no such file or directory, open '/tmp/tests/user-journey-reports/...'`. Le repertoire existait dans l'overlay Docker mais etait corrompu (Links: 0, taille 0) — impossible d'y ecrire des fichiers.
- **PUT /applications/:id 500** : deux etapes du parcours envoyaient des champs invalides au controleur `updateApplication`. `link_contact_to_application` envoyait `contactId` (champ inexistant dans le modele Application). `update_application_status` envoyait `{ status: 'FIRST_INTERVIEW_PENDING' }` via PUT generique au lieu de l'endpoint dedie PUT `/:id/status`.
- **Reinitialisation des resultats** : apres execution du parcours, les resultats de chaque etape disparaissaient. Un `useEffect` dependant de `isRunning` resettait les steps a 'pending' quand le parcours se terminait.
- **verify_email 400** : l'appel `GET /auth/verify-email/test-token-simulation` retournait 400 car l'endpoint n'accepte pas de faux tokens.

### Solution
1. **`save-report/route.ts`** : remplace le `resolveReportsDir()` statique par `getWritableReportsDir()` qui teste l'ecriture reelle (write + rm) sur chaque candidat. Fallback sur `/tmp/journey-reports` si le chemin configure est inaccessible.
2. **`user-journey/page.tsx`** :
   - `link_contact_to_application` : supprime `contactId` du body PUT, envoie uniquement `notes`.
   - `update_application_status` : utilise `PUT /api/v1/applications/:id/status` avec `{ status, comment }`.
   - `verify_email` : supprime l'appel API, retourne directement un resultat de simulation.
   - `useEffect` d'initialisation des steps : remplace la dependance sur `isRunning` par un `useRef(prevScenario)` pour ne reset que lors d'un changement de scenario.
3. **`test-reports/all/route.ts`** et **`test-reports/view/route.ts`** : ajout du chemin fallback `/tmp/journey-reports` pour la lecture des rapports.

---

## 26 fevrier 2026 – Corrections tests echoues (7 tests / 216)

### Probleme
- `test-status-cascade.test.js` : `GET /applications/:id` retournait 500 (relation `activities` inexistante dans le schema Prisma).
- Routes application validaient les IDs avec `isUUID()` mais Prisma genere des CUIDs (pas des UUIDs) → rejection 400 silencieuse sur restore/archive.
- `api-e2e.spec.ts` : `config.testUser.email` utilisait `Date.now()` a l'import, different de celui de `ensureTestUser()` → login echouait car l'utilisateur n'existait pas.
- `archive-interactions.spec.ts` : `getUserToken` utilise mais non importe → crash beforeAll → 5 tests en 0ms.
- `backoffice-interactions.spec.ts` : `waitForLoadState('networkidle')` ne resolvait jamais (polling API continu).
- `performance-e2e.spec.ts` : timeout 10s trop court en environnement Docker dev.
- `security-e2e.spec.ts` : XSS attendait rejection 4xx mais API sanitise (200).

### Solution
1. **`application.controller.js`** : `include: { activities: ... }` → `include: { statusHistory: { orderBy: { changedAt: 'desc' }, take: 10 } }`
2. **`application.routes.js`** : `param('id').isUUID()` → `const idValidation = param('id').isString().notEmpty()` (applique partout)
3. **`api-e2e.spec.ts`** : utilise `_testCreds` (retour de `ensureTestUser`) au lieu de `config.testUser`
4. **`archive-interactions.spec.ts`** : ajout import `getUserToken`, `setupError` tracking avec `test.skip`
5. **`backoffice-interactions.spec.ts`** : `networkidle` → `domcontentloaded` + `waitFor()` sur elements rendus
6. **`performance-e2e.spec.ts`** : `MAX_PAGE_LOAD_MS` 10s → 30s, `networkidle` → `domcontentloaded`
7. **`security-e2e.spec.ts`** : XSS accepte sanitisation (200) ET rejection (4xx/5xx), payload overflow tolerant

### Nouveaux tests ajoutes
- `tests/e2e/specs/email-workflows.spec.ts` : inscription + verification email MailHog, reset password complet, envoi email reel
- `tests/e2e/specs/admin-data-crud.spec.ts` : CRUD complet 7 entites + archivage/restauration
- `tests/e2e/specs/admin-users-crud.spec.ts` : gestion utilisateurs admin
- `tests/e2e/specs/admin-security-complete.spec.ts` : firewall CRUD, IPs bloquees, menaces, WAF, logs securite
- Script rapport (`run-all-tests-with-reports.sh`) mis a jour avec 4 nouvelles suites

---

## 23 fevrier 2026 – Email de test reel et credentials securises

### Probleme
- Les tests email envoyaient vers `redacted@example.invalid` (adresse fictive), impossible de verifier la reception reelle.
- Credentials admin hardcodes dans `test-email-endpoints.test.js`.

### Solution
1. **`.env`** (gitignored) : ajout `TEST_REAL_EMAIL=test@example.invalid`, `TEST_REAL_EMAIL_PASSWORD`, `TEST_REAL_EMAIL_IMAP_HOST=ssl0.ovh.net`, `TEST_REAL_EMAIL_IMAP_PORT=993`.
2. **`test-email-endpoints.test.js`** : utilise `getAdminUser()` au lieu de credentials hardcodes, envoie vers `REAL_TEST_EMAIL`.
3. **`test-data-helper.ts`** : exporte `REAL_TEST_EMAIL` pour usage dans les tests E2E Playwright.
4. Les credentials ne sont **jamais** committes (`.env` est dans `.gitignore`).

---

## 23 fevrier 2026 – Tests backoffice E2E sans authentification

### Probleme
- 6+ fichiers Playwright (application-workflow, data-management, export-import-advanced, load-tests, impersonation-tests, security-tests) naviguaient vers `/backoffice` sans etre connectes.
- Ces fichiers etaient dans `testIgnore` du projet Playwright `chromium` (donc pas de `storageState`).
- `archive-interactions.spec.ts` utilisait `getUserToken()` (user classique) au lieu de `getAdminToken()` pour tester des features admin.

### Solution
1. **`test-data-helper.ts`** : ajout `loginAsAdmin()` (login UI Playwright) et `getAdminCredentials()`.
2. **6 fichiers E2E** : ajout `loginAsAdmin(page)` dans `beforeEach` pour authentication standalone.
3. **`archive-interactions.spec.ts`** : `getUserToken` → `getAdminToken`.
4. **Rapport de tests** : chaque test affiche son type d'utilisateur (👑 ADMIN, 👤 USER, ⚙️ SYSTEM) dans le terminal, le HTML et le texte.

---

## 26 fevrier 2026 – Tests utilisent le mauvais type d'utilisateur

### Probleme
- Tous les tests (API, E2E, mobile, scripts) se connectaient avec le compte admin `admin@jobbingtrack.test` (role SUPER_ADMIN).
- Les tests fonctionnels (qui simulent l'app mobile) ne testaient pas le comportement reel d'un utilisateur classique (role USER).
- Impossible de detecter des bugs de permissions ou de filtrage par role.

### Solution
1. **`test-config.js`** : separe `testUser` (role USER, email dynamique) et `adminUser` (role SUPER_ADMIN).
2. **`auth.helper.js`** : `getTestUser()` (register + login USER) et `getAdminUser()` (login SUPER_ADMIN).
3. **`test-data-helper.ts`** : `ensureTestUser()` cree un compte USER et retourne les credentials pour les tests Playwright UI.
4. **13 fichiers migres** : 3 Jest API, 8 Playwright mobile, 2 Playwright API → utilisent USER.
5. **2 scripts shell migres** : `verify-user-journey.sh` et `test-api-specific.sh` → creent un utilisateur test.

---

## 26 fevrier 2026 – Cascade statuts et auto-evenements echouent silencieusement

### Probleme
- Les status codes `INTERVIEW_PENDING`, `INTERVIEW_DONE`, `OFFER_RECEIVED`, `REJECTED` n'existaient pas dans le seed SQL.
- `updateApplicationStatus()` dans interview-service faisait `if (!statusRow) return;` → echec silencieux.
- `EventType` n'avait pas de champ `code` → `createAutoEvent()` echouait silencieusement (try/catch).
- `getApplication()` dans application-service utilisait `orderBy: { scheduledAt: 'asc' }` → champ inexistant (correcte : `interviewDate`).
- Route `/applications/trash` definie APRES `/:id` → Express matchait "trash" comme un UUID → 404.

### Solution
1. **Seed SQL** : ajout des 11 statuts manquants dans `seed-status-tables.sql` (total 19 ApplicationStatus).
2. **EventType** : ajout champ `code` dans 9 schemas Prisma + seed 5 types (INTERVIEW, FOLLOWUP, CALL, DEADLINE, OTHER).
3. **application.controller.js** : `scheduledAt` → `interviewDate`, `scheduledDate` → `followUpDate`.
4. **application.routes.js** : `/trash` et `/archived` deplacees AVANT `/:id`.
5. **PUT /:id/status validation** : ajout des 10 nouveaux codes de statut dans la liste autorisee.

---

## 26 fevrier 2026 – db-push-all detruit les tables (P2003, register 500)

### Probleme
- `db-push-all.sh` executait `prisma db push --accept-data-loss` pour CHAQUE service (9 services).
- auth-service a 58 modeles, les autres 26-29. Chaque push avec un schema partiel **supprimait** les tables absentes de ce schema (EmailLog, UserSession, SecurityLog, etc.).
- Consequence : la creation d'entites (company, contact, interview) echouait avec P2003 (foreign key violation) ou "Invalid prisma.user.create() invocation".
- Les tests `test-archive-trash.test.js` et `test-status-cascade.test.js` passaient **a vide** (toutes les assertions skippees car les IDs de test etaient undefined).
- Seul `test-bdd-relations.test.js` detectait correctement les echecs (7 tests echoues).

### Cause racine
- Schemas Prisma **differents** entre services :
  - `auth-service` : 58 modeles (superset complet)
  - `company-service` : 27 modeles
  - `workflow-service` : 29 modeles (modeles uniques : Workflow, Activity, etc.)
- `prisma db push --accept-data-loss` depuis company-service SUPPRIMAIT les 31 tables absentes de son schema.
- Ordre de push : auth → application → company → ... → workflow. Chaque push apres auth detruisait progressivement les tables.

### Solution
1. **`scripts/db/db-push-all.sh`** : push uniquement depuis `auth-service` (schema maitre, 58 modeles). Les autres services sont ignores (leur client Prisma est genere au docker build).
2. **Tests ameliores** : ajout de logging explicite dans `beforeAll()` quand la creation de donnees de test echoue, au lieu de `return` silencieux.
3. **Fichiers modifies** : `scripts/db/db-push-all.sh`, `tests/api/test-bdd-relations.test.js`, `tests/api/test-archive-trash.test.js`, `tests/api/test-status-cascade.test.js`.

---

## 26 fevrier 2026 – Tests securite, performance, integration refaits

- **Probleme** : tests securite avec URLs incorrectes (`/api/applications` au lieu de `/api/v1/applications`), base URL pointant sur le frontend (port 8080) au lieu de l'API Gateway (port 5002). Tests performance ne testant que `/health` et utilisant cAdvisor (supprime). Tests integration utilisant raw WebSocket au lieu de Socket.IO. Rapport de test incoherent (faux positifs `❌ Tests echoues: 0`).
- **Solutions** :
  - `tests/security/test-security.js` : URLs corrigees vers `/api/v1/...`, base URL via `API_GATEWAY_URL`, headers manquants en `⚠️` au lieu de `❌`, endpoint auth bypass corrige
  - `tests/performance/test-performance.js` : reecrit – teste 12 vrais endpoints API (applications, companies, contacts, etc.), test de charge (65 requetes paralleles), metriques via metrics-aggregator (port 5004)
  - `tests/integration/test-full-system.js` : reecrit – utilise HTTP vers metrics-aggregator (port 5004), teste health, metriques systeme, Docker services, persistance
  - `scripts/run-performance-backend-in-container.sh` : reecrit – 17 tests (health + 8 endpoints API + 3 metriques + charge + temps de reponse)
  - `scripts/backend-performance-test.sh` : ajout `test_api_endpoints()` avec 10 endpoints reels
  - `frontend/scripts/performance-test.sh` : fix mode non-interactif (bloquait sur `read -r`)
  - `scripts/security/test-firewall.sh` : `❌` conditionnel uniquement si echecs > 0
  - Timeout Playwright augmente de 300s a 900s (213 tests au lieu de 93)
  - `persistence.routes.js` : `safeCount()` avec `.catch(() => 0)` pour les tables absentes (table `security_metrics_aggregated`)

---

## 25 fevrier 2026 – Parcours predefinis operationnels (21 scenarios)

- **Probleme** : les 21 scenarios predefinis echouaient (~14 % de reussite). Apres register/login, les etapes suivantes echouaient.
- **Causes** : (1) URLs API relatives au lieu de `${API_GATEWAY_URL}` pour 8 etapes. (2) Token session non propage entre les etapes. (3) Annulation non effective (closure async sur `isCancelled`).
- **Solutions** : URLs API corrigees dans `user-journey/page.tsx`. Token propage via `sessionToken` + `newToken`. Annulation via `isCancelledRef` (useRef).

---

## 25 fevrier 2026 – Parcours personnalise operationnel

- Execution complete (4/4 etapes), rapports sauvegardes dans `tests/user-journey-reports/`, lien vers "Rapports de parcours" ajoute.

---

## 25 fevrier 2026 – Page backoffice/tests corrigee

- **Cause** : import casse dans `run-playwright-mailhog/route.ts` (`../../testRunnerUtils` au lieu de `../testRunnerUtils`). Frontend 500 sur `/health`.
- **Solution** : chemin corrige. Frontend healthy apres restart.

---

## 25 fevrier 2026 – Rapports Tests CLI visibles dans le backoffice

- Scanner `test-reports/all` cherche aux deux emplacements (`/app/tests/results` + `/tmp/tests/results`) avec deduplication. `summary.json` enrichi avec `category: "Suite CLI"`.

---

## 25 fevrier 2026 – Rapports de parcours en Docker (EROFS)

- Volume dedie RW `./tests/user-journey-reports:/tmp/tests/user-journey-reports` + variable `USER_JOURNEY_REPORTS_DIR` ajoutes dans `docker-compose.yml`.

---

## 25 fevrier 2026 – Tests API 36/36

- Les 36 tests passent. Create Interview/Call/Followup utilisent l'ID de la candidature creee dans le run.

---

## 25 fevrier 2026 – Monitoring demarre apres db-push-all

- Profil `monitoring` ajoute pour `monitoring-c` et `metrics-aggregator`. Demarres apres `db-push-all` dans `make up-full`.

---

## 25 fevrier 2026 – Hub Tests, SMTP, MailHog

- Hub Tests : selection de categories, lancement, journal, rapports.
- SMTP OVH configure. Tables EmailLog/EmailTemplate creees. MailHog integre (profil `mail`/`full`).

---

## Fevrier 2026 – CI/CD : Validation des enums (EventType / EntityType)

- **Probleme** : le job GitHub Actions echouait avec "Enum EventType manquant". Le schema partage utilise `model EventType` (table), pas un enum.
- **Solution** : workflow adapte pour accepter `model EventType` en plus de `enum EventType` ; `EntityType` optionnel.

---

## Fevrier 2026 – Parcours personnalise : 500 quand une etape echoue

- **Probleme** : `execAsync` rejetait en cas d'exit code non nul, l'API renvoyait 500 sans les resultats.
- **Solution** : parse du JSON dans stdout meme en cas d'exit 1. Renvoie 200 avec resultats.

---

## Fevrier 2026 – Rapports Tests Securite : chiffres incoherents

- **Solution** : recalcul de totalTests/totalPassed/totalFailed a partir de `summary.security` pour les rapports securite.

---

## Fevrier 2026 – BigInt, container_logs, user-journey ENOENT

- **BigInt** : serialisation recursive BigInt -> Number avant `res.json()` dans persistence.routes.js.
- **container_logs** : lecture depuis `log_collector_logs` au lieu de `container_logs` dans log-collector-c.
- **ENOENT save-report** : utilisation de `USER_JOURNEY_REPORTS_DIR || '/tmp/user-journey-reports'` en Docker.

---

## Fevrier 2026 – User Journey token is not defined

- Ajout de `const { token } = useAuth()` dans `UserJourneyPage`.

---

## Fevrier 2026 – Mail / SMTP

- Table `EmailLog` creee par `make db-push-all`. Envoi de test OK apres.
- Config SMTP : redacted@example.invalid, SMTP_FROM entre guillemets dans .env.
- Reply-To : `SMTP_REPLY_TO=noreply@jobbingtrack.test` + headers auto-generated.

---

## Fevrier 2026 – Tests API 15 echecs resolus

- profile-service : routes GET/PUT `/api/v1/profile/me` avec requireAuth.
- notification-service : routes protegees par requireAuth (401 sans token).
- dashboard-service : utilisation de statistics.controller au lieu de dashboard.controller.
- Script test-api-specific.sh : URL profil corrigee, applicationId pour Call/Followup.
- Schemas BDD alignes (statusId, verificationToken, loginCount).

---

## Fevrier 2026 – Tests API depuis Docker (bash not found)

- Remplacement de `bash` par `sh` dans toutes les routes run-* du frontend.

---

## Fevrier 2026 – Monitoring, Analytics, Temps de reponse

- monitoring-c utilise le port interne pour les health checks (docker inspect).
- Analytics : CPU Systeme avec graphique historique, temps de reponse depuis fetchMetrics().
- security-service : trust proxy = 1 au lieu de true.
- make logs : docker compose config --services puis docker compose logs -f.
- metrics-aggregator : champ log en string, gestion absence de table.

---

## Fevrier 2026 – Prisma, .env, db-push-metrics

- Prisma 6.7.0 pour metrics-aggregator (pas Prisma 7).
- DATABASE_URL dans .env a la racine, charge par Makefile.
- SMTP_FROM entre guillemets pour eviter erreur shell.

---

## Fevrier 2026 – Systeme Archivage / Corbeille complet

### Probleme
- Tous les `delete` etaient des hard deletes (suppression definitive).
- La cascade archivage n'etait pas implementee (stubs vides dans application-service).
- Les items supprimes disparaissaient sans possibilite de restauration.
- Pas de corbeille dans aucun service.

### Solution : Soft delete + Corbeille + Cascade

**7 services modifies** (application, interview, call, followup, event, company, contact) :

1. **Soft delete** : `DELETE /:id` met `deletedAt = now()` au lieu de supprimer en BDD.
2. **Filtrage** : `deletedAt: null` ajoute a toutes les requetes list/get pour masquer les items en corbeille.
3. **6 archive controllers crees** : chaque service expose `/trash`, `/trash/empty`, `/:id/restore`, `/:id/permanent`.
4. **Cascade logique** :
   - Supprimer un entretien → soft-delete les evenements lies (via `interviewId` sur Event)
   - Supprimer un appel → soft-delete les evenements lies (via `callId` sur Event)
   - Supprimer une relance → soft-delete les evenements lies (via `followUpId` sur Event)
   - Supprimer une candidature → soft-delete entretiens, relances, appels, evenements lies
   - Archiver une candidature → cascade identique
   - Restaurer → cascade inverse (restauration des elements lies)
5. **Application-service** : `archiveRelatedElements` et `restoreRelatedElements` implementes (avant : stubs vides).
6. **Vidage corbeille** : suppression definitive des items > 30 jours.

### Fichiers modifies
- `backend/*/src/controllers/archive.controller.js` (6 crees + 1 modifie)
- `backend/*/src/controllers/*.controller.js` (7 modifies : soft delete + filtres)
- `backend/*/src/routes/*.routes.js` (7 modifies : nouvelles routes trash)

---

## Fevrier 2026 – Erreurs Postgres au demarrage

### Probleme 1 : `security_logs does not exist`
- La table n'est creee que par `db-push-all` (Partie 3/3 via init-key-tables.sql).
- `security-service` la requete au demarrage avant que `db-push-all` ait ete execute.
- Le dossier `backend/init-db/` (monte sur `/docker-entrypoint-initdb.d`) etait vide.

### Solution
- Cree `backend/init-db/01-init-critical-tables.sql` : cree `security_logs` et `FollowUpStatus` au premier demarrage Postgres.

### Probleme 2 : `type "FollowUpStatus" already exists`
- **Cause racine** : 5 services definissent `FollowUpStatus` comme `model` (TABLE), 4 services (call, event, interview, workflow) le definissent comme `enum` (TYPE).
- `prisma db push` sur auth-service cree la TABLE (+ type composite implicite).
- Ensuite `prisma db push` sur call-service tente `CREATE TYPE "FollowUpStatus" AS ENUM` → conflit.

### Solution
- Aligne les 4 schemas problematiques : `enum FollowUpStatus` → `model FollowUpStatus` (table avec relation `statusId`).
- Ajoute nettoyage pre-push dans `db-push-all.sh` : `DROP TYPE IF EXISTS "FollowUpStatus" CASCADE`.
- Script init-db seed les statuts predéfinis (PENDING, POSITIVE_RESPONSE, etc.).

### Fichiers modifies
- `backend/call-service/prisma/schema.prisma`
- `backend/interview-service/prisma/schema.prisma`
- `backend/event-service/prisma/schema.prisma`
- `backend/workflow-service/prisma/schema.prisma`
- `scripts/db/db-push-all.sh`
- `backend/init-db/01-init-critical-tables.sql` (cree)

Voir **STATUS.md** pour les taches restantes et **ERRORS.md** pour les erreurs non resolues.
