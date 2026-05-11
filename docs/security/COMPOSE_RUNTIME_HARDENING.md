# Durcissement Docker Compose & runtime — suivi des risques

**Rôle** : formaliser l’audit « infra » (secrets, `docker.sock`, utilisateurs conteneur, WAF gateway, Redis, fichiers de backup, bootstrap admin, etc.) et **prioriser** les actions sans casser le **flux développeur local** documenté (`make up-full`, `.env` depuis **`.env.example`**).

**Principe** : le fichier racine **`docker-compose.yml`** reste orienté **développement** (hot reload, profils, valeurs de repli documentées). Le **durcissement strict** (variables obligatoires `${VAR:?message}`, pas de fallback secret, `read_only`, limites CPU/RAM, proxy socket) doit être appliqué via une **stack production** dédiée (fichier compose prod, Portainer, ou `docker-compose.override` local explicitement nommé) une fois les migrations d’images / URLs Redis / proxy socket terminées — voir tableau ci-dessous.

**Documents liés** : **`PLAN.md`** (lot **B14**), **`TODOS.md`** (cases **BX1–BX14**), **`STATUS.md`**, **`docs/operations/PREPROD_PRODUCTION_CHECKLIST.md`**, **`docs/deployment/VPS_PORTAINER_NPM_OVH.md`**, **`docs/security/ACTIVATION_WAF.md`** (WAF gateway / security-service).

---

## Rappel important sur `docker.sock` en « lecture seule »

Monter `/var/run/docker.sock` (**même `:ro`**) dans un conteneur confère en pratique un **contrôle équivalent root sur l’hôte** (création de conteneurs privilégiés, etc.). La mitigation recommandée est un **Docker Socket Proxy** (ex. image Tecnativa) qui n’expose que les opérations nécessaires, ou l’exposition d’une **API métier** limitée côté hôte.

---

## Tableau de priorisation (référence)

| # | Faille / sujet | Service(s) | Priorité | Action cible |
|---|----------------|------------|----------|--------------|
| BX1 | Secrets : fallbacks dangereux / valeurs fixes dans le compose | Tous | Critique | Retirer les secrets par défaut **en prod** ; documenter **`.env.example`** ; fichier compose **prod** avec `${VAR:?required}` **après** pipeline secrets ; en dev, garder des repli **explicitement marqués « dev only »** le temps de la transition. |
| BX2 | `docker.sock` monté directement | api-gateway, monitoring-c, metrics-aggregator, security-service | Critique | Introduire **socket proxy** ou réduire le périmètre ; recenser les endpoints Docker réellement utilisés par chaque service. |
| BX3 | `user: "0:0"` sans nécessité | monitoring-c, metrics-aggregator (security-service : cas particulier firewall) | Critique | **Non-root** dans Dockerfiles + UID/GID alignés volumes ; **security-service** : documenter contrainte **iptables** / alternative sidecar. |
| BX4 | WAF gateway désactivé en dur (ancien état) | api-gateway | Critique | **`${WAF_ENABLED:-true}`** ; **`.env.example`** cible prod-like **`WAF_ENABLED=true`** ; **`false`** en local seulement pour diagnostic. |
| BX5 | Redis sans `requirepass` / ACL | redis + tous les clients | Critique | **`requirepass`** (ou ACL Redis 6+) + harmoniser **`REDIS_URL`** partout ; prévoir étape de migration et tests. |
| BX6 | Fichiers `*.backup.*` versionnés | Dépôt / images | Important | Supprimer du dépôt ; **`gitignore`** / **`dockerignore`** — **fait** pour les backups `server.js.backup.*` gateway (suivi dans **`TODOS.md`**). |
| BX7 | `ADMIN_*` bootstrap dans auth-service | auth-service | Important | Réduire la surface : secrets Docker / init one-shot / rotation ; ne pas laisser des mots de passe **prod** en variable d’environnement persistante sans contrôle. |
| BX8 | `JWT_SECRET` absent ou incohérent | profile-service (corrigé dans le compose) | Important | Aligner **tous** les services qui vérifient des JWT sur la **même** clé que la gateway ; vérifier les profils **`profiles` / `full`**. |
| BX9 | `NET_ADMIN` / `NET_RAW` sans `no-new-privileges` | security-service | Important | Ajouter **`security_opt: no-new-privileges:true`** **si** les tests firewall / iptables passent ; sinon documenter l’exception. |
| BX10 | IP privée en fallback frontend | frontend | Important | Préférer **`localhost`** (ou laisser vide) comme défaut ; **`HOST_IP`** dans **`.env`** pour accès LAN. |
| BX11 | Pas de `read_only` sur les FS conteneur | Services applicatifs | Moyen | `read_only: true` + **`tmpfs`** pour `/tmp` (et chemins d’écriture nécessaires) service par service. |
| BX12 | Pas de limites CPU / mémoire | Tous | Moyen | `deploy.resources` (Swarm) ou équivalent orchestrateur ; en compose pur, documenter **`docker update`** / systemd / Portainer limits. |
| BX13 | Healthcheck Postgres utilisateur/DB hardcodés | postgres | Moyen | Utiliser les variables d’environnement du conteneur (**`POSTGRES_USER`** / **`POSTGRES_DB`**). |
| BX14 | `restart: unless-stopped` sans borne | Tous | Moyen | En prod, politique de redémarrage avec **backoff** / **max_attempts** selon orchestrateur ; surveiller **crash loops**. |

---

## Ce qui est déjà traité dans le dépôt (point de situation)

- **BX6** (partiel) : suppression des fichiers **`backend/api-gateway/src/server.js.backup.*`** et patterns d’ignore — voir commit associé et **`TODOS.md`**.
- **BX4 / BX8 / BX10 / BX13** : correctifs **ciblés** dans **`docker-compose.yml`** lorsque applicable sans migration Redis — voir **`RESOLUTIONS.md`** / **`STATUS.md`** (date du jour).
- **BX5, BX2, BX3, BX11, BX12, BX14** : suivis comme chantiers **transverses** (cases décochées dans **`TODOS.md`** jusqu’à implémentation complète + validation porteur).

---

*Dernière mise à jour : 6 mai 2026 — alignement avec audit externe (Perplexity) et feuille de route interne.*
