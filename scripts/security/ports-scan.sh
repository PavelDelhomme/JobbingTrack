#!/usr/bin/env bash
set -u

ROOT_DIR="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
COMPOSE_FILE="${SECURITY_COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"
TARGET="${SECURITY_NMAP_TARGET:-}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT_DIR="${SECURITY_REPORT_DIR:-$ROOT_DIR/reports/security/ports-$STAMP}"
mkdir -p "$OUT_DIR"

SUMMARY="$OUT_DIR/summary.md"
STATUS=0

{
  echo "# Port Exposure Scan"
  echo
  echo "- generated_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- compose_file: $COMPOSE_FILE"
  echo "- nmap_target: ${TARGET:-not set}"
  echo
  echo "## Docker Compose prod exposure"
  echo
} > "$SUMMARY"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "- compose config: missing file" >> "$SUMMARY"
  echo "$SUMMARY"
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  if docker compose -f "$COMPOSE_FILE" config > "$OUT_DIR/compose-config.yml" 2> "$OUT_DIR/compose-config.stderr"; then
    echo "- compose config: ok, see compose-config.yml" >> "$SUMMARY"
    {
      echo
      echo "### Published port lines"
      echo
      echo '```text'
      awk '/ports:/{show=1; print; next} show && /^[[:space:]]+-/{print; next} show && /^[^[:space:]]/{show=0}' "$OUT_DIR/compose-config.yml"
      echo '```'
    } >> "$SUMMARY"
  else
    STATUS=1
    echo "- compose config: failed, see compose-config.stderr" >> "$SUMMARY"
  fi
else
  echo "- compose config: skipped, docker command not installed" >> "$SUMMARY"
fi

{
  echo
  echo "## Nmap"
  echo
} >> "$SUMMARY"

if [ -z "$TARGET" ]; then
  echo "- nmap: skipped, set SECURITY_NMAP_TARGET to scan an authorized host" >> "$SUMMARY"
elif ! command -v nmap >/dev/null 2>&1; then
  echo "- nmap: skipped, command not installed" >> "$SUMMARY"
else
  echo "Running nmap against $TARGET..."
  if nmap -sV -Pn "$TARGET" -oN "$OUT_DIR/nmap.txt"; then
    echo "- nmap: ok, see nmap.txt" >> "$SUMMARY"
  else
    STATUS=1
    echo "- nmap: failed, see nmap.txt" >> "$SUMMARY"
  fi
fi

echo "$SUMMARY"
if [ "${SECURITY_STRICT:-0}" = "1" ]; then
  exit "$STATUS"
fi
exit 0
