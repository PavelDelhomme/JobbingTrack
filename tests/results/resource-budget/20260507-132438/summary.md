# Resource Budget Sample

- duration_sec: 600
- interval_sec: 15

| Container | Samples | CPU p95 % | CPU max % | RAM p95 MB | RAM max MB | Block read p95 KB/s | Block write p95 KB/s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `jobbingtrack-metrics-aggregator` | 37 | 9.46 | 43.38 | 155.6 | 191.5 | 0.00 | 0.95 |
| `jobbingtrack-monitoring-c` | 37 | 0.28 | 2.13 | 2.8 | 3.4 | 0.00 | 0.00 |
| `jobbingtrack-log-collector-c` | 37 | 0.00 | 2.17 | 5.3 | 5.6 | 0.00 | 0.00 |
| `jobbingtrack-redis` | 37 | 2.51 | 3.01 | 30.1 | 30.1 | 0.00 | 0.00 |
| `jobbingtrack-frontend` | 37 | 3.27 | 4.82 | 197.9 | 199.0 | 0.00 | 0.00 |
