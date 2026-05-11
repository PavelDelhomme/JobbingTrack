# Migration Rust du monitoring

## Décision

Rust est le meilleur choix pour la suite des composants bas niveau : il garde un coût CPU/RAM proche du C, mais réduit fortement les risques de fuite mémoire, dépassement de buffer, double free et data race.

## État actuel

- `monitoring/rust/crates/monitoring-agent` : actif par défaut dans Compose. Collecte `/proc`, cgroups, Docker socket, health checks et persistance PostgreSQL.
- `monitoring/monitoring-c` : fallback legacy sous profil `monitoring`, gardé temporairement pendant la fenêtre de mesure et de retrait.
- `monitoring/rust/crates/log-collector` : actif par défaut dans Compose. Collecte logs Docker et persistance PostgreSQL.
- `monitoring/log-collector-c` : fallback legacy sous profil `monitoring-c`, gardé temporairement pendant la fenêtre de mesure et de retrait.
- `monitoring/metrics-aggregator-c` : prototype C non branché dans Compose.
- `backend/metrics-aggregator-service` : agrégateur actif pour le backoffice, encore en Node.js.
- `monitoring/rust` : workspace de migration branché pour `monitoring-agent-rs` et `log-collector-rs`.

## Ordre recommandé

1. Porter `log-collector-c` vers `monitoring/rust/crates/log-collector`.
   - État : première implémentation Rust disponible (`/health`, `/api/v1/logs`, lecture `/var/lib/docker/containers`, option `LOG_COLLECTOR_READ_EXISTING`, persistance `log_collector_logs`).
   - Compose : service `log-collector-rs` actif par défaut sous profils `monitoring` / `full`, port hôte `LOG_COLLECTOR_RS_PORT` (`5099` par défaut).
   - `log-collector-c` reste disponible en fallback legacy sous profil `monitoring-c`, port hôte `LOG_COLLECTOR_C_LEGACY_PORT` (`5109` par défaut).
   - Reste après bascule : mesure p95 longue et validation sous volume de logs réel avant retrait du fallback C.
2. Porter `monitoring-c` vers `monitoring/rust/crates/monitoring-agent`.
   - État : conteneur Rust `monitoring-agent-rs` branché par défaut dans `docker-compose.yml`, port hôte `MONITORING_RS_PORT` (`5118` par défaut).
   - Contrat porté : port `8015`, `/health`, `/api/v1/metrics` avec métriques système (`/proc/loadavg`, `/proc/meminfo`, `/proc/stat`), inventaire Docker socket, mémoire/CPU cgroups v2, réseau par conteneur via `/proc/<pid>/net/dev`, health checks HTTP parallèles et persistance PostgreSQL.
   - Architecture Rust : modules séparés (`config`, `constants`, `docker`, `procfs`, `metrics`, `http`, `types`), constantes centralisées, état mutable isolé dans `MetricsCollector`, erreurs opérationnelles sur stderr.
   - Historique : `/api/v1/persistence/system/metrics` disponible avec `limit`, `offset`, `startDate`, `endDate`.
   - Reste après bascule : mesure p95 longue, puis retrait du service C si aucune régression n'apparaît.
   - Risque moyen : données consommées par `jobbingtrack-metrics-aggregator`.
   - Bonnes pratiques à reprendre du correctif C : Docker socket sans shell, cgroups/proc pour CPU/RAM/réseau, requêtes PostgreSQL paramétrées, pas de mutation partagée non protégée, budgets mémoire explicites sur réponses HTTP/Docker.
3. Revoir l'agrégateur.
   - Court terme : garder `backend/metrics-aggregator-service` tant qu'il sert d'API backoffice.
   - Moyen terme : remplacer le prototype `metrics-aggregator-c` par `monitoring/rust/crates/metrics-aggregator`.
   - Basculer seulement quand les endpoints backoffice et tests API sont compatibles.

## Conditions de bascule Compose

- `cargo check --workspace` vert.
- `cargo clippy --workspace -- -D warnings` vert.
- Smoke Docker du binaire Rust concerné.
- Endpoint `/health` compatible.
- Endpoint métier compatible avec le consommateur existant.
- `python scripts/monitoring/compare-monitoring-agents.py` vert contre `monitoring-c` et `monitoring-agent-rs`.
- Mesure p95 CPU/RAM/IO au moins 30 minutes après bascule.

## Smoke Rust optionnel

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-rust up -d --build log-collector-rs
curl http://localhost:${LOG_COLLECTOR_RS_PORT:-5109}/health
curl "http://localhost:${LOG_COLLECTOR_RS_PORT:-5109}/api/v1/logs?limit=20"
curl http://localhost:${MONITORING_RS_PORT:-5118}/health
curl http://localhost:${MONITORING_RS_PORT:-5118}/api/v1/metrics
python scripts/monitoring/compare-monitoring-agents.py
```

Smoke validé localement le 07/05 : `log-collector-rs` `/health` + `/api/v1/logs?limit=3` OK ; `monitoring-agent-rs` `/health` + `/api/v1/metrics` OK avec conteneurs JobbingTrack détectés via Docker socket, mémoire/réseau non nuls, health checks services et insertion PostgreSQL. `/api/v1/persistence/system/metrics?limit=3` renvoie `success: true`.

Comparaison C/Rust validée localement le 07/05 : `scripts/monitoring/compare-monitoring-agents.py` OK, recouvrement conteneurs `22/22`, écart disponibilité `3.75` points, historique OK. Bascule Compose effectuée : `jobbingtrack-metrics-aggregator` consomme `MONITORING_AGENT_URL=http://monitoring-agent-rs:8015` par défaut, avec `MONITORING_C_URL` conservé comme fallback legacy. Validation après bascule : 23 conteneurs consommés depuis Rust et sauvegardés ; `monitoring-c` arrêté et retiré de la stack active.

Bascule logs validée localement le 07/05 : `log-collector-rs` actif par défaut sur `LOG_COLLECTOR_RS_PORT=5099`, `/health` OK, `/api/v1/logs?limit=3` renvoie `success: true`. `log-collector-c` a été arrêté et retiré de la stack active ; il reste disponible en fallback legacy sur `LOG_COLLECTOR_C_LEGACY_PORT=5109`.

Contrôle ressources court post-bascule Rust (`tests/results/resource-budget/20260507-161634/summary.md`, 5 min) : `metrics-aggregator` CPU p95 `0.34%` / RAM p95 `147.0 MB`, `monitoring-agent-rs` CPU p95 `0.00%` / RAM p95 `1.2 MB`, `log-collector-rs` CPU p95 `0.10%` / RAM p95 `1.4 MB`, `frontend` CPU p95 `3.31%` / RAM p95 `208.2 MB`. Correction appliquée sur `log-collector-rs` après un premier contrôle à `~46%` CPU p95 : filtrage JobbingTrack, skip des fichiers inchangés, cast timestamp PostgreSQL corrigé.
