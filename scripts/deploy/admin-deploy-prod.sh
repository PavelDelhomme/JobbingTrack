#!/usr/bin/env bash
# Déploiement production depuis poste local (APP_ENV=local uniquement).
# Flux : sync branche courante → dev → merge dev → main → GHCR :latest → redeploy VPS prod
#
# Usage :
#   bash scripts/deploy/admin-deploy-prod.sh web
#   bash scripts/deploy/admin-deploy-prod.sh apk
#   bash scripts/deploy/admin-deploy-prod.sh all
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

MODE="${1:-web}"
PROD_URL="${DEPLOY_URL:-${PROD_APP_URL:-https://jobbingtrack.example.com}}"
PROD_URL="${PROD_URL%/}"
STASHED=0

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

cleanup_stash() {
  if [[ "$STASHED" == "1" ]]; then
    echo "==> Restauration du stash local…"
    git stash pop || echo "    (stash pop conflictuel — vérifie git stash list)"
  fi
}
trap cleanup_stash EXIT

ensure_clean_or_stash() {
  if [[ -z "$(git status --porcelain)" ]]; then
    return 0
  fi
  echo "==> Working tree sale — stash automatique avant bascule de branche"
  git status --short
  git stash push -u -m "admin-deploy-auto $(date -Iseconds)"
  STASHED=1
}

sync_dev_from_current() {
  local current
  current="$(git branch --show-current)"
  echo "==> Push branche courante ($current)…"
  git push -u origin HEAD

  if [[ "$current" != "dev" && "$current" != "main" ]]; then
    echo "==> Merge $current → origin/dev…"
    git fetch origin
    git checkout dev
    git pull origin dev
    git merge "origin/$current" -m "merge: $current → dev (admin-deploy)"
    git push origin dev
    git checkout "$current"
  elif [[ "$current" == "dev" ]]; then
    git push origin dev
  fi
}

deploy_web() {
  ensure_clean_or_stash
  sync_dev_from_current

  echo "==> Web : merge origin/dev → main + push (images GHCR :latest)"
  git fetch origin
  local current
  current="$(git branch --show-current)"
  git checkout main
  git pull origin main
  git merge origin/dev -m "merge: promu dev → main (admin-deploy prod)"
  git push origin main
  git checkout "$current"
  echo "==> Push main OK — GitHub Actions build ghcr.io/…/jobbingtrack-*:latest"

  echo "==> Redeploy VPS prod…"
  IMAGE_TAG=latest \
    PORTAINER_STACK_NAME="${PORTAINER_STACK_NAME_PROD:-jobbingtrack-prod}" \
    bash "$ROOT/scripts/deploy/redeploy-vps.sh" prod
}

deploy_apk() {
  echo "==> APK : build + upload vers $PROD_URL (canal production)"
  DEPLOY_URL="$PROD_URL" \
    API_BASE_URL="${API_BASE_URL:-$PROD_URL}" \
    MOBILE_RELEASE_CHANNEL=production \
    BUILD_FIRST=1 \
    bash "$ROOT/scripts/deploy/publish-apk-remote.sh"
}

case "$MODE" in
  web) deploy_web ;;
  apk) deploy_apk ;;
  all)
    deploy_web
    deploy_apk
    ;;
  *)
    echo "Usage: $0 web|apk|all" >&2
    exit 1
    ;;
esac

echo "==> Terminé ($MODE)"
