#!/usr/bin/env bash
set -euo pipefail

# Rapport rapide de pression mémoire Redis pour la stack locale JobbingTrack.
# Variables utiles :
#   REDIS_CONTAINER=jobbingtrack-redis
#   REDIS_MEMORY_BUDGET_MB=128
#   REDIS_MEMORY_WARN_RATIO=70
#   REDIS_MEMORY_CRITICAL_RATIO=85
#   REDIS_FRAGMENTATION_MIN_USED_MB=10 (ignore la fragmentation sur dataset quasi vide)
#   REDISCLI_AUTH=... (si Redis est protégé par requirepass / ACL)

REDIS_CONTAINER="${REDIS_CONTAINER:-jobbingtrack-redis}"
REDIS_FRAGMENTATION_MIN_USED_MB="${REDIS_FRAGMENTATION_MIN_USED_MB:-10}"
REDIS_MEMORY_BUDGET_MB="${REDIS_MEMORY_BUDGET_MB:-128}"
REDIS_MEMORY_WARN_RATIO="${REDIS_MEMORY_WARN_RATIO:-70}"
REDIS_MEMORY_CRITICAL_RATIO="${REDIS_MEMORY_CRITICAL_RATIO:-85}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker est requis pour interroger le conteneur Redis." >&2
  exit 2
fi

if ! docker inspect "$REDIS_CONTAINER" >/dev/null 2>&1; then
  echo "ERROR: conteneur Redis introuvable: $REDIS_CONTAINER" >&2
  echo "Astuce: démarrez Redis avec make up-full ou définissez REDIS_CONTAINER=..." >&2
  exit 2
fi

redis_cli() {
  if [ -n "${REDISCLI_AUTH:-}" ]; then
    docker exec -e REDISCLI_AUTH="$REDISCLI_AUTH" "$REDIS_CONTAINER" redis-cli "$@"
  else
    docker exec "$REDIS_CONTAINER" redis-cli "$@"
  fi
}

bytes_to_mb() {
  awk -v bytes="${1:-0}" 'BEGIN { printf "%.2f", bytes / 1024 / 1024 }'
}

percent_of_budget() {
  awk -v bytes="${1:-0}" -v budget_mb="$REDIS_MEMORY_BUDGET_MB" 'BEGIN {
    budget_bytes = budget_mb * 1024 * 1024
    if (budget_bytes <= 0) { printf "0.00"; exit }
    printf "%.2f", (bytes / budget_bytes) * 100
  }'
}

get_info_value() {
  awk -F: -v key="$1" '$1 == key { gsub(/\r/, "", $2); print $2; exit }'
}

info_memory="$(redis_cli INFO memory)"
info_keyspace="$(redis_cli INFO keyspace)"
memory_stats="$(redis_cli --raw MEMORY STATS 2>/dev/null || true)"

used_memory="$(printf '%s\n' "$info_memory" | get_info_value used_memory)"
used_memory_dataset="$(printf '%s\n' "$info_memory" | get_info_value used_memory_dataset)"
used_memory_rss="$(printf '%s\n' "$info_memory" | get_info_value used_memory_rss)"
used_memory_peak="$(printf '%s\n' "$info_memory" | get_info_value used_memory_peak)"
mem_fragmentation_ratio="$(printf '%s\n' "$info_memory" | get_info_value mem_fragmentation_ratio)"
total_system_memory="$(printf '%s\n' "$info_memory" | get_info_value total_system_memory)"
maxmemory="$(printf '%s\n' "$info_memory" | get_info_value maxmemory)"
maxmemory_policy="$(printf '%s\n' "$info_memory" | get_info_value maxmemory_policy)"
connected_clients="$(redis_cli INFO clients | get_info_value connected_clients)"
blocked_clients="$(redis_cli INFO clients | get_info_value blocked_clients)"

used_memory="${used_memory:-0}"
used_memory_dataset="${used_memory_dataset:-0}"
used_memory_rss="${used_memory_rss:-0}"
used_memory_peak="${used_memory_peak:-0}"
mem_fragmentation_ratio="${mem_fragmentation_ratio:-0}"
total_system_memory="${total_system_memory:-0}"
maxmemory="${maxmemory:-0}"
connected_clients="${connected_clients:-0}"
blocked_clients="${blocked_clients:-0}"

used_pct="$(percent_of_budget "$used_memory")"
dataset_pct="$(percent_of_budget "$used_memory_dataset")"
rss_pct="$(percent_of_budget "$used_memory_rss")"

status="OK"
if awk -v pct="$used_pct" -v threshold="$REDIS_MEMORY_CRITICAL_RATIO" 'BEGIN { exit !(pct >= threshold) }'; then
  status="CRITICAL"
elif awk -v pct="$used_pct" -v threshold="$REDIS_MEMORY_WARN_RATIO" 'BEGIN { exit !(pct >= threshold) }'; then
  status="WARN"
fi

fragmentation_status="OK"
if awk -v ratio="$mem_fragmentation_ratio" -v used="$used_memory" -v min_mb="$REDIS_FRAGMENTATION_MIN_USED_MB" 'BEGIN {
  min_bytes = min_mb * 1024 * 1024
  exit !(used >= min_bytes && ratio >= 1.8)
}'; then
  fragmentation_status="WARN"
fi

total_keys=0
if [ -n "$info_keyspace" ]; then
  total_keys="$(
    printf '%s\n' "$info_keyspace" |
      awk -F'[=,]' '/^db[0-9]+:/ { total += $2 } END { print total + 0 }'
  )"
fi

echo "Redis memory report"
echo "==================="
echo "container: $REDIS_CONTAINER"
echo "status: $status"
echo "budget_mb: $REDIS_MEMORY_BUDGET_MB (warn ${REDIS_MEMORY_WARN_RATIO}%, critical ${REDIS_MEMORY_CRITICAL_RATIO}%)"
echo ""
echo "Memory"
echo "------"
echo "used_memory: $(bytes_to_mb "$used_memory") MB (${used_pct}% budget)"
echo "used_memory_dataset: $(bytes_to_mb "$used_memory_dataset") MB (${dataset_pct}% budget)"
echo "used_memory_rss: $(bytes_to_mb "$used_memory_rss") MB (${rss_pct}% budget)"
echo "used_memory_peak: $(bytes_to_mb "$used_memory_peak") MB"
echo "mem_fragmentation_ratio: $mem_fragmentation_ratio ($fragmentation_status, ignoré sous ${REDIS_FRAGMENTATION_MIN_USED_MB} MB utilisés)"
echo "maxmemory: $(bytes_to_mb "$maxmemory") MB"
echo "maxmemory_policy: ${maxmemory_policy:-unknown}"
echo "host_total_system_memory: $(bytes_to_mb "$total_system_memory") MB"
echo ""
echo "Dataset / clients"
echo "-----------------"
echo "total_keys: $total_keys"
echo "connected_clients: $connected_clients"
echo "blocked_clients: $blocked_clients"

if [ -n "$info_keyspace" ]; then
  echo ""
  echo "Keyspace"
  echo "--------"
  printf '%s\n' "$info_keyspace" | sed '/^#/d;/^$/d'
fi

if [ -n "$memory_stats" ]; then
  echo ""
  echo "MEMORY STATS (raw)"
  echo "------------------"
  printf '%s\n' "$memory_stats" | sed -n '1,80p'
fi

echo ""
echo "Actions suggerees"
echo "-----------------"
if [ "$status" = "CRITICAL" ]; then
  echo "- Reduire retention/cache ou definir une politique maxmemory avant charge longue."
elif [ "$status" = "WARN" ]; then
  echo "- Surveiller 30-60 min et identifier les familles de cles si la courbe continue de monter."
else
  echo "- Pression memoire dans le budget actuel."
fi

if [ "$fragmentation_status" = "WARN" ]; then
  echo "- Fragmentation elevee: verifier churn de cles, allocator et redemarrage controle si necessaire."
fi

if [ "$maxmemory" = "0" ]; then
  echo "- maxmemory non defini: garder le budget operationnel REDIS_MEMORY_BUDGET_MB et definir maxmemory en prod."
fi

if [ "$blocked_clients" != "0" ]; then
  echo "- Clients bloques presents: inspecter les commandes longues / connexions."
fi
