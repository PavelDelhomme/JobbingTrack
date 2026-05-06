# Convention — variables d’environnement dans les fichiers `docker-compose*.yml`

**But** : retrouver vite les clés dans les stacks **Portainer** et limiter les oublis lors des ajouts.

## Règles

1. **Source de noms** : préférer les mêmes noms que dans **`.env.example`** (ports `*_PORT` / `*_INTERNAL_PORT`, URLs `*_SERVICE_URL`, etc.).
2. **Ordre dans un bloc `environment:`** : tri **alphabétique** par nom de variable lors de **chaque modification** du service ; pas d’obligation de tout réordonner historiquement en une seule PR.
3. **Réseau Docker** : les **hostnames** HTTP entre conteneurs suivent le **nom du service** Compose (`auth-service`, `jobbingtrack-metrics-aggregator`, …), pas uniquement le `container_name`.
4. **Secrets** : ne pas dupliquer des valeurs secrètes en dur dans les YAML — utiliser **`${VAR}`** et injecter via **`.env`** (local) ou **secrets** (prod).

## Fichiers du dépôt

| Fichier | Rôle |
|---------|------|
| `docker-compose.yml` | Stack dev principale |
| `docker-compose.monitoring.yml` | Monitoring additionnel |
| `docker-compose.prod.yml` / `production/*` | Pistes prod — à aligner sur les mêmes noms de variables |
| `docker-compose.test.yml`, `tests/docker-compose.test.yml` | Bases / tests — mêmes règles |

**État (6 mai 2026)** : blocs `environment` réordonnés par **nom de variable A→Z** dans **`docker-compose.yml`**, **`docker-compose.monitoring.yml`** (alignement `COLLECTION_INTERVAL` → **`METRICS_COLLECTION_INTERVAL_SEC`**), **`docker-compose.prod.yml`**, **`docker-compose.test.yml`**, **`tests/docker-compose.test.yml`**. Les autres `docker-compose*.yml` (sous-dossiers) : appliquer la même règle au fil des modifications.

---

*6 mai 2026.*
