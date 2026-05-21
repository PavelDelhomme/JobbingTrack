#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT_DIR="${SECURITY_REPORT_DIR:-$ROOT_DIR/reports/security/secrets-$STAMP}"
mkdir -p "$OUT_DIR"

SUMMARY="$OUT_DIR/summary.md"
STATUS=0
GITLEAKS_FINDINGS_EXIT_CODE="${GITLEAKS_FINDINGS_EXIT_CODE:-1}"

{
  echo "# Secrets Scan"
  echo
  echo "- generated_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- root: $ROOT_DIR"
  echo "- history: full git history when supported by the scanner"
  echo
} > "$SUMMARY"

if command -v gitleaks >/dev/null 2>&1; then
  echo "Running gitleaks against git history..."
  if gitleaks detect \
    --source "$ROOT_DIR" \
    --report-format json \
    --report-path "$OUT_DIR/gitleaks.json" \
    --exit-code "$GITLEAKS_FINDINGS_EXIT_CODE" \
    --redact; then
    FINDINGS_COUNT="$(python3 - "$OUT_DIR/gitleaks.json" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
if not path.exists():
    print(0)
    raise SystemExit

with path.open() as handle:
    data = json.load(handle)
print(len(data) if isinstance(data, list) else 0)
PY
)"
    if [ "$FINDINGS_COUNT" -gt 0 ]; then
      echo "- gitleaks: findings=$FINDINGS_COUNT (non-blocking in this run), see gitleaks.json" >> "$SUMMARY"
    else
      echo "- gitleaks: ok" >> "$SUMMARY"
    fi
  else
    STATUS=1
    echo "- gitleaks: findings or scanner error, see gitleaks.json" >> "$SUMMARY"
  fi
else
  echo "- gitleaks: skipped, command not installed" >> "$SUMMARY"
fi

if command -v trufflehog >/dev/null 2>&1; then
  echo "Running trufflehog against git history..."
  if trufflehog git "file://$ROOT_DIR" --json > "$OUT_DIR/trufflehog.json"; then
    chmod 600 "$OUT_DIR/trufflehog.json" 2>/dev/null || true
    echo "- trufflehog: ok" >> "$SUMMARY"
  else
    STATUS=1
    echo "- trufflehog: findings or scanner error, see trufflehog.json" >> "$SUMMARY"
  fi
else
  echo "- trufflehog: skipped, command not installed" >> "$SUMMARY"
fi

echo "$SUMMARY"
exit "$STATUS"
