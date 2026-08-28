#!/usr/bin/env bash
# Clone / pull le dépôt sur le VPS pour les bind mounts Portainer CE
# (config/, backend/init-db/). STACK_REPO_PATH par défaut ci-dessous.
#
# Usage (depuis le PC) :
#   bash scripts/deploy/sync-vps-stack-files.sh
#   VPS_HOST=pavel-server BRANCH=dev bash scripts/deploy/sync-vps-stack-files.sh
set -euo pipefail

VPS_HOST="${VPS_HOST:-pavel-server}"
BRANCH="${BRANCH:-dev}"
REMOTE_PATH="${STACK_REPO_PATH:-/home/pavel/stacks/jobbingtrack-files/repo}"
REPO_URL="${REPO_URL:-https://github.com/PavelDelhomme/JobbingTrack.git}"

ssh "$VPS_HOST" "bash -s" <<REMOTE
set -euo pipefail
REMOTE_PATH="$REMOTE_PATH"
BRANCH="$BRANCH"
REPO_URL="$REPO_URL"
mkdir -p "\$(dirname "\$REMOTE_PATH")"
if [ ! -d "\$REMOTE_PATH/.git" ]; then
  git clone --depth 1 -b "\$BRANCH" "\$REPO_URL" "\$REMOTE_PATH"
else
  cd "\$REMOTE_PATH"
  git fetch origin "\$BRANCH"
  git checkout -f "origin/\$BRANCH"
fi
cd "\$REMOTE_PATH"
test -f config/jt-env-policy.cjs
test -d backend/init-db
echo "OK \$REMOTE_PATH @ \$(git log -1 --oneline)"
REMOTE
