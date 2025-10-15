#!/bin/bash

# ============================================================================
# Verify Services - Vérification complète du démarrage des services
# ============================================================================
# Ce script vérifie que tous les services démarrent correctement
# ============================================================================

set -e

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

# Afficher l'aide
show_help() {
    echo "🔍 Verify Services - Vérification complète du démarrage des services"
    echo ""
    echo "USAGE:"
    echo "  $0 [options]"
    echo ""
    echo "OPTIONS:"
    echo "  --wait TIME     Temps d'attente maximum en secondes (défaut: 300)"
    echo "  --retry COUNT   Nombre de tentatives (défaut: 10)"
    echo "  --verbose       Mode verbeux"
    echo ""
    echo "COMMANDES:"
    echo "  $0              # Vérification standard"
    echo "  $0 --verbose    # Mode verbeux avec détails"
    echo "  $0 --wait 600   # Attendre jusqu'à 10 minutes"
    echo ""
    echo "COMMANDES MAKE:"
    echo "  make verify-services    # Même fonction via Makefile"
    echo ""
}

# ============================================================================
# VERIFICATIONS
# ============================================================================

# Vérifier les arguments
WAIT_TIME=300
RETRY_COUNT=10
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --wait)
            WAIT_TIME="$2"
            shift 2
            ;;
        --retry)
            RETRY_COUNT="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -*)
            echo "❌ Option inconnue: $1"
            show_help
            exit 1
            ;;
        *)
            break
            ;;
    esac
done

echo "🔍 Vérification du démarrage des services"
echo "========================================="

# ============================================================================
# FONCTIONS DE TEST
# ============================================================================

# Attendre qu'un service soit prêt
wait_for_service() {
    local service_name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    local max_wait="$4"

    if [ "$VERBOSE" = true ]; then
        echo "⏳ Attente du service: $service_name ($url)"
    fi

    local attempt=1
    local start_time=$(date +%s)

    while [ $attempt -le $RETRY_COUNT ]; do
        current_time=$(date +%s)
        elapsed=$((current_time - start_time))

        if [ $elapsed -gt $max_wait ]; then
            echo "❌ Timeout: $service_name n'a pas répondu après $max_wait secondes"
            return 1
        fi

        if curl -s --max-time 10 -o /dev/null -w "%{http_code}" "$url" 2>/dev/null | grep -q "^$expected_code$"; then
            if [ "$VERBOSE" = true ]; then
                echo "✅ $service_name répond correctement (code $expected_code) - Tentative $attempt"
            fi
            return 0
        fi

        if [ "$VERBOSE" = true ]; then
            echo "⏳ $service_name non prêt - Tentative $attempt/$RETRY_COUNT (attente 10s...)"
        fi

        sleep 10
        ((attempt++))
    done

    echo "❌ $service_name n'a pas répondu après $RETRY_COUNT tentatives"
    return 1
}

# Vérifier qu'un conteneur tourne
check_container_running() {
    local container_name="$1"

    if docker ps --filter name="$container_name" --filter status=running --format "{{.Names}}" | grep -q "^${container_name}$"; then
        if [ "$VERBOSE" = true ]; then
            echo "✅ Conteneur $container_name en cours d'exécution"
        fi
        return 0
    else
        echo "❌ Conteneur $container_name arrêté ou inexistant"
        return 1
    fi
}

# ============================================================================
# TESTS PRINCIPAUX
# ============================================================================

echo ""
echo "🏃‍♂️ Démarrage des vérifications..."
echo "----------------------------------"

# 1. Vérifier les services d'infrastructure
echo "🔧 Vérification des services d'infrastructure..."

# PostgreSQL
if check_container_running "jobbingtrack-postgres"; then
    if wait_for_service "PostgreSQL" "http://localhost:5432" "200" 60; then
        echo "✅ PostgreSQL opérationnel"
    else
        echo "⚠️ PostgreSQL démarré mais non accessible"
    fi
else
    echo "❌ PostgreSQL non démarré"
fi

# Redis
if check_container_running "jobbingtrack-redis"; then
    if wait_for_service "Redis" "http://localhost:6379" "200" 30; then
        echo "✅ Redis opérationnel"
    else
        echo "⚠️ Redis démarré mais non accessible"
    fi
else
    echo "❌ Redis non démarré"
fi

# 2. Vérifier les services backend
echo ""
echo "🔧 Vérification des services backend..."

BACKEND_SERVICES=(
    "jobbingtrack-api-gateway:http://localhost:3000/health:200"
    "jobbingtrack-auth-service:http://localhost:3001/health:200"
    "jobbingtrack-application-service:http://localhost:3002/health:200"
    "jobbingtrack-company-service:http://localhost:3003/health:200"
    "jobbingtrack-contact-service:http://localhost:3004/health:200"
    "jobbingtrack-dashboard-service:http://localhost:3005/health:200"
    "jobbingtrack-event-service:http://localhost:3006/health:200"
    "jobbingtrack-followup-service:http://localhost:3007/health:200"
    "jobbingtrack-interview-service:http://localhost:3008/health:200"
    "jobbingtrack-notification-service:http://localhost:3009/health:200"
    "jobbingtrack-profile-service:http://localhost:3010/health:200"
    "jobbingtrack-workflow-service:http://localhost:3011/health:200"
    "jobbingtrack-call-service:http://localhost:3012/health:200"
)

for service_info in "${BACKEND_SERVICES[@]}"; do
    IFS=':' read -r container_name url expected_code <<< "$service_info"

    if check_container_running "$container_name"; then
        if wait_for_service "$container_name" "$url" "$expected_code" 120; then
            echo "✅ $container_name opérationnel"
        else
            echo "⚠️ $container_name démarré mais health check échoue"
        fi
    else
        echo "❌ $container_name non démarré"
    fi
done

# 3. Vérifier les services système
echo ""
echo "🔧 Vérification des services système..."

SYSTEM_SERVICES=(
    "jobbingtrack-docker-stats:http://localhost:8080/api/v1.3/docker/:200"
    "jobbingtrack-system-metrics-service:http://localhost:3013/metrics:200"
)

for service_info in "${SYSTEM_SERVICES[@]}"; do
    IFS=':' read -r container_name url expected_code <<< "$service_info"

    if check_container_running "$container_name"; then
        if wait_for_service "$container_name" "$url" "$expected_code" 60; then
            echo "✅ $container_name opérationnel"
        else
            echo "⚠️ $container_name démarré mais non accessible"
        fi
    else
        echo "❌ $container_name non démarré"
    fi
done

# 4. Vérifier le service de métriques
echo ""
echo "🔧 Vérification du système de métriques..."

if check_container_running "jobbingtrack-cadvisor"; then
    if wait_for_service "cAdvisor" "http://localhost:8080/api/v1.3/docker/" "200" 60; then
        echo "✅ cAdvisor opérationnel"
    else
        echo "⚠️ cAdvisor démarré mais non accessible"
    fi
else
    echo "❌ cAdvisor non démarré"
fi

# 5. Vérifier le frontend
echo ""
echo "🔧 Vérification du frontend..."

if check_container_running "jobbingtrack-frontend"; then
    if wait_for_service "Frontend" "http://localhost:8080" "200" 120; then
        echo "✅ Frontend opérationnel"
    else
        echo "⚠️ Frontend démarré mais non accessible"
    fi
else
    echo "❌ Frontend non démarré"
fi

# ============================================================================
# RAPPORT FINAL
# ============================================================================

echo ""
echo "📊 Rapport de vérification"
echo "=========================="

# Compter les services (simplifié)
echo "📋 Résumé:"
echo "  Tous les services critiques ont été vérifiés"

echo ""
echo "🎉 Vérification terminée !"
echo ""
echo "🌐 Interfaces disponibles:"
echo "  Frontend:           http://localhost:8080"
echo "  API Gateway:        http://localhost:3000"
echo "  Dashboard admin:    http://localhost:8080/backoffice"
echo ""
echo "📊 Services de métriques:"
echo "  Metrics Aggregator: http://localhost:3014"
echo "  cAdvisor:           http://localhost:8080/api/v1.3/docker/"
echo "  Prometheus:         http://localhost:9090"
echo ""
echo "💡 Utilisez 'make logs' pour surveiller les logs en temps réel"
echo "💡 Utilisez 'make status' pour vérifier l'état des services"

echo ""
echo "✅ Vérification terminée"
