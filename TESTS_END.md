# 🧪 Répertoire des tests de fin de projet – JobbingTrack

**Objectif** : Liste exhaustive des vérifications à réaliser avant livraison / mise en production.

**État et priorités** : Pour savoir **ce qu’il reste à faire** et dans quel ordre, voir **STATUS.md** (section « À FAIRE (priorisé) »). Les tests API depuis Docker utilisent désormais `sh` au lieu de `bash` pour éviter « bash: not found » dans le conteneur.

---

## 1. Authentification et utilisateurs

- [ ] Connexion avec identifiants valides (admin, user)
- [ ] Déconnexion et invalidation du token
- [ ] Refresh token et expiration
- [ ] Inscription (validation email si activée)
- [ ] Réinitialisation mot de passe
- [ ] Rôles (USER, ADMIN, SUPER_ADMIN) et restrictions d’accès
- [ ] Profil utilisateur : lecture et mise à jour
- [ ] Table `User` et tables liées présentes en base (`make db-push-auth` ou `make db-push-all`)

---

## 2. API et microservices

- [ ] API Gateway : routage vers auth, application, company, contact, etc.
- [ ] Health checks de chaque service (GET /health ou équivalent)
- [ ] CORS et headers pour le frontend
- [ ] Gestion des erreurs (4xx, 5xx) et messages cohérents
- [ ] Rate limiting / WAF si configurés

---

## 3. Base de données

- [ ] PostgreSQL accessible (port, DATABASE_URL)
- [ ] Migrations / schémas à jour (`make db-migrate`, `make db-push-all`)
- [ ] Tables auth (User, etc.) créées
- [ ] Tables metrics (system_metrics ou system_metrics_snapshots, container_metrics) créées
- [ ] Pas d’erreur « table does not exist » en conditions normales
- [ ] Sauvegarde / restauration (scripts ou procédure documentée)

---

## 4. Monitoring et métriques

- [ ] monitoring-c (ou ex-systems/monitoring-c) : conteneur démarré, endpoint `/api/v1/metrics`
- [ ] metrics-aggregator-service : démarré, DATABASE_URL définie
- [ ] Persistance : écriture dans PostgreSQL (snapshots ou system_metrics)
- [ ] API historique : GET `/api/v1/persistence/system/metrics` avec limit, startDate, endDate
- [ ] Données affichées dans Performances & Analytics (CPU, mémoire, réseau, disponibilité)
- [ ] Plage personnalisée (date/heure début–fin) fonctionnelle
- [ ] Temps de réponse moyen affiché (Vue d’ensemble, Analytics)

---

## 5. Frontend – Structure et routes

- [ ] Route `/backoffice` : dashboard admin
- [ ] Route `/analytics` ou `/backoffice/analytics` : page Performances & Analytics (une source de vérité documentée)
- [ ] Routes protégées : redirection vers login si non authentifié
- [ ] Mode clair / sombre cohérent
- [ ] Responsive (mobile, tablette, desktop)

---

## 6. Frontend – Pages et fonctionnalités

- [ ] Vue d’ensemble : CPU, mémoire, temps de réponse, services
- [ ] Liste des services : statut, health, actions si présentes
- [ ] Statistiques : données cohérentes avec l’API
- [ ] Analytics : graphiques (CPU, mémoire, réseau, disponibilité, par service)
- [ ] Sélecteur de plage date/heure (presets + personnalisée) lisible et utilisable
- [ ] Gestion utilisateurs (liste, création, édition, désactivation)
- [ ] Pages sécurité (firewall, menaces, réseau) si implémentées
- [ ] Pas de références à des services non démarrés (erreurs console minimales)

---

## 7. Sécurité

- [ ] security-service : healthcheck OK
- [ ] WAF / règles API Gateway opérationnelles
- [ ] Firewall (FIREWALL_PLAN.md) : étapes implémentées documentées
- [ ] Pas de secrets en clair dans le code ou le repo
- [ ] Variables sensibles dans .env (non commité)

---

## 8. Docker et déploiement

- [ ] `docker compose up` (ou make up-full) démarre les services essentiels
- [ ] Build monitoring-c : `context: ./ex-systems/monitoring-c` si applicable
- [ ] Volumes et réseaux corrects
- [ ] Healthchecks Docker définis pour les services critiques
- [ ] make db-push-all exécutable sans erreur (DATABASE_URL chargée pour metrics-aggregator)

---

## 9. Makefile et scripts

- [ ] `make db-push-auth` : crée les tables auth
- [ ] `make db-push-metrics` : schéma metrics-aggregator (DATABASE_URL depuis .env)
- [ ] `make db-push-all` : tous les schémas (y compris metrics-aggregator avec .env chargé)
- [ ] `make git-checkout` : script interactif de navigation Git
- [ ] Scripts dans `scripts/` exécutables et documentés si nécessaire

---

## 10. Données et cohérence

- [ ] Données de test (seed) optionnelles et documentées
- [ ] Pas de doublon d’appels métriques (une source : aggregator ou monitoring-c)
- [ ] Format des réponses API (success, data, count) cohérent
- [ ] Timestamps et fuseaux corrects (UTC / ISO)

---

## 11. Documentation et statut

- [ ] README à jour (installation, démarrage, variables)
- [ ] STATUS.md reflétant l’état actuel (fait / en cours / à faire)
- [ ] ERRORS.md / RESOLUTIONS.md pour les erreurs connues et solutions
- [ ] Organisation des routes frontend (admin vs backoffice) documentée ou unifiée

---

## 12. Tests automatisés (si présents)

- [ ] Tests unitaires (backend, frontend) passants
- [ ] Tests E2E (Playwright, etc.) sur parcours critiques
- [ ] Tests d’accessibilité (a11y) sur les pages principales
- [ ] Aucune régression majeure après modifications

---

**Utilisation** : cocher chaque point au fur et à mesure. Ce fichier sert de checklist finale avant livraison ou merge.
