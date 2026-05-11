# VPS — préproduction / production (Portainer, Nginx Proxy Manager, OVH)

Objectif : déployer **API (gateway + services)**, **frontend Next.js** et **build mobile** (artefacts / stores) sur un **VPS** en s’appuyant sur **Portainer** (stacks Docker Compose), **Nginx Proxy Manager** (TLS et reverse proxy) et **OVH** (DNS).

**Documents complémentaires** : [`portainer/README.md`](./portainer/README.md), [`environment-variables/README.md`](./environment-variables/README.md), [`docs/operations/PREPROD_PRODUCTION_CHECKLIST.md`](../operations/PREPROD_PRODUCTION_CHECKLIST.md), [`docs/operations/PRE_VPS_ENV_AUDIT_AND_UPDATES.md`](../operations/PRE_VPS_ENV_AUDIT_AND_UPDATES.md) (audit variables **hors Git**, mises à jour, security-service).

---

## 1. DNS (OVH)

- Créer les enregistrements **A** (ou **AAAA**) vers l’IP publique du VPS pour au minimum :
  - **Frontend** (ex. `app.votredomaine.fr`)
  - **API** (ex. `api.votredomaine.fr`)
  - **Optionnel** : sous-domaine dédié métriques / backoffice si vous séparez les hôtes.
- Attendre la propagation ; vérifier avec `dig` / outil OVH.

## 2. Nginx Proxy Manager (NPM)

- Créer un **Proxy Host** par service exposé :
  - **Frontend** → cible `http://<réseau-docker>:3000` (ou port publié du conteneur frontend, selon votre stack).
  - **API Gateway** → cible `http://...:5002` (adapter au port interne réel du projet).
- Activer **SSL** (Let’s Encrypt dans NPM) une fois le DNS résolu.
- **Websocket / headers** : si le frontend ou des routes longues en nécessitent, activer les options NPM adaptées (support WS, tailles upload, timeouts).
- **CORS / origines** : aligner les variables `NEXT_PUBLIC_*` et URLs côté API avec les **FQDN** HTTPS choisis (pas de mélange `http://localhost` en prod).

## 3. Portainer — stack

- **Stack** : coller ou référencer votre `docker-compose` de production (images buildées sur registry ou build sur le VPS).
- **Variables d’environnement** : utiliser l’éditeur « Environment » de la stack ou un fichier **env** Portainer — reprendre les clés de **`.env.example`** (secrets hors dépôt).
- **Réseau** : placer NPM et les services applicatifs sur un **réseau Docker commun** si NPM accède aux services par **nom de conteneur** (recommandé plutôt que `host.docker.internal` sur Linux).
- **Volumes** : persistance Postgres, Redis, uploads, etc. ; sauvegardes hors conteneur (voir checklist opérations).

## 4. Services à couvrir

| Couche | Rappel |
|--------|--------|
| **API** | Gateway + microservices derrière ; healthchecks Docker ; secrets (`JWT`, `SECURITY_INTERNAL_SECRET`, SMTP…). |
| **Frontend** | Build `NEXT_PUBLIC_*` figées **au build** ; URL agrégateur métriques si utilisée via proxy. |
| **Mobile** | Build release (Android/iOS) pointant vers **`https://api…`** ; certificats racine valides ; pas d’IP littérale sauf contrainte réseau documentée. |

## 5. Préprod vs prod

- **Préprod** : sous-domaines dédiés (`preprod-api.…`), base et secrets **distincts** de la prod.
- **Prod** : sauvegardes BDD, mises à jour de stack documentées, surveillance (logs, métriques déjà présentes dans le projet).

## 6. Vérifications rapides après déploiement

- `https://api…/health` (ou route équivalente documentée dans le dépôt).
- Connexion front → API (login, CORS).
- Application mobile sur build release contre l’URL préprod puis prod.

---

*Document de synthèse pour la chaîne VPS + Portainer + NPM + OVH ; détail UI Portainer : voir `portainer/README.md`.*
