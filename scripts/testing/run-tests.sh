#!/usr/bin/env bash

# ============================================================================
# Script d'exécution des tests - JobbingTrack
# ============================================================================
# Exécute les tests automatisés du système JobbingTrack
#
# Usage: ./scripts/testing/run-tests.sh [OPTIONS]
#
# Options:
#   --auth            Tests d'authentification uniquement
#   --integration     Tests d'intégration uniquement
#   --e2e            Tests end-to-end uniquement
#   --all            Tous les tests (par défaut)
#   --help           Afficher cette aide
#
# Exemples:
#   ./scripts/testing/run-tests.sh --auth
#   ./scripts/testing/run-tests.sh --all
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"

# Options de test
RUN_AUTH=false
RUN_INTEGRATION=false
RUN_E2E=false
RUN_ALL=true

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🧪 Tests Système - JobbingTrack${NC}"
    echo "=============================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --auth            Tests d'authentification uniquement"
    echo "  --integration     Tests d'intégration uniquement"
    echo "  --e2e            Tests end-to-end uniquement"
    echo "  --all            Tous les tests (par défaut)"
    echo "  --help           Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 --auth                        # Tests d'authentification"
    echo "  $0 --integration                 # Tests d'intégration"
    echo "  $0 --all                         # Tous les tests"
    echo ""
    echo "Rapports générés dans: $TEST_RESULTS_DIR/"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --auth)
            RUN_AUTH=true
            RUN_ALL=false
            shift
            ;;
        --integration)
            RUN_INTEGRATION=true
            RUN_ALL=false
            shift
            ;;
        --e2e)
            RUN_E2E=true
            RUN_ALL=false
            shift
            ;;
        --all)
            RUN_ALL=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Option inconnue: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Fonction pour exécuter les tests d'authentification
run_auth_tests() {
    echo -e "\n${BLUE}🔐 Tests d'authentification${NC}"
    echo "==========================="

    local api_gateway="http://localhost:3000"
    local test_email="${TEST_EMAIL:-dumb@example.invalid}"
    local test_password="${TEST_PASSWORD:-TestPassword123!}"

    echo "📧 Email de test: $test_email"

    # Test d'inscription
    echo -e "\n${YELLOW}📝 Test d'inscription...${NC}"
    response=$(curl -s -X POST "$api_gateway/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$test_email\",
            \"password\": \"$test_password\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\"
        }")

    if echo "$response" | grep -q "success\|token\|message"; then
        echo -e "${GREEN}✅ Inscription réussie${NC}"
    elif echo "$response" | grep -q "exists\|already"; then
        echo -e "${YELLOW}⚠️ Utilisateur existe déjà (normal)${NC}"
    else
        echo -e "${RED}❌ Inscription échouée: $response${NC}"
        return 1
    fi

    # Test de connexion
    echo -e "\n${YELLOW}🔑 Test de connexion...${NC}"
    response=$(curl -s -X POST "$api_gateway/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$test_email\",
            \"password\": \"$test_password\"
        }")

    if command -v jq > /dev/null 2>&1; then
        token=$(echo "$response" | jq -r '.token // empty')
    else
        token=$(echo "$response" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
    fi

    if [ -n "$token" ] && [ "$token" != "null" ]; then
        echo -e "${GREEN}✅ Connexion réussie${NC}"
        echo "$token" > "$TEST_RESULTS_DIR/auth-token.txt"
        return 0
    else
        echo -e "${RED}❌ Connexion échouée: $response${NC}"
        return 1
    fi
}

# Fonction pour exécuter les tests d'intégration
run_integration_tests() {
    echo -e "\n${BLUE}🔗 Tests d'intégration${NC}"
    echo "======================"

    local api_gateway="http://localhost:3000"
    local test_email="${TEST_EMAIL:-dumb@example.invalid}"
    local test_password="${TEST_PASSWORD:-TestPassword123!}"

    # Obtenir le token d'authentification
    local token
    if [ -f "$TEST_RESULTS_DIR/auth-token.txt" ]; then
        token=$(cat "$TEST_RESULTS_DIR/auth-token.txt")
    else
        echo -e "${YELLOW}⚠️ Aucun token trouvé, exécution des tests d'auth d'abord...${NC}"
        if ! run_auth_tests; then
            return 1
        fi
        token=$(cat "$TEST_RESULTS_DIR/auth-token.txt")
    fi

    # Test création d'entreprise
    echo -e "\n${YELLOW}🏢 Test création d'entreprise...${NC}"
    response=$(curl -s -X POST "$api_gateway/api/v1/companies" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d '{
            "name": "Test Company",
            "industry": "Technology",
            "size": "STARTUP"
        }')

    if echo "$response" | grep -q "success\|id"; then
        echo -e "${GREEN}✅ Entreprise créée avec succès${NC}"
    else
        echo -e "${RED}❌ Échec création entreprise: $response${NC}"
        return 1
    fi

    # Test création de candidature
    echo -e "\n${YELLOW}📋 Test création de candidature...${NC}"
    response=$(curl -s -X POST "$api_gateway/api/v1/applications" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d '{
            "companyName": "Test Company",
            "position": "Software Engineer",
            "type": "FULL_TIME",
            "status": "DRAFT"
        }')

    if echo "$response" | grep -q "success\|id"; then
        echo -e "${GREEN}✅ Candidature créée avec succès${NC}"
    else
        echo -e "${RED}❌ Échec création candidature: $response${NC}"
        return 1
    fi

    return 0
}

# Fonction pour exécuter les tests end-to-end
run_e2e_tests() {
    echo -e "\n${BLUE}🔄 Tests End-to-End${NC}"
    echo "==================="

    echo -e "${YELLOW}🌐 Test accessibilité du frontend...${NC}"
    if curl -f -s --max-time 10 "http://localhost:8080" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend accessible${NC}"
    else
        echo -e "${RED}❌ Frontend non accessible${NC}"
        return 1
    fi

    echo -e "\n${YELLOW}🔗 Test accessibilité de l'API Gateway...${NC}"
    if curl -f -s --max-time 10 "http://localhost:3000/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API Gateway accessible${NC}"
    else
        echo -e "${RED}❌ API Gateway non accessible${NC}"
        return 1
    fi

    return 0
}

# Fonction principale
main() {
    echo -e "${BLUE}🧪 Démarrage des tests JobbingTrack${NC}"
    echo "=================================="

    # Créer le dossier des résultats
    mkdir -p "$TEST_RESULTS_DIR"

    local overall_success=true

    # Exécuter les tests selon les options
    if [ "$RUN_AUTH" = true ] || [ "$RUN_ALL" = true ]; then
        if ! run_auth_tests; then
            overall_success=false
        fi
    fi

    if [ "$RUN_INTEGRATION" = true ] || [ "$RUN_ALL" = true ]; then
        if ! run_integration_tests; then
            overall_success=false
        fi
    fi

    if [ "$RUN_E2E" = true ] || [ "$RUN_ALL" = true ]; then
        if ! run_e2e_tests; then
            overall_success=false
        fi
    fi

    # Rapport final
    echo -e "\n${BLUE}📊 Rapport final des tests${NC}"
    echo "=========================="

    if [ "$overall_success" = true ]; then
        echo -e "${GREEN}✅ Tous les tests sont passés !${NC}"
        echo ""
        echo -e "${BLUE}🌐 Interfaces disponibles :${NC}"
        echo "   Frontend:           http://localhost:8080"
        echo "   API Gateway:        http://localhost:3000"
        echo ""
        echo -e "${BLUE}📁 Rapports générés dans : $TEST_RESULTS_DIR/${NC}"
        return 0
    else
        echo -e "${RED}❌ Certains tests ont échoué${NC}"
        echo ""
        echo -e "${YELLOW}💡 Consultez les détails ci-dessus${NC}"
        echo -e "${YELLOW}💡 Vérifiez que tous les services sont démarrés${NC}"
        return 1
    fi
}

# Exécution
main "$@"
