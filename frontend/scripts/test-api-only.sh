#!/bin/bash

# ============================================================================
# Script de test API uniquement (sans interface mobile)
# ============================================================================
# Ce script teste uniquement les APIs backend sans démarrer l'interface mobile
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔗 Test API uniquement - Fonctionnalités Backend${NC}"
echo "================================================="

# Vérifier que les variables d'environnement sont définies
if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}❌ Variables d'environnement ADMIN_EMAIL et ADMIN_PASSWORD non définies${NC}"
    echo -e "${YELLOW}💡 Définissez ADMIN_EMAIL et ADMIN_PASSWORD dans votre fichier .env${NC}"
    exit 1
fi

# Variables d'environnement pour les tests (désactiver les protections)
export WAF_ENABLED=false
export RATE_LIMIT_ENABLED=false

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    echo -e "${YELLOW}💡 Installez Node.js: https://nodejs.org/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prérequis vérifiés${NC}"

# Fonction de nettoyage
cleanup() {
    echo -e "\n${YELLOW}🧹 Nettoyage en cours...${NC}"

    # Arrêter les services backend si nécessaires
    if [ "$START_BACKEND" = true ]; then
        echo "🛑 Arrêt des services backend..."
        docker-compose down 2>/dev/null || true
    fi

    echo -e "${GREEN}✅ Nettoyage terminé${NC}"
}

# Trap pour le nettoyage automatique
trap cleanup EXIT INT TERM

echo -e "${YELLOW}🚀 Démarrage de l'environnement de test API...${NC}"

# Demander si on veut démarrer les services backend
read -p "Démarrer les services backend (api, postgres, etc.) ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    START_BACKEND=true
    echo -e "${BLUE}🔧 Démarrage des services backend...${NC}"
    docker-compose up -d postgres redis api-gateway auth-service
    echo -e "${GREEN}✅ Services backend démarrés${NC}"
    sleep 10
else
    START_BACKEND=false
    echo -e "${YELLOW}⚠️ Services backend non démarrés - tests limités aux endpoints disponibles${NC}"
fi

# Exécuter les tests API uniquement
echo -e "${BLUE}🎭 Exécution des tests API backend...${NC}"

if npx playwright test api-only-tests.spec.ts --reporter=line; then
    echo -e "${GREEN}✅ Tests API backend réussis !${NC}"
else
    echo -e "${RED}❌ Échec des tests API backend${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Tests API backend terminés avec succès !${NC}"

# Afficher les instructions pour visualiser le rapport
echo ""
echo -e "${BLUE}📊 Rapport de tests :${NC}"
echo "   npx playwright show-report"
echo ""
echo -e "${BLUE}🔄 Pour relancer les tests :${NC}"
echo "   ./scripts/test-api-only.sh"
echo ""
echo -e "${YELLOW}💡 Les tests API couvrent :${NC}"
echo "   - Authentification API"
echo "   - Récupération du profil utilisateur"
echo "   - Accès aux entreprises, candidatures, contacts, entretiens, appels"
echo "   - Récupération des notifications"
echo "   - Dashboard et métriques"
echo "   - Recherche globale"
echo "   - Tests de sécurité (accès sans auth, tokens invalides)"
echo "   - Tests de performance (requêtes parallèles et en série)"
echo "   - Accès restreint aux données admin"

echo ""
echo -e "${GREEN}🎯 Tests API backend réussis !${NC}"
