#!/usr/bin/env bash
# Boucle d’affichage de `make status` sans empiler les cycles dans le scrollback du terminal.
# Par défaut (ALTSCREEN=1) : buffer d’écran alternatif — seul le dernier « cadre » est visible ;
#   à la sortie (Ctrl+C) l’historique des commandes tapées avant le watch reste intact.
# ALTSCREEN=0 : ancien comportement (séparateur entre cycles ; CLEAR=1 appelle `clear`).
# STATUS_FOLD=1 (défaut) : passe la sortie de `make status` dans `fold -s -w $(tput cols)`.
#
# Pendant l’attente entre deux cycles : touches 5–9 = intervalle en secondes (défaut 5).
#
# Variables : ROOT_DIR, INTERVAL (secondes), ALTSCREEN (0|1), CLEAR (0|1), STATUS_FOLD (0|1)

set -euo pipefail

set_term_title() { printf '\033]0;%s\007' "$1" 2>/dev/null || true; }

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
INTERVAL="${INTERVAL:-5}"
ALTSCREEN="${ALTSCREEN:-1}"
CLEAR="${CLEAR:-0}"
STATUS_FOLD="${STATUS_FOLD:-1}"

cleanup() {
  set_term_title ""
  if [[ "$ALTSCREEN" == "1" ]]; then
    printf '\033[?1049l\033[0m' 2>/dev/null || true
  fi
  stty sane 2>/dev/null || true
}
trap cleanup INT TERM EXIT

set_term_title "Status"

if [[ "$ALTSCREEN" == "1" ]]; then
  printf '\033[?1049h\033[2J\033[H'
fi

print_header() {
  printf '%b\n' "\033[0;36m📊 Statut détaillé (watch)\033[0m — cycle toutes les \033[1;33m${INTERVAL}s\033[0m \033[0;90m· touches \033[1;33m5-9\033[0;90m = changer l’intervalle · Ctrl+C pour quitter\033[0m"
  printf '%b\n' "\033[0;90m💡 \033[0;36mmake status\033[0;90m dans un buffer alternatif (défaut). \033[1;33mALTSCREEN=0\033[0;90m pour l’ancien défilement ; \033[1;33mCLEAR=1\033[0;90m + ALTSCREEN=0 pour \`clear\` plein écran.\033[0m"
}

print_header
echo ""

wait_interval() {
  local waited=0
  local step=1
  while (( waited < INTERVAL )); do
    local remaining=$((INTERVAL - waited))
    local chunk=$((remaining < step ? remaining : step))
    local key=""
    if IFS= read -r -t "$chunk" -n 1 key 2>/dev/null; then
      case "$key" in
        5|6|7|8|9)
          INTERVAL="$key"
          printf '%b\n' "\033[0;32m⏱ Intervalle : ${INTERVAL}s\033[0m"
          return 0
          ;;
        q|Q)
          printf '\n'
          exit 0
          ;;
      esac
    fi
    waited=$((waited + chunk))
  done
}

sep=0
while true; do
  if [[ "$ALTSCREEN" == "1" ]]; then
    printf '\033[2J\033[H'
    printf '%b\n' "\033[0;36m📊 Statut détaillé (watch)\033[0m — \033[1;33m${INTERVAL}s\033[0m · \033[0;90m5-9\033[0m intervalle · Ctrl+C\033[0m"
    echo ""
  elif [[ "$sep" == "1" && "$CLEAR" != "1" ]]; then
    printf '%b\n' "\033[0;90m────────────────────────────────────────────────────────\033[0m"
  fi
  if [[ "$CLEAR" == "1" && "$ALTSCREEN" != "1" ]]; then
    clear
  fi

  if [[ "$STATUS_FOLD" == "1" ]]; then
    cols="${COLUMNS:-100}"
    if command -v tput >/dev/null 2>&1; then
      cols="$(tput cols 2>/dev/null || echo "$cols")"
    fi
    make -C "$ROOT_DIR" --no-print-directory status 2>&1 | fold -s -w "$cols"
  else
    make -C "$ROOT_DIR" --no-print-directory status
  fi

  sep=1
  echo ""
  printf '%b\n' "\033[0;36m🕐\033[0m \033[1;37m$(date '+%Y-%m-%d %H:%M:%S %z')\033[0m  \033[0;90m· prochain cycle dans\033[0m \033[1;33m${INTERVAL}s\033[0m  \033[0;90m(touches 5-9)\033[0m"
  wait_interval
done
