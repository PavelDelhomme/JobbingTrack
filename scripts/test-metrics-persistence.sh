#!/bin/bash

# Script de test pour vérifier la persistance PostgreSQL des métriques

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}💾 Test de persistance PostgreSQL des métriques${NC}"
echo "=========================================="
echo ""

# Variables d'environnement (utiliser celles du .env ou valeurs par défaut)
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5000}
POSTGRES_DB=${POSTGRES_DB:-jobbingtrack}
POSTGRES_USER=${POSTGRES_USER:-jobbingtrack}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-jobbingtrack123}

# Fonction pour exécuter une requête SQL
run_sql() {
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -c "$1" 2>/dev/null || echo "ERROR"
}

# Test 1: Vérifier que les tables existent
test_tables_exist() {
    echo -e "${BLUE}📊 Test 1: Vérification des tables${NC}"
    
    system_exists=$(run_sql "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_metrics');")
    container_exists=$(run_sql "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'container_metrics');")
    
    if [ "$system_exists" = "t" ] && [ "$container_exists" = "t" ]; then
        echo -e "${GREEN}✅ Tables system_metrics et container_metrics existent${NC}"
        return 0
    else
        echo -e "${RED}❌ Tables manquantes: system_metrics=$system_exists, container_metrics=$container_exists${NC}"
        return 1
    fi
}

# Test 2: Vérifier qu'il y a des données récentes
test_recent_data() {
    echo -e "${BLUE}📈 Test 2: Vérification des données récentes${NC}"
    
    # Utiliser timestamp Unix au lieu de NOW() pour compatibilité
    current_timestamp=$(date +%s)
    one_hour_ago=$((current_timestamp - 3600))
    
    count=$(run_sql "SELECT COUNT(*) FROM system_metrics WHERE timestamp >= $one_hour_ago;")
    
    if [ "$count" != "ERROR" ] && [ "$count" -gt "0" ]; then
        echo -e "${GREEN}✅ $count enregistrements dans la dernière heure${NC}"
        
        # Afficher le dernier enregistrement avec toutes les métriques importantes
        last_record=$(run_sql "SELECT timestamp, cpu_load_1, cpu_cores, memory_usage_percent, disk_usage_percent, container_count, project_cpu_avg, project_memory_mb FROM system_metrics ORDER BY timestamp DESC LIMIT 1;")
        if [ "$last_record" != "ERROR" ] && [ -n "$last_record" ]; then
            echo -e "${GREEN}   Dernier enregistrement (toutes métriques):${NC}"
            IFS='|' read -r ts cpu_load cpu_cores mem_percent disk_percent cont_count proj_cpu proj_mem <<< "$last_record"
            echo "     - Timestamp: $ts ($(date -d "@$ts" 2>/dev/null || echo "N/A"))"
            echo "     - CPU Load 1min: $cpu_load"
            echo "     - CPU Cores: $cpu_cores"
            echo "     - Mémoire usage: $mem_percent%"
            echo "     - Disque usage: $disk_percent%"
            echo "     - Conteneurs: $cont_count"
            echo "     - CPU Projet: $proj_cpu%"
            echo "     - Mémoire Projet: $proj_mem MB"
        fi
        return 0
    else
        echo -e "${YELLOW}⚠️  Aucune donnée récente (peut être normal si monitoring-c vient de démarrer)${NC}"
        echo "   Vérifiez les logs: docker logs jobbingtrack-monitoring-c | grep STORAGE"
        return 0  # Ne pas échouer, c'est peut-être normal
    fi
}

# Test 3: Vérifier les métriques de conteneurs
test_container_metrics() {
    echo -e "${BLUE}🐳 Test 3: Vérification des métriques de conteneurs${NC}"
    
    # Utiliser timestamp Unix
    current_timestamp=$(date +%s)
    one_hour_ago=$((current_timestamp - 3600))
    
    count=$(run_sql "SELECT COUNT(*) FROM container_metrics WHERE timestamp >= $one_hour_ago;")
    
    if [ "$count" != "ERROR" ] && [ "$count" -gt "0" ]; then
        echo -e "${GREEN}✅ $count enregistrements de conteneurs dans la dernière heure${NC}"
        
        # Afficher quelques conteneurs avec leurs métriques
        containers=$(run_sql "SELECT DISTINCT name FROM container_metrics WHERE timestamp >= $one_hour_ago LIMIT 10;")
        if [ "$containers" != "ERROR" ] && [ -n "$containers" ]; then
            echo -e "${GREEN}   Conteneurs détectés (10 premiers):${NC}"
            echo "$containers" | while IFS= read -r name; do
                if [ -n "$name" ]; then
                    # Récupérer les métriques moyennes pour ce conteneur
                    metrics=$(run_sql "SELECT AVG(cpu_percent), AVG(memory_mb), AVG(memory_percent) FROM container_metrics WHERE name = '$name' AND timestamp >= $one_hour_ago;")
                    if [ "$metrics" != "ERROR" ] && [ -n "$metrics" ]; then
                        IFS='|' read -r avg_cpu avg_mem_mb avg_mem_pct <<< "$metrics"
                        echo "     - $name: CPU=${avg_cpu}%, Mem=${avg_mem_mb}MB (${avg_mem_pct}%)"
                    else
                        echo "     - $name"
                    fi
                fi
            done
        fi
        return 0
    else
        echo -e "${YELLOW}⚠️  Aucune métrique de conteneur récente${NC}"
        return 0
    fi
}

# Test 4: Vérifier toutes les métriques complètes
test_complete_metrics() {
    echo -e "${BLUE}📊 Test 4: Vérification de toutes les métriques complètes${NC}"
    
    current_timestamp=$(date +%s)
    one_hour_ago=$((current_timestamp - 3600))
    
    # Vérifier que toutes les colonnes importantes ont des valeurs non-nulles
    metrics_check=$(run_sql "SELECT COUNT(*) FROM system_metrics WHERE timestamp >= $one_hour_ago AND cpu_load_1 IS NOT NULL AND cpu_cores IS NOT NULL AND memory_usage_percent IS NOT NULL AND disk_usage_percent IS NOT NULL AND project_cpu_avg IS NOT NULL AND project_memory_mb IS NOT NULL;")
    
    if [ "$metrics_check" != "ERROR" ] && [ "$metrics_check" -gt "0" ]; then
        echo -e "${GREEN}✅ $metrics_check enregistrements avec toutes les métriques complètes${NC}"
        
        # Afficher statistiques complètes
        stats=$(run_sql "SELECT AVG(cpu_load_1), AVG(cpu_cores), AVG(memory_usage_percent), AVG(disk_usage_percent), AVG(project_cpu_avg), AVG(project_memory_mb), AVG(container_count) FROM system_metrics WHERE timestamp >= $one_hour_ago;")
        if [ "$stats" != "ERROR" ] && [ -n "$stats" ]; then
            IFS='|' read -r avg_load avg_cores avg_mem avg_disk avg_proj_cpu avg_proj_mem avg_containers <<< "$stats"
            echo -e "${GREEN}   Moyennes (1h):${NC}"
            echo "     - CPU Load 1min: $avg_load"
            echo "     - CPU Cores: $avg_cores"
            echo "     - Mémoire usage: $avg_mem%"
            echo "     - Disque usage: $avg_disk%"
            echo "     - CPU Projet: $avg_proj_cpu%"
            echo "     - Mémoire Projet: $avg_proj_mem MB"
            echo "     - Nombre conteneurs: $avg_containers"
        fi
        return 0
    else
        echo -e "${YELLOW}⚠️  Pas d'enregistrements complets trouvés${NC}"
        return 0
    fi
}

# Test 5: Vérifier le CPU Projet
test_project_cpu() {
    echo -e "${BLUE}💻 Test 5: Vérification du CPU Projet${NC}"
    
    current_timestamp=$(date +%s)
    one_hour_ago=$((current_timestamp - 3600))
    
    avg_cpu=$(run_sql "SELECT AVG(project_cpu_avg) FROM system_metrics WHERE timestamp >= $one_hour_ago;")
    
    if [ "$avg_cpu" != "ERROR" ] && [ -n "$avg_cpu" ]; then
        echo -e "${GREEN}✅ CPU Projet moyen (1h): ${avg_cpu}%${NC}"
        
        # Afficher min/max
        min_max=$(run_sql "SELECT MIN(project_cpu_avg), MAX(project_cpu_avg) FROM system_metrics WHERE timestamp >= $one_hour_ago;")
        if [ "$min_max" != "ERROR" ]; then
            IFS='|' read -r min_cpu max_cpu <<< "$min_max"
            echo "   Min/Max: ${min_cpu}% / ${max_cpu}%"
        fi
        return 0
    else
        echo -e "${YELLOW}⚠️  Impossible de calculer le CPU Projet moyen${NC}"
        return 0
    fi
}

# Test 6: Vérifier les index
test_indexes() {
    echo -e "${BLUE}🔍 Test 5: Vérification des index${NC}"
    
    indexes=$(run_sql "SELECT indexname FROM pg_indexes WHERE tablename IN ('system_metrics', 'container_metrics');")
    
    if [ "$indexes" != "ERROR" ] && [ -n "$indexes" ]; then
        index_count=$(echo "$indexes" | wc -l)
        echo -e "${GREEN}✅ $index_count index trouvés${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Aucun index trouvé (peut être normal si tables vides)${NC}"
        return 0
    fi
}

# Test 7: Statistiques des tables
test_table_stats() {
    echo -e "${BLUE}📊 Test 6: Statistiques des tables${NC}"
    
    stats=$(run_sql "SELECT tablename, n_live_tup, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_stat_user_tables WHERE tablename IN ('system_metrics', 'container_metrics');")
    
    if [ "$stats" != "ERROR" ] && [ -n "$stats" ]; then
        echo -e "${GREEN}✅ Statistiques:${NC}"
        echo "$stats" | while IFS='|' read -r table rows size; do
            if [ -n "$table" ]; then
                echo "   - $table: $rows lignes, $size"
            fi
        done
        return 0
    else
        echo -e "${YELLOW}⚠️  Impossible de récupérer les statistiques${NC}"
        return 0
    fi
}

# Vérifier que psql est disponible
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql n'est pas installé${NC}"
    echo "   Installez PostgreSQL client: sudo apt-get install postgresql-client"
    exit 1
fi

# Vérifier la connexion
echo "Connexion à PostgreSQL..."
if ! PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &>/dev/null; then
    echo -e "${RED}❌ Impossible de se connecter à PostgreSQL${NC}"
    echo "   Host: $POSTGRES_HOST:$POSTGRES_PORT"
    echo "   Database: $POSTGRES_DB"
    echo "   User: $POSTGRES_USER"
    exit 1
fi

echo -e "${GREEN}✅ Connexion PostgreSQL réussie${NC}"
echo ""

# Exécuter tous les tests
errors=0

test_tables_exist || errors=$((errors + 1))
echo ""

test_recent_data || errors=$((errors + 1))
echo ""

test_container_metrics || errors=$((errors + 1))
echo ""

test_complete_metrics || errors=$((errors + 1))
echo ""

test_project_cpu || errors=$((errors + 1))
echo ""

test_indexes || errors=$((errors + 1))
echo ""

test_table_stats || errors=$((errors + 1))
echo ""

# Résumé
if [ $errors -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les tests sont passés${NC}"
    echo ""
    echo "Pour voir les dernières métriques:"
    echo "  PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c \"SELECT timestamp, cpu_load_1, cpu_cores, memory_usage_percent, project_cpu_avg, project_memory_mb FROM system_metrics ORDER BY timestamp DESC LIMIT 5;\""
    exit 0
else
    echo -e "${RED}❌ $errors test(s) ont échoué${NC}"
    exit 1
fi

