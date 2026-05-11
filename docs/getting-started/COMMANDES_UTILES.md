# Commandes utiles – Make et tests

**Racine du projet** : lancer toutes les commandes depuis la racine.

Voir aussi : **docs/development/makefile-commands/README.md** pour le détail des cibles Make.

---

## Aide

- `make help` — Aide complète + aide par catégorie
- `make help-db` — Base de données (db-push-all, migrations, admin)
- `make help-tests` — Tests (workflow, tests-reset, tests-user-journey)
- `make help-test` — Détail des commandes make test-*
- `make tests-help` — Guide des tests (makefiles/tests)

---

## Ce que vous pouvez tester (cibles make)

| Commande | Description |
|----------|-------------|
| `make test-api` | Tests API (gateway, services) |
| `make test-security` | Tests sécurité |
| `make test-frontend` | Tests frontend (Jest unit) |
| `make test-backend` | Tests backend (services) |
| `make test-e2e` | Tests E2E Playwright |
| `make test-performance` | Tests performance |
| `make tests-user-journey` | Parcours utilisateur via API |
| `make db-push-all` | Synchro schémas Prisma + tables monitoring/sécurité |

**À valider en fin de session** : lancer les cibles ci-dessus et noter les échecs dans STATUS.md ou TESTS_END.md si besoin.

---

## Démarrage et arrêt

- `make up-full` — Démarrer tous les services (admin créé automatiquement si absent)
- `make down` — Tout arrêter
- `make down-keep-data` — Arrêter sans supprimer les volumes
- `make restart-full` — Redémarrage complet en gardant les données
- `make status` — Statut de tous les services (healthy/unhealthy)

---

## Base de données et admin

- `make db-push-all` — Créer/synchroniser toutes les tables (auth + monitoring + sécurité). À lancer après `make up-full` si tables manquantes.
- `make create-admin-user` — Créer ou mettre à jour l’admin (idempotent). Inutile si `make up-full` a déjà affiché « Utilisateur administrateur existe » ou « Création automatique de l’admin ».
- `make recreate-admin-user` — Supprimer et recréer l’admin

Identifiants admin : `admin@jobbingtrack.com` / `password123`

---

## Logs et debug

- `make logs` — Logs de tous les services (Ctrl+C pour arrêter)
- `make logs-metrics` — Logs du metrics-aggregator uniquement
- `make monitoring-c-logs` — Logs du collecteur monitoring-c

---

## Rebuild et nettoyage

- `make rebuild-metrics-aggregator` — Reconstruire l’agrégateur après modif (ex. BigInt, persistence)
- `make db-clean-metrics` — Nettoyer les métriques en BDD
- `make db-clean` — Supprimer uniquement les volumes JobbingTrack
