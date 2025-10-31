#!/bin/bash

# ============================================
# MISE À JOUR DES IMPORTS PRISMA
# ============================================
# Remplace les anciens imports Prisma par le nouveau package partagé

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}🔄 Mise à jour des imports Prisma...${NC}"
echo ""

# Fonction pour mettre à jour un fichier
update_file() {
    local file="$1"
    
    if [ -f "$file" ]; then
        # Sauvegarder l'original
        cp "$file" "$file.bak"
        
        # Remplacer les imports
        sed -i "s|const { PrismaClient } = require('@prisma/client');|const { prisma } = require('@jobbingtrack/database');|g" "$file"
        sed -i "s|const prisma = new PrismaClient();|// Client Prisma fourni par @jobbingtrack/database|g" "$file"
        sed -i "s|import { PrismaClient } from '@prisma/client';|import { prisma } from '@jobbingtrack/database';|g" "$file"
        sed -i "s|const prisma = new PrismaClient(|// const prisma = new PrismaClient(|g" "$file"
        
        echo -e "  ${GREEN}✅ $file${NC}"
    fi
}

# Fonction pour mettre à jour package.json
update_package_json() {
    local service_dir="$1"
    local package_json="$service_dir/package.json"
    
    if [ -f "$package_json" ]; then
        # Vérifier si la dépendance existe déjà
        if ! grep -q '"@jobbingtrack/database"' "$package_json"; then
            # Ajouter la dépendance (nécessite jq)
            if command -v jq >/dev/null 2>&1; then
                jq '.dependencies["@jobbingtrack/database"] = "file:../prisma"' "$package_json" > "$package_json.tmp"
                mv "$package_json.tmp" "$package_json"
                echo -e "  ${GREEN}✅ Dépendance ajoutée à $package_json${NC}"
            else
                echo -e "  ${YELLOW}⚠️  Installez jq pour ajouter automatiquement la dépendance${NC}"
                echo -e "  ${YELLOW}   Ajoutez manuellement: \"@jobbingtrack/database\": \"file:../prisma\"${NC}"
            fi
        fi
    fi
}

# Services à mettre à jour
SERVICES=(
    "backend/auth-service"
    "backend/application-service"
    "backend/company-service"
    "backend/contact-service"
    "backend/interview-service"
    "backend/call-service"
    "backend/event-service"
    "backend/followup-service"
    "backend/profile-service"
    "backend/dashboard-service"
    "backend/notification-service"
    "backend/workflow-service"
    "backend/security-service"
)

for SERVICE in "${SERVICES[@]}"; do
    if [ -d "$SERVICE" ]; then
        echo -e "${YELLOW}📝 Traitement: $SERVICE${NC}"
        
        # Mettre à jour package.json
        update_package_json "$SERVICE"
        
        # Trouver et mettre à jour tous les fichiers JS/TS
        find "$SERVICE/src" -type f \( -name "*.js" -o -name "*.ts" \) 2>/dev/null | while read -r file; do
            if grep -q "PrismaClient" "$file" 2>/dev/null; then
                update_file "$file"
            fi
        done
        
        # Fichiers à la racine
        for file in "$SERVICE/index.js" "$SERVICE/src/index.js" "$SERVICE/app.js" "$SERVICE/src/app.js"; do
            if [ -f "$file" ] && grep -q "PrismaClient" "$file" 2>/dev/null; then
                update_file "$file"
            fi
        done
        
        echo ""
    fi
done

echo -e "${GREEN}✅ Tous les imports Prisma ont été mis à jour${NC}"
echo ""
echo -e "${YELLOW}📝 Note:${NC} Les fichiers originaux ont été sauvegardés avec l'extension .bak"
echo ""
