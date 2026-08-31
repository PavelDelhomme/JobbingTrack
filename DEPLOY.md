# DEPLOY.md — Guide complet de déploiement JobbingTrack

> **Source unique** pour déployer web, API, mobile (OTA), local / préprod / prod.  
> Pattern inspiré de **YTMusic** : GitHub Actions → GHCR → Portainer CE → Nginx Proxy Manager → Watchtower.  
> Dernière mise à jour : **28 août 2026**

Ce fichier remplace / absorbe l’ancien `docs/deployment/CANAL_DISTRIBUTION_MOBILE.md` (canaux mobile inclus ici).  
Checklist porteur **copie opérationnelle** (sans rien perdre) aussi dans [`docs/pilotage/TODOS.md`](docs/pilotage/TODOS.md) section **▶ En cours**.

### État d’avancement (28/08 — après-midi)

| Bloc | État |
|------|------|
| CI GHCR `Build and Push Container Images` | ✅ fixé (Buildx) — images `:dev` publiques |
| Stack **préprod VPS** `jobbingtrack-preprod-*` | ✅ up (gateway + frontend healthy) |
| NPM `preprod.` + `api-preprod.` + Let's Encrypt | ✅ |
| Smoke `https://api-preprod.jobbingtrack.com/health` | ✅ 200 |
| Smoke `https://preprod.jobbingtrack.com/login` | ✅ 200 |
| Watchtower labels sur conteneurs JT | ✅ (auto-pull `:dev` ~5 min) |
| Script PC → VPS | `bash scripts/deploy/vps-up-preprod.sh` |
| Stack **prod** + NPM apex / api. | ❌ après validation préprod |
| OTA Nothing | ❌ étape J |

**Hors scope deploy** (à faire **après** préprod OK) : nettoyer / mutualiser `backend/auth-service` (email*, logger*, centralLogger) et les duplications entre microservices — carte **BACKEND-CLEAN-01** dans le pilotage.

---

## Table des matières

1. [Vue d’ensemble](#1-vue-densemble)
2. [Branches Git & flux de travail](#2-branches-git--flux-de-travail)
3. [Environnements (local / préprod / prod)](#3-environnements-local--préprod--prod)
4. [GitHub Actions & CI/CD](#4-github-actions--cicd)
5. [Prérequis PC & secrets](#5-prérequis-pc--secrets)
6. [Étape A — Dev local (PC)](#6-étape-a--dev-local-pc)
7. [Étape B — DNS jobbingtrack.com](#7-étape-b--dns-jobbingtrackcom)
8. [Étape C — Générer les .env Portainer](#8-étape-c--générer-les-env-portainer)
9. [Étape D — Stack Portainer préprod](#9-étape-d--stack-portainer-préprod)
10. [Étape E — Nginx Proxy Manager préprod](#10-étape-e--nginx-proxy-manager-préprod)
11. [Étape F — Smoke tests préprod](#11-étape-f--smoke-tests-préprod)
12. [Étape G — GHCR public + Watchtower](#12-étape-g--ghcr-public--watchtower)
13. [Étape H — Déploiements quotidiens (scripts)](#13-étape-h--déploiements-quotidiens-scripts)
14. [Étape I — Stack Portainer prod](#14-étape-i--stack-portainer-prod)
15. [Étape J — Mobile : OTA, APK, canaux, stores](#15-étape-j--mobile--ota-apk-canaux-stores)
16. [Secrets GitHub Actions](#16-secrets-github-actions)
17. [Scripts de référence](#17-scripts-de-référence)
18. [Dépannage](#18-dépannage)
19. [Checklist porteur condensée](#19-checklist-porteur-condensée)

---

## 1. Vue d’ensemble

### Ce que tu veux pouvoir faire

| Besoin | Comment |
|--------|---------|
| Coder / tester sur le PC | Stack Docker locale + HTTPS `*.localhost:5443` |
| Publier une version de test sur Internet | Push `dev` → images GHCR `:dev` → stack **préprod** VPS |
| Publier la vraie prod | Merge `dev` → `main` → images `:latest` → stack **prod** VPS |
| Mettre à jour l’app Android (Nothing) | OTA via backoffice (canal `dev` puis `production`) |
| Mettre à jour sans Portainer Pro | Watchtower (poll ~5 min) ou script `redeploy-vps.sh` |

### Schéma

```
  PC (APP_ENV=local)
       │
       │  bash scripts/deploy/admin-deploy-dev.sh
       ▼
  git push origin dev  ──►  GitHub Actions build-push-images.yml
       │                         │
       │                         ▼
       │                   ghcr.io/paveldelhomme/jobbingtrack-*:dev
       │                         │
       │         Watchtower / redeploy-vps.sh / Portainer UI
       ▼                         ▼
  Portainer stack jobbingtrack-preprod
       │
       ▼
  NPM → https://preprod.jobbingtrack.com
        https://api-preprod.jobbingtrack.com

  bash scripts/deploy/admin-deploy-prod.sh web
       │
       ▼
  merge dev → main ──► GHCR :latest / :prod
       │
       ▼
  stack jobbingtrack-prod → https://jobbingtrack.com + api.jobbingtrack.com
```

### Éléments VPS déjà en place

| Élément | URL / nom |
|---------|-----------|
| Portainer CE | https://portainer.delhomme.ovh |
| Nginx Proxy Manager | https://nginx.delhomme.ovh |
| IP VPS | `95.111.227.204` |
| Réseau NPM Docker | `nginx-proxy-manager_npm-network` |
| Réseau partagé | `shared-network-copy` |
| Référence qui marche | stack **ytmusic** (même pattern) |

---

## 2. Branches Git & flux de travail

| Branche | Rôle | Images GHCR | Stack VPS |
|---------|------|-------------|-----------|
| `feat/*`, `fix/*`, … | Travail | — (CI tests) | — |
| **`dev`** | Intégration | `*:dev` + `*:sha-…` | **préprod** |
| **`main`** | Production | `*:latest` + `*:prod` + `*:sha-…` | **prod** |

### Règles

1. Tu développes sur une branche feature **depuis `dev`**.
2. Tu merges / pousses vers **`dev`** pour la préprod.
3. Tu ne pousses **jamais** directement sur `main` sauf promote volontaire (`admin-deploy-prod.sh`).
4. Portainer clone le repo Git : la branche de la stack doit matcher (`dev` ou `main`).

### PAT GitHub pour Portainer

Portainer a besoin de **cloner** le repo privé.

- **Fine-grained** : Repository `JobbingTrack` → **Contents: Read-only** + Metadata Read  
- **Classic** : scope `repo` (pas de read-only pour privé)

Le PAT va dans Portainer → stack → **Authentication** (username + token).  
**Jamais** dans les Environment variables de la stack, **jamais** committer.  
Il peut vivre dans ton `.env` local (`GITHUB_PAT=`) pour mémoire — exclu du générateur Portainer.

---

## 3. Environnements (local / préprod / prod)

| | **Local PC** | **Préprod VPS** | **Prod VPS** |
|--|--------------|-----------------|--------------|
| Stack | `docker-compose.yml` racine | Portainer `jobbingtrack-preprod` | Portainer `jobbingtrack-prod` |
| Compose path | racine | `deploy/production/docker-compose.yml` | idem |
| Branche | `dev` / feature | `refs/heads/dev` | `refs/heads/main` |
| `STACK_SLUG` | — | `jobbingtrack-preprod` | `jobbingtrack-prod` |
| `IMAGE_TAG` | build local | `dev` | `latest` |
| Web | `https://jobbingtrack.localhost:5443` | `https://preprod.jobbingtrack.com` | `https://jobbingtrack.com` |
| API | `https://api.jobbingtrack.localhost:5443` | `https://api-preprod.jobbingtrack.com` | `https://api.jobbingtrack.com` |
| Conteneurs NPM | — | `jobbingtrack-preprod-frontend` / `…-api-gateway` | `jobbingtrack-prod-frontend` / `…-api-gateway` |
| Mobile OTA canal | `dev` (debug) | `dev` | `production` |
| Appareil test | émulateur / Samsung | **Nothing Phone** | Nothing (prod) |

---

## 4. GitHub Actions & CI/CD

Dossier : `.github/workflows/`

| Fichier | Quand | Quoi |
|---------|-------|------|
| **`ci-cd.yml`** | Push/PR `dev`, `main`, `feat/*`, … | Tests, qualité, sécurité (gate qualité) |
| **`build-push-images.yml`** | Push `dev` / `main` (backend/frontend/deploy) + manuel | Build **16 images** → GHCR |
| **`deploy-dev.yml`** | Push `dev` + manuel | POST webhook `DEV_DEPLOY_URL` (optionnel) |
| **`deploy-preprod.yml`** | Branche `preprod` + manuel | Webhook préprod + token |
| **`deploy-prod.yml`** | Release GitHub ou manuel (`confirm=deploy`) | Webhook `PROD_DEPLOY_URL` |
| **`mobile-release-android.yml`** | Tag `mobile-v*` ou manuel | Build APK + artefact / release |
| **`security-audit.yml`** | Planifié / manuel | Gitleaks, CVE, Trivy |
| **`database-validation.yml`** | Changements Prisma | Validation schéma |

### Tags d’images (`build-push-images.yml`)

- Push **`dev`** → `ghcr.io/paveldelhomme/jobbingtrack-<service>:dev` + `:sha-xxxxxxx`
- Push **`main`** → `:latest` + `:prod` + `:sha-xxxxxxx`

Services : `api-gateway`, `frontend`, `auth-service`, `application-service`, … (16 au total).

### Redeploy sans webhook Portainer Pro

Portainer CE **n’a pas** les webhooks (réservés Pro). Après un build GHCR :

1. **Watchtower** (recommandé) — poll 5 min, label déjà sur les services  
2. **`bash scripts/deploy/redeploy-vps.sh preprod|prod`** — Portainer Access Token ou SSH  
3. Portainer UI → stack → **Pull and redeploy** (ne pas cocher Remove volumes)

Les workflows `deploy-*.yml` restent utiles **si** tu configures un secret webhook ; sinon ils no-op proprement.

---

## 5. Prérequis PC & secrets

### Sur le PC

```bash
git checkout dev
git pull origin dev
```

Fichier `.env` racine (gitignoré) = source de vérité des secrets (POSTGRES, JWT, SMTP, ADMIN…).

### Générer les fichiers pour Portainer

```bash
bash scripts/deploy/generate-portainer-env.sh
```

Crée (gitignorés) :

- `deploy/production/.env.preprod.generated`
- `deploy/production/.env.prod.generated`

≈ 230 clés, **mêmes mots de passe** que le `.env`, domaines **jobbingtrack.com** injectés.

### MailHog local (conflit Cloudity)

Cloudity Mailpit utilise **8025**. JobbingTrack MailHog utilise **8125**.

```bash
docker compose --profile full up -d mailhog
# UI : http://127.0.0.1:8125
```

---

## 6. Étape A — Dev local (PC)

> **Important** : le front lit `NEXT_PUBLIC_*` en **HTTPS** (`*.localhost:5443`).  
> Sans le proxy `dev-https-proxy`, le navigateur **tourne en boucle / ne charge pas** sur `jobbingtrack.localhost`.  
> `http://127.0.0.1:5003` répond, mais ce n’est **pas** le parcours backoffice documenté.

### Démarrer la stack + HTTPS

```bash
# Équivalent sous-jacent à make up-full (éviter make si Cursor ouvre le fichier)
docker compose --profile full up -d

# Si metrics-aggregator reste en "Created" :
docker start jobbingtrack-metrics-aggregator

# Proxy TLS local (équivalent make dev-https-up)
bash scripts/ops/dev-https-certs.sh
docker compose -f docker-compose.yml -f docker-compose.https.yml --profile https up -d dev-https-proxy
```

Vérifier :

```bash
docker ps --filter name=jobbingtrack- --format 'table {{.Names}}\t{{.Status}}'
curl -fsS http://127.0.0.1:5002/health
curl -skS -o /dev/null -w '%{http_code}\n' https://jobbingtrack.localhost:5443/login   # → 200
curl -skS https://api.jobbingtrack.localhost:5443/health
```

URLs à ouvrir dans le navigateur :

| Surface | URL |
|---------|-----|
| **Vitrine** | `https://jobbingtrack.localhost:5443` |
| **Backoffice admin** | `https://backoffice.jobbingtrack.localhost:5443` → login |
| API | `https://api.jobbingtrack.localhost:5443` |
| MailHog | `http://127.0.0.1:8125` |

Si `ERR_CERT_AUTHORITY_INVALID` : `DEV_HTTPS_INSTALL_CA=1 bash scripts/ops/dev-https-certs.sh` puis doc `docs/operations/DEV_HTTPS.md` (import CA Brave).

### Mobile local → OTA canal dev

```bash
# Build + install device, puis :
bash scripts/mobile/publish-built-dev.sh
```

Backoffice local : `/backoffice/mobile/releases`.

---

## 7. Étape B — DNS jobbingtrack.com

Zone OVH **jobbingtrack.com** → IP **`95.111.227.204`**

| Entrée | Type | Cible | Usage | État |
|--------|------|-------|-------|------|
| `@` | A | 95.111.227.204 | Prod web | ✅ |
| `www` | A | 95.111.227.204 | Prod web | ✅ |
| **`api`** | A | 95.111.227.204 | Prod API | ✅ |
| **`preprod`** | A | 95.111.227.204 | Préprod web | ✅ |
| **`api-preprod`** | A | 95.111.227.204 | Préprod API | ✅ |
| **`backoffice-preprod`** | A | 95.111.227.204 | Préprod admin | à créer |
| **`backoffice`** | A | 95.111.227.204 | Prod admin | à créer |

```bash
dig +short api.jobbingtrack.com
dig +short preprod.jobbingtrack.com
dig +short api-preprod.jobbingtrack.com
dig +short backoffice.jobbingtrack.com
dig +short backoffice-preprod.jobbingtrack.com
```

**Rôles des domaines**

| Domaine | Rôle |
|---------|------|
| `jobbingtrack.com` / `www` | **Site vitrine** (présentation publique) |
| `backoffice.jobbingtrack.com` | **Backoffice admin** → `/backoffice` (+ login) |
| `preprod.jobbingtrack.com` | Vitrine préprod |
| `backoffice-preprod.jobbingtrack.com` | Backoffice préprod |
| `api.*` | API gateway |

Accès admin discret sur la vitrine : petit point dans le pied de page → sous-domaine backoffice.

Attendre la propagation (souvent 5–30 min) avant de demander le certificat Let's Encrypt sur NPM.

**Guide détaillé OVH (captures champs)** : [`docs/deployment/DNS_OVH_JOBBINGTRACK.md`](../docs/deployment/DNS_OVH_JOBBINGTRACK.md)

> Les entrées `jobbingtrack` / `api.jobbingtrack` sur **delhomme.ovh** ne sont **plus** la cible JobbingTrack.

---

## 8. Étape C — Générer les .env Portainer

```bash
bash scripts/deploy/generate-portainer-env.sh
```

Vérifier dans `.env.preprod.generated` :

| Clé | Doit contenir |
|-----|---------------|
| `STACK_SLUG` | `jobbingtrack-preprod` |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://preprod.jobbingtrack.com` |
| `NEXT_PUBLIC_API_URL` | `https://api-preprod.jobbingtrack.com` |
| `ADMIN_EMAIL` | `admin@jobbingtrack.com` (comme ton `.env`) |
| `SMTP_PASS` | ta vraie valeur (pas `REMPLIR_…`) |
| `GITHUB_PAT` | **absent** |

Prod : `https://jobbingtrack.com` + `https://api.jobbingtrack.com`.

---

## 9. Étape D — Stack Portainer préprod

**Prérequis VPS (Portainer CE)** — les bind mounts relatifs Git (`../../config`) restent **vides** sous CE (feature Business). Avant le 1er deploy :

```bash
bash scripts/deploy/sync-vps-stack-files.sh
# → /home/pavel/stacks/jobbingtrack-files/repo  (STACK_REPO_PATH)
```

Vérifie dans le `.env.preprod.generated` : `STACK_REPO_PATH=/home/pavel/stacks/jobbingtrack-files/repo`.

1. Ouvre https://portainer.delhomme.ovh  
2. Environment **local** → **Stacks** → **Add stack**  
3. Choisis **Repository** (Git)

### Champs exacts

| Champ | Valeur |
|-------|--------|
| **Name** | `jobbingtrack-preprod` |
| **Repository URL** | `https://github.com/PavelDelhomme/JobbingTrack.git` |
| **Repository reference** | `refs/heads/dev` |
| **Compose path** | `deploy/production/docker-compose.yml` |
| **Authentication** | ON → Username GitHub + PAT (si repo privé) |
| **GitOps updates** | OFF (Watchtower plus tard) |
| **Skip TLS Verification** | OFF |

### Environment variables

1. Mode **Advanced**  
2. **Load variables from .env file**  
3. Sélectionne `deploy/production/.env.preprod.generated`  
4. Vérifie `STACK_REPO_PATH`, `IMAGE_PULL_POLICY=always` (images GHCR `:dev` déjà buildées)  
5. **Deploy the stack**

Aucun **port publié** : exposition uniquement via NPM (noms `jobbingtrack-preprod-frontend` / `…-api-gateway`).

### Conteneurs attendus

Noms préfixés `jobbingtrack-preprod-` : postgres, redis, api-gateway, frontend, auth-service, …

`api-gateway` et `frontend` sont sur :

- réseau interne `jobbingtrack-preprod-network`
- **`nginx-proxy-manager_npm-network`** (pour NPM)
- **`shared-network-copy`**

Si erreur « network not found » : les réseaux externes doivent déjà exister (ils existent pour ytmusic / cooking).

Si `jt-env-policy.cjs introuvable` : relancer `sync-vps-stack-files.sh` puis **Pull and redeploy** la stack.

---

## 10. Étape E — Nginx Proxy Manager préprod

Ouvre https://nginx.delhomme.ovh → **Proxy Hosts** → **Add Proxy Host**

### Host 1 — API

| Champ | Valeur |
|-------|--------|
| Domain Names | `api-preprod.jobbingtrack.com` |
| Scheme | `http` |
| Forward Hostname / IP | `jobbingtrack-preprod-api-gateway` |
| Forward Port | `3000` |
| Block Common Exploits | ✅ |
| Websockets Support | ✅ |
| SSL | Request new certificate (Let's Encrypt) |
| Force SSL | ✅ |
| HTTP/2 | ✅ |

### Host 2 — Web (vitrine)

| Champ | Valeur |
|-------|--------|
| Domain Names | `preprod.jobbingtrack.com` |
| Forward Hostname / IP | `jobbingtrack-preprod-frontend` |
| Forward Port | `3000` |
| SSL | idem Let's Encrypt + Force SSL |

### Host 3 — Backoffice admin

| Champ | Valeur |
|-------|--------|
| Domain Names | `backoffice-preprod.jobbingtrack.com` |
| Forward Hostname / IP | `jobbingtrack-preprod-frontend` |
| Forward Port | `3000` |
| SSL | idem Let's Encrypt + Force SSL |

Script : `NPM_TOKEN=… bash scripts/deploy/setup-npm-backoffice-hosts.sh`

C’est le **même modèle** que YTMusic (`ytmusic` → port `8787`).

---

## 11. Étape F — Smoke tests préprod

```bash
curl -fsS https://api-preprod.jobbingtrack.com/health
curl -fsS -o /dev/null -w "%{http_code}\n" https://preprod.jobbingtrack.com/
```

Navigateur :

1. `https://preprod.jobbingtrack.com` → page login  
2. Email : `admin@jobbingtrack.com`  
3. Mot de passe : `ADMIN_PASSWORD` de ton `.env`  

Si CORS / Network Error : `ALLOWED_ORIGINS` dans la stack doit lister exactement les deux URLs HTTPS.

---

## 12. Étape G — GHCR public + Watchtower

### Packages GHCR

1. Push sur `dev` (ou attend le prochain) → workflow **Build and Push Container Images**  
2. GitHub → Packages → chaque `jobbingtrack-*` → Visibility **Public** (Portainer CE tire sans login)  
3. Portainer stack préprod → env : `IMAGE_PULL_POLICY=always` → **Update the stack**

### Watchtower

1. Portainer → Add stack → name `watchtower`  
2. Coller le contenu de `deploy/watchtower-compose.yml`  
3. Deploy  

Après chaque push `dev`/`main` + build GHCR réussi, Watchtower recrée les conteneurs labellisés sous ~5 minutes (volumes conservés).

---

## 13. Étape H — Déploiements quotidiens (scripts)

Depuis le PC, avec `.env` local (optionnel : `PORTAINER_URL` + `PORTAINER_API_KEY`).

### Publier en préprod

```bash
# 1) depuis le PC — push code + CI GHCR :dev
bash scripts/deploy/admin-deploy-dev.sh

# 2) OU juste images déjà buildées → update VPS
bash scripts/deploy/vps-up-preprod.sh
```

Après push `dev` + workflow **Build and Push** OK : **Watchtower** recrée les conteneurs labellisés sous ~5 minutes (volumes conservés).  
URLs : `https://preprod.jobbingtrack.com` · `https://api-preprod.jobbingtrack.com`

### Publier en production

```bash
bash scripts/deploy/admin-deploy-prod.sh web
```

Fait : sync `dev` → merge dans `main` → push `main` → GHCR `:latest` → redeploy stack prod.

### Redeploy manuel seulement

```bash
bash scripts/deploy/redeploy-vps.sh preprod
bash scripts/deploy/redeploy-vps.sh prod
```

### Bump version plateforme

```bash
bash scripts/deploy/bump-platform-version.sh patch
# commit VERSION + deploy/releases/JT-x.y.z.yaml
```

---

## 14. Étape I — Stack Portainer prod

**Uniquement après préprod validée.**

> Note 28/08 : `main` et `dev` n’ont **pas** d’historique Git commun.  
> Images `:latest` = `gh workflow run build-push-images.yml --ref dev -f channel=prod`  
> Stack Git = `refs/heads/dev` + env `IMAGE_TAG=latest` (pas de force-push `main`).

Prérequis : `bash scripts/deploy/sync-vps-stack-files.sh` (même `STACK_REPO_PATH` que préprod).

| Champ | Valeur |
|-------|--------|
| Name | `jobbingtrack-prod` |
| Reference | `refs/heads/dev` |
| Compose path | `deploy/production/docker-compose.yml` |
| Env file | `.env.prod.generated` |
| `STACK_SLUG` | `jobbingtrack-prod` |
| `STACK_REPO_PATH` | `/home/pavel/stacks/jobbingtrack-files/repo` |
| `IMAGE_TAG` | `latest` |
| `IMAGE_PULL_POLICY` | `always` |

Aucun port hôte — NPM uniquement.

### NPM prod

| Domain | Forward |
|--------|---------|
| `api.jobbingtrack.com` | `jobbingtrack-prod-api-gateway:3000` |
| `jobbingtrack.com` (+ `www`) | `jobbingtrack-prod-frontend:3000` — **vitrine** |
| `backoffice.jobbingtrack.com` | `jobbingtrack-prod-frontend:3000` — **admin** |

> Si le navigateur renvoie vers **Nextcloud** alors que `curl https://jobbingtrack.com/` affiche JobbingTrack : vider le cache / HSTS, et vérifier dans NPM que l’host apex pointe bien vers `jobbingtrack-prod-frontend:3000` (pas un ancien proxy).

### Maintenance vitrine (optionnel)

Page jolie : `/maintenance`. Sur la stack **prod** Portainer, ajouter :

```text
NEXT_PUBLIC_SITE_MAINTENANCE=1
SITE_MAINTENANCE_MODE=1
```

Puis recreate du service `frontend` (rebuild image si le flag est un build-arg). Désactiver = `0` + recreate.

### Monitoring vue d’ensemble (0/21)

`STACK_SLUG` doit être `jobbingtrack-preprod` / `jobbingtrack-prod`. Le metrics-aggregator sonde les noms Compose (`api-gateway`, …) et lit `docker.sock`. Après mise à jour compose : **Update the stack** dans Portainer.

Smoke :

```bash
curl -fsS https://api.jobbingtrack.com/health
curl -fsS -o /dev/null -w "%{http_code}\n" https://jobbingtrack.com/
```

---

## 15. Étape J — Mobile : OTA, APK, canaux, stores

### 15.1 Vue d’ensemble des canaux

| Canal | Public | Mise à jour | État |
|-------|--------|-------------|------|
| **OTA interne** (API JT) | Équipe / bêta | In-app, canaux `dev` → `production` | ✅ **Principal** |
| **APK sideload** | Restreint | Backoffice / script | ✅ |
| **GitHub Releases** | Repo | Tag `mobile-v*` + CI | ✅ CI ; copie VPS manuelle |
| **Google Play Store** | Public | Play Console | 🔲 Plus tard |
| **F-Droid** | Open source | Repo F-Droid | 🔲 Plus tard |
| **App Store / TestFlight** | Public / bêta | Apple | 🔲 Futur |

Appareil de validation porteur : **Nothing Phone**.

### 15.2 OTA interne (processus à suivre)

1. **Build APK**
   - Debug (canal `dev` auto) : `bash scripts/mobile/setup/build-apk-debug.sh`
   - Release : `API_BASE_URL=https://api-preprod.jobbingtrack.com bash scripts/mobile/setup/build-apk-release.sh`
2. **Publier canal `dev`**
   - Backoffice préprod : `https://preprod.jobbingtrack.com/backoffice/mobile/releases`  
     → **Publier en DEV**
   - Ou script :
     ```bash
     DEPLOY_URL=https://api-preprod.jobbingtrack.com \
       MOBILE_RELEASE_CHANNEL=dev \
       bash scripts/deploy/publish-apk-remote.sh
     ```
3. **Tester sur Nothing** : installer l’APK debug/release ; au lancement, dialog MAJ si version distante > locale  
4. **Promote → production** (one-click backoffice) quand OK  
5. App Flutter interroge :  
   `GET /api/v1/mobile/releases/latest?platform=android&channel=dev|production`

Volume Docker : `jobbingtrack_*_mobile_releases` monté sur api-gateway.

Variables utiles (Portainer) : `MOBILE_ANDROID_LATEST_*`, `MOBILE_ANDROID_MIN_*`, `MOBILE_ANDROID_FORCE_UPDATE`, `MOBILE_ANDROID_DOWNLOAD_URL` (optionnel → GitHub Releases).

### 15.3 GitHub Releases (CI)

Workflow : `.github/workflows/mobile-release-android.yml`

- Manuel (`workflow_dispatch`) ou tag `mobile-v1.0.42`
- Produit un artefact APK (+ release GitHub sur tag)
- Option : pointer `MOBILE_ANDROID_DOWNLOAD_URL` vers l’asset

Secrets CI keystore (avant store) :

| Secret | Rôle |
|--------|------|
| `ANDROID_KEYSTORE_BASE64` | Keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Mot de passe |
| `ANDROID_KEY_ALIAS` | Alias |

### 15.4 Play Store / F-Droid / iOS (roadmap)

- **Play Store** : compte développeur, keystore stable, `flutter build appbundle`, workflow upload futur  
- **F-Droid** : build reproductible + metadata  
- **iOS** : `MOBILE_IOS_APP_STORE_URL` ; pas d’install hors store  

Recommandation : garder **OTA interne** pour les itérations rapides ; stores pour la distribution publique plus tard.

### 15.5 Matrice de choix

| Besoin | Canal |
|--------|-------|
| Test rapide Nothing | OTA `dev` (préprod) |
| Prod utilisateurs | OTA `production` + promote |
| Public Android | Play Store (futur) |
| Sans Google | F-Droid (futur) |
| iOS | App Store / TestFlight |

---

## 16. Secrets GitHub Actions

GitHub → Settings → Secrets and variables → Actions

| Secret | Obligatoire ? | Rôle |
|--------|---------------|------|
| `DEV_DEPLOY_URL` | Non | Webhook redeploy préprod (sinon Watchtower) |
| `PROD_DEPLOY_URL` | Non | Webhook redeploy prod |
| `PREPROD_DEPLOY_URL` + `PREPROD_DEPLOY_TOKEN` | Non | Receiver custom |
| `ANDROID_KEYSTORE_*` | Non (avant store) | Signature APK release CI |

Sans webhooks : le flux **script local + Watchtower** suffit (comme YTMusic).

---

## 17. Scripts de référence

| Script | Rôle |
|--------|------|
| `scripts/deploy/generate-portainer-env.sh` | `.env` → `.env.preprod.generated` / `.env.prod.generated` |
| `scripts/deploy/build-portainer-env.cjs` | Logique Node du générateur |
| `scripts/deploy/admin-deploy-dev.sh` | Push `dev` + redeploy préprod |
| `scripts/deploy/admin-deploy-prod.sh` | `web` \| `apk` \| `all` → prod |
| `scripts/deploy/redeploy-vps.sh` | Redeploy Portainer CE / SSH / hint Watchtower |
| `scripts/deploy/publish-apk-remote.sh` | Upload APK OTA distant |
| `scripts/deploy/bump-platform-version.sh` | Bump `VERSION` + manifest JT |
| `scripts/mobile/publish-built-dev.sh` | OTA canal dev stack locale |
| `scripts/mobile/setup/build-apk-debug.sh` | Build APK debug |
| `scripts/mobile/setup/build-apk-release.sh` | Build APK release |

Compose VPS : `deploy/production/docker-compose.yml`  
Watchtower : `deploy/watchtower-compose.yml`

---

## 18. Dépannage

| Symptôme | Cause | Fix |
|----------|-------|-----|
| Local : page qui charge / tourne en boucle | Proxy HTTPS **5443** arrêté | `docker compose … --profile https up -d dev-https-proxy` (§6) |
| `metrics-aggregator` en **Created** | Conteneur jamais démarré | `docker start jobbingtrack-metrics-aggregator` |
| `8025 already allocated` | Cloudity Mailpit | MailHog → **8125** |
| Portainer « authentication failed » | PAT / droits | Fine-grained Contents Read, ou classic `repo` |
| Network external not found | Réseaux NPM absents | Créer/joindre `nginx-proxy-manager_npm-network` |
| Let's Encrypt fail | DNS pas propagé | `dig` puis réessayer SSL |
| `tlsv1 unrecognized name` sur préprod | NPM : mauvais domaine / pas de cert / SNI | Recréer Proxy Hosts §10 (Domain Names exacts + Request LE) |
| Conteneur unhealthy / manquant VPS | Build / secrets / stack incomplète | Logs Portainer ; 1er deploy `IMAGE_PULL_POLICY=build` ; attendre healthy |
| CORS / Network Error | Origins | `ALLOWED_ORIGINS` = URLs HTTPS exactes |
| OTA ne propose rien | Canal / version | Canal `dev` pour debug APK ; version distante > locale |
| Image pull denied | GHCR privé | Packages en Public ou registry login Portainer |

---

## 19. Checklist porteur condensée

```
[x] A  Stack locale OK — MailHog 8125 + proxy HTTPS 5443 + metrics (✅ 28/08)
[x] B  DNS : api + preprod + api-preprod sur jobbingtrack.com  (✅ 24/08)
[x] C  .env Portainer générés — IMAGE_PULL_POLICY=always
[x] D  Stack préprod VPS `jobbingtrack-preprod-*` healthy (✅ 28/08)
[x] E  NPM préprod + Let's Encrypt (✅ 28/08)
[x] F  Smoke HTTPS + health + login page (✅ 28/08)
[x] G  GHCR :dev publics + Watchtower labels (✅)
[ ] H  Flux quotidien : push `dev` → CI → Watchtower / `vps-up-preprod.sh`
[ ] I  Stack + NPM **prod** (après validation login admin préprod)
[ ] J  OTA Nothing : publish dev → test → promote production
```

Pilotage Kanban : carte **DEPLOY-GHA-01** · **détail exhaustif A→J** dans [`docs/pilotage/TODOS.md`](docs/pilotage/TODOS.md) (section En cours).  
Mettre à jour **ce fichier en premier**, puis recopier / synchroniser la checklist En cours de `TODOS.md`.

---

*Fin du guide. Toute évolution du process de déploiement doit mettre à jour **ce fichier en premier**.*
