# JobbingTrack - Statut du projet

**Dernière mise à jour** : 27 février 2026

---

**📌 À lire en premier** : **`docs/GUIDE_ETAPES_ACTUELLES.md`** — résumé de ce qui est fait, quoi faire maintenant (backoffice, données de test, suivi intérim, mobile), et **quelle base utiliser** (principale pour backoffice + émulateur en live, base de test pour tests automatisés si besoin).

---

## À faire maintenant (priorité)

**Objectif** : aller au bout du **suivi intérim** (backoffice puis application mobile), avec un **mode intérim** activable qui adapte l’interface. Ensuite, poursuivre l’app mobile (vérification email si pas fait, puis écrans et navigation).

### 1. Backoffice – Suivi intérim (à faire en premier)

- **Couleurs calendrier** : événements liés à une candidature avec `agencyId` → couleur intérim (ambre `#F59E0B`) ; sinon classique (bleu `#3B82F6`). Calcul à la création (backend) ou à l’affichage (frontend).
- **Page dédiée « Suivi intérim »** : liste des agences (`companyType = TEMP_AGENCY`), puis pour chaque agence liste des candidatures où `agencyId = cette agence`. Lien depuis Administration / Boîtes d’intérim.
- **Toggle « Mode intérim »** : interrupteur en navigation (ou menu) pour activer/désactiver le mode intérim ; quand activé, mettre en avant Suivi intérim, filtres adaptés, calendrier avec couleurs. Préférence persistée (localStorage ou préférence utilisateur).

Spec : **`docs/features/SUIVI_BOITES_INTÉRIM.md`** (sections 4.0 Mode intérim, 4.2, 4.3).

### 2. Application mobile Flutter – Suivi intérim puis suite

- **Toggle « Mode intérim »** (Paramètres ou accueil) : activé → onglet/écran Intérim, champs agence visibles, calendrier avec couleurs intérim ; désactivé → vue classique. Préférence persistée.
- **Champs agence** : choix boîte d’intérim à la création/édition de candidature.
- **Écran « Intérim »** : liste des agences, puis candidatures par agence.
- **Calendrier** : couleurs distinctes (classique vs intérim).

Si pas encore fait : valider d’abord le parcours **vérification email** (voir **`docs/mobile/PROCHAINES_ETAPES.md`**), puis enchaîner sur les écrans et le suivi intérim mobile.

Références : **`docs/mobile/PROCHAINES_ETAPES.md`**, **`docs/mobile/APPLICATION_MOBILE_A_FAIRE.md`**, **`docs/features/SUIVI_BOITES_INTÉRIM.md`**.

### 3. ~~Suivi boîtes d’intérim (schéma prêt, interface à faire)~~ — Base faite ; reste à faire (fév. 2026)

- **BDD** : `Company.companyType` (EMPLOYER | TEMP_AGENCY) et `Application.agencyId` en place. Schéma partagé `backend/prisma/schema.prisma` et services (auth-, company-, application-service) à jour.
- **Backend** : create/update/list company avec `companyType` ; create/update application avec `agencyId` ; réponses incluent la relation `agency`.
- **Backoffice** : Administration → Gestion des données → **Entreprises** et **Boîtes d’intérim** ; page Entreprises avec filtre Type, colonne Type, formulaire création/édition avec type ; Données de test → Candidatures : champ optionnel **Agence (boîte d’intérim)**.
- **Données de test** : `backend/generate-test-data.js` crée 2 boîtes d’intérim (Randstad, Manpower) et affecte `agencyId` à une partie des candidatures.
- Spécification : **`docs/features/SUIVI_BOITES_INTÉRIM.md`**.

### 4. Commandes utiles

| Action | Commande |
|--------|----------|
| Arrêter (données conservées) | `make down` |
| Tout effacer puis redémarrer | `make down-clean` → `make up-full` → `make seed-auth` |
| Créer / mettre à jour l’admin | `make seed-auth` |
| Démarrer la stack | `make up-full` |
| Synchroniser le schéma BDD (conteneurs) | `make db-push-all` |
| Répliquer schéma principal → base de test | `make up-test` puis `make db-replicate-schema-to-test` |
| Contrôleur émulateur | `make emulator-controller` |
| Logs | `make logs` |
| Aide BDD / migrations | `make help-database` |

**Migrations et Prisma** : tout passe par le **Makefile et les conteneurs**. Détail : **`docs/database/MIGRATIONS_ET_BASES.md`**.

---

## Migrations Prisma et bases de données

- **Migrations / schéma** : gérés **uniquement** via Makefile et **conteneurs** (`make db-push-all` exécute `prisma db push` dans le conteneur auth-service). Voir **`docs/database/MIGRATIONS_ET_BASES.md`**.
- **Base principale** : `jobbingtrack` sur le conteneur `postgres`. Utilisée par l’app, le backoffice et tous les services. **Données de test (backoffice)** : le bouton « Générer données de test » écrit dans cette base principale (comportement conservé pour démo/admin). Rien n’est supprimé côté backoffice.
- **Base de test (optionnelle)** : pour ne pas mettre les données de test ou les runs de tests dans la principale, une base de test séparée est disponible : `make up-test` (postgres-test, port 5434), puis **`make db-replicate-schema-to-test`** pour copier le **schéma seul** (sans données) de la principale vers la base de test. Les tests peuvent ensuite cibler cette base en définissant `DATABASE_URL` (ou `TEST_DATABASE_URL`) vers `localhost:5434`. Actuellement `make test-database` et `make test-full` utilisent encore la base principale pour rester cohérents avec la stack.

---

## À vérifier / Erreurs connues (BDD Postgres, build APK)

- **Postgres — rôles / DB** : au démarrage ou lors de `make db-fix-role`, les logs du conteneur affichent `ERROR: role "jobbingtrack" already exists` et `ERROR: database "jobbingtrack" already exists` car le script exécute `CREATE USER` / `CREATE DATABASE` sans idempotence. À faire : utiliser du SQL idempotent (ex. `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`) pour ne plus générer d’erreurs dans les logs. Voir `makefiles/database/Makefile` cible `db-fix-role`.
- **Postgres — table `deployments`** : le deployment-service envoie des requêtes vers `public.deployments` alors que la table n’existe pas (relation "public.deployments" does not exist). À faire : appliquer le schéma Prisma du deployment-service sur la BDD partagée (`make db-push-all` ou push ciblé deployment-service) pour créer la table `deployments`.
- **Build APK (interface backoffice)** : le build pouvait échouer avec `Zip file ... already contains entry 'META-INF/...', cannot overwrite`. Correctif appliqué : avant `flutter build apk`, suppression des sorties `build/app/outputs/apk` et `flutter-apk` ; détection de l’APK dans les deux emplacements possibles (flutter-apk / apk/debug). **Pendant le build** : overlay plein écran qui bloque la navigation et les clics (seul « Annuler le build » est utilisable). Si l’erreur Zip réapparaît, lancer `cd mobile && flutter clean && rm -rf build/app/outputs` puis relancer le build.
- **make logs** : suivi continu ; Ctrl+C pour quitter. Dernières lignes sans suivi : `make logs-tail` ou `make logs-tail LINES=500`.
- **Email inscription mobile** : plus de 6 en fin d'email (chiffre en dernière position supprimé avant saisie pour champs email).
- **Parcours mobile** : étapes du parcours affichées à côté du rendu en direct pendant l'exécution.
- **Specs E2E mobile email** : `tests/e2e/specs/mobile/` (Gmail, Proton, BlueMail). `make test-e2e-mobile-email-verification`. Voir `tests/e2e/README.md`.
- **Logs Postgres (locale)** : image passée à `postgres:15` (Debian) pour avoir les locales correctes ; avec `postgres:15-alpine` on avait « no usable system locales ». Si le volume existe déjà, le premier démarrage avec la nouvelle image peut réutiliser les données (même version majeure).
- **Logs Postgres (trust auth)** : « enabling trust authentication for local connections » = en dev les connexions locales sans mot de passe sont autorisées (normal, pas une erreur).
- **Logs Redis** : « Memory overcommit must be enabled » = réglage noyau sur l’hôte (`sysctl vm.overcommit_memory=1`). Sans impact en dev local.

---

## Recap rapide (ce qui fonctionne)

Stack 21/21 services, 47 tables, Tests API 61 (archivage + cascade + BDD), Playwright E2E 233, MailHog 3/3, Securite 64, Performance 15/15, Integration OK, 21 parcours, SMTP/MailHog, hub Tests, soft delete + corbeille + archivage 7 services, cascade statuts + archivage, auto-events, module ADB mobile reutilisable (28 scenarios, 100+ steps), parcours mobile dans journey-builder (30+ steps mobiles integres), crash reporting backend + email auto (infos@delhomme.ovh), ADB shell command, test email sur appareil, tracking pousse utilisateur (boutons, ecrans, swipes, API calls, durees, monitoring appareil), mode DEV illimite / mode PROD 500 actions. Detail : `RESOLUTIONS.md`.

---

## Etat actuel (27 fevrier 2026)

- **Parcours utilisateur mobile** : 22 scenarios predefinis organises en 5 categories (auth, navigation, verification, crud, complet). **Emulateur** : liste complete des parcours avec **6 parcours principaux** en tête (Inscription complète, Reset mot de passe, Première utilisation, Usage quotidien, Archives & Corbeille, Parcours complet), tous lancables depuis l’interface après sélection d’un appareil ADB. Module ADB reutilisable (`tools/adb-lib/`, `frontend/src/lib/adb/`) avec 6 methodes d'utilisation (client direct, flows, actions parametrees, scenarios, runner actions, runner custom). 28 steps mobiles integres dans `journey-builder.js`.
- **Tests** : corrections appliquees (activities→statusHistory, isUUID→isString, api-e2e credentials, networkidle, enums NotificationType, CRUD admin company size). Suite partiellement en echec : 7 echecs (Enums et « creer une entreprise » corriges ; restent status-engine, Playwright CRUD users, Securite, Email Workflows a stabiliser).
- **Backoffice Analytics utilisateur** : page resilient si requete events bloquee (uBlock) : chargement partiel + message onglet Evenements.
- **Rapports de tests** : view utilise `USER_JOURNEY_REPORTS_DIR` (aligné avec la liste) ; message 404 explicite ; JSON des résultats échappé (plus de « Test inconnu ») ; script `scripts/compress-old-reports.sh` pour compresser les rapports de plus de N jours.
- **Backend CRUD** : mise à jour complète des champs pour candidature (whitelist), entretien (feedback, outcome, type/style), relance (response, type/method), appel (followUpId, callTypeId), événement (reminder, color, callId, eventTypeId), contact (whitelist).
- **Mobile** : formulaire candidature complet (création + édition) ; écran détail candidature avec listes relances/entretiens/appels et création relance/entretien/appel depuis le détail ; écran Entretiens (liste API) ; FollowUpProvider et InterviewProvider branchés sur l’API ; retour arrière depuis le détail revient à la liste (pas de sortie d’app).
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
- [x] **Transition auto** `CANDIDATE_PENDING` → `NO_RESPONSE` apres 7 jours sans action (cron 9h30, workflow-service)
- [x] **Notification** apres relance sans reponse > 5 jours (« Relance sans réponse », cron 10h15)
- [x] **Notification** apres entretien passe sans retour > delai annonce (ou 7j) (« Retour entretien attendu », cron 8h15)
- [ ] **Suggestion** « Considerer comme rejetee ? » apres 3+ relances sans reponse (affichage UI + action possible)
- [x] Action "Rejet recu" → passage immediat a `REJECTED` (PUT /applications/:id/status, commentaire)
- [ ] Action "Email remerciement envoye" → reset compteur relance (à implémenter : champ ou logique côté application/frontend)
- [x] Facteurs pris en compte : temps ecoule, nombre relances, entretiens passes, feedback (structure en place)
- [x] Tests API : `tests/api/test-status-engine.test.js` + `tests/api/test-status-cascade.test.js`
- [x] Tests E2E Playwright moteur statut : `frontend/tests/e2e/status-engine.spec.ts`
- [x] Module parcours : `tests/user-journey/modules/step-status-engine.js` + parcours `status_engine` / `status_lifecycle`
- [x] Option par candidature : champ `statusEngineOptOut` sur Application — desactiver le moteur auto pour une seule candidature (voir 10.6)
- **À venir** : suggestion « Considérer rejetée » (UI + API), action « Email remerciement envoyé » → reset compteur ; tests dédiés pour les nouveaux crons (optionnel).

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

#### 3.5 Verification email utilisateur (parcours inscription — en cours)
- [x] Endpoint `POST /api/v1/auth/verify-email/:token` fonctionnel
- [x] Envoi email verification a l'inscription
- [ ] Page de confirmation "Email verifie" (frontend)
- [x] Login refusé (401, code EMAIL_NOT_VERIFIED) si email non vérifié
- [x] Test E2E workflows email : `tests/e2e/specs/email-workflows.spec.ts` (inscription → vérification via MailHog ou EmailLog → login ; login refusé sans vérification)
- [x] Liens dans les emails : `HOST_IP` pour remplacer localhost en dev (liens utilisables depuis le téléphone) ; en prod, `FRONTEND_URL` domaine.
- [ ] **Validation parcours complet** : inscription depuis backoffice/émulateur → écran « Vérifiez votre email » → ouverture mail (Gmail/Proton) sur l’appareil → clic lien → retour app → connexion → Dashboard. Vérifier aussi Email Monitor et réception réelle (SMTP OVH / Gmail).
- [x] **Correctif « 6 » en fin d’email (parcours inscription)** : dans `tools/emulator-controller` route `/tap-field-and-type`, pour le champ email : trim du texte, 120 DEL pour vider le champ, puis après saisie un BACKSPACE + retape du « m » final (KEYCODE_M) si l’email se termine par « m » (contourne le « 6 » ajouté par certains claviers Android).

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
- [x] **Test automatisé inscription Gmail + log email** : script `tests/run-inscription-gmail-email-check.js` — inscription `pauldelhomme.pro@gmail.com` via API puis vérification que l’email de vérification est loggé à la bonne adresse. À lancer avec la gateway + auth-service démarrés : `cd tests && npm run test:inscription-gmail`. E2E Playwright (inscription 3 comptes + Email Monitor) : `frontend/tests/e2e/email-verification-monitor.spec.ts` (nécessite frontend + API + auth admin).
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

#### 3.15 Emails, backoffice et tests à compléter (suite)

> Pas de contournement vérification email en test : flux normal avec **MailHog** (register → email reçu dans MailHog → clic lien verify-email → login). Playwright doit vérifier ce flux. Un **compte mail de test** existe pour tester comme un vrai utilisateur (`TEST_REAL_EMAIL` etc.).

- [ ] **Auth / tests** : faire passer les 49 tests liés à l’auth via le flux réel (MailHog + verify-email) ou utilisateur pré-vérifié en BDD ; pas de bypass. **`make test-full`** exécute maintenant automatiquement le **seed auth** après `db-push-all` (étape 3b) : l’admin est créé/mis à jour avec `emailVerified: true` dans le conteneur auth-service. Aucune action manuelle requise pour un test complet. En cas d’échec du seed (conteneur non prêt, prisma.seed absent), un avertissement s’affiche et les tests s’exécutent quand même ; le rapport indiquera les échecs liés à l’auth. Pour un seed manuel (hôte) : `cd backend/auth-service && npx prisma db seed` (variables depuis `.env` racine ou `backend/auth-service/.env`).
- [ ] **Backoffice — Gestion des emails / Dashboard** : s’assurer que les mails envoyés par l’app s’affichent correctement (liste, statuts).
- [ ] **Backoffice — Email Monitor** : les mails envoyés doivent apparaître avec **statut / état** (envoyé, livré, lu, rejeté). Vérifier que l’on peut voir qu’un mail a été livré, lu, etc.
- [ ] **Backoffice — Clic pour voir le contenu** : au clic sur un mail (dans la liste ou l’historique), **afficher vraiment le contenu** du mail (corps HTML/texte).
- [ ] **Backoffice — Historique emails** : partie « Historique » (si distincte de Email Monitor) doit être un vrai historique, avec **rechargement** correct.
- [ ] **Backoffice — Recherche** : pas encore testée. Comportement attendu : recherche **soit limitée à la page courante** (contexte), **soit globale** (tout le projet) ; après affichage des résultats, **retour en arrière** pour revenir où l’on était avant la recherche. Tests Playwright pour ce comportement.
- [ ] **Templates d’emails** : permettre de **créer** des templates soi-même (pas seulement éditer les existants). Tester en backoffice : **édition**, **visualisation**, sauvegarde. Tests Playwright sur la page templates (`/backoffice/emails/templates`).
- [ ] **Page test délivrabilité** (`/backoffice/emails/deliverability`) : tests Playwright **complets** (envoi test, affichage résultat, statuts, etc.).
- [ ] **Page tests-emails** (`/backoffice/tests-emails`) : tests Playwright **complets** (liens, envoi test, liens vers MailHog / Monitor / Templates).
- [ ] **Accès MailHog depuis l’interface** : vérifier que le backoffice permet d’accéder à MailHog (lien ou iframe) et que c’est documenté ici. Interface MailHog : http://localhost:8025 (ou port configuré).
- [ ] **Compte mail de test** : utiliser le compte configuré (`TEST_REAL_EMAIL` etc.) pour les tests en conditions réelles (vérification, reset password, etc.).

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
- [x] Formulaire creation candidature (FAB + depuis liste + bouton « Créer ma première candidature » si vide)
- [x] Écran détail candidature (ApplicationDetailScreen) : infos, listes relances/entretiens/appels, boutons « Ajouter relance », « Ajouter entretien », « Ajouter appel », « Modifier » ; retour (back) revient à la liste sans quitter l’app
- [x] Relance UNIQUEMENT depuis detail candidature (dialog date + notes, appel API POST /followups)
- [x] Entretien UNIQUEMENT depuis detail candidature (date picker, appel API POST /interviews)
- [x] Appel via candidature depuis détail (date + sujet, appel API POST /calls)
- [ ] Auto-creation entreprise lors creation candidature ou contact
- [ ] Contact standalone ou lie a candidature (3 cas)
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
- [x] Email crash report a `infos@delhomme.ovh`
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
- [x] **CRASH_REPORT_EMAIL** : lu depuis l’env (defaut infos@delhomme.ovh), documenté dans `.env.example` ; avec MailHog les emails crash sont visibles dans l’interface MailHog (http://localhost:8025).

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

---

## Parcours mobile — Backoffice Emulateur (etat operationnel)

**Page** : http://localhost:5003/backoffice/mobile-emulator (connexion admin requise).

**Parcours principaux (8)** : Inscription complete, Reset mot de passe, Premiere utilisation, Usage quotidien, Parcours complet (avec donnees), Creation candidature + relance + entretien + appel, Archives & Corbeille, Parcours complet. Tous definis avec etapes implementees dans `adb-steps.ts`.

**Comportement** : etape inconnue → erreur (throw) ; etapes critiques (login, view_dashboard_ui) en echec → parcours arrete ; bouton Annuler → interrompt l'etape en cours ; parcours « avec donnees » ne demarre pas si generation echouee ou non connecte admin. Controleur : route `/force-restart-app`, retry uiautomator dump.

**Prerequis** : `make emulator-controller` ou `make restart-emulator` (5055), appareil ADB connecte. **Verifications** : `make verify-mobile-emulator` (sante controleur + force-restart-app), `make verify-mobile-scenarios` (coherence scenarios vs steps).

**Compte test « avec donnees »** : apres generation (preset mobile), connexion dans l'app avec le compte **user1** : par defaut **user1@jobbingtrack.com** / **password123**. Pour recevoir les mails (inscription, reset) sur une vraie boite : definir **TEST_USER_EMAIL** et **TEST_USER_PASSWORD** (backend / api-gateway) et **NEXT_PUBLIC_MOBILE_TEST_USER_EMAIL** / **NEXT_PUBLIC_MOBILE_TEST_USER_PASSWORD** (frontend), ex. **paul.delhomme@proton.me** ou **candidatures@alias.delhomme.ovh** (voir `.env.example`).

**Usage reel** : necessite un appareil/emulateur Android connecte. Sans appareil, seules les cibles make verify-mobile-* et la coherence du code sont testables.

**Tests E2E Playwright (page emulateur)** : `frontend/tests/e2e/mobile-emulator.spec.ts` — verifie le chargement de la page, les 8 parcours principaux, le bouton « Lancer le parcours », le message « Selectionnez un appareil » sans appareil, et la selection des parcours (dont « Parcours complet (avec donnees) »). Pour que les tests passent : **backend (API Gateway) sur 5002**, **frontend/.env** avec `NEXT_PUBLIC_API_URL=http://localhost:5002`, puis `npm run test:e2e:mobile-emulator` (projet chromium + auth admin). Si le frontend tourne deja, redémarrer après modification du .env pour que l’API 5002 soit prise en compte.

**Usage rapide (scripts Node)** :
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
- Email crash report change : `infos@delhomme.ovh` (corrigé).
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
make rebuild && make up-full && make status
```

(`make up-all` est un alias de `make up-full`.)

Après `make up-full`, tu peux te **connecter** directement au backoffice : **admin@jobbingtrack.com** / **password123**. L’admin est créé ou mis à jour automatiquement avec email vérifié. Si besoin, `make seed-auth` force la création/mise à jour de l’admin avec `emailVerified=true`.

---

## Documentation

**Fichiers .md à la racine** (à conserver) : `README.md`, `STATUS.md`, `ERRORS.md`, `FONCTIONNALITES.md`, `RESOLUTIONS.md`. Le reste (checklist tests, TODO performance, etc.) est dans `docs/`.

| Sujet | Fichier |
|-------|---------|
| **Migrations Prisma et bases (principale vs test)** | `docs/database/MIGRATIONS_ET_BASES.md` |
| **Guide pratique – quoi faire maintenant (backoffice, test-data, intérim, mobile, BDD)** | **`docs/GUIDE_ETAPES_ACTUELLES.md`** |
| **À faire maintenant (priorité)** | Voir section « À faire maintenant » en tête de ce fichier |
| Prochaines étapes mobile (vérif email + Flutter) | `docs/mobile/PROCHAINES_ETAPES.md` |
| Fonctionnalites completes | `FONCTIONNALITES.md` |
| Backlog complet | `docs/BACKLOG.md` |
| Demarrage complet | `docs/getting-started/DEMARRAGE.md` |
| Parcours metier | `docs/user-journey/PARCOURS_METIER.md` |
| Configuration / ports | `docs/configuration/CONFIGURATION_PORTS.md`, `docs/configuration/PORTS.md` |
| Rapports performance, fixes & optimisations | `docs/performance/` (FINAL_PERFORMANCE_REPORT, RAPPORT_PERFORMANCE, FIXES_AND_OPTIMIZATIONS) |
| Flux métriques (metrics-flow) | `docs/monitoring/metrics-flow.md` |
| Statistiques projet | `docs/monitoring/STATISTIQUES_PROJET.md` |
| Status structure BDD | `docs/database/STATUS_STRUCTURE_BDD.md` |
| Tracking utilisateur | `docs/mobile/analytics/TRACKING_UTILISATEUR.md` |
| Accès réseau local | `docs/getting-started/ACCES_RESEAU_LOCAL.md` |
| Diagnostic (résultats) | `docs/development/diagnostic/DIAGNOSTIC_RESULTS.md` |
| Quick Start - Tests mobile (E2E Playwright) | `docs/tests/QUICK_START_MOBILE_TESTS.md` |
| Optimisation performance frontend (guide + rapports) | `docs/frontend/PERFORMANCE_OPTIMIZATION.md` ; rapports générés : `frontend/performance-reports/` |
| Ce qui est resolu | `RESOLUTIONS.md` |
| Erreurs connues | `ERRORS.md` |
| Performance (TODO) | `docs/todo/TODO_PERFORMANCE.md` |
| Tests couverture E2E | `docs/tests/BACKOFFICE_TESTS_COVERAGE.md` |
| Checklist tests fin de projet | `docs/tests/TESTS_END.md` |
| Schema BDD | `docs/database/SCHEMA_CHOIX.md` |
| Mobile checklist | `docs/mobile/APPLICATION_MOBILE_A_FAIRE.md` |
| Suivi boîtes d'intérim (spec) | `docs/features/SUIVI_BOITES_INTÉRIM.md` |
| Module ADB | `tools/adb-lib/index.js` (voir JSDoc en haut du fichier) |
| Deploiement | `docs/deployment/DEPLOIEMENT_FINAL.md` |
| Commandes utiles | `docs/COMMANDES_UTILES.md` |
