# JobbingTrack – Fonctionnalites completes

**Derniere mise a jour** : 23 fevrier 2026

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
# PERSONNAL NOTES
Une personne install l'application mobile, il arrive sur une page de connexion avec proposition email et password et bouton ensuite pour demander réintialisation mot de passe en dessous j'ai le bouton Se connecter et en dessou de ce bouton j'ai S'inscrire. Quand il se connecter on passe directemnet a la partie donc B que je citerai apres et pour le réinitialisation de mot de passe donc mot de passe oublier on passe a la partie C, la partie inscription et la suite de processus logique sera la partie A donc . Continuons pour cela il clique sur S'inscrier.

A. Inscription
Après qu'il ai clique sur le bouton s'inscrire donc l'utilisateur voir s'afficher des champs de formulaire suivant nécessaire a la création de sont compte (et de sont profil donc). Les champs sont les suivant : Nom(obligatoire), Prénom (obligatoire), Email (obligatoire et avec double champs pour vérification), Numéro  de téléphone. Il clique sur continuer et on tente de l'inscrir si l'adresse email n'est pas déjà utiliser pour une autre compte présent, si c'est le cas on affiche un message d'erreur.
L'utilisateur s'est inscrit donc mais n'a pas valider sont compte. On l'informe et on affiche un champs pour indiquer que il recevra par email un code ou un lien pour valider son compte.
Une fois que l'utilisateur a ouvert ses mail et clique sur le lien et retourne sur l'application mobile ou pas ca doit être détecter en live et garder en mémoire cette etape pour être sur de pas perdre le processus, on le rediriger vers le dashboard de l'application. Le lien de validation / code on une date de péremption par mesure de sécurité et ne sont valide qu'une seul fois et qu'un temps donne si l'jutilisateur n'a pas fait lees chose a temps il doit reclique poure recevoir le mail de validation a nouveau. il se peut que le mail n'a pas été envoyer la premier fois il doit y avoir donc un timer avec a la fin du timer une proposition pour renvoyer  anouveau le mail. Il a aussi pu se tromper dans l'adresse mail pour l'inscription on doit pouvoir lui permettre de modifier cela. Ont doit donc avoir un mini compte ou le compte de créer avec les information minial qu'il a inscrit pour savoir si le mail est valider ou non vref.
Quand il a bine fait la validation de l'insription alors on a dans la base de donnée d'indiquer pour cet utilisateur qu'il a bine fait ce qu'il fallait pur valider le compte. ON rajoutera un champs aussi pour gérer les changement de mots de passe pour être sur de pas en avoir trop a la fois enfaite.

L'uilisateur une fois inscrit arrive donc sur la page de dashbaord sur l'application moobile donc. on passe a l'étape B.

B. Base principal dee l'application
L'utilisateur arrive sur la page de Dahsboard utilisateur ou il retrouvera un ensemble de ses statistiques de ces candidature, relance, entretien, etc etc tout cela est a définit si pas encore définit correcmntet plus tard car ce n'ets pas crucial pour le moment et correespondra a une table spécifique donc.
En bas de l'application mobile on a une navigation entre donc Dashboard, Recherche, Calendrier.
L'onglet dahsboard on s'en occupe pas pour le moment comme on le disais.
L'onglet Recherche est pour l'instant le plus important. Il concentrerai l'ensemble des element pour faire la recherche et le suivit de candidature et tout complet.
Cet onglet recherche aura en haut une navigation par tab dans l'ordre suivant : Candidatures, Contacts, Entreprises, Relances, Appels, Entretiens.
Chacun des ses onglet ameneron donc sur une page avec les chose suivante : 
Candidatures : Retrouver une liste des candidatures de l'utilisateur (peut être completement vide si tout juste inscrit donc) trier par date de dernier postulation quoi. on verra sur chaque element de candidature les information suivante absoluement primordiale et nécessaire : Titre de l'offre, Entreprise, Date de la candidature, Etat de la candidature. Chaque candidature peut être swiper droite ou gauche avec option avec configuration de suppression (corbeille), archivage (archive). Le clique sur une candidature affichera la page de détails de la candidature. Chaquye candidature aura un etat docn et donc un carte de candidature aura une couleur en fonction de l'état de la candidature
Contacts : Même principe que avec les candidature mais pour les contact. Les information a avoir sont le nom, prénom, numéro de téléphone, nom de l'entreprise. Chaque contact permet d'acceder au détail d'un contact.
Entreprises : Pareil que avec contaact et candidautre
Relances : PAreil que contact et candidature mais avec comme pour candidature l'état de candidature. cahque etat doit avoir une couleur définit qui colori la carte dans la lsite de la relance. On dois avoir comme information la date, le titre de l'offre de la canddiature pour laquel relance, si contact lié le nom et prénom du contact et l'entreprise.
Appels : Doit avoir le nom du contact lié ou le nom d'entrperise si pas de nom de contact mais toujours nom de l'enterprise lié. Elle est généralement lié a une candidature donc on verra plus tard donc et on doit avoir si c'est dans le cadre d'une relance ou non par exemple donc. Plus d'informaiton seront indiquer plus tard mais on doit avoir l'objet principalement aussi donc d'indiquer de l'appel.
Entretiens : Mê pricipe que candaitre et l reste liste des entretiens avec état des entreteien qui colore les caret donc et on peux y voir le type de l'entreiten, style, et nom entreprise et pour quel poste aussi avec date docn aussi. a modifei plus tard

La page de calendrier doit être un calendrier avec définition de plusieur vue de calendirer : Jour (1 jour), 3 jours (vue sur 3 jours), 1 semaine (5 jours), 2 semaines, 1 mois, Planning.
on retrouvera les différent évenemetn donc créer, on peux filtre l'affichage aussi en voulant ne voir que candidature, entreitens, relances, appel, mais aussi evenement gérer via workflow automatiqe donc a savoir relances a faire programmer par la machine autimaique pour mis en avnt des etat bref a détaillé plus trd.
Chahque type d'évènement a une couleur. Le calendrier doit ressemble en interface a du google calendar. Pour le moment l'utilisateur n'est pas autorisé a créer ces propres évènements mais plus tard il faut imaginer qu'il rajoute des evenement de type jobdating ou quoi qu'il trouve sur internet pour s'en rappeler.

Dans un drawer pésent dans l'application mobile. on devra retrouver les element suivant : Dashbaord (qui ammenera sur la page quoi de dashboard ou j'ai les sous page bottomsheet pour applications et calendrier ej crsoi ou quoi comme dis plus haut), En haut du drawer el profil utilisateur donc clicable et permet d'afficher les information et modifeir les information porfil utilisateur à améliorer j'ia plus les détail onv erra plus tard, En dessous un lien pour clique pour accèder au paramètre (on difinire plus tard aussi) qui concerneron reset password, modif mail, définition des paramètre de notifications, demande suppression complete données etc etc. De dashbaord dans ce drawer on retrouvera donc Archives pour voir les archives quoi, Corbeille, mê eprincipe que archive.


