# État du projet JobbingTrack

**Dernière mise à jour** : 20 février 2026

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

---

## Admin après `make up-full`

À la fin de **`make up-full`**, le Makefile affiche soit **« ✅ Utilisateur administrateur existe »** (déjà en BDD), soit **« 🔧 Création automatique de l'admin... »** (créé à ce moment-là). Vous n’avez pas besoin de lancer `make create-admin-user` sauf si la création auto a échoué ou si vous avez lancé `CREATE_ADMIN_IF_MISSING=0 make up-full`. Identifiants : **admin@jobbingtrack.com** / **password123**.

---

## À FAIRE (par priorité)

### Priorité 1 – Immédiat ✅ (validée 2026-02-19)

1. ~~Vérifier que l’admin existe~~ — **Fait** : `make up-full` crée l’admin automatiquement ; connexion admin@jobbingtrack.com OK.
2. ~~Se connecter au backoffice~~ — **Fait**.
3. ~~Lancer les tests API depuis le backoffice~~ — **Fait** : rapport généré (21/36 passent, 15 échecs). Voir **docs/tests/ECHECS_TESTS_API_2026-02-19.md** pour le détail des échecs et les actions à faire.

**Logs** : pour repérer le run des Tests API dans les logs : `[TESTS API] Démarrage des Tests API depuis le backoffice` (début), `[TESTS API] Lancement de la suite Tests API`, `[TESTS API] Début exécution des tests`, `[TESTS API] Exécution des tests terminée`, `[TESTS API] Fin des Tests API` (fin). Filtrer avec : `grep "[TESTS API]"`.

### Priorité 2 – Erreurs à corriger

4. **Tables BDD** ✅ : **`make up-full`** exécute **un seul** `db-push-all` après démarrage de tous les conteneurs (9 services Prisma + init-system-metrics + init-key-tables + seed statuts). **9/9 services** synchronisés, **0 ignoré**. **init-key-tables** crée aussi **vulnerabilities**, **security_metrics**, **deployments** (et deployment_metrics, rollbacks), et ajoute les colonnes **User.verificationToken** / **verificationTokenExpiry** si la table User existe. Pour que les colonnes Application/Interview (statusId) et le client Prisma soient à jour : **`make build`** puis **`make down && make up-full`**, puis **`make db-push-all`** si besoin. Logs : `[DB-PUSH-ALL]`, puis redémarrage de metrics-aggregator.
5. **Tests API – suite** : Avec la BDD à jour (verificationToken, statusId, admin créé), **prochaine étape** : **relancer les Tests API depuis le backoffice** (Backoffice → Tests → Tests API → Lancer). Vérifier le nouveau rapport (X/36 passés) : le login doit renvoyer le vrai `userId`, donc Create Company / Application / Contact peuvent passer. Si des échecs restent, les traiter un par un (voir **docs/tests/ECHECS_TESTS_API_2026-02-19.md**). **Comparaison de rapports** : implémentée (Backoffice → Rapports de tests → « Comparer des rapports », sélectionner 2+ rapports de même catégorie).
6. SMTP 503 : configurer SMTP (auth-service ou service dédié), test opérationnel, écrans backoffice Configuration SMTP et Déliverabilité.
7. Logs emails 404 : brancher page Historique des emails (`/backoffice/emails/logs`) et API `GET /api/v1/emails/logs`.
8. API versions 404 : exposer `GET /api/v1/analytics/stats/:userId/versions` via le gateway et corriger le front.
9. ~~Health checks 404~~ ✅ **Fait** : `GET /health` ajouté sur monitoring-c, log-collector-c et metrics-aggregator ; après rebuild, plus de 404 sur ces trois services.

**Notes** : **Resend** (RESEND_API_KEY) : optionnel, à configurer plus tard. **container_logs** : table + enum `LogLevel` créés dans `init-key-tables.sql` ; la persistance des logs depuis le log collector est opérationnelle (plus de contournement dans metrics-aggregator). **Backoffice Tests API** : après lancement, un résumé s’affiche (X/Y tests passés, Z échecs). **URLs inter-conteneurs** : `.env.example` et `.env` incluent `MONITORING_C_URL` pour le metrics-aggregator.

### Priorité 3 – Tests à valider

9. Lancer et valider (ou documenter les échecs) : `make test-api`, `make test-security`, `make test-frontend`, `make test-backend`, `make test-e2e`, `make test-performance`, `make tests-user-journey`.
10. Compléter les tests unitaires (frontend, backend, tests/unit) ; aligner avec TESTS_END.md et docs/tests/TESTS_COMPLETS_RAPPORT.md.

### Priorité 4 – Sécurité

11. Remplacer la config WAF et la détection actuelles (faux/mock) par une vraie config WAF et une vraie détection (APIs + BDD).

### Priorité 5 – Gestion des données

12. Onglet Données test : implémenter le filtre API (isTestData ou utilisateur de test) pour une table « données test uniquement ».
13. Abonnement & facturation : implémenter ou documenter hors scope.

### Priorité 6 – Design et UX

14. Design unifié des pages de test (Tests API, Frontend, Backoffice) : reprendre le design Tests Backend (progression, logs) ; voir TESTS_END.md § 13.
15. Depuis le backoffice : création automatique d’un utilisateur de test et des données de test au clic « Lancer les tests » (sans `make create-admin-user` à la main).

### Priorité 7 – Métier et scénarios

16. APIs métier complètes (entretiens, appels, sync, candidatures, relances, entreprises, contacts, événements, calendrier, utilisateurs, paramètres) ; voir docs/database/ (schema, ACTIONS_ET_MODIFICATIONS).
17. Scénarios Playwright, API et parcours utilisateur opérationnels (dépendent des APIs métier).
18. Worker/cron pour exécuter les tests programmés (plannings backoffice).

### Priorité 8 – Suite

19. Application mobile : connecter à l’API fonctionnelle et sécurisée (section métier stable).
20. Observabilité : tout le trafic (API, mobile, mails, user journey, tests) répertorié dans log-collector + metrics-aggregator.
21. Documentation : tenir à jour ERRORS.md, aligner RESOLUTIONS.md / TESTS_END.md avec STATUS.

---

## À valider (tests à lancer)

- **Priorité 2 (maintenant)** : **Relancer les Tests API depuis le backoffice** (http://localhost:5003 → Tests → Tests API → Lancer). Consulter le rapport généré et noter X/36 passés ; corriger les échecs restants (voir docs/tests/ECHECS_TESTS_API_2026-02-19.md).
- **Priorité 3** : Lancer les cibles make listées (make test-api, test-security, test-frontend, etc.) depuis la racine.
- En fin de session : noter les échecs dans STATUS.md ou TESTS_END.md.

**Commandes détaillées** : **docs/COMMANDES_UTILES.md** (aide, tests, db, logs, rebuild).

---

## Références

- **RESOLUTIONS.md** — Ce qui est résolu ou validé (résolutions appliquées, checklist).
- **docs/COMMANDES_UTILES.md** — Commandes make utiles et ce que vous pouvez tester.
- **docs/STATISTIQUES_PROJET.md** — Statistiques projet (services, observabilité, persistance).
- **docs/tests/ECHECS_TESTS_API_2026-02-19.md** — Analyse des 15 échecs du rapport Tests API (2026-02-19) et actions à faire.
- **ERRORS.md** — Erreurs connues et statut.
- **TESTS_END.md** — Synthèse des tests et validation via make.

---

## Détail par thème (référence)

*Pour le détail technique des points ci-dessus (erreurs BDD, relances/événements/notifications, sécurité, emails, métier, etc.), les sections suivantes restent en référence. Tout ce qui est **résolu** est dans **RESOLUTIONS.md**.*

### Erreurs et corrections (à retester si besoin)

- Tests API depuis Docker : `sh` + chemins absolus, PROJECT_ROOT, volume scripts, TESTS_RESULTS_DIR, syntaxe POSIX (test-api-specific.sh, generate-test-report.sh).
- Persistance agrégateur : filtre JobbingTrack → 21 conteneurs ; rebuild metrics-aggregator si besoin.
- Tables manquantes : `make db-push-all` crée toutes les tables (Prisma 9 services + init-system-metrics.sql + init-key-tables.sql). **init-key-tables** crée aussi vulnerabilities, security_metrics, deployments (+ deployment_metrics, rollbacks) et ajoute User.verificationToken / verificationTokenExpiry si la table User existe. Ne pas lancer db-push-security / db-push-deployment seuls.
- **Rapport Tests API (2026-02-19)** : 21/36 passent, 15 échecs (profile 404, notification 200 vs 401, dev_user_1, schéma statusId, dashboard count, etc.) — détail et ordre des corrections dans **docs/tests/ECHECS_TESTS_API_2026-02-19.md**. Depuis le backoffice, un **résumé** (X/Y passés, Z échecs) s’affiche après chaque run.
- **make refresh-bdd** : une seule commande (build → down → up-full → db-push-all). up-full démarre tous les services puis exécute **un seul** db-push-all (plus de premier passage avec seulement auth).
- **up-full** : un seul `db-push-all` après le démarrage de tous les conteneurs (postgres, redis, api-gateway, auth, frontend, profil full, monitoring-c, metrics-aggregator). Évite les « conteneur non démarré (ignoré) ». Après db-push-all, **metrics-aggregator est redémarré** pour recharger le schéma BDD et éviter les erreurs « cached plan must not change result type » et « cache lookup failed for type ».
- **container_logs** : table et enum `LogLevel` créés dans `scripts/db/init-key-tables.sql` ; persistance des logs opérationnelle (plus de contournement dans metrics-aggregator).

### Emails

- Configuration SMTP, test SMTP, écrans Configuration et Déliverabilité (non implémentés).
- Historique des emails : API et page à brancher.

### Sécurité

- WAF et détection : actuellement mock ; à remplacer par vraie config et détection (APIs + BDD).
- Firewall (règles, statut, logs) : tables via db-push-all ; backoffice branché.

### Gestion des données

- Export : branché (GET /api/v1/admin/export/:type via gateway 5002). Import et cleanup : 501, message clair.
- Stats utilisateur : branché sur GET /api/v1/analytics/stats/:userId. Abonnement : non implémenté. Données test : filtre API à ajouter.

### Métier (APIs et backoffice)

- Entretiens, appels, sync, candidatures, relances, entreprises, contacts, événements, calendrier, utilisateurs, paramètres : à finaliser (CRUD, workflows, backoffice, scénarios). Référence : docs/database/.

### Migration et sécurisation complète

- À faire en dernier (après backoffice, tests, API stables) : migration auth vers Go/Rust, chiffrement, JWT/refresh, rate limiting, HTTPS, validation stricte. Voir section « Migration et sécurisation complète » dans l’historique du fichier si besoin.
