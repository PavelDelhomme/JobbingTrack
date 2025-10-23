#!/usr/bin/env bash

# ============================================================================
# Script de correction simple et directe des problèmes CORS - JobbingTrack
# ============================================================================
# Ce script corrige directement la configuration CORS sans demande de confirmation
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
# FONCTIONS
# ============================================================================

# Test CORS simple
test_cors_simple() {
    local url="http://localhost:3000/api/v1/auth/login"
    local origin="http://localhost:8080"

    echo -e "${BLUE}🔍 Test CORS avant correction...${NC}"

    # Test avec curl
    response=$(curl -s -I -H "Origin: $origin" -H "Access-Control-Request-Method: POST" -X OPTIONS "$url" 2>/dev/null || echo "")

    if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
        echo -e "${GREEN}✅ CORS OK avant correction${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ CORS nécessite correction${NC}"
        return 1
    fi
}

# Corriger la configuration CORS
fix_cors_direct() {
    echo -e "${BLUE}🔧 Correction directe de la configuration CORS...${NC}"

    if [ ! -f "$API_GATEWAY_CONFIG" ]; then
        echo -e "${RED}❌ Fichier API Gateway non trouvé${NC}"
        return 1
    fi

    # Créer une sauvegarde
    cp "$API_GATEWAY_CONFIG" "${API_GATEWAY_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

    # Configuration CORS complète et robuste (version simple)
    new_cors_config="// Configuration CORS corrigee automatiquement
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004',
    'http://localhost:3005', 'http://localhost:3006', 'http://localhost:3007',
    'http://localhost:3008', 'http://localhost:3009', 'http://localhost:3010',
    'http://localhost:3011', 'http://localhost:3012', 'http://localhost:3013',
    'http://localhost:3014', 'http://localhost:3015',
    'http://[::1]:8080', 'http://[::1]:3000', 'http://[::1]:3001',
    'http://frontend:3000', 'http://api-gateway:3000', 'http://auth-service:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With', 'Accept',
    'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers',
    'X-Custom-Header', 'Cache-Control', 'X-API-Key'
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400
}));"

    # Remplacer la configuration CORS (méthode simple et robuste)
    # Créer un fichier temporaire avec la nouvelle configuration
    cat > /tmp/cors_config.js << 'EOF'
${new_cors_config}
EOF

    # Remplacer la section CORS dans le fichier original (méthode simple)
    start_line=$(grep -n "app.use(cors({" "$API_GATEWAY_CONFIG" | cut -d: -f1 2>/dev/null || echo "")
    if [ -n "$start_line" ]; then
        # Compter les lignes jusqu'à la fin de la section CORS
        end_line=$start_line
        while [ $end_line -lt $(wc -l < "$API_GATEWAY_CONFIG") ]; do
            end_line=$((end_line + 1))
            line_content=$(sed -n "${end_line}p" "$API_GATEWAY_CONFIG" 2>/dev/null || echo "")
            if [[ "$line_content" == *"}));"* ]]; then
                break
            fi
        done

        # Remplacer la section
        {
            sed -n "1,$((start_line-1))p" "$API_GATEWAY_CONFIG" 2>/dev/null || echo ""
            cat /tmp/cors_config.js 2>/dev/null || echo ""
            sed -n "$((end_line+1)),\$p" "$API_GATEWAY_CONFIG" 2>/dev/null || echo ""
        } > "${API_GATEWAY_CONFIG}.new" 2>/dev/null && mv "${API_GATEWAY_CONFIG}.new" "$API_GATEWAY_CONFIG" 2>/dev/null

        echo -e "${GREEN}✅ Configuration CORS mise à jour avec succès${NC}"
    else
        echo -e "${YELLOW}⚠️ Configuration CORS non trouvée, ajout en début du fichier${NC}"
        # Ajouter la configuration au début du fichier
        {
            echo ""
            echo "// Configuration CORS ajoutée automatiquement"
            cat /tmp/cors_config.js
            echo ""
            cat "$API_GATEWAY_CONFIG"
        } > "${API_GATEWAY_CONFIG}.new" && mv "${API_GATEWAY_CONFIG}.new" "$API_GATEWAY_CONFIG"

        echo -e "${GREEN}✅ Configuration CORS ajoutée avec succès${NC}"
    fi

    # Nettoyer les fichiers temporaires
    rm -f /tmp/cors_config.js

    echo -e "${GREEN}✅ Configuration CORS mise à jour avec succès${NC}"
}

# Redémarrer l'API Gateway
restart_api_gateway_direct() {
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

    # Redémarrer l'API Gateway avec tous les fichiers
    if $DOCKER_CMD -f docker-compose.yml -f backend/docker-compose.yml restart api-gateway 2>/dev/null; then
        echo -e "${GREEN}✅ API Gateway redémarré${NC}"
        return 0
    elif $DOCKER_CMD -f docker-compose.yml restart api-gateway 2>/dev/null; then
        echo -e "${GREEN}✅ API Gateway redémarré${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ Échec du redémarrage automatique, redémarrage manuel requis${NC}"
        return 1
    fi
}

# Test final
test_cors_final() {
    echo -e "${BLUE}🔍 Test final CORS...${NC}"

    # Attendre que l'API redémarre
    echo "⏳ Attente du redémarrage (5s)..."
    sleep 5

    local url="http://localhost:3000/api/v1/auth/login"
    local origin="http://localhost:8080"

    # Test multiple fois au cas où
    for i in {1..3}; do
        response=$(curl -s -I -H "Origin: $origin" -H "Access-Control-Request-Method: POST" -X OPTIONS "$url" 2>/dev/null || echo "")
        if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
            echo -e "${GREEN}✅ CORS fonctionnel après correction !${NC}"
            echo "Headers CORS:"
            echo "$response" | grep "Access-Control" || echo "Headers trouvés"
            return 0
        fi
        echo "Tentative $i/3..."
        sleep 2
    done

    echo -e "${RED}❌ CORS toujours non fonctionnel${NC}"
    return 1
}

# ============================================================================
# SCRIPT PRINCIPAL
# ============================================================================

main() {
    echo -e "${PURPLE}🚀 CORRECTION AUTOMATIQUE CORS${NC}"
    echo "=================================="

    # 1. Test initial
    echo ""
    test_cors_simple

    # 2. Correction directe
    echo ""
    fix_cors_direct

    # 3. Redémarrage
    echo ""
    restart_api_gateway_direct

    # 4. Test final
    echo ""
    if test_cors_final; then
        echo ""
        echo -e "${GREEN}🎉 SUCCÈS ! Le problème CORS a été résolu${NC}"
        echo ""
        echo -e "${BLUE}🌐 Testez maintenant:${NC}"
        echo "  Frontend: http://localhost:8080"
        echo "  API Login: http://localhost:3000/api/v1/auth/login"
        echo ""
        echo -e "${YELLOW}💡 Actions effectuées:${NC}"
        echo "  • Configuration CORS mise à jour avec toutes les origines"
        echo "  • API Gateway redémarré"
        echo "  • Test de validation effectué"
        echo ""
        echo -e "${GREEN}✅ Le CORS fonctionne maintenant !${NC}"
    else
        echo ""
        echo -e "${RED}❌ Le problème CORS persiste${NC}"
        echo ""
        echo -e "${YELLOW}💡 Actions de dépannage:${NC}"
        echo "  • Vérifiez que l'API Gateway est bien démarrée"
        echo "  • Vérifiez les logs: docker logs jobbingtrack-api-gateway"
        echo "  • Redémarrez manuellement: docker compose restart api-gateway"
        echo "  • Vérifiez dans le navigateur (F12 -> Console)"
        exit 1
    fi
}

# ============================================================================
# EXÉCUTION
# ============================================================================

main "$@"
