# Resource Budget Sample

- duration_sec: 300
- interval_sec: 15

| Container | Samples | CPU p95 % | CPU max % | RAM p95 MB | RAM max MB | Block read p95 KB/s | Block write p95 KB/s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `jobbingtrack-metrics-aggregator` | 19 | 13.22 | 86.85 | 145.4 | 145.6 | 0.00 | 0.47 |
| `jobbingtrack-monitoring-c` | 19 | 2.17 | 2.56 | 3.7 | 4.4 | 0.00 | 0.00 |
| `jobbingtrack-log-collector-c` | 19 | 0.20 | 2.04 | 5.9 | 6.0 | 0.00 | 0.00 |
| `jobbingtrack-redis` | 19 | 2.73 | 3.05 | 29.8 | 29.8 | 0.00 | 0.00 |
| `jobbingtrack-frontend` | 19 | 2.76 | 3.21 | 203.6 | 203.6 | 0.00 | 0.03 |
