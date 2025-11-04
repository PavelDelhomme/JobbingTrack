#!/bin/bash

# ============================================================================
# Script de test de l'application mobile Flutter avec Playwright
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Test de l'application mobile Flutter avec Playwright${NC}"
echo "========================================================"

# Vérifier que les variables d'environnement sont définies
if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}❌ Variables d'environnement ADMIN_EMAIL et ADMIN_PASSWORD non définies${NC}"
    echo -e "${YELLOW}💡 Définissez ADMIN_EMAIL et ADMIN_PASSWORD dans votre fichier .env${NC}"
    exit 1
fi

# Variables d'environnement pour les tests (désactiver les protections)
export WAF_ENABLED=false
export RATE_LIMIT_ENABLED=false

# Vérifier que Flutter est installé
if ! command -v flutter &> /dev/null; then
    echo -e "${RED}❌ Flutter n'est pas installé${NC}"
    echo -e "${YELLOW}💡 Installez Flutter: https://docs.flutter.dev/get-started/install${NC}"
    exit 1
fi

# Vérifier que Playwright est installé
if ! command -v npx &> /dev/null || ! npx playwright --version &> /dev/null 2>&1; then
    echo -e "${RED}❌ Playwright n'est pas installé${NC}"
    echo -e "${YELLOW}💡 Installez Playwright: npm install -g playwright${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prérequis vérifiés${NC}"

# Démarrer l'application mobile Flutter en arrière-plan
echo -e "${YELLOW}🚀 Démarrage de l'application mobile Flutter...${NC}"
cd ../flutter-mobile-app
flutter run -d web-server --web-port 8090 &
FLUTTER_PID=$!

# Attendre que Flutter démarre
echo -e "${YELLOW}⏳ Attente du démarrage de Flutter...${NC}"
sleep 20

# Revenir au dossier frontend
cd ../frontend

# Exécuter les tests Playwright pour l'application mobile
echo -e "${BLUE}🎭 Exécution des tests Playwright pour l'application mobile...${NC}"

if npx playwright test mobile-app.spec.ts --project="Flutter Mobile App" --reporter=line; then
    echo -e "${GREEN}✅ Tests de l'application mobile réussis !${NC}"
else
    echo -e "${RED}❌ Échec des tests de l'application mobile${NC}"
    kill $FLUTTER_PID 2>/dev/null || true
    exit 1
fi

# Arrêter Flutter proprement
echo -e "${YELLOW}🛑 Arrêt de l'application mobile Flutter...${NC}"
kill $FLUTTER_PID 2>/dev/null || true

echo -e "${GREEN}🎉 Tests de l'application mobile terminés avec succès !${NC}"

# Afficher les instructions pour visualiser le rapport
echo ""
echo -e "${BLUE}📊 Rapport de tests :${NC}"
echo "   npx playwright show-report"
echo ""
echo -e "${BLUE}🔄 Pour relancer les tests :${NC}"
echo "   ./scripts/test-mobile.sh"
echo ""
echo -e "${YELLOW}💡 Les tests couvrent :${NC}"
echo "   - Chargement de l'application mobile Flutter"
echo "   - Connexion utilisateur (user1, user2, user3)"
echo "   - Navigation par onglets (Accueil, Candidatures, Entretiens, Profil)"
echo "   - Interface responsive (iPhone SE, 11, 14, 14 Pro Max)"
echo "   - Synchronisation offline"
echo "   - Gestes tactiles et interactions"
echo "   - Performance de chargement"
echo "   - Intégration API REST"
echo "   - Cohérence des données entre interfaces"
