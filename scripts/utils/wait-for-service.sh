#!/usr/bin/env bash

# ============================================================================
# Script d'attente de service - JobbingTrack
# ============================================================================
# Attend qu'un service soit prêt avant de continuer l'exécution
#
# Usage: ./scripts/utils/wait-for-service.sh SERVICE_URL [OPTIONS]
#
# Arguments:
#   SERVICE_URL      URL complète du service à tester
#
# Options:
#   --timeout SECS   Timeout en secondes (défaut: 60)
#   --interval SECS  Intervalle entre les tests (défaut: 2)
#   --help           Afficher cette aide
#
# Codes de sortie:
#   0 = Service prêt
#   1 = Timeout atteint
#   2 = Erreur d'usage
#
# Exemples:
#   ./scripts/utils/wait-for-service.sh http://localhost:3000/health
#   ./scripts/utils/wait-for-service.sh http://localhost:8080 --timeout 30
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_URL="$1"
TIMEOUT="${2:-60}"
INTERVAL="${3:-2}"

# Fonction d'aide
show_help() {
    echo -e "${BLUE}⏳ Attente de service - JobbingTrack${NC}"
    echo "=================================="
    echo ""
    echo "Usage: $0 SERVICE_URL [OPTIONS]"
    echo ""
    echo "Arguments:"
    echo "  SERVICE_URL      URL complète du service à tester"
    echo ""
    echo "Options:"
    echo "  --timeout SECS   Timeout en secondes (défaut: 60)"
    echo "  --interval SECS  Intervalle entre les tests (défaut: 2)"
    echo "  --help           Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 http://localhost:3000/health"
    echo "  $0 http://localhost:8080 --timeout 30"
    echo "  $0 https://api.example.com/status --interval 5"
    echo ""
    echo "Codes de sortie:"
    echo "  0 = Service prêt"
    echo "  1 = Timeout atteint"
    echo "  2 = Erreur d'usage"
}

# Gestion des arguments
if [[ $# -eq 0 ]]; then
    echo -e "${RED}❌ URL du service manquante${NC}"
    show_help
    exit 2
fi

# Parser les arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        -*)
            echo -e "${RED}❌ Option inconnue: $1${NC}"
            show_help
            exit 2
            ;;
        *)
            if [[ -z "$SERVICE_URL" ]]; then
                SERVICE_URL="$1"
            else
                echo -e "${RED}❌ Trop d'arguments${NC}"
                show_help
                exit 2
            fi
            shift
            ;;
    esac
done

# Validation des arguments
if [[ -z "$SERVICE_URL" ]]; then
    echo -e "${RED}❌ URL du service manquante${NC}"
    show_help
    exit 2
fi

if ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]] || [ "$TIMEOUT" -le 0 ]; then
    echo -e "${RED}❌ Timeout invalide: $TIMEOUT${NC}"
    exit 2
fi

if ! [[ "$INTERVAL" =~ ^[0-9]+$ ]] || [ "$INTERVAL" -le 0 ]; then
    echo -e "${RED}❌ Interval invalide: $INTERVAL${NC}"
    exit 2
fi

# Fonction pour tester si le service est prêt
test_service() {
    local url="$1"

    # Essayer différentes méthodes selon le type d'URL
    if curl -f -s --max-time 10 "$url" >/dev/null 2>&1; then
        return 0
    fi

    # Pour les endpoints health, essayer avec différentes méthodes
    if [[ "$url" =~ /health ]]; then
        if curl -f -s --max-time 10 -H "Accept: application/json" "$url" >/dev/null 2>&1; then
            return 0
        fi
    fi

    return 1
}

# Fonction principale
main() {
    echo -e "${BLUE}⏳ Attente du service: $SERVICE_URL${NC}"
    echo "===================================="
    echo "⏰ Timeout: ${TIMEOUT}s | 🔄 Intervalle: ${INTERVAL}s"

    local start_time=$(date +%s)
    local elapsed=0
    local attempts=0

    while [ $elapsed -lt $TIMEOUT ]; do
        ((attempts++))

        echo -e "\n${YELLOW}🔍 Tentative $attempts...${NC}"

        if test_service "$SERVICE_URL"; then
            local total_time=$(( $(date +%s) - start_time ))
            echo -e "\n${GREEN}✅ Service prêt après ${total_time}s (${attempts} tentatives)${NC}"
            return 0
        fi

        echo -e "${YELLOW}⏳ Service pas encore prêt, attente de ${INTERVAL}s...${NC}"

        sleep "$INTERVAL"
        elapsed=$(( $(date +%s) - start_time ))
    done

    echo -e "\n${RED}❌ Timeout atteint après ${TIMEOUT}s (${attempts} tentatives)${NC}"
    echo -e "${YELLOW}💡 Le service $SERVICE_URL n'est pas accessible${NC}"
    return 1
}

# Exécution
main "$@"
