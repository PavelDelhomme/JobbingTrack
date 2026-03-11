# Processus complets – Application mobile et API

**Document à la racine du projet** : description détaillée de tous les parcours utilisateur possibles dans l’application mobile JobbingTrack et des flux API associés. Basé sur le code (Flutter, backend), `FONCTIONNALITES.md`, `docs/features/SUIVI_BOITES_INTÉRIM.md` et les écrans existants.

---

## Vue d’ensemble

- **Application mobile** : Flutter, écrans définis dans `mobile/lib/screens/`, navigation par routes et bottom bar.
- **API** : API Gateway (port 5002), microservices (auth, company, application, contact, interview, call, followup, event, notification, etc.).
- **Utilisateur cible** : candidat qui gère ses candidatures, entreprises, contacts, entretiens, relances et appels.

---

## 1. Entrée dans l’application

### 1.1 Splash puis Connexion

1. Au lancement, l’app affiche un **écran de chargement** (Splash).
2. **Détection de l’API** : `ApiService.autoDetectApi()` teste `127.0.0.1:5002`, `10.0.2.2:5002`, `localhost:5002` (ordre typique appareil physique / émulateur).
3. Redirection vers **`/login`** (écran de connexion).
4. **Écran Connexion** :
   - Champs : **Email**, **Mot de passe**.
   - Bouton **Se connecter** → `POST /api/v1/auth/login` → token JWT stocké → `Navigator.pushReplacementNamed('/home')`.
   - Lien **Mot de passe oublie ?** → `/forgot-password`.
   - Lien **S’inscrire** → `/register`.

### 1.2 Inscription (Processus A)

1. Route **`/register`**.
2. Formulaire : **Prénom**, **Nom**, **Email**, **Mot de passe**, **Confirmation mot de passe**.
3. Bouton **S’inscrire** → `POST /api/v1/auth/register`.
4. Si succès : envoi d’un **email de vérification** par le backend ; l’utilisateur est dirigé vers un écran **« Vérifiez votre email »** (ou équivalent).
5. **Vérification email** :
   - L’utilisateur reçoit un email avec un **lien** (ou code).
   - Clic sur le lien → deep link ou page web avec token → `GET /api/v1/auth/verify-email/:token` (ou paramètre `token`).
   - Route gérée : `/verify-email`, `/verify-email/:token` ou URL contenant `verify-email` / `token=`.
   - Après validation, le compte est actif (`emailVerified = true`) ; l’app peut rediriger vers le dashboard (`/home`).

### 1.3 Mot de passe oublie (Processus C)

1. **`/forgot-password`** : saisie de l’email → `POST /api/v1/auth/forgot-password`.
2. Email envoyé avec **lien de réinitialisation** (token, durée limitée).
3. Clic sur le lien → route **`/reset-password/:token`** → écran **Nouveau mot de passe + confirmation** → `POST /api/v1/auth/reset-password/:token`.
4. Redirection vers l’écran de **connexion** ; l’utilisateur se connecte avec le nouveau mot de passe.

---

## 2. Navigation principale (après connexion)

### 2.1 Écran d’accueil (Dashboard)

- Route **`/home`** = **HomeScreen**.
- **Barre du bas (Bottom Navigation)** – 5 onglets :
  1. **Accueil** (index 0) : reste sur le dashboard.
  2. **Candidatures** (index 1) : `pushNamed('/applications')`.
  3. **Recherche** (index 2) : `pushNamed('/search')`.
  4. **Calendrier** (index 3) : `pushNamed('/events')`.
  5. **Profil** (index 4) : `pushNamed('/profile')`.
- **AppBar** : « Bonjour {prénom} », icône notifications (**MobileNotificationCenter**), icône **Déconnexion** (confirmation puis `AuthProvider.logout()` et `pushNamedAndRemoveUntil('/login')`).
- **Menu latéral (Drawer)** : ouvert via le hamburger (si présent) ; contenu détaillé au § 10.

### 2.2 Contenu du Dashboard (Accueil)

- **Texte** : « Gérez vos candidatures en un coup d’œil ».
- **Vue d’ensemble** : cartes de stats (nombre de **candidatures**, **entretiens**, **relances**, **acceptées**), chargées via `ApplicationProvider`, `InterviewProvider`, `FollowUpProvider`.
- **Candidatures par statut** : répartition (Envoyées, Entretien prévu, En cours, Refusées, Acceptées) avec barres de progression.
- **Actions urgentes** : si des relances en attente, bandeau « X relance(s) à effectuer » avec lien vers `/followups`.
- **Actions rapides** (grille 2×2) :
  - Candidatures → `/applications`
  - Entreprises → `/companies`
  - Contacts → `/contacts`
  - Entretiens → `/interviews`
- **Administration** (si rôle SUPER_ADMIN ou ADMIN) : carte « Administration » → `/admin` (utilisateurs, logs, statistiques…).

---

## 3. Candidatures – Liste et sous-pages

### 3.1 Accès

- Depuis la **barre du bas** : onglet « Candidatures » → **`/applications`** (**ApplicationsScreen**).
- Depuis le **drawer** : lien « Candidatures » → même route.
- Depuis le **dashboard** : carte « Candidatures » → même route.

### 3.2 Structure de l’écran Candidatures

- **AppBar** : titre « Candidatures », **MobileNotificationCenter**.
- **Onglets horizontaux** (TabBar) :
  1. **Candidatures** : liste des candidatures de l’utilisateur.
  2. **Entreprises** : liste des entreprises.
  3. **Contacts** : liste des contacts.
  4. **Entretiens** : liste des entretiens.
  5. **Relances** : liste des relances (à venir / terminées).
- **FAB (bouton flottant « + »)** : affiché **uniquement sur l’onglet Candidatures** ; ouvre le **formulaire d’ajout d’une candidature** (voir § 5).

### 3.3 Onglet Candidatures

- **Données** : `ApplicationProvider.applications` (chargées au montage : `loadApplications()` → `GET /api/v1/applications`).
- **Affichage** : liste de **cartes** ; pour chaque candidature :
  - **Titre du poste** (position), **nom de l’entreprise**, **date de candidature**, **badge de statut** (couleur selon statut).
  - Lien **« Voir détails »** → **ApplicationDetailScreen** (détail de la candidature).
- **Tri** : dans le code actuel, l’ordre est celui renvoyé par l’API (à préciser côté API ou tri côté client, ex. plus récent en premier).
- **État vide** : message « Aucune candidature » + bouton **« Créer ma première candidature »** qui ouvre le même formulaire que le FAB.

### 3.4 Onglets Entreprises, Contacts, Entretiens, Relances (dans cet écran)

- **Entreprises** : liste des `CompanyProvider.companies` (GET companies). Pas de FAB ici ; clic sur une ligne → pour l’instant renvoie vers la même liste (pas de détail entreprise implémenté dans ce flux).
- **Contacts** : liste des contacts (ContactProvider). Idem, pas de FAB sur cet onglet.
- **Entretiens** : liste des entretiens (InterviewProvider), format date + lieu/notes.
- **Relances** : liste des relances (FollowUpProvider), sections « À venir » et « Terminées ».

---

## 4. Création / édition d’une candidature – Processus détaillé

### 4.1 Ouverture du formulaire

- **Création** : FAB sur l’onglet Candidatures, ou bouton « Créer ma première candidature » → **ApplicationFormScreen** sans argument.
- **Édition** : depuis le **détail** d’une candidature, bouton **« Modifier »** → **ApplicationFormScreen(application: app)**.

### 4.2 Comportement actuel (implémenté)

- **Entreprise** : **liste déroulante (Dropdown)** des entreprises **déjà existantes** (`CompanyProvider.companies`). L’utilisateur **doit choisir une entreprise existante** ; aucun champ « nom d’entreprise » libre.
- **Champs** : Poste *, Description, URL de l’offre, Lieu, Type de contrat (CDI, CDD, etc.), Mode de travail (ON_SITE, REMOTE, HYBRID), Type candidature (OFFRE, SPONTANEE), Date de candidature, Salaire min/max, Salaire négociable, Notes.
- **Validation** : « Choisissez une entreprise » si aucune sélection ; « Requis » sur le poste.
- **Envoi** :
  - **Création** : `ApiService.createApplicationFromPayload(payload, token)` → **`POST /api/v1/applications`** avec **`companyId`** (pas de `companyName` dans le payload actuel).
  - **Édition** : `PUT /api/v1/applications/:id` avec le même type de payload.
- Après succès : rafraîchissement de la liste (`ApplicationProvider.loadApplications()`), message « Candidature créée » (ou « mise à jour »), `Navigator.pop(true)`.

**Conséquence** : si l’utilisateur n’a **aucune entreprise** en base, il ne peut pas créer de candidature depuis ce formulaire (companyId obligatoire). L’écran **Entreprises** (`CompaniesScreen`) est actuellement un stub sans liste ni formulaire de création.

### 4.3 Processus cible (logique métier et API)

D’après la logique décrite dans le projet et `FONCTIONNALITES.md` (§ 10.1, 10.15) :

1. L’utilisateur ouvre le **formulaire d’ajout de candidature**.
2. **Entreprise** : champ **nom d’entreprise avec autocomplétion** (recherche parmi les entreprises existantes de l’utilisateur).
3. **Si une entreprise correspond** (sélection dans la liste) → on utilise son **id** pour la candidature.
4. **Si l’entreprise n’existe pas** : l’utilisateur saisit le **nom** (et éventuellement d’autres infos minimales) ; à la **validation du formulaire candidature**, le système :
   - soit envoie **`companyName`** (et optionnellement `companyData`) à l’API ;
   - l’API (**application-service**) appelle **getOrCreateCompany** : si l’entreprise existe (même nom), réutilisation de l’id ; sinon **création** de l’entreprise puis utilisation de son id pour la candidature ;
   - puis **création de la candidature** (`POST /api/v1/applications` avec `companyId` résolu ou `companyName`).
5. Une fois la candidature créée : **événement calendrier** automatique (« Candidature envoyée »), **notifications** éventuelles, et retour à la liste.

**API déjà prête** : le backend accepte **`companyName`** (et `companyData`) dans le body de `POST /api/v1/applications` et gère la résolution/création d’entreprise (voir `application.controller.js`). Il manque côté **mobile** :
- un champ **nom d’entreprise** avec **autocomplétion** (liste des entreprises existantes) ;
- la possibilité de **ne pas** sélectionner une entreprise existante mais de **saisir un nouveau nom** ;
- l’envoi de **`companyName`** (et éventuellement `companyId` si sélection) au lieu de seulement `companyId`.

---

## 5. Détail d’une candidature

- **Accès** : depuis la liste des candidatures, « Voir détails » sur une carte → **ApplicationDetailScreen(application)**.
- **AppBar** : titre = poste, bouton retour → `pop(true)` (retour à la liste avec rafraîchissement), bouton **« Modifier »** → **ApplicationFormScreen(application: app)**.
- **Contenu** :
  - Carte récap : **entreprise**, **poste**, **statut**, **date de candidature**.
  - Section **Relances** : liste des relances liées ; bouton **« Ajouter relance »** → dialogue (date, notes) → `ApiService.createFollowUp(applicationId, ...)` → `POST /api/v1/followups`.
  - Section **Entretiens** : liste ; bouton **« Ajouter entretien »** → sélecteur de date → `ApiService.createInterview(applicationId, interviewDate, ...)` → `POST /api/v1/interviews`.
  - Section **Appels** : liste ; bouton **« Ajouter appel »** → date + sujet → `ApiService.createCall(applicationId, callDate, subject, ...)` → `POST /api/v1/calls`.
- Les créations déclenchent côté backend les **événements calendrier** et **notifications** associés (cf. FONCTIONNALITES.md).

---

## 6. Recherche

- Route **`/search`** (**SearchScreen**).
- **Onglets** : **Entreprises**, **Contacts**, **Entretiens**, **Relances** (pas d’onglet Candidatures ici ; les candidatures sont sous `/applications`).
- **Champ de recherche** : filtre commun sur la liste de l’onglet actif (nom, secteur pour entreprises ; nom/email pour contacts ; notes/lieu pour entretiens ; type/notes pour relances).
- Clic sur une ligne : navigation vers la liste complète correspondante (ex. `/companies`, `/contacts`, `/interviews`, `/followups`) plutôt que vers un écran de détail dédié dans certains cas.

---

## 7. Entreprises

- Route **`/companies`** (**CompaniesScreen**).
- **État actuel** : écran simplifié avec titre « Entreprises » et texte « Gestion des entreprises » ; **pas de liste**, **pas de FAB**, pas de formulaire de création. Les entreprises sont chargées et affichées dans l’onglet **Entreprises** de l’écran **Candidatures**.
- **Cible** : liste des entreprises (nom, secteur, site, etc.), FAB pour **créer une entreprise**, écran détail avec candidatures et contacts liés (voir FONCTIONNALITES.md).

---

## 8. Contacts

- Route **`/contacts`** : liste des contacts (ContactProvider). Pas de FAB visible dans le flux décrit ; création possible depuis le détail d’une candidature (liaison contact) ou à prévoir en standalone (FONCTIONNALITES § 10.14).

---

## 9. Entretiens, Appels, Relances, Événements

- **Entretiens** (`/interviews`) : liste des entretiens (InterviewProvider). Création **depuis le détail d’une candidature** uniquement dans le flux actuel (pas de FAB sur la liste entretiens).
- **Appels** (`/calls`) : liste des appels. Création **depuis le détail d’une candidature** (bouton « Ajouter appel »).
- **Relances** (`/followups`) : liste (à venir / terminées). Création **depuis le détail d’une candidature** (bouton « Ajouter relance »).
- **Événements / Calendrier** (`/events`) : accès depuis la barre du bas « Calendrier ». Vue des événements (entretiens, relances, appels, candidatures) avec couleurs par type ; créations automatiques côté backend à chaque création d’entretien/relance/appel.

---

## 10. Profil, Paramètres, Drawer, Archives, Corbeille, Admin

- **Profil** (`/profile`) : affichage / édition des infos utilisateur (nom, prénom, photo, bio, liens, etc.).
- **Paramètres** (`/settings`) : réglages (thème, langue, notifications, mot de passe, etc.).
- **Drawer** (menu latéral) :
  - En-tête : **profil** (nom, prénom, email).
  - **NAVIGATION** : Accueil, Candidatures, Entreprises, Contacts, Entretiens, Appels, Relances, Événements & Rappels.
  - **ADMINISTRATION** (si SUPER_ADMIN ou ADMIN) : Analytics, Statistiques, Utilisateurs, Logs, **Archives**, **Corbeille** (les deux pointent vers `/trash` actuellement).
  - **COMPTE** : Profil, Paramètres.
  - **Déconnexion** (avec confirmation).
- **Archives / Corbeille** : route **`/trash`** (**TrashScreen**) ; à distinguer selon la spec (archives = éléments archivés ; corbeille = éléments soft-deleted). Le drawer utilise le même lien pour les deux.
- **Admin** (`/admin`) : écran réservé aux rôles admin (utilisateurs, logs, statistiques, etc.).

---

## 11. API – Flux candidature et entreprise

### 11.1 Création de candidature

- **Endpoint** : `POST /api/v1/applications`.
- **Body** (résumé) :
  - **Actuel mobile** : `companyId` (obligatoire), `position`, `description`, `jobUrl`, `location`, `contractType`, `workMode`, `applicationType`, `applicationDate`, `salaryMin`, `salaryMax`, `salaryNegotiable`, `notes`.
  - **Supporté par l’API** : en plus de `companyId`, **`companyName`** (et optionnellement **`companyData`**). Si `companyName` est fourni et que `companyId` est absent, l’**application-service** appelle **company-service** (getOrCreateCompany) : recherche par nom, création si besoin, puis utilisation de l’id pour la candidature.
- **Statut initial** : géré côté backend (ex. `CANDIDATE_PENDING`), avec création d’**événement calendrier** et historique de statut.

### 11.2 Création d’entreprise (getOrCreateCompany)

- Utilisée **dans** `POST /api/v1/applications` quand on envoie **companyName**.
- **Company-service** : recherche d’une entreprise existante (par nom, pour l’utilisateur) ; si trouvée → retour de l’id ; sinon **création** (nom minimum, puis optionnellement autres champs) et retour du nouvel id.
- L’**application mobile** peut donc, sans écran dédié « Créer entreprise », créer une candidature en envoyant **uniquement** le nom d’entreprise ; l’API gère la création d’entreprise dans le flux.

### 11.3 Relances, entretiens, appels

- **Relance** : `POST /api/v1/followups` avec `applicationId`, date, type, méthode, notes, etc. → création + événement calendrier + rappels.
- **Entretien** : `POST /api/v1/interviews` avec `applicationId`, date, type, style, lieu, etc. → création + événement + notification + passage candidature en `INTERVIEW_PENDING` (si moteur de statut actif).
- **Appel** : `POST /api/v1/calls` avec `applicationId`, contactId optionnel, date, sujet, etc. → création + événement.

---

## 12. Récapitulatif – En place / À mettre en place

### 12.1 Déjà en place

- Connexion, inscription, vérification email, mot de passe oublie / reset.
- Dashboard avec stats (candidatures, entretiens, relances).
- Navigation : bottom bar (Accueil, Candidatures, Recherche, Calendrier, Profil), drawer (liens vers toutes les sections).
- Écran Candidatures avec 5 onglets (Candidatures, Entreprises, Contacts, Entretiens, Relances), FAB sur l’onglet Candidatures.
- Formulaire **création / édition** candidature avec **sélection d’une entreprise existante** (dropdown) et tous les champs métier ; envoi `companyId` à l’API.
- Détail candidature : relances, entretiens, appels avec boutons « Ajouter relance / entretien / appel » et appels API correspondants.
- Écran Recherche avec 4 onglets et filtre texte.
- Liste entreprises / contacts / entretiens / relances dans l’écran Candidatures.
- Profil, Paramètres, Trash (Archives/Corbeille), Admin (si rôle adapté).
- API : `companyName` + getOrCreateCompany dans `POST /api/v1/applications` ; création entretien/relance/appel avec effets de bord (événements, notifications).

### 12.2 À mettre en place (alignement mobile ↔ processus cible)

1. **Formulaire candidature** :
   - Remplacer (ou compléter) le **dropdown entreprise** par un **champ nom d’entreprise avec autocomplétion** (suggestions = entreprises existantes).
   - Permettre la **saisie d’un nouveau nom** si l’entreprise n’est pas dans la liste.
   - À la soumission : envoyer **`companyName`** (et optionnellement `companyData`) si pas d’entreprise sélectionnée par id ; sinon **`companyId`**. L’API fera la création d’entreprise si nécessaire.
2. **Écran Entreprises** (`CompaniesScreen`) : liste réelle des entreprises, FAB **créer une entreprise**, écran détail (candidatures et contacts liés).
3. **Suivi intérim** (optionnel selon spec) : toggle « Mode intérim » (Paramètres ou accueil), champ **agence** (boîte d’intérim) dans le formulaire candidature, couleurs calendrier (intérim vs classique), écran Suivi intérim. Voir `docs/features/SUIVI_BOITES_INTÉRIM.md`.
4. **Archives vs Corbeille** : distinguer dans l’UI (deux entrées ou deux sections dans `/trash`) : éléments archivés (restaurer / supprimer) et éléments en corbeille (restaurer / supprimer définitivement).
5. **Tests** : les tests E2E / Playwright qui créent une candidature après une entreprise peuvent s’aligner sur ce flux (création entreprise puis candidature avec `companyId`, ou candidature avec `companyName` selon le scénario). Les tests en **série** sur le CRUD admin (déjà en place) évitent les skips quand l’entreprise est créée en premier.

---

## 13. Résumé des routes (référence)

| Route | Écran | Rôle |
|-------|--------|------|
| `/` (splash) | _SplashScreen | Détection API → /login |
| `/login` | LoginScreen | Connexion |
| `/register` | RegisterScreen | Inscription |
| `/forgot-password` | ForgotPasswordScreen | Demande reset MDP |
| `/reset-password/:token` | ResetPasswordScreen | Nouveau MDP |
| `/verify-email`, `/verify-email/:token` | VerifyEmailScreen | Vérification email |
| `/home` | HomeScreen | Dashboard |
| `/applications` | ApplicationsScreen | Candidatures + onglets |
| `/application-form` | ApplicationFormScreen | Création/édition candidature |
| (push MaterialPageRoute) | ApplicationDetailScreen | Détail candidature |
| `/companies` | CompaniesScreen | Entreprises (stub) |
| `/contacts` | ContactsScreen | Contacts |
| `/interviews` | InterviewsScreen | Entretiens |
| `/calls` | CallsScreen | Appels |
| `/followups` | FollowUpsScreen | Relances |
| `/events` | EventsScreen | Calendrier / événements |
| `/search` | SearchScreen | Recherche (4 onglets) |
| `/profile` | ProfileScreen | Profil |
| `/settings` | SettingsScreen | Paramètres |
| `/trash` | TrashScreen | Archives / Corbeille |
| `/admin` | AdminScreen | Administration |
| `/statistics`, `/analytics`, `/logs`, `/users` | (écrans dédiés) | Stats, analytics, logs, utilisateurs |

---

*Document généré à partir du code et de la documentation existante. À mettre à jour lors de l’ajout d’écrans ou de flux (ex. mode intérim, formulaire entreprise, autocomplétion candidature).*
