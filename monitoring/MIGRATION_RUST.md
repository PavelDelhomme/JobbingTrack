# Migration Rust du monitoring

## Décision

Rust est le meilleur choix pour la suite des composants bas niveau : il garde un coût CPU/RAM proche du C, mais réduit fortement les risques de fuite mémoire, dépassement de buffer, double free et data race.

## État actuel

- `monitoring/monitoring-c` : actif. Collecte `/proc`, cgroups, Docker socket, health checks et persistance PostgreSQL.
- `monitoring/log-collector-c` : actif. Collecte logs Docker et persistance PostgreSQL.
- `monitoring/metrics-aggregator-c` : prototype C non branché dans Compose.
- `backend/metrics-aggregator-service` : agrégateur actif pour le backoffice, encore en Node.js.
- `monitoring/rust` : workspace de migration, non branché dans Compose tant que les contrats ne sont pas complets.

## Ordre recommandé

1. Porter `log-collector-c` vers `monitoring/rust/crates/log-collector`.
   - État : première implémentation Rust disponible (`/health`, `/api/v1/logs`, lecture `/var/lib/docker/containers`, option `LOG_COLLECTOR_READ_EXISTING`, persistance `log_collector_logs`).
   - Compose : service optionnel `log-collector-rs` sous profil `monitoring-rust`, port hôte `LOG_COLLECTOR_RS_PORT` (`5109` par défaut), non activé par défaut.
   - Risque faible : API externe réduite, mais à valider en charge avant remplacement de `log-collector-c`.
2. Porter `monitoring-c` vers `monitoring/rust/crates/monitoring-agent`.
   - État : conteneur Rust optionnel `monitoring-agent-rs` disponible sous profil `monitoring-rust`, port hôte `MONITORING_RS_PORT` (`5118` par défaut).
   - Contrat minimal porté : port `8015`, `/health`, `/api/v1/metrics` avec métriques système (`/proc/loadavg`, `/proc/meminfo`, `/proc/stat`) et structure JSON compatible.
   - Reste avant bascule : métriques conteneurs Docker/cgroups, réseau par conteneur, health checks services, persistance `system_metrics` / `container_metrics`, historique `/api/v1/persistence/system/metrics`.
   - Risque moyen : données consommées par `jobbingtrack-metrics-aggregator`.
   - Bonnes pratiques à reprendre du correctif C : Docker socket sans shell, cgroups/proc pour CPU/RAM/réseau, requêtes PostgreSQL paramétrées, pas de mutation partagée non protégée, budgets mémoire explicites sur réponses HTTP/Docker.
3. Revoir l'agrégateur.
   - Court terme : garder `backend/metrics-aggregator-service` tant qu'il sert d'API backoffice.
   - Moyen terme : remplacer le prototype `metrics-aggregator-c` par `monitoring/rust/crates/metrics-aggregator`.
   - Basculer seulement quand les endpoints backoffice et tests API sont compatibles.

## Conditions de bascule Compose

- `cargo check --workspace` vert.
- Smoke Docker du binaire Rust concerné.
- Endpoint `/health` compatible.
- Endpoint métier compatible avec le consommateur existant.
- Mesure p95 CPU/RAM/IO au moins 30 minutes après bascule.

## Smoke Rust optionnel

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-rust up -d --build log-collector-rs
curl http://localhost:${LOG_COLLECTOR_RS_PORT:-5109}/health
curl "http://localhost:${LOG_COLLECTOR_RS_PORT:-5109}/api/v1/logs?limit=20"
curl http://localhost:${MONITORING_RS_PORT:-5118}/health
curl http://localhost:${MONITORING_RS_PORT:-5118}/api/v1/metrics
```

Smoke validé localement le 07/05 : `log-collector-rs` `/health` + `/api/v1/logs?limit=3` OK ; `monitoring-agent-rs` `/health` + `/api/v1/metrics` OK. Les conteneurs Rust ont été arrêtés après validation pour ne pas modifier la stack active.
