#!/usr/bin/env bash
# Déploiement préprod (branche dev) depuis poste local.
# Flux : push branche courante → dev → GHCR :dev → redeploy stack préprod VPS
#
# Usage :
#   bash scripts/deploy/admin-deploy-dev.sh
#   bash scripts/deploy/admin-deploy-dev.sh --no-redeploy
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

REDEPLOY=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-redeploy) REDEPLOY=0; shift ;;
    *) echo "Usage: $0 [--no-redeploy]"; exit 1 ;;
  esac
done

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env" 2>/dev/null || true
  set +a
fi

APP_ENV_NOW="${APP_ENV:-local}"
if [[ "$APP_ENV_NOW" != "local" && "${ALLOW_REMOTE_ADMIN_DEPLOY:-0}" != "1" ]]; then
  echo "Refus : APP_ENV=$APP_ENV_NOW (déploiement Admin réservé au local)" >&2
  exit 2
fi

current="$(git branch --show-current)"
echo "==> Push branche courante ($current)…"
git push -u origin HEAD

if [[ "$current" != "dev" ]]; then
  echo "==> Merge $current → dev…"
  git fetch origin
  git checkout dev
  git pull origin dev
  git merge "origin/$current" -m "merge: $current → dev (admin-deploy-dev)"
  git push origin dev
  git checkout "$current"
else
  git push origin dev
fi

echo "==> Push dev OK — GitHub Actions build ghcr.io/…/jobbingtrack-*:dev"

if [[ "$REDEPLOY" == "1" ]]; then
  echo "==> Redeploy VPS préprod…"
  IMAGE_TAG=dev \
    PORTAINER_STACK_NAME="${PORTAINER_STACK_NAME_PREPROD:-jobbingtrack-preprod}" \
    bash "$ROOT/scripts/deploy/redeploy-vps.sh" preprod
else
  echo "==> Redeploy ignoré (--no-redeploy). Watchtower ou Portainer manuel."
fi

echo "==> Terminé (dev / préprod)"
