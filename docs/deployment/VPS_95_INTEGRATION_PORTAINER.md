# VPS 95.111.227.204 — intégration JobbingTrack (Portainer + NPM)

Dernière mise à jour : **7 juillet 2026**  
Serveur : **Debian**, IP **`95.111.227.204`**

> **Sécurité** : ne jamais coller les secrets Portainer (JWT, mots de passe BDD) dans le dépôt Git, le chat ou un email. Variables stack **uniquement** dans Portainer → Environment variables.

Documents liés : [`CONVENTION_VERSION_OFFICIELLE.md`](CONVENTION_VERSION_OFFICIELLE.md), [`../production/PORTAINER_STACK.md`](../production/PORTAINER_STACK.md)

---

## 1. État actuel du VPS (inventaire public)

### Déjà en place

| Composant | Rôle |
|-----------|------|
| **Portainer CE** | Gestion stacks / conteneurs |
| **Nginx Proxy Manager** | TLS Let’s Encrypt, reverse proxy public |
| **Réseau Docker `web`** | Bridge partagé (ex. stack `cooking-recipes`) |
| **Réseau `shared-network-copy`** | Stack `cyna-production`, n8n, nextcloud… |
| **Stacks tierces** | `cooking-recipes`, `cyna-production`, `n8n-stack`, `nextcloud-stack`, `sup-de-cuisine`, `nginx-proxy-manager` |

### Pattern qui fonctionne (réf. `cooking-recipes`)

- Conteneurs **sans** ports publics sur l’hôte (`expose:` seulement).
- Connexion au réseau **`web`** (external) pour que **NPM** atteigne les conteneurs **par nom** (`http://cookingrecipes-api:7272`).
- Secrets dans **Environment variables** Portainer (stack), pas dans le compose Git.

JobbingTrack doit **suivre le même pattern**.

---

## 2. Architecture cible JobbingTrack sur ce VPS

**Deux stacks séparées** (préprod + prod) — même serveur, **isolation** BDD / secrets / domaines :

```
                    Internet
                        │
                        ▼
              ┌─────────────────────┐
              │ Nginx Proxy Manager │
              │ (ports 443 / 81)    │
              └──────────┬──────────┘
                         │ réseau docker "web"
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
  jobbingtrack-    jobbingtrack-    (autres projets
  preprod          prod              cooking-recipes…)
  ├ frontend       ├ frontend
  ├ api-gateway    ├ api-gateway
  ├ postgres       ├ postgres
  ├ redis          ├ redis
  └ microservices  └ microservices
     (réseau interne jt-preprod / jt-prod)
```

| Stack Portainer | Nom | Domaines NPM (exemple) | Branche Git |
|-----------------|-----|------------------------|-------------|
| Préprod | **`jobbingtrack-preprod`** | `jobbingtrack-preprod.delhomme.ovh`, `api-preprod.jobbingtrack.delhomme.ovh` | `dev` |
| Production | **`jobbingtrack-prod`** | `jobbingtrack.delhomme.ovh`, `api.jobbingtrack.delhomme.ovh` | `main` |

**DNS OVH** : enregistrements **A** → `95.111.227.204` pour chaque sous-domaine.

---

## 3. Réseaux Docker à utiliser

Dans `deploy/production/docker-compose.yml` (adaptation) :

```yaml
networks:
  jobbingtrack_internal:
    driver: bridge
  web:
    external: true
    name: web
```

Services exposés via NPM (`frontend`, `api-gateway`) :

```yaml
services:
  api-gateway:
    networks:
      - jobbingtrack_internal
      - web
    expose:
      - "3000"
    # PAS de ports: "3000:3000" sur 0.0.0.0
```

Postgres, Redis, microservices métier : **réseau internal seulement**.

---

## 4. Nginx Proxy Manager — proxy hosts à créer

### Préprod

| Proxy host | Forward |
|------------|---------|
| `jobbingtrack-preprod.delhomme.ovh` | `http://jobbingtrack-preprod-frontend:3000` |
| `api-preprod.jobbingtrack.delhomme.ovh` | `http://jobbingtrack-preprod-api-gateway:3000` |

### Production

| Proxy host | Forward |
|------------|---------|
| `jobbingtrack.delhomme.ovh` | `http://jobbingtrack-prod-frontend:3000` |
| `api.jobbingtrack.delhomme.ovh` | `http://jobbingtrack-prod-api-gateway:3000` |

SSL : **Let’s Encrypt** + **Force SSL**.  
Websocket : activé si besoin (temps réel / smokes).

Variables stack préprod (exemples — valeurs réelles **dans Portainer**) :

- `NEXT_PUBLIC_API_URL=https://api-preprod.jobbingtrack.delhomme.ovh`
- `NEXT_PUBLIC_FRONTEND_URL=https://jobbingtrack-preprod.delhomme.ovh`
- `ALLOWED_ORIGINS=https://jobbingtrack-preprod.delhomme.ovh,https://api-preprod.jobbingtrack.delhomme.ovh`

Prod : mêmes clés avec domaines prod.

---

## 5. Local PC vs VPS — URLs

| Contexte | Frontend | API mobile / app |
|----------|----------|------------------|
| **PC dev** | `https://jobbingtrack.localhost:5443` | `https://api.jobbingtrack.localhost:5443` (nginx dev) |
| **Préprod VPS** | `https://jobbingtrack-preprod.delhomme.ovh` | `https://api-preprod.jobbingtrack.delhomme.ovh` |
| **Prod VPS** | `https://jobbingtrack.delhomme.ovh` | `https://api.jobbingtrack.delhomme.ovh` |

**Mobile** : `API_BASE_URL` / `PUBLIC_API_URL` = URL **HTTPS prod ou preprod** selon le build (release vs debug). Canal OTA dev peut pointer preprod si documenté.

**Ne pas** committer d’`.env` prod avec secrets — template : `deploy/production/.env.example`.

---

## 6. Déploiement progressif (fix API seul)

1. Corriger code sur PC → bump patch `application-service` dans manifeste.
2. CI ou script local : build image `…/application-service:1.0.6-20260707.abc1234` → push registry.
3. Portainer → stack `jobbingtrack-preprod` → mettre à jour **variable image** ou tag compose → **Recreate** uniquement `application-service` (si compose par service) ou update stack avec manifeste delta.
4. Test préprod → même opération sur `jobbingtrack-prod`.

**Rollback** : repointe tag image vers `…-20260706.def4567` (manifeste N-1).

---

## 7. Coexistence avec les autres stacks

- **Pas de conflit de noms** : préfixer conteneurs `jobbingtrack-preprod-*` / `jobbingtrack-prod-*`.
- **Volumes dédiés** : `jobbingtrack_preprod_postgres_data`, `jobbingtrack_prod_postgres_data`.
- **RAM / CPU** : stack JobbingTrack full ≈ 8 Go budget local ; surveiller charge VPS avec cooking-recipes, nextcloud, n8n déjà présents.
- **Port 443** : déjà géré par NPM — JobbingTrack **n’ouvre pas** de ports publics supplémentaires.

---

## 8. Checklist première installation

| # | Action |
|---|--------|
| 1 | DNS OVH → 4 sous-domaines A vers `95.111.227.204` |
| 2 | Portainer → stack **`jobbingtrack-preprod`** (Git `refs/heads/dev`, compose `deploy/production/docker-compose.yml`) |
| 3 | Env vars Portainer depuis `.env.example` (secrets générés `openssl rand -hex 32`) |
| 4 | Attacher services front + gateway au réseau **`web`** |
| 5 | NPM → 2 proxy hosts préprod + SSL |
| 6 | Test `/health` API + login backoffice |
| 7 | Après validation → stack **`jobbingtrack-prod`** (branche `main`, secrets **distincts**) |
| 8 | Figer manifeste **`JT-1.0.0`** — ✅ fichier `deploy/releases/JT-1.0.0.yaml` ; validation porteur « OK baseline JT-1.0.0 » ⏳ |

---

## 9. Backend non open source

- Dépôt GitHub **privé** ; images **GHCR privées** ou Docker Hub privé.
- Aucun volume montant le code source en prod (images multi-stage build only).
- Endpoint public limité (voir [`CONVENTION_VERSION_OFFICIELLE.md`](CONVENTION_VERSION_OFFICIELLE.md) §5).

---

*Inventaire stacks tierces : runbook privé porteur — ne pas versionner mots de passe ni captures Portainer.*
