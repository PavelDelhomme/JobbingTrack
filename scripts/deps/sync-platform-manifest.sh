#!/usr/bin/env bash
# YAML manifeste → JSON runtime + copie api-gateway (BL-DEP-01).
# Usage : bash scripts/deps/sync-platform-manifest.sh [chemin-yaml]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
YAML="${1:-$ROOT/deploy/releases/platform-manifest.yaml}"
JSON="$ROOT/deploy/releases/platform-manifest.json"
GATEWAY_JSON="$ROOT/backend/api-gateway/release-manifest/platform-manifest.json"

if [[ ! -f "$YAML" ]]; then
  echo "Fichier introuvable : $YAML"
  exit 1
fi

python3 - "$YAML" "$JSON" "$GATEWAY_JSON" <<'PY'
import json, sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML requis : pip install pyyaml", file=sys.stderr)
    sys.exit(1)

src, out, gateway = sys.argv[1:4]
data = yaml.safe_load(Path(src).read_text(encoding="utf-8"))
text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
Path(out).write_text(text, encoding="utf-8")
Path(gateway).parent.mkdir(parents=True, exist_ok=True)
Path(gateway).write_text(text, encoding="utf-8")
print(f"OK — {out}")
print(f"OK — {gateway}")
PY
