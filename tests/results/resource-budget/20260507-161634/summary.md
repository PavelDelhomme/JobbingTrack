# Resource Budget Sample

- duration_sec: 300
- interval_sec: 15

| Container | Samples | CPU p95 % | CPU max % | RAM p95 MB | RAM max MB | Block read p95 KB/s | Block write p95 KB/s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `jobbingtrack-metrics-aggregator` | 19 | 0.34 | 3.15 | 147.0 | 188.3 | 0.00 | 0.46 |
| `jobbingtrack-monitoring-agent-rs` | 19 | 0.00 | 0.03 | 1.2 | 1.9 | 0.00 | 0.00 |
| `jobbingtrack-log-collector-rs` | 19 | 0.10 | 0.32 | 1.4 | 1.4 | 0.00 | 0.00 |
| `jobbingtrack-redis` | 19 | 2.50 | 2.55 | 12.0 | 12.3 | 0.00 | 0.00 |
| `jobbingtrack-frontend` | 19 | 3.31 | 3.34 | 208.2 | 208.3 | 0.00 | 0.03 |
