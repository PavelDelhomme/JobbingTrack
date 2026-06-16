#!/usr/bin/env bash
# Smoke B7/B8 — investigation + audit (usage local, lit .env racine)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
read_env() { grep -E "^${1}=" "$ROOT/.env" | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//'; }
EMAIL="$(read_env ADMIN_EMAIL)"
PASS="$(read_env ADMIN_PASSWORD)"
API="$(read_env API_GATEWAY_PORT)"
API="${API:-5002}"
BASE="http://127.0.0.1:${API}"
[ -n "$EMAIL" ] && [ -n "$PASS" ] || { echo "ADMIN_EMAIL/PASSWORD manquants dans .env"; exit 1; }
echo "== Login admin =="
LOGIN=$(curl -sS -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$LOGIN" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); if(!j.token&&!j.accessToken) { console.error(JSON.stringify(j)); process.exit(1);} console.log(j.token||j.accessToken);")
echo "OK token obtenu"

AUTH=(-H "Authorization: Bearer $TOKEN")

echo "== GET /api/v1/security/audit =="
AUDIT=$(curl -sS "${AUTH[@]}" "$BASE/api/v1/security/audit?limit=5")
echo "$AUDIT" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); if(j.success!==true) { console.error(j); process.exit(1);} console.log('audit rows:', (j.data||[]).length, 'tableMissing:', j.tableMissing);"

echo "== GET /api/v1/security/investigation/search =="
SEARCH=$(curl -sS "${AUTH[@]}" "$BASE/api/v1/security/investigation/search?limit=20")
echo "$SEARCH" | node -e "
const j=JSON.parse(require('fs').readFileSync(0,'utf8'));
if(j.success!==true) { console.error(j); process.exit(1);}
const d=j.data||{};
console.log('counts:', JSON.stringify(d.counts||{}));
console.log('threats:', (d.threats||[]).length, 'audit:', (d.auditEvents||[]).length, 'accounts:', (d.impactedAccounts||[]).length);
"

echo "== POST /api/v1/security/investigation/export (JSON bundle) =="
EXPORT=$(curl -sS -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
  "$BASE/api/v1/security/investigation/export" \
  -d '{"sections":["audit","threats","impactedAccounts"],"format":"json"}')
echo "$EXPORT" | node -e "
const j=JSON.parse(require('fs').readFileSync(0,'utf8'));
if(j.success!==true) { console.error(j); process.exit(1);}
console.log('auditRecorded:', j.auditRecorded, 'sections:', j.data?.sections);
console.log('recordCounts:', JSON.stringify(j.data?.recordCounts||{}));
"

echo "== POST /api/v1/security/investigation/export (CSV menaces) =="
CSV=$(curl -sS -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
  "$BASE/api/v1/security/investigation/export" \
  -d '{"sections":["threats"],"format":"csv"}')
echo "$CSV" | head -3
echo "$CSV" | node -e "
const t=require('fs').readFileSync(0,'utf8');
if(!t.includes('id,detectedAt')) { console.error('CSV header manquant'); process.exit(1);} 
console.log('CSV OK, lignes:', t.split('\\n').length);
"

echo "== Vérifier audit security_export =="
AFTER=$(curl -sS "${AUTH[@]}" "$BASE/api/v1/security/audit?action=security_export&limit=3")
echo "$AFTER" | node -e "
const j=JSON.parse(require('fs').readFileSync(0,'utf8'));
const rows=(j.data||[]).filter(r=>r.action==='security_export');
if(rows.length===0) { console.error('Aucun security_export en audit'); process.exit(1);}
console.log('security_export trouvé:', rows.length, 'dernier outcome:', rows[0].outcome);
"

echo "== Smoke B7/B8 OK =="
