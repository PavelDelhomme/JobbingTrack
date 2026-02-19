# Échecs Tests API – Rapport 2026-02-19

**Rapport** : 36 tests, 21 réussis, 15 échoués (58 % opérationnel).  
**Runs** : lancés depuis le backoffice (Tests > Tests API). Les rapports sont enregistrés dans `tests/results/<timestamp>/` (ex. `20260219-191835`) ou en Docker dans `TESTS_RESULTS_DIR` (ex. `/tmp/tests/results`).

---

## Résumé des 15 échecs

| # | Test | Statut obtenu | Attendu | Cause / action |
|---|------|----------------|---------|----------------|
| 12 | Profile Service (sans token) | 404 | 401 | profile-service n’expose pas `GET /api/v1/profile/me` ; seulement `/api/v1/profile-service`. Gateway proxy → 404. **À faire** : ajouter GET/PUT `/api/v1/profile/me` dans profile-service ou adapter le proxy. |
| 13 | Notification Service (sans token) | 200 | 401 | Le service renvoie des données démo sans exiger d’auth. **À faire** : exiger un token pour les routes protégées (401 sans token). |
| 17 | Get User Profile | 404 | 200 | « Utilisateur non trouvé » — le test utilise peut‑être un id ou email qui n’existe pas (ex. profil après login). **À faire** : utiliser l’id du user connecté (admin). |
| 19 | Create Company | 400 | 201 | « Référence invalide » — probablement `userId` invalide. Les logs Postgres indiquent `userId=dev_user_1` absent. **À faire** : script de test doit utiliser le `userId` de l’admin connecté, pas `dev_user_1`. |
| 21 | Create Application | 500 | 201 | Enchaînement : Create Company échoue → pas d’entreprise → erreur 500. **À faire** : corriger Create Company (userId) puis revérifier. |
| 23 | Create Contact | 500 | 201 | `prisma.contact.create()` invalide ; logs : `userId=dev_user_1` absent. **À faire** : utiliser userId réel (admin) dans les scripts de test. |
| 25 | Create Interview | 500 | 201 | `prisma.application.findFirst()` — schéma ou relation (ex. `Application.status` vs `statusId`). Logs : `column Application.status does not exist` (hint: statusId). **À faire** : aligner Prisma (application, interview) avec la BDD (statusId) ou ajouter colonne. |
| 27 | Create Call | 400 | 201 | Validation : « ID candidature invalide », « Sujet requis ». **À faire** : envoyer dans le test un `applicationId` valide et `subject`. |
| 28–29 | List/Create Events | 403 | 200/201 | « Token invalide ou expiré » — le token n’est peut‑être pas envoyé ou est expiré pour ces appels. **À faire** : s’assurer que le token login est bien passé aux requêtes Events. |
| 30 | List Followups | 500 | 200 | `prisma.followUp.findMany()` — schéma/relation (ex. colonne manquante). **À faire** : `make db-push-all` + aligner schéma followup avec la BDD. |
| 31 | Create Followup | 400 | 201 | « Date de relance requise » — champ `followUpDate` manquant dans le body. **À faire** : ajouter `followUpDate` dans la requête du test. |
| 32–33 | Get/Update Profile | 404 | 200 | `Cannot GET/PUT /api/v1/profile/me` — même cause que #12 : profile-service n’a pas ces routes. **À faire** : implémenter GET/PUT `/api/v1/profile/me` dans profile-service. |
| 36 | Get Dashboard Statistics | 500 | 200 | `Cannot read properties of undefined (reading 'count')` — dashboard-service : une propriété (ex. agrégat) est undefined. **À faire** : corriger le code dashboard (vérifier l’objet avant .count). |

---

## Causes racines (regroupées)

1. **profile-service** : pas de routes `/api/v1/profile/me` (GET/PUT) → 404. Le gateway proxie `/api/v1/profile` vers profile-service qui n’expose que `/api/v1/profile-service`.
2. **notification-service** : renvoie 200 avec données démo sans auth → à sécuriser (401 sans token).
3. **Script de test** : utilise `userId=dev_user_1` pour Company/Contact/Application alors que cet utilisateur n’existe pas en BDD. Il faut utiliser l’id de l’utilisateur connecté (admin).
4. **Schéma BDD / Prisma** : `User.verificationToken` absent ; `Application.status` / `Interview.status` absents (Prisma attend peut‑être `statusId`). À aligner avec `make db-push-all` et les schémas Prisma des services.
5. **Tables manquantes** (visibles dans les logs make up-full) : `deployments`, `container_logs`, `system_metrics_snapshots`, `container_metrics_snapshots`, `service_availability_history` → **`make db-push-all`** après démarrage des services pour tout créer.
6. **Token Events** : 403 sur Events → vérifier que le token est bien envoyé et valide pour les appels List/Create Events.
7. **dashboard-service** : accès à une propriété undefined (ex. `.count`) → corriger le code qui construit la réponse statistics.

---

## À faire en priorité (ordre suggéré)

1. Lancer **`make db-push-all`** (Postgres + conteneurs démarrés) pour créer les tables manquantes et réduire les erreurs 500 liées aux tables.
2. **profile-service** : ajouter les routes GET et PUT `/api/v1/profile/me` (ou documenter le proxy gateway si une autre URL est utilisée).
3. **Script de test** : remplacer `dev_user_1` par le `userId` de l’utilisateur connecté (admin) pour Company, Contact, Application.
4. Aligner les schémas Prisma (auth, application, interview, followup) avec la BDD (verificationToken, status vs statusId) puis relancer `make db-push-all` si besoin.
5. **notification-service** : renvoyer 401 pour les routes protégées sans token.
6. **dashboard-service** : corriger l’erreur « reading 'count' » (vérifier l’objet avant accès).
7. **Tests Create Call / Create Followup** : envoyer les champs requis (applicationId, subject ; followUpDate).

Voir **STATUS.md** (Priorité 2 et section Tests API) et **ERRORS.md** pour le suivi.
