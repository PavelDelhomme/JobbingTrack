#!/usr/bin/env bash
# Bump SemVer d’un composant + manifeste plateforme (BL-DEP-03 partiel).
# Usage : bash scripts/deps/bump-component-version.sh <composant> <patch|minor|major>
# Exemples :
#   bash scripts/deps/bump-component-version.sh api-gateway patch
#   bash scripts/deps/bump-component-version.sh frontend minor
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPONENT="${1:-}"
BUMP="${2:-}"

usage() {
  echo "Usage: $0 <composant> <patch|minor|major>"
  echo "Composants: frontend, api-gateway, auth-service, application-service, …"
  exit 1
}

[[ -n "$COMPONENT" && -n "$BUMP" ]] || usage
[[ "$BUMP" =~ ^(patch|minor|major)$ ]] || usage

case "$COMPONENT" in
  frontend) PKG="$ROOT/frontend/package.json" ;;
  api-gateway) PKG="$ROOT/backend/api-gateway/package.json" ;;
  auth-service) PKG="$ROOT/backend/auth-service/package.json" ;;
  application-service) PKG="$ROOT/backend/application-service/package.json" ;;
  company-service) PKG="$ROOT/backend/company-service/package.json" ;;
  contact-service) PKG="$ROOT/backend/contact-service/package.json" ;;
  interview-service) PKG="$ROOT/backend/interview-service/package.json" ;;
  dashboard-service) PKG="$ROOT/backend/dashboard-service/package.json" ;;
  call-service) PKG="$ROOT/backend/call-service/package.json" ;;
  profile-service) PKG="$ROOT/backend/profile-service/package.json" ;;
  event-service) PKG="$ROOT/backend/event-service/package.json" ;;
  followup-service) PKG="$ROOT/backend/followup-service/package.json" ;;
  workflow-service) PKG="$ROOT/backend/workflow-service/package.json" ;;
  notification-service) PKG="$ROOT/backend/notification-service/package.json" ;;
  security-service) PKG="$ROOT/backend/security-service/package.json" ;;
  metrics-aggregator) PKG="$ROOT/backend/metrics-aggregator-service/package.json" ;;
  *) echo "Composant inconnu : $COMPONENT"; usage ;;
esac

if [[ ! -f "$PKG" ]]; then
  echo "package.json introuvable : $PKG"
  exit 1
fi

NEW_VER=$(python3 - "$PKG" "$BUMP" <<'PY'
import json, sys
from pathlib import Path

path, bump = sys.argv[1], sys.argv[2]
data = json.loads(Path(path).read_text(encoding="utf-8"))
parts = [int(x) for x in str(data.get("version", "0.0.0")).split(".")[:3]]
while len(parts) < 3:
    parts.append(0)
major, minor, patch = parts
if bump == "major":
    major, minor, patch = major + 1, 0, 0
elif bump == "minor":
    minor, patch = minor + 1, 0
else:
    patch += 1
data["version"] = f"{major}.{minor}.{patch}"
Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(data["version"])
PY
)

echo "OK — $COMPONENT → $NEW_VER ($PKG)"

MANIFEST="$ROOT/deploy/releases/platform-manifest.yaml"
if [[ -f "$MANIFEST" ]]; then
  python3 - "$MANIFEST" "$COMPONENT" "$NEW_VER" <<'PY'
import re, sys
from pathlib import Path

path, component, version = sys.argv[1:4]
text = Path(path).read_text(encoding="utf-8")
pattern = rf"(^  {re.escape(component)}:\n    version: )\"[^\"]+\"" 
repl = rf'\1"{version}"'
new_text, n = re.subn(pattern, repl, text, count=1, flags=re.MULTILINE)
if n:
    Path(path).write_text(new_text, encoding="utf-8")
    print(f"OK — manifeste {component}.version → {version}")
else:
    print(f"Note — clé components.{component} absente du manifeste (mise à jour manuelle)")
PY
  bash "$ROOT/scripts/deps/sync-platform-manifest.sh" "$MANIFEST"
fi

echo "Prochaine étape : rebuild image + tag immuable, puis deploy Portainer."
