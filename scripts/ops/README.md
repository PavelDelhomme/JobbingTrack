# Scripts ops

Outils opérationnels permanents et smokes admin. Les campagnes de validation ponctuelles et rapports HTML figés sont dans **`scripts/legacy/ops/`**.

## Outils permanents

| Script | Rôle |
|--------|------|
| `inventory-scripts.cjs` | Inventaire scripts/ (`node scripts/ops/inventory-scripts.cjs`) |
| `bootstrap-admin-email-agent.cjs` | Active agent + boîte IMAP porteur |
| `reset-email-agent-triage-seed.cjs` | Reset 3 emails PENDING triage |
| `list-email-logs.cjs` | Liste EmailLog récents |
| `load-root-env.cjs` | Charge `.env` sans sourcer |
| `send-agent-recap-email.cjs` | Envoi récap agent |
| `send-test-agent-digest.cjs` | Test digest (manuel) |
| `schedule-agent-recap-email.sh` | Cron récap |
| `dev-https-certs.sh` | CA HTTPS dev |
| `logs-watch.sh`, `color-logs.sh`, `status-watch-loop.sh`, `timed-make.sh`, `make-menu.sh` | Ops Make |
| `ensure-dashboard-service-ready.sh` | Attente dashboard |
| `validate-central-logging-compose.cjs` | Valide compose logging |
| `smoke-*.cjs` | Smokes API statistics / logging / backoffice URLs |
| `fix-all.sh` | Enchaîne `env-check` + `db-push-all` + `diagnostic-metrics` (dépannage local) |

## Archivé (legacy)

- **`legacy/ops/campaigns/`** — `run-statistics-*-validation-with-report.sh`, P1C UX, corrélation perf
- **`legacy/ops/reports/`** — récap HTML mobile juin 2026
