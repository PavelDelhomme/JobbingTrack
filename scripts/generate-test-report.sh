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

# Répertoires
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/tests/results"
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
echo -e "${BLUE}📁 Répertoire des résultats : $REPORT_DIR${NC}"
echo ""

# Exécuter le test
echo -e "${YELLOW}🚀 Exécution du test...${NC}"
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

# Lire les résultats et nettoyer les codes ANSI
if [ -f "$RESULT_FILE.tmp" ]; then
    output=$(cat "$RESULT_FILE.tmp" 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' || echo "")
else
    output="Aucune sortie disponible"
fi

# Extraire les statistiques
passed=0
failed=0
total=0
skipped=0

# Pattern 1: "Total de tests : X", "Tests réussis : Y", "Tests échoués : Z"
if echo "$output" | grep -q "Total de tests\|Tests réussis\|Tests échoués"; then
    total=$(echo "$output" | grep -i "Total de tests" | grep -oE "[0-9]+" | head -1)
    passed=$(echo "$output" | grep -i "Tests réussis" | grep -oE "[0-9]+" | head -1)
    failed=$(echo "$output" | grep -i "Tests échoués" | grep -oE "[0-9]+" | head -1)
    skipped=$(echo "$output" | grep -i "Tests ignorés\|Tests skipped" | grep -oE "[0-9]+" | head -1)
# Pattern 2: "Total: X tests", "X tests réussis", "X tests échoués"
elif echo "$output" | grep -qE "Total: [0-9]+ tests"; then
    total=$(echo "$output" | grep -oE "Total: [0-9]+ tests" | grep -oE "[0-9]+" | head -1)
    passed=$(echo "$output" | grep -oE "[0-9]+ tests réussis" | grep -oE "^[0-9]+" | head -1)
    if [ -z "$passed" ]; then
        passed=$(echo "$output" | grep -oE "✅ [0-9]+ tests réussis" | grep -oE "[0-9]+" | head -1)
    fi
    failed=$(echo "$output" | grep -oE "[0-9]+ tests échoués" | grep -oE "^[0-9]+" | head -1)
    if [ -z "$failed" ]; then
        failed=$(echo "$output" | grep -oE "❌ [0-9]+ tests échoués" | grep -oE "[0-9]+" | head -1)
    fi
    skipped=$(echo "$output" | grep -oE "[0-9]+ tests.*(ignorés|skipped)" | grep -oE "^[0-9]+" | head -1)
# Pattern 3: Compter les PASS et FAIL
else
    passed=$(echo "$output" | grep -cE "(✓ PASS|PASS|✓|réussis|✅|passed)" 2>/dev/null || echo "0")
    failed=$(echo "$output" | grep -cE "(✗ FAIL|FAIL|✗|échoué|❌|failed)" 2>/dev/null || echo "0")
    skipped=$(echo "$output" | grep -cE "(⊘ SKIP|SKIP|⊘|ignoré|skipped)" 2>/dev/null || echo "0")
    if [ -z "$passed" ] || ! [ "$passed" -ge 0 ] 2>/dev/null; then passed=0; fi
    if [ -z "$failed" ] || ! [ "$failed" -ge 0 ] 2>/dev/null; then failed=0; fi
    if [ -z "$skipped" ] || ! [ "$skipped" -ge 0 ] 2>/dev/null; then skipped=0; fi
    total=$((passed + failed + skipped))
fi

# S'assurer que toutes les variables sont des nombres valides
if [ -z "$total" ] || ! [ "$total" -ge 0 ] 2>/dev/null; then total=0; fi
if [ -z "$passed" ] || ! [ "$passed" -ge 0 ] 2>/dev/null; then passed=0; fi
if [ -z "$failed" ] || ! [ "$failed" -ge 0 ] 2>/dev/null; then failed=0; fi
if [ -z "$skipped" ] || ! [ "$skipped" -ge 0 ] 2>/dev/null; then skipped=0; fi

# Si total est 0, on compte 1 test (la catégorie elle-même)
if [ "$total" -eq 0 ]; then
    if [ "$exit_code" -eq 0 ]; then
        total=1
        passed=1
    else
        total=1
        failed=1
    fi
fi

# Créer le JSON de résultat
clean_output=$(echo "$output" | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g')

if command -v jq > /dev/null 2>&1; then
    output_json=$(echo "$clean_output" | jq -Rs .)
else
    output_json=$(echo "$clean_output" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    output_json="\"$output_json\""
fi

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
    *)
        category="Tests"
        test_type="other"
        ;;
esac

cat > "$RESULT_FILE" <<EOF
{
  "testName": "$TEST_NAME",
  "testType": "$test_type",
  "category": "$category",
  "command": "$TEST_COMMAND",
  "timestamp": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')",
  "duration": $duration,
  "exitCode": $exit_code,
  "status": "$([ $exit_code -eq 0 ] && echo "success" || echo "failed")",
  "statistics": {
    "total": $total,
    "passed": $passed,
    "failed": $failed,
    "skipped": $skipped
  },
  "output": $output_json
}
EOF

# Créer le summary.json
cat > "$SUMMARY_FILE" <<EOF
{
  "timestamp": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')",
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
      "status": "$([ $exit_code -eq 0 ] && echo "success" || echo "failed")",
      "duration": $duration
    }
  ]
}
EOF

# Générer le rapport HTML
cat > "$HTML_REPORT" <<EOF
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Test - $TEST_NAME</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; margin-bottom: 30px; }
        .summary { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: flex; gap: 20px; margin-top: 15px; flex-wrap: wrap; }
        .stat { flex: 1; min-width: 150px; padding: 15px; border-radius: 6px; text-align: center; }
        .stat.total { background: #e3f2fd; color: #1976d2; }
        .stat.passed { background: #e8f5e9; color: #388e3c; }
        .stat.failed { background: #ffebee; color: #d32f2f; }
        .stat.skipped { background: #fff3e0; color: #f57c00; }
        .stat h3 { font-size: 2em; margin-bottom: 5px; }
        .test-result { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-result.success { border-left: 4px solid #4caf50; }
        .test-result.failed { border-left: 4px solid #f44336; }
        .status-success { color: #4caf50; font-weight: bold; }
        .status-failed { color: #f44336; font-weight: bold; }
        .meta { color: #666; font-size: 0.9em; margin-top: 10px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; margin-top: 10px; white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', monospace; font-size: 0.9em; max-height: 600px; overflow-y: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Rapport de Test - $TEST_NAME</h1>
        <div class="summary">
            <h2>Résumé</h2>
            <div class="stats">
                <div class="stat total">
                    <h3>$total</h3>
                    <p>Total Tests</p>
                </div>
                <div class="stat passed">
                    <h3>$passed</h3>
                    <p>Réussis</p>
                </div>
                <div class="stat failed">
                    <h3>$failed</h3>
                    <p>Échoués</p>
                </div>
                $([ "$skipped" -gt 0 ] && echo "<div class=\"stat skipped\"><h3>$skipped</h3><p>Ignorés</p></div>" || echo "")
            </div>
            <p class="meta">Généré le $(date '+%d/%m/%Y à %H:%M:%S')</p>
            <p class="meta">Catégorie : $category</p>
            <p class="meta">Durée : ${duration}s</p>
            <p class="meta">Statut : <span class="status-$([ $exit_code -eq 0 ] && echo "success" || echo "failed")">$([ $exit_code -eq 0 ] && echo "SUCCÈS" || echo "ÉCHEC")</span></p>
        </div>
        <div class="test-result $([ $exit_code -eq 0 ] && echo "success" || echo "failed")">
            <h2>$TEST_NAME</h2>
            <p><strong>Statut:</strong> <span class="status-$([ $exit_code -eq 0 ] && echo "success" || echo "failed")">$([ $exit_code -eq 0 ] && echo "success" || echo "failed")</span> | <strong>Durée:</strong> ${duration}s</p>
            <p><strong>Statistiques:</strong> Total: $total | Réussis: <span style="color: #4caf50;">$passed</span> | Échoués: <span style="color: #f44336;">$failed</span>$([ "$skipped" -gt 0 ] && echo " | Ignorés: <span style=\"color: #f57c00;\">$skipped</span>" || echo "")</p>
            <details>
                <summary>Voir les détails complets ($(echo "$clean_output" | wc -l | tr -d ' ') lignes)</summary>
                <pre>$(echo "$clean_output" | head -1000)</pre>
            </details>
        </div>
    </div>
</body>
</html>
EOF

# Nettoyer
rm -f "$RESULT_FILE.tmp"

echo ""
echo -e "${GREEN}✅ Rapport généré avec succès !${NC}"
echo -e "${BLUE}📁 Répertoire : $REPORT_DIR${NC}"
echo -e "${BLUE}📄 Rapport HTML : $HTML_REPORT${NC}"
echo -e "${BLUE}📊 Summary JSON : $SUMMARY_FILE${NC}"
echo ""

# Retourner le code de sortie du test
exit $exit_code

