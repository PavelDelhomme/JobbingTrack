#!/usr/bin/env bash

# ============================================================================
# Script de correction automatique des problèmes CORS - JobbingTrack
# ============================================================================
# Ce script diagnostique et corrige automatiquement les problèmes CORS
# entre le frontend et l'API Gateway.
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
API_GATEWAY_CONFIG="$PROJECT_ROOT/backend/api-gateway/src/server.js"

# ============================================================================
# FONCTIONS DE DIAGNOSTIC
# ============================================================================

# Test d'une requête API pour vérifier CORS
test_cors() {
    local url="$1"
    local origin="$2"

    echo -e "${BLUE}🔍 Test CORS: $url (origin: $origin)${NC}"

    # Test avec curl pour vérifier les headers CORS
    response=$(curl -s -I -H "Origin: $origin" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: X-Requested-With" -X OPTIONS "$url" 2>/dev/null)

    if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
        allowed_origins=$(echo "$response" | grep "Access-Control-Allow-Origin" | head -1)
        echo -e "${GREEN}✅ CORS OK: $allowed_origins${NC}"
        return 0
    else
        echo -e "${RED}❌ CORS BLOQUÉ: Pas de headers CORS dans la réponse${NC}"
        return 1
    fi
}

# Vérifier la configuration CORS actuelle
check_current_cors_config() {
    echo -e "${BLUE}🔍 Vérification de la configuration CORS actuelle...${NC}"

    if [ ! -f "$API_GATEWAY_CONFIG" ]; then
        echo -e "${RED}❌ Fichier API Gateway non trouvé: $API_GATEWAY_CONFIG${NC}"
        return 1
    fi

    # Extraire la configuration CORS du fichier server.js
    cors_config=$(grep -A 20 "app.use(cors({" "$API_GATEWAY_CONFIG" 2>/dev/null || echo "CORS config non trouvée")

    if echo "$cors_config" | grep -q "origin:"; then
        echo -e "${GREEN}✅ Configuration CORS trouvée${NC}"
        echo "Configuration actuelle:"
        echo "$cors_config" | head -15
        return 0
    else
        echo -e "${YELLOW}⚠️ Configuration CORS non trouvée ou incomplète${NC}"
        return 1
    fi
}

# Détecter les ports et origines utilisés
detect_origins() {
    echo -e "${BLUE}🔍 Détection des ports et origines...${NC}"

    # Vérifier si les services sont en cours d'exécution
    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker est disponible${NC}"

        # Récupérer les ports des services
        ports=$(docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Ports}}" 2>/dev/null || echo "")

        if [ -n "$ports" ]; then
            echo "Services en cours d'exécution:"
            echo "$ports"
            echo ""

            # Extraire les ports frontend et API
            frontend_port=$(echo "$ports" | grep "frontend" | grep -o "0.0.0.0:[0-9]*" | cut -d: -f2 || echo "8080")
            api_port=$(echo "$ports" | grep "api-gateway" | grep -o "0.0.0.0:[0-9]*" | cut -d: -f2 || echo "3000")

            echo -e "${BLUE}📋 Ports détectés:${NC}"
            echo "  Frontend: $frontend_port"
            echo "  API Gateway: $api_port"
        else
            echo -e "${YELLOW}⚠️ Aucun service JobbingTrack en cours d'exécution${NC}"
            frontend_port="8080"
            api_port="3000"
        fi
    else
        echo -e "${RED}❌ Docker n'est pas disponible${NC}"
        frontend_port="8080"
        api_port="3000"
    fi

    # Générer la liste des origines à inclure
    origins=(
        "http://localhost:$frontend_port"
        "http://localhost:$api_port"
        "http://127.0.0.1:$frontend_port"
        "http://127.0.0.1:$api_port"
        "http://localhost:8080"
        "http://localhost:3000"
        "http://127.0.0.1:8080"
        "http://127.0.0.1:3000"
    )

    echo -e "${GREEN}✅ Origines détectées:${NC}"
    printf '%s\n' "${origins[@]}"
    echo ""

    return 0
}

# ============================================================================
# FONCTIONS DE CORRECTION
# ============================================================================

# Corriger la configuration CORS
fix_cors_config() {
    local origins=("$@")

    echo -e "${BLUE}🔧 Correction de la configuration CORS...${NC}"

    if [ ! -f "$API_GATEWAY_CONFIG" ]; then
        echo -e "${RED}❌ Fichier API Gateway non trouvé${NC}"
        return 1
    fi

    # Créer une sauvegarde
    cp "$API_GATEWAY_CONFIG" "${API_GATEWAY_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

    # Générer la nouvelle configuration CORS
    local origins_array="["
    for ((i=0; i<${#origins[@]}; i++)); do
        origins_array="${origins_array}'${origins[i]}'"
        if [ $i -lt $((${#origins[@]}-1)) ]; then
            origins_array="${origins_array}, "
        fi
    done
    origins_array="${origins_array}]"

    # Nouvelle configuration CORS complète
    new_cors_config="// ✅ Configuration CORS automatique - générée par cors-fix.sh
app.use(cors({
  origin: ${origins_array},
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  optionsSuccessStatus: 200 // Support pour legacy browsers
}));"

    # Remplacer l'ancienne configuration CORS
    sed -i "/app.use(cors({/,/}));/c\\${new_cors_config}" "$API_GATEWAY_CONFIG"

    echo -e "${GREEN}✅ Configuration CORS mise à jour${NC}"
    echo "Nouvelles origines autorisées:"
    printf '  %s\n' "${origins[@]}"
}

# Redémarrer l'API Gateway
restart_api_gateway() {
    echo -e "${BLUE}🔄 Redémarrage de l'API Gateway...${NC}"

    # Vérifier si Docker Compose est disponible
    if command -v docker-compose &>/dev/null && docker-compose version &>/dev/null 2>&1; then
        DOCKER_CMD="docker-compose"
    elif docker compose version &>/dev/null 2>&1; then
        DOCKER_CMD="docker compose"
    else
        echo -e "${YELLOW}⚠️ Docker Compose non disponible, redémarrage manuel requis${NC}"
        return 1
    fi

    # Redémarrer l'API Gateway
    if $DOCKER_CMD -f docker-compose.yml -f backend/docker-compose.yml restart api-gateway 2>/dev/null; then
        echo -e "${GREEN}✅ API Gateway redémarré${NC}"
        return 0
    elif $DOCKER_CMD -f docker-compose.yml restart api-gateway 2>/dev/null; then
        echo -e "${GREEN}✅ API Gateway redémarré${NC}"
        return 0
    else
        echo -e "${RED}❌ Échec du redémarrage de l'API Gateway${NC}"
        return 1
    fi
}

# ============================================================================
# SCRIPT PRINCIPAL
# ============================================================================

main() {
    echo -e "${PURPLE}🚀 DIAGNOSTIC ET CORRECTION AUTOMATIQUE CORS${NC}"
    echo "================================================"

    # 1. Vérifier la configuration actuelle
    echo ""
    check_current_cors_config

    # 2. Détecter les ports et origines
    echo ""
    detect_origins
    origins_detected=$?

    # 3. Test CORS actuel
    echo ""
    if [ $origins_detected -eq 0 ]; then
        # Test avec les origines détectées
        test_cors "http://localhost:3000/api/v1/auth/login" "http://localhost:8080"
    fi

    # 4. Correction automatique (mode direct)
    echo ""
    echo -e "${BLUE}🔧 Correction automatique de la configuration CORS...${NC}"

    # 5. Corriger la configuration
    echo ""
    origins=(
        "http://localhost:8080"
        "http://localhost:3000"
        "http://127.0.0.1:8080"
        "http://127.0.0.1:3000"
        "http://localhost:3001"
        "http://127.0.0.1:3001"
    )

    fix_cors_config "${origins[@]}"

    # 6. Redémarrer l'API Gateway
    echo ""
    restart_api_gateway

    # 7. Test final
    echo ""
    echo -e "${BLUE}🔍 Test final de la correction CORS...${NC}"

    # Attendre que l'API Gateway redémarre
    echo "⏳ Attente du redémarrage de l'API Gateway..."
    sleep 3

    # Test CORS après correction
    if test_cors "http://localhost:3000/api/v1/auth/login" "http://localhost:8080"; then
        echo ""
        echo -e "${GREEN}🎉 SUCCÈS ! Le problème CORS a été résolu${NC}"
        echo ""
        echo -e "${BLUE}🌐 Testez maintenant:${NC}"
        echo "  Frontend: http://localhost:8080"
        echo "  API: http://localhost:3000/api/v1/auth/login"
        echo ""
        echo -e "${YELLOW}💡 Si le problème persiste, vérifiez:${NC}"
        echo "  • Que l'API Gateway est bien démarrée"
        echo "  • Que le frontend utilise la bonne URL d'API"
        echo "  • Les logs du navigateur (F12 -> Console)"
    else
        echo ""
        echo -e "${RED}❌ Le problème CORS persiste${NC}"
        echo ""
        echo -e "${YELLOW}💡 Actions possibles:${NC}"
        echo "  • Vérifiez les logs de l'API Gateway"
        echo "  • Redémarrez manuellement les services"
        echo "  • Vérifiez la configuration réseau"
        exit 1
    fi
}

# ============================================================================
# EXÉCUTION DU SCRIPT
# ============================================================================

main "$@"
