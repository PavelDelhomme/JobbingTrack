#!/usr/bin/env bash

# ============================================================================
# Script de diagnostic et correction CORS - JobbingTrack
# ============================================================================
# Ce script diagnostique les problèmes CORS et propose des solutions
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
        allowed_methods=$(echo "$response" | grep "Access-Control-Allow-Methods" | head -1 || echo "Non spécifié")
        allowed_credentials=$(echo "$response" | grep "Access-Control-Allow-Credentials" | head -1 || echo "Non spécifié")

        echo -e "${GREEN}✅ CORS OK:${NC}"
        echo "  Origine autorisée: $allowed_origins"
        echo "  Méthodes autorisées: $allowed_methods"
        echo "  Credentials: $allowed_credentials"
        return 0
    else
        echo -e "${RED}❌ CORS BLOQUÉ: Pas de headers CORS dans la réponse${NC}"
        echo "Réponse reçue:"
        echo "$response" | head -10
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

    # Extraire et afficher la configuration CORS du fichier server.js
    cors_config=$(grep -A 30 "app.use(cors({" "$API_GATEWAY_CONFIG" 2>/dev/null || echo "Configuration CORS non trouvée")

    if echo "$cors_config" | grep -q "origin:"; then
        echo -e "${GREEN}✅ Configuration CORS trouvée${NC}"
        echo "Configuration actuelle:"
        echo "$cors_config" | head -25
        echo ""
        return 0
    else
        echo -e "${YELLOW}⚠️ Configuration CORS non trouvée ou incomplète${NC}"
        return 1
    fi
}

# Test des origines courantes
test_common_origins() {
    echo -e "${BLUE}🔍 Test des origines courantes...${NC}"

    local origins=(
        "http://localhost:8080"
        "http://localhost:3000"
        "http://127.0.0.1:8080"
        "http://127.0.0.1:3000"
    )

    local api_url="http://localhost:3000/api/v1/auth/login"
    local cors_working=false

    for origin in "${origins[@]}"; do
        echo -e "${BLUE}📋 Test avec origine: $origin${NC}"

        # Test OPTIONS preflight
        if test_cors "$api_url" "$origin" 2>/dev/null; then
            cors_working=true
            echo -e "${GREEN}✅ Origine $origin acceptée${NC}"
        else
            echo -e "${RED}❌ Origine $origin refusée${NC}"
        fi
        echo ""
    done

    if [ "$cors_working" = true ]; then
        echo -e "${GREEN}🎉 CORS fonctionne correctement !${NC}"
        return 0
    else
        echo -e "${RED}❌ Aucun CORS fonctionnel trouvé${NC}"
        return 1
    fi
}

# ============================================================================
# FONCTIONS DE CORRECTION
# ============================================================================

# Corriger la configuration CORS
fix_cors_config() {
    echo -e "${BLUE}🔧 Correction de la configuration CORS...${NC}"

    if [ ! -f "$API_GATEWAY_CONFIG" ]; then
        echo -e "${RED}❌ Fichier API Gateway non trouvé${NC}"
        return 1
    fi

    # Créer une sauvegarde
    cp "$API_GATEWAY_CONFIG" "${API_GATEWAY_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

    # Nouvelle configuration CORS complète
    new_cors_config="// Configuration CORS corrigee automatiquement - $(date)
app.use(cors({
  origin: [
    // Origines principales
    'http://localhost:8080',  // Frontend principal
    'http://localhost:3000',  // API Gateway
    'http://localhost:3001',  // Auth Service
    // Origines alternatives
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    // Tous les ports de services (au cas ou)
    'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004',
    'http://localhost:3005', 'http://localhost:3006', 'http://localhost:3007',
    'http://localhost:3008', 'http://localhost:3009', 'http://localhost:3010',
    'http://localhost:3011', 'http://localhost:3012', 'http://localhost:3013',
    'http://localhost:3014', 'http://localhost:3015',
    // IPv6 localhost
    'http://[::1]:8080', 'http://[::1]:3000', 'http://[::1]:3001',
    // URLs Docker internes
    'http://frontend:3000', 'http://api-gateway:3000', 'http://auth-service:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With', 'Accept',
    'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'
  ],
  optionsSuccessStatus: 200
}));"

    # Remplacer la configuration CORS avec une méthode simple
    # Trouver la section CORS et la remplacer
    start_line=$(grep -n "app.use(cors({" "$API_GATEWAY_CONFIG" | cut -d: -f1)
    if [ -n "$start_line" ]; then
        # Compter les lignes jusqu'à la fin de la section CORS
        end_line=$start_line
        while [ $end_line -lt $(wc -l < "$API_GATEWAY_CONFIG") ]; do
            end_line=$((end_line + 1))
            line_content=$(sed -n "${end_line}p" "$API_GATEWAY_CONFIG")
            if [[ "$line_content" == *"}));"* ]]; then
                break
            fi
        done

        # Remplacer la section
        {
            sed -n "1,$((start_line-1))p" "$API_GATEWAY_CONFIG"
            echo "$new_cors_config"
            sed -n "$((end_line+1)),\$p" "$API_GATEWAY_CONFIG"
        } > "${API_GATEWAY_CONFIG}.new" && mv "${API_GATEWAY_CONFIG}.new" "$API_GATEWAY_CONFIG"

        echo -e "${GREEN}✅ Configuration CORS mise à jour${NC}"
        return 0
    else
        echo -e "${RED}❌ Configuration CORS non trouvée${NC}"
        return 1
    fi
}

# Redémarrer l'API Gateway
restart_api_gateway() {
    echo -e "${BLUE}🔄 Redémarrage de l'API Gateway...${NC}"

    # Détecter la commande Docker Compose
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
        echo -e "${YELLOW}⚠️ Redémarrage automatique échoué, redémarrage manuel requis${NC}"
        return 1
    fi
}

# ============================================================================
# SCRIPT PRINCIPAL
# ============================================================================

main() {
    echo -e "${PURPLE}🚀 DIAGNOSTIC COMPLET CORS - JobbingTrack${NC}"
    echo "=========================================="

    # 1. Vérifier la configuration actuelle
    echo ""
    check_current_cors_config

    # 2. Test des origines courantes
    echo ""
    if ! test_common_origins; then
        echo ""
        echo -e "${YELLOW}🔧 Le CORS nécessite une correction${NC}"
        echo "Voulez-vous corriger automatiquement ? (o/N): "
        read -r response
        if [[ $response =~ ^[Oo]$ ]]; then
            # 3. Correction
            echo ""
            if fix_cors_config; then
                # 4. Redémarrage
                echo ""
                restart_api_gateway

                # 5. Test final
                echo ""
                echo -e "${BLUE}🔍 Test final après correction...${NC}"
                sleep 3

                if test_common_origins; then
                    echo ""
                    echo -e "${GREEN}🎉 SUCCÈS ! Le problème CORS a été résolu${NC}"
                    echo ""
                    echo -e "${BLUE}🌐 Vous pouvez maintenant accéder à:${NC}"
                    echo "  Frontend: http://localhost:8080"
                    echo "  API: http://localhost:3000/api/v1/auth/login"
                    echo ""
                    echo -e "${YELLOW}💡 Si le problème persiste dans le navigateur:${NC}"
                    echo "  • Actualisez la page (Ctrl+F5)"
                    echo "  • Videz le cache du navigateur"
                    echo "  • Vérifiez les DevTools (F12 -> Console)"
                else
                    echo ""
                    echo -e "${RED}❌ Le problème CORS persiste après correction${NC}"
                    echo "Vérifiez les logs de l'API Gateway"
                fi
            else
                echo -e "${RED}❌ Échec de la correction automatique${NC}"
            fi
        else
            echo -e "${YELLOW}❌ Correction annulée${NC}"
        fi
    else
        echo ""
        echo -e "${GREEN}🎉 CORS fonctionne déjà correctement !${NC}"
        echo ""
        echo -e "${BLUE}🌐 Le système est prêt:${NC}"
        echo "  Frontend: http://localhost:8080"
        echo "  API: http://localhost:3000/api/v1/auth/login"
        echo ""
        echo -e "${YELLOW}💡 Si vous avez encore des problèmes dans le navigateur:${NC}"
        echo "  • Actualisez la page (Ctrl+F5)"
        echo "  • Videz le cache du navigateur"
        echo "  • Vérifiez les DevTools (F12 -> Console)"
    fi
}

# ============================================================================
# EXÉCUTION
# ============================================================================

main "$@"
