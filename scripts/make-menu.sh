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
    echo -e "${GREEN}1.${NC} 🚀 Démarrage & Services (up, down, restart, status, health)"
    echo -e "${GREEN}2.${NC} 🧪 Tests (Backend, Frontend, Mobile, User Journey)"
    echo -e "${GREEN}3.${NC} 🗄️  Base de Données (migrate, push, seed, reset)"
    echo -e "${GREEN}4.${NC} 🔒 Sécurité (audit, tests sécurité)"
    echo -e "${GREEN}5.${NC} 📊 Monitoring & Logs (logs, monitoring-stats)"
    echo -e "${GREEN}6.${NC} 🧹 Nettoyage & Maintenance (clean, clean-docker)"
    echo -e "${GREEN}7.${NC} 📦 Build & Déploiement (build, rebuild)"
    echo -e "${GREEN}8.${NC} 📊 Statut des services (status + actions recommandées)"
    echo -e "${GREEN}9.${NC} 📈 Rapports de tests (voir et exporter)"
    echo -e "${GREEN}10.${NC} 📱 Tests Mobile (menu dédié)"
    echo -e "${GREEN}11.${NC} 🔍 Recherche de commande"
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
    echo -e "${GREEN}6.${NC} Démarrer services essentiels (make up)"
    echo -e "${GREEN}7.${NC} Vérifier diagnostic (make diagnostic)"
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
    echo -e "${GREEN}2.${NC} 🔗 Tests Relations BDD"
    echo -e "${GREEN}3.${NC} 📋 Tests Enums Prisma"
    echo -e "${GREEN}4.${NC} 🚶 Tests User Journey (API)"
    echo -e "${GREEN}5.${NC} 📧 Tests Email"
    echo -e "${GREEN}6.${NC} 🎯 TOUS les tests (complet interactif)"
    echo -e "${GREEN}7.${NC} ⚡ TOUS les tests (rapide sans confirmation)"
    echo -e "${GREEN}8.${NC} 📊 Suite de tests (User Journey + Relations + Enums)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

# Menu Tests Mobile
print_mobile_tests_menu() {
    print_header
    echo -e "${YELLOW}📱 TESTS MOBILE${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} Tous les tests mobile (make test-mobile)"
    echo -e "${GREEN}2.${NC} Tests sur tous les appareils (make test-mobile-all)"
    echo -e "${GREEN}3.${NC} Tests Authentification (make test-mobile-auth)"
    echo -e "${GREEN}4.${NC} Tests Candidatures (make test-mobile-applications)"
    echo -e "${GREEN}5.${NC} Tests Contacts (make test-mobile-contacts)"
    echo -e "${GREEN}6.${NC} Tests Appels (make test-mobile-calls)"
    echo -e "${GREEN}7.${NC} Tests Entretiens (make test-mobile-interviews)"
    echo -e "${GREEN}8.${NC} Tests Relances (make test-mobile-followups)"
    echo -e "${GREEN}9.${NC} Tests Notifications (make test-mobile-notifications)"
    echo -e "${GREEN}10.${NC} Tests différents appareils (make test-mobile-devices)"
    echo -e "${GREEN}11.${NC} Mode UI interactif (make test-mobile-ui)"
    echo -e "${GREEN}12.${NC} Mode Debug (make test-mobile-debug)"
    echo -e "${GREEN}13.${NC} Voir rapport HTML (make test-mobile-report)"
    echo -e "${GREEN}14.${NC} Menu interactif CLI (make test-mobile-interactive)"
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
    echo -e "${GREEN}5.${NC} Vérifier santé services (make health)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

# Menu Sécurité
print_security_menu() {
    print_header
    echo -e "${YELLOW}🔒 SÉCURITÉ${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} Tests email (make test-email-verification)"
    echo -e "${GREEN}2.${NC} Tests relations BDD (make test-relations)"
    echo -e "${GREEN}3.${NC} Tests enums (make test-enums)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

# Menu Monitoring
print_monitoring_menu() {
    print_header
    echo -e "${YELLOW}📊 MONITORING & LOGS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} Voir les logs Docker (docker-compose logs)"
    echo -e "${GREEN}2.${NC} Logs d'un service spécifique"
    echo -e "${GREEN}3.${NC} Monitoring (make monitoring-up)"
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
    echo -e "${GREEN}2.${NC} Nettoyer Docker (docker-compose down -v)"
    echo -e "${GREEN}3.${NC} Nettoyer les volumes Docker"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

# Menu Statut des Services
print_status_menu() {
    print_header
    echo -e "${YELLOW}📊 STATUT DES SERVICES${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Exécuter make status et capturer la sortie
    status_output=$(make status 2>&1)
    echo "$status_output"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}💡 ACTIONS RECOMMANDÉES:${NC}"
    echo ""
    
    # Analyser le statut et proposer des actions
    if echo "$status_output" | grep -q "Aucun service\|DOWN"; then
        echo -e "${RED}⚠️  Certains services ne sont pas démarrés !${NC}"
        echo -e "${GREEN}   → Action: make up${NC}"
        echo ""
    elif echo "$status_output" | grep -q "Base de données.*vide\|incomplète"; then
        echo -e "${YELLOW}⚠️  Base de données incomplète !${NC}"
        echo -e "${GREEN}   → Action: make db-push-all${NC}"
        echo ""
    elif echo "$status_output" | grep -q "services actifs"; then
        active_count=$(echo "$status_output" | grep -oP '\d+/\d+ services actifs' | grep -oP '\d+' | head -1 2>/dev/null || echo "")
        total_count=$(echo "$status_output" | grep -oP '\d+/\d+ services actifs' | grep -oP '\d+' | tail -1 2>/dev/null || echo "")
        
        if [ -n "$active_count" ] && [ -n "$total_count" ] && [ "$active_count" -lt "$total_count" ] 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Certains services ne sont pas démarrés ($active_count/$total_count)${NC}"
            echo -e "${GREEN}   → Action: make up-full${NC}"
            echo ""
        else
            echo -e "${GREEN}✅ Tous les services sont actifs !${NC}"
            echo -e "${CYAN}   → Vous pouvez:${NC}"
            echo -e "${CYAN}      • make health (vérifier la santé)${NC}"
            echo -e "${CYAN}      • make tests-user-journey (tester le système)${NC}"
            echo ""
        fi
    fi
    
    echo -e "${GREEN}1.${NC} Vérifier la santé (make health)"
    echo -e "${GREEN}2.${NC} Voir les logs (docker-compose logs -f)"
    echo -e "${GREEN}3.${NC} Redémarrer les services (make restart)"
    echo -e "${GREEN}4.${NC} Démarrer tous les services (make up-full)"
    echo -e "${GREEN}5.${NC} Synchroniser la base de données (make db-push-all)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

status_menu() {
    while true; do
        print_status_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-5]: ${NC})" choice
        
        case $choice in
            1) execute_command "health" "Vérifier la santé" ;;
            2) 
                echo -e "${CYAN}📋 Logs Docker (Ctrl+C pour quitter)${NC}"
                docker-compose logs -f
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
            3) execute_command "restart" "Redémarrer les services" ;;
            4) execute_command "up-full" "Démarrer tous les services" ;;
            5) execute_command "db-push-all" "Synchroniser la base de données" ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

# Menu Rapports de Tests
print_test_reports_menu() {
    print_header
    echo -e "${YELLOW}📈 RAPPORTS DE TESTS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} 📱 Voir rapport tests mobile (HTML)"
    echo -e "${GREEN}2.${NC} 📊 Voir rapport tests Playwright (HTML)"
    echo -e "${GREEN}3.${NC} 📄 Voir résultats JSON (tests mobile)"
    echo -e "${GREEN}4.${NC} 📄 Voir résultats JSON (tests Playwright)"
    echo -e "${GREEN}5.${NC} 📦 Exporter tous les rapports (ZIP)"
    echo -e "${GREEN}6.${NC} 📋 Lister tous les rapports disponibles"
    echo -e "${GREEN}7.${NC} 🧹 Nettoyer les anciens rapports"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
}

test_reports_menu() {
    while true; do
        print_test_reports_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-7]: ${NC})" choice
        
        case $choice in
            1) 
                echo -e "${CYAN}📱 Ouverture du rapport HTML tests mobile...${NC}"
                cd frontend && npx playwright show-report playwright-report-mobile 2>/dev/null || \
                    echo -e "${YELLOW}⚠️  Aucun rapport mobile trouvé. Lancez d'abord les tests mobile.${NC}"
                cd ..
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
            2) 
                echo -e "${CYAN}📊 Ouverture du rapport HTML tests Playwright...${NC}"
                cd frontend && npx playwright show-report 2>/dev/null || \
                    echo -e "${YELLOW}⚠️  Aucun rapport Playwright trouvé. Lancez d'abord les tests.${NC}"
                cd ..
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
            3) 
                if [ -f "frontend/test-results-mobile.json" ]; then
                    echo -e "${CYAN}📄 Contenu du fichier test-results-mobile.json:${NC}"
                    cat frontend/test-results-mobile.json | head -50
                else
                    echo -e "${YELLOW}⚠️  Fichier test-results-mobile.json non trouvé${NC}"
                fi
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
            4) 
                if [ -f "frontend/test-results.json" ]; then
                    echo -e "${CYAN}📄 Contenu du fichier test-results.json:${NC}"
                    cat frontend/test-results.json | head -50
                else
                    echo -e "${YELLOW}⚠️  Fichier test-results.json non trouvé${NC}"
                fi
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
            5) 
                echo -e "${CYAN}📦 Export des rapports de tests...${NC}"
                export_dir="test-reports-export-$(date +%Y%m%d-%H%M%S)"
                mkdir -p "$export_dir"
                
                echo -e "${YELLOW}📋 Collecte des rapports...${NC}"
                files_copied=0
                
                # Copier les rapports HTML mobile
                if [ -d "frontend/playwright-report-mobile" ]; then
                    cp -r frontend/playwright-report-mobile "$export_dir/" 2>/dev/null && \
                        echo -e "${GREEN}  ✅ Rapport HTML mobile copié${NC}" && files_copied=$((files_copied+1)) || true
                else
                    echo -e "${YELLOW}  ⚠️  Aucun rapport HTML mobile trouvé${NC}"
                fi
                
                # Copier les rapports HTML Playwright
                if [ -d "frontend/playwright-report" ]; then
                    cp -r frontend/playwright-report "$export_dir/" 2>/dev/null && \
                        echo -e "${GREEN}  ✅ Rapport HTML Playwright copié${NC}" && files_copied=$((files_copied+1)) || true
                else
                    echo -e "${YELLOW}  ⚠️  Aucun rapport HTML Playwright trouvé${NC}"
                fi
                
                # Copier les fichiers JSON
                if [ -f "frontend/test-results-mobile.json" ]; then
                    cp frontend/test-results-mobile.json "$export_dir/" 2>/dev/null && \
                        echo -e "${GREEN}  ✅ JSON mobile copié${NC}" && files_copied=$((files_copied+1)) || true
                fi
                if [ -f "frontend/test-results.json" ]; then
                    cp frontend/test-results.json "$export_dir/" 2>/dev/null && \
                        echo -e "${GREEN}  ✅ JSON Playwright copié${NC}" && files_copied=$((files_copied+1)) || true
                fi
                if [ -f "frontend/test-results.xml" ]; then
                    cp frontend/test-results.xml "$export_dir/" 2>/dev/null && \
                        echo -e "${GREEN}  ✅ XML copié${NC}" && files_copied=$((files_copied+1)) || true
                fi
                
                # Créer un fichier README avec les infos
                cat > "$export_dir/README.txt" << EOF
Rapports de Tests - JobbingTrack
Exporté le: $(date)
================================

Contenu:
- playwright-report-mobile/ : Rapports HTML des tests mobile
- playwright-report/ : Rapports HTML des tests Playwright
- test-results-mobile.json : Résultats JSON des tests mobile
- test-results.json : Résultats JSON des tests Playwright
- test-results.xml : Résultats XML (JUnit)

Pour voir les rapports HTML:
- Ouvrir playwright-report-mobile/index.html dans un navigateur
- Ouvrir playwright-report/index.html dans un navigateur

Fichiers copiés: $files_copied
EOF
                echo -e "${GREEN}  ✅ README.txt créé${NC}"
                
                echo ""
                echo -e "${CYAN}📦 Création de l'archive...${NC}"
                
                # Essayer ZIP d'abord, puis TAR.GZ
                archive_created=false
                if command -v zip >/dev/null 2>&1; then
                    cd "$export_dir" && zip -r "../${export_dir}.zip" . >/dev/null 2>&1 && cd ..
                    if [ -f "${export_dir}.zip" ]; then
                        archive_size=$(du -h "${export_dir}.zip" | cut -f1)
                        archive_path="$(pwd)/${export_dir}.zip"
                        echo -e "${GREEN}✅ Archive créée: ${export_dir}.zip${NC}"
                        echo -e "${CYAN}   📏 Taille: ${archive_size}${NC}"
                        echo -e "${CYAN}   📁 Emplacement: ${archive_path}${NC}"
                        archive_created=true
                    fi
                fi
                
                if [ "$archive_created" = false ] && command -v tar >/dev/null 2>&1; then
                    tar -czf "${export_dir}.tar.gz" "$export_dir" 2>/dev/null
                    if [ -f "${export_dir}.tar.gz" ]; then
                        archive_size=$(du -h "${export_dir}.tar.gz" | cut -f1)
                        archive_path="$(pwd)/${export_dir}.tar.gz"
                        echo -e "${GREEN}✅ Archive créée: ${export_dir}.tar.gz${NC}"
                        echo -e "${CYAN}   📏 Taille: ${archive_size}${NC}"
                        echo -e "${CYAN}   📁 Emplacement: ${archive_path}${NC}"
                        archive_created=true
                    fi
                fi
                
                if [ "$archive_created" = false ]; then
                    echo -e "${YELLOW}⚠️  Aucun outil d'archivage trouvé (zip/tar)${NC}"
                    echo -e "${GREEN}✅ Rapports exportés dans: ${export_dir}/${NC}"
                    echo -e "${CYAN}   📁 Emplacement: $(pwd)/${export_dir}${NC}"
                fi
                
                echo ""
                echo -e "${GREEN}✅ Export terminé !${NC}"
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
            6) 
                echo -e "${CYAN}📋 Rapports disponibles:${NC}"
                echo ""
                echo -e "${GREEN}Tests Mobile:${NC}"
                [ -d "frontend/playwright-report-mobile" ] && echo "  ✅ HTML: frontend/playwright-report-mobile/" || echo "  ❌ Aucun rapport HTML mobile"
                [ -f "frontend/test-results-mobile.json" ] && echo "  ✅ JSON: frontend/test-results-mobile.json" || echo "  ❌ Aucun JSON mobile"
                echo ""
                echo -e "${GREEN}Tests Playwright:${NC}"
                [ -d "frontend/playwright-report" ] && echo "  ✅ HTML: frontend/playwright-report/" || echo "  ❌ Aucun rapport HTML"
                [ -f "frontend/test-results.json" ] && echo "  ✅ JSON: frontend/test-results.json" || echo "  ❌ Aucun JSON"
                [ -f "frontend/test-results.xml" ] && echo "  ✅ XML: frontend/test-results.xml" || echo "  ❌ Aucun XML"
                echo ""
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
            7) 
                echo -e "${YELLOW}⚠️  Nettoyage des anciens rapports...${NC}"
                echo -e "${CYAN}Confirmer la suppression ? (o/N): ${NC}"
                read confirm
                if [ "$confirm" = "o" ] || [ "$confirm" = "O" ]; then
                    rm -rf frontend/playwright-report-mobile frontend/playwright-report 2>/dev/null || true
                    rm -f frontend/test-results*.json frontend/test-results*.xml 2>/dev/null || true
                    echo -e "${GREEN}✅ Rapports nettoyés${NC}"
                else
                    echo -e "${YELLOW}❌ Nettoyage annulé${NC}"
                fi
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
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

# Exécuter une commande (ne quitte pas le menu)
execute_command() {
    local cmd=$1
    local description=$2
    local return_to_menu=${3:-true}  # Par défaut, retourne au menu
    
    print_header
    echo -e "${CYAN}🚀 Exécution: ${description}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Commande: make ${cmd}${NC}"
    echo ""
    
    # Exécuter la commande et capturer le code de sortie
    # Ne pas quitter en cas d'erreur, juste afficher le message
    set +e  # Ne pas quitter en cas d'erreur
    output=$(make "$cmd" 2>&1)
    exit_code=$?
    echo "$output"
    set -e  # Réactiver la sortie en cas d'erreur
    
    echo ""
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Commande exécutée avec succès${NC}"
    else
        echo -e "${RED}❌ Commande terminée avec erreur (code: $exit_code)${NC}"
        echo -e "${YELLOW}💡 Vous pouvez consulter les logs ci-dessus${NC}"
        
        # Si c'est une erreur de navigateur Playwright, proposer l'installation
        if echo "$output" | grep -q "Executable doesn't exist\|npx playwright install"; then
            echo ""
            echo -e "${CYAN}💡 Solution: Installez les navigateurs Playwright${NC}"
            echo -e "${CYAN}   → ./scripts/setup-playwright.sh${NC}"
        fi
    fi
    
    echo ""
    if [ "$return_to_menu" = "true" ]; then
        read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour revenir au menu...${NC})"
    else
        read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
    fi
}

# Menu principal
main_menu() {
    while true; do
        print_main_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-11]: ${NC})" choice
        
        case $choice in
            1) startup_menu ;;
            2) tests_menu ;;
            3) database_menu ;;
            4) security_menu ;;
            5) monitoring_menu ;;
            6) cleanup_menu ;;
            7) build_menu ;;
            8) status_menu ;;
            9) test_reports_menu ;;
            10) mobile_tests_menu ;;
            11) search_command ;;
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
            6) execute_command "up" "Démarrer services essentiels" ;;
            7) execute_command "diagnostic" "Diagnostic complet" ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

tests_menu() {
    while true; do
        print_tests_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-8]: ${NC})" choice
        
        case $choice in
            1) mobile_tests_menu ;;
            2) execute_command "test-relations" "Tests Relations BDD" ;;
            3) execute_command "test-enums" "Tests Enums Prisma" ;;
            4) execute_command "tests-user-journey" "Tests User Journey" ;;
            5) execute_command "test-email-verification" "Tests Email" ;;
            6) execute_command "test-all" "TOUS les tests (complet)" ;;
            7) execute_command "test-all" "TOUS les tests avec rapports complets" ;;
            8) 
                echo -e "${YELLOW}📊 Exécution de plusieurs tests...${NC}"
                echo ""
                execute_command "tests-user-journey" "Tests User Journey" || true
                echo ""
                execute_command "test-relations" "Tests Relations" || true
                echo ""
                execute_command "test-enums" "Tests Enums" || true
                echo ""
                echo -e "${GREEN}✅ Tests terminés${NC}"
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

mobile_tests_menu() {
    while true; do
        print_mobile_tests_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-14]: ${NC})" choice
        
        case $choice in
            1) execute_command "test-mobile" "Tous les tests mobile" "true" ;;
            2) execute_command "test-mobile-all" "Tests tous appareils" "true" ;;
            3) execute_command "test-mobile-auth" "Tests Authentification" "true" ;;
            4) execute_command "test-mobile-applications" "Tests Candidatures" "true" ;;
            5) execute_command "test-mobile-contacts" "Tests Contacts" "true" ;;
            6) execute_command "test-mobile-calls" "Tests Appels" "true" ;;
            7) execute_command "test-mobile-interviews" "Tests Entretiens" "true" ;;
            8) execute_command "test-mobile-followups" "Tests Relances" "true" ;;
            9) execute_command "test-mobile-notifications" "Tests Notifications" "true" ;;
            10) execute_command "test-mobile-devices" "Tests différents appareils" "true" ;;
            11) execute_command "test-mobile-ui" "Mode UI interactif" "true" ;;
            12) execute_command "test-mobile-debug" "Mode Debug" "true" ;;
            13) execute_command "test-mobile-report" "Voir rapport HTML" "true" ;;
            14) execute_command "test-mobile-interactive" "Menu interactif CLI" "true" ;;
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
            5) execute_command "health" "Vérifier santé services" ;;
            0) return ;;
            *) echo -e "${RED}❌ Choix invalide${NC}"; sleep 1 ;;
        esac
    done
}

security_menu() {
    while true; do
        print_security_menu
        read -p "$(echo -e ${CYAN}Votre choix [0-3]: ${NC})" choice
        
        case $choice in
            1) execute_command "test-email-verification" "Tests email" ;;
            2) execute_command "test-relations" "Tests relations BDD" ;;
            3) execute_command "test-enums" "Tests enums" ;;
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
            1) 
                echo -e "${CYAN}📋 Logs Docker (Ctrl+C pour quitter)${NC}"
                docker-compose logs -f
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
            2) 
                echo -e "${CYAN}Nom du service (ex: api-gateway, auth-service): ${NC}"
                read service
                if [ -n "$service" ]; then
                    echo -e "${CYAN}📋 Logs du service $service (Ctrl+C pour quitter)${NC}"
                    docker-compose logs -f "$service"
                    read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                fi
                ;;
            3) execute_command "monitoring-up" "Démarrer monitoring" ;;
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
            2) 
                echo -e "${YELLOW}⚠️  Arrêt et suppression des volumes Docker...${NC}"
                docker-compose down -v
                echo -e "${GREEN}✅ Nettoyage Docker terminé${NC}"
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
            3) 
                echo -e "${YELLOW}⚠️  Suppression des volumes Docker inutilisés...${NC}"
                docker volume prune -f
                echo -e "${GREEN}✅ Nettoyage des volumes terminé${NC}"
                read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
                ;;
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
    echo -e "${GREEN}1.${NC} Build tous les services (make build)"
    echo -e "${GREEN}2.${NC} Rebuild sans cache (make rebuild)"
    echo -e "${GREEN}3.${NC} Nettoyer puis build (make clean && make build)"
    echo -e "${GREEN}0.${NC} ← Retour"
    echo ""
    read -p "$(echo -e ${CYAN}Votre choix [0-3]: ${NC})" choice
    
    case $choice in
        1) execute_command "build" "Build tous les services" ;;
        2) execute_command "rebuild" "Rebuild sans cache" ;;
        3) 
            echo -e "${YELLOW}🧹 Nettoyage...${NC}"
            make clean || true
            echo -e "${YELLOW}🔨 Build...${NC}"
            make build
            read -p "$(echo -e ${YELLOW}Appuyez sur Entrée pour continuer...${NC})"
            ;;
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

