# Premier déploiement Portainer — checklist porteur

Dernière mise à jour : 17 juin 2026

Objectif : stack **jobbingtrack** running sur le VPS, API + backoffice accessibles en HTTPS via NPM, mise à jour mobile Android automatique.

## 0. Prérequis

- Docker + Portainer + Nginx Proxy Manager sur le VPS
- DNS : `api.<domaine>` et `jobbingtrack.<domaine>` → IP du VPS
- Branche Git disponible sur GitHub : **`feat/deploy-portainer-production`** (puis `dev` après merge)

## 1. Créer la stack Portainer

**Stacks → Add stack → Use a git repository**

| Champ | Valeur |
|-------|--------|
| Name | `jobbingtrack` |
| Repository URL | `https://github.com/PavelDelhomme/JobbingTrack.git` |
| Repository reference | `refs/heads/feat/deploy-portainer-production` *(puis `refs/heads/dev`)* |
| Compose path | `deploy/production/docker-compose.yml` |
| Authentication | Token GitHub si dépôt privé |

**Premier déploiement** : laisser `IMAGE_PULL_POLICY=build` (build sur le VPS, ~20–40 min).

## 2. Variables d'environnement (copier depuis `deploy/production/.env.example`)

Mode **Advanced** dans Portainer. Adapter les domaines :

```env
IMAGE_PULL_POLICY=build
IMAGE_TAG=dev

API_PUBLISH_HOST=127.0.0.1
API_PUBLISH_PORT=3000
FRONTEND_PUBLISH_HOST=127.0.0.1
FRONTEND_PUBLISH_PORT=3001

NEXT_PUBLIC_API_URL=https://api.jobbingtrack.delhomme.ovh
NEXT_PUBLIC_FRONTEND_URL=https://jobbingtrack.delhomme.ovh
FRONTEND_URL=https://jobbingtrack.delhomme.ovh
APP_URL=https://jobbingtrack.delhomme.ovh
ALLOWED_ORIGINS=https://jobbingtrack.delhomme.ovh,https://api.jobbingtrack.delhomme.ovh

POSTGRES_DB=jobbingtrack
POSTGRES_USER=jobbingtrack
POSTGRES_PASSWORD=<openssl rand -hex 24>
REDIS_PASSWORD=<openssl rand -hex 24>
JWT_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
SECURITY_INTERNAL_SECRET=<openssl rand -hex 32>
METRICS_API_KEY=<openssl rand -hex 24>

ADMIN_EMAIL=<votre email admin>
ADMIN_PASSWORD=<mot de passe fort>

SMTP_HOST=smtp.mail.ovh.net
SMTP_PORT=587
SMTP_USER=noreply@jobbingtrack.com
SMTP_PASS=<secret smtp>
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>
SMTP_SECURE=false
SMTP_USE_SSL=false

TRUST_PROXY_HOPS=2
WAF_ENABLED=true
INTRUSION_RELAX_HEURISTICS=false

MOBILE_ANDROID_LATEST_VERSION=1.0.0
MOBILE_ANDROID_LATEST_BUILD=1
MOBILE_ANDROID_MIN_VERSION=1.0.0
MOBILE_ANDROID_MIN_BUILD=1
MOBILE_ANDROID_APK_FILENAME=jobbingtrack-1.0.0+1.apk
MOBILE_ANDROID_FORCE_UPDATE=false
MOBILE_ANDROID_RELEASE_NOTES=Première version préprod
```

Vérification locale des clés :

```bash
bash scripts/deploy/portainer-env-check.sh deploy/production/.env.example
```

## 3. Nginx Proxy Manager

| Domaine | Forward |
|---------|---------|
| `api.jobbingtrack.delhomme.ovh` | `http://127.0.0.1:3000` |
| `jobbingtrack.delhomme.ovh` | `http://127.0.0.1:3001` |

SSL Let's Encrypt + **Force SSL** activés.

## 4. Vérifier la stack

Sur le VPS :

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep jobbingtrack
curl -sS http://127.0.0.1:3000/health
curl -sS http://127.0.0.1:3000/api/v1/mobile/releases/latest?platform=android
```

Navigateur : `https://jobbingtrack.delhomme.ovh` → login backoffice.

## 5. Publier une mise à jour mobile Android (OTA)

### Sur ta machine de build

```bash
export API_BASE_URL=https://api.jobbingtrack.delhomme.ovh
bash scripts/mobile/setup/build-apk-release.sh
```

### Copier l'APK dans le volume Docker du VPS

```bash
# Sur le VPS — adapter le nom de fichier
docker cp deploy/production/mobile-releases/jobbingtrack-1.0.0+1.apk \
  jobbingtrack-api-gateway:/app/mobile-releases/jobbingtrack-1.0.0+1.apk
```

### Mettre à jour les variables Portainer

- `MOBILE_ANDROID_LATEST_VERSION` / `MOBILE_ANDROID_LATEST_BUILD`
- `MOBILE_ANDROID_APK_FILENAME`
- `MOBILE_ANDROID_RELEASE_NOTES`
- (optionnel) `MOBILE_ANDROID_FORCE_UPDATE=true` pour bloquer les anciennes versions

**Update the stack** dans Portainer.

L'app mobile au prochain lancement propose **Télécharger et installer** (Android).

## 6. Phase B — CI GHCR (après premier succès)

1. Merger la branche sur `dev`
2. Changer Portainer : `refs/heads/dev`, `IMAGE_PULL_POLICY=always`
3. GitHub → Settings → Secrets : `DEV_DEPLOY_URL` = webhook Portainer
4. Workflow `build-push-images.yml` pousse les images à chaque push

## Dépannage

| Problème | Action |
|----------|--------|
| Build Portainer échoue (mémoire) | Augmenter RAM VPS ou passer à GHCR (`IMAGE_PULL_POLICY=always`) |
| CORS / Network Error | Vérifier `ALLOWED_ORIGINS` = URLs HTTPS exactes |
| APK 404 | Vérifier `docker exec jobbingtrack-api-gateway ls /app/mobile-releases` |
| Install Android refusée | Autoriser « sources inconnues » / installs depuis le navigateur |

Guide complet : [`docs/production/PORTAINER_STACK.md`](../../docs/production/PORTAINER_STACK.md)
