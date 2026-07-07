#!/usr/bin/env bash
# BL-26-01 : Playwright admin-emails-mailhog — 3/3 avec auth-service → MailHog.
# Usage : scripts/testing/run-playwright-mailhog-e2e.sh
# Restaure le SMTP .env après les tests (recreate auth-service).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=load-root-env.sh
source "$ROOT/scripts/testing/load-root-env.sh"
load_root_env_safely "$ROOT/.env"

if ! curl -sf "${MAILHOG_WEB_URL:-http://127.0.0.1:8025}/" >/dev/null; then
  echo "MailHog indisponible — démarrer la stack (profile mail) puis relancer." >&2
  exit 1
fi

echo "=== Bascule auth-service → SMTP MailHog (1025) ==="
SMTP_HOST=mailhog SMTP_PORT=1025 SMTP_USER=mailhog SMTP_PASS=mailhog \
  SMTP_SECURE=false SMTP_USE_SSL=false \
  docker compose -f "$ROOT/docker-compose.yml" up -d auth-service --force-recreate

cleanup() {
  echo "=== Restauration auth-service SMTP (.env) ==="
  docker compose -f "$ROOT/docker-compose.yml" up -d auth-service --force-recreate >/dev/null
}
trap cleanup EXIT

sleep 8

echo "=== Playwright admin-emails-mailhog.spec.ts ==="
bash "$ROOT/scripts/testing/playwright-tests-dir.sh" test \
  e2e/specs/admin-emails-mailhog.spec.ts \
  --config=e2e/playwright.mailhog.config.ts \
  --project=chromium \
  --reporter=list

echo "OK — 3 tests MailHog Playwright"
