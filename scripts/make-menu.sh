#!/bin/bash

# Menu Interactif pour Makefile - JobbingTrack
# Interface CLI complète pour gérer tous les scripts et commandes Makefile

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Fonction d'affichage
print_header() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  🛠️  MENU INTERACTIF MAKEFILE - JobbingTrack                          ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Extraire les commandes Makefile avec leur description
get_make_commands() {
    make -n help 2>/dev/null | grep -E '^[[:space:]]+[a-zA-Z_-]+:.*?##' | \
        sed 's/^[[:space:]]*//' | sed 's/:.*##/|/' | sort
}

# Afficher le menu principal
print_main_menu() {
    print_header
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📋 MENU PRINCIPAL${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} 🚀 Démarrage & Services"
    echo -e "${GREEN}2.${NC} 🧪 Tests (Backend, Frontend, Mobile)"
    echo -e "${GREEN}3.${NC} 🗄️  Base de Données"
    echo -e "${GREEN}4.${NC} 🔒 Sécurité"
    echo -e "${GREEN}5.${NC} 📊 Monitoring & Logs"
    echo -e "${GREEN}6.${NC} 🧹 Nettoyage & Maintenance"
    echo -e "${GREEN}7.${NC} 📦 Build & Déploiement"
    echo -e "${GREEN}8.${NC} 🔍 Recherche de commande"
    echo -e "${GREEN}9.${NC} 📚 Aide complète (make help)"
    echo -e "${GREEN}0.${NC} ❌ Quitter"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Menu Démarrage & Services
print_startup_menu() {
    print_header
    echo -e "${YELLOW}🚀 DÉMARRAGE & SERVICES${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} Démarrer tous les services (make up)"
    echo -e "${GREEN}2.${NC} Arrêter tous les services (make down)"
    echo -e "${GREEN}3.${NC} Redémarrer les services (make restart)"
    echo -e "${GREEN}4.${NC} Vérifier le statut (make status)"
    echo -e "${GREEN}5.${NC} Vérifier la santé des services (make health)"
    echo -e "${GREEN}6.${NC} Démarrer en mode développement (make dev)"
    echo -e "${GREEN}7.${NC} Démarrer pour les tests (make up-for-tests)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

# Menu Tests
print_tests_menu() {
    print_header
    echo -e "${YELLOW}🧪 TESTS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} 📱 Tests Mobile (Playwright)"
    echo -e "${GREEN}2.${NC} 🧪 Tests Backend"
    echo -e "${GREEN}3.${NC} 🎨 Tests Frontend"
    echo -e "${GREEN}4.${NC} 🚶 Tests User Journey"
    echo -e "${GREEN}5.${NC} 🔒 Tests Sécurité"
    echo -e "${GREEN}6.${NC} 📊 Tous les tests"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

# Menu Tests Mobile
print_mobile_tests_menu() {
    print_header
    echo -e "${YELLOW}📱 TESTS MOBILE${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} Installer Playwright (make test-mobile-install)"
    echo -e "${GREEN}2.${NC} Tous les tests mobile (make test-mobile)"
    echo -e "${GREEN}3.${NC} Tests sur tous les appareils (make test-mobile-all)"
    echo -e "${GREEN}4.${NC} Tests Authentification (make test-mobile-auth)"
    echo -e "${GREEN}5.${NC} Tests Candidatures (make test-mobile-applications)"
    echo -e "${GREEN}6.${NC} Tests Contacts (make test-mobile-contacts)"
    echo -e "${GREEN}7.${NC} Tests Appels (make test-mobile-calls)"
    echo -e "${GREEN}8.${NC} Tests Entretiens (make test-mobile-interviews)"
    echo -e "${GREEN}9.${NC} Tests Relances (make test-mobile-followups)"
    echo -e "${GREEN}10.${NC} Tests Notifications (make test-mobile-notifications)"
    echo -e "${GREEN}11.${NC} Tests différents appareils (make test-mobile-devices)"
    echo -e "${GREEN}12.${NC} Mode UI interactif (make test-mobile-ui)"
    echo -e "${GREEN}13.${NC} Mode Debug (make test-mobile-debug)"
    echo -e "${GREEN}14.${NC} Voir rapport HTML (make test-mobile-report)"
    echo -e "${GREEN}15.${NC} Menu interactif CLI (make test-mobile-interactive)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

# Menu Base de Données
print_database_menu() {
    print_header
    echo -e "${YELLOW}🗄️  BASE DE DONNÉES${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} Migrations (make db-migrate)"
    echo -e "${GREEN}2.${NC} Push toutes les bases (make db-push-all)"
    echo -e "${GREEN}3.${NC} Reset base de données (make db-reset)"
    echo -e "${GREEN}4.${NC} Seed données de test (make db-seed)"
    echo -e "${GREEN}5.${NC} Vérifier structure BDD (make db-check)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

# Menu Sécurité
print_security_menu() {
    print_header
    echo -e "${YELLOW}🔒 SÉCURITÉ${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} Tests sécurité (make test-security)"
    echo -e "${GREEN}2.${NC} Audit sécurité (make security-audit)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

# Menu Monitoring
print_monitoring_menu() {
    print_header
    echo -e "${YELLOW}📊 MONITORING & LOGS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} Voir les logs (make logs)"
    echo -e "${GREEN}2.${NC} Logs d'un service (make logs-service)"
    echo -e "${GREEN}3.${NC} Statistiques monitoring (make monitoring-stats)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

# Menu Nettoyage
print_cleanup_menu() {
    print_header
    echo -e "${YELLOW}🧹 NETTOYAGE & MAINTENANCE${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} Nettoyer les builds (make clean)"
    echo -e "${GREEN}2.${NC} Nettoyer Docker (make clean-docker)"
    echo -e "${GREEN}3.${NC} Nettoyer les logs (make clean-logs)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

# Recherche de commande
search_command() {
    print_header
    echo -e "${YELLOW}🔍 RECHERCHE DE COMMANDE${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    read -p "$(echo -e ${CYAN}Rechercher une commande: ${NC})" search_term
    
    if [ -z "$search_term" ]; then
        return
    fi
    
    echo ""
    echo -e "${GREEN}Résultats:${NC}"
    echo ""
    
    # Rechercher dans le Makefile
    grep -i "$search_term" Makefile makefiles/**/*.mk 2>/dev/null | \
        grep -E '^[a-zA-Z_-]+:.*?##' | \
        sed 's/^[[:space:]]*//' | \
        sed 's/:.*##/ - /' | \
        head -20 || echo -e "${RED}Aucun résultat trouvé${NC}"
    
    echo ""
    read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
}

# Exécuter une commande
execute_command() {
    local cmd=$1
    local description=$2
    
    print_header
    echo -e "${CYAN}🚀 Exécution: ${description}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Commande: make ${cmd}${NC}"
    echo ""
    
    make "$cmd"
    
    echo ""
    read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
}

# Menu principal
main_menu() {
    while true; do
        print_main_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-9]: ${NC})" choice
        
        case $choice in
            1) startup_menu ;;
            2) tests_menu ;;
            3) database_menu ;;
            4) security_menu ;;
            5) monitoring_menu ;;
            6) cleanup_menu ;;
            7) build_menu ;;
            8) search_command ;;
            9) execute_command "help" "Aide complète" ;;
            0) echo -e "${GREEN}👋 Au revoir !${NC}"; exit 0 ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

# Sous-menus
startup_menu() {
    while true; do
        print_startup_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-7]: ${NC})" choice
        
        case $choice in
            1) execute_command "up" "Démarrer tous les services" ;;
            2) execute_command "down" "Arrêter tous les services" ;;
            3) execute_command "restart" "Redémarrer les services" ;;
            4) execute_command "status" "Vérifier le statut" ;;
            5) execute_command "health" "Vérifier la santé" ;;
            6) execute_command "dev" "Mode développement" ;;
            7) execute_command "up-for-tests" "Démarrer pour les tests" ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

tests_menu() {
    while true; do
        print_tests_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-6]: ${NC})" choice
        
        case $choice in
            1) mobile_tests_menu ;;
            2) execute_command "test-backend" "Tests Backend" ;;
            3) execute_command "test-frontend" "Tests Frontend" ;;
            4) execute_command "tests-user-journey" "Tests User Journey" ;;
            5) execute_command "test-security" "Tests Sécurité" ;;
            6) execute_command "test-all" "Tous les tests" ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

mobile_tests_menu() {
    while true; do
        print_mobile_tests_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-15]: ${NC})" choice
        
        case $choice in
            1) execute_command "test-mobile-install" "Installer Playwright" ;;
            2) execute_command "test-mobile" "Tous les tests mobile" ;;
            3) execute_command "test-mobile-all" "Tests tous appareils" ;;
            4) execute_command "test-mobile-auth" "Tests Authentification" ;;
            5) execute_command "test-mobile-applications" "Tests Candidatures" ;;
            6) execute_command "test-mobile-contacts" "Tests Contacts" ;;
            7) execute_command "test-mobile-calls" "Tests Appels" ;;
            8) execute_command "test-mobile-interviews" "Tests Entretiens" ;;
            9) execute_command "test-mobile-followups" "Tests Relances" ;;
            10) execute_command "test-mobile-notifications" "Tests Notifications" ;;
            11) execute_command "test-mobile-devices" "Tests différents appareils" ;;
            12) execute_command "test-mobile-ui" "Mode UI interactif" ;;
            13) execute_command "test-mobile-debug" "Mode Debug" ;;
            14) execute_command "test-mobile-report" "Voir rapport HTML" ;;
            15) execute_command "test-mobile-interactive" "Menu interactif CLI" ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

database_menu() {
    while true; do
        print_database_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-5]: ${NC})" choice
        
        case $choice in
            1) execute_command "db-migrate" "Migrations" ;;
            2) execute_command "db-push-all" "Push toutes les bases" ;;
            3) execute_command "db-reset" "Reset base de données" ;;
            4) execute_command "db-seed" "Seed données de test" ;;
            5) execute_command "db-check" "Vérifier structure BDD" ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

security_menu() {
    while true; do
        print_security_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-2]: ${NC})" choice
        
        case $choice in
            1) execute_command "test-security" "Tests sécurité" ;;
            2) execute_command "security-audit" "Audit sécurité" ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

monitoring_menu() {
    while true; do
        print_monitoring_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-3]: ${NC})" choice
        
        case $choice in
            1) execute_command "logs" "Voir les logs" ;;
            2) 
                read -p "$(echo -e ${CYAN}Nom du service: ${NC})" service
                execute_command "logs-service SERVICE=$service" "Logs du service"
                ;;
            3) execute_command "monitoring-stats" "Statistiques monitoring" ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

cleanup_menu() {
    while true; do
        print_cleanup_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-3]: ${NC})" choice
        
        case $choice in
            1) execute_command "clean" "Nettoyer les builds" ;;
            2) execute_command "clean-docker" "Nettoyer Docker" ;;
            3) execute_command "clean-logs" "Nettoyer les logs" ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

build_menu() {
    print_header
    echo -e "${YELLOW}📦 BUILD & DÉPLOIEMENT${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} Build frontend (make build-frontend)"
    echo -e "${GREEN}2.${NC} Build backend (make build-backend)"
    echo -e "${GREEN}3.${NC} Build tout (make build)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
    read -p "$(echo -e ${CYAN}Votre choix [0-3]: ${NC})" choice
    
    case $choice in
        1) execute_command "build-frontend" "Build frontend" ;;
        2) execute_command "build-backend" "Build backend" ;;
        3) execute_command "build" "Build tout" ;;
        0) return ;;
        *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
    esac
}

# Point d'entrée
main() {
    if [ ! -f "Makefile" ]; then
        echo -e "${RED}❌ Makefile non trouvé dans le répertoire courant${NC}"
        exit 1
    fi
    
    main_menu
}

# Exécuter
main "$@"

