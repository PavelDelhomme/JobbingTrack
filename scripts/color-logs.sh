#!/usr/bin/env bash
# Colorize docker compose logs - tags ([DEBUG], [STATS], etc.) and errors
# Usage: docker compose logs -f 2>/dev/null | ./scripts/color-logs.sh

RED='\033[1;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
DIM='\033[2;37m'
R='\033[0m'

while IFS= read -r line || [ -n "$line" ]; do
  # ERROR/FATAL lines (Postgres, runtime) - highlight in red
  if [[ "$line" =~ (ERROR|FATAL)[[:space:]:] ]]; then
    printf '%b%s%b\n' "$RED" "$line" "$R"
    continue
  fi
  # WARN lines - yellow
  if [[ "$line" =~ WARN|Warning|warning ]]; then
    printf '%b%s%b\n' "$YELLOW" "$line" "$R"
    continue
  fi

  out="$line"
  # Color log tags - order: more specific first
  out="${out//\[DOCKER ROUTES\]/$MAGENTA[DOCKER ROUTES]$R}"
  out="${out//\[MONITORING-C\]/$BLUE[MONITORING-C]$R}"
  out="${out//\[TESTS API\]/$MAGENTA[TESTS API]$R}"
  out="${out//\[COLLECTOR\]/$MAGENTA[COLLECTOR]$R}"
  out="${out//\[DISCOVERY\]/$MAGENTA[DISCOVERY]$R}"
  out="${out//\[PERSISTENCE\]/$GREEN[PERSISTENCE]$R}"
  out="${out//\[LOGS\]/$CYAN[LOGS]$R}"
  out="${out//\[CONTAINERS\]/$YELLOW[CONTAINERS]$R}"
  out="${out//\[PROJECT\]/$BLUE[PROJECT]$R}"
  out="${out//\[STORAGE\]/$BLUE[STORAGE]$R}"
  out="${out//\[STATS\]/$CYAN[STATS]$R}"
  out="${out//\[CPU\]/$CYAN[CPU]$R}"
  out="${out//\[PROC\]/$YELLOW[PROC]$R}"
  out="${out//\[EXPORT\]/$GREEN[EXPORT]$R}"
  out="${out//\[AUTH\]/$GREEN[AUTH]$R}"
  out="${out//\[DEBUG\]/$DIM[DEBUG]$R}"
  # api-gateway info:
  out="${out//info: /$BLUE info:$R }"
  # %b interprète les séquences \033 pour que les couleurs s'affichent dans le terminal
  printf '%b\n' "$out"
done
