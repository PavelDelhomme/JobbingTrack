#!/usr/bin/env bash
set -u

ROOT_DIR="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
TARGET="${ZAP_TARGET:-${API_GATEWAY_URL:-http://127.0.0.1:5002}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT_DIR="${SECURITY_REPORT_DIR:-$ROOT_DIR/reports/security/zap-$STAMP}"
mkdir -p "$OUT_DIR"

SUMMARY="$OUT_DIR/summary.md"

{
  echo "# OWASP ZAP Active Scan"
  echo
  echo "- generated_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- target: $TARGET"
  echo "- active_scan_enabled: ${SECURITY_ACTIVE_SCAN:-0}"
  echo
} > "$SUMMARY"

if [ "${SECURITY_ACTIVE_SCAN:-0}" != "1" ]; then
  {
    echo "- status: skipped"
    echo "- reason: set SECURITY_ACTIVE_SCAN=1 to run an active scan on an authorized local/test target"
  } >> "$SUMMARY"
  echo "$SUMMARY"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "- status: failed, docker command not installed" >> "$SUMMARY"
  echo "$SUMMARY"
  exit 1
fi

echo "Running OWASP ZAP active scan against $TARGET..."
if docker run --rm \
  -v "$OUT_DIR:/zap/wrk/:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py \
  -t "$TARGET" \
  -J zap-report.json \
  -r zap-report.html \
  -m "${ZAP_MAX_MINUTES:-5}" \
  -I; then
  echo "- status: ok, see zap-report.html and zap-report.json" >> "$SUMMARY"
  echo "$SUMMARY"
  exit 0
fi

echo "- status: failed, see ZAP output" >> "$SUMMARY"
echo "$SUMMARY"
exit 1
