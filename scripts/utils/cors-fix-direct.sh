#!/usr/bin/env bash

# ============================================================================
# Script de correction directe CORS - JobbingTrack
# ============================================================================
# Ce script corrige directement la configuration CORS sans interaction
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
# SCRIPT PRINCIPAL
# ============================================================================

main() {
    echo -e "${PURPLE}🚀 CORRECTION DIRECTE CORS${NC}"
    echo "=========================="

    if [ ! -f "$API_GATEWAY_CONFIG" ]; then
        echo -e "${RED}❌ Fichier API Gateway non trouvé: $API_GATEWAY_CONFIG${NC}"
        exit 1
    fi

    # Créer une sauvegarde
    cp "$API_GATEWAY_CONFIG" "${API_GATEWAY_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

    # Configuration CORS complète
    new_cors_config="// Configuration CORS corrigee automatiquement - $(date)
app.use(cors({
  origin: [
    'http://localhost:8080', 'http://localhost:3000', 'http://localhost:3001',
    'http://127.0.0.1:8080', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001',
    'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004',
    'http://localhost:3005', 'http://localhost:3006', 'http://localhost:3007',
    'http://localhost:3008', 'http://localhost:3009', 'http://localhost:3010',
    'http://localhost:3011', 'http://localhost:3012', 'http://localhost:3013',
    'http://localhost:3014', 'http://localhost:3015',
    'http://[::1]:8080', 'http://[::1]:3000', 'http://[::1]:3001',
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

    # Remplacer la configuration CORS
    echo -e "${BLUE}🔧 Mise à jour de la configuration CORS...${NC}"

    # Utiliser une méthode simple avec sed
    if sed -i "/app\.use(cors({/,/^}));/c\\
$new_cors_config" "$API_GATEWAY_CONFIG" 2>/dev/null; then
        echo -e "${GREEN}✅ Configuration CORS mise à jour${NC}"
    else
        echo -e "${YELLOW}⚠️ Méthode sed échouée, tentative alternative...${NC}"

        # Créer un fichier temporaire
        echo "$new_cors_config" > /tmp/cors_new.js

        # Remplacer avec awk
        awk '
        BEGIN { in_cors = 0; printed = 0 }
        /app\.use\(cors\({/ && !printed {
            print "// Configuration CORS corrigee automatiquement - " strftime("%Y-%m-%d %H:%M:%S")
            while (getline line < "/tmp/cors_new.js") {
                print line
            }
            in_cors = 1
            printed = 1
            next
        }
        /}));/ && in_cors && !printed {
            in_cors = 0
            printed = 1
            next
        }
        !in_cors || printed { print }
        ' "$API_GATEWAY_CONFIG" > /tmp/server_new.js 2>/dev/null

        if [ -f "/tmp/server_new.js" ] && mv /tmp/server_new.js "$API_GATEWAY_CONFIG" 2>/dev/null; then
            echo -e "${GREEN}✅ Configuration CORS mise à jour (méthode alternative)${NC}"
        else
            echo -e "${RED}❌ Échec de la correction automatique${NC}"
            echo "Veuillez corriger manuellement $API_GATEWAY_CONFIG"
            rm -f /tmp/cors_new.js
            exit 1
        fi
    fi

    # Nettoyer
    rm -f /tmp/cors_new.js

    # Redémarrer l'API Gateway
    echo -e "${BLUE}🔄 Redémarrage de l'API Gateway...${NC}"

    if command -v docker-compose &>/dev/null && docker-compose version &>/dev/null 2>&1; then
        DOCKER_CMD="docker-compose"
    elif docker compose version &>/dev/null 2>&1; then
        DOCKER_CMD="docker compose"
    else
        echo -e "${YELLOW}⚠️ Docker Compose non disponible${NC}"
        echo -e "${YELLOW}💡 Redémarrez manuellement l'API Gateway${NC}"
        echo -e "${GREEN}✅ Configuration CORS mise à jour${NC}"
        exit 0
    fi

    if $DOCKER_CMD -f docker-compose.yml -f backend/docker-compose.yml restart api-gateway 2>/dev/null; then
        echo -e "${GREEN}✅ API Gateway redémarré${NC}"
    elif $DOCKER_CMD -f docker-compose.yml restart api-gateway 2>/dev/null; then
        echo -e "${GREEN}✅ API Gateway redémarré${NC}"
    else
        echo -e "${YELLOW}⚠️ Redémarrage automatique échoué${NC}"
        echo -e "${YELLOW}💡 Redémarrez manuellement: $DOCKER_CMD restart api-gateway${NC}"
    fi

    # Test final
    echo -e "${BLUE}🔍 Test final CORS...${NC}"
    sleep 3

    if curl -s -I -H "Origin: http://localhost:8080" -H "Access-Control-Request-Method: POST" -X OPTIONS "http://localhost:3000/api/v1/auth/login" 2>/dev/null | grep -q "Access-Control-Allow-Origin"; then
        echo -e "${GREEN}🎉 SUCCÈS ! CORS fonctionne maintenant${NC}"
        echo ""
        echo -e "${BLUE}🌐 URLs disponibles:${NC}"
        echo "  Frontend: http://localhost:8080"
        echo "  API: http://localhost:3000/api/v1/auth/login"
        echo ""
        echo -e "${GREEN}✅ Problème CORS résolu !${NC}"
    else
        echo -e "${YELLOW}⚠️ Test CORS échoué${NC}"
        echo "Vérifiez que l'API Gateway est bien démarrée"
        echo "Logs: docker logs jobbingtrack-api-gateway"
    fi
}

# ============================================================================
# EXÉCUTION
# ============================================================================

main "$@"
