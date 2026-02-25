# CI/CD – JobbingTrack

## Réactiver la CI/CD (GitHub Actions)

Si les workflows ne se déclenchent pas :

1. **Répository** → **Settings** → **Actions** → **General**
2. Sous **Actions permissions** : choisir **Allow all actions and reusable workflows**
3. Vérifier qu’aucune règle **Branch protection** ne bloque les checks si besoin.

Les workflows sont dans `.github/workflows/` et se déclenchent sur push/PR selon les branches configurées.

---

## Workflows principaux

| Fichier | Déclencheur | Rôle |
|--------|-------------|------|
| **ci-cd.yml** | Push sur `main`, `develop`, `feat/*`, `fix/*`, etc. ; PR vers `main`/`develop` | Sécurité, validation BDD, qualité de code, tests backend/frontend, intégration, performance |
| **database-validation.yml** | Push/PR quand `backend/prisma/`, `scripts/database/` changent | Validation du schéma Prisma |
| **deploy-dev.yml** | Push sur `develop` ou manuel | Déploiement environnement **dev** (placeholder : configurer `DEV_DEPLOY_URL`) |
| **deploy-preprod.yml** | Push sur `main` ou manuel | Déploiement **preprod** (placeholder : configurer `PREPROD_DEPLOY_URL`) |
| **deploy-prod.yml** | Publication d’une **release** ou manuel (avec confirmation « deploy ») | Déploiement **production** (placeholder : configurer `PROD_DEPLOY_URL`) |

---

## Déploiement dev / preprod / prod

Les workflows **deploy-*.yml** sont des squelettes :

- Ils font un **checkout** et un résumé dans le step summary.
- L’étape « Déploiement » appelle une URL de webhook **si** le secret correspondant est défini :
  - **Dev** : `DEV_DEPLOY_URL` (POST avec `ref` et `sha`)
  - **Preprod** : `PREPROD_DEPLOY_URL`
  - **Prod** : `PROD_DEPLOY_URL`

Pour activer un déploiement réel :

1. **Secrets** (Settings → Secrets and variables → Actions) : créer `DEV_DEPLOY_URL`, `PREPROD_DEPLOY_URL`, `PROD_DEPLOY_URL` avec l’URL de votre service de déploiement (webhook, script distant, etc.).
2. Ou remplacer l’étape « Déploiement (placeholder) » par vos propres steps (SSH, Docker push + pull sur le serveur, Cloud Run, etc.).

Pour **production**, le job utilise l’**environment** `production` (à créer dans Settings → Environments) si vous voulez des rules d’approbation.

---

## Améliorer les tests en CI

- **ci-cd.yml** : les jobs `test-backend`, `test-frontend`, `system-integration-tests`, `performance-tests` sont déjà en place ; certains steps sont en `if: false` (ex. tests API génériques) pour éviter les échecs tant que l’environnement CI n’a pas tous les services.
- Pour ajouter les **tests emails + MailHog** en CI : démarrer le service MailHog dans un job (ou un service container), configurer auth-service avec `SMTP_HOST=mailhog` et lancer le spec Playwright `admin-emails-mailhog.spec.ts` (voir `docs/emails/MAIL.md` § MailHog).
