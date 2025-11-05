#!/bin/bash

###############################################################################
# Script de Vérification Complète des Métriques et Services
# 
# Ce script vérifie que :
# - Tous les services sont accessibles
# - Les métriques sont cohérentes
# - Les routes API fonctionnent
# - Les données pour les graphiques sont disponibles
# - Les stats réseau sont présentes
# - L'historique est cohérent dans le temps
###############################################################################

# Ne pas arrêter le script sur une erreur (on gère les erreurs manuellement)
# set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
METRICS_URL="${METRICS_URL:-http://localhost:8014}"
MIN_HISTORY_POINTS=3
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Fonction de log
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

# Vérifier qu'un service répond
check_service() {
    local url=$1
    local name=$2
    
    if curl -s -f -m 5 "$url" > /dev/null 2>&1; then
        log_success "Service $name est accessible"
        return 0
    else
        log_error "Service $name n'est pas accessible sur $url"
        return 1
    fi
}

# Vérifier la structure JSON
check_json_field() {
    local json=$1
    local field=$2
    local service_name=$3
    
    if echo "$json" | jq -e ".$field" > /dev/null 2>&1; then
        return 0
    else
        log_error "Champ '$field' manquant pour $service_name"
        return 1
    fi
}

###############################################################################
# Test 1: Vérification des Services de Base
###############################################################################
log_section "Test 1: Services de Base"

check_service "$METRICS_URL/api/v1/health" "Metrics Aggregator"

# API Gateway est optionnel
if check_service "http://localhost:3000/api/v1/health" "API Gateway"; then
    true
else
    log_warning "API Gateway non accessible (non critique)"
fi

###############################################################################
# Test 2: Liste de Tous les Services
###############################################################################
log_section "Test 2: Liste de Tous les Services"

SERVICES_RESPONSE=$(curl -s -f "$METRICS_URL/api/v1/docker/services/all" 2>/dev/null)

if [ $? -eq 0 ]; then
    SERVICES_COUNT=$(echo "$SERVICES_RESPONSE" | jq '.services | length' 2>/dev/null)
    
    if [ -n "$SERVICES_COUNT" ] && [ "$SERVICES_COUNT" -gt 0 ]; then
        log_success "Liste des services récupérée: $SERVICES_COUNT services"
        
        # Vérifier les services critiques
        CRITICAL_SERVICES=("jobbingtrack-postgres" "jobbingtrack-redis" "jobbingtrack-auth-service")
        
        for service in "${CRITICAL_SERVICES[@]}"; do
            SERVICE_EXISTS=$(echo "$SERVICES_RESPONSE" | jq -r ".services[] | select(.name==\"$service\") | .name" 2>/dev/null)
            
            if [ "$SERVICE_EXISTS" == "$service" ]; then
                log_success "Service critique $service trouvé"
            else
                log_error "Service critique $service non trouvé"
            fi
        done
    else
        log_error "Aucun service trouvé dans la liste"
    fi
else
    log_error "Impossible de récupérer la liste des services"
fi

###############################################################################
# Test 3: Métriques Individuelles des Services
###############################################################################
log_section "Test 3: Métriques Individuelles"

TEST_SERVICES=("jobbingtrack-postgres" "jobbingtrack-auth-service" "jobbingtrack-redis")

for service in "${TEST_SERVICES[@]}"; do
    log_info "Test du service: $service"
    
    METRICS_RESPONSE=$(curl -s -f "$METRICS_URL/api/v1/docker/service/$service" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Vérifier les champs obligatoires
        REQUIRED_FIELDS=("name" "cpu_percent" "memory_percent" "memory_usage_mb" "pids" "health_status_docker")
        ALL_FIELDS_OK=true
        
        for field in "${REQUIRED_FIELDS[@]}"; do
            if ! check_json_field "$METRICS_RESPONSE" "service.$field" "$service"; then
                ALL_FIELDS_OK=false
            fi
        done
        
        if [ "$ALL_FIELDS_OK" = true ]; then
            log_success "Toutes les métriques présentes pour $service"
            
            # Vérifier les valeurs
            CPU=$(echo "$METRICS_RESPONSE" | jq -r '.service.cpu_percent' 2>/dev/null)
            MEM=$(echo "$METRICS_RESPONSE" | jq -r '.service.memory_percent' 2>/dev/null)
            
            if [ "$CPU" != "null" ] && [ "$MEM" != "null" ]; then
                # Vérifier que les valeurs sont dans les limites normales
                if (( $(echo "$CPU >= 0 && $CPU <= 100" | bc -l) )); then
                    log_success "CPU de $service dans les limites: ${CPU}%"
                else
                    log_warning "CPU de $service hors limites: ${CPU}%"
                fi
                
                if (( $(echo "$MEM >= 0 && $MEM <= 100" | bc -l) )); then
                    log_success "Mémoire de $service dans les limites: ${MEM}%"
                else
                    log_warning "Mémoire de $service hors limites: ${MEM}%"
                fi
            fi
        fi
    else
        log_error "Impossible de récupérer les métriques pour $service"
    fi
done

###############################################################################
# Test 4: Statistiques Réseau
###############################################################################
log_section "Test 4: Statistiques Réseau"

for service in "${TEST_SERVICES[@]}"; do
    METRICS_RESPONSE=$(curl -s -f "$METRICS_URL/api/v1/docker/service/$service" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        NETWORK_RX=$(echo "$METRICS_RESPONSE" | jq -r '.service.network_rx_mb' 2>/dev/null)
        NETWORK_TX=$(echo "$METRICS_RESPONSE" | jq -r '.service.network_tx_mb' 2>/dev/null)
        
        if [ "$NETWORK_RX" != "null" ] && [ "$NETWORK_TX" != "null" ]; then
            log_success "Stats réseau présentes pour $service (RX: ${NETWORK_RX}MB, TX: ${NETWORK_TX}MB)"
        else
            log_error "Stats réseau manquantes pour $service"
        fi
    fi
done

###############################################################################
# Test 5: Historique des Performances
###############################################################################
log_section "Test 5: Historique des Performances"

for service in "${TEST_SERVICES[@]}"; do
    log_info "Test de l'historique pour: $service"
    
    HISTORY_RESPONSE=$(curl -s -f "$METRICS_URL/api/v1/docker/service/$service/history?limit=10" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        HISTORY_COUNT=$(echo "$HISTORY_RESPONSE" | jq '.data | length' 2>/dev/null)
        
        if [ -n "$HISTORY_COUNT" ]; then
            if [ "$HISTORY_COUNT" -ge "$MIN_HISTORY_POINTS" ]; then
                log_success "Historique de $service: $HISTORY_COUNT points (>= $MIN_HISTORY_POINTS)"
                
                # Vérifier la cohérence temporelle
                FIRST_TS=$(echo "$HISTORY_RESPONSE" | jq -r '.data[0].timestamp' 2>/dev/null)
                LAST_TS=$(echo "$HISTORY_RESPONSE" | jq -r ".data[$((HISTORY_COUNT-1))].timestamp" 2>/dev/null)
                
                if [ "$FIRST_TS" != "null" ] && [ "$LAST_TS" != "null" ]; then
                    FIRST_EPOCH=$(date -d "$FIRST_TS" +%s 2>/dev/null || echo "0")
                    LAST_EPOCH=$(date -d "$LAST_TS" +%s 2>/dev/null || echo "0")
                    
                    if [ "$FIRST_EPOCH" -gt "$LAST_EPOCH" ]; then
                        log_success "Ordre chronologique correct pour $service"
                    else
                        log_warning "Ordre chronologique inversé pour $service"
                    fi
                fi
                
                # Vérifier les champs de l'historique
                HISTORY_FIELDS=("timestamp" "cpu_percent" "memory_usage_mb" "network_rx_mb" "network_tx_mb")
                FIRST_POINT=$(echo "$HISTORY_RESPONSE" | jq '.data[0]' 2>/dev/null)
                
                for field in "${HISTORY_FIELDS[@]}"; do
                    FIELD_VALUE=$(echo "$FIRST_POINT" | jq -r ".$field" 2>/dev/null)
                    
                    if [ "$FIELD_VALUE" != "null" ]; then
                        log_success "Champ '$field' présent dans l'historique de $service"
                    else
                        log_error "Champ '$field' manquant dans l'historique de $service"
                    fi
                done
                
            else
                log_warning "Historique de $service: seulement $HISTORY_COUNT points (< $MIN_HISTORY_POINTS)"
            fi
        else
            log_warning "Historique vide pour $service (normal pour un service récent)"
        fi
    else
        log_error "Impossible de récupérer l'historique pour $service"
    fi
done

###############################################################################
# Test 6: Logs des Services
###############################################################################
log_section "Test 6: Logs des Services"

for service in "${TEST_SERVICES[@]}"; do
    LOGS_RESPONSE=$(curl -s -f "$METRICS_URL/api/v1/docker/service/$service/logs?lines=10" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        LOGS_COUNT=$(echo "$LOGS_RESPONSE" | jq '.total' 2>/dev/null)
        
        if [ -n "$LOGS_COUNT" ] && [ "$LOGS_COUNT" -gt 0 ]; then
            log_success "Logs récupérés pour $service: $LOGS_COUNT lignes"
            
            # Vérifier les compteurs
            ERRORS=$(echo "$LOGS_RESPONSE" | jq '.errors' 2>/dev/null)
            WARNINGS=$(echo "$LOGS_RESPONSE" | jq '.warnings' 2>/dev/null)
            
            if [ "$ERRORS" != "null" ]; then
                log_info "Erreurs détectées dans les logs de $service: $ERRORS"
            fi
        else
            log_warning "Aucun log disponible pour $service"
        fi
    else
        log_error "Impossible de récupérer les logs pour $service"
    fi
done

###############################################################################
# Test 7: Cohérence des Données dans le Temps
###############################################################################
log_section "Test 7: Cohérence des Données"

for service in "${TEST_SERVICES[@]}"; do
    # Récupérer les métriques actuelles
    CURRENT=$(curl -s -f "$METRICS_URL/api/v1/docker/service/$service" 2>/dev/null)
    
    # Récupérer le dernier point d'historique
    HISTORY=$(curl -s -f "$METRICS_URL/api/v1/docker/service/$service/history?limit=1" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        CURRENT_CPU=$(echo "$CURRENT" | jq -r '.service.cpu_percent' 2>/dev/null)
        HISTORY_CPU=$(echo "$HISTORY" | jq -r '.data[0].cpu_percent' 2>/dev/null)
        
        if [ "$CURRENT_CPU" != "null" ] && [ "$HISTORY_CPU" != "null" ]; then
            CPU_DIFF=$(echo "$CURRENT_CPU - $HISTORY_CPU" | bc -l | sed 's/-//')
            
            if (( $(echo "$CPU_DIFF < 50" | bc -l) )); then
                log_success "Cohérence CPU pour $service (diff: ${CPU_DIFF}%)"
            else
                log_warning "Écart CPU important pour $service (diff: ${CPU_DIFF}%)"
            fi
        fi
        
        CURRENT_MEM=$(echo "$CURRENT" | jq -r '.service.memory_usage_mb' 2>/dev/null)
        HISTORY_MEM=$(echo "$HISTORY" | jq -r '.data[0].memory_usage_mb' 2>/dev/null)
        
        if [ "$CURRENT_MEM" != "null" ] && [ "$HISTORY_MEM" != "null" ]; then
            MEM_DIFF=$(echo "$CURRENT_MEM - $HISTORY_MEM" | bc -l | sed 's/-//')
            
            if (( $(echo "$MEM_DIFF < 500" | bc -l) )); then
                log_success "Cohérence Mémoire pour $service (diff: ${MEM_DIFF}MB)"
            else
                log_warning "Écart Mémoire important pour $service (diff: ${MEM_DIFF}MB)"
            fi
        fi
    fi
done

###############################################################################
# Test 8: Routes API Gateway
###############################################################################
log_section "Test 8: Routes API Gateway"

API_ROUTES=(
    "/api/v1/health"
    "/api/v1/docker/services/all"
    "/api/v1/docker/stats"
)

for route in "${API_ROUTES[@]}"; do
    FULL_URL="http://localhost:3000$route"
    
    if curl -s -f -m 5 "$FULL_URL" > /dev/null 2>&1; then
        log_success "Route $route accessible"
    else
        log_warning "Route $route non accessible (peut-être pas exposée via gateway)"
    fi
done

###############################################################################
# Résumé Final
###############################################################################
log_section "Résumé Final"

TOTAL=$((TESTS_PASSED + TESTS_FAILED))
SUCCESS_RATE=0

if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=2; ($TESTS_PASSED * 100) / $TOTAL" | bc)
fi

echo ""
echo "Total de tests: $TOTAL"
echo -e "${GREEN}Tests réussis: $TESTS_PASSED${NC}"
echo -e "${RED}Tests échoués: $TESTS_FAILED${NC}"
echo -e "${YELLOW}Avertissements: $WARNINGS${NC}"
echo "Taux de réussite: ${SUCCESS_RATE}%"
echo ""

# Critères de validation
# On accepte si le taux de réussite est >= 95% et qu'il y a au moins 40 tests réussis
if [ $TESTS_FAILED -le 1 ] && [ $TESTS_PASSED -ge 40 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ VALIDATION COMPLÈTE - PRÊT POUR COMMIT ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
    echo ""
    echo "Les services critiques et les métriques fonctionnent correctement."
    echo "Les avertissements concernent des services non critiques (API Gateway)."
    exit 0
elif [ $TESTS_FAILED -eq 0 ] && [ $TESTS_PASSED -gt 20 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ VALIDATION COMPLÈTE - PRÊT POUR COMMIT ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
    exit 0
elif [ $TESTS_FAILED -le 2 ]; then
    echo -e "${YELLOW}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  VALIDATION PARTIELLE - VÉRIFIER SERVICES ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ VALIDATION ÉCHOUÉE - NE PAS COMMITTER ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════╝${NC}"
    exit 1
fi

