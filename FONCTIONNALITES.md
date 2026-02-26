# JobbingTrack – Fonctionnalites completes

**Derniere mise a jour** : 26 fevrier 2026

Ce document decrit toutes les fonctionnalites de JobbingTrack : backoffice web, application mobile, interactions BDD, systeme d'archivage/corbeille, flux utilisateur, et roadmap d'implementation.

---

## 1. Vision du produit

**JobbingTrack** est une application de suivi de candidatures pour demandeurs d'emploi. L'utilisateur (candidat) gere ses candidatures, entreprises, contacts, entretiens, relances, appels et evenements depuis une application mobile et/ou un backoffice web d'administration.

**Architecture** : 21 microservices Docker, API Gateway centralisee, PostgreSQL, Redis, monitoring custom (monitoring-c + metrics-aggregator), frontend Next.js, application mobile Flutter.

---

## 2. Entites principales et relations BDD

### 2.1 Schema des entites (41 tables)

| Entite | Description | Champs cles |
|--------|-------------|-------------|
| **User** | Utilisateur (candidat ou admin) | email, password, firstName, lastName, phone, role, isActive, emailVerified |
| **Profile** | Profil etendu utilisateur | bio, headline, avatarUrl, linkedinUrl, githubUrl, website, preferences |
| **Company** | Entreprise | name, website, industry, size, location, address, city |
| **Application** | Candidature | position, description, jobUrl, contractType, workMode, salaryMin/Max, notes, applicationDate, isArchived |
| **Contact** | Contact professionnel | firstName, lastName, position, email, phone, linkedinUrl, notes, isArchived |
| **Interview** | Entretien | interviewDate, estimatedDuration, location, videoLink, outcome, notes |
| **Call** | Appel telephonique | callDate, duration, subject, notes, status |
| **FollowUp** | Relance | followUpDate, response, notes |
| **Event** | Evenement calendrier | title, description, startDate, endDate, allDay, color, reminderEnabled, reminderMinutes |
| **Notification** | Notification | title, message, type, read, readAt, entityType, entityId |
| **Document** | Document (CV, lettre, etc.) | name, documentType, fileUrl, fileSize, mimeType |
| **SyncQueue** | File de sync offline | action, entity, entityId, payload, synced |

### 2.2 Relations entre entites

```
User ──┬── Company ──── Application ──┬── FollowUp ──── Contact (N:N)
       │                              ├── Interview ─── Contact (N:N)
       │                              ├── Call
       │                              ├── Event (polymorphe)
       │                              └── Document
       ├── Contact ──── Company (N:N)
       ├── Event
       └── Notification
```

**Relations many-to-many** (tables de jonction) :
- `ContactCompany` : un contact peut travailler dans plusieurs entreprises
- `ContactApplication` : un contact peut etre lie a plusieurs candidatures
- `FollowUpContact` : une relance peut concerner plusieurs contacts
- `InterviewContact` : un entretien peut avoir plusieurs interlocuteurs

**Liens polymorphes** : `Event` peut etre lie a une candidature, un entretien, une relance OU un appel (un seul actif a la fois via `applicationId`, `interviewId`, `followUpId`, `callId`).

### 2.3 Listes personnalisables (7 tables de config)

| Table | Exemples predefinies |
|-------|---------------------|
| **Platform** (13) | LinkedIn, Indeed, WTTJ, Pole Emploi, HelloWork, Monster, Apec, Glassdoor... |
| **FollowUpType** (6) | Relance standard, Suivi candidature, Demande feedback... |
| **FollowUpMethod** (7) | Email, Telephone, LinkedIn, Courrier, SMS... |
| **InterviewType** (9) | RH, Technique, Manager, Pair-programming, Business case... |
| **InterviewStyle** (4) | Presentiel, Visio, Telephone, Hybride |
| **EventType** (8) | Entretien, Relance, Appel, Deadline, Rappel, Reunion, Salon, Autre |
| **CallType** (5) | Entrant, Sortant, Conference, Rappel, Suivi |

### 2.4 Statuts (tables de statut personnalisables)

**ApplicationStatus** (12 predefinies) :
`CANDIDATE_PENDING` → `NO_RESPONSE` → `INTERVIEW_PENDING` → `INTERVIEW_DONE` → `OFFER_RECEIVED` → `OFFER_ACCEPTED` / `OFFER_DECLINED` / `REJECTED` / `WITHDRAWN` / `ON_HOLD` / `IN_NEGOTIATION` / `MISSION_IN_PROGRESS`

**InterviewStatus** (5) : `SCHEDULED` → `CONFIRMED` → `COMPLETED` / `CANCELLED` / `RESCHEDULED`

**FollowUpStatus** (5) : `PENDING` → `SENT` → `RESPONDED` / `NO_RESPONSE` / `CANCELLED`

**CallStatus** (4) : `SCHEDULED` → `COMPLETED` / `MISSED` / `CANCELLED`

**InterviewOutcome** (4) : `POSITIVE`, `NEGATIVE`, `NEUTRAL`, `PENDING`

---

## 3. Systeme d'archivage et corbeille

### 3.1 Logique actuelle

Le systeme utilise **deux mecanismes distincts** :

**Archivage** (`isArchived` + `archivedAt`) — pour cacher un element sans le supprimer :
- Disponible uniquement sur : `Application`, `Contact`
- Archiver une candidature archive en cascade les relances, entretiens, appels et evenements lies
- L'element n'apparait plus dans les listes normales mais reste accessible via le filtre "Archives"
- Desarchivage possible a tout moment

**Corbeille / Soft delete** (`deletedAt`) — suppression douce :
- Disponible sur : `User`, `Company`, `Application`, `Contact`, `Interview`, `Call`, `FollowUp`, `Event`, `Document`
- L'element est marque comme supprime (date enregistree) mais reste en BDD
- Restauration possible depuis la page Corbeille
- Suppression definitive apres 30 jours (ou manuelle par SUPER_ADMIN)
- `POST /api/v1/trash/empty` : vider la corbeille (SUPER_ADMIN uniquement)

### 3.2 Est-ce logique ?

**Ce qui est coherent** :
- La separation archive (masquer) vs corbeille (supprimer) est une bonne pratique
- La cascade d'archivage des candidatures est logique (si on archive une candidature, on n'a plus besoin de voir ses relances/entretiens)
- Le soft delete avec retention 30 jours protege contre les suppressions accidentelles

**Ce qui manque ou a ameliorer** :
- `Interview`, `Call`, `FollowUp`, `Event` n'ont PAS de champ `isArchived` — on ne peut que les supprimer, pas les archiver. A ajouter si on veut un archivage coherent sur tous les elements
- `Company` n'a pas de champ `isArchived` — archiver une entreprise devrait etre possible (candidatures finies chez cette entreprise)
- La page Archives du backoffice renvoie des 404/500 pour certains services qui n'implementent pas les routes d'archive — a corriger
- Il manque un endpoint unifie `GET /api/v1/trash` qui liste tous les elements en corbeille, tous types confondus

### 3.3 Endpoints archive/corbeille

| Action | Endpoint | Entites supportees |
|--------|----------|--------------------|
| Archiver | `POST /api/v1/{entity}s/{id}/archive` | Application, Contact |
| Desarchiver | `POST /api/v1/{entity}s/{id}/unarchive` | Application, Contact |
| Supprimer (soft) | `DELETE /api/v1/{entity}s/{id}` | Tous sauf Notification, Profile |
| Restaurer | `POST /api/v1/{entity}s/{id}/restore` | Tous avec `deletedAt` |
| Supprimer definitivement | `DELETE /api/v1/{entity}s/{id}/permanent` | Tous avec `deletedAt` |
| Vider corbeille | `POST /api/v1/trash/empty` | SUPER_ADMIN uniquement |

---

## 4. Fonctionnalites du backoffice web

### 4.1 Dashboard
- Vue d'ensemble : nombre de candidatures actives, entretiens a venir, relances en attente, contacts
- Metriques systeme : CPU, memoire, conteneurs Docker, sante des services
- Acces rapide a toutes les sections

### 4.2 Gestion des donnees (CRUD complet)

**Candidatures** :
- Liste avec filtres (statut, entreprise, date, plateforme)
- Creation : entreprise (existante ou nouvelle), poste, URL offre, type contrat, mode travail, salaire, notes, plateforme
- Modification de tous les champs
- Changement de statut avec historique
- Archivage / mise en corbeille
- Export CSV/JSON

**Entreprises** :
- Liste avec filtres (taille, secteur)
- Creation : nom, site web, secteur, taille, localisation
- Voir les candidatures et contacts lies
- Recherche

**Contacts** :
- Liste avec filtres (entreprise, recherche)
- Creation : prenom, nom, poste, email, telephone, LinkedIn, notes, liaison entreprise
- Voir l'historique des interactions
- Archivage / mise en corbeille

**Entretiens** :
- Liste avec filtres (a venir, date, type)
- Creation : candidature liee, contacts, date, type (RH, technique, etc.), style (presentiel, visio), duree, lieu/lien video
- Notes, feedback, resultat (positif/negatif/neutre)
- Annulation, report

**Appels** :
- Liste (historique, planifies, manques)
- Creation : contact, type, date, duree, sujet, notes, statut
- Marquer comme termine

**Relances** :
- Liste (en attente, en retard, terminees)
- Creation : candidature liee, contacts, type, methode, date, notes
- Marquer comme envoyee/repondue
- Reporter

**Evenements** :
- Vue calendrier (mois, semaine, jour)
- Creation : titre, dates, type, couleur, rappel (minutes avant), lien vers candidature/entretien/relance/appel
- Evenements a venir / aujourd'hui

**Notifications** :
- Liste (lues/non lues)
- Marquer comme lu / marquer toutes comme lues
- Types : rappel, mise a jour candidature, entretien programme, relance due, deadline, systeme

### 4.3 Pages specifiques backoffice
- Statistiques & Monitoring (vue d'ensemble, securite, logs)
- Analytics (performances reseau, CPU, conteneurs, utilisateur)
- Securite (analyse, firewall, reseau, politiques, menaces, logs)
- Services (liste, onglets, details, demarrer/arreter/redemarrer)
- Emails (envoi test, templates, configuration SMTP, delivrabilite, historique)
- Tests (hub, API, backend, frontend, securite, performance, Playwright, rapports)
- Parcours (predefinis, personnalise, rapports)
- Archives / Corbeille
- Utilisateurs (CRUD, filtres par role)
- Recherche globale
- Emulateur mobile
- Testeur d'API

---

## 5. Application mobile Flutter – Fonctionnalites detaillees

### 5.1 Authentification

**Ecran Inscription** :
1. L'utilisateur saisit : prenom, nom, email (validation format), mot de passe (min 8 caracteres), confirmation mot de passe
2. Appel `POST /api/v1/auth/register`
3. Un email de validation d'inscription est envoye a l'adresse saisie
4. L'utilisateur est redirige vers un ecran "Verifiez votre email"

**Verification email** :
1. L'utilisateur recoit un email avec un lien contenant un token
2. Clic sur le lien → l'application mobile s'ouvre (deep link) ou une page web dediee s'affiche
3. Appel `GET /api/v1/auth/verify-email/:token`
4. Page de confirmation : "Email verifie avec succes"
5. Redirection vers l'application mobile → ouverture du dashboard

**Ecran Connexion** :
1. Email + mot de passe
2. Bouton "Se connecter" → `POST /api/v1/auth/login`
3. Token JWT stocke (secure storage)
4. Redirection vers le dashboard mobile
5. Lien "Mot de passe oublie ?" → ecran dedie

**Mot de passe oublie** :
1. Saisie email → `POST /api/v1/auth/forgot-password`
2. Email avec lien de reinitialisation
3. Ecran nouveau mot de passe + confirmation → `POST /api/v1/auth/reset-password/:token`
4. Redirection vers connexion

### 5.2 Navigation mobile

**Bottom navigation bar** (5 onglets) :
1. **Accueil** (dashboard)
2. **Elements** (sous-navigation)
3. **Calendrier** (evenements)
4. **Notifications**
5. **Profil**

**Sous-navigation "Elements"** (liste avec onglets ou drawer) :
- Candidatures
- Entreprises
- Contacts
- Entretiens
- Appels
- Relances

### 5.3 Dashboard mobile
- Nombre de candidatures actives
- Prochains entretiens (date + entreprise + type)
- Relances en attente / en retard
- Derniers appels
- Statistiques rapides (taux de reponse, candidatures par mois)

### 5.4 Listes et CRUD mobile

**Liste Candidatures** :
- Affichage : poste, entreprise, statut (badge couleur), date de candidature
- Filtres : statut, entreprise, date
- Recherche textuelle
- Tri : date, statut, entreprise

**Creation Candidature** (bouton FAB "+" flottant) :
- Formulaire : entreprise (select existante ou "Nouvelle entreprise"), poste (obligatoire), URL offre, type contrat (CDI, CDD, etc.), mode travail (presentiel, remote, hybride), salaire min/max, plateforme, notes
- Validation → `POST /api/v1/applications`
- Creation automatique d'un evenement calendrier "Candidature envoyee"
- Notification de confirmation

**Detail Candidature** :
- Tous les champs editables
- Historique des changements de statut (timeline)
- Liste des entretiens lies
- Liste des relances liees
- Liste des appels lies
- Boutons : "Ajouter entretien", "Ajouter relance", "Ajouter appel"
- Changement de statut → cree une entree dans ApplicationStatusHistory
- Si statut passe a "Entretien programme" → proposition creation entretien
- Si statut passe a "Sans reponse" apres X jours → notification automatique "Relancer ?"

**Liste Entreprises** :
- Affichage : nom, secteur, taille, nombre de candidatures liees
- Creation : nom (obligatoire), site web, secteur, taille, adresse, ville, code postal
- Detail : informations + candidatures liees + contacts lies

**Liste Contacts** :
- Affichage : nom complet, poste, entreprise, email, telephone
- Creation : prenom (obligatoire), nom (obligatoire), poste, email, telephone, LinkedIn, notes, entreprise(s) associee(s)
- Detail : informations + historique interactions (appels, entretiens, relances)

**Liste Entretiens** :
- Affichage : date, entreprise, type (RH, technique...), style (presentiel, visio...), statut
- Creation depuis une candidature : date, type, style, duree estimee, lieu/lien video, contacts interlocuteurs
- Detail : notes, feedback, resultat, boutons "Reporter" / "Annuler"
- Creation automatique d'un evenement calendrier avec rappel

**Liste Appels** :
- Affichage : date, contact, sujet, duree, statut
- Creation : contact, type (entrant/sortant), date, duree, sujet, notes
- Marquer comme termine / manque
- Creation automatique d'un evenement calendrier

**Liste Relances** :
- Affichage : date, candidature liee, methode (email, tel...), statut
- Creation depuis une candidature : date, type, methode, contacts, notes
- Marquer comme envoyee / repondue / reporter
- Creation automatique d'un evenement calendrier avec rappel

### 5.5 Calendrier

- Vue mensuelle avec points de couleur par type d'evenement
- Vue liste des evenements du jour / de la semaine
- Tap sur un jour → liste des evenements
- Tap sur un evenement → detail avec lien vers l'entite liee (candidature, entretien, etc.)
- Creation rapide d'evenement
- Rappels configurables (5min, 15min, 30min, 1h, 1 jour avant)
- **Auto-creation d'evenements** : chaque creation d'entretien, relance, appel cree automatiquement un evenement calendrier associe

### 5.6 Notifications

- Liste des notifications (lues / non lues)
- Badge compteur sur l'icone
- Types et declencheurs :
  - `APPLICATION_UPDATE` : quand le statut d'une candidature change
  - `INTERVIEW_SCHEDULED` : quand un entretien est cree / reporte
  - `FOLLOWUP_DUE` : quand une relance arrive a echeance
  - `REMINDER` : rappels d'evenements calendrier
  - `DEADLINE` : deadlines de candidatures
  - `SYSTEM` : notifications systeme
- Tap sur une notification → navigation vers l'element concerne
- Marquer comme lu / marquer toutes comme lues

### 5.7 Profil

- Affichage et edition : bio, headline, photo de profil, LinkedIn, GitHub, site web
- Preferences : theme (clair/sombre), langue, fuseau horaire, notifications activees/desactivees
- Deconnexion

### 5.8 Synchronisation offline/online

- Queue de synchronisation (`SyncQueue`) : les actions effectuees hors ligne sont stockees localement
- A la reconnexion : les actions sont rejouees dans l'ordre (CREATE, UPDATE, DELETE)
- Hash de synchronisation (`syncHash`, `entityHash`) pour detecter les conflits
- `lastSyncAt` pour savoir la derniere synchronisation reussie

### 5.9 Automatisations

| Declencheur | Action automatique |
|-------------|-------------------|
| Creation candidature | Evenement calendrier "Candidature envoyee" |
| Creation entretien | Evenement calendrier avec rappel + notification |
| Creation relance | Evenement calendrier avec rappel + notification |
| Appel programme | Evenement calendrier |
| Changement statut candidature | Notification + entree historique statut |
| Candidature sans reponse > 7j | Notification "Penser a relancer" |
| Entretien dans < 24h | Notification de rappel |
| Relance en retard | Notification "Relance en retard" |

---

## 6. Interactions BDD detaillees

### 6.1 Regles metier

- Une **candidature** doit avoir une **entreprise** (creation automatique si absente)
- Un **contact** doit avoir au moins une **entreprise** associee
- Une **relance** est toujours liee a une **candidature**
- Un **entretien** est toujours lie a une **candidature**
- Un **appel** peut etre lie a un contact, une entreprise OU une candidature (au moins un)
- Un **evenement** peut etre lie a une candidature, un entretien, une relance OU un appel (un seul a la fois)
- Supprimer une candidature supprime en cascade : relances, entretiens, appels, evenements lies
- Archiver une candidature archive en cascade : relances, entretiens, appels, evenements lies
- Les **statuts** (ApplicationStatus, InterviewStatus, etc.) sont des tables en BDD, pas des enums → personnalisables par l'utilisateur
- Les **types** (InterviewType, FollowUpType, etc.) sont des tables en BDD → personnalisables

### 6.2 Flux de donnees principaux

**Flux candidature complet** :
```
Utilisateur cree Entreprise (ou existante)
  → Cree Candidature (liee a Entreprise)
    → Statut initial : CANDIDATE_PENDING
    → Evenement calendrier auto
    → Ajoute Contact(s) a la candidature
    → Cree Entretien (lie a Candidature + Contacts)
      → Evenement calendrier avec rappel
      → Notification
    → Cree Relance (liee a Candidature + Contacts)
      → Evenement calendrier avec rappel
    → Cree Appel (lie a Contact/Candidature)
    → Change statut → historique + notification
    → Archivage ou mise en corbeille quand terminee
```

---

## 7. Roadmap d'implementation

### Phase 1 : Stabilisation — FAIT

- [x] Stack 21/21 services fonctionnels
- [x] 47 tables BDD
- [x] API Gateway avec tous les endpoints
- [x] Tests API 61 (archivage + cascade + BDD + email + monitoring)
- [x] Playwright E2E 233
- [x] Tests securite (64 verifications, 0 critique)
- [x] Tests performance (15/15, score 100/100)
- [x] Tests integration OK
- [x] Hub Tests operationnel
- [x] SMTP / MailHog operationnels
- [x] Monitoring custom (monitoring-c + metrics-aggregator)

### Phase 2 : Archivage & Corbeille complets — FAIT

- [x] Champ `isArchived` + `archivedAt` sur Interview, Call, FollowUp, Event, Company
- [x] Routes archive/unarchive pour 7 entites dans chaque service backend
- [x] Cascade archivage/desarchivage (candidature → entretiens, relances, appels, evenements)
- [x] Cascade soft-delete (candidature → entretiens, relances, appels, evenements)
- [x] Corbeille candidatures (route `/trash`, `/restore`, `/permanent`)
- [x] Fix route ordering: `/trash` et `/archived` avant `/:id` dans application-service
- [x] Tests API archivage/corbeille (19 tests)
- [ ] Suppression automatique apres 30 jours (cron job ou worker)
- [ ] Endpoint unifie `GET /api/v1/trash` pour lister tous les elements en corbeille

### Phase 2.5 : Cascade statuts & auto-evenements — FAIT

- [x] Cascade statuts automatique (entretien cree → INTERVIEW_PENDING, complete → INTERVIEW_DONE, etc.)
- [x] Auto-creation evenements calendrier (entretien, relance, appel)
- [x] Historique des changements de statut (ApplicationStatusHistory)
- [x] 19 statuts ApplicationStatus predefinies (seed)
- [x] 5 EventType predefinies (INTERVIEW, FOLLOWUP, CALL, DEADLINE, OTHER)
- [x] Tests API cascade statuts (12 tests)

### Phase 2.6 : Architecture des tests — FAIT

- [x] Separation utilisateur classique (USER) vs admin (SUPER_ADMIN) dans les tests
- [x] Tests API fonctionnels via `getTestUser()` (utilisateur classique, role USER)
- [x] Tests backoffice via `getAdminUser()` (admin, role SUPER_ADMIN)
- [x] 7 tests Playwright mobile migres vers utilisateur classique
- [x] test-config.js : `testUser` (USER) + `adminUser` (SUPER_ADMIN)
- [x] test-data-helper.ts : `ensureTestUser()`, `getAdminToken()`, `loginAsAdmin()`, `getAdminCredentials()`, `REAL_TEST_EMAIL`
- [x] Rapport de tests : texte lisible + HTML interactif, badge type utilisateur (ADMIN/USER/SYSTEM)
- [x] Email de test reel (`test@delhomme.ovh`) pour verifier la reception, via env var `TEST_REAL_EMAIL` (.env, gitignored)
- [x] Tests backoffice E2E autonomes avec `loginAsAdmin()` (6 fichiers corriges)
- [x] `archive-interactions.spec.ts` utilise `getAdminToken` (fonctionnalite admin)

### Phase 3 : Interactions backoffice approfondies (en cours)

- [ ] Export/import donnees (CSV, JSON)
- [ ] Pagination et tri sur toutes les listes
- [ ] Verification email utilisateur
- [ ] Lancement de tests depuis le hub avec verification du resultat
- [ ] API versioning (route `GET /api/v1/analytics/stats/:userId/versions`)

### Phase 4 : Application mobile Flutter

**Etape 4.1 – Authentification** :
- [ ] Ecran Login (email + mot de passe → JWT)
- [ ] Ecran Inscription (prenom, nom, email, mdp, confirmation)
- [ ] Envoi email de verification
- [ ] Ecran verification email (deep link + confirmation)
- [ ] Ecran mot de passe oublie
- [ ] Ecran reinitialisation mot de passe
- [ ] Persistance session (secure storage)

**Etape 4.2 – Navigation et Dashboard** :
- [ ] Bottom navigation bar (Accueil, Elements, Calendrier, Notifications, Profil)
- [ ] Dashboard : stats rapides, prochains entretiens, relances en attente
- [ ] Drawer menu lateral (optionnel)

**Etape 4.3 – Listes et sous-navigation** :
- [ ] Sous-navigation "Elements" avec onglets
- [ ] Liste Candidatures (affichage, filtres, recherche, tri)
- [ ] Liste Entreprises
- [ ] Liste Contacts
- [ ] Liste Entretiens
- [ ] Liste Appels
- [ ] Liste Relances

**Etape 4.4 – CRUD mobile** :
- [ ] FAB (bouton flottant "+") adapte par page
- [ ] Formulaire creation Candidature (entreprise, poste, contrat, salaire, notes, plateforme)
- [ ] Formulaire creation Contact (prenom, nom, poste, email, tel, entreprise)
- [ ] Formulaire creation Entretien (depuis candidature : date, type, style, contacts)
- [ ] Formulaire creation Relance (depuis candidature : date, type, methode, contacts)
- [ ] Formulaire creation Appel (contact, type, date, duree, sujet)
- [ ] Edition de tous les elements
- [ ] Changement de statut candidature

**Etape 4.5 – Calendrier et evenements** :
- [ ] Vue calendrier mensuelle
- [ ] Liste evenements du jour
- [ ] Auto-creation evenements (entretien, relance, appel)
- [ ] Rappels configurables
- [ ] Navigation vers l'entite liee

**Etape 4.6 – Notifications** :
- [ ] Liste notifications (lues/non lues)
- [ ] Badge compteur
- [ ] Notifications automatiques (changement statut, rappels, relances en retard)
- [ ] Navigation vers l'element concerne
- [ ] Notifications push (FCM)

**Etape 4.7 – Profil et preferences** :
- [ ] Edition profil (bio, photo, liens)
- [ ] Preferences (theme, langue, notifications)
- [ ] Deconnexion

**Etape 4.8 – Synchronisation offline** :
- [ ] SyncQueue locale (CREATE, UPDATE, DELETE)
- [ ] Replay des actions a la reconnexion
- [ ] Detection de conflits (hash)
- [ ] Indicateur de statut de sync

### Phase 5 : Emulateur et deploiement

- [ ] Build APK depuis le backoffice
- [ ] Selection appareil ADB
- [ ] Logs logcat en temps reel
- [ ] Installation APK sur appareil
- [ ] Deploiement API + backoffice sur serveur
- [ ] CI/CD pipeline (GitHub Actions ou GitLab CI)

### Phase 6 : Ameliorations futures

- [ ] Analytics mobile (sessions, events, crashes)
- [ ] Documentation API Swagger/OpenAPI
- [ ] WAF reelle (au lieu de regles simulees)
- [ ] Tests E2E mobile (Patrol ou integration_test)
- [ ] Mode sombre complet
- [ ] Recherche globale avancee

---

## 8. Resume des endpoints API par entite

| Entite | GET list | GET detail | POST create | PUT update | DELETE | Specifiques |
|--------|----------|------------|-------------|------------|--------|-------------|
| Applications | `/applications` | `/applications/:id` | `/applications` | `/applications/:id` | `/applications/:id` | archive, restore, status, history, search, export, statistics |
| Companies | `/companies` | `/companies/:id` | `/companies` | `/companies/:id` | `/companies/:id` | search, contacts, applications |
| Contacts | `/contacts` | `/contacts/:id` | `/contacts` | `/contacts/:id` | `/contacts/:id` | companies, applications, interviews, calls, events, history |
| Interviews | `/interviews` | `/interviews/:id` | `/interviews` | `/interviews/:id` | `/interviews/:id` | upcoming, today, calendar, reschedule, cancel, notes, feedback, rating |
| Calls | `/calls` | `/calls/:id` | `/calls` | `/calls/:id` | `/calls/:id` | history, scheduled, missed, complete |
| FollowUps | `/followups` | `/followups/:id` | `/followups` | `/followups/:id` | `/followups/:id` | complete, postpone, due, overdue |
| Events | `/events` | `/events/:id` | `/events` | `/events/:id` | `/events/:id` | calendar, upcoming, today, month |
| Notifications | `/notifications` | `/notifications/:id` | — | `/notifications/:id/read` | `/notifications/:id` | read-all, settings, test |
| Profiles | `/profiles/me` | — | — | `/profiles/me` | — | — |
| Dashboard | `/dashboard/overview` | — | — | — | — | analytics |
| Auth | — | `/auth/verify` | `/auth/register`, `/auth/login` | — | — | logout, refresh, forgot-password, reset-password, verify-email |

Tous les endpoints sont prefixes par `/api/v1/` via l'API Gateway (port 5002).

---

**Fichiers de reference** :
- Schema BDD : `docs/database/SCHEMA_CHOIX.md`, `docs/database/recap/README.md`
- API reference : `docs/api/api-reference/README.md`
- Mobile : `docs/mobile/APPLICATION_MOBILE_A_FAIRE.md`
- Parcours metier : `docs/PARCOURS_METIER.md`
- Resolutions : `RESOLUTIONS.md`
- Erreurs connues : `ERRORS.md`
- Statut : `STATUS.md`


---

## 9. Vision utilisateur — Application mobile (notes developpeur)

> **Note** : cette section decrit la vision complete du parcours utilisateur dans l'application mobile, telle que souhaitee par le developpeur. C'est le document de reference pour l'implementation mobile.

### 9.1 Ecran d'accueil — Connexion

L'utilisateur ouvre l'application et arrive sur un ecran de connexion :
- Champ **Email**
- Champ **Mot de passe**
- Lien **Mot de passe oublie ?** → ecran reinitialisation (voir 9.3)
- Bouton **Se connecter** → si OK, redirection vers le Dashboard (voir 9.4)
- Bouton **S'inscrire** → ecran inscription (voir 9.2)

### 9.2 Inscription (Processus A)

**Formulaire d'inscription** — champs :
1. **Nom** (obligatoire)
2. **Prenom** (obligatoire)
3. **Email** (obligatoire, avec **double saisie** pour verification)
4. **Numero de telephone** (optionnel)

Bouton **Continuer** → appel `POST /api/v1/auth/register`.

**Regles metier inscription** :
- Si l'email est deja utilise par un autre compte → message d'erreur explicite
- Le compte est cree mais **non valide** tant que l'email n'est pas verifie
- L'utilisateur voit un ecran "Verifiez votre email" avec :
  - Un **timer** (ex. 60 secondes) apres lequel il peut demander le renvoi du mail
  - Un bouton **Renvoyer le mail de verification**
  - Un bouton **Modifier l'adresse email** (au cas ou il s'est trompe)
  - Le lien/code de verification a une **duree de peremption** (usage unique, temps limite)
  - La detection du retour dans l'app (deep link) doit se faire **en temps reel** (poll ou websocket) pour eviter de perdre l'etape en cours

**Validation email** :
- L'utilisateur recoit un email avec un lien ou un code
- Clic sur le lien → `GET /api/v1/auth/verify-email/:token` → compte active
- L'application detecte la validation et redirige automatiquement vers le Dashboard
- En base de donnees : champ `emailVerified = true`, `emailVerifiedAt` renseigne
- Prevoir un champ pour **limiter les changements de mot de passe** (anti-abus)

### 9.3 Mot de passe oublie (Processus C)

1. Saisie de l'email → `POST /api/v1/auth/forgot-password`
2. Email avec lien de reinitialisation (token, duree limitee)
3. Ecran nouveau mot de passe + confirmation → `POST /api/v1/auth/reset-password/:token`
4. Redirection vers ecran connexion

### 9.4 Structure principale de l'application (Processus B)

**Navigation basse (Bottom Navigation Bar) — 3 onglets principaux** :
1. **Dashboard** — statistiques utilisateur (candidatures, relances, entretiens, etc.). Contenu a definir plus tard, pas critique pour l'instant
2. **Recherche** — onglet principal et le plus important, concentre tout le suivi de candidatures
3. **Calendrier** — planning des evenements

**Drawer lateral** (accessible via hamburger menu ou swipe) :
- En haut : **Profil utilisateur** (cliquable → edition nom, photo, infos)
- **Dashboard** (lien vers la page dashboard)
- **Parametres** : reset password, modification email, parametres notifications, demande de suppression complete des donnees
- **Archives** : elements archives
- **Corbeille** : elements supprimes (soft delete)

### 9.5 Onglet Recherche — Hub de suivi (le plus important)

Navigation par **tabs horizontaux** en haut de l'ecran, dans cet ordre :
1. **Candidatures**
2. **Contacts**
3. **Entreprises**
4. **Relances**
5. **Appels**
6. **Entretiens**

#### Candidatures
- Liste triee par date de derniere candidature
- **Informations visibles sur chaque carte** : titre de l'offre, entreprise, date de candidature, etat (badge couleur)
- **Couleur de la carte** selon l'etat de la candidature (chaque statut a une couleur definie)
- **Swipe** droite/gauche : options configurer (supprimer → corbeille, archiver → archives)
- **Clic** sur une candidature → page de detail complete

#### Contacts
- Liste avec : nom, prenom, numero de telephone, nom de l'entreprise
- Clic → page detail contact

#### Entreprises
- Meme principe que contacts et candidatures
- Liste des entreprises avec informations cles

#### Relances
- Comme candidatures avec **etat de la relance** qui colore la carte
- Informations : date, titre de l'offre de la candidature liee, contact lie (nom + prenom si present), entreprise

#### Appels
- Nom du contact lie OU nom de l'entreprise (toujours l'entreprise visible)
- Indication si l'appel est dans le cadre d'une relance ou non
- **Objet de l'appel** visible sur la carte

#### Entretiens
- Liste avec etat de l'entretien (couleur de carte)
- Informations : type d'entretien, style (presentiel/visio), entreprise, poste, date

### 9.6 Calendrier

**Vues disponibles** (style Google Calendar) :
- **Jour** (1 jour)
- **3 jours**
- **Semaine** (5 jours ouvrables)
- **2 semaines**
- **Mois**
- **Planning** (liste chronologique)

**Fonctionnalites** :
- Chaque type d'evenement a une **couleur** definie (entretien, relance, appel, candidature, workflow automatique)
- Filtres pour n'afficher qu'un type d'evenement (candidatures, entretiens, relances, appels, workflows automatiques)
- Les workflows automatiques incluent les relances programmees par le systeme, les rappels, les alertes d'etat
- Pour l'instant, l'utilisateur **ne cree pas ses propres evenements** — ils sont crees automatiquement
- A terme : creation manuelle d'evenements (jobdating, salons, evenements trouves en ligne)

### 9.7 Detail d'une candidature

Page complete avec :
- Tous les champs editables
- **Timeline** historique des changements de statut
- Liste des **entretiens** lies
- Liste des **relances** liees
- Liste des **appels** lies
- Boutons d'action : "Ajouter entretien", "Ajouter relance", "Ajouter appel"
- Changement de statut → `ApplicationStatusHistory` + notification
- Si statut → "Entretien programme" : proposition de creer un entretien
- Si statut → "Sans reponse" apres X jours : notification "Relancer ?"

### 9.8 Profil et parametres

**Profil** :
- Edition : nom, prenom, photo, bio, headline, LinkedIn, GitHub, site web
- A ameliorer (details a preciser plus tard)

**Parametres** :
- Reinitialisation mot de passe
- Modification adresse email
- Parametres de notifications (activer/desactiver par type)
- Demande de suppression complete des donnees (RGPD)
- Theme (clair/sombre)

---

<details>
<summary>Notes developpeur brutes (version originale)</summary>

Une personne install l'application mobile, il arrive sur une page de connexion avec proposition email et password et bouton ensuite pour demander reinitialisation mot de passe en dessous j'ai le bouton Se connecter et en dessou de ce bouton j'ai S'inscrire. Quand il se connecter on passe directement a la partie donc B que je citerai apres et pour la reinitialisation de mot de passe donc mot de passe oublie on passe a la partie C, la partie inscription et la suite de processus logique sera la partie A donc. Continuons pour cela il clique sur S'inscrire.

A. Inscription
Apres qu'il ai clique sur le bouton s'inscrire donc l'utilisateur voir s'afficher des champs de formulaire suivant necessaire a la creation de sont compte (et de sont profil donc). Les champs sont les suivant : Nom(obligatoire), Prenom (obligatoire), Email (obligatoire et avec double champs pour verification), Numero de telephone. Il clique sur continuer et on tente de l'inscrire si l'adresse email n'est pas deja utiliser pour une autre compte present, si c'est le cas on affiche un message d'erreur.
L'utilisateur s'est inscrit donc mais n'a pas valider sont compte. On l'informe et on affiche un champs pour indiquer que il recevra par email un code ou un lien pour valider son compte.
Une fois que l'utilisateur a ouvert ses mail et clique sur le lien et retourne sur l'application mobile ou pas ca doit etre detecter en live et garder en memoire cette etape pour etre sur de pas perdre le processus, on le rediriger vers le dashboard de l'application. Le lien de validation / code on une date de peremption par mesure de securite et ne sont valide qu'une seul fois et qu'un temps donne si l'utilisateur n'a pas fait les chose a temps il doit recliquer pour recevoir le mail de validation a nouveau. il se peut que le mail n'a pas ete envoyer la premiere fois il doit y avoir donc un timer avec a la fin du timer une proposition pour renvoyer a nouveau le mail. Il a aussi pu se tromper dans l'adresse mail pour l'inscription on doit pouvoir lui permettre de modifier cela. Ont doit donc avoir un mini compte ou le compte de creer avec les information minial qu'il a inscrit pour savoir si le mail est valider ou non bref.
Quand il a bien fait la validation de l'inscription alors on a dans la base de donnee d'indiquer pour cet utilisateur qu'il a bien fait ce qu'il fallait pour valider le compte. ON rajoutera un champs aussi pour gerer les changement de mots de passe pour etre sur de pas en avoir trop a la fois enfaite.

L'utilisateur une fois inscrit arrive donc sur la page de dashboard sur l'application mobile donc. on passe a l'etape B.

B. Base principal de l'application
L'utilisateur arrive sur la page de Dashboard utilisateur ou il retrouvera un ensemble de ses statistiques de ces candidature, relance, entretien, etc etc tout cela est a definir si pas encore definit correctement plus tard car ce n'est pas crucial pour le moment et correspondra a une table specifique donc.
En bas de l'application mobile on a une navigation entre donc Dashboard, Recherche, Calendrier.
L'onglet dashboard on s'en occupe pas pour le moment comme on le disais.
L'onglet Recherche est pour l'instant le plus important. Il concentrerai l'ensemble des elements pour faire la recherche et le suivi de candidature et tout complet.
Cet onglet recherche aura en haut une navigation par tab dans l'ordre suivant : Candidatures, Contacts, Entreprises, Relances, Appels, Entretiens.
Chacun de ces onglets ameneront donc sur une page avec les choses suivantes :
Candidatures : Retrouver une liste des candidatures de l'utilisateur (peut etre completement vide si tout juste inscrit donc) trier par date de dernier postulation quoi. on verra sur chaque element de candidature les information suivante absolument primordiale et necessaire : Titre de l'offre, Entreprise, Date de la candidature, Etat de la candidature. Chaque candidature peut etre swipee droite ou gauche avec option avec configuration de suppression (corbeille), archivage (archive). Le clique sur une candidature affichera la page de details de la candidature. Chaque candidature aura un etat donc et donc une carte de candidature aura une couleur en fonction de l'etat de la candidature.
Contacts : Meme principe que avec les candidature mais pour les contacts. Les information a avoir sont le nom, prenom, numero de telephone, nom de l'entreprise. Chaque contact permet d'acceder au detail d'un contact.
Entreprises : Pareil que avec contact et candidature.
Relances : Pareil que contact et candidature mais avec comme pour candidature l'etat de candidature. Chaque etat doit avoir une couleur definie qui colore la carte dans la liste de la relance. On doit avoir comme information la date, le titre de l'offre de la candidature pour laquelle relance, si contact lie le nom et prenom du contact et l'entreprise.
Appels : Doit avoir le nom du contact lie ou le nom d'entreprise si pas de nom de contact mais toujours nom de l'entreprise lie. Elle est generalement liee a une candidature donc on verra plus tard donc et on doit avoir si c'est dans le cadre d'une relance ou non par exemple donc. Plus d'information seront indiquer plus tard mais on doit avoir l'objet principalement aussi donc d'indiquer de l'appel.
Entretiens : Meme principe que candidature et le reste liste des entretiens avec etat des entretiens qui colore les cartes donc et on peut y voir le type de l'entretien, style, et nom entreprise et pour quel poste aussi avec date donc aussi. a modifier plus tard.

La page de calendrier doit etre un calendrier avec definition de plusieurs vue de calendrier : Jour (1 jour), 3 jours (vue sur 3 jours), 1 semaine (5 jours), 2 semaines, 1 mois, Planning.
On retrouvera les differents evenements donc crees, on peut filtrer l'affichage aussi en voulant ne voir que candidature, entretiens, relances, appel, mais aussi evenement gere via workflow automatique donc a savoir relances a faire programmees par la machine automatique pour mis en avant des etats bref a detailler plus tard.
Chaque type d'evenement a une couleur. Le calendrier doit ressembler en interface a du Google Calendar. Pour le moment l'utilisateur n'est pas autorise a creer ses propres evenements mais plus tard il faut imaginer qu'il rajoute des evenements de type jobdating ou quoi qu'il trouve sur internet pour s'en rappeler.

Dans un drawer present dans l'application mobile. On devra retrouver les elements suivants : Dashboard (qui ammenera sur la page quoi de dashboard ou j'ai les sous page bottomsheet pour applications et calendrier), En haut du drawer le profil utilisateur donc cliquable et permet d'afficher les informations et modifier les informations profil utilisateur a ameliorer j'ai plus les details on verra plus tard, En dessous un lien pour cliquer pour acceder aux parametres (on definira plus tard aussi) qui concerneront reset password, modif mail, definition des parametres de notifications, demande suppression complete donnees etc etc. De dashboard dans ce drawer on retrouvera donc Archives pour voir les archives quoi, Corbeille, meme principe que archive.

</details>

