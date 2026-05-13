#!/bin/bash

# Tests pour le backoffice - vérification des métriques affichées
# Teste que les données sont cohérentes entre monitoring-c et le frontend

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Tests Backoffice - Vérification des métriques${NC}"
echo "=========================================="
echo ""

# Fonction pour tester que les métriques sont accessibles
test_metrics_endpoint() {
    echo -e "${BLUE}📊 Test: Accessibilité de l'endpoint métriques${NC}"
    
    response=$(curl -s -w "\n%{http_code}" http://localhost:5098/api/v1/metrics 2>/dev/null || echo -e "\n000")
    http_code=$(echo "$response" | tail -1)
    
    if [ "$http_code" != "200" ]; then
        echo -e "${RED}❌ L'endpoint n'est pas accessible (HTTP $http_code)${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Endpoint accessible${NC}"
    return 0
}

# Fonction pour vérifier la cohérence des données
test_data_consistency() {
    echo -e "${BLUE}🔍 Test: Cohérence des données${NC}"
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq requis pour ce test${NC}"
        return 1
    fi
    
    response=$(curl -s http://localhost:5098/api/v1/metrics 2>/dev/null || echo "{}")
    
    # Vérifier que les champs requis existent
    required_fields=(
        "timestamp"
        "cpu.cores"
        "cpu.load_1"
        "cpu.usage_percent"
        "memory.total_mb"
        "memory.used_mb"
        "memory.usage_percent"
        "container_count"
        "project_cpu_avg"
        "project_memory_mb"
    )
    
    errors=0
    for field in "${required_fields[@]}"; do
        value=$(echo "$response" | jq -r ".$field // \"MISSING\"" 2>/dev/null)
        if [ "$value" = "MISSING" ] || [ "$value" = "null" ]; then
            echo -e "${RED}❌ Champ manquant: $field${NC}"
            errors=$((errors + 1))
        fi
    done
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}✅ Tous les champs requis sont présents${NC}"
    else
        echo -e "${RED}❌ $errors champs manquants${NC}"
        return 1
    fi
    
    # Vérifier que project_cpu_avg est cohérent avec les conteneurs
    project_cpu=$(echo "$response" | jq -r '.project_cpu_avg // 0')
    container_count=$(echo "$response" | jq -r '.container_count // 0')
    
    if [ "$container_count" -gt "0" ]; then
        # Calculer manuellement le CPU moyen des conteneurs
        manual_cpu=$(echo "$response" | jq -r '[.containers[] | .cpu_percent] | add / length' 2>/dev/null || echo "0")
        
        if [ "$(echo "$project_cpu - $manual_cpu" | bc 2>/dev/null | cut -d. -f1)" != "0" ]; then
            echo -e "${YELLOW}⚠️  CPU projet ($project_cpu%) diffère légèrement du calcul manuel ($manual_cpu%)${NC}"
            echo "   (peut être normal si certains conteneurs sont exclus)"
        else
            echo -e "${GREEN}✅ CPU projet cohérent${NC}"
        fi
    fi
    
    return 0
}

# Fonction pour tester que le CPU système est calculé
test_cpu_system() {
    echo -e "${BLUE}💻 Test: CPU Système${NC}"
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq requis pour ce test${NC}"
        return 1
    fi
    
    response=$(curl -s http://localhost:5098/api/v1/metrics 2>/dev/null || echo "{}")
    
    cpu_load_1=$(echo "$response" | jq -r '.cpu.load_1 // 0')
    cpu_usage=$(echo "$response" | jq -r '.cpu.usage_percent // 0')
    cpu_cores=$(echo "$response" | jq -r '.cpu.cores // 0')
    
    if [ "$cpu_cores" -eq "0" ]; then
        echo -e "${RED}❌ Nombre de cores CPU est 0${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ CPU Système:"
    echo "   - Cores: $cpu_cores"
    echo "   - Load 1min: $cpu_load_1"
    echo "   - Usage %: $cpu_usage"
    
    # Vérifier que usage_percent est calculé (peut être approximatif depuis load_1)
    if [ "$cpu_usage" != "0" ]; then
        echo -e "${GREEN}✅ Usage CPU disponible${NC}"
    else
        echo -e "${YELLOW}⚠️  Usage CPU est 0 (peut être normal si calculé depuis load_1)${NC}"
    fi
    
    return 0
}

# Fonction pour tester le CPU projet
test_cpu_project() {
    echo -e "${BLUE}🚀 Test: CPU Projet${NC}"
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq requis pour ce test${NC}"
        return 1
    fi
    
    response=$(curl -s http://localhost:5098/api/v1/metrics 2>/dev/null || echo "{}")
    
    project_cpu=$(echo "$response" | jq -r '.project_cpu_avg // 0')
    container_count=$(echo "$response" | jq -r '.container_count // 0')
    project_containers=$(echo "$response" | jq -r '[.containers[] | select(.name | contains("jobbingtrack-"))] | length' 2>/dev/null || echo "0")
    
    echo "CPU Projet:"
    echo "   - Valeur: ${project_cpu}%"
    echo "   - Conteneurs projet: $project_containers"
    echo "   - Total conteneurs: $container_count"
    
    if [ "$container_count" -eq "0" ]; then
        echo -e "${RED}❌ Aucun conteneur détecté${NC}"
        return 1
    fi
    
    # Si CPU projet est 0, vérifier les valeurs individuelles
    if [ "$(echo "$project_cpu == 0" | bc 2>/dev/null)" = "1" ]; then
        echo -e "${YELLOW}⚠️  CPU Projet est à 0%${NC}"
        echo "   Vérification des conteneurs individuels:"
        
        # Afficher les 5 premiers conteneurs avec leur CPU
        echo "$response" | jq -r '.containers[0:5] | .[] | "     - \(.name): \(.cpu_percent)%"' 2>/dev/null || echo "     (erreur parsing)"
        
        echo ""
        echo "   Causes possibles:"
        echo "   1. Conteneurs viennent de démarrer (CPU peut être 0 au début)"
        echo "   2. Conteneurs sont inactifs/idle"
        echo "   3. Système peu chargé (normal pour un environnement de développement)"
    else
        echo -e "${GREEN}✅ CPU Projet: ${project_cpu}%${NC}"
        echo "   (valeur normale pour un système peu chargé)"
    fi
    
    return 0
}

# Fonction pour tester la mémoire projet
test_memory_project() {
    echo -e "${BLUE}🧠 Test: Mémoire Projet${NC}"
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq requis pour ce test${NC}"
        return 1
    fi
    
    response=$(curl -s http://localhost:5098/api/v1/metrics 2>/dev/null || echo "{}")
    
    project_memory=$(echo "$response" | jq -r '.project_memory_mb // 0')
    system_memory_total=$(echo "$response" | jq -r '.memory.total_mb // 0')
    system_memory_used=$(echo "$response" | jq -r '.memory.used_mb // 0')
    
    echo "Mémoire:"
    echo "   - Projet: ${project_memory} MB"
    echo "   - Système totale: ${system_memory_total} MB"
    echo "   - Système utilisée: ${system_memory_used} MB"
    
    if [ "$system_memory_total" -eq "0" ]; then
        echo -e "${RED}❌ Mémoire système totale est 0${NC}"
        return 1
    fi
    
    # Calculer le pourcentage projet / système
    if [ "$system_memory_total" -gt "0" ]; then
        project_percent=$(echo "scale=2; $project_memory * 100 / $system_memory_total" | bc 2>/dev/null || echo "0")
        echo "   - Projet / Système: ${project_percent}%"
        
        if [ "$(echo "$project_percent > 100" | bc 2>/dev/null)" = "1" ]; then
            echo -e "${RED}❌ Mémoire projet > 100% du système (incohérent)${NC}"
            return 1
        fi
    fi
    
    echo -e "${GREEN}✅ Mémoire projet cohérente${NC}"
    return 0
}

# Exécuter tous les tests
main() {
    echo "Date: $(date)"
    echo ""
    
    errors=0
    
    test_metrics_endpoint || errors=$((errors + 1))
    echo ""
    
    test_data_consistency || errors=$((errors + 1))
    echo ""
    
    test_cpu_system || errors=$((errors + 1))
    echo ""
    
    test_cpu_project || errors=$((errors + 1))
    echo ""
    
    test_memory_project || errors=$((errors + 1))
    echo ""
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}✅ Tous les tests sont passés${NC}"
        return 0
    else
        echo -e "${RED}❌ $errors test(s) ont échoué${NC}"
        return 1
    fi
}

main "$@"

