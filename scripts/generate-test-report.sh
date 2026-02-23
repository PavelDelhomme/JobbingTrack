#!/bin/bash
# Script générique pour générer un rapport de test automatiquement
# Usage: ./scripts/generate-test-report.sh <test_type> <test_command> [test_name]

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Arguments
TEST_TYPE="${1:-general}"
TEST_COMMAND="${2}"
TEST_NAME="${3:-$TEST_TYPE}"

if [ -z "$TEST_COMMAND" ]; then
    echo -e "${RED}❌ Usage: $0 <test_type> <test_command> [test_name]${NC}"
    exit 1
fi

# Répertoires (en Docker : TESTS_RESULTS_DIR peut être /tmp/tests/results pour éviter Permission denied sur /app)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -n "$TESTS_RESULTS_DIR" ]; then
  RESULTS_DIR="$TESTS_RESULTS_DIR"
else
  RESULTS_DIR="$PROJECT_ROOT/tests/results"
fi
# Heure locale : TZ pour timestamps lisibles (ex. Europe/Paris) ; UTC stocké en plus pour affichage frontend en heure locale utilisateur
export TZ="${TZ:-Europe/Paris}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="$RESULTS_DIR/$TIMESTAMP"
mkdir -p "$REPORT_DIR" || {
    echo -e "${RED}❌ Impossible de créer le répertoire de résultats${NC}"
    exit 1
}

RESULT_FILE="$REPORT_DIR/${TEST_TYPE}.json"
HTML_REPORT="$REPORT_DIR/report.html"
SUMMARY_FILE="$REPORT_DIR/summary.json"

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🧪 GÉNÉRATION RAPPORT : $TEST_NAME${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
# Marqueurs visibles dans les logs (grep "[TESTS API]") pour repérer début / fin du run
if [ "$TEST_TYPE" = "api" ]; then
  echo "[TESTS API] Lancement de la suite Tests API — $(date '+%Y-%m-%dT%H:%M:%S %Z')"
fi
echo -e "${BLUE}📁 Répertoire des résultats : $REPORT_DIR${NC}"
echo ""

# Exécuter le test (exporter le fichier de résultats pour le script de test)
export TEST_RESULTS_FILE="$REPORT_DIR/test-results.txt"
export REPORT_DIR
echo -e "${YELLOW}🚀 Exécution du test...${NC}"
if [ "$TEST_TYPE" = "api" ]; then
  echo "[TESTS API] Début exécution des tests — $(date '+%Y-%m-%dT%H:%M:%S %Z')"
fi
echo ""

start_time=$(date +%s)
exit_code=0
output=""

# Exécuter le test et capturer la sortie
if eval "$TEST_COMMAND" > "$RESULT_FILE.tmp" 2>&1; then
    exit_code=0
else
    exit_code=$?
fi

end_time=$(date +%s)
duration=$((end_time - start_time))

if [ "$TEST_TYPE" = "api" ]; then
  echo "[TESTS API] Exécution des tests terminée — $(date '+%Y-%m-%dT%H:%M:%S %Z') — durée ${duration}s — exit $exit_code"
fi

# Lire les résultats et nettoyer les codes ANSI
if [ -f "$RESULT_FILE.tmp" ]; then
    output=$(cat "$RESULT_FILE.tmp" 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' || echo "")
else
    output="Aucune sortie disponible"
fi

# Extraire les statistiques (plusieurs patterns pour couvrir test-api-specific.sh et autres)
passed=0
failed=0
total=0
skipped=0

# Pattern 1: Résumé explicite "Total de tests : X", "Tests réussis : Y", "Tests échoués : Z"
if echo "$output" | grep -q "Total de tests\|Tests réussis\|Tests échoués"; then
    total=$(echo "$output" | grep -i "Total de tests" | tail -1 | grep -oE "[0-9]+" | head -1)
    passed=$(echo "$output" | grep -i "Tests réussis" | tail -1 | grep -oE "[0-9]+" | head -1)
    failed=$(echo "$output" | grep -i "Tests échoués" | tail -1 | grep -oE "[0-9]+" | head -1)
    skipped=$(echo "$output" | grep -i "Tests ignorés\|Tests skipped" | tail -1 | grep -oE "[0-9]+" | head -1)
fi

# Pattern 2: "Total: X tests", "X tests réussis", "X tests échoués"
if [ -z "$total" ] || ! [ "$total" -ge 1 ] 2>/dev/null; then
    if echo "$output" | grep -qE "Total: [0-9]+ tests"; then
        total=$(echo "$output" | grep -oE "Total: [0-9]+ tests" | grep -oE "[0-9]+" | head -1)
        passed=$(echo "$output" | grep -oE "[0-9]+ tests réussis" | grep -oE "^[0-9]+" | head -1)
        [ -z "$passed" ] && passed=$(echo "$output" | grep -oE "✅ [0-9]+ tests réussis" | grep -oE "[0-9]+" | head -1)
        failed=$(echo "$output" | grep -oE "[0-9]+ tests échoués" | grep -oE "^[0-9]+" | head -1)
        [ -z "$failed" ] && failed=$(echo "$output" | grep -oE "❌ [0-9]+ tests échoués" | grep -oE "[0-9]+" | head -1)
        skipped=$(echo "$output" | grep -oE "[0-9]+ tests.*(ignorés|skipped)" | grep -oE "^[0-9]+" | head -1)
    fi
fi

# Pattern 3: Compter les lignes "✓ PASS" et "✗ FAIL" (priorité si on a des lignes de résultat)
p3_passed=$(echo "$output" | grep -cE "✓ PASS|PASS - Status:" 2>/dev/null || echo "0")
p3_failed=$(echo "$output" | grep -cE "✗ FAIL|FAIL - Status:" 2>/dev/null || echo "0")
p3_skipped=$(echo "$output" | grep -cE "⊘ SKIP|SKIP|ignoré|skipped" 2>/dev/null || echo "0")
[ -z "$p3_passed" ] || ! [ "$p3_passed" -ge 0 ] 2>/dev/null && p3_passed=0
[ -z "$p3_failed" ] || ! [ "$p3_failed" -ge 0 ] 2>/dev/null && p3_failed=0
[ -z "$p3_skipped" ] || ! [ "$p3_skipped" -ge 0 ] 2>/dev/null && p3_skipped=0
p3_total=$((p3_passed + p3_failed + p3_skipped))
# Utiliser les comptages réels (pattern 3) si on a au moins un test et que le résumé texte est vide ou incohérent
if [ "$p3_total" -ge 1 ] && ([ -z "$total" ] || ! [ "$total" -ge 1 ] 2>/dev/null); then
    total=$p3_total
    passed=$p3_passed
    failed=$p3_failed
    skipped=$p3_skipped
elif [ "$p3_total" -ge 1 ] && [ "$total" -eq 0 ]; then
    total=$p3_total
    passed=$p3_passed
    failed=$p3_failed
    skipped=$p3_skipped
fi

# Pattern 4: Jest (Tests: X passed, Y failed, Z total — ordre variable)
if ([ -z "$total" ] || ! [ "$total" -ge 1 ] 2>/dev/null) && echo "$output" | grep -qE "Tests:.*[0-9]+.*total"; then
  jest_tests_line=$(echo "$output" | grep -E "Tests:.*[0-9]+.*total" | tail -1)
  if [ -n "$jest_tests_line" ]; then
    jest_total=$(echo "$jest_tests_line" | grep -oE "[0-9]+ total" | grep -oE "[0-9]+" | head -1)
    jest_passed=$(echo "$jest_tests_line" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" | head -1)
    jest_failed=$(echo "$jest_tests_line" | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+" | head -1)
    [ -n "$jest_total" ] && [ "$jest_total" -ge 0 ] 2>/dev/null && total=$jest_total
    [ -n "$jest_passed" ] && [ "$jest_passed" -ge 0 ] 2>/dev/null && passed=$jest_passed
    [ -n "$jest_failed" ] && [ "$jest_failed" -ge 0 ] 2>/dev/null && failed=$jest_failed
  fi
fi

# Pattern 5: Tests sécurité — lire security-report.json (total = vérifications, passed = sécurisées, failed = vulnérabilités)
report_status_override=""
if [ "$TEST_TYPE" = "security" ] && [ -f "$REPORT_DIR/security-report.json" ]; then
  sec_critical=0; sec_high=0; sec_medium=0; sec_low=0; sec_secure=0; sec_total=0
  if command -v jq >/dev/null 2>&1; then
    sec_total=$(jq -r '.totalVulnerabilities // ( .critical + .high + .medium + .low + .secure )' "$REPORT_DIR/security-report.json" 2>/dev/null)
    sec_secure=$(jq -r '.secure // 0' "$REPORT_DIR/security-report.json" 2>/dev/null)
    sec_critical=$(jq -r '.critical // 0' "$REPORT_DIR/security-report.json" 2>/dev/null)
    sec_high=$(jq -r '.high // 0' "$REPORT_DIR/security-report.json" 2>/dev/null)
    sec_medium=$(jq -r '.medium // 0' "$REPORT_DIR/security-report.json" 2>/dev/null)
    sec_low=$(jq -r '.low // 0' "$REPORT_DIR/security-report.json" 2>/dev/null)
  else
    # Fallback sans jq : extraire les champs du JSON avec grep/sed
    sec_secure=$(grep -o '"secure"[[:space:]]*:[[:space:]]*[0-9]*' "$REPORT_DIR/security-report.json" 2>/dev/null | grep -o '[0-9]*' | head -1)
    sec_critical=$(grep -o '"critical"[[:space:]]*:[[:space:]]*[0-9]*' "$REPORT_DIR/security-report.json" 2>/dev/null | grep -o '[0-9]*' | head -1)
    sec_high=$(grep -o '"high"[[:space:]]*:[[:space:]]*[0-9]*' "$REPORT_DIR/security-report.json" 2>/dev/null | grep -o '[0-9]*' | head -1)
    sec_medium=$(grep -o '"medium"[[:space:]]*:[[:space:]]*[0-9]*' "$REPORT_DIR/security-report.json" 2>/dev/null | grep -o '[0-9]*' | head -1)
    sec_low=$(grep -o '"low"[[:space:]]*:[[:space:]]*[0-9]*' "$REPORT_DIR/security-report.json" 2>/dev/null | grep -o '[0-9]*' | head -1)
    [ -z "$sec_secure" ] && sec_secure=0; [ -z "$sec_critical" ] && sec_critical=0; [ -z "$sec_high" ] && sec_high=0
    [ -z "$sec_medium" ] && sec_medium=0; [ -z "$sec_low" ] && sec_low=0
  fi
  sec_failed=$((sec_critical + sec_high + sec_medium + sec_low))
  [ -z "$sec_total" ] && sec_total=$((sec_secure + sec_failed))
  [ -n "$sec_total" ] && [ "$sec_total" -ge 0 ] 2>/dev/null && total=$sec_total
  [ -n "$sec_secure" ] && [ "$sec_secure" -ge 0 ] 2>/dev/null && passed=$sec_secure
  [ -n "$sec_failed" ] && [ "$sec_failed" -ge 0 ] 2>/dev/null && failed=$sec_failed
  # Statut rapport : failed si vulnérabilités (critical/high/medium/low > 0)
  if [ "$sec_failed" -gt 0 ] 2>/dev/null; then
    report_status_override="failed"
  fi
fi

# Pattern 6: Performance backend — parser la sortie "Total: N tests", "Tests réussis: N", "Tests échoués: N"
if [ "$TEST_TYPE" = "performance-backend" ] || [ "$TEST_TYPE" = "test-performance-backend" ]; then
  perf_total=$(echo "$output" | grep -oE 'Total:[[:space:]]+[0-9]+[[:space:]]+tests' | grep -oE '[0-9]+' | head -1)
  perf_passed=$(echo "$output" | grep -oE 'Tests réussis:[[:space:]]+[0-9]+' | grep -oE '[0-9]+' | head -1)
  perf_failed=$(echo "$output" | grep -oE 'Tests échoués:[[:space:]]+[0-9]+' | grep -oE '[0-9]+' | head -1)
  if [ -n "$perf_total" ] && [ "$perf_total" -ge 0 ] 2>/dev/null; then total=$perf_total; fi
  if [ -n "$perf_passed" ] && [ "$perf_passed" -ge 0 ] 2>/dev/null; then passed=$perf_passed; fi
  if [ -n "$perf_failed" ] && [ "$perf_failed" -ge 0 ] 2>/dev/null; then failed=$perf_failed; fi
  if [ "$failed" -gt 0 ] 2>/dev/null; then report_status_override="failed"; fi
fi

# Pattern 7: Backoffice E2E (Playwright) — lire test-results.json si présent (écrit dans REPORT_DIR)
if [ "$TEST_TYPE" = "backoffice" ] && [ -f "$REPORT_DIR/test-results.json" ]; then
  if command -v jq >/dev/null 2>&1; then
    pw_passed=$(jq -r '[.. | .status? | select(. == "passed")] | length' "$REPORT_DIR/test-results.json" 2>/dev/null)
    pw_failed=$(jq -r '[.. | .status? | select(. != null and . != "passed")] | length' "$REPORT_DIR/test-results.json" 2>/dev/null)
    [ -z "$pw_passed" ] && pw_passed=0; [ -z "$pw_failed" ] && pw_failed=0
    pw_total=$((pw_passed + pw_failed))
    [ "$pw_total" -ge 0 ] 2>/dev/null && total=$pw_total
    [ "$pw_passed" -ge 0 ] 2>/dev/null && passed=$pw_passed
    [ "$pw_failed" -ge 0 ] 2>/dev/null && failed=$pw_failed
    [ "$pw_failed" -gt 0 ] 2>/dev/null && report_status_override="failed"
  fi
fi

# S'assurer que toutes les variables sont des nombres valides
if [ -z "$total" ] || ! [ "$total" -ge 0 ] 2>/dev/null; then total=0; fi
if [ -z "$passed" ] || ! [ "$passed" -ge 0 ] 2>/dev/null; then passed=0; fi
if [ -z "$failed" ] || ! [ "$failed" -ge 0 ] 2>/dev/null; then failed=0; fi
if [ -z "$skipped" ] || ! [ "$skipped" -ge 0 ] 2>/dev/null; then skipped=0; fi

# Fallback: si aucune donnée parseable
if [ "$total" -eq 0 ]; then
  if echo "$output" | grep -qi "No tests found"; then
    # Jest "No tests found" → 1 test échoué pour afficher un statut clair (failed) au lieu de 0/0/0
    total=1
    passed=0
    failed=1
    report_status_override="failed"
  elif [ "$exit_code" -eq 0 ]; then
    total=1
    passed=1
  else
    total=1
    failed=1
  fi
fi

# Créer le JSON de résultat
clean_output=$(echo "$output" | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g')
# Échapper pour inclusion HTML (éviter de casser le rapport)
clean_output_html=$(echo "$clean_output" | head -2000 | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
line_count=$(echo "$clean_output" | wc -l | tr -d ' ')

if command -v jq > /dev/null 2>&1; then
    output_json=$(echo "$clean_output" | jq -Rs .)
else
    output_json=$(echo "$clean_output" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    output_json="\"$output_json\""
fi

# Construire la section "Résultats par test" (table) et "Tests en échec" (uniquement les échecs)
structured_tests_html=""
failed_tests_html=""
if [ -f "$REPORT_DIR/test-results.txt" ]; then
    while IFS='|' read -r tag num name status expected actual response; do
        [ "$tag" != "TEST" ] && continue
        name_esc=$(echo "$name" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')
        response_esc=$(echo "$response" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')
        status_class=$([ "$status" = "pass" ] && echo "success" || echo "failed")
        structured_tests_html="$structured_tests_html<tr><td>$num</td><td>$name_esc</td><td><span class=\"badge badge-$status_class\">$status</span></td><td>$expected</td><td>$actual</td><td class=\"response-cell\">$response_esc</td></tr>"
        if [ "$status" != "pass" ]; then
            failed_tests_html="$failed_tests_html<tr><td>$num</td><td>$name_esc</td><td><span class=\"badge badge-failed\">$status</span></td><td>$expected</td><td>$actual</td><td class=\"response-cell\">$response_esc</td></tr>"
        fi
    done < "$REPORT_DIR/test-results.txt" 2>/dev/null
fi

# Récupérer les logs des services (pendant l'exécution) depuis l'agrégateur
# Strip ANSI (ESC[... et \u001b[...) pour un rapport lisible
strip_ansi_logs() { sed -e 's/\x1b\[[0-9;]*[a-zA-Z]//g' -e 's/\\u001b\[[0-9;]*[a-zA-Z]//g' -e 's/\\u001b\[[0-9;]*m//g'; }
METRICS_AGGREGATOR_URL="${METRICS_AGGREGATOR_URL:-http://jobbingtrack-metrics-aggregator:3014}"
logs_services_html=""
for svc in api-gateway auth-service dashboard-service company-service application-service contact-service interview-service call-service event-service followup-service profile-service notification-service; do
    container_name="jobbingtrack-$svc"
    log_json=$(curl -s --connect-timeout 3 "$METRICS_AGGREGATOR_URL/api/v1/docker/service/$container_name/logs?lines=60" 2>/dev/null)
    if [ -n "$log_json" ] && echo "$log_json" | grep -q '"lines"'; then
        if command -v jq >/dev/null 2>&1; then
            log_text=$(echo "$log_json" | jq -r '.lines[]? // empty' 2>/dev/null | head -50)
        else
            # Sans jq: extraire uniquement le tableau .lines (pas errorLines/warningLines)
            log_text=$(echo "$log_json" | sed -n 's/.*"lines":\[//p' | sed 's/"], *"errorLines".*//' | sed 's/"], *"warningLines".*//' | tr ',' '\n' | sed 's/^"//;s/"$//;s/\\"/"/g' | head -50)
        fi
        [ -z "$log_text" ] && log_text="(aucune ligne ou format non supporté)"
        log_text=$(echo "$log_text" | strip_ansi_logs)
        log_escaped=$(echo "$log_text" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')
        logs_services_html="$logs_services_html<div class=\"log-service\"><h4>$container_name</h4><pre class=\"log-pre\">$log_escaped</pre></div>"
    else
        logs_services_html="$logs_services_html<div class=\"log-service\"><h4>$container_name</h4><pre class=\"log-pre\">(logs non disponibles)</pre></div>"
    fi
done

# Déterminer la catégorie selon le type de test
case "$TEST_TYPE" in
    api|test-api)
        category="Tests API"
        test_type="unitaire"
        ;;
    backend|test-backend)
        category="Tests Backend"
        test_type="unitaire"
        ;;
    frontend|test-frontend)
        category="Tests Frontend"
        test_type="unitaire"
        ;;
    playwright|test-playwright|e2e|test-e2e)
        category="E2E / Playwright"
        test_type="e2e"
        ;;
    performance-backend|test-performance-backend)
        category="Performance Backend"
        test_type="performance-backend"
        ;;
    performance-frontend|test-performance-frontend)
        category="Performance Frontend"
        test_type="performance-frontend"
        ;;
    backoffice|test-backoffice)
        category="Tests Backoffice"
        test_type="e2e"
        ;;
    security|test-security)
        category="Tests Sécurité"
        test_type="other"
        ;;
    *)
        category="Tests"
        test_type="other"
        ;;
esac

# Statut final : priorité à report_status_override (sécurité vulns, performance échecs), sinon exit_code
final_status="success"
[ $exit_code -ne 0 ] && final_status="failed"
[ -n "$report_status_override" ] && final_status="$report_status_override"

cat > "$RESULT_FILE" <<EOF
{
  "testName": "$TEST_NAME",
  "testType": "$test_type",
  "category": "$category",
  "command": "$TEST_COMMAND",
  "timestamp": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')",
  "duration": $duration,
  "exitCode": $exit_code,
  "status": "$final_status",
  "statistics": {
    "total": $total,
    "passed": $passed,
    "failed": $failed,
    "skipped": $skipped
  },
  "output": $output_json
}
EOF

# Créer le summary.json (generatedAtISO en UTC pour affichage en heure locale dans le frontend)
GENERATED_AT_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u '+%Y-%m-%dT%H:%M:%SZ')
cat > "$SUMMARY_FILE" <<EOF
{
  "timestamp": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')",
  "generatedAtISO": "$GENERATED_AT_ISO",
  "reportDir": "$REPORT_DIR",
  "testType": "$test_type",
  "category": "$category",
  "summary": {
    "totalTests": $total,
    "totalPassed": $passed,
    "totalFailed": $failed,
    "totalSkipped": $skipped,
    "successRate": $(awk "BEGIN {printf \"%.2f\", ($total > 0 ? ($passed / $total) * 100 : 0)}")
  },
  "testResults": [
    {
      "name": "$TEST_NAME",
      "status": "$final_status",
      "duration": $duration
    }
  ]
}
EOF

# Enrichir summary.json avec le détail sécurité (CRITIQUES, HAUTES, etc.) si disponible
if [ "$TEST_TYPE" = "security" ] && [ -f "$REPORT_DIR/security-report.json" ] && command -v jq >/dev/null 2>&1; then
  jq --slurpfile sec "$REPORT_DIR/security-report.json" '
    .summary.security = ($sec[0] | { critical, high, medium, low, secure })
  ' "$SUMMARY_FILE" > "$SUMMARY_FILE.tmp" && mv "$SUMMARY_FILE.tmp" "$SUMMARY_FILE"
fi

# Générer le rapport HTML (structure lisible, capture terminal nommée, prêt pour téléchargement)
cat > "$HTML_REPORT" <<EOHTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport - $TEST_NAME</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background: #f0f2f5; padding: 24px; color: #1a1a1a; line-height: 1.5; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { font-size: 1.75rem; color: #1a1a1a; margin-bottom: 8px; }
        .subtitle { color: #666; font-size: 0.95rem; margin-bottom: 24px; }
        .card { background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 20px; overflow: hidden; }
        .card-header { padding: 16px 20px; border-bottom: 1px solid #eee; font-weight: 600; font-size: 1.05rem; }
        .card-body { padding: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; }
        .stat { padding: 16px; border-radius: 8px; text-align: center; }
        .stat.total { background: #e3f2fd; color: #1565c0; }
        .stat.passed { background: #e8f5e9; color: #2e7d32; }
        .stat.failed { background: #ffebee; color: #c62828; }
        .stat.skipped { background: #fff8e1; color: #ef6c00; }
        .stat .value { font-size: 1.75rem; font-weight: 700; display: block; }
        .stat .label { font-size: 0.85rem; margin-top: 4px; color: inherit; opacity: 0.95; }
        .meta { color: #666; font-size: 0.875rem; margin-top: 16px; }
        .meta span { margin-right: 16px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
        .badge-success { background: #c8e6c9; color: #2e7d32; }
        .badge-failed { background: #ffcdd2; color: #c62828; }
        .section-terminal { margin-top: 8px; }
        .section-terminal summary { cursor: pointer; padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-weight: 500; list-style: none; user-select: none; }
        .section-terminal summary::-webkit-details-marker { display: none; }
        .section-terminal summary::before { content: '▶ '; font-size: 0.75rem; }
        .section-terminal[open] summary::before { content: '▼ '; }
        .terminal-block { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; margin-top: 12px; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 0.85rem; line-height: 1.5; white-space: pre-wrap; word-break: break-all; max-height: 70vh; overflow-y: auto; }
        .results-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.9rem; }
        .results-table th, .results-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
        .results-table th { background: #f8f9fa; font-weight: 600; }
        .results-table .response-cell { max-width: 320px; word-break: break-all; font-size: 0.8rem; color: #555; }
        .log-details { margin-top: 8px; }
        .log-details summary { cursor: pointer; padding: 10px 14px; background: #f0f2f5; border-radius: 8px; font-weight: 500; user-select: none; }
        .logs-container { margin-top: 12px; }
        .log-service { margin-bottom: 20px; }
        .log-service h4 { font-size: 0.95rem; margin-bottom: 8px; color: #333; }
        .log-pre { background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; max-height: 180px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; }
        @media print { body { background: #fff; padding: 0; } .card { box-shadow: none; border: 1px solid #ddd; } .print-only { display: block; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Rapport de test</h1>
        <p class="subtitle">$TEST_NAME · Catégorie : $category</p>

        <div class="card">
            <div class="card-header">Résumé</div>
            <div class="card-body">
                <div class="stats">
                    <div class="stat total"><span class="value">$total</span><span class="label">Tests exécutés</span></div>
                    <div class="stat passed"><span class="value">$passed</span><span class="label">Réussis</span></div>
                    <div class="stat failed"><span class="value">$failed</span><span class="label">Échoués</span></div>
                    $([ "$skipped" -gt 0 ] && echo "<div class=\"stat skipped\"><span class=\"value\">$skipped</span><span class=\"label\">Ignorés</span></div>" || echo "")
                </div>
                <div class="meta">
                    <span>Généré le <span id="report-generated-date" data-iso="$GENERATED_AT_ISO">$GENERATED_AT_ISO</span> (heure locale)</span>
                    <span>Durée : ${duration}s</span>
                    <span>Statut : <span class="badge badge-$final_status">$([ "$final_status" = "success" ] && echo "SUCCÈS" || echo "ÉCHEC")</span></span>
                </div>
            </div>
        </div>

        $([ "$failed" -gt 0 ] && [ -n "$failed_tests_html" ] && echo "
        <div class=\"card\">
            <div class=\"card-header\" style=\"border-left: 4px solid #c62828;\">❌ Tests en échec ($failed)</div>
            <div class=\"card-body\">
                <table class=\"results-table\">
                    <thead><tr><th>#</th><th>Test</th><th>Statut</th><th>Attendu</th><th>Reçu</th><th>Réponse (extrait)</th></tr></thead>
                    <tbody>$failed_tests_html</tbody>
                </table>
            </div>
        </div>
        ")

        $([ -n "$structured_tests_html" ] && echo "
        <div class=\"card\">
            <div class=\"card-header\">Résultats détaillés par test</div>
            <div class=\"card-body\">
                <table class=\"results-table\">
                    <thead><tr><th>#</th><th>Test</th><th>Statut</th><th>Attendu</th><th>Reçu</th><th>Réponse (extrait)</th></tr></thead>
                    <tbody>$structured_tests_html</tbody>
                </table>
            </div>
        </div>
        ")

        $([ -n "$logs_services_html" ] && echo "
        <div class=\"card\">
            <div class=\"card-header\">Logs des services (pendant l'exécution)</div>
            <div class=\"card-body\">
                <details class=\"log-details\">
                    <summary>Afficher les logs par service (cliquer pour ouvrir/fermer)</summary>
                    <div class=\"logs-container\">$logs_services_html</div>
                </details>
            </div>
        </div>
        ")

        <div class="card" id=\"detail-execution\">
            <div class=\"card-header\">Détail de l'exécution · Fin du rapport</div>
            <div class="card-body">
                <p class="meta" style="margin-bottom: 12px;"><strong>Statut:</strong> <span class="badge badge-$final_status">$final_status</span> · <strong>Durée:</strong> ${duration}s · <strong>Tests exécutés:</strong> $total · <strong>Réussis:</strong> <span style="color:#2e7d32">$passed</span> · <strong>Échoués:</strong> <span style="color:#c62828">$failed</span>$([ "$skipped" -gt 0 ] && echo " · <strong>Ignorés:</strong> $skipped" || echo "")</p>
                <div class="section-terminal">
                    <details>
                        <summary>Capture du terminal complet ($line_count lignes)</summary>
                        <div class="terminal-block">$clean_output_html</div>
                    </details>
                </div>
            </div>
        </div>
    </div>
    <script>
    (function(){
      var el = document.getElementById('report-generated-date');
      if (el && el.getAttribute('data-iso')) {
        try {
          var d = new Date(el.getAttribute('data-iso'));
          if (!isNaN(d.getTime())) el.textContent = d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
        } catch(e) {}
      }
    })();
    </script>
</body>
</html>
EOHTML

# Nettoyer
rm -f "$RESULT_FILE.tmp"

if [ "$TEST_TYPE" = "api" ]; then
  echo "[TESTS API] Fin de la génération du rapport — $(date '+%Y-%m-%dT%H:%M:%S%z') — $REPORT_DIR"
fi
echo ""
echo -e "${GREEN}✅ Rapport généré avec succès !${NC}"
echo -e "${BLUE}📁 Répertoire : $REPORT_DIR${NC}"
echo -e "${BLUE}📄 Rapport HTML : $HTML_REPORT${NC}"
echo -e "${BLUE}📊 Summary JSON : $SUMMARY_FILE${NC}"
echo ""

# Retourner le code de sortie du test
exit $exit_code

