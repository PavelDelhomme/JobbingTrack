#!/usr/bin/env bash
# Redeploy stack JobbingTrack sur le VPS — SANS webhook Portainer Pro (CE).
# Stratégies (ordre) :
#   1) SSH          → DEPLOY_SSH (+ DEPLOY_SSH_CMD optionnel)
#   2) Portainer CE → PORTAINER_URL + PORTAINER_API_KEY (Access Token)
#   3) Watchtower   → poll auto (~5 min) — voir deploy/watchtower-compose.yml
#
# Usage :
#   bash scripts/deploy/redeploy-vps.sh              # préprod (dev)
#   bash scripts/deploy/redeploy-vps.sh prod         # prod (main)
#   IMAGE_TAG=latest PORTAINER_STACK_NAME=jobbingtrack-prod bash scripts/deploy/redeploy-vps.sh prod
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

TARGET="${1:-preprod}"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env" 2>/dev/null || true
  set +a
fi

case "$TARGET" in
  prod|production|main)
    TARGET="prod"
    GIT_BRANCH="${DEPLOY_GIT_BRANCH:-main}"
    IMAGE_TAG="${IMAGE_TAG:-latest}"
    STACK_NAME="${PORTAINER_STACK_NAME_PROD:-${PORTAINER_STACK_NAME:-jobbingtrack-prod}}"
    ;;
  preprod|dev|*)
    TARGET="preprod"
    GIT_BRANCH="${DEPLOY_GIT_BRANCH:-dev}"
    IMAGE_TAG="${IMAGE_TAG:-dev}"
    STACK_NAME="${PORTAINER_STACK_NAME_PREPROD:-${PORTAINER_STACK_NAME:-jobbingtrack-preprod}}"
    ;;
esac

GITHUB_REPO="${GITHUB_REPO:-PavelDelhomme/JobbingTrack}"
WAIT_BUILD="${DEPLOY_WAIT_BUILD:-1}"
WAIT_SECS="${DEPLOY_IMAGE_WAIT_SECS:-180}"

wait_for_ghcr_build() {
  if [[ "$WAIT_BUILD" != "1" ]]; then
    echo "==> Skip attente CI (DEPLOY_WAIT_BUILD=$WAIT_BUILD)"
    return 0
  fi
  if command -v gh >/dev/null 2>&1; then
    echo "==> Attente GitHub Actions (build-push-images / branche $GIT_BRANCH)…"
    local run_id
    run_id="$(
      gh run list --repo "$GITHUB_REPO" --branch "$GIT_BRANCH" --limit 5 \
        --json databaseId,name,status \
        --jq '[.[] | select(.name|test("Build and Push";"i"))][0].databaseId // empty' 2>/dev/null || true
    )"
    if [[ -z "$run_id" ]]; then
      run_id="$(
        gh run list --repo "$GITHUB_REPO" --branch "$GIT_BRANCH" --limit 1 \
          --json databaseId --jq '.[0].databaseId // empty' 2>/dev/null || true
      )"
    fi
    if [[ -n "$run_id" ]]; then
      gh run watch "$run_id" --exit-status
      echo "==> Images GHCR à jour (run $run_id)"
      return 0
    fi
    echo "==> Pas de run GH trouvé — attente fixe ${WAIT_SECS}s"
  else
    echo "==> gh CLI absent — attente fixe ${WAIT_SECS}s (build GHCR)"
  fi
  sleep "$WAIT_SECS"
}

redeploy_ssh() {
  local target="${DEPLOY_SSH:-}"
  [[ -n "$target" ]] || return 1
  local cmd="${DEPLOY_SSH_CMD:-}"
  if [[ -z "$cmd" ]]; then
    cmd="echo 'Configure DEPLOY_SSH_CMD pour pull/redeploy stack $STACK_NAME sur le VPS'"
    echo "==> DEPLOY_SSH défini mais DEPLOY_SSH_CMD vide — voir DEPLOY.md"
    return 1
  fi
  echo "==> Redeploy SSH → $target"
  echo "    $cmd"
  # shellcheck disable=SC2029
  ssh -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new "$target" "$cmd"
}

redeploy_portainer_api() {
  local base="${PORTAINER_URL:-}"
  local key="${PORTAINER_API_KEY:-}"
  [[ -n "$base" && -n "$key" ]] || return 1
  base="${base%/}"

  echo "==> Redeploy via Portainer API CE → $base (stack=$STACK_NAME, tag=$IMAGE_TAG)"

  export PORTAINER_URL="$base" PORTAINER_API_KEY="$key" PORTAINER_STACK_NAME="$STACK_NAME"
  export PORTAINER_STACK_ID="${PORTAINER_STACK_ID:-}" PORTAINER_ENDPOINT_ID="${PORTAINER_ENDPOINT_ID:-}"

  python3 <<'PY'
import json, os, sys, urllib.error, urllib.request

base = os.environ["PORTAINER_URL"].rstrip("/")
key = os.environ["PORTAINER_API_KEY"]
name = os.environ["PORTAINER_STACK_NAME"]
force_id = os.environ.get("PORTAINER_STACK_ID") or ""
force_ep = os.environ.get("PORTAINER_ENDPOINT_ID") or ""

def req(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    r = urllib.request.Request(
        base + path,
        data=data,
        method=method,
        headers={"X-API-Key": key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(r, timeout=300) as res:
            raw = res.read().decode() or "{}"
            return res.status, json.loads(raw) if raw.strip() else {}
    except urllib.error.HTTPError as e:
        err = e.read().decode(errors="replace")
        raise SystemExit(f"HTTP {e.code} {path}: {err[:800]}") from e

status, stacks = req("GET", "/api/stacks")
if not isinstance(stacks, list):
    raise SystemExit(f"Réponse stacks inattendue: {stacks!r}")

stack = next((s for s in stacks if s.get("Name") == name), None)
if not stack and force_id:
    stack = next((s for s in stacks if str(s.get("Id")) == str(force_id)), None)
if not stack:
    names = [s.get("Name") for s in stacks]
    raise SystemExit(f"Stack « {name} » introuvable. Dispo: {names}")

sid = int(force_id or stack["Id"])
ep = int(force_ep or stack.get("EndpointId") or 1)
is_git = bool(stack.get("GitConfig"))
print(f"    stackId={sid} endpointId={ep} type={'git' if is_git else 'file'}")

if is_git:
    code, _ = req(
        "PUT",
        f"/api/stacks/{sid}/git/redeploy?endpointId={ep}",
        {"pullImage": True, "RepullImageAndRedeploy": True},
    )
    print(f"    git/redeploy → HTTP {code}")
else:
    _, file_info = req("GET", f"/api/stacks/{sid}/file")
    content = file_info.get("StackFileContent") or ""
    if not content:
        raise SystemExit("StackFileContent vide — impossible de redeploy")
    code, _ = req(
        "PUT",
        f"/api/stacks/{sid}?endpointId={ep}",
        {
            "StackFileContent": content,
            "Prune": False,
            "pullImage": True,
            "RepullImageAndRedeploy": True,
        },
    )
    print(f"    stack update + repull → HTTP {code}")

print("==> Portainer API : redeploy OK")
PY
}

print_help() {
  echo "==> Aucun SSH / Portainer API configuré ($TARGET)"
  echo ""
  echo "    Portainer CE n'a PAS les webhooks (Pro). Contournements :"
  echo ""
  echo "    A) Watchtower (recommandé multi-conteneurs)"
  echo "       Stack deploy/watchtower-compose.yml sur le VPS"
  echo "       Les services JobbingTrack ont le label watchtower.enable=true"
  echo "       → pull auto des images GHCR tag :$IMAGE_TAG sous ~5 min"
  echo ""
  echo "    B) Access Token Portainer (gratuit CE)"
  echo "       Portainer → profil → Access tokens"
  echo "       Dans .env : PORTAINER_URL, PORTAINER_API_KEY, PORTAINER_STACK_NAME=$STACK_NAME"
  echo ""
  echo "    C) SSH — DEPLOY_SSH + DEPLOY_SSH_CMD"
  echo ""
  echo "    D) Portainer UI → stack $STACK_NAME → Pull and redeploy (sans Remove volumes)"
}

main() {
  echo "==> Redeploy VPS [$TARGET] stack=$STACK_NAME tag=$IMAGE_TAG branch=$GIT_BRANCH"
  wait_for_ghcr_build

  if [[ -n "${DEPLOY_SSH:-}" ]]; then
    redeploy_ssh
    echo "==> OK (SSH)"
    return 0
  fi
  if [[ -n "${PORTAINER_URL:-}" && -n "${PORTAINER_API_KEY:-}" ]]; then
    redeploy_portainer_api
    echo "==> OK (Portainer API CE)"
    return 0
  fi
  print_help
  return 0
}

main "$@"
