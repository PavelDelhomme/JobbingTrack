# Migrations Prisma et bases de données

**Dernière mise à jour** : février 2026

---

## 1. Migrations et Prisma : tout passe par le Makefile et les conteneurs

Les migrations et la synchronisation du schéma BDD sont gérées **uniquement** via le Makefile et l’exécution dans les **conteneurs** (pas de `npx prisma` à la main sur l’hôte, sauf cas particulier local).

| Commande | Rôle |
|----------|------|
| `make db-push-all` | Synchronise le schéma Prisma sur la **base principale** (conteneur `jobbingtrack-auth-service` → `prisma db push`). Crée aussi les tables monitoring/sécurité via scripts SQL. |
| `make db-migrate` | Applique les migrations Prisma (tous les services ayant un schéma). |
| `make db-push-auth` | Push uniquement auth-service (tables User, Application, etc.) si la base principale a des tables manquantes. |
| `make seed-auth` | Crée/met à jour l’utilisateur admin (email vérifié) dans la **base principale**. |
| `make refresh-bdd` | Build → down → up-full → db-push-all (remise à zéro complète de la stack et de la BDD). |

**Script utilisé** : `scripts/db/db-push-all.sh`. Il exécute `docker exec jobbingtrack-auth-service npx prisma db push` (schéma maître = auth-service). Les autres services n’effectuent pas de push pour éviter d’écraser des tables qu’ils ne définissent pas.

---

## 2. Base principale (app + backoffice)

- **Conteneur** : `jobbingtrack-postgres` (service `postgres` dans `docker-compose.yml`).
- **Base** : `jobbingtrack` (ou valeur de `POSTGRES_DB` dans `.env`).
- **Utilisée par** :
  - Tous les services (api-gateway, auth-service, application-service, etc.).
  - Le **backoffice** (admin) et l’application métier.
- **Données de test (backoffice)** : le bouton « Générer données de test » (route admin) écrit **dans cette base principale**. Comportement volontaire pour que l’administrateur puisse démo et naviguer dans le backoffice avec des données réalistes. Les enregistrements sont marqués `isTestData: true` et peuvent être nettoyés via « Nettoyer les données de test » (SUPER_ADMIN/ADMIN).

En résumé : **rien n’est supprimé** côté backoffice/admin ; tout continue de s’appuyer sur la base principale.

---

## 3. Base de test (réplication, optionnelle)

Pour **ne pas mettre les données de test ou les runs de tests dans la base principale**, le projet prévoit une **base de test** séparée.

- **Conteneur optionnel** : `jobbingtrack-postgres-test` (fichier `docker-compose.test.yml`), port **5434** en local.
- **Démarrage** : `make up-test` (démarre postgres-test + redis-test).
- **Réplication du schéma** : pour avoir la même structure que la principale sans les données métier :
  ```bash
  make db-replicate-schema-to-test
  ```
  Cette cible :
  - Dump **schéma seul** (sans données) de la base principale.
  - Restaure ce schéma dans la base du conteneur postgres-test (`jobbingtrack` sur postgres-test).
  - Permet ensuite de lancer des tests ou de générer des données de test en pointant vers `DATABASE_URL=...@postgres-test:5432/jobbingtrack` (ou localhost:5434 en local).

**Utilisation typique** :
- Lancer les tests automatisés contre la base de test : définir `DATABASE_URL` vers postgres-test avant d’exécuter les tests (ou utiliser une variable dédiée `TEST_DATABASE_URL` si les scripts le supportent).
- À ce jour, `make test-database` et `make test-full` utilisent encore la **base principale** (postgres:5432/jobbingtrack) pour rester cohérents avec la stack démarrée par `make up-full`. Pour éviter toute pollution, on peut à l’avenir faire pointer les tests vers la base de test après `make db-replicate-schema-to-test` et `make up-test`.

---

## 4. Récap

| Contexte | Base utilisée | Commande / remarque |
|----------|----------------|---------------------|
| App + backoffice | Principale (`jobbingtrack`) | `make up-full` → tous les services pointent vers `postgres:5432/jobbingtrack`. |
| Génération données de test (backoffice) | Principale | Comportement actuel conservé ; option future possible pour cibler la base de test. |
| Migrations / schéma | Principale | `make db-push-all` (conteneurs). |
| Tests automatisés (actuel) | Principale | `make test-database`, `make test-full` utilisent la même DB que la stack. |
| Tests sur base dédiée (optionnel) | Base de test | `make up-test` puis `make db-replicate-schema-to-test`, puis lancer les tests avec `DATABASE_URL` (ou `TEST_DATABASE_URL`) pointant vers postgres-test. |

---

## 5. Références

- Makefile base de données : `makefiles/database/Makefile` (cibles `db-push-all`, `db-migrate`, `seed-auth`, `up-test`, `db-replicate-schema-to-test`).
- Script db-push-all : `scripts/db/db-push-all.sh`.
- Aide : `make help-database`.
