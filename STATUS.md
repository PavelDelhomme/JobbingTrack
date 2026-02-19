# État du projet JobbingTrack

**Dernière mise à jour** : Février 2026

---

## Admin après `make up-full`

À la fin de **`make up-full`**, le Makefile affiche soit **« ✅ Utilisateur administrateur existe »** (déjà en BDD), soit **« 🔧 Création automatique de l'admin... »** (créé à ce moment-là). Vous n’avez pas besoin de lancer `make create-admin-user` sauf si la création auto a échoué ou si vous avez lancé `CREATE_ADMIN_IF_MISSING=0 make up-full`. Identifiants : **admin@jobbingtrack.test** / **password123**.

---

## À FAIRE (par priorité)

### Priorité 1 – Immédiat

1. Vérifier que l’admin existe (voir message après `make up-full` ; si doute : `make create-admin-user`).
2. Se connecter au backoffice avec admin@jobbingtrack.test / password123.
3. Lancer les tests API depuis le backoffice (Tests > Tests API) et vérifier le rapport ; si login 401, vérifier l’admin (étape 1).

### Priorité 2 – Erreurs à corriger

4. SMTP 503 : configurer SMTP (auth-service ou service dédié), test opérationnel, écrans backoffice Configuration SMTP et Déliverabilité.
5. Logs emails 404 : brancher page Historique des emails (`/backoffice/emails/logs`) et API `GET /api/v1/emails/logs`.
6. API versions 404 : exposer `GET /api/v1/analytics/stats/:userId/versions` via le gateway et corriger le front.

### Priorité 3 – Tests à valider

7. Lancer et valider (ou documenter les échecs) : `make test-api`, `make test-security`, `make test-frontend`, `make test-backend`, `make test-e2e`, `make test-performance`, `make tests-user-journey`.
8. Compléter les tests unitaires (frontend, backend, tests/unit) ; aligner avec TESTS_END.md et docs/tests/TESTS_COMPLETS_RAPPORT.md.

### Priorité 4 – Sécurité

9. Remplacer la config WAF et la détection actuelles (faux/mock) par une vraie config WAF et une vraie détection (APIs + BDD).

### Priorité 5 – Gestion des données

10. Onglet Données test : implémenter le filtre API (isTestData ou utilisateur de test) pour une table « données test uniquement ».
11. Abonnement & facturation : implémenter ou documenter hors scope.

### Priorité 6 – Design et UX

12. Design unifié des pages de test (Tests API, Frontend, Backoffice) : reprendre le design Tests Backend (progression, logs) ; voir TESTS_END.md § 13.
13. Depuis le backoffice : création automatique d’un utilisateur de test et des données de test au clic « Lancer les tests » (sans `make create-admin-user` à la main).

### Priorité 7 – Métier et scénarios

14. APIs métier complètes (entretiens, appels, sync, candidatures, relances, entreprises, contacts, événements, calendrier, utilisateurs, paramètres) ; voir docs/database/ (schema, ACTIONS_ET_MODIFICATIONS).
15. Scénarios Playwright, API et parcours utilisateur opérationnels (dépendent des APIs métier).
16. Worker/cron pour exécuter les tests programmés (plannings backoffice).

### Priorité 8 – Suite

17. Application mobile : connecter à l’API fonctionnelle et sécurisée (section métier stable).
18. Observabilité : tout le trafic (API, mobile, mails, user journey, tests) répertorié dans log-collector + metrics-aggregator.
19. Documentation : tenir à jour ERRORS.md, aligner RESOLUTIONS.md / TESTS_END.md avec STATUS.

---

## À valider (tests à lancer)

- Lancer les cibles make listées en priorité 3 (étape 7) depuis la racine du projet.
- En fin de session : noter les échecs dans STATUS.md ou TESTS_END.md.

**Commandes détaillées** : **docs/COMMANDES_UTILES.md** (aide, tests, db, logs, rebuild).

---

## Références

- **RESOLUTIONS.md** — Ce qui est résolu ou validé (résolutions appliquées, checklist).
- **docs/COMMANDES_UTILES.md** — Commandes make utiles et ce que vous pouvez tester.
- **docs/STATISTIQUES_PROJET.md** — Statistiques projet (services, observabilité, persistance).
- **ERRORS.md** — Erreurs connues et statut.
- **TESTS_END.md** — Synthèse des tests et validation via make.

---

## Détail par thème (référence)

*Pour le détail technique des points ci-dessus (erreurs BDD, relances/événements/notifications, sécurité, emails, métier, etc.), les sections suivantes restent en référence. Tout ce qui est **résolu** est dans **RESOLUTIONS.md**.*

### Erreurs et corrections (à retester si besoin)

- Tests API depuis Docker : `sh` + chemins absolus, PROJECT_ROOT, volume scripts, TESTS_RESULTS_DIR, syntaxe POSIX (test-api-specific.sh, generate-test-report.sh).
- Persistance agrégateur : filtre JobbingTrack → 21 conteneurs ; rebuild metrics-aggregator si besoin.
- Tables manquantes : `make db-push-all` crée toutes les tables (Prisma 9 services + init-system-metrics.sql + init-key-tables.sql). Ne pas lancer db-push-security / db-push-deployment seuls.

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
