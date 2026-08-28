#!/usr/bin/env bash
# Déploie / met à jour la stack préprod sur le VPS (SSH).
# Prérequis : images GHCR :dev déjà buildées (workflow Build and Push), env généré.
# Usage (PC) :
#   bash scripts/deploy/generate-portainer-env.sh
#   bash scripts/deploy/vps-up-preprod.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH_HOST="${DEPLOY_SSH:-pavel-server}"
ENV_FILE="${ROOT}/deploy/production/.env.preprod.generated"
STACK_DIR="${VPS_STACK_DIR:-~/stacks/jobbingtrack-preprod}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Manquant: $ENV_FILE — lance bash scripts/deploy/generate-portainer-env.sh"
  exit 1
fi

scp -q "$ENV_FILE" "${SSH_HOST}:/tmp/jobbingtrack-preprod.env"
ssh "$SSH_HOST" "bash -s" <<REMOTE
set -euo pipefail
mkdir -p ${STACK_DIR}
cd ${STACK_DIR}
if [[ -d repo/.git ]]; then
  cd repo && git fetch origin dev && git reset --hard origin/dev && cd ..
else
  rm -rf repo
  git clone --depth 1 -b dev https://github.com/PavelDelhomme/JobbingTrack.git repo
fi
cp /tmp/jobbingtrack-preprod.env repo/deploy/production/.env
cd repo/deploy/production
docker compose --env-file .env -p jobbingtrack-preprod pull
docker compose --env-file .env -p jobbingtrack-preprod up -d
docker ps --filter name=jobbingtrack-preprod --format 'table {{.Names}}\t{{.Status}}'
REMOTE

echo
echo "Smoke :"
echo "  curl -fsS https://api-preprod.jobbingtrack.com/health"
echo "  open https://preprod.jobbingtrack.com/login"
