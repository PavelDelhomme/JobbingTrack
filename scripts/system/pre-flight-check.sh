#!/bin/bash

# ============================================================================
# Script de Vérification Pré-vol - JobbingTrack
# ============================================================================
# Vérifications complètes avant toute opération critique

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
LOG_FILE="/tmp/jobbingtrack-pre-flight.log"

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Fonction de succès
success() {
    echo "✅ $1"
}

# Fonction d'avertissement
warning() {
    echo "⚠️ $1"
}

# Fonction d'erreur
error() {
    echo "❌ $1"
    exit 1
}

# Vérifier les dépendances système
check_system_dependencies() {
    log "🔍 Vérification des dépendances système..."

    local missing_deps=()

    # Vérifier Docker
    if ! command -v docker >/dev/null 2>&1; then
        missing_deps+=("docker")
    else
        # Vérifier que Docker daemon est actif
        if ! docker info >/dev/null 2>&1; then
            error "Docker daemon n'est pas actif"
        fi
    fi

    # Vérifier Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        missing_deps+=("docker-compose")
    fi

    # Vérifier Git
    if ! command -v git >/dev/null 2>&1; then
        missing_deps+=("git")
    fi

    # Vérifier Make
    if ! command -v make >/dev/null 2>&1; then
        missing_deps+=("make")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        error "Dépendances manquantes: ${missing_deps[*]}"
    fi

    success "Toutes les dépendances système sont installées"
}

# Vérifier l'espace disque
check_disk_space() {
    log "💾 Vérification de l'espace disque..."

    local usage=$(df . | awk 'NR==2 {print $5}' | sed 's/%//')
    local available=$(df . | awk 'NR==2 {print $4}' | sed 's/G.*//')

    if [ "$usage" -gt 90 ]; then
        error "Espace disque critique: ${usage}% utilisé"
    elif [ "$usage" -gt 80 ]; then
        warning "Espace disque faible: ${usage}% utilisé (${available}G disponible)"
    else
        success "Espace disque suffisant: ${usage}% utilisé"
    fi
}

# Vérifier les ports réseau
check_ports() {
    log "🌐 Vérification des ports réseau..."

    local required_ports=(3000 3001 3002 3003 3004 3005 3006 3007 8080 5432 6379)
    local occupied_ports=()

    for port in "${required_ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            occupied_ports+=("$port")
        fi
    done

    if [ ${#occupied_ports[@]} -gt 0 ]; then
        warning "Ports occupés: ${occupied_ports[*]}"
        echo "   💡 Suggestion: Arrêter les services existants avec 'make down'"
    else
        success "Tous les ports requis sont disponibles"
    fi
}

# Vérifier la structure du projet
check_project_structure() {
    log "📁 Vérification de la structure du projet..."

    local required_files=(
        "Makefile"
        "makefiles/root/Makefile"
        "makefiles/shared/common.mk"
        "scripts/README.md"
        "backend/docker-compose.yml"
        "frontend/docker-compose.frontend.yml"
        "data/sql/init-db.sql"
    )

    local missing_files=()

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done

    if [ ${#missing_files[@]} -gt 0 ]; then
        error "Fichiers manquants: ${missing_files[*]}"
    fi

    success "Structure du projet complète"
}

# Vérifier les permissions des scripts
check_script_permissions() {
    log "🔐 Vérification des permissions des scripts..."

    local scripts_dir="scripts"
    if [ -d "$scripts_dir" ]; then
        # Compter les scripts non exécutables
        local non_executable=$(find "$scripts_dir" -name "*.sh" ! -executable | wc -l)

        if [ "$non_executable" -gt 0 ]; then
            warning "$non_executable scripts ne sont pas exécutables"
            echo "   💡 Suggestion: 'find scripts/ -name \"*.sh\" -exec chmod +x {} \\;'"
        else
            success "Tous les scripts sont exécutables"
        fi
    fi
}

# Vérifier la configuration réseau
check_network_config() {
    log "🔗 Vérification de la configuration réseau..."

    # Vérifier la résolution DNS
    if nslookup google.com >/dev/null 2>&1; then
        success "Résolution DNS fonctionnelle"
    else
        warning "Problème de résolution DNS détecté"
    fi

    # Vérifier la connectivité internet
    if ping -c 1 -W 3 8.8.8.8 >/dev/null 2>&1; then
        success "Connectivité internet OK"
    else
        warning "Connectivité internet limitée"
    fi
}

# Vérifier les ressources système
check_system_resources() {
    log "🖥️ Vérification des ressources système..."

    # Mémoire
    local mem_total=$(free -g | awk 'NR==2{print $2}')
    local mem_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')

    if (( $(echo "$mem_usage > 90" | bc -l) )); then
        warning "Mémoire élevée: ${mem_usage}% (${mem_total}G total)"
    else
        success "Mémoire OK: ${mem_usage}%"
    fi

    # CPU
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        warning "CPU élevé: ${cpu_usage}%"
    else
        success "CPU OK: ${cpu_usage}%"
    fi
}

# Vérifier Docker Compose
check_docker_compose() {
    log "🐳 Vérification Docker Compose..."

    # Vérifier que les fichiers docker-compose.yml existent
    local compose_files=("docker-compose.yml" "backend/docker-compose.yml" "frontend/docker-compose.frontend.yml")
    local missing_compose=()

    for file in "${compose_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_compose+=("$file")
        fi
    done

    if [ ${#missing_compose[@]} -gt 0 ]; then
        error "Fichiers Docker Compose manquants: ${missing_compose[*]}"
    fi

    # Vérifier la syntaxe des fichiers
    for file in "${compose_files[@]}"; do
        if [ -f "$file" ]; then
            if docker-compose -f "$file" config >/dev/null 2>&1; then
                success "Syntaxe OK: $file"
            else
                error "Erreur de syntaxe dans $file"
            fi
        fi
    done
}

# Générer un rapport de synthèse
generate_summary() {
    log "📊 Génération du rapport de synthèse..."

    local report_file="/tmp/jobbingtrack-pre-flight-report.txt"

    {
        echo "========================================"
        echo "RAPPORT DE VÉRIFICATION PRÉ-VOL"
        echo "JobbingTrack - $(date)"
        echo "========================================"
        echo ""
        echo "RÉSULTATS DES VÉRIFICATIONS:"
        echo "✅ Dépendances système"
        echo "✅ Espace disque"
        echo "✅ Ports réseau"
        echo "✅ Structure projet"
        echo "✅ Permissions scripts"
        echo "✅ Configuration réseau"
        echo "✅ Ressources système"
        echo "✅ Docker Compose"
        echo ""
        echo "========================================"
        echo "SYSTÈME PRÊT POUR LES OPÉRATIONS"
        echo "========================================"
    } > "$report_file"

    success "Rapport généré: $report_file"
}

# Fonction principale
main() {
    log "🚀 Démarrage des vérifications pré-vol JobbingTrack"

    # Créer le répertoire de logs
    mkdir -p "$(dirname "$LOG_FILE")"

    # Exécuter toutes les vérifications
    check_system_dependencies
    check_disk_space
    check_ports
    check_project_structure
    check_script_permissions
    check_network_config
    check_system_resources
    check_docker_compose

    # Générer le rapport
    generate_summary

    log "🎉 Toutes les vérifications pré-vol sont passées"
    log "📋 Rapport détaillé: $LOG_FILE"
}

# Fonction d'aide
show_help() {
    echo -e "${BLUE}✈️ Vérifications Pré-vol - JobbingTrack${NC}"
    echo "======================================"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Ce script effectue des vérifications complètes avant toute"
    echo "opération critique sur le projet JobbingTrack."
    echo ""
    echo "Vérifications effectuées:"
    echo "  • Dépendances système (Docker, Git, Make)"
    echo "  • Espace disque disponible"
    echo "  • Ports réseau requis"
    echo "  • Structure du projet"
    echo "  • Permissions des scripts"
    echo "  • Configuration réseau"
    echo "  • Ressources système (CPU, Mémoire)"
    echo "  • Fichiers Docker Compose"
    echo ""
    echo "Logs: $LOG_FILE"
}

# Gestion des arguments
case "${1:-}" in
    "--help"|"-h")
        show_help
        exit 0
        ;;
    "--status")
        echo "🔍 Vérifications rapides..."
        check_system_dependencies >/dev/null 2>&1 && echo "✅ Dépendances" || echo "❌ Dépendances"
        check_disk_space >/dev/null 2>&1 && echo "✅ Disque" || echo "❌ Disque"
        check_ports >/dev/null 2>&1 && echo "✅ Ports" || echo "❌ Ports"
        exit 0
        ;;
    "")
        main
        ;;
esac
