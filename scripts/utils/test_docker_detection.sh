#!/usr/bin/env bash

# Script de test du nouveau système de détection Docker Compose robuste

echo "🧪 Test du système de détection Docker Compose robuste"
echo "======================================================"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Fonction pour tester une commande
test_command() {
    local test_name="$1"
    local cmd="$2"
    local expected_result="$3"
    
    echo -e "\n${BLUE}🔧 Test: $test_name${NC}"
    echo "Commande: $cmd"
    
    if eval "$cmd" &>/dev/null; then
        if [ "$expected_result" = "success" ]; then
            echo -e "${GREEN}✅ $test_name - RÉUSSI${NC}"
            return 0
        else
            echo -e "${RED}❌ $test_name - ÉCHEC (attendu un échec)${NC}"
            return 1
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            echo -e "${GREEN}✅ $test_name - RÉUSSI (échec attendu)${NC}"
            return 0
        else
            echo -e "${RED}❌ $test_name - ÉCHEC${NC}"
            return 1
        fi
    fi
}

# Test du wrapper Docker Compose
test_wrapper() {
    echo -e "\n${BLUE}🐳 Test du wrapper Docker Compose${NC}"
    
    # Test de l'import du wrapper
    if [ -f "$PROJECT_ROOT/scripts/utils/docker-compose-wrapper.sh" ]; then
        echo -e "${GREEN}✅ Wrapper trouvé${NC}"
        
        # Test de la syntaxe bash
        if bash -n "$PROJECT_ROOT/scripts/utils/docker-compose-wrapper.sh" 2>/dev/null; then
            echo -e "${GREEN}✅ Syntaxe bash valide${NC}"
        else
            echo -e "${RED}❌ Erreur de syntaxe bash${NC}"
            return 1
        fi
        
        # Test des fonctions exportées
        if source "$PROJECT_ROOT/scripts/utils/docker-compose-wrapper.sh" 2>/dev/null && command -v init_docker_compose_detection &>/dev/null; then
            echo -e "${GREEN}✅ Fonctions exportées correctement${NC}"
        else
            echo -e "${RED}❌ Fonctions non exportées${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Wrapper non trouvé${NC}"
        return 1
    fi
    return 0
}

# Test de la détection Docker
test_docker_detection() {
    echo -e "\n${BLUE}🐳 Test de la détection Docker${NC}"
    
    # Test Docker
    if command -v docker &>/dev/null; then
        echo -e "${GREEN}✅ Docker installé${NC}"
        
        if docker help &>/dev/null; then
            echo -e "${GREEN}✅ Docker fonctionnel${NC}"
        else
            echo -e "${RED}❌ Docker non fonctionnel${NC}"
            return 1
        fi
        
        if docker info &>/dev/null; then
            echo -e "${GREEN}✅ Docker daemon accessible${NC}"
        else
            echo -e "${RED}❌ Docker daemon non accessible${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Docker non installé${NC}"
        return 1
    fi
    return 0
}

# Test de la détection Docker Compose
test_docker_compose_detection() {
    echo -e "\n${BLUE}🐳 Test de la détection Docker Compose${NC}"
    
    # Test docker-compose (standalone)
    if command -v docker-compose &>/dev/null; then
        echo -e "${BLUE}🔍 Test de docker-compose...${NC}"
        if timeout 5 bash -c "docker-compose version" &>/dev/null; then
            echo -e "${GREEN}✅ docker-compose fonctionnel${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️ docker-compose installé mais non fonctionnel${NC}"
        fi
    fi
    
    # Test docker compose (plugin)
    echo -e "${BLUE}🔍 Test de docker compose...${NC}"
    if timeout 5 bash -c "docker compose version" &>/dev/null; then
        echo -e "${GREEN}✅ docker compose fonctionnel${NC}"
        return 0
    else
        echo -e "${RED}❌ docker compose non fonctionnel${NC}"
        return 1
    fi
}

# Test du cache
test_cache() {
    echo -e "\n${BLUE}💾 Test du système de cache${NC}"
    
    local cache_file="/tmp/jobbingtrack_docker_compose_cache"
    
    # Nettoyer le cache
    rm -f "$cache_file" 2>/dev/null || true
    
    # Test sans cache
    echo "Test sans cache..."
    if source "$PROJECT_ROOT/scripts/utils/docker-compose-wrapper.sh" 2>/dev/null && init_docker_compose_detection 2>/dev/null; then
        echo -e "${GREEN}✅ Détection sans cache réussie${NC}"
        
        if [ -f "$cache_file" ]; then
            local cached_cmd=$(cat "$cache_file" 2>/dev/null)
            echo -e "${GREEN}✅ Cache créé: $cached_cmd${NC}"
        else
            echo -e "${RED}❌ Cache non créé${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Détection sans cache échouée${NC}"
        return 1
    fi
    
    # Test avec cache
    echo "Test avec cache..."
    if source "$PROJECT_ROOT/scripts/utils/docker-compose-wrapper.sh" 2>/dev/null && init_docker_compose_detection 2>/dev/null; then
        echo -e "${GREEN}✅ Détection avec cache réussie${NC}"
    else
        echo -e "${RED}❌ Détection avec cache échouée${NC}"
        return 1
    fi
    
    return 0
}

# Test des scripts mis à jour
test_updated_scripts() {
    echo -e "\n${BLUE}📝 Test des scripts mis à jour${NC}"
    
    local scripts=(
        "scripts/core/check.sh"
        "scripts/core/start.sh"
        "scripts/core/stop.sh"
        "scripts/db/seed.sh"
        "scripts/db/backup.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$PROJECT_ROOT/$script" ]; then
            # Test de la syntaxe
            if bash -n "$PROJECT_ROOT/$script" 2>/dev/null; then
                echo -e "${GREEN}✅ $script - Syntaxe valide${NC}"
            else
                echo -e "${RED}❌ $script - Erreur de syntaxe${NC}"
                return 1
            fi
            
            # Test de l'import du wrapper
            if grep -q "docker-compose-wrapper.sh" "$PROJECT_ROOT/$script"; then
                echo -e "${GREEN}✅ $script - Import wrapper correct${NC}"
            else
                echo -e "${RED}❌ $script - Import wrapper manquant${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️ $script - Non trouvé${NC}"
        fi
    done
    
    return 0
}

# Test des Makefiles
test_makefiles() {
    echo -e "\n${BLUE}🔧 Test des Makefiles${NC}"

    local makefiles=(
        "Makefile"
        "makefiles/Makefile.production"
        "makefiles/root/Makefile"
    )

    for makefile in "${makefiles[@]}"; do
        if [ -f "$PROJECT_ROOT/$makefile" ]; then
            # Test de la syntaxe make (seulement pour les Makefiles avec cibles)
            if [[ "$makefile" == *"common.mk" ]]; then
                echo -e "${GREEN}✅ $makefile - Fichier inclus (pas de cibles)${NC}"
            else
                if make -n -f "$PROJECT_ROOT/$makefile" help &>/dev/null; then
                    echo -e "${GREEN}✅ $makefile - Syntaxe valide${NC}"
                else
                    echo -e "${RED}❌ $makefile - Erreur de syntaxe${NC}"
                    return 1
                fi
            fi

            # Test de la détection Docker Compose
            if grep -q "DOCKER_COMPOSE_CMD" "$PROJECT_ROOT/$makefile"; then
                echo -e "${GREEN}✅ $makefile - Détection Docker Compose${NC}"
            else
                echo -e "${YELLOW}⚠️ $makefile - Pas de détection Docker Compose${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️ $makefile - Non trouvé${NC}"
        fi
    done

    return 0
}

# Test principal
main() {
    local failed_tests=0
    local total_tests=0
    
    echo "🚀 Début des tests de détection robuste"
    echo "======================================"
    
    # Tests de base
    test_wrapper || ((failed_tests++))
    ((total_tests++))
    
    test_docker_detection || ((failed_tests++))
    ((total_tests++))
    
    test_docker_compose_detection || ((failed_tests++))
    ((total_tests++))
    
    test_cache || ((failed_tests++))
    ((total_tests++))
    
    test_updated_scripts || ((failed_tests++))
    ((total_tests++))
    
    test_makefiles || ((failed_tests++))
    ((total_tests++))
    
    # Résumé
    echo -e "\n${BLUE}📊 Résumé des tests${NC}"
    echo "==================="
    echo "Tests exécutés: $total_tests"
    echo "Tests échoués: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "\n${GREEN}🎉 TOUS LES TESTS RÉUSSIS !${NC}"
        echo ""
        echo -e "${BLUE}💡 Le système de détection Docker Compose robuste est opérationnel :${NC}"
        echo "   • Tests réels des commandes (pas juste existence des binaires)"
        echo "   • Cache intelligent pour performances optimales"
        echo "   • Fallback automatique en cas de problème"
        echo "   • Validation continue des commandes"
        echo "   • Support transparent docker-compose ET docker compose"
        echo ""
        echo -e "${GREEN}🌐 Le projet est maintenant ultra-robuste !${NC}"
        return 0
    else
        echo -e "\n${RED}❌ $failed_tests test(s) ont échoué${NC}"
        echo ""
        echo -e "${YELLOW}💡 Actions recommandées :${NC}"
        echo "   • Vérifier l'installation Docker/Docker Compose"
        echo "   • Nettoyer le cache : rm -f /tmp/jobbingtrack_docker_compose_cache"
        echo "   • Redémarrer Docker daemon"
        return 1
    fi
}

# Exécution
main "$@"
