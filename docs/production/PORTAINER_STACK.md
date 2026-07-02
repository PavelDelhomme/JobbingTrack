# Stack Portainer — JobbingTrack

Dernière mise à jour : 2 juillet 2026

> **Checklist porteur (ordre des actions)** : [`PORTEUR_ACTIONS_DEPLOIEMENT.md`](PORTEUR_ACTIONS_DEPLOIEMENT.md)

## Objectif

Déployer l’API, les microservices backend et le backoffice web sur un VPS self-hosted via **Portainer** + **Nginx Proxy Manager (NPM)**, avec le code et le compose versionnés dans Git et les secrets **uniquement** dans Portainer.

## Prérequis VPS

- Docker + Portainer (CE ou BE)
- Nginx Proxy Manager (conteneur ou stack séparée)
- DNS : sous-domaines vers l’IP du VPS (ex. `api.jobbingtrack.delhomme.ovh`, `jobbingtrack.delhomme.ovh`)
- Dépôt GitHub : `https://github.com/PavelDelhomme/JobbingTrack.git`

## Création de la stack (pas à pas)

1. **Portainer** → **Stacks** → **Add stack**
2. **Name** : `jobbingtrack`
3. **Build method** : **Use a git repository**
4. Renseigner :

| Champ | Valeur |
|-------|--------|
| Repository URL | `https://github.com/PavelDelhomme/JobbingTrack.git` |
| Repository reference (préprod) | `refs/heads/dev` |
| Repository reference (prod) | `refs/heads/main` |
| Compose path | `deploy/production/docker-compose.yml` |

5. **Authentication** (dépôt privé) : username GitHub + Personal Access Token (`repo` read).

6. **GitOps updates** : activer avec intervalle (ex. 5 min) pour suivre la branche, ou laisser désactivé et redeploy manuel / webhook CI.

7. **Environment variables** : coller les clés de [`deploy/production/.env.example`](../../deploy/production/.env.example) avec vos valeurs réelles (mode avancé).

8. **Deploy the stack**.

## Variables obligatoires (résumé)

| Groupe | Exemples |
|--------|----------|
| Domaines | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_FRONTEND_URL`, `FRONTEND_URL`, `ALLOWED_ORIGINS` |
| BDD | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| Redis | `REDIS_PASSWORD` |
| Auth | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SECURITY_INTERNAL_SECRET`, `METRICS_API_KEY` |
| Admin | `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Images (phase CI) | `IMAGE_REGISTRY=ghcr.io/paveldelhomme`, `IMAGE_TAG=dev`, `IMAGE_PULL_POLICY=always` |

## Nginx Proxy Manager

Sur le **même hôte** que la stack (ports publiés en loopback) :

### Proxy host API

- **Domain** : `api.jobbingtrack.delhomme.ovh` (adapter)
- **Scheme** : `http`
- **Forward hostname / IP** : `127.0.0.1`
- **Forward port** : `3000` (ou `API_PUBLISH_PORT`)
- **SSL** : certificat Let’s Encrypt, **Force SSL** activé
- **Websockets** : activé si besoin (smokes / temps réel)

### Proxy host Backoffice / Web

- **Domain** : `jobbingtrack.delhomme.ovh`
- **Forward** : `127.0.0.1:3001` (ou `FRONTEND_PUBLISH_PORT`)
- **SSL** + **Force SSL**

Headers utiles (NPM → Custom locations ou Advanced) :

- `X-Forwarded-Proto: https`
- `X-Real-IP: $remote_addr`

La stack définit `TRUST_PROXY_HOPS=2` sur l’API gateway pour honoriser `X-Forwarded-*`.

## CI/CD GitHub Actions

| Workflow | Rôle |
|----------|------|
| `build-push-images.yml` | Build + push images GHCR sur `dev` / `main` |
| `deploy-dev.yml` | Webhook Portainer préprod (secret `DEV_DEPLOY_URL`) |
| `deploy-prod.yml` | Webhook prod (secret `PROD_DEPLOY_URL`) |

### Secrets GitHub à configurer

| Secret | Usage |
|--------|--------|
| `DEV_DEPLOY_URL` | URL webhook GitOps stack Portainer (branche dev) |
| `PROD_DEPLOY_URL` | URL webhook stack prod (branche main) |

Obtenir l’URL webhook : Portainer → Stack `jobbingtrack` → **Webhook** (GitOps).

### Packages GHCR

Images : `ghcr.io/paveldelhomme/jobbingtrack-<service>:<tag>`

Tags : nom de branche (`dev`, `main`), SHA court, et `latest` sur `main` uniquement.

## Rollback

1. Changer `IMAGE_TAG` dans Portainer vers un tag précédent (SHA ou release).
2. **Update the stack** ou laisser GitOps tirer un tag Git (`refs/tags/vX.Y.Z`).

## Mobile (hors Portainer)

Les APK/IPA et publications store passent par un pipeline séparé : [`MOBILE_RELEASE_PIPELINE.md`](MOBILE_RELEASE_PIPELINE.md).

Le backoffice pourra plus tard afficher versions minimales et bannières « mise à jour obligatoire » ; il ne remplace pas Google Play / App Store.

## Dépannage

| Symptôme | Piste |
|----------|--------|
| CORS / Network Error | Vérifier `ALLOWED_ORIGINS` = URLs HTTPS NPM exactes |
| 502 NPM | Stack pas healthy : `docker logs jobbingtrack-api-gateway` |
| Build Portainer très long | Passer en phase B : images GHCR + `IMAGE_PULL_POLICY=always` |
| Emails absents | SMTP OVH, ports 587/465, `EmailLog` SENT en BDD |

## Fichiers liés

- Compose : [`deploy/production/docker-compose.yml`](../../deploy/production/docker-compose.yml)
- Exemple env : [`deploy/production/.env.example`](../../deploy/production/.env.example)
- Gate prod : [`A_VALIDER_AVANT_PRODUCTION.md`](A_VALIDER_AVANT_PRODUCTION.md)
- Suivi déploiement : [`DEPLOIEMENT_PRODUCTION.md`](DEPLOIEMENT_PRODUCTION.md)
