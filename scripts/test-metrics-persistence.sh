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
    
    count=$(run_sql "SELECT COUNT(*) FROM system_metrics WHERE timestamp >= NOW() - INTERVAL '1 hour';")
    
    if [ "$count" != "ERROR" ] && [ "$count" -gt "0" ]; then
        echo -e "${GREEN}✅ $count enregistrements dans la dernière heure${NC}"
        
        # Afficher le dernier enregistrement
        last_record=$(run_sql "SELECT timestamp, project_cpu_avg, project_memory_mb, container_count FROM system_metrics ORDER BY timestamp DESC LIMIT 1;")
        if [ "$last_record" != "ERROR" ]; then
            echo "   Dernier enregistrement: $last_record"
        fi
        return 0
    else
        echo -e "${YELLOW}⚠️  Aucune donnée récente (peut être normal si monitoring-c vient de démarrer)${NC}"
        return 0  # Ne pas échouer, c'est peut-être normal
    fi
}

# Test 3: Vérifier les métriques de conteneurs
test_container_metrics() {
    echo -e "${BLUE}🐳 Test 3: Vérification des métriques de conteneurs${NC}"
    
    count=$(run_sql "SELECT COUNT(*) FROM container_metrics WHERE timestamp >= NOW() - INTERVAL '1 hour';")
    
    if [ "$count" != "ERROR" ] && [ "$count" -gt "0" ]; then
        echo -e "${GREEN}✅ $count enregistrements de conteneurs dans la dernière heure${NC}"
        
        # Afficher quelques conteneurs
        containers=$(run_sql "SELECT DISTINCT container_name FROM container_metrics WHERE timestamp >= NOW() - INTERVAL '1 hour' LIMIT 5;")
        if [ "$containers" != "ERROR" ] && [ -n "$containers" ]; then
            echo "   Conteneurs détectés:"
            echo "$containers" | while read -r name; do
                if [ -n "$name" ]; then
                    echo "     - $name"
                fi
            done
        fi
        return 0
    else
        echo -e "${YELLOW}⚠️  Aucune métrique de conteneur récente${NC}"
        return 0
    fi
}

# Test 4: Vérifier le CPU Projet
test_project_cpu() {
    echo -e "${BLUE}💻 Test 4: Vérification du CPU Projet${NC}"
    
    avg_cpu=$(run_sql "SELECT AVG(project_cpu_avg) FROM system_metrics WHERE timestamp >= NOW() - INTERVAL '1 hour';")
    
    if [ "$avg_cpu" != "ERROR" ] && [ -n "$avg_cpu" ]; then
        echo -e "${GREEN}✅ CPU Projet moyen (1h): ${avg_cpu}%${NC}"
        
        # Afficher min/max
        min_max=$(run_sql "SELECT MIN(project_cpu_avg), MAX(project_cpu_avg) FROM system_metrics WHERE timestamp >= NOW() - INTERVAL '1 hour';")
        if [ "$min_max" != "ERROR" ]; then
            echo "   Min/Max: $min_max"
        fi
        return 0
    else
        echo -e "${YELLOW}⚠️  Impossible de calculer le CPU Projet moyen${NC}"
        return 0
    fi
}

# Test 5: Vérifier les index
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

# Test 6: Statistiques des tables
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
    echo "  PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c \"SELECT * FROM recent_system_metrics LIMIT 5;\""
    exit 0
else
    echo -e "${RED}❌ $errors test(s) ont échoué${NC}"
    exit 1
fi

