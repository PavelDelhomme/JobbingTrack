#!/bin/bash
# Script complet pour exécuter TOUS les tests et générer des rapports

# Ne pas quitter en cas d'erreur pour continuer les autres tests
set +e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Répertoires
RESULTS_DIR="tests/results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="$RESULTS_DIR/$TIMESTAMP"

# Créer le répertoire de manière absolue pour éviter les erreurs
mkdir -p "$REPORT_DIR" || {
    echo -e "${RED}❌ Impossible de créer le répertoire de résultats${NC}"
    exit 1
}

# S'assurer que le répertoire existe vraiment
if [ ! -d "$REPORT_DIR" ]; then
    echo -e "${RED}❌ Le répertoire $REPORT_DIR n'existe pas${NC}"
    exit 1
fi

# Fichiers de résultats (seront créés dynamiquement)
SUMMARY_RESULT="$REPORT_DIR/summary.json"
HTML_REPORT="$REPORT_DIR/report.html"

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🧪 EXÉCUTION COMPLÈTE DES TESTS - JobbingTrack     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📁 Répertoire des résultats : $REPORT_DIR${NC}"
echo ""

# Compteurs globaux
TOTAL_TESTS=0          # Nombre total de tests individuels
TOTAL_PASSED=0         # Nombre total de tests réussis
TOTAL_FAILED=0         # Nombre total de tests échoués
TOTAL_CATEGORIES=0     # Nombre de catégories de tests exécutées
TEST_RESULTS=()

# Fonction pour exécuter un test et capturer les résultats
run_test() {
    local test_name="$1"
    local test_command="$2"
    local result_file="$3"
    
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🧪 Test: $test_name${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local start_time=$(date +%s)
    local exit_code=0
    
    # Exécuter le test et capturer la sortie (forcer la sortie non-buffered)
    # Rediriger stderr vers stdout pour capturer toutes les erreurs
    if eval "$test_command" > "$result_file.tmp" 2>&1; then
        exit_code=0
    else
        exit_code=$?
    fi
    
    # Filtrer les messages "check" répétitifs qui ne sont pas des erreurs critiques
    if [ -f "$result_file.tmp" ]; then
        # Garder seulement les lignes importantes, filtrer les "check" répétitifs
        sed -i '/^check$/d; /^Check$/d; /^CHECK$/d' "$result_file.tmp" 2>/dev/null || true
    fi
    
    # Attendre un peu pour s'assurer que toute la sortie est capturée
    sleep 0.5
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Lire les résultats et nettoyer les codes ANSI
    local output=""
    if [ -f "$result_file.tmp" ]; then
        output=$(cat "$result_file.tmp" 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' || echo "")
    else
        output="Aucune sortie disponible"
    fi
    
    # Extraire les statistiques (selon le format de chaque test)
    local passed=0
    local failed=0
    local total=0
    
    # Pattern 1: "Total de tests : X", "Tests réussis : Y", "Tests échoués : Z" (format verify-user-journey.sh)
    if echo "$output" | grep -q "Total de tests\|Tests réussis\|Tests échoués"; then
        total=$(echo "$output" | grep -i "Total de tests" | grep -oE "[0-9]+" | head -1)
        passed=$(echo "$output" | grep -i "Tests réussis" | grep -oE "[0-9]+" | head -1)
        failed=$(echo "$output" | grep -i "Tests échoués" | grep -oE "[0-9]+" | head -1)
    # Pattern 2: "Total: X tests", "X tests réussis", "X tests échoués" (format test-relations.js et test-enums.js)
    elif echo "$output" | grep -qE "Total: [0-9]+ tests"; then
        total=$(echo "$output" | grep -oE "Total: [0-9]+ tests" | grep -oE "[0-9]+" | head -1)
        # Chercher "X tests réussis" ou "✅ X tests réussis"
        passed=$(echo "$output" | grep -oE "[0-9]+ tests réussis" | grep -oE "^[0-9]+" | head -1)
        if [ -z "$passed" ]; then
            passed=$(echo "$output" | grep -oE "✅ [0-9]+ tests réussis" | grep -oE "[0-9]+" | head -1)
        fi
        # Chercher "X tests échoués" ou "❌ X tests échoués"
        failed=$(echo "$output" | grep -oE "[0-9]+ tests échoués" | grep -oE "^[0-9]+" | head -1)
        if [ -z "$failed" ]; then
            failed=$(echo "$output" | grep -oE "❌ [0-9]+ tests échoués" | grep -oE "[0-9]+" | head -1)
        fi
    # Pattern 3: "X tests réussis", "Y tests échoués" (sans "Total:")
    elif echo "$output" | grep -qE "[0-9]+.*(tests|test).*(réussis|échoué)"; then
        passed=$(echo "$output" | grep -oE "[0-9]+.*(réussis|PASS|✓)" | grep -oE "^[0-9]+" | head -1)
        failed=$(echo "$output" | grep -oE "[0-9]+.*(échoué|FAIL|✗)" | grep -oE "^[0-9]+" | head -1)
        # Calculer total seulement si passed et failed sont des nombres valides
        if [ -n "$passed" ] && [ -n "$failed" ] && [ "$passed" -ge 0 ] && [ "$failed" -ge 0 ] 2>/dev/null; then
            total=$((passed + failed))
        else
            total=0
        fi
    # Pattern 4: Compter les PASS et FAIL dans la sortie
    else
        passed=$(echo "$output" | grep -cE "(✓ PASS|PASS|✓|réussis)" 2>/dev/null || echo "0")
        failed=$(echo "$output" | grep -cE "(✗ FAIL|FAIL|✗|échoué)" 2>/dev/null || echo "0")
        # S'assurer que passed et failed sont des nombres
        if [ -z "$passed" ] || ! [ "$passed" -ge 0 ] 2>/dev/null; then passed=0; fi
        if [ -z "$failed" ] || ! [ "$failed" -ge 0 ] 2>/dev/null; then failed=0; fi
        total=$((passed + failed))
    fi
    
    # S'assurer que toutes les variables sont des nombres valides
    if [ -z "$total" ] || ! [ "$total" -ge 0 ] 2>/dev/null; then total=0; fi
    if [ -z "$passed" ] || ! [ "$passed" -ge 0 ] 2>/dev/null; then passed=0; fi
    if [ -z "$failed" ] || ! [ "$failed" -ge 0 ] 2>/dev/null; then failed=0; fi
    
    # Créer le JSON de résultat (avec fallback si jq n'est pas disponible)
    # Nettoyer les codes ANSI avant de créer le JSON
    local clean_output=$(echo "$output" | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g')
    
    if command -v jq > /dev/null 2>&1; then
        output_json=$(echo "$clean_output" | jq -Rs .)
    else
        # Fallback: échapper les caractères JSON manuellement
        output_json=$(echo "$clean_output" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
        output_json="\"$output_json\""
    fi
    
    # S'assurer que le répertoire parent existe
    local result_dir=$(dirname "$result_file")
    mkdir -p "$result_dir" || {
        echo -e "${RED}❌ Impossible de créer le répertoire : $result_dir${NC}"
        return 1
    }
    
    cat > "$result_file" <<EOF
{
  "testName": "$test_name",
  "command": "$test_command",
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
    
    # Si total est 0, c'est qu'on n'a pas pu extraire les stats, on compte 1 test (la catégorie elle-même)
    if [ "$total" -eq 0 ] && [ "$exit_code" -ne 0 ]; then
        # Test échoué mais pas de stats, on compte 1 échec
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    elif [ "$total" -eq 0 ] && [ "$exit_code" -eq 0 ]; then
        # Test réussi mais pas de stats, on compte 1 succès
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        # Stats extraites correctement
        TOTAL_TESTS=$((TOTAL_TESTS + total))
        TOTAL_PASSED=$((TOTAL_PASSED + passed))
        TOTAL_FAILED=$((TOTAL_FAILED + failed))
    fi
    
    TOTAL_CATEGORIES=$((TOTAL_CATEGORIES + 1))
    TEST_RESULTS+=("$test_name:$exit_code:$duration")
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name : SUCCÈS${NC}"
    else
        echo -e "${RED}❌ $test_name : ÉCHEC${NC}"
    fi
    echo ""
    
    rm -f "$result_file.tmp"
}

# ==============================================================================
# CATÉGORIE 1 : TESTS BACKEND / BDD
# ==============================================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        📦 CATÉGORIE 1 : TESTS BACKEND / BDD            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Test User Journey (API)
run_test "User Journey (API)" \
    "bash scripts/verify-user-journey.sh" \
    "$REPORT_DIR/user-journey.json"

# 2. Test Relations BDD
if docker ps | grep -q jobbingtrack-auth-service; then
    run_test "Relations BDD" \
        "docker exec -i jobbingtrack-auth-service sh -c 'cat > /app/test-relations-temp.js' < scripts/test-relations.js && docker exec -w /app jobbingtrack-auth-service node test-relations-temp.js && docker exec jobbingtrack-auth-service rm -f /app/test-relations-temp.js" \
        "$REPORT_DIR/relations.json"
else
    echo -e "${YELLOW}⚠️  Service auth-service non démarré, test Relations ignoré${NC}"
    cat > "$REPORT_DIR/relations.json" <<EOF
{
  "testName": "Relations BDD",
  "status": "skipped",
  "reason": "Service auth-service non démarré",
  "timestamp": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')"
}
EOF
    echo ""
fi

# 3. Test Enums
if docker ps | grep -q jobbingtrack-auth-service; then
    run_test "Enums" \
        "docker exec -i jobbingtrack-auth-service sh -c 'cat > /app/test-enums-temp.js' < scripts/test-enums.js && docker exec -w /app jobbingtrack-auth-service node test-enums-temp.js && docker exec jobbingtrack-auth-service rm -f /app/test-enums-temp.js" \
        "$REPORT_DIR/enums.json"
else
    echo -e "${YELLOW}⚠️  Service auth-service non démarré, test Enums ignoré${NC}"
    cat > "$REPORT_DIR/enums.json" <<EOF
{
  "testName": "Enums",
  "status": "skipped",
  "reason": "Service auth-service non démarré",
  "timestamp": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')"
}
EOF
    echo ""
fi

# 4. Test Email Logs (optionnel)
if docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1 FROM \"EmailLog\" LIMIT 1;" > /dev/null 2>&1; then
    run_test "Email Logs" \
        "docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c \"SELECT id, \\\"to\\\", subject, type, status, \\\"sentAt\\\", \\\"createdAt\\\" FROM \\\"EmailLog\\\" ORDER BY \\\"createdAt\\\" DESC LIMIT 10;\"" \
        "$REPORT_DIR/email.json"
else
    echo -e "${YELLOW}⚠️  Table EmailLog non trouvée, test email ignoré${NC}"
    cat > "$REPORT_DIR/email.json" <<EOF
{
  "testName": "Email Logs",
  "status": "skipped",
  "reason": "Table EmailLog non trouvée",
  "timestamp": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')"
}
EOF
    echo ""
fi

# 5. Tests API complets (si disponible)
if [ -f "tests/api/test-api.js" ]; then
    run_test "Tests API Complets" \
        "node tests/api/test-api.js" \
        "$REPORT_DIR/api-tests.json"
fi

# 6. Tests Backend Services (si disponible)
if [ -f "tests/backend/test-services.js" ]; then
    run_test "Tests Backend Services" \
        "node tests/backend/test-services.js" \
        "$REPORT_DIR/backend-services.json"
fi

# ==============================================================================
# CATÉGORIE 2 : TESTS FRONTEND (PLAYWRIGHT)
# ==============================================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        🎨 CATÉGORIE 2 : TESTS FRONTEND (E2E)          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 7. Tests Playwright E2E Frontend (dans conteneur ou local)
if docker ps | grep -q jobbingtrack-frontend; then
    run_test "Playwright E2E Frontend" \
        "docker exec -w /app jobbingtrack-frontend npx playwright test tests/e2e --reporter=list,json 2>&1 || (cd frontend && npx playwright test tests/e2e --reporter=list,json 2>&1)" \
        "$REPORT_DIR/playwright-e2e.json"
else
    if [ -d "frontend/tests/e2e" ]; then
        run_test "Playwright E2E Frontend" \
            "cd frontend && npx playwright test tests/e2e --reporter=list,json 2>&1" \
            "$REPORT_DIR/playwright-e2e.json"
    else
        echo -e "${YELLOW}⚠️  Tests Playwright E2E non disponibles${NC}"
        cat > "$REPORT_DIR/playwright-e2e.json" <<EOF
{
  "testName": "Playwright E2E Frontend",
  "status": "skipped",
  "reason": "Tests Playwright non disponibles",
  "timestamp": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')"
}
EOF
        echo ""
    fi
fi

# 8. Tests Mobile Playwright
if docker ps | grep -q jobbingtrack-frontend; then
    run_test "Playwright Mobile" \
        "docker exec -w /app jobbingtrack-frontend npx playwright test tests/e2e/mobile --config=playwright.mobile.config.ts --reporter=list,json 2>&1 || (cd frontend && npx playwright test tests/e2e/mobile --config=playwright.mobile.config.ts --reporter=list,json 2>&1)" \
        "$REPORT_DIR/playwright-mobile.json"
else
    if [ -d "frontend/tests/e2e/mobile" ]; then
        run_test "Playwright Mobile" \
            "cd frontend && npx playwright test tests/e2e/mobile --config=playwright.mobile.config.ts --reporter=list,json 2>&1" \
            "$REPORT_DIR/playwright-mobile.json"
    else
        echo -e "${YELLOW}⚠️  Tests Mobile non disponibles${NC}"
        cat > "$REPORT_DIR/playwright-mobile.json" <<EOF
{
  "testName": "Playwright Mobile",
  "status": "skipped",
  "reason": "Tests Mobile non disponibles",
  "timestamp": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')"
}
EOF
        echo ""
    fi
fi

# 9. Tests Frontend Jest (unitaires)
if [ -d "frontend" ] && [ -f "frontend/package.json" ] && grep -q '"test"' frontend/package.json; then
    run_test "Tests Frontend Jest (Unitaires)" \
        "cd frontend && npm test -- --passWithNoTests 2>&1" \
        "$REPORT_DIR/frontend-jest.json"
fi

# ==============================================================================
# CATÉGORIE 3 : TESTS PERFORMANCE & SÉCURITÉ
# ==============================================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     ⚡ CATÉGORIE 3 : PERFORMANCE & SÉCURITÉ           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 10. Tests Performance
if [ -f "tests/performance/test-performance.js" ]; then
    run_test "Tests Performance" \
        "node tests/performance/test-performance.js" \
        "$REPORT_DIR/performance.json"
fi

# 11. Tests Sécurité
if [ -f "tests/security/test-security.js" ]; then
    run_test "Tests Sécurité" \
        "node tests/security/test-security.js" \
        "$REPORT_DIR/security.json"
fi

# ==============================================================================
# CATÉGORIE 4 : TESTS D'INTÉGRATION
# ==============================================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        🔗 CATÉGORIE 4 : TESTS D'INTÉGRATION           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 12. Tests d'Intégration
if [ -f "tests/integration/test-full-system.js" ]; then
    run_test "Tests Intégration Système" \
        "node tests/integration/test-full-system.js" \
        "$REPORT_DIR/integration.json"
fi

# Créer le résumé (s'assurer que le répertoire existe)
mkdir -p "$(dirname "$SUMMARY_RESULT")" || true

cat > "$SUMMARY_RESULT" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "reportDir": "$REPORT_DIR",
  "summary": {
    "totalCategories": $TOTAL_CATEGORIES,
    "totalTests": $TOTAL_TESTS,
    "passed": $TOTAL_PASSED,
    "failed": $TOTAL_FAILED,
    "successRate": $(awk "BEGIN {printf \"%.2f\", ($TOTAL_PASSED / ($TOTAL_TESTS > 0 ? $TOTAL_TESTS : 1)) * 100}")
  },
  "testResults": [
$(for result in "${TEST_RESULTS[@]}"; do
    IFS=':' read -r name exit_code duration <<< "$result"
    echo "    {\"name\": \"$name\", \"status\": \"$([ $exit_code -eq 0 ] && echo "success" || echo "failed")\", \"duration\": $duration},"
done | sed '$ s/,$//')
  ]
}
EOF

# Générer le rapport HTML (s'assurer que le répertoire existe)
mkdir -p "$(dirname "$HTML_REPORT")" || true

cat > "$HTML_REPORT" <<EOF
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Tests - JobbingTrack</title>
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
        .test-result h2 { margin-bottom: 10px; }
        .test-result.success { border-left: 4px solid #4caf50; }
        .test-result.failed { border-left: 4px solid #f44336; }
        .test-result.skipped { border-left: 4px solid #ff9800; }
        .status-success { color: #4caf50; font-weight: bold; }
        .status-failed { color: #f44336; font-weight: bold; }
        .status-skipped { color: #ff9800; font-weight: bold; }
        .meta { color: #666; font-size: 0.9em; margin-top: 10px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; margin-top: 10px; white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', monospace; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Rapport de Tests - JobbingTrack</h1>
        <div class="summary">
            <h2>Résumé</h2>
            <div class="stats">
                <div class="stat total" style="background: #e3f2fd; color: #1976d2;">
                    <h3>$TOTAL_CATEGORIES</h3>
                    <p>Catégories</p>
                </div>
                <div class="stat total">
                    <h3>$TOTAL_TESTS</h3>
                    <p>Total Tests</p>
                </div>
                <div class="stat passed">
                    <h3>$TOTAL_PASSED</h3>
                    <p>Réussis</p>
                </div>
                <div class="stat failed">
                    <h3>$TOTAL_FAILED</h3>
                    <p>Échoués</p>
                </div>
            </div>
            <p class="meta">Généré le $(date '+%d/%m/%Y à %H:%M:%S')</p>
            <p class="meta">Répertoire : $REPORT_DIR</p>
        </div>
        
        <h2 style="margin-top: 30px; margin-bottom: 15px;">Détails des Tests</h2>
EOF

# Ajouter chaque résultat de test au HTML (tous les fichiers JSON dans le répertoire)
# Trier les fichiers pour un affichage cohérent
for result_file in $(ls -1 "$REPORT_DIR"/*.json 2>/dev/null | grep -v summary.json | sort); do
    if [ ! -f "$result_file" ]; then
        continue
    fi
    
    if command -v jq > /dev/null 2>&1; then
        test_name=$(jq -r '.testName' "$result_file")
        status=$(jq -r '.status' "$result_file")
        duration=$(jq -r '.duration' "$result_file")
        total=$(jq -r '.statistics.total' "$result_file")
        passed=$(jq -r '.statistics.passed' "$result_file")
        failed=$(jq -r '.statistics.failed' "$result_file")
        output=$(jq -r '.output' "$result_file")
    else
        # Fallback: extraire avec grep/sed
        test_name=$(grep -o '"testName": "[^"]*"' "$result_file" | cut -d'"' -f4)
        status=$(grep -o '"status": "[^"]*"' "$result_file" | cut -d'"' -f4)
        duration=$(grep -o '"duration": [0-9]*' "$result_file" | grep -o '[0-9]*')
        total=$(grep -o '"total": [0-9]*' "$result_file" | grep -o '[0-9]*')
        passed=$(grep -o '"passed": [0-9]*' "$result_file" | grep -o '[0-9]*')
        failed=$(grep -o '"failed": [0-9]*' "$result_file" | grep -o '[0-9]*')
        output=$(grep -o '"output": "[^"]*"' "$result_file" | cut -d'"' -f4 || echo "N/A")
    fi
    
    # Nettoyer les codes ANSI de la sortie pour l'affichage HTML
    clean_output=$(echo "$output" | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | sed 's/\\n/\n/g' | sed 's/\\"/"/g')
    
    # Détecter si l'erreur est liée à une table non trouvée (uniquement si le test a échoué)
    has_table_error=false
    db_push_suggestion=""
    if [ "$status" = "failed" ] && echo "$clean_output" | grep -qiE "(table.*does not exist|P2021|relation.*does not exist|table.*not found|Invalid.*prisma.*invocation.*does not exist)"; then
        has_table_error=true
        db_push_suggestion="<div style='margin-top: 10px; padding: 10px; background: #fff3cd; border-left: 4px solid #ff9800; border-radius: 4px;'><strong>💡 Solution:</strong> Exécutez <code style='background: #f5f5f5; padding: 2px 6px; border-radius: 3px;'>make db-push-all</code> pour créer toutes les tables nécessaires.</div>"
    fi
    
    cat >> "$HTML_REPORT" <<EOF
    <div class="test-result $status">
        <h2>$test_name</h2>
        <p><strong>Statut:</strong> <span class="status-$status">$status</span> | <strong>Durée:</strong> ${duration}s</p>
        <p><strong>Statistiques:</strong> Total: $total | Réussis: <span style="color: #4caf50;">$passed</span> | Échoués: <span style="color: #f44336;">$failed</span></p>
        $([ "$has_table_error" = true ] && echo "$db_push_suggestion" || echo "")
        <details>
            <summary>Voir les détails</summary>
            <pre>$(echo "$clean_output" | head -500)</pre>
        </details>
    </div>
EOF
done

cat >> "$HTML_REPORT" <<EOF
    </div>
</body>
</html>
EOF

# Afficher le résumé final
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    RÉSUMÉ FINAL                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Catégories exécutées : ${BLUE}$TOTAL_CATEGORIES${NC}"
echo -e "Total de tests        : ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Tests réussis         : ${GREEN}$TOTAL_PASSED${NC}"
echo -e "Tests échoués         : ${RED}$TOTAL_FAILED${NC}"
if [ "$TOTAL_TESTS" -gt 0 ]; then
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($TOTAL_PASSED / $TOTAL_TESTS) * 100}")
    echo -e "Taux de réussite       : ${GREEN}${SUCCESS_RATE}%${NC}"
fi
echo ""
echo -e "${GREEN}📁 Résultats sauvegardés dans : $REPORT_DIR${NC}"
echo -e "${GREEN}📄 Rapport HTML : $HTML_REPORT${NC}"
echo ""

# Ouvrir le rapport HTML automatiquement (avec chemin absolu)
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
else
    echo -e "${RED}❌ Le rapport HTML n'a pas pu être généré : $HTML_REPORT${NC}"
    echo -e "${YELLOW}💡 Vérifiez les logs ci-dessus pour plus de détails${NC}"
fi

# Code de sortie
if [ $TOTAL_FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi

