#!/bin/bash

# Script de test complet pour le système de monitoring et logs en C
# Teste monitoring-c et log-collector-c

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Tests du système de monitoring et logs en C${NC}"
echo "=========================================="
echo ""

# Fonction pour tester monitoring-c
test_monitoring_c() {
    echo -e "${BLUE}📊 Test 1: monitoring-c - Endpoint /api/v1/metrics${NC}"
    
    # Vérifier si le conteneur est démarré
    if ! docker ps | grep -q "monitoring-c"; then
        echo -e "${RED}❌ Le conteneur monitoring-c n'est pas démarré${NC}"
        return 1
    fi
    
    # Tester l'endpoint
    response=$(curl -s -w "\n%{http_code}" http://localhost:5098/api/v1/metrics 2>/dev/null || echo -e "\n000")
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" != "200" ]; then
        echo -e "${RED}❌ Erreur HTTP: $http_code${NC}"
        return 1
    fi
    
    # Parser le JSON avec jq
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq n'est pas installé, test basique uniquement${NC}"
        echo "$body" | head -20
    else
        echo -e "${GREEN}✅ Endpoint répond (HTTP $http_code)${NC}"
        echo ""
        
        # Extraire les métriques clés
        timestamp=$(echo "$body" | jq -r '.timestamp // "N/A"')
        cpu_cores=$(echo "$body" | jq -r '.cpu.cores // "N/A"')
        cpu_load_1=$(echo "$body" | jq -r '.cpu.load_1 // "N/A"')
        cpu_usage=$(echo "$body" | jq -r '.cpu.usage_percent // "N/A"')
        project_cpu_avg=$(echo "$body" | jq -r '.project_cpu_avg // "N/A"')
        project_memory_mb=$(echo "$body" | jq -r '.project_memory_mb // "N/A"')
        container_count=$(echo "$body" | jq -r '.container_count // "N/A"')
        
        echo "Métriques système:"
        echo "  - Timestamp: $timestamp"
        echo "  - CPU Cores: $cpu_cores"
        echo "  - CPU Load 1min: $cpu_load_1"
        echo "  - CPU Usage %: $cpu_usage"
        echo ""
        echo "Métriques projet (JobbingTrack):"
        echo "  - CPU Projet Moyen: ${project_cpu_avg}%"
        echo "  - Mémoire Projet: ${project_memory_mb} MB"
        echo "  - Nombre de conteneurs: $container_count"
        echo ""
        
        # Vérifier le CPU projet
        if [ "$project_cpu_avg" = "0" ] || [ "$project_cpu_avg" = "0.00" ] || [ "$project_cpu_avg" = "null" ]; then
            echo -e "${YELLOW}⚠️  CPU Projet est à 0% - vérification des conteneurs...${NC}"
            
            # Lister les conteneurs dans la réponse
            container_names=$(echo "$body" | jq -r '.containers[].name // empty' 2>/dev/null || echo "")
            if [ -z "$container_names" ]; then
                echo -e "${RED}❌ Aucun conteneur trouvé dans les métriques${NC}"
            else
                echo "Conteneurs détectés:"
                echo "$container_names" | while read -r name; do
                    if [ -n "$name" ]; then
                        cpu=$(echo "$body" | jq -r --arg n "$name" '.containers[] | select(.name == $n) | .cpu_percent // "N/A"')
                        echo "  - $name: CPU=${cpu}%"
                    fi
                done
            fi
        else
            echo -e "${GREEN}✅ CPU Projet: ${project_cpu_avg}%${NC}"
        fi
        
        # Afficher les conteneurs individuels
        echo ""
        echo "Détails des conteneurs (5 premiers):"
        echo "$body" | jq -r '.containers[0:5] | .[] | "  - \(.name): CPU=\(.cpu_percent)%, Mem=\(.memory_mb)MB, Response=\(.response_time_ms)ms"' 2>/dev/null || echo "  (erreur parsing)"
    fi
    
    echo ""
    return 0
}

# Fonction pour tester log-collector-c
test_log_collector_c() {
    echo -e "${BLUE}📝 Test 2: log-collector-c${NC}"
    
    # Vérifier si le conteneur est démarré
    if ! docker ps | grep -q "log-collector-c"; then
        echo -e "${YELLOW}⚠️  Le conteneur log-collector-c n'est pas démarré${NC}"
        return 0
    fi
    
    # Vérifier les logs du conteneur
    echo "Vérification des logs récents du collecteur:"
    docker logs --tail 20 jobbingtrack-log-collector-c 2>&1 | head -10 || echo "  (pas de logs disponibles)"
    
    echo ""
    return 0
}

# Fonction pour tester les conteneurs Docker directement
test_docker_containers() {
    echo -e "${BLUE}🐳 Test 3: Vérification directe des conteneurs Docker${NC}"
    
    # Lister les conteneurs JobbingTrack
    containers=$(docker ps --filter 'name=jobbingtrack-' --format '{{.Names}}' 2>/dev/null || echo "")
    
    if [ -z "$containers" ]; then
        echo -e "${RED}❌ Aucun conteneur JobbingTrack trouvé${NC}"
        return 1
    fi
    
    echo "Conteneurs JobbingTrack actifs:"
    echo "$containers" | while read -r name; do
        if [ -n "$name" ]; then
            echo "  - $name"
        fi
    done
    echo ""
    
    # Tester docker stats pour les 3 premiers
    echo "CPU/Mémoire des 3 premiers conteneurs (docker stats --no-stream):"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(echo "$containers" | head -3 | tr '\n' ' ') 2>/dev/null || echo "  (erreur docker stats)"
    
    echo ""
    return 0
}

# Fonction pour tester la persistance des métriques
test_metrics_persistence() {
    echo -e "${BLUE}💾 Test 4: Persistance des métriques${NC}"
    
    # Vérifier les logs de monitoring-c pour voir si save_metrics_to_db est appelé
    echo "Vérification des logs de monitoring-c (sauvegarde DB):"
    STORAGE_LOGS=$(docker logs --tail 100 jobbingtrack-monitoring-c 2>&1 | grep -i "\[STORAGE\]" | tail -10)
    if [ -n "$STORAGE_LOGS" ]; then
        echo "$STORAGE_LOGS"
        echo ""
        if echo "$STORAGE_LOGS" | grep -q "✅ Métriques sauvegardées"; then
            echo -e "${GREEN}✅ Persistance PostgreSQL fonctionne (métriques sauvegardées détectées)${NC}"
        elif echo "$STORAGE_LOGS" | grep -q "✅ Connecté à PostgreSQL"; then
            echo -e "${YELLOW}⚠️  Connexion PostgreSQL établie mais pas de sauvegarde récente détectée${NC}"
            echo "   (peut être normal si monitoring-c vient de démarrer)"
        else
            echo -e "${YELLOW}ℹ️  Connexion PostgreSQL en cours...${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Aucun log STORAGE trouvé${NC}"
        echo "   Vérifiez manuellement: docker logs jobbingtrack-monitoring-c | grep STORAGE"
    fi
    echo ""
}

# Fonction pour diagnostiquer pourquoi CPU projet est à 0
diagnose_cpu_zero() {
    echo -e "${BLUE}🔍 Diagnostic: Pourquoi CPU Projet est à 0%?${NC}"
    echo ""
    
    # Récupérer les métriques
    response=$(curl -s http://localhost:5098/api/v1/metrics 2>/dev/null || echo "{}")
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq requis pour le diagnostic${NC}"
        return 1
    fi
    
    # Compter les conteneurs avec CPU > 0
    containers_with_cpu=$(echo "$response" | jq -r '[.containers[] | select(.cpu_percent > 0)] | length' 2>/dev/null || echo "0")
    total_containers=$(echo "$response" | jq -r '.containers | length' 2>/dev/null || echo "0")
    
    echo "Analyse:"
    echo "  - Conteneurs avec CPU > 0%: $containers_with_cpu / $total_containers"
    
    if [ "$containers_with_cpu" -eq "0" ] && [ "$total_containers" -gt "0" ]; then
        echo -e "${YELLOW}⚠️  Tous les conteneurs ont un CPU à 0%${NC}"
        echo "   Causes possibles:"
        echo "   1. Conteneurs viennent de démarrer (CPU peut être 0 au début)"
        echo "   2. Conteneurs sont inactifs/idle"
        echo "   3. Problème de parsing du CPU depuis docker stats"
        echo ""
        echo "   Vérification directe avec docker stats:"
        docker stats --no-stream --format "{{.Name}}: {{.CPUPerc}}" $(docker ps --filter 'name=jobbingtrack-' --format '{{.Names}}' | head -3 | tr '\n' ' ') 2>/dev/null || echo "  (erreur)"
    fi
    
    # Afficher les valeurs CPU de chaque conteneur
    echo ""
    echo "Valeurs CPU détaillées:"
    echo "$response" | jq -r '.containers[] | "  - \(.name): \(.cpu_percent)%"' 2>/dev/null || echo "  (erreur parsing)"
    
    echo ""
}

# Exécuter tous les tests
main() {
    echo "Date: $(date)"
    echo ""
    
    test_monitoring_c
    test_log_collector_c
    test_docker_containers
    test_metrics_persistence
    diagnose_cpu_zero
    
    echo -e "${GREEN}✅ Tests terminés${NC}"
    echo ""
    echo "Pour plus de détails:"
    echo "  - Logs monitoring-c: docker logs jobbingtrack-monitoring-c"
    echo "  - Logs log-collector-c: docker logs jobbingtrack-log-collector-c"
    echo "  - Endpoint métriques: curl http://localhost:5098/api/v1/metrics | jq"
}

main "$@"

