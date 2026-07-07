#!/usr/bin/env bash
# Audit centralisation API_BASE_URL — échoue si des URLs API hardcodées traînent hors points autorisés.
# Usage : bash scripts/mobile/audit-api-base-url.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MOBILE_LIB="$ROOT/mobile/lib"
FAIL=0

# Fichiers où des literals réseau dev sont acceptés (messages, fallbacks documentés)
ALLOWLIST=(
  "mobile/lib/services/api_service.dart"
  "mobile/lib/utils/notification_load_errors.dart"
)

echo "[audit-api-base-url] Scan URLs hardcodées dans $MOBILE_LIB …"

while IFS= read -r hit; do
  [[ -z "$hit" ]] && continue
  file="${hit%%:*}"
  rel="${file#"$ROOT/"}"
  skip=0
  for allowed in "${ALLOWLIST[@]}"; do
    if [[ "$rel" == "$allowed" ]]; then
      skip=1
      break
    fi
  done
  if [[ "$skip" -eq 1 ]]; then
    continue
  fi
  echo "  KO $hit"
  FAIL=1
done < <(
  rg -n '127\.0\.0\.1:5002|localhost:5002|10\.0\.2\.2:5002' "$MOBILE_LIB" 2>/dev/null || true
)

# Heuristique : fichiers lib utilisant ApiService.baseUrl pour les appels réseau
BASEURL_USAGE=$(rg -l 'ApiService\.baseUrl' "$MOBILE_LIB" 2>/dev/null | wc -l)
echo "[audit-api-base-url] Fichiers lib référençant ApiService.baseUrl : $BASEURL_USAGE"

if [[ "$FAIL" -eq 0 ]]; then
  echo "[audit-api-base-url] OK — pas d'URL API hardcodée hors allowlist"
  exit 0
fi

echo "[audit-api-base-url] FAIL — utiliser ApiService.baseUrl / dart-define API_BASE_URL"
exit 1
