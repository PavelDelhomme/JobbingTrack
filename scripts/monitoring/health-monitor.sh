#!/bin/bash

# ============================================================================
# Script de Surveillance de Santé - JobbingTrack
# ============================================================================
# Surveille en continu la santé des services et alerte en cas de problème

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
INTERVAL=${1:-60}  # Intervalle de vérification en secondes
LOG_FILE="/tmp/jobbingtrack-health-monitor.log"
ALERT_FILE="/tmp/jobbingtrack-alerts.log"

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Fonction d'alerte
alert() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚨 $1" | tee -a "$ALERT_FILE"
    # Ici on pourrait ajouter l'envoi d'email, Slack, etc.
}

# Fonction pour vérifier un service
check_service() {
    local service=$1
    local url=$2
    local expected_code=${3:-200}

    if curl -f -s --max-time 10 "$url" >/dev/null 2>&1; then
        echo "✅ $service OK"
        return 0
    else
        echo "❌ $service DOWN"
        return 1
    fi
}

# Fonction pour vérifier Docker
check_docker() {
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker daemon actif"
        return 0
    else
        echo "❌ Docker daemon inactif"
        return 1
    fi
}

# Fonction pour vérifier l'espace disque
check_disk_space() {
    local usage=$(df . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -gt 90 ]; then
        echo "❌ Espace disque critique: ${usage}%"
        return 1
    elif [ "$usage" -gt 80 ]; then
        echo "⚠️ Espace disque faible: ${usage}%"
        return 1
    else
        echo "✅ Espace disque OK: ${usage}%"
        return 0
    fi
}

# Fonction pour vérifier la mémoire
check_memory() {
    local mem_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2 }')
    if (( $(echo "$mem_usage > 90" | bc -l) )); then
        echo "❌ Mémoire critique: ${mem_usage}%"
        return 1
    elif (( $(echo "$mem_usage > 80" | bc -l) )); then
        echo "⚠️ Mémoire élevée: ${mem_usage}%"
        return 1
    else
        echo "✅ Mémoire OK: ${mem_usage}%"
        return 0
    fi
}

# Fonction principale de surveillance
monitor() {
    log "🚀 Démarrage de la surveillance JobbingTrack"
    log "Intervalle: $INTERVAL secondes"

    local consecutive_failures=0
    local max_failures=3

    while true; do
        local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        local all_ok=true

        echo ""
        echo "🔍 [$timestamp] Vérification de santé..."

        # Vérifier Docker
        if ! check_docker; then
            all_ok=false
        fi

        # Vérifier l'espace disque
        if ! check_disk_space; then
            all_ok=false
        fi

        # Vérifier la mémoire
        if ! check_memory; then
            all_ok=false
        fi

        # Vérifier les services principaux
        echo "🌐 Vérification des services:"

        # API Gateway
        if ! check_service "API Gateway" "http://localhost:3000/health"; then
            all_ok=false
        fi

        # Frontend
        if ! check_service "Frontend" "http://localhost:8080" 200; then
            all_ok=false
        fi

        # Base de données
        if pg_isready -h localhost -p 5432 -U jobbingtrack >/dev/null 2>&1; then
            echo "✅ PostgreSQL OK"
        else
            echo "❌ PostgreSQL DOWN"
            all_ok=false
        fi

        # Redis
        if redis-cli ping >/dev/null 2>&1; then
            echo "✅ Redis OK"
        else
            echo "❌ Redis DOWN"
            all_ok=false
        fi

        # Évaluation globale
        if $all_ok; then
            consecutive_failures=0
            echo "🎉 Tous les systèmes opérationnels"
        else
            ((consecutive_failures++))
            echo "⚠️ Problèmes détectés ($consecutive_failures/$max_failures)"

            if [ $consecutive_failures -ge $max_failures ]; then
                alert "🚨 ALERTES CRITIQUES: $consecutive_failures échecs consécutifs"
                alert "Actions recommandées:"
                alert "  • Vérifier les logs: docker-compose logs"
                alert "  • Redémarrer les services: make restart"
                alert "  • Vérifier les ressources: make check-disk"
            fi
        fi

        sleep $INTERVAL
    done
}

# Fonction d'aide
show_help() {
    echo -e "${BLUE}📊 Surveillance de Santé - JobbingTrack${NC}"
    echo "======================================"
    echo ""
    echo "Usage: $0 [INTERVAL_SECONDS]"
    echo ""
    echo "Options:"
    echo "  INTERVAL_SECONDS    Intervalle de vérification (défaut: 60s)"
    echo ""
    echo "Exemples:"
    echo "  $0                  # Surveillance avec intervalle 60s"
    echo "  $0 30               # Surveillance avec intervalle 30s"
    echo "  $0 300              # Surveillance avec intervalle 5min"
    echo ""
    echo "Commandes spéciales:"
    echo "  $0 --help           # Afficher cette aide"
    echo "  $0 --status         # État actuel rapide"
    echo ""
    echo "Logs:"
    echo "  Surveillance: $LOG_FILE"
    echo "  Alertes: $ALERT_FILE"
}

# Gestion des arguments
case "${1:-}" in
    "--help"|"-h")
        show_help
        exit 0
        ;;
    "--status")
        echo "🔍 Vérification rapide de santé..."
        check_docker
        check_disk_space
        check_memory
        check_service "API Gateway" "http://localhost:3000/health"
        check_service "Frontend" "http://localhost:8080"
        exit 0
        ;;
    "")
        # Démarrer la surveillance
        monitor
        ;;
    *)
        # Vérifier si c'est un nombre
        if [[ "$1" =~ ^[0-9]+$ ]] && [ "$1" -gt 0 ]; then
            monitor
        else
            echo "❌ Intervalle invalide: $1"
            echo "Utilisez un nombre de secondes positif"
            exit 1
        fi
        ;;
esac
