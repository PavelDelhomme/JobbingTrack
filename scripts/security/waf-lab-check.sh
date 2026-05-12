#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
TARGET="${WAF_LAB_TARGET:-${DEV_HTTPS_API_URL:-https://api.jobbingtrack.localhost:5443}}"
CA_CERT="${WAF_LAB_CA_CERT:-$ROOT_DIR/.local/dev-certs/ca/jobbingtrack-dev-root-ca.pem}"
PAYLOAD_PATH="/health?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E"
STATUS=0

curl_args=(--silent --show-error --location --max-time "${WAF_LAB_TIMEOUT_SEC:-10}")
if [[ "$TARGET" == https://* ]] && [ -s "$CA_CERT" ]; then
  curl_args+=(--cacert "$CA_CERT")
fi

request() {
  local label="$1"
  local url="$2"
  shift 2
  local out
  out="$(mktemp)"
  local code
  code="$(curl "${curl_args[@]}" "$@" --output "$out" --write-out '%{http_code}' "$url" || true)"
  printf '%s\t%s\t%s\n' "$label" "$code" "$out"
}

expect_code() {
  local label="$1"
  local code="$2"
  local accepted="$3"
  for expected in $accepted; do
    if [ "$code" = "$expected" ]; then
      echo "✅ $label: HTTP $code"
      return 0
    fi
  done
  echo "❌ $label: HTTP $code attendu $accepted"
  STATUS=1
}

echo "🧪 WAF lab check borné"
echo "Target: $TARGET"
echo "Payload: $PAYLOAD_PATH"
echo ""

IFS=$'\t' read -r label code body < <(request "benign-health" "$TARGET/health")
expect_code "$label" "$code" "200"
rm -f "$body"

IFS=$'\t' read -r label code body < <(request "external-waf-block" "$TARGET$PAYLOAD_PATH" -H "User-Agent: JobbingTrack-WAF-Lab/1.0")
expect_code "$label" "$code" "400 403"
if [ "$code" = "400" ] || [ "$code" = "403" ]; then
  if ! rg -q "WAF_BLOCKED|Requête bloquée|Paramètres invalides|potentiellement malveillante" "$body" 2>/dev/null; then
    echo "⚠️  $label: blocage HTTP OK mais corps inattendu"
  fi
fi
rm -f "$body"

if [ -n "${SECURITY_INTERNAL_SECRET:-}" ]; then
  IFS=$'\t' read -r label code body < <(request "trusted-internal-bypass" "$TARGET$PAYLOAD_PATH" \
    -H "User-Agent: JobbingTrack-WAF-Lab/1.0" \
    -H "X-Internal-Secret: ${SECURITY_INTERNAL_SECRET}")
  expect_code "$label" "$code" "200"
  rm -f "$body"
else
  echo "ℹ️  trusted-internal-bypass ignoré: SECURITY_INTERNAL_SECRET absent de l'environnement shell"
fi

echo ""
if [ "$STATUS" = "0" ]; then
  echo "✅ WAF lab check terminé"
else
  echo "❌ WAF lab check en échec"
fi
exit "$STATUS"
