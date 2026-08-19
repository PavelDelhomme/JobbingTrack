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
| **build-push-images.yml** | Push sur `dev`, `main` ; manuel | Build 16 images GHCR + webhook / hint redeploy — voir [`DEPLOY.md`](../../DEPLOY.md) |
| **deploy-dev.yml** | Push sur `dev` ou manuel | Webhook préprod (`DEV_DEPLOY_URL`) ou no-op + hint |
| **deploy-preprod.yml** | Push sur `preprod` ou manuel | Webhook préprod (`PREPROD_DEPLOY_URL` + token) |
| **deploy-prod.yml** | Release publiée ou manuel (confirm `deploy`) | Webhook prod (`PROD_DEPLOY_URL`) |
| **security-audit.yml** | Push/PR sur surfaces sécurité + planifié lundi 06:00 UTC + manuel | Gitleaks, CVE npm, Trivy filesystem/config, et scan manuel des images prod |

---

## Déploiement dev / preprod / prod

Les workflows **deploy-*.yml** et **build-push-images.yml** :

- Build/push GHCR sur push `dev` (tag `:dev`) et `main` (tags `:latest`, `:prod`)
- Webhook Portainer **si** secret défini ; sinon no-op documenté
- Redeploy local : `bash scripts/deploy/redeploy-vps.sh` ou Watchtower (`deploy/watchtower-compose.yml`)

Guide complet : **[`DEPLOY.md`](../../DEPLOY.md)** à la racine du dépôt.

Pour activer un déploiement réel :

1. **Secrets** GitHub (optionnels) : `DEV_DEPLOY_URL`, `PREPROD_DEPLOY_URL`, `PROD_DEPLOY_URL`
2. **Portainer CE** : Access Token + `scripts/deploy/redeploy-vps.sh` ou stack **Watchtower**
3. Checklist porteur : `docs/production/PORTEUR_ACTIONS_DEPLOIEMENT.md`

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
