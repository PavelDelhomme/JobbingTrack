#!/bin/bash

# ============================================
# Script de Redémarrage Propre du Monitoring
# ============================================

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Redémarrage Monitoring JobbingTrack                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# ÉTAPE 1 : Nettoyage
# ============================================
echo -e "${BLUE}ÉTAPE 1/4 : Nettoyage des conteneurs existants${NC}"
echo ""

echo "🧹 Arrêt des conteneurs conflictuels..."

# Arrêter et supprimer les conteneurs cAdvisor existants
docker stop jobbingtrack-cadvisor 2>/dev/null || echo "  ℹ jobbingtrack-cadvisor déjà arrêté"
docker rm jobbingtrack-cadvisor 2>/dev/null || echo "  ℹ jobbingtrack-cadvisor déjà supprimé"

docker stop cadvisor-monitoring 2>/dev/null || echo "  ℹ cadvisor-monitoring déjà arrêté"
docker rm cadvisor-monitoring 2>/dev/null || echo "  ℹ cadvisor-monitoring déjà supprimé"

echo -e "${GREEN}✓ Nettoyage terminé${NC}"
echo ""

# ============================================
# ÉTAPE 2 : Arrêt de la stack monitoring
# ============================================
echo -e "${BLUE}ÉTAPE 2/4 : Arrêt de la stack monitoring${NC}"
echo ""

cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
docker-compose -f monitoring/docker-compose.monitoring.yml down 2>/dev/null || echo "  ℹ Stack monitoring déjà arrêtée"

echo -e "${GREEN}✓ Stack monitoring arrêtée${NC}"
echo ""

# ============================================
# ÉTAPE 3 : Démarrage de la stack principale
# ============================================
echo -e "${BLUE}ÉTAPE 3/4 : Démarrage de la stack principale${NC}"
echo ""

echo "🚀 Démarrage des services essentiels..."
make up-full

echo -e "${GREEN}✓ Stack principale démarrée${NC}"
echo ""

# Attendre que les services soient prêts
echo "⏳ Attente de l'initialisation des services (10s)..."
sleep 10

# ============================================
# ÉTAPE 4 : Démarrage de la stack monitoring
# ============================================
echo -e "${BLUE}ÉTAPE 4/4 : Démarrage de la stack monitoring${NC}"
echo ""

echo "📊 Démarrage du monitoring..."
make monitoring-up

echo -e "${GREEN}✓ Stack monitoring démarrée${NC}"
echo ""

# Attendre que Prometheus soit prêt
echo "⏳ Attente de l'initialisation de Prometheus (20s)..."
sleep 20

# ============================================
# VÉRIFICATION
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}VÉRIFICATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

echo "📊 Statut des conteneurs :"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(NAME|jobbingtrack|prometheus|grafana|cadvisor|node-exporter|loki)" || echo "Aucun conteneur trouvé"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Monitoring Redémarré avec Succès !                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "🌐 Accès aux services :"
echo "  - Frontend:           http://localhost:8080"
echo "  - API Gateway:        http://localhost:3000"
echo "  - Metrics API:        http://localhost:8014"
echo "  - Prometheus:         http://localhost:9090"
echo "  - Grafana:            http://localhost:3013 (admin/admin123)"
echo "  - cAdvisor:           http://localhost:8082"
echo "  - Node Exporter:      http://localhost:9100/metrics"
echo ""

echo "🧪 Pour tester le système :"
echo "  ./backend/metrics-aggregator-service/test-monitoring.sh"
echo ""
