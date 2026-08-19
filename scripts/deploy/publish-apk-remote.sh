#!/usr/bin/env bash
# Build (optionnel) + upload APK vers API distante (préprod ou prod).
#
# Usage :
#   DEPLOY_URL=https://api.jobbingtrack.example.com bash scripts/deploy/publish-apk-remote.sh
#   MOBILE_RELEASE_CHANNEL=dev BUILD_FIRST=0 bash scripts/deploy/publish-apk-remote.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env" 2>/dev/null || true
  set +a
fi

DEPLOY_URL="${DEPLOY_URL:-${APP_URL:-https://jobbingtrack.example.com}}"
DEPLOY_URL="${DEPLOY_URL%/}"
API_BASE_URL="${API_BASE_URL:-$DEPLOY_URL}"
API_BASE_URL="${API_BASE_URL%/}"
CHANNEL="${MOBILE_RELEASE_CHANNEL:-dev}"
NOTES="${MOBILE_RELEASE_NOTES:-Publication depuis publish-apk-remote.sh}"
BUILD_FIRST="${BUILD_FIRST:-1}"

APK_DEBUG="$ROOT/mobile/build/app/outputs/flutter-apk/app-debug.apk"
APK_RELEASE="$ROOT/mobile/build/app/outputs/flutter-apk/app-release.apk"

if [[ "$BUILD_FIRST" == "1" ]]; then
  echo "==> Build APK release pour $API_BASE_URL"
  API_BASE_URL="$API_BASE_URL" bash "$ROOT/scripts/mobile/setup/build-apk-release.sh"
fi

APK="$APK_RELEASE"
if [[ ! -f "$APK" ]]; then
  APK="$APK_DEBUG"
fi
if [[ ! -f "$APK" ]]; then
  echo "APK introuvable — lancez build-apk-release.sh ou build-apk-debug.sh" >&2
  exit 1
fi

TOKEN="${ADMIN_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  EMAIL="${ADMIN_EMAIL:-}"
  PASS="${ADMIN_PASSWORD:-}"
  if [[ -z "$EMAIL" || -z "$PASS" ]]; then
    echo "Définis ADMIN_TOKEN ou ADMIN_EMAIL + ADMIN_PASSWORD" >&2
    exit 1
  fi
  echo "==> Login admin $EMAIL @ $API_BASE_URL"
  TOKEN="$(
    curl -fsS -X POST "$API_BASE_URL/api/v1/auth/login" \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
      | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("token") or d.get("data",{}).get("token") or "")'
  )"
fi

if [[ -z "$TOKEN" ]]; then
  echo "Login échoué — pas de token" >&2
  exit 1
fi

VERSION="$(grep '^version:' "$ROOT/mobile/pubspec.yaml" | head -1 | awk '{print $2}' | tr -d \"'\" || echo '1.0.0')"
BUILD="$(grep -E 'versionCode|flutter.versionCode' "$ROOT/mobile/android/app/build.gradle.kts" 2>/dev/null | head -1 | grep -oE '[0-9]+' || echo '1')"

echo "==> Upload canal $CHANNEL → $API_BASE_URL/api/v1/admin/mobile/releases/upload"
echo "    fichier : $APK ($(du -h "$APK" | cut -f1)) · $VERSION+$BUILD"

curl -fsS -X POST "$API_BASE_URL/api/v1/admin/mobile/releases/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "apk=@${APK}" \
  -F "channel=${CHANNEL}" \
  -F "platform=android" \
  -F "version=${VERSION}" \
  -F "buildNumber=${BUILD}" \
  -F "releaseNotes=${NOTES}" \
  | python3 -m json.tool

echo ""
echo "==> OK — OTA : GET $API_BASE_URL/api/v1/mobile/releases/latest?platform=android&channel=${CHANNEL}"
echo "    Backoffice : $DEPLOY_URL/backoffice/mobile/releases"
