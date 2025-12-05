#!/bin/bash
# Script pour exécuter un test unique et générer un rapport

# Ne pas quitter en cas d'erreur
set +e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Arguments
TEST_NAME="$1"
TEST_COMMAND="$2"
TEST_CATEGORY="${3:-general}"

if [ -z "$TEST_NAME" ] || [ -z "$TEST_COMMAND" ]; then
    echo -e "${RED}❌ Usage: $0 <test_name> <test_command> [category]${NC}"
    exit 1
fi

# Répertoires
RESULTS_DIR="tests/results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="$RESULTS_DIR/$TEST_CATEGORY/$TIMESTAMP"
mkdir -p "$REPORT_DIR" || {
    echo -e "${RED}❌ Impossible de créer le répertoire de résultats${NC}"
    exit 1
}

RESULT_FILE="$REPORT_DIR/${TEST_NAME// /_}.json"
HTML_REPORT="$REPORT_DIR/report.html"

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              🧪 TEST : $TEST_NAME${NC}"
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
    # Filtrer les messages "check" répétitifs
    sed -i '/^check$/d; /^Check$/d; /^CHECK$/d' "$RESULT_FILE.tmp" 2>/dev/null || true
else
    output="Aucune sortie disponible"
fi

# Extraire les statistiques
passed=0
failed=0
total=0

# Pattern 1: "Total de tests : X", "Tests réussis : Y", "Tests échoués : Z"
if echo "$output" | grep -q "Total de tests\|Tests réussis\|Tests échoués"; then
    total=$(echo "$output" | grep -i "Total de tests" | grep -oE "[0-9]+" | head -1)
    passed=$(echo "$output" | grep -i "Tests réussis" | grep -oE "[0-9]+" | head -1)
    failed=$(echo "$output" | grep -i "Tests échoués" | grep -oE "[0-9]+" | head -1)
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
# Pattern 3: Compter les PASS et FAIL
else
    passed=$(echo "$output" | grep -cE "(✓ PASS|PASS|✓|réussis)" 2>/dev/null || echo "0")
    failed=$(echo "$output" | grep -cE "(✗ FAIL|FAIL|✗|échoué)" 2>/dev/null || echo "0")
    if [ -z "$passed" ] || ! [ "$passed" -ge 0 ] 2>/dev/null; then passed=0; fi
    if [ -z "$failed" ] || ! [ "$failed" -ge 0 ] 2>/dev/null; then failed=0; fi
    total=$((passed + failed))
fi

# S'assurer que toutes les variables sont des nombres valides
if [ -z "$total" ] || ! [ "$total" -ge 0 ] 2>/dev/null; then total=0; fi
if [ -z "$passed" ] || ! [ "$passed" -ge 0 ] 2>/dev/null; then passed=0; fi
if [ -z "$failed" ] || ! [ "$failed" -ge 0 ] 2>/dev/null; then failed=0; fi

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

# S'assurer que le répertoire existe
result_dir=$(dirname "$RESULT_FILE")
mkdir -p "$result_dir" || {
    echo -e "${RED}❌ Impossible de créer le répertoire : $result_dir${NC}"
    exit 1
}

cat > "$RESULT_FILE" <<EOF
{
  "testName": "$TEST_NAME",
  "category": "$TEST_CATEGORY",
  "command": "$TEST_COMMAND",
  "timestamp": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')",
  "duration": $duration,
  "exitCode": $exit_code,
  "status": "$([ $exit_code -eq 0 ] && echo "success" || echo "failed")",
  "statistics": {
    "total": $total,
    "passed": $passed,
    "failed": $failed
  },
  "output": $output_json
}
EOF

# Générer le rapport HTML
mkdir -p "$(dirname "$HTML_REPORT")" || true

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
        .stats { display: flex; gap: 20px; margin-top: 15px; }
        .stat { flex: 1; padding: 15px; border-radius: 6px; text-align: center; }
        .stat.total { background: #e3f2fd; color: #1976d2; }
        .stat.passed { background: #e8f5e9; color: #388e3c; }
        .stat.failed { background: #ffebee; color: #d32f2f; }
        .stat h3 { font-size: 2em; margin-bottom: 5px; }
        .test-result { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-result.success { border-left: 4px solid #4caf50; }
        .test-result.failed { border-left: 4px solid #f44336; }
        .status-success { color: #4caf50; font-weight: bold; }
        .status-failed { color: #f44336; font-weight: bold; }
        .meta { color: #666; font-size: 0.9em; margin-top: 10px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; margin-top: 10px; white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', monospace; font-size: 0.9em; }
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
            </div>
            <p class="meta">Généré le $(date '+%d/%m/%Y à %H:%M:%S')</p>
            <p class="meta">Catégorie : $TEST_CATEGORY</p>
            <p class="meta">Durée : ${duration}s</p>
            <p class="meta">Statut : <span class="status-$([ $exit_code -eq 0 ] && echo "success" || echo "failed")">$([ $exit_code -eq 0 ] && echo "SUCCÈS" || echo "ÉCHEC")</span></p>
        </div>
        <div class="test-result $([ $exit_code -eq 0 ] && echo "success" || echo "failed")">
            <h2>$TEST_NAME</h2>
            <p><strong>Statut:</strong> <span class="status-$([ $exit_code -eq 0 ] && echo "success" || echo "failed")">$([ $exit_code -eq 0 ] && echo "success" || echo "failed")</span> | <strong>Durée:</strong> ${duration}s</p>
            <p><strong>Statistiques:</strong> Total: $total | Réussis: <span style="color: #4caf50;">$passed</span> | Échoués: <span style="color: #f44336;">$failed</span></p>
            <details>
                <summary>Voir les détails</summary>
                <pre>$(echo "$clean_output" | head -500)</pre>
            </details>
        </div>
    </div>
</body>
</html>
EOF

# Afficher le résumé
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    RÉSUMÉ                              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total de tests        : ${BLUE}$total${NC}"
echo -e "Tests réussis         : ${GREEN}$passed${NC}"
echo -e "Tests échoués         : ${RED}$failed${NC}"
if [ "$total" -gt 0 ]; then
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($passed / $total) * 100}")
    echo -e "Taux de réussite       : ${GREEN}${SUCCESS_RATE}%${NC}"
fi
echo ""
echo -e "${GREEN}📁 Résultats sauvegardés dans : $REPORT_DIR${NC}"
echo -e "${GREEN}📄 Rapport HTML : $HTML_REPORT${NC}"
echo ""

# Ouvrir le rapport HTML si possible
if [ -f "$HTML_REPORT" ]; then
    HTML_REPORT_ABS=$(cd "$(dirname "$HTML_REPORT")" && pwd)/$(basename "$HTML_REPORT")
    HTML_REPORT_URI="file://$HTML_REPORT_ABS"
    
    if command -v xdg-open > /dev/null; then
        xdg-open "$HTML_REPORT_URI" 2>/dev/null || echo -e "${YELLOW}💡 Ouvrez manuellement le rapport : $HTML_REPORT_URI${NC}"
    elif command -v open > /dev/null; then
        open "$HTML_REPORT_URI" 2>/dev/null || echo -e "${YELLOW}💡 Ouvrez manuellement le rapport : $HTML_REPORT_URI${NC}"
    elif command -v start > /dev/null; then
        start "$HTML_REPORT_URI" 2>/dev/null || echo -e "${YELLOW}💡 Ouvrez manuellement le rapport : $HTML_REPORT_URI${NC}"
    else
        echo -e "${YELLOW}💡 Ouvrez manuellement le rapport : $HTML_REPORT_URI${NC}"
    fi
fi

# Code de sortie
if [ $exit_code -eq 0 ]; then
    exit 0
else
    exit 1
fi

