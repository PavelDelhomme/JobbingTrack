#!/usr/bin/env bash
# Sonde menaces scoped : uniquement ce processus (pas de proxy système).
# Usage :
#   bash scripts/security/smoke-threat-probe-scoped.sh
#   JT_SMOKE_TARGET=https://jobbingtrack.com bash scripts/security/smoke-threat-probe-scoped.sh
# Proxy optionnel UNIQUEMENT pour ce script :
#   JT_SMOKE_PROXY=socks5h://127.0.0.1:1080 bash scripts/security/smoke-threat-probe-scoped.sh
set -euo pipefail

TARGET="${JT_SMOKE_TARGET:-https://jobbingtrack.com}"
UA="${JT_SMOKE_UA:-JT-Security-Smoke/1.0}"

# Ne pas hériter d'un proxy machine (autres projets) sauf JT_SMOKE_PROXY explicite.
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy || true
CURL_PROXY_ARGS=()
if [[ -n "${JT_SMOKE_PROXY:-}" ]]; then
  CURL_PROXY_ARGS=(--proxy "$JT_SMOKE_PROXY")
  echo "==> Proxy scoped (ce process seulement): $JT_SMOKE_PROXY"
else
  echo "==> Aucun proxy (curl direct, env proxy vidé pour ce process)"
fi

PATHS=(
  "/media../.env"
  "/api/v1/%27%20OR%20%271%27%3D%271"
  "/api/v1/?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E"
)

echo "==> Cible: $TARGET"
for p in "${PATHS[@]}"; do
  url="${TARGET}${p}"
  code="$(
    curl -sS -o /dev/null -w '%{http_code}' \
      --max-time 20 \
      -A "$UA" \
      "${CURL_PROXY_ARGS[@]}" \
      --path-as-is \
      "$url" || echo "000"
  )"
  echo "  [$code] $p"
done

echo "==> Vérifier ensuite /backoffice/security/logs et /backoffice/security/firewall#liste-ips-a-risque"
