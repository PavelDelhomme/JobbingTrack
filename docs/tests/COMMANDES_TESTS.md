# Commandes de test – Ce qui se passe

Ce document décrit **tout ce qui se passe** quand tu lances les commandes de test (surtout `make test` / `make test-all`).

---

## Commandes principales

| Commande | Effet |
|----------|--------|
| **make test** | Alias de `make test-all` (même chose). |
| **make test-all** | Lance la suite complète de tests (script `run-all-tests-with-reports.sh`). |
| **make test-suite-full** | Enchaîne : test-frontend → test-database → status → test-all. |

---

## Quand tu lances `make test` ou `make test-all`

### 1. Côté Makefile (avant le script)

- **Si l’aide est activée** (première fois, ou pas `make disable-help`) :
  - Affichage du bandeau « PREMIÈRE UTILISATION ? LISEZ L'AIDE D'ABORD ! » avec les liens `make help`, `make tests-help`, `make help-test-all`, `make disable-help`, etc.
  - Puis **« Démarrage dans 3 secondes... »** et `sleep 3`.
- **Si tu as fait `make disable-help`** ou que **TEST_NOPROMPT=1** est exporté (c’est le cas pour `make test` / `make test-all` depuis le Makefile) : **aucun message d’aide, pas d’attente 3 s**.
- Ensuite :
  - Affichage du titre « TEST COMPLET - Tous les tests JobbingTrack ».
  - Liste des types de tests (Backend/BDD, Frontend, Performance, Intégration).
  - « Durée estimée : 10-20 minutes ».
  - **Lancement automatique (pas d’attente Entrée)** : pas de `read`, les tests partent tout de suite.
  - Puis exécution de : **`bash scripts/run-all-tests-with-reports.sh`**.

### 2. Côté script `run-all-tests-with-reports.sh`

Le script :

1. **Initialisation**
   - `set +e` (ne pas quitter à la première erreur).
   - Trap **Ctrl+C** / SIGTERM : affiche « Interruption (Ctrl+C) – arrêt de la suite de tests » et quitte avec le code 130.
   - **Seed auth** : si le conteneur `jobbingtrack-auth-service` tourne, exécution de `npx prisma db seed` pour mettre à jour admin et testuser avec **emailVerified: true** (évite les 401 "email not verified").
   - Crée un répertoire de résultats : **`tests/results/YYYYMMDD-HHMMSS`**.
   - À chaque étape et à la fin, le script revient au répertoire **racine du projet** pour ne pas laisser le shell dans `tests/`.

2. **Catégorie 1 – Backend / BDD**
   - **User Journey (API)** : `scripts/verify-user-journey.sh`.
   - **Relations BDD** : si `auth-service` tourne, exécution de `scripts/test-relations.js` dans le conteneur auth.
   - **Enums** : si `auth-service` tourne, exécution de `scripts/test-enums.js` dans le conteneur auth.
   - **Email Logs** : si la table `EmailLog` existe, requête SQL (derniers logs) dans Postgres.
   - **Tests API Complets (Jest)** : Jest dans le conteneur frontend (ou en local) sur `tests/api/`.
   - **Tests Backend Services (Jest)** : Jest sur `tests/backend/`.
   - **Tests API Backend (script)** : `scripts/test-api-specific.sh` avec `API_URL` / `API_GATEWAY_URL` (environ **62 appels** : health, auth, companies, applications, contacts, etc. – 1 test = 1 endpoint).

3. **Catégorie 2 – Frontend (E2E)**
   - **Vérification Playwright** : `npx playwright install` (timeout 3 min) pour installer les navigateurs si besoin (Docker ou local).
   - **Playwright E2E Frontend** : `npx playwright test tests/e2e` (timeout 5 min, conteneur ou local).
   - **Playwright Emails MailHog** : `npx playwright test` sur `admin-emails-mailhog.spec.ts` (timeout 2 min).
   - **Playwright Mobile** : `npx playwright test tests/e2e/mobile` (timeout 5 min).
   - **Tests Frontend Jest (Unitaires)** : `cd frontend && npm test -- --passWithNoTests`.

4. **Catégorie 3 – Performance & Sécurité**
   - **Tests Performance** : `node tests/performance/test-performance.js`.
   - **Tests Sécurité** : `node tests/security/test-security.js`.

5. **Catégorie 4 – Intégration**
   - **Tests Intégration Système** : `node tests/integration/test-full-system.js`.

6. **Fin**
   - Pour chaque test : sortie affichée en direct (via `tee`), puis **✅ SUCCÈS** ou **❌ ÉCHEC** et durée.
   - Résultats enregistrés dans des fichiers JSON dans `tests/results/YYYYMMDD-HHMMSS/`.
   - Le script revient à la **racine du projet** et affiche le répertoire de travail.
   - À la fin du script, retour au Makefile qui affiche « TOUS LES TESTS TERMINÉS ! » et « Consultez les rapports dans tests/results/ ».

**Important** : lancer **make test** depuis la **racine du projet** pour que le répertoire de travail reste cohérent. Voir [STRUCTURE_TESTS_MAKE_TEST.md](STRUCTURE_TESTS_MAKE_TEST.md) pour les détails (seed auth, 62 vs 270 tests, etc.).

---

## Pour ne plus voir le message d’aide ni les 3 secondes

- **Automatique** : pour **make test** et **make test-all**, le Makefile exporte **TEST_NOPROMPT=1**, donc normalement **plus de bandeau d’aide ni d’attente 3 s**.
- **Désactiver définitivement** pour toutes les commandes qui utilisent `check_help_read` :  
  **`make disable-help`**  
  (réactiver avec **`make enable-help`**).

---

## Récap ordre d’exécution (résumé)

1. Make : aide éventuelle + 3 s (sauf si TEST_NOPROMPT ou disable-help).
2. Make : titre, liste des tests, « Lancement automatique », puis appel du script.
3. Script : création du dossier de résultats, trap Ctrl+C.
4. Script : **Catégorie 1** (User Journey, Relations, Enums, Email Logs, API Jest, Backend Jest, script API tous services).
5. Script : **Catégorie 2** (install Playwright si besoin, Playwright E2E, MailHog, Playwright Mobile, Jest frontend).
6. Script : **Catégorie 3** (Performance, Sécurité).
7. Script : **Catégorie 4** (Intégration).
8. Script : fin, rapports dans `tests/results/...`.
9. Make : message « TOUS LES TESTS TERMINÉS ! ».

---

## Fichiers utiles

- **Script complet** : `scripts/run-all-tests-with-reports.sh`
- **Cible test-all** : `makefiles/tests/Makefile` (cible `test-all`, alias `test`)
- **Aide / 3 secondes** : `makefiles/shared/common.mk` (macro `check_help_read`)
