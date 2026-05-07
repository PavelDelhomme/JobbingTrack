# Monitoring Rust Workspace

Migration progressive des composants monitoring bas niveau vers Rust.

## Objectif

Les services C restent la source active tant que les binaires Rust ne sont pas compatibles avec les contrats existants. Les crates Rust doivent reprendre les mêmes ports, variables d'environnement, endpoints HTTP et tables PostgreSQL avant d'être branchées dans Docker Compose.

## Crates

- `monitoring-agent` : futur remplaçant de `monitoring/monitoring-c` pour les métriques système/conteneurs, health checks et persistance `system_metrics` / `container_metrics`.
- `log-collector` : remplaçant Rust en cours de validation pour `monitoring/log-collector-c` avec lecture des logs Docker, persistance PostgreSQL et API `/api/v1/logs`.
- `metrics-aggregator` : expérimentation Rust pour remplacer le prototype `monitoring/metrics-aggregator-c`, puis éventuellement réduire le rôle du service Node.

## Validation

```bash
cd monitoring/rust
cargo check --workspace
```

Smoke Docker optionnel :

```bash
docker compose -f ../../docker-compose.yml -f ../../docker-compose.monitoring.yml --profile monitoring-rust up -d --build log-collector-rs
```

## Règle de migration

Ne pas basculer Compose vers un binaire Rust tant que le contrat HTTP/DB correspondant n'est pas couvert par smoke test.
