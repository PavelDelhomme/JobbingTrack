#!/usr/bin/env bash
# Build + publish OTA des 3 canaux (dev / preprod / production) — style GasoilTracking / YTMusic.
#
# Usage :
#   bash scripts/mobile/setup/publish-ota-all-channels.sh
#   SKIP_BUILD=1 bash scripts/mobile/setup/publish-ota-all-channels.sh   # republier APKs déjà buildés
#   CHANNELS="production" bash ...                                       # un seul canal
#
# Chaque flavor embarque le bon API_BASE_URL + MOBILE_RELEASE_CHANNEL.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

LAN_IP="${MOBILE_DEV_LAN_HOST:-${DEV_HTTPS_LAN_IP:-}}"
if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}' || true)"
fi
LAN_IP="${LAN_IP:-192.168.1.134}"
LOCAL_API="http://${LAN_IP}:5002"
PREPROD_API="${MOBILE_PREPROD_API_URL:-https://api-preprod.jobbingtrack.com}"
PROD_API="${MOBILE_PROD_API_URL:-https://api.jobbingtrack.com}"

ADMIN_EMAIL="$(python3 -c "from pathlib import Path
for line in Path('$ROOT/.env').read_text().splitlines():
  if line.startswith('ADMIN_EMAIL='): print(line.split('=',1)[1].strip().strip(chr(34))); break" 2>/dev/null || true)"
ADMIN_PASSWORD="$(python3 -c "from pathlib import Path
for line in Path('$ROOT/.env').read_text().splitlines():
  if line.startswith('ADMIN_PASSWORD='): print(line.split('=',1)[1].strip().strip(chr(34))); break" 2>/dev/null || true)"

NOTES="${MOBILE_RELEASE_NOTES:-OTA multi-canaux JobbingTrack (aligné GasoilTracking / YTMusic)}"
SKIP_BUILD="${SKIP_BUILD:-0}"
CHANNELS_RAW="${CHANNELS:-dev preprod production}"

publish_one() {
  local flavor="$1" api="$2" channel="$3"
  local apk="$ROOT/mobile/build/app/outputs/flutter-apk/app-${flavor}-release.apk"
  local copy="$ROOT/deploy/production/mobile-releases/jobbingtrack-${flavor}-$(awk '/^version:/ {print $2}' "$ROOT/mobile/pubspec.yaml" | tr -d '"').apk"

  if [[ "$SKIP_BUILD" != "1" ]]; then
    echo ""
    echo "======== BUILD $flavor → $api (channel=$channel) ========"
    API_BASE_URL="$api" \
      MOBILE_RELEASE_CHANNEL="$channel" \
      FLAVOR="$flavor" \
      SKIP_CLEAN=1 \
      bash "$ROOT/scripts/mobile/setup/build-apk-release.sh"
  fi

  if [[ ! -f "$apk" ]]; then
    echo "APK manquant: $apk" >&2
    return 1
  fi
  mkdir -p "$(dirname "$copy")"
  cp -f "$apk" "$copy"

  echo ""
  echo "======== PUBLISH OTA $flavor → $api #$channel ========"
  BUILD_FIRST=0 \
    APK_PATH="$apk" \
    DEPLOY_URL="$api" \
    API_BASE_URL="$api" \
    MOBILE_RELEASE_CHANNEL="$channel" \
    ADMIN_EMAIL="${ADMIN_EMAIL:-}" \
    ADMIN_PASSWORD="${ADMIN_PASSWORD:-}" \
    MOBILE_RELEASE_NOTES="$NOTES" \
    bash "$ROOT/scripts/deploy/publish-apk-remote.sh"
}

for ch in $CHANNELS_RAW; do
  case "$ch" in
    production|prod)
      publish_one prod "$PROD_API" production
      ;;
    preprod)
      publish_one preprod "$PREPROD_API" preprod || publish_one preprod "$PREPROD_API" dev
      ;;
    dev)
      publish_one dev "$LOCAL_API" dev || {
        echo "WARN: publish dev vers $LOCAL_API a échoué — tentative API prod canal=dev" >&2
        publish_one dev "$PROD_API" dev
      }
      ;;
    *)
      echo "Canal inconnu: $ch (dev|preprod|production)" >&2
      exit 1
      ;;
  esac
done

echo ""
echo "==> Vérification OTA"
for pair in "production|https://api.jobbingtrack.com" "preprod|https://api-preprod.jobbingtrack.com" "dev|https://api.jobbingtrack.com"; do
  ch="${pair%%|*}"
  api="${pair##*|}"
  echo -n "  $ch @ $api : "
  curl -fsS "$api/api/v1/mobile/releases/latest?platform=android&channel=$ch" 2>/dev/null \
    | python3 -c 'import sys,json
d=json.load(sys.stdin); r=d.get("release") or {}
print("v%s+%s dl=%s" % (r.get("version"), r.get("buildNumber"), bool(r.get("downloadUrl"))))' \
    2>/dev/null || echo "(indisponible)"
done

echo ""
echo "OK — OTA multi-canaux terminé."
