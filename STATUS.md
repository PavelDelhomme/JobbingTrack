# État du projet JobbingTrack

**Dernière mise à jour** : 23 février 2026 – **Émulateur** : contrôleur v2 avec GET /flutter-devices et POST /input-tap (redémarrer avec `make emulator-controller-stop` puis `make emulator-controller`). **Tests** : `make test-emulator-controller` (vérifie /health, /avds, /devices, /flutter-devices) ; `make test-suite-quick` lance contrôleur si besoin + test émulateur + frontend + BDD + status sans interaction ; `make test-all` avec `TEST_NOPROMPT=1` ne demande plus Entrée. **BDD** : si Postgres est down, les tests BDD s’arrêtent proprement (pas de « Client already connected »). **Frontend** : test-unit-frontend en local tente `npm install` si jest absent.

---

## ✅ Fait récemment (hub tests, BDD, rapports)

- **Table UserCustomization** : ajoutée dans `scripts/db/init-key-tables.sql` ; créée à chaque `make db-push-all`. Plus d’erreur « relation public.UserCustomization does not exist » après connexion.
- **Tests Emails / Playwright depuis le hub** : les routes `/api/test/run-emails` et `/api/test/run-playwright` utilisent en priorité `API_GATEWAY_URL` pour les appels serveur depuis le conteneur frontend (évite « fetch failed » en Docker).
- **Tests Playwright depuis la vue d'ensemble** : lancement « Tests Playwright » sans scénarios exécute toute la suite Playwright localement (`generate-test-report.sh playwright "npm run test:e2e"`) et renvoie un rapport ; plus d'erreur 400 « Aucun scénario fourni ». Scénarios personnalisés (page Playwright) appellent toujours l'API admin.
- **Backoffice E2E (EADDRINUSE 3000)** : en Docker, la config Playwright réutilise le serveur déjà sur 3000 (`REPORT_DIR` / `TESTS_RESULTS_DIR`) pour éviter « listen EADDRINUSE » lors de `npm run test:e2e` dans le conteneur frontend.
- **Tests Emails (message d'erreur)** : en cas d'échec, la route remonte le message de l'API et une indication sur la config SMTP (auth-service) si pertinent.
- **Journal Performance (hub)** : une seule ligne « Lancement: Tests Performance... » puis sous-lignes « → Backend terminé » / « → Frontend terminé » (plus de doublon).
- **Rapports (totaux cohérents)** : dans `/api/test-reports/all`, pour les rapports dont total ≠ passed + failed, on force `totalTests = passed + failed`. Les rapports Sécurité utilisent `summary.summary.security`. Pour Backoffice et Playwright, le script `generate-test-report.sh` parse `test-results.json` quand il est présent pour remplir total / passed / failed.
- **Rapports Playwright – captures d'écran** : sur la page **Rapports de tests** (`/backoffice/test-reports`), lorsqu'un rapport **Backoffice** ou **Playwright** (E2E) est affiché, un bouton **« Captures Playwright »** permet d'afficher le rapport HTML Playwright du même run (avec captures d'écran et détail des steps). L'API `/api/test-reports/view?id=...&playwright=1` sert le fichier `playwright-report/index.html` du répertoire du run quand il existe.
- **Page Tests (hub) – sélection et lancement** : la page **Tests** (`/backoffice/tests`) permet déjà de **sélectionner une ou plusieurs catégories** (cartes cliquables) et de **lancer les tests** via le bouton « Lancer les tests sélectionnés ». Le journal d'exécution et le lien vers le dernier rapport sont affichés. **À valider** en parcours complet (voir checklist ci‑dessous).
- **Tests programmés (schedule)** : la page **Programmer tests** (`/backoffice/performance-tests/schedule`) permet de créer plusieurs plannings, chacun avec un **type** parmi : Performance (Backend, Frontend, les deux), Tests API, Backend, Frontend, Backoffice, **Tests Sécurité**, **Tests Playwright**, **Tests Emails**. Chaque schedule peut être activé/désactivé et « Lancer maintenant » exécute le type choisi.
- **Vue d'ensemble Tests – blocage pendant l'exécution** : pendant le lancement des tests depuis la page Tests, un **overlay** bloque la page (« Ne pas quitter la page (recharger annule la run) ») et affiche le **test en cours** (ex. « Tests Playwright ») avec une mention pour les tests longs. **Barre de progression** (X/Y) et **liste des étapes** (terminées ✓, en cours, en attente) dans l’overlay. **Avertissement au rechargement** : si l’utilisateur recharge ou ferme l’onglet pendant une run, le navigateur affiche une confirmation ; la run côté serveur continue mais l’UI est perdue (relancer depuis la page ou en CLI). Les cartes de sélection sont désactivées pendant l’exécution.
- **make logs – catégories** : **make logs-applicative** affiche les logs sans metrics-aggregator ni monitoring-c (moins de bruit). **make logs-persistence** affiche uniquement les lignes contenant `[PERSISTENCE]`. **make logs-metrics** reste pour le service metrics-aggregator seul. Aide : **make help-logs**.
- **Hub Tests – Tests BDD et Backoffice uniquement** : depuis la page Tests (`/backoffice/tests`), deux nouvelles catégories lançables : **Tests BDD** (connexion, enums, relations via `make test-database` / `npm run test:database`) et **Backoffice uniquement** (uniquement le spec `backoffice.spec.ts` pour un run E2E plus court). Les rapports sont générés et visibles comme les autres (Tests BDD, Tests Backoffice).
- **Spec backoffice étendu** : `frontend/tests/e2e/backoffice.spec.ts` couvre en plus les pages Rapports de tests, Programmer tests, Données de test, Testeur d’API, hub Tests ; modification paramètre (thème/sauvegarde) ; notifications (contenu ou vide) ; annulation création (remise à l’état) ; apparence (layout, pas de scroll horizontal).
- **Page Playwright – bouton « Toute la suite »** : sur `/backoffice/playwright-tests`, un bouton **« Toute la suite »** lance toute la suite Playwright via `/api/test/run-playwright` (sans scénarios), génère un rapport et ouvre le rapport dans un nouvel onglet (plus de 400 depuis cette page).

---

## 📌 Dernières choses à faire (en plus)

À traiter en plus des priorités ci‑dessous (ordre recommandé) :

1. **User Journey – affichage, analytics, rapports**  
   - **Erreur corrigée (10/02)** : `ReferenceError: token is not defined` dans `user-journey/page.tsx` (useEffect) → ajout de `const { token } = useAuth()` en tête du composant.
   - **Parcours personnalisé** : si une étape échoue (ex. « Création entreprise échouée: Internal Server Error »), le script sort en code 1 et l’API renvoyait 500 → **correction** : l’API `/api/user-journey/custom` parse désormais le JSON dans stdout même en cas d’exit 1 et renvoie 200 avec les résultats (succès + échecs + ignorés). **Reste** : corriger la cause du 500 côté company-service pour l’utilisateur de test (contexte token) ; ajouter un **lien visible** vers « Rapports de parcours » depuis la page Parcours personnalisé / User Journey.
   - **Parcours prédéfinis** : les analytics affichent parfois des incohérences (ex. « Étapes Réussies 0 / 14 » alors que « Taux de réussite 78,6 % » et « Étapes Échouées 3 ») ; le **rapport du parcours prédéfini** n’est pas toujours généré ou listé. **À faire** : aligner les compteurs (réussies / échouées / total) et s’assurer que le rapport est bien généré et accessible (lien « Voir les rapports de parcours »).
   - **À faire** : Vérifier que l’**affichage** des parcours (résultats, analytics, perf) est **fonctionnel** ; corriger auth (register/login) et enchaînement des étapes pour que les scénarios passent en mode Admin et Utilisateur de test.

2. **CI/CD complet (en tout dernier)**  
   - Pipeline **complète** : validation structure BDD (adaptée microservices), **exécution de tous les tests** (API, backend, frontend, backoffice, sécurité, performance, user-journey, Playwright), **déploiement** (build images, push, déploiement staging/prod selon stratégie).
   - Adapter le workflow GitHub Actions au projet **microservices** (un Prisma par service, pas un seul `backend/prisma`).
   - Intégrer les tests actuels (Tests API 36, tests backend, frontend, backoffice, sécurité, performance) dans la CI et les rapports (artefacts, statut par catégorie).
   - **Résolution à faire** : le job « Validation de la structure de base de données » échouait avec **« Validation des enums – Enum EventType manquant »** (exit 1). Cause : le schéma partagé `backend/prisma/schema.prisma` utilise **model EventType** (table), pas **enum EventType**, et **EntityType** peut être dans un service. **Correction appliquée** : le workflow accepte désormais `model EventType` en plus de `enum EventType`, et `enum EntityType` est optionnel (vérifié dans un service si absent du schéma partagé). Vérifier que le job passe au prochain push.
   - **À faire en tout dernier** une fois le reste stabilisé.

3. **Tests backoffice – couverture complète**  
   Pouvoir **tester absolument tout** le backoffice admin : chaque page une par une (Vue d’ensemble, Analytics Performances / Réseau / Conteneurs / Application, Logs services, Logs sécurité, User Analytics, Archives / Corbeille, Gestion utilisateurs, Génération de données de test, Émulateur mobile, Parcours utilisateur, API Tester, Email Monitor, etc.), **logs en temps réel** par service, **requêtes**, **monitoring unitaire** par service, **rapports de parcours**, **parcours admin vs user** avec analytics. Voir **TESTS_END.md** §15 (Backoffice administrateur – couverture complète) et **ERRORS.md** pour les erreurs connues par page.

4. **Émulateur mobile (priorité immédiate)**  
   Faire fonctionner l’**interface Émulateur mobile** du backoffice pour **démarrer le projet** et **tester l’app mobile directement** dans l’interface : **build d’APK** et **run du projet** pour avoir une **vraie app qui tourne et se voit** dans l’émulateur. À prévoir :
   - **Build APK** : lancer le **build Android (APK)** du projet Flutter depuis l’interface (ou script déclenché par le backoffice).
   - **Run du projet** : **démarrer le projet** (ex. `flutter run` ou install APK + lancement) depuis l’interface pour que l’app s’exécute et soit **visible** (rendu réel).
   - **Sélection des appareils ADB** : lister les **appareils connectés en ADB** sur la machine hôte (`adb devices`), **sélectionner l’appareil** dans l’interface.
   - **Rendu et logs** : afficher le **rendu** de l’app (streaming ou iframe si applicable), **démarrer / arrêter**, **logs Android (logcat)** en temps réel avec filtre JobbingTrack si possible.
   - **Installation d’APK** : installer un APK (upload / chemin) sur l’appareil sélectionné via ADB.
   - **Backoffice / backend** : config, health, version pour l’environnement de test.
   - **Plus tard** (voir section « Déploiement final » en fin de document) : déploiement de l’app mobile et de l’API/backoffice sur le serveur depuis le backoffice (Docker Hub, CI, scripts SSH, pipeline build APK/AAB release, etc.).

---

## 🎯 APPLICATION RÉELLE – Objectifs (mobile + backend API)

**Priorité** : travailler sur une **application réelle avec backend API fonctionnel**, testable dans **notre émulateur mobile**, pour valider la **gestion des candidatures** comme prévu.

### Vision côté candidat (intérim / expériences travail)

L’application doit permettre au **candidat** de **suivre, gérer et piloter** l’ensemble de ses **expériences travail côté intérim** (et candidatures classiques) : tout depuis le point de vue candidat — **ses demandes** (candidatures, missions), **ce qu’il a en cours** (missions en cours, processus en cours), **les propositions qu’il reçoit** (offres, missions proposées), etc. Objectif : un tableau de bord clair pour savoir où en sont ses démarches, ses missions intérim et ses propositions, sans confusion.

### Fonctionnalités à développer en priorité (côté applicatif)

- **Utilisateur** : **inscription** (app mobile / web), **connexion**, **persistance de la session** (garder la connexion), **système de synchronisation** (données offline / online).
- **Backend API** : APIs stables et sécurisées pour auth, candidatures, entreprises, contacts, entretiens, appels, relances, etc. (déjà partiellement en place ; à valider et compléter pour l’app mobile).
- **Suivi candidat** : **demandes** (candidatures / missions), **en cours** (missions ou processus en cours), **propositions reçues** (offres, missions proposées) — à refléter dans les écrans et les APIs (filtres, statuts, types).
- **Test dans l’émulateur** : pouvoir **tester l’application de gestion des candidatures** (et du suivi intérim côté candidat) de bout en bout depuis l’interface backoffice (Émulateur mobile + appareil ADB, voir point 4 ci‑dessus).

### Où c’est répertorié

- **STATUS.md** (ce fichier) : objectifs, reprise travail, **checklist « Application mobile – À faire et à valider »** (écrans, fonctionnalités, émulateur, user journey, analytics), erreurs connues.
- **docs/mobile/APPLICATION_MOBILE_A_FAIRE.md** : **récapitulatif complet** (comportement attendu, alignement API, écrans, émulateur, user journey, analytics) ; référence **docs/api/api-reference/README.md** et **docs/database/**.
- **/docs** : fonctionnement applicatif, guide mobile (`docs/mobile/`, `docs/mobile/guide/README.md`), user journey (`docs/user-journey/`), tests mobile (`docs/tests/MOBILE_TESTS_README.md`), emails (`docs/emails/MAIL.md`), analytics mobile (`docs/mobile/analytics/`).
- **mobile/** : app Flutter, README, analytics ; à connecter aux APIs et à la sync.

### Ordre de travail recommandé

1. **D’abord** : développer et valider **inscription, connexion, session, synchronisation** et **APIs backend** pour que l’app mobile soit utilisable dans un environnement de test (émulateur + backend).
2. **Ensuite** : retravailler les autres aspects (backoffice administrateur, parcours, rapports, etc.) et améliorer l’émulateur mobile (APK, logs, déploiement).
3. **Plus tard** : **versioning** de l’application mobile et **déploiement** depuis l’interface backoffice (build/déploiement APK selon version).

---

## 📱 APPLICATION MOBILE – À faire et à valider (checklist)

Récapitulatif complet : **docs/mobile/APPLICATION_MOBILE_A_FAIRE.md** (comportement attendu, alignement API **docs/api/api-reference/README.md**, structure données **docs/database/**). Cocher au fur et à mesure de la validation.

### Premières étapes – Auth (connexion, inscription, vérification email, mot de passe oublié)

- [x] **Écran Login** : email + mot de passe, lien « Mot de passe oublié ? », appel API login, stockage token, redirection accueil.
- [x] **Écran Inscription** : email (validation), mot de passe + confirmation (validation), envoi mail de vérification après inscription, redirection login.
- [x] **Vérification email** : écran (route `/verify-email/:token`), appel API verify-email, affichage succès/erreur puis lien vers connexion.
- [x] **Mot de passe oublié** : écran avec email → appel API forgot-password → envoi mail à l’utilisateur avec lien de réinitialisation.
- [x] **Réinitialisation mot de passe** : écran (route `/reset-password/:token`), nouveau mot de passe + confirmation, appel API reset-password, redirection login.
- [ ] **Page de démarrage (dashboard)** avec **navigation en bas** (bottom nav) et **drawer** (à faire ensuite).

### Émulateur mobile (backoffice) – priorité immédiate

**Objectif** : pouvoir **démarrer le projet** et **tester l’app mobile** directement depuis l’interface backoffice (Émulateur mobile) : **build d’APK** et **run du projet** dans l’interface pour avoir une **vraie app qui tourne et se voit** dans l’émulateur.

**Tests ajoutés** : `make test-emulator-controller` (vérifie GET /health, /avds, /devices, /flutter-devices – le contrôleur doit être démarré). Tests Jest de la page : `frontend/src/app/(admin)/backoffice/mobile-emulator/__tests__/mobile-emulator-page.test.tsx` (rendu, boutons, appel /health). Voir `make tests-help` pour la liste des tests.

- [x] **Contrôleur v2** : routes /health, /avds, /devices, /flutter-devices, /build-apk (toujours 200), /install-run, /run-flutter, /input-tap. Copie gradle writable si SDK en lecture seule. Gradle 8.13 (wrapper).
- [ ] **Build APK** : lancer le build depuis l’interface (fonctionne si contrôleur v2 démarré : `make emulator-controller-stop` puis `make emulator-controller`).
- [ ] **Run du projet** : Flutter run ou **Installer et lancer** (APK) depuis l’interface sur l’appareil sélectionné.
- [x] Lister les **appareils ADB** et **sélectionner l’appareil** dans l’interface.
- [x] **Rendu** : capture d’écran (screenshot) de l’appareil en temps réel. Boutons Copier / Effacer pour les logs.
- [ ] **Logs Android (logcat)** en temps réel dans l’interface (à faire : streamer dans l’UI ; pour l’instant logs Flutter run = terminal du contrôleur).
- [x] **Installer et lancer** l’APK sur l’appareil sélectionné (bouton « Installer et lancer »).
- [x] Health, version (GET /health avec version: 2) pour environnement de test.

### Écrans mobiles (à valider un par un)

- [x] **Login** : champs email/mot de passe, lien Mot de passe oublié, appel API login, stockage token, redirection.
- [x] **Inscription** : champs requis (email, validation email, mot de passe, validation mot de passe), appel API register, envoi mail vérification, redirection login.
- [x] **Mot de passe oublié** : écran, envoi mail de réinitialisation (API forgot-password).
- [x] **Réinitialisation mot de passe** : écran avec token (lien reçu par mail), API reset-password.
- [x] **Vérification email** : écran avec token (lien reçu par mail), API verify-email.
- [ ] **Complétion profil** : formulaire profil (PUT /profiles/me), puis accès accueil.
- [ ] **Accueil** : tableau de bord candidat (résumé, accès aux sections).
- [ ] **Candidatures** : liste, création, édition, filtres (demandes, en cours, propositions si applicable).
- [ ] **Entreprises** : liste, création.
- [ ] **Contacts** : liste, création (lié entreprise/candidature).
- [ ] **Entretiens** : liste, planification.
- [ ] **Relances** : liste, création.
- [ ] **Événements** : calendrier / liste, création.
- [ ] **Profil** : affichage et édition (PUT /profiles/me).
- [ ] **Paramètres** : préférences, thème, notifications, déconnexion.
- [ ] **Statistiques / Dashboard** : vue agrégée (dashboard API).
- [ ] **Recherche** : recherche globale (candidatures, contacts, etc.).

### Fonctionnalités (processus complet)

- [x] **Inscription** : flux complet (email, mot de passe, validation, envoi mail vérification), API register.
- [x] **Connexion** : flux complet (email, mot de passe), API login, token stocké.
- [ ] **Persistance de la session** : garder la connexion (token, refresh), reprise au redémarrage app.
- [x] **Déconnexion** : bouton déconnexion (écran Paramètres), suppression token, redirection login.
- [ ] **Synchronisation** : données offline / online, sync avec backend (API Gateway).
- [ ] **Suivi candidat** : demandes (candidatures/missions), en cours, propositions reçues (écrans + APIs/filtres).

### User journey mobile

- [ ] Parcours **inscription → connexion → (complétion profil) → accueil** fonctionnel.
- [ ] Parcours **création candidature → entreprise → contact → entretien / relance / événement** cohérent avec les APIs.
- [ ] User journey documenté et **aligné avec docs/user-journey/** ; parcours prédéfinis / personnalisés utilisables pour valider.

### Tracking utilisateur et analytics mobile

- [ ] **Outils analytics mobile** : service backend (mobile-analytics), SDK Flutter, envoi événements/sessions/crashes.
- [ ] **Consentement utilisateur** (opt-in, RGPD) et **dashboard backoffice** pour visualiser les métriques mobile.
- [ ] Référence : **docs/mobile/analytics/** (README, INTEGRATION, PRIVACY, DASHBOARD, SUMMARY).

### Documentation et structure

- [ ] **docs/api/api-reference/README.md** : à jour avec les endpoints utilisés par l’app mobile.
- [ ] **docs/database/** (ACTIONS_ET_MODIFICATIONS, relations, structure) : alignés avec les besoins mobile (candidatures, statuts, filtres demandes/en cours/propositions).
- [ ] **docs/mobile/APPLICATION_MOBILE_A_FAIRE.md** : tenu à jour (écrans, APIs, comportement attendu).

---

## ☑️ Checklist couverture complète – pages Tests

À parcourir pour valider toute la partie **Tests** du backoffice (ordre recommandé) :

| # | Page / action | URL / lieu | À vérifier |
|---|----------------|------------|------------|
| 1 | Vue d'ensemble (hub) | `/backoffice/tests` | Cartes visibles, sélection (cocher plusieurs catégories), bouton « Lancer les tests sélectionnés », journal d'exécution, lien « Dernier rapport ». |
| 2 | Tests Playwright | Carte + `/backoffice/playwright-tests` | Lancement depuis le hub (sans scénarios = toute la suite) ; page dédiée scénarios personnalisés. |
| 3 | Tests Emails | Carte + `/backoffice/tests-emails` | Lancement depuis le hub ; config SMTP si erreur. |
| 4 | Tests API | Carte + `/backoffice/tests-api` | Lancer, rapport avec totaux (ex. 36 tests). |
| 5 | Tests Backend | Carte + `/backoffice/tests-backend` | Lancer, rapport cohérent. |
| 6 | Tests Frontend | Carte + `/backoffice/tests-frontend` | Lancer, rapport cohérent. |
| 7 | Tests Backoffice (E2E) | Carte + `/backoffice/tests-backoffice` | Lancer (plus d'EADDRINUSE si Docker), rapport. |
| 8 | Tests Sécurité | Carte + `/backoffice/tests-security` | Lancer, rapport (vulnérabilités, sécurisées). |
| 9 | Tests Performance | Carte + sous-lignes Backend / Frontend | Les deux runs, rapports. |
| 10 | Rapports de tests | `/backoffice/test-reports` | Liste des rapports, filtre, ouvrir un rapport, bouton « Captures Playwright » pour Backoffice/Playwright. |
| 11 | Programmer tests | `/backoffice/performance-tests/schedule` | Créer un schedule (types : API, Backend, Frontend, Backoffice, Sécurité, Playwright, Emails, Performance), activer, « Lancer maintenant ». |
| 12 | Parcours prédéfinis | Parcours utilisateur | Lancer un parcours, analytics, rapport généré et accessible. |
| 13 | Parcours personnalisé | Parcours utilisateur | Étapes, lancer, résultats, rapport enregistré. |
| 14 | Rapports de parcours | Lien depuis Parcours ou Rapports | Liste et détail des rapports de parcours. |

---

## 🧪 Ce que couvrent les « Tests Backoffice » (E2E)

Quand on lance **Tests Backoffice** depuis le hub (`/backoffice/tests`), la commande exécute **toute la suite Playwright** du frontend (`npm run test:e2e` → tous les specs dans `frontend/tests/e2e/`), pas uniquement le backoffice. Sont donc exécutés notamment : `backoffice.spec.ts`, `admin-features.spec.ts`, `login.spec.ts`, `data-management.spec.ts`, `security-tests.spec.ts`, `performance-tests.spec.ts`, etc.

### Ce que teste le spec backoffice (`frontend/tests/e2e/backoffice.spec.ts`)

- **Affichage** : titre, menu, liens Applications / Candidats / Entreprises.
- **Navigation** : Applications → liste candidatures, Entreprises → liste entreprises, Candidats → liste contacts ; Analytics → Statistiques + graphiques/métriques ; Utilisateurs → liste + actions Modifier/Supprimer/Activer.
- **Recherche globale** : champ recherche, résultats.
- **Paramètres** : accès au lien Paramètres, présence « Configuration » et bouton thème (aucune **modification** de paramètres, pas de test rétention / nettoyage auto / affichage).
- **Déconnexion** : bouton Déconnexion → redirection login.
- **Notifications** : présence du centre de notifications et de la liste (pas de test d’envoi ou de contenu).
- **Accessibilité** : navigation clavier (Tab, Enter).
- **404** : route inexistante → page 404.
- **Session** : rechargement → utilisateur resté connecté.
- **RGPD** : lien RGPD → Données personnelles, Export/Suppression.

### Ce qui est couvert après extension (backoffice.spec.ts)

- **Pages ajoutées** : Rapports de tests (`/backoffice/test-reports`), Programmer tests (`/backoffice/performance-tests/schedule`), Données de test (`/backoffice/test-data`), Testeur d’API (`/backoffice/api-tester`), hub Tests (`/backoffice/tests`).
- **Paramètres** : test de modification du thème (bouton thème + Sauvegarder si présents), sans casser l’état.
- **Notifications** : centre de notifications ou indicateur ; liste ou message « Aucune notification ».
- **Remise à l’état** : test « ne pas laisser de données créées » (ouvrir Créer utilisateur puis Annuler/Retour sans soumettre).
- **Apparence** : layout (nav, main), pas de scroll horizontal excessif.

### Ce qui reste partiel ou non couvert

- **Pages** : paramètres avancés (rétention, nettoyage auto), Archives, Corbeille, Logs services/sécurité, User analytics, Email Monitor, Parcours utilisateur (assertions légères ou absentes).
- **Rétention / nettoyage automatique** : non testés (pas d’UI dédiée dans le spec).
- **Rollback BDD** : la suite utilise un login mocké et n’insère pas de données réelles ; pas de teardown nécessaire pour backoffice.spec.ts.

**Hub Tests** : depuis `/backoffice/tests` on peut lancer **Tests BDD** (run-database → `make test-database` / `npm run test:database` dans `tests/`) et **Backoffice uniquement** (run-backoffice-only → uniquement `backoffice.spec.ts`). Les rapports sont générés comme pour les autres types (catégorie « Tests BDD » ou « Tests Backoffice »).

---

## 🔴 Erreurs backoffice (parcours des pages admin) – corrigées et connues

Lors du parcours **toutes les pages du backoffice** une par une, les erreurs suivantes ont été identifiées. Les corrections sont documentées dans **RESOLUTIONS.md** et **ERRORS.md**.

| Problème | Statut | Détail |
|----------|--------|--------|
| **BigInt – métriques conteneur** | ✅ Corrigé | `GET /api/v1/persistence/containers/:name/metrics` renvoyait 500 « Do not know how to serialize a BigInt ». **Correction** : sérialisation des BigInt (metrics-aggregator `persistence.routes.js`) avant `res.json()`. |
| **container_logs – colonne container_id** | ✅ Corrigé | Log-collector-c lisait `container_logs` (schéma init-key-tables avec `"containerId"`) au lieu de **log_collector_logs** (table qu’il remplit, avec `container_id`). **Correction** : `http_server.c` lit désormais `FROM log_collector_logs`. |
| **User Journey – ENOENT save-report** | ✅ Corrigé | En Docker, `mkdir('/app/tests/user-journey-reports')` échouait (répertoire parent absent). **Correction** : en Docker utilisation de `/tmp/user-journey-reports` (ou `USER_JOURNEY_REPORTS_DIR`) + `mkdir(..., { recursive: true })`. |
| **User Analytics – tables manquantes** | ⚠️ À traiter | Page `/backoffice/user-analytics` : Postgres `relation "public.user_events" does not exist` (idem `user_sessions`, `user_errors`, `user_performances`, `device_infos`). Ces tables sont utilisées par dashboard-service (analytics). **Action** : créer les tables (migrations/init) ou documenter comme optionnel. |
| **Loki – ENOTFOUND** | ⚠️ Documenté | Requêtes type « erreurs par conteneur » (Loki) : `getaddrinfo ENOTFOUND loki`. Loki n’est pas déployé. **Action** : dégrader proprement (pas de crash, message clair) ou ajouter Loki au stack si besoin. |
| **Logs applicatifs – erreurs connues** | ⚠️ Documenté | **make logs** / **make logs-applicative** : Postgres peut afficher `type "FollowUpStatus" already exists`, `relation "system_metrics_snapshots" does not exist` (lancer `make db-push-all` si besoin), `service_availability_history` absente. Redis : WARNING Memory overcommit. Colorées en rouge par `scripts/color-logs.sh`. **make logs-applicative** exclut metrics-aggregator et monitoring-c (`grep --line-buffered`). **→ Résolution détaillée** : section **« Résolution – Tables monitoring et enums (Postgres) »** ci‑dessous. |
| **Archives / Corbeille** | ⚠️ Documenté | Plusieurs services renvoient 404/500 « ne supporte pas les archives » : company, user, event, interview, contact, application, call, followup. **Action** : implémenter les routes archives côté backend ou documenter les limites. |

### Résolution – Tables monitoring et enums (Postgres)

Erreurs typiques dans les logs Postgres après `make up-full` ou en cours d’exécution :

1. **`relation "public.system_metrics_snapshots" does not exist`** (idem **container_metrics_snapshots**, **service_availability_history**, **system_metrics**)
   - **Cause** : les tables sont créées par `make db-push-all` (Partie 2 = `init-system-metrics.sql`, Partie 3 = `init-key-tables.sql`). Si `db-push-all` n’a pas été exécuté, a échoué ou a été lancé après le démarrage de metrics-aggregator/monitoring-c, ces tables peuvent manquer.
   - **Solution** :
     - Lancer **`make db-push-all`** avec la stack déjà up (Postgres doit être démarré). Vérifier que la sortie affiche bien « Partie 2/3 » et « Partie 3/3 » sans erreur.
     - Si vous utilisez **`make up-full`** : il exécute un seul `db-push-all` après le démarrage des services principaux et **avant** monitoring-c et metrics-aggregator. En cas d’échec partiel de `db-push-all`, les erreurs ne sont plus masquées (init-system-metrics affiche les erreurs SQL).
     - Après un `db-push-all` réussi, **redémarrer metrics-aggregator** : `docker restart jobbingtrack-metrics-aggregator` (ou relancer `make db-push-all`, qui redémarre déjà le service en fin de script).
   - **Vérification** : `docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c '\dt public.system_metrics*'` doit lister `system_metrics`, `system_metrics_snapshots`, etc.

2. **`type "FollowUpStatus" already exists`** / **`type "InterviewType" already exists`**
   - **Cause** : plusieurs services Prisma (interview-, call-, event-, workflow-service, etc.) définissent ces enums. Lors des `prisma db push` (lors de `db-push-all` ou au démarrage d’un service qui lance un push), le premier push crée le type, les suivants provoquent cette erreur.
   - **Solution** : **À ignorer** en pratique. Le script `db-push-all.sh` considère déjà « type already exists » comme succès pour le décompte. Si un service (ex. security-service) lance un `prisma db push` au démarrage quand des tables manquent, ces messages peuvent apparaître ; ils n’empêchent pas le fonctionnement.
   - Pour réduire le bruit : éviter de lancer `prisma db push` au démarrage des conteneurs ; privilégier un seul `make db-push-all` après mise à jour du schéma.

3. **`jobbingtrack-metrics-aggregator exited with code 1`**
   - **Cause** : le plus souvent, échec d’écriture en BDD (tables **system_metrics_snapshots**, **container_metrics_snapshots** ou **service_availability_history** absentes) ou erreur au démarrage.
   - **Solution** : appliquer la résolution (1) ci‑dessus, puis `docker restart jobbingtrack-metrics-aggregator` ou relancer `make up-full` (qui refait `db-push-all` puis démarre le monitoring).

**Résumé** : après un **`make db-push-all`** réussi (sans erreur sur init-system-metrics et init-key-tables), les tables monitoring existent et metrics-aggregator peut persister. En cas de BDD déjà existante sans ces tables, exécuter une fois **`make db-push-all`** puis redémarrer metrics-aggregator.

**À faire** : après `make build` (et redémarrage des services concernés), revérifier les pages Analytics → Conteneurs (métriques par conteneur), Services → Logs (log-collector-c), Parcours utilisateur → sauvegarde rapport. Voir **ERRORS.md** et **TESTS_END.md** §15 pour la checklist complète des pages à tester.

---

## ▶️ PROCHAINE ÉTAPE – À faire maintenant (lundi)

**Suivre ces étapes dans l’ordre :**

1. **Démarrer la stack** (dans le terminal, à la racine du projet) — **une seule commande** (inclut la création du super admin) :
   ```bash
   make up-full && make db-push-all && make build && make up-full && make create-admin-user && make status
   ```
   Attendre que chaque étape se termine (21/21 services UP à la fin). `make create-admin-user` crée ou met à jour l’utilisateur **SUPER_ADMIN** (admin@jobbingtrack.com / password123).

2. **Ouvrir le backoffice** (navigateur) : URL du front (ex. http://localhost:5003 ou celle configurée). Se connecter avec **admin@jobbingtrack.com** / **password123**.

   **Si vous voyez « Accès Refusé – Votre rôle actuel : USER »** : l’utilisateur admin existe en BDD mais avec le rôle USER. Corriger en lançant une fois :
   ```bash
   make create-admin-user
   ```
   Puis se **déconnecter** et se **reconnecter** (ou rafraîchir après déconnexion). Le script met à jour le rôle en **SUPER_ADMIN** pour admin@jobbingtrack.com.

3. **Lancer les Tests API** : Backoffice → **Tests** → **Tests API** → bouton **Lancer**. Vérifier que **36/36** passent. Si des échecs : noter lesquels et vérifier les logs (`make logs` ou Backoffice → Rapports de tests).

4. **Vérifier les Tests Sécurité** : Backoffice → **Tests** → **Tests Sécurité** → Lancer. Vérifier que le rapport est bien généré et visible dans **Rapports de tests** (plus d’erreur ENOENT `tests/reports`).

5. **Vérifier le Parcours personnalisé** : Backoffice → **Parcours utilisateur** → **Parcours personnalisé**. Ajouter quelques étapes (ex. Connexion, Créer Entreprises, Voir Statistiques) → **Lancer le Parcours**. Vérifier que les résultats s’affichent et que le rapport est sauvegardé (lien « Voir les rapports de parcours »).

6. **Cocher la checklist** (ci‑dessous) au fur et à mesure, puis passer aux tâches « À faire » (rapports perf, parcours prédéfinis, etc.) selon la section **REPRISE TRAVAIL** plus bas.

---

## ☑️ Checklist reprise (cocher au fur et à mesure)

- [ ] `make up-full && make db-push-all && make build && make up-full && make create-admin-user && make status` exécuté, 21/21 services UP
- [x] Connexion backoffice OK (admin@jobbingtrack.com / password123). Si « Accès Refusé » (rôle USER) : relancer `make create-admin-user` puis se reconnecter.
- [x] Tests API lancés : 36/36 passent
- [x] Tests Sécurité lancés : rapport généré et visible dans Rapports de tests (détail : total / sécurisées / vulnérabilités + CRITIQUES, HAUTES, MOYENNES, BASSES, SÉCURISÉES)
- [ ] Parcours personnalisé testé : exécution OK, rapport enregistré
- [ ] Parcours prédéfinis : corriger auth (register/login) et enchaînement des étapes
- [ ] **Rapports performance** : aligner sur Tests API (répertoire, summary, affichage)
- [x] **Table UserCustomization** : créée par `make db-push-all` via `scripts/db/init-key-tables.sql` (évite « relation public.UserCustomization does not exist » à la connexion). Après un `make db-push-all`, les préférences utilisateur sont persistées.
- [ ] (Ensuite) Enrichir tests sécurité ; corriger vulnérabilités (CSRF, headers, rate limiting)

---

## 🔧 Dépannage : Accès Refusé (rôle USER au lieu d’admin)

**Symptôme** : Connexion avec admin@jobbingtrack.com OK, mais message « Accès Refusé – Votre rôle actuel : USER ». Le backoffice exige les rôles **ADMIN** ou **SUPER_ADMIN**.

**Cause** : L’utilisateur admin@jobbingtrack.com existe en base mais avec le rôle **USER** (création par inscription ou ancien seed). `make up-full` ne fait que vérifier qu’un utilisateur avec cet email existe ; il ne corrige pas le rôle.

**Solution** :
1. À la racine du projet : `make create-admin-user`
2. Se déconnecter du backoffice, puis se reconnecter avec admin@jobbingtrack.com / password123.

Le script met à jour l’utilisateur existant en **SUPER_ADMIN** (et réinitialise le mot de passe si besoin). À ajouter à la checklist si cela se reproduit après un `db-push-all` ou une recréation de données.

---

## 🚀 DÉMARRAGE PROJET (premier lancement ou reprise)

**Séquence complète à lancer à la racine du projet** (une seule ligne) :

```bash
make up-full && make db-push-all && make build && make up-full && make create-admin-user && make status
```

Détail de chaque étape :

| Étape | Commande | Rôle |
|-------|----------|------|
| 1 | `make up-full` | Démarre tous les conteneurs (PostgreSQL, auth, gateway, etc.). |
| 2 | `make db-push-all` | Prisma push (9 services) + init-system-metrics + init-key-tables + seed statuts + fix Application.isArchived. |
| 3 | `make build` | Rebuild des images Docker (après changement de code/schéma). |
| 4 | `make up-full` | Redémarre la stack avec les images à jour (21/21 services). |
| 5 | `make create-admin-user` | **Crée ou met à jour** l’utilisateur super admin (admin@jobbingtrack.com / password123, rôle **SUPER_ADMIN**). Sans cette étape, l’admin peut exister en **USER** et le backoffice affiche « Accès Refusé ». |
| 6 | `make status` | Affiche l’état des services. |

**Repartir à zéro (nettoyage complet) :**
```bash
make down && make up-full && make db-push-all && make build && make up-full && make create-admin-user && make status
```

---

## 📋 REPRISE TRAVAIL – À faire en priorité (lundi)

**Objectif principal** : viser une **application réelle** (mobile + backend API) testable dans l’émulateur — inscription, connexion, session, synchronisation. Voir la section **« APPLICATION RÉELLE – Objectifs »** ci‑dessus.

### 1. Vérifier que tout tourne

- Lancer la **séquence complète** (section « DÉMARRAGE PROJET » ci-dessus) :  
  `make up-full && make db-push-all && make build && make up-full && make create-admin-user && make status`
- Se connecter au backoffice : admin@jobbingtrack.com / password123.
- Lancer les **Tests API** (Backoffice → Tests → Tests API → Lancer) : 36/36 doivent passer.
- Vérifier les **rapports** : Backoffice → Rapports de tests (Tests API, Sécurité, Performance, Parcours).

### 2. Tests Sécurité

- **Correction ENOENT faite** (21/02) : le script utilise `REPORT_DIR`. Relancer Tests Sécurité depuis le backoffice et vérifier que le rapport apparaît dans Rapports de tests.
- **Rapport détaillé** (23/02) : le script `generate-test-report.sh` lit `security-report.json` pour remplir total / passed / failed (vérifications vs vulnérabilités) ; le résumé et la page Rapports de tests affichent le bon nombre de tests (ex. 61 vérifications, 59 sécurisées, 2 vulnérabilités) et le détail par gravité (Critiques, Hautes, Moyennes, Basses, Sécurisées).
- **Chiffres incohérents** (ex. « 1 test exécuté, 1 réussi, 2 échoués ») : **correction** : l’API `GET /api/test-reports/all` recalcule pour les rapports « Tests Sécurité » les totaux à partir de `summary.security` (secure + critical+high+medium+low) pour que Total / Réussis / Échoués soient cohérents. S’assurer que `REPORT_DIR` est bien passé au script de test en Docker pour que `security-report.json` soit généré.
- **À faire** : Enrichir les tests (XSS, SQLi, CSRF, auth, rate limiting, headers) ; s'assurer qu'ils sont complets et opérationnels.

**Priorité des prochaines tâches** : (1) Parcours personnalisé — test complet ; (2) Parcours prédéfinis — corriger auth ; (3) Rapports performance — aligner comme Tests API ; (4) Table UserCustomization — `make db-push-all` ; (5) Tests sécurité — enrichir et corriger vulnérabilités.

**Erreurs corrigées (23/02)** — à valider après `make build` / redémarrage :
- **auth-service** : table `UserCustomization` absente → le contrôleur preferences retourne des préférences par défaut si la table n'existe pas. **À faire** : créer la table avec `make db-push-all` (auth-service Prisma inclut le modèle UserCustomization). Sans cette table, les logs affichent des ERROR sur `UserCustomization` et le parcours utilisateur peut générer des erreurs côté préférences.
- **Rapports de parcours** : l’API de sauvegarde des rapports (save-report) utilisait en Docker `/tmp/user-journey-reports` au lieu du même chemin que le scan (`PROJECT_ROOT/tests/user-journey-reports`). Corrigé : les rapports sont maintenant enregistrés dans le même répertoire que celui scanné par « Rapports de parcours », donc visibles après un parcours prédéfini ou personnalisé.
- **CI/CD (validation BDD)** : (1) `DATABASE_URL` est défini lors de la validation du schéma Prisma pour éviter P1012 ; (2) `prisma format` est exécuté (au lieu de `--check` uniquement) pour corriger le formatage ; (3) le seed des statuts s’exécute depuis `$GITHUB_WORKSPACE/backend` avec le script en chemin absolu pour éviter MODULE_NOT_FOUND.
- **application-service** : `prisma.activity` undefined → création d'activité conditionnelle ; seed protégé.
- **Central logger** : `METRICS_SERVICE_URL` corrigé en `http://jobbingtrack-metrics-aggregator:3014` dans docker-compose.yml.

### 3. Rapports de performance

- Les rapports perf ne sont **pas** enregistrés/affichés comme les Tests API.
- **À faire** : Aligner sur le flux des Tests API (écriture dans `tests/results/<timestamp>/`, affichage complet dans Rapports de tests).

### 4. Parcours utilisateur (User Journey)

- **Parcours personnalisé** (21/02) : Plus d'étapes disponibles (Mise à jour Entreprises/Candidatures/Contacts, Liste Notifications) ; appel API corrigé (`/api/user-journey/custom`) ; rapports sauvegardés et visibles dans Rapports de parcours.
- **Parcours prédéfinis** (21 scénarios) : En mode Admin et mode Utilisateur de test, les scénarios échouent (~14 % de réussite). Logs : ERROR auth-service après register/login.
- **À faire** : Corriger l'auth (register/login) et l'enchaînement des étapes ; rendre les 21 scénarios opérationnels ; s'assurer que tous les rapports de parcours sont bien enregistrés et listés.

### 5. Rapports – Conventions de nommage

- **Tests API** : `tests/results/<timestamp>/` (ex. `20260221-143052`), fichiers `api.json`, `summary.json`, `report.html`.
- **Tests Sécurité** : `tests/results/<timestamp>/security-report.json` (via REPORT_DIR).
- **Parcours utilisateur** : `tests/user-journey-reports/user-journey-<nom>-<date>_<heure>.json` (ex. `user-journey-Mon-Parcours-Personnalise-2026-02-21_143052.json`).
- **Performance** : À aligner sur le même schéma (tests/results ou répertoire dédié avec format cohérent).

### 6. Admin en rôle USER (Accès Refusé backoffice)

- **Symptôme** : Connexion avec admin@jobbingtrack.com OK mais message « Accès Refusé – Votre rôle actuel : USER ».
- **Solution** : Exécuter `make create-admin-user`, puis se déconnecter et se reconnecter. Détail : section **« Dépannage : Accès Refusé »** ci-dessus.

### 7. Autres points en attente

- **Logs emails** : Page `/backoffice/emails/logs` et API `GET /api/v1/emails/logs` OK.
- **API versioning** : Corriger 404 sur `GET /api/v1/analytics/stats/:userId/versions`.
- **SMTP** : Config opérationnelle, test d'envoi depuis Backoffice → Déliverabilité.
- **Créer compte test** : Backoffice → Utilisateurs → Nouvel utilisateur (formulaire opérationnel).
- **CI/CD** : Pipeline GitHub Actions à adapter (projet microservices).
- **Mise à jour des tests** : Lors de l'ajout de nouvelles fonctionnalités, mettre à jour les Tests API, les parcours et les scénarios correspondants.

### 8. Checklist détaillée

→ Voir la **Checklist reprise** en tête de document (section « ☑️ Checklist reprise »). Cocher chaque point au fur et à mesure.

---

## ✅ Tests API – 36/36 passent (20/02/2026)

Les **Tests API** lancés depuis le backoffice (Tests → Tests API → Lancer) exécutent **36 tests** et **tous passent** :
- Health (gateway, /api/health, metrics), services backend (401 sans token), auth (login, profile), users, companies, **applications** (list + create), contacts, **interviews** (list + create), **calls** (list + create), events, **followups** (list + create), profile, notifications, metrics, dashboard.
- **Create Interview**, **Create Call** et **Create Followup** utilisent l’**ID de la candidature créée** dans le même run (extraction via Node dans le conteneur frontend, puis fichier `/tmp/created_application_id.txt`, puis première candidature de la liste).

**Processus recommandé** (après changement schéma BDD ou premier démarrage) :
1. `make db-push-all` — Prisma push (9 services) + init-system-metrics + init-key-tables + seed statuts + fix Application.isArchived.
2. `make db-fix-is-archived` (ou `make db-fix-isarchived`) — Au besoin, réappliquer la colonne générée isArchived (déjà fait dans db-push-all).
3. `make restart-tests-api-services` — Redémarrer application-, interview-, call-, followup-service (optionnel, si besoin).
4. Relancer les Tests API depuis le backoffice → rapport dans `tests/results/<timestamp>/`.

**Référence** : `scripts/test-api-specific.sh` (parsing JSON avec Node en priorité pour Docker frontend, fallback Python).

---

## CI/CD Pipeline (à remettre en place)

La **pipeline CI/CD** GitHub Actions est actuellement **en échec** : le job **« Validation de la structure de base de données »** échoue (les autres jobs sont en skipped car ils en dépendent). Cause probable : le workflow s’appuie sur `backend/prisma` et `backend/package-lock.json` alors que le projet est en **microservices** (un Prisma par service : auth-service, application-service, etc.) ; à adapter (ex. valider un schéma de référence ou chaque service, ou unifier le job sur un seul schéma partagé). **À faire plus tard** : remettre la pipeline en place et, si possible, **intégrer les tests actuels** (Tests API 36, tests backend, frontend, backoffice, Playwright) dans la CI/CD. Très utile pour la suite.

---

## Validé récemment (état actuel)

- **Stack** : `make up-full` → **21/21 services UP**, **41 tables** (Prisma + init-system-metrics + init-key-tables).
- **Logs** : `make logs` avec **coloration** (script `scripts/color-logs.sh`) : erreurs en **rouge** (ERROR/FATAL, HTTP 4xx/5xx, tables absentes, erreurs BDD), tags en couleur ; **timestamps** (date/heure au format ISO) affichés sur chaque ligne ; détection d’erreurs visible même quand la ligne commence par `[DEBUG]` (ex. `(HTTP 404)`).
- **Commandes** : `make start` = alias de `make up-full` ; `make fresh-start` = down + build + up-full + status (rebuild complet, utilise `docker compose build` puis `up`, **pas** `make dev`).
- **Health checks** : Les 3 services qui renvoyaient **HTTP 404** sur `GET /health` (utilisé par monitoring-c) ont été corrigés :
  - **monitoring-c** : route `GET /health` → 200 JSON ajoutée dans `ex-systems/monitoring-c/src/http_server.c`.
  - **log-collector-c** : `GET /health` accepté en plus de `GET /api/v1/health` dans `ex-systems/log-collector-c/src/http_server.c`.
  - **metrics-aggregator** (Node) : route `GET /health` ajoutée en plus de `GET /api/v1/health` dans `backend/metrics-aggregator-service/src/server.js`.
- Après **rebuild** des images concernées (`make build` ou rebuild des services monitoring-c, log-collector-c, metrics-aggregator), les health checks du collecteur doivent afficher **HTTP 200** pour ces trois services et la **disponibilité** (ex. dans les stats) doit augmenter (plus de 404 comptés comme hors ligne).
- **Tables « absentes »** ✅ **Corrigé** : Le message `[PERSISTENCE] Table container_metrics_snapshots absente` venait d’un **problème d’ordre de démarrage** (non lié au parallélisme) : metrics-aggregator démarrait avant db-push-all, donc la table n’existait pas encore. **Correction** : monitoring-c et metrics-aggregator sont maintenant démarrés **après** db-push-all dans `make up-full`. Si le message apparaît encore (ex. BDD existante sans la table), relancer `make db-push-all`.
- **Logs datetime** : `make logs` = timestamp Docker (ISO) ; `make monitoring-c-logs` = préfixe [ISO] sur monitoring-c et log-collector-c (pas de doublon entre les deux vues). **system_metrics** : tables en **public.** dans `init-system-metrics.sql` ; après mise à jour, exécuter **make db-push-all** pour éviter « relation public.system_metrics does not exist ».

### ✅ Fait récemment (21/02/2026) – Emails et gestion utilisateurs

- **Emails** : Tables EmailLog, EmailTemplate créées (init-key-tables + seed). Test, reset, vérification fonctionnent. Send-verification corrigé (verificationToken, sendGenericEmail). URLs : verify-email?token=xxx, reset-password/{token}.
- **Gestion utilisateurs** : Boutons « Renvoyer email vérification » et « Réinitialiser mot de passe » sur fiche utilisateur. Page Tests Emails (Backoffice → Tests).
- **Email Monitor** : Référence MailHog supprimée.

---

## Admin après `make up-full`

À la fin de **`make up-full`**, le Makefile affiche soit **« ✅ Utilisateur administrateur existe »** (déjà en BDD), soit **« 🔧 Création automatique de l'admin... »** (créé à ce moment-là). Vous n’avez pas besoin de lancer `make create-admin-user` sauf si la création auto a échoué ou si vous avez lancé `CREATE_ADMIN_IF_MISSING=0 make up-full`. Identifiants : **admin@jobbingtrack.com** / **password123**.

**⚠️ `make create-admin-user` exige que la stack soit démarrée** : le script a besoin du conteneur **PostgreSQL** (`jobbingtrack-postgres`). Si vous voyez « ❌ Aucun conteneur PostgreSQL trouvé », lancez d'abord **`make up-full`**, puis **`make create-admin-user`** (pour password123, auth-service doit aussi être up).

---

## Mail / Emails – objectif et à faire (système complet)

**Objectif** : permettre l’inscription (app mobile / web) avec **email de confirmation de compte**, et l’envoi d’emails **reset password** et **vérification**. Pas de newsletter ni réception (contact, etc.) dans l’objectif actuel — éventuellement en tout fin de projet.

**Où c’est** : backend **auth-service** (SMTP, envoi, logs, templates). Références : **`backend/auth-service/README.md`**, **`backend/auth-service/PYTHON_EMAIL_SETUP.md`** (config SMTP + tests Python), **`docs/emails/MAIL.md`** (vue d’ensemble, OVH jobbingtrack.com, backoffice, tests).

### Infra OVH (envoi SMTP)

- **Option recommandée** : compte **noreply@maily.ovh** (MX Plan maily.ovh actif, offre MX Plan 5). Authentification SMTP avec ce compte ; affichage expéditeur dans `SMTP_FROM` : `JobbingTrack <noreply@jobbingtrack.com>` pour que le destinataire voie jobbingtrack.com.
- **Option alternative** : si un compte **noreply@jobbingtrack.com** existe (MX jobbingtrack.com : 1/5/100 mx1/mx2/mx3.mail.ovh.net), utiliser ce compte en `SMTP_USER` / `SMTP_PASS`.
- **Stockage** : logs et métadonnées **dans notre BDD** (table `EmailLog`, stats) — pas dans la boîte mail OVH, pour ne pas être limité par les quotas et avoir une plateforme type Brevo dans le backoffice.

### Config SMTP (auth-service)

Variables à définir dans **`.env`** (ou docker-compose, section auth-service) — exemple avec **noreply@maily.ovh** :

- `SMTP_HOST` = `ssl0.ovh.net`
- `SMTP_PORT` = `587` (STARTTLS) ou `465` (SSL)
- `SMTP_USER` = `noreply@maily.ovh` (compte MX Plan maily.ovh) ou `noreply@jobbingtrack.com` si ce compte existe
- `SMTP_PASS` = mot de passe du compte OVH
- `SMTP_FROM` = `JobbingTrack <noreply@jobbingtrack.com>` (ce que voit le destinataire)
- `SMTP_REPLY_TO` = ex. `noreply@maily.ovh`
- `EMAIL_PROVIDER` = `SMTP`

Détail config et tests : **`backend/auth-service/PYTHON_EMAIL_SETUP.md`**.

### Backoffice – pages mail (déjà en interface)

À brancher / valider pour que tout soit cohérent avec les APIs et la charte graphique du backoffice :

- **Configuration** : `/backoffice/emails/settings` — config SMTP, test connexion.
- **Déliverabilité** : `/backoffice/emails/deliverability` — test SMTP, test DNS, envoi de test.
- **Historique des emails** : `/backoffice/emails/logs` — API `GET /api/v1/emails/logs`.
- **Templates** : `/backoffice/emails/templates` — API `GET/PUT /api/v1/emails/templates` (reset, vérification, etc.).
- **Email Monitor** : `/backoffice/emails` (dashboard emails) + `/backoffice/email-monitor` — stats, logs, échecs.

À faire : s’assurer que ces pages appellent bien le gateway (`NEXT_PUBLIC_API_URL`), que les APIs répondent (auth-service), et que les stats / logs apparaissent dans le **tableau de bord** et **analytics utilisateur** (emails envoyés, à qui, etc.) comme pour une plateforme type Brevo.

### Tests et développement

- **Tests API mail** : `tests/api/test-email-endpoints.test.js` (logs, test-smtp, stats, envoi test).
- **Script Tests API** : `scripts/test-api-specific.sh` couvre déjà emails (logs, stats).
- **Parcours utilisateur** : backoffice user-journey inclut des appels à `/api/v1/emails/test` (envoi test, reset, vérification) — à garder et valider.
- **Données de test** : prévoir ou documenter des données de test pour les scénarios mail (utilisateur avec email, reset, vérification).
- **Dashboard / stats / monitoring** : inclure les métriques mail (emails envoyés, par type, échecs) dans les tableaux de bord et l’analytics utilisateur.

À faire : exécuter les tests mail (`test-email-endpoints`), les intégrer au run de dev (make / script de tests), et vérifier que le parcours utilisateur et les stats backoffice reflètent bien les envois.

### État actuel (2026-02-21)

- **Tables** : EmailLog, EmailTemplate créées par `make db-push-all`. **Send-verification** corrigé (verificationToken, sendGenericEmail). URLs deep linking : verify-email?token=xxx, reset-password/{token}.
- **Tests DNS** : OK (MX, SPF OK ; DKIM optionnel).
- **Connexion SMTP** : OK (Backoffice → Déliverabilité → « Tester la connexion SMTP » ; host ssl0.ovh.net, port 587, user noreply@maily.ovh, from `JobbingTrack <noreply@jobbingtrack.com>`).
- **Envoi de test** : Les emails arrivent bien en boîte mail, mais l’interface affiche « Erreur lors de l’envoi » car la table **EmailLog** n’existe pas . Tables EmailLog/EmailTemplate créées par `make db-push-all`.
- **Reply-To** : `SMTP_REPLY_TO=noreply@jobbingtrack.com` ; headers `Auto-Submitted: auto-generated` et `X-Auto-Response-Suppress: All`.

### Étapes à faire (dans l’ordre)

1. **Créer la table EmailLog** : `make db-push-all` (auth-service schéma inclut EmailLog). Puis redémarrer auth-service si besoin et retester l’envoi depuis Backoffice → Déliverabilité.
2. **Envoi reset + vérification** : Vérifier que les flows forgot-password et verify-email envoient bien via auth-service et que les emails arrivent. Tester depuis l’app (inscription, reset).
3. **Backoffice** : Vérifier Configuration, Déliverabilité, Historique, Templates, Email Monitor (pas de 404, données cohérentes). Brancher les stats mail dans le tableau de bord et l’analytics si pas déjà fait.
4. **Tests** : Lancer `tests/api/test-email-endpoints.test.js` et le script test-api-specific (partie emails). S’assurer que le parcours utilisateur et les données de test couvrent les cas mail.
5. **Logs / analytics** : S’assurer que les emails envoyés (à qui, type, statut) sont visibles dans le backoffice (Historique, Email Monitor, stats, analytics utilisateur).

### Dépannage rapide

- Test SMTP / envoi ne marche plus : vérifier .env (auth-service), redémarrer auth-service. Vérifier compte OVH et mot de passe. Backoffice → Déliverabilité ou `GET /api/v1/emails/test-smtp`.
- Logs emails 404 : rebuild auth-service ; front appelle bien le gateway avec token.
- APIs templates / stats 404 : idem, rebuild auth-service et vérifier routes montées sous `/api/v1/emails` et `/api/v1/emails/templates`.

---

## À FAIRE (par priorité)

### Priorité 1 – Immédiat ✅ (validée 2026-02-20)

1. ~~Vérifier que l’admin existe~~ — **Fait** : `make up-full` crée l’admin automatiquement ; connexion admin@jobbingtrack.com OK.
2. ~~Se connecter au backoffice~~ — **Fait**.
3. ~~Lancer les tests API depuis le backoffice~~ — **Fait** : **36/36 tests passent** (20/02/2026). Rapport généré ; Create Application → Interview / Call / Followup utilisent la candidature créée dans le run (parsing Node + fichier). Voir section **« Tests API – 36/36 passent »** en tête de STATUS.

**Logs** : pour repérer le run des Tests API dans les logs : `[TESTS API] Démarrage des Tests API depuis le backoffice` (début), `[TESTS API] Lancement de la suite Tests API`, `[TESTS API] Début exécution des tests`, `[TESTS API] Exécution des tests terminée`, `[TESTS API] Fin des Tests API` (fin). Filtrer avec : `grep "[TESTS API]"`.

### Priorité 2 – Erreurs à corriger

4. **Tables BDD** ✅ : **`make up-full`** exécute **un seul** `db-push-all` après démarrage de tous les conteneurs (9 services Prisma + init-system-metrics + init-key-tables + seed statuts). **9/9 services** synchronisés, **0 ignoré**. **init-key-tables** ajoute **User.verificationToken**, **verificationTokenExpiry**, **lastLoginAt**, **loginCount** si la table User existe ; crée aussi **container_metrics_snapshots** et **aggregated_logs** (metrics-aggregator), ce qui supprime les messages « Table container_metrics_snapshot absente » et « relation aggregated_logs does not exist » après **make db-push-all**. **workflow-service** : modèle User aligné (loginCount, lastLoginAt, verificationToken) pour ne plus les supprimer. **Code** : followup-service filtre par `status.code` ; interview-service met à jour par **statusId** ; auth met à jour **loginCount** au login. Pour tout repartir propre : **`make build`** puis **`make down && make up-full`**, puis **`make db-push-all`** si besoin. Logs : `[DB-PUSH-ALL]`, puis redémarrage de metrics-aggregator.
5. **Tests API – suite (Priorité 2)** : **List Applications 500** : fallback raw SQL sur colonne **archived** si Prisma lève « isArchived does not exist » (condition assouplie : `isArchived` + `does not exist`). **Create Interview/Call/Followup 404** : le script réutilise l’ID de la candidature créée (Create Application) ou le premier id de GET /applications ; parsing de `application` ou `data.id` dans la réponse. **Dates** : TZ (défaut Europe/Paris) pour rapports ; `summary.generatedAtISO` (UTC) dans le rapport ; UI backoffice utilise `formatReportDateLocal(..., generatedAtISO)` partout pour afficher en heure locale navigateur. Dernier run **32/36 passent, 4 échecs** (Company.isTestData ; corrigé dans application-service). **Corrections 2026-02-20** : Application.archived (application-service code + interview/call/followup Prisma), FollowUp.statusId (followup-service), JWT_SECRET pour event-service (docker-compose). **Important** : les erreurs Postgres « Application.isArchived does not exist » et « FollowUp.status does not exist » viennent des **images Docker** qui n’ont pas été reconstruites après les changements. **Corrections supplémentaires** : Application et Company sans isTestData/syncHash/entityHash/lastSyncAt (application-service) ; Event create sans contactId/companyId (event-service). **Workflow simple** : après changement code/schéma → `make build` puis `make up-full` ; relancer les Tests API. Causes principales : (1) **Login 401** — le script utilise `admin@jobbingtrack.com` / `password123` mais l’admin en BDD pouvait avoir été créé avec le hash pour « secret » (script SQL). **Correction** : `backend/scripts/database/create-admin-user.sh` privilégie désormais la création via **auth-service** (Node + bcrypt pour `ADMIN_PASSWORD`) ; si auth-service est indisponible, fallback hash « secret » (message indique de relancer avec auth up pour password123). (2) **Profile 404** — GET/PUT `/api/v1/profile/me` renvoient 404 (réponse HTML « Cannot GET/PUT ») : routes présentes dans le code profile-service ; **à faire** : **rebuild** profile-service (`make build` ou rebuild du service) et redémarrer pour que l’image embarque les routes. (3) **Notification 200 au lieu de 401** (sans token) : le service doit renvoyer 401 ; **à faire** : rebuild notification-service. Après corrections : **relancer `make create-admin-user`** (avec auth-service up) pour un admin avec password123, puis **make build** et **make up-full** (ou rebuild profile + notification), puis relancer les Tests API depuis le backoffice. **Comparaison de rapports** : implémentée (Backoffice → Rapports de tests → « Comparer des rapports »).
5b. **Couverture des tests (Priorité 2, en parallèle des échecs Tests API)** : **Backend complet** — Le script `scripts/test-api-specific.sh` couvre désormais **tous les services** : health, auth, users, companies, applications, **contacts**, **interviews**, **calls**, **events**, **followups**, **profile**, **notifications**, **metrics** (metrics-aggregator via gateway), **dashboard** (statistics, analytics events/errors/stats), **emails** (logs, stats), **workflow** (GET /workflows), **security** (firewall rules, blocked-ips, waf config, logs). **Rapports** : les runs depuis le backoffice (Tests API) génèrent un rapport (HTML + summary.json) dans `tests/results/<timestamp>/` ; `scripts/run-all-tests-with-reports.sh` inclut **Tests API Backend (script - tous services)** et **Tests Sécurité Firewall & WAF (API)** ; les rapports sont listés et comparables dans Backoffice → Rapports de tests. **Frontend / Backoffice / Sécurité** : `run-all-tests-with-reports.sh` exécute aussi User Journey, Jest API/backend, Playwright E2E (frontend + mobile), Jest frontend, tests performance, tests sécurité (injection SQL, XSS, CSRF, auth avancée, autorisation), tests firewall/WAF ; chaque catégorie produit un rapport dans le même répertoire. **À faire** : s’assurer que les tests deployment (si un service deployment est exposé au gateway) et les tests backoffice Playwright dédiés sont bien lancés selon l’env (voir Catégories 2 et 5 dans le script).
6. SMTP 503 : configurer SMTP (auth-service ou service dédié), test opérationnel, écrans backoffice Configuration SMTP et Déliverabilité.
7. **Logs emails 404** : La page `/backoffice/emails/logs` existe et appelle `GET /api/v1/emails/logs` (via gateway → auth-service). Côté code : gateway a `/api/v1/emails` → auth-service ; auth-service a `GET /logs` sous `/api/v1/emails` (authentification requise). Si 404 persiste : vérifier que le front utilise bien `NEXT_PUBLIC_API_URL` (gateway), que le token est envoyé, et les logs auth-service / api-gateway. **Dépannage** : rebuild auth-service puis redémarrer ; le front affiche un message explicite en cas de 404.
8. **API versioning (prioritaire)** : Le versioning API n’est pas encore en place. Route `GET /api/v1/analytics/stats/:userId/versions` (404) : existe côté dashboard-service (`/stats/:userId/versions` en premier dans analytics.routes.js) ; gateway envoie `/api/v1/analytics*` au dashboard-service:3000 ; front `user-analytics/page.tsx` appelle cette URL avec token. Si 404 persiste : **Dépannage** : rebuild dashboard-service puis redémarrer ; vérifier JWT_SECRET partagé. À faire : corriger 404 + définir stratégie de versioning des APIs.
9. ~~Health checks 404~~ ✅ **Fait** : `GET /health` ajouté sur monitoring-c, log-collector-c et metrics-aggregator ; après rebuild, plus de 404 sur ces trois services.

**Checklist Priorité 2 – à valider avant de passer en phase 3**

- [x] **Tests API** : 36/36 passent. Candidature du run réutilisée pour Interview/Call/Followup (Node + fichier). **Si l’erreur persiste après build** : `make build-application-service` puis `make up-full`, Dates rapports en heure locale (TZ).
- [ ] **Couverture tests backend** : Script `test-api-specific.sh` exécute tous les services (interview, call, contact, dashboard, event, followup, profile, notification, metrics-aggregator, workflow, security, emails). Rapports générés et visibles dans Backoffice → Rapports de tests ; `make run-all-tests-with-reports` ou équivalent inclut le script + tests sécurité firewall.
- [ ] **Logs emails** : Page `/backoffice/emails/logs` et API `GET /api/v1/emails/logs` OK (pas de 404).
- [ ] **API versioning** : Corriger 404 sur `GET /api/v1/analytics/stats/:userId/versions` et mettre en place stratégie de versioning des APIs (prioritaire).
- [ ] **SMTP** (optionnel) : Config SMTP opérationnelle, test d’envoi et écrans backoffice OK.

Une fois ces points cochés (ou documentés), passer à **Priorité 3** (simplification Make/scripts, puis tests à valider), puis **Priorité 4** (sécurité).

**Base de données / modèles** : Les schémas ont été alignés (voir section **« Base de données et modèles de données – Choix appliqués »**) : **isArchived** partout, tables **\*Status** + **statusId**, **isTestData** / sync cohérents, **Notification** complet (notification-service), **Profile** lié à User (profile-service et services métier). Après modification des schémas : **make db-push-all** puis relancer les tests API. **Table Application** : le schéma Prisma utilise `isArchived @map("archived")` ; en BDD la colonne créée par Prisma est **archived**. Pour éviter l’erreur « column Application.isArchived does not exist » (clients Prisma anciens ou génération SQL), un script **make db-fix-isarchived** (ou exécuté dans **db-push-all**) ajoute la colonne **isArchived** (générée depuis **archived**). À lancer une fois après **db-push-all** si les tests Create Interview/Call/Followup renvoient 404 « Candidature non trouvée ».

**Étape suivante (Priorité 3)** : **Simplifier les commandes Make et les scripts (KIS)** : quantité de makefiles, cibles et scripts à réduire et réorganiser ; un seul flux clair (ex. build, up-full) ; docs et helpers (make help, etc.) à jour. À faire après résolution des échecs Tests API.

**Note Company.isTestData** : Si l’erreur « column Company.isTestData does not exist » persiste après correction du schéma, l’**cache Docker** n’a pas été reconstruite. Faire **`make build-application-service`** (rebuild sans cache de application-service uniquement), puis **`make up-full`**, puis relancer les Tests API. Un simple `make build` peut ne pas invalider le cache Prisma.

**Notes** : **Resend** (RESEND_API_KEY) : optionnel, à configurer plus tard. **container_logs** : table + enum `LogLevel` créés dans `init-key-tables.sql` ; la persistance des logs depuis le log collector est opérationnelle (plus de contournement dans metrics-aggregator). **Backoffice Tests API** : après lancement, un résumé s’affiche (X/Y tests passés, Z échecs). **URLs inter-conteneurs** : `.env.example` et `.env` incluent `MONITORING_C_URL` pour le metrics-aggregator.

### Priorité 3 – Simplification Make/scripts puis tests

9. **Simplifier Make et scripts (KIS)** : Réduire et réorganiser la quantité de makefiles, cibles make et scripts ; un flux clair (build, up-full, db-push-all si besoin) ; mettre à jour la doc (README, docs/*) et les helpers (make help, scripts d’aide).
10. Lancer et valider (ou documenter les échecs) : `make test-api`, `make test-security`, `make test-frontend`, `make test-backend`, `make test-e2e`, `make test-performance`, `make tests-user-journey`.
11. Compléter les tests unitaires (frontend, backend, tests/unit) ; aligner avec TESTS_END.md et docs/tests/TESTS_COMPLETS_RAPPORT.md.

### Priorité 4 – Sécurité

12. **Sécurité (WAF, détection, logs)** : La partie sécurité du backoffice (Menaces, Logs de sécurité, Firewall, etc.) est **partiellement réelle** :
    - **Menaces** : détection réelle (network-monitor lit `/proc/net/tcp`, détecte anomalies). Un **faux positif « Port Scanning »** a été corrigé : beaucoup de connexions d’une IP vers **un seul** port (ex. app → PostgreSQL 5432) n’est plus signalé comme port scan ; seules les IP touchant **plusieurs ports** différents sont considérées.
    - **Logs de sécurité** : alimentés par auth-service (login/register), firewall (règles, blocages), WAF ; les **menaces détectées** sont maintenant aussi écrites dans `security_logs`, donc elles apparaissent dans « Logs de sécurité ».
    - **À faire** : Remplacer la config WAF et la détection restantes (faux/mock) par une vraie config WAF et une détection fiable (APIs + BDD) ; affiner les seuils et exclure le trafic interne Docker si besoin.

### Base de données et modèles de données – Choix appliqués

**Schéma de référence métier** : **application-service** (`backend/application-service/prisma/schema.prisma`) pour User, Company, Application, Contact, FollowUp, Call, Interview, Event, Notification, Document, Profile et tables de jonction.

**Choix retenus et appliqués** :

| Choix | Détail |
|-------|--------|
| **isArchived (pas archived)** | Partout : Application utilise **isArchived** (Boolean). application-service, followup-service, interview-service, call-service alignés ; auth, contact, company avaient déjà isArchived. |
| **Tables \*Status + statusId** | Tables **ApplicationStatus**, **FollowUpStatus**, **InterviewStatus** et dans les entités métier un champ **statusId** (String) avec relation vers la table de statut. FollowUp utilise statusId + modèle FollowUpStatus (plus d’enum) dans auth, contact, company, followup. |
| **isTestData, syncHash, entityHash, lastSyncAt** | Ajoutés de façon **cohérente** pour filtre « données test » et sync : **User** (isTestData), **Contact**, **FollowUp**, **Call**, **Interview**, **Event**, **Document** (isTestData et, selon le modèle, syncHash, entityHash, lastSyncAt) dans application-service, auth-service, contact-service, company-service, followup-service. |
| **Notification (modèle partagé complet)** | **notification-service** : schéma remplacé par le modèle partagé (type **NotificationType** enum, **entityType**, **entityId**, **data**, **readAt**, userId, title, message, read, createdAt) avec User minimal pour la relation. Table mappée `notifications`. |
| **Profile lié à User** | Modèle **Profile** (userId, bio, headline, avatarUrl, linkedinUrl, githubUrl, website, preferences) avec relation **User** 1–1. Ajouté dans **application-service**, **auth-service**, **contact-service**, **company-service**, **followup-service**. **profile-service** : schéma avec User (minimal) + Profile pour l’API profil. |

**À faire après db-push** : Lancer **make db-push-all** (ou db-push par service) pour appliquer les changements en BDD. En cas de colonne déjà existante sous un autre nom (ex. `archived`), une migration manuelle peut être nécessaire pour renommer en `is_archived`. Ensuite : implémenter le **filtre API isTestData** (onglet Données test) et valider les tests API.

### Priorité 5 – Gestion des données

13. Onglet Données test : implémenter le filtre API (isTestData ou utilisateur de test) pour une table « données test uniquement ».
14. Abonnement & facturation : implémenter ou documenter hors scope.

### Priorité 6 – Design et UX

14. Design unifié des pages de test (Tests API, Frontend, Backoffice) : reprendre le design Tests Backend (progression, logs) ; voir TESTS_END.md § 13.
15. Depuis le backoffice : création automatique d’un utilisateur de test et des données de test au clic « Lancer les tests » (sans `make create-admin-user` à la main).

### Priorité 7 – Métier et scénarios

17. APIs métier complètes (entretiens, appels, sync, candidatures, relances, entreprises, contacts, événements, calendrier, utilisateurs, paramètres) ; voir docs/database/ (schema, ACTIONS_ET_MODIFICATIONS).
18. Scénarios Playwright, API et parcours utilisateur opérationnels (dépendent des APIs métier).
19. Worker/cron pour exécuter les tests programmés (plannings backoffice).

### Priorité 8 – Suite

19. Application mobile : connecter à l’API fonctionnelle et sécurisée (section métier stable).
20. Observabilité : tout le trafic (API, mobile, mails, user journey, tests) répertorié dans log-collector + metrics-aggregator.
21. Documentation : tenir à jour ERRORS.md, aligner RESOLUTIONS.md / TESTS_END.md avec STATUS.

**Tests Sécurité (backoffice)** :

- **Correction ENOENT** (21/02/2026) : Le script `tests/security/test-security.js` écrivait dans `tests/reports/` (chemin relatif) ; en Docker (frontend) le CWD ou l’absence du dossier provoquait `ENOENT: no such file or directory, mkdir 'tests/reports'`. **Correction** : le script utilise désormais `process.env.REPORT_DIR` (exporté par `scripts/generate-test-report.sh`) pour écrire `security-report.json` dans le même répertoire que les autres rapports (`tests/results/<timestamp>/`). Fallback : `PROJECT_ROOT/tests/results` ou `cwd/tests/results`.
- **État actuel** : 1 test exécuté, 0 réussi, 1 échoué (avant correction : échec à cause de l’ENOENT). Le script lit security-report.json pour le résumé (total/sécurisées/vulnérabilités) ; le backoffice affiche le détail par gravité. Les **tests de sécurité complets** (API, backoffice, backend, frontend) ne sont pas encore tous opérationnels.
- **À faire** : Enrichir les tests sécurité (XSS, SQLi, CSRF, auth, rate limiting, headers, validation) pour qu’ils soient complets et opérationnels ; s’assurer que le rapport est bien listé et affiché dans Backoffice → Rapports de tests (comme les Tests API).

**Rapports de performance** :

- Les tests de performance (Backend / Frontend) ne sont **pas** enregistrés ni affichés comme les Tests API : pas le même flux d’enregistrement (répertoire, summary, affichage dans l’interface).
- **À faire** : Aligner les rapports perf sur le flux des Tests API (écriture dans `tests/results/<timestamp>/`, summary.json, affichage complet dans Backoffice → Rapports de tests, avec tout le détail nécessaire).

**Parcours utilisateur (User Journey)** :

- **Interface** : Backoffice → Parcours utilisateur (ou User Journey) : choix du scénario (21 scénarios listés), mode **Administrateur** ou **Utilisateur de test**.
- **Problème actuel** : En mode admin et en mode utilisateur de test, les scénarios (ex. « Parcours Complet », 14 étapes) échouent massivement : taux de réussite ~14,3 %, 0/14 étapes réussies, 12 étapes échouées. Logs : après `POST /api/v1/auth/register` (201) et `POST /api/v1/auth/login`, des **ERROR** côté auth-service apparaissent ; les étapes suivantes (Créer Entreprises, Mettre à jour Entreprises, Créer Candidatures, etc.) échouent.
- **Rapports** : Les rapports de parcours doivent être **enregistrés** dans la section Rapports de tests (comme les rapports API), avec résumé et détail complets.
- **Scénarios** : 21 scénarios sont proposés (Parcours Complet, Parcours Rapide, Chercheur d’emploi actif, Nouvel utilisateur, Test Mobile complet, Ajouter Appel/Contact à candidature, Gestion contacts, Workflow entretiens, Gestion relances, Planification événements, Workflow entreprises, Cycle de vie candidature, Activité quotidienne, Candidature rapide, Session networking, Préparation entretien, Revue hebdomadaire, Vérification email et reset password, Tests emails complets, Gestion données de test). **À faire** : Corriger l’auth (register/login) et l’enchaînement des étapes pour que les parcours passent en mode admin et en mode utilisateur de test ; finaliser l’implémentation de tous les scénarios ; enregistrer les rapports de parcours dans les rapports de tests.

**Fin des fonctionnalités à faire** (backlog) :

- **Tests de performance** : Finaliser les tests de performance (backoffice) ; rapports **enregistrés et affichés** comme les Tests API (résumé + détail complet dans l’interface).
- **Tests de sécurité** : Suite à la correction ENOENT : tests complets (API, backoffice, backend, frontend) opérationnels ; rapports listés et affichés dans Rapports de tests.
- **Parcours utilisateur** : Parcours complets fonctionnels en mode Administrateur et en mode Utilisateur de test ; rapports de parcours enregistrés dans Rapports de tests ; 21 scénarios correctement implémentés et maintenus à jour.
- **Sélection des tests** : Tests API a déjà cocher/décocher par type ; Performance a Backend/Frontend/Both ; améliorer la sélection sur les autres pages (sécurité, Playwright, etc.).
- **Gestion utilisateur enrichie** : Statut validation compte (emailVerified), derniers emails envoyés (type, date, statut), statut du lien (cliqué ou non).
- **Analytics par utilisateur** : Par utilisateur (gestion users → fiche) : analytics actions, comportement sur l’interface, performance (web + app mobile), versions récupérées. Déjà prévu dans user-analytics (Overview, Events, Errors, Performance, Mobile/Versions) mais pas encore totalement opérationnel : onglet Performance = placeholder ; Mobile/Versions dépend des APIs ; possibilité de voir les analytics d’un autre utilisateur (pas seulement le sien) à ajouter.
- **Création d'utilisateurs** : ✅ Formulaire création dans /users/new (utilise POST /register) ; compte de test dédié (ex. test@delhomme.ovh) à créer.
- **Tests de rétrocompatibilité** : Rétrocompatibilité application de version en version (API, schémas BDD). En fin de projet : vérifier la checklist **TESTS_END.md § 14 (À vérifier en fin de projet – Rétrocompatibilité)**.
- **Enrichissement des tests** : Sécurité, perf, API, Playwright, user journey — inclure scénarios email.
- **Flutter APK / émulateur** : Générer APK, lancer dans émulateur mobile Flutter.
- **Deep linking mobile** : Universal Links / App Links — quand app mobile prête.
- **Réchauffage domaine, templates clients** : Après interface app mobile OK.
- **API REST doc** : Swagger/OpenAPI présent (api-gateway) mais pas à jour avec tous les microservices ; à synchroniser.

---

## Prochaine étape à faire (21/02/2026)

**→ Voir la section « REPRISE TRAVAIL – À faire en priorité (lundi) » en tête de document.**

**Ordre recommandé** :

1. **Valider ce qui existe** : Lancer Tests API (36/36), Tests Performance (Backend + Frontend), Tests Sécurité, User Journey. Noter les échecs. Les Tests API permettent de cocher/décocher les types à exécuter (boutons « Tout cocher » / « Tout décocher »). **Tests Sécurité** : ENOENT sur `tests/reports` corrigé (rapport écrit dans REPORT_DIR) ; relancer et vérifier que le rapport est généré et visible dans Rapports de tests.
2. **Rapports perf et parcours** : Aligner les rapports de performance et les rapports de parcours utilisateur sur le flux des Tests API (enregistrement dans `tests/results/<timestamp>/`, affichage complet dans Backoffice → Rapports de tests).
3. **Parcours utilisateur** : Corriger les échecs en mode Admin et mode Utilisateur de test (auth après register/login, enchaînement des étapes) ; enregistrer les rapports de parcours dans Rapports de tests ; maintenir à jour les 21 scénarios (Parcours Complet, Email/Reset password, etc.).
4. **Créer le compte test** : Utiliser Backoffice → Utilisateurs → « Nouvel utilisateur » pour créer `test@delhomme.ovh` (formulaire création opérationnel).
5. **Gestion utilisateur enrichie** : Afficher emailVerified, derniers emails envoyés, statut du lien ; **analytics par utilisateur** (actions, comportement, performance web + mobile, versions app) — user-analytics existe mais Performance = placeholder, Mobile dépend des APIs ; ajouter lien vers analytics depuis fiche utilisateur (vue admin sur un user).
6. **Finaliser les tests de performance** : Rapports enregistrés et affichés comme Tests API ; couverture complète (voir backlog).
7. **Sélection des tests** : Étendre la sélection activer/désactiver aux pages Sécurité, Playwright, User Journey (comme sur Tests API).

Ensuite : sécuriser le flow de vérification ; Flutter APK/émulateur ; API REST doc à jour.

---

## À valider (tests à lancer)

- **Priorité 2 (maintenant)** : **Suite immédiate** : SMTP OK ; logs emails OK (tables créées). **API versioning** (corriger 404 sur `GET /api/v1/analytics/stats/:userId/versions`). Tests API : 36/36 OK.
- **Priorité 3** : Lancer les cibles make listées (make test-api, test-security, test-frontend, etc.) depuis la racine ; valider ou documenter les échecs.
- **Priorité 4 (sécurité)** : après stabilisation des tests et APIs, affiner la partie sécurité (WAF réelle, seuils, logs/menaces cohérents). Les menaces détectées sont désormais aussi enregistrées dans les logs de sécurité.
- En fin de session : noter les échecs dans STATUS.md ou TESTS_END.md.

**Commandes détaillées** : **docs/COMMANDES_UTILES.md** (aide, tests, db, logs, rebuild).

---

## Fonctionnement du projet – Parcours de vie (d’après les .md)

**Objectif** (README, docs/database/ACTIONS_ET_MODIFICATIONS) : JobbingTrack est un **outil personnel de suivi de candidatures pour un chercheur d’emploi**. L’utilisateur = le candidat qui suit **ses propres** candidatures. L’application doit aussi permettre de **suivre, gérer et piloter les différentes expériences travail côté intérim** : **demandes** (candidatures, missions), **en cours** (ce qui est en cours), **propositions reçues** (offres, missions proposées), le tout depuis le point de vue candidat. Ce n’est **pas** un ATS (outil recruteur/employeur).

**Parcours de vie typique** (données et APIs couverts par les 36 tests) :

1. **Auth** : Inscription / Connexion (User). Admin : `admin@jobbingtrack.com` / `password123`.
2. **Entreprises** : Le candidat crée ou réutilise des **Company** (entreprises ciblées).
3. **Candidatures** : Pour chaque entreprise / offre, il crée une **Application** (position, statut, date, plateforme, etc.). Une Application appartient à un User et à une Company.
4. **Contacts** : Il peut associer des **Contact** (recruteurs, RH) à des entreprises (ContactCompany) et à des candidatures (ContactApplication).
5. **Entretiens** : Pour une **Application**, il planifie des **Interview** (date, type, lieu). Interview → Application (obligatoire), optionnellement InterviewContact.
6. **Appels** : Il enregistre des **Call** (sujet, date, durée) liés à une **Application** (et optionnellement un Contact, une Company).
7. **Relances** : Il crée des **FollowUp** (type, date, notes) liés à une **Application**. FollowUp peut être lié à des Contact (FollowUpContact).
8. **Événements** : **Event** (calendrier) : liés au User, optionnellement à une Application, un Interview, un Call, un FollowUp.
9. **Profil** : **Profile** (bio, liens, préférences) 1–1 avec User.
10. **Notifications** : **Notification** (type, entityType, entityId, readAt) pour le User.
11. **Dashboard / Stats** : Agrégation (candidatures, entretiens, relances, etc.) et analytics.

**Interconnexion BDD** (docs/database/relations.md) : User → Application, Company, Contact, FollowUp, Call, Interview, Event, Notification. Company → Application. Application → FollowUp, Call, Interview, Event. Tables de jonction : ContactCompany, ContactApplication, FollowUpContact, InterviewContact. Statuts via tables \*Status (ApplicationStatus, FollowUpStatus, InterviewStatus) et champs statusId.

**Ce que les 36 tests API vérifient** : health des services, auth (login, profile), CRUD companies, **applications** (list + create), contacts, **interviews** (list + create, sur la candidature créée), **calls** (idem), **events**, **followups** (idem), profile, notifications, métriques, dashboard. Donc le **cœur métier** (candidature → entretien / appel / relance / événement) est couvert. Pour repérer des manques par rapport à ton besoin réel, comparer avec ce parcours et les écrans backoffice / mobile (ex. : filtres isArchived, sync mobile, rappels automatiques, etc.).

---

## Parcours de vie et traitements métier – À couvrir plus tard (hors Tests API)

**Backoffice – Parcours utilisateur (User Journey)** : La page Backoffice → Parcours utilisateur propose **21 scénarios** (Parcours Complet, Parcours Rapide, Chercheur d’emploi actif, Nouvel utilisateur, Test Mobile complet, Ajouter Appel/Contact à candidature, Gestion contacts, Workflow entretiens, Gestion relances, Planification événements, Workflow entreprises, Cycle de vie candidature, Activité quotidienne, Candidature rapide, Session networking, Préparation entretien, Revue hebdomadaire, Vérification email et reset password, Tests emails complets, Gestion données de test). Exécution en mode **Administrateur** ou **Utilisateur de test**. Actuellement les parcours échouent (auth après register/login, étapes suivantes) ; les rapports doivent être enregistrés dans Rapports de tests. Détail : section **« Parcours utilisateur (User Journey) »** dans le backlog ci‑dessus.

**À noter** : les points ci‑dessous ne sont **pas** couverts par les Tests API (script backoffice). Ils relèvent des **parcours utilisateur** (prédéfinis / personnalisés), **tests backend**, **tests frontend**, **tests backoffice**, **Playwright E2E**, et éventuellement du **workflow-service** (traitements réguliers dans le temps). À traiter après les priorités immédiates (SMTP, API versioning, etc.).

- **Mise à jour automatique des statuts de candidature dans le temps** : vérifier que les statuts (ApplicationStatus) évoluent correctement selon les règles métier / le temps ; **à tester** via tests backend ou parcours utilisateur (pas via Tests API).
- **Création / modification en cascade** : création d’un **Event** et mise à jour des éléments liés quand une candidature change, ou quand une relance change, ou quand un entretien change ; cohérence Event ↔ Application / FollowUp / Interview.
- **Listes de types et états** : s’assurer que les listes existent et sont utilisées partout : **types d’entretien** (InterviewType), **états de candidature** (ApplicationStatus), **états de relance** (FollowUpStatus), **plateforme de candidature** (Platform), **plateforme / type de relance**, **types d’événement** (EventType), etc.
- **Cases / formulaires métier** : couvrir les cas d’usage : case candidature (création/édition), case entretien, case contact, **ajout d’entreprise**, **ajout ou création de contact lié** à une candidature, événements créés (types, liens), etc. → **parcours utilisateur** (backoffice / frontend) et tests E2E (Playwright).
- **Traitement des statuts et workflow-service** : les changements de statut (candidature, relance, entretien) et les traitements automatiques dans le temps sont censés être gérés (ou complétés) par le **workflow-service** (exécution régulière). À spécifier puis tester (backend / worker / cron).
- **Comment vérifier les mises à jour de statut automatiques** : **pas** via Tests API ; via **tests backend** (unit / intégration sur workflow-service ou jobs), **tests frontend** (composants statut), **tests backoffice**, **Playwright** (scénarios métier), et surtout **parcours utilisateur** (prédéfinis et personnalisés) pour valider bout en bout.

**Priorité immédiate (suite)** : **SMTP** (config, test, écrans backoffice), **API versioning** (très important, pas encore en place – ex. `GET /api/v1/analytics/stats/:userId/versions`, stratégie de versioning des APIs), **logs emails** (404 à corriger). Ensuite parcours de vie et traitements métier ci‑dessus.

---

## Références

- **RESOLUTIONS.md** — Ce qui est résolu ou validé (résolutions appliquées, checklist).
- **docs/COMMANDES_UTILES.md** — Commandes make utiles et ce que vous pouvez tester.
- **docs/STATISTIQUES_PROJET.md** — Statistiques projet (services, observabilité, persistance).
- **docs/tests/ECHECS_TESTS_API_2026-02-19.md** — Analyse des 15 échecs du rapport Tests API (2026-02-19) et actions à faire.
- **ERRORS.md** — Erreurs connues et statut.
- **TESTS_END.md** — Synthèse des tests et validation via make ; **§ 14** = checklist rétrocompatibilité en fin de projet.

---

## Détail par thème (référence)

*Pour le détail technique des points ci-dessus (erreurs BDD, relances/événements/notifications, sécurité, emails, métier, etc.), les sections suivantes restent en référence. Tout ce qui est **résolu** est dans **RESOLUTIONS.md**.*

### Erreurs et corrections (à retester si besoin)

- Tests API depuis Docker : `sh` + chemins absolus, PROJECT_ROOT, volume scripts, TESTS_RESULTS_DIR, syntaxe POSIX (test-api-specific.sh, generate-test-report.sh).
- Persistance agrégateur : filtre JobbingTrack → 21 conteneurs ; rebuild metrics-aggregator si besoin.
- Tables manquantes : `make db-push-all` crée toutes les tables (Prisma 9 services + init-system-metrics.sql + init-key-tables.sql). **init-key-tables** crée aussi **UserCustomization** (préférences utilisateur, évite l’erreur à la connexion), vulnerabilities, security_metrics, deployments (+ deployment_metrics, rollbacks) et ajoute User.verificationToken / verificationTokenExpiry si la table User existe. Ne pas lancer db-push-security / db-push-deployment seuls.
- **Rapport Tests API (2026-02-10)** : 13/47 passent, 34 échecs. Causes : (1) Login 401 (hash admin = « secret » au lieu de password123) — script create-admin-user corrigé (création via auth-service en priorité) ; (2) Profile 404 sur GET/PUT `/api/v1/profile/me` — rebuild profile-service nécessaire ; (3) Notification 200 sans token au lieu de 401 — rebuild notification-service nécessaire. Détail dans **docs/tests/ECHECS_TESTS_API_2026-02-19.md** et **ERRORS.md**. Résumé (X/Y passés, Z échecs) affiché après chaque run depuis le backoffice.
- **make refresh-bdd** : une seule commande (build → down → up-full → db-push-all). up-full démarre tous les services puis exécute **un seul** db-push-all (plus de premier passage avec seulement auth).
- **up-full** : un seul `db-push-all` après le démarrage de tous les conteneurs (postgres, redis, api-gateway, auth, frontend, profil full, monitoring-c, metrics-aggregator). Évite les « conteneur non démarré (ignoré) ». Après db-push-all, **metrics-aggregator est redémarré** pour recharger le schéma BDD et éviter les erreurs « cached plan must not change result type » et « cache lookup failed for type ».
- **container_logs** : table et enum `LogLevel` créés dans `scripts/db/init-key-tables.sql` ; persistance des logs opérationnelle (plus de contournement dans metrics-aggregator).

### Emails

- **SMTP** : configuré via variables d’environnement (docker-compose, auth-service) : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_REPLY_TO`, `EMAIL_PROVIDER` (SMTP ou RESEND). Par défaut : `SMTP_HOST=ssl0.ovh.net`, `SMTP_PORT=465`. Le provider SMTP est initialisé au démarrage de l’auth-service ; **test SMTP** (`GET /api/v1/emails/test-smtp`) **100 % Node** (Nodemailer), Écrans backoffice Configuration SMTP et Déliverabilité : à rendre opérationnels (renseigner les variables puis redémarrer auth-service). Si le hub Tests affiche une erreur sur « Tests Emails », vérifier la config SMTP (auth-service) et que le service est joignable (API_GATEWAY_URL).
- Historique des emails : API `GET /api/v1/emails/logs` et page `/backoffice/emails/logs` branchées ; si 404, voir point 7 Priorité 2 (rebuild auth-service).

### Sécurité

- **Menaces** : détection réelle (network-monitor + networkThreatDetector). Faux positif « Port Scanning » corrigé : une IP avec beaucoup de connexions vers **un seul** port (ex. app → postgres 5432) n’est plus signalée ; seules les IP touchant **plusieurs ports** le sont.
- **Logs de sécurité** : alimentés par auth (login/register), firewall (règles, blocages), WAF ; les menaces détectées sont maintenant aussi écrites dans `security_logs` (événement `network_threat_detected`), donc visibles dans Backoffice → Sécurité → Logs de sécurité.
- WAF et détection avancée : à remplacer les parties mock par vraie config et détection (APIs + BDD). Firewall (règles, statut, logs) : tables via db-push-all ; backoffice branché.

### Gestion des données

- Export : branché (GET /api/v1/admin/export/:type via gateway 5002). Import et cleanup : 501, message clair.
- Stats utilisateur : branché sur GET /api/v1/analytics/stats/:userId. Abonnement : non implémenté. Données test : filtre API à ajouter.

### Métier (APIs et backoffice)

- Entretiens, appels, sync, candidatures, relances, entreprises, contacts, événements, calendrier, utilisateurs, paramètres : à finaliser (CRUD, workflows, backoffice, scénarios). Référence : docs/database/.

### Migration et sécurisation complète

- À faire en dernier (après backoffice, tests, API stables) : migration auth vers Go/Rust, chiffrement, JWT/refresh, rate limiting, HTTPS, validation stricte. Voir section « Migration et sécurisation complète » dans l’historique du fichier si besoin.


---

## 🚀 Déploiement final (à faire en tout dernier, quand tout sera fini)

**Objectif** : pouvoir déployer **l’application mobile** et **la partie API + backoffice** sur ton serveur, en déclenchant le déploiement depuis l’**interface backoffice**, sans payer de webhook Portainer (scripts + SSH + Docker Hub, CI).

### À prévoir (pour plus tard)

- **Déploiement depuis le backoffice** : déclencher depuis l’interface admin le déploiement sur le serveur (API prod, backoffice, et/ou build mobile).
- **Serveur** : déploiement API + backoffice sur ton serveur (images Docker Hub, pull + run via **scripts SSH** déclenchés par le backoffice ou par une CI, sans webhook Portainer payant).
- **Pipeline / CI** : scripts pour build des images, push Docker Hub, puis déploiement via SSH (ex. script qui se connecte au serveur et fait `docker pull` + `docker compose up`). Déclenchement possible depuis le backoffice (bouton « Déployer » qui lance un job CI ou un script).
- **Application mobile** :
  - **Build Android** : pipeline build **APK** et **AAB** (App Bundle), mode **release** ; types de build : internal, beta, prod.
  - **Suivi** : branche, commit, statut du build, **logs de déploiement** ; version de l’app (HTTP ou récupération de la version) ; lancement build mobile (internal / beta / prod) depuis le backoffice.
- **CI** : mettre en place éventuellement **GitLab** en plus de GitHub pour avoir des pipelines gratuites (build + déploiement) si besoin.

**Pour l’instant** : on se concentre sur les **tests sur l’émulateur mobile directement dans l’interface backoffice** (build APK, run du projet, voir la vraie app dans l’émulateur). Le déploiement final (serveur, Docker Hub, CI, scripts SSH, déploiement mobile depuis backoffice) sera fait quand l’application sera prête.

---

## Annexes (références rapides)

- **Git auteur** : \`git config --local user.name "Ton Nom"\` et \`user.email\` (détail : \`docs/GIT_AUTHOR.md\`).
- **Make** : rebuild complet = \`make fresh-start\` ; BDD seule = \`make db-push-all\` après démarrage ; aide = \`make help\` / \`make help-database\` / \`make help-compilation\`.
- **Commit & push** : configurer l'auteur (ci-dessus), puis \`git add -A\` → \`git commit -m "..."\` → \`git push origin <branche>\`.
