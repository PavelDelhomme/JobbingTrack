#!/usr/bin/env bash
# Prépare auth + gateway pour Playwright E2E en CI (postgres/redis déjà up via services GHA).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

export NODE_ENV=test
export JT_SKIP_STRICT_ENV=1

export ADMIN_EMAIL="${CI_E2E_ADMIN_EMAIL:-admin@jobbingtrack.test}"
export ADMIN_PASSWORD="${CI_E2E_ADMIN_PASSWORD:-CiE2eAdminPassword123!}"
export TEST_ADMIN_EMAIL="${TEST_ADMIN_EMAIL:-$ADMIN_EMAIL}"
export TEST_ADMIN_PASSWORD="${TEST_ADMIN_PASSWORD:-$ADMIN_PASSWORD}"
export TEST_USER_EMAIL="${TEST_USER_EMAIL:-user@jobbingtrack.test}"
export TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-CiE2eUserPassword123!}"
export E2E_GENERATED_USER_PASSWORD="${E2E_GENERATED_USER_PASSWORD:-$TEST_USER_PASSWORD}"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:jobbingtrack123@localhost:5432/jobbingtrack_test}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export JWT_SECRET="${JWT_SECRET:-ci-jwt-secret-minimum-32-characters-long}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-ci-jwt-refresh-secret-min-32-chars}"
export SECURITY_INTERNAL_SECRET="${SECURITY_INTERNAL_SECRET:-ci-security-internal-secret-value}"
export DEV_TEST_BYPASS_TOKEN="${DEV_TEST_BYPASS_TOKEN:-jtbypass1-ci-github-actions-playwright-e2e-test}"
export PLAYWRIGHT_API_GATEWAY_URL="${PLAYWRIGHT_API_GATEWAY_URL:-http://127.0.0.1:5002}"
export API_URL="${API_URL:-$PLAYWRIGHT_API_GATEWAY_URL}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-$PLAYWRIGHT_API_GATEWAY_URL}"
export NEXT_PUBLIC_AUTH_SERVICE_URL="${NEXT_PUBLIC_AUTH_SERVICE_URL:-$PLAYWRIGHT_API_GATEWAY_URL}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:3000,http://127.0.0.1:3000}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
export APP_URL="${APP_URL:-http://localhost:3000}"
export SECURITY_SERVICE_URL="${SECURITY_SERVICE_URL:-http://127.0.0.1:5017}"
export TRUST_PROXY_HOPS="${TRUST_PROXY_HOPS:-1}"
export WAF_ENABLED="${WAF_ENABLED:-false}"
export RATE_LIMIT_ENABLED="${RATE_LIMIT_ENABLED:-false}"

echo "[ci-e2e] Attente PostgreSQL..."
until pg_isready -h localhost -p 5432 -U postgres >/dev/null 2>&1; do
  sleep 2
done

PGPASSWORD=jobbingtrack123 createdb -h localhost -U postgres -p 5432 jobbingtrack_test 2>/dev/null || true

echo "[ci-e2e] Prisma auth-service (db push + seed)..."
cd "$ROOT/backend/auth-service"
if [ ! -d node_modules/@prisma/client ]; then
  npm ci --prefer-offline --no-audit --loglevel=error
fi
npx prisma db push --skip-generate
npx prisma generate
node prisma/seed.js

echo "[ci-e2e] Démarrage auth-service (5005)..."
(
  cd "$ROOT/backend/auth-service"
  PORT=5005 \
    AUTH_SERVICE_URL=http://127.0.0.1:5005 \
    node src/server.js
) >"$ROOT/tests/results/ci-e2e-auth.log" 2>&1 &
AUTH_PID=$!
echo "$AUTH_PID" >"$ROOT/tests/results/ci-e2e-auth.pid"

echo "[ci-e2e] Démarrage api-gateway (5002)..."
(
  cd "$ROOT/backend/api-gateway"
  if [ ! -d node_modules ]; then
    npm ci --prefer-offline --no-audit --loglevel=error
  fi
  PORT=5002 \
    AUTH_SERVICE_URL=http://127.0.0.1:5005 \
    node src/server.js
) >"$ROOT/tests/results/ci-e2e-gateway.log" 2>&1 &
GATEWAY_PID=$!
echo "$GATEWAY_PID" >"$ROOT/tests/results/ci-e2e-gateway.pid"

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-60}"
  local i=1
  while [ "$i" -le "$attempts" ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "[ci-e2e] $label OK ($url)"
      return 0
    fi
    sleep 2
    i=$((i + 1))
  done
  echo "[ci-e2e] Échec démarrage $label ($url)" >&2
  tail -n 40 "$ROOT/tests/results/ci-e2e-auth.log" 2>/dev/null || true
  tail -n 40 "$ROOT/tests/results/ci-e2e-gateway.log" 2>/dev/null || true
  return 1
}

mkdir -p "$ROOT/tests/results"
wait_for_http "http://127.0.0.1:5005/health" "auth-service"
wait_for_http "http://127.0.0.1:5002/api/v1/health" "api-gateway"

echo "[ci-e2e] Stack E2E prête (auth=$AUTH_PID gateway=$GATEWAY_PID)"
