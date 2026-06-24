#!/usr/bin/env bash
# Exécute npx playwright depuis le dossier tests/ du dépôt (configs MailHog, etc.).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=load-root-env.sh
source "$ROOT/scripts/testing/load-root-env.sh"
load_root_env_safely "$ROOT/.env"
cd "$ROOT/tests" || exit 1
export MAILHOG_WEB_URL="${MAILHOG_WEB_URL:-http://localhost:8025}"
export API_URL="${API_URL:-http://127.0.0.1:${API_GATEWAY_PORT:-5002}}"
export API_GATEWAY_URL="${API_GATEWAY_URL:-$API_URL}"
npm install --no-audit --no-fund 2>/dev/null || true
exec npx playwright "$@"
