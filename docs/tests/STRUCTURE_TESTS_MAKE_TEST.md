# Structure des tests – make test / make test-all

Ce document décrit la structure réelle de la suite de tests, les prérequis (dont **email vérifié**), et comment interpréter les résultats.

---

## Prérequis : seed auth (email vérifié)

Les tests API, User Journey et Playwright E2E utilisent un **compte admin** et un **compte utilisateur test** qui doivent avoir **email vérifié** (`emailVerified: true`). Sinon le login renvoie **401 "Veuillez vérifier votre email avant de vous connecter"** (code `EMAIL_NOT_VERIFIED`).

- **Admin** : `ADMIN_EMAIL` / `ADMIN_PASSWORD` depuis `.env`
- **Utilisateur test** : `testuser@jobbingtrack.test` / `TestPassword123!` (ou `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`)

Le script **run-all-tests-with-reports.sh** lance automatiquement le **seed auth** au début (si le conteneur `jobbingtrack-auth-service` tourne) pour mettre à jour ces comptes avec `emailVerified: true`. Si les tests échouent encore en 401 :

1. Vérifier que la stack est up : `make up-full`
2. Lancer le seed à la main :  
   `make seed-auth`

---

## Répertoire de travail après make test

- Le script **reste toujours à la racine du projet** : il fait `cd "$ROOT_DIR"` en début de chaque étape et à la fin.
- **À faire** : lancer **make test** (ou **make test-all**) depuis la **racine du projet** (`/chemin/vers/JobbingTrack`), pas depuis `tests/`. La cible Make exécute le script avec `cd $(ROOT_DIR)` pour forcer la racine.
- Si vous avez lancé le script avec `source` ou `.`, à la fin exécutez : `cd "$ROOT_DIR"` pour revenir à la racine.

---

## Catégories de tests et nombre de « tests »

| Catégorie | Ce qui est exécuté | Nombre typique | Note |
|-----------|--------------------|----------------|------|
| **User Journey (API)** | `scripts/testing/verify-user-journey.sh` | 1 bloc | Parcours API |
| **Relations BDD** | `scripts/testing/test-relations.js` | Plusieurs assertions par relation | Tables de jonction many-to-many (exécuté dans le contexte auth-service / Prisma disponible) |
| **Enums** | `scripts/testing/test-enums.js` | Plusieurs assertions par enum | Schéma Prisma (auth-service) |
| **Email Logs** | Requêtes SQL / logs | 1 bloc | Table EmailLog |
| **Tests API Complets (Jest)** | `tests/api/*.test.js` (Jest) | **Nombre élevé** (plusieurs dizaines) | Chaque `it()` = 1 test |
| **Tests Backend Services (Jest)** | `tests/backend/*` (Jest) | Plusieurs tests par service | Health, logique métier |
| **Tests API Backend (script)** | `scripts/testing/test-api-specific.sh` | **~62** | **1 test = 1 appel HTTP** (health, auth, companies, applications, etc.) |
| **Playwright E2E Frontend** | `frontend/tests/e2e/*.spec.ts` | **~270+** | 1 test = 1 `test()` Playwright |
| **Playwright MailHog / Email Workflows** | Specs emails | Variable | Dépend de MailHog / config |
| **Tests Frontend Jest** | `frontend` Jest | Variable | Unitaires composants |
| **Performance, Sécurité, Intégration** | Scripts dédiés | Variable | 1 bloc par catégorie |

Donc : **62 « tests » côté API Backend (script)** = 62 endpoints / appels HTTP. Les **~270+ tests E2E** = 270+ scénarios Playwright. Les deux ne comptent pas la même chose ; pour plus de tests API détaillés, ce sont les **Tests API Complets (Jest)** qu’il faut faire passer.

---

## Health checks des services (FollowUp, Event, Notification, etc.)

Les étapes du type « Tests FollowUp Service (Health Check) », « Tests Event Service (Health Check) », etc. vérifient que le **service répond** (health ou endpoint joignable). Ce ne sont pas des suites de tests métier complètes. Pour aller plus loin :

- **Tests API Backend (script)** : couvre les principaux endpoints par service (auth, companies, applications, contacts, etc.).
- **Tests API Complets (Jest)** : couverture plus fine (cascade de statuts, archivage, etc.).

Les tests **Sécurité Firewall & WAF** vérifient que les routes protégées renvoient bien 401/403. Des tests de sécurité plus poussés (par interface, par API) peuvent être ajoutés dans `tests/security/` et dans les specs Playwright (sécurité E2E).

---

## Rapports

- **Résultats** : `tests/results/YYYYMMDD-HHMMSS/`
- **Rapport HTML** : `report.html` (à ouvrir dans un navigateur)
- **Rapport texte** : `report.txt`

---

## Commandes utiles

```bash
# Depuis la racine du projet
make test          # ou make test-all
make test-e2e      # uniquement E2E Playwright
make test-api      # Tests API Jest (tests/api/)
make test-database # BDD + relations + enums
```

---

**Dernière mise à jour** : mars 2026
