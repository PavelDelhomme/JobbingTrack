# Déploiement JobbingTrack — guide porteur

> Pattern **YTMusic / Portainer CE** : GHCR → stack Git → NPM (`nginx-proxy-manager_npm-network`) + Watchtower.  
> Dernière mise à jour : **24 août 2026**

## Objectif

| Environnement | Où | Domaines | Branche / tag |
|---------------|-----|----------|---------------|
| **Local PC** | `docker compose` racine | `*.jobbingtrack.localhost:5443` | `dev` |
| **Préprod VPS** | Portainer `jobbingtrack-preprod` | `preprod.jobbingtrack.com` · `api-preprod.jobbingtrack.com` | `dev` / `:dev` |
| **Prod VPS** | Portainer `jobbingtrack-prod` | `jobbingtrack.com` · `www` · `api.jobbingtrack.com` | `main` / `:latest` |

Mobile (Nothing Phone) : OTA canal **dev** sur préprod, canal **production** sur prod — backoffice `/backoffice/mobile/releases`.

---

## Architecture (comme YTMusic)

```
Internet → NPM (Let's Encrypt)
              │  réseau nginx-proxy-manager_npm-network
              ▼
   jobbingtrack-*-frontend:3000
   jobbingtrack-*-api-gateway:3000
              │  réseau interne STACK_SLUG-network
              ▼
   postgres · redis · microservices
```

Watchtower (poll ~5 min) tire les images GHCR labellisées — **pas de webhook Portainer Pro**.

---

## Correctif local immédiat — port MailHog 8025

**Erreur** : `Bind for 0.0.0.0:8025 failed: port is already allocated`  
**Cause** : Cloudity Mailpit occupe déjà **8025**.

**Déjà corrigé** (24/08) :

- défaut MailHog UI → **8125** (`MAILHOG_WEB_PORT` / compose)
- ton `.env` local mis à jour

Relancer MailHog uniquement :

```bash
docker compose --profile full up -d mailhog
# UI : http://127.0.0.1:8125
```

Ou stack complète :

```bash
# sous-jacent à make up-full — si tu préfères le script compose :
docker compose --profile full up -d
```

---

## Checklist déploiement VPS (ordre strict)

### 0 — Préparer les fichiers env (PC)

```bash
bash scripts/deploy/generate-portainer-env.sh
```

Fichiers gitignorés (ne jamais committer) :

- `deploy/production/.env.preprod.generated` → stack préprod
- `deploy/production/.env.prod.generated` → stack prod

Secrets = ceux de ton `.env` racine. Domaines = **jobbingtrack.com** (pas delhomme.ovh).  
`GITHUB_PAT` **exclu** du fichier généré → uniquement Portainer UI « Authentication ».

Admin login VPS : `admin@jobbingtrack.com` + `ADMIN_PASSWORD` du `.env`.

---

### 1 — DNS zone **jobbingtrack.com** (OVH)

IP VPS : **`95.111.227.204`**

| Entrée | Type | Cible | Statut actuel |
|--------|------|-------|---------------|
| `@` (jobbingtrack.com) | A | 95.111.227.204 | ✅ déjà là |
| `www` | A | 95.111.227.204 | ✅ déjà là |
| `api` | A | 95.111.227.204 | ❌ **à créer** |
| `preprod` | A | 95.111.227.204 | ❌ **à créer** |
| `api-preprod` | A | 95.111.227.204 | ❌ **à créer** |

Vérifier :

```bash
dig +short api.jobbingtrack.com
dig +short preprod.jobbingtrack.com
dig +short api-preprod.jobbingtrack.com
```

> Sur **delhomme.ovh**, `jobbingtrack` / `api.jobbingtrack` existent déjà — on **n’utilise plus** ces hôtes pour JT ; cible = **jobbingtrack.com**.

---

### 2 — Portainer — stack **préprod**

[Portainer](https://portainer.delhomme.ovh) → local → **Stacks → Add stack → Repository**

| Champ | Valeur |
|-------|--------|
| Name | `jobbingtrack-preprod` |
| Repository URL | `https://github.com/PavelDelhomme/JobbingTrack.git` |
| Reference | `refs/heads/dev` |
| Compose path | `deploy/production/docker-compose.yml` |
| Authentication | Username GitHub + **PAT** (Contents read / classic `repo`) |
| GitOps updates | **Off** (Watchtower plus tard) |

**Environment variables** → **Load from .env file** → `.env.preprod.generated`

Vérifier au moins :

| Clé | Valeur |
|-----|--------|
| `STACK_SLUG` | `jobbingtrack-preprod` |
| `IMAGE_TAG` | `dev` |
| `IMAGE_PULL_POLICY` | `build` (1er deploy) puis `always` |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://preprod.jobbingtrack.com` |
| `NEXT_PUBLIC_API_URL` | `https://api-preprod.jobbingtrack.com` |

**Deploy the stack** — 1er deploy long (build VPS). Conteneurs attendus : `jobbingtrack-preprod-*`.

Réseaux externes requis (déjà sur le VPS) :

- `nginx-proxy-manager_npm-network`
- `shared-network-copy`

---

### 3 — Nginx Proxy Manager — préprod

[NPM](https://nginx.delhomme.ovh) → **Add Proxy Host** × 2

| Domain | Scheme | Forward hostname | Port | SSL |
|--------|--------|------------------|------|-----|
| `api-preprod.jobbingtrack.com` | http | `jobbingtrack-preprod-api-gateway` | `3000` | LE + Force SSL + Websockets |
| `preprod.jobbingtrack.com` | http | `jobbingtrack-preprod-frontend` | `3000` | LE + Force SSL + Websockets |

Même pattern que YTMusic (`ytmusic:8787`) / cooking-recipes.

Smoke :

```bash
curl -fsS https://api-preprod.jobbingtrack.com/health
curl -fsS -o /dev/null -w "%{http_code}\n" https://preprod.jobbingtrack.com/
```

Login : `https://preprod.jobbingtrack.com` → `admin@jobbingtrack.com`.

---

### 4 — Après préprod OK

1. **GHCR** : push `dev` → workflow build-push-images → packages `jobbingtrack-*` en **Public** si besoin  
2. Portainer préprod : `IMAGE_PULL_POLICY=always` → Update  
3. Stack **Watchtower** : coller `deploy/watchtower-compose.yml`  
4. Redeploy local : `bash scripts/deploy/admin-deploy-dev.sh`

---

### 5 — Stack **prod** (après préprod validée)

Même compose, différences :

| | Préprod | Prod |
|--|---------|------|
| Stack name | `jobbingtrack-preprod` | `jobbingtrack-prod` |
| Branche | `refs/heads/dev` | `refs/heads/main` |
| Env file | `.env.preprod.generated` | `.env.prod.generated` |
| `IMAGE_TAG` | `dev` | `latest` |
| Conteneurs | `jobbingtrack-preprod-*` | `jobbingtrack-prod-*` |

NPM prod :

| Domain | Forward |
|--------|---------|
| `api.jobbingtrack.com` | `jobbingtrack-prod-api-gateway:3000` |
| `jobbingtrack.com` | `jobbingtrack-prod-frontend:3000` |
| `www.jobbingtrack.com` | idem frontend (ou redirect vers apex) |

Promote prod depuis PC :

```bash
bash scripts/deploy/admin-deploy-prod.sh web
```

---

### 6 — Mobile OTA (Nothing Phone)

1. Préprod HTTPS OK  
2. Backoffice : `https://preprod.jobbingtrack.com/backoffice/mobile/releases`  
3. Publier APK canal **dev** → tester MAJ sur Nothing  
4. Promote → **production** quand prêt  
5. Build release pointant `API_BASE_URL=https://api.jobbingtrack.com`

```bash
DEPLOY_URL=https://api-preprod.jobbingtrack.com \
  MOBILE_RELEASE_CHANNEL=dev \
  bash scripts/deploy/publish-apk-remote.sh
```

---

## Scripts utiles

| Script | Rôle |
|--------|------|
| `scripts/deploy/generate-portainer-env.sh` | `.env` → fichiers Portainer (domaines .com) |
| `scripts/deploy/admin-deploy-dev.sh` | Push `dev` + redeploy préprod |
| `scripts/deploy/admin-deploy-prod.sh web\|apk\|all` | Merge `dev`→`main` + redeploy prod / APK |
| `scripts/deploy/redeploy-vps.sh preprod\|prod` | Portainer API / SSH / hint Watchtower |
| `scripts/deploy/publish-apk-remote.sh` | Upload OTA distant |

---

## Analyse Copilot — à ne pas suivre aveuglément

Plusieurs affirmations de l’audit Copilot sont **fausses ou obsolètes** pour ce dépôt :

- ❌ « Pas de GitHub Actions » → workflows déjà présents (`.github/workflows/`)
- ❌ « React Native » → app = **Flutter** (`mobile/`)
- ❌ « Prometheus/Grafana/Jaeger » → monitoring custom (metrics-aggregator), pas cette stack
- ✅ Priorité réelle porteur : **deploy web/API/mobile préprod+prod**, OTA, CI images GHCR

Tests couverture 90 % / SonarQube / GraphQL → **Plus tard** (après DEPLOY-C1→C3).

---

## Dépannage

| Symptôme | Cause | Fix |
|----------|-------|-----|
| `8025 already allocated` | Cloudity Mailpit | MailHog → **8125** (déjà fait) |
| NPM SSL fail | DNS manquant | Créer `api` / `preprod` / `api-preprod` sur jobbingtrack.com |
| Portainer clone fail | Repo privé | PAT dans Authentication stack |
| Conteneur unhealthy | Secrets / build | Logs Portainer ; `IMAGE_PULL_POLICY=build` 1ère fois |
| CORS / Network Error | `ALLOWED_ORIGINS` | Doit lister exact HTTPS NPM |

Pilotage détaillé : [`docs/pilotage/TODOS.md`](docs/pilotage/TODOS.md) section **En cours maintenant**.
