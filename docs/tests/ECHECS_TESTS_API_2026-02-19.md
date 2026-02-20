# Échecs Tests API – Rapport 2026-02-19

**Dernière mise à jour** : 20 février 2026.

**Résolutions appliquées** : voir **RESOLUTIONS.md**. Corrections : profile-service GET/PUT `/api/v1/profile/me`, notification 401, dashboard statistics, script (auth/profile, applicationId/subject/followUpDate), schémas Prisma alignés BDD (User.verificationToken/loginCount ; Application/Interview.statusId sur tous les services). **Seed statuts** : exécuté dans **`make db-push-all`** (ApplicationStatus, InterviewStatus, FollowUpStatus). **up-full** : un seul db-push-all après démarrage de tous les conteneurs (9/9 services synchronisés), puis redémarrage de metrics-aggregator.

**Rapport initial** : 36 tests, 21 réussis, 15 échoués (58 %).  
**Prochaine étape** : après **`make down && make up-full`** (BDD fraîche, admin créé, 9/9 Prisma push), **relancer les Tests API depuis le backoffice** (Tests > Tests API > Lancer) et noter le nouveau résultat (X/36 passés). Le login doit renvoyer le vrai `userId`, donc Create Company / Application / Contact devraient pouvoir passer. Mettre à jour ce document avec le nouveau rapport si besoin.  
**Runs** : backoffice (Tests > Tests API). Résumé (X/Y passés, Z échecs) après chaque run. Rapports : `tests/results/<timestamp>/` ou en Docker `TESTS_RESULTS_DIR`.

---

## État des résolutions (appliquées)

- **#12, #13, #32–33** : profile-service GET/PUT `/api/v1/profile/me` ajoutés ; notification-service 401 sans token.
- **#17** : script utilise GET `/api/v1/auth/profile` pour le profil connecté.
- **#25, #30** : schémas Prisma interview-service, call-service, followup-service alignés sur la BDD (`Application.statusId`, `Interview.statusId`, modèles ApplicationStatus/InterviewStatus) ; contrôleur interview utilise `statusId`.
- **#27, #31** : script envoie `applicationId`, `subject`, `callDate` pour Create Call ; `followUpDate`, `applicationId` pour Create Followup.
- **#36** : dashboard stats/statistics utilisent `getAggregatedStatistics` (agrégation HTTP).
- **User (auth)** : colonnes `verificationToken`, `verificationTokenExpiry`, `loginCount` ajoutées aux schémas partagés (application-service, backend/prisma) pour que le login trouve l’admin en BDD après **`make db-push-all`** (et renvoie le vrai userId au lieu de dev_user_1 → #19, #21, #23).

**À valider** : après **`make down && make up-full`** (un seul db-push-all, 9/9 services, admin créé), relancer les Tests API depuis le backoffice. Create Company, Create Application, Create Contact devraient passer si le login renvoie le vrai userId. À vérifier : Events 403 (token bien transmis), et tout autre échec restant dans le nouveau rapport.

---

## Après modification des schémas Prisma : reconstruire les images

Les conteneurs utilisent le **code et le schéma Prisma présents dans l’image**. Si tu as modifié des fichiers (par ex. `backend/*/prisma/schema.prisma` ou `backend/*/src/**`) **sans reconstruire**, les conteneurs tournent encore avec l’ancien code. Du coup :

- **`make db-push-all`** exécuté avec les **anciens** conteneurs pousse l’ancien schéma (ou un autre service écrase des colonnes).
- Les erreurs **User.verificationToken does not exist**, **Application.status / Interview.status does not exist**, **userId=dev_user_1** peuvent rester.

**Ordre recommandé :**

1. **Reconstruire les images** (pour embarquer les nouveaux schémas et le nouveau code) :
   ```bash
   make build
   ```
2. **Redémarrer la stack** pour utiliser les nouvelles images :
   ```bash
   make down && make up-full
   ```
   (ou au minimum redémarrer les services concernés : auth, application, company, contact, interview, call, followup, event, workflow.)
3. **Ensuite** lancer **`make db-push-all`** : les conteneurs à jour pousseront le bon schéma (User.verificationToken, Application.statusId, Interview.statusId, etc.).
4. **Optionnel** : le script **`scripts/db/seed-status-tables.sql`** est exécuté automatiquement à la fin de la partie 1 de **db-push-all** (avant init-system-metrics). Il insère les statuts prédéfinis (ApplicationStatus, InterviewStatus, FollowUpStatus). Si les tables n’existent pas encore, le seed est ignoré ; refaire l’ordre ci-dessus.
5. Relancer les **Tests API** depuis le backoffice et vérifier les logs (marqueurs `[TESTS API] Démarrage` / `[TESTS API] Fin`).

---

## Où ont été ajoutées les routes (vérification)

| Correction | Fichier | Détail |
|------------|---------|--------|
| GET/PUT `/api/v1/profile/me` | `backend/profile-service/src/server.js` | Lignes ~25–62 : middleware `requireAuth`, puis `app.get('/api/v1/profile/me', requireAuth, ...)` et `app.put('/api/v1/profile/me', requireAuth, ...)`. |
| 401 sans token sur notifications | `backend/notification-service/src/server.js` | Lignes ~24–50 : `requireAuth` puis `app.get('/api/v1/notifications', requireAuth, ...)` et `app.post('/api/v1/notifications', requireAuth, ...)`. |
| Dashboard statistics (agrégation HTTP) | `backend/dashboard-service/src/routes/dashboard.routes.js` | Routes `/stats` et `/statistics` utilisent `statistics.controller.getAggregatedStatistics` au lieu de `dashboard.controller.getStats`. |

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

1. ~~Lancer **`make db-push-all`**~~ — **Fait** : `make up-full` exécute un seul db-push-all après démarrage de tous les conteneurs (9/9 services, seed statuts, init-key-tables).
2. ~~**profile-service** : routes GET/PUT `/api/v1/profile/me`~~ — **Fait**.
3. ~~**Script de test** : utiliser le `userId` de l’admin connecté~~ — **Fait** (script utilise le token/login ; avec BDD à jour le login renvoie le vrai userId).
4. ~~Aligner schémas Prisma (verificationToken, statusId)~~ — **Fait** (tous les services : auth, company, contact, event, application, interview, call, followup, workflow).
5. ~~**notification-service** : 401 sans token~~ — **Fait**.
6. ~~**dashboard-service** : erreur « reading 'count' »~~ — **Fait** (getAggregatedStatistics).
7. ~~**Create Call / Create Followup** : champs requis~~ — **Fait** (applicationId, subject ; followUpDate).

**Maintenant** : **Relancer les Tests API depuis le backoffice** et noter le nouveau résultat (X/36). Corriger les échecs restants un par un. Voir **STATUS.md** (Priorité 2) et **RESOLUTIONS.md**.
