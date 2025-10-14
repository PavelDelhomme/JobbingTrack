#!/bin/bash

# ============================================================================
# Script de Diagnostic Réseau - JobbingTrack
# ============================================================================
# Diagnostic complet de la connectivité réseau et des services

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
LOG_FILE="/tmp/jobbingtrack-network-diagnostic.log"

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
}

# Test de connectivité de base
test_basic_connectivity() {
    log "🔗 Test de connectivité de base..."

    # Test localhost
    if ping -c 1 -W 2 127.0.0.1 >/dev/null 2>&1; then
        success "Interface loopback (127.0.0.1) fonctionnelle"
    else
        error "Interface loopback non fonctionnelle"
    fi

    # Test gateway par défaut
    local gateway=$(ip route | awk '/default/ {print $3}' | head -1)
    if [ -n "$gateway" ]; then
        if ping -c 1 -W 3 "$gateway" >/dev/null 2>&1; then
            success "Gateway ($gateway) accessible"
        else
            warning "Gateway ($gateway) non accessible"
        fi
    else
        warning "Aucune gateway par défaut configurée"
    fi

    # Test DNS Google
    if nslookup google.com >/dev/null 2>&1; then
        success "Résolution DNS fonctionnelle"
    else
        error "Résolution DNS défaillante"
    fi
}

# Test des ports locaux
test_local_ports() {
    log "🌐 Test des ports locaux..."

    local services=(
        "3000:API Gateway"
        "3001:Auth Service"
        "3002:Application Service"
        "3003:Company Service"
        "3004:Contact Service"
        "3005:Interview Service"
        "3006:Notification Service"
        "3007:Dashboard Service"
        "8080:Frontend"
        "5432:PostgreSQL"
        "6379:Redis"
    )

    for service in "${services[@]}"; do
        local port=$(echo "$service" | cut -d: -f1)
        local name=$(echo "$service" | cut -d: -f2)

        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            echo "⚠️ $name (port $port) occupé"
        else
            echo "✅ $name (port $port) libre"
        fi
    done
}

# Test de connectivité externe
test_external_connectivity() {
    log "🌍 Test de connectivité externe..."

    # Test des services externes essentiels
    local external_services=(
        "8.8.8.8:DNS Google"
        "1.1.1.1:Cloudflare DNS"
        "github.com:GitHub"
        "registry.npmjs.org:NPM Registry"
    )

    for service in "${external_services[@]}"; do
        local host=$(echo "$service" | cut -d: -f1)
        local name=$(echo "$service" | cut -d: -f2)

        if ping -c 1 -W 5 "$host" >/dev/null 2>&1; then
            success "$name accessible"
        else
            warning "$name non accessible"
        fi
    done
}

# Test des services Docker
test_docker_services() {
    log "🐳 Test des services Docker..."

    if ! command -v docker >/dev/null 2>&1; then
        warning "Docker non installé"
        return
    fi

    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon non actif"
        return
    fi

    success "Docker opérationnel"

    # Lister les conteneurs actifs
    local containers=$(docker ps -q | wc -l)
    echo "📦 Conteneurs actifs: $containers"

    if [ "$containers" -gt 0 ]; then
        echo "   Services en cours:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | tail -n +2
    fi

    # Vérifier les volumes
    local volumes=$(docker volume ls -q | wc -l)
    echo "💾 Volumes Docker: $volumes"
}

# Test des performances réseau
test_network_performance() {
    log "⚡ Test des performances réseau..."

    # Test de latence vers des services externes
    local targets=("8.8.8.8" "1.1.1.1" "github.com")

    for target in "${targets[@]}"; do
        local latency=$(ping -c 3 -W 5 "$target" 2>/dev/null | tail -1 | awk -F'/' '{print $5}' || echo "N/A")
        if [ "$latency" != "N/A" ]; then
            if (( $(echo "$latency < 50" | bc -l) )); then
                success "Latence vers $target: ${latency}ms (excellent)"
            elif (( $(echo "$latency < 100" | bc -l) )); then
                success "Latence vers $target: ${latency}ms (bon)"
            elif (( $(echo "$latency < 200" | bc -l) )); then
                warning "Latence vers $target: ${latency}ms (moyen)"
            else
                warning "Latence vers $target: ${latency}ms (élevé)"
            fi
        else
            warning "Impossible de mesurer la latence vers $target"
        fi
    done
}

# Diagnostiquer les problèmes réseau
diagnose_network_issues() {
    log "🔍 Diagnostic des problèmes réseau..."

    # Vérifier la configuration réseau
    echo "🔧 Configuration réseau:"
    ip addr show | grep -E "(inet |state)" | head -5 | sed 's/^/  /'

    # Vérifier les routes
    echo "🛣️ Routes réseau:"
    ip route show | head -3 | sed 's/^/  /'

    # Vérifier le firewall
    if command -v ufw >/dev/null 2>&1; then
        echo "🔥 État du firewall:"
        ufw status | sed 's/^/  /'
    elif command -v iptables >/dev/null 2>&1; then
        echo "🔥 Règles iptables actives:"
        iptables -L | head -5 | sed 's/^/  /'
    fi

    # Vérifier les services réseau
    echo "🔌 Services réseau:"
    ss -tuln | grep LISTEN | head -5 | awk '{print "  " $1 " " $5}' || echo "  Aucun service en écoute"
}

# Générer des recommandations
generate_recommendations() {
    log "💡 Génération des recommandations..."

    local recommendations=()

    # Recommandations basées sur les résultats
    if ! nslookup google.com >/dev/null 2>&1; then
        recommendations+=("Résoudre les problèmes DNS")
    fi

    if ! ping -c 1 -W 5 8.8.8.8 >/dev/null 2>&1; then
        recommendations+=("Vérifier la connectivité internet")
    fi

    local containers=$(docker ps -q 2>/dev/null | wc -l)
    if [ "$containers" -eq 0 ]; then
        recommendations+=("Démarrer les services avec 'make up'")
    fi

    if [ ${#recommendations[@]} -gt 0 ]; then
        echo "📋 RECOMMANDATIONS:"
        printf '   💡 %s\n' "${recommendations[@]}"
    else
        success "Aucune recommandation spécifique"
    fi
}

# Afficher un résumé
show_summary() {
    log "📊 Résumé du diagnostic réseau..."

    echo ""
    echo "========================================"
    echo "RÉSUMÉ DU DIAGNOSTIC RÉSEAU"
    echo "========================================"

    # Évaluation globale
    local score=0
    local max_score=5

    # Connectivité de base
    if ping -c 1 -W 2 127.0.0.1 >/dev/null 2>&1; then
        ((score++))
    fi

    # Résolution DNS
    if nslookup google.com >/dev/null 2>&1; then
        ((score++))
    fi

    # Connectivité externe
    if ping -c 1 -W 5 8.8.8.8 >/dev/null 2>&1; then
        ((score++))
    fi

    # Docker
    if docker info >/dev/null 2>&1; then
        ((score++))
    fi

    # Ports locaux
    local occupied_ports=$(netstat -tuln 2>/dev/null | grep -c ":\(3000\|8080\)" || true)
    if [ "$occupied_ports" -eq 0 ]; then
        ((score++))
    fi

    local percentage=$((score * 100 / max_score))

    echo "Score de connectivité: $score/$max_score (${percentage}%)"

    if [ "$percentage" -ge 80 ]; then
        success "Connectivité globale EXCELLENTE"
    elif [ "$percentage" -ge 60 ]; then
        warning "Connectivité globale BONNE"
    else
        error "Connectivité globale PROBLÉMATIQUE"
    fi

    generate_recommendations
}

# Fonction principale
main() {
    log "🚀 Démarrage du diagnostic réseau JobbingTrack"

    # Créer le répertoire de logs
    mkdir -p "$(dirname "$LOG_FILE")"

    # Exécuter les tests
    test_basic_connectivity
    test_local_ports
    test_external_connectivity
    test_docker_services
    test_network_performance
    diagnose_network_issues

    # Afficher le résumé
    show_summary

    log "🎉 Diagnostic réseau terminé"
    log "📋 Rapport détaillé: $LOG_FILE"
}

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🔗 Diagnostic Réseau - JobbingTrack${NC}"
    echo "=================================="
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Ce script effectue un diagnostic complet de la connectivité"
    echo "réseau et des services pour JobbingTrack."
    echo ""
    echo "Tests effectués:"
    echo "  • Connectivité de base (localhost, gateway, DNS)"
    echo "  • Disponibilité des ports locaux"
    echo "  • Connectivité externe (Google, GitHub, etc.)"
    echo "  • État des services Docker"
    echo "  • Performances réseau (latence)"
    echo "  • Configuration réseau et firewall"
    echo ""
    echo "Rapport généré avec score de connectivité."
    echo ""
    echo "Logs: $LOG_FILE"
}

# Gestion des arguments
case "${1:-}" in
    "--help"|"-h")
        show_help
        exit 0
        ;;
    "--quick")
        echo "🔍 Diagnostic rapide..."
        test_basic_connectivity >/dev/null 2>&1 && echo "✅ Connectivité de base" || echo "❌ Connectivité de base"
        test_local_ports >/dev/null 2>&1 && echo "✅ Ports locaux" || echo "❌ Ports locaux"
        test_docker_services >/dev/null 2>&1 && echo "✅ Services Docker" || echo "❌ Services Docker"
        exit 0
        ;;
    "")
        main
        ;;
esac
