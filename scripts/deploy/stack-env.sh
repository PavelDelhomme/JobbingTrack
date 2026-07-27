#!/usr/bin/env bash
# Gestion multi-environnements JobbingTrack (local / préprod / prod compose).
# Ne remplace pas Portainer+NPM : wrappers locaux + vérifs avant deploy VPS.
#
# Usage:
#   scripts/deploy/stack-env.sh <env> <action> [args...]
#   env    : local | preprod | prod
#   action : init | check | config | up | down | status | logs | ps | help
#
# Variables :
#   JT_ENV_FILE   — fichier env (défaut selon env)
#   JT_COMPOSE    — override compose file
#   JT_PROJECT    — nom projet docker compose
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ENV_NAME="${1:-}"
ACTION="${2:-}"
shift 2 2>/dev/null || true

usage() {
  cat <<'EOF'
Usage: scripts/deploy/stack-env.sh <local|preprod|prod> <action>

Actions :
  init     Copie .env.example → fichier env cible (sans écraser)
  check    Vérifie clés obligatoires (portainer-env-check)
  config   docker compose config (validation)
  up       Démarre la stack (détaché)
  down     Arrête la stack
  status   docker compose ps
  logs     Suivi logs (args passés à compose logs)
  ps       Alias status
  help     Cette aide

Exemples :
  scripts/deploy/stack-env.sh local status
  JT_ENV_FILE=deploy/production/.env.preprod \
    scripts/deploy/stack-env.sh preprod check
  scripts/deploy/stack-env.sh preprod up
EOF
}

if [[ -z "$ENV_NAME" || -z "$ACTION" || "$ENV_NAME" == "help" || "$ACTION" == "help" ]]; then
  usage
  exit 0
fi

case "$ENV_NAME" in
  local|dev)
    ENV_NAME=local
    COMPOSE_FILE="${JT_COMPOSE:-docker-compose.yml}"
    ENV_FILE="${JT_ENV_FILE:-.env}"
    PROJECT="${JT_PROJECT:-jobbingtrack}"
    EXTRA_FILES=()
    if [[ -f docker-compose.https.yml ]]; then
      EXTRA_FILES+=(-f docker-compose.https.yml)
    fi
    ;;
  preprod|préprod)
    ENV_NAME=preprod
    COMPOSE_FILE="${JT_COMPOSE:-deploy/production/docker-compose.yml}"
    ENV_FILE="${JT_ENV_FILE:-deploy/production/.env.preprod}"
    PROJECT="${JT_PROJECT:-jobbingtrack-preprod}"
    EXTRA_FILES=()
    ;;
  prod|production)
    ENV_NAME=prod
    COMPOSE_FILE="${JT_COMPOSE:-deploy/production/docker-compose.yml}"
    ENV_FILE="${JT_ENV_FILE:-deploy/production/.env.prod}"
    PROJECT="${JT_PROJECT:-jobbingtrack-prod}"
    EXTRA_FILES=()
    ;;
  *)
    echo "Environnement inconnu : $ENV_NAME (local|preprod|prod)" >&2
    exit 1
    ;;
esac

compose() {
  local args=(-f "$COMPOSE_FILE" --project-name "$PROJECT")
  if [[ ${#EXTRA_FILES[@]} -gt 0 ]]; then
    args+=("${EXTRA_FILES[@]}")
  fi
  if [[ -f "$ENV_FILE" ]]; then
    args+=(--env-file "$ENV_FILE")
  fi
  docker compose "${args[@]}" "$@"
}

mark_mode() {
  printf '%s\n' "$1" > "$ROOT/.jobbingtrack-stack-mode"
}

case "$ACTION" in
  init)
    case "$ENV_NAME" in
      local)
        if [[ ! -f .env ]]; then
          if [[ -f .env.example ]]; then
            cp .env.example .env
            echo "Créé .env depuis .env.example — éditez les secrets."
          else
            echo "Pas de .env.example à la racine." >&2
            exit 1
          fi
        else
          echo ".env existe déjà — rien à faire."
        fi
        ;;
      preprod|prod)
        SRC="deploy/production/.env.example"
        if [[ ! -f "$SRC" ]]; then
          echo "Manquant : $SRC" >&2
          exit 1
        fi
        if [[ -f "$ENV_FILE" ]]; then
          echo "$ENV_FILE existe déjà — rien à faire."
        else
          cp "$SRC" "$ENV_FILE"
          echo "Créé $ENV_FILE depuis $SRC — remplacer secrets + domaines."
        fi
        ;;
    esac
    ;;
  check)
    if [[ "$ENV_NAME" == "local" ]]; then
      if [[ ! -f "$ENV_FILE" ]]; then
        echo "Manquant : $ENV_FILE (lancez init)" >&2
        exit 1
      fi
      echo "OK local — $ENV_FILE présent (check Portainer non applicable)."
    else
      bash "$ROOT/scripts/deploy/portainer-env-check.sh" "$ENV_FILE"
    fi
    ;;
  config)
    compose config >/dev/null
    echo "OK compose config ($ENV_NAME · $COMPOSE_FILE · project=$PROJECT)"
    ;;
  up)
    if [[ "$ENV_NAME" != "local" && ! -f "$ENV_FILE" ]]; then
      echo "Manquant $ENV_FILE — lancez : scripts/deploy/stack-env.sh $ENV_NAME init" >&2
      exit 1
    fi
    if [[ "$ENV_NAME" == "prod" ]]; then
      echo "ATTENTION : up prod local = compose deploy/production (pas le VPS Portainer)."
      echo "Sur VPS, préférer Portainer + docs/production/PORTEUR_ACTIONS_DEPLOIEMENT.md"
    fi
    compose up -d "$@"
    mark_mode "$ENV_NAME"
    echo "Stack $ENV_NAME démarrée (project=$PROJECT)."
    ;;
  down)
    compose down "$@"
    echo "Stack $ENV_NAME arrêtée."
    ;;
  status|ps)
    compose ps "$@"
    if [[ -f "$ROOT/.jobbingtrack-stack-mode" ]]; then
      echo "Mode stack local : $(cat "$ROOT/.jobbingtrack-stack-mode")"
    fi
    ;;
  logs)
    compose logs -f --tail=200 "$@"
    ;;
  *)
    echo "Action inconnue : $ACTION" >&2
    usage
    exit 1
    ;;
esac
