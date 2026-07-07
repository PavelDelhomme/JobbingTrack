#!/usr/bin/env bash
# Audit toolchain Node/npm + alignement manifeste + npm outdated (BL-DEP-02).
# Usage : bash scripts/deps/audit-toolchain.sh [--skip-outdated]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKIP_OUTDATED=0
if [[ "${1:-}" == "--skip-outdated" ]]; then
  SKIP_OUTDATED=1
fi

MANIFEST_YAML="$ROOT/deploy/releases/platform-manifest.yaml"
MANIFEST_JSON="$ROOT/deploy/releases/platform-manifest.json"

echo "=== JobbingTrack — audit toolchain (BL-DEP-02) ==="
echo "Date: $(date -Iseconds)"
echo

echo "[Runtime local]"
if command -v node >/dev/null 2>&1; then
  echo "  node: $(node -v)"
else
  echo "  node: indisponible"
fi
if command -v npm >/dev/null 2>&1; then
  echo "  npm:  $(npm -v)"
else
  echo "  npm: indisponible"
fi
echo

echo "[Manifeste plateforme]"
if [[ -f "$MANIFEST_YAML" ]]; then
  echo "  yaml: $MANIFEST_YAML"
  awk '/^platformRelease:/ {print "  platformRelease:", $2}' "$MANIFEST_YAML"
  awk '/^  node:/ {print "  node (manifeste):", $2}' "$MANIFEST_YAML" | head -1
  awk '/^  npm:/ {print "  npm (manifeste):", $2}' "$MANIFEST_YAML" | head -1
else
  echo "  MANQUANT: $MANIFEST_YAML"
fi
if [[ -f "$MANIFEST_JSON" ]]; then
  echo "  json: OK ($(wc -c < "$MANIFEST_JSON") octets)"
else
  echo "  json: MANQUANT — lancer scripts/deps/sync-platform-manifest.sh"
fi
echo

echo "[Dockerfiles — pin Node/npm]"
rg -l 'FROM node:' "$ROOT/backend" "$ROOT/frontend" 2>/dev/null | while read -r f; do
  node_line=$(grep -m1 '^FROM node:' "$f" || true)
  npm_line=$(grep -m1 'npm install -g npm@' "$f" || true)
  rel="${f#$ROOT/}"
  echo "  $rel"
  echo "    $node_line"
  [[ -n "$npm_line" ]] && echo "    $npm_line"
done
echo

echo "[Versions package.json — composants déployés]"
for pkg in \
  "$ROOT/frontend/package.json" \
  "$ROOT/backend/api-gateway/package.json" \
  "$ROOT/backend/auth-service/package.json" \
  "$ROOT/backend/application-service/package.json" \
  "$ROOT/backend/metrics-aggregator-service/package.json"; do
  if [[ -f "$pkg" ]]; then
    name=$(python3 -c "import json; d=json.load(open('$pkg')); print(d.get('name','?'))")
    ver=$(python3 -c "import json; d=json.load(open('$pkg')); print(d.get('version','?'))")
    echo "  ${pkg#$ROOT/}: $name@$ver"
  fi
done
echo

echo "[Mobile pubspec]"
if [[ -f "$ROOT/mobile/pubspec.yaml" ]]; then
  awk '/^version:/ {print "  version:", $2}' "$ROOT/mobile/pubspec.yaml"
fi
echo

if [[ "$SKIP_OUTDATED" -eq 0 ]]; then
  echo "[npm outdated — api-gateway (aperçu)]"
  if [[ -d "$ROOT/backend/api-gateway" ]]; then
    (cd "$ROOT/backend/api-gateway" && npm outdated 2>/dev/null | head -15) || echo "  (aucune sortie ou node_modules absent)"
  fi
  echo
  echo "[npm outdated — frontend (aperçu)]"
  if [[ -d "$ROOT/frontend" ]]; then
    (cd "$ROOT/frontend" && npm outdated 2>/dev/null | head -15) || echo "  (aucune sortie ou node_modules absent)"
  fi
  echo
fi

echo "[Actions suggérées]"
echo "  - Sync manifeste : bash scripts/deps/sync-platform-manifest.sh"
echo "  - Bump composant : bash scripts/deps/bump-component-version.sh <service> patch|minor|major"
echo "  - Mise à jour npm/Node : modifier Dockerfiles + toolchain manifeste → rebuild images"
echo "  - Ne pas npm install/update dans conteneurs prod (voir docker-entrypoint.sh)"
echo
