# Resource Budget Sample

- duration_sec: 6
- interval_sec: 2

| Container | Samples | CPU p95 % | CPU max % | RAM p95 MB | RAM max MB | Block read p95 KB/s | Block write p95 KB/s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `jobbingtrack-metrics-aggregator` | 2 | 0.68 | 0.72 | 193.4 | 193.4 | 0.00 | 0.00 |
| `jobbingtrack-monitoring-c` | 2 | 0.00 | 0.00 | 2.3 | 2.3 | 0.00 | 0.00 |
| `jobbingtrack-log-collector-c` | 2 | 0.00 | 0.00 | 5.2 | 5.3 | 0.00 | 0.00 |
| `jobbingtrack-redis` | 2 | 0.33 | 0.33 | 29.5 | 29.5 | 0.00 | 0.00 |
| `jobbingtrack-frontend` | 2 | 17.31 | 17.50 | 869.5 | 869.5 | 0.00 | 0.00 |
