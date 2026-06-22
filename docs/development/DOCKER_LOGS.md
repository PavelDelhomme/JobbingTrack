# Logs Docker et commandes Make

Dernière mise à jour : 17 juin 2026

## Pourquoi `docker compose logs -f` et `make logs` ne rendent pas la même chose

| Aspect | `docker compose logs -f --tail=100` | `make logs` (cible Makefile) |
|--------|--------------------------------------|--------------------------------|
| **Horodatage** | Souvent absent ou minimal sur la ligne | `-t` : timestamp Docker sur chaque ligne (`2026-06-22T16:47:00.849204051Z`) |
| **Fenêtre** | `--tail=100` seulement (peut remonter loin dans le passé) | Par défaut `--since=24h --tail=500` puis suivi |
| **Couleurs** | Brut (stdout conteneur) | Pipeline `scripts/ops/color-logs.sh` (service magenta, GET cyan, 2xx vert, erreurs rouge) |
| **Bruit** | Tous les conteneurs du profil, y compris health checks toutes les ~15 s | Filtres dédiés : `logs-applicative`, `logs-app`, `logs-metrics`, etc. |
| **Compose** | Fichier et profil passés à la main | `COMPOSE_FILES_ESSENTIAL` / `COMPOSE_FILES_FULL` centralisés dans les Makefiles |

**Recommandation** : pour le debug applicatif (mobile, API gateway, auth), préférer :

```bash
# Équivalent direct du script sous-jacent (sans invoquer make)
LOGS_SINCE=1h LOGS_TAIL=200 bash scripts/ops/logs-watch.sh -f docker-compose.yml --profile full
```

Ou, depuis le Makefile du projet : cible **`logs-applicative`** (sans metrics-aggregator ni monitoring) ou **`logs-app`** (sans redis/postgres).

Pour un seul service :

```bash
docker compose -f docker-compose.yml --profile full logs -f -t --since=1h api-gateway frontend 2>&1 | bash scripts/ops/color-logs.sh
```

## Le préfixe `[undefined]` dans les logs backend

Exemple observé :

```text
2026-06-22T16:46:15.793Z [undefined] info: GET /api/v1/auth/health ...
```

**Cause** : le format Winston (`logger-filter.js`) affiche `[${service}]`, mais la plupart des services Node ne passaient pas `defaultMeta.service` au logger. Seuls `security-service` et `deployment-service` avaient un nom explicite ; les autres affichaient `undefined` malgré `SERVICE_NAME` présent dans `docker-compose.yml`.

**Correctif** (juin 2026) : repli sur `process.env.SERVICE_NAME` dans `backend/shared/logger-filter.js` et copies par service. Après rebuild des conteneurs backend, les lignes deviennent par exemple `[jobbingtrack-auth-service]`.

## Bruit des health checks

En profil `full`, plusieurs acteurs polluent les logs :

- **metrics-aggregator** : sondes `/health` de tous les microservices (~15 s)
- **Docker healthcheck** interne (`HEAD /health`, client `Wget`)
- **frontend** : `GET /health` Next.js

Ce n’est pas un bug de logging : c’est le comportement normal du monitoring. Pour travailler sur une feature :

1. `logs-applicative` ou filtrer un service (`logs-service SERVICE=api-gateway`)
2. Réduire la fenêtre : `LOGS_SINCE=30m LOGS_TAIL=100`
3. Ignorer les lignes contenant `/health` si besoin : `grep -v '/health'`

## Erreur `log-collector-rs: Broken pipe (os error 32)`

Survient quand le client ferme la connexion HTTP avant la fin de la réponse (souvent un health check ou un `Ctrl+C` sur un flux de logs). Ponctuel : pas bloquant. Si récurrent, vérifier que le collecteur Rust est bien joignable depuis le réseau Compose.

## Fichier `LOGS.md` (pilotage)

Le fichier **[LOGS.md](LOGS.md)** à côté de celui-ci est le **journal des décisions de pilotage** (dates, validations porteur), pas la doc des commandes Docker.

## Références

- `makefiles/services/Makefile` — cibles `logs`, `logs-applicative`, `logs-app`, `logs-watch`
- `scripts/ops/color-logs.sh` — colorisation
- `scripts/ops/logs-watch.sh` — reconnexion auto si le flux Docker se coupe
- `docs/getting-started/DEMARRAGE.md` — rappel des cibles logs au démarrage
