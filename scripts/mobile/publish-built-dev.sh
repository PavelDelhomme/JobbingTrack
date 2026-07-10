#!/usr/bin/env bash
# Publie l'APK debug buildé sur l'hôte vers le canal OTA dev (copie serveur, sans upload navigateur).
#
# Usage :
#   bash scripts/mobile/publish-built-dev.sh
#   bash scripts/mobile/publish-built-dev.sh --notes "Correctif FAB"
#
# Prérequis : APK sur l'hôte (make reinstall-app / Build APK backoffice) ; stack Docker up.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NOTES="Publication dev depuis publish-built-dev.sh"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --notes) NOTES="${2:-}"; shift 2 ;;
    *) echo "Usage: $0 [--notes \"…\"]"; exit 1 ;;
  esac
done

APK_HOST="$ROOT/mobile/build/app/outputs/flutter-apk/app-debug.apk"
[[ -f "$APK_HOST" ]] || {
  echo "[publish-dev] ERREUR: APK introuvable — lancez d'abord make reinstall-app ou « Build APK » (étape 1)." >&2
  exit 1
}

apk_mb=$(du -m "$APK_HOST" | awk '{print $1}')
echo "[publish-dev] APK hôte OK (${apk_mb} Mo)"

ensure_gateway_sees_apk() {
  if docker exec jobbingtrack-api-gateway test -f /app/mobile-apk-build/app-debug.apk 2>/dev/null; then
    return 0
  fi
  echo "[publish-dev] Montage APK vide dans api-gateway — recreate conteneur…"
  docker compose -f "$ROOT/docker-compose.yml" up -d api-gateway --force-recreate
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${API_GATEWAY_PORT:-5002}/health" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  if ! docker exec jobbingtrack-api-gateway test -f /app/mobile-apk-build/app-debug.apk 2>/dev/null; then
    echo "[publish-dev] ERREUR: l'APK reste invisible dans api-gateway après recreate." >&2
    echo "  Vérifiez: docker exec jobbingtrack-api-gateway ls -la /app/mobile-apk-build/" >&2
    exit 1
  fi
  echo "[publish-dev] Montage APK OK après recreate"
}

ensure_gateway_sees_apk

ROOT="$ROOT" NOTES="$NOTES" node -e "
const path=require('path');
const ROOT=process.env.ROOT;
const notes=process.env.NOTES;
const {loginAdminToken, requestJson}=require(path.join(ROOT,'scripts/ops/load-root-env.cjs'));
(async()=>{
  const {token, apiBase}=await loginAdminToken(ROOT);
  const pub=await requestJson(apiBase+'/api/v1/admin/mobile/releases/publish-built',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({channel:'dev',platform:'android',releaseNotes:notes})
  });
  if(pub.status!==200 && pub.status!==201){
    console.error(JSON.stringify(pub.data,null,2));
    process.exit(1);
  }
  const r=pub.data.release||pub.data.data?.release||{};
  console.log('[publish-dev] OK canal dev —', r.version+'+'+r.buildNumber, r.filename||'');
})().catch(e=>{ console.error(e.message||e); process.exit(1); });
"

echo "[publish-dev] Terminé — vérifiez /backoffice/mobile/releases puis OTA Samsung (étape 4)."
