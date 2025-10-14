#!/bin/bash

# Script de redémarrage complet JobbingTrack
# Reconstruit et redémarre backend + frontend

set -e

echo "🔄 Redémarrage complet de JobbingTrack..."
echo "========================================"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Backend
echo -e "${BLUE}📦 Redémarrage Backend...${NC}"
cd backend

echo -e "${YELLOW}Arrêt des services backend...${NC}"
docker compose down

echo -e "${YELLOW}Reconstruction des images...${NC}"
docker compose build --no-cache \
  application-service \
  company-service \
  contact-service \
  interview-service \
  notification-service \
  call-service \
  event-service \
  followup-service \
  profile-service \
  auth-service

echo -e "${YELLOW}Démarrage des services backend...${NC}"
docker compose up -d

echo -e "${GREEN}✅ Backend redémarré${NC}"

# Attendre que les services soient prêts
echo -e "${YELLOW}⏳ Attente que les services soient prêts (15s)...${NC}"
sleep 15

# Frontend
echo -e "${BLUE}🎨 Redémarrage Frontend...${NC}"
cd ../frontend

echo -e "${YELLOW}Arrêt du frontend...${NC}"
docker compose -f docker-compose.frontend.yml down

echo -e "${YELLOW}Reconstruction de l'image frontend...${NC}"
docker compose -f docker-compose.frontend.yml build --no-cache

echo -e "${YELLOW}Démarrage du frontend...${NC}"
docker compose -f docker-compose.frontend.yml up -d

echo -e "${GREEN}✅ Frontend redémarré${NC}"

# Tests de santé
cd ..
echo ""
echo -e "${BLUE}🏥 Tests de santé...${NC}"

echo -e "Testing API Gateway..."
curl -s http://localhost:3000/health | jq '.' || echo "❌ API Gateway non accessible"

echo -e "\nTesting Frontend..."
curl -s http://localhost:8080 > /dev/null && echo "✅ Frontend accessible" || echo "❌ Frontend non accessible"

echo ""
echo -e "${GREEN}🎉 Redémarrage terminé !${NC}"
echo ""
echo "📋 URLs disponibles :"
echo "  - Frontend : http://localhost:8080"
echo "  - API Gateway : http://localhost:3000"
echo "  - Auth Service : http://localhost:3001"
echo ""
echo "🔐 Compte de test :"
echo "  Email : pavel@jobbingtrack.com"
echo "  Mot de passe : password123"
echo ""

