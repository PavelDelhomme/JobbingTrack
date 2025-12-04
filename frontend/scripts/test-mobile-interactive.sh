#!/bin/bash

# Script interactif pour tests mobile Playwright - JobbingTrack
# Interface CLI complète pour tester l'application mobile

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5003}"
API_URL="${API_GATEWAY_URL:-http://localhost:5002}"
TEST_DIR="frontend/tests/e2e/mobile"

# Fonction d'affichage
print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  📱 TESTS MOBILE INTERACTIFS - JobbingTrack            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_menu() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📱 MENU PRINCIPAL - Tests Mobile${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} 🧪 Tous les tests mobile (complet)"
    echo -e "${GREEN}2.${NC} 🔐 Tests Authentification (inscription, connexion)"
    echo -e "${GREEN}3.${NC} 📋 Tests Candidatures (création, modification)"
    echo -e "${GREEN}4.${NC} 👥 Tests Contacts (gestion contacts)"
    echo -e "${GREEN}5.${NC} 📞 Tests Appels (création appels)"
    echo -e "${GREEN}6.${NC} 📅 Tests Entretiens (gestion entretiens)"
    echo -e "${GREEN}7.${NC} 🔔 Tests Relances (gestion relances)"
    echo -e "${GREEN}8.${NC} 🔔 Tests Notifications"
    echo -e "${GREEN}9.${NC} 📊 Tests Dashboard mobile"
    echo -e "${GREEN}10.${NC} 🎨 Tests UX/UI mobile (navigation, gestes)"
    echo -e "${GREEN}11.${NC} ⚡ Tests Performance mobile"
    echo -e "${GREEN}12.${NC} 📱 Tests sur différents appareils"
    echo -e "${GREEN}13.${NC} 🎬 Mode UI interactif (Playwright UI)"
    echo -e "${GREEN}14.${NC} 🐛 Mode Debug (step by step)"
    echo -e "${GREEN}15.${NC} 📸 Captures d'écran uniquement"
    echo -e "${GREEN}16.${NC} 📊 Voir le rapport HTML"
    echo -e "${GREEN}0.${NC} ❌ Quitter"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Vérifier que Playwright est installé
check_playwright() {
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}❌ npx n'est pas installé${NC}"
        exit 1
    fi
    
    if [ ! -f "frontend/node_modules/.bin/playwright" ]; then
        echo -e "${YELLOW}⚠️  Playwright n'est pas installé. Installation...${NC}"
        cd frontend && npm install @playwright/test && npx playwright install chromium && cd ..
    fi
}

# Vérifier que les services sont démarrés
check_services() {
    echo -e "${BLUE}🔍 Vérification des services...${NC}"
    
    if ! curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
        echo -e "${RED}❌ Frontend non accessible sur $FRONTEND_URL${NC}"
        echo -e "${YELLOW}💡 Démarrez le frontend avec: cd frontend && npm run dev${NC}"
        exit 1
    fi
    
    if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
        echo -e "${RED}❌ API Gateway non accessible sur $API_URL${NC}"
        echo -e "${YELLOW}💡 Démarrez les services avec: make up${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Services accessibles${NC}"
    echo ""
}

# Exécuter les tests
run_tests() {
    local test_file=$1
    local device=$2
    local mode=$3
    
    echo -e "${CYAN}🚀 Lancement des tests...${NC}"
    echo -e "${BLUE}Fichier: ${test_file}${NC}"
    echo -e "${BLUE}Appareil: ${device:-iPhone 13 Pro}${NC}"
    echo ""
    
    cd frontend
    
    local cmd="npx playwright test ${test_file} --config=playwright.mobile.config.ts"
    
    if [ -n "$device" ]; then
        cmd="$cmd --project=\"$device\""
    fi
    
    case $mode in
        "ui")
            cmd="$cmd --ui"
            ;;
        "debug")
            cmd="$cmd --debug"
            ;;
        "headed")
            cmd="$cmd --headed"
            ;;
    esac
    
    eval $cmd
    
    cd ..
}

# Menu principal
main_menu() {
    while true; do
        clear
        print_header
        print_menu
        
        read -p "$(echo -e ${YELLOW}Votre choix [0-16]: ${NC})" choice
        
        case $choice in
            1)
                echo -e "${GREEN}🧪 Tous les tests mobile...${NC}"
                run_tests "tests/e2e/mobile" "" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            2)
                echo -e "${GREEN}🔐 Tests Authentification...${NC}"
                run_tests "tests/e2e/mobile/mobile-auth.spec.ts" "" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            3)
                echo -e "${GREEN}📋 Tests Candidatures...${NC}"
                run_tests "tests/e2e/mobile/mobile-applications.spec.ts" "" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            4)
                echo -e "${GREEN}👥 Tests Contacts...${NC}"
                run_tests "tests/e2e/mobile/mobile-contacts.spec.ts" "" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            5)
                echo -e "${GREEN}📞 Tests Appels...${NC}"
                run_tests "tests/e2e/mobile/mobile-complete-journey.spec.ts" "-g \"6. 📞\"" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            6)
                echo -e "${GREEN}📅 Tests Entretiens...${NC}"
                run_tests "tests/e2e/mobile/mobile-complete-journey.spec.ts" "-g \"7. 📅\"" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            7)
                echo -e "${GREEN}🔔 Tests Relances...${NC}"
                run_tests "tests/e2e/mobile/mobile-complete-journey.spec.ts" "-g \"8. 🔔\"" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            8)
                echo -e "${GREEN}🔔 Tests Notifications...${NC}"
                run_tests "tests/e2e/mobile/mobile-complete-journey.spec.ts" "-g \"9. 🔔\"" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            9)
                echo -e "${GREEN}📊 Tests Dashboard...${NC}"
                run_tests "tests/e2e/mobile/mobile-complete-journey.spec.ts" "-g \"11. 📊\"" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            10)
                echo -e "${GREEN}🎨 Tests UX/UI...${NC}"
                run_tests "tests/e2e/mobile/mobile-complete-journey.spec.ts" "-g \"12. 🎨|13. 📱\"" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            11)
                echo -e "${GREEN}⚡ Tests Performance...${NC}"
                run_tests "tests/e2e/mobile/mobile-complete-journey.spec.ts" "-g \"Performance\"" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            12)
                echo -e "${YELLOW}📱 Sélectionnez un appareil:${NC}"
                echo "1. iPhone 13 Pro"
                echo "2. iPhone SE"
                echo "3. iPhone 12 Pro Max"
                echo "4. Pixel 5 (Android)"
                echo "5. Galaxy S21 (Android)"
                read -p "Choix [1-5]: " device_choice
                
                case $device_choice in
                    1) device="iPhone 13 Pro" ;;
                    2) device="iPhone SE" ;;
                    3) device="iPhone 12 Pro Max" ;;
                    4) device="Pixel 5" ;;
                    5) device="Galaxy S21" ;;
                    *) device="iPhone 13 Pro" ;;
                esac
                
                run_tests "tests/e2e/mobile" "$device" "normal"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            13)
                echo -e "${GREEN}🎬 Mode UI interactif...${NC}"
                run_tests "tests/e2e/mobile" "" "ui"
                ;;
            14)
                echo -e "${GREEN}🐛 Mode Debug...${NC}"
                run_tests "tests/e2e/mobile" "" "debug"
                ;;
            15)
                echo -e "${GREEN}📸 Captures d'écran...${NC}"
                cd frontend
                npx playwright test tests/e2e/mobile/mobile-complete-journey.spec.ts --config=playwright.mobile.config.ts -g "15. 📸" --screenshot=on
                cd ..
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            16)
                echo -e "${GREEN}📊 Ouverture du rapport HTML...${NC}"
                cd frontend
                npx playwright show-report playwright-report-mobile
                cd ..
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            0)
                echo -e "${GREEN}👋 Au revoir !${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Choix invalide${NC}"
                sleep 1
                ;;
        esac
    done
}

# Point d'entrée
main() {
    check_playwright
    check_services
    main_menu
}

# Exécuter
main "$@"

