#!/usr/bin/env bash
# Suivi continu des logs compose : se reconnecte si le flux se coupe (conteneurs arrêtés/redémarrés).
# Couleurs : même pipeline que `make logs` -> scripts/ops/color-logs.sh
# Ctrl+C : quitte proprement (code 130).
set -u
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR" || exit 1

set_term_title() { printf '\033]0;%s\007' "$1" 2>/dev/null || true; }
set_term_title "Logs"

if [[ $# -lt 1 ]]; then
  set -- -f docker-compose.yml
fi

trap 'set_term_title ""' EXIT
trap 'echo ""; echo "⏹ logs-watch arrêté."; exit 130' INT

echo "📋 logs-watch — suivi continu (reconnexion auto si le flux s’interrompt) — Ctrl+C pour quitter"
echo "   Args compose : $*"
echo ""

while true; do
  if ! docker compose "$@" ps -q --status running 2>/dev/null | grep -q .; then
    echo "[logs-watch] Aucun conteneur « running » pour ce compose — nouvelle tentative dans 5s…"
    sleep 5
    continue
  fi
  set +e
  docker compose "$@" logs -f -t 2>&1 | bash "$ROOT_DIR/scripts/ops/color-logs.sh"
  pipe=("${PIPESTATUS[@]}")
  dc="${pipe[0]:-1}"
  # 130 = Ctrl+C sur docker compose — quitter. 141 = SIGPIPE (pipeline/couleurs) — reconnecter, ne pas confondre avec Ctrl+C.
  if [[ "$dc" == "130" ]]; then
    exit 130
  fi
  echo "[logs-watch] Flux interrompu (code ${dc}) — reconnexion dans 3s… (Ctrl+C pour quitter définitivement)"
  sleep 3
done
