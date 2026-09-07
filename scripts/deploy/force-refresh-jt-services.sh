#!/usr/bin/env bash
# Recrée metrics-aggregator (+ frontend optionnel) sans geste Portainer manuel.
#
# Local (bind-mount src) : restart / force-recreate compose.
# VPS : pull GHCR + compose up --force-recreate (préprod :dev / prod :latest).
#
# Usage :
#   bash scripts/deploy/force-refresh-jt-services.sh local
#   bash scripts/deploy/force-refresh-jt-services.sh preprod
#   bash scripts/deploy/force-refresh-jt-services.sh prod
#   bash scripts/deploy/force-refresh-jt-services.sh preprod metrics-aggregator
#   SERVICES="metrics-aggregator frontend" bash scripts/deploy/force-refresh-jt-services.sh prod
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET="${1:-local}"
shift || true

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env" 2>/dev/null || true
  set +a
fi

SSH_HOST="${DEPLOY_SSH:-pavel-server}"
REGISTRY="${IMAGE_REGISTRY:-ghcr.io/paveldelhomme}"
STACK_REPO="${VPS_JT_STACK_REPO:-/home/pavel/stacks/jobbingtrack-files/repo/deploy/production}"

# Services Compose (noms dans deploy/production/docker-compose.yml)
DEFAULT_SERVICES=(metrics-aggregator frontend)
if [[ $# -gt 0 ]]; then
  SERVICES=("$@")
elif [[ -n "${JT_REFRESH_SERVICES:-}" ]]; then
  # shellcheck disable=SC2206
  SERVICES=($JT_REFRESH_SERVICES)
else
  SERVICES=("${DEFAULT_SERVICES[@]}")
fi

refresh_local() {
  echo "==> Local : recreate ${SERVICES[*]}"
  cd "$ROOT"
  # Conteneur local = jobbingtrack-metrics-aggregator (nom compose service)
  local compose_services=()
  for s in "${SERVICES[@]}"; do
    case "$s" in
      metrics-aggregator|jobbingtrack-metrics-aggregator)
        compose_services+=(jobbingtrack-metrics-aggregator)
        ;;
      frontend)
        compose_services+=(frontend)
        ;;
      *)
        compose_services+=("$s")
        ;;
    esac
  done
  docker compose -f docker-compose.yml --profile full up -d --force-recreate --no-deps "${compose_services[@]}"
  docker ps --filter name=jobbingtrack-metrics-aggregator --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
}

vps_env_for() {
  local target="$1"
  case "$target" in
    preprod)
      echo "/tmp/jt-preprod-redeploy/stack.env"
      ;;
    prod)
      echo "/tmp/jt-prod-redeploy/stack.env"
      ;;
    *)
      echo ""
      ;;
  esac
}

refresh_vps() {
  local target="$1"
  local image_tag project env_file
  case "$target" in
    preprod)
      image_tag="${IMAGE_TAG:-dev}"
      project="jobbingtrack-preprod"
      ;;
    prod)
      image_tag="${IMAGE_TAG:-latest}"
      project="jobbingtrack-prod"
      ;;
    *)
      echo "Cible VPS inconnue: $target" >&2
      exit 1
      ;;
  esac
  env_file="$(vps_env_for "$target")"

  echo "==> VPS ($SSH_HOST) : pull + force-recreate [$target] tag=:$image_tag services=${SERVICES[*]}"

  # shellcheck disable=SC2029
  ssh -o BatchMode=yes -o ConnectTimeout=20 "$SSH_HOST" bash -s -- \
    "$STACK_REPO" "$project" "$env_file" "$REGISTRY" "$image_tag" "${SERVICES[*]}" <<'REMOTE'
set -euo pipefail
STACK_REPO="$1"
PROJECT="$2"
ENV_FILE="$3"
REGISTRY="$4"
IMAGE_TAG="$5"
# shellcheck disable=SC2206
SERVICES=($6)

if [[ ! -d "$STACK_REPO" ]]; then
  echo "Stack repo introuvable: $STACK_REPO" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env stack introuvable: $ENV_FILE — utilise un env Portainer récent (jt-*-redeploy/stack.env)" >&2
  exit 1
fi

cd "$STACK_REPO"
# Aligner le compose Git sur la branche attendue (dev pour préprod, main ignoré si hotfix images)
if [[ -d ../../.git ]]; then
  git -C ../.. fetch --depth 1 origin 2>/dev/null || true
fi

for s in "${SERVICES[@]}"; do
  echo "    pull ${REGISTRY}/jobbingtrack-${s}:${IMAGE_TAG}"
  docker pull "${REGISTRY}/jobbingtrack-${s}:${IMAGE_TAG}"
done

echo "    compose up --force-recreate --no-deps ${SERVICES[*]}"
docker compose --env-file "$ENV_FILE" -p "$PROJECT" up -d --force-recreate --no-deps --pull always "${SERVICES[@]}"

echo "    état :"
docker ps --filter "name=${PROJECT}-" --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' \
  | grep -E "NAME|metrics-aggregator|frontend" || docker ps --filter "name=${PROJECT}-metrics" --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
REMOTE
}

verify_memory_budget() {
  local where="$1"
  echo "==> Vérif budget mémoire ($where)…"
  case "$where" in
    local)
      local key
      key="$(grep -E '^METRICS_API_KEY=' "$ROOT/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
      [[ -n "$key" ]] || { echo "METRICS_API_KEY manquant"; return 1; }
      local limit
      limit="$(
        curl -fsS -H "X-API-Key: $key" -H "Accept: application/json" \
          "http://127.0.0.1:5004/api/v1/metrics" \
          | python3 -c 'import json,sys; d=json.load(sys.stdin); m=((d.get("systemMetrics") or d.get("system") or {}).get("jobbingtrack") or {}).get("containers",{}).get("memory",{}); print(m.get("limit",""))'
      )"
      echo "    limit MB = $limit (attendu ≈ 8192)"
      python3 -c "import sys; lim=float(sys.argv[1] or 0); sys.exit(0 if 1000 <= lim <= 20000 else 1)" "$limit"
      ;;
    preprod|prod)
      local cname
      if [[ "$where" == "preprod" ]]; then
        cname="jobbingtrack-preprod-metrics-aggregator"
      else
        cname="jobbingtrack-prod-metrics-aggregator"
      fi
      ssh -o BatchMode=yes -o ConnectTimeout=20 "$SSH_HOST" bash -s -- "$cname" <<'REMOTE'
set -euo pipefail
CNAME="$1"
LIMIT="$(
  docker exec "$CNAME" node -e '
const key = process.env.METRICS_API_KEY || "";
fetch("http://127.0.0.1:3014/api/v1/metrics", { headers: { "X-API-Key": key, Accept: "application/json" } })
  .then((r) => r.json())
  .then((d) => {
    const m = (((d.systemMetrics || d.system || {}).jobbingtrack || {}).containers || {}).memory || {};
    process.stdout.write(String(m.limit ?? ""));
  })
  .catch((e) => { console.error(e); process.exit(2); });
'
)"
echo "    $CNAME limit MB = $LIMIT (attendu ≈ 8192)"
python3 -c "import sys; lim=float(sys.argv[1] or 0); sys.exit(0 if 1000 <= lim <= 20000 else 1)" "$LIMIT"
REMOTE
      ;;
  esac
}

case "$TARGET" in
  local)
    refresh_local
    sleep 3
    verify_memory_budget local || echo "⚠ vérif locale KO — attendre le 1er cycle collect (~30s) puis relancer"
    ;;
  preprod|prod)
    refresh_vps "$TARGET"
    sleep 5
    verify_memory_budget "$TARGET" || echo "⚠ vérif $TARGET KO — attendre collect puis relancer le script"
    ;;
  both|all)
    refresh_vps preprod
    refresh_vps prod
    ;;
  *)
    echo "Usage: $0 local|preprod|prod|both [service…]" >&2
    exit 1
    ;;
esac

echo "==> OK force-refresh ($TARGET)"
