# Intégration du système de monitoring – JobbingTrack

Ce document décrit l’architecture du monitoring après déplacement des collecteurs dans `ex-systems/` et leur intégration progressive.

---

## Architecture cible

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ex-systems/monitoring-c (C)                                            │
│  • Collecte CPU, mémoire, disque, réseau, load                          │
│  • Health checks HTTP des conteneurs (port interne Docker)               │
│  • Persistance optionnelle dans system_metrics (PostgreSQL)              │
│  • API : GET /api/v1/metrics                                            │
│  • Port : 8015 (interne) → 5098 (hôte)                                 │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  backend/metrics-aggregator-service (Node.js)                            │
│  • Récupère les métriques depuis monitoring-c (MONITORING_C_URL)         │
│  • Fallback : collecte propre (systeminformation + Docker) si C absent  │
│  • Persistance : SystemMetricsSnapshot, ContainerMetricsSnapshot (Prisma)│
│  • API unique backoffice : GET /api/v1/metrics (payload complet)         │
│  • Historique : GET /api/v1/persistence/system/metrics                   │
│  • Port : 3014 (interne) → 5004 (hôte)                                  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend (backoffice)                                                  │
│  • Vue d’ensemble, Performances & Analytics, graphiques                   │
│  • Appel prioritaire : metrics-aggregator (NEXT_PUBLIC_METRICS_AGGREGATOR_URL)│
│  • Fallback : monitoring-c direct si aggregator indisponible            │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Une seule entrée backoffice** : le frontend utilise en priorité **metrics-aggregator** (données déjà agrégées et persistées).
- **monitoring-c** : collecteur léger en C (ex-systems) ; optionnel si l’aggregator fait le fallback Node.

---

## Démarrage

### Stack complète (avec monitoring)

```bash
make up-full
# ou
make up
```

Démarre postgres, redis, api-gateway, frontend, auth, dashboard, profil `full`, puis **profil `monitoring`** (monitoring-c + metrics-aggregator).

### Stack monitoring seule

Pour ne lancer que Postgres + monitoring-c + metrics-aggregator (tests, debug) :

```bash
make up-monitoring
```

- **monitoring-c** : http://localhost:5098  
- **metrics-aggregator** : http://localhost:5004  

### Avec Docker Compose directement

```bash
# Profil monitoring (depuis docker-compose.yml principal)
docker compose --profile monitoring up -d monitoring-c jobbingtrack-metrics-aggregator

# Postgres doit être déjà démarré
docker compose up -d postgres
docker compose --profile monitoring up -d monitoring-c jobbingtrack-metrics-aggregator
```

---

## Fichiers concernés

| Élément | Emplacement |
|--------|-------------|
| Collecteur C | `ex-systems/monitoring-c` (build context dans docker-compose.yml) |
| Log collector C | `ex-systems/log-collector-c` (docker-compose.monitoring.yml, profil optionnel) |
| API agrégateur | `backend/metrics-aggregator-service` |
| Définition monitoring-c dans le compose principal | `docker-compose.yml` (service `monitoring-c`, profil `monitoring`) |
| Définition log-collector + monitoring (fichier dédié) | `docker-compose.monitoring.yml` (contexte `ex-systems/log-collector-c`) |

---

## Données et persistance

- **monitoring-c** : peut écrire dans la table `system_metrics` (script SQL dans `ex-systems/monitoring-c/sql/`).
- **metrics-aggregator** : écrit dans les tables Prisma `system_metrics_snapshots`, `container_metrics_snapshots`, etc.
- **Historique API** : `GET /api/v1/persistence/system/metrics?limit=200&startDate=...&endDate=...` lit d’abord `system_metrics`, puis en **fallback** `system_metrics_snapshots` si la table monitoring-c est vide ou absente.

---

## Vérifications rapides

1. **monitoring-c actif**  
   ```bash
   curl -s http://localhost:5098/api/v1/metrics | jq .
   ```

2. **metrics-aggregator actif**  
   ```bash
   curl -s http://localhost:5004/api/v1/metrics | jq .
   ```

3. **Historique**  
   ```bash
   curl -s "http://localhost:5004/api/v1/persistence/system/metrics?limit=5" | jq .
   ```

4. **Logs**  
   ```bash
   docker logs jobbingtrack-monitoring-c -f
   docker logs jobbingtrack-metrics-aggregator -f
   ```

---

## Évolutions prévues

- Intégration **log-collector-c** (ex-systems) pour les logs conteneurs et système.
- Unification éventuelle avec un **data-aggregator** unique (métriques + logs) selon la roadmap projet.
