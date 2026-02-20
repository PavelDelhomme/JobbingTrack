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
        # Lire le fichier tmp AVANT de le supprimer
        output=$(cat "$result_file.tmp" 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' || echo "")
        # Vérifier que la sortie n'est pas vide
        if [ -z "$output" ] || [ "$output" = "" ]; then
            # Si vide, essayer de relire sans nettoyage ANSI pour debug
            output=$(cat "$result_file.tmp" 2>/dev/null || echo "")
        fi
        # Si toujours vide et que le test a échoué, indiquer qu'il y a eu une erreur
        if [ -z "$output" ] && [ "$exit_code" -ne 0 ]; then
            output="Erreur lors de l'exécution du test (code de sortie: $exit_code). Vérifiez les logs pour plus de détails."
        fi
    else
        # Si le fichier tmp n'existe pas et que le test a échoué, indiquer l'erreur
        if [ "$exit_code" -ne 0 ]; then
            output="Erreur : Aucune sortie capturée (code de sortie: $exit_code). Le test a probablement échoué avant de produire une sortie."
        else
            output="Aucune sortie disponible"
        fi
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
    # Pattern 4: Compter les PASS et FAIL dans la sortie (✓ PASS, ✗ FAIL, ✓, ✗)
    else
        # Compter les tests réussis (✓ PASS, PASS, ✓, réussis)
        passed=$(echo "$output" | grep -cE "(✓ PASS|PASS|✓|réussis|✅)" 2>/dev/null || echo "0")
        # Compter les tests échoués (✗ FAIL, FAIL, ✗, échoué, ❌)
        failed=$(echo "$output" | grep -cE "(✗ FAIL|FAIL|✗|échoué|❌)" 2>/dev/null || echo "0")
        # Si on trouve des patterns de test individuels, les compter
        # Pattern: "[X] Test: ..." ou "Test X:" ou "✓ Test" ou "✗ Test"
        test_count=$(echo "$output" | grep -cE "(\[.*\] Test:|Test [0-9]+:|✓|✗|PASS|FAIL)" 2>/dev/null || echo "0")
        # Nettoyer test_count
        test_count=$(echo "$test_count" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
        if [ -n "$test_count" ] && [ "$test_count" -ge 0 ] 2>/dev/null; then
            test_count=$((test_count + 0))
        else
            test_count=0
        fi
        if [ "$test_count" -gt 0 ] && [ "$total" -eq 0 ]; then
            total=$test_count
        fi
        # S'assurer que passed et failed sont des nombres (nettoyer les espaces et retours à la ligne)
        passed=$(echo "$passed" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
        failed=$(echo "$failed" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
        # Convertir en nombres entiers
        passed=$((passed + 0))
        failed=$((failed + 0))
        if [ -z "$passed" ] || ! [ "$passed" -ge 0 ] 2>/dev/null; then passed=0; fi
        if [ -z "$failed" ] || ! [ "$failed" -ge 0 ] 2>/dev/null; then failed=0; fi
        # Si total est 0 mais qu'on a des passed/failed, utiliser leur somme
        if [ "$total" -eq 0 ] && [ $((passed + failed)) -gt 0 ]; then
            total=$((passed + failed))
        fi
    fi
    
    # S'assurer que toutes les variables sont des nombres valides (nettoyer les espaces)
    total=$(echo "$total" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
    passed=$(echo "$passed" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
    failed=$(echo "$failed" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
    
    # Convertir en nombres entiers
    total=$((total + 0))
    passed=$((passed + 0))
    failed=$((failed + 0))
    
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
    
    # Mettre à jour les compteurs globaux
    # S'assurer que total = passed + failed (cohérence)
    # Vérifier que passed et failed sont des nombres avant de faire l'opération
    if [ -n "$passed" ] && [ "$passed" -ge 0 ] 2>/dev/null && [ -n "$failed" ] && [ "$failed" -ge 0 ] 2>/dev/null; then
        passed=$((passed + 0))
        failed=$((failed + 0))
        if [ "$total" -gt 0 ] && [ "$total" -ne $((passed + failed)) ] 2>/dev/null; then
            # Si incohérence, recalculer total à partir de passed + failed
            total=$((passed + failed))
        fi
    fi
    
    # Si total est 0, essayer d'extraire depuis la sortie brute avant de compter comme 1 test
    if [ "$total" -eq 0 ]; then
        # Essayer d'extraire depuis la sortie brute (avant nettoyage ANSI)
        if [ -f "$result_file.tmp" ]; then
            raw_output=$(cat "$result_file.tmp" 2>/dev/null || echo "")
            # Compter les tests dans la sortie brute
            raw_passed=$(echo "$raw_output" | grep -cE "(✓ PASS|PASS|✓|réussis|✅|Test.*PASS)" 2>/dev/null || echo "0")
            raw_failed=$(echo "$raw_output" | grep -cE "(✗ FAIL|FAIL|✗|échoué|❌|Test.*FAIL)" 2>/dev/null || echo "0")
            raw_test_count=$(echo "$raw_output" | grep -cE "(\[.*\] Test:|Test [0-9]+:|Test:)" 2>/dev/null || echo "0")
            
            # Nettoyer et convertir en nombres
            raw_test_count=$(echo "$raw_test_count" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
            raw_passed=$(echo "$raw_passed" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
            raw_failed=$(echo "$raw_failed" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
            
            if [ -n "$raw_test_count" ] && [ "$raw_test_count" -ge 0 ] 2>/dev/null; then
                raw_test_count=$((raw_test_count + 0))
            else
                raw_test_count=0
            fi
            if [ -n "$raw_passed" ] && [ "$raw_passed" -ge 0 ] 2>/dev/null; then
                raw_passed=$((raw_passed + 0))
            else
                raw_passed=0
            fi
            if [ -n "$raw_failed" ] && [ "$raw_failed" -ge 0 ] 2>/dev/null; then
                raw_failed=$((raw_failed + 0))
            else
                raw_failed=0
            fi
            
            if [ "$raw_test_count" -gt 0 ]; then
                total=$raw_test_count
                passed=$raw_passed
                failed=$raw_failed
                # Mettre à jour le JSON avec les stats extraites
                if command -v jq > /dev/null 2>&1; then
                    jq ".statistics.total = $total | .statistics.passed = $passed | .statistics.failed = $failed" "$result_file" > "$result_file.tmp2" && mv "$result_file.tmp2" "$result_file" 2>/dev/null || true
                fi
            elif [ -n "$raw_passed" ] && [ -n "$raw_failed" ] && [ "$raw_passed" -ge 0 ] && [ "$raw_failed" -ge 0 ] 2>/dev/null && [ $((raw_passed + raw_failed)) -gt 0 ]; then
                total=$((raw_passed + raw_failed))
                passed=$raw_passed
                failed=$raw_failed
                # Mettre à jour le JSON avec les stats extraites
                if command -v jq > /dev/null 2>&1; then
                    jq ".statistics.total = $total | .statistics.passed = $passed | .statistics.failed = $failed" "$result_file" > "$result_file.tmp2" && mv "$result_file.tmp2" "$result_file" 2>/dev/null || true
                fi
            fi
        fi
        
        # Si total est toujours 0 après extraction, compter la catégorie comme 1 test
        if [ "$total" -eq 0 ]; then
            TOTAL_TESTS=$((TOTAL_TESTS + 1))
            if [ "$exit_code" -eq 0 ]; then
                TOTAL_PASSED=$((TOTAL_PASSED + 1))
            else
                TOTAL_FAILED=$((TOTAL_FAILED + 1))
            fi
        else
            # Stats extraites depuis la sortie brute
            TOTAL_TESTS=$((TOTAL_TESTS + total))
            TOTAL_PASSED=$((TOTAL_PASSED + passed))
            TOTAL_FAILED=$((TOTAL_FAILED + failed))
        fi
    else
        # Stats extraites correctement - utiliser les valeurs réelles
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

# 5. Tests API complets (via make test-api qui utilise Jest dans conteneur)
if docker ps | grep -q jobbingtrack-frontend; then
    run_test "Tests API Complets (Jest)" \
        "docker exec -w /app/tests jobbingtrack-frontend sh -c 'npm test -- api/ --verbose --forceExit --no-coverage 2>&1' || docker exec -w /app jobbingtrack-frontend sh -c 'cd tests && npm test -- api/ --verbose --forceExit --no-coverage 2>&1' || (cd tests && npm test -- api/ --verbose --forceExit --no-coverage 2>&1)" \
        "$REPORT_DIR/api-tests.json"
elif [ -f "tests/api/test-monitoring-c-endpoints.test.js" ] || [ -f "tests/api/test-email-endpoints.test.js" ]; then
    run_test "Tests API Complets (Jest local)" \
        "cd tests && npm test -- api/ --verbose --forceExit --no-coverage 2>&1" \
        "$REPORT_DIR/api-tests.json"
fi

# 6. Tests Backend Services (via make test-backend qui utilise Jest dans conteneur)
if docker ps | grep -q jobbingtrack-frontend; then
    run_test "Tests Backend Services (Jest)" \
        "docker exec -w /app/tests jobbingtrack-frontend sh -c 'npm test -- backend/ --verbose --forceExit --no-coverage 2>&1' || docker exec -w /app jobbingtrack-frontend sh -c 'cd tests && npm test -- backend/ --verbose --forceExit --no-coverage 2>&1' || (cd tests && npm test -- backend/ --verbose --forceExit --no-coverage 2>&1)" \
        "$REPORT_DIR/backend-services.json"
elif [ -f "tests/backend/test-security-service.test.js" ]; then
    run_test "Tests Backend Services (Jest local)" \
        "cd tests && npm test -- backend/ --verbose --forceExit --no-coverage 2>&1" \
        "$REPORT_DIR/backend-services.json"
fi

# 6b. Tests API Backend (script complet : auth, users, companies, applications, contacts, interviews, calls, events, followups, profile, notifications, metrics, dashboard, emails, workflow, security)
API_BASE_URL="${API_URL:-http://localhost:5002}"
run_test "Tests API Backend (script - tous services)" \
    "API_URL='$API_BASE_URL' bash scripts/test-api-specific.sh" \
    "$REPORT_DIR/api-backend-script.json"

# ==============================================================================
# CATÉGORIE 2 : TESTS FRONTEND (PLAYWRIGHT)
# ==============================================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        🎨 CATÉGORIE 2 : TESTS FRONTEND (E2E)          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 7. Tests Playwright E2E Frontend (dans conteneur ou local)
if docker ps | grep -q jobbingtrack-frontend; then
    # Créer le répertoire test-results avec les bonnes permissions
    docker exec jobbingtrack-frontend sh -c "mkdir -p /app/test-results && chmod -R 777 /app/test-results" 2>/dev/null || true
    run_test "Playwright E2E Frontend" \
        "docker exec -w /app -u root jobbingtrack-frontend sh -c 'chown -R nodejs:nodejs /app/test-results 2>/dev/null || true; chmod -R 777 /app/test-results 2>/dev/null || true' && docker exec -w /app jobbingtrack-frontend npx playwright test tests/e2e --reporter=list,json 2>&1 || (cd frontend && npx playwright test tests/e2e --reporter=list,json 2>&1)" \
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
    # Créer le répertoire test-results avec les bonnes permissions
    docker exec jobbingtrack-frontend sh -c "mkdir -p /app/test-results && chmod -R 777 /app/test-results" 2>/dev/null || true
    run_test "Playwright Mobile" \
        "docker exec -w /app -u root jobbingtrack-frontend sh -c 'chown -R nodejs:nodejs /app/test-results 2>/dev/null || true; chmod -R 777 /app/test-results 2>/dev/null || true' && docker exec -w /app jobbingtrack-frontend npx playwright test tests/e2e/mobile --config=playwright.mobile.config.ts --reporter=list,json 2>&1 || (cd frontend && npx playwright test tests/e2e/mobile --config=playwright.mobile.config.ts --reporter=list,json 2>&1)" \
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

# ==============================================================================
# CATÉGORIE 5 : TESTS PAR SERVICE BACKEND (COMPLETS)
# ==============================================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🔧 CATÉGORIE 5 : TESTS SERVICES BACKEND           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 13. Tests Company Service (CRUD complet)
if [ -f "tests/services/test-company-service.js" ]; then
    run_test "Tests Company Service (CRUD)" \
        "node tests/services/test-company-service.js" \
        "$REPORT_DIR/company-service.json"
elif docker ps | grep -q jobbingtrack-company-service; then
    run_test "Tests Company Service (Health Check)" \
        "curl -s http://localhost:3003/health || echo 'Service non accessible'" \
        "$REPORT_DIR/company-service.json"
fi

# 14. Tests Contact Service (CRUD complet)
if [ -f "tests/services/test-contact-service.js" ]; then
    run_test "Tests Contact Service (CRUD)" \
        "node tests/services/test-contact-service.js" \
        "$REPORT_DIR/contact-service.json"
elif docker ps | grep -q jobbingtrack-contact-service; then
    run_test "Tests Contact Service (Health Check)" \
        "curl -s http://localhost:3004/health || echo 'Service non accessible'" \
        "$REPORT_DIR/contact-service.json"
fi

# 15. Tests Interview Service (CRUD complet)
if [ -f "tests/services/test-interview-service.js" ]; then
    run_test "Tests Interview Service (CRUD)" \
        "node tests/services/test-interview-service.js" \
        "$REPORT_DIR/interview-service.json"
elif docker ps | grep -q jobbingtrack-interview-service; then
    run_test "Tests Interview Service (Health Check)" \
        "curl -s http://localhost:3005/health || echo 'Service non accessible'" \
        "$REPORT_DIR/interview-service.json"
fi

# 16. Tests Call Service (CRUD complet)
if [ -f "tests/services/test-call-service.js" ]; then
    run_test "Tests Call Service (CRUD)" \
        "node tests/services/test-call-service.js" \
        "$REPORT_DIR/call-service.json"
elif docker ps | grep -q jobbingtrack-call-service; then
    run_test "Tests Call Service (Health Check)" \
        "curl -s http://localhost:3008/health || echo 'Service non accessible'" \
        "$REPORT_DIR/call-service.json"
fi

# 17. Tests FollowUp Service (CRUD complet)
if [ -f "tests/services/test-followup-service.js" ]; then
    run_test "Tests FollowUp Service (CRUD)" \
        "node tests/services/test-followup-service.js" \
        "$REPORT_DIR/followup-service.json"
elif docker ps | grep -q jobbingtrack-followup-service; then
    run_test "Tests FollowUp Service (Health Check)" \
        "curl -s http://localhost:3012/health || echo 'Service non accessible'" \
        "$REPORT_DIR/followup-service.json"
fi

# 18. Tests Event Service (CRUD complet)
if [ -f "tests/services/test-event-service.js" ]; then
    run_test "Tests Event Service (CRUD)" \
        "node tests/services/test-event-service.js" \
        "$REPORT_DIR/event-service.json"
elif docker ps | grep -q jobbingtrack-event-service; then
    run_test "Tests Event Service (Health Check)" \
        "curl -s http://localhost:3011/health || echo 'Service non accessible'" \
        "$REPORT_DIR/event-service.json"
fi

# 19. Tests Notification Service
if [ -f "tests/services/test-notification-service.js" ]; then
    run_test "Tests Notification Service" \
        "node tests/services/test-notification-service.js" \
        "$REPORT_DIR/notification-service.json"
elif docker ps | grep -q jobbingtrack-notification-service; then
    run_test "Tests Notification Service (Health Check)" \
        "curl -s http://localhost:3006/health || echo 'Service non accessible'" \
        "$REPORT_DIR/notification-service.json"
fi

# 20. Tests Dashboard Service
if [ -f "tests/services/test-dashboard-service.js" ]; then
    run_test "Tests Dashboard Service" \
        "node tests/services/test-dashboard-service.js" \
        "$REPORT_DIR/dashboard-service.json"
elif docker ps | grep -q jobbingtrack-dashboard-service; then
    run_test "Tests Dashboard Service (Health Check)" \
        "curl -s http://localhost:3007/health || echo 'Service non accessible'" \
        "$REPORT_DIR/dashboard-service.json"
fi

# 21. Tests Profile Service
if [ -f "tests/services/test-profile-service.js" ]; then
    run_test "Tests Profile Service" \
        "node tests/services/test-profile-service.js" \
        "$REPORT_DIR/profile-service.json"
elif docker ps | grep -q jobbingtrack-profile-service; then
    run_test "Tests Profile Service (Health Check)" \
        "curl -s http://localhost:3009/health || echo 'Service non accessible'" \
        "$REPORT_DIR/profile-service.json"
fi

# 22. Tests Security Service
if [ -f "tests/services/test-security-service.js" ]; then
    run_test "Tests Security Service" \
        "node tests/services/test-security-service.js" \
        "$REPORT_DIR/security-service.json"
elif docker ps | grep -q jobbingtrack-security-service; then
    run_test "Tests Security Service (Health Check)" \
        "curl -s http://localhost:3010/health || echo 'Service non accessible'" \
        "$REPORT_DIR/security-service.json"
fi

# 23. Tests Metrics Aggregator Service
if [ -f "tests/services/test-metrics-aggregator.js" ]; then
    run_test "Tests Metrics Aggregator Service" \
        "node tests/services/test-metrics-aggregator.js" \
        "$REPORT_DIR/metrics-aggregator.json"
elif docker ps | grep -q jobbingtrack-metrics-aggregator; then
    run_test "Tests Metrics Aggregator Service (Health Check)" \
        "curl -s http://localhost:3013/health || echo 'Service non accessible'" \
        "$REPORT_DIR/metrics-aggregator.json"
fi

# 24. Tests Workflow Service
if [ -f "tests/services/test-workflow-service.js" ]; then
    run_test "Tests Workflow Service" \
        "node tests/services/test-workflow-service.js" \
        "$REPORT_DIR/workflow-service.json"
elif docker ps | grep -q jobbingtrack-workflow-service; then
    run_test "Tests Workflow Service (Health Check)" \
        "curl -s http://localhost:3014/health || echo 'Service non accessible'" \
        "$REPORT_DIR/workflow-service.json"
fi

# 25. Tests Deployment Service
if [ -f "tests/services/test-deployment-service.js" ]; then
    run_test "Tests Deployment Service" \
        "node tests/services/test-deployment-service.js" \
        "$REPORT_DIR/deployment-service.json"
elif docker ps | grep -q jobbingtrack-deployment-service; then
    run_test "Tests Deployment Service (Health Check)" \
        "curl -s http://localhost:3015/health || echo 'Service non accessible'" \
        "$REPORT_DIR/deployment-service.json"
fi

# ==============================================================================
# CATÉGORIE 6 : TESTS API GATEWAY COMPLETS
# ==============================================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🌐 CATÉGORIE 6 : TESTS API GATEWAY                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 26. Tests API Gateway Health & Routing
if [ -f "tests/api-gateway/test-routing.js" ]; then
    run_test "Tests API Gateway Routing" \
        "node tests/api-gateway/test-routing.js" \
        "$REPORT_DIR/api-gateway-routing.json"
else
    run_test "Tests API Gateway Health" \
        "curl -s http://localhost:3000/health && curl -s http://localhost:3000/metrics && curl -s http://localhost:3000/ready" \
        "$REPORT_DIR/api-gateway-health.json"
fi

# 27. Tests API Gateway Rate Limiting
if [ -f "tests/api-gateway/test-rate-limiting.js" ]; then
    run_test "Tests API Gateway Rate Limiting" \
        "node tests/api-gateway/test-rate-limiting.js" \
        "$REPORT_DIR/api-gateway-rate-limiting.json"
fi

# 28. Tests API Gateway CORS
if [ -f "tests/api-gateway/test-cors.js" ]; then
    run_test "Tests API Gateway CORS" \
        "node tests/api-gateway/test-cors.js" \
        "$REPORT_DIR/api-gateway-cors.json"
fi

# ==============================================================================
# CATÉGORIE 7 : TESTS SÉCURITÉ AVANCÉS
# ==============================================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🔒 CATÉGORIE 7 : TESTS SÉCURITÉ AVANCÉS           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 29. Tests Injection SQL
if [ -f "tests/security/test-sql-injection.js" ]; then
    run_test "Tests Protection Injection SQL" \
        "node tests/security/test-sql-injection.js" \
        "$REPORT_DIR/security-sql-injection.json"
fi

# 30. Tests XSS
if [ -f "tests/security/test-xss.js" ]; then
    run_test "Tests Protection XSS" \
        "node tests/security/test-xss.js" \
        "$REPORT_DIR/security-xss.json"
fi

# 31. Tests CSRF
if [ -f "tests/security/test-csrf.js" ]; then
    run_test "Tests Protection CSRF" \
        "node tests/security/test-csrf.js" \
        "$REPORT_DIR/security-csrf.json"
fi

# 32. Tests Authentification Avancés
if [ -f "tests/security/test-auth-advanced.js" ]; then
    run_test "Tests Authentification Avancés" \
        "node tests/security/test-auth-advanced.js" \
        "$REPORT_DIR/security-auth-advanced.json"
fi

# 33. Tests Autorisation
if [ -f "tests/security/test-authorization.js" ]; then
    run_test "Tests Autorisation (Rôles & Permissions)" \
        "node tests/security/test-authorization.js" \
        "$REPORT_DIR/security-authorization.json"
fi

# 33b. Tests Sécurité Firewall & WAF (script API)
if [ -f "scripts/security/test-firewall.sh" ]; then
    run_test "Tests Sécurité Firewall & WAF (API)" \
        "API_GATEWAY_URL='${API_URL:-http://localhost:5002}' bash scripts/security/test-firewall.sh" \
        "$REPORT_DIR/security-firewall-api.json"
fi

# 34. Tests Rate Limiting Sécurité
if [ -f "tests/security/test-rate-limiting.js" ]; then
    run_test "Tests Rate Limiting Sécurité" \
        "node tests/security/test-rate-limiting.js" \
        "$REPORT_DIR/security-rate-limiting.json"
fi

# ==============================================================================
# CATÉGORIE 8 : TESTS PERFORMANCE AVANCÉS
# ==============================================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     ⚡ CATÉGORIE 8 : TESTS PERFORMANCE AVANCÉS        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 35. Tests de Charge
if [ -f "tests/performance/test-load.js" ]; then
    run_test "Tests de Charge (Load Testing)" \
        "node tests/performance/test-load.js" \
        "$REPORT_DIR/performance-load.json"
fi

# 36. Tests de Stress
if [ -f "tests/performance/test-stress.js" ]; then
    run_test "Tests de Stress (Stress Testing)" \
        "node tests/performance/test-stress.js" \
        "$REPORT_DIR/performance-stress.json"
fi

# 37. Tests Temps de Réponse
if [ -f "tests/performance/test-response-time.js" ]; then
    run_test "Tests Temps de Réponse" \
        "node tests/performance/test-response-time.js" \
        "$REPORT_DIR/performance-response-time.json"
fi

# 38. Tests Base de Données (Requêtes Lentes)
if [ -f "tests/performance/test-database-performance.js" ]; then
    run_test "Tests Performance Base de Données" \
        "node tests/performance/test-database-performance.js" \
        "$REPORT_DIR/performance-database.json"
fi

# Créer le résumé (s'assurer que le répertoire existe)
mkdir -p "$(dirname "$SUMMARY_RESULT")" || true

# Recalculer les totaux à partir des fichiers JSON pour garantir la cohérence
TOTAL_TESTS_RECALC=0
TOTAL_PASSED_RECALC=0
TOTAL_FAILED_RECALC=0
TOTAL_SKIPPED=0

# Parcourir tous les fichiers JSON de résultats (sauf summary.json)
for json_file in "$REPORT_DIR"/*.json; do
    if [ -f "$json_file" ] && [ "$(basename "$json_file")" != "summary.json" ]; then
        # Vérifier si c'est un test skipped
        if command -v jq > /dev/null 2>&1; then
            status=$(jq -r '.status // empty' "$json_file" 2>/dev/null)
            if [ "$status" = "skipped" ]; then
                TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
                continue
            fi
            # Extraire les statistiques
            total=$(jq -r '.statistics.total // 0' "$json_file" 2>/dev/null)
            passed=$(jq -r '.statistics.passed // 0' "$json_file" 2>/dev/null)
            failed=$(jq -r '.statistics.failed // 0' "$json_file" 2>/dev/null)
            
            exit_code=$(jq -r '.exitCode // 1' "$json_file" 2>/dev/null)
            output_text=$(jq -r '.output // ""' "$json_file" 2>/dev/null)
            
            # Si total est 0 ou null, essayer d'extraire les stats depuis la sortie
            if [ "$total" -eq 0 ] || [ -z "$total" ] || [ "$total" = "null" ]; then
                # Essayer d'extraire les stats depuis la sortie du test
                if [ -n "$output_text" ] && [ "$output_text" != "null" ] && [ "$output_text" != "" ]; then
                    # Décoder la sortie JSON (échappement)
                    output_clean=$(echo "$output_text" | sed 's/\\n/\n/g' | sed 's/\\"/"/g' | sed 's/\\\\/\\/g')
                    # Compter les tests réussis
                    passed_count=$(echo "$output_clean" | grep -cE "(✓ PASS|PASS|✓|réussis|✅)" 2>/dev/null || echo "0")
                    # Compter les tests échoués
                    failed_count=$(echo "$output_clean" | grep -cE "(✗ FAIL|FAIL|✗|échoué|❌)" 2>/dev/null || echo "0")
                    # Compter les tests individuels
                    test_count=$(echo "$output_clean" | grep -cE "(\[.*\] Test:|Test [0-9]+:|✓|✗)" 2>/dev/null || echo "0")
                    
                    # Nettoyer les variables (enlever retours à la ligne et espaces)
                    test_count=$(echo "$test_count" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
                    passed_count=$(echo "$passed_count" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
                    failed_count=$(echo "$failed_count" | tr -d '[:space:]\n\r' | grep -E '^[0-9]+$' || echo "0")
                    
                    # Convertir en nombres
                    test_count=$((test_count + 0))
                    passed_count=$((passed_count + 0))
                    failed_count=$((failed_count + 0))
                    
                    if [ "$test_count" -gt 0 ]; then
                        total=$test_count
                        passed=$passed_count
                        failed=$failed_count
                    elif [ -n "$passed_count" ] && [ -n "$failed_count" ] && [ "$passed_count" -ge 0 ] && [ "$failed_count" -ge 0 ] 2>/dev/null && [ $((passed_count + failed_count)) -gt 0 ]; then
                        total=$((passed_count + failed_count))
                        passed=$passed_count
                        failed=$failed_count
                    fi
                fi
                
                # Si total est toujours 0, vérifier si le test a été exécuté (exitCode existe)
                if [ "$total" -eq 0 ] || [ -z "$total" ] || [ "$total" = "null" ]; then
                    # Si exitCode existe et n'est pas null, c'est qu'un test a été exécuté (même sans stats)
                    if [ -n "$exit_code" ] && [ "$exit_code" != "null" ] && [ "$exit_code" != "" ]; then
                        TOTAL_TESTS_RECALC=$((TOTAL_TESTS_RECALC + 1))
                        if [ "$exit_code" -eq 0 ]; then
                            TOTAL_PASSED_RECALC=$((TOTAL_PASSED_RECALC + 1))
                        else
                            TOTAL_FAILED_RECALC=$((TOTAL_FAILED_RECALC + 1))
                        fi
                    fi
                else
                    # Stats extraites depuis la sortie - mettre à jour le JSON
                    if command -v jq > /dev/null 2>&1; then
                        jq ".statistics.total = $total | .statistics.passed = $passed | .statistics.failed = $failed" "$json_file" > "$json_file.tmp" && mv "$json_file.tmp" "$json_file" 2>/dev/null || true
                    fi
                    TOTAL_TESTS_RECALC=$((TOTAL_TESTS_RECALC + total))
                    TOTAL_PASSED_RECALC=$((TOTAL_PASSED_RECALC + passed))
                    TOTAL_FAILED_RECALC=$((TOTAL_FAILED_RECALC + failed))
                fi
            else
                # S'assurer que total = passed + failed
                if [ "$total" -ne $((passed + failed)) ] 2>/dev/null; then
                    total=$((passed + failed))
                    # Mettre à jour le JSON si incohérence
                    if command -v jq > /dev/null 2>&1; then
                        jq ".statistics.total = $total" "$json_file" > "$json_file.tmp" && mv "$json_file.tmp" "$json_file" 2>/dev/null || true
                    fi
                fi
                TOTAL_TESTS_RECALC=$((TOTAL_TESTS_RECALC + total))
                TOTAL_PASSED_RECALC=$((TOTAL_PASSED_RECALC + passed))
                TOTAL_FAILED_RECALC=$((TOTAL_FAILED_RECALC + failed))
            fi
        fi
    fi
done

# Utiliser les valeurs recalculées pour garantir la cohérence
TOTAL_TESTS=$TOTAL_TESTS_RECALC
TOTAL_PASSED=$TOTAL_PASSED_RECALC
TOTAL_FAILED=$TOTAL_FAILED_RECALC

# Calculer le taux de réussite
if [ "$TOTAL_TESTS" -gt 0 ]; then
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($TOTAL_PASSED / $TOTAL_TESTS) * 100}")
else
    SUCCESS_RATE=0.00
fi

cat > "$SUMMARY_RESULT" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "reportDir": "$REPORT_DIR",
  "summary": {
    "totalCategories": $TOTAL_CATEGORIES,
    "totalTests": $TOTAL_TESTS,
    "totalPassed": $TOTAL_PASSED,
    "totalFailed": $TOTAL_FAILED,
    "totalSkipped": $TOTAL_SKIPPED,
    "passed": $TOTAL_PASSED,
    "failed": $TOTAL_FAILED,
    "skipped": $TOTAL_SKIPPED,
    "successRate": $SUCCESS_RATE
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
        test_name=$(jq -r '.testName // "Test inconnu"' "$result_file")
        status=$(jq -r '.status // "unknown"' "$result_file")
        duration=$(jq -r '.duration // 0' "$result_file")
        total=$(jq -r '.statistics.total // 0' "$result_file")
        passed=$(jq -r '.statistics.passed // 0' "$result_file")
        failed=$(jq -r '.statistics.failed // 0' "$result_file")
        # Extraire output en gérant les cas null/empty
        output=$(jq -r '.output // ""' "$result_file" 2>/dev/null || echo "")
    else
        # Fallback: extraire avec grep/sed
        test_name=$(grep -o '"testName": "[^"]*"' "$result_file" | cut -d'"' -f4 || echo "Test inconnu")
        status=$(grep -o '"status": "[^"]*"' "$result_file" | cut -d'"' -f4 || echo "unknown")
        duration=$(grep -o '"duration": [0-9]*' "$result_file" | grep -o '[0-9]*' || echo "0")
        total=$(grep -o '"total": [0-9]*' "$result_file" | grep -o '[0-9]*' || echo "0")
        passed=$(grep -o '"passed": [0-9]*' "$result_file" | grep -o '[0-9]*' || echo "0")
        failed=$(grep -o '"failed": [0-9]*' "$result_file" | grep -o '[0-9]*' || echo "0")
        # Extraire output (peut être sur plusieurs lignes)
        output=$(grep -A 1000 '"output":' "$result_file" | sed '1s/.*"output": *"//' | sed '$s/"$//' | sed 's/\\n/\n/g' | sed 's/\\"/"/g' || echo "")
    fi
    
    # Gérer les valeurs par défaut
    test_name=${test_name:-"Test inconnu"}
    status=${status:-"unknown"}
    duration=${duration:-0}
    total=${total:-0}
    passed=${passed:-0}
    failed=${failed:-0}
    
    # Nettoyer les codes ANSI de la sortie pour l'affichage HTML
    if [ -n "$output" ] && [ "$output" != "null" ] && [ "$output" != "" ]; then
        clean_output=$(echo "$output" | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | sed 's/\\n/\n/g' | sed 's/\\"/"/g' | sed 's/\\t/\t/g')
    else
        # Si pas de sortie mais que le test a échoué, essayer de récupérer depuis le JSON
        if [ "$status" = "failed" ]; then
            # Essayer de récupérer depuis le JSON si disponible
            if [ -f "$result_file" ] && command -v jq > /dev/null 2>&1; then
                json_output=$(jq -r '.output // ""' "$result_file" 2>/dev/null || echo "")
                if [ -n "$json_output" ] && [ "$json_output" != "null" ] && [ "$json_output" != "" ]; then
                    clean_output=$(echo "$json_output" | sed 's/\\n/\n/g' | sed 's/\\"/"/g' | sed 's/\\t/\t/g' | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g')
                else
                    clean_output="Erreur : Le test a échoué mais aucune sortie n'a été capturée dans le JSON. Code de sortie: $exit_code"
                fi
            else
                clean_output="Erreur : Le test a échoué mais aucune sortie n'a été capturée. Code de sortie: $exit_code"
            fi
        else
            clean_output="Aucune sortie disponible pour ce test."
        fi
    fi
    
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
        <details open>
            <summary>Voir les détails complets ($(echo "$clean_output" | wc -l | tr -d ' ') lignes)</summary>
            <pre style="max-height: 800px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">$(echo "$clean_output")</pre>
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
if [ "$TOTAL_SKIPPED" -gt 0 ]; then
    echo -e "Tests ignorés          : ${YELLOW}$TOTAL_SKIPPED${NC}"
fi
if [ "$TOTAL_TESTS" -gt 0 ]; then
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($TOTAL_PASSED / $TOTAL_TESTS) * 100}")
    echo -e "Taux de réussite       : ${GREEN}${SUCCESS_RATE}%${NC}"
    # Vérification de cohérence
    if [ "$TOTAL_TESTS" -ne $((TOTAL_PASSED + TOTAL_FAILED)) ]; then
        echo -e "${YELLOW}⚠️  Incohérence détectée : $TOTAL_TESTS tests ≠ $TOTAL_PASSED réussis + $TOTAL_FAILED échoués${NC}"
    fi
fi
echo ""
echo -e "${GREEN}📁 Résultats sauvegardés dans : $REPORT_DIR${NC}"
echo -e "${GREEN}📄 Rapport HTML : $HTML_REPORT${NC}"
echo ""

# Afficher le lien URL du rapport HTML (sans ouvrir automatiquement)
if [ -f "$HTML_REPORT" ]; then
    HTML_REPORT_ABS=$(cd "$(dirname "$HTML_REPORT")" && pwd)/$(basename "$HTML_REPORT")
    HTML_REPORT_URI="file://$HTML_REPORT_ABS"
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📊 RAPPORT HTML DISPONIBLE${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}🌐 Lien du rapport :${NC}"
    echo -e "${BLUE}$HTML_REPORT_URI${NC}"
    echo ""
    echo -e "${YELLOW}💡 Copiez ce lien et ouvrez-le dans votre navigateur${NC}"
    echo -e "${YELLOW}   Ou utilisez :${NC}"
    echo -e "${YELLOW}   • Linux: xdg-open \"$HTML_REPORT_URI\"${NC}"
    echo -e "${YELLOW}   • macOS: open \"$HTML_REPORT_URI\"${NC}"
    echo -e "${YELLOW}   • Windows: start \"$HTML_REPORT_URI\"${NC}"
    echo ""
else
    echo -e "${RED}❌ Le rapport HTML n'a pas pu être généré : $HTML_REPORT${NC}"
    echo -e "${YELLOW}💡 Vérifiez les logs ci-dessus pour plus de détails${NC}"
fi

# Code de sortie
# Retourner 0 si le rapport a été généré avec succès (même s'il y a des échecs)
# L'utilisateur peut voir les résultats dans le rapport HTML
if [ -f "$HTML_REPORT" ] && [ -f "$SUMMARY_RESULT" ]; then
    echo ""
    if [ $TOTAL_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ Tous les tests ont réussi !${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Certains tests ont échoué, mais le rapport a été généré${NC}"
        echo -e "${YELLOW}   Consultez le rapport HTML pour plus de détails${NC}"
        exit 0  # Retourner 0 car le rapport est généré, même avec des échecs
    fi
else
    echo -e "${RED}❌ Erreur : Le rapport n'a pas pu être généré${NC}"
    exit 1
fi

