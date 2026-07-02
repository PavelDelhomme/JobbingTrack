# VPS — préproduction / production (Portainer, Nginx Proxy Manager, OVH)

Dernière mise à jour : 2 juillet 2026

> **Checklist porteur (ordre des actions, stack versionnée)** : [`docs/production/PORTEUR_ACTIONS_DEPLOIEMENT.md`](../production/PORTEUR_ACTIONS_DEPLOIEMENT.md) · compose Git : [`deploy/production/docker-compose.yml`](../../deploy/production/docker-compose.yml)

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
  - **Frontend** → cible `http://<nom-conteneur-frontend>:<port-interne>` (ex. port **3000** dans le conteneur, pas le port publié sur l’hôte si NPM est sur le même réseau bridge).
  - **API Gateway** → cible `http://<nom-conteneur-gateway>:<port-interne>` (dans ce dépôt, port applicatif gateway typiquement **3000** *dans* le conteneur ; le **5002** est le mapping *hôte* — depuis NPM sur le réseau Docker, utiliser le **port d’écoute interne** du service).
- Activer **SSL** (Let’s Encrypt dans NPM) une fois le DNS résolu.
- **Websocket / headers** : si le frontend ou des routes longues en nécessitent, activer les options NPM adaptées (support WS, tailles upload, timeouts).
- **CORS / origines** : aligner les variables `NEXT_PUBLIC_*` et URLs côté API avec les **FQDN** HTTPS choisis (pas de mélange `http://localhost` en prod).
- **Confiance reverse proxy** : derrière NPM, la gateway voit l’IP du conteneur NPM, pas celle du client ; vérifier **`TRUST_PROXY_HOPS`** (et la doc WAF / `X-Forwarded-For`) pour ne pas classer tout le trafic public comme « interne » par erreur.

### 2.1 Réseaux Docker multiples (NPM sur un bridge, stack sur un autre)

Docker **ne résout pas les noms DNS** entre conteneurs sur des **réseaux différents** (sauf routage explicite hors sujet ici). Si NPM est sur `nginx-proxy-manager_npm-network` et votre stack JobbingTrack sur un autre bridge, deux approches courantes :

1. **Recommandé** : attacher les services exposés (au minimum `frontend`, `api-gateway`) **aussi** au réseau externe de NPM (dans Compose : `networks:` avec `external: true` + `name: <nom_du_réseau_npm>`), en conservant le réseau applicatif pour Postgres/Redis/etc.
2. **Alternative** : laisser NPM pointer vers **`http://<IP_du_bridge_de_la_stack>:<port_publié>`** — fragile (IP peut changer) et moins lisible ; préférer le nom de conteneur sur un réseau commun.

Ne pas versionner dans le dépôt une **liste d’inventaire** (IPs, stacks tierces, captures Portainer) : gardez-la dans un coffre / runbook privé.

### 2.2 `DATABASE_URL` dans `.env` — dev machine vs production

Ce n’est **pas** une astuce « super sécurisée » à elle seule : c’est un **découpage de rôles**.

| Où ? | Rôle de `DATABASE_URL` |
|------|-------------------------|
| **Conteneurs** (api-gateway, services…) | Dans le `docker-compose` du dépôt, l’URL utilisée en runtime est en pratique **`...@postgres:5432/...`** (réseau Docker interne). Le mot de passe vient des variables d’environnement de la stack, **pas** de la nécessité d’aligner la ligne `DATABASE_URL` du fichier `.env` sur le disque du VPS pour ces conteneurs. |
| **Hôte / CI / Prisma** | La ligne `DATABASE_URL` du `.env` (souvent `localhost` + port publié Postgres) sert aux **outils lancés sur la machine** (migrations, scripts). |

En **production sur VPS**, vous pouvez :

- soit **ne pas** utiliser Prisma depuis l’hôte et tout faire **depuis un conteneur** (`docker compose exec …`) ;
- soit définir une `DATABASE_URL` « admin » **uniquement** sur l’hôte / dans Portainer (hors Git), avec un utilisateur SQL aux droits limités si possible ;
- idéalement : **secrets Portainer** / fichier env **non versionné** + rotation, pas de mot de passe prod dans le dépôt.

Le fait que Compose **remplace** l’URL pour les services **évite une classe d’erreurs** (mauvais host) ; la sécurité repose surtout sur **mots de passe forts**, **réseau privé**, **pas d’exposition Postgres sur Internet**, **TLS côté NPM**, et **WAF / règles** sur l’entrée publique.

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

### 5.1 Déploiement préprod sans Portainer Business

Le dépôt ne dépend pas de la synchronisation Git payante de Portainer. Le flux retenu pour la préprod est :

1. GitHub Actions construit/valide le commit à publier.
2. Le workflow **Deploy Preprod** est lancé manuellement ou depuis une branche `preprod`.
3. Si `PREPROD_DEPLOY_URL` et `PREPROD_DEPLOY_TOKEN` sont configurés dans les secrets GitHub, le workflow appelle un webhook privé.
4. Le webhook, hébergé hors Git sur le VPS ou dans le backoffice, exécute le runbook privé : `docker compose pull`, sauvegarde/migration si nécessaire, `docker compose up -d`, healthchecks, puis retour HTTP non-2xx en cas d’échec.
5. Portainer reste l’interface de supervision et d’intervention manuelle sur la stack.

Contraintes :

- Le webhook doit être protégé par token, IP allowlist ou autre contrôle équivalent ; ne pas exposer une URL de déploiement publique sans authentification forte.
- Les secrets préprod (`DATABASE_URL`, SMTP, JWT, clés internes, URLs publiques) restent dans GitHub Secrets / Portainer / coffre privé, jamais dans le dépôt.
- Si `PREPROD_DEPLOY_URL` n’est pas défini, le workflow reste volontairement en no-op documenté.
- Si l’URL est définie mais que le webhook échoue, le workflow doit échouer : pas de `|| true` sur un déploiement réel.

## 6. Vérifications rapides après déploiement

- `https://api…/health` (ou route équivalente documentée dans le dépôt).
- Connexion front → API (login, CORS).
- Application mobile sur build release contre l’URL préprod puis prod.

---

*Document de synthèse pour la chaîne VPS + Portainer + NPM + OVH ; détail UI Portainer : voir `portainer/README.md`.*
