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
| **security-audit.yml** | Push/PR sur surfaces sécurité + planifié lundi 06:00 UTC + manuel | Gitleaks, CVE npm, Trivy filesystem/config, et scan manuel des images prod |

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

## Security Audit et scan Trivy images prod

Le workflow `.github/workflows/security-audit.yml` est le gate sécurité non destructif côté GitHub Actions.

Déclenchements automatiques :

- push sur `main`, `develop`, `dev`, `feat/security-*`, `feat/**` quand des fichiers sécurité/compose/Docker/package changent ;
- pull request sur les mêmes surfaces ;
- planification hebdomadaire le lundi à 06:00 UTC.

Jobs principaux :

- **Gitleaks history scan** : checkout historique complet, installation du binaire Gitleaks `v8.30.1`, rapport redacted en artefact `gitleaks-reports`. La dette historique connue est non bloquante en CI via `GITLEAKS_FINDINGS_EXIT_CODE=0`; le tri reste suivi dans `docs/security/STATS.md`.
- **Node dependency audit** : exécute `scripts/security/cve-scan.py` et publie `npm-audit-reports`.
- **Trivy filesystem and config scan** : `aquasecurity/trivy-action@v0.36.0`, upload SARIF via `github/codeql-action/upload-sarif@v4`, artefact `trivy-config-report`.
- **Trivy prod image scan** : job manuel uniquement, désactivé par défaut pour éviter de construire/scanner les images prod à chaque push.

Pour lancer le scan des images prod :

1. Ouvrir **GitHub → Actions → Security Audit → Run workflow**.
2. Choisir la branche à scanner, normalement `dev` avant préprod ou la branche de release avant prod.
3. Mettre `scan_prod_images` à `true`.
4. Lancer le workflow et attendre le job **Trivy prod image scan**.
5. Télécharger l’artefact **`trivy-prod-image-reports`**.

Ce job exécute :

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml config --images
trivy image --severity HIGH,CRITICAL --ignore-unfixed --format json ...
```

Les rapports sont générés sous `reports/security/prod-images/` dans l’artefact, avec :

- `images.txt` : liste des images scannées ;
- un fichier JSON par image, nommé à partir de l’image Docker.

Critère avant préprod/prod :

- tout finding `CRITICAL` ou `HIGH` doit être trié dans `docs/security/STATS.md` ou dans un ticket daté ;
- accepter un finding seulement avec justification claire : non exploitable, dev-only, image non déployée, correctif indisponible avec mitigation documentée ;
- ne pas déployer une image prod avec secret embarqué, fallback prod dangereux ou CVE critique exploitable connue sans validation explicite.

---

## Améliorer les tests en CI

- **ci-cd.yml** : les jobs `test-backend`, `test-frontend`, `system-integration-tests`, `performance-tests` sont déjà en place ; certains steps sont en `if: false` (ex. tests API génériques) pour éviter les échecs tant que l’environnement CI n’a pas tous les services.
- Pour ajouter les **tests emails + MailHog** en CI : démarrer le service MailHog dans un job (ou un service container), configurer auth-service avec `SMTP_HOST=mailhog` et lancer le spec Playwright `admin-emails-mailhog.spec.ts` (voir `docs/emails/MAIL.md` § MailHog).
