#!/usr/bin/env bash
# Colorize docker compose logs - service name, HTTP method/path/status, tags ([DEBUG], [STATS], etc.) and errors
# Usage: docker compose logs -f 2>/dev/null | ./scripts/color-logs.sh
#
# Couleurs :
#   - Nom du service (jobbingtrack-xxx) : magenta
#   - Méthode HTTP (GET, HEAD, POST...) : cyan
#   - Code HTTP 2xx : vert vif, 3xx : cyan, 4xx : orange, 5xx : rouge vif
#   - Lignes d'erreur (⨯, Error:, Expected, Caused by, Syntax Error...) : rouge
#   - Tags [DEBUG], [STATS], etc. : comme avant

RED='\033[1;31m'
GREEN='\033[0;32m'
BRIGHT_GREEN='\033[1;32m'
YELLOW='\033[1;33m'
ORANGE='\033[38;5;208m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BRIGHT_CYAN='\033[1;36m'
DIM='\033[2;37m'
R='\033[0m'

while IFS= read -r line || [ -n "$line" ]; do
  # ---- LIGNES ERREUR (toujours en rouge/orange) ----
  # Next.js / build: ⨯, Error:, Expected, Caused by, Syntax Error, Import trace
  if [[ "$line" =~ ⨯ ]] || [[ "$line" =~ Error: ]] || [[ "$line" =~ Expected[[:space:]] ]] || \
     [[ "$line" =~ Caused[[:space:]]by ]] || [[ "$line" =~ Syntax[[:space:]]Error ]] || [[ "$line" =~ Import[[:space:]]trace ]] || \
     [[ "$line" =~ ^[[:space:]]*,[-[/][[:space:]]*\[ ]]; then
    printf '%b%s%b\n' "$RED" "$line" "$R"
    continue
  fi
  # Numéros de ligne dans stack (path:line:col)
  if [[ "$line" =~ [0-9]+\ \|\ .*\.(tsx?|jsx?|mjs):[0-9]+ ]]; then
    printf '%b%s%b\n' "$ORANGE" "$line" "$R"
    continue
  fi
  # Postgres / runtime ERROR ou FATAL
  if [[ "$line" =~ (ERROR|FATAL)[[:space:]:] ]]; then
    printf '%b%s%b\n' "$RED" "$line" "$R"
    continue
  fi
  # Tables/relations manquantes, erreurs de persistance
  if [[ "$line" =~ does[[:space:]]not[[:space:]]exist ]] || [[ "$line" =~ Table[[:space:]].*absente ]] || [[ "$line" =~ Erreur[[:space:]](insertion|sauvegarde) ]]; then
    printf '%b%s%b\n' "$RED" "$line" "$R"
    continue
  fi
  # WARN lines - yellow
  if [[ "$line" =~ WARN|Warning|warning ]]; then
    printf '%b%s%b\n' "$YELLOW" "$line" "$R"
    continue
  fi

  out="$line"

  # ---- Nom du service (début de ligne: jobbingtrack-xxx) ----
  if [[ "$out" =~ ^(jobbingtrack-[a-zA-Z0-9-]+) ]]; then
    svc="${BASH_REMATCH[1]}"
    out="${MAGENTA}${svc}${R}${out:${#svc}}"
  fi

  # ---- Ligne type access log: "  GET /path 200 in 21ms" -> colorer méthode, chemin, code ----
  # Méthodes HTTP
  for m in GET HEAD POST PUT DELETE PATCH; do
    out="${out//  ${m} /  ${BRIGHT_CYAN}${m}${R} }"
  done
  # Code HTTP (ordre: 5xx rouge, 4xx orange, 3xx cyan, 2xx vert)
  out="${out// 500 /  ${RED}500${R} }"
  out="${out// 502 /  ${RED}502${R} }"
  out="${out// 503 /  ${RED}503${R} }"
  out="${out// 504 /  ${RED}504${R} }"
  out="${out// 400 /  ${ORANGE}400${R} }"
  out="${out// 401 /  ${ORANGE}401${R} }"
  out="${out// 403 /  ${ORANGE}403${R} }"
  out="${out// 404 /  ${ORANGE}404${R} }"
  out="${out// 301 /  ${CYAN}301${R} }"
  out="${out// 302 /  ${CYAN}302${R} }"
  out="${out// 304 /  ${CYAN}304${R} }"
  out="${out// 200 /  ${BRIGHT_GREEN}200${R} }"
  out="${out// 201 /  ${BRIGHT_GREEN}201${R} }"
  out="${out// 204 /  ${BRIGHT_GREEN}204${R} }"

  # Réponses HTTP 4xx/5xx dans d'autres formats (ex: "(HTTP 404)")
  if [[ "$out" =~ \(HTTP[[:space:]](4[0-9][0-9]|5[0-9][0-9])\) ]]; then
    out=$(echo "$out" | sed -E "s/(\(HTTP )(4[0-9][0-9])(\))/\1${ORANGE}\2${R}\3/g")
    out=$(echo "$out" | sed -E "s/(\(HTTP )(5[0-9][0-9])(\))/\1${RED}\2${R}\3/g")
  fi

  # Color log tags - order: more specific first
  out="${out//\[DOCKER ROUTES\]/$MAGENTA[DOCKER ROUTES]$R}"
  out="${out//\[MONITORING-C\]/$BLUE[MONITORING-C]$R}"
  out="${out//\[TESTS API\]/$MAGENTA[TESTS API]$R}"
  out="${out//\[TESTS BACKOFFICE\]/$MAGENTA[TESTS BACKOFFICE]$R}"
  out="${out//\[TESTS BACKEND\]/$MAGENTA[TESTS BACKEND]$R}"
  out="${out//\[TESTS FRONTEND\]/$MAGENTA[TESTS FRONTEND]$R}"
  out="${out//\[TESTS SECURITY\]/$MAGENTA[TESTS SECURITY]$R}"
  out="${out//\[TESTS PLAYWRIGHT\]/$MAGENTA[TESTS PLAYWRIGHT]$R}"
  out="${out//\[TESTS PERFORMANCE-BACKEND\]/$MAGENTA[TESTS PERFORMANCE-BACKEND]$R}"
  out="${out//\[TESTS PERFORMANCE-FRONTEND\]/$MAGENTA[TESTS PERFORMANCE-FRONTEND]$R}"
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
