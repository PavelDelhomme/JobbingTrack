#!/usr/bin/env bash
set -u

ROOT_DIR="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT_DIR="${SECURITY_REPORT_DIR:-$ROOT_DIR/reports/security/jwt-$STAMP}"
TOKEN="${JWT_AUDIT_TOKEN:-}"
mkdir -p "$OUT_DIR"

SUMMARY="$OUT_DIR/summary.md"
STATUS=0

{
  echo "# JWT Audit"
  echo
  echo "- generated_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- token_provided: $([ -n "$TOKEN" ] && echo yes || echo no)"
  echo
} > "$SUMMARY"

{
  echo "## Static hints"
  echo
  echo '```text'
  grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
    -E "jsonwebtoken|jwt|JWT_SECRET|RS256|HS256|alg" "$ROOT_DIR/backend" 2>/dev/null | head -120 || true
  echo '```'
} >> "$SUMMARY"

if [ -z "$TOKEN" ]; then
  echo "- jwt_tool: skipped, set JWT_AUDIT_TOKEN with a lab token" >> "$SUMMARY"
  echo "$SUMMARY"
  exit "$STATUS"
fi

if ! command -v jwt_tool >/dev/null 2>&1; then
  echo "- jwt_tool: skipped, command not installed" >> "$SUMMARY"
  echo "$SUMMARY"
  exit "$STATUS"
fi

echo "Running jwt_tool decode against provided lab token..."
if timeout "${JWT_AUDIT_TIMEOUT_SEC:-60}" jwt_tool "$TOKEN" -d > "$OUT_DIR/jwt_tool.txt" 2>&1; then
  echo "- jwt_tool decode: ok, see jwt_tool.txt" >> "$SUMMARY"
else
  STATUS=1
  echo "- jwt_tool decode: failed, see jwt_tool.txt" >> "$SUMMARY"
fi

echo "$SUMMARY"
exit "$STATUS"
