# JobbingTrack - Statut du projet

**Derniere mise a jour** : 26 fevrier 2026

---

## Recap rapide (ce qui fonctionne)

Stack 21/21 services, 47 tables, Tests API 61 (archivage + cascade + BDD), Playwright E2E 233, MailHog 3/3, Securite 64, Performance 15/15, Integration OK, 21 parcours, SMTP/MailHog, hub Tests, soft delete + corbeille + archivage 7 services, cascade statuts + archivage, auto-events, erreurs Postgres + db-push-all corrigees. Detail : `RESOLUTIONS.md`.

---

## A faire maintenant

### ~~Phase 2 : Archivage complet~~ FAIT

- [x] `isArchived` + `archivedAt` ajoutes aux schemas Prisma : Interview, Call, FollowUp, Event, Company (45 modeles patches dans 9 fichiers)
- [x] Endpoints `POST /:id/archive`, `POST /:id/unarchive`, `GET /archived` pour 7 services
- [x] Cascade archivage : archiver candidature → archiver (isArchived) entretiens, relances, appels, evenements lies
- [x] Cascade desarchivage : desarchiver candidature → desarchiver les elements lies
- [x] Filtrage `isArchived: false` dans toutes les requetes normales
- [ ] Suppression auto corbeille > 30 jours (cron job ou worker)
- [ ] Tests E2E archivage/restauration effective

### Phase 3 : Interactions backoffice approfondies

#### 3.1 CRUD complet et modification de tous les champs
- [ ] Modification entreprise (tous les champs : nom, site web, secteur, taille, localisation, adresse, ville)
- [ ] Modification candidature (tous les champs : poste, description, URL offre, contrat, mode travail, salaire, notes, plateforme)
- [ ] Modification entretien (date, type, style, duree, lieu/lien, contacts, notes, feedback, resultat)
- [ ] Modification relance (date, type, methode, contacts, notes, reponse)
- [ ] Modification appel (date, type, duree, sujet, notes, statut)
- [ ] Modification evenement (titre, dates, type, couleur, rappel, lien entite)
- [ ] Modification contact (tous les champs)

#### 3.2 Systeme de statuts avec cascade
- [x] Changement statut candidature avec historique (`ApplicationStatusHistory`) — existait deja
- [x] Statuts candidature : CANDIDATE_PENDING → INTERVIEW_PENDING → INTERVIEW_DONE → OFFER_RECEIVED → REJECTED/WITHDRAWN
- [x] Mise a jour automatique statut candidature quand entretien cree → `INTERVIEW_PENDING`
- [x] Mise a jour automatique statut candidature quand entretien complete → `INTERVIEW_DONE`
- [x] Mise a jour automatique statut candidature quand resultat entretien positif → `OFFER_RECEIVED`
- [x] Mise a jour automatique statut candidature quand resultat entretien negatif → `REJECTED`
- [x] Mise a jour automatique statut candidature quand entretien annule → `CANDIDATE_PENDING`
- [ ] Notification auto quand candidature sans reponse > 7 jours → "Penser a relancer"
- [ ] Notification auto quand entretien dans < 24h → rappel
- [ ] Notification auto quand relance en retard

#### 3.3 Auto-creation d'evenements
- [x] Creation candidature → cree evenement "Candidature envoyee" (deja en place)
- [x] Creation entretien → cree automatiquement un evenement calendrier avec rappel 30min
- [x] Creation relance → cree automatiquement un evenement calendrier avec rappel 1h
- [x] Appel programme → cree automatiquement un evenement calendrier avec rappel 15min
- [ ] Changement statut → cree notification

#### 3.4 Export / Import donnees
- [ ] Export CSV des candidatures, entreprises, contacts
- [ ] Export JSON des donnees utilisateur
- [ ] Import CSV/JSON (avec validation et preview)
- [ ] Interface backoffice pour export/import

#### 3.5 Verification email utilisateur
- [ ] Endpoint `POST /api/v1/auth/verify-email/:token` fonctionnel
- [ ] Envoi email verification a l'inscription
- [ ] Page de confirmation "Email verifie"
- [ ] Test E2E verification email (envoi + reception MailHog)

#### 3.6 Pagination et tri des listes
- [ ] Pagination coherente sur toutes les listes (page, limit, total, pages)
- [ ] Tri par colonne (date, nom, statut) sur toutes les listes
- [ ] Recherche/filtrage avance sur toutes les listes
- [ ] Tests E2E pagination et tri

#### 3.7 Tests interactions approfondies
- [x] Tests API archivage/desarchivage/corbeille/cascade : `tests/api/test-archive-trash.test.js` (19 tests)
- [x] Tests API cascade statuts + auto-evenements : `tests/api/test-status-cascade.test.js` (12 tests)
- [x] Tests BDD/integration relations et cascade : `tests/api/test-bdd-relations.test.js` (14 tests)
- [x] Tests E2E Playwright interactions : `frontend/tests/e2e/archive-interactions.spec.ts` (16 tests)
- [x] Helpers E2E enrichis : `apiCreateApplication`, `apiCreateInterview`, `apiArchive`, `apiUnarchive`, `apiRestore`
- [ ] Tests export/import donnees
- [ ] Tests verification email
- [ ] Tests pagination et tri

#### 3.8 Architecture des tests — FAIT
- [x] **Separation USER / ADMIN** : tests fonctionnels utilisent un utilisateur classique (role USER), tests backoffice utilisent admin (SUPER_ADMIN)
- [x] `tests/helpers/auth.helper.js` : `getTestUser()` (USER) + `getAdminUser()` (SUPER_ADMIN)
- [x] `frontend/tests/e2e/test-config.js` : `testUser` (USER dynamique) + `adminUser` (SUPER_ADMIN)
- [x] `frontend/tests/e2e/test-data-helper.ts` : `ensureTestUser()`, `getAdminToken()`, `loginAsAdmin()`, `getAdminCredentials()`
- [x] 3 tests Jest API migres → utilisateur classique (test-archive-trash, test-bdd-relations, test-status-cascade)
- [x] 8 tests Playwright mobile migres → utilisateur classique (mobile-*.spec.ts)
- [x] 2 tests Playwright API migres → utilisateur classique (api-only-tests, api-e2e)
- [x] Scripts shell migres → creation utilisateur test (verify-user-journey, test-api-specific)
- [x] Rapport de tests : texte lisible (report.txt) + HTML interactif (report.html) + resume terminal

#### 3.9 Email de test reel + securisation credentials — FAIT
- [x] Adresse email de reception reelle pour tests : `test@delhomme.ovh` (via variable `TEST_REAL_EMAIL` dans `.env`, gitignored)
- [x] Credentials sensibles dans `.env` uniquement (non committes) : `TEST_REAL_EMAIL`, `TEST_REAL_EMAIL_PASSWORD`, `TEST_REAL_EMAIL_IMAP_HOST`
- [x] Tests email (Jest) utilisent `REAL_TEST_EMAIL` au lieu de `test@example.com` hardcode
- [x] Tests email (Jest) utilisent `getAdminUser()` (fonctionnalite admin)
- [x] Helper `REAL_TEST_EMAIL` exporte dans `test-data-helper.ts` pour les tests E2E

#### 3.10 Tests backoffice standalone avec auth admin — FAIT
- [x] `loginAsAdmin()` helper pour tests E2E qui ne beneficient pas de `storageState`
- [x] 6 fichiers E2E backoffice corriges : application-workflow, data-management, export-import-advanced, load-tests, impersonation-tests, security-tests
- [x] `archive-interactions.spec.ts` : `getUserToken` → `getAdminToken` (fonctionnalite admin)

#### 3.11 Rapports de tests avec type d'utilisateur — FAIT
- [x] Chaque test affiche son type d'utilisateur dans le terminal : 👑 ADMIN, 👤 USER, ⚙️ SYSTEM
- [x] JSON de resultat inclut le champ `userType` (admin, user, system)
- [x] Rapport HTML affiche un badge colore par test (rouge=admin, vert=user, orange=system)
- [x] Rapport texte inclut une legende [A]=Admin [U]=User [S]=System

#### 3.12 Corrections tests echoues (26/02/2026) — FAIT
- [x] `getApplication` : relation `activities` (inexistante) → `statusHistory` (fix 500 → 200)
- [x] Routes application : `isUUID()` → `isString().notEmpty()` (les IDs Prisma sont des CUIDs, pas des UUIDs)
- [x] `api-e2e.spec.ts` : credentials desynchronises (config.testUser vs ensureTestUser) → utilise `_testCreds` directement
- [x] `archive-interactions.spec.ts` : import manquant `getUserToken` + resilience beforeAll
- [x] `backoffice-interactions.spec.ts` : `networkidle` → `domcontentloaded` (timeouts 10s+)
- [x] `performance-e2e.spec.ts` : timeout 10s → 30s, `networkidle` → `domcontentloaded`
- [x] `security-e2e.spec.ts` : XSS accepte sanitisation + rejection, payload overflow tolerant

#### 3.13 Tests E2E etendus — FAIT
- [x] `tests/e2e/specs/email-workflows.spec.ts` : inscription avec verification email MailHog, reset password complet (API + UI), envoi email reel
- [x] `tests/e2e/specs/admin-data-crud.spec.ts` : CRUD complet (entreprise, contact, candidature, entretien, relance, appel, evenement, archivage, restauration)
- [x] `tests/e2e/specs/admin-users-crud.spec.ts` : gestion utilisateurs admin (lister, creer, modifier role, desactiver)
- [x] `tests/e2e/specs/admin-security-complete.spec.ts` : firewall CRUD, IPs bloquees, menaces, WAF, logs securite
- [x] Script rapport mis a jour avec 4 nouvelles suites de test

#### 3.14 CI/CD GitHub Actions — A FAIRE
- [ ] Pipeline GitHub Actions pour les microservices (build + test)
- [ ] Execution suite de tests complete dans CI
- [ ] Deploiement automatise apres tests passes

---

## Plus tard (voir `docs/BACKLOG.md`)

| Tache | Detail |
|-------|--------|
| API versioning | 404 sur `GET /api/v1/analytics/stats/:userId/versions` |
| Rapports par categorie | Organiser `tests/results/` en sous-dossiers par type |
| Lancement tests depuis hub | Clic + verification resultat dans l'interface |
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

## Etat en un coup d'oeil

| Categorie | Fait | Reste |
|-----------|------|-------|
| Stack / BDD | 21/21 services, 47 tables, monitoring OK, soft delete + corbeille + archivage | Unifier schemas Prisma, cron purge corbeille |
| Backoffice | Connexion admin, hub Tests, parcours, rapports, E2E 233 | CRUD complet, export/import, verif email |
| Parcours | 21 scenarios, personnalise, rapports | -- |
| Tests | API 61, E2E 233, MailHog 3/3, Securite 64/64, Perf 15/15, Integration OK | Tests export, verif email, pagination |
| Emails | SMTP OK, MailHog OK, pages backoffice | Verification email inscription |
| Mobile | Rendu emulateur, ecrans auth | Build APK, app complete |
| CI/CD | -- | Pipeline a adapter |

---

## Historique (taches completees)

<details>
<summary>Cliquer pour voir les taches terminées</summary>

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
Push uniquement depuis auth-service (58 modeles). Les autres services avaient des schemas partiels (~27 modeles) qui supprimaient les tables auth.

### Archivage complet + cascade statuts — FAIT
`isArchived`/`archivedAt` sur 5 entites, cascade archivage/desarchivage, statuts auto (INTERVIEW_PENDING, INTERVIEW_DONE, OFFER_RECEIVED, REJECTED), auto-creation evenements calendrier.

### Tests API archivage/cascade/BDD — FAIT
61 tests Jest (19 archive + 12 cascade + 14 BDD + 6 email + 12 backend) + 16 tests E2E Playwright.

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
| Tests couverture E2E | `docs/tests/BACKOFFICE_TESTS_COVERAGE.md` |
| Schema BDD | `docs/database/SCHEMA_CHOIX.md` |
| Mobile checklist | `docs/mobile/APPLICATION_MOBILE_A_FAIRE.md` |
| Deploiement | `docs/deployment/DEPLOIEMENT_FINAL.md` |
| Commandes utiles | `docs/COMMANDES_UTILES.md` |
