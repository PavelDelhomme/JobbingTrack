#!/usr/bin/env bash

# ============================================================================
# Script de vérification complète du système - JobbingTrack
# ============================================================================
# Vérifie l'état de santé de TOUS les composants du système JobbingTrack
#
# Usage: ./scripts/health/check-all.sh [OPTIONS]
#
# Options:
#   --quick           Vérification rapide (services essentiels uniquement)
#   --detailed        Vérification détaillée avec diagnostics avancés
#   --fix             Tenter de corriger automatiquement les problèmes
#   --report-format   Format du rapport (text, json, html)
#   --output          Fichier de sortie pour le rapport
#   --help            Afficher cette aide
#
# Codes de sortie:
#   0 = Tout fonctionne correctement
#   1 = Problèmes détectés (warnings)
#   2 = Erreurs critiques détectées
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration

# ============================================================================
# DÉTECTION AUTOMATIQUE DOCKER COMPOSE
# ============================================================================

# Import du wrapper Docker Compose utilitaire
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UTILS_DIR="$SCRIPT_DIR/../utils"

if [ -f "$UTILS_DIR/docker_compose_wrapper-wrapper.sh" ]; then
    source "$UTILS_DIR/docker_compose_wrapper-wrapper.sh"

    # Initialiser la détection Docker Compose
    if ! init_docker_compose_detection; then
        echo -e "${RED}❌ Impossible d'initialiser Docker Compose${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Wrapper Docker Compose non trouvé${NC}"
    exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
QUICK=false
DETAILED=false
FIX=false
REPORT_FORMAT="text"
OUTPUT_FILE=""
LOG_FILE="/tmp/jobbingtrack-health-check.log"

# Variables de statut
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNING_CHECKS=0
FAILED_CHECKS=0
CRITICAL_ISSUES=0

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🔍 Vérification complète du système - JobbingTrack${NC}"
    echo "================================================"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --quick           Vérification rapide (services essentiels uniquement)"
    echo "  --detailed        Vérification détaillée avec diagnostics avancés"
    echo "  --fix             Tenter de corriger automatiquement les problèmes"
    echo "  --report-format   Format du rapport (text, json, html)"
    echo "  --output          Fichier de sortie pour le rapport"
    echo "  --help            Afficher cette aide"
    echo ""
    echo "Formats de rapport:"
    echo "  text              Rapport textuel (défaut)"
    echo "  json              Rapport JSON structuré"
    echo "  html              Rapport HTML avec graphiques"
    echo ""
    echo "Exemples:"
    echo "  $0                           # Vérification standard"
    echo "  $0 --detailed                # Vérification complète"
    echo "  $0 --fix                     # Diagnostic avec correction"
    echo "  $0 --report-format json      # Rapport JSON"
    echo "  $0 --output report.html      # Générer rapport HTML"
    echo ""
    echo "Codes de sortie:"
    echo "  0 = Tout fonctionne correctement"
    echo "  1 = Problèmes détectés (warnings)"
    echo "  2 = Erreurs critiques détectées"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK=true
            shift
            ;;
        --detailed)
            DETAILED=true
            shift
            ;;
        --fix)
            FIX=true
            shift
            ;;
        --report-format)
            REPORT_FORMAT="$2"
            shift 2
            ;;
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Option inconnue: $1${NC}"
            show_help
            exit 2
            ;;
    esac
done

# Fonction de logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Fonction pour enregistrer un résultat de vérification
record_result() {
    local check_name="$1"
    local status="$2"  # PASSED, WARNING, FAILED
    local message="$3"

    ((TOTAL_CHECKS++))

    case "$status" in
        PASSED)
            ((PASSED_CHECKS++))
            echo -e "${GREEN}✅ $check_name: $message${NC}"
            ;;
        WARNING)
            ((WARNING_CHECKS++))
            echo -e "${YELLOW}⚠️  $check_name: $message${NC}"
            ;;
        FAILED)
            ((FAILED_CHECKS++))
            echo -e "${RED}❌ $check_name: $message${NC}"
            if [[ "$message" =~ "critique" ]]; then
                ((CRITICAL_ISSUES++))
            fi
            ;;
    esac

    log "$check_name: $status - $message"
}

# Fonction pour vérifier Docker
check_docker() {
    local check_name="Docker"
    local message=""

    if ! command -v docker &> /dev/null; then
        record_result "$check_name" "FAILED" "Docker n'est pas installé"
        return 1
    fi

    if ! docker info &> /dev/null; then
        record_result "$check_name" "FAILED" "Docker daemon n'est pas en cours d'exécution"
        if [ "$FIX" = true ]; then
            echo -e "${YELLOW}💡 Tentative de démarrage de Docker...${NC}"
            sudo systemctl start docker 2>/dev/null || true
            sleep 2
            if docker info &> /dev/null; then
                record_result "$check_name" "PASSED" "Docker daemon démarré avec succès"
                return 0
            fi
        fi
        return 1
    fi

    record_result "$check_name" "PASSED" "Docker est opérationnel"
    return 0
}

# Fonction pour vérifier Docker Compose
check_docker_compose() {
    local check_name="Docker Compose"
    local message=""

    if ! command -v docker_compose_wrapper &> /dev/null && ! docker compose version &> /dev/null; then
        record_result "$check_name" "FAILED" "Docker Compose n'est pas installé"
        return 1
    fi

    record_result "$check_name" "PASSED" "Docker Compose est disponible"
    return 0
}

# Fonction pour vérifier les services essentiels
check_essential_services() {
    local check_name="Services essentiels"
    local services=("postgres" "redis" "api-gateway")
    local all_ok=true

    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "jobbingtrack-$service\|$service"; then
            record_result "$check_name - $service" "PASSED" "Service en cours d'exécution"
        else
            record_result "$check_name - $service" "FAILED" "Service arrêté"
            all_ok=false
        fi
    done

    $all_ok
}

# Fonction pour vérifier les endpoints principaux
check_main_endpoints() {
    local check_name="Endpoints principaux"
    local endpoints=(
        "http://localhost:3000/health"
        "http://localhost:8080"
    )

    for endpoint in "${endpoints[@]}"; do
        if curl -f -s --max-time 10 "$endpoint" >/dev/null 2>&1; then
            record_result "$check_name - $(basename "$endpoint")" "PASSED" "Endpoint accessible"
        else
            record_result "$check_name - $(basename "$endpoint")" "FAILED" "Endpoint non accessible"
        fi
    done
}

# Fonction pour vérifier la base de données
check_database() {
    local check_name="Base de données"

    if command -v psql >/dev/null 2>&1; then
        if PGPASSWORD=jobbingtrack123 psql -h localhost -U jobbingtrack -d jobbingtrack -c "SELECT 1;" >/dev/null 2>&1; then
            record_result "$check_name" "PASSED" "Connexion PostgreSQL réussie"
            return 0
        fi
    fi

    if docker_compose_wrapper exec -T postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1;" >/dev/null 2>&1; then
        record_result "$check_name" "PASSED" "PostgreSQL accessible via Docker"
        return 0
    fi

    record_result "$check_name" "FAILED" "PostgreSQL non accessible"
    return 1
}

# Fonction pour vérifier Redis
check_redis() {
    local check_name="Redis"

    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
            record_result "$check_name" "PASSED" "Connexion Redis réussie"
            return 0
        fi
    fi

    if docker_compose_wrapper exec -T redis redis-cli ping >/dev/null 2>&1; then
        record_result "$check_name" "PASSED" "Redis accessible via Docker"
        return 0
    fi

    record_result "$check_name" "FAILED" "Redis non accessible"
    return 1
}

# Fonction pour vérifier les services optionnels
check_optional_services() {
    if [ "$QUICK" = true ]; then
        return 0
    fi

    local check_name="Services optionnels"
    local optional_services=("auth-service" "application-service" "company-service" "frontend")

    for service in "${optional_services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "jobbingtrack-$service"; then
            record_result "$check_name - $service" "PASSED" "Service en cours d'exécution"
        else
            record_result "$check_name - $service" "WARNING" "Service non démarré (optionnel)"
        fi
    done
}

# Fonction pour vérifier l'espace disque
check_disk_space() {
    if [ "$DETAILED" = false ]; then
        return 0
    fi

    local check_name="Espace disque"
    local usage=$(df . | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -gt 90 ]; then
        record_result "$check_name" "FAILED" "Espace disque critique: ${usage}% utilisé"
        return 1
    elif [ "$usage" -gt 80 ]; then
        record_result "$check_name" "WARNING" "Espace disque faible: ${usage}% utilisé"
        return 0
    else
        record_result "$check_name" "PASSED" "Espace disque OK: ${usage}% utilisé"
        return 0
    fi
}

# Fonction pour vérifier la mémoire
check_memory() {
    if [ "$DETAILED" = false ]; then
        return 0
    fi

    local check_name="Mémoire système"
    local mem_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2 }')

    if (( $(echo "$mem_usage > 90" | bc -l) )); then
        record_result "$check_name" "FAILED" "Mémoire critique: ${mem_usage}% utilisée"
        return 1
    elif (( $(echo "$mem_usage > 80" | bc -l) )); then
        record_result "$check_name" "WARNING" "Mémoire élevée: ${mem_usage}% utilisée"
        return 0
    else
        record_result "$check_name" "PASSED" "Mémoire OK: ${mem_usage}% utilisée"
        return 0
    fi
}

# Fonction pour générer le rapport
generate_report() {
    local format="$1"
    local output_file="$2"

    case "$format" in
        json)
            generate_json_report "$output_file"
            ;;
        html)
            generate_html_report "$output_file"
            ;;
        text|*)
            generate_text_report "$output_file"
            ;;
    esac
}

# Fonction pour générer le rapport JSON
generate_json_report() {
    local output_file="$1"

    local json_report=$(
        cat << EOF
{
  "timestamp": "$(date -Iseconds)",
  "system": "JobbingTrack",
  "version": "1.0",
  "status": {
    "total_checks": $TOTAL_CHECKS,
    "passed": $PASSED_CHECKS,
    "warnings": $WARNING_CHECKS,
    "failed": $FAILED_CHECKS,
    "critical_issues": $CRITICAL_ISSUES,
    "overall_status": $(if [ $CRITICAL_ISSUES -gt 0 ]; then echo '"CRITICAL"'; elif [ $FAILED_CHECKS -gt 0 ]; then echo '"WARNING"'; else echo '"HEALTHY"'; fi)
  },
  "checks": [
    $(generate_check_details_json)
  ],
  "recommendations": [
    $(generate_recommendations_json)
  ]
}
EOF
    )

    if [ -n "$output_file" ]; then
        echo "$json_report" > "$output_file"
        echo -e "${GREEN}📄 Rapport JSON généré: $output_file${NC}"
    else
        echo "$json_report"
    fi
}

# Fonction pour générer les détails des vérifications en JSON
generate_check_details_json() {
    # Cette fonction serait implémentée pour générer les détails JSON
    echo '"JSON details not implemented yet"'
}

# Fonction pour générer les recommandations en JSON
generate_recommendations_json() {
    local recommendations=()

    if [ $CRITICAL_ISSUES -gt 0 ]; then
        recommendations+=('"Résoudre immédiatement les problèmes critiques détectés"')
    fi

    if [ $FAILED_CHECKS -gt 0 ]; then
        recommendations+=('"Examiner et corriger les services défaillants"')
    fi

    if [ $WARNING_CHECKS -gt 0 ]; then
        recommendations+=('"Surveiller les avertissements pour éviter les problèmes futurs"')
    fi

    if [ ${#recommendations[@]} -eq 0 ]; then
        recommendations+=('"Système en bonne santé - aucune action requise"')
    fi

    IFS=$'\n'
    echo "${recommendations[*]}"
    unset IFS
}

# Fonction pour générer le rapport HTML
generate_html_report() {
    local output_file="$1"

    local html_report=$(
        cat << EOF
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de santé - JobbingTrack</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 8px; }
        .status-healthy { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-critical { color: #dc3545; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .checks { margin: 20px 0; }
        .check { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .check.passed { background: #d4edda; border-left: 4px solid #28a745; }
        .check.warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .check.failed { background: #f8d7da; border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Rapport de santé - JobbingTrack</h1>
        <p>Généré le: $(date)</p>
        <p>Status général: <span class="status-$(if [ $CRITICAL_ISSUES -gt 0 ]; then echo 'critical'; elif [ $FAILED_CHECKS -gt 0 ]; then echo 'warning'; else echo 'healthy'; fi)">$(if [ $CRITICAL_ISSUES -gt 0 ]; then echo 'CRITIQUE'; elif [ $FAILED_CHECKS -gt 0 ]; then echo 'AVERTISSEMENT'; else echo 'SAIN'; fi)</span></p>
    </div>

    <div class="summary">
        <div class="metric">
            <div>Vérifications totales</div>
            <div class="metric-value">$TOTAL_CHECKS</div>
        </div>
        <div class="metric">
            <div>Réussies</div>
            <div class="metric-value status-healthy">$PASSED_CHECKS</div>
        </div>
        <div class="metric">
            <div>Avertissements</div>
            <div class="metric-value status-warning">$WARNING_CHECKS</div>
        </div>
        <div class="metric">
            <div>Échecs</div>
            <div class="metric-value status-critical">$FAILED_CHECKS</div>
        </div>
    </div>

    <div class="checks">
        <h2>📋 Détail des vérifications</h2>
        <!-- Les détails des vérifications seraient ajoutés ici -->
        <p>Détails des vérifications non implémentés dans cette version.</p>
    </div>
</body>
</html>
EOF
    )

    if [ -n "$output_file" ]; then
        echo "$html_report" > "$output_file"
        echo -e "${GREEN}📄 Rapport HTML généré: $output_file${NC}"
    else
        echo "$html_report"
    fi
}

# Fonction pour générer le rapport textuel
generate_text_report() {
    local output_file="$1"

    local text_report=$(
        cat << EOF
============================================================
🔍 RAPPORT DE SANTÉ - JobbingTrack
============================================================

Généré le: $(date)
Status général: $(if [ $CRITICAL_ISSUES -gt 0 ]; then echo 'CRITIQUE'; elif [ $FAILED_CHECKS -gt 0 ]; then echo 'AVERTISSEMENT'; else echo 'SAIN'; fi)

📊 RÉSUMÉ:
   Vérifications totales: $TOTAL_CHECKS
   Réussies: $PASSED_CHECKS
   Avertissements: $WARNING_CHECKS
   Échecs: $FAILED_CHECKS
   Problèmes critiques: $CRITICAL_ISSUES

📋 DÉTAILS:
$(generate_text_details)

🎯 RECOMMANDATIONS:
$(generate_text_recommendations)

============================================================
EOF
    )

    if [ -n "$output_file" ]; then
        echo "$text_report" > "$output_file"
        echo -e "${GREEN}📄 Rapport textuel généré: $output_file${NC}"
    else
        echo "$text_report"
    fi
}

# Fonction pour générer les détails textuels
generate_text_details() {
    echo "   Détails des vérifications non implémentés dans cette version."
}

# Fonction pour générer les recommandations textuelles
generate_text_recommendations() {
    if [ $CRITICAL_ISSUES -gt 0 ]; then
        echo "   • Résoudre immédiatement les problèmes critiques détectés"
    fi
    if [ $FAILED_CHECKS -gt 0 ]; then
        echo "   • Examiner et corriger les services défaillants"
    fi
    if [ $WARNING_CHECKS -gt 0 ]; then
        echo "   • Surveiller les avertissements pour éviter les problèmes futurs"
    fi
    if [ $CRITICAL_ISSUES -eq 0 ] && [ $FAILED_CHECKS -eq 0 ]; then
        echo "   • Système en bonne santé - aucune action requise"
    fi
}

# Fonction principale
main() {
    echo -e "${BLUE}🔍 Vérification complète du système JobbingTrack${NC}"
    echo "=============================================="

    # Créer le fichier de log s'il n'existe pas
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"

    # Enregistrer le début de la vérification
    log "=== Début de la vérification complète du système ==="

    # Exécuter toutes les vérifications
    check_docker
    check_docker_compose
    check_essential_services
    check_main_endpoints
    check_database
    check_redis
    check_optional_services
    check_disk_space
    check_memory

    # Enregistrer la fin de la vérification
    log "=== Fin de la vérification complète du système ==="

    # Générer le rapport
    if [ "$REPORT_FORMAT" != "text" ] || [ -n "$OUTPUT_FILE" ]; then
        generate_report "$REPORT_FORMAT" "$OUTPUT_FILE"
    fi

    # Résumé final
    echo -e "\n${BLUE}📊 Résumé final${NC}"
    echo "=============="
    echo "Total des vérifications: $TOTAL_CHECKS"
    echo "Réussies: $PASSED_CHECKS"
    echo "Avertissements: $WARNING_CHECKS"
    echo "Échecs: $FAILED_CHECKS"

    if [ $CRITICAL_ISSUES -gt 0 ]; then
        echo -e "${RED}❌ $CRITICAL_ISSUES problème(s) critique(s) détecté(s)${NC}"
        return 2
    elif [ $FAILED_CHECKS -gt 0 ]; then
        echo -e "${YELLOW}⚠️ $FAILED_CHECKS problème(s) détecté(s)${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Tous les systèmes sont opérationnels !${NC}"
        return 0
    fi
}

# Exécution
main "$@"
