#!/usr/bin/env bash
# Programme l'envoi d'un récap email à une heure locale (format HH:MM).
# Usage: bash scripts/ops/schedule-agent-recap-email.sh 23:59 /chemin/rapport.txt "Sujet email"
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET_TIME="${1:?Heure HH:MM requise}"
HTML_FILE="${2:?Fichier rapport requis}"
SUBJECT="${3:-[JobbingTrack] Recap agent $(date +%Y-%m-%d)}"

if [[ ! -f "$HTML_FILE" ]]; then
  echo "Fichier introuvable: $HTML_FILE" >&2
  exit 1
fi

now_epoch=$(date +%s)
target_epoch=$(date -d "today ${TARGET_TIME}" +%s 2>/dev/null || date -d "${TARGET_TIME}" +%s)
if (( target_epoch <= now_epoch )); then
  target_epoch=$(date -d "tomorrow ${TARGET_TIME}" +%s 2>/dev/null || target_epoch)
fi
delay_sec=$((target_epoch - now_epoch))

echo "[schedule-agent-recap] envoi prévu dans ${delay_sec}s (~${TARGET_TIME})"
(
  sleep "$delay_sec"
  cd "$ROOT_DIR"
  /usr/bin/node scripts/ops/send-agent-recap-email.cjs \
    --subject "$SUBJECT" \
    --html-file "$HTML_FILE"
) >>"${ROOT_DIR}/tests/results/scheduled-email-$(date +%Y%m%d).log" 2>&1 &

echo "[schedule-agent-recap] tâche arrière-plan lancée (PID $!)"
