#!/bin/bash

# Script pour générer les services manquants basés sur le service d'authentification
# JobbingTrack Microservices

set -e

echo "🔧 Génération des services manquants"
echo "===================================="

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Fonction pour créer un service
create_service() {
    local service_name=$1
    local port=$2
    local description=$3
    
    print_step "Création du service $service_name"
    
    # Créer la structure du service
    mkdir -p "$service_name/src/{controllers,routes,middlewares,services,utils,config}"
    
    # Copier le package.json et l'adapter
    cp auth-service/package.json "$service_name/"
    sed -i "s/jobbingtrack-auth-service/jobbingtrack-$service_name/g" "$service_name/package.json"
    sed -i "s/Service d'authentification/$description/g" "$service_name/package.json"
    
    # Copier le server.js et l'adapter
    cp auth-service/src/server.js "$service_name/src/"
    sed -i "s/auth-service/$service_name/g" "$service_name/src/server.js"
    sed -i "s/3001/$port/g" "$service_name/src/server.js"
    sed -i "s/Service d'authentification/$description/g" "$service_name/src/server.js"
    
    # Copier les middlewares
    cp auth-service/src/middlewares/* "$service_name/src/middlewares/"
    
    # Copier les utils
    cp auth-service/src/utils/* "$service_name/src/utils/"
    
    # Copier le Dockerfile
    cp auth-service/Dockerfile "$service_name/"
    
    # Copier le schéma Prisma
    cp -r prisma "$service_name/"
    
    # Créer un contrôleur de base
    cat > "$service_name/src/controllers/${service_name%-service}.controller.js" << EOF
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// TODO: Implémenter les contrôleurs spécifiques au service
const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: '$description opérationnel',
    service: '$service_name',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getHealth
};
EOF

    # Créer les routes de base
    cat > "$service_name/src/routes/${service_name%-service}.routes.js" << EOF
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/${service_name%-service}.controller');

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
// TODO: Ajouter les routes spécifiques au service

module.exports = router;
EOF

    # Adapter le server.js pour utiliser les bonnes routes
    sed -i "s/authRoutes/${service_name%-service}Routes/g" "$service_name/src/server.js"
    sed -i "s/require('.\/routes\/auth.routes')/require('.\/routes\/${service_name%-service}.routes')/g" "$service_name/src/server.js"
    sed -i "s/\/api\/v1\/auth/\/api\/v1\/${service_name%-service}/g" "$service_name/src/server.js"

    print_message "Service $service_name créé avec succès"
}

# Services à créer
services=(
    "application-service:3002:Gestion des candidatures"
    "company-service:3003:Gestion des entreprises"
    "contact-service:3004:Gestion des contacts"
    "interview-service:3005:Gestion des entretiens"
    "notification-service:3006:Notifications et emails"
    "dashboard-service:3007:Statistiques et tableaux de bord"
)

# Créer chaque service
for service_info in "${services[@]}"; do
    IFS=':' read -r service_name port description <<< "$service_info"
    create_service "$service_name" "$port" "$description"
done

print_step "Génération terminée!"
echo ""
echo "🎉 Tous les services ont été générés avec succès!"
echo ""
echo "📋 Services créés:"
for service_info in "${services[@]}"; do
    IFS=':' read -r service_name port description <<< "$service_info"
    echo "  - $service_name (port $port): $description"
done
echo ""
echo "🔧 Prochaines étapes:"
echo "  1. Implémenter les contrôleurs spécifiques à chaque service"
echo "  2. Adapter les routes selon les besoins"
echo "  3. Tester les services: make up"
echo "  4. Vérifier les logs: make logs"
echo ""
