# Monitoring Rust Workspace

Migration progressive des composants monitoring bas niveau vers Rust.

## Objectif

`monitoring-agent-rs` et `log-collector-rs` sont maintenant les sources actives par défaut pour les métriques bas niveau et les logs Docker. Les services C restent disponibles en fallback legacy tant que la mesure longue et le retrait complet ne sont pas terminés.

## Crates

- `monitoring-agent` : remplaçant Rust actif de `monitoring/monitoring-c` pour les métriques système/conteneurs, health checks et persistance `system_metrics` / `container_metrics`.
- `log-collector` : remplaçant Rust actif de `monitoring/log-collector-c` avec lecture des logs Docker, persistance PostgreSQL et API `/api/v1/logs`.
- `metrics-aggregator` : expérimentation Rust pour remplacer le prototype `monitoring/metrics-aggregator-c`, puis éventuellement réduire le rôle du service Node.

## Validation

```bash
cd monitoring/rust
cargo check --workspace
cargo clippy --workspace -- -D warnings
```

Smoke Docker :

```bash
docker compose -f ../../docker-compose.yml -f ../../docker-compose.monitoring.yml up -d --build monitoring-agent-rs jobbingtrack-metrics-aggregator
curl http://localhost:${MONITORING_RS_PORT:-5118}/api/v1/metrics
docker compose -f ../../docker-compose.yml -f ../../docker-compose.monitoring.yml up -d --build log-collector-rs
curl "http://localhost:${LOG_COLLECTOR_RS_PORT:-5099}/api/v1/logs?limit=3"
```

Comparaison `monitoring-c` / `monitoring-agent-rs` :

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-rust up -d --build monitoring-agent-rs
python scripts/monitoring/compare-monitoring-agents.py
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-rust stop monitoring-agent-rs
```

## Règle de migration

Ne retirer le fallback C qu'après smoke test, comparaison C/Rust et mesure p95 longue sans régression.
