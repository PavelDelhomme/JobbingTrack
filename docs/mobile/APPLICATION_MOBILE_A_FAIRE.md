# 📱 Application mobile – À faire et récapitulatif

Document de référence pour le développement et la validation de l’application mobile JobbingTrack. À mettre à jour au fur et à mesure. **Référence API** : `docs/api/api-reference/README.md`. **Structure données** : `docs/database/ACTIONS_ET_MODIFICATIONS.md`, `docs/database/relations.md`.

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
| Login              | `login_screen.dart`      | Connexion, champs email/mot de passe, appel `POST /auth/login`, stockage token, redirection |
| Inscription        | `register_screen.dart`   | Inscription, champs requis, appel `POST /auth/register`, redirection login ou complétion profil |
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

## 🔧 Émulateur mobile (backoffice) – à faire

Objectif : depuis l’interface **Backoffice → Émulateur mobile** (`/backoffice/mobile-emulator`), pouvoir **développer et tester l’app mobile en direct** avec un appareil réel ou un émulateur connecté en ADB.

- **Sélection des appareils** : lister les **appareils actuellement connectés en ADB** sur la machine hôte (commande `adb devices`), et permettre de **sélectionner l’appareil** cible dans l’interface (pas seulement des profils iPhone/Pixel simulés dans le navigateur).
- **URL de l’application / démarrage du projet** : pouvoir saisir l’**URL de l’application** (ex. app en dev sur machine hôte) ou **démarrer le projet** (lancer l’app Flutter en mode debug sur l’appareil sélectionné) pour avoir le **rendu réel** de l’application en cours de développement.
- **Rendu et run** : afficher le **rendu** de l’app qui tourne sur l’appareil (streaming écran ou iframe vers une URL de dev si applicable), et **démarrer / arrêter** les versions de l’app réellement en cours de développement (ex. `flutter run` ciblant l’appareil ADB).
- **Logs réels** : **logs Android (logcat)** en temps réel de l’appareil connecté, avec **filtre** pour n’afficher que les logs de l’application JobbingTrack (par tag ou package) si possible.
- **Installation APK** : garder la possibilité d’**installer un APK** (upload ou chemin) sur l’appareil sélectionné via ADB (`adb -s <device> install ...`).
- **Backend / backoffice** : fournir les infos et APIs nécessaires (config, health, version) pour que l’environnement de test (URL API, etc.) soit correct.

Référence implémentation actuelle : `frontend/src/app/(admin)/backoffice/mobile-emulator/page.tsx` (aujourd’hui : appareils simulés, URL manuelle, iframe, logs simulés ; à étendre avec ADB réel et logs logcat).

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
