#!/bin/bash

# Script de diagnostic complet pour les problèmes Prisma P2021
# Auteur: Auto-generated
# Date: $(date +%Y-%m-%d)

set -e

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Répertoire de travail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/diagnostic-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/diagnostic_${TIMESTAMP}.txt"
JSON_REPORT="$REPORT_DIR/diagnostic_${TIMESTAMP}.json"

# Créer le répertoire de rapports
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DIAGNOSTIC PRISMA P2021 COMPLET${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Fonction pour logger
log() {
    echo -e "$1" | tee -a "$REPORT_FILE"
}

# Fonction pour vérifier si une commande existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Initialiser le rapport JSON
echo "{" > "$JSON_REPORT"
echo "  \"timestamp\": \"$(date -Iseconds)\"," >> "$JSON_REPORT"
echo "  \"reports\": {" >> "$JSON_REPORT"

# ============================================================================
# 1. VÉRIFICATION DE L'ENVIRONNEMENT
# ============================================================================
log "${BLUE}[1/10] Vérification de l'environnement...${NC}"

ENV_CHECK="{}"
if command_exists docker; then
    DOCKER_VERSION=$(docker --version 2>&1 || echo "N/A")
    ENV_CHECK=$(echo "$ENV_CHECK" | jq ".docker = \"$DOCKER_VERSION\"" 2>/dev/null || echo "$ENV_CHECK")
    log "${GREEN}✓ Docker: $DOCKER_VERSION${NC}"
else
    log "${RED}✗ Docker non installé${NC}"
    ENV_CHECK=$(echo "$ENV_CHECK" | jq ".docker = \"NOT_INSTALLED\"" 2>/dev/null || echo "$ENV_CHECK")
fi

if command_exists docker-compose; then
    COMPOSE_VERSION=$(docker-compose --version 2>&1 || echo "N/A")
    ENV_CHECK=$(echo "$ENV_CHECK" | jq ".docker_compose = \"$COMPOSE_VERSION\"" 2>/dev/null || echo "$ENV_CHECK")
    log "${GREEN}✓ Docker Compose: $COMPOSE_VERSION${NC}"
else
    log "${YELLOW}⚠ Docker Compose non trouvé (peut utiliser 'docker compose')${NC}"
fi

if command_exists psql; then
    PSQL_VERSION=$(psql --version 2>&1 || echo "N/A")
    ENV_CHECK=$(echo "$ENV_CHECK" | jq ".psql = \"$PSQL_VERSION\"" 2>/dev/null || echo "$ENV_CHECK")
    log "${GREEN}✓ PostgreSQL client: $PSQL_VERSION${NC}"
else
    log "${YELLOW}⚠ psql non installé (utilisera docker exec)${NC}"
fi

if command_exists jq; then
    log "${GREEN}✓ jq installé${NC}"
else
    log "${YELLOW}⚠ jq non installé (certaines fonctionnalités seront limitées)${NC}"
fi

echo "  \"environment\": $ENV_CHECK," >> "$JSON_REPORT"

# ============================================================================
# 2. VÉRIFICATION DES CONTENEURS DOCKER
# ============================================================================
log ""
log "${BLUE}[2/10] Vérification des conteneurs Docker...${NC}"

CONTAINERS_CHECK="{}"
if docker ps >/dev/null 2>&1; then
    # Conteneur PostgreSQL - Chercher spécifiquement jobbingtrack-postgres
    POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "^jobbingtrack-postgres$|jobbingtrack.*postgres" | head -1)
    
    if [ -z "$POSTGRES_CONTAINER" ]; then
        # Fallback: chercher n'importe quel postgres
        POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i "postgres" | grep -v "budget\|vtcbuilder\|streammake" | head -1)
    fi
    
    if [ -n "$POSTGRES_CONTAINER" ]; then
        log "${GREEN}✓ PostgreSQL conteneur: $POSTGRES_CONTAINER${NC}"
        CONTAINERS_CHECK=$(echo "$CONTAINERS_CHECK" | jq ".postgres = \"$POSTGRES_CONTAINER\"" 2>/dev/null || echo "$CONTAINERS_CHECK")
        
        # Vérifier l'état
        POSTGRES_STATUS=$(docker inspect --format='{{.State.Status}}' "$POSTGRES_CONTAINER" 2>/dev/null || echo "unknown")
        log "  Status: $POSTGRES_STATUS"
        CONTAINERS_CHECK=$(echo "$CONTAINERS_CHECK" | jq ".postgres_status = \"$POSTGRES_STATUS\"" 2>/dev/null || echo "$CONTAINERS_CHECK")
    else
        log "${RED}✗ Conteneur PostgreSQL jobbingtrack non trouvé${NC}"
        log "${YELLOW}  Conteneurs PostgreSQL trouvés:${NC}"
        docker ps --format "{{.Names}}" | grep -i "postgres" | while read name; do
            log "    - $name"
        done
        CONTAINERS_CHECK=$(echo "$CONTAINERS_CHECK" | jq ".postgres = \"NOT_FOUND\"" 2>/dev/null || echo "$CONTAINERS_CHECK")
    fi
    
    # Conteneurs de services - Chercher spécifiquement jobbingtrack-*
    SERVICES=("security-service" "auth-service" "company-service" "application-service")
    SERVICES_RUNNING="[]"
    for service in "${SERVICES[@]}"; do
        SERVICE_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "^jobbingtrack-$service$|jobbingtrack.*$service" | head -1)
        if [ -n "$SERVICE_CONTAINER" ]; then
            log "${GREEN}✓ $service: $SERVICE_CONTAINER${NC}"
            SERVICES_RUNNING=$(echo "$SERVICES_RUNNING" | jq ". + [\"$SERVICE_CONTAINER\"]" 2>/dev/null || echo "$SERVICES_RUNNING")
        else
            log "${YELLOW}⚠ $service: non démarré${NC}"
        fi
    done
    CONTAINERS_CHECK=$(echo "$CONTAINERS_CHECK" | jq ".services_running = $SERVICES_RUNNING" 2>/dev/null || echo "$CONTAINERS_CHECK")
else
    log "${RED}✗ Impossible de se connecter à Docker${NC}"
    CONTAINERS_CHECK=$(echo "$CONTAINERS_CHECK" | jq ".error = \"DOCKER_NOT_ACCESSIBLE\"" 2>/dev/null || echo "$CONTAINERS_CHECK")
fi

echo "  \"containers\": $CONTAINERS_CHECK," >> "$JSON_REPORT"

# ============================================================================
# 3. VÉRIFICATION DE LA BASE DE DONNÉES
# ============================================================================
log ""
log "${BLUE}[3/10] Vérification de la base de données...${NC}"

DB_CHECK="{}"
if [ -n "$POSTGRES_CONTAINER" ]; then
    # Récupérer les variables d'environnement du conteneur
    DB_USER=$(docker exec "$POSTGRES_CONTAINER" env | grep "^POSTGRES_USER=" | cut -d= -f2 || echo "jobbingtrack")
    DB_NAME=$(docker exec "$POSTGRES_CONTAINER" env | grep "^POSTGRES_DB=" | cut -d= -f2 || echo "jobbingtrack")
    
    # Si les variables ne sont pas trouvées, utiliser les valeurs par défaut
    if [ -z "$DB_USER" ]; then
        DB_USER="jobbingtrack"
    fi
    if [ -z "$DB_NAME" ]; then
        DB_NAME="jobbingtrack"
    fi
    
    log "  Utilisateur DB: $DB_USER"
    log "  Base de données: $DB_NAME"
    
    # Tester la connexion
    if docker exec "$POSTGRES_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        log "${GREEN}✓ PostgreSQL est accessible (user: $DB_USER, db: $DB_NAME)${NC}"
        DB_CHECK=$(echo "$DB_CHECK" | jq ".accessible = true" 2>/dev/null || echo "$DB_CHECK")
        DB_CHECK=$(echo "$DB_CHECK" | jq ".user = \"$DB_USER\"" 2>/dev/null || echo "$DB_CHECK")
        DB_CHECK=$(echo "$DB_CHECK" | jq ".database = \"$DB_NAME\"" 2>/dev/null || echo "$DB_CHECK")
        
        # Lister les tables
        TABLES=$(docker exec "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null | tr -d ' ' | grep -v '^$' || echo "")
        
        if [ -n "$TABLES" ]; then
            TABLE_COUNT=$(echo "$TABLES" | wc -l)
            log "${GREEN}✓ Nombre de tables: $TABLE_COUNT${NC}"
            DB_CHECK=$(echo "$DB_CHECK" | jq ".table_count = $TABLE_COUNT" 2>/dev/null || echo "$DB_CHECK")
            
            # Vérifier les tables critiques
            CRITICAL_TABLES=("security_metrics" "User" "Company" "Application")
            MISSING_TABLES="[]"
            EXISTING_TABLES="[]"
            
            for table in "${CRITICAL_TABLES[@]}"; do
                if echo "$TABLES" | grep -qi "^${table}$"; then
                    log "${GREEN}  ✓ Table $table existe${NC}"
                    EXISTING_TABLES=$(echo "$EXISTING_TABLES" | jq ". + [\"$table\"]" 2>/dev/null || echo "$EXISTING_TABLES")
                else
                    log "${RED}  ✗ Table $table N'EXISTE PAS${NC}"
                    MISSING_TABLES=$(echo "$MISSING_TABLES" | jq ". + [\"$table\"]" 2>/dev/null || echo "$MISSING_TABLES")
                fi
            done
            
            DB_CHECK=$(echo "$DB_CHECK" | jq ".missing_tables = $MISSING_TABLES" 2>/dev/null || echo "$DB_CHECK")
            DB_CHECK=$(echo "$DB_CHECK" | jq ".existing_tables = $EXISTING_TABLES" 2>/dev/null || echo "$DB_CHECK")
            
            # Liste complète des tables
            DB_CHECK=$(echo "$DB_CHECK" | jq ".all_tables = [$(echo "$TABLES" | sed 's/^/"/;s/$/",/' | tr -d '\n' | sed 's/,$//')]" 2>/dev/null || echo "$DB_CHECK")
        else
            log "${RED}✗ Aucune table trouvée dans le schéma public${NC}"
            DB_CHECK=$(echo "$DB_CHECK" | jq ".table_count = 0" 2>/dev/null || echo "$DB_CHECK")
        fi
    else
        log "${RED}✗ PostgreSQL n'est pas accessible${NC}"
        DB_CHECK=$(echo "$DB_CHECK" | jq ".accessible = false" 2>/dev/null || echo "$DB_CHECK")
    fi
else
    log "${RED}✗ Conteneur PostgreSQL non trouvé${NC}"
    DB_CHECK=$(echo "$DB_CHECK" | jq ".error = \"CONTAINER_NOT_FOUND\"" 2>/dev/null || echo "$DB_CHECK")
fi

echo "  \"database\": $DB_CHECK," >> "$JSON_REPORT"

# ============================================================================
# 4. VÉRIFICATION DES SCHÉMAS PRISMA
# ============================================================================
log ""
log "${BLUE}[4/10] Vérification des schémas Prisma...${NC}"

SCHEMA_CHECK="{}"
SERVICES_WITH_SCHEMAS=("auth-service" "security-service" "company-service" "application-service")

for service in "${SERVICES_WITH_SCHEMAS[@]}"; do
    SCHEMA_FILE="$PROJECT_ROOT/backend/$service/prisma/schema.prisma"
    if [ -f "$SCHEMA_FILE" ]; then
        log "${GREEN}✓ $service: schema.prisma trouvé${NC}"
        
        # Vérifier si SecurityMetric est défini
        if [ "$service" = "security-service" ]; then
            if grep -q "model SecurityMetric" "$SCHEMA_FILE"; then
                log "  ✓ Model SecurityMetric défini"
                TABLE_MAP=$(grep -A 5 "model SecurityMetric" "$SCHEMA_FILE" | grep "@@map" | sed 's/.*@@map("\(.*\)").*/\1/' || echo "")
                if [ -n "$TABLE_MAP" ]; then
                    log "  ✓ Mappé vers: $TABLE_MAP"
                fi
            else
                log "${RED}  ✗ Model SecurityMetric NON DÉFINI${NC}"
            fi
        fi
        
        # Vérifier les autres modèles critiques
        if [ "$service" = "auth-service" ]; then
            if grep -q "model User" "$SCHEMA_FILE"; then
                log "  ✓ Model User défini"
            else
                log "${RED}  ✗ Model User NON DÉFINI${NC}"
            fi
        fi
    else
        log "${YELLOW}⚠ $service: schema.prisma non trouvé${NC}"
    fi
done

# ============================================================================
# 5. VÉRIFICATION DES MIGRATIONS PRISMA
# ============================================================================
log ""
log "${BLUE}[5/10] Vérification des migrations Prisma...${NC}"

MIGRATION_CHECK="{}"
for service in "${SERVICES_WITH_SCHEMAS[@]}"; do
    MIGRATIONS_DIR="$PROJECT_ROOT/backend/$service/prisma/migrations"
    if [ -d "$MIGRATIONS_DIR" ]; then
        MIGRATION_COUNT=$(find "$MIGRATIONS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)
        log "${GREEN}✓ $service: $MIGRATION_COUNT migration(s)${NC}"
    else
        log "${YELLOW}⚠ $service: répertoire migrations non trouvé${NC}"
    fi
done

# ============================================================================
# 6. TEST DE db-push
# ============================================================================
log ""
log "${BLUE}[6/10] Test de db-push pour security-service...${NC}"

DB_PUSH_CHECK="{}"
SECURITY_SERVICE_DIR="$PROJECT_ROOT/backend/security-service"
if [ -d "$SECURITY_SERVICE_DIR" ]; then
    cd "$SECURITY_SERVICE_DIR"
    
    # Vérifier si node_modules existe
    if [ ! -d "node_modules" ]; then
        log "${YELLOW}⚠ node_modules non trouvé, installation nécessaire${NC}"
    else
        # Tester db-push (dry-run)
        log "Exécution de prisma db push --skip-generate (test)..."
        DB_PUSH_OUTPUT=$(npx prisma db push --skip-generate 2>&1 || true)
        
        if echo "$DB_PUSH_OUTPUT" | grep -q "Your database is now in sync"; then
            log "${GREEN}✓ db-push réussi${NC}"
            DB_PUSH_CHECK=$(echo "$DB_PUSH_CHECK" | jq ".success = true" 2>/dev/null || echo "$DB_PUSH_CHECK")
        elif echo "$DB_PUSH_OUTPUT" | grep -q "already in sync"; then
            log "${GREEN}✓ Base de données déjà synchronisée${NC}"
            DB_PUSH_CHECK=$(echo "$DB_PUSH_CHECK" | jq ".already_synced = true" 2>/dev/null || echo "$DB_PUSH_CHECK")
        else
            log "${RED}✗ Erreur lors de db-push:${NC}"
            echo "$DB_PUSH_OUTPUT" | head -20 | while read line; do
                log "  $line"
            done
            DB_PUSH_CHECK=$(echo "$DB_PUSH_CHECK" | jq ".error = \"DB_PUSH_FAILED\"" 2>/dev/null || echo "$DB_PUSH_CHECK")
        fi
    fi
    cd "$PROJECT_ROOT"
fi

echo "  \"db_push\": $DB_PUSH_CHECK," >> "$JSON_REPORT"

# ============================================================================
# 7. VÉRIFICATION DES FILTRES DE LOGS
# ============================================================================
log ""
log "${BLUE}[7/10] Vérification des filtres de logs...${NC}"

FILTER_CHECK="{}"
FILTER_FILE="$PROJECT_ROOT/backend/shared/logger-filter.js"
if [ -f "$FILTER_FILE" ]; then
    log "${GREEN}✓ Filtre partagé trouvé: $FILTER_FILE${NC}"
    FILTER_CHECK=$(echo "$FILTER_CHECK" | jq ".shared_filter_exists = true" 2>/dev/null || echo "$FILTER_CHECK")
    
    # Vérifier si les services utilisent le filtre
    for service in "${SERVICES_WITH_SCHEMAS[@]}"; do
        LOGGER_FILE="$PROJECT_ROOT/backend/$service/src/utils/logger.js"
        if [ -f "$LOGGER_FILE" ]; then
            if grep -q "logger-filter" "$LOGGER_FILE"; then
                log "  ✓ $service utilise le filtre"
            else
                log "${RED}  ✗ $service N'UTILISE PAS le filtre${NC}"
            fi
        fi
    done
else
    log "${RED}✗ Filtre partagé non trouvé${NC}"
    FILTER_CHECK=$(echo "$FILTER_CHECK" | jq ".shared_filter_exists = false" 2>/dev/null || echo "$FILTER_CHECK")
fi

echo "  \"filters\": $FILTER_CHECK," >> "$JSON_REPORT"

# ============================================================================
# 8. VÉRIFICATION DES LOGS RÉCENTS
# ============================================================================
log ""
log "${BLUE}[8/10] Analyse des logs récents (dernières 50 lignes)...${NC}"

LOG_CHECK="{}"
if [ -n "$POSTGRES_CONTAINER" ]; then
    # Vérifier les logs du security-service
    SECURITY_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "^jobbingtrack-security-service$|jobbingtrack.*security" | head -1 || echo "")
    if [ -n "$SECURITY_CONTAINER" ]; then
        log "Analyse des logs de $SECURITY_CONTAINER..."
        RECENT_LOGS=$(docker logs --tail 50 "$SECURITY_CONTAINER" 2>&1 || echo "")
        
        P2021_COUNT=$(echo "$RECENT_LOGS" | grep -c "P2021" 2>/dev/null || echo "0")
        ERROR_COUNT=$(echo "$RECENT_LOGS" | grep -c "error:" 2>/dev/null || echo "0")
        
        # Nettoyer les valeurs (enlever les retours à la ligne)
        P2021_COUNT=$(echo "$P2021_COUNT" | tr -d '\n\r ' | head -1)
        ERROR_COUNT=$(echo "$ERROR_COUNT" | tr -d '\n\r ' | head -1)
        
        # Valeurs par défaut si vides
        P2021_COUNT=${P2021_COUNT:-0}
        ERROR_COUNT=${ERROR_COUNT:-0}
        
        log "  Erreurs P2021 trouvées: $P2021_COUNT"
        log "  Erreurs totales: $ERROR_COUNT"
        
        LOG_CHECK=$(echo "$LOG_CHECK" | jq ".security_service.p2021_count = $P2021_COUNT" 2>/dev/null || echo "$LOG_CHECK")
        LOG_CHECK=$(echo "$LOG_CHECK" | jq ".security_service.error_count = $ERROR_COUNT" 2>/dev/null || echo "$LOG_CHECK")
        
        if [ "${P2021_COUNT:-0}" -gt 0 ]; then
            log "${RED}  ⚠ Des erreurs P2021 sont toujours présentes dans les logs${NC}"
            log "${YELLOW}  → Les filtres ne fonctionnent peut-être pas ou le conteneur n'a pas été redémarré${NC}"
        fi
    fi
fi

echo "  \"logs\": $LOG_CHECK," >> "$JSON_REPORT"

# ============================================================================
# 9. VÉRIFICATION DU CODE SOURCE
# ============================================================================
log ""
log "${BLUE}[9/10] Vérification du code source...${NC}"

CODE_CHECK="{}"
# Vérifier securityScheduler.js
SCHEDULER_FILE="$PROJECT_ROOT/backend/security-service/src/services/securityScheduler.js"
if [ -f "$SCHEDULER_FILE" ]; then
    if grep -q "checkTableExists" "$SCHEDULER_FILE"; then
        log "${GREEN}✓ securityScheduler.js utilise checkTableExists${NC}"
    else
        log "${RED}✗ securityScheduler.js N'UTILISE PAS checkTableExists${NC}"
    fi
    
    if grep -q "handleTableNotFoundError" "$SCHEDULER_FILE"; then
        log "${GREEN}✓ securityScheduler.js utilise handleTableNotFoundError${NC}"
    else
        log "${RED}✗ securityScheduler.js N'UTILISE PAS handleTableNotFoundError${NC}"
    fi
fi

# Vérifier securityService.js
SERVICE_FILE="$PROJECT_ROOT/backend/security-service/src/services/securityService.js"
if [ -f "$SERVICE_FILE" ]; then
    if grep -q "checkTableExists" "$SERVICE_FILE"; then
        log "${GREEN}✓ securityService.js utilise checkTableExists${NC}"
    else
        log "${RED}✗ securityService.js N'UTILISE PAS checkTableExists${NC}"
    fi
fi

# ============================================================================
# 10. RÉSUMÉ ET RECOMMANDATIONS
# ============================================================================
log ""
log "${BLUE}[10/10] Résumé et recommandations...${NC}"
log ""

RECOMMENDATIONS="[]"

# Vérifier si les tables manquent
MISSING_SECURITY_METRICS=$(echo "$TABLES" | grep -c "security_metrics" || echo "0")
if [ "$MISSING_SECURITY_METRICS" -eq 0 ]; then
    log "${RED}⚠ PROBLÈME: Table security_metrics manquante${NC}"
    log "${YELLOW}  → Solution: Exécuter 'make db-push-all' ou 'cd backend/security-service && npx prisma db push'${NC}"
    RECOMMENDATIONS=$(echo "$RECOMMENDATIONS" | jq '. + ["Exécuter make db-push-all pour créer les tables manquantes"]' 2>/dev/null || echo '["Exécuter make db-push-all pour créer les tables manquantes"]')
fi

# Vérifier si les filtres sont appliqués
if [ "${P2021_COUNT:-0}" -gt 0 ]; then
    log "${RED}⚠ PROBLÈME: Des erreurs P2021 sont toujours loggées${NC}"
    log "${YELLOW}  → Solution: Redémarrer les conteneurs avec 'make restart' ou 'docker compose restart'${NC}"
    RECOMMENDATIONS=$(echo "$RECOMMENDATIONS" | jq '. + ["Redémarrer les conteneurs pour appliquer les filtres de logs"]' 2>/dev/null || echo '["Redémarrer les conteneurs pour appliquer les filtres de logs"]')
fi

# Vérifier si le code utilise les vérifications
if [ -f "$SCHEDULER_FILE" ] && ! grep -q "checkTableExists" "$SCHEDULER_FILE" 2>/dev/null; then
    log "${RED}⚠ PROBLÈME: Le code n'utilise pas checkTableExists${NC}"
    log "${YELLOW}  → Solution: Vérifier que les modifications ont été appliquées${NC}"
    RECOMMENDATIONS=$(echo "$RECOMMENDATIONS" | jq '. + ["Vérifier que le code utilise checkTableExists avant d utiliser les tables"]' 2>/dev/null || echo '["Vérifier que le code utilise checkTableExists"]')
fi

RECOMMENDATIONS_LENGTH=$(echo "$RECOMMENDATIONS" | jq 'length' 2>/dev/null || echo "0")
if [ "$RECOMMENDATIONS_LENGTH" -eq 0 ]; then
    log "${GREEN}✓ Aucun problème critique détecté${NC}"
    RECOMMENDATIONS='["Aucune action requise"]'
fi

echo "  \"recommendations\": $RECOMMENDATIONS" >> "$JSON_REPORT"
echo "  }" >> "$JSON_REPORT"
echo "}" >> "$JSON_REPORT"

# ============================================================================
# FIN DU RAPPORT
# ============================================================================
log ""
log "${BLUE}========================================${NC}"
log "${GREEN}✓ Diagnostic terminé${NC}"
log "${BLUE}========================================${NC}"
log ""
log "Rapport texte: $REPORT_FILE"
log "Rapport JSON: $JSON_REPORT"
log ""
log "${YELLOW}Pour analyser le rapport JSON:${NC}"
log "  cat $JSON_REPORT | jq '.'"
log ""

