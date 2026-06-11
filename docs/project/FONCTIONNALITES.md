# JobbingTrack – Fonctionnalites completes

**Dernière mise à jour** : 17 avril 2026 (tests **`make tests`** : état réel et prérequis — **`STATUS.md`**, **`ERRORS.md`**, lot **F1** **`PLAN.md`** ; lot **G** § 4.4 inchangé)

Ce document decrit toutes les fonctionnalites de JobbingTrack : backoffice web, application mobile, interactions BDD, systeme d'archivage/corbeille, flux utilisateur, et roadmap d'implementation.

**Alignement chantier** (lot **A** monitoring + logs, lot **B** sécurité + **B14/B15** durcissement et tests sécurité, intérim, doc, lot **G** sauvegardes sécurisées, lot **H** release/préprod/conformité) : **`PLAN.md`**, **`TODOS.md`**, **`STATUS.md`**, **`docs/security/COMPOSE_RUNTIME_HARDENING.md`**, **`docs/operations/RELEASE_PREPROD_PRODUCTION_PLAN.md`**. Les écarts document / code en cours de traitement sont listés dans **`ERRORS.md`** (dont § *Pièges d’interprétation* pour le dashboard admin et § *Risques actifs — configuration Docker*). **Pas de PR** tant que non demandé par le porteur (voir **`TODOS.md`** en-tête).

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

### 4.1 Dashboard (vue d'ensemble `/backoffice`)

- **Cartes métriques (deux rangées)** : (1) sessions actives (dont source API sessions), carte **Incidents sécurité** (compteur aligné sur la fenêtre courte de l’agrégateur — pas une promesse « 24 h » sans endpoint dédié), santé système %, temps de réponse moyen ms ; (2) CPU et mémoire **projet / conteneurs** avec libellés explicites (total CPU = somme des conteneurs détectés, peut varier).
- **Bloc État du système** : charge, disque, CPU / mémoire machine vs projet, conteneurs actifs, résumé services (voir **ERRORS.md** si un service est vert sans uptime affiché : joignabilité ≠ durée d’uptime remontée).
- **État des services (aperçu)** : point vert = service considéré joignable ; colonne de droite = uptime si disponible, sinon **En ligne**, **~X ms**, ou **—**.
- **Panneau Performance** : temps de réponse ms (metrics-aggregator), **débit d’erreurs en /min** (`rate_per_min`, pas un %), sessions actives (auth), trafic RX/TX si métriques réseau présentes ; lien vers **Services & logs** (`/services/backoffice`) ; légende des sources en UI.
- Accès rapide aux sections admin ; métriques détaillées par service : page **Services** backoffice.
- **Corrélation incidents (performances)** : tableau détaillé requestId/endpoint/IP/HTTP/proto/port avec tri/filtres ; en cas de chargement, affichage d'un skeleton animé pour signaler clairement l'état en cours.

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
- Statistiques & Monitoring (vue d'ensemble, securite, logs) — *chantier : **`PLAN.md`** lot **A** (monitoring + logs) puis lot **B** (sécurité) ; tâche **A5** = historique persisté et pages liées*
- Analytics (performances réseau, CPU, conteneurs, utilisateur) : séries historiques avec **graduations heure locale** navigateur ; après normalisation des réponses (**`normalizeMetricRows`**), **`timestampMs`** suit l’**instant ISO** pour éviter un axe décalé si le JSON mélangeait les deux champs.
- Securite (analyse, firewall, reseau, politiques, menaces, logs)
- Services (liste, onglets, details, demarrer/arreter/redemarrer)
- **Détail service** (`/backoffice/services/[nom]`, avril 2026) : métriques **Docker stats** avec précision affichée (CPU faible, mémoire usage/limites, réseau cumulé, **disque block I/O**), **historique** combinant fichiers agrégateur + points collectés pendant la session, **auto-rafraîchissement** paramétrable (10–60 s) et aide sur le compteur **PIDs** — lot **A1** dans `PLAN.md` (tâche **A5** pour persistance multi-pages). **Lot A3 (partiel)** : encart **sécurité** + lien vers **logs multi-services** filtrés pour rapprocher logs conteneur et événements firewall / menaces. **Forensics (mai 2026)** : la majorité des microservices HTTP et l’**API Gateway** enrichissent les logs **WARN/ERROR** avec **requestId** / corrélation, IP, endpoint, port (voir **`PLAN.md`** A3 / **B6**, **`TODOS.md`**, **`TRUST_PROXY_HOPS`** côté gateway) pour alimenter la corrélation perf / incidents ; **workflow-service** et QA bout-en-bout sur **`/backoffice/performances/correlation`** restent à cadrer si besoin.
- Emails (envoi test, templates, configuration SMTP, delivrabilite, historique)
- **Agent email / tâches recherche emploi** (prévu — lot **I**, non implémenté) : espace utilisateur privé JobbingTrack sur `/`, séparé du backoffice admin `/b4ck0ff1ce`, utilisable par le compte personnel non-admin explicitement autorisé, pour tri des emails depuis comptes/boîtes configurés hors Git, liaison aux candidatures/entreprises/contacts, stockage interne des emails utiles, tâches/relances/événements, digest quotidien à 18h et récap hebdomadaire via le socle SMTP JobbingTrack, préparation entretiens, Google Tasks/Calendar obligatoires, moteur déterministe puis IA locale en renfort. Calendar ne doit pas créer automatiquement d’événement à `00:00`, avant `05:00` ou après `23:00` : ces cas restent en tâche/proposition à confirmer. Le périmètre prévu inclut dashboard responsive mobile, base de composants partagée avec le backoffice, option future `user-frontend` / `backoffice-frontend`, revalidation PIN avec clavier numérique pour actions sensibles, autocomplete poste/ville/plateforme accessible clavier/ARIA, boîte de réception agent triée, préparation/envoi relance-email depuis l’interface après validation, calendrier agrégé, programmation manuelle d’appels/tâches/rappels/événements même sans email déclencheur, appels préremplis par contact/entreprise, relances créées depuis fiche candidature, détail entreprise enrichi avec candidatures/contacts/relances/appels/missions intérim, import Google Contacts CSV/vCard, sauvegarde PDF d’offre depuis URL, veille salons/job dating par ville/région et suite de tests dédiée avec rapports. Cadrage : `docs/features/EMAIL_TRIAGE_AGENT.md`.
- Tests (hub, API, backend, frontend, securite, performance, Playwright, rapports) — suite **`make tests`** : prérequis **`make up-full`**, **`API_GATEWAY_URL`** joignable depuis la machine qui lance les scripts (souvent **`http://127.0.0.1:5002`**, pas les noms Docker seuls) ; le résumé « tout vert » peut masquer des étapes partielles — lire **`tests/results/<id>/report.html`**. Gate Jest front : **`npm run test:unit-and-analytics`** (**`PLAN.md`** lot **F1**). Détail des écarts actuels : **`ERRORS.md`**, **`STATUS.md`** (17/04/2026).
- Parcours (predefinis, personnalise, rapports)
- Archives / Corbeille
- Utilisateurs (CRUD, filtres par role)
- Recherche globale
- Emulateur mobile
- Testeur d'API

### 4.4 Sauvegardes, reprise d'activite et continuite (prevu — lot **G**)

**Statut** : spécifié dans **`PLAN.md`** (lot **G**) et **`TODOS.md`** ; **non implémenté** à ce stade — objectif : sécurité **renforcée** par rapport au socle actuel (WAF, firewall, secrets internes).

**Vision** :

- **API dédiée** (via **API Gateway**, **non exposée publiquement** sans contrôle réseau) : création et suivi de **jobs** de sauvegarde (PostgreSQL, éventuellement artefacts de configuration **déjà anonymisés**), historique avec statuts ; authentification **forte** (JWT rôle administrateur élevé, éventuellement **double contrôle** avec secret de service interne pour les tâches automatiques) ; **rate limiting** et **journal d’audit** (qui a déclenché quoi, quand).
- **Chiffrement** : dumps et archives **chiffrés au repos** avant stockage durable ; clés gérées hors code (secrets Docker, vault, KMS selon environnement) ; **intégrité** vérifiable (empreinte / signature).
- **Délocalisation** : envoi vers **stockage distant** (compatible S3, second serveur, etc.) avec identifiants **uniquement** côté serveur ; option **téléchargement ponctuel** chiffré via **lien à courte durée de vie** (token), sans exposer de secrets dans le navigateur.
- **Backoffice administrateur** : interface (chemin exact à trancher : ex. section **Administration** ou **Développement**) pour **lancer** une sauvegarde manuelle (avec confirmation), consulter l’**état** des jobs, lire les **erreurs** sans fuite d’informations sensibles ; **restauration** : privilégier d’abord un **environnement de secours** / sandbox et un **runbook** documenté avant toute remise en prod automatique.
- **Continuité (PCA / PRI)** : cibles **RPO/RTO** à définir ; procédures de **redémarrage** des services et de **restauration** BDD ; **exercices** de restauration recommandés.

**Exigences de sécurité rappelées** : moindre privilège, pas de dumps en clair sur disques partagés non protégés, corrélation possible avec les **logs sécurité** en cas de tentatives d’accès non autorisées aux routes backup.

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

### 5.9 Automatisations et moteur de statut

**Auto-creation evenements et notifications** :

| Declencheur | Action automatique |
|-------------|-------------------|
| Creation candidature | Evenement calendrier "Candidature envoyee" |
| Creation entretien | Evenement calendrier avec rappel + notification + statut → `INTERVIEW_PENDING` |
| Creation relance | Evenement calendrier avec rappel + notification |
| Appel programme | Evenement calendrier |
| Changement statut candidature | Notification + entree historique statut |
| Candidature sans reponse > 7j | Statut → `NO_RESPONSE` + notification "Penser a relancer" |
| Entretien dans < 24h | Notification de rappel |
| Relance en retard | Notification "Relance en retard" |

**Moteur de statut intelligent** (voir section 10.6 pour details complets) :

| Declencheur temporel | Transition / Action |
|---------------------|-------------------|
| Relance envoyee sans reponse > 5j | Notification "Relance sans reponse" |
| Entretien passe sans retour > delai annonce (ou 7j) | Notification "Date retour depassee, relancer ?" |
| 3+ relances sans reponse | Suggestion "Considerer comme rejetee ?" |
| Reception mail de rejet (flag utilisateur) | Statut → `REJECTED` immediat, evenements futurs annules |
| Entretien complete (feedback saisi) | Statut → `INTERVIEW_DONE` |
| Email remerciement post-entretien envoye (flag) | Reset compteur relance |
| Entretien annule par entreprise | Statut → `NO_RESPONSE` |

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
- [x] Tests API (nombreux scénarios : archivage, cascade, BDD, email, monitoring) — **sous réserve** d’URL gateway correcte et stack up ; sinon échecs **`ENOTFOUND` / `ECONNREFUSED`** (voir **`ERRORS.md`**)
- [~] Playwright E2E — volumineux ; échecs récurrents sur **login** (timeouts, toggle mot de passe), **api-e2e** si la base URL pointe vers un hôte injoignable depuis le navigateur — **`TODOS.md`** lot F
- [~] Tests sécurité (script) — exécution **complète** (XSS, SQLi, CSRF, etc.) mais sorties **partielles** si **`API_GATEWAY_URL`** / headers **ENOTFOUND** ; le résumé « acceptable » + **60 sécurisées** ne signifie pas que chaque sonde a touché un service réel
- [~] Tests performance avancés — le script mesure latences / charge ; **code de sortie non nul** si endpoints ou charge en échec (avril 2026) ; ne plus afficher **SUCCÈS** Jest/Makefile si tout est rouge (alignement en cours)
- [~] Tests intégration système — peut afficher **SUCCÈS** alors que les sondes loggent **ENOTFOUND** (script tolérant) ; à interpréter avec **`tests/results/...`**
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
- [x] Email de test reel (`test-recipient@example.invalid`) pour verifier la reception, via env var `TEST_REAL_EMAIL` (.env, gitignored)
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

- [x] **Liste des parcours mobiles** : dans l’émulateur backoffice (`/backoffice/mobile-emulator`), section « Parcours utilisateur mobile » :
  - **Parcours principaux** (toujours visibles en tête) : Inscription complète, Reset mot de passe, Première utilisation, Usage quotidien, Archives & Corbeille, Parcours complet
  - **Tous les parcours** : 30+ scénarios (auth, navigation, vérification, CRUD, parcours complets) filtrables par catégorie, sélection puis « Lancer le parcours » sur l’appareil ADB sélectionné
  - Définitions : `frontend/src/lib/adb/adb-scenarios.ts` (`MOBILE_SCENARIOS`, `PRIMARY_MOBILE_JOURNEY_KEYS`)
- [x] Sélection appareil ADB (AVD ou appareil physique)
- [x] Build APK depuis le backoffice (bouton « Build APK »)
- [x] Installation APK sur appareil + lancement (bouton « Installer et lancer ») — `adb install -r` met à jour l’app si déjà installée, puis lance l’activité principale
- [ ] Logs logcat en temps réel (optionnel)
- [ ] Déploiement API + backoffice sur serveur
- [ ] CI/CD pipeline (GitHub Actions ou GitLab CI)

### Phase 6 : Ameliorations futures

- [x] Analytics mobile — crash reporting (sessions, events, crashes via `CrashReporter`)
- [ ] Documentation API Swagger/OpenAPI
- [ ] WAF reelle (au lieu de regles simulees)
- [ ] Tests E2E mobile (Patrol ou integration_test)
- [ ] Mode sombre complet
- [ ] Recherche globale avancee
- [ ] **(Version complete, bien plus tard)** Option utilisateur : demander si l’utilisateur souhaite que l’app parse ses mails pour aider au traitement automatique (candidatures, relances, suivi). Pas prevu du tout pour le moment.

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
- Parcours metier : `docs/user-journey/PARCOURS_METIER.md`
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
- **Swipe gauche** : Supprimer → corbeille (avec confirmation)
- **Swipe droite** : Archiver → archives
- **Clic** sur une candidature → page de detail complete
- **FAB "+"** : creer une nouvelle candidature (formulaire complet, voir 10.1)

#### Contacts
- Liste avec : nom, prenom, numero de telephone, nom de l'entreprise
- **Swipe gauche** : Supprimer → corbeille
- **Swipe droite** : Archiver → archives
- Clic → page detail contact
- **FAB "+"** : creer un nouveau contact (standalone, voir 10.14 cas 1)

#### Entreprises
- Meme principe que contacts et candidatures
- Liste des entreprises avec informations cles
- **Swipe gauche** : Supprimer → corbeille
- Clic → page detail entreprise (candidatures liees + contacts lies)

#### Relances
- Comme candidatures avec **etat de la relance** qui colore la carte
- Informations : date, titre de l'offre de la candidature liee, contact lie (nom + prenom si present), entreprise
- **Swipe gauche** : Supprimer → corbeille
- **Swipe droite** : Marquer comme terminee
- **Pas de FAB** ici — la creation d'une relance se fait UNIQUEMENT depuis le detail d'une candidature (voir 10.16)

#### Appels
- Nom du contact lie OU nom de l'entreprise (toujours l'entreprise visible)
- Indication si l'appel est dans le cadre d'une relance ou non
- **Objet de l'appel** visible sur la carte
- **Swipe gauche** : Supprimer → corbeille
- **Swipe droite** : Marquer comme termine
- **Pas de FAB** ici — la creation d'un appel se fait UNIQUEMENT depuis le detail d'une candidature (voir 10.16)

#### Entretiens
- Liste avec etat de l'entretien (couleur de carte)
- Informations : type d'entretien, style (presentiel/visio), entreprise, poste, date
- **Swipe gauche** : Annuler l'entretien
- **Swipe droite** : Reporter (choix nouvelle date)
- **Pas de FAB** ici — la creation d'un entretien se fait UNIQUEMENT depuis le detail d'une candidature (voir 10.16)

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

## Notes développeur brute (version originale)
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


Ont peux ajouter un contact ou plusieur contact a un entreitne pour le lier directemnet (c'est forcément au moins qulque de l'entreprise sinon de la candiadture) et sinon création d'un nouveau contzct avec qui j'aurai l'entretien), je dois pouvoir prendre des notes pour préparer l'entreitne, des notes pendant l'entretien, et note poste entretien l'application doit maider  agérer cela donc le processus entretien, je dois avoir donc plutot que Entrepris ene navigation en bas il dois rester a gauche dans le drawer et a la place avec le Calendrier juste un calenderier a la google calendar enfaite qui affichera les truc candidature faite onc, relance, entretien, appel passer, etc etc s'il te palit 

Le passage sur Candidature dois permete le bouton fab plus la d'ajouter une candidature ensuite je dois pouvoir faire d'autre chose s'il te plait voila quoi les processus complet un formulaite pour ajouter une candidature avec les champs nécessaire déjà s'il te plait 
</details>

---

## 10. Processus metier a implementer (mobile)

> **Note** : cette section liste les processus complets a implementer dans l'app mobile et a tester via ADB.

### 10.1 Ajout d'une candidature

1. Depuis la liste Candidatures (onglet 2) ou le bouton FAB "+"
2. Formulaire : Entreprise (select existante ou nouvelle), Poste (obligatoire), URL offre, Type contrat (CDI, CDD, Freelance, Stage, Alternance), Mode travail (Presentiel, Remote, Hybride), Salaire min/max, Plateforme (LinkedIn, Indeed, WTTJ, etc.), Notes
3. Validation → `POST /api/v1/applications`
4. Retour liste avec la nouvelle candidature visible
5. Creation automatique evenement calendrier

### 10.2 Ajout d'une relance a une candidature

1. Depuis le detail d'une candidature → bouton "Ajouter relance"
2. Formulaire : Date de relance, Type (Relance standard, Suivi, Demande feedback), Methode (Email, Telephone, LinkedIn, Courrier, SMS), Contact(s) lie(s) (selection parmi contacts existants ou nouveau), Notes
3. Validation → `POST /api/v1/followups` avec `applicationId`
4. Auto-creation evenement calendrier avec rappel
5. Notification de confirmation

### 10.3 Ajout d'un entretien a une candidature

1. Depuis le detail d'une candidature → bouton "Ajouter entretien"
2. Formulaire : Date et heure, Type (RH, Technique, Manager, Pair-programming, Business case), Style (Presentiel, Visio, Telephone, Hybride), Duree estimee, Lieu ou lien video, Contact(s) interlocuteur(s) (selection ou creation), Notes de preparation
3. Validation → `POST /api/v1/interviews` avec `applicationId`
4. Auto-creation evenement calendrier avec rappel (1h avant par defaut)
5. Notification "Entretien programme"
6. Changement automatique statut candidature → `INTERVIEW_PENDING`
7. L'entretien doit gerer 3 phases de notes : **preparation**, **pendant**, **post-entretien**

### 10.4 Ajout d'un appel a une candidature

1. Depuis le detail d'une candidature → bouton "Ajouter appel"
2. Formulaire : Contact (selection parmi contacts lies a la candidature/entreprise, ou nouveau contact), Type (Entrant, Sortant, Conference, Rappel, Suivi), Date, Duree estimee, Sujet, Notes
3. Validation → `POST /api/v1/calls` avec `applicationId` + `contactId`
4. Auto-creation evenement calendrier
5. L'appel est automatiquement lie a la candidature ET a l'entreprise de la candidature

### 10.5 Liaison contact ↔ candidature/entreprise

1. Depuis le detail d'une candidature → section Contacts → "Ajouter contact"
2. Selection d'un contact existant (deja lie a l'entreprise de la candidature) OU creation d'un nouveau contact
3. Le contact est lie a la candidature via `ContactApplication` ET automatiquement a l'entreprise via `ContactCompany`
4. Le contact apparait ensuite dans les selections pour entretiens, relances et appels

### 10.6 Changement de statut d'une candidature — Machine a statuts intelligente

Le statut d'une candidature evolue automatiquement en fonction des actions et du temps. L'utilisateur peut aussi forcer un statut manuellement.

**Preference utilisateur : mode auto vs manuel** :
- Champ `statusEngine.autoStatusEnabled` dans les preferences utilisateur (`UserCustomization.settings`)
- **Mode auto** (default: `true`) : les transitions de statut se font automatiquement (entretien cree → INTERVIEW_PENDING, etc.)
- **Mode manuel** (`false`) : aucune cascade automatique, l'utilisateur gere tout manuellement via le detail candidature
- Le changement manuel de statut (via PUT /status) reste toujours possible quel que soit le mode
- Configuration via `PUT /api/v1/auth/preferences` avec `{ statusEngine: { autoStatusEnabled: false } }`
- Parametres supplementaires configurables : `noResponseDays` (defaut 7), `followUpNoResponseDays` (defaut 5), `interviewFeedbackDays` (defaut 7), `maxFollowUpsBeforeReject` (defaut 3), `autoCreateReminders` (defaut true)

**Les 12 statuts** : `CANDIDATE_PENDING` → `NO_RESPONSE` → `INTERVIEW_PENDING` → `INTERVIEW_DONE` → `OFFER_RECEIVED` → `OFFER_ACCEPTED` / `OFFER_DECLINED` / `REJECTED` / `WITHDRAWN` / `ON_HOLD` / `IN_NEGOTIATION` / `MISSION_IN_PROGRESS`

**Changement manuel** :
1. Depuis le detail d'une candidature → selection du nouveau statut
2. `PUT /api/v1/applications/:id` avec nouveau statut
3. Creation entree `ApplicationStatusHistory`
4. Notification automatique `APPLICATION_UPDATE`

**Transitions automatiques basees sur les actions** :

| Evenement declencheur | Transition automatique | Notification |
|----------------------|----------------------|--------------|
| Candidature creee | → `CANDIDATE_PENDING` | — |
| 7 jours sans action | → `NO_RESPONSE` | "Penser a relancer" |
| Entretien programme | → `INTERVIEW_PENDING` | Proposition creation entretien |
| Entretien complete (outcome renseigne) | → `INTERVIEW_DONE` | "Entretien termine, quelle suite ?" |
| Offre recue (flag/action utilisateur) | → `OFFER_RECEIVED` | "Offre recue !" |
| Utilisateur accepte l'offre | → `OFFER_ACCEPTED` | — |
| Utilisateur decline l'offre | → `OFFER_DECLINED` | — |
| Email de rejet recu (flag/action) | → `REJECTED` (coupe tout le processus) | "Candidature rejetee" |
| Utilisateur retire sa candidature | → `WITHDRAWN` | — |

**Logique temporelle intelligente** :

1. **Apres la candidature** : si aucune action (relance, entretien) pendant 7 jours → passage auto a `NO_RESPONSE` + notification "Penser a relancer"
2. **Apres une relance envoyee** : si pas de reponse apres 5 jours → notification "Relance sans reponse, envisager une 2e relance ?"
3. **Apres un entretien** : si pas de retour dans le delai annonce (ou 7 jours par defaut) → notification "Date de retour depassee, relancer ?"
4. **Mail de confirmation post-entretien** : l'utilisateur peut marquer "email de remerciement envoye" → cela remet le compteur de relance a zero
5. **Plusieurs relances sans reponse** : apres 3 relances restees sans reponse → suggestion "Considerer cette candidature comme rejetee ?" avec bouton pour passer a `REJECTED`
6. **Reception d'un mail de rejet** : l'utilisateur marque "Rejet recu" → passage immediat a `REJECTED`, coupe tout le processus de statut, archive les evenements futurs lies
7. **Entretien annule par l'entreprise** : retour a `NO_RESPONSE` + notification

**Facteurs pris en compte pour les suggestions** :
- Temps ecoule depuis la derniere action (candidature, relance, entretien)
- Nombre de relances effectuees et leurs reponses
- Entretiens programmes/passes/a venir
- Feedback de l'entretien (positif/negatif/neutre)
- Date de retour annoncee lors d'un entretien
- Actions de l'utilisateur (email de remerciement, relance manuelle)

**Cas d'usage et ordre des actions** (tous coherents avec la cascade et l'automatisation) :
- **Rejet manuel** : l'utilisateur indique "Rejet recu" (ou passe le statut a REJECTED avec un commentaire) → passage immediat a REJECTED ; le moteur ne modifie plus cette candidature. Teste dans `test-status-engine.test.js` et `step-status-engine.js`.
- **Relance avant une relance prevue** : l'utilisateur peut creer plusieurs relances ; la creation de relances ne change pas le statut candidature. Seule la creation d'un entretien declenche INTERVIEW_PENDING en mode auto.
- **Entretien avant une relance / relance puis entretien** : si l'utilisateur cree d'abord une relance puis un entretien, la cascade s'applique a la creation de l'entretien → INTERVIEW_PENDING. L'ordre des creations n'invalide pas la logique.
- **Appel pour relancer** : la creation d'un appel ne declenche pas de changement de statut automatique ; l'utilisateur peut mettre a jour le statut manuellement. Les evenements calendrier (entretien, relance, appel) sont crees automatiquement.
- **Changement manuel toujours prioritaire** : en mode manuel (autoStatusEnabled: false), aucune cascade ; en mode auto, un PUT explicite sur le statut (ex. REJECTED) est toujours enregistre et l'historique mis a jour.

**Option par candidature** (implementee) :
- Champ `statusEngineOptOut` sur le modele Application (defaut false). Quand `true`, le moteur de statut automatique ne s'applique pas a cette candidature : creation d'entretien, completion, outcome ne declenchent pas de cascade. L'utilisateur gere le statut uniquement a la main pour cette candidature.
- Permet de desactiver le moteur pour une seule candidature tout en gardant le mode auto pour les autres (ou l'inverse selon la preference globale).
- API : lecture/ecriture via GET/PUT `applications/:id` (champ `statusEngineOptOut`). Si absent, comportement = preference utilisateur (autoStatusEnabled).

### 10.7 Verification des notifications

1. Tester que les notifications sont bien recues apres :
   - Creation entretien → notification INTERVIEW_SCHEDULED
   - Changement statut → notification APPLICATION_UPDATE
   - Relance a echeance → notification FOLLOWUP_DUE
   - Rappel evenement → notification REMINDER
2. Verifier le badge compteur sur l'icone
3. Tap sur notification → navigation vers l'element concerne
4. Marquer comme lu / marquer toutes comme lues

### 10.8 Reset mot de passe complet

1. Ecran connexion → "Mot de passe oublie ?"
2. Saisie email → `POST /api/v1/auth/forgot-password`
3. Verification reception email (MailHog ou email reel)
4. Clic lien → ecran nouveau mot de passe
5. Saisie nouveau mot de passe + confirmation → `POST /api/v1/auth/reset-password/:token`
6. Retour ecran connexion
7. Login avec le nouveau mot de passe → succes

### 10.9 Gestion complete d'une relance

1. Creer une relance (depuis detail candidature)
2. Voir la relance dans la liste "A venir"
3. Marquer comme envoyee (statut SENT)
4. Attendre echeance → verifier notification FOLLOWUP_DUE
5. Marquer comme terminee (avec reponse) → passe en "Terminees"
6. Reporter une relance → date mise a jour
7. Supprimer une relance → confirmation → corbeille

### 10.10 Gestion complete d'un entretien

1. Creer un entretien (depuis detail candidature)
2. Ajouter notes de preparation
3. Verifier evenement calendrier avec rappel
4. Ajouter notes pendant l'entretien
5. Marquer comme complete → saisir feedback + resultat (Positif/Negatif/Neutre)
6. Ajouter notes post-entretien
7. Reporter un entretien → nouvelle date → evenement mis a jour
8. Annuler un entretien

### 10.11 Swipe et actions rapides sur les listes

Le swipe droite/gauche est disponible sur **toutes les listes d'elements**, pas seulement les candidatures.

**Elements supportant le swipe** :

| Element | Swipe gauche (danger) | Swipe droite (action) |
|---------|----------------------|----------------------|
| **Candidature** | Supprimer → corbeille | Archiver → archives |
| **Contact** | Supprimer → corbeille | Archiver → archives |
| **Entreprise** | Supprimer → corbeille | — |
| **Relance** | Supprimer → corbeille | Marquer terminee |
| **Entretien** | Annuler | Reporter |
| **Appel** | Supprimer → corbeille | Marquer termine |

**Regles de swipe** :
1. Swipe revele des boutons d'action (style iOS/Material)
2. Chaque action demande une **confirmation** (dialog avec "Annuler" / "Confirmer")
3. Un **undo/annuler** est propose pendant 5 secondes via un snackbar apres une suppression
4. Le swipe complet (au-dela d'un seuil) execute directement l'action avec confirmation
5. Le swipe partiel revele les boutons sans executer

### 10.12 Suppression et suppression definitive

**3 niveaux de suppression** :

1. **Suppression douce (soft delete)** :
   - `DELETE /api/v1/{entity}s/{id}`
   - L'element est marque `deletedAt = now()` mais reste en BDD
   - Disparait des listes actives
   - Visible dans la page **Corbeille**
   - Dialog de confirmation : "Supprimer cet element ? Il sera deplace dans la corbeille."
   - Boutons : "Annuler" / "Supprimer"

2. **Restauration** :
   - Depuis la page Corbeille → bouton "Restaurer"
   - `POST /api/v1/{entity}s/{id}/restore`
   - L'element reapparait dans la liste active
   - Pas de confirmation requise

3. **Suppression definitive** :
   - Depuis la page Corbeille → bouton "Supprimer definitivement"
   - `DELETE /api/v1/{entity}s/{id}/permanent`
   - Dialog de confirmation **renforce** : "Attention : cette action est irreversible. L'element sera definitivement supprime."
   - Boutons : "Annuler" / "Supprimer definitivement" (bouton rouge)
   - Accessible uniquement par l'utilisateur proprietaire ou SUPER_ADMIN
   - **Auto-suppression** : elements en corbeille depuis 30+ jours sont automatiquement supprimes (cron job quotidien)

**Cascade de suppression** :
- Supprimer une candidature → supprime en cascade : relances, entretiens, appels, evenements lies
- Supprimer une entreprise → les candidatures liees deviennent orphelines (warning avant suppression)
- Supprimer un contact → les liaisons (ContactApplication, ContactCompany, InterviewContact, FollowUpContact) sont supprimees

### 10.13 Archivage complet

1. **Archiver une candidature** :
   - `POST /api/v1/applications/{id}/archive`
   - Elle disparait de la liste active
   - **Cascade** : relances, entretiens, appels et evenements lies sont aussi archives
   - Les evenements futurs lies sont desactives (rappels annules)
   - Visible dans la page **Archives**

2. **Archiver un contact** :
   - `POST /api/v1/contacts/{id}/archive`
   - Il disparait de la liste active mais reste dans les liaisons existantes
   - Visible dans la page Archives

3. **Desarchiver** :
   - `POST /api/v1/{entity}s/{id}/unarchive`
   - L'element reapparait dans la liste active
   - Les elements en cascade sont aussi desarchives
   - Les evenements futurs sont reactives

4. **Page Archives** :
   - Accessible via le drawer → "Archives"
   - Affiche tous les elements archives, groupes par type (Candidatures, Contacts)
   - Bouton "Desarchiver" sur chaque element
   - Bouton "Supprimer" (→ corbeille)

### 10.14 Creation de contact — standalone ou lie

**Cas 1 : Contact standalone** (depuis la liste Contacts ou Recherche → Contacts) :
1. FAB "+" → formulaire : Prenom, Nom, Poste, Email, Telephone, LinkedIn, Notes
2. **Entreprise** : selection existante ou creation nouvelle (nom obligatoire)
3. Validation → `POST /api/v1/contacts` + `POST /api/v1/contact-companies` (liaison)
4. Le contact apparait dans la liste

**Cas 2 : Contact lie a une candidature** (depuis detail candidature → section Contacts → "Ajouter") :
1. **Option A** : Selectionner un contact existant (filtre par entreprise de la candidature)
2. **Option B** : Creer un nouveau contact → meme formulaire que cas 1
3. Dans les 2 cas → `POST /api/v1/contact-applications` (liaison candidature)
4. Le contact est **automatiquement lie a l'entreprise** de la candidature via `ContactCompany`
5. Le contact apparait dans les selections pour entretiens, relances, appels de cette candidature

**Cas 3 : Contact lors creation entretien/relance/appel** :
1. Pendant la creation d'un entretien, relance ou appel, selection de contact(s)
2. Si aucun contact n'est lie → proposition "Ajouter un contact d'abord"
3. Si le contact n'existe pas → creation rapide inline (prenom + nom + poste minimum)
4. Le contact est automatiquement lie a la candidature ET a l'entreprise

### 10.15 Auto-creation entreprise

**Lors de la creation d'une candidature** :
1. Champ entreprise avec auto-complete (recherche parmi les entreprises existantes)
2. Si l'entreprise n'existe pas → bouton "Creer" ou saisie directe du nom
3. `POST /api/v1/companies` avec le nom minimum
4. La nouvelle entreprise est automatiquement liee a la candidature
5. L'utilisateur peut completer les details plus tard (site web, secteur, taille, adresse)

**Lors de la creation d'un contact** :
1. Meme principe : champ entreprise avec auto-complete
2. Si nouvelle entreprise → creation automatique avec nom minimum
3. Liaison `ContactCompany` automatique

### 10.16 Regles de liaison — entretien, relance, appel

**Entretien** :
- **Toujours lie a une candidature** — creation UNIQUEMENT depuis le detail d'une candidature
- Jamais cree de maniere standalone (pas de FAB sur la liste Entretiens)
- Contact(s) interlocuteur(s) = contacts lies a la candidature ou a l'entreprise
- Si aucun contact → creation rapide inline

**Relance** :
- **Toujours liee a une candidature** — creation UNIQUEMENT depuis le detail d'une candidature
- Jamais creee de maniere standalone
- Contact(s) destinataire(s) = contacts lies a la candidature ou a l'entreprise

**Appel** :
- **Toujours lie via une candidature** pour la liaison correcte
- Le contact de l'appel doit etre lie a l'entreprise de la candidature OU a la candidature elle-meme
- L'appel herite automatiquement de la liaison avec l'entreprise de la candidature
- Cas special : appel de suivi apres relance → l'appel est aussi lie a la relance

### 10.17 Calendrier et evenements

1. Verifier auto-creation evenements pour chaque : entretien, relance, appel
2. Vue mensuelle avec couleurs par type
3. Filtrer par type d'evenement
4. Tap sur un evenement → navigation vers l'entite liee
5. Verifier rappels configurables (5min, 15min, 30min, 1h, 1 jour avant)
6. Evenements auto-generes par le moteur de statut (rappel relance, date retour depassee, etc.)

---

## 11. Synchronisation mobile / API

### 11.1 Architecture

L'application mobile fonctionne en mode offline-first. Les actions effectuees hors connexion sont stockees localement et synchronisees a la reconnexion.

**Modele `SyncQueue`** (existe deja en BDD) :
- `id`, `userId`, `action` (CREATE/UPDATE/DELETE), `entity`, `entityId`, `payload`, `synced`, `attempts`, `lastAttempt`, `error`, `createdAt`, `syncedAt`

### 11.2 Endpoints API a implementer

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/api/v1/sync/push` | POST | Envoyer les actions locales vers le serveur. Body : `{ actions: [{ action, entity, entityId, payload, createdAt }] }`. Le serveur rejoue chaque action dans l'ordre chronologique. |
| `/api/v1/sync/pull` | GET | Recuperer les modifications serveur depuis `?since=<timestamp>`. Retourne toutes les entites modifiees/creees/supprimees depuis ce timestamp. |
| `/api/v1/sync/status` | GET | Etat de la derniere synchronisation : `{ lastSyncAt, pendingCount, conflictsCount }` |
| `/api/v1/sync/resolve` | POST | Resoudre un conflit manuellement : `{ entityType, entityId, resolution: 'local' | 'server' }` |

### 11.3 Strategie de resolution des conflits

- **Strategie par defaut** : last-write-wins (le dernier a ecrire gagne)
- **Detection** : chaque entite a un `syncHash` (hash du contenu) compare entre local et serveur
- **En cas de conflit** : notification a l'utilisateur avec les deux versions, choix local ou serveur
- **Entities sensibles** (statut candidature) : le serveur a toujours raison pour eviter les regressions de statut

### 11.4 Implementation mobile (Flutter)

1. **Queue locale** : SQLite/Hive pour stocker les actions offline
2. **Replay** : a la reconnexion, les actions sont rejouees dans l'ordre chronologique
3. **Indicateur UI** : barre de progression + icone de statut sync (vert = synced, orange = pending, rouge = conflit)
4. **Detection connectivite** : `connectivity_plus` package pour detecter online/offline
5. **Retry automatique** : 3 tentatives avec backoff exponentiel (1s, 5s, 30s)

### 11.5 Tests synchronisation

| Test | Description |
|------|-------------|
| Push simple | Creer une candidature offline → push → verifier cote serveur |
| Pull simple | Modifier cote serveur → pull → verifier cote mobile |
| Conflit | Modifier la meme candidature des 2 cotes → verifier detection conflit |
| Offline → Online | Couper reseau → effectuer 5 actions → reconnecter → verifier replay |
| Ordre chronologique | Creer puis modifier → verifier que le push respecte l'ordre |
| Entite supprimee | Modifier offline une entite supprimee cote serveur → verifier gestion |

---

## 12. Tests temporels pour le moteur de statut

### 12.1 Strategie time-travel

Pour tester les transitions temporelles sans attendre des jours, un endpoint admin permet de backdater les entites :

- `PUT /api/v1/applications/admin/test/time-travel` (uniquement si `ENABLE_TIME_TRAVEL=true` dans .env)
- Body : `{ entityType: 'application' | 'interview' | 'followup' | 'call' | 'event', entityId: '...', daysBack: 8 }`
- Modifie `createdAt` pour simuler le passage du temps
- Retourne 403 si `ENABLE_TIME_TRAVEL` n'est pas actif

### 12.2 Scenarios de test temporels

| Scenario | Actions | Resultat attendu |
|----------|---------|-------------------|
| No response 7j | Creer candidature → backdater 8j → trigger moteur | Statut → NO_RESPONSE + notification |
| Relance sans reponse 5j | Creer relance → backdater 6j → trigger moteur | Notification "relance sans reponse" |
| Date retour entretien depassee | Creer entretien → marquer passe → backdater 8j | Notification "date retour depassee" |
| 3 relances sans reponse | Creer 3 relances sans reponse → trigger moteur | Suggestion "considerer rejetee ?" |
| Suppression auto corbeille 30j | Soft delete → backdater 31j → trigger cron | Entite definitivement supprimee |

### 12.3 Integration dans les tests

- **Test API** : `tests/api/test-status-engine.test.js` — teste preferences auto/manuel, cascade, historique, rejet direct, et time-travel si disponible
- **Parcours utilisateur** : `tests/user-journey/modules/step-status-engine.js` — teste le cycle complet auto/manuel/cascade/rejet
- **Parcours predefinis** : `status_engine` et `status_lifecycle` dans `journey-builder.js`
- **Tests mobiles ADB** : verifier que les notifications et badges apparaissent dans l'UI apres les transitions

---

## 13. Systeme de rapport de crash et erreurs

### 13.1 Architecture

Le systeme de crash reporting collecte les erreurs, crashes et donnees d'utilisation de l'application mobile (et potentiellement du frontend), les anonymise et les envoie par email a l'adresse configuree.

**Flux** :
1. App mobile → intercepte crash/erreur (FlutterError.onError, PlatformDispatcher.instance.onError)
2. App → collecte les donnees de tracking (boutons, ecrans, swipes, API calls, durees, monitoring appareil)
3. App → POST `/api/v1/notifications/crashes` avec le rapport anonymise + analytics completes
4. Backend → sauvegarde en BDD (type CRASH_REPORT dans table Notification)
5. Backend → envoie email a `CRASH_REPORT_EMAIL` (par defaut: alerts@example.invalid)

**Modes de tracking** :
- **Mode DEV** (`kDebugMode = true`) : tracking illimite — toutes les actions sont conservees sans limite
- **Mode PROD** : tracking limite a 500 actions (FIFO), 100 dernieres envoyees dans les rapports

### 13.2 Endpoint API

| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/api/v1/notifications/crashes` | Soumettre un rapport de crash |
| GET | `/api/v1/notifications/crashes` | Lister les crash reports (admin) |

**Body du POST** :
```json
{
  "crashType": "FlutterError",
  "message": "RangeError: Invalid index",
  "stackTrace": "...",
  "deviceInfo": {
    "platform": "android",
    "osVersion": "14",
    "processors": 8,
    "hostname": "Pixel7",
    "appVersion": "1.0.0",
    "locale": "fr_FR",
    "dartVersion": "3.x.x"
  },
  "screenName": "CandidatureDetailPage",
  "sessionId": "abc-123",
  "userActions": [
    {"ts": "2026-02-26T12:00:00Z", "type": "button_tap", "buttonId": "add_candidature", "screen": "Home"},
    {"ts": "2026-02-26T12:00:01Z", "type": "navigation", "to": "CandidatureDetail", "from": "Home"},
    {"ts": "2026-02-26T12:00:05Z", "type": "swipe", "direction": "left", "screen": "CandidatureDetail"},
    {"ts": "2026-02-26T12:00:10Z", "type": "api_call", "endpoint": "/api/v1/applications", "statusCode": 200, "durationMs": 150}
  ],
  "analytics": {
    "sessionDuration": "125s",
    "totalActions": 42,
    "totalTaps": 15,
    "totalSwipes": 3,
    "totalNavigations": 8,
    "screenVisits": {"Home": 5, "CandidatureDetail": 3},
    "buttonTaps": {"add_candidature": 2, "search": 5},
    "screenDurations": {"Home": "45s", "CandidatureDetail": "30s"},
    "mode": "dev"
  },
  "metadata": {}
}
```

### 13.2bis Tracking pousse (CrashReporter)

Le module `CrashReporter` (Flutter) offre un tracking detaille pour le debug et l'analyse :

| Methode | Description |
|---------|-------------|
| `trackAction(action)` | Action generique |
| `trackButtonTap(buttonId, screen, extra)` | Tap sur un bouton specifique |
| `trackSwipe(direction, screen)` | Geste de swipe |
| `trackApiCall(endpoint, statusCode, durationMs)` | Appel API avec performance |
| `trackFormSubmit(formName, success, error)` | Soumission de formulaire |
| `trackNetworkError(url, statusCode, errorMessage)` | Erreur reseau (timeout, 5xx, etc.) |
| `trackScroll(screen, direction, position)` | Scroll avec position |
| `trackLongPress(elementId, screen)` | Appui long sur un element |
| `trackDialogAction(dialogId, action)` | Action dans une dialog (confirmer, annuler) |
| `trackAppLifecycle(state)` | Changement de cycle de vie (paused, resumed, inactive) |
| `setCurrentScreen(screen)` | Change l'ecran courant, mesure le temps passe |
| `getAnalyticsSummary()` | Resume des analytics de session |
| `getDeviceMonitoring()` | Infos monitoring appareil (OS, CPU, memoire RSS/MaxRSS en Mo) |
| `collectFullDiagnostic()` | Diagnostic complet (device + analytics + logs + actionsByType + errorActions) |

**Mode dev** : tracking illimite, toutes les actions conservees, erreurs exportees.
**Mode prod** : 500 actions max (FIFO), 100 envoyees pour crash, 200 pour diagnostic.

### 13.3 Anonymisation

- L'ID utilisateur est tronque (8 premiers caracteres)
- Aucune donnee personnelle (nom, email) n'est incluse dans le rapport
- Les infos appareil et stack trace sont purement techniques

### 13.4 Email de rapport

- Envoye automatiquement via le service email existant (SMTP)
- Destinataire configurable via `CRASH_REPORT_EMAIL` : en production, utiliser un alias public du domaine JobbingTrack redirigé chez le fournisseur mail vers la boîte privée réelle, hors Git
- Identité visible configurable via `CRASH_REPORT_FROM` et `CRASH_REPORT_REPLY_TO`, séparée du compte SMTP technique (`SMTP_USER`)
- **Tests / parcours** : pour les tests utilisateur ou E2E, on peut configurer `CRASH_REPORT_EMAIL` avec une boîte accessible renseignée hors Git pour recevoir les rapports de test
- Sujet : `[JobbingTrack Crash] {crashType} — {date}`
- Contient : type, message, stack trace, infos appareil, actions recentes

### 13.5 Tests mobiles (email sur appareil)

Les parcours ADB incluent des steps pour :
- `open_email_app` / `open_gmail` — ouvrir l'application de messagerie
- `verify_email_received` — verifier la reception d'un email JobbingTrack
- `return_to_app` — revenir a l'application apres consultation

Scenario predefini : `mobile_test_email`

### 13.6 Parcours mobiles couverts

| Scenario | Description | Steps |
|----------|-------------|-------|
| `mobile_verify_notifications` | Notifications | 5 steps |
| `mobile_verify_parametres` | Parametres | 4 steps |
| `mobile_verify_evenements` | Evenements + Calendrier | 8 steps |
| `mobile_verify_statistiques` | Statistiques | 4 steps |
| `mobile_test_email` | Test email appareil | 6 steps |
| `mobile_crud_notifications` | CRUD notifications | 8 steps |
| `mobile_complete` | Parcours complet | 40+ steps |

