# Resource Budget Sample

- duration_sec: 2400
- interval_sec: 15

| Container | Samples | CPU p95 % | CPU max % | RAM p95 MB | RAM max MB | Block read p95 KB/s | Block write p95 KB/s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `jobbingtrack-metrics-aggregator` | 144 | 93.04 | 121.75 | 588.4 | 740.7 | 0.00 | 1.19 |
| `jobbingtrack-monitoring-c` | 144 | 1.22 | 3.64 | 2.7 | 3.5 | 0.00 | 0.00 |
| `jobbingtrack-log-collector-c` | 144 | 0.00 | 2.39 | 5.1 | 6.0 | 0.00 | 0.00 |
| `jobbingtrack-redis` | 144 | 2.48 | 2.87 | 29.7 | 30.5 | 0.00 | 0.00 |
| `jobbingtrack-frontend` | 144 | 19.61 | 79.68 | 868.4 | 870.8 | 0.00 | 0.00 |
