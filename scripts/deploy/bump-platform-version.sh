#!/usr/bin/env bash
# Bump version plateforme JobbingTrack (fichier VERSION + manifest JT).
# Usage : bash scripts/deploy/bump-platform-version.sh patch|minor|major
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PART="${1:-patch}"

VERSION_FILE="$ROOT/VERSION"
CURRENT="$(tr -d '[:space:]' < "$VERSION_FILE")"
IFS='.' read -r MA MI PA <<< "$CURRENT"

case "$PART" in
  major) MA=$((MA + 1)); MI=0; PA=0 ;;
  minor) MI=$((MI + 1)); PA=0 ;;
  patch) PA=$((PA + 1)) ;;
  *)
    echo "Usage: $0 patch|minor|major" >&2
    exit 1
    ;;
esac

NEW="${MA}.${MI}.${PA}"
echo "$NEW" > "$VERSION_FILE"

MANIFEST="$ROOT/deploy/releases/JT-${NEW}.yaml"
cat > "$MANIFEST" <<EOF
# Manifest plateforme JobbingTrack JT-${NEW}
# Généré : $(date -Iseconds)
platformVersion: "JT-${NEW}"
semver: "${NEW}"
notes: "Bump ${PART} depuis JT-${CURRENT}"
services: {}
EOF

echo "==> VERSION ${CURRENT} → ${NEW}"
echo "    Manifest : deploy/releases/JT-${NEW}.yaml"
echo "    Prochaine étape : commit + push dev → build GHCR"
