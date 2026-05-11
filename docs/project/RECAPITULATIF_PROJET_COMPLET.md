# Récapitulatif complet du projet JobbingTrack

**Date** : mars 2026  
**Sources** : fichiers de pilotage et de synthèse (`../STATUS.md`, `../ERRORS.md`, `FONCTIONNALITES.md`, `../RESOLUTIONS.md`, `../mobile/PROCESSUS_APPLICATION_MOBILE_ET_API.md`) et toute la documentation dans `docs/`.

Ce document synthétise : **ce qui est fait**, **ce qui n’est pas fait**, et **les priorités** pour l’application mobile, l’API, le backoffice et les tests.

**Dernier run tests (13/03/2026 14:04)** : 724 tests, 708 réussis, 16 échoués (97,8 %). Correctifs récents : page **Politiques** (IPs bloquées en objet → affichage corrigé), **Catégorie 8** Performance Avancés exécutée (`test-performance.js`), contact-service création contact (companyId + ContactCompany). À traiter : E2E localStorage, API Jest cascade/BDD, script API Backend (workflow-service 503), CRUD contact après rebuild ; sécurité backoffice (menaces unifiées, tests réels).

---

## 1. Ce qui avait été prévu (conversation / phase 3) vs ce qui a été fait

| Prévu | Fait ? | Détail |
|-------|--------|--------|
| Candidature + entreprise (existant ou nouveau nom) | ✅ | Formulaire mobile : choix entreprise existante ou saisie nouveau nom ; API `companyName` + getOrCreateCompany. |
| HTTPS / chiffrement | ⏳ Doc uniquement | Section 15 de `../mobile/PROCESSUS_APPLICATION_MOBILE_ET_API.md` : à mettre en place en prod (TLS gateway, optionnel certificate pinning mobile). |
| Notification-service ≠ crashes | ✅ | Routes `/crashes` retirées du notification-service ; il ne gère que les notifications in-app. |
| Crash reporting dédié | ✅ | Route **POST /api/v1/crashes** sur l’API Gateway (sans auth), écriture dans `backend/api-gateway/logs/crashes/`. |
| Mobile : envoi crash + persistance | ✅ | `CrashReporter` envoie vers `/api/v1/crashes` ; persistance locale + renvoi au prochain démarrage. |
| Tests crash reporting | ✅ | Tests API (Jest), E2E (Playwright), user-journey adaptés à `/api/v1/crashes` ; inclus dans `make test` / `make tests`. |

---

## 2. Application mobile (Flutter)

### 2.1 En place

- Connexion, inscription, vérification email (écrans + flux), mot de passe oublié / reset.
- Dashboard (HomeScreen), bottom nav (Accueil, Candidatures, Recherche, Calendrier, Profil), drawer.
- Écran Candidatures avec 5 onglets (Candidatures, Entreprises, Contacts, Entretiens, Relances), FAB sur Candidatures.
- Formulaire création/édition candidature : **sélection entreprise existante ou saisie nouveau nom** → envoi `companyId` ou `companyName` ; API getOrCreateCompany.
- Détail candidature : relances, entretiens, appels ; boutons « Ajouter relance / entretien / appel » + appels API.
- Recherche (4 onglets), listes Entreprises / Contacts / Entretiens / Relances dans l’écran Candidatures.
- Profil, Paramètres, Trash (Archives/Corbeille), Admin (si rôle adapté).
- **Crash reporting** : `CrashReporter` → POST `/api/v1/crashes` (gateway), persistance disque si échec, renvoi au démarrage.

### 2.2 Pas fait / à faire

- **Écran Entreprises** (`CompaniesScreen`) : liste réelle, FAB création, écran détail (candidatures/contacts liés). Actuellement stub « Gestion des entreprises ».
- **Suivi intérim (mobile)** : toggle « Mode intérim » (Paramètres ou accueil), champ agence dans formulaire candidature, écran « Intérim », calendrier avec couleurs intérim (ambre) vs classique (bleu). Réf. `docs/features/SUIVI_BOITES_INTÉRIM.md`, `docs/mobile/PROCHAINES_ETAPES.md`.
- **Swipe** sur toutes les listes (gauche = supprimer/corbeille, droite = archiver ou marquer terminé selon l’entité) ; confirmation + undo 5 s.
- **Archives / Corbeille** : distinguer clairement dans l’UI (archives vs corbeille) ; page Archives dans le drawer.
- **Sync offline** : queue locale, replay à la reconnexion, indicateur de sync, détection connectivité.
- **Validation manuelle parcours vérification email** : inscription → mail → clic lien → vérifié → connexion → accueil (à valider à la main, voir `docs/mobile/PROCHAINES_ETAPES.md`).
- **Push notifications** (FCM / APNs).
- **Emulateur** : logs logcat en temps réel dans l’UI (optionnel).

---

## 3. API et backend

### 3.1 En place

- API Gateway (port 5002), microservices (auth, company, application, contact, interview, call, followup, event, notification, profile, dashboard, etc.).
- **POST /api/v1/crashes** (gateway, sans auth) : enregistrement fichier dans `backend/api-gateway/logs/crashes/`.
- **POST /api/v1/applications** : accepte `companyName` + getOrCreateCompany.
- Archivage / corbeille (soft delete) sur 7 services, cascade archivage/désarchivage, cascade statuts (entretien → INTERVIEW_PENDING/DONE, etc.).
- Moteur de statut (préférence auto/manuel, transition NO_RESPONSE après 7 j, notifications auto), time-travel (backdate) pour les tests.
- Notification-service : uniquement notifications in-app (plus de routes `/crashes`).

### 3.2 Pas fait / à faire

- **HTTPS** : TLS sur la gateway (et optionnellement certificate pinning mobile) en production.
- **Sync** : `POST /sync/push`, `GET /sync/pull`, `GET /sync/status` (modèle SyncQueue en BDD, pas d’endpoints encore).
- **Transitions temporelles** : cron/worker pour NO_RESPONSE après 7 j, suggestion « considérer rejetée » après 3 relances, etc. (partiellement en place via workflow-service).
- **Suppression auto corbeille > 30 j** : cron ou worker pour purge définitive.
- **Table `deployments`** : créer si deployment-service l’utilise (`relation "public.deployments" does not exist`).
- **Tables dashboard / User Analytics** : `user_events`, `user_sessions`, etc. si la page User Analytics est utilisée.
- **API versioning** : 404 sur `GET /api/v1/analytics/stats/:userId/versions` à corriger ou documenter.
- **Loki** : `getaddrinfo ENOTFOUND loki` si metrics-aggregator l’utilise ; dégrader proprement ou déployer Loki.

---

## 4. Backoffice (Next.js)

### 4.1 En place

- Connexion admin, hub Tests, parcours utilisateur (prédéfinis, personnalisé), rapports.
- Gestion données : entreprises (dont type EMPLOYER / TEMP_AGENCY), candidatures (champ agence optionnel), contacts, entretiens, relances, appels, événements.
- Données de test (génération, boîtes d’intérim Randstad/Manpower, candidatures avec agencyId).
- CRUD complet, archivage, corbeille, cascade statuts, moteur de statut (préférences, time-travel).
- Pages : Analytics, Sécurité, Emails (Monitor, templates), Tests, Parcours, Émulateur mobile (liste appareils ADB, build APK, installer/lancer).
- Rapports de tests (résultats, user-journey), compression anciens rapports.

### 4.2 Pas fait / à faire

- **Suivi intérim backoffice** : couleurs calendrier (intérim = ambre, classique = bleu) selon `application.agencyId` ; page dédiée « Suivi intérim » (liste agences + candidatures par agence). Pas de toggle « Mode intérim » (données uniquement).
- **Abonnement & facturation** : page `/backoffice/billing` à poursuivre (données, APIs, affichage).
- **Export/import** : CSV/JSON candidatures, entreprises, contacts ; interface backoffice.
- **Pagination et tri** : cohérents sur toutes les listes.
- **Email Monitor** : vérifier affichage complet des mails (liste, statuts, contenu au clic), historique, recherche.
- **Templates email** : création (pas seulement édition), tests Playwright.
- **Page délivrabilité** (`/backoffice/emails/deliverability`) et **tests-emails** : tests Playwright complets.
- **Page de confirmation « Email vérifié »** (frontend) après clic sur lien de vérification.
- **Idempotence Postgres** : `db-fix-role` sans erreurs « role/database already exists » (SQL idempotent dans Makefile).

---

## 5. Tests

### 5.1 En place

- **make test / make tests** = `make test-all` → `scripts/run-all-tests-with-reports.sh`.
- User Journey (API), Relations BDD, Enums, Email Logs.
- Tests API Jest (`tests/api/`) : archivage, cascade statuts, status-engine, **crash-reporting** (gateway `/api/v1/crashes`), BDD relations.
- Tests API Backend (script `test-api-specific.sh`).
- Playwright E2E Frontend (dont status-engine, **crash-reporting**), MailHog, Email Workflows, CRUD Données, CRUD Utilisateurs, Sécurité Backoffice.
- Performance, Sécurité (64), Intégration, API Gateway Health, Firewall & WAF.
- Parcours utilisateur : module **crash_reporting** (step-crash-reporting.js) vers `/api/v1/crashes`.
- Rapports dans `tests/results/<timestamp>/` (report.html, JSON par catégorie, metrics-start/end).

### 5.2 Pas fait / à faire

- **Stabiliser la suite** : faire passer tous les blocs (corriger company create 500, MailHog, status-engine skips, CRUD users, Email Workflows selon env).
- **Tests swipe et actions rapides** sur listes mobiles.
- **Tests export/import** données.
- **Tests vérification email** (parcours complet avec MailHog ou SMTP réel).
- **Tests pagination et tri**.
- **Tests sync** (push/pull, conflits, offline → online).
- **CI/CD** : pipeline GitHub Actions (build + test + déploiement optionnel).
- **Lancement tests depuis le hub** avec vérification du résultat dans l’interface.

---

## 6. Erreurs / points d’attention (ERRORS.md, STATUS.md)

| Problème | Composant | Action |
|----------|-----------|--------|
| Rôle/DB Postgres « already exists » | Postgres / make db-fix-role | SQL idempotent (DO $$ ... EXCEPTION) |
| Table `deployments` absente | deployment-service | Créer table (db-push ou schéma deployment-service) |
| Build APK Zip META-INF | Émulateur backoffice | Nettoyer sorties APK avant build (déjà corrigé dans server.js) |
| `user_events` etc. absentes | dashboard-service / User Analytics | Créer tables ou désactiver page |
| `getaddrinfo ENOTFOUND loki` | metrics-aggregator | Loki non déployé ; dégrader ou ajouter |
| Endpoint sync non implémenté | sync mobile/API | POST /sync/push, GET /sync/pull, GET /sync/status |
| Transitions temporelles auto | moteur statut | Cron/worker NO_RESPONSE 7 j, etc. |
| Suppression auto corbeille > 30 j | cron/worker | Cron ou worker purge |
| API versioning 404 | dashboard-service | Implémenter route ou adapter front |
| flutter_local_notifications (build APK) | Mobile | Mettre à jour dépendance / bigLargeIcon |

---

## 7. Documentation de référence (fichiers .md)

### Racine

- **PROCESSUS_APPLICATION_MOBILE_ET_API.md** : processus complets mobile + API (sections 1–15, dont crash reporting §14, HTTPS §15).
- **STATUS.md** : état du projet, à faire maintenant, migrations, commandes, dernier rapport de test.
- **ERRORS.md** : erreurs connues, à implémenter, résolutions récentes.
- **FONCTIONNALITES.md** : vision, entités, archivage/corbeille, backoffice, mobile, roadmap, processus métier (§10), sync (§11), crash (§13).
- **RESOLUTIONS.md** : résolutions appliquées (rapports 404, tests, BDD, crash, schema partagé, etc.).

### docs/ (sélection)

- **docs/getting-started/GUIDE_ETAPES_ACTUELLES.md** : quoi faire maintenant (backoffice, mobile, BDD), ordre des actions, suivi intérim.
- **docs/BACKLOG.md** : backlog technique par priorité.
- **docs/mobile/PROCHAINES_ETAPES.md** : validation manuelle vérification email puis suite Flutter.
- **docs/mobile/APPLICATION_MOBILE_A_FAIRE.md** : écrans, API, émulateur, user journey, analytics.
- **docs/features/SUIVI_BOITES_INTÉRIM.md** : modèle données, couleurs calendrier, interface Boîtes d’intérim, mode intérim (backoffice vs mobile).
- **docs/tests/TESTS_MANQUANTS.md** : tests manquants par catégorie (auth, application, company, contact, etc.).
- **docs/database/MIGRATIONS_ET_BASES.md** : migrations Prisma, base principale vs base de test.
- **docs/getting-started/** : démarrage, installation, accès réseau.
- **docs/monitoring/** : monitoring, métriques, guides.
- **docs/troubleshooting/** : dépannage, corrections.

---

## 8. Synthèse « À faire maintenant » (priorités)

1. **Backoffice – Suivi intérim** : couleurs calendrier (intérim/classique), page Suivi intérim (agences + candidatures par agence).
2. **Backoffice – Abonnement & facturation** : finaliser page billing.
3. **Mobile – Mode intérim** : toggle, champ agence, écran Intérim, couleurs calendrier.
4. **Mobile – Écran Entreprises** : liste, FAB, détail (candidatures/contacts liés).
5. **Tests** : faire passer la suite complète (`make up-full` + `make seed-auth` + `make test`), corriger échecs restants (company create, MailHog, status-engine, CRUD users, Email Workflows).
6. **Sync** : endpoints API sync + implémentation mobile (queue, replay, indicateur).
7. **HTTPS** : TLS en production (gateway + optionnel pinning mobile).
8. **Cron/workers** : transitions temporelles moteur statut, suppression auto corbeille > 30 j.
9. **CI/CD** : pipeline GitHub Actions (build + test).

---

*Document généré à partir de l’analyse des fichiers .md à la racine et dans docs/. À mettre à jour au fil des livraisons.*
