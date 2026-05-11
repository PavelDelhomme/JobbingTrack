#!/usr/bin/env bash
set -u

ROOT_DIR="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DEFAULT_COMPOSE_FILES="$ROOT_DIR/docker-compose.yml:$ROOT_DIR/docker-compose.prod.yml"
COMPOSE_FILES_RAW="${SECURITY_COMPOSE_FILES:-${SECURITY_COMPOSE_FILE:-$DEFAULT_COMPOSE_FILES}}"
COMPOSE_PROFILES_RAW="${SECURITY_COMPOSE_PROFILES:-full}"
TARGET="${SECURITY_NMAP_TARGET:-}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT_DIR="${SECURITY_REPORT_DIR:-$ROOT_DIR/reports/security/ports-$STAMP}"
mkdir -p "$OUT_DIR"

SUMMARY="$OUT_DIR/summary.md"
STATUS=0
IFS=':' read -r -a COMPOSE_FILES <<< "$COMPOSE_FILES_RAW"
IFS=',' read -r -a COMPOSE_PROFILES <<< "$COMPOSE_PROFILES_RAW"
COMPOSE_ARGS=()
for compose_profile in "${COMPOSE_PROFILES[@]}"; do
  if [ -n "$compose_profile" ]; then
    COMPOSE_ARGS+=("--profile" "$compose_profile")
  fi
done
for compose_file in "${COMPOSE_FILES[@]}"; do
  COMPOSE_ARGS+=("-f" "$compose_file")
done

{
  echo "# Port Exposure Scan"
  echo
  echo "- generated_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- compose_files: $COMPOSE_FILES_RAW"
  echo "- compose_profiles: ${COMPOSE_PROFILES_RAW:-none}"
  echo "- nmap_target: ${TARGET:-not set}"
  echo
  echo "## Docker Compose prod exposure"
  echo
} > "$SUMMARY"

for compose_file in "${COMPOSE_FILES[@]}"; do
  if [ ! -f "$compose_file" ]; then
    echo "- compose config: missing file $compose_file" >> "$SUMMARY"
    echo "$SUMMARY"
    exit 1
  fi
done

if command -v docker >/dev/null 2>&1; then
  if docker compose "${COMPOSE_ARGS[@]}" config > "$OUT_DIR/compose-config.yml" 2> "$OUT_DIR/compose-config.stderr"; then
    echo "- compose config: ok, see compose-config.yml" >> "$SUMMARY"
    docker compose "${COMPOSE_ARGS[@]}" config --format json > "$OUT_DIR/compose-config.json" 2>> "$OUT_DIR/compose-config.stderr" || true
    {
      echo
      echo "### Published ports"
      echo
      echo '```text'
      python3 - "$OUT_DIR/compose-config.json" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
if not path.exists() or path.stat().st_size == 0:
    print("compose JSON unavailable")
    raise SystemExit(0)

data = json.loads(path.read_text(encoding="utf-8"))
rows = []
for service_name, service in sorted((data.get("services") or {}).items()):
    for port in service.get("ports") or []:
        target = port.get("target")
        published = port.get("published")
        protocol = port.get("protocol", "tcp")
        host_ip = port.get("host_ip") or port.get("hostIP") or "0.0.0.0"
        if published:
            rows.append(f"{service_name}: {host_ip}:{published}->{target}/{protocol}")

if rows:
    print("\n".join(rows))
else:
    print("no published ports")
PY
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
