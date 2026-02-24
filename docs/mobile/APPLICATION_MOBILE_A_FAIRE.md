# 📱 Application mobile – À faire et récapitulatif

Document de référence pour le développement et la validation de l’application mobile JobbingTrack. À mettre à jour au fur et à mesure. **Référence API** : `docs/api/api-reference/README.md`. **Structure données** : `docs/database/ACTIONS_ET_MODIFICATIONS.md`, `docs/database/relations.md`.

---

## 🚀 Premières étapes (auth puis dashboard)

**Ordre de développement** : on commence par la base **authentification** (connexion uniquement via **email + mot de passe**) :

1. **Écran Login** : email, mot de passe, lien « Mot de passe oublié ? », appel `POST /auth/login`, stockage token, redirection vers accueil.
2. **Écran Inscription** : email (validation format), mot de passe (validation, ex. min 8 caractères), confirmation mot de passe, envoi mail de **vérification d’email** après inscription.
3. **Vérification email** : lien reçu par mail → ouverture dans l’app (route `/verify-email/:token`) ou page dédiée → appel `GET /auth/verify-email/:token`.
4. **Mot de passe oublié** : écran avec champ email → appel `POST /auth/forgot-password` → envoi d’un **mail** à l’utilisateur avec lien de réinitialisation.
5. **Réinitialisation mot de passe** : écran (accédé via lien reçu par mail, route `/reset-password/:token`) → nouveau mot de passe + confirmation → `POST /auth/reset-password/:token`.

Ensuite : **page de démarrage (dashboard)** avec **navigation en bas** (bottom nav) et **drawer** à faire.

---

## 🎯 Comportement attendu de l’application (récapitulatif)

- **Utilisateur = candidat** : l’app permet de suivre **ses propres** candidatures et expériences intérim (demandes, en cours, propositions reçues).
- **Parcours** : inscription → connexion → (complétion profil si requis) → accès au tableau de bord (candidatures, entreprises, contacts, entretiens, relances, événements, profil).
- **Session** : persistance de la connexion (token, refresh), déconnexion explicite.
- **Synchronisation** : données offline / online (sync avec le backend via API Gateway).
- **APIs** : toutes les opérations passent par l’API Gateway (base URL configurable, ex. `NEXT_PUBLIC_API_URL`). Référence des endpoints : `docs/api/api-reference/README.md` (auth, applications, companies, contacts, interviews, calls, events, followups, profiles, notifications, dashboard).

---

## 📡 Alignement avec l’API (api-reference)

| Domaine        | Endpoints principaux (api-reference) | Usage côté mobile |
|----------------|--------------------------------------|-------------------|
| Auth           | `POST /auth/login`, `POST /auth/register`, `GET /auth/verify` | Login, inscription, vérification token |
| Candidatures   | `GET/POST/PUT /applications`         | Liste, création, mise à jour (statut, notes) |
| Entreprises    | `GET/POST /companies`                | Liste, création entreprise |
| Contacts       | `GET/POST /contacts`                 | Liste, création contact (lié company/application) |
| Entretiens     | `GET/POST /interviews`               | Liste, planification entretien |
| Appels         | `POST /calls`                        | Enregistrement appel |
| Événements     | `POST /events`                       | Création événement / rappel |
| Relances       | `POST /followups`                    | Création suivi / relance |
| Profil         | `PUT /profiles/me`                   | Complétion / mise à jour profil |
| Notifications  | `GET /notifications`, `PUT /notifications/{id}/read` | Liste, marquer lu |
| Dashboard      | `GET /dashboard/overview`, `GET /dashboard/analytics` | Vue d’ensemble, stats |

Headers requis : `Content-Type: application/json`, `Authorization: Bearer <jwt_token>`.

---

## 📋 Écrans mobiles existants (Flutter) – à valider

D’après `mobile/lib/main.dart` et `mobile/lib/screens/` :

| Écran              | Fichier                  | À faire / à valider |
|--------------------|--------------------------|----------------------|
| Login              | `login_screen.dart`      | Connexion email/mot de passe, lien « Mot de passe oublié », `POST /auth/login`, token, redirection. |
| Inscription        | `register_screen.dart`   | Inscription (email, validation email, mot de passe, validation mot de passe), `POST /auth/register`, envoi mail vérification, redirection login. |
| Mot de passe oublié | `forgot_password_screen.dart` | Saisie email, `POST /auth/forgot-password`, envoi mail avec lien de réinitialisation. |
| Réinitialisation MDP | `reset_password_screen.dart` | Route `/reset-password/:token`, nouveau mot de passe + confirmation, `POST /auth/reset-password/:token`. |
| Vérification email | `verify_email_screen.dart` | Route `/verify-email` ou `/verify-email/:token`, `GET /auth/verify-email/:token`, affichage succès/erreur. |
| Accueil            | `home_screen.dart`       | Tableau de bord candidat (résumé, accès aux sections) |
| Candidatures       | `applications_screen.dart` | Liste/création/édition, filtres (demandes, en cours, propositions si modélisé), API applications |
| Entreprises        | `companies_screen.dart`  | Liste/création entreprises, API companies |
| Contacts           | `contacts_screen.dart`   | Liste/création contacts, API contacts |
| Entretiens         | `interviews_screen.dart` | Liste/planification entretiens, API interviews |
| Relances           | `followups_screen.dart`  | Liste/création relances, API followups |
| Événements         | `events_screen.dart`     | Calendrier / événements, API events |
| Profil             | `profile_screen.dart`    | Complétion / édition profil, API `PUT /profiles/me` |
| Paramètres         | `settings_screen.dart`   | Préférences, thème, notifications, déconnexion |
| Statistiques       | `statistics_screen.dart` | Stats agrégées (dashboard) |
| Recherche          | `search_screen.dart`     | Recherche globale (candidatures, contacts, etc.) |

Écrans à usage admin / avancé (optionnel pour la première version candidat) : `analytics_screen`, `logs_screen`, `test_data_screen`, `trash_screen`, `users_screen` — à décider selon le périmètre.

---

## 🔧 Émulateur mobile (backoffice) – priorité immédiate

**Objectif** : depuis l’interface **Backoffice → Émulateur mobile** (`/backoffice/mobile-emulator`), pouvoir **démarrer le projet** et **tester l’app mobile directement** : **build d’APK** et **run du projet** dans l’interface pour avoir une **vraie app qui tourne et se voit** dans l’émulateur (tests sur émulateur mobile directement depuis l’interface).

À mettre en place en premier :
- **Build APK** : lancer le build Android (APK) du projet Flutter depuis l’interface.
- **Run du projet** : démarrer le projet (flutter run ou install APK + lancement) depuis l’interface pour que l’app s’exécute et soit visible.

- **Sélection des appareils** : lister les **appareils actuellement connectés en ADB** sur la machine hôte (commande `adb devices`), et permettre de **sélectionner l’appareil** cible dans l’interface (pas seulement des profils iPhone/Pixel simulés dans le navigateur).
- **URL de l’application / démarrage du projet** : pouvoir saisir l’**URL de l’application** (ex. app en dev sur machine hôte) ou **démarrer le projet** (lancer l’app Flutter en mode debug sur l’appareil sélectionné) pour avoir le **rendu réel** de l’application en cours de développement.
- **Rendu et run** : afficher le **rendu** de l’app qui tourne sur l’appareil (streaming écran ou iframe vers une URL de dev si applicable), et **démarrer / arrêter** les versions de l’app réellement en cours de développement (ex. `flutter run` ciblant l’appareil ADB).
- **Logs réels** : **logs Android (logcat)** en temps réel de l’appareil connecté, avec **filtre** pour n’afficher que les logs de l’application JobbingTrack (par tag ou package) si possible.
- **Installation APK** : garder la possibilité d’**installer un APK** (upload ou chemin) sur l’appareil sélectionné via ADB (`adb -s <device> install ...`).
- **Backend / backoffice** : fournir les infos et APIs nécessaires (config, health, version) pour que l’environnement de test (URL API, etc.) soit correct.
- **Création d’un AVD depuis l’interface (à faire)** : actuellement seuls les AVD déjà créés (Android Studio / `avdmanager`) sont listés ; prévoir un flux dans l’interface pour **créer un AVD** (choix de système d’image, API level, etc.) si besoin.

**Tests** : `make test-emulator-controller` (contrôleur port 5055). Tests Jest page : `mobile-emulator/__tests__/mobile-emulator-page.test.tsx`.

Référence implémentation actuelle : `frontend/src/app/(admin)/backoffice/mobile-emulator/page.tsx` (aujourd’hui : appareils simulés, URL manuelle, iframe, logs simulés ; à étendre avec ADB réel et logs logcat). Démarrer sur téléphone : USB + débogage USB ; make emulator-controller (dernier code) ; rafraîchir appareils, sélectionner le téléphone ; Build APK puis Installer et lancer. Logs Flutter run = terminal du contrôleur ; à faire : streamer dans l'UI. À faire plus tard : AVD depuis l'UI, logs en direct.

---

## 🚶 User journey mobile – à faire correctement

- **Parcours type** : Inscription → (email vérification si activé) → Connexion → Complétion profil (si requis) → Accueil → Candidatures / Entreprises / Contacts / Entretiens / Relances / Événements / Profil.
- **Scénarios à valider** : inscription, connexion, persistance session, complétion profil, création candidature, création entreprise, création contact, planification entretien, création relance, création événement, consultation notifications, déconnexion.
- S’appuyer sur **docs/user-journey/** et les parcours prédéfinis / personnalisés pour aligner les étapes et les tests (y compris E2E mobile si disponibles).

---

## 📊 Tracking utilisateur et analytics mobile

- **Objectif** : outils d’analytics pour l’app mobile (sessions, événements, erreurs, performances) conformément à la doc dans `docs/mobile/analytics/` (README, INTEGRATION, PRIVACY, DASHBOARD).
- **À faire** : implémenter ou brancher le **service mobile-analytics** (backend), **SDK Flutter** (analytics_service), **consentement utilisateur** (opt-in, RGPD), et **dashboard backoffice** pour visualiser les métriques mobile (sessions, crashes, événements). Référence : `docs/mobile/analytics/SUMMARY.md`, `docs/mobile/analytics/INTEGRATION.md`.

---

## ✅ Checklist de validation (à cocher dans STATUS.md)

La checklist détaillée (écran par écran, fonctionnalité par fonctionnalité) est maintenue dans **STATUS.md** section **« Application mobile – À faire et à valider »** pour que chaque point puisse être validé un par un. Ce fichier sert de **référence** (comportement, API, structure, user journey, analytics) et reste aligné avec `docs/api/api-reference/README.md` et la structure des données en base.

---

## 🚀 Déploiement final (à faire en tout dernier)

Quand tout sera fini : déploiement de **l’application mobile** et de **l’API + backoffice** sur le serveur, **déclenché depuis l’interface backoffice** (sans webhook Portainer payant : scripts SSH, Docker Hub, CI). Pipeline build Android APK/AAB (release, internal/beta/prod), branche/commit/statut/logs de déploiement, version app. Éventuellement GitLab en plus de GitHub pour CI gratuite. Détail : section **« Déploiement final »** en fin de **STATUS.md**.
